import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface CookieConsent {
	necessary: boolean; // Siempre true (requeridas)
	analytics: boolean; // Análisis y estadísticas
	marketing: boolean; // Publicidad (actualmente no usamos)
	preferences: boolean; // Preferencias de usuario
	consentGiven: boolean; // Si ya dio consentimiento
	consentDate: string | null; // Fecha del consentimiento
}

const CONSENT_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0'; // Para poder pedir nuevo consentimiento si cambian las políticas

function getStoredConsent(): CookieConsent | null {
	if (!browser) return null;

	const stored = localStorage.getItem(CONSENT_KEY);
	if (!stored) return null;

	try {
		const parsed = JSON.parse(stored);
		// Verificar que tenga la versión correcta
		if (parsed.version !== CONSENT_VERSION) {
			return null; // Pedir nuevo consentimiento si cambió la versión
		}
		return parsed.consent;
	} catch {
		return null;
	}
}

function createCookieConsentStore() {
	const storedConsent = getStoredConsent();

	const defaultConsent: CookieConsent = {
		necessary: true, // Siempre activas
		analytics: false,
		marketing: false,
		preferences: false,
		consentGiven: false,
		consentDate: null
	};

	const initialValue = storedConsent || defaultConsent;

	const { subscribe, set, update } = writable<CookieConsent>(initialValue);

	return {
		subscribe,

		// Aceptar todas las cookies
		acceptAll: () => {
			const consent: CookieConsent = {
				necessary: true,
				analytics: true,
				marketing: false, // No usamos marketing por ahora
				preferences: true,
				consentGiven: true,
				consentDate: new Date().toISOString()
			};

			if (browser) {
				localStorage.setItem(CONSENT_KEY, JSON.stringify({
					version: CONSENT_VERSION,
					consent
				}));
			}

			set(consent);
		},

		// Rechazar cookies opcionales (solo necesarias)
		rejectOptional: () => {
			const consent: CookieConsent = {
				necessary: true,
				analytics: false,
				marketing: false,
				preferences: false,
				consentGiven: true,
				consentDate: new Date().toISOString()
			};

			if (browser) {
				localStorage.setItem(CONSENT_KEY, JSON.stringify({
					version: CONSENT_VERSION,
					consent
				}));

				// Limpiar cookies opcionales si las rechaza
				// (mantener solo auth_token que es necesaria)
			}

			set(consent);
		},

		// Configuración personalizada
		setConsent: (consent: Partial<CookieConsent>) => {
			update(current => {
				const newConsent = {
					...current,
					...consent,
					necessary: true, // Las necesarias siempre activas
					consentGiven: true,
					consentDate: new Date().toISOString()
				};

				if (browser) {
					localStorage.setItem(CONSENT_KEY, JSON.stringify({
						version: CONSENT_VERSION,
						consent: newConsent
					}));
				}

				return newConsent;
			});
		},

		// Resetear consentimiento (para testing o cambio de políticas)
		reset: () => {
			if (browser) {
				localStorage.removeItem(CONSENT_KEY);
			}
			set(defaultConsent);
		}
	};
}

export const cookieConsentStore = createCookieConsentStore();
