import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// GET - Obtener un pago específico
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const pagoId = event.params.id;

		const result = await query(
			`SELECT
				pt.id_pago,
				pt.id_tarjeta,
				t.nom_tarjeta,
				t.banco,
				pt.fecha_pago,
				pt.monto,
				pt.id_forma_pago,
				fp.tipo as forma_pago,
				pt.descripcion,
				pt.fecha_creacion
			FROM pagos_tarjetas pt
			JOIN tarjetas t ON pt.id_tarjeta = t.id_tarjeta
			JOIN formas_pago fp ON pt.id_forma_pago = fp.id_forma_pago
			WHERE pt.id_pago = $1 AND pt.id_usuario = $2`,
			[pagoId, userId]
		);

		if (result.rows.length === 0) {
			return json({ error: 'Pago no encontrado' }, { status: 404 });
		}

		return json(result.rows[0]);
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener pago:', error);
		return json({ error: 'Error al obtener pago' }, { status: 500 });
	}
};

// PUT - Actualizar un pago
export const PUT: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const pagoId = event.params.id;
		const data = await event.request.json();

		const { id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion } = data;

		// Validaciones
		if (!id_tarjeta || !fecha_pago || !monto || !id_forma_pago) {
			return json({ error: 'Todos los campos son requeridos' }, { status: 400 });
		}

		if (parseFloat(monto) <= 0) {
			return json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
		}

		// Verificar que el pago existe y pertenece al usuario
		const pagoCheck = await query(
			`SELECT id_pago FROM pagos_tarjetas WHERE id_pago = $1 AND id_usuario = $2`,
			[pagoId, userId]
		);

		if (pagoCheck.rows.length === 0) {
			return json({ error: 'Pago no encontrado' }, { status: 404 });
		}

		// Verificar que la tarjeta pertenece al usuario
		const tarjetaCheck = await query(
			`SELECT id_tarjeta FROM tarjetas WHERE id_tarjeta = $1 AND id_usuario = $2`,
			[id_tarjeta, userId]
		);

		if (tarjetaCheck.rows.length === 0) {
			return json({ error: 'Tarjeta no encontrada' }, { status: 404 });
		}

		// Verificar que la forma de pago sea efectivo o transferencia
		const formaPagoCheck = await query(
			`SELECT tipo FROM formas_pago WHERE id_forma_pago = $1`,
			[id_forma_pago]
		);

		if (formaPagoCheck.rows.length === 0) {
			return json({ error: 'Forma de pago no válida' }, { status: 400 });
		}

		if (!['EFECTIVO', 'TRANSFERENCIA'].includes(formaPagoCheck.rows[0].tipo.toUpperCase())) {
			return json({ error: 'Solo se permiten pagos en efectivo o transferencia' }, { status: 400 });
		}

		// Actualizar el pago (el trigger se encargará de actualizar el saldo de la tarjeta)
		const result = await query(
			`UPDATE pagos_tarjetas
			SET id_tarjeta = $1, fecha_pago = $2, monto = $3, id_forma_pago = $4, descripcion = $5
			WHERE id_pago = $6 AND id_usuario = $7
			RETURNING *`,
			[id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion || null, pagoId, userId]
		);

		return json(result.rows[0]);
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al actualizar pago:', error);
		return json({ error: 'Error al actualizar pago' }, { status: 500 });
	}
};

// DELETE - Eliminar un pago
export const DELETE: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const pagoId = event.params.id;

		// Verificar que el pago existe y pertenece al usuario
		const pagoCheck = await query(
			`SELECT id_pago FROM pagos_tarjetas WHERE id_pago = $1 AND id_usuario = $2`,
			[pagoId, userId]
		);

		if (pagoCheck.rows.length === 0) {
			return json({ error: 'Pago no encontrado' }, { status: 404 });
		}

		// Eliminar el pago (el trigger se encargará de actualizar el saldo de la tarjeta)
		await query(
			`DELETE FROM pagos_tarjetas WHERE id_pago = $1 AND id_usuario = $2`,
			[pagoId, userId]
		);

		return json({ message: 'Pago eliminado correctamente' });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al eliminar pago:', error);
		return json({ error: 'Error al eliminar pago' }, { status: 500 });
	}
};
