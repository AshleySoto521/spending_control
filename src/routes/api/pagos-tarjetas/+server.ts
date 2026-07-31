import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query, getClient } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';
import { idEntero, fechaISO } from '$lib/server/validacion';

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

		const { fecha_pago, monto, descripcion, cuotas_msi_pagadas } = data;

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

		// Las cuotas MSI se validan antes de abrir la transacción.
		const cuotas: number[] = [];

		if (cuotas_msi_pagadas !== undefined && cuotas_msi_pagadas !== null) {
			if (!Array.isArray(cuotas_msi_pagadas)) {
				return json({ error: 'Cuotas MSI inválidas' }, { status: 400 });
			}

			for (const valor of cuotas_msi_pagadas) {
				const idCuota = idEntero(valor);
				if (idCuota === null) {
					return json({ error: 'Cuotas MSI inválidas' }, { status: 400 });
				}
				cuotas.push(idCuota);
			}
		}

		// Toda la operación va sobre UNA conexión reservada del pool.
		//
		// Antes se usaba `query()`, que toma una conexión distinta del pool en
		// cada llamada: el BEGIN, los INSERT, el COMMIT y el ROLLBACK podían
		// acabar en conexiones diferentes. Eso significaba que la operación no
		// era atómica; que el BEGIN quedaba abierto en una conexión devuelta al
		// pool, de modo que las escrituras de otra petición entraban en esa
		// transacción ajena; y que un ROLLBACK podía deshacer el trabajo de
		// otro usuario. Con datos de dinero, eso es corrupción silenciosa.
		const client = await getClient();

		try {
			await client.query('BEGIN');

			// Verificar que la tarjeta pertenece al usuario y obtener sus datos
			const tarjetaCheck = await client.query(
				`SELECT id_tarjeta, saldo_usado, nom_tarjeta, banco FROM tarjetas WHERE id_tarjeta = $1 AND id_usuario = $2`,
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

			// Registrar el pago. El trigger de `pagos_tarjetas` recalcula el saldo
			// de la tarjeta (migración 014); entre la 009 y la 014 ese trigger no
			// existía y el saldo se quedaba sin actualizar hasta que se tocaba
			// alguna compra de la misma tarjeta.
			const result = await client.query(
				`INSERT INTO pagos_tarjetas (id_usuario, id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING *`,
				[userId, id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion || null]
			);

			// Registrar automáticamente el pago como un egreso
			const conceptoEgreso = `Pago de tarjeta - ${tarjeta.nom_tarjeta}`;
			const establecimientoEgreso = tarjeta.banco || 'Banco';
			const descripcionEgreso = descripcion || 'Pago de tarjeta de crédito';

			// `id_pago_tarjeta_origen` deja constancia de qué pago generó este
			// egreso. Antes la relación se adivinaba comparando fecha, monto y
			// el texto del concepto; ahora la impone la clave foránea, y su
			// ON DELETE CASCADE se lleva el egreso si el pago desaparece.
			await client.query(
				`INSERT INTO egresos (id_usuario, fecha_egreso, concepto, establecimiento, monto, id_forma_pago, descripcion, compra_meses, id_pago_tarjeta_origen)
				VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8)`,
				[
					userId,
					fecha_pago,
					conceptoEgreso,
					establecimientoEgreso,
					monto,
					id_forma_pago,
					descripcionEgreso,
					result.rows[0].id_pago
				]
			);

			// Si se seleccionaron cuotas MSI, incrementar meses_pagados
			for (const idEgreso of cuotas) {
				// Verificar que el egreso pertenece al usuario y a la tarjeta
				const egresoCheck = await client.query(
					`SELECT id_egreso, meses_pagados, num_meses
					FROM egresos
					WHERE id_egreso = $1 AND id_usuario = $2 AND id_tarjeta = $3 AND compra_meses = TRUE
					FOR UPDATE`,
					[idEgreso, userId, id_tarjeta]
				);

				if (egresoCheck.rows.length === 0) {
					await client.query('ROLLBACK');
					return json({ error: 'Una de las cuotas MSI no es válida' }, { status: 400 });
				}

				const egreso = egresoCheck.rows[0];

				// Verificar que no esté completamente pagado
				if (egreso.meses_pagados >= egreso.num_meses) {
					await client.query('ROLLBACK');
					return json(
						{ error: 'Una de las cuotas MSI ya está completamente pagada' },
						{ status: 400 }
					);
				}

				// Incrementar meses_pagados en 1
				await client.query(
					`UPDATE egresos
					SET meses_pagados = meses_pagados + 1
					WHERE id_egreso = $1`,
					[idEgreso]
				);
			}

			await client.query('COMMIT');

			return json(
				{
					...result.rows[0],
					cuotas_msi_actualizadas: cuotas.length
				},
				{ status: 201 }
			);
		} catch (errorTransaccion) {
			await client.query('ROLLBACK').catch(() => {});
			throw errorTransaccion;
		} finally {
			// Imprescindible: sin `release()` la conexión no vuelve al pool y,
			// tras 20 peticiones, la aplicación se queda sin conexiones.
			client.release();
		}
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		// Nunca se devuelve `error.message`: traía el texto de los errores de
		// PostgreSQL (nombres de tabla, restricciones) hasta el navegador.
		console.error('Error al registrar pago de tarjeta:', error);
		return json({ error: 'Error al registrar pago de tarjeta' }, { status: 500 });
	}
};
