-- Verificar y corregir la tabla comments
-- Este script verifica la estructura y agrega columnas faltantes si es necesario

-- Verificar si existe la columna is_edited, si no, agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'is_edited'
    ) THEN
        -- Si existe 'edited', renombrarla a 'is_edited'
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'comments' AND column_name = 'edited'
        ) THEN
            ALTER TABLE comments RENAME COLUMN edited TO is_edited;
        ELSE
            -- Si no existe ninguna, crear is_edited
            ALTER TABLE comments ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
END $$;

-- Verificar si existe image_url, si existe y no debería estar, no la eliminamos
-- (la dejamos por si acaso, pero el código no la usará)

-- Verificar estructura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'comments'
ORDER BY ordinal_position;

