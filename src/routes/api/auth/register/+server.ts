import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { hashPassword, generateToken } from '$lib/server/auth';
import { cookieConfig, getCookieOptions } from '$lib/server/cookies';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { nombre, email, celular, password } = await request.json();

		// Validaciones
		if (!nombre || !email || !celular || !password) {
			return json({ error: 'Nombre, email, celular y contraseña son requeridos' }, { status: 400 });
		}

		if (password.length < 8) {
			return json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
		}

		// Validar celular
		if (celular) {
			if (!/^\d{10}$/.test(celular)) {
				return json({ error: 'El celular debe contener exactamente 10 dígitos' }, { status: 400 });
			}
		}

		// Verificar si el email ya existe
		const existingUser = await query('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);

		if (existingUser.rows.length > 0) {
			return json({ error: 'El email ya está registrado' }, { status: 409 });
		}

		// Hash de la contraseña
		const passwordHash = await hashPassword(password);

		// Insertar usuario
		const result = await query(
			'INSERT INTO usuarios (nombre, email, celular, password_hash) VALUES ($1, $2, $3, $4) RETURNING id_usuario, nombre, email, celular',
			[nombre, email, celular || null, passwordHash]
		);

		const user = result.rows[0];

		// Generar token
		const token = generateToken(user.id_usuario);

		// Guardar token en cookie
		cookies.set(cookieConfig.name, token, getCookieOptions());

		return json(
			{
				success: true,
				user: {
					id: user.id_usuario,
					nombre: user.nombre,
					email: user.email,
					celular: user.celular
				},
				token
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error en registro:', error);
		return json({ error: 'Error al registrar usuario' }, { status: 500 });
	}
};
