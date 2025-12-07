import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { token, newPassword } = await request.json();

		if (!token || !newPassword) {
			return json({ error: 'Token y nueva contraseña son requeridos' }, { status: 400 });
		}

		if (newPassword.length < 8) {
			return json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
		}

		// Verificar token y que no haya expirado
		const result = await query(
			'SELECT id_usuario FROM usuarios WHERE token_recuperacion = $1 AND token_expiracion > NOW()',
			[token]
		);

		if (result.rows.length === 0) {
			return json({ error: 'Token inválido o expirado' }, { status: 400 });
		}

		const user = result.rows[0];

		// Hash de la nueva contraseña
		const passwordHash = await hashPassword(newPassword);

		// Actualizar contraseña y limpiar token
		await query(
			'UPDATE usuarios SET password_hash = $1, token_recuperacion = NULL, token_expiracion = NULL WHERE id_usuario = $2',
			[passwordHash, user.id_usuario]
		);

		return json({
			success: true,
			message: 'Contraseña actualizada correctamente'
		});
	} catch (error) {
		console.error('Error al resetear contraseña:', error);
		return json({ error: 'Error al resetear contraseña' }, { status: 500 });
	}
};
