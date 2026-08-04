import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import { cookieConfig } from '$lib/server/cookies';
import { cerrarSesionPorId, listarSesiones, registrarLog } from '$lib/server/security';
import { esUuid } from '$lib/server/validacion';

/**
 * Cierra una sesión concreta del usuario.
 *
 * Sirve tanto para expulsar un dispositivo que ya no se usa como para cortar
 * una sesión que no se reconoce, que es el caso que de verdad importa.
 */
export const DELETE: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { id } = event.params;

		if (!esUuid(id)) {
			return json({ error: 'Identificador de sesión inválido' }, { status: 400 });
		}

		// Se averigua antes de cerrarla: después ya no aparece en el listado.
		const sesiones = await listarSesiones(userId, event.cookies.get(cookieConfig.name));
		const eraLaActual = sesiones.some((sesion) => sesion.idSesion === id && sesion.esActual);

		const cerrada = await cerrarSesionPorId(userId, id);

		if (!cerrada) {
			// Mismo mensaje tanto si la sesión no existe como si es de otra
			// persona: no se confirma la existencia de identificadores ajenos.
			return json({ error: 'Sesión no encontrada' }, { status: 404 });
		}

		await registrarLog('sesion_invalidada', event, {
			idUsuario: userId,
			detalles: eraLaActual
				? 'Sesión actual cerrada por el usuario desde su perfil'
				: 'Sesión de otro dispositivo cerrada por el usuario'
		});

		// Si cerró la sesión desde la que está trabajando, hay que retirarle
		// también la cookie; si no, seguiría navegando con un token que ya no
		// vale y recibiría un 401 en la siguiente petición.
		if (eraLaActual) {
			event.cookies.delete(cookieConfig.name, { path: cookieConfig.path });
		}

		return json({ success: true, eraLaActual });
	} catch (error: any) {
		if (error.status === 401) return error;
		console.error('Error al cerrar la sesión:', error);
		return json({ error: 'Error al cerrar la sesión' }, { status: 500 });
	}
};
