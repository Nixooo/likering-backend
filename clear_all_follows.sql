-- Script para borrar todos los registros de la tabla follows
-- Este script elimina todos los seguimientos entre usuarios

-- Verificar cuántos registros hay antes de borrar
SELECT COUNT(*) as total_follows_before FROM follows;

-- Borrar todos los registros de la tabla follows
DELETE FROM follows;

-- Verificar que se borraron todos
SELECT COUNT(*) as total_follows_after FROM follows;

-- Verificar la estructura de la tabla (debe estar vacía pero la estructura intacta)
SELECT * FROM follows LIMIT 5;

