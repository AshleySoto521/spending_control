-- Migración: Agregar vista para calcular pago mensual real de tarjetas
-- Fecha: 2025-12-06
-- Descripción: Crea vista v_pago_mensual_tarjetas que calcula correctamente el pago mensual considerando MSI

\c control_gastos;

-- Vista para calcular el pago mensual real de cada tarjeta (incluyendo MSI)
CREATE OR REPLACE VIEW v_pago_mensual_tarjetas AS
SELECT
    t.id_tarjeta,
    t.id_usuario,
    t.nom_tarjeta,
    t.banco,
    t.dia_corte,
    t.dias_gracia,
    t.saldo_usado as saldo_total,
    -- Saldo de compras normales (sin MSI)
    t.saldo_usado - COALESCE(SUM(
        CASE
            WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses
            THEN e.monto
            ELSE 0
        END
    ), 0) as saldo_sin_msi,
    -- Suma de cuotas mensuales de MSI pendientes
    COALESCE(SUM(
        CASE
            WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses
            THEN e.monto_mensual
            ELSE 0
        END
    ), 0) as cuotas_msi_mensuales,
    -- Pago mensual real = saldo sin MSI + cuotas MSI mensuales
    t.saldo_usado - COALESCE(SUM(
        CASE
            WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses
            THEN e.monto
            ELSE 0
        END
    ), 0) + COALESCE(SUM(
        CASE
            WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses
            THEN e.monto_mensual
            ELSE 0
        END
    ), 0) as pago_mensual,
    -- Número de compras MSI activas
    COUNT(CASE WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses THEN 1 END) as num_compras_msi
FROM tarjetas t
LEFT JOIN egresos e ON t.id_tarjeta = e.id_tarjeta
WHERE t.activa = TRUE
GROUP BY t.id_tarjeta, t.nom_tarjeta, t.banco, t.dia_corte, t.dias_gracia, t.saldo_usado, t.id_usuario;

-- Comentario para documentación
COMMENT ON VIEW v_pago_mensual_tarjetas IS 'Vista que calcula el pago mensual real de cada tarjeta. Para tarjetas con MSI, el pago mensual = saldo sin MSI + suma de cuotas MSI mensuales (no el saldo total)';

-- Ejemplo de uso:
-- SELECT * FROM v_pago_mensual_tarjetas WHERE id_usuario = 'user-id';
--
-- Devuelve:
-- - saldo_total: Deuda total de la tarjeta (incluye monto completo de MSI)
-- - saldo_sin_msi: Saldo de compras normales (sin MSI completos)
-- - cuotas_msi_mensuales: Suma de cuotas mensuales de todas las compras MSI activas
-- - pago_mensual: Lo que realmente debes pagar este mes (saldo_sin_msi + cuotas_msi_mensuales)
-- - num_compras_msi: Número de compras a MSI con cuotas pendientes
