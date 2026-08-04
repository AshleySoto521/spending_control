import type { RequestEvent } from '@sveltejs/kit';
import { verifyToken } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import { cookieConfig } from '$lib/server/cookies';
import { validarSesion, renovarSesion, registrarLog } from '$lib/server/security';
import { getCookieOptions } from '$lib/server/cookies';
import { query } from '$lib/server/db';

/**
 * Empuja la caducidad de la sesión y refresca la cookie.
 *
 * Se llama solo cuando a la sesión le queda poco, así que supone una escritura
 * por hora de uso continuo, no una por petición. Sin esto, quien abre la
 * aplicación dos veces por semana tendría que escribir su contraseña cada vez.
 */
export async function refrescarSesion(event: RequestEvent, token: string): Promise<void> {
	await renovarSesion(token);
	event.cookies.set(cookieConfig.name, token, getCookieOptions());
}

/**
 * Obtiene el token de sesión de la petición.
 *
 * Solo se acepta la cookie httpOnly. Antes también se admitía
 * `Authorization: Bearer <token>`, lo que obligaba al cliente a guardar el JWT
 * en localStorage y dejaba la cookie httpOnly como adorno: cualquier XSS podía
 * leer el token y reutilizarlo. Con la cookie basta, y el navegador la envía
 * automáticamente en cada petición del mismo origen.
 */
function obtenerToken(event: RequestEvent): string | undefined {
	return event.cookies.get(cookieConfig.name);
}

export async function requireAuth(event: RequestEvent) {
	const token = obtenerToken(event);

	if (!token) {
		throw json({ error: 'No autorizado' }, { status: 401 });
	}

	// Verificar token JWT
	const payload = verifyToken(token);

	if (!payload) {
		event.cookies.delete(cookieConfig.name, { path: cookieConfig.path });
		throw json({ error: 'Token inválido o expirado' }, { status: 401 });
	}

	// Validar sesión en la base de datos
	const sesionValida = await validarSesion(token);

	// El JWT y la fila de `sesiones` deben apuntar al mismo usuario. Coinciden
	// siempre en el flujo normal, porque ambos se crean juntos al iniciar
	// sesión; comprobarlo evita que una futura reutilización de tokens o un
	// error de datos deje pasar una identidad distinta a la firmada.
	if (sesionValida.valida && sesionValida.idUsuario !== payload.userId) {
		await registrarLog('sesion_invalidada', event, {
			idUsuario: payload.userId,
			detalles: 'El usuario del token no coincide con el de la sesión'
		});

		event.cookies.delete(cookieConfig.name, { path: cookieConfig.path });

		throw json({ error: 'Sesión inválida' }, { status: 401 });
	}

	if (!sesionValida.valida) {
		// Registrar sesión expirada o inválida
		await registrarLog('sesion_expirada', event, {
			idUsuario: payload.userId,
			detalles: sesionValida.motivo || 'Sesión inválida'
		});

		// Eliminar cookie
		event.cookies.delete(cookieConfig.name, { path: cookieConfig.path });

		throw json(
			{ error: 'Sesión expirada o inválida', motivo: sesionValida.motivo },
			{ status: 401 }
		);
	}

	if (sesionValida.necesitaRenovacion) {
		await refrescarSesion(event, token);
	}

	return payload.userId;
}

export async function requireAdmin(event: RequestEvent) {
	const userId = await requireAuth(event);

	// Verificar si el usuario es administrador
	const result = await query('SELECT es_admin FROM usuarios WHERE id_usuario = $1', [userId]);

	if (result.rows.length === 0 || !result.rows[0].es_admin) {
		throw json({ error: 'Acceso denegado. Solo administradores' }, { status: 403 });
	}

	return userId;
}
