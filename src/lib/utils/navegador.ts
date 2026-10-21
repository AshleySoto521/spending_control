/**
 * Huecos de la API del navegador que TypeScript no cubre.
 *
 * Estas propiedades existen de verdad, pero no están en las definiciones
 * estándar: `standalone` es una extensión de Safari, y el evento de instalación
 * de PWA solo lo implementan los navegadores basados en Chromium. Declararlas
 * aquí una vez evita repartir `as any` por media aplicación, que además apaga
 * la comprobación de tipos de todo lo que toca.
 */

interface NavigatorSafari extends Navigator {
	/** Safari en iOS: `true` cuando la página corre como PWA instalada. */
	standalone?: boolean;
}

/** ¿La aplicación se está ejecutando instalada, fuera del navegador? */
export function estaInstalada(): boolean {
	if (typeof window === 'undefined') return false;

	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as NavigatorSafari).standalone === true
	);
}

/** ¿Es un dispositivo iOS? Safari es el único motor permitido allí. */
export function esIOS(): boolean {
	if (typeof window === 'undefined') return false;

	// `MSStream` descarta Internet Explorer en Windows Phone, que también
	// declaraba «iPhone» en su user agent.
	const conMSStream = window as Window & { MSStream?: unknown };

	return /iPhone|iPad|iPod/.test(navigator.userAgent) && !conMSStream.MSStream;
}

/**
 * Evento de instalación de PWA. No está en las definiciones estándar porque
 * solo lo implementan los navegadores basados en Chromium.
 */
export interface EventoInstalacion extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
