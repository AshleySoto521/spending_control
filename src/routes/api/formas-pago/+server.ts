import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';

// GET - Obtener todas las formas de pago (catálogo público)
export const GET: RequestHandler = async () => {
	try {
		const result = await query('SELECT * FROM formas_pago ORDER BY id_forma_pago');

		return json({ formas_pago: result.rows });
	} catch (error) {
		console.error('Error al obtener formas de pago:', error);
		return json({ error: 'Error al obtener formas de pago' }, { status: 500 });
	}
};
