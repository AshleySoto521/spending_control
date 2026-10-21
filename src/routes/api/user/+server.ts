import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth, esRespuestaDeAuth } from '$lib/server/middleware';
import { textoLimpio } from '$lib/server/validacion';

// GET - Obtener datos del usuario actual
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);

		const result = await query(
			'SELECT id_usuario, nombre, email, celular, fecha_registro FROM usuarios WHERE id_usuario = $1',
			[userId]
		);

		if (result.rows.length === 0) {
			return json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		return json({ user: result.rows[0] });
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
			return error;
		}
		console.error('Error al obtener usuario:', error);
		return json({ error: 'Error al obtener usuario' }, { status: 500 });
	}
};

// PUT - Actualizar datos del usuario
export const PUT: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { nombre: nombreEnviado, celular } = await event.request.json();

		// `textoLimpio` en vez de `.trim()`: también colapsa los espacios
		// interiores repetidos.
		const nombre = textoLimpio(nombreEnviado, 100);

		// Validaciones
		if (!nombre) {
			return json({ error: 'El nombre es requerido' }, { status: 400 });
		}

		// Validar celular si se proporciona
		if (celular && celular.trim() !== '') {
			if (!/^\d{10}$/.test(celular)) {
				return json({ error: 'El celular debe contener exactamente 10 dígitos' }, { status: 400 });
			}
		}

		const result = await query(
			`UPDATE usuarios
			SET nombre = $1, celular = $2
			WHERE id_usuario = $3
			RETURNING id_usuario, nombre, email, celular, fecha_registro`,
			[nombre, celular && celular.trim() !== '' ? celular : null, userId]
		);

		return json({ success: true, user: result.rows[0] });
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
			return error;
		}
		console.error('Error al actualizar usuario:', error);
		return json({ error: 'Error al actualizar usuario' }, { status: 500 });
	}
};
