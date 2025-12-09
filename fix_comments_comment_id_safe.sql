-- Script seguro para cambiar comment_id de INTEGER a VARCHAR(100)
-- Este script verifica la estructura antes de hacer cambios

-- Paso 1: Verificar si comment_id ya es VARCHAR
DO $$
DECLARE
    current_type TEXT;
BEGIN
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'comment_id';
    
    IF current_type IS NULL THEN
        RAISE NOTICE 'La columna comment_id no existe';
    ELSIF current_type = 'character varying' OR current_type = 'varchar' THEN
        RAISE NOTICE 'comment_id ya es VARCHAR, no se necesita cambiar';
    ELSE
        RAISE NOTICE 'comment_id es de tipo: %, se procederá a cambiarlo', current_type;
    END IF;
END $$;

-- Paso 2: Si comment_id es INTEGER, cambiarlo a VARCHAR
-- Primero, eliminar restricciones que dependan de comment_id
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_comment_id_key;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_comment_id_unique;

-- Paso 3: Crear una nueva columna temporal como VARCHAR
ALTER TABLE comments ADD COLUMN IF NOT EXISTS comment_id_temp VARCHAR(100);

-- Paso 4: Copiar y convertir los valores existentes
UPDATE comments 
SET comment_id_temp = 'comment_' || comment_id::text 
WHERE comment_id_temp IS NULL;

-- Paso 5: Si hay filas sin comment_id_temp, generar valores únicos
UPDATE comments 
SET comment_id_temp = 'comment_' || COALESCE(
    (SELECT MAX(CAST(SUBSTRING(comment_id_temp FROM 9) AS INTEGER)) FROM comments WHERE comment_id_temp ~ '^comment_[0-9]+$'),
    0
) + ROW_NUMBER() OVER ()::text
WHERE comment_id_temp IS NULL;

-- Paso 6: Eliminar la columna antigua (si existe y es INTEGER)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'comment_id' 
        AND data_type IN ('integer', 'bigint', 'smallint', 'serial', 'bigserial')
    ) THEN
        ALTER TABLE comments DROP COLUMN comment_id;
    END IF;
END $$;

-- Paso 7: Renombrar la columna temporal
ALTER TABLE comments RENAME COLUMN comment_id_temp TO comment_id;

-- Paso 8: Hacer comment_id NOT NULL y UNIQUE
ALTER TABLE comments ALTER COLUMN comment_id SET NOT NULL;
ALTER TABLE comments ADD CONSTRAINT comments_comment_id_key UNIQUE (comment_id);

-- Verificar la estructura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'comments'
ORDER BY ordinal_position;

