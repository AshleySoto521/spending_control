import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
	id: string;
	nombre: string;
	email: string;
	es_admin?: boolean;
}

function createAuthStore() {
	const storedUser = browser ? localStorage.getItem('user') : null;
	const initialUser = storedUser ? JSON.parse(storedUser) : null;
	const storedToken = browser ? localStorage.getItem('token') : null;

	const { subscribe, set, update } = writable<{
		user: User | null;
		token: string | null;
		isAuthenticated: boolean;
	}>({
		user: initialUser,
		token: storedToken,
		isAuthenticated: !!initialUser
	});

	return {
		subscribe,
		login: (user: User, token: string) => {
			if (browser) {
				localStorage.setItem('user', JSON.stringify(user));
				localStorage.setItem('token', token);
			}
			set({
				user,
				token,
				isAuthenticated: true
			});
		},
		logout: () => {
			if (browser) {
				localStorage.removeItem('user');
				localStorage.removeItem('token');
			}
			set({
				user: null,
				token: null,
				isAuthenticated: false
			});
		},
		updateUser: (user: User) => {
			if (browser) {
				localStorage.setItem('user', JSON.stringify(user));
			}
			update((state) => ({ ...state, user }));
		}
	};
}

export const authStore = createAuthStore();
