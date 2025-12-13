import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// GET - Obtener cuotas MSI pendientes de una tarjeta específica
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const idTarjeta = event.params.id;

		if (!idTarjeta) {
			return json({ error: 'ID de tarjeta requerido' }, { status: 400 });
		}

		// Verificar que la tarjeta pertenece al usuario
		const tarjetaCheck = await query(
			`SELECT id_tarjeta FROM tarjetas WHERE id_tarjeta = $1 AND id_usuario = $2`,
			[idTarjeta, userId]
		);

		if (tarjetaCheck.rows.length === 0) {
			return json({ error: 'Tarjeta no encontrada' }, { status: 404 });
		}

		// Obtener cuotas MSI pendientes de esta tarjeta
		const cuotasMSI = await query(
			`SELECT
				id_egreso,
				concepto,
				establecimiento,
				fecha_egreso,
				monto_total,
				num_meses,
				mes_inicio_pago,
				monto_mensual,
				meses_pagados,
				cuotas_pendientes,
				monto_pendiente,
				fecha_proxima_cuota,
				estado
			FROM v_cuotas_msi
			WHERE id_tarjeta = $1
			AND id_usuario = $2
			AND cuotas_pendientes > 0
			ORDER BY
				CASE estado
					WHEN 'atrasado' THEN 1
					WHEN 'al_corriente' THEN 2
					ELSE 3
				END,
				fecha_proxima_cuota ASC`,
			[idTarjeta, userId]
		);

		return json({
			cuotas_msi: cuotasMSI.rows
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener cuotas MSI:', error);
		return json({ error: 'Error al obtener cuotas MSI' }, { status: 500 });
	}
};
