<script lang="ts">
	import { cookieConsentStore } from '$lib/stores/cookieConsent';
	import { slide } from 'svelte/transition';

	let showBanner = $state(!$cookieConsentStore.consentGiven);
	let showSettings = $state(false);

	// Preferencias individuales (para el modal de configuración)
	let preferences = $state({
		analytics: false,
		marketing: false,
		preferences: true
	});

	function handleAcceptAll() {
		cookieConsentStore.acceptAll();
		showBanner = false;
	}

	function handleRejectOptional() {
		cookieConsentStore.rejectOptional();
		showBanner = false;
	}

	function handleSavePreferences() {
		cookieConsentStore.setConsent(preferences);
		showSettings = false;
		showBanner = false;
	}

	function toggleSettings() {
		showSettings = !showSettings;
	}
</script>

{#if showBanner}
	<div
		class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl"
		transition:slide={{ duration: 300 }}
	>
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			{#if !showSettings}
				<!-- Banner Simple -->
				<div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
					<div class="flex-1">
						<div class="flex items-start gap-3">
							<span class="text-2xl">🍪</span>
							<div>
								<h3 class="text-lg font-bold text-gray-900 mb-2">
									Uso de Cookies
								</h3>
								<p class="text-sm text-gray-600 leading-relaxed">
									Utilizamos cookies esenciales para el funcionamiento de la aplicación (autenticación y sesión)
									y cookies opcionales para mejorar tu experiencia. Puedes aceptar todas o personalizar tus preferencias.
									<a href="/politica-cookies" class="text-gray-900 underline hover:text-gray-700 font-medium ml-1">
										Ver Política de Cookies
									</a>
								</p>
							</div>
						</div>
					</div>

					<div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
						<button
							onclick={toggleSettings}
							class="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
						>
							⚙️ Configurar
						</button>
						<button
							onclick={handleRejectOptional}
							class="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
						>
							Rechazar Opcionales
						</button>
						<button
							onclick={handleAcceptAll}
							class="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg text-sm"
						>
							Aceptar Todas
						</button>
					</div>
				</div>
			{:else}
				<!-- Panel de Configuración -->
				<div class="space-y-4">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-bold text-gray-900">Configuración de Cookies</h3>
						<button
							onclick={toggleSettings}
							class="text-gray-500 hover:text-gray-700"
							aria-label="Cerrar configuración"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
							</svg>
						</button>
					</div>

					<!-- Cookies Necesarias (siempre activas) -->
					<div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<h4 class="font-bold text-gray-900">Cookies Necesarias</h4>
								<span class="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-semibold">Siempre activas</span>
							</div>
							<p class="text-sm text-gray-600">
								Esenciales para el funcionamiento de la aplicación: autenticación, sesión y seguridad.
							</p>
						</div>
						<div class="ml-4">
							<div class="w-12 h-6 bg-gray-900 rounded-full flex items-center px-1">
								<div class="w-4 h-4 bg-white rounded-full ml-auto"></div>
							</div>
						</div>
					</div>

					<!-- Cookies de Preferencias -->
					<div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
						<div class="flex-1">
							<h4 class="font-bold text-gray-900 mb-1">Cookies de Preferencias</h4>
							<p class="text-sm text-gray-600">
								Guardan tus preferencias como idioma, email guardado en login y configuraciones personalizadas.
							</p>
						</div>
						<div class="ml-4">
							<button
								onclick={() => preferences.preferences = !preferences.preferences}
								class="w-12 h-6 rounded-full flex items-center px-1 transition-colors"
								class:bg-gray-900={preferences.preferences}
								class:bg-gray-300={!preferences.preferences}
								aria-label="Toggle preferencias"
							>
								<div
									class="w-4 h-4 bg-white rounded-full transition-transform"
									class:ml-auto={preferences.preferences}
								></div>
							</button>
						</div>
					</div>

					<!-- Cookies de Análisis (futuro) -->
					<div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<h4 class="font-bold text-gray-900">Cookies de Análisis</h4>
								<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Próximamente</span>
							</div>
							<p class="text-sm text-gray-600">
								Nos ayudarán a entender cómo usas la app para mejorar tu experiencia (Google Analytics, etc.).
							</p>
						</div>
						<div class="ml-4">
							<button
								disabled
								class="w-12 h-6 bg-gray-300 rounded-full flex items-center px-1 opacity-50 cursor-not-allowed"
								aria-label="Análisis deshabilitado"
							>
								<div class="w-4 h-4 bg-white rounded-full"></div>
							</button>
						</div>
					</div>

					<!-- Botones de acción -->
					<div class="flex flex-col sm:flex-row gap-3 pt-4">
						<button
							onclick={handleRejectOptional}
							class="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors"
						>
							Rechazar Opcionales
						</button>
						<button
							onclick={handleSavePreferences}
							class="flex-1 px-6 py-2.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg"
						>
							Guardar Preferencias
						</button>
					</div>

					<p class="text-xs text-gray-500 text-center pt-2">
						Puedes cambiar tus preferencias en cualquier momento desde la
						<a href="/politica-cookies" class="underline hover:text-gray-700">Política de Cookies</a>.
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Animación suave para el toggle */
	button[aria-label*="Toggle"] {
		transition: background-color 0.2s ease;
	}
</style>
