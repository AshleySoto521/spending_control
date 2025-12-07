import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAdmin } from '$lib/server/middleware';

// GET - Listar logs de seguridad (solo admin)
export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);

		const url = new URL(event.request.url);
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		const tipoEvento = url.searchParams.get('tipo_evento') || '';
		const fechaInicio = url.searchParams.get('fecha_inicio') || '';
		const fechaFin = url.searchParams.get('fecha_fin') || '';

		let queryString = `
			SELECT
				l.id_log,
				l.id_usuario,
				l.tipo_evento,
				l.email,
				l.ip_address,
				l.user_agent,
				l.detalles,
				l.fecha_evento,
				u.nombre as nombre_usuario
			FROM logs_seguridad l
			LEFT JOIN usuarios u ON l.id_usuario = u.id_usuario
			WHERE 1=1
		`;

		const params: any[] = [];
		let paramCount = 1;

		if (tipoEvento) {
			queryString += ` AND l.tipo_evento = $${paramCount}`;
			params.push(tipoEvento);
			paramCount++;
		}

		if (fechaInicio) {
			queryString += ` AND l.fecha_evento >= $${paramCount}`;
			params.push(fechaInicio);
			paramCount++;
		}

		if (fechaFin) {
			queryString += ` AND l.fecha_evento <= $${paramCount}`;
			params.push(fechaFin + ' 23:59:59');
			paramCount++;
		}

		queryString += ` ORDER BY l.fecha_evento DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
		params.push(limit, offset);

		const result = await query(queryString, params);

		// Obtener total de registros
		let countQuery = `
			SELECT COUNT(*) as total
			FROM logs_seguridad l
			WHERE 1=1
		`;

		const countParams: any[] = [];
		let countParamIndex = 1;

		if (tipoEvento) {
			countQuery += ` AND l.tipo_evento = $${countParamIndex}`;
			countParams.push(tipoEvento);
			countParamIndex++;
		}

		if (fechaInicio) {
			countQuery += ` AND l.fecha_evento >= $${countParamIndex}`;
			countParams.push(fechaInicio);
			countParamIndex++;
		}

		if (fechaFin) {
			countQuery += ` AND l.fecha_evento <= $${countParamIndex}`;
			countParams.push(fechaFin + ' 23:59:59');
			countParamIndex++;
		}

		const countResult = await query(countQuery, countParams);

		return json({
			logs: result.rows,
			total: parseInt(countResult.rows[0].total),
			limit,
			offset
		});
	} catch (error: any) {
		if (error.status === 401 || error.status === 403) {
			return error;
		}
		console.error('Error al listar logs:', error);
		return json({ error: 'Error al listar logs' }, { status: 500 });
	}
};
