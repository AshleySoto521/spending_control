import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// POST - Guardar o actualizar el consentimiento de cookies
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { analytics, marketing, preferences, consentDate } = await event.request.json();

		// Validación básica
		if (typeof analytics !== 'boolean' || typeof marketing !== 'boolean' || typeof preferences !== 'boolean') {
			return json({ error: 'Los valores de consentimiento deben ser booleanos' }, { status: 400 });
		}

		// Actualizar el consentimiento en la base de datos
		const result = await query(
			`UPDATE usuarios
			SET
				cookie_consent_analytics = $1,
				cookie_consent_marketing = $2,
				cookie_consent_preferences = $3,
				cookie_consent_date = $4
			WHERE id_usuario = $5
			RETURNING id_usuario`,
			[analytics, marketing, preferences, consentDate || new Date().toISOString(), userId]
		);

		if (result.rows.length === 0) {
			return json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Consentimiento de cookies guardado exitosamente'
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al guardar consentimiento de cookies:', error);
		return json({ error: 'Error al guardar consentimiento de cookies' }, { status: 500 });
	}
};

// GET - Obtener el consentimiento de cookies del usuario
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);

		const result = await query(
			`SELECT
				cookie_consent_analytics,
				cookie_consent_marketing,
				cookie_consent_preferences,
				cookie_consent_date
			FROM usuarios
			WHERE id_usuario = $1`,
			[userId]
		);

		if (result.rows.length === 0) {
			return json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		const consent = result.rows[0];

		return json({
			analytics: consent.cookie_consent_analytics || false,
			marketing: consent.cookie_consent_marketing || false,
			preferences: consent.cookie_consent_preferences || false,
			consentDate: consent.cookie_consent_date,
			consentGiven: !!consent.cookie_consent_date
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener consentimiento de cookies:', error);
		return json({ error: 'Error al obtener consentimiento de cookies' }, { status: 500 });
	}
};
