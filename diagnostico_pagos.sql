-- ==========================================
-- DIAGNÓSTICO: ¿Por qué los pagos no se reflejan?
-- ==========================================
-- Ejecuta este script y comparte los resultados

-- Reemplaza USER_ID con tu id_usuario
-- Para encontrarlo, ejecuta: SELECT id_usuario, nombre, email FROM usuarios;

\echo '=== 1. TUS TARJETAS ==='
SELECT
    id_tarjeta,
    nom_tarjeta,
    banco,
    dia_corte,
    dias_gracia,
    saldo_usado,
    activa
FROM tarjetas
WHERE id_usuario = 'USER_ID'  -- REEMPLAZA CON TU ID
ORDER BY id_tarjeta;

\echo ''
\echo '=== 2. CÁLCULO DE FECHAS DE CORTE ==='
SELECT
    t.id_tarjeta,
    t.nom_tarjeta,
    t.dia_corte,
    CURRENT_DATE as hoy,
    EXTRACT(DAY FROM CURRENT_DATE) as dia_hoy,
    -- Último corte (según la lógica de la vista)
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
    END as ultimo_corte_calculado,
    -- Fecha límite de pago
    CASE
        WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
            make_date(
                EXTRACT(YEAR FROM CURRENT_DATE)::int,
                EXTRACT(MONTH FROM CURRENT_DATE)::int,
                t.dia_corte
            ) + (t.dias_gracia || ' days')::interval
        ELSE
            make_date(
                EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                t.dia_corte
            ) + (t.dias_gracia || ' days')::interval
    END as fecha_limite_pago
FROM tarjetas t
WHERE t.id_usuario = 'USER_ID'  -- REEMPLAZA CON TU ID
AND t.activa = TRUE;

\echo ''
\echo '=== 3. PAGOS REGISTRADOS ==='
SELECT
    pt.id_pago,
    pt.id_tarjeta,
    t.nom_tarjeta,
    pt.fecha_pago,
    pt.monto,
    fp.tipo as forma_pago,
    -- Último corte de esta tarjeta
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
    -- ¿El pago es después del último corte?
    pt.fecha_pago > CASE
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
    END as "¿pago_después_corte?"
FROM pagos_tarjetas pt
JOIN tarjetas t ON pt.id_tarjeta = t.id_tarjeta
JOIN formas_pago fp ON pt.id_forma_pago = fp.id_forma_pago
WHERE pt.id_usuario = 'USER_ID'  -- REEMPLAZA CON TU ID
ORDER BY pt.id_tarjeta, pt.fecha_pago DESC;

\echo ''
\echo '=== 4. VISTA v_pago_mensual_tarjetas ==='
SELECT
    id_tarjeta,
    nom_tarjeta,
    banco,
    dia_corte,
    fecha_ultimo_corte,
    fecha_corte_anterior,
    fecha_proximo_corte,
    fecha_ultimo_corte + (dias_gracia || ' days')::interval as fecha_limite_pago,
    egresos_periodo,
    cuotas_msi_mensuales,
    total_periodo,
    pagos_realizados,  -- <--- ESTE ES EL VALOR CRÍTICO
    pago_periodo,      -- <--- ESTE DEBERÍA SER: total_periodo - pagos_realizados
    num_compras_msi
FROM v_pago_mensual_tarjetas
WHERE id_usuario = 'USER_ID'  -- REEMPLAZA CON TU ID
ORDER BY id_tarjeta;

\echo ''
\echo '=== 5. GASTOS DEL PERIODO VENCIDO ==='
SELECT
    e.id_egreso,
    e.id_tarjeta,
    t.nom_tarjeta,
    e.fecha_egreso,
    e.concepto,
    e.monto,
    e.compra_meses,
    e.num_meses,
    e.monto_mensual,
    e.meses_pagados,
    -- Corte anterior
    CASE
        WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
            make_date(
                EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                t.dia_corte
            )
        ELSE
            make_date(
                EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '2 month'))::int,
                EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '2 month'))::int,
                t.dia_corte
            )
    END as corte_anterior,
    -- Último corte
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
    -- ¿Está en el periodo vencido?
    e.fecha_egreso > CASE
        WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
            make_date(
                EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                t.dia_corte
            )
        ELSE
            make_date(
                EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '2 month'))::int,
                EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '2 month'))::int,
                t.dia_corte
            )
    END
    AND e.fecha_egreso <= CASE
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
    END as "¿en_periodo_vencido?"
FROM egresos e
JOIN tarjetas t ON e.id_tarjeta = t.id_tarjeta
WHERE e.id_usuario = 'USER_ID'  -- REEMPLAZA CON TU ID
AND t.activa = TRUE
ORDER BY e.id_tarjeta, e.fecha_egreso DESC;
