-- Migración: Agregar columnas de consentimiento de cookies
-- Fecha: Diciembre 2024
-- Descripción: Agrega las columnas de consentimiento de cookies a la tabla usuarios

-- Conectarse a la base de datos
\c control_gastos;

-- Agregar columnas si no existen
DO $$
BEGIN
    -- Agregar columna cookie_consent_analytics
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'cookie_consent_analytics'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN cookie_consent_analytics BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Columna cookie_consent_analytics agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna cookie_consent_analytics ya existe';
    END IF;

    -- Agregar columna cookie_consent_marketing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'cookie_consent_marketing'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN cookie_consent_marketing BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Columna cookie_consent_marketing agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna cookie_consent_marketing ya existe';
    END IF;

    -- Agregar columna cookie_consent_preferences
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'cookie_consent_preferences'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN cookie_consent_preferences BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Columna cookie_consent_preferences agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna cookie_consent_preferences ya existe';
    END IF;

    -- Agregar columna cookie_consent_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'cookie_consent_date'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN cookie_consent_date TIMESTAMP;
        RAISE NOTICE 'Columna cookie_consent_date agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna cookie_consent_date ya existe';
    END IF;
END $$;

-- Verificar los cambios
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
AND column_name LIKE 'cookie_consent%'
ORDER BY column_name;
