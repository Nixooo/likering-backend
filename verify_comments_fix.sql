-- Verificar que los cambios se aplicaron correctamente
-- Ejecuta este script para confirmar que todo está bien

-- 1. Verificar que comment_id es VARCHAR(100)
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'comments' 
AND column_name = 'comment_id';

-- 2. Verificar que existe la columna is_edited o edited
SELECT 
    column_name, 
    data_type
FROM information_schema.columns
WHERE table_name = 'comments' 
AND column_name IN ('is_edited', 'edited')
ORDER BY column_name;

-- 3. Verificar la estructura completa de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'comments'
ORDER BY ordinal_position;

-- 4. Verificar restricciones
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'comments'
ORDER BY tc.constraint_type, kcu.column_name;

