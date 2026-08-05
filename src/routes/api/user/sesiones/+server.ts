import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, esRespuestaDeAuth } from '$lib/server/middleware';
import { cookieConfig } from '$lib/server/cookies';
import { listarSesiones } from '$lib/server/security';
import { describirDispositivo } from '$lib/utils/dispositivo';

/**
 * Sesiones abiertas del usuario.
 *
 * Es la contrapartida de permitir varios dispositivos a la vez: si alguien
 * puede tener cinco sesiones, tiene que poder verlas y cerrar la que no
 * reconozca. Sin esta pantalla, «sesiones múltiples» sería solo una forma
 * elegante de decir que nadie sabe quién está dentro de su cuenta.
 */
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const sesiones = await listarSesiones(userId, event.cookies.get(cookieConfig.name));

		return json({
			sesiones: sesiones.map((sesion) => ({
				id: sesion.idSesion,
				dispositivo: describirDispositivo(sesion.userAgent),
				ip: sesion.ipAddress,
				inicio: sesion.fechaCreacion,
				expira: sesion.fechaExpiracion,
				esActual: sesion.esActual
			}))
		});
	} catch (error) {
		if (esRespuestaDeAuth(error)) return error;
		console.error('Error al listar sesiones:', error);
		return json({ error: 'Error al obtener las sesiones' }, { status: 500 });
	}
};
