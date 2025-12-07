import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// GET - Obtener resumen de egresos agrupados por tarjeta
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);

		// Resumen por tarjeta
		const resumenTarjetas = await query(
			`SELECT
				t.id_tarjeta,
				t.nom_tarjeta,
				t.banco,
				t.linea_credito,
				t.saldo_usado,
				-- Total de egresos en esta tarjeta
				COUNT(e.id_egreso) as total_egresos,
				COALESCE(SUM(e.monto), 0) as total_gastado,
				-- Egresos normales (sin MSI)
				COUNT(CASE WHEN e.compra_meses = FALSE OR e.compra_meses IS NULL THEN 1 END) as egresos_normales,
				COALESCE(SUM(CASE WHEN e.compra_meses = FALSE OR e.compra_meses IS NULL THEN e.monto ELSE 0 END), 0) as monto_normales,
				-- Compras a MSI
				COUNT(CASE WHEN e.compra_meses = TRUE THEN 1 END) as compras_msi,
				COALESCE(SUM(CASE WHEN e.compra_meses = TRUE THEN e.monto ELSE 0 END), 0) as monto_msi_total,
				-- MSI activas (con cuotas pendientes)
				COUNT(CASE WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses THEN 1 END) as msi_activas,
				COALESCE(SUM(CASE WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses THEN e.monto_mensual ELSE 0 END), 0) as cuotas_msi_mensuales,
				-- Último egreso
				MAX(e.fecha_egreso) as ultimo_egreso
			FROM tarjetas t
			LEFT JOIN egresos e ON t.id_tarjeta = e.id_tarjeta
			WHERE t.id_usuario = $1 AND t.activa = TRUE
			GROUP BY t.id_tarjeta, t.nom_tarjeta, t.banco, t.linea_credito, t.saldo_usado
			HAVING COUNT(e.id_egreso) > 0
			ORDER BY total_gastado DESC`,
			[userId]
		);

		// Egresos en efectivo/transferencia (sin tarjeta)
		const resumenSinTarjeta = await query(
			`SELECT
				COUNT(e.id_egreso) as total_egresos,
				COALESCE(SUM(e.monto), 0) as total_gastado,
				MAX(e.fecha_egreso) as ultimo_egreso
			FROM egresos e
			JOIN formas_pago fp ON e.id_forma_pago = fp.id_forma_pago
			WHERE e.id_usuario = $1
			AND e.id_tarjeta IS NULL
			AND fp.tipo IN ('efectivo', 'transferencia')`,
			[userId]
		);

		return json({
			resumen_tarjetas: resumenTarjetas.rows,
			resumen_sin_tarjeta: resumenSinTarjeta.rows[0] || {
				total_egresos: 0,
				total_gastado: 0,
				ultimo_egreso: null
			}
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener resumen de egresos por tarjeta:', error);
		return json({ error: 'Error al obtener resumen' }, { status: 500 });
	}
};
