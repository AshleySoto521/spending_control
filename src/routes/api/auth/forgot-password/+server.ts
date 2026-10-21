import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { generateResetToken, getTokenExpiration } from '$lib/server/auth';
import { sendResetPasswordEmail } from '$lib/server/email';
import { huellaToken, registrarLog } from '$lib/server/security';
import { contarEventosPorEmail } from '$lib/server/rateLimit';
import { env } from '$env/dynamic/private';

/** Máximo de solicitudes de recuperación por cuenta y hora. */
const MAX_SOLICITUDES = 3;
const VENTANA_MINUTOS = 60;

// Respuesta idéntica exista o no la cuenta, para no revelar qué correos
// están registrados.
const RESPUESTA_GENERICA = {
	success: true,
	message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
};

/**
 * Duración mínima de toda respuesta.
 *
 * El cuerpo ya era idéntico exista o no la cuenta, pero el tiempo no: si existía,
 * la respuesta esperaba al UPDATE, al log y al envío SMTP (uno o dos segundos);
 * si no, salía al instante. Midiendo el tiempo se sabía qué correos estaban
 * registrados. Ahora el correo sale en segundo plano y todas las respuestas
 * tardan al menos esto, que cubre de sobra las consultas a la base.
 */
const DURACION_MINIMA_MS = 800;

function esperarHasta(instante: number): Promise<void> {
	const restante = instante - Date.now();
	return restante > 0 ? new Promise((r) => setTimeout(r, restante)) : Promise.resolve();
}

/**
 * Deja una tarea corriendo después de responder.
 *
 * En Vercel la función se congela al enviar la respuesta salvo que la tarea se
 * registre con `waitUntil`. Es lo mismo que hace `waitUntil` de
 * `@vercel/functions`, leído directamente para no añadir una dependencia. Fuera
 * de Vercel (adapter-node, desarrollo) el proceso sigue vivo y la promesa
 * termina sola.
 */
function enSegundoPlano(tarea: Promise<unknown>): void {
	const contexto = (
		globalThis as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } }>
	)[Symbol.for('@vercel/request-context')]?.get?.();
	contexto?.waitUntil?.(tarea);
}

export const POST: RequestHandler = async (event) => {
	const fin = Date.now() + DURACION_MINIMA_MS;
	const responder = async (cuerpo: unknown, init?: ResponseInit) => {
		await esperarHasta(fin);
		return json(cuerpo, init);
	};

	try {
		const body = await event.request.json();
		const email = typeof body.email === 'string' ? body.email.trim() : '';

		if (!email) {
			return json({ error: 'Email es requerido' }, { status: 400 });
		}

		// Límite por cuenta: evita usar este endpoint para inundar de correos a
		// una víctima y agotar la cuota del proveedor SMTP.
		const solicitudes = await contarEventosPorEmail(
			'recuperacion_solicitada',
			email,
			VENTANA_MINUTOS
		);

		if (solicitudes >= MAX_SOLICITUDES) {
			// Se responde igual que en el caso normal para no filtrar información.
			return responder(RESPUESTA_GENERICA);
		}

		// Buscar usuario
		const result = await query('SELECT id_usuario, nombre FROM usuarios WHERE email = $1', [email]);

		if (result.rows.length === 0) {
			return responder(RESPUESTA_GENERICA);
		}

		const user = result.rows[0];

		// Generar token de recuperación
		const resetToken = generateResetToken();
		const expiration = getTokenExpiration();

		// Guardar en la base la HUELLA del token, nunca el token.
		//
		// El token es una credencial completa: quien lo tenga cambia la
		// contraseña sin pasar por el correo de la víctima. Guardado en claro,
		// cualquier lectura de la tabla `usuarios` (un respaldo filtrado, un
		// acceso de solo lectura) entregaba todas las recuperaciones
		// pendientes. Los tokens de sesión ya se guardaban hasheados; esto
		// cierra la incoherencia.
		await query(
			'UPDATE usuarios SET token_recuperacion = $1, token_expiracion = $2 WHERE id_usuario = $3',
			[huellaToken(resetToken), expiration, user.id_usuario]
		);

		await registrarLog('recuperacion_solicitada', event, {
			idUsuario: user.id_usuario,
			email,
			detalles: 'Solicitud de restablecimiento de contraseña'
		});

		// Generar link de recuperación
		const appUrl =
			String(env.APP_URL ?? '')
				.split('#')[0]
				.trim() || 'http://localhost:5173';
		const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

		// Enviar email de recuperación.
		// El token NUNCA se escribe en consola: en producción los logs de la
		// función persisten y quien los lea podría tomar la cuenta.
		// Se envía sin esperar: ver DURACION_MINIMA_MS.
		const envio = sendResetPasswordEmail(email, user.nombre, resetLink)
			.then((emailResult) => {
				if (!emailResult.success) {
					console.warn('El email de recuperación no pudo ser enviado.');
				}
			})
			.catch((error) => {
				console.error('Error al enviar el email de recuperación:', error);
			});
		enSegundoPlano(envio);

		return responder(RESPUESTA_GENERICA);
	} catch (error) {
		console.error('Error en recuperación de contraseña:', error);
		return responder({ error: 'Error al procesar solicitud' }, { status: 500 });
	}
};
