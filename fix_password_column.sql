-- ============================================
-- SCRIPT PARA CORREGIR LA COLUMNA password
-- Migra de "password" a "password_hash"
-- ============================================

-- Paso 1: Verificar estructura actual
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Paso 2: Migrar de "password" a "password_hash"
DO $$
BEGIN
    -- Si existe "password" pero NO existe "password_hash"
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        -- Agregar password_hash (permitir NULL temporalmente)
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
        
        -- Migrar datos de password a password_hash
        UPDATE users 
        SET password_hash = password 
        WHERE password IS NOT NULL;
        
        -- Hacer password_hash NOT NULL solo si no hay NULLs
        IF NOT EXISTS (SELECT 1 FROM users WHERE password_hash IS NULL) THEN
            ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
        END IF;
        
        -- Eliminar la restricción NOT NULL de password antes de eliminarla
        ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
        
        -- Eliminar la columna password antigua
        ALTER TABLE users DROP COLUMN password;
        
        RAISE NOTICE '✅ Migración completada: password -> password_hash';
    END IF;
    
    -- Si ambas columnas existen, migrar y eliminar password
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        -- Migrar datos si password_hash está vacío
        UPDATE users 
        SET password_hash = password 
        WHERE (password_hash IS NULL OR password_hash = '') AND password IS NOT NULL;
        
        -- Eliminar restricción NOT NULL de password
        ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
        
        -- Eliminar password
        ALTER TABLE users DROP COLUMN password;
        
        RAISE NOTICE '✅ Eliminada columna password duplicada';
    END IF;
    
    -- Si solo existe password_hash, verificar que tenga NOT NULL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        -- Verificar si puede ser NOT NULL
        IF NOT EXISTS (SELECT 1 FROM users WHERE password_hash IS NULL) THEN
            BEGIN
                ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
                RAISE NOTICE '✅ password_hash configurado como NOT NULL';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '⚠️ No se pudo establecer NOT NULL en password_hash';
            END;
        END IF;
    END IF;
END $$;

-- Paso 3: Asegurar que existan todas las columnas necesarias
DO $$
BEGIN
    -- Agregar image_url si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE users ADD COLUMN image_url TEXT;
        RAISE NOTICE '✅ Columna image_url agregada';
    END IF;
    
    -- Agregar plan si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'plan'
    ) THEN
        ALTER TABLE users ADD COLUMN plan VARCHAR(20) DEFAULT 'azul';
        RAISE NOTICE '✅ Columna plan agregada';
    END IF;
    
    -- Agregar likes_disponibles si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'likes_disponibles'
    ) THEN
        ALTER TABLE users ADD COLUMN likes_disponibles INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Columna likes_disponibles agregada';
    END IF;
    
    -- Agregar likes_ganados si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'likes_ganados'
    ) THEN
        ALTER TABLE users ADD COLUMN likes_ganados INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Columna likes_ganados agregada';
    END IF;
    
    -- Agregar dinero_ganado si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'dinero_ganado'
    ) THEN
        ALTER TABLE users ADD COLUMN dinero_ganado DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE '✅ Columna dinero_ganado agregada';
    END IF;
    
    -- Agregar created_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Columna created_at agregada';
    END IF;
    
    -- Agregar updated_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Columna updated_at agregada';
    END IF;
END $$;

-- Paso 4: Verificar estructura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

