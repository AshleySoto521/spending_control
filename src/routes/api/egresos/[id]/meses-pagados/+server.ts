import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// PATCH - Actualizar meses pagados de una compra MSI
export const PATCH: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { id } = event.params;
		const data = await event.request.json();

		const { meses_pagados } = data;

		if (meses_pagados === undefined || meses_pagados < 0) {
			return json({ error: 'Meses pagados inválido' }, { status: 400 });
		}

		// Verificar que el egreso existe, pertenece al usuario y es una compra a meses
		const existing = await query(
			`SELECT id_egreso, num_meses, compra_meses
			FROM egresos
			WHERE id_egreso = $1 AND id_usuario = $2 AND compra_meses = TRUE`,
			[id, userId]
		);

		if (existing.rows.length === 0) {
			return json({ error: 'Compra a meses no encontrada' }, { status: 404 });
		}

		const numMeses = existing.rows[0].num_meses;

		if (meses_pagados > numMeses) {
			return json(
				{ error: `Los meses pagados no pueden ser mayores a ${numMeses}` },
				{ status: 400 }
			);
		}

		// Actualizar meses pagados
		const result = await query(
			`UPDATE egresos
			SET meses_pagados = $1
			WHERE id_egreso = $2 AND id_usuario = $3
			RETURNING *`,
			[meses_pagados, id, userId]
		);

		return json({ success: true, egreso: result.rows[0] });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al actualizar meses pagados:', error);
		return json({ error: 'Error al actualizar meses pagados' }, { status: 500 });
	}
};

// POST - Incrementar meses pagados en 1
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { id } = event.params;

		// Verificar que el egreso existe, pertenece al usuario y es una compra a meses
		const existing = await query(
			`SELECT id_egreso, num_meses, meses_pagados, compra_meses
			FROM egresos
			WHERE id_egreso = $1 AND id_usuario = $2 AND compra_meses = TRUE`,
			[id, userId]
		);

		if (existing.rows.length === 0) {
			return json({ error: 'Compra a meses no encontrada' }, { status: 404 });
		}

		const { num_meses, meses_pagados } = existing.rows[0];
		const nuevosMesesPagados = (meses_pagados || 0) + 1;

		if (nuevosMesesPagados > num_meses) {
			return json(
				{ error: 'Ya se pagaron todas las cuotas' },
				{ status: 400 }
			);
		}

		// Incrementar meses pagados
		const result = await query(
			`UPDATE egresos
			SET meses_pagados = meses_pagados + 1
			WHERE id_egreso = $1 AND id_usuario = $2
			RETURNING *`,
			[id, userId]
		);

		return json({ success: true, egreso: result.rows[0] });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al incrementar meses pagados:', error);
		return json({ error: 'Error al incrementar meses pagados' }, { status: 500 });
	}
};
