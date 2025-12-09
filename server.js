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

// ==================== UTILIDADES ====================

function generateId(prefix) {
    return `${prefix}_${uuidv4()}`;
}

async function getUserByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
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

        if (!username || !password || !imageUrl) {
            return res.json({ success: false, message: 'Todos los campos son requeridos' });
        }

        if (username.length < 3) {
            return res.json({ success: false, message: 'El nombre de usuario debe tener al menos 3 caracteres' });
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

        const userData = {
            username: newUser.username,
            imageUrl: newUser.image_url,
            plan: newUser.plan || 'azul',
            likesDisponibles: 0,
            likesGanados: 0,
            dineroGanado: 0
        };

        res.json({ success: true, data: userData });
    } catch (error) {
        console.error('Error en registro:', error);
        res.json({ success: false, message: 'Error al registrar usuario' });
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
                v.comments_count as comments,
                v.visualizaciones,
                u.image_url as profile_img,
                CASE WHEN vl.username IS NOT NULL THEN true ELSE false END as is_liked_by_current_user,
                CASE WHEN f.follower_username IS NOT NULL THEN true ELSE false END as is_following_user
            FROM videos v
            LEFT JOIN users u ON u.username = v.username
            LEFT JOIN video_likes vl ON vl.video_id = v.video_id AND vl.username = $1
            LEFT JOIN follows f ON f.follower_username = $1 AND f.following_username = v.username
            ORDER BY v.created_at DESC
        `, [username || '']);

        const videos = videosResult.rows.map(video => ({
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
            isLikedByCurrentUser: video.is_liked_by_current_user || false,
            isFollowingUser: video.is_following_user || false
        }));

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
        const { usuario, titulo, descripcion, videoUrl, thumbnailUrl, musicUrl } = req.body;

        if (!usuario || !videoUrl) {
            return res.json({ success: false, message: 'Usuario y URL del video son requeridos' });
        }

        const user = await getUserByUsername(usuario);
        if (!user) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        const videoId = generateId('video');
        const musicName = musicUrl ? `Música ${Date.now()}` : '';

        await pool.query(
            `INSERT INTO videos (video_id, user_id, username, titulo, descripcion, video_url, thumbnail_url, music_url, music_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [videoId, user.id, usuario, titulo || '', descripcion || '', videoUrl, thumbnailUrl || videoUrl, musicUrl || '', musicName]
        );

        res.json({ success: true, message: 'Video guardado', videoId });
    } catch (error) {
        console.error('Error al guardar video:', error);
        res.json({ success: false, message: 'Error al guardar video' });
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
        await pool.query(
            'INSERT INTO video_likes (video_id, user_id, username) VALUES ($1, $2, $3)',
            [videoId, user.id, username]
        );

        // Actualizar contador de likes del video
        await pool.query(
            'UPDATE videos SET likes = likes + 1 WHERE video_id = $1',
            [videoId]
        );

        res.json({ success: true, message: 'Like agregado' });
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
            await pool.query(
                'INSERT INTO video_views (video_id, user_id, username) VALUES ($1, $2, $3)',
                [videoId, user.id, username]
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

        const result = await pool.query(`
            SELECT 
                c.comment_id as commentId,
                c.username,
                c.comment_text as commentText,
                c.edited,
                c.created_at as timestamp,
                u.image_url as imageUrl
            FROM comments c
            LEFT JOIN users u ON u.username = c.username
            WHERE c.video_id = $1
            ORDER BY c.created_at DESC
        `, [videoId]);

        const comments = result.rows.map(comment => ({
            commentId: comment.commentid || comment.comment_id,
            username: comment.username,
            commentText: comment.commenttext || comment.comment_text,
            edited: comment.edited || false,
            timestamp: comment.timestamp,
            imageUrl: comment.imageurl || comment.image_url || ''
        }));

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

        await pool.query(
            'INSERT INTO comments (comment_id, video_id, user_id, username, image_url, comment_text) VALUES ($1, $2, $3, $4, $5, $6)',
            [commentId, videoId, user.id, username, user.image_url || '', commentText]
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

        await pool.query(
            'UPDATE comments SET comment_text = $1, edited = true, updated_at = CURRENT_TIMESTAMP WHERE comment_id = $2',
            [newText, commentId]
        );

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

// ==================== RUTAS DE SEGUIDORES ====================

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
        await pool.query(
            'INSERT INTO follows (follower_id, follower_username, following_id, following_username) VALUES ($1, $2, $3, $4)',
            [follower.id, followerUsername, target.id, targetUsername]
        );

        res.json({ success: true, message: `Ahora sigues a @${targetUsername}` });
    } catch (error) {
        console.error('Error al seguir usuario:', error);
        res.json({ success: false, message: 'Error al seguir usuario' });
    }
});

// ==================== RUTAS DE MENSAJERÍA ====================

// Obtener conversaciones
app.get('/api/messages/conversations', async (req, res) => {
    try {
        const { user } = req.query;

        if (!user) {
            return res.json({ success: false, message: 'Usuario requerido', data: [] });
        }

        const result = await pool.query(`
            SELECT DISTINCT
                CASE 
                    WHEN m.from_username = $1 THEN m.to_username
                    ELSE m.from_username
                END as other_user,
                CASE 
                    WHEN m.from_username = $1 THEN m.to_user_id
                    ELSE m.from_user_id
                END as other_user_id,
                m.message_text as last_message,
                m.created_at as last_message_time,
                COUNT(CASE WHEN m.from_username = $1 AND m.read = false THEN 1 END) as unread_count
            FROM messages m
            WHERE m.from_username = $1 OR m.to_username = $1
            GROUP BY other_user, other_user_id, last_message, last_message_time
            ORDER BY last_message_time DESC
        `, [user]);

        // Obtener imágenes de perfil
        const conversations = await Promise.all(result.rows.map(async (row) => {
            const userData = await getUserByUsername(row.other_user);
            return {
                username: row.other_user,
                lastMessage: row.last_message,
                lastMessageTime: row.last_message_time,
                unreadCount: parseInt(row.unread_count) || 0,
                imageUrl: userData?.image_url || ''
            };
        }));

        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('Error al obtener conversaciones:', error);
        res.json({ success: false, message: 'Error al obtener conversaciones', data: [] });
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

        await pool.query(
            'INSERT INTO messages (message_id, from_user_id, from_username, to_user_id, to_username, message_text) VALUES ($1, $2, $3, $4, $5, $6)',
            [messageId, fromUser.id, from, toUser.id, to, message]
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

