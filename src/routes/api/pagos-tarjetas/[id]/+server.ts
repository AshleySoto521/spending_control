import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query, getClient } from '$lib/server/db';
import { requireAuth, esRespuestaDeAuth } from '$lib/server/middleware';
import { idEntero, fechaISO } from '$lib/server/validacion';

// GET - Obtener un pago específico
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const pagoId = idEntero(event.params.id);

		if (pagoId === null) {
			return json({ error: 'Identificador inválido' }, { status: 400 });
		}

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
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
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
		const pagoId = idEntero(event.params.id);

		if (pagoId === null) {
			return json({ error: 'Identificador inválido' }, { status: 400 });
		}
		const data = await event.request.json();

		const { fecha_pago, monto, descripcion } = data;

		// Validaciones
		if (!data.id_tarjeta || !fecha_pago || !monto || !data.id_forma_pago) {
			return json({ error: 'Todos los campos son requeridos' }, { status: 400 });
		}

		const id_tarjeta = idEntero(data.id_tarjeta);
		const id_forma_pago = idEntero(data.id_forma_pago);

		if (id_tarjeta === null || id_forma_pago === null) {
			return json({ error: 'Identificador inválido' }, { status: 400 });
		}

		if (!fechaISO(fecha_pago)) {
			return json({ error: 'La fecha de pago debe tener el formato YYYY-MM-DD' }, { status: 400 });
		}

		if (!Number.isFinite(parseFloat(monto)) || parseFloat(monto) <= 0) {
			return json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
		}

		// El pago y su egreso se actualizan juntos o no se actualiza ninguno.
		const client = await getClient();

		try {
			await client.query('BEGIN');

			// Verificar que el pago existe y pertenece al usuario
			const pagoCheck = await client.query(
				`SELECT id_pago FROM pagos_tarjetas WHERE id_pago = $1 AND id_usuario = $2 FOR UPDATE`,
				[pagoId, userId]
			);

			if (pagoCheck.rows.length === 0) {
				await client.query('ROLLBACK');
				return json({ error: 'Pago no encontrado' }, { status: 404 });
			}

			// Verificar que la tarjeta pertenece al usuario
			const tarjetaCheck = await client.query(
				`SELECT id_tarjeta, nom_tarjeta, banco FROM tarjetas WHERE id_tarjeta = $1 AND id_usuario = $2`,
				[id_tarjeta, userId]
			);

			if (tarjetaCheck.rows.length === 0) {
				await client.query('ROLLBACK');
				return json({ error: 'Tarjeta no encontrada' }, { status: 404 });
			}

			const tarjeta = tarjetaCheck.rows[0];

			// Verificar que la forma de pago sea efectivo o transferencia
			const formaPagoCheck = await client.query(
				`SELECT tipo FROM formas_pago WHERE id_forma_pago = $1`,
				[id_forma_pago]
			);

			if (formaPagoCheck.rows.length === 0) {
				await client.query('ROLLBACK');
				return json({ error: 'Forma de pago no válida' }, { status: 400 });
			}

			if (!['EFECTIVO', 'TRANSFERENCIA'].includes(formaPagoCheck.rows[0].tipo.toUpperCase())) {
				await client.query('ROLLBACK');
				return json(
					{ error: 'Solo se permiten pagos en efectivo o transferencia' },
					{ status: 400 }
				);
			}

			const result = await client.query(
				`UPDATE pagos_tarjetas
				SET id_tarjeta = $1, fecha_pago = $2, monto = $3, id_forma_pago = $4, descripcion = $5
				WHERE id_pago = $6 AND id_usuario = $7
				RETURNING *`,
				[id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion || null, pagoId, userId]
			);

			// Sincronizar el egreso que generó este pago. Hasta la migración 013
			// no había forma de localizarlo con certeza, así que editar un pago
			// dejaba su egreso con el monto y la fecha antiguos, y el saldo
			// dejaba de cuadrar en silencio. Los egresos anteriores a la
			// migración que el relleno no pudo emparejar siguen sin vínculo: no
			// se tocan.
			await client.query(
				`UPDATE egresos
				SET fecha_egreso = $1,
					concepto = $2,
					establecimiento = $3,
					monto = $4,
					id_forma_pago = $5,
					descripcion = $6
				WHERE id_pago_tarjeta_origen = $7 AND id_usuario = $8`,
				[
					fecha_pago,
					`Pago de tarjeta - ${tarjeta.nom_tarjeta}`,
					tarjeta.banco || 'Banco',
					monto,
					id_forma_pago,
					descripcion || 'Pago de tarjeta de crédito',
					pagoId,
					userId
				]
			);

			await client.query('COMMIT');

			return json(result.rows[0]);
		} catch (errorTransaccion) {
			await client.query('ROLLBACK').catch(() => {});
			throw errorTransaccion;
		} finally {
			client.release();
		}
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
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
		const pagoId = idEntero(event.params.id);

		if (pagoId === null) {
			return json({ error: 'Identificador inválido' }, { status: 400 });
		}

		// Verificar que el pago existe y pertenece al usuario
		const pagoCheck = await query(
			`SELECT id_pago FROM pagos_tarjetas WHERE id_pago = $1 AND id_usuario = $2`,
			[pagoId, userId]
		);

		if (pagoCheck.rows.length === 0) {
			return json({ error: 'Pago no encontrado' }, { status: 404 });
		}

		// Eliminar el pago. El ON DELETE CASCADE de `egresos.id_pago_tarjeta_origen`
		// (migración 013) retira además el egreso que este pago había generado.
		// Antes ese egreso se quedaba huérfano restando del saldo para siempre,
		// porque aquí nunca se borraba y no existía forma de identificarlo.
		await query(`DELETE FROM pagos_tarjetas WHERE id_pago = $1 AND id_usuario = $2`, [
			pagoId,
			userId
		]);

		return json({ message: 'Pago eliminado correctamente' });
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
			return error;
		}
		console.error('Error al eliminar pago:', error);
		return json({ error: 'Error al eliminar pago' }, { status: 500 });
	}
};
