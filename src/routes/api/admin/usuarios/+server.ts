import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAdmin } from '$lib/server/middleware';

// GET - Listar todos los usuarios (solo admin)
export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);

		const result = await query(
			`SELECT
				id_usuario,
				nombre,
				email,
				celular,
				fecha_registro,
				activo,
				es_admin,
				(SELECT COUNT(*) FROM tarjetas WHERE id_usuario = usuarios.id_usuario) as total_tarjetas,
				(SELECT COUNT(*) FROM ingresos WHERE id_usuario = usuarios.id_usuario) as total_ingresos,
				(SELECT COUNT(*) FROM egresos WHERE id_usuario = usuarios.id_usuario) as total_egresos
			FROM usuarios
			ORDER BY fecha_registro DESC`
		);

		return json({ usuarios: result.rows });
	} catch (error: any) {
		if (error.status === 401 || error.status === 403) {
			return error;
		}
		console.error('Error al listar usuarios:', error);
		return json({ error: 'Error al listar usuarios' }, { status: 500 });
	}
};
