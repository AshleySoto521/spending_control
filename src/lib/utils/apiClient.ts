import { sessionStore } from '$lib/stores/session';
import { authStore } from '$lib/stores/auth';
import { goto } from '$app/navigation';

/**
 * Cliente de API personalizado que intercepta errores de autenticación
 */
export async function apiClient(
	url: string,
	options: RequestInit = {}
): Promise<Response> {
	try {
		const response = await fetch(url, options);

		// Interceptar errores 401 (No autorizado)
		if (response.status === 401) {
			const data = await response.json().catch(() => ({}));

			// Determinar el motivo de la sesión expirada
			let reason: 'replaced' | 'expired' = 'expired';

			// Si el mensaje del backend indica que el token fue reemplazado
			if (
				data.error?.toLowerCase().includes('sesión reemplazada') ||
				data.error?.toLowerCase().includes('sesion reemplazada') ||
				data.error?.toLowerCase().includes('token reemplazado') ||
				data.error?.toLowerCase().includes('otra sesión') ||
				data.error?.toLowerCase().includes('otro dispositivo')
			) {
				reason = 'replaced';
			}

			// Mostrar el modal de sesión expirada
			sessionStore.showSessionExpired(reason);

			// Retornar una respuesta de error
			throw new Error(data.error || 'Sesión expirada');
		}

		// Interceptar errores 403 (Prohibido) - también puede indicar token inválido
		if (response.status === 403) {
			const data = await response.json().catch(() => ({}));

			if (
				data.error?.toLowerCase().includes('token') ||
				data.error?.toLowerCase().includes('sesión') ||
				data.error?.toLowerCase().includes('sesion')
			) {
				sessionStore.showSessionExpired('expired');
				throw new Error(data.error || 'Sesión expirada');
			}
		}

		return response;
	} catch (error) {
		// Si es un error de red o el servidor no responde
		if (error instanceof TypeError && error.message === 'Failed to fetch') {
			throw new Error('Error de conexión. Verifica tu conexión a internet.');
		}
		throw error;
	}
}

/**
 * Helper para hacer peticiones GET
 */
export async function apiGet(url: string, token: string | null) {
	return apiClient(url, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
}

/**
 * Helper para hacer peticiones POST
 */
export async function apiPost(url: string, token: string | null, body: any) {
	return apiClient(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
}

/**
 * Helper para hacer peticiones PUT
 */
export async function apiPut(url: string, token: string | null, body: any) {
	return apiClient(url, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
}

/**
 * Helper para hacer peticiones DELETE
 */
export async function apiDelete(url: string, token: string | null) {
	return apiClient(url, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
}
