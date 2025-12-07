-- Migración: Corregir cálculo de saldo usado en tarjetas considerando MSI pagados
-- Fecha: 2025-12-07
-- Descripción: Actualizar funciones de trigger para que el saldo de la tarjeta
--              disminuya cuando se pagan cuotas de MSI
\c control_gastos;
-- Función para actualizar saldo usado de tarjetas automáticamente (INSERT y UPDATE)
CREATE OR REPLACE FUNCTION actualizar_saldo_tarjeta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_tarjeta IS NOT NULL THEN
        UPDATE tarjetas
        SET saldo_usado = (
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
        )
        WHERE id_tarjeta = NEW.id_tarjeta;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar saldo de tarjeta al eliminar egreso (DELETE)
CREATE OR REPLACE FUNCTION actualizar_saldo_tarjeta_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.id_tarjeta IS NOT NULL THEN
        UPDATE tarjetas
        SET saldo_usado = (
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
        )
        WHERE id_tarjeta = OLD.id_tarjeta;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Reemplazar el trigger DELETE con la nueva función
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_delete ON egresos;
CREATE TRIGGER trigger_actualizar_saldo_delete
AFTER DELETE ON egresos
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_tarjeta_delete();

-- Recalcular todos los saldos existentes con la nueva lógica
UPDATE tarjetas t
SET saldo_usado = (
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
    WHERE e.id_tarjeta = t.id_tarjeta
);

-- Comentario
COMMENT ON FUNCTION actualizar_saldo_tarjeta() IS 'Calcula el saldo usado de una tarjeta considerando las cuotas MSI pagadas. Para MSI, solo suma las cuotas pendientes (monto_mensual * cuotas_pendientes).';
COMMENT ON FUNCTION actualizar_saldo_tarjeta_delete() IS 'Recalcula el saldo usado al eliminar un egreso, considerando MSI.';
