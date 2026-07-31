/**
 * Lectura segura de parámetros de paginación.
 *
 * Sin esto, `parseInt(searchParams.get('limit'))` acepta valores como
 * `99999999` (agota memoria y cuota de la base de datos) o `abc`
 * (produce NaN y un error 500 al llegar al driver de Postgres).
 */

export interface Paginacion {
	limit: number;
	offset: number;
}

function enteroSeguro(valor: string | null, porDefecto: number, minimo: number, maximo: number): number {
	if (valor === null || valor.trim() === '') return porDefecto;

	const numero = Number.parseInt(valor, 10);

	if (!Number.isFinite(numero)) return porDefecto;

	return Math.min(Math.max(numero, minimo), maximo);
}

export function leerPaginacion(
	url: URL,
	opciones: { limitPorDefecto?: number; limitMaximo?: number } = {}
): Paginacion {
	const { limitPorDefecto = 100, limitMaximo = 500 } = opciones;

	return {
		limit: enteroSeguro(url.searchParams.get('limit'), limitPorDefecto, 1, limitMaximo),
		offset: enteroSeguro(url.searchParams.get('offset'), 0, 0, 1_000_000)
	};
}
