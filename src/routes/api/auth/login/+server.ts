import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { verifyPassword, generateToken } from '$lib/server/auth';
import { cookieConfig, getCookieOptions } from '$lib/server/cookies';
import { registrarLog, crearSesion } from '$lib/server/security';
import { intentosFallidosDeLogin, intentosFallidosGlobales } from '$lib/server/rateLimit';

/** Bloqueo por origen: 5 fallos contra la misma cuenta desde la misma IP. */
const MAX_INTENTOS = 5;
const VENTANA_MINUTOS = 15;

/**
 * Salvaguarda contra fuerza bruta distribuida: fallos contra una cuenta desde
 * cualquier IP. El umbral es alto a propósito, porque este contador sí se puede
 * usar para bloquear a otra persona; alcanzarlo exige decenas de orígenes
 * distintos, y para entonces el bloqueo temporal es el mal menor.
 */
const MAX_INTENTOS_GLOBALES = 50;

export const POST: RequestHandler = async (event) => {
	const { request, cookies } = event;
	let email = '';

	try {
		const body = await request.json();
		email = typeof body.email === 'string' ? body.email.trim() : '';
		const password = typeof body.password === 'string' ? body.password : '';

		// Validaciones
		if (!email || !password) {
			return json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
		}

		// Bloqueo por intentos fallidos recientes.
		// El conteo vive en la base de datos, así que sobrevive al reinicio de
		// instancias serverless. La clave incluye la IP para que nadie pueda
		// bloquear la cuenta de otra persona a base de contraseñas erróneas.
		const ip = event.getClientAddress();
		const [intentos, intentosGlobales] = await Promise.all([
			intentosFallidosDeLogin(email, ip, VENTANA_MINUTOS),
			intentosFallidosGlobales(email, VENTANA_MINUTOS)
		]);

		if (intentos >= MAX_INTENTOS || intentosGlobales >= MAX_INTENTOS_GLOBALES) {
			await registrarLog('login_bloqueado', event, {
				email,
				detalles:
					intentos >= MAX_INTENTOS
						? `Bloqueo temporal tras ${intentos} intentos fallidos desde este origen`
						: `Bloqueo temporal tras ${intentosGlobales} intentos fallidos desde varios orígenes`
			});

			return json(
				{
					error: `Demasiados intentos fallidos. Espera ${VENTANA_MINUTOS} minutos antes de volver a intentarlo.`
				},
				{ status: 429, headers: { 'retry-after': String(VENTANA_MINUTOS * 60) } }
			);
		}

		// Buscar usuario
		const result = await query(
			'SELECT id_usuario, nombre, email, password_hash, activo, es_admin FROM usuarios WHERE email = $1',
			[email]
		);

		if (result.rows.length === 0) {
			// Registrar intento fallido
			await registrarLog('login_fallido', event, {
				email,
				detalles: 'Usuario no encontrado'
			});
			return json({ error: 'Credenciales incorrectas' }, { status: 401 });
		}

		const user = result.rows[0];

		// Verificar contraseña
		const isValidPassword = await verifyPassword(password, user.password_hash);

		if (!isValidPassword) {
			// Registrar intento fallido
			await registrarLog('login_fallido', event, {
				idUsuario: user.id_usuario,
				email,
				detalles: 'Contraseña incorrecta'
			});
			return json({ error: 'Credenciales incorrectas' }, { status: 401 });
		}

		// El estado de la cuenta se comprueba DESPUÉS de validar la contraseña.
		// Al revés, cualquiera podía distinguir "cuenta desactivada" (403) de
		// "no existe" (401) sin conocer la contraseña, y eso confirma qué
		// correos están registrados.
		if (!user.activo) {
			await registrarLog('login_fallido', event, {
				idUsuario: user.id_usuario,
				email,
				detalles: 'Usuario desactivado'
			});
			return json({ error: 'Usuario desactivado' }, { status: 403 });
		}

		// Generar token
		const token = generateToken(user.id_usuario);

		// Crear sesión (esto invalidará sesiones anteriores)
		await crearSesion(user.id_usuario, token, event);

		// Registrar login exitoso
		await registrarLog('login_exitoso', event, {
			idUsuario: user.id_usuario,
			email
		});

		// El token viaja únicamente en la cookie httpOnly: no se devuelve en el
		// cuerpo para que el cliente no pueda (ni necesite) guardarlo en
		// localStorage, donde cualquier XSS lo leería.
		cookies.set(cookieConfig.name, token, getCookieOptions());

		return json({
			success: true,
			user: {
				id: user.id_usuario,
				nombre: user.nombre,
				email: user.email,
				es_admin: user.es_admin
			}
		});
	} catch (error) {
		console.error('Error en login:', error);

		// Registrar error
		await registrarLog('error', event, {
			email,
			detalles: 'Error interno durante el inicio de sesión'
		});

		return json({ error: 'Error al iniciar sesión' }, { status: 500 });
	}
};
