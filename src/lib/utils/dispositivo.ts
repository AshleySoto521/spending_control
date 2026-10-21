/**
 * Nombre legible de un dispositivo a partir de su user agent.
 *
 * No pretende ser exhaustivo ni exacto: sirve para que alguien mirando la lista
 * de sus sesiones reconozca cuál es cuál y pueda cerrar la que no reconozca.
 * «Chrome en Windows» cumple ese objetivo; la cadena completa del user agent,
 * no.
 */
export function describirDispositivo(userAgent: unknown): string {
	const ua = typeof userAgent === 'string' ? userAgent : '';

	if (ua.trim() === '') return 'Dispositivo desconocido';

	// El orden importa: Edge y Opera también dicen «Chrome» en su user agent, y
	// Chrome dice «Safari». Se comprueba de más específico a más genérico.
	const navegador = /Edg\//.test(ua)
		? 'Edge'
		: /OPR\/|Opera/.test(ua)
			? 'Opera'
			: /Chrome\//.test(ua)
				? 'Chrome'
				: /Firefox\//.test(ua)
					? 'Firefox'
					: /Safari\//.test(ua)
						? 'Safari'
						: null;

	// iPadOS se anuncia como Macintosh, así que iPad se comprueba antes.
	const sistema = /iPad/.test(ua)
		? 'iPad'
		: /iPhone/.test(ua)
			? 'iPhone'
			: /Android/.test(ua)
				? 'Android'
				: /Windows/.test(ua)
					? 'Windows'
					: /Mac OS X|Macintosh/.test(ua)
						? 'Mac'
						: /Linux/.test(ua)
							? 'Linux'
							: null;

	if (navegador && sistema) return `${navegador} en ${sistema}`;
	if (sistema) return sistema;
	if (navegador) return navegador;

	return 'Dispositivo desconocido';
}
