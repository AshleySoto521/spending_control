import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import {
	usuariosInactivos,
	registrarRecordatorioEnviado,
	tokenDeBaja,
	DIAS_INACTIVIDAD,
	MAXIMO_POR_EJECUCION
} from '$lib/server/recordatorios';
import { sendRecordatorioEmail, sendPrimerosPasosEmail } from '$lib/server/email';
import { limpiarLogsSeguridad } from '$lib/server/mantenimiento';
import { registrarLog } from '$lib/server/security';

function limpiar(valor: string | undefined): string | undefined {
	if (valor === undefined || valor === null) return undefined;
	const limpio = String(valor).split('#')[0].trim();
	return limpio === '' ? undefined : limpio;
}

/**
 * Comparación en tiempo constante del secreto de la tarea programada.
 *
 * Este endpoint dispara correos a personas reales: sin protección, cualquiera
 * podría llamarlo en bucle y convertir la aplicación en una máquina de acosar
 * a sus propios usuarios, además de agotar la cuota del proveedor SMTP.
 */
function secretoValido(recibido: string | null, esperado: string): boolean {
	if (!recibido) return false;

	const a = Buffer.from(recibido, 'utf8');
	const b = Buffer.from(esperado, 'utf8');

	if (a.length !== b.length) return false;

	return timingSafeEqual(a, b);
}

/**
 * Tarea programada de recordatorios.
 *
 * La invoca Vercel Cron una vez al día (ver `vercel.json`), que envía el
 * encabezado `Authorization: Bearer $CRON_SECRET`. También se puede lanzar a
 * mano con curl usando el mismo secreto.
 *
 * Es GET porque es lo que envía Vercel Cron. No modifica nada que dependa de la
 * petición: quién recibe correo lo decide el estado de la base.
 */
export const GET: RequestHandler = async (event) => {
	const secreto = limpiar(env.CRON_SECRET);

	// Falla en cerrado: sin secreto configurado, el endpoint no funciona. Lo
	// contrario dejaría abierto el disparador de correos en cuanto alguien
	// olvidara la variable de entorno.
	if (!secreto) {
		console.error('[cron] CRON_SECRET no está configurado; no se envían recordatorios.');
		return json({ error: 'Tarea no configurada' }, { status: 503 });
	}

	const cabecera = event.request.headers.get('authorization');
	const recibido = cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : null;

	if (!secretoValido(recibido, secreto)) {
		// Respuesta genérica: no se confirma si el endpoint existe ni por qué falló.
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	const appUrl = limpiar(env.APP_URL) ?? 'http://localhost:5173';

	try {
		// Mantenimiento antes que los correos, y a propósito.
		//
		// Es una única sentencia sobre columnas indexadas, así que no compite por
		// el presupuesto de tiempo. Si fuera al final, una tanda larga de envíos
		// agotaría el presupuesto y la limpieza no llegaría a ejecutarse nunca.
		//
		// Va aquí y no en su propia tarea programada porque el plan Hobby de
		// Vercel solo admite dos, y conviene dejar la otra libre.
		const limpieza = await limpiarLogsSeguridad();

		if (limpieza.eliminados > 0) {
			console.log(
				`[cron] Retención de logs: ${limpieza.eliminados} eventos eliminados, ${limpieza.restantes} restantes.`
			);
		}

		const candidatos = await usuariosInactivos(DIAS_INACTIVIDAD, MAXIMO_POR_EJECUCION);

		let enviados = 0;
		let fallidos = 0;
		let pendientes = 0;
		let enfriados = 0;
		let nuncaArrancaron = 0;

		// Presupuesto de tiempo.
		//
		// Cada envío por SMTP abre su propia conexión con Gmail y tarda entre uno
		// y dos segundos. Con la lista llena eso supera el tiempo máximo de una
		// función serverless y Vercel la corta a media ejecución. Parar por las
		// buenas antes de llegar ahí deja el trabajo restante para el día
		// siguiente —solo se marca a quien sí recibió el correo— en lugar de
		// morir sin registrar nada.
		const inicio = Date.now();
		const PRESUPUESTO_MS = 25_000;

		// En serie, no en paralelo: son pocos destinatarios y los proveedores SMTP
		// penalizan las ráfagas de conexiones simultáneas.
		for (const usuario of candidatos) {
			if (Date.now() - inicio > PRESUPUESTO_MS) {
				pendientes = candidatos.length - enviados - fallidos;
				console.warn(
					`[cron] Presupuesto de tiempo agotado; ${pendientes} recordatorios quedan para la próxima ejecución.`
				);
				break;
			}

			const bajaUrl =
				`${appUrl}/baja-recordatorios` +
				`?u=${encodeURIComponent(usuario.idUsuario)}` +
				`&t=${encodeURIComponent(tokenDeBaja(usuario.idUsuario))}`;

			// Dos públicos, dos mensajes. A quien nunca registró nada no se le
			// puede decir «hace 80 días que no registras tus gastos»: se le
			// explica por dónde empezar.
			const resultado =
				usuario.segmento === 'enfriado'
					? await sendRecordatorioEmail(
							usuario.email,
							usuario.nombre,
							usuario.diasInactivo,
							appUrl,
							bajaUrl
						)
					: await sendPrimerosPasosEmail(usuario.email, usuario.nombre, appUrl, bajaUrl);

			if (usuario.segmento === 'enfriado') enfriados += 1;
			else nuncaArrancaron += 1;

			if (resultado.success) {
				// Solo se marca tras un envío correcto: si se marcara siempre, un
				// fallo del proveedor haría perder el aviso hasta el siguiente ciclo.
				await registrarRecordatorioEnviado(usuario.idUsuario);
				enviados += 1;
			} else {
				fallidos += 1;
			}
		}

		await registrarLog('recordatorio_enviado', event, {
			detalles:
				`Recordatorios de inactividad: ${enviados} enviados, ${fallidos} fallidos, ` +
				`${pendientes} aplazados, ${candidatos.length} candidatos ` +
				`(${enfriados} enfriados, ${nuncaArrancaron} sin arrancar)`
		});

		return json({
			success: true,
			candidatos: candidatos.length,
			enviados,
			fallidos,
			pendientes,
			porSegmento: { enfriados, nuncaArrancaron },
			diasInactividad: DIAS_INACTIVIDAD,
			mantenimiento: limpieza
		});
	} catch (error) {
		console.error('[cron] Error al enviar recordatorios:', error);
		return json({ error: 'Error al procesar los recordatorios' }, { status: 500 });
	}
};
