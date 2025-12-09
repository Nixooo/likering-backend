-- ============================================
-- SCRIPT PARA CORREGIR TODAS LAS COLUMNAS video_id
-- Cambia de INTEGER a VARCHAR(100) en todas las tablas
-- ============================================

-- IMPORTANTE: Este script eliminará datos existentes en estas tablas
-- Si tienes datos importantes, haz un backup primero

BEGIN;

-- Paso 1: Eliminar foreign keys que dependen de video_id
ALTER TABLE video_likes DROP CONSTRAINT IF EXISTS video_likes_video_id_fkey;
ALTER TABLE video_likes DROP CONSTRAINT IF EXISTS fk_video_likes_video;
ALTER TABLE video_views DROP CONSTRAINT IF EXISTS video_views_video_id_fkey;
ALTER TABLE video_views DROP CONSTRAINT IF EXISTS fk_video_views_video;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_video_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS fk_comments_video;

-- Paso 2: Eliminar datos existentes (opcional, descomenta si quieres limpiar)
-- TRUNCATE TABLE video_likes;
-- TRUNCATE TABLE video_views;
-- TRUNCATE TABLE comments;
-- TRUNCATE TABLE videos;

-- Paso 3: Corregir tabla videos
-- Si video_id es serial/identity, necesitamos eliminarlo y recrearlo
DO $$
BEGIN
    -- Verificar si video_id es serial/identity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' 
        AND column_name = 'video_id' 
        AND data_type IN ('integer', 'serial')
    ) THEN
        -- Eliminar la columna id si existe (por si acaso)
        ALTER TABLE videos DROP COLUMN IF EXISTS id CASCADE;
        
        -- Eliminar la columna video_id antigua
        ALTER TABLE videos DROP COLUMN IF EXISTS video_id CASCADE;
        
        -- Crear nueva columna video_id como VARCHAR(100)
        ALTER TABLE videos ADD COLUMN video_id VARCHAR(100) UNIQUE NOT NULL;
        
        -- Hacer video_id la primary key (si no hay otra)
        -- Primero verificar si hay primary key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'videos' 
            AND constraint_type = 'PRIMARY KEY'
        ) THEN
            ALTER TABLE videos ADD PRIMARY KEY (video_id);
        END IF;
        
        RAISE NOTICE '✅ videos.video_id corregido a VARCHAR(100)';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'videos' 
        AND column_name = 'video_id' 
        AND data_type = 'character varying'
    ) THEN
        -- Ya es VARCHAR, solo asegurar que sea VARCHAR(100)
        ALTER TABLE videos ALTER COLUMN video_id TYPE VARCHAR(100);
        RAISE NOTICE '✅ videos.video_id ya es VARCHAR, ajustado a VARCHAR(100)';
    ELSE
        -- No existe, crearla
        ALTER TABLE videos ADD COLUMN video_id VARCHAR(100) UNIQUE NOT NULL;
        RAISE NOTICE '✅ videos.video_id agregado como VARCHAR(100)';
    END IF;
END $$;

-- Paso 4: Corregir tabla video_likes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_likes' 
        AND column_name = 'video_id' 
        AND data_type IN ('integer', 'int4')
    ) THEN
        ALTER TABLE video_likes DROP COLUMN video_id;
        ALTER TABLE video_likes ADD COLUMN video_id VARCHAR(100) NOT NULL;
        RAISE NOTICE '✅ video_likes.video_id corregido a VARCHAR(100)';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_likes' 
        AND column_name = 'video_id'
    ) THEN
        ALTER TABLE video_likes ADD COLUMN video_id VARCHAR(100) NOT NULL;
        RAISE NOTICE '✅ video_likes.video_id agregado como VARCHAR(100)';
    ELSE
        ALTER TABLE video_likes ALTER COLUMN video_id TYPE VARCHAR(100);
        RAISE NOTICE '✅ video_likes.video_id ajustado a VARCHAR(100)';
    END IF;
END $$;

-- Paso 5: Corregir tabla video_views
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_views' 
        AND column_name = 'video_id' 
        AND data_type IN ('integer', 'int4')
    ) THEN
        ALTER TABLE video_views DROP COLUMN video_id;
        ALTER TABLE video_views ADD COLUMN video_id VARCHAR(100) NOT NULL;
        RAISE NOTICE '✅ video_views.video_id corregido a VARCHAR(100)';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_views' 
        AND column_name = 'video_id'
    ) THEN
        ALTER TABLE video_views ADD COLUMN video_id VARCHAR(100) NOT NULL;
        RAISE NOTICE '✅ video_views.video_id agregado como VARCHAR(100)';
    ELSE
        ALTER TABLE video_views ALTER COLUMN video_id TYPE VARCHAR(100);
        RAISE NOTICE '✅ video_views.video_id ajustado a VARCHAR(100)';
    END IF;
END $$;

-- Paso 6: Corregir tabla comments
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'video_id' 
        AND data_type IN ('integer', 'int4')
    ) THEN
        ALTER TABLE comments DROP COLUMN video_id;
        ALTER TABLE comments ADD COLUMN video_id VARCHAR(100) NOT NULL;
        RAISE NOTICE '✅ comments.video_id corregido a VARCHAR(100)';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'video_id'
    ) THEN
        ALTER TABLE comments ADD COLUMN video_id VARCHAR(100) NOT NULL;
        RAISE NOTICE '✅ comments.video_id agregado como VARCHAR(100)';
    ELSE
        ALTER TABLE comments ALTER COLUMN video_id TYPE VARCHAR(100);
        RAISE NOTICE '✅ comments.video_id ajustado a VARCHAR(100)';
    END IF;
END $$;

-- Paso 7: Recrear foreign keys
ALTER TABLE video_likes 
ADD CONSTRAINT video_likes_video_id_fkey 
FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE;

ALTER TABLE video_views 
ADD CONSTRAINT video_views_video_id_fkey 
FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE;

ALTER TABLE comments 
ADD CONSTRAINT comments_video_id_fkey 
FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE;

-- Paso 8: Recrear índices y constraints únicos
CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);

-- Recrear constraint UNIQUE en video_likes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'video_likes' 
        AND constraint_name = 'video_likes_video_id_username_key'
    ) THEN
        ALTER TABLE video_likes ADD CONSTRAINT video_likes_video_id_username_key UNIQUE (video_id, username);
    END IF;
END $$;

-- Recrear constraint UNIQUE en video_views
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'video_views' 
        AND constraint_name = 'video_views_video_id_username_key'
    ) THEN
        ALTER TABLE video_views ADD CONSTRAINT video_views_video_id_username_key UNIQUE (video_id, username);
    END IF;
END $$;

COMMIT;

-- Verificar estructura final
SELECT 
    'videos' as tabla,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'videos' AND column_name = 'video_id'
UNION ALL
SELECT 
    'video_likes' as tabla,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'video_likes' AND column_name = 'video_id'
UNION ALL
SELECT 
    'video_views' as tabla,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'video_views' AND column_name = 'video_id'
UNION ALL
SELECT 
    'comments' as tabla,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'comments' AND column_name = 'video_id';

