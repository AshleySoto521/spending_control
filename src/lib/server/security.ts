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
	| 'email_verificado'
	| 'verificacion_reenviada'
	| 'cuenta_eliminada'
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

/**
 * Horas de inactividad tras las que caduca una sesión.
 * Es una ventana deslizante: cada uso la empuja hacia adelante.
 */
export const HORAS_INACTIVIDAD = 4;

/**
 * Antigüedad máxima de una sesión, se use o no.
 *
 * Sin este tope, una sesión en uso continuo no caducaría nunca y un token
 * robado valdría indefinidamente. Con él, cada 30 días toca volver a
 * autenticarse aunque no se haya dejado de usar la aplicación.
 */
export const DIAS_MAXIMO_SESION = 30;

/** Sesiones simultáneas por usuario; al superarlo se cierra la más antigua. */
export const MAXIMO_SESIONES = 5;

/**
 * Margen para renovar. Solo se escribe en la base cuando a la sesión le queda
 * menos que esto, es decir como mucho una vez por hora de uso continuo, en
 * lugar de en cada petición.
 */
const HORAS_UMBRAL_RENOVACION = HORAS_INACTIVIDAD - 1;

/**
 * Crea una sesión.
 *
 * Antes cada inicio de sesión cerraba todas las anteriores, así que entrar
 * desde el teléfono expulsaba a quien estuviera en la computadora. En una
 * aplicación instalable como PWA eso es fricción constante y ningún beneficio
 * real de seguridad: una sesión robada se corta revocándola, no impidiendo que
 * la persona use dos dispositivos. Ahora conviven varias, con tope, y se pueden
 * cerrar una a una desde el perfil.
 */
export async function crearSesion(
	idUsuario: string,
	token: string,
	event: RequestEvent
): Promise<string> {
	const ipAddress = event.getClientAddress();
	const userAgent = event.request.headers.get('user-agent') || '';

	const fechaExpiracion = new Date();
	fechaExpiracion.setHours(fechaExpiracion.getHours() + HORAS_INACTIVIDAD);

	// Dejar sitio: se cierran las más antiguas que sobren del tope.
	await query(
		`UPDATE sesiones SET activa = FALSE
		 WHERE id_sesion IN (
			SELECT id_sesion FROM sesiones
			WHERE id_usuario = $1 AND activa = TRUE
			ORDER BY fecha_creacion DESC
			OFFSET $2
		 )`,
		[idUsuario, Math.max(MAXIMO_SESIONES - 1, 0)]
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
	idSesion?: string;
	/** `true` cuando conviene empujar la caducidad hacia adelante. */
	necesitaRenovacion?: boolean;
	motivo?: string;
}> {
	try {
		const huella = huellaToken(token);

		const result = await query(
			`SELECT id_sesion, id_usuario, fecha_creacion, fecha_expiracion, activa
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

		// Tope absoluto: por mucho que se use, una sesión no vive para siempre.
		const antiguedadMaxima = new Date(sesion.fecha_creacion);
		antiguedadMaxima.setDate(antiguedadMaxima.getDate() + DIAS_MAXIMO_SESION);

		if (ahora > antiguedadMaxima) {
			await query(`UPDATE sesiones SET activa = FALSE WHERE token = $1`, [huella]);
			return { valida: false, motivo: 'Sesión caducada por antigüedad' };
		}

		const horasRestantes = (expiracion.getTime() - ahora.getTime()) / 3_600_000;

		return {
			valida: true,
			idUsuario: sesion.id_usuario,
			idSesion: sesion.id_sesion,
			necesitaRenovacion: horasRestantes < HORAS_UMBRAL_RENOVACION
		};
	} catch (error) {
		console.error('Error al validar sesión:', error);
		return { valida: false, motivo: 'Error de validación' };
	}
}

/**
 * Empuja la caducidad de una sesión activa.
 *
 * Es lo que evita que alguien que usa la aplicación con normalidad tenga que
 * escribir su contraseña cada cuatro horas. Nunca pasa del tope absoluto: si la
 * sesión ya está cerca de cumplir sus días, `LEAST` deja la fecha ahí y a partir
 * de ese momento caduca de verdad.
 */
export async function renovarSesion(token: string): Promise<void> {
	try {
		await query(
			`UPDATE sesiones
			 SET fecha_expiracion = LEAST(
					NOW() + make_interval(hours => $2::int),
					fecha_creacion + make_interval(days => $3::int)
				)
			 WHERE token = $1 AND activa = TRUE`,
			[huellaToken(token), HORAS_INACTIVIDAD, DIAS_MAXIMO_SESION]
		);
	} catch (error) {
		// Que falle la renovación no debe tumbar la petición: la sesión sigue
		// siendo válida hasta su caducidad actual.
		console.error('Error al renovar la sesión:', error);
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

export interface SesionActiva {
	idSesion: string;
	ipAddress: string | null;
	userAgent: string | null;
	fechaCreacion: string;
	fechaExpiracion: string;
	/** `true` si es la sesión desde la que se está consultando. */
	esActual: boolean;
}

/**
 * Sesiones abiertas de un usuario, de la más reciente a la más antigua.
 *
 * `tokenActual` sirve para marcar cuál es la propia. La comparación se hace en
 * la consulta, contra la huella: así el token en claro no sale de esta capa y
 * la huella almacenada tampoco llega nunca al cliente.
 */
export async function listarSesiones(
	idUsuario: string,
	tokenActual?: string
): Promise<SesionActiva[]> {
	const result = await query(
		`SELECT id_sesion, ip_address, user_agent, fecha_creacion, fecha_expiracion,
		        (token = $2) AS es_actual
		FROM sesiones
		WHERE id_usuario = $1 AND activa = TRUE AND fecha_expiracion > NOW()
		ORDER BY fecha_creacion DESC`,
		[idUsuario, tokenActual ? huellaToken(tokenActual) : '']
	);

	return result.rows.map((fila) => ({
		idSesion: fila.id_sesion,
		ipAddress: fila.ip_address,
		userAgent: fila.user_agent,
		fechaCreacion: fila.fecha_creacion,
		fechaExpiracion: fila.fecha_expiracion,
		esActual: fila.es_actual === true
	}));
}

/**
 * Cierra una sesión concreta.
 *
 * El `id_usuario` va en el WHERE, no solo comprobado antes: así la consulta no
 * puede cerrar la sesión de otra persona ni aunque llegue un identificador
 * ajeno.
 */
export async function cerrarSesionPorId(idUsuario: string, idSesion: string): Promise<boolean> {
	const result = await query(
		`UPDATE sesiones SET activa = FALSE
		 WHERE id_sesion = $1 AND id_usuario = $2 AND activa = TRUE
		 RETURNING id_sesion`,
		[idSesion, idUsuario]
	);

	return result.rows.length > 0;
}
