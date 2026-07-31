import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';
import { validarPassword } from '$lib/server/passwordPolicy';
import { cerrarTodasLasSesiones, huellaToken, registrarLog } from '$lib/server/security';

export const POST: RequestHandler = async (event) => {
	try {
		const body = await event.request.json();
		const token = typeof body.token === 'string' ? body.token.trim() : '';
		const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

		if (!token || !newPassword) {
			return json({ error: 'Token y nueva contraseña son requeridos' }, { status: 400 });
		}

		// Verificar token y que no haya expirado.
		// La base guarda la huella SHA-256, así que se busca por la huella del
		// token recibido. Nota: no se registra el token en consola; es una
		// credencial completa.
		const result = await query(
			`SELECT id_usuario, nombre, email
			 FROM usuarios
			 WHERE token_recuperacion = $1 AND token_expiracion > NOW()`,
			[huellaToken(token)]
		);

		if (result.rows.length === 0) {
			return json({ error: 'Token inválido o expirado' }, { status: 400 });
		}

		const user = result.rows[0];

		const validacion = validarPassword(newPassword, { email: user.email, nombre: user.nombre });

		if (!validacion.valida) {
			return json({ error: validacion.error }, { status: 400 });
		}

		// Hash de la nueva contraseña
		const passwordHash = await hashPassword(newPassword);

		// Actualizar contraseña y limpiar token (de un solo uso)
		await query(
			'UPDATE usuarios SET password_hash = $1, token_recuperacion = NULL, token_expiracion = NULL WHERE id_usuario = $2',
			[passwordHash, user.id_usuario]
		);

		// Cerrar todas las sesiones activas: si alguien había robado la sesión,
		// restablecer la contraseña debe expulsarlo de inmediato.
		await cerrarTodasLasSesiones(user.id_usuario);

		await registrarLog('password_restablecido', event, {
			idUsuario: user.id_usuario,
			email: user.email,
			detalles: 'Contraseña restablecida mediante token de recuperación'
		});

		return json({
			success: true,
			message: 'Contraseña actualizada correctamente'
		});
	} catch (error) {
		console.error('Error al resetear contraseña:', error);
		return json({ error: 'Error al resetear contraseña' }, { status: 500 });
	}
};
