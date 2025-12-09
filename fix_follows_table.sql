-- ============================================
-- SCRIPT PARA CREAR/CORREGIR LA TABLA follows
-- ============================================

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    follower_username VARCHAR(50) NOT NULL,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_username VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_username, following_username)
);

-- Agregar columnas faltantes si la tabla ya existe
DO $$
BEGIN
    -- Agregar follower_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'follows' AND column_name = 'follower_id'
    ) THEN
        ALTER TABLE follows ADD COLUMN follower_id INTEGER;
        ALTER TABLE follows ADD CONSTRAINT follows_follower_id_fkey 
            FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Columna follower_id agregada';
    END IF;

    -- Agregar follower_username si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'follows' AND column_name = 'follower_username'
    ) THEN
        ALTER TABLE follows ADD COLUMN follower_username VARCHAR(50);
        RAISE NOTICE '✅ Columna follower_username agregada';
    END IF;

    -- Agregar following_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'follows' AND column_name = 'following_id'
    ) THEN
        ALTER TABLE follows ADD COLUMN following_id INTEGER;
        ALTER TABLE follows ADD CONSTRAINT follows_following_id_fkey 
            FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Columna following_id agregada';
    END IF;

    -- Agregar following_username si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'follows' AND column_name = 'following_username'
    ) THEN
        ALTER TABLE follows ADD COLUMN following_username VARCHAR(50);
        RAISE NOTICE '✅ Columna following_username agregada';
    END IF;

    -- Agregar created_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'follows' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE follows ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Columna created_at agregada';
    END IF;

    -- Agregar constraint UNIQUE si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'follows' 
        AND constraint_name = 'follows_follower_username_following_username_key'
    ) THEN
        ALTER TABLE follows ADD CONSTRAINT follows_follower_username_following_username_key 
            UNIQUE (follower_username, following_username);
        RAISE NOTICE '✅ Constraint UNIQUE agregado';
    END IF;
END $$;

-- Verificar estructura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'follows'
ORDER BY ordinal_position;


