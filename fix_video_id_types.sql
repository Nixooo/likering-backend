-- ============================================
-- SCRIPT PARA CORREGIR LOS TIPOS DE video_id
-- Todas las tablas deben usar VARCHAR(100) para video_id
-- ============================================

-- Corregir video_likes
DO $$
BEGIN
    -- Verificar si video_id existe y es INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_likes' 
        AND column_name = 'video_id' 
        AND data_type = 'integer'
    ) THEN
        -- Eliminar foreign key constraint si existe
        ALTER TABLE video_likes DROP CONSTRAINT IF EXISTS fk_video_likes_video;
        ALTER TABLE video_likes DROP CONSTRAINT IF EXISTS video_likes_video_id_fkey;
        
        -- Cambiar el tipo de INTEGER a VARCHAR(100)
        ALTER TABLE video_likes ALTER COLUMN video_id TYPE VARCHAR(100);
        
        -- Recrear foreign key
        ALTER TABLE video_likes 
        ADD CONSTRAINT video_likes_video_id_fkey 
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ video_likes.video_id corregido a VARCHAR(100)';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_likes' 
        AND column_name = 'video_id'
    ) THEN
        -- Agregar columna si no existe
        ALTER TABLE video_likes ADD COLUMN video_id VARCHAR(100);
        ALTER TABLE video_likes 
        ADD CONSTRAINT video_likes_video_id_fkey 
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE;
        RAISE NOTICE '✅ video_likes.video_id agregado como VARCHAR(100)';
    ELSE
        RAISE NOTICE '✅ video_likes.video_id ya es VARCHAR(100)';
    END IF;
END $$;

-- Corregir video_views
DO $$
BEGIN
    -- Verificar si video_id existe y es INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_views' 
        AND column_name = 'video_id' 
        AND data_type = 'integer'
    ) THEN
        -- Eliminar foreign key constraint si existe
        ALTER TABLE video_views DROP CONSTRAINT IF EXISTS fk_video_views_video;
        ALTER TABLE video_views DROP CONSTRAINT IF EXISTS video_views_video_id_fkey;
        
        -- Cambiar el tipo de INTEGER a VARCHAR(100)
        ALTER TABLE video_views ALTER COLUMN video_id TYPE VARCHAR(100);
        
        -- Recrear foreign key
        ALTER TABLE video_views 
        ADD CONSTRAINT video_views_video_id_fkey 
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ video_views.video_id corregido a VARCHAR(100)';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_views' 
        AND column_name = 'video_id'
    ) THEN
        -- Agregar columna si no existe
        ALTER TABLE video_views ADD COLUMN video_id VARCHAR(100);
        ALTER TABLE video_views 
        ADD CONSTRAINT video_views_video_id_fkey 
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE;
        RAISE NOTICE '✅ video_views.video_id agregado como VARCHAR(100)';
    ELSE
        RAISE NOTICE '✅ video_views.video_id ya es VARCHAR(100)';
    END IF;
END $$;

-- Corregir comments
DO $$
BEGIN
    -- Verificar si video_id existe y es INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'video_id' 
        AND data_type = 'integer'
    ) THEN
        -- Eliminar foreign key constraint si existe
        ALTER TABLE comments DROP CONSTRAINT IF EXISTS fk_comments_video;
        ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_video_id_fkey;
        
        -- Cambiar el tipo de INTEGER a VARCHAR(100)
        ALTER TABLE comments ALTER COLUMN video_id TYPE VARCHAR(100);
        
        -- Recrear foreign key
        ALTER TABLE comments 
        ADD CONSTRAINT comments_video_id_fkey 
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ comments.video_id corregido a VARCHAR(100)';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'video_id'
    ) THEN
        -- Agregar columna si no existe
        ALTER TABLE comments ADD COLUMN video_id VARCHAR(100);
        ALTER TABLE comments 
        ADD CONSTRAINT comments_video_id_fkey 
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE;
        RAISE NOTICE '✅ comments.video_id agregado como VARCHAR(100)';
    ELSE
        RAISE NOTICE '✅ comments.video_id ya es VARCHAR(100)';
    END IF;
END $$;

-- Verificar estructura final
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
WHERE table_name = 'comments' AND column_name = 'video_id'
UNION ALL
SELECT 
    'videos' as tabla,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'videos' AND column_name = 'video_id';

