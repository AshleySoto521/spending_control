import type { RequestEvent } from '@sveltejs/kit';
import { verifyToken } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import { cookieConfig } from '$lib/server/cookies';
import { validarSesion, registrarLog } from '$lib/server/security';
import { query } from '$lib/server/db';

export async function requireAuth(event: RequestEvent) {
	const token = event.cookies.get(cookieConfig.name) || event.request.headers.get('authorization')?.replace('Bearer ', '');

	if (!token) {
		throw json({ error: 'No autorizado' }, { status: 401 });
	}

	// Verificar token JWT
	const payload = verifyToken(token);

	if (!payload) {
		throw json({ error: 'Token inválido o expirado' }, { status: 401 });
	}

	// Validar sesión en la base de datos
	const sesionValida = await validarSesion(token);

	if (!sesionValida.valida) {
		// Registrar sesión expirada o inválida
		await registrarLog('sesion_expirada', event, {
			idUsuario: payload.userId,
			detalles: sesionValida.motivo || 'Sesión inválida'
		});

		// Eliminar cookie
		event.cookies.delete(cookieConfig.name, { path: cookieConfig.path });

		throw json({ error: 'Sesión expirada o inválida', motivo: sesionValida.motivo }, { status: 401 });
	}

	return payload.userId;
}

export async function requireAdmin(event: RequestEvent) {
	const userId = await requireAuth(event);

	// Verificar si el usuario es administrador
	const result = await query(
		'SELECT es_admin FROM usuarios WHERE id_usuario = $1',
		[userId]
	);

	if (result.rows.length === 0 || !result.rows[0].es_admin) {
		throw json({ error: 'Acceso denegado. Solo administradores' }, { status: 403 });
	}

	return userId;
}
