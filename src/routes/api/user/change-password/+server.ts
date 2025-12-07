import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';
import { hashPassword, verifyPassword } from '$lib/server/auth';

// POST - Cambiar contraseña del usuario
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { currentPassword, newPassword } = await event.request.json();

		// Validaciones
		if (!currentPassword || !newPassword) {
			return json({ error: 'Contraseña actual y nueva son requeridas' }, { status: 400 });
		}

		if (newPassword.length < 8) {
			return json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' }, { status: 400 });
		}

		// Obtener el hash de la contraseña actual del usuario
		const userResult = await query(
			'SELECT password_hash FROM usuarios WHERE id_usuario = $1',
			[userId]
		);

		if (userResult.rows.length === 0) {
			return json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		// Verificar que la contraseña actual sea correcta
		const isValidPassword = await verifyPassword(currentPassword, userResult.rows[0].password_hash);

		if (!isValidPassword) {
			return json({ error: 'La contraseña actual es incorrecta' }, { status: 401 });
		}

		// Hash de la nueva contraseña
		const newPasswordHash = await hashPassword(newPassword);

		// Actualizar la contraseña
		await query(
			'UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2',
			[newPasswordHash, userId]
		);

		return json({ success: true, message: 'Contraseña actualizada correctamente' });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al cambiar contraseña:', error);
		return json({ error: 'Error al cambiar contraseña' }, { status: 500 });
	}
};
