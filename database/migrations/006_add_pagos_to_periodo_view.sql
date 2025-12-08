-- Migración: Actualizar vista para restar pagos realizados del pago pendiente
-- Fecha: 2025-12-08
-- Descripción: Modifica v_pago_mensual_tarjetas para considerar pagos ya realizados en el periodo
--              y solo mostrar el saldo pendiente por pagar

\c control_gastos;

-- Vista actualizada para calcular el pago pendiente del periodo
DROP VIEW IF EXISTS v_pago_mensual_tarjetas CASCADE;

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
                make_date(
                    EXTRACT(YEAR FROM CURRENT_DATE)::int,
                    EXTRACT(MONTH FROM CURRENT_DATE)::int,
                    t.dia_corte
                )
            ELSE
                make_date(
                    EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                    EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                    t.dia_corte
                )
        END as ultimo_corte,
        -- Calcular el año y mes del corte anterior
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::int
            ELSE
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
                EXTRACT(YEAR FROM (CURRENT_DATE + INTERVAL '1 month'))::int
            ELSE
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
),
pagos_periodo AS (
    -- Calcular el total de pagos realizados después del último corte
    SELECT
        pt.id_tarjeta,
        COALESCE(SUM(pt.monto), 0) as total_pagos
    FROM pagos_tarjetas pt
    INNER JOIN fecha_calculo fc ON pt.id_tarjeta = fc.id_tarjeta
    WHERE pt.fecha_pago > fc.ultimo_corte
    GROUP BY pt.id_tarjeta
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
    -- Corte anterior
    make_date(fc.year_corte_anterior, fc.month_corte_anterior, fc.dia_corte) as fecha_corte_anterior,
    -- Próximo corte
    make_date(fc.year_proximo_corte, fc.month_proximo_corte, fc.dia_corte) as fecha_proximo_corte,
    -- Egresos normales del periodo vencido
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
    -- Solo suma las cuotas donde la cuota del periodo vencido AÚN NO se ha marcado como pagada
    COALESCE(SUM(
        CASE
            WHEN e.compra_meses = TRUE
            AND e.meses_pagados < e.num_meses
            -- Calcular cuántas cuotas deberían estar pagadas hasta el último corte
            AND e.meses_pagados < GREATEST(0,
                -- Meses desde la fecha de compra hasta el último corte
                (EXTRACT(YEAR FROM fc.ultimo_corte) - EXTRACT(YEAR FROM e.fecha_egreso))::INTEGER * 12 +
                (EXTRACT(MONTH FROM fc.ultimo_corte) - EXTRACT(MONTH FROM e.fecha_egreso))::INTEGER +
                -- Ajuste si el día de corte ya pasó en el mes de la compra
                CASE
                    WHEN EXTRACT(DAY FROM e.fecha_egreso) <= fc.dia_corte THEN 1
                    ELSE 0
                END -
                COALESCE(e.mes_inicio_pago, 0)
            )
            THEN e.monto_mensual
            ELSE 0
        END
    ), 0) as cuotas_msi_mensuales,
    -- Total del periodo (antes de restar pagos)
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
            WHEN e.compra_meses = TRUE
            AND e.meses_pagados < e.num_meses
            -- Calcular cuántas cuotas deberían estar pagadas hasta el último corte
            AND e.meses_pagados < GREATEST(0,
                -- Meses desde la fecha de compra hasta el último corte
                (EXTRACT(YEAR FROM fc.ultimo_corte) - EXTRACT(YEAR FROM e.fecha_egreso))::INTEGER * 12 +
                (EXTRACT(MONTH FROM fc.ultimo_corte) - EXTRACT(MONTH FROM e.fecha_egreso))::INTEGER +
                -- Ajuste si el día de corte ya pasó en el mes de la compra
                CASE
                    WHEN EXTRACT(DAY FROM e.fecha_egreso) <= fc.dia_corte THEN 1
                    ELSE 0
                END -
                COALESCE(e.mes_inicio_pago, 0)
            )
            THEN e.monto_mensual
            ELSE 0
        END
    ), 0) as total_periodo,
    -- Pagos realizados después del último corte
    COALESCE(pp.total_pagos, 0) as pagos_realizados,
    -- Pago pendiente del periodo = total del periodo - pagos realizados (nunca negativo)
    GREATEST(
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
                WHEN e.compra_meses = TRUE
                AND e.meses_pagados < e.num_meses
                -- Calcular cuántas cuotas deberían estar pagadas hasta el último corte
                AND e.meses_pagados < GREATEST(0,
                    -- Meses desde la fecha de compra hasta el último corte
                    (EXTRACT(YEAR FROM fc.ultimo_corte) - EXTRACT(YEAR FROM e.fecha_egreso))::INTEGER * 12 +
                    (EXTRACT(MONTH FROM fc.ultimo_corte) - EXTRACT(MONTH FROM e.fecha_egreso))::INTEGER +
                    -- Ajuste si el día de corte ya pasó en el mes de la compra
                    CASE
                        WHEN EXTRACT(DAY FROM e.fecha_egreso) <= fc.dia_corte THEN 1
                        ELSE 0
                    END -
                    COALESCE(e.mes_inicio_pago, 0)
                )
                THEN e.monto_mensual
                ELSE 0
            END
        ), 0) - COALESCE(pp.total_pagos, 0),
        0
    ) as pago_periodo,
    -- Número de compras MSI activas
    COUNT(CASE WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses THEN 1 END) as num_compras_msi
FROM fecha_calculo fc
LEFT JOIN egresos e ON fc.id_tarjeta = e.id_tarjeta
LEFT JOIN pagos_periodo pp ON fc.id_tarjeta = pp.id_tarjeta
GROUP BY
    fc.id_tarjeta, fc.nom_tarjeta, fc.banco, fc.dia_corte, fc.dias_gracia,
    fc.saldo_usado, fc.id_usuario, fc.ultimo_corte, fc.year_corte_anterior,
    fc.month_corte_anterior, fc.year_proximo_corte, fc.month_proximo_corte,
    pp.total_pagos;

-- Comentario para documentación
COMMENT ON VIEW v_pago_mensual_tarjetas IS 'Vista que calcula el pago PENDIENTE del periodo vencido de cada tarjeta. Para cuotas MSI, solo incluye las cuotas donde meses_pagados < cuotas_que_deberian_estar_pagadas_hasta_ultimo_corte. También resta los pagos realizados después del último corte. Si ya pagaste completamente (o marcaste las cuotas MSI como pagadas), pago_periodo será 0.';
