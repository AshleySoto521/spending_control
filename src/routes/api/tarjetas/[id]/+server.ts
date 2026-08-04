import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';
import { idEntero, validarUltimosDigitos, textoLimpio } from '$lib/server/validacion';

// GET - Obtener una tarjeta específica
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const id = idEntero(event.params.id);

		if (id === null) {
			return json({ error: 'Identificador inválido' }, { status: 400 });
		}

		const result = await query(
			`SELECT
				id_tarjeta,
				num_tarjeta,
				nom_tarjeta,
				UPPER(tipo_tarjeta) as tipo_tarjeta,
				clabe,
				banco,
				linea_credito,
				saldo_usado,
				dia_corte,
				dias_gracia,
				fecha_creacion,
				activa,
				id_usuario
			FROM tarjetas
			WHERE id_tarjeta = $1 AND id_usuario = $2`,
			[id, userId]
		);

		if (result.rows.length === 0) {
			return json({ error: 'Tarjeta no encontrada' }, { status: 404 });
		}

		return json({ tarjeta: result.rows[0] });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener tarjeta:', error);
		return json({ error: 'Error al obtener tarjeta' }, { status: 500 });
	}
};

// PUT - Actualizar tarjeta
export const PUT: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const id = idEntero(event.params.id);

		if (id === null) {
			return json({ error: 'Identificador inválido' }, { status: 400 });
		}
		const data = await event.request.json();

		// Verificar que la tarjeta pertenece al usuario
		const existing = await query(
			'SELECT id_tarjeta FROM tarjetas WHERE id_tarjeta = $1 AND id_usuario = $2',
			[id, userId]
		);

		if (existing.rows.length === 0) {
			return json({ error: 'Tarjeta no encontrada' }, { status: 404 });
		}

		// Solo se admiten los últimos dígitos; ver migración 017.
		const ultimosDigitos = validarUltimosDigitos(data.num_tarjeta);

		if (ultimosDigitos.error) {
			return json({ error: ultimosDigitos.error }, { status: 400 });
		}

		// Validar CLABE si se proporciona
		if (data.clabe) {
			if (!/^\d{18}$/.test(data.clabe)) {
				return json({ error: 'La CLABE debe contener exactamente 18 dígitos' }, { status: 400 });
			}
		}

		// Validar día de corte si se proporciona
		if (data.dia_corte !== undefined && (data.dia_corte < 1 || data.dia_corte > 31)) {
			return json({ error: 'El día de corte debe estar entre 1 y 31' }, { status: 400 });
		}

		// Validar tipo de tarjeta si se proporciona
		if (data.tipo_tarjeta) {
			const tiposValidos = ['CREDITO', 'DEBITO', 'DEPARTAMENTAL', 'SERVICIOS'];
			if (!tiposValidos.includes(data.tipo_tarjeta)) {
				return json({ error: 'Tipo de tarjeta no válido' }, { status: 400 });
			}
		}

		// Para tarjetas de servicios, la línea de crédito debe ser NULL
		let lineaCreditoFinal = data.linea_credito;
		if (data.tipo_tarjeta === 'SERVICIOS') {
			lineaCreditoFinal = null;
		}

		const result = await query(
			`UPDATE tarjetas
			SET
				num_tarjeta = COALESCE($1, num_tarjeta),
				nom_tarjeta = COALESCE($2, nom_tarjeta),
				tipo_tarjeta = COALESCE($3, tipo_tarjeta),
				clabe = COALESCE($4, clabe),
				banco = COALESCE($5, banco),
				linea_credito = CASE
					WHEN $3 = 'servicios' THEN NULL
					ELSE COALESCE($6, linea_credito)
				END,
				dia_corte = COALESCE($7, dia_corte),
				dias_gracia = COALESCE($8, dias_gracia),
				activa = COALESCE($9, activa)
			WHERE id_tarjeta = $10 AND id_usuario = $11
			RETURNING *`,
			[
				ultimosDigitos.valor,
				textoLimpio(data.nom_tarjeta, 100),
				data.tipo_tarjeta,
				data.clabe,
				textoLimpio(data.banco, 100),
				lineaCreditoFinal,
				data.dia_corte,
				data.dias_gracia,
				data.activa,
				id,
				userId
			]
		);

		return json({ success: true, tarjeta: result.rows[0] });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al actualizar tarjeta:', error);
		return json({ error: 'Error al actualizar tarjeta' }, { status: 500 });
	}
};

// DELETE - Eliminar tarjeta (soft delete)
export const DELETE: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const id = idEntero(event.params.id);

		if (id === null) {
			return json({ error: 'Identificador inválido' }, { status: 400 });
		}

		// Una tarjeta sin movimientos se borra de verdad; con movimientos, se
		// desactiva.
		//
		// Antes todo se desactivaba, así que la tarjeta creada por error seguía
		// en la lista para siempre, en gris: la persona creía haberla borrado y
		// ahí seguía. De ahí las once tarjetas vacías acumuladas. Borrarla de
		// verdad solo es seguro cuando no cuelga nada de ella; si tiene gastos o
		// pagos, eliminarla se llevaría por delante historial financiero.
		const movimientos = await query(
			`SELECT
				(SELECT COUNT(*) FROM egresos        WHERE id_tarjeta = $1)::int AS gastos,
				(SELECT COUNT(*) FROM pagos_tarjetas WHERE id_tarjeta = $1)::int AS pagos`,
			[id]
		);

		const { gastos, pagos } = movimientos.rows[0];
		const tieneMovimientos = gastos > 0 || pagos > 0;

		const result = tieneMovimientos
			? await query(
					'UPDATE tarjetas SET activa = FALSE WHERE id_tarjeta = $1 AND id_usuario = $2 RETURNING id_tarjeta',
					[id, userId]
				)
			: await query(
					'DELETE FROM tarjetas WHERE id_tarjeta = $1 AND id_usuario = $2 RETURNING id_tarjeta',
					[id, userId]
				);

		if (result.rows.length === 0) {
			return json({ error: 'Tarjeta no encontrada' }, { status: 404 });
		}

		return json({
			success: true,
			eliminada: !tieneMovimientos,
			message: tieneMovimientos
				? `La tarjeta se archivó porque tiene ${gastos + pagos} movimiento(s) asociados. Su historial se conserva.`
				: 'Tarjeta eliminada correctamente'
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al eliminar tarjeta:', error);
		return json({ error: 'Error al eliminar tarjeta' }, { status: 500 });
	}
};
