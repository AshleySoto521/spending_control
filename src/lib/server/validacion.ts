/**
 * Validadores de entrada compartidos por los endpoints.
 *
 * Motivo: los identificadores de ruta (`event.params.id`) y las fechas de los
 * filtros llegaban sin comprobar hasta la consulta SQL. No había inyección
 * —todo va parametrizado— pero un `id` como `abc` hacía que PostgreSQL
 * abortara la consulta y el endpoint respondiera 500 en lugar de 400, lo que
 * además ensucia los logs y dificulta distinguir un error real de un escaneo.
 */

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** `true` si el valor es un UUID (los `id_usuario` de la base lo son). */
export function esUuid(valor: unknown): valor is string {
	return typeof valor === 'string' && RE_UUID.test(valor);
}

/**
 * Convierte un identificador SERIAL de la base (tarjetas, egresos, ingresos,
 * pagos, préstamos) a entero positivo. Devuelve `null` si no lo es.
 */
export function idEntero(valor: unknown): number | null {
	if (typeof valor === 'number') {
		return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
	}

	if (typeof valor !== 'string' || !/^\d{1,15}$/.test(valor)) return null;

	const numero = Number.parseInt(valor, 10);
	return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

/**
 * Valida una fecha `YYYY-MM-DD` y comprueba que exista en el calendario
 * (rechaza `2026-02-31`). Devuelve la cadena normalizada o `null`.
 */
export function fechaISO(valor: unknown): string | null {
	if (typeof valor !== 'string' || !RE_FECHA.test(valor)) return null;

	const fecha = new Date(`${valor}T00:00:00Z`);

	if (Number.isNaN(fecha.getTime())) return null;
	if (fecha.toISOString().slice(0, 10) !== valor) return null;

	return valor;
}

/**
 * Normaliza un texto escrito por una persona.
 *
 * Recorta los extremos y colapsa los espacios interiores repetidos. Sin esto se
 * acumulan valores que parecen iguales y no lo son: en la base hay «BBVA » con
 * espacio final conviviendo con «BBVA», y nombres como «Aránzazu  del Rayo» con
 * doble espacio. Eso rompe agrupaciones, ordenaciones y la detección de
 * duplicados, y ya provocó una vez que fallara la exportación a Excel.
 *
 * Devuelve `null` para un texto vacío, de modo que la columna guarde NULL en
 * lugar de una cadena en blanco.
 */
export function textoLimpio(valor: unknown, maxLongitud = 200): string | null {
	if (typeof valor !== 'string') return null;

	const limpio = valor.trim().replace(/\s+/g, ' ').slice(0, maxLongitud);

	return limpio === '' ? null : limpio;
}

/**
 * Últimos dígitos de una tarjeta.
 *
 * La aplicación guarda como mucho cuatro dígitos, que es lo único que llega a
 * mostrar («**** **** **** 1234»). Un número completo se rechaza en lugar de
 * recortarse en silencio: si llega, es que algún cliente lo sigue pidiendo, y
 * eso hay que verlo, no taparlo. Ver migración 017.
 */
export function validarUltimosDigitos(valor: unknown): { valor: string | null; error?: string } {
	if (valor === undefined || valor === null || valor === '') {
		return { valor: null };
	}

	if (typeof valor !== 'string') {
		return { valor: null, error: 'Los últimos dígitos deben ser texto' };
	}

	const limpio = valor.trim();

	if (limpio === '') return { valor: null };

	if (!/^\d{1,4}$/.test(limpio)) {
		return {
			valor: null,
			error:
				'Guarda solo los últimos 4 dígitos de la tarjeta. Por seguridad, esta aplicación no almacena el número completo.'
		};
	}

	return { valor: limpio };
}

/**
 * Deja un texto apto para el parámetro `filename` de Content-Disposition.
 * Sin esto, un valor con comillas o punto y coma podría alterar la cabecera.
 */
export function nombreArchivoSeguro(valor: string, porDefecto = 'archivo'): string {
	const limpio = valor.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100);
	return limpio.replace(/^[._-]+/, '') || porDefecto;
}
