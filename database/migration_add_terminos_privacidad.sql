-- Migración: Agregar columnas de aceptación de términos y privacidad
-- Fecha: Diciembre 2025
-- Descripción: Agrega las columnas acepto_terminos y acepto_privacidad a la tabla usuarios

-- Conectarse a la base de datos
\c control_gastos;

-- Agregar columnas si no existen
DO $$
BEGIN
    -- Agregar columna acepto_terminos
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'acepto_terminos'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN acepto_terminos BOOLEAN DEFAULT FALSE NOT NULL;
        RAISE NOTICE 'Columna acepto_terminos agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna acepto_terminos ya existe';
    END IF;

    -- Agregar columna acepto_privacidad
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'acepto_privacidad'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN acepto_privacidad BOOLEAN DEFAULT FALSE NOT NULL;
        RAISE NOTICE 'Columna acepto_privacidad agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna acepto_privacidad ya existe';
    END IF;
END $$;

-- Opcional: Actualizar usuarios existentes para que tengan los valores en TRUE
-- (asumiendo que los usuarios actuales ya aceptaron implícitamente)
UPDATE usuarios
SET acepto_terminos = TRUE, acepto_privacidad = TRUE
WHERE acepto_terminos = FALSE OR acepto_privacidad = FALSE;

-- Verificar los cambios
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
AND column_name IN ('acepto_terminos', 'acepto_privacidad');
