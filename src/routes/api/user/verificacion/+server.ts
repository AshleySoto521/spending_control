import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { requireAuth } from '$lib/server/middleware';
import { estadoVerificacion, generarTokenVerificacion } from '$lib/server/verificacion';
import { sendVerificacionEmail } from '$lib/server/email';
import { registrarLog } from '$lib/server/security';
import { query } from '$lib/server/db';

/** Estado de verificación de la cuenta, para decidir si mostrar el aviso. */
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const estado = await estadoVerificacion(userId);

		if (!estado) {
			return json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		return json({ verificado: estado.verificado, email: estado.email });
	} catch (error: any) {
		if (error.status === 401) return error;
		console.error('Error al consultar la verificación:', error);
		return json({ error: 'Error al consultar el estado' }, { status: 500 });
	}
};

/** Reenvía el correo de confirmación. */
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const estado = await estadoVerificacion(userId);

		if (!estado) {
			return json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		// Ya verificado: se responde con éxito sin enviar nada. Reenviar en ese
		// caso solo serviría para que alguien con la sesión abierta generase
		// correos a voluntad.
		if (estado.verificado) {
			return json({ success: true, yaVerificado: true });
		}

		const nombre = (
			await query('SELECT nombre FROM usuarios WHERE id_usuario = $1', [userId])
		).rows[0]?.nombre;

		const token = await generarTokenVerificacion(userId);
		const appUrl = String(env.APP_URL ?? '').split('#')[0].trim() || 'http://localhost:5173';

		const resultado = await sendVerificacionEmail(
			estado.email,
			nombre ?? '',
			`${appUrl}/verificar-email?t=${encodeURIComponent(token)}`
		);

		if (!resultado.success) {
			return json({ error: 'No pudimos enviar el correo. Inténtalo más tarde.' }, { status: 502 });
		}

		await registrarLog('verificacion_reenviada', event, {
			idUsuario: userId,
			detalles: 'Reenvío del correo de verificación'
		});

		return json({ success: true });
	} catch (error: any) {
		if (error.status === 401) return error;
		console.error('Error al reenviar la verificación:', error);
		return json({ error: 'Error al reenviar el correo' }, { status: 500 });
	}
};
