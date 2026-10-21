-- Migración: Agregar vista para calcular cuotas MSI
-- Fecha: 2025-12-06
-- Descripción: Crea vista v_cuotas_msi para calcular automáticamente las cuotas pendientes de compras a MSI

\c control_gastos;

-- Vista para calcular cuotas MSI pendientes y próximas
CREATE OR REPLACE VIEW v_cuotas_msi AS
SELECT
    e.id_egreso,
    e.id_usuario,
    e.id_tarjeta,
    t.nom_tarjeta,
    t.banco,
    t.dia_corte,
    e.concepto,
    e.establecimiento,
    e.fecha_egreso,
    e.monto as monto_total,
    e.num_meses,
    e.mes_inicio_pago,
    e.monto_mensual,
    e.meses_pagados,
    -- Calcular cuántos meses han pasado desde la compra
    GREATEST(0,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.fecha_egreso))::INTEGER * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.fecha_egreso))::INTEGER -
        COALESCE(e.mes_inicio_pago, 0)
    ) as meses_transcurridos,
    -- Cuotas pendientes
    GREATEST(0, e.num_meses - COALESCE(e.meses_pagados, 0)) as cuotas_pendientes,
    -- Monto total pendiente
    e.monto_mensual * GREATEST(0, e.num_meses - COALESCE(e.meses_pagados, 0)) as monto_pendiente,
    -- Fecha estimada de próxima cuota (basada en día de corte)
    CASE
        WHEN e.meses_pagados >= e.num_meses THEN NULL
        WHEN EXTRACT(DAY FROM CURRENT_DATE) <= t.dia_corte THEN
            make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, t.dia_corte)
        ELSE
            make_date(
                EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month')::int,
                EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')::int,
                t.dia_corte
            )
    END as fecha_proxima_cuota,
    -- Estado de la cuota
    CASE
        WHEN e.meses_pagados >= e.num_meses THEN 'completado'
        WHEN e.meses_pagados < GREATEST(0,
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.fecha_egreso))::INTEGER * 12 +
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.fecha_egreso))::INTEGER -
            COALESCE(e.mes_inicio_pago, 0)
        ) THEN 'atrasado'
        ELSE 'al_corriente'
    END as estado
FROM egresos e
JOIN tarjetas t ON e.id_tarjeta = t.id_tarjeta
WHERE e.compra_meses = TRUE
    AND e.num_meses IS NOT NULL
    AND e.monto_mensual IS NOT NULL
    AND t.activa = TRUE;

-- Comentario para documentación
COMMENT ON VIEW v_cuotas_msi IS 'Vista que calcula automáticamente las cuotas MSI pendientes, su estado y fechas de pago estimadas';
