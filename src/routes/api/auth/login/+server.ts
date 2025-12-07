import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { verifyPassword, generateToken } from '$lib/server/auth';
import { cookieConfig, getCookieOptions } from '$lib/server/cookies';
import { registrarLog, crearSesion } from '$lib/server/security';

export const POST: RequestHandler = async (event) => {
	const { request, cookies } = event;
	let email = '';

	try {
		const body = await request.json();
		email = body.email;
		const password = body.password;

		// Validaciones
		if (!email || !password) {
			return json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
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

		// Verificar si el usuario está activo
		if (!user.activo) {
			await registrarLog('login_fallido', event, {
				idUsuario: user.id_usuario,
				email,
				detalles: 'Usuario desactivado'
			});
			return json({ error: 'Usuario desactivado' }, { status: 403 });
		}

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

		// Generar token
		const token = generateToken(user.id_usuario);

		// Crear sesión (esto invalidará sesiones anteriores)
		await crearSesion(user.id_usuario, token, event);

		// Registrar login exitoso
		await registrarLog('login_exitoso', event, {
			idUsuario: user.id_usuario,
			email
		});

		// Guardar token en cookie
		cookies.set(cookieConfig.name, token, getCookieOptions());

		return json({
			success: true,
			user: {
				id: user.id_usuario,
				nombre: user.nombre,
				email: user.email,
				es_admin: user.es_admin
			},
			token
		});
	} catch (error) {
		console.error('Error en login:', error);

		// Registrar error
		await registrarLog('error', event, {
			email,
			detalles: `Error en login: ${error}`
		});

		return json({ error: 'Error al iniciar sesión' }, { status: 500 });
	}
};
