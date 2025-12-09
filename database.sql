-- Esquema de base de datos para Likering
-- PostgreSQL para Aiven

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    image_url TEXT,
    plan VARCHAR(20) DEFAULT 'azul' CHECK (plan IN ('azul', 'rojo', 'naranja', 'verde', 'morado', 'negro', 'amarillo')),
    likes_disponibles INTEGER DEFAULT 0,
    likes_ganados INTEGER DEFAULT 0,
    dinero_ganado DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de videos
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    titulo VARCHAR(255),
    descripcion TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    music_url TEXT,
    music_name VARCHAR(255),
    likes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    visualizaciones INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de likes (para evitar likes duplicados)
CREATE TABLE IF NOT EXISTS video_likes (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(100) REFERENCES videos(video_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id, username)
);

-- Tabla de comentarios
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    comment_id VARCHAR(100) UNIQUE NOT NULL,
    video_id VARCHAR(100) REFERENCES videos(video_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    image_url TEXT,
    comment_text TEXT NOT NULL,
    edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de visualizaciones (para evitar contar múltiples veces)
CREATE TABLE IF NOT EXISTS video_views (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(100) REFERENCES videos(video_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id, username)
);

-- Tabla de seguidores
CREATE TABLE IF NOT EXISTS follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    follower_username VARCHAR(50) NOT NULL,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_username VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_username, following_username)
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(100) UNIQUE NOT NULL,
    from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    from_username VARCHAR(50) NOT NULL,
    to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    to_username VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_username ON videos(username);
CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_username ON video_likes(username);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_username ON comments(username);
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_username);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_username);
CREATE INDEX IF NOT EXISTS idx_messages_from_to ON messages(from_username, to_username);
CREATE INDEX IF NOT EXISTS idx_messages_to_from ON messages(to_username, from_username);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

