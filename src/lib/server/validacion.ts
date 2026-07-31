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
 * Deja un texto apto para el parámetro `filename` de Content-Disposition.
 * Sin esto, un valor con comillas o punto y coma podría alterar la cabecera.
 */
export function nombreArchivoSeguro(valor: string, porDefecto = 'archivo'): string {
	const limpio = valor.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100);
	return limpio.replace(/^[._-]+/, '') || porDefecto;
}
