import { writable } from 'svelte/store';

export interface SessionState {
	showExpiredModal: boolean;
	reason: 'replaced' | 'expired' | null;
}

function createSessionStore() {
	const { subscribe, set, update } = writable<SessionState>({
		showExpiredModal: false,
		reason: null
	});

	return {
		subscribe,
		showSessionExpired: (reason: 'replaced' | 'expired' = 'expired') => {
			set({
				showExpiredModal: true,
				reason
			});
		},
		hideSessionExpired: () => {
			set({
				showExpiredModal: false,
				reason: null
			});
		}
	};
}

export const sessionStore = createSessionStore();
