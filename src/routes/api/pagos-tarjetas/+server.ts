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

		const { id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion, cuotas_msi_pagadas } = data;

		// Validaciones
		if (!id_tarjeta || !fecha_pago || !monto || !id_forma_pago) {
			return json({ error: 'Todos los campos son requeridos' }, { status: 400 });
		}

		if (parseFloat(monto) <= 0) {
			return json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
		}

		// Verificar que la tarjeta pertenece al usuario y obtener sus datos
		const tarjetaCheck = await query(
			`SELECT id_tarjeta, saldo_usado, nom_tarjeta, banco FROM tarjetas WHERE id_tarjeta = $1 AND id_usuario = $2`,
			[id_tarjeta, userId]
		);

		if (tarjetaCheck.rows.length === 0) {
			return json({ error: 'Tarjeta no encontrada' }, { status: 404 });
		}

		const tarjeta = tarjetaCheck.rows[0];

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

		// Iniciar transacción para asegurar consistencia
		await query('BEGIN');

		try {
			// Registrar el pago (el trigger se encargará de actualizar el saldo de la tarjeta)
			const result = await query(
				`INSERT INTO pagos_tarjetas (id_usuario, id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING *`,
				[userId, id_tarjeta, fecha_pago, monto, id_forma_pago, descripcion || null]
			);

			// Registrar automáticamente el pago como un egreso
			const conceptoEgreso = `Pago de tarjeta - ${tarjeta.nom_tarjeta}`;
			const establecimientoEgreso = tarjeta.banco || 'Banco';
			const descripcionEgreso = descripcion || 'Pago de tarjeta de crédito';

			await query(
				`INSERT INTO egresos (id_usuario, fecha_egreso, concepto, establecimiento, monto, id_forma_pago, descripcion, compra_meses)
				VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
				[userId, fecha_pago, conceptoEgreso, establecimientoEgreso, monto, id_forma_pago, descripcionEgreso]
			);

			// Si se seleccionaron cuotas MSI, incrementar meses_pagados
			if (cuotas_msi_pagadas && Array.isArray(cuotas_msi_pagadas) && cuotas_msi_pagadas.length > 0) {
				for (const idEgreso of cuotas_msi_pagadas) {
					// Verificar que el egreso pertenece al usuario y a la tarjeta
					const egresoCheck = await query(
						`SELECT id_egreso, meses_pagados, num_meses
						FROM egresos
						WHERE id_egreso = $1 AND id_usuario = $2 AND id_tarjeta = $3 AND compra_meses = TRUE`,
						[idEgreso, userId, id_tarjeta]
					);

					if (egresoCheck.rows.length === 0) {
						throw new Error(`Cuota MSI con ID ${idEgreso} no encontrada o no válida`);
					}

					const egreso = egresoCheck.rows[0];

					// Verificar que no esté completamente pagado
					if (egreso.meses_pagados >= egreso.num_meses) {
						throw new Error(`La cuota MSI con ID ${idEgreso} ya está completamente pagada`);
					}

					// Incrementar meses_pagados en 1
					await query(
						`UPDATE egresos
						SET meses_pagados = meses_pagados + 1
						WHERE id_egreso = $1`,
						[idEgreso]
					);
				}
			}

			// Confirmar transacción
			await query('COMMIT');

			return json({
				...result.rows[0],
				cuotas_msi_actualizadas: cuotas_msi_pagadas?.length || 0
			}, { status: 201 });
		} catch (innerError: any) {
			// Revertir transacción en caso de error
			await query('ROLLBACK');
			throw innerError;
		}
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al registrar pago de tarjeta:', error);
		return json({ error: error.message || 'Error al registrar pago de tarjeta' }, { status: 500 });
	}
};
