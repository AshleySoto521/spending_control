import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verificarEmail } from '$lib/server/verificacion';
import { registrarLog } from '$lib/server/security';

/**
 * Confirma una dirección de correo desde el enlace del mensaje.
 *
 * No exige sesión: el enlace puede abrirse en otro dispositivo o navegador,
 * como ocurre casi siempre al pulsar desde el móvil. La autorización la da el
 * token, que caduca a las 48 horas y es de un solo uso.
 */
export const POST: RequestHandler = async (event) => {
	try {
		const body = await event.request.json();
		const token = typeof body.token === 'string' ? body.token.trim() : '';

		if (!token) {
			return json({ error: 'Enlace inválido o caducado' }, { status: 400 });
		}

		const verificado = await verificarEmail(token);

		if (!verificado) {
			// Misma respuesta si no existe, si caducó o si ya se usó: distinguirlos
			// permitiría sondear qué tokens son válidos.
			return json({ error: 'Enlace inválido o caducado' }, { status: 400 });
		}

		await registrarLog('email_verificado', event, {
			detalles: 'Dirección de correo confirmada desde el enlace'
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error al verificar el correo:', error);
		return json({ error: 'Error al procesar la solicitud' }, { status: 500 });
	}
};
