import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAdmin, esRespuestaDeAuth } from '$lib/server/middleware';
import { hashPassword } from '$lib/server/auth';
import { validarPassword } from '$lib/server/passwordPolicy';
import { esUuid } from '$lib/server/validacion';

// DELETE - Eliminar usuario (solo admin)
export const DELETE: RequestHandler = async (event) => {
	try {
		const adminId = await requireAdmin(event);
		const { id } = event.params;

		// `id_usuario` es UUID en la base: sin comprobarlo, un valor cualquiera
		// llega a PostgreSQL y el endpoint responde 500 en lugar de 400.
		if (!esUuid(id)) {
			return json({ error: 'Identificador de usuario inválido' }, { status: 400 });
		}

		// No permitir que el admin se elimine a sí mismo
		if (adminId === id) {
			return json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
		}

		// Verificar que el usuario existe
		const userCheck = await query('SELECT nombre, email FROM usuarios WHERE id_usuario = $1', [id]);

		if (userCheck.rows.length === 0) {
			return json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		// Eliminar usuario (CASCADE eliminará sus datos relacionados)
		await query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);

		return json({
			success: true,
			message: `Usuario ${userCheck.rows[0].nombre} eliminado correctamente`
		});
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
			return error;
		}
		console.error('Error al eliminar usuario:', error);
		return json({ error: 'Error al eliminar usuario' }, { status: 500 });
	}
};

// PATCH - Resetear contraseña o modificar usuario (solo admin)
export const PATCH: RequestHandler = async (event) => {
	try {
		const adminId = await requireAdmin(event);
		const { id } = event.params;

		// `id_usuario` es UUID en la base: sin comprobarlo, un valor cualquiera
		// llega a PostgreSQL y el endpoint responde 500 en lugar de 400.
		if (!esUuid(id)) {
			return json({ error: 'Identificador de usuario inválido' }, { status: 400 });
		}
		const body = await event.request.json();

		// Resetear contraseña
		if (body.resetPassword) {
			const nuevaPassword = body.nuevaPassword;

			const validacion = validarPassword(nuevaPassword);

			if (!validacion.valida) {
				return json({ error: validacion.error }, { status: 400 });
			}

			const passwordHash = await hashPassword(nuevaPassword);

			await query('UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2', [
				passwordHash,
				id
			]);

			// Invalidar todas las sesiones del usuario
			await query('UPDATE sesiones SET activa = FALSE WHERE id_usuario = $1', [id]);

			return json({
				success: true,
				message: 'Contraseña reseteada correctamente. El usuario deberá iniciar sesión nuevamente.'
			});
		}

		// Modificar estado activo del usuario
		if (body.activo !== undefined) {
			if (typeof body.activo !== 'boolean') {
				return json({ error: 'El estado activo debe ser booleano' }, { status: 400 });
			}

			// No permitir desactivar al admin actual
			if (adminId === id && !body.activo) {
				return json({ error: 'No puedes desactivarte a ti mismo' }, { status: 400 });
			}

			await query('UPDATE usuarios SET activo = $1 WHERE id_usuario = $2', [body.activo, id]);

			// Si se desactiva, cerrar sesiones
			if (!body.activo) {
				await query('UPDATE sesiones SET activa = FALSE WHERE id_usuario = $1', [id]);
			}

			return json({
				success: true,
				message: `Usuario ${body.activo ? 'activado' : 'desactivado'} correctamente`
			});
		}

		return json({ error: 'Acción no válida' }, { status: 400 });
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
			return error;
		}
		console.error('Error al modificar usuario:', error);
		return json({ error: 'Error al modificar usuario' }, { status: 500 });
	}
};
