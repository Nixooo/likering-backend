-- Cambiar comment_id de INTEGER/SERIAL a VARCHAR(100) en la tabla comments
-- Similar a lo que se hizo con video_id y message_id

-- Paso 1: Eliminar la restricción UNIQUE y la columna comment_id actual
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_comment_id_key;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_pkey;

-- Paso 2: Crear una nueva columna comment_id como VARCHAR
ALTER TABLE comments ADD COLUMN comment_id_new VARCHAR(100);

-- Paso 3: Copiar los valores existentes (convertir a string)
UPDATE comments SET comment_id_new = 'comment_' || id::text WHERE comment_id_new IS NULL;

-- Paso 4: Eliminar la columna antigua (si se llama comment_id y es INTEGER)
-- Primero verificamos si existe una columna comment_id de tipo integer
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'comment_id' 
        AND data_type IN ('integer', 'bigint', 'smallint')
    ) THEN
        ALTER TABLE comments DROP COLUMN comment_id;
    END IF;
END $$;

-- Paso 5: Renombrar la nueva columna
ALTER TABLE comments RENAME COLUMN comment_id_new TO comment_id;

-- Paso 6: Hacer comment_id NOT NULL y UNIQUE
ALTER TABLE comments ALTER COLUMN comment_id SET NOT NULL;
ALTER TABLE comments ADD CONSTRAINT comments_comment_id_key UNIQUE (comment_id);

-- Paso 7: Restaurar la clave primaria en id
ALTER TABLE comments ADD CONSTRAINT comments_pkey PRIMARY KEY (id);

-- Verificar la estructura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'comments'
ORDER BY ordinal_position;

