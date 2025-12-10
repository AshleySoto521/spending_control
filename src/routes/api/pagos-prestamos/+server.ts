import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// GET - Obtener pagos de préstamos del usuario
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const url = new URL(event.request.url);
		const id_prestamo = url.searchParams.get('id_prestamo');

		let pagosQuery = `
			SELECT
				pp.*,
				p.institucion,
				p.tipo_prestamo,
				fp.tipo as forma_pago_tipo
			FROM pagos_prestamos pp
			JOIN prestamos p ON pp.id_prestamo = p.id_prestamo
			JOIN formas_pago fp ON pp.id_forma_pago = fp.id_forma_pago
			WHERE pp.id_usuario = $1
		`;

		const queryParams: any[] = [userId];

		if (id_prestamo) {
			pagosQuery += ` AND pp.id_prestamo = $2`;
			queryParams.push(id_prestamo);
		}

		pagosQuery += ` ORDER BY pp.fecha_pago DESC`;

		const pagos = await query(pagosQuery, queryParams);

		return json({ pagos: pagos.rows });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener pagos de préstamos:', error);
		return json({ error: 'Error al obtener pagos de préstamos' }, { status: 500 });
	}
};

// POST - Registrar un pago de préstamo
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const data = await event.request.json();

		const { id_prestamo, fecha_pago, monto, id_forma_pago, descripcion } = data;

		// Validaciones
		if (!id_prestamo || !fecha_pago || !monto || !id_forma_pago) {
			return json({ error: 'Faltan campos requeridos' }, { status: 400 });
		}

		if (monto <= 0) {
			return json({ error: 'El monto debe ser mayor a cero' }, { status: 400 });
		}

		// Verificar que el préstamo pertenece al usuario
		const checkOwnership = await query(
			'SELECT id_prestamo FROM prestamos WHERE id_prestamo = $1 AND id_usuario = $2',
			[id_prestamo, userId]
		);

		if (checkOwnership.rows.length === 0) {
			return json({ error: 'Préstamo no encontrado' }, { status: 404 });
		}

		// Registrar el pago
		const result = await query(
			`INSERT INTO pagos_prestamos (
				id_usuario, id_prestamo, fecha_pago, monto, id_forma_pago, descripcion
			) VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *`,
			[userId, id_prestamo, fecha_pago, monto, id_forma_pago, descripcion || null]
		);

		return json(
			{
				message: 'Pago registrado exitosamente',
				pago: result.rows[0]
			},
			{ status: 201 }
		);
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al registrar pago de préstamo:', error);
		return json({ error: 'Error al registrar pago de préstamo' }, { status: 500 });
	}
};

// DELETE - Eliminar un pago de préstamo
export const DELETE: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const url = new URL(event.request.url);
		const id_pago = url.searchParams.get('id_pago');

		if (!id_pago) {
			return json({ error: 'ID de pago requerido' }, { status: 400 });
		}

		// Verificar que el pago pertenece al usuario
		const checkOwnership = await query(
			'SELECT id_pago FROM pagos_prestamos WHERE id_pago = $1 AND id_usuario = $2',
			[id_pago, userId]
		);

		if (checkOwnership.rows.length === 0) {
			return json({ error: 'Pago no encontrado' }, { status: 404 });
		}

		await query(
			'DELETE FROM pagos_prestamos WHERE id_pago = $1 AND id_usuario = $2',
			[id_pago, userId]
		);

		return json({ message: 'Pago eliminado exitosamente' });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al eliminar pago de préstamo:', error);
		return json({ error: 'Error al eliminar pago de préstamo' }, { status: 500 });
	}
};
