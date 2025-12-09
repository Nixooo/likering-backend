-- ============================================
-- SCRIPT PARA CREAR/CORREGIR LA TABLA messages
-- ============================================

-- Crear la tabla si no existe
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

-- Agregar columnas faltantes si la tabla ya existe
DO $$
BEGIN
    -- Agregar message_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'message_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN message_id VARCHAR(100);
        ALTER TABLE messages ADD CONSTRAINT messages_message_id_unique UNIQUE (message_id);
        RAISE NOTICE '✅ Columna message_id agregada';
    END IF;

    -- Agregar from_user_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'from_user_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN from_user_id INTEGER;
        ALTER TABLE messages ADD CONSTRAINT messages_from_user_id_fkey 
            FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Columna from_user_id agregada';
    END IF;

    -- Agregar from_username si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'from_username'
    ) THEN
        ALTER TABLE messages ADD COLUMN from_username VARCHAR(50);
        RAISE NOTICE '✅ Columna from_username agregada';
    END IF;

    -- Agregar to_user_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'to_user_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN to_user_id INTEGER;
        ALTER TABLE messages ADD CONSTRAINT messages_to_user_id_fkey 
            FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Columna to_user_id agregada';
    END IF;

    -- Agregar to_username si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'to_username'
    ) THEN
        ALTER TABLE messages ADD COLUMN to_username VARCHAR(50);
        RAISE NOTICE '✅ Columna to_username agregada';
    END IF;

    -- Agregar message_text si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'message_text'
    ) THEN
        ALTER TABLE messages ADD COLUMN message_text TEXT;
        RAISE NOTICE '✅ Columna message_text agregada';
    END IF;

    -- Agregar read si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'read'
    ) THEN
        ALTER TABLE messages ADD COLUMN read BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Columna read agregada';
    END IF;

    -- Agregar read_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'read_at'
    ) THEN
        ALTER TABLE messages ADD COLUMN read_at TIMESTAMP;
        RAISE NOTICE '✅ Columna read_at agregada';
    END IF;

    -- Agregar created_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE messages ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Columna created_at agregada';
    END IF;
END $$;

-- Asegurar que las columnas username sean NOT NULL si no tienen datos
DO $$
BEGIN
    -- Verificar si hay datos
    IF NOT EXISTS (SELECT 1 FROM messages WHERE from_username IS NULL OR to_username IS NULL) THEN
        -- Si no hay NULLs, hacer las columnas NOT NULL
        BEGIN
            ALTER TABLE messages ALTER COLUMN from_username SET NOT NULL;
            ALTER TABLE messages ALTER COLUMN to_username SET NOT NULL;
            ALTER TABLE messages ALTER COLUMN message_text SET NOT NULL;
            RAISE NOTICE '✅ Columnas configuradas como NOT NULL';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ No se pudieron establecer NOT NULL (puede haber datos NULL)';
        END;
    END IF;
END $$;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_messages_from_to ON messages(from_username, to_username);
CREATE INDEX IF NOT EXISTS idx_messages_to_from ON messages(to_username, from_username);
CREATE INDEX IF NOT EXISTS idx_messages_from_user_id ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user_id ON messages(to_user_id);

-- Verificar estructura final
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

