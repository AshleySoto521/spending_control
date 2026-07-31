import { query } from './db';

/**
 * Limitador de peticiones.
 *
 * Dos capas complementarias:
 *  1. Ventana en memoria (rápida, por instancia). Frena ráfagas inmediatas.
 *  2. Conteo en base de datos sobre logs_seguridad (persistente). Sobrevive al
 *     reinicio de instancias serverless, donde la memoria no se comparte.
 */

type Bucket = { conteo: number; reinicio: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function purgar(ahora: number) {
	if (buckets.size < MAX_BUCKETS) return;
	for (const [clave, bucket] of buckets) {
		if (bucket.reinicio <= ahora) buckets.delete(clave);
	}
}

export interface ResultadoLimite {
	permitido: boolean;
	/** Segundos que el cliente debe esperar antes de reintentar. */
	reintentarEn: number;
}

/**
 * Consume una unidad de la ventana identificada por `clave`.
 * Devuelve `permitido: false` cuando se excede `maximo` dentro de `ventanaMs`.
 */
export function consumir(clave: string, maximo: number, ventanaMs: number): ResultadoLimite {
	const ahora = Date.now();
	purgar(ahora);

	const bucket = buckets.get(clave);

	if (!bucket || bucket.reinicio <= ahora) {
		buckets.set(clave, { conteo: 1, reinicio: ahora + ventanaMs });
		return { permitido: true, reintentarEn: 0 };
	}

	bucket.conteo += 1;

	if (bucket.conteo > maximo) {
		return { permitido: false, reintentarEn: Math.max(1, Math.ceil((bucket.reinicio - ahora) / 1000)) };
	}

	return { permitido: true, reintentarEn: 0 };
}

/**
 * Cuenta eventos de seguridad recientes asociados a un email.
 * Se apoya en la tabla logs_seguridad que ya alimenta registrarLog().
 */
export async function contarEventosPorEmail(
	tipoEvento: string,
	email: string,
	minutos: number
): Promise<number> {
	try {
		const resultado = await query(
			`SELECT COUNT(*)::int AS total
			 FROM logs_seguridad
			 WHERE tipo_evento = $1
			   AND LOWER(email) = LOWER($2)
			   AND fecha_evento > NOW() - make_interval(mins => $3::int)`,
			[tipoEvento, email, minutos]
		);
		return resultado.rows[0]?.total ?? 0;
	} catch (error) {
		console.error('Error al contar eventos de seguridad:', error);
		// Ante un fallo de conteo no bloqueamos al usuario legítimo:
		// la capa en memoria sigue activa como red de seguridad.
		return 0;
	}
}

/**
 * Cuenta eventos de seguridad recientes originados en una IP.
 * Complementa la ventana en memoria, que no sobrevive al reinicio de las
 * instancias serverless ni se comparte entre ellas.
 */
export async function contarEventosPorIp(
	tipoEvento: string,
	ip: string,
	minutos: number
): Promise<number> {
	try {
		const resultado = await query(
			`SELECT COUNT(*)::int AS total
			 FROM logs_seguridad
			 WHERE tipo_evento = $1
			   AND ip_address = $2
			   AND fecha_evento > NOW() - make_interval(mins => $3::int)`,
			[tipoEvento, ip, minutos]
		);
		return resultado.rows[0]?.total ?? 0;
	} catch (error) {
		console.error('Error al contar eventos por IP:', error);
		return 0;
	}
}

/**
 * Intentos de login fallidos contra una cuenta desde una IP concreta, dentro de
 * los últimos `minutos` y **posteriores al último login correcto** desde esa
 * misma IP.
 *
 * Por qué la IP forma parte de la clave: contar solo por email convierte el
 * bloqueo en un ataque de denegación de servicio dirigido. Cualquiera que
 * conozca un correo registrado podía enviar cinco contraseñas erróneas y dejar
 * a esa persona fuera de su cuenta durante 15 minutos, de forma indefinida.
 * Con la IP en la clave, el atacante solo se bloquea a sí mismo; la defensa
 * contra un ataque distribuido la aporta `intentosFallidosGlobales`.
 *
 * Por qué se descartan los anteriores al último acierto: sin ese corte, quien
 * falla cuatro veces, entra bien y vuelve a fallar una vez quedaba bloqueado
 * pese a haber demostrado ya que conoce la contraseña.
 */
export async function intentosFallidosDeLogin(
	email: string,
	ip: string,
	minutos: number
): Promise<number> {
	try {
		const resultado = await query(
			`SELECT COUNT(*)::int AS total
			 FROM logs_seguridad
			 WHERE tipo_evento = 'login_fallido'
			   AND LOWER(email) = LOWER($1)
			   AND ip_address = $2
			   AND fecha_evento > NOW() - make_interval(mins => $3::int)
			   AND fecha_evento > COALESCE(
			       (SELECT MAX(fecha_evento)
			        FROM logs_seguridad
			        WHERE tipo_evento = 'login_exitoso'
			          AND LOWER(email) = LOWER($1)
			          AND ip_address = $2),
			       '-infinity'::timestamp
			   )`,
			[email, ip, minutos]
		);
		return resultado.rows[0]?.total ?? 0;
	} catch (error) {
		console.error('Error al contar intentos fallidos de login:', error);
		return 0;
	}
}

/**
 * Intentos fallidos contra una cuenta desde cualquier origen.
 *
 * Es la red que atrapa el ataque distribuido (muchas IPs probando contraseñas
 * contra el mismo correo). El umbral asociado es deliberadamente alto: tiene
 * que ser demasiado caro de alcanzar para que sirva como herramienta de
 * bloqueo malicioso, pero suficientemente bajo para frenar la fuerza bruta.
 */
export function intentosFallidosGlobales(email: string, minutos: number): Promise<number> {
	return contarEventosPorEmail('login_fallido', email, minutos);
}
