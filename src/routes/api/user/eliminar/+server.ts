import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, esRespuestaDeAuth } from '$lib/server/middleware';
import { getClient } from '$lib/server/db';
import { query } from '$lib/server/db';
import { verifyPassword } from '$lib/server/auth';
import { cookieConfig } from '$lib/server/cookies';
import { registrarLog } from '$lib/server/security';

/**
 * Borrado de la cuenta a petición de la persona.
 *
 * El aviso de privacidad de la aplicación invoca la LFPDPPP, que reconoce el
 * derecho de cancelación. Hasta ahora ese derecho solo podía ejercerse pidiendo
 * a la administradora que borrara las filas a mano, lo cual no es un mecanismo.
 *
 * Se borra de verdad, no se desactiva: «cancelación» significa que los datos
 * dejan de estar, no que queden ocultos. Las claves foráneas en cascada retiran
 * tarjetas, ingresos, egresos, préstamos, pagos y sesiones.
 */
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const body = await event.request.json();
		const password = typeof body.password === 'string' ? body.password : '';

		if (!password) {
			return json({ error: 'Confirma tu contraseña para continuar' }, { status: 400 });
		}

		const usuario = await query(
			'SELECT password_hash, email, es_admin FROM usuarios WHERE id_usuario = $1',
			[userId]
		);

		if (usuario.rows.length === 0) {
			return json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		// Se pide la contraseña aunque la sesión sea válida: es una acción
		// irreversible, y una sesión abierta en un dispositivo prestado no
		// debería bastar para destruir la cuenta de nadie.
		const correcta = await verifyPassword(password, usuario.rows[0].password_hash);

		if (!correcta) {
			await registrarLog('password_actual_incorrecta', event, {
				idUsuario: userId,
				detalles: 'Contraseña incorrecta al intentar eliminar la cuenta'
			});
			return json({ error: 'La contraseña no es correcta' }, { status: 401 });
		}

		// Salvaguarda: la aplicación se quedaría sin quien administre.
		if (usuario.rows[0].es_admin) {
			const admins = await query(
				'SELECT COUNT(*)::int AS total FROM usuarios WHERE es_admin = TRUE AND activo = TRUE'
			);

			if (admins.rows[0].total <= 1) {
				return json(
					{
						error: 'Eres la única cuenta administradora. Nombra a otra antes de eliminar la tuya.'
					},
					{ status: 409 }
				);
			}
		}

		// El registro del borrado se escribe ANTES: después el usuario ya no
		// existe y `registrarLog` no podría referenciarlo.
		await registrarLog('cuenta_eliminada', event, {
			idUsuario: userId,
			detalles: 'Cuenta eliminada a petición de la persona usuaria'
		});

		const client = await getClient();

		try {
			await client.query('BEGIN');

			// El historial de seguridad sobrevive al borrado con `id_usuario` a
			// NULL (ON DELETE SET NULL), pero conserva el correo en su propia
			// columna. Cancelar los datos personales incluye ese rastro: se
			// anonimiza para que no quede una lista de correos de gente que pidió
			// exactamente lo contrario.
			await client.query(
				'UPDATE logs_seguridad SET email = NULL, ip_address = NULL, user_agent = NULL WHERE id_usuario = $1',
				[userId]
			);

			await client.query('DELETE FROM usuarios WHERE id_usuario = $1', [userId]);

			await client.query('COMMIT');
		} catch (errorTransaccion) {
			await client.query('ROLLBACK').catch(() => {});
			throw errorTransaccion;
		} finally {
			client.release();
		}

		event.cookies.delete(cookieConfig.name, { path: cookieConfig.path });

		return json({ success: true });
	} catch (error) {
		if (esRespuestaDeAuth(error)) return error;
		console.error('Error al eliminar la cuenta:', error);
		return json({ error: 'Error al eliminar la cuenta' }, { status: 500 });
	}
};
