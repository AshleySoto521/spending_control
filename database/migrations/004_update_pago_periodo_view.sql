-- Migración: Actualizar vista para calcular pago del periodo vencido (no mes en curso)
-- Fecha: 2025-12-06
-- Descripción: Modifica v_pago_mensual_tarjetas para mostrar solo egresos del periodo VENCIDO
--              El periodo vencido es el que va desde el corte anterior hasta el último corte que pasó
--              Ejemplo: si hoy es 06/12 y corte es día 2, muestra gastos del 03/11 al 02/12

\c control_gastos;

-- Vista para calcular el pago del periodo vencido de cada tarjeta
DROP VIEW IF EXISTS v_pago_mensual_tarjetas;

CREATE VIEW v_pago_mensual_tarjetas AS
WITH fecha_calculo AS (
    SELECT
        t.id_tarjeta,
        t.id_usuario,
        t.nom_tarjeta,
        t.banco,
        t.dia_corte,
        t.dias_gracia,
        t.saldo_usado,
        -- Calcular el último corte que ya pasó
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                -- Si ya pasó el día de corte este mes, el último corte es de este mes
                make_date(
                    EXTRACT(YEAR FROM CURRENT_DATE)::int,
                    EXTRACT(MONTH FROM CURRENT_DATE)::int,
                    t.dia_corte
                )
            ELSE
                -- Si no ha llegado el día de corte, el último corte fue el mes pasado
                make_date(
                    EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                    EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                    t.dia_corte
                )
        END as ultimo_corte,
        -- Calcular el año y mes del corte anterior
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                -- El último corte es de este mes, así que el anterior es del mes pasado
                EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::int
            ELSE
                -- El último corte es del mes pasado, así que el anterior es de hace 2 meses
                EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '2 month'))::int
        END as year_corte_anterior,
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::int
            ELSE
                EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '2 month'))::int
        END as month_corte_anterior,
        -- Calcular el año y mes del próximo corte
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                -- El último corte es de este mes, así que el próximo es del mes siguiente
                EXTRACT(YEAR FROM (CURRENT_DATE + INTERVAL '1 month'))::int
            ELSE
                -- El último corte es del mes pasado, así que el próximo es de este mes
                EXTRACT(YEAR FROM CURRENT_DATE)::int
        END as year_proximo_corte,
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                EXTRACT(MONTH FROM (CURRENT_DATE + INTERVAL '1 month'))::int
            ELSE
                EXTRACT(MONTH FROM CURRENT_DATE)::int
        END as month_proximo_corte
    FROM tarjetas t
    WHERE t.activa = TRUE
)
SELECT
    fc.id_tarjeta,
    fc.id_usuario,
    fc.nom_tarjeta,
    fc.banco,
    fc.dia_corte,
    fc.dias_gracia,
    fc.saldo_usado as saldo_total,
    -- Último corte que pasó
    fc.ultimo_corte as fecha_ultimo_corte,
    -- Corte anterior (construido explícitamente con año y mes correcto)
    make_date(fc.year_corte_anterior, fc.month_corte_anterior, fc.dia_corte) as fecha_corte_anterior,
    -- Próximo corte (construido explícitamente con año y mes correcto)
    make_date(fc.year_proximo_corte, fc.month_proximo_corte, fc.dia_corte) as fecha_proximo_corte,
    -- Egresos normales del periodo vencido (entre corte anterior y último corte)
    COALESCE(SUM(
        CASE
            WHEN (e.compra_meses = FALSE OR e.compra_meses IS NULL)
            AND e.fecha_egreso > make_date(fc.year_corte_anterior, fc.month_corte_anterior, fc.dia_corte)
            AND e.fecha_egreso <= fc.ultimo_corte
            THEN e.monto
            ELSE 0
        END
    ), 0) as egresos_periodo,
    -- Suma de cuotas mensuales de MSI pendientes
    COALESCE(SUM(
        CASE
            WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses
            THEN e.monto_mensual
            ELSE 0
        END
    ), 0) as cuotas_msi_mensuales,
    -- Pago del periodo vencido = egresos del periodo + cuotas MSI mensuales
    COALESCE(SUM(
        CASE
            WHEN (e.compra_meses = FALSE OR e.compra_meses IS NULL)
            AND e.fecha_egreso > make_date(fc.year_corte_anterior, fc.month_corte_anterior, fc.dia_corte)
            AND e.fecha_egreso <= fc.ultimo_corte
            THEN e.monto
            ELSE 0
        END
    ), 0) + COALESCE(SUM(
        CASE
            WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses
            THEN e.monto_mensual
            ELSE 0
        END
    ), 0) as pago_periodo,
    -- Número de compras MSI activas
    COUNT(CASE WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses THEN 1 END) as num_compras_msi
FROM fecha_calculo fc
LEFT JOIN egresos e ON fc.id_tarjeta = e.id_tarjeta
GROUP BY fc.id_tarjeta, fc.nom_tarjeta, fc.banco, fc.dia_corte, fc.dias_gracia, fc.saldo_usado, fc.id_usuario, fc.ultimo_corte, fc.year_corte_anterior, fc.month_corte_anterior, fc.year_proximo_corte, fc.month_proximo_corte;

-- Comentario para documentación
COMMENT ON VIEW v_pago_mensual_tarjetas IS 'Vista que calcula el pago del periodo VENCIDO de cada tarjeta. El periodo vencido es el que va desde el corte anterior hasta el último corte que pasó, más las cuotas MSI mensuales.';
