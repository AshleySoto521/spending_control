import { createHmac, timingSafeEqual } from 'node:crypto';
import { JWT_SECRET } from '$env/static/private';
import { env } from '$env/dynamic/private';
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

/** Espera mínima antes de volver a escribir a quien sí usó la aplicación. */
export const DIAS_ENTRE_AVISOS = 15;

/**
 * Espera para quien nunca registró nada. Más larga a propósito: esa persona no
 * ha mostrado ningún interés y escribirle con la misma frecuencia que a un
 * usuario real es lo que convierte un recordatorio en molestia.
 */
export const DIAS_ENTRE_AVISOS_SIN_ACTIVIDAD = 30;

/**
 * Tope TOTAL de avisos a quien nunca registró nada.
 *
 * Si tras dos intentos no ha entrado, no va a entrar. Seguir escribiéndole cada
 * mes durante años solo sirve para que marque el correo como spam, y esa marca
 * la paga también el correo de recuperación de contraseña, que sale de la misma
 * cuenta. Quien sí usó la aplicación no tiene tope: tiene datos dentro que le
 * importan y el aviso le sirve.
 */
export const MAXIMO_AVISOS_SIN_ACTIVIDAD = 2;

/**
 * Tope de correos por ejecución.
 *
 * Cumple dos funciones. La primera es de seguridad: si un error de fechas
 * hiciera que todo el padrón resultara «inactivo», el daño se acota a un
 * puñado de correos en lugar de vaciar la cuota del proveedor SMTP.
 *
 * La segunda es de reputación, y es la que importa al arrancar. Una cuenta que
 * hasta hoy solo enviaba correos de recuperación —pedidos, esperados y nunca
 * marcados como spam— y de pronto suelta treinta mensajes casi idénticos a
 * gente dormida desde hace meses, es el patrón que los filtros castigan. Y el
 * castigo no recae solo en los recordatorios: la misma cuenta manda los enlaces
 * de recuperación de contraseña, que sí son críticos.
 *
 * Por eso el valor por defecto es bajo y se puede ajustar por variable de
 * entorno sin volver a desplegar: se empieza despacio y se sube cuando la
 * primera tanda haya salido sin incidencias.
 */
function enteroDeEntorno(valor: string | undefined, porDefecto: number): number {
	const limpio = String(valor ?? '').split('#')[0].trim();
	const numero = Number.parseInt(limpio, 10);
	return Number.isSafeInteger(numero) && numero > 0 && numero <= 200 ? numero : porDefecto;
}

export const MAXIMO_POR_EJECUCION = enteroDeEntorno(env.RECORDATORIOS_MAX_POR_EJECUCION, 8);

/**
 * A qué público pertenece cada destinatario.
 *  - `enfriado`: llegó a registrar movimientos y dejó de entrar.
 *  - `nunca_arranco`: se dio de alta y no creó nada.
 */
export type Segmento = 'enfriado' | 'nunca_arranco';

export interface UsuarioInactivo {
	idUsuario: string;
	nombre: string;
	email: string;
	diasInactivo: number;
	segmento: Segmento;
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
 *
 * El orden empieza por quien lleva MENOS tiempo ausente. Cuando hay una cola
 * acumulada y un tope por ejecución, ese orden decide a quién se escribe
 * primero, y conviene que sea a quien más probablemente vuelva: alguien que
 * falta desde hace tres semanas reconoce la aplicación y puede retomarla; a
 * quien lleva ocho meses fuera el correo le suena a intrusión y es quien lo
 * marca como spam. Empezar por los primeros construye reputación de envío antes
 * de llegar a los segundos.
 */
export async function usuariosInactivos(
	diasInactividad = DIAS_INACTIVIDAD,
	limite = MAXIMO_POR_EJECUCION
): Promise<UsuarioInactivo[]> {
	const resultado = await query(
		`WITH base AS (
			SELECT
				u.id_usuario,
				u.nombre,
				u.email,
				u.ultimo_recordatorio,
				u.recordatorios_enviados,
				GREATEST(u.fecha_registro, COALESCE(ult.ultimo_login, u.fecha_registro))
					AS ultima_actividad,
				-- El segmento se calcula aquí y no se guarda: cualquier fila en
				-- cualquiera de estas tablas significa que la persona llegó a
				-- usar la aplicación.
				(
					EXISTS (SELECT 1 FROM tarjetas        t  WHERE t.id_usuario  = u.id_usuario) OR
					EXISTS (SELECT 1 FROM egresos         e  WHERE e.id_usuario  = u.id_usuario) OR
					EXISTS (SELECT 1 FROM ingresos        i  WHERE i.id_usuario  = u.id_usuario) OR
					EXISTS (SELECT 1 FROM prestamos       p  WHERE p.id_usuario  = u.id_usuario) OR
					EXISTS (SELECT 1 FROM pagos_tarjetas  pt WHERE pt.id_usuario = u.id_usuario) OR
					EXISTS (SELECT 1 FROM pagos_prestamos pp WHERE pp.id_usuario = u.id_usuario)
				) AS tiene_actividad
			FROM usuarios u
			LEFT JOIN LATERAL (
				SELECT MAX(l.fecha_evento) AS ultimo_login
				FROM logs_seguridad l
				WHERE l.id_usuario = u.id_usuario
				  AND l.tipo_evento = 'login_exitoso'
			) ult ON TRUE
			WHERE u.activo = TRUE
			  AND u.recordatorios_activos = TRUE
		)
		SELECT
			id_usuario,
			nombre,
			email,
			EXTRACT(DAY FROM NOW() - ultima_actividad)::int AS dias_inactivo,
			tiene_actividad
		FROM base
		WHERE ultima_actividad < NOW() - make_interval(days => $1::int)
		  -- La espera entre avisos depende del público.
		  AND (
			ultimo_recordatorio IS NULL
			OR ultimo_recordatorio < NOW() - make_interval(
				days => CASE WHEN tiene_actividad THEN $2::int ELSE $3::int END
			)
		  )
		  -- Quien nunca arrancó tiene un tope total de avisos.
		  AND (tiene_actividad OR recordatorios_enviados < $4::int)
		ORDER BY ultima_actividad DESC
		LIMIT $5::int`,
		[
			diasInactividad,
			DIAS_ENTRE_AVISOS,
			DIAS_ENTRE_AVISOS_SIN_ACTIVIDAD,
			MAXIMO_AVISOS_SIN_ACTIVIDAD,
			limite
		]
	);

	return resultado.rows.map((fila) => ({
		idUsuario: fila.id_usuario,
		nombre: fila.nombre,
		email: fila.email,
		diasInactivo: fila.dias_inactivo,
		segmento: fila.tiene_actividad ? 'enfriado' : 'nunca_arranco'
	}));
}

/**
 * Marca que ya se le escribió. Solo se llama cuando el envío salió bien: si
 * fallara y aun así lo marcáramos, esa persona perdería el aviso y no se
 * volvería a intentar hasta el siguiente ciclo.
 */
export async function registrarRecordatorioEnviado(idUsuario: string): Promise<void> {
	await query(
		`UPDATE usuarios
		 SET ultimo_recordatorio = NOW(),
		     recordatorios_enviados = recordatorios_enviados + 1
		 WHERE id_usuario = $1`,
		[idUsuario]
	);
}

/** Baja de los recordatorios. Idempotente. */
export async function darDeBajaRecordatorios(idUsuario: string): Promise<boolean> {
	const resultado = await query(
		'UPDATE usuarios SET recordatorios_activos = FALSE WHERE id_usuario = $1 RETURNING id_usuario',
		[idUsuario]
	);

	return resultado.rows.length > 0;
}
