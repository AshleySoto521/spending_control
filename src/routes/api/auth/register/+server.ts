import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { hashPassword, generateToken } from '$lib/server/auth';
import { cookieConfig, getCookieOptions } from '$lib/server/cookies';
import { crearSesion, registrarLog } from '$lib/server/security';
import { validarPassword } from '$lib/server/passwordPolicy';
import { contarEventosPorIp } from '$lib/server/rateLimit';
import { textoLimpio } from '$lib/server/validacion';
import { generarTokenVerificacion } from '$lib/server/verificacion';
import { sendVerificacionEmail } from '$lib/server/email';
import { env } from '$env/dynamic/private';

/**
 * Altas por IP y hora, contadas en base de datos.
 *
 * La ventana en memoria de `hooks.server.ts` no basta en Vercel: cada instancia
 * tiene su propio mapa, así que el tope real era «5 × número de instancias» y
 * se reiniciaba con cada arranque en frío. Este conteo sí es compartido.
 */
const MAX_REGISTROS_POR_IP = 5;
const VENTANA_MINUTOS = 60;

export const POST: RequestHandler = async (event) => {
	const { request, cookies } = event;
	try {
		const registrosRecientes = await contarEventosPorIp(
			'registro_exitoso',
			event.getClientAddress(),
			VENTANA_MINUTOS
		);

		if (registrosRecientes >= MAX_REGISTROS_POR_IP) {
			return json(
				{ error: 'Demasiadas cuentas creadas desde este origen. Inténtalo más tarde.' },
				{ status: 429, headers: { 'retry-after': String(VENTANA_MINUTOS * 60) } }
			);
		}

		const body = await request.json();

		// `textoLimpio` en vez de `.trim()`: también colapsa los espacios
		// interiores repetidos, que es de donde salen nombres como
		// «Aránzazu  del Rayo».
		const nombre = textoLimpio(body.nombre, 100) ?? '';
		const email = typeof body.email === 'string' ? body.email.trim() : '';
		const celular = typeof body.celular === 'string' ? body.celular.trim() : '';
		const password = typeof body.password === 'string' ? body.password : '';
		const { aceptoTerminos, aceptoPrivacidad } = body;

		// Validaciones
		if (!nombre || !email || !celular || !password) {
			return json({ error: 'Nombre, email, celular y contraseña son requeridos' }, { status: 400 });
		}

		if (nombre.length > 100) {
			return json({ error: 'El nombre es demasiado largo' }, { status: 400 });
		}

		if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
			return json({ error: 'El email no tiene un formato válido' }, { status: 400 });
		}

		// Validar aceptación de términos y privacidad
		if (!aceptoTerminos) {
			return json({ error: 'Debes aceptar los Términos y Condiciones' }, { status: 400 });
		}

		if (!aceptoPrivacidad) {
			return json({ error: 'Debes aceptar el Aviso de Privacidad' }, { status: 400 });
		}

		const validacion = validarPassword(password, { email, nombre });

		if (!validacion.valida) {
			return json({ error: validacion.error }, { status: 400 });
		}

		// Validar celular
		if (!/^\d{10}$/.test(celular)) {
			return json({ error: 'El celular debe contener exactamente 10 dígitos' }, { status: 400 });
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
			'INSERT INTO usuarios (nombre, email, celular, password_hash, acepto_terminos, acepto_privacidad) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_usuario, nombre, email, celular',
			[nombre, email, celular, passwordHash, aceptoTerminos, aceptoPrivacidad]
		);

		const user = result.rows[0];

		// Generar token
		const token = generateToken(user.id_usuario);

		// Crear sesión en la base de datos
		await crearSesion(user.id_usuario, token, event);

		// Registrar log de registro exitoso.
		// Tipo propio 'registro_exitoso': es lo que cuenta el límite por IP de
		// arriba, y mezclarlo con 'login_exitoso' falsearía ese contador.
		await registrarLog('registro_exitoso', event, {
			idUsuario: user.id_usuario,
			email: user.email,
			detalles: 'Usuario registrado exitosamente'
		});

		// Verificación de correo: no bloquea el acceso, solo confirma que la
		// dirección es suya. Sin esto, quien se equivoca al teclear su correo se
		// queda sin recuperación de contraseña para siempre.
		//
		// Un fallo al enviar no debe tumbar el registro: la cuenta ya existe y se
		// puede reenviar la confirmación desde el perfil.
		try {
			const tokenVerificacion = await generarTokenVerificacion(user.id_usuario);
			const appUrl = String(env.APP_URL ?? '').split('#')[0].trim() || 'http://localhost:5173';

			await sendVerificacionEmail(
				user.email,
				user.nombre,
				`${appUrl}/verificar-email?t=${encodeURIComponent(tokenVerificacion)}`
			);
		} catch (errorVerificacion) {
			console.error('No se pudo enviar la verificación de correo:', errorVerificacion);
		}

		// El token solo viaja en la cookie httpOnly, nunca en el cuerpo.
		cookies.set(cookieConfig.name, token, getCookieOptions());

		return json(
			{
				success: true,
				user: {
					id: user.id_usuario,
					nombre: user.nombre,
					email: user.email,
					celular: user.celular
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error en registro:', error);
		return json({ error: 'Error al registrar usuario' }, { status: 500 });
	}
};
