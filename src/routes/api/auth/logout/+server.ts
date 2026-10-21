import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cookieConfig } from '$lib/server/cookies';
import { registrarLog, cerrarSesion } from '$lib/server/security';
import { verifyToken } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
	const { cookies } = event;
	const token = cookies.get(cookieConfig.name);

	if (token) {
		// Verificar token para obtener el userId
		const payload = verifyToken(token);

		if (payload) {
			// Registrar logout
			await registrarLog('logout', event, {
				idUsuario: payload.userId
			});
		}

		// Cerrar sesión en la base de datos
		await cerrarSesion(token);
	}

	// Eliminar cookie de autenticación
	cookies.delete(cookieConfig.name, { path: cookieConfig.path });

	return json({ success: true, message: 'Sesión cerrada correctamente' });
};
