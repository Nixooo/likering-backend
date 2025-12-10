require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Render.com usa el puerto que asigna automáticamente

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
        const userData = {
            user_id: user.user_id || user.id,
            id: user.user_id || user.id, // También incluir como 'id' para compatibilidad
            username: user.username,
            imageUrl: user.image_url,
            plan: user.plan || 'azul',
            estado: user.estado || 'Activo', // Incluir estado para validación
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

        const userData = {
            user_id: newUser.user_id || newUser.id,
            id: newUser.user_id || newUser.id, // También incluir como 'id' para compatibilidad
            username: newUser.username,
            imageUrl: newUser.image_url,
            plan: newUser.plan || 'azul',
            estado: newUser.estado || 'Activo', // Incluir estado
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

// Obtener perfil de usuario
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

        res.json({
            success: true,
            data: {
                user_id: userData.user_id || userData.id,
                id: userData.user_id || userData.id, // También incluir como 'id' para compatibilidad
                username: userData.username,
                imageUrl: userData.image_url,
                plan: userData.plan || 'azul',
                followers: followersCount,
                following: followingCount,
                likes: likesCount,
                posts: postsCount
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

// Dar like a un video
app.post('/api/videos/like', async (req, res) => {
    try {
        const { videoId, username } = req.body;

        if (!videoId || !username) {
            return res.json({ success: false, message: 'Video ID y usuario requeridos' });
        }

        const user = await getUserByUsername(username);
        if (!user) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        // Verificar si ya dio like
        const existingLike = await pool.query(
            'SELECT * FROM video_likes WHERE video_id = $1 AND username = $2',
            [videoId, username]
        );

        if (existingLike.rows.length > 0) {
            return res.json({ success: false, message: 'Ya diste like a este video' });
        }

        // Agregar like
        const userId = user.id || user.user_id;
        await pool.query(
            'INSERT INTO video_likes (video_id, user_id, username) VALUES ($1, $2, $3)',
            [videoId, userId, username]
        );

        // Actualizar contador de likes del video
        await pool.query(
            'UPDATE videos SET likes = likes + 1 WHERE video_id = $1',
            [videoId]
        );

        // Obtener el nuevo contador
        const videoResult = await pool.query(
            'SELECT likes FROM videos WHERE video_id = $1',
            [videoId]
        );
        const newLikeCount = videoResult.rows[0]?.likes || 0;

        res.json({ success: true, message: 'Like agregado', isLiked: true, likes: newLikeCount });
    } catch (error) {
        console.error('Error al dar like:', error);
        res.json({ success: false, message: 'Error al dar like' });
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

// ==================== RUTA DE SALUD ====================

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API funcionando correctamente' });
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Base de datos: PostgreSQL (Aiven)`);
});

