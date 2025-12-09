-- ============================================
-- SCRIPT PARA CREAR/CORREGIR LA TABLA videos
-- ============================================

-- Crear la tabla si no existe
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

-- Agregar columnas faltantes si la tabla ya existe
DO $$
BEGIN
    -- Agregar video_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'video_id'
    ) THEN
        ALTER TABLE videos ADD COLUMN video_id VARCHAR(100);
        ALTER TABLE videos ADD CONSTRAINT videos_video_id_unique UNIQUE (video_id);
        RAISE NOTICE '✅ Columna video_id agregada';
    END IF;

    -- Agregar user_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE videos ADD COLUMN user_id INTEGER;
        ALTER TABLE videos ADD CONSTRAINT videos_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Columna user_id agregada';
    END IF;

    -- Agregar username si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'username'
    ) THEN
        ALTER TABLE videos ADD COLUMN username VARCHAR(50);
        RAISE NOTICE '✅ Columna username agregada';
    END IF;

    -- Agregar titulo si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'titulo'
    ) THEN
        ALTER TABLE videos ADD COLUMN titulo VARCHAR(255);
        RAISE NOTICE '✅ Columna titulo agregada';
    END IF;

    -- Agregar descripcion si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'descripcion'
    ) THEN
        ALTER TABLE videos ADD COLUMN descripcion TEXT;
        RAISE NOTICE '✅ Columna descripcion agregada';
    END IF;

    -- Agregar video_url si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'video_url'
    ) THEN
        ALTER TABLE videos ADD COLUMN video_url TEXT;
        RAISE NOTICE '✅ Columna video_url agregada';
    END IF;

    -- Agregar thumbnail_url si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'thumbnail_url'
    ) THEN
        ALTER TABLE videos ADD COLUMN thumbnail_url TEXT;
        RAISE NOTICE '✅ Columna thumbnail_url agregada';
    END IF;

    -- Agregar music_url si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'music_url'
    ) THEN
        ALTER TABLE videos ADD COLUMN music_url TEXT;
        RAISE NOTICE '✅ Columna music_url agregada';
    END IF;

    -- Agregar music_name si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'music_name'
    ) THEN
        ALTER TABLE videos ADD COLUMN music_name VARCHAR(255);
        RAISE NOTICE '✅ Columna music_name agregada';
    END IF;

    -- Agregar likes si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'likes'
    ) THEN
        ALTER TABLE videos ADD COLUMN likes INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Columna likes agregada';
    END IF;

    -- Agregar comments_count si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'comments_count'
    ) THEN
        ALTER TABLE videos ADD COLUMN comments_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Columna comments_count agregada';
    END IF;

    -- Agregar visualizaciones si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'visualizaciones'
    ) THEN
        ALTER TABLE videos ADD COLUMN visualizaciones INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Columna visualizaciones agregada';
    END IF;

    -- Agregar created_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE videos ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Columna created_at agregada';
    END IF;

    -- Agregar updated_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE videos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Columna updated_at agregada';
    END IF;
END $$;

-- Verificar estructura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'videos'
ORDER BY ordinal_position;

