import { env } from '$env/dynamic/private';
import { query } from './db';

/**
 * Retención de `logs_seguridad`.
 *
 * La tabla registra cada inicio de sesión, cada fallo, cada recordatorio y cada
 * cierre de sesión, y hasta ahora nada la vaciaba nunca. Además de crecer sin
 * límite, es la que consultan tres cosas en caliente: el bloqueo por intentos
 * fallidos, el límite de altas por IP y la selección de destinatarios de los
 * recordatorios. Cuanto más grande, más caro cada inicio de sesión.
 *
 * Dos plazos distintos porque los eventos no valen lo mismo:
 *
 *  - Los operativos (fallos de contraseña, sesiones caducadas, límites
 *    alcanzados) solo sirven en una ventana de minutos u horas. A los tres
 *    meses son ruido.
 *  - Los de auditoría (cambios de contraseña, bajas, cuentas eliminadas) son
 *    justamente los que quieres poder consultar cuando alguien pregunta qué
 *    pasó con su cuenta. Se guardan un año.
 */

/** Eventos de vida corta: ruido operativo pasada su ventana de utilidad. */
const EVENTOS_OPERATIVOS = [
	'login_fallido',
	'login_bloqueado',
	'sesion_expirada',
	'limite_excedido',
	'password_actual_incorrecta',
	'error'
];

function diasDeEntorno(valor: string | undefined, porDefecto: number): number {
	const limpio = String(valor ?? '').split('#')[0].trim();
	const numero = Number.parseInt(limpio, 10);
	return Number.isSafeInteger(numero) && numero > 0 ? numero : porDefecto;
}

export const DIAS_RETENCION_OPERATIVOS = diasDeEntorno(env.LOGS_RETENCION_OPERATIVOS, 90);
export const DIAS_RETENCION_AUDITORIA = diasDeEntorno(env.LOGS_RETENCION_AUDITORIA, 365);

export interface ResultadoLimpieza {
	eliminados: number;
	restantes: number;
}

/**
 * Borra los eventos que han pasado su plazo.
 *
 * Conserva SIEMPRE el último `login_exitoso` de cada usuario, aunque sea más
 * antiguo que el plazo. Ese registro es lo que define la «última actividad» de
 * una cuenta: si se borrara, alguien que lleva ocho meses sin entrar pasaría a
 * calcularse desde su fecha de registro y la cifra de días del recordatorio
 * dejaría de tener sentido.
 */
export async function limpiarLogsSeguridad(
	diasOperativos = DIAS_RETENCION_OPERATIVOS,
	diasAuditoria = DIAS_RETENCION_AUDITORIA
): Promise<ResultadoLimpieza> {
	const borrado = await query(
		`DELETE FROM logs_seguridad l
		 WHERE NOT EXISTS (
			-- El último login de cada usuario queda a salvo.
			SELECT 1
			FROM (
				SELECT DISTINCT ON (id_usuario) id_log
				FROM logs_seguridad
				WHERE tipo_evento = 'login_exitoso' AND id_usuario IS NOT NULL
				ORDER BY id_usuario, fecha_evento DESC
			) conservados
			WHERE conservados.id_log = l.id_log
		 )
		 AND (
			CASE
				WHEN l.tipo_evento = ANY($1::text[])
					THEN l.fecha_evento < NOW() - make_interval(days => $2::int)
				ELSE l.fecha_evento < NOW() - make_interval(days => $3::int)
			END
		 )`,
		[EVENTOS_OPERATIVOS, diasOperativos, diasAuditoria]
	);

	const restantes = await query('SELECT COUNT(*)::int AS total FROM logs_seguridad');

	return {
		eliminados: borrado.rowCount ?? 0,
		restantes: restantes.rows[0]?.total ?? 0
	};
}
