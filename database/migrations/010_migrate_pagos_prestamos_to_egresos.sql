-- Migración: Registrar pagos de préstamos existentes como egresos
-- Fecha: 2025-12-17
-- Propósito: Migrar todos los pagos de préstamos anteriores a la tabla de egresos
--            para que afecten correctamente el saldo actual del usuario

-- Nota: Este script es idempotente - puede ejecutarse múltiples veces sin duplicar datos
\c control_gastos;

BEGIN;

-- Insertar en egresos todos los pagos de préstamos que aún no están registrados
INSERT INTO egresos (
    id_usuario,
    fecha_egreso,
    concepto,
    establecimiento,
    monto,
    id_forma_pago,
    descripcion,
    compra_meses,
    fecha_creacion
)
SELECT
    pp.id_usuario,
    pp.fecha_pago AS fecha_egreso,
    CONCAT('Pago de préstamo ', LOWER(p.tipo_prestamo)) AS concepto,
    p.institucion AS establecimiento,
    pp.monto,
    pp.id_forma_pago,
    COALESCE(
        CONCAT(pp.descripcion, ' (Préstamo #', pp.id_prestamo, ')'),
        CONCAT('Pago de préstamo #', pp.id_prestamo)
    ) AS descripcion,
    FALSE AS compra_meses,
    pp.fecha_creacion
FROM pagos_prestamos pp
INNER JOIN prestamos p ON pp.id_prestamo = p.id_prestamo
WHERE NOT EXISTS (
    -- Evitar duplicados: verificar que no exista ya un egreso con las mismas características
    SELECT 1 FROM egresos e
    WHERE e.id_usuario = pp.id_usuario
    AND e.fecha_egreso = pp.fecha_pago
    AND e.monto = pp.monto
    AND e.id_forma_pago = pp.id_forma_pago
    AND e.concepto LIKE 'Pago de préstamo%'
    AND e.descripcion LIKE CONCAT('%Préstamo #', pp.id_prestamo, '%')
)
ORDER BY pp.fecha_pago;

-- Mostrar resultado de la migración
DO $$
DECLARE
    registros_migrados INTEGER;
BEGIN
    GET DIAGNOSTICS registros_migrados = ROW_COUNT;
    RAISE NOTICE 'Migración completada: % pagos de préstamo registrados como egresos', registros_migrados;
END $$;

COMMIT;

-- Verificación: Mostrar resumen de pagos vs egresos creados
SELECT
    'Resumen de migración' AS descripcion,
    (SELECT COUNT(*) FROM pagos_prestamos) AS total_pagos_prestamos,
    (SELECT COUNT(*) FROM egresos WHERE concepto LIKE 'Pago de préstamo%') AS total_egresos_pago_prestamo;
