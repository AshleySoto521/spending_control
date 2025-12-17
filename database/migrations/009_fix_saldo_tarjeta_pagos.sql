-- Migración 009: Corregir cálculo de saldo de tarjetas para considerar pagos
-- Fecha: 2025-12-17
-- Descripción: Modifica las funciones de actualización de saldo para restar
--              los pagos registrados del saldo usado y elimina triggers
--              redundantes que causaban cálculos incorrectos
\c control_gastos;

-- Primero, eliminar los triggers redundantes de pagos_tarjetas
-- Estos triggers causaban que los pagos se restaran dos veces del saldo
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_pago_insert ON pagos_tarjetas;
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_pago_update ON pagos_tarjetas;
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_pago_delete ON pagos_tarjetas;

-- Eliminar la función que ya no usaremos
DROP FUNCTION IF EXISTS actualizar_saldo_pago_tarjeta();

-- Función actualizada para calcular saldo considerando pagos
CREATE OR REPLACE FUNCTION actualizar_saldo_tarjeta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_tarjeta IS NOT NULL THEN
        UPDATE tarjetas
        SET saldo_usado = (
            -- Suma de egresos
            SELECT COALESCE(SUM(
                CASE
                    -- Para compras a meses, solo sumar las cuotas pendientes
                    WHEN e.compra_meses = TRUE THEN
                        e.monto_mensual * (e.num_meses - COALESCE(e.meses_pagados, 0))
                    -- Para compras normales, sumar el monto completo
                    ELSE
                        e.monto
                END
            ), 0)
            FROM egresos e
            WHERE e.id_tarjeta = NEW.id_tarjeta
        ) - (
            -- Restar suma de pagos realizados
            SELECT COALESCE(SUM(p.monto), 0)
            FROM pagos_tarjetas p
            WHERE p.id_tarjeta = NEW.id_tarjeta
        )
        WHERE id_tarjeta = NEW.id_tarjeta;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función actualizada para calcular saldo al eliminar egreso
CREATE OR REPLACE FUNCTION actualizar_saldo_tarjeta_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.id_tarjeta IS NOT NULL THEN
        UPDATE tarjetas
        SET saldo_usado = (
            -- Suma de egresos
            SELECT COALESCE(SUM(
                CASE
                    -- Para compras a meses, solo sumar las cuotas pendientes
                    WHEN e.compra_meses = TRUE THEN
                        e.monto_mensual * (e.num_meses - COALESCE(e.meses_pagados, 0))
                    -- Para compras normales, sumar el monto completo
                    ELSE
                        e.monto
                END
            ), 0)
            FROM egresos e
            WHERE e.id_tarjeta = OLD.id_tarjeta
        ) - (
            -- Restar suma de pagos realizados
            SELECT COALESCE(SUM(p.monto), 0)
            FROM pagos_tarjetas p
            WHERE p.id_tarjeta = OLD.id_tarjeta
        )
        WHERE id_tarjeta = OLD.id_tarjeta;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recalcular todos los saldos de tarjetas con la fórmula corregida
UPDATE tarjetas t
SET saldo_usado = (
    -- Suma de egresos
    SELECT COALESCE(SUM(
        CASE
            WHEN e.compra_meses = TRUE THEN
                e.monto_mensual * (e.num_meses - COALESCE(e.meses_pagados, 0))
            ELSE
                e.monto
        END
    ), 0)
    FROM egresos e
    WHERE e.id_tarjeta = t.id_tarjeta
) - (
    -- Restar pagos
    SELECT COALESCE(SUM(p.monto), 0)
    FROM pagos_tarjetas p
    WHERE p.id_tarjeta = t.id_tarjeta
);
