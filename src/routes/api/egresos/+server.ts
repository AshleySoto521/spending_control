import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// GET - Obtener todos los egresos del usuario
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const url = new URL(event.request.url);
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		const result = await query(
			`SELECT
				e.id_egreso,
				e.fecha_egreso,
				e.concepto,
				e.establecimiento,
				e.monto,
				e.id_forma_pago,
				e.id_tarjeta,
				e.descripcion,
				e.fecha_creacion,
				e.compra_meses,
				e.num_meses,
				e.mes_inicio_pago,
				e.monto_mensual,
				e.meses_pagados,
				fp.tipo as forma_pago,
				fp.descripcion as forma_pago_descripcion,
				t.nom_tarjeta,
				t.banco
			FROM egresos e
			LEFT JOIN formas_pago fp ON e.id_forma_pago = fp.id_forma_pago
			LEFT JOIN tarjetas t ON e.id_tarjeta = t.id_tarjeta
			WHERE e.id_usuario = $1
			ORDER BY e.fecha_egreso DESC, e.fecha_creacion DESC
			LIMIT $2 OFFSET $3`,
			[userId, limit, offset]
		);

		const countResult = await query(
			'SELECT COUNT(*) as total FROM egresos WHERE id_usuario = $1',
			[userId]
		);

		return json({
			egresos: result.rows,
			total: parseInt(countResult.rows[0].total),
			limit,
			offset
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener egresos:', error);
		return json({ error: 'Error al obtener egresos' }, { status: 500 });
	}
};

// POST - Crear nuevo egreso
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const {
			fecha_egreso,
			concepto,
			establecimiento,
			monto,
			id_forma_pago,
			id_tarjeta,
			descripcion,
			compra_meses,
			num_meses,
			mes_inicio_pago
		} = await event.request.json();

		// Validaciones
		if (!fecha_egreso || !concepto || !monto || !id_forma_pago) {
			return json(
				{ error: 'Fecha, concepto, monto y forma de pago son requeridos' },
				{ status: 400 }
			);
		}

		if (monto <= 0) {
			return json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
		}

		// Si se especifica una tarjeta, verificar que pertenece al usuario
		if (id_tarjeta) {
			const tarjetaCheck = await query(
				'SELECT id_tarjeta FROM tarjetas WHERE id_tarjeta = $1 AND id_usuario = $2',
				[id_tarjeta, userId]
			);

			if (tarjetaCheck.rows.length === 0) {
				return json({ error: 'Tarjeta no encontrada' }, { status: 404 });
			}
		}

		// Validar compras a meses
		if (compra_meses) {
			if (!num_meses || ![3, 6, 9, 12, 15, 18, 24, 36, 48].includes(num_meses)) {
				return json({ error: 'Número de meses inválido' }, { status: 400 });
			}
			if (mes_inicio_pago !== undefined && (mes_inicio_pago < 0 || mes_inicio_pago > 12)) {
				return json({ error: 'Mes de inicio de pago inválido' }, { status: 400 });
			}
		}

		// Calcular monto mensual si es compra a meses
		const montoMensual = compra_meses ? monto / num_meses : null;

		const result = await query(
			`INSERT INTO egresos
			(id_usuario, fecha_egreso, concepto, establecimiento, monto, id_forma_pago, id_tarjeta, descripcion,
			 compra_meses, num_meses, mes_inicio_pago, monto_mensual, meses_pagados)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			RETURNING *`,
			[
				userId,
				fecha_egreso,
				concepto,
				establecimiento || null,
				monto,
				id_forma_pago,
				id_tarjeta || null,
				descripcion || null,
				compra_meses || false,
				compra_meses ? num_meses : null,
				compra_meses ? (mes_inicio_pago || 0) : null,
				montoMensual,
				0
			]
		);

		return json({ success: true, egreso: result.rows[0] }, { status: 201 });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al crear egreso:', error);
		return json({ error: 'Error al crear egreso' }, { status: 500 });
	}
};
