import { query } from './db';
import type { RequestEvent } from '@sveltejs/kit';

// Tipos de eventos de seguridad
export type TipoEvento =
	| 'login_exitoso'
	| 'login_fallido'
	| 'logout'
	| 'sesion_expirada'
	| 'error'
	| 'sesion_invalidada';

// Registrar evento de seguridad en los logs
export async function registrarLog(
	tipo: TipoEvento,
	event: RequestEvent,
	data: {
		idUsuario?: string;
		email?: string;
		detalles?: string;
	}
): Promise<void> {
	try {
		const ipAddress = event.getClientAddress();
		const userAgent = event.request.headers.get('user-agent') || '';

		await query(
			`INSERT INTO logs_seguridad (id_usuario, tipo_evento, email, ip_address, user_agent, detalles)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			[
				data.idUsuario || null,
				tipo,
				data.email || null,
				ipAddress,
				userAgent,
				data.detalles || null
			]
		);
	} catch (error) {
		console.error('Error al registrar log de seguridad:', error);
		// No lanzar error para no interrumpir el flujo principal
	}
}

// Crear nueva sesión (4 horas de expiración)
export async function crearSesion(
	idUsuario: string,
	token: string,
	event: RequestEvent
): Promise<string> {
	const ipAddress = event.getClientAddress();
	const userAgent = event.request.headers.get('user-agent') || '';

	// Calcular fecha de expiración (4 horas)
	const fechaExpiracion = new Date();
	fechaExpiracion.setHours(fechaExpiracion.getHours() + 4);

	// Invalidar todas las sesiones anteriores del usuario (una sola sesión activa)
	await query(
		`UPDATE sesiones SET activa = FALSE WHERE id_usuario = $1 AND activa = TRUE`,
		[idUsuario]
	);

	// Crear nueva sesión
	const result = await query(
		`INSERT INTO sesiones (id_usuario, token, ip_address, user_agent, fecha_expiracion)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id_sesion`,
		[idUsuario, token, ipAddress, userAgent, fechaExpiracion]
	);

	return result.rows[0].id_sesion;
}

// Validar si una sesión es válida
export async function validarSesion(token: string): Promise<{
	valida: boolean;
	idUsuario?: string;
	motivo?: string;
}> {
	try {
		const result = await query(
			`SELECT id_usuario, fecha_expiracion, activa
			FROM sesiones
			WHERE token = $1`,
			[token]
		);

		if (result.rows.length === 0) {
			return { valida: false, motivo: 'Sesión no encontrada' };
		}

		const sesion = result.rows[0];

		if (!sesion.activa) {
			return { valida: false, motivo: 'Sesión inactiva' };
		}

		const ahora = new Date();
		const expiracion = new Date(sesion.fecha_expiracion);

		if (ahora > expiracion) {
			// Marcar sesión como inactiva
			await query(
				`UPDATE sesiones SET activa = FALSE WHERE token = $1`,
				[token]
			);
			return { valida: false, motivo: 'Sesión expirada' };
		}

		return { valida: true, idUsuario: sesion.id_usuario };
	} catch (error) {
		console.error('Error al validar sesión:', error);
		return { valida: false, motivo: 'Error de validación' };
	}
}

// Cerrar sesión
export async function cerrarSesion(token: string): Promise<void> {
	try {
		await query(
			`UPDATE sesiones SET activa = FALSE WHERE token = $1`,
			[token]
		);
	} catch (error) {
		console.error('Error al cerrar sesión:', error);
	}
}

// Obtener información de la sesión
export async function obtenerInfoSesion(idUsuario: string): Promise<any> {
	try {
		const result = await query(
			`SELECT id_sesion, ip_address, user_agent, fecha_creacion, fecha_expiracion
			FROM sesiones
			WHERE id_usuario = $1 AND activa = TRUE
			ORDER BY fecha_creacion DESC
			LIMIT 1`,
			[idUsuario]
		);

		return result.rows[0] || null;
	} catch (error) {
		console.error('Error al obtener info de sesión:', error);
		return null;
	}
}
