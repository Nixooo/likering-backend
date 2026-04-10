require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Render.com usa el puerto que asigna automáticamente

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== PASARELA DE PAGOS (WOMPI) ====================
const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET;
const WOMPI_EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET;

app.get('/api/wompi/generate-signature', (req, res) => {
    res.json({ message: 'El endpoint de firmas está activo. Usa POST para generar una firma.' });
});

app.post('/api/wompi/generate-signature', (req, res) => {
    try {
        const { reference, amountInCents, currency } = req.body;
        
        if (!WOMPI_INTEGRITY_SECRET) {
            return res.status(500).json({
                error: 'WOMPI_INTEGRITY_SECRET no está configurado en el servidor'
            });
        }

        const secret = WOMPI_INTEGRITY_SECRET.trim();
        
        // Concatenación exacta: <Referencia><Monto><Moneda><SecretoIntegridad>
        const chain = `${reference}${amountInCents}${currency}${secret}`;
        const signature = crypto.createHash('sha256').update(chain).digest('hex');
        
        console.log('🔐 Firma generada para:', reference);
        res.json({ signature });
    } catch (error) {
        console.error('❌ Error generando firma:', error);
        res.status(500).json({ error: error.message });
    }
});
// ===================================================================

// Servir archivos estáticos (frontend)
app.use(express.static('.'));

// Configuración de PostgreSQL (Aiven)
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Verificar conexión a la base de datos
pool.on('connect', () => {
    console.log('✅ Conectado a PostgreSQL (Aiven)');
});

pool.on('error', (err) => {
    console.error('❌ Error en la conexión a PostgreSQL:', err);
});

// Probar conexión al iniciar
(async () => {
    try {
        const testQuery = await pool.query('SELECT NOW()');
        console.log('✅ Conexión a PostgreSQL verificada:', testQuery.rows[0].now);
    } catch (error) {
        console.error('❌ ERROR CRÍTICO: No se pudo conectar a PostgreSQL:', error.message);
        console.error('Verifica las variables de entorno en Render:');
        console.error('- DB_HOST:', process.env.DB_HOST ? '✅ Configurado' : '❌ FALTA');
        console.error('- DB_PORT:', process.env.DB_PORT ? '✅ Configurado' : '❌ FALTA');
        console.error('- DB_NAME:', process.env.DB_NAME ? '✅ Configurado' : '❌ FALTA');
        console.error('- DB_USER:', process.env.DB_USER ? '✅ Configurado' : '❌ FALTA');
        console.error('- DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ Configurado' : '❌ FALTA');
    }
})();

// ==================== UTILIDADES ====================

function generateId(prefix) {
    return `${prefix}_${uuidv4()}`;
}

async function queryUsersByIdCompat(client, sqlWithUserId, sqlIdOnly, params) {
    try {
        return await client.query(sqlWithUserId, params);
    } catch (e) {
        if (e && e.code === '42703') {
            return await client.query(sqlIdOnly, params);
        }
        throw e;
    }
}

async function updateUserPlanAndLikesCompat(client, plan, likesToAdd, userId) {
    try {
        return await queryUsersByIdCompat(
            client,
            'UPDATE users SET plan = $1, likes = COALESCE(likes, 0) + $2, likes_disponibles = likes_disponibles + $2 WHERE id = $3 OR user_id = $3',
            'UPDATE users SET plan = $1, likes = COALESCE(likes, 0) + $2, likes_disponibles = likes_disponibles + $2 WHERE id = $3',
            [plan, likesToAdd, userId]
        );
    } catch (e) {
        if (e && e.code === '42703') {
            return await queryUsersByIdCompat(
                client,
                'UPDATE users SET plan = $1, likes_disponibles = likes_disponibles + $2 WHERE id = $3 OR user_id = $3',
                'UPDATE users SET plan = $1, likes_disponibles = likes_disponibles + $2 WHERE id = $3',
                [plan, likesToAdd, userId]
            );
        }
        throw e;
    }
}

async function insertPurchasedLikesCompat(client, userId, likeCount) {
    if (!likeCount || likeCount <= 0) return;

    const values = [];
    const rows = [];
    for (let i = 0; i < likeCount; i++) {
        const likeId = generateId('like');
        const idx = values.length + 1;
        values.push(likeId, userId);
        rows.push(`($${idx}, NULL, $${idx + 1}, CURRENT_TIMESTAMP)`);
    }

    try {
        await client.query(
            `INSERT INTO likes (like_id, video_id, user_id, created_at) VALUES ${rows.join(', ')}`,
            values
        );
    } catch (e) {
        if (e && (e.code === '22P02' || e.code === '42804' || e.code === '42703')) {
            const values2 = [];
            const rows2 = [];
            for (let i = 0; i < likeCount; i++) {
                const idx = values2.length + 1;
                values2.push(userId);
                rows2.push(`(NULL, $${idx}, CURRENT_TIMESTAMP)`);
            }
            await client.query(
                `INSERT INTO likes (video_id, user_id, created_at) VALUES ${rows2.join(', ')}`,
                values2
            );
            return;
        }
        throw e;
    }
}

async function getUserByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (user) {
        // Normalizar: asegurar que siempre tenga 'id' (usar user_id si id no existe)
        if (!user.id && user.user_id) {
            user.id = user.user_id;
        }
    }
    return user;
}

async function getUserById(userId) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
}

// ==================== RUTAS DE AUTENTICACIÓN ====================

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.json({ success: false, message: 'Usuario y contraseña son requeridos' });
        }

        const user = await getUserByUsername(username);
        if (!user) {
            return res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }

        // Retornar datos del usuario (sin password)
        // Normalizar ID: usar id o user_id dependiendo de lo que tenga la BD
        const userId = user.id || user.user_id;
        
        const userData = {
            id: userId,
            user_id: userId, // Incluir ambos para compatibilidad
            username: user.username,
            imageUrl: user.image_url,
            plan: user.plan || 'azul',
            likesDisponibles: user.likes_disponibles || 0,
            likesGanados: user.likes_ganados || 0,
            dineroGanado: parseFloat(user.dinero_ganado) || 0
        };

        res.json({ success: true, data: userData });
    } catch (error) {
        console.error('Error en login:', error);
        res.json({ success: false, message: 'Error al iniciar sesión' });
    }
});

// Registro
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, imageUrl } = req.body;

        console.log('📝 Intento de registro:', { username, hasPassword: !!password, hasImageUrl: !!imageUrl });

        if (!username || !password || !imageUrl) {
            return res.json({ success: false, message: 'Todos los campos son requeridos' });
        }

        if (username.length < 3) {
            return res.json({ success: false, message: 'El nombre de usuario debe tener al menos 3 caracteres' });
        }

        // Verificar conexión a la base de datos
        try {
            await pool.query('SELECT 1');
        } catch (dbError) {
            console.error('❌ Error de conexión a la base de datos:', dbError);
            return res.json({ success: false, message: 'Error de conexión a la base de datos. Verifica las credenciales.' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.json({ success: false, message: 'El usuario ya existe' });
        }

        // Hash de la contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Insertar usuario
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, image_url, plan) VALUES ($1, $2, $3, $4) RETURNING *',
            [username, passwordHash, imageUrl, 'azul']
        );

        const newUser = result.rows[0];
        console.log('✅ Usuario registrado exitosamente:', username);

        // Normalizar ID: usar id o user_id dependiendo de lo que tenga la BD
        const userId = newUser.id || newUser.user_id;

        const userData = {
            id: userId,
            user_id: userId, // Incluir ambos para compatibilidad
            username: newUser.username,
            imageUrl: newUser.image_url,
            plan: newUser.plan || 'azul',
            likesDisponibles: 0,
            likesGanados: 0,
            dineroGanado: 0
        };

        res.json({ success: true, data: userData });
    } catch (error) {
        console.error('❌ Error en registro:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        
        // Mensaje más específico según el tipo de error
        let errorMessage = 'Error al registrar usuario';
        if (error.code === '23505') { // Violación de unique constraint
            errorMessage = 'El usuario ya existe';
        } else if (error.code === '23503') { // Foreign key violation
            errorMessage = 'Error en la relación de datos';
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            errorMessage = 'Error de conexión a la base de datos. Verifica las credenciales en Render.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        res.json({ success: false, message: errorMessage });
    }
});

// ==================== RUTAS DE USUARIOS ====================

// Obtener perfil de usuario (ACTUALIZADO para incluir saldos)
app.get('/api/user/profile', async (req, res) => {
    try {
        const { user } = req.query;

        if (!user) {
            return res.json({ success: false, message: 'Usuario requerido' });
        }

        const userData = await getUserByUsername(user);
        if (!userData) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        // Obtener estadísticas
        const videosResult = await pool.query(
            'SELECT COUNT(*) as count FROM videos WHERE username = $1',
            [user]
        );
        const postsCount = parseInt(videosResult.rows[0].count) || 0;

        const followersResult = await pool.query(
            'SELECT COUNT(*) as count FROM follows WHERE following_username = $1',
            [user]
        );
        const followersCount = parseInt(followersResult.rows[0].count) || 0;

        const followingResult = await pool.query(
            'SELECT COUNT(*) as count FROM follows WHERE follower_username = $1',
            [user]
        );
        const followingCount = parseInt(followingResult.rows[0].count) || 0;

        const likesResult = await pool.query(
            `SELECT COALESCE(SUM(v.likes), 0) as total_likes 
             FROM videos v WHERE v.username = $1`,
            [user]
        );
        const likesCount = parseInt(likesResult.rows[0].total_likes) || 0;

        // Normalizar ID
        const userId = userData.id || userData.user_id;
        
        res.json({
            success: true,
            data: {
                id: userId,
                user_id: userId,
                username: userData.username,
                imageUrl: userData.image_url,
                plan: userData.plan || 'azul',
                followers: followersCount,
                following: followingCount,
                likes: likesCount,
                posts: postsCount,
                // ESTOS CAMPOS SON CRÍTICOS PARA LA BILLETERA
                likesDisponibles: parseInt(userData.likes_disponibles) || 0,
                likesGanados: parseInt(userData.likes_ganados) || 0
            }
        });
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.json({ success: false, message: 'Error al obtener perfil' });
    }
});

// Actualizar foto de perfil
app.post('/api/user/update-profile-picture', async (req, res) => {
    try {
        const { username, imageUrl } = req.body;

        if (!username || !imageUrl) {
            return res.json({ success: false, message: 'Usuario e imagen requeridos' });
        }

        await pool.query(
            'UPDATE users SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2',
            [imageUrl, username]
        );

        res.json({ success: true, message: 'Foto de perfil actualizada' });
    } catch (error) {
        console.error('Error al actualizar foto:', error);
        res.json({ success: false, message: 'Error al actualizar foto de perfil' });
    }
});

// Actualizar contraseña
app.post('/api/user/update-password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;

        if (!username || !newPassword) {
            return res.json({ success: false, message: 'Usuario y nueva contraseña requeridos' });
        }

        if (newPassword.length < 4) {
            return res.json({ success: false, message: 'La contraseña debe tener al menos 4 caracteres' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2',
            [passwordHash, username]
        );

        res.json({ success: true, message: 'Contraseña actualizada' });
    } catch (error) {
        console.error('Error al actualizar contraseña:', error);
        res.json({ success: false, message: 'Error al actualizar contraseña' });
    }
});

// Actualizar contadores de seguidores (para sincronización)
app.post('/api/user/update-follow-counters', async (req, res) => {
    try {
        // Esta función puede ser llamada periódicamente para sincronizar contadores
        res.json({ success: true, message: 'Contadores actualizados' });
    } catch (error) {
        console.error('Error al actualizar contadores:', error);
        res.json({ success: false, message: 'Error al actualizar contadores' });
    }
});

// ==================== RUTAS DE VIDEOS ====================

// Obtener todos los videos (feed)
app.get('/api/videos/all', async (req, res) => {
    try {
        const { username } = req.query;

        // Obtener todos los videos con información del usuario y estadísticas
        // Usar el conteo real de comentarios en lugar del contador almacenado
        const queryUsername = username || '';
        console.log(`[BACKEND DEBUG] getAllVideos called with username: "${queryUsername}"`);
        
        // Usar una subconsulta para verificar si el usuario sigue a cada creador de video
        // Esto asegura que siempre devuelva un booleano explícito
        const videosResult = await pool.query(`
            SELECT 
                v.video_id,
                v.username as user,
                v.titulo,
                v.descripcion,
                v.video_url as videoUrl,
                v.thumbnail_url as thumbnailUrl,
                v.music_name as music,
                v.likes,
                COALESCE(comment_counts.real_count, 0) as comments,
                v.visualizaciones,
                u.image_url as profile_img,
                CASE WHEN vl.username IS NOT NULL THEN true ELSE false END as is_liked_by_current_user,
                CASE 
                    WHEN $1 = '' THEN false
                    WHEN EXISTS (
                        SELECT 1 
                        FROM follows f 
                        WHERE f.follower_username = $1 
                        AND f.following_username = v.username
                    ) THEN true
                    ELSE false
                END as is_following_user
            FROM videos v
            LEFT JOIN users u ON u.username = v.username
            LEFT JOIN video_likes vl ON vl.video_id = v.video_id AND vl.username = $1
            LEFT JOIN (
                SELECT video_id, COUNT(*) as real_count
                FROM comments
                GROUP BY video_id
            ) comment_counts ON comment_counts.video_id = v.video_id
            ORDER BY v.created_at DESC
        `, [queryUsername]);

        // Log para debug - verificar qué devuelve PostgreSQL
        if (videosResult.rows.length > 0) {
            const sampleVideo = videosResult.rows[0];
            console.log(`[BACKEND SQL RESULT] Video de ejemplo: @${sampleVideo.user}, is_following_user:`, sampleVideo.is_following_user, 'tipo:', typeof sampleVideo.is_following_user, 'valor raw:', JSON.stringify(sampleVideo.is_following_user));
        }

        const videos = videosResult.rows.map(video => {
            // Convertir is_following_user explícitamente - manejar todos los casos
            // El CAST en SQL debería devolver un booleano, pero por si acaso manejamos todos los casos
            let isFollowing = false;
            const followingValue = video.is_following_user;
            
            // Log para debug ANTES de procesar
            if (username && video.user && video.user !== username) {
                console.log(`[BACKEND RAW] Video @${video.user}: is_following_user =`, followingValue, 'tipo:', typeof followingValue, 'valor:', JSON.stringify(followingValue));
            }
            
            // Convertir explícitamente - PostgreSQL puede devolver true/false como boolean, string, o null
            if (followingValue === true || followingValue === 'true' || followingValue === 'True' || followingValue === 'TRUE') {
                isFollowing = true;
            } else if (followingValue === 1 || followingValue === '1' || followingValue === 't' || followingValue === 'T') {
                isFollowing = true;
            } else if (followingValue === false || followingValue === 'false' || followingValue === 'False' || followingValue === 'FALSE') {
                isFollowing = false;
            } else if (followingValue === 0 || followingValue === '0' || followingValue === 'f' || followingValue === 'F') {
                isFollowing = false;
            } else if (followingValue === null || followingValue === undefined) {
                // Si es null o undefined, significa que no hay coincidencia en el JOIN = no se sigue
                isFollowing = false;
            } else {
                // Para cualquier otro valor, intentar convertir a booleano
                isFollowing = Boolean(followingValue);
            }
            
            // Log para debug DESPUÉS de procesar
            if (username && video.user && video.user !== username) {
                console.log(`[BACKEND PROCESSED] Video @${video.user}: is_following_user =`, followingValue, '→', isFollowing);
            }
            
            return {
                videoId: video.video_id,
                user: `@${video.user}`,
                titulo: video.titulo || '',
                description: video.descripcion || '',
                videoUrl: video.videourl || video.video_url,
                thumbnailUrl: video.thumbnailurl || video.thumbnail_url,
                music: video.music || '',
                likes: parseInt(video.likes) || 0,
                comments: parseInt(video.comments) || 0,
                visualizaciones: parseInt(video.visualizaciones) || 0,
                profileImg: video.profile_img || '',
                isLikedByCurrentUser: Boolean(video.is_liked_by_current_user) || false,
                isFollowingUser: isFollowing // Siempre un booleano
            };
        });

        res.json({ success: true, data: videos });
    } catch (error) {
        console.error('Error al obtener videos:', error);
        res.json({ success: false, message: 'Error al obtener videos', data: [] });
    }
});

// Obtener videos de un usuario específico
app.get('/api/videos/user', async (req, res) => {
    try {
        const { user } = req.query;

        if (!user) {
            return res.json({ success: false, message: 'Usuario requerido', data: [] });
        }

        const result = await pool.query(`
            SELECT 
                v.video_id as videoId,
                v.username as user,
                v.titulo,
                v.descripcion,
                v.video_url as videoUrl,
                v.thumbnail_url as thumbnailUrl,
                v.music_name as music,
                v.likes,
                v.comments_count as comments,
                v.visualizaciones
            FROM videos v
            WHERE v.username = $1
            ORDER BY v.created_at DESC
        `, [user]);

        const videos = result.rows.map(video => ({
            videoId: video.videoid || video.video_id,
            user: `@${video.user}`,
            titulo: video.titulo || '',
            descripcion: video.descripcion || '',
            videoUrl: video.videourl || video.video_url,
            thumbnailUrl: video.thumbnailurl || video.thumbnail_url,
            music: video.music || '',
            likes: parseInt(video.likes) || 0,
            comments: parseInt(video.comments) || 0,
            visualizaciones: parseInt(video.visualizaciones) || 0
        }));

        res.json({ success: true, data: videos });
    } catch (error) {
        console.error('Error al obtener videos del usuario:', error);
        res.json({ success: false, message: 'Error al obtener videos', data: [] });
    }
});

// Guardar nuevo video
app.post('/api/videos/save', async (req, res) => {
    try {
        console.log('📹 Intento de guardar video:', { 
            usuario: req.body.usuario, 
            hasVideoUrl: !!req.body.videoUrl,
            hasThumbnailUrl: !!req.body.thumbnailUrl 
        });

        const { usuario, titulo, descripcion, videoUrl, thumbnailUrl, musicUrl } = req.body;

        if (!usuario || !videoUrl) {
            console.log('❌ Faltan campos requeridos');
            return res.json({ success: false, message: 'Usuario y URL del video son requeridos' });
        }

        const user = await getUserByUsername(usuario);
        if (!user) {
            console.log('❌ Usuario no encontrado:', usuario);
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        // Normalizar ID: usar user_id si id no existe
        const userId = user.id || user.user_id;
        if (!userId) {
            console.log('❌ Usuario sin ID:', user);
            return res.json({ success: false, message: 'Error: Usuario sin ID válido' });
        }

        const videoId = generateId('video');
        const musicName = musicUrl ? `Música ${Date.now()}` : '';

        console.log('📝 Insertando video:', {
            videoId,
            userId: userId,
            username: usuario,
            videoUrl: videoUrl.substring(0, 50) + '...',
            thumbnailUrl: thumbnailUrl ? thumbnailUrl.substring(0, 50) + '...' : 'null'
        });

        const result = await pool.query(
            `INSERT INTO videos (video_id, user_id, username, titulo, descripcion, video_url, thumbnail_url, music_url, music_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [videoId, userId, usuario, titulo || '', descripcion || '', videoUrl, thumbnailUrl || videoUrl, musicUrl || '', musicName]
        );

        console.log('✅ Video guardado exitosamente:', result.rows[0].video_id);
        res.json({ success: true, message: 'Video guardado', videoId });
    } catch (error) {
        console.error('❌ Error al guardar video:', error);
        console.error('❌ Detalles del error:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            constraint: error.constraint,
            table: error.table
        });
        res.json({ 
            success: false, 
            message: 'Error al guardar video: ' + (error.message || 'Error desconocido') 
        });
    }
});

// Editar detalles del video
app.post('/api/videos/edit', async (req, res) => {
    try {
        const { videoId, newTitle, newDescription } = req.body;

        if (!videoId) {
            return res.json({ success: false, message: 'ID del video requerido' });
        }

        await pool.query(
            'UPDATE videos SET titulo = $1, descripcion = $2, updated_at = CURRENT_TIMESTAMP WHERE video_id = $3',
            [newTitle || '', newDescription || '', videoId]
        );

        res.json({ success: true, message: 'Video actualizado' });
    } catch (error) {
        console.error('Error al editar video:', error);
        res.json({ success: false, message: 'Error al editar video' });
    }
});

// Eliminar video
app.post('/api/videos/delete', async (req, res) => {
    try {
        const { videoId } = req.body;

        if (!videoId) {
            return res.json({ success: false, message: 'ID del video requerido' });
        }

        await pool.query('DELETE FROM videos WHERE video_id = $1', [videoId]);

        res.json({ success: true, message: 'Video eliminado' });
    } catch (error) {
        console.error('Error al eliminar video:', error);
        res.json({ success: false, message: 'Error al eliminar video' });
    }
});


// ==========================================
// AUTO-CREAR TODAS LAS TABLAS DE LA BASE DE DATOS
// ==========================================
pool.query(`
    -- 1. Tabla de Usuarios
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id INT, -- Alias para compatibilidad con el código
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        image_url TEXT,
        plan VARCHAR(20) DEFAULT 'azul',
        likes INT DEFAULT 0,
        likes_disponibles INT DEFAULT 0,
        likes_ganados INT DEFAULT 0,
        dinero_ganado DECIMAL(10,2) DEFAULT 0,
        estado VARCHAR(20) DEFAULT 'Activo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Tabla de Videos
    CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        video_id VARCHAR(100) UNIQUE NOT NULL,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(50) NOT NULL,
        titulo VARCHAR(255),
        descripcion TEXT,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        music_url TEXT,
        music_name VARCHAR(255),
        likes INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        visualizaciones INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Tabla de Likes (video_likes)
    CREATE TABLE IF NOT EXISTS video_likes (
        id SERIAL PRIMARY KEY,
        video_id VARCHAR(100) REFERENCES videos(video_id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(video_id, username)
    );

    -- 4. Tabla de Vistas (video_views)
    CREATE TABLE IF NOT EXISTS video_views (
        id SERIAL PRIMARY KEY,
        video_id VARCHAR(100) REFERENCES videos(video_id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(video_id, username)
    );

    -- 5. Tabla de Comentarios
    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        comment_id VARCHAR(100) UNIQUE NOT NULL,
        video_id VARCHAR(100) REFERENCES videos(video_id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(50),
        comment_text TEXT NOT NULL,
        is_edited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Tabla de Seguidores
    CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INT REFERENCES users(id) ON DELETE CASCADE,
        follower_username VARCHAR(50),
        following_id INT REFERENCES users(id) ON DELETE CASCADE,
        following_username VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_username, following_username)
    );

    -- 7. Tabla de Mensajes
    CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(100) UNIQUE NOT NULL,
        from_user_id INT REFERENCES users(id) ON DELETE CASCADE,
        from_username VARCHAR(50),
        to_user_id INT REFERENCES users(id) ON DELETE CASCADE,
        to_username VARCHAR(50),
        message_text TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Tabla de Historial de Billetera
    CREATE TABLE IF NOT EXISTS wallet_history (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50),
        type VARCHAR(10),
        detail TEXT,
        amount DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. Tabla de Notificaciones
    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50),
        message TEXT,
        avatar_url TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. Tabla de Reportes
    CREATE TABLE IF NOT EXISTS reportes (
        id SERIAL PRIMARY KEY,
        tipo_reporte VARCHAR(20),
        id_video_reportado INT,
        id_usuario_reportado INT,
        id_usuario_reporter INT,
        motivo VARCHAR(100),
        descripcion TEXT,
        estado VARCHAR(20) DEFAULT 'pendiente',
        prioridad VARCHAR(20) DEFAULT 'media',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`).then(() => {
    console.log('✅ Base de datos y TODAS las tablas inicializadas correctamente');
    // Pequeño parche para asegurar que user_id sea igual a id
    return pool.query('UPDATE users SET user_id = id WHERE user_id IS NULL');
}).catch(console.error);

// Dar like a un video (Transferencia Oficial de Valor)
// Dar like a un video (Transferencia Oficial de Valor)
app.post('/api/videos/like', async (req, res) => {
    try {
        const { videoId, username, avatarUrl } = req.body;
        if (!videoId || !username) return res.json({ success: false, message: 'Faltan datos' });

        const user = await getUserByUsername(username);
        if (!user) return res.json({ success: false, message: 'Usuario emisor no encontrado' });

        const senderId = user.user_id || user.id;
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            const existingLike = await client.query('SELECT 1 FROM video_likes WHERE video_id = $1 AND username = $2', [videoId, username]);
            if (existingLike.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.json({ success: false, message: 'Ya transferiste un like a este video' });
            }

            // CORRECCIÓN: Quitamos el "OR id = $1" para evitar que la base de datos colapse
            const senderBalance = await client.query('SELECT likes_disponibles FROM users WHERE user_id = $1 FOR UPDATE', [senderId]);
            if ((senderBalance.rows[0]?.likes_disponibles || 0) <= 0) {
                await client.query('ROLLBACK');
                return res.json({ success: false, message: 'Tu billetera no tiene likes disponibles' });
            }

            const videoData = await client.query('SELECT username, titulo FROM videos WHERE video_id = $1', [videoId]);
            const creatorUsername = videoData.rows[0]?.username;
            const videoTitle = videoData.rows[0]?.titulo || 'Video';

            if (!creatorUsername) {
                await client.query('ROLLBACK');
                return res.json({ success: false, message: 'No se encontró al creador' });
            }

            // CORRECCIÓN MATEMÁTICA Y DE COLUMNAS: Usamos solo user_id
            await client.query('UPDATE users SET likes_disponibles = COALESCE(likes_disponibles, 0) - 1 WHERE user_id = $1', [senderId]);
            await client.query('UPDATE users SET likes_disponibles = COALESCE(likes_disponibles, 0) + 1, likes_ganados = COALESCE(likes_ganados, 0) + 1 WHERE username = $1', [creatorUsername]);

            await client.query('INSERT INTO video_likes (video_id, user_id, username) VALUES ($1, $2, $3)', [videoId, senderId, username]);
            const updateVideo = await client.query('UPDATE videos SET likes = likes + 1 WHERE video_id = $1 RETURNING likes', [videoId]);
            
            // REGISTRAR HISTORIAL EN BASE DE DATOS
            const VALOR_MONETARIO = 5000; // <-- NUEVO VALOR DEL LIKE PARA EL CREADOR
            await client.query('INSERT INTO wallet_history (username, type, detail, amount) VALUES ($1, $2, $3, $4)', 
                [username, 'out', `Envío de Like a @${creatorUsername} (${videoTitle.substring(0, 15)}...)`, VALOR_MONETARIO]);
            
            await client.query('INSERT INTO wallet_history (username, type, detail, amount) VALUES ($1, $2, $3, $4)', 
                [creatorUsername, 'in', `Ingreso por Like de @${username} (${videoTitle.substring(0, 15)}...)`, VALOR_MONETARIO]);

            // ENVIAR NOTIFICACIÓN PUSH AL RECEPTOR
            await client.query('INSERT INTO notifications (username, message, avatar_url) VALUES ($1, $2, $3)', 
                [creatorUsername, `@${username} te dio un like y ganaste $5.000 COP`, avatarUrl || '']);

            await client.query('COMMIT');
            res.json({ success: true, isLiked: true, likes: updateVideo.rows[0].likes, senderLikes: (senderBalance.rows[0].likes_disponibles - 1) });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error CRÍTICO al dar like:', error.message);
        res.json({ success: false, message: 'Error en la base de datos' });
    }
});



// Registrar visualización
app.post('/api/videos/view', async (req, res) => {
    try {
        const { videoId, username } = req.body;

        if (!videoId || !username) {
            return res.json({ success: false, message: 'Video ID y usuario requeridos' });
        }

        const user = await getUserByUsername(username);
        if (!user) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        // Verificar si ya vio el video
        const existingView = await pool.query(
            'SELECT * FROM video_views WHERE video_id = $1 AND username = $2',
            [videoId, username]
        );

        if (existingView.rows.length === 0) {
            // Agregar visualización
            const userId = user.id || user.user_id;
            await pool.query(
                'INSERT INTO video_views (video_id, user_id, username) VALUES ($1, $2, $3)',
                [videoId, userId, username]
            );

            // Actualizar contador
            await pool.query(
                'UPDATE videos SET visualizaciones = visualizaciones + 1 WHERE video_id = $1',
                [videoId]
            );
        }

        // Obtener nuevo contador
        const result = await pool.query(
            'SELECT visualizaciones FROM videos WHERE video_id = $1',
            [videoId]
        );

        const newViewCount = result.rows[0]?.visualizaciones || 0;

        res.json({ success: true, newViewCount });
    } catch (error) {
        console.error('Error al registrar visualización:', error);
        res.json({ success: false, message: 'Error al registrar visualización' });
    }
});

// ==================== RUTAS DE COMENTARIOS ====================

// Obtener comentarios de un video
app.get('/api/comments', async (req, res) => {
    try {
        const { videoId } = req.query;

        if (!videoId) {
            return res.json({ success: false, message: 'Video ID requerido', data: [] });
        }

        // Obtener comentarios - intentar usar is_edited, si no existe usar edited
        let result;
        try {
            // Intentar con is_edited primero
            result = await pool.query(`
                SELECT 
                    c.comment_id,
                    c.username,
                    c.comment_text,
                    COALESCE(c.is_edited, false) as is_edited,
                    c.created_at,
                    u.image_url
                FROM comments c
                LEFT JOIN users u ON u.username = c.username
                WHERE c.video_id = $1
                ORDER BY c.created_at DESC
            `, [videoId]);
        } catch (err) {
            // Si falla, usar edited
            result = await pool.query(`
                SELECT 
                    c.comment_id,
                    c.username,
                    c.comment_text,
                    COALESCE(c.edited, false) as is_edited,
                    c.created_at,
                    u.image_url
                FROM comments c
                LEFT JOIN users u ON u.username = c.username
                WHERE c.video_id = $1
                ORDER BY c.created_at DESC
            `, [videoId]);
        }

        const comments = result.rows.map(comment => ({
            commentId: comment.comment_id,
            username: comment.username,
            commentText: comment.comment_text,
            edited: comment.is_edited || false,
            timestamp: comment.created_at,
            imageUrl: comment.image_url || ''
        }));

        // Sincronizar el contador de comentarios con el número real
        const realCount = comments.length;
        await pool.query(
            'UPDATE videos SET comments_count = $1 WHERE video_id = $2',
            [realCount, videoId]
        );

        res.json({ success: true, data: comments });
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        res.json({ success: false, message: 'Error al obtener comentarios', data: [] });
    }
});

// Agregar comentario
app.post('/api/comments/add', async (req, res) => {
    try {
        const { videoId, username, commentText } = req.body;

        if (!videoId || !username || !commentText) {
            return res.json({ success: false, message: 'Video ID, usuario y comentario requeridos' });
        }

        const user = await getUserByUsername(username);
        if (!user) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        const commentId = generateId('comment');
        const userId = user.id || user.user_id;

        await pool.query(
            'INSERT INTO comments (comment_id, video_id, user_id, username, comment_text) VALUES ($1, $2, $3, $4, $5)',
            [commentId, videoId, userId, username, commentText]
        );

        // Actualizar contador de comentarios
        await pool.query(
            'UPDATE videos SET comments_count = comments_count + 1 WHERE video_id = $1',
            [videoId]
        );

        res.json({ success: true, message: 'Comentario agregado', commentId });
    } catch (error) {
        console.error('Error al agregar comentario:', error);
        res.json({ success: false, message: 'Error al agregar comentario' });
    }
});

// Editar comentario
app.post('/api/comments/edit', async (req, res) => {
    try {
        const { commentId, newText, username } = req.body;

        if (!commentId || !newText || !username) {
            return res.json({ success: false, message: 'ID del comentario, nuevo texto y usuario requeridos' });
        }

        // Verificar que el comentario pertenece al usuario
        const comment = await pool.query(
            'SELECT * FROM comments WHERE comment_id = $1 AND username = $2',
            [commentId, username]
        );

        if (comment.rows.length === 0) {
            return res.json({ success: false, message: 'Comentario no encontrado o no tienes permiso' });
        }

        // Intentar actualizar con is_edited primero, si no existe usar edited
        try {
            await pool.query(
                'UPDATE comments SET comment_text = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP WHERE comment_id = $2',
                [newText, commentId]
            );
        } catch (err) {
            // Si is_edited no existe, usar edited
            await pool.query(
                'UPDATE comments SET comment_text = $1, edited = true, updated_at = CURRENT_TIMESTAMP WHERE comment_id = $2',
                [newText, commentId]
            );
        }

        res.json({ success: true, message: 'Comentario editado' });
    } catch (error) {
        console.error('Error al editar comentario:', error);
        res.json({ success: false, message: 'Error al editar comentario' });
    }
});

// Eliminar comentario
app.post('/api/comments/delete', async (req, res) => {
    try {
        const { commentId, username } = req.body;

        if (!commentId || !username) {
            return res.json({ success: false, message: 'ID del comentario y usuario requeridos' });
        }

        // Verificar que el comentario pertenece al usuario
        const comment = await pool.query(
            'SELECT video_id FROM comments WHERE comment_id = $1 AND username = $2',
            [commentId, username]
        );

        if (comment.rows.length === 0) {
            return res.json({ success: false, message: 'Comentario no encontrado o no tienes permiso' });
        }

        const videoId = comment.rows[0].video_id;

        // Eliminar comentario
        await pool.query('DELETE FROM comments WHERE comment_id = $1', [commentId]);

        // Actualizar contador
        await pool.query(
            'UPDATE videos SET comments_count = GREATEST(comments_count - 1, 0) WHERE video_id = $1',
            [videoId]
        );

        res.json({ success: true, message: 'Comentario eliminado' });
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        res.json({ success: false, message: 'Error al eliminar comentario' });
    }
});

// Sincronizar contador de comentarios para todos los videos
app.post('/api/comments/sync-all', async (req, res) => {
    try {
        // Obtener todos los videos con su conteo real de comentarios
        const result = await pool.query(`
            SELECT 
                v.video_id,
                COUNT(c.comment_id) as real_count
            FROM videos v
            LEFT JOIN comments c ON c.video_id = v.video_id
            GROUP BY v.video_id
        `);

        let updated = 0;
        for (const row of result.rows) {
            await pool.query(
                'UPDATE videos SET comments_count = $1 WHERE video_id = $2',
                [parseInt(row.real_count) || 0, row.video_id]
            );
            updated++;
        }

        res.json({ success: true, message: `Contadores sincronizados para ${updated} videos` });
    } catch (error) {
        console.error('Error al sincronizar contadores:', error);
        res.json({ success: false, message: 'Error al sincronizar contadores' });
    }
});

// ==================== RUTAS DE SEGUIDORES ====================

// Verificar si un usuario sigue a otro
app.get('/api/follow/check', async (req, res) => {
    try {
        const { followerUsername, targetUsername } = req.query;

        if (!followerUsername || !targetUsername) {
            return res.json({ success: false, message: 'Usuarios requeridos', isFollowing: false });
        }

        const result = await pool.query(
            'SELECT * FROM follows WHERE follower_username = $1 AND following_username = $2',
            [followerUsername, targetUsername]
        );

        res.json({ success: true, isFollowing: result.rows.length > 0 });
    } catch (error) {
        console.error('Error al verificar seguimiento:', error);
        res.json({ success: false, message: 'Error al verificar seguimiento', isFollowing: false });
    }
});

// Seguir usuario
app.post('/api/follow', async (req, res) => {
    try {
        const { followerUsername, targetUsername } = req.body;

        if (!followerUsername || !targetUsername) {
            return res.json({ success: false, message: 'Usuarios requeridos' });
        }

        if (followerUsername === targetUsername) {
            return res.json({ success: false, message: 'No puedes seguirte a ti mismo' });
        }

        const follower = await getUserByUsername(followerUsername);
        const target = await getUserByUsername(targetUsername);

        if (!follower || !target) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        // Verificar si ya lo sigue
        const existingFollow = await pool.query(
            'SELECT * FROM follows WHERE follower_username = $1 AND following_username = $2',
            [followerUsername, targetUsername]
        );

        if (existingFollow.rows.length > 0) {
            return res.json({ success: false, message: 'Ya sigues a este usuario' });
        }

        // Agregar seguimiento
        const followerId = follower.id || follower.user_id;
        const targetId = target.id || target.user_id;
        await pool.query(
            'INSERT INTO follows (follower_id, follower_username, following_id, following_username) VALUES ($1, $2, $3, $4)',
            [followerId, followerUsername, targetId, targetUsername]
        );

        res.json({ success: true, message: `Ahora sigues a @${targetUsername}` });
    } catch (error) {
        console.error('Error al seguir usuario:', error);
        res.json({ success: false, message: 'Error al seguir usuario' });
    }
});

// Dejar de seguir usuario
app.post('/api/unfollow', async (req, res) => {
    try {
        const { followerUsername, targetUsername } = req.body;

        if (!followerUsername || !targetUsername) {
            return res.json({ success: false, message: 'Usuarios requeridos' });
        }

        if (followerUsername === targetUsername) {
            return res.json({ success: false, message: 'No puedes dejar de seguirte a ti mismo' });
        }

        // Verificar si lo sigue
        const existingFollow = await pool.query(
            'SELECT * FROM follows WHERE follower_username = $1 AND following_username = $2',
            [followerUsername, targetUsername]
        );

        if (existingFollow.rows.length === 0) {
            return res.json({ success: false, message: 'No sigues a este usuario' });
        }

        // Eliminar seguimiento
        await pool.query(
            'DELETE FROM follows WHERE follower_username = $1 AND following_username = $2',
            [followerUsername, targetUsername]
        );

        res.json({ success: true, message: `Ya no sigues a @${targetUsername}` });
    } catch (error) {
        console.error('Error al dejar de seguir usuario:', error);
        res.json({ success: false, message: 'Error al dejar de seguir usuario' });
    }
});

// ==================== RUTAS DE MENSAJERÍA ====================

// Obtener conversaciones
app.get('/api/messages/conversations', async (req, res) => {
    try {
        const { user } = req.query;

        console.log('📨 Obteniendo conversaciones para:', user);

        if (!user) {
            return res.json({ success: false, message: 'Usuario requerido', data: [] });
        }

        // Consulta mejorada: obtener el último mensaje de cada conversación
        const result = await pool.query(`
            WITH conversation_messages AS (
                SELECT 
                    CASE 
                        WHEN m.from_username = $1 THEN m.to_username
                        ELSE m.from_username
                    END as other_user,
                    CASE 
                        WHEN m.from_username = $1 THEN m.to_user_id
                        ELSE m.from_user_id
                    END as other_user_id,
                    m.message_text,
                    m.created_at,
                    m.read,
                    m.from_username,
                    ROW_NUMBER() OVER (
                        PARTITION BY 
                            CASE 
                                WHEN m.from_username = $1 THEN m.to_username
                                ELSE m.from_username
                            END
                        ORDER BY m.created_at DESC
                    ) as rn
                FROM messages m
                WHERE m.from_username = $1 OR m.to_username = $1
            ),
            unread_counts AS (
                SELECT 
                    CASE 
                        WHEN m.from_username = $1 THEN m.to_username
                        ELSE m.from_username
                    END as other_user,
                    COUNT(*) as unread_count
                FROM messages m
                WHERE m.to_username = $1 AND m.read = false
                GROUP BY 
                    CASE 
                        WHEN m.from_username = $1 THEN m.to_username
                        ELSE m.from_username
                    END
            )
            SELECT 
                cm.other_user,
                cm.other_user_id,
                cm.message_text as last_message,
                cm.created_at as last_message_time,
                COALESCE(uc.unread_count, 0) as unread_count
            FROM conversation_messages cm
            LEFT JOIN unread_counts uc ON cm.other_user = uc.other_user
            WHERE cm.rn = 1
            ORDER BY cm.created_at DESC
        `, [user]);

        console.log('📨 Conversaciones encontradas:', result.rows.length);

        // Obtener imágenes de perfil y último mensaje completo
        const conversations = await Promise.all(result.rows.map(async (row) => {
            try {
                const userData = await getUserByUsername(row.other_user);
                const lastMessageTime = row.last_message_time ? new Date(row.last_message_time).toISOString() : new Date().toISOString();
                
                // Obtener el último mensaje completo para saber quién lo envió
                const lastMsgResult = await pool.query(`
                    SELECT from_username, message_text, created_at
                    FROM messages
                    WHERE (from_username = $1 AND to_username = $2) 
                       OR (from_username = $2 AND to_username = $1)
                    ORDER BY created_at DESC
                    LIMIT 1
                `, [user, row.other_user]);
                
                const lastMsg = lastMsgResult.rows[0] || { 
                    from_username: '', 
                    message_text: row.last_message || '', 
                    created_at: row.last_message_time 
                };
                
                return {
                    username: row.other_user,
                    lastMessage: {
                        text: lastMsg.message_text || '',
                        timestamp: lastMsg.created_at ? new Date(lastMsg.created_at).toISOString() : lastMessageTime,
                        from: lastMsg.from_username || ''
                    },
                    lastMessageTime: lastMessageTime,
                    unreadCount: parseInt(row.unread_count) || 0,
                    imageUrl: userData?.image_url || ''
                };
            } catch (err) {
                console.error('Error obteniendo datos de usuario:', row.other_user, err);
                const lastMessageTime = row.last_message_time ? new Date(row.last_message_time).toISOString() : new Date().toISOString();
                
                return {
                    username: row.other_user,
                    lastMessage: {
                        text: row.last_message || '',
                        timestamp: lastMessageTime,
                        from: ''
                    },
                    lastMessageTime: lastMessageTime,
                    unreadCount: parseInt(row.unread_count) || 0,
                    imageUrl: ''
                };
            }
        }));

        console.log('✅ Conversaciones procesadas:', conversations.length);
        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('❌ Error al obtener conversaciones:', error);
        console.error('❌ Detalles:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        res.json({ success: false, message: 'Error al obtener conversaciones: ' + (error.message || 'Error desconocido'), data: [] });
    }
});

// Obtener mensajes entre dos usuarios
app.get('/api/messages', async (req, res) => {
    try {
        const { user1, user2 } = req.query;

        if (!user1 || !user2) {
            return res.json({ success: false, message: 'Ambos usuarios requeridos', data: [] });
        }

        const result = await pool.query(`
            SELECT 
                m.message_id as messageId,
                m.from_username as "from",
                m.to_username as "to",
                m.message_text as message,
                m.read,
                m.read_at as readAt,
                m.created_at as timestamp
            FROM messages m
            WHERE (m.from_username = $1 AND m.to_username = $2)
               OR (m.from_username = $2 AND m.to_username = $1)
            ORDER BY m.created_at ASC
        `, [user1, user2]);

        const messages = result.rows.map(msg => ({
            messageId: msg.messageid,
            from: msg.from,
            to: msg.to,
            message: msg.message,
            read: msg.read || false,
            readAt: msg.readat,
            timestamp: msg.timestamp
        }));

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.json({ success: false, message: 'Error al obtener mensajes', data: [] });
    }
});

// Enviar mensaje
app.post('/api/messages/send', async (req, res) => {
    try {
        const { from, to, message } = req.body;

        if (!from || !to || !message) {
            return res.json({ success: false, message: 'Remitente, destinatario y mensaje requeridos' });
        }

        const fromUser = await getUserByUsername(from);
        const toUser = await getUserByUsername(to);

        if (!fromUser || !toUser) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        const messageId = generateId('msg');

        const fromUserId = fromUser.id || fromUser.user_id;
        const toUserId = toUser.id || toUser.user_id;
        
        await pool.query(
            'INSERT INTO messages (message_id, from_user_id, from_username, to_user_id, to_username, message_text) VALUES ($1, $2, $3, $4, $5, $6)',
            [messageId, fromUserId, from, toUserId, to, message]
        );

        res.json({ success: true, message: 'Mensaje enviado', messageId });
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.json({ success: false, message: 'Error al enviar mensaje' });
    }
});

// Eliminar mensaje
app.post('/api/messages/delete', async (req, res) => {
    try {
        const { messageId, username } = req.body;

        if (!messageId || !username) {
            return res.json({ success: false, message: 'ID del mensaje y usuario requeridos' });
        }

        // Verificar que el mensaje pertenece al usuario y no ha sido leído
        const message = await pool.query(
            'SELECT * FROM messages WHERE message_id = $1 AND from_username = $2 AND read = false',
            [messageId, username]
        );

        if (message.rows.length === 0) {
            return res.json({ success: false, message: 'Mensaje no encontrado, ya fue leído o no tienes permiso' });
        }

        await pool.query('DELETE FROM messages WHERE message_id = $1', [messageId]);

        res.json({ success: true, message: 'Mensaje eliminado' });
    } catch (error) {
        console.error('Error al eliminar mensaje:', error);
        res.json({ success: false, message: 'Error al eliminar mensaje' });
    }
});

// Marcar mensajes como leídos
app.post('/api/messages/mark-read', async (req, res) => {
    try {
        const { from, to } = req.body;

        if (!from || !to) {
            return res.json({ success: false, message: 'Remitente y destinatario requeridos' });
        }

        await pool.query(
            'UPDATE messages SET read = true, read_at = CURRENT_TIMESTAMP WHERE from_username = $1 AND to_username = $2 AND read = false',
            [from, to]
        );

        res.json({ success: true, message: 'Mensajes marcados como leídos' });
    } catch (error) {
        console.error('Error al marcar como leído:', error);
        res.json({ success: false, message: 'Error al marcar como leído' });
    }
});

// ==================== RUTA DE REPORTES ====================

// Endpoint público para crear reportes
app.post('/api/public/reports', async (req, res) => {
    console.log('📝 Reporte recibido:', req.body);
    try {
        const { tipo_reporte, id_video_reportado, username_reporter, username_reportado, motivo, descripcion } = req.body;

        // Validaciones básicas
        if (!tipo_reporte || !username_reporter || !motivo) {
            return res.json({ success: false, error: 'Faltan campos requeridos: tipo_reporte, username_reporter, motivo' });
        }

        if (tipo_reporte !== 'video' && tipo_reporte !== 'usuario') {
            return res.json({ success: false, error: 'tipo_reporte debe ser "video" o "usuario"' });
        }

        // Obtener ID del usuario que reporta
        const reporterUser = await getUserByUsername(username_reporter);
        if (!reporterUser) {
            return res.json({ success: false, error: 'Usuario reporter no encontrado' });
        }
        const reporterUserId = reporterUser.id || reporterUser.user_id;

        let reportedUserId = null;
        let videoId = null;

        if (tipo_reporte === 'video') {
            // Para reportes de video, obtener el ID del usuario del video
            if (!id_video_reportado) {
                return res.json({ success: false, error: 'id_video_reportado es requerido para reportes de video' });
            }

            // Buscar el video por video_id (UUID string) para obtener el username del propietario
            const videoResult = await pool.query(
                'SELECT username FROM videos WHERE video_id = $1',
                [id_video_reportado]
            );

            if (videoResult.rows.length === 0) {
                return res.json({ success: false, error: 'Video no encontrado' });
            }

            const videoOwnerUsername = videoResult.rows[0].username;
            
            // Intentar obtener el id numérico de la tabla videos
            // Si no existe la columna id, usamos NULL (la columna id_video_reportado debe aceptar NULL)
            let videoIdNumeric = null;
            try {
                const idResult = await pool.query(
                    'SELECT id FROM videos WHERE video_id = $1',
                    [id_video_reportado]
                );
                if (idResult.rows.length > 0 && idResult.rows[0].id) {
                    videoIdNumeric = idResult.rows[0].id;
                }
            } catch (idError) {
                // Si la columna id no existe en videos, usar NULL
                // NOTA: Esto requiere que id_video_reportado en la tabla reportes acepte NULL
                // Si no acepta NULL, necesitarás modificar el esquema de la tabla reportes
                console.log('⚠️ Columna id no existe en videos, usando NULL para id_video_reportado');
                console.log('⚠️ Si esto falla, modifica la tabla reportes para que id_video_reportado acepte NULL');
                videoIdNumeric = null;
            }
            
            videoId = videoIdNumeric;
            
            // Obtener el ID del usuario propietario del video
            const videoOwner = await getUserByUsername(videoOwnerUsername);
            if (videoOwner) {
                reportedUserId = videoOwner.id || videoOwner.user_id;
            }
        } else if (tipo_reporte === 'usuario') {
            // Para reportes de usuario, usar el username proporcionado
            if (!username_reportado) {
                return res.json({ success: false, error: 'username_reportado es requerido para reportes de usuario' });
            }

            const reportedUser = await getUserByUsername(username_reportado);
            if (!reportedUser) {
                return res.json({ success: false, error: 'Usuario reportado no encontrado' });
            }
            reportedUserId = reportedUser.id || reportedUser.user_id;
        }

        // Insertar el reporte en la base de datos
        const result = await pool.query(
            `INSERT INTO reportes 
            (tipo_reporte, id_video_reportado, id_usuario_reportado, id_usuario_reporter, motivo, descripcion, estado, prioridad) 
            VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', 'media') 
            RETURNING id`,
            [tipo_reporte, videoId, reportedUserId, reporterUserId, motivo, descripcion || null]
        );

        res.json({
            success: true,
            message: 'Reporte enviado correctamente',
            reportId: result.rows[0].id
        });
    } catch (error) {
        console.error('Error al crear reporte:', error);
        res.json({ success: false, error: 'Error al crear el reporte: ' + error.message });
    }
});

// ==================== WEBHOOKS Y OTROS ====================

// Endpoint para recibir notificaciones de pago (Webhook)
app.post('/api/wompi/webhook', async (req, res) => {
    try {
        const { event, data } = req.body;
        const tx = data && data.transaction;
        if (event && tx) console.log(`📩 Webhook recibido: ${event} ${tx.id} ${tx.status} ${tx.reference}`);

        if (event === 'transaction.updated') {
            const transaction = data.transaction;
            const { status, reference, amount_in_cents, customer_email } = transaction;

            if (status === 'APPROVED') {
                const parts = reference.split('_');
                const montoTotalCOP = amount_in_cents / 100;
                
                // Referencia: PLAN_<NAME>_<USERID>_<TIMESTAMP>
                if (parts[0] === 'PLAN' && parts[1] && parts[2]) {
                    const planId = parts[1].toUpperCase();
                    const userId = parts[2];
                    
                    // Nueva tabla de beneficios (1 Like = 15.000)
                    const planBenefits = {
                        'AZUL': { likes: 1 }, 'ROJO': { likes: 4 },
                        'NARANJA': { likes: 10 }, 'AMARILLO': { likes: 20 },
                        'ROSADO': { likes: 40 }, 'FUCSIA': { likes: 60 },
                        'VERDE': { likes: 80 }, 'MARRON': { likes: 100 },
                        'GRIS': { likes: 120 }, 'MORADO': { likes: 140 }
                    };

                    const likesToAdd = Number((planBenefits[planId] || {}).likes) || 0;
                    
                    const client = await pool.connect();
                    try {
                        await client.query('BEGIN');
                        
                        // 1. Asignar Likes al usuario
                        await client.query(
                            'UPDATE users SET plan = $1, likes_disponibles = COALESCE(likes_disponibles, 0) + $2 WHERE id = $3 OR user_id = $3',
                            [planId.toLowerCase(), likesToAdd, userId]
                        );

                        // 2. Obtener el username para el historial
                        const userRes = await client.query('SELECT username FROM users WHERE id = $1 OR user_id = $1', [userId]);
                        const username = userRes.rows[0]?.username;

                        // 3. Registrar Historial Real (Solo la compra total, sin impuestos falsos)
                        if (username) {
                            await client.query('INSERT INTO wallet_history (username, type, detail, amount) VALUES ($1, $2, $3, $4)', 
                                [username, 'in', `Compra de Plan ${planId}`, montoTotalCOP]);
                        }

                        await client.query('COMMIT');
                        console.log(`✅ PAGO DB EXITOSO: Plan ${planId} activado para ${username}.`);
                    } catch (e) {
                        await client.query('ROLLBACK');
                        throw e;
                    } finally {
                        client.release();
                    }
                } 
                // Recargas normales libres
                else if (parts[0] === 'RECARGA' && parts[1]) {
                    const userId = parts[1];
                    // Regla exacta: 15.000 COP = 1 Like
                    const likesToAdd = Math.floor(montoTotalCOP / 15000); 
                    
                    if (likesToAdd > 0) {
                        const client = await pool.connect();
                        try {
                            await client.query('BEGIN');
                            await client.query('UPDATE users SET likes_disponibles = COALESCE(likes_disponibles, 0) + $1 WHERE id = $2 OR user_id = $2', [likesToAdd, userId]);
                            
                            const userRes = await client.query('SELECT username FROM users WHERE id = $1 OR user_id = $1', [userId]);
                            if(userRes.rows[0]) {
                                await client.query('INSERT INTO wallet_history (username, type, detail, amount) VALUES ($1, $2, $3, $4)', 
                                    [userRes.rows[0].username, 'in', `Recarga de ${likesToAdd} Likes`, montoTotalCOP]);
                            }
                            await client.query('COMMIT');
                        } finally {
                            client.release();
                        }
                    }
                }
            }
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Error en Webhook:', error);
        res.status(500).send('Error');
    }
});


// Obtener historial de Billetera desde la BD
app.get('/api/wallet/history', async (req, res) => {
    try {
        const { username } = req.query;
        const result = await pool.query(
            'SELECT * FROM wallet_history WHERE username = $1 ORDER BY created_at DESC LIMIT 30', 
            [username]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.json({ success: false, data: [] });
    }
});

// Registrar historial manualmente (Para las compras de Wompi)
app.post('/api/wallet/history/add', async (req, res) => {
    try {
        const { username, type, detail, amount } = req.body;
        await pool.query(
            'INSERT INTO wallet_history (username, type, detail, amount) VALUES ($1, $2, $3, $4)',
            [username, type, detail, amount]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error guardando historial:', error);
        res.json({ success: false });
    }
});








app.post('/api/wallet/withdraw', async (req, res) => {
    try {
        const { username, amount, method, destination, docType, docNumber } = req.body;

        if (!username || !amount || !destination || !docType || !docNumber) {
            return res.json({ success: false, message: 'Faltan datos bancarios para el retiro' });
        }

        const user = await getUserByUsername(username);
        if (!user) return res.json({ success: false, message: 'Usuario no encontrado' });

        const userId = user.user_id || user.id;
        
        // 1 Like recibido equivale a 5.000 COP
        const VALOR_LIKE = 5000;
        const likesToDeduct = Math.ceil(amount / VALOR_LIKE);

        // Comisión de la transacción (lo asume el creador)
        const COMISION_DISPERSION_WOMPI = 3200; 
        
        if (amount <= COMISION_DISPERSION_WOMPI) {
            return res.json({ success: false, message: `El monto mínimo a retirar debe ser mayor a la comisión bancaria ($${COMISION_DISPERSION_WOMPI} COP)`});
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const balanceData = await client.query('SELECT likes_disponibles, likes_ganados FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
            const likesDisponibles = parseInt(balanceData.rows[0]?.likes_disponibles) || 0;
            const likesGanados = parseInt(balanceData.rows[0]?.likes_ganados) || 0;

            // --- NUEVA REGLA ESTRICTA ---
            // Solo se puede retirar de los likes GANADOS.
            if (likesGanados < likesToDeduct) {
                await client.query('ROLLBACK');
                return res.json({ success: false, message: `Saldo insuficiente. Tienes ${likesGanados} likes recibidos, pero necesitas ${likesToDeduct} para retirar $${amount}` });
            }

            // Descontamos ÚNICAMENTE de likes_ganados
            const newGanados = likesGanados - likesToDeduct;
            const newDisponibles = likesDisponibles; // Los disponibles (comprados) quedan intactos

            await client.query(
                'UPDATE users SET likes_ganados = $1 WHERE user_id = $2',
                [newGanados, userId]
            );

            const referenceId = `RETIRO_${userId}_${Date.now()}`;
            const montoNetoAlBanco = amount - COMISION_DISPERSION_WOMPI;

            await client.query(
                'INSERT INTO wallet_history (username, type, detail, amount) VALUES ($1, $2, $3, $4)',
                [username, 'out', `Retiro ${method} (Comisión: -$${COMISION_DISPERSION_WOMPI})`, amount]
            );

            const WOMPI_PRIVATE_KEY = (process.env.WOMPI_PRIVATE_KEY || '').trim();

            if (WOMPI_PRIVATE_KEY.startsWith('prv_test_')) {
                console.log(`🧪 MODO SANDBOX: Retiro simulado de $${montoNetoAlBanco} netos. Comisión: $${COMISION_DISPERSION_WOMPI}`);
            } else {
                const wompiResponse = await fetch('https://production.wompi.co/v1/transfers', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        amount_in_cents: montoNetoAlBanco * 100,
                        currency: "COP",
                        reference: referenceId,
                        destination: {
                            type: method.toUpperCase(), 
                            account_number: destination,
                            account_holder_document_type: docType,
                            account_holder_document_number: docNumber
                        }
                    })
                });

                const wompiData = await wompiResponse.json();

                if (!wompiResponse.ok || wompiData.error) {
                    throw new Error(wompiData.error?.messages ? wompiData.error.messages.join(', ') : (wompiData.message || 'Rechazado'));
                }
            }

            await client.query('COMMIT');
            
            res.json({ success: true, newLikesBalance: newDisponibles, newLikesGanados: newGanados });

        } catch (e) {
            await client.query('ROLLBACK');
            res.json({ success: false, message: `No se pudo procesar el retiro: ${e.message}` });
        } finally {
            client.release();
        }
    } catch (error) {
        res.json({ success: false, message: 'Error interno procesando el retiro' });
    }
});





// ==================== RUTA DE SALUD ====================

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API funcionando correctamente' });
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Base de datos: PostgreSQL (Aiven)`);
    console.log(`📝 Endpoint de reportes disponible: POST /api/public/reports`);
});
