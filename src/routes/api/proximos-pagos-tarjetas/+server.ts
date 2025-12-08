import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// GET - Obtener todos los próximos pagos de tarjetas del usuario
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);

		// Próximos pagos de tarjetas (todos, sin límite)
		// Solo muestra tarjetas con pago pendiente del periodo > 0
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
				v.total_periodo,
				v.pagos_realizados,
				v.num_compras_msi,
				v.fecha_corte_anterior,
				v.fecha_ultimo_corte as fecha_corte,
				v.fecha_ultimo_corte + (v.dias_gracia || ' days')::interval as fecha_limite_pago
			FROM v_pago_mensual_tarjetas v
			WHERE v.id_usuario = $1
			AND v.dia_corte IS NOT NULL
			AND v.pago_periodo > 0
			ORDER BY fecha_limite_pago ASC`,
			[userId]
		);

		return json({
			proximos_pagos: proximosPagos.rows,
			total: proximosPagos.rows.length
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener próximos pagos de tarjetas:', error);
		return json({ error: 'Error al obtener próximos pagos de tarjetas' }, { status: 500 });
	}
};
