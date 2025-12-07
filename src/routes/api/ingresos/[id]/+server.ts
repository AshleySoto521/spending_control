import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// PUT - Actualizar ingreso
export const PUT: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { id } = event.params;
		const data = await event.request.json();

		// Verificar que el ingreso pertenece al usuario
		const existing = await query(
			'SELECT id_ingreso FROM ingresos WHERE id_ingreso = $1 AND id_usuario = $2',
			[id, userId]
		);

		if (existing.rows.length === 0) {
			return json({ error: 'Ingreso no encontrado' }, { status: 404 });
		}

		const result = await query(
			`UPDATE ingresos
			SET
				tipo_ingreso = COALESCE($1, tipo_ingreso),
				monto = COALESCE($2, monto),
				id_forma_pago = COALESCE($3, id_forma_pago),
				fecha_ingreso = COALESCE($4, fecha_ingreso),
				descripcion = COALESCE($5, descripcion)
			WHERE id_ingreso = $6 AND id_usuario = $7
			RETURNING *`,
			[data.tipo_ingreso, data.monto, data.id_forma_pago, data.fecha_ingreso, data.descripcion, id, userId]
		);

		return json({ success: true, ingreso: result.rows[0] });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al actualizar ingreso:', error);
		return json({ error: 'Error al actualizar ingreso' }, { status: 500 });
	}
};

// DELETE - Eliminar ingreso
export const DELETE: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { id } = event.params;

		const result = await query(
			'DELETE FROM ingresos WHERE id_ingreso = $1 AND id_usuario = $2 RETURNING *',
			[id, userId]
		);

		if (result.rows.length === 0) {
			return json({ error: 'Ingreso no encontrado' }, { status: 404 });
		}

		return json({ success: true, message: 'Ingreso eliminado correctamente' });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al eliminar ingreso:', error);
		return json({ error: 'Error al eliminar ingreso' }, { status: 500 });
	}
};
