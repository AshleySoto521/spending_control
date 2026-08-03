import { createHash } from 'node:crypto';
import { query } from './db';
import type { RequestEvent } from '@sveltejs/kit';

// Tipos de eventos de seguridad
export type TipoEvento =
	| 'login_exitoso'
	| 'login_fallido'
	| 'login_bloqueado'
	| 'logout'
	| 'sesion_expirada'
	| 'sesion_invalidada'
	| 'password_cambiado'
	| 'password_restablecido'
	// Fallo al confirmar la contraseña actual desde el perfil. Es un evento
	// distinto de 'login_fallido' a propósito: si compartieran tipo, equivocarse
	// al cambiar la contraseña contaría para el bloqueo de la cuenta y dejaría
	// al propio usuario fuera de su sesión.
	| 'password_actual_incorrecta'
	| 'registro_exitoso'
	| 'recuperacion_solicitada'
	| 'recordatorio_enviado'
	| 'recordatorio_baja'
	| 'limite_excedido'
	| 'error';

/**
 * La tabla `sesiones` guarda una huella SHA-256 del token, no el token.
 *
 * El JWT es la credencial completa: si se almacenara en claro, cualquier
 * lectura de esa tabla (un respaldo filtrado, un acceso de solo lectura a la
 * base, un futuro fallo de inyección) entregaría sesiones activas listas para
 * usar. Con la huella, leer la tabla no sirve para suplantar a nadie.
 */
export function huellaToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

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
				userAgent?.slice(0, 500),
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

	// Crear nueva sesión (se guarda la huella, nunca el token en claro)
	const result = await query(
		`INSERT INTO sesiones (id_usuario, token, ip_address, user_agent, fecha_expiracion)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id_sesion`,
		[idUsuario, huellaToken(token), ipAddress, userAgent?.slice(0, 500), fechaExpiracion]
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
		const huella = huellaToken(token);

		const result = await query(
			`SELECT id_usuario, fecha_expiracion, activa
			FROM sesiones
			WHERE token = $1`,
			[huella]
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
			await query(`UPDATE sesiones SET activa = FALSE WHERE token = $1`, [huella]);
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
		await query(`UPDATE sesiones SET activa = FALSE WHERE token = $1`, [huellaToken(token)]);
	} catch (error) {
		console.error('Error al cerrar sesión:', error);
	}
}

/**
 * Cierra TODAS las sesiones activas de un usuario.
 * Se usa al cambiar o restablecer la contraseña: sin esto, quien haya robado
 * una sesión sigue dentro hasta 4 horas después de que la víctima reaccione.
 */
export async function cerrarTodasLasSesiones(idUsuario: string): Promise<void> {
	try {
		await query(`UPDATE sesiones SET activa = FALSE WHERE id_usuario = $1 AND activa = TRUE`, [
			idUsuario
		]);
	} catch (error) {
		console.error('Error al cerrar las sesiones del usuario:', error);
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
