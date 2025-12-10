import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);

		// Obtener saldo actual
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

		const totalPagosTarjeta = await query(
			`SELECT COALESCE(SUM(pt.monto), 0) as total
			FROM pagos_tarjetas pt
			JOIN formas_pago fp ON pt.id_forma_pago = fp.id_forma_pago
			WHERE pt.id_usuario = $1
			AND UPPER(fp.tipo) IN ('EFECTIVO', 'TRANSFERENCIA')`,
			[userId]
		);

		const saldoActual = parseFloat(totalIngresos.rows[0].total) -
		                    parseFloat(totalEgresos.rows[0].total) -
		                    parseFloat(totalPagosTarjeta.rows[0].total);

		// Obtener pagos pendientes de tarjetas con fecha límite
		const pagosPendientes = await query(
			`SELECT
				v.id_tarjeta,
				v.nom_tarjeta,
				v.banco,
				v.pago_periodo as monto_pago,
				v.fecha_ultimo_corte + (v.dias_gracia || ' days')::interval as fecha_limite_pago,
				'tarjeta' as tipo_pago
			FROM v_pago_mensual_tarjetas v
			WHERE v.id_usuario = $1
			AND v.dia_corte IS NOT NULL
			AND v.pago_periodo > 0
			ORDER BY fecha_limite_pago ASC`,
			[userId]
		);

		// Obtener préstamos activos y sus pagos mensuales
		const prestamosPendientes = await query(
			`SELECT
				p.id_prestamo,
				p.institucion as nombre,
				p.tipo_prestamo,
				p.pago_mensual as monto_pago,
				p.dia_pago,
				'prestamo' as tipo_pago
			FROM prestamos p
			WHERE p.id_usuario = $1
			AND p.activo = true
			ORDER BY p.dia_pago ASC`,
			[userId]
		);

		return json({
			saldo_actual: saldoActual,
			pagos_pendientes: pagosPendientes.rows,
			prestamos_pendientes: prestamosPendientes.rows
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener datos de proyección:', error);
		return json({ error: 'Error al obtener datos de proyección' }, { status: 500 });
	}
};
