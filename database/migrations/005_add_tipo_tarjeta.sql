-- Migración: Agregar campo tipo_tarjeta para soportar tarjetas de servicios
-- Fecha: 2024-12-07
-- Descripción: Agrega campo tipo_tarjeta y modifica linea_credito para permitir NULL en tarjetas de servicios

\c control_gastos;

-- Agregar columna tipo_tarjeta
ALTER TABLE tarjetas
ADD COLUMN IF NOT EXISTS tipo_tarjeta VARCHAR(20) NOT NULL DEFAULT 'CREDITO';

-- Actualizar tarjetas existentes a mayúsculas
UPDATE tarjetas
SET tipo_tarjeta = UPPER(tipo_tarjeta);

-- Eliminar constraint anterior si existe
ALTER TABLE tarjetas
DROP CONSTRAINT IF EXISTS check_tipo_tarjeta;

-- Agregar constraint para validar tipo de tarjeta
ALTER TABLE tarjetas
ADD CONSTRAINT check_tipo_tarjeta
CHECK (tipo_tarjeta IN ('CREDITO', 'DEBITO', 'DEPARTAMENTAL', 'SERVICIOS'));

-- Modificar linea_credito para permitir NULL (para tarjetas de servicios)
ALTER TABLE tarjetas
ALTER COLUMN linea_credito DROP NOT NULL;

-- Actualizar comentario de la tabla
COMMENT ON COLUMN tarjetas.tipo_tarjeta IS 'Tipo de tarjeta: CREDITO, DEBITO, DEPARTAMENTAL, SERVICIOS (American Express)';
COMMENT ON COLUMN tarjetas.linea_credito IS 'Línea de crédito. NULL para tarjetas de servicios con límite variable';

COMMIT;
