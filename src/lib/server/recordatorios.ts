import { createHmac, timingSafeEqual } from 'node:crypto';
import { JWT_SECRET } from '$env/static/private';
import { query } from './db';

/**
 * Recordatorios por correo a usuarios inactivos.
 *
 * Reglas de convivencia, para que esto sea un servicio y no publicidad:
 *  - Solo a cuentas activas que no se hayan dado de baja.
 *  - Se avisa a partir de `DIAS_INACTIVIDAD` sin iniciar sesión.
 *  - No se vuelve a escribir a la misma persona antes de `DIAS_ENTRE_AVISOS`.
 *  - Cada correo lleva enlace de baja que funciona sin iniciar sesión.
 */

/** Días sin entrar a partir de los cuales se considera inactiva una cuenta. */
export const DIAS_INACTIVIDAD = 15;

/** Espera mínima antes de volver a escribir a la misma persona. */
export const DIAS_ENTRE_AVISOS = 15;

/**
 * Tope de correos por ejecución.
 *
 * Es una red de seguridad, no un límite de negocio: si un error de fecha
 * hiciera que todo el padrón resultara «inactivo», esto acota el daño a un
 * puñado de correos en lugar de vaciar la cuota del proveedor SMTP y acabar
 * marcados como spam.
 */
export const MAXIMO_POR_EJECUCION = 50;

export interface UsuarioInactivo {
	idUsuario: string;
	nombre: string;
	email: string;
	diasInactivo: number;
}

/**
 * Token de baja: HMAC del identificador de usuario con el secreto de la
 * aplicación.
 *
 * No se guarda en la base a propósito. Es estable —el mismo usuario obtiene
 * siempre el mismo token, así que un enlace antiguo sigue funcionando— y no
 * añade una credencial más que proteger. Quien lo tenga solo puede desactivar
 * los recordatorios de esa persona; no da acceso a ningún dato.
 */
export function tokenDeBaja(idUsuario: string): string {
	return createHmac('sha256', JWT_SECRET).update(`baja:${idUsuario}`).digest('hex').slice(0, 32);
}

/** Comprueba el token en tiempo constante. */
export function tokenDeBajaValido(idUsuario: string, token: unknown): boolean {
	if (typeof token !== 'string') return false;

	const esperado = Buffer.from(tokenDeBaja(idUsuario), 'utf8');
	const recibido = Buffer.from(token, 'utf8');

	if (esperado.length !== recibido.length) return false;

	return timingSafeEqual(esperado, recibido);
}

/**
 * Usuarios a los que toca escribir.
 *
 * La última actividad es el `login_exitoso` más reciente, con `fecha_registro`
 * como respaldo: quien se registró y nunca volvió también cuenta como inactivo
 * pasados los días correspondientes.
 */
export async function usuariosInactivos(
	diasInactividad = DIAS_INACTIVIDAD,
	diasEntreAvisos = DIAS_ENTRE_AVISOS,
	limite = MAXIMO_POR_EJECUCION
): Promise<UsuarioInactivo[]> {
	const resultado = await query(
		`SELECT
			u.id_usuario,
			u.nombre,
			u.email,
			EXTRACT(DAY FROM NOW() - GREATEST(
				u.fecha_registro,
				COALESCE(ult.ultimo_login, u.fecha_registro)
			))::int AS dias_inactivo
		FROM usuarios u
		LEFT JOIN LATERAL (
			SELECT MAX(l.fecha_evento) AS ultimo_login
			FROM logs_seguridad l
			WHERE l.id_usuario = u.id_usuario
			  AND l.tipo_evento = 'login_exitoso'
		) ult ON TRUE
		WHERE u.activo = TRUE
		  AND u.recordatorios_activos = TRUE
		  AND GREATEST(u.fecha_registro, COALESCE(ult.ultimo_login, u.fecha_registro))
		      < NOW() - make_interval(days => $1::int)
		  AND (
			u.ultimo_recordatorio IS NULL
			OR u.ultimo_recordatorio < NOW() - make_interval(days => $2::int)
		  )
		ORDER BY GREATEST(u.fecha_registro, COALESCE(ult.ultimo_login, u.fecha_registro)) ASC
		LIMIT $3::int`,
		[diasInactividad, diasEntreAvisos, limite]
	);

	return resultado.rows.map((fila) => ({
		idUsuario: fila.id_usuario,
		nombre: fila.nombre,
		email: fila.email,
		diasInactivo: fila.dias_inactivo
	}));
}

/**
 * Marca que ya se le escribió. Solo se llama cuando el envío salió bien: si
 * fallara y aun así lo marcáramos, esa persona perdería el aviso y no se
 * volvería a intentar hasta el siguiente ciclo.
 */
export async function registrarRecordatorioEnviado(idUsuario: string): Promise<void> {
	await query('UPDATE usuarios SET ultimo_recordatorio = NOW() WHERE id_usuario = $1', [
		idUsuario
	]);
}

/** Baja de los recordatorios. Idempotente. */
export async function darDeBajaRecordatorios(idUsuario: string): Promise<boolean> {
	const resultado = await query(
		'UPDATE usuarios SET recordatorios_activos = FALSE WHERE id_usuario = $1 RETURNING id_usuario',
		[idUsuario]
	);

	return resultado.rows.length > 0;
}
