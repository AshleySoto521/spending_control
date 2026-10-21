import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth, esRespuestaDeAuth } from '$lib/server/middleware';

// GET - Catálogo de formas de pago (requiere sesión)
export const GET: RequestHandler = async (event) => {
	try {
		await requireAuth(event);

		const result = await query(
			'SELECT id_forma_pago, tipo, descripcion FROM formas_pago ORDER BY id_forma_pago'
		);

		return json({ formas_pago: result.rows });
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
			return error;
		}
		console.error('Error al obtener formas de pago:', error);
		return json({ error: 'Error al obtener formas de pago' }, { status: 500 });
	}
};
