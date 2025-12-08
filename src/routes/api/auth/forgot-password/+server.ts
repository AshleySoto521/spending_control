import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { generateResetToken, getTokenExpiration } from '$lib/server/auth';
import { sendResetPasswordEmail } from '$lib/server/email';
import { APP_URL, NODE_ENV } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email } = await request.json();

		if (!email) {
			return json({ error: 'Email es requerido' }, { status: 400 });
		}

		// Buscar usuario
		const result = await query('SELECT id_usuario, nombre FROM usuarios WHERE email = $1', [email]);

		if (result.rows.length === 0) {
			// Por seguridad, devolvemos el mismo mensaje aunque el usuario no exista
			return json({
				success: true,
				message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
			});
		}

		const user = result.rows[0];

		// Generar token de recuperación
		const resetToken = generateResetToken();
		const expiration = getTokenExpiration();

		console.log('=== Generando Token de Recuperación ===');
		console.log('Usuario:', user.nombre, '(', user.id_usuario, ')');
		console.log('Token generado:', resetToken);
		console.log('Fecha de expiración:', expiration);

		// Guardar token en la base de datos
		await query(
			'UPDATE usuarios SET token_recuperacion = $1, token_expiracion = $2 WHERE id_usuario = $3',
			[resetToken, expiration, user.id_usuario]
		);

		// Verificar que se guardó correctamente
		const verification = await query(
			'SELECT token_recuperacion, token_expiracion FROM usuarios WHERE id_usuario = $1',
			[user.id_usuario]
		);
		console.log('Token guardado en BD:', verification.rows[0]?.token_recuperacion === resetToken);
		console.log('Expiración guardada:', verification.rows[0]?.token_expiracion);

		// Generar link de recuperación
		const resetLink = `${APP_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

		// Enviar email de recuperación
		const emailResult = await sendResetPasswordEmail(email, user.nombre, resetLink);

		// Solo en desarrollo: mostrar link en consola
		if (NODE_ENV === 'development') {
			console.log('Link de recuperación para', user.nombre, ':', resetLink);
			if (!emailResult.success) {
				console.warn('Advertencia: El email no pudo ser enviado:', emailResult.error);
			}
		}

		return json({
			success: true,
			message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
		});
	} catch (error) {
		console.error('Error en recuperación de contraseña:', error);
		return json({ error: 'Error al procesar solicitud' }, { status: 500 });
	}
};
