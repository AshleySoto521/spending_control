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

		// Verificar que el préstamo pertenece al usuario y obtener sus datos
		const checkOwnership = await query(
			'SELECT id_prestamo, institucion, tipo_prestamo FROM prestamos WHERE id_prestamo = $1 AND id_usuario = $2',
			[id_prestamo, userId]
		);

		if (checkOwnership.rows.length === 0) {
			return json({ error: 'Préstamo no encontrado' }, { status: 404 });
		}

		const prestamo = checkOwnership.rows[0];

		// Registrar el pago en la tabla de pagos_prestamos
		const result = await query(
			`INSERT INTO pagos_prestamos (
				id_usuario, id_prestamo, fecha_pago, monto, id_forma_pago, descripcion
			) VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *`,
			[userId, id_prestamo, fecha_pago, monto, id_forma_pago, descripcion || null]
		);

		// Registrar también como egreso para que afecte el saldo actual
		const conceptoEgreso = `Pago de préstamo ${prestamo.tipo_prestamo.toLowerCase()}`;
		const establecimientoEgreso = prestamo.institucion;
		const descripcionEgreso = descripcion
			? `${descripcion} (Préstamo #${id_prestamo})`
			: `Pago de préstamo #${id_prestamo}`;

		await query(
			`INSERT INTO egresos (
				id_usuario, fecha_egreso, concepto, establecimiento, monto,
				id_forma_pago, descripcion, compra_meses
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				userId,
				fecha_pago,
				conceptoEgreso,
				establecimientoEgreso,
				monto,
				id_forma_pago,
				descripcionEgreso,
				false
			]
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

		// Obtener los datos del pago antes de eliminarlo para poder eliminar el egreso correspondiente
		const checkOwnership = await query(
			'SELECT id_pago, fecha_pago, monto, id_prestamo FROM pagos_prestamos WHERE id_pago = $1 AND id_usuario = $2',
			[id_pago, userId]
		);

		if (checkOwnership.rows.length === 0) {
			return json({ error: 'Pago no encontrado' }, { status: 404 });
		}

		const pago = checkOwnership.rows[0];

		// Eliminar el pago de la tabla pagos_prestamos
		await query(
			'DELETE FROM pagos_prestamos WHERE id_pago = $1 AND id_usuario = $2',
			[id_pago, userId]
		);

		// Eliminar también el egreso correspondiente
		// Buscamos por fecha, monto, usuario y el patrón del concepto para identificar el egreso correcto
		await query(
			`DELETE FROM egresos
			WHERE id_usuario = $1
			AND fecha_egreso = $2
			AND monto = $3
			AND concepto LIKE 'Pago de préstamo%'
			AND descripcion LIKE $4`,
			[userId, pago.fecha_pago, pago.monto, `%Préstamo #${pago.id_prestamo}%`]
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
