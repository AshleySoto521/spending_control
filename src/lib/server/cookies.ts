import { env } from '$env/dynamic/private';

/**
 * Limpia el valor de una variable de entorno.
 *
 * Protege contra dos problemas reales del .env de este proyecto:
 *  - comentarios en línea (`COOKIE_DOMAIN=localhost  # cambiar en producción`)
 *    que, si el cargador no los recorta, generarían un dominio inválido y
 *    romperían la cookie de sesión por completo.
 *  - espacios sobrantes.
 */
function limpiar(valor: string | undefined): string | undefined {
	if (valor === undefined || valor === null) return undefined;
	const limpio = String(valor).split('#')[0].trim();
	return limpio === '' ? undefined : limpio;
}

function entero(valor: string | undefined, porDefecto: number): number {
	const numero = Number.parseInt(limpiar(valor) ?? '', 10);
	return Number.isFinite(numero) && numero > 0 ? numero : porDefecto;
}

const esProduccion = limpiar(env.NODE_ENV) === 'production';

// Importante: los valores booleanos fallan en CERRADO, no en abierto.
// Si la variable falta o está mal escrita se aplica la opción más segura.
const httpOnly = limpiar(env.COOKIE_HTTP_ONLY) !== 'false';
const secure = esProduccion || limpiar(env.COOKIE_SECURE) === 'true';

const sameSiteConfigurado = (limpiar(env.COOKIE_SAME_SITE) ?? 'lax').toLowerCase();
const sameSitePermitidos = ['strict', 'lax', 'none'];

// SameSite=None exige Secure; sin HTTPS el navegador descarta la cookie.
// Ante una combinación inválida se degrada a 'lax'.
const sameSite = (
	sameSitePermitidos.includes(sameSiteConfigurado) && !(sameSiteConfigurado === 'none' && !secure)
		? sameSiteConfigurado
		: 'lax'
) as 'strict' | 'lax' | 'none';

const dominioConfigurado = limpiar(env.COOKIE_DOMAIN);

export const cookieConfig = {
	name: limpiar(env.COOKIE_NAME) || 'auth_token',
	// 30 días: es el tope absoluto de la sesión, no su duración efectiva. La
	// sesión real caduca por inactividad (4 h) según la fila de `sesiones`, que
	// se renueva con el uso. Si la cookie muriera a las 4 h, el navegador la
	// descartaría antes de que esa renovación pudiera llegar a aplicarse.
	maxAge: entero(env.COOKIE_MAX_AGE, 30 * 24 * 60 * 60 * 1000),
	httpOnly,
	secure,
	sameSite,
	path: limpiar(env.COOKIE_PATH) || '/',
	domain:
		dominioConfigurado && dominioConfigurado !== 'localhost' && dominioConfigurado !== '127.0.0.1'
			? dominioConfigurado
			: undefined
};

export function getCookieOptions() {
	return {
		path: cookieConfig.path,
		httpOnly: cookieConfig.httpOnly,
		secure: cookieConfig.secure,
		sameSite: cookieConfig.sameSite,
		maxAge: Math.floor(cookieConfig.maxAge / 1000), // segundos
		...(cookieConfig.domain && { domain: cookieConfig.domain })
	};
}
