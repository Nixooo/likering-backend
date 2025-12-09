-- ============================================
-- SCRIPT PARA CORREGIR message_id EN messages
-- Cambia de INTEGER a VARCHAR(100)
-- ============================================

BEGIN;

-- Paso 1: Eliminar foreign keys y constraints que dependen de message_id
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_id_unique;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_pkey;

-- Paso 2: Verificar y corregir message_id
DO $$
BEGIN
    -- Si message_id es INTEGER/SERIAL, cambiarlo a VARCHAR(100)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message_id' 
        AND data_type IN ('integer', 'int4', 'serial', 'serial4')
    ) THEN
        -- Eliminar la columna message_id antigua
        ALTER TABLE messages DROP COLUMN message_id CASCADE;
        
        -- Crear nueva columna message_id como VARCHAR(100)
        ALTER TABLE messages ADD COLUMN message_id VARCHAR(100) UNIQUE NOT NULL;
        
        RAISE NOTICE '✅ messages.message_id corregido a VARCHAR(100)';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message_id' 
        AND data_type = 'character varying'
    ) THEN
        -- Ya es VARCHAR, solo asegurar que sea VARCHAR(100) y UNIQUE
        ALTER TABLE messages ALTER COLUMN message_id TYPE VARCHAR(100);
        
        -- Agregar constraint UNIQUE si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'messages' 
            AND constraint_name = 'messages_message_id_unique'
        ) THEN
            ALTER TABLE messages ADD CONSTRAINT messages_message_id_unique UNIQUE (message_id);
        END IF;
        
        RAISE NOTICE '✅ messages.message_id ya es VARCHAR, ajustado a VARCHAR(100)';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message_id'
    ) THEN
        -- No existe, crearla
        ALTER TABLE messages ADD COLUMN message_id VARCHAR(100) UNIQUE NOT NULL;
        RAISE NOTICE '✅ messages.message_id agregado como VARCHAR(100)';
    END IF;
    
    -- Asegurar que id sea PRIMARY KEY si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'messages' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        -- Verificar si existe columna id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name = 'id'
        ) THEN
            ALTER TABLE messages ADD PRIMARY KEY (id);
        END IF;
    END IF;
END $$;

COMMIT;

-- Verificar estructura final
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'messages' 
AND column_name IN ('id', 'message_id')
ORDER BY ordinal_position;


