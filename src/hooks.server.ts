import { redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { cookieConfig } from '$lib/server/cookies';
import { verifyToken } from '$lib/server/auth';
import { validarSesion } from '$lib/server/security';
import { refrescarSesion } from '$lib/server/middleware';
import { consumir } from '$lib/server/rateLimit';
import { query } from '$lib/server/db';

const esProduccion =
	String(env.NODE_ENV ?? '')
		.split('#')[0]
		.trim() === 'production';

/**
 * Rutas de página que exigen sesión válida.
 *
 * Antes la protección vivía solo en el cliente (ProtectedRoute.svelte leyendo
 * localStorage), así que bastaba con escribir `localStorage.user` a mano para
 * ver el cascarón de cualquier vista, incluida /admin. Los datos nunca se
 * filtraban porque la API sí valida, pero la comprobación debe estar en el
 * servidor.
 */
const RUTAS_PROTEGIDAS = [
	'/dashboard',
	'/egresos',
	'/ingresos',
	'/tarjetas',
	'/pagos-tarjetas',
	'/proximos-pagos-tarjetas',
	'/prestamos',
	'/proyeccion',
	'/perfil',
	'/ayuda',
	'/admin'
];

/** Rutas de página que además exigen el rol de administrador. */
const RUTAS_ADMIN = ['/admin'];

/**
 * Límites por IP. La ventana en memoria frena ráfagas; los endpoints de
 * autenticación añaden además un conteo persistente en base de datos.
 *
 * `maximo` aplica a las peticiones que modifican estado; `maximoLectura`, a las
 * de solo lectura (GET/HEAD). Antes las lecturas quedaban completamente fuera
 * del limitador, así que el tope declarado para `/api/exportar` no llegaba a
 * ejecutarse nunca: ese endpoint es GET y es el más caro de la aplicación
 * (tres consultas y la generación de un XLSX completo en memoria).
 */
const LIMITES: Array<{
	prefijo: string;
	maximo: number;
	maximoLectura: number;
	ventanaMs: number;
}> = [
	{ prefijo: '/api/auth/login', maximo: 10, maximoLectura: 30, ventanaMs: 60_000 },
	{ prefijo: '/api/auth/register', maximo: 5, maximoLectura: 30, ventanaMs: 60 * 60_000 },
	{ prefijo: '/api/auth/forgot-password', maximo: 5, maximoLectura: 30, ventanaMs: 60 * 60_000 },
	{ prefijo: '/api/auth/reset-password', maximo: 10, maximoLectura: 30, ventanaMs: 60 * 60_000 },
	{ prefijo: '/api/user/change-password', maximo: 10, maximoLectura: 30, ventanaMs: 60 * 60_000 },
	// Reenvío de verificación: sin tope, una sesión abierta bastaría para
	// generar correos a voluntad hacia la dirección registrada.
	{ prefijo: '/api/user/verificacion', maximo: 3, maximoLectura: 60, ventanaMs: 60 * 60_000 },
	// Borrado de cuenta: acota los intentos de adivinar la contraseña.
	{ prefijo: '/api/user/eliminar', maximo: 5, maximoLectura: 5, ventanaMs: 60 * 60_000 },
	{ prefijo: '/api/auth/verificar-email', maximo: 10, maximoLectura: 10, ventanaMs: 60 * 60_000 },
	// La baja de recordatorios es pública (el enlace del correo funciona sin
	// sesión), así que necesita su propio tope contra el sondeo de tokens.
	{ prefijo: '/api/recordatorios/baja', maximo: 10, maximoLectura: 10, ventanaMs: 60 * 60_000 },
	// La tarea programada se ejecuta una vez al día; un tope bajo limita el
	// desgaste de intentar adivinar el secreto.
	{ prefijo: '/api/cron', maximo: 5, maximoLectura: 5, ventanaMs: 60_000 },
	{ prefijo: '/api/admin/exportar-usuarios', maximo: 10, maximoLectura: 10, ventanaMs: 60_000 },
	{ prefijo: '/api/exportar', maximo: 20, maximoLectura: 20, ventanaMs: 60_000 },
	{ prefijo: '/api', maximo: 300, maximoLectura: 600, ventanaMs: 60_000 }
];

function limiteAplicable(pathname: string) {
	return LIMITES.find((limite) => pathname.startsWith(limite.prefijo));
}

function esRutaProtegida(pathname: string): boolean {
	return RUTAS_PROTEGIDAS.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`));
}

function esRutaAdmin(pathname: string): boolean {
	return RUTAS_ADMIN.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`));
}

/**
 * Devuelve el id del usuario de la sesión, o `null` si no hay sesión válida.
 */
async function usuarioDeLaSesion(event: Parameters<Handle>[0]['event']): Promise<string | null> {
	const token = event.cookies.get(cookieConfig.name);
	if (!token) return null;

	const payload = verifyToken(token);
	if (!payload) return null;

	const sesion = await validarSesion(token);
	if (!sesion.valida || sesion.idUsuario !== payload.userId) return null;

	// La carga de una página también cuenta como actividad: sin esto, quien
	// navega por la aplicación sin que se dispare ninguna llamada a la API
	// perdería la sesión igualmente.
	if (sesion.necesitaRenovacion) {
		await refrescarSesion(event, token);
	}

	return payload.userId;
}

async function esAdministrador(idUsuario: string): Promise<boolean> {
	try {
		const resultado = await query('SELECT es_admin FROM usuarios WHERE id_usuario = $1', [
			idUsuario
		]);
		return resultado.rows[0]?.es_admin === true;
	} catch (error) {
		console.error('Error al comprobar el rol de administrador:', error);
		return false;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// ---------------------------------------------------------------- 1. Límites
	const limite = limiteAplicable(pathname);

	if (limite) {
		// Las lecturas tienen su propia cuenta: son más frecuentes en el uso
		// normal, pero no pueden quedar sin tope porque varias (exportar,
		// dashboard, proyección) son consultas caras.
		const esLectura = event.request.method === 'GET' || event.request.method === 'HEAD';
		const maximo = esLectura ? limite.maximoLectura : limite.maximo;
		const clave = `${limite.prefijo}|${esLectura ? 'r' : 'w'}|${event.getClientAddress()}`;
		const resultado = consumir(clave, maximo, limite.ventanaMs);

		if (!resultado.permitido) {
			return new Response(
				JSON.stringify({
					error: 'Demasiadas peticiones. Espera un momento antes de volver a intentarlo.'
				}),
				{
					status: 429,
					headers: {
						'content-type': 'application/json',
						'retry-after': String(resultado.reintentarEn)
					}
				}
			);
		}
	}

	// ------------------------------------------------- 2. Guardia de rutas (SSR)
	// Cubre la carga completa de página. La navegación interna de SvelteKit no
	// vuelve al servidor, así que ProtectedRoute.svelte sigue siendo necesario
	// en el cliente; la autorización real la impone la API en cada petición.
	if (esRutaProtegida(pathname)) {
		const idUsuario = await usuarioDeLaSesion(event);

		if (!idUsuario) {
			redirect(303, '/login');
		}

		// La guardia comprobaba solo que hubiera sesión, no el rol, así que
		// cualquier usuario autenticado cargaba el panel de administración. Los
		// datos nunca se filtraron —la API responde 403— pero la comprobación
		// tiene que estar también aquí.
		if (esRutaAdmin(pathname) && !(await esAdministrador(idUsuario))) {
			redirect(303, '/dashboard');
		}
	}

	// -------------------------------------------------------------- 3. Respuesta
	const response = await resolve(event);

	// ------------------------------------------------- 4. Cabeceras de seguridad
	// (La Content-Security-Policy se define en svelte.config.js para que
	//  SvelteKit pueda añadir el nonce a sus propios scripts de hidratación.)
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Origin-Agent-Cluster', '?1');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
	);

	if (esProduccion) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	// El token de recuperación viaja en la URL de /reset-password: nunca debe
	// filtrarse por el encabezado Referer hacia un tercero.
	if (pathname.startsWith('/reset-password')) {
		response.headers.set('Referrer-Policy', 'no-referrer');
	}

	// Las respuestas de la API no deben quedar en cachés intermedias.
	if (pathname.startsWith('/api')) {
		response.headers.set('Cache-Control', 'no-store, private');
	}

	return response;
};
