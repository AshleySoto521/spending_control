import { query } from './db';
import { generateResetToken } from './auth';
import { huellaToken } from './security';

/**
 * Verificación de la dirección de correo.
 *
 * Mismo patrón que la recuperación de contraseña: token aleatorio de 256 bits
 * que solo viaja en el enlace, y del que la base guarda únicamente la huella.
 * Así, leer la tabla `usuarios` no permite verificar cuentas ajenas.
 */

/** Horas que dura el enlace de verificación. */
export const HORAS_VIGENCIA = 48;

/**
 * Genera un token nuevo y lo asocia al usuario.
 * Devuelve el token en claro, que es lo único que se envía por correo.
 */
export async function generarTokenVerificacion(idUsuario: string): Promise<string> {
	const token = generateResetToken();
	const expira = new Date();
	expira.setHours(expira.getHours() + HORAS_VIGENCIA);

	await query(
		`UPDATE usuarios
		 SET token_verificacion = $1, token_verificacion_expira = $2
		 WHERE id_usuario = $3`,
		[huellaToken(token), expira, idUsuario]
	);

	return token;
}

/**
 * Confirma una dirección a partir del token del enlace.
 *
 * El token es de un solo uso: al confirmar se borra. Devuelve `false` tanto si
 * no existe como si caducó, sin distinguir entre ambos casos.
 */
export async function verificarEmail(token: string): Promise<boolean> {
	const resultado = await query(
		`UPDATE usuarios
		 SET email_verificado = TRUE,
		     token_verificacion = NULL,
		     token_verificacion_expira = NULL
		 WHERE token_verificacion = $1
		   AND token_verificacion_expira > NOW()
		   AND activo = TRUE
		 RETURNING id_usuario, email`,
		[huellaToken(token)]
	);

	return resultado.rows.length > 0;
}

/** Datos mínimos para decidir si hay que pedir verificación. */
export async function estadoVerificacion(
	idUsuario: string
): Promise<{ verificado: boolean; email: string } | null> {
	const resultado = await query(
		'SELECT email, email_verificado FROM usuarios WHERE id_usuario = $1',
		[idUsuario]
	);

	if (resultado.rows.length === 0) return null;

	return {
		verificado: resultado.rows[0].email_verificado === true,
		email: resultado.rows[0].email
	};
}
