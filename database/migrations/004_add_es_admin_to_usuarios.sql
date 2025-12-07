-- Migración: Agregar campo es_admin a tabla usuarios
-- Fecha: 2024-12-07
-- Descripción: Agrega campo booleano es_admin para identificar administradores del sistema

\c control_gastos;

-- Agregar columna es_admin
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS es_admin BOOLEAN DEFAULT FALSE;

-- Comentario para documentación
COMMENT ON COLUMN usuarios.es_admin IS 'Indica si el usuario es administrador del sistema';

COMMIT;
