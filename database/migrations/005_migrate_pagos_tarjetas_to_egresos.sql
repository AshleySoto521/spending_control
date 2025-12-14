-- Migración: Registrar pagos de tarjeta existentes como egresos
-- Fecha: 2025-12-14
-- Propósito: Migrar todos los pagos de tarjetas anteriores a la tabla de egresos
--            para tener una visión completa del flujo de efectivo

-- Nota: Este script es idempotente - puede ejecutarse múltiples veces sin duplicar datos
\c control_gastos;

BEGIN;

-- Insertar en egresos todos los pagos de tarjetas que aún no están registrados
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
    pt.id_usuario,
    pt.fecha_pago AS fecha_egreso,
    CONCAT('Pago de tarjeta - ', t.nom_tarjeta) AS concepto,
    COALESCE(t.banco, 'Banco') AS establecimiento,
    pt.monto,
    pt.id_forma_pago,
    COALESCE(pt.descripcion, 'Pago de tarjeta de crédito') AS descripcion,
    FALSE AS compra_meses,
    pt.fecha_creacion
FROM pagos_tarjetas pt
INNER JOIN tarjetas t ON pt.id_tarjeta = t.id_tarjeta
WHERE NOT EXISTS (
    -- Evitar duplicados: verificar que no exista ya un egreso con las mismas características
    SELECT 1 FROM egresos e
    WHERE e.id_usuario = pt.id_usuario
    AND e.fecha_egreso = pt.fecha_pago
    AND e.monto = pt.monto
    AND e.id_forma_pago = pt.id_forma_pago
    AND e.concepto = CONCAT('Pago de tarjeta - ', t.nom_tarjeta)
)
ORDER BY pt.fecha_pago;

-- Mostrar resultado de la migración
DO $$
DECLARE
    registros_migrados INTEGER;
BEGIN
    GET DIAGNOSTICS registros_migrados = ROW_COUNT;
    RAISE NOTICE 'Migración completada: % pagos de tarjeta registrados como egresos', registros_migrados;
END $$;

COMMIT;

-- Verificación: Mostrar resumen de pagos vs egresos creados
SELECT
    'Resumen de migración' AS descripcion,
    (SELECT COUNT(*) FROM pagos_tarjetas) AS total_pagos_tarjetas,
    (SELECT COUNT(*) FROM egresos WHERE concepto LIKE 'Pago de tarjeta -%') AS total_egresos_pago_tarjeta;
