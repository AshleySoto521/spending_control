import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);

		// Resumen financiero - solo efectivo y transferencia para el saldo actual
		// Los egresos con tarjeta solo afectan la deuda de tarjetas, no el saldo
		const totalIngresos = await query(
			`SELECT COALESCE(SUM(i.monto), 0) as total
			FROM ingresos i
			JOIN formas_pago fp ON i.id_forma_pago = fp.id_forma_pago
			WHERE i.id_usuario = $1
			AND UPPER(fp.tipo) IN ('EFECTIVO', 'TRANSFERENCIA')`,
			[userId]
		);

		const totalEgresos = await query(
			`SELECT COALESCE(SUM(e.monto), 0) as total
			FROM egresos e
			JOIN formas_pago fp ON e.id_forma_pago = fp.id_forma_pago
			WHERE e.id_usuario = $1
			AND UPPER(fp.tipo) IN ('EFECTIVO', 'TRANSFERENCIA')`,
			[userId]
		);

		// Pagos de tarjeta (debitan del saldo actual cuando se pagan en efectivo/transferencia)
		const totalPagosTarjeta = await query(
			`SELECT COALESCE(SUM(pt.monto), 0) as total
			FROM pagos_tarjetas pt
			JOIN formas_pago fp ON pt.id_forma_pago = fp.id_forma_pago
			WHERE pt.id_usuario = $1
			AND UPPER(fp.tipo) IN ('EFECTIVO', 'TRANSFERENCIA')`,
			[userId]
		);

		const resumenFinanciero = {
			total_ingresos: totalIngresos.rows[0].total,
			total_egresos: totalEgresos.rows[0].total,
			total_pagos_tarjeta: totalPagosTarjeta.rows[0].total,
			saldo_actual: parseFloat(totalIngresos.rows[0].total) - parseFloat(totalEgresos.rows[0].total) - parseFloat(totalPagosTarjeta.rows[0].total)
		};

		// Deuda total de tarjetas
		const deudaTarjetas = await query(
			`SELECT
				COUNT(*) as num_tarjetas,
				COALESCE(SUM(saldo_usado), 0) as deuda_total,
				COALESCE(SUM(linea_credito), 0) as credito_total,
				COALESCE(SUM(linea_credito - saldo_usado), 0) as credito_disponible
			FROM tarjetas
			WHERE id_usuario = $1 AND activa = TRUE`,
			[userId]
		);

		// Gasto más frecuente
		const gastosFrecuentes = await query(
			`SELECT
				concepto,
				COUNT(*) as frecuencia,
				SUM(monto) as total_gastado,
				AVG(monto) as promedio_gasto
			FROM egresos
			WHERE id_usuario = $1
			GROUP BY concepto
			ORDER BY frecuencia DESC, total_gastado DESC
			LIMIT 10`,
			[userId]
		);

		// Gastos por categoría (concepto) del mes actual
		const gastosPorCategoria = await query(
			`SELECT
				concepto,
				SUM(monto) as total
			FROM egresos
			WHERE id_usuario = $1
			AND EXTRACT(MONTH FROM fecha_egreso) = EXTRACT(MONTH FROM CURRENT_DATE)
			AND EXTRACT(YEAR FROM fecha_egreso) = EXTRACT(YEAR FROM CURRENT_DATE)
			GROUP BY concepto
			ORDER BY total DESC
			LIMIT 10`,
			[userId]
		);

		// Gastos por mes (últimos 6 meses)
		const gastosPorMes = await query(
			`SELECT
				TO_CHAR(fecha_egreso, 'YYYY-MM') as mes,
				SUM(monto) as total
			FROM egresos
			WHERE id_usuario = $1
			AND fecha_egreso >= CURRENT_DATE - INTERVAL '6 months'
			GROUP BY TO_CHAR(fecha_egreso, 'YYYY-MM')
			ORDER BY mes ASC`,
			[userId]
		);

		// Ingresos por mes (últimos 6 meses)
		const ingresosPorMes = await query(
			`SELECT
				TO_CHAR(fecha_ingreso, 'YYYY-MM') as mes,
				SUM(monto) as total
			FROM ingresos
			WHERE id_usuario = $1
			AND fecha_ingreso >= CURRENT_DATE - INTERVAL '6 months'
			GROUP BY TO_CHAR(fecha_ingreso, 'YYYY-MM')
			ORDER BY mes ASC`,
			[userId]
		);

		// Últimos movimientos (incluye pagos a tarjetas)
		const ultimosMovimientos = await query(
			`(
				SELECT
					'egreso' as tipo,
					fecha_egreso as fecha,
					concepto as descripcion,
					monto,
					establecimiento as detalle
				FROM egresos
				WHERE id_usuario = $1
			)
			UNION ALL
			(
				SELECT
					'ingreso' as tipo,
					fecha_ingreso as fecha,
					tipo_ingreso as descripcion,
					monto,
					descripcion as detalle
				FROM ingresos
				WHERE id_usuario = $1
			)
			UNION ALL
			(
				SELECT
					'pago_tarjeta' as tipo,
					fecha_pago as fecha,
					CONCAT('Pago a ', t.nom_tarjeta) as descripcion,
					monto,
					CONCAT('Forma de pago: ', fp.tipo) as detalle
				FROM pagos_tarjetas pt
				JOIN tarjetas t ON pt.id_tarjeta = t.id_tarjeta
				JOIN formas_pago fp ON pt.id_forma_pago = fp.id_forma_pago
				WHERE pt.id_usuario = $1
			)
			ORDER BY fecha DESC
			LIMIT 10`,
			[userId]
		);

		// Distribución por forma de pago
		const distribucionFormaPago = await query(
			`SELECT
				fp.tipo,
				COUNT(e.id_egreso) as cantidad,
				SUM(e.monto) as total
			FROM egresos e
			JOIN formas_pago fp ON e.id_forma_pago = fp.id_forma_pago
			WHERE e.id_usuario = $1
			GROUP BY fp.tipo
			ORDER BY total DESC`,
			[userId]
		);

		// Próximos pagos de tarjetas (solo del periodo actual)
		const proximosPagos = await query(
			`SELECT
				v.id_tarjeta,
				v.nom_tarjeta,
				v.banco,
				v.dia_corte,
				v.dias_gracia,
				v.saldo_total,
				v.egresos_periodo,
				v.cuotas_msi_mensuales,
				v.pago_periodo as monto_pago,
				v.num_compras_msi,
				v.fecha_corte_anterior,
				v.fecha_ultimo_corte as fecha_corte,
				v.fecha_ultimo_corte + (v.dias_gracia || ' days')::interval as fecha_limite_pago
			FROM v_pago_mensual_tarjetas v
			WHERE v.id_usuario = $1
			AND v.dia_corte IS NOT NULL
			AND (v.pago_periodo > 0 OR v.saldo_total > 0)
			ORDER BY fecha_limite_pago ASC
			LIMIT 5`,
			[userId]
		);

		// Próximas cuotas MSI
		const proximasCuotasMSI = await query(
			`SELECT
				id_egreso,
				id_tarjeta,
				nom_tarjeta,
				banco,
				concepto,
				establecimiento,
				monto_mensual,
				cuotas_pendientes,
				monto_pendiente,
				fecha_proxima_cuota,
				estado,
				meses_pagados,
				num_meses
			FROM v_cuotas_msi
			WHERE id_usuario = $1
			AND cuotas_pendientes > 0
			ORDER BY
				CASE estado
					WHEN 'atrasado' THEN 1
					WHEN 'al_corriente' THEN 2
					ELSE 3
				END,
				fecha_proxima_cuota ASC
			LIMIT 10`,
			[userId]
		);

		return json({
			resumen: resumenFinanciero,
			tarjetas: deudaTarjetas.rows[0] || {
				num_tarjetas: 0,
				deuda_total: 0,
				credito_total: 0,
				credito_disponible: 0
			},
			gastos_frecuentes: gastosFrecuentes.rows,
			gastos_por_categoria: gastosPorCategoria.rows,
			gastos_por_mes: gastosPorMes.rows,
			ingresos_por_mes: ingresosPorMes.rows,
			ultimos_movimientos: ultimosMovimientos.rows,
			distribucion_forma_pago: distribucionFormaPago.rows,
			proximos_pagos: proximosPagos.rows,
			proximas_cuotas_msi: proximasCuotasMSI.rows
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener datos del dashboard:', error);
		return json({ error: 'Error al obtener datos del dashboard' }, { status: 500 });
	}
};
