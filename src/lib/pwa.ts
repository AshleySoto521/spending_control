import { browser } from '$app/environment';

export function registerServiceWorker() {
	if (!browser) return;

	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker
				.register('/service-worker.js')
				.then((registration) => {
					console.log('✅ Service Worker registrado:', registration.scope);

					// Verificar actualizaciones cada hora
					setInterval(() => {
						registration.update();
					}, 60 * 60 * 1000);
				})
				.catch((error) => {
					console.error('❌ Error al registrar Service Worker:', error);
				});
		});

		// Detectar cuando hay una nueva versión disponible
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			console.log('🔄 Nueva versión detectada, recargando...');
			window.location.reload();
		});
	}
}
