import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { generateResetToken, getTokenExpiration } from '$lib/server/auth';

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

		// Guardar token en la base de datos
		await query(
			'UPDATE usuarios SET token_recuperacion = $1, token_expiracion = $2 WHERE id_usuario = $3',
			[resetToken, expiration, user.id_usuario]
		);

		// Aquí deberías enviar un email con el link de recuperación
		// Por ahora, devolvemos el token (en producción, esto se enviaría por email)
		const resetLink = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

		console.log('Link de recuperación para', user.nombre, ':', resetLink);

		// En producción, aquí enviarías el email
		// await sendResetPasswordEmail(email, user.nombre, resetLink);

		return json({
			success: true,
			message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña',
			// Remover esta línea en producción
			resetLink: resetLink
		});
	} catch (error) {
		console.error('Error en recuperación de contraseña:', error);
		return json({ error: 'Error al procesar solicitud' }, { status: 500 });
	}
};
