import { sessionStore } from '$lib/stores/session';

/**
 * Cliente de API con intercepción de errores de autenticación.
 *
 * La autenticación viaja en la cookie httpOnly `auth_token`, que el navegador
 * envía automáticamente en cada petición al mismo origen. Ya no se manda el
 * encabezado `Authorization: Bearer`, porque eso obligaba a tener el token
 * accesible desde JavaScript.
 *
 * `credentials: 'same-origin'` se declara de forma explícita para que el
 * comportamiento no dependa del valor por omisión del navegador.
 */
export async function apiClient(url: string, options: RequestInit = {}): Promise<Response> {
	try {
		const response = await fetch(url, { credentials: 'same-origin', ...options });

		// Interceptar errores 401 (No autorizado)
		if (response.status === 401) {
			const data = await response.json().catch(() => ({}) as Record<string, string>);

			// Determinar el motivo de la sesión expirada
			let reason: 'replaced' | 'expired' = 'expired';

			const mensaje = (data?.error ?? '').toLowerCase();
			const motivo = (data?.motivo ?? '').toLowerCase();
			const texto = `${mensaje} ${motivo}`;

			// Si el backend indica que la sesión fue reemplazada por otra
			if (
				texto.includes('sesión reemplazada') ||
				texto.includes('sesion reemplazada') ||
				texto.includes('token reemplazado') ||
				texto.includes('otra sesión') ||
				texto.includes('otro dispositivo') ||
				texto.includes('sesión inactiva') ||
				texto.includes('sesion inactiva')
			) {
				reason = 'replaced';
			}

			// Mostrar el modal de sesión expirada
			sessionStore.showSessionExpired(reason);

			throw new Error(data?.error || 'Sesión expirada');
		}

		// Interceptar errores 403 (Prohibido) que también indican sesión inválida
		if (response.status === 403) {
			const data = await response.json().catch(() => ({}) as Record<string, string>);
			const mensaje = (data?.error ?? '').toLowerCase();

			if (
				mensaje.includes('token') ||
				mensaje.includes('sesión') ||
				mensaje.includes('sesion')
			) {
				sessionStore.showSessionExpired('expired');
				throw new Error(data?.error || 'Sesión expirada');
			}
		}

		return response;
	} catch (error) {
		// Error de red o servidor sin respuesta
		if (error instanceof TypeError && error.message === 'Failed to fetch') {
			throw new Error('Error de conexión. Verifica tu conexión a internet.');
		}
		throw error;
	}
}

/**
 * Los helpers conservan el segundo parámetro `token` por compatibilidad con
 * las páginas existentes, pero ya no se usa: la cookie httpOnly lo sustituye.
 */
export async function apiGet(url: string, _token?: string | null) {
	return apiClient(url, { method: 'GET' });
}

export async function apiPost(url: string, _token: string | null, body: any) {
	return apiClient(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function apiPut(url: string, _token: string | null, body: any) {
	return apiClient(url, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function apiDelete(url: string, _token?: string | null) {
	return apiClient(url, { method: 'DELETE' });
}
