-- ============================================
-- SCRIPT PARA CORREGIR LA TABLA users
-- Agrega la columna password_hash si no existe
-- ============================================

-- Verificar si password_hash existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        -- Agregar la columna password_hash (permitir NULL inicialmente)
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
        
        -- Si hay una columna "password" antigua, migrar los datos
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'password'
        ) THEN
            -- Copiar datos de password a password_hash (si existen)
            UPDATE users 
            SET password_hash = password 
            WHERE password_hash IS NULL AND password IS NOT NULL;
        END IF;
        
        -- Hacer password_hash NOT NULL solo si no hay datos o todos tienen valor
        -- Por ahora lo dejamos nullable para no romper datos existentes
        RAISE NOTICE 'Columna password_hash agregada correctamente';
    ELSE
        RAISE NOTICE 'La columna password_hash ya existe';
    END IF;
END $$;

-- Verificar otras columnas necesarias
DO $$
BEGIN
    -- Agregar image_url si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE users ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Columna image_url agregada';
    END IF;
    
    -- Agregar plan si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'plan'
    ) THEN
        ALTER TABLE users ADD COLUMN plan VARCHAR(20) DEFAULT 'azul';
        RAISE NOTICE 'Columna plan agregada';
    END IF;
    
    -- Agregar likes_disponibles si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'likes_disponibles'
    ) THEN
        ALTER TABLE users ADD COLUMN likes_disponibles INTEGER DEFAULT 0;
        RAISE NOTICE 'Columna likes_disponibles agregada';
    END IF;
    
    -- Agregar likes_ganados si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'likes_ganados'
    ) THEN
        ALTER TABLE users ADD COLUMN likes_ganados INTEGER DEFAULT 0;
        RAISE NOTICE 'Columna likes_ganados agregada';
    END IF;
    
    -- Agregar dinero_ganado si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'dinero_ganado'
    ) THEN
        ALTER TABLE users ADD COLUMN dinero_ganado DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Columna dinero_ganado agregada';
    END IF;
    
    -- Agregar created_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Columna created_at agregada';
    END IF;
    
    -- Agregar updated_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Columna updated_at agregada';
    END IF;
END $$;

-- Verificar estructura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

