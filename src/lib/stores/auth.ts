import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
	id: string;
	nombre: string;
	email: string;
	es_admin?: boolean;
}

/**
 * Estado de autenticación del cliente.
 *
 * El token de sesión ya NO se guarda aquí ni en localStorage: vive únicamente
 * en la cookie httpOnly que el navegador envía sola en cada petición al mismo
 * origen. Guardarlo en localStorage anulaba esa protección, porque cualquier
 * XSS (o una extensión, o un script de terceros comprometido) podía leerlo y
 * disponer de 4 horas de sesión completa.
 *
 * Lo que queda en localStorage es solo información de presentación (nombre,
 * email, si es admin) para pintar la interfaz sin esperar al servidor. No es
 * una credencial: la API verifica la identidad y el rol en cada petición.
 */

const CLAVE_USUARIO = 'user';

function leerUsuarioGuardado(): User | null {
	if (!browser) return null;

	try {
		const guardado = localStorage.getItem(CLAVE_USUARIO);
		return guardado ? (JSON.parse(guardado) as User) : null;
	} catch {
		// JSON corrupto: se descarta en lugar de romper el arranque de la app.
		localStorage.removeItem(CLAVE_USUARIO);
		return null;
	}
}

/**
 * Pide al service worker que vacíe Cache Storage al cerrar sesión.
 *
 * Las versiones anteriores del worker precacheaban páginas que solo se sirven
 * con sesión iniciada; en un dispositivo compartido esas copias sobrevivían al
 * logout. El worker nuevo ya no las guarda, pero este aviso limpia además lo
 * que quedara de instalaciones previas.
 */
function limpiarCacheDelServiceWorker() {
	try {
		navigator.serviceWorker?.controller?.postMessage({ tipo: 'limpiar-cache' });
	} catch {
		// Sin service worker activo no hay nada que limpiar.
	}
}

function limpiarTokenHeredado() {
	// Migración: elimina el token que las versiones anteriores dejaron guardado.
	if (browser) localStorage.removeItem('token');
}

function createAuthStore() {
	limpiarTokenHeredado();

	const initialUser = leerUsuarioGuardado();

	const { subscribe, set, update } = writable<{
		user: User | null;
		token: string | null;
		isAuthenticated: boolean;
	}>({
		user: initialUser,
		token: null,
		isAuthenticated: !!initialUser
	});

	return {
		subscribe,
		login: (user: User) => {
			if (browser) {
				localStorage.setItem(CLAVE_USUARIO, JSON.stringify(user));
				localStorage.removeItem('token');
			}
			set({
				user,
				token: null,
				isAuthenticated: true
			});
		},
		logout: () => {
			if (browser) {
				localStorage.removeItem(CLAVE_USUARIO);
				localStorage.removeItem('token');
				limpiarCacheDelServiceWorker();
			}
			set({
				user: null,
				token: null,
				isAuthenticated: false
			});
		},
		updateUser: (user: User) => {
			if (browser) {
				localStorage.setItem(CLAVE_USUARIO, JSON.stringify(user));
			}
			update((state) => ({ ...state, user }));
		}
	};
}

export const authStore = createAuthStore();
