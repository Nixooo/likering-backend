-- Script para agregar campos de estado a la tabla users
-- Ejecuta este script en tu base de datos PostgreSQL para habilitar el sistema de estado

-- Agregar columnas is_online y last_seen si no existen
DO $$ 
BEGIN
    -- Agregar is_online si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_online'
    ) THEN
        ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);
    END IF;
    
    -- Agregar last_seen si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_seen'
    ) THEN
        ALTER TABLE users ADD COLUMN last_seen TIMESTAMP;
        CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
    END IF;
END $$;

-- Actualizar todos los usuarios existentes para que tengan valores por defecto
UPDATE users SET is_online = false WHERE is_online IS NULL;
UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE last_seen IS NULL;

