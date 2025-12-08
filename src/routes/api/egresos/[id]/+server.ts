import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// PUT - Actualizar egreso
export const PUT: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { id } = event.params;
		const data = await event.request.json();

		// Verificar que el egreso pertenece al usuario
		const existing = await query(
			'SELECT id_egreso FROM egresos WHERE id_egreso = $1 AND id_usuario = $2',
			[id, userId]
		);

		if (existing.rows.length === 0) {
			return json({ error: 'Egreso no encontrado' }, { status: 404 });
		}

		// Validar compras a meses si se especifica
		if (data.compra_meses) {
			if (data.num_meses && ![3, 6, 9, 12, 15, 18, 24, 36, 48].includes(data.num_meses)) {
				return json({ error: 'Número de meses inválido' }, { status: 400 });
			}
			if (data.mes_inicio_pago !== undefined && (data.mes_inicio_pago < 0 || data.mes_inicio_pago > 12)) {
				return json({ error: 'Mes de inicio de pago inválido' }, { status: 400 });
			}
		}

		// Calcular monto mensual si es compra a meses
		const montoMensual = data.compra_meses && data.num_meses ? data.monto / data.num_meses : null;

		const result = await query(
			`UPDATE egresos
			SET
				fecha_egreso = COALESCE($1, fecha_egreso),
				concepto = COALESCE($2, concepto),
				establecimiento = COALESCE($3, establecimiento),
				monto = COALESCE($4, monto),
				id_forma_pago = COALESCE($5, id_forma_pago),
				id_tarjeta = $6,
				descripcion = COALESCE($7, descripcion),
				compra_meses = COALESCE($8, compra_meses),
				num_meses = $9,
				mes_inicio_pago = $10,
				monto_mensual = $11
			WHERE id_egreso = $12 AND id_usuario = $13
			RETURNING *`,
			[
				data.fecha_egreso,
				data.concepto,
				data.establecimiento,
				data.monto,
				data.id_forma_pago,
				data.id_tarjeta,
				data.descripcion,
				data.compra_meses,
				data.compra_meses ? data.num_meses : null,
				data.compra_meses ? (data.mes_inicio_pago || 0) : null,
				montoMensual,
				id,
				userId
			]
		);

		return json({ success: true, egreso: result.rows[0] });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al actualizar egreso:', error);
		return json({ error: 'Error al actualizar egreso' }, { status: 500 });
	}
};

// DELETE - Eliminar egreso
export const DELETE: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { id } = event.params;

		const result = await query(
			'DELETE FROM egresos WHERE id_egreso = $1 AND id_usuario = $2 RETURNING *',
			[id, userId]
		);

		if (result.rows.length === 0) {
			return json({ error: 'Egreso no encontrado' }, { status: 404 });
		}

		return json({ success: true, message: 'Egreso eliminado correctamente' });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al eliminar egreso:', error);
		return json({ error: 'Error al eliminar egreso' }, { status: 500 });
	}
};
