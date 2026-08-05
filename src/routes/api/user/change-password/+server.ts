import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth, esRespuestaDeAuth } from '$lib/server/middleware';
import { hashPassword, verifyPassword, generateToken } from '$lib/server/auth';
import { validarPassword } from '$lib/server/passwordPolicy';
import { cerrarTodasLasSesiones, crearSesion, registrarLog } from '$lib/server/security';
import { cookieConfig, getCookieOptions } from '$lib/server/cookies';

// POST - Cambiar contraseña del usuario
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const body = await event.request.json();

		const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
		const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

		// Validaciones
		if (!currentPassword || !newPassword) {
			return json({ error: 'Contraseña actual y nueva son requeridas' }, { status: 400 });
		}

		// Obtener el hash de la contraseña actual del usuario
		const userResult = await query(
			'SELECT password_hash, nombre, email FROM usuarios WHERE id_usuario = $1',
			[userId]
		);

		if (userResult.rows.length === 0) {
			return json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		const usuario = userResult.rows[0];

		const validacion = validarPassword(newPassword, {
			email: usuario.email,
			nombre: usuario.nombre
		});

		if (!validacion.valida) {
			return json({ error: validacion.error }, { status: 400 });
		}

		// Verificar que la contraseña actual sea correcta
		const isValidPassword = await verifyPassword(currentPassword, usuario.password_hash);

		if (!isValidPassword) {
			// Tipo de evento propio: registrarlo como 'login_fallido' hacía que
			// equivocarse cinco veces aquí bloqueara el inicio de sesión de la
			// propia cuenta durante 15 minutos.
			await registrarLog('password_actual_incorrecta', event, {
				idUsuario: userId,
				email: usuario.email,
				detalles: 'Contraseña actual incorrecta al intentar cambiarla'
			});
			return json({ error: 'La contraseña actual es incorrecta' }, { status: 401 });
		}

		if (newPassword === currentPassword) {
			return json({ error: 'La nueva contraseña debe ser distinta a la actual' }, { status: 400 });
		}

		// Hash de la nueva contraseña
		const newPasswordHash = await hashPassword(newPassword);

		// Actualizar la contraseña
		await query('UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2', [
			newPasswordHash,
			userId
		]);

		// Cerrar todas las sesiones y emitir una nueva para este dispositivo.
		// Así, si alguien más tenía la sesión robada queda fuera de inmediato,
		// pero quien acaba de cambiar la contraseña no pierde su sesión.
		await cerrarTodasLasSesiones(userId);

		const nuevoToken = generateToken(userId);
		await crearSesion(userId, nuevoToken, event);
		event.cookies.set(cookieConfig.name, nuevoToken, getCookieOptions());

		await registrarLog('password_cambiado', event, {
			idUsuario: userId,
			email: usuario.email,
			detalles: 'Contraseña cambiada desde el perfil; sesiones anteriores cerradas'
		});

		return json({ success: true, message: 'Contraseña actualizada correctamente' });
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
			return error;
		}
		console.error('Error al cambiar contraseña:', error);
		return json({ error: 'Error al cambiar contraseña' }, { status: 500 });
	}
};
