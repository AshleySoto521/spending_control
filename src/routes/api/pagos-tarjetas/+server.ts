import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// GET - Obtener todos los pagos a tarjetas del usuario
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);

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
			WHERE pt.id_usuario = $1
			ORDER BY pt.fecha_pago DESC, pt.fecha_creacion DESC`,
			[userId]
		);

		return json(result.rows);
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener pagos de tarjetas:', error);
		return json({ error: 'Error al obtener pagos de tarjetas' }, { status: 500 });
	}
};

// POST - Registrar un nuevo pago a tarjeta
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const data = await event.request.json();

		const { id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion } = data;

		// Validaciones
		if (!id_tarjeta || !fecha_pago || !monto || !id_forma_pago) {
			return json({ error: 'Todos los campos son requeridos' }, { status: 400 });
		}

		if (parseFloat(monto) <= 0) {
			return json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
		}

		// Verificar que la tarjeta pertenece al usuario
		const tarjetaCheck = await query(
			`SELECT id_tarjeta, saldo_usado FROM tarjetas WHERE id_tarjeta = $1 AND id_usuario = $2`,
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

		if (!['efectivo', 'transferencia'].includes(formaPagoCheck.rows[0].tipo)) {
			return json({ error: 'Solo se permiten pagos en efectivo o transferencia' }, { status: 400 });
		}

		// Registrar el pago (el trigger se encargará de actualizar el saldo de la tarjeta)
		const result = await query(
			`INSERT INTO pagos_tarjetas (id_usuario, id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *`,
			[userId, id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion || null]
		);

		return json(result.rows[0], { status: 201 });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al registrar pago de tarjeta:', error);
		return json({ error: 'Error al registrar pago de tarjeta' }, { status: 500 });
	}
};
