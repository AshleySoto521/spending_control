// src/routes/api/prestamos/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// GET - Obtener todos los préstamos del usuario con sus saldos calculados
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);

		// La consulta incluye subqueries para calcular cuánto se ha pagado y el saldo real
		// basándose en la tabla 'pagos_prestamos'
		const prestamos = await query(
			`SELECT
				p.*,
				(SELECT COALESCE(SUM(pp.monto), 0)
				 FROM pagos_prestamos pp
				 WHERE pp.id_prestamo = p.id_prestamo) as total_pagado,
				
				p.monto_original - (SELECT COALESCE(SUM(pp.monto), 0)
				                    FROM pagos_prestamos pp
				                    WHERE pp.id_prestamo = p.id_prestamo) as saldo_pendiente,
				
				FLOOR((CURRENT_DATE - p.fecha_inicio) / 30.0) as meses_transcurridos
			FROM prestamos p
			WHERE p.id_usuario = $1
			ORDER BY p.activo DESC, p.fecha_creacion DESC`,
			[userId]
		);

		return json({ prestamos: prestamos.rows });
	} catch (error: any) {
		if (error.status === 401) return error;
		console.error('Error al obtener préstamos:', error);
		return json({ error: 'Error al obtener préstamos' }, { status: 500 });
	}
};

// POST - Crear un nuevo préstamo
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const data = await event.request.json();

		const {
			tipo_prestamo,
			institucion,
			monto_original,
			tasa_interes,
			plazo_meses,
			pago_mensual,
			dia_pago,
			fecha_inicio,
			descripcion
		} = data;

		// Validaciones
		if (!tipo_prestamo || !institucion || !monto_original || !plazo_meses || !pago_mensual || !dia_pago || !fecha_inicio) {
			return json({ error: 'Faltan campos requeridos' }, { status: 400 });
		}

		if (!['PERSONAL', 'AUTOMOTRIZ', 'HIPOTECARIO'].includes(tipo_prestamo)) {
			return json({ error: 'Tipo de préstamo inválido' }, { status: 400 });
		}

		const result = await query(
			`INSERT INTO prestamos (
				id_usuario, tipo_prestamo, institucion, monto_original,
				tasa_interes, plazo_meses, pago_mensual, dia_pago,
				fecha_inicio, descripcion
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING *`,
			[
				userId,
				tipo_prestamo,
				institucion,
				monto_original,
				tasa_interes || null,
				plazo_meses,
				pago_mensual,
				dia_pago,
				fecha_inicio,
				descripcion || null
			]
		);

		return json({
			message: 'Préstamo creado exitosamente',
			prestamo: result.rows[0]
		}, { status: 201 });

	} catch (error: any) {
		if (error.status === 401) return error;
		console.error('Error al crear préstamo:', error);
		return json({ error: 'Error al crear préstamo' }, { status: 500 });
	}
};

// PUT - Actualizar un préstamo existente
export const PUT: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const data = await event.request.json();

		const {
			id_prestamo,
			tipo_prestamo,
			institucion,
			monto_original,
			tasa_interes,
			plazo_meses,
			pago_mensual,
			dia_pago,
			fecha_inicio,
			descripcion,
			activo
		} = data;

		if (!id_prestamo) {
			return json({ error: 'ID de préstamo requerido' }, { status: 400 });
		}

		// Verificar propiedad
		const checkOwnership = await query(
			'SELECT id_prestamo FROM prestamos WHERE id_prestamo = $1 AND id_usuario = $2',
			[id_prestamo, userId]
		);

		if (checkOwnership.rows.length === 0) {
			return json({ error: 'Préstamo no encontrado' }, { status: 404 });
		}

		const result = await query(
			`UPDATE prestamos
			SET tipo_prestamo = $1,
				institucion = $2,
				monto_original = $3,
				tasa_interes = $4,
				plazo_meses = $5,
				pago_mensual = $6,
				dia_pago = $7,
				fecha_inicio = $8,
				descripcion = $9,
				activo = $10
			WHERE id_prestamo = $11 AND id_usuario = $12
			RETURNING *`,
			[
				tipo_prestamo,
				institucion,
				monto_original,
				tasa_interes || null,
				plazo_meses,
				pago_mensual,
				dia_pago,
				fecha_inicio,
				descripcion || null,
				activo !== undefined ? activo : true,
				id_prestamo,
				userId
			]
		);

		return json({
			message: 'Préstamo actualizado exitosamente',
			prestamo: result.rows[0]
		});

	} catch (error: any) {
		if (error.status === 401) return error;
		console.error('Error al actualizar préstamo:', error);
		return json({ error: 'Error al actualizar préstamo' }, { status: 500 });
	}
};

// DELETE - Eliminar un préstamo y su historial
export const DELETE: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const url = new URL(event.request.url);
		const id_prestamo = url.searchParams.get('id_prestamo');

		if (!id_prestamo) {
			return json({ error: 'ID de préstamo requerido' }, { status: 400 });
		}

		// Verificar propiedad
		const checkOwnership = await query(
			'SELECT id_prestamo FROM prestamos WHERE id_prestamo = $1 AND id_usuario = $2',
			[id_prestamo, userId]
		);

		if (checkOwnership.rows.length === 0) {
			return json({ error: 'Préstamo no encontrado' }, { status: 404 });
		}

		// 1. Eliminar historial de pagos de este préstamo primero (para evitar errores de Foreign Key)
		await query(
			'DELETE FROM pagos_prestamos WHERE id_prestamo = $1',
			[id_prestamo]
		);

		// 2. Eliminar el préstamo
		await query(
			'DELETE FROM prestamos WHERE id_prestamo = $1 AND id_usuario = $2',
			[id_prestamo, userId]
		);

		return json({ message: 'Préstamo eliminado exitosamente' });

	} catch (error: any) {
		if (error.status === 401) return error;
		console.error('Error al eliminar préstamo:', error);
		return json({ error: 'Error al eliminar préstamo' }, { status: 500 });
	}
};