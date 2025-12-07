-- Migración: Agregar campo celular a tabla usuarios
-- Fecha: 2025-12-07
-- Descripción: Agregar columna para almacenar número celular de 10 dígitos
\c control_gastos;
-- Agregar columna celular
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS celular VARCHAR(10);

-- Agregar constraint para validar que sea de 10 dígitos
ALTER TABLE usuarios
ADD CONSTRAINT check_celular_length
CHECK (celular IS NULL OR LENGTH(celular) = 10);

-- Comentario sobre la columna
COMMENT ON COLUMN usuarios.celular IS 'Número de celular de 10 dígitos del usuario';
