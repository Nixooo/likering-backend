-- Verificar estructura de tablas relacionadas con videos
-- Estas tablas deben tener video_id como VARCHAR(100) para coincidir con videos.video_id

-- Verificar video_likes
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'video_likes' AND column_name = 'video_id';

-- Verificar video_views
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'video_views' AND column_name = 'video_id';

-- Verificar comments
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'comments' AND column_name = 'video_id';

-- Verificar videos (para comparar)
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'videos' AND column_name = 'video_id';

