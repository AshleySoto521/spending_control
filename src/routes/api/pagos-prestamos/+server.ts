import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query, getClient } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';
import { idEntero, fechaISO } from '$lib/server/validacion';

// GET - Obtener pagos de préstamos del usuario
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const url = new URL(event.request.url);
		const filtroPrestamo = url.searchParams.get('id_prestamo');
		const id_prestamo = filtroPrestamo === null ? null : idEntero(filtroPrestamo);

		if (filtroPrestamo !== null && id_prestamo === null) {
			return json({ error: 'Identificador de préstamo inválido' }, { status: 400 });
		}

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

		const { fecha_pago, monto, descripcion } = data;

		// Validaciones
		if (!data.id_prestamo || !fecha_pago || !monto || !data.id_forma_pago) {
			return json({ error: 'Faltan campos requeridos' }, { status: 400 });
		}

		const id_prestamo = idEntero(data.id_prestamo);
		const id_forma_pago = idEntero(data.id_forma_pago);

		if (id_prestamo === null || id_forma_pago === null) {
			return json({ error: 'Identificador inválido' }, { status: 400 });
		}

		if (!fechaISO(fecha_pago)) {
			return json({ error: 'La fecha de pago debe tener el formato YYYY-MM-DD' }, { status: 400 });
		}

		if (!Number.isFinite(Number(monto)) || Number(monto) <= 0) {
			return json({ error: 'El monto debe ser mayor a cero' }, { status: 400 });
		}

		// El pago y su egreso son un solo hecho contable, así que van en una
		// transacción sobre una conexión reservada. Antes eran dos consultas
		// independientes: si la segunda fallaba, quedaba un pago de préstamo sin
		// el egreso que le corresponde, y el saldo dejaba de cuadrar sin que
		// nada lo señalara.
		const client = await getClient();

		try {
			await client.query('BEGIN');

			// Verificar que el préstamo pertenece al usuario y obtener sus datos
			const checkOwnership = await client.query(
				'SELECT id_prestamo, institucion, tipo_prestamo FROM prestamos WHERE id_prestamo = $1 AND id_usuario = $2',
				[id_prestamo, userId]
			);

			if (checkOwnership.rows.length === 0) {
				await client.query('ROLLBACK');
				return json({ error: 'Préstamo no encontrado' }, { status: 404 });
			}

			const prestamo = checkOwnership.rows[0];

			// Registrar el pago en la tabla de pagos_prestamos
			const result = await client.query(
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

			// `id_pago_prestamo_origen` deja constancia de qué pago generó este
			// egreso, en lugar de reconstruirlo después por fecha, monto y un
			// patrón de texto. El ON DELETE CASCADE de la clave foránea se
			// encarga de retirarlo si el pago se elimina.
			await client.query(
				`INSERT INTO egresos (
					id_usuario, fecha_egreso, concepto, establecimiento, monto,
					id_forma_pago, descripcion, compra_meses, id_pago_prestamo_origen
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				[
					userId,
					fecha_pago,
					conceptoEgreso,
					establecimientoEgreso,
					monto,
					id_forma_pago,
					descripcionEgreso,
					false,
					result.rows[0].id_pago
				]
			);

			await client.query('COMMIT');

			return json(
				{
					message: 'Pago registrado exitosamente',
					pago: result.rows[0]
				},
				{ status: 201 }
			);
		} catch (errorTransaccion) {
			await client.query('ROLLBACK').catch(() => {});
			throw errorTransaccion;
		} finally {
			// Sin `release()` la conexión no vuelve al pool y la aplicación se
			// queda sin conexiones tras 20 peticiones.
			client.release();
		}
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
		const id_pago = idEntero(url.searchParams.get('id_pago'));

		if (id_pago === null) {
			return json({ error: 'ID de pago requerido y válido' }, { status: 400 });
		}

		// Borrar el pago y su egreso también es una sola operación: si la
		// segunda consulta falla, el egreso queda huérfano y sigue restando del
		// saldo aunque el pago ya no exista.
		const client = await getClient();

		try {
			await client.query('BEGIN');

			// Obtener los datos del pago antes de eliminarlo para poder eliminar el egreso correspondiente
			const checkOwnership = await client.query(
				`SELECT id_pago, fecha_pago, monto, id_prestamo
				 FROM pagos_prestamos
				 WHERE id_pago = $1 AND id_usuario = $2
				 FOR UPDATE`,
				[id_pago, userId]
			);

			if (checkOwnership.rows.length === 0) {
				await client.query('ROLLBACK');
				return json({ error: 'Pago no encontrado' }, { status: 404 });
			}

			const pago = checkOwnership.rows[0];

			// Si el egreso está vinculado (migración 013), el ON DELETE CASCADE
			// de la clave foránea lo retira solo al borrar el pago.
			const vinculado = await client.query(
				'SELECT 1 FROM egresos WHERE id_pago_prestamo_origen = $1 LIMIT 1',
				[id_pago]
			);

			// Camino heredado, solo para los pagos anteriores a la migración que
			// el relleno no pudo emparejar: se identifica el egreso por fecha,
			// monto y patrón del concepto. Se borra UNA sola fila, porque esos
			// criterios casan con todos los pagos idénticos del mismo día al
			// mismo préstamo.
			//
			// `ILIKE` y no `LIKE`: la descripción se escribe «(Préstamo #N)»
			// cuando el pago lleva nota y «Pago de préstamo #N» cuando no, así
			// que el patrón sensible a mayúsculas que había antes no encontraba
			// nunca el egreso de los pagos registrados sin descripción.
			if (vinculado.rowCount === 0) {
				await client.query(
					`DELETE FROM egresos
					WHERE id_egreso = (
						SELECT id_egreso
						FROM egresos
						WHERE id_usuario = $1
						  AND fecha_egreso = $2
						  AND monto = $3
						  AND concepto ILIKE 'Pago de préstamo%'
						  AND descripcion ILIKE $4
						  AND id_pago_prestamo_origen IS NULL
						ORDER BY id_egreso DESC
						LIMIT 1
					)`,
					[userId, pago.fecha_pago, pago.monto, `%réstamo #${pago.id_prestamo}%`]
				);
			}

			// Eliminar el pago (la cascada se lleva el egreso vinculado)
			await client.query('DELETE FROM pagos_prestamos WHERE id_pago = $1 AND id_usuario = $2', [
				id_pago,
				userId
			]);

			await client.query('COMMIT');

			return json({ message: 'Pago eliminado exitosamente' });
		} catch (errorTransaccion) {
			await client.query('ROLLBACK').catch(() => {});
			throw errorTransaccion;
		} finally {
			client.release();
		}
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al eliminar pago de préstamo:', error);
		return json({ error: 'Error al eliminar pago de préstamo' }, { status: 500 });
	}
};
