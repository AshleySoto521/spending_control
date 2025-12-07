import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// GET - Obtener todos los ingresos del usuario
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const url = new URL(event.request.url);
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		const result = await query(
			`SELECT
				i.id_ingreso,
				i.tipo_ingreso,
				i.monto,
				i.id_forma_pago,
				i.fecha_ingreso,
				i.descripcion,
				i.fecha_creacion,
				fp.tipo as forma_pago,
				fp.descripcion as forma_pago_descripcion
			FROM ingresos i
			LEFT JOIN formas_pago fp ON i.id_forma_pago = fp.id_forma_pago
			WHERE i.id_usuario = $1
			ORDER BY i.fecha_ingreso DESC, i.fecha_creacion DESC
			LIMIT $2 OFFSET $3`,
			[userId, limit, offset]
		);

		const countResult = await query(
			'SELECT COUNT(*) as total FROM ingresos WHERE id_usuario = $1',
			[userId]
		);

		return json({
			ingresos: result.rows,
			total: parseInt(countResult.rows[0].total),
			limit,
			offset
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener ingresos:', error);
		return json({ error: 'Error al obtener ingresos' }, { status: 500 });
	}
};

// POST - Crear nuevo ingreso
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { tipo_ingreso, monto, id_forma_pago, fecha_ingreso, descripcion } =
			await event.request.json();

		// Validaciones
		if (!tipo_ingreso || !monto || !id_forma_pago || !fecha_ingreso) {
			return json(
				{ error: 'Tipo, monto, forma de pago y fecha son requeridos' },
				{ status: 400 }
			);
		}

		if (monto <= 0) {
			return json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
		}

		const result = await query(
			`INSERT INTO ingresos
			(id_usuario, tipo_ingreso, monto, id_forma_pago, fecha_ingreso, descripcion)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *`,
			[userId, tipo_ingreso, monto, id_forma_pago, fecha_ingreso, descripcion || null]
		);

		return json({ success: true, ingreso: result.rows[0] }, { status: 201 });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al crear ingreso:', error);
		return json({ error: 'Error al crear ingreso' }, { status: 500 });
	}
};
