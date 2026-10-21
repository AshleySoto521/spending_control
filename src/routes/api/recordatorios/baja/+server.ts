import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { darDeBajaRecordatorios, tokenDeBajaValido } from '$lib/server/recordatorios';
import { esUuid } from '$lib/server/validacion';
import { registrarLog } from '$lib/server/security';

/**
 * Baja de los recordatorios desde el enlace del correo.
 *
 * No exige iniciar sesión: quien recibe el correo debe poder dejar de recibirlo
 * sin recordar su contraseña. La autorización la da el token HMAC del enlace,
 * que solo permite esta acción concreta sobre esa cuenta.
 *
 * Es POST, y la página pide confirmación antes de llamarlo, porque los
 * escáneres de seguridad y los prefetch de los clientes de correo visitan los
 * enlaces por su cuenta: con una baja por GET, media lista acabaría dada de
 * baja sin haberlo pedido.
 */
export const POST: RequestHandler = async (event) => {
	try {
		const body = await event.request.json();
		const idUsuario = typeof body.u === 'string' ? body.u : '';
		const token = body.t;

		// Respuesta idéntica en todos los casos de fallo: este endpoint es
		// público, y distinguir «usuario inexistente» de «token inválido»
		// permitiría comprobar qué identificadores existen.
		const generico = json({ error: 'Enlace inválido o caducado' }, { status: 400 });

		if (!esUuid(idUsuario) || !tokenDeBajaValido(idUsuario, token)) {
			return generico;
		}

		const dadoDeBaja = await darDeBajaRecordatorios(idUsuario);

		if (!dadoDeBaja) return generico;

		await registrarLog('recordatorio_baja', event, {
			idUsuario,
			detalles: 'Baja de recordatorios desde el enlace del correo'
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error al procesar la baja de recordatorios:', error);
		return json({ error: 'Error al procesar la solicitud' }, { status: 500 });
	}
};
