import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, esRespuestaDeAuth } from '$lib/server/middleware';
import { listarNotificaciones, marcarLeidas } from '$lib/server/notificaciones';
import { idEntero } from '$lib/server/validacion';

/** Avisos de la persona, sin leer primero. */
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		return json(await listarNotificaciones(userId));
	} catch (error) {
		if (esRespuestaDeAuth(error)) return error;
		console.error('Error al listar notificaciones:', error);
		return json({ error: 'Error al obtener las notificaciones' }, { status: 500 });
	}
};

/**
 * Marca como leídas. Sin cuerpo, marca todas; con `{ id }`, solo esa.
 *
 * El `id_usuario` va en el WHERE de la consulta, no solo comprobado antes: así
 * no se puede marcar la notificación de otra persona ni enviando su id.
 */
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const body = await event.request.json().catch(() => ({}));
		const id = body?.id === undefined ? undefined : idEntero(body.id);

		if (body?.id !== undefined && id === null) {
			return json({ error: 'Identificador inválido' }, { status: 400 });
		}

		return json({ success: true, marcadas: await marcarLeidas(userId, id ?? undefined) });
	} catch (error) {
		if (esRespuestaDeAuth(error)) return error;
		console.error('Error al marcar notificaciones:', error);
		return json({ error: 'Error al actualizar las notificaciones' }, { status: 500 });
	}
};
