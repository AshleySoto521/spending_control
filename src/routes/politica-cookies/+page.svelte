<script lang="ts">
	import { cookieConsentStore } from '$lib/stores/cookieConsent';
	import { goto } from '$app/navigation';

	let showResetConfirm = $state(false);

	function handleResetConsent() {
		if (confirm('¿Estás seguro de que quieres restablecer tus preferencias de cookies? Se te volverá a mostrar el banner.')) {
			cookieConsentStore.reset();
			showResetConfirm = true;
			setTimeout(() => {
				window.location.reload();
			}, 2000);
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'No establecido';
		return new Date(dateString).toLocaleDateString('es-MX', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Política de Cookies | ControlGastosMX</title>
	<meta name="description" content="Información sobre el uso de cookies en ControlGastosMX. Conoce qué cookies utilizamos y cómo gestionar tus preferencias." />
	<meta name="robots" content="index, follow" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<nav class="bg-white border-b border-gray-200">
		<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex items-center justify-between">
				<a href="/" class="text-xl font-bold text-gray-900">
					ControlGastosMX
				</a>
				<a
					href="/"
					class="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
					</svg>
					Volver al inicio
				</a>
			</div>
		</div>
	</nav>

	<!-- Contenido -->
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
			<!-- Título -->
			<div class="mb-8">
				<div class="text-5xl mb-4">🍪</div>
				<h1 class="text-4xl font-bold text-gray-900 mb-4">
					Política de Cookies
				</h1>
				<p class="text-gray-600">
					Última actualización: 14 de diciembre de 2025
				</p>
			</div>

			<!-- Tus preferencias actuales -->
			{#if $cookieConsentStore.consentGiven}
				<div class="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
					<h2 class="text-lg font-bold text-gray-900 mb-4">Tus Preferencias Actuales</h2>
					<div class="space-y-3 text-sm">
						<div class="flex items-center justify-between">
							<span class="text-gray-700">Cookies Necesarias:</span>
							<span class="font-bold text-green-600">✓ Activas</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-700">Cookies de Preferencias:</span>
							<span class="font-bold" class:text-green-600={$cookieConsentStore.preferences} class:text-gray-400={!$cookieConsentStore.preferences}>
								{$cookieConsentStore.preferences ? '✓ Activas' : '✗ Desactivadas'}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-700">Cookies de Análisis:</span>
							<span class="font-bold" class:text-green-600={$cookieConsentStore.analytics} class:text-gray-400={!$cookieConsentStore.analytics}>
								{$cookieConsentStore.analytics ? '✓ Activas' : '✗ Desactivadas'}
							</span>
						</div>
						<div class="pt-3 border-t border-blue-200">
							<span class="text-xs text-gray-600">
								Consentimiento otorgado: {formatDate($cookieConsentStore.consentDate)}
							</span>
						</div>
					</div>
					<button
						onclick={handleResetConsent}
						class="mt-4 w-full px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors text-sm"
					>
						Cambiar Preferencias
					</button>
				</div>
			{/if}

			<!-- Contenido de la política -->
			<div class="prose prose-gray max-w-none">
				<!-- Introducción -->
				<section class="mb-8">
					<h2 class="text-2xl font-bold text-gray-900 mb-4">1. ¿Qué son las cookies?</h2>
					<p class="text-gray-700 leading-relaxed mb-4">
						Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (computadora, tablet o móvil)
						cuando visitas un sitio web. Se utilizan ampliamente para hacer que los sitios web funcionen de manera más eficiente
						y proporcionar información a los propietarios del sitio.
					</p>
				</section>

				<!-- Tipos de cookies que usamos -->
				<section class="mb-8">
					<h2 class="text-2xl font-bold text-gray-900 mb-4">2. Cookies que utilizamos</h2>

					<div class="space-y-6">
						<!-- Cookies Necesarias -->
						<div class="p-6 bg-gray-50 rounded-lg border border-gray-200">
							<div class="flex items-center gap-2 mb-3">
								<h3 class="text-xl font-bold text-gray-900">Cookies Necesarias</h3>
								<span class="text-xs bg-gray-900 text-white px-3 py-1 rounded-full font-semibold">Obligatorias</span>
							</div>
							<p class="text-gray-700 mb-4">
								Estas cookies son esenciales para el funcionamiento de la aplicación y no se pueden desactivar.
							</p>
							<div class="bg-white p-4 rounded border border-gray-200">
								<table class="w-full text-sm">
									<thead class="text-left text-xs text-gray-500 uppercase">
										<tr>
											<th class="pb-2">Cookie</th>
											<th class="pb-2">Propósito</th>
											<th class="pb-2">Duración</th>
										</tr>
									</thead>
									<tbody class="text-gray-700">
										<tr class="border-t border-gray-100">
											<td class="py-3 font-mono text-xs">auth_token</td>
											<td class="py-3">Autenticación de sesión</td>
											<td class="py-3">7 días</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<!-- Cookies de Preferencias -->
						<div class="p-6 bg-gray-50 rounded-lg border border-gray-200">
							<div class="flex items-center gap-2 mb-3">
								<h3 class="text-xl font-bold text-gray-900">Cookies de Preferencias</h3>
								<span class="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">Opcionales</span>
							</div>
							<p class="text-gray-700 mb-4">
								Permiten recordar tus preferencias y configuraciones personales para mejorar tu experiencia.
							</p>
							<div class="bg-white p-4 rounded border border-gray-200">
								<div class="text-sm text-gray-700 space-y-3">
									<div class="flex items-start gap-2">
										<span class="text-gray-400">•</span>
										<div>
											<span class="font-semibold">localStorage:</span> user, token, savedLoginEmail, hasSeenWelcome
										</div>
									</div>
									<div class="flex items-start gap-2">
										<span class="text-gray-400">•</span>
										<div>
											<span class="font-semibold">Propósito:</span> Guardar configuraciones de usuario y preferencias de la aplicación
										</div>
									</div>
									<div class="flex items-start gap-2">
										<span class="text-gray-400">•</span>
										<div>
											<span class="font-semibold">Duración:</span> Permanente (hasta que borres el navegador)
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- PWA / Service Worker -->
						<div class="p-6 bg-gray-50 rounded-lg border border-gray-200">
							<div class="flex items-center gap-2 mb-3">
								<h3 class="text-xl font-bold text-gray-900">Caché y Almacenamiento PWA</h3>
								<span class="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">Funcional</span>
							</div>
							<p class="text-gray-700 mb-4">
								Si instalas la aplicación como PWA (Progressive Web App), utilizamos Service Workers para:
							</p>
							<ul class="text-sm text-gray-700 space-y-2 list-disc list-inside">
								<li>Permitir que la app funcione sin conexión a internet</li>
								<li>Cachear recursos para carga más rápida</li>
								<li>Sincronizar datos cuando vuelvas a tener conexión</li>
							</ul>
						</div>

						<!-- Cookies de Análisis (futuro) -->
						<div class="p-6 bg-gray-50 rounded-lg border border-gray-200 opacity-75">
							<div class="flex items-center gap-2 mb-3">
								<h3 class="text-xl font-bold text-gray-900">Cookies de Análisis</h3>
								<span class="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full font-semibold">Próximamente</span>
							</div>
							<p class="text-gray-700">
								En el futuro, podríamos utilizar herramientas como Google Analytics para entender cómo se usa la aplicación
								y mejorar la experiencia. Si implementamos estas cookies, actualizaremos esta política y te pediremos tu consentimiento.
							</p>
						</div>
					</div>
				</section>

				<!-- Cómo gestionar cookies -->
				<section class="mb-8">
					<h2 class="text-2xl font-bold text-gray-900 mb-4">3. Cómo gestionar tus cookies</h2>
					<p class="text-gray-700 leading-relaxed mb-4">
						Puedes controlar y/o eliminar las cookies como desees. Puedes eliminar todas las cookies que ya están
						en tu computadora y puedes configurar la mayoría de los navegadores para evitar que se coloquen.
					</p>

					<div class="space-y-4">
						<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
							<h4 class="font-bold text-gray-900 mb-2">Desde esta página:</h4>
							<p class="text-sm text-gray-700">
								Puedes usar el botón "Cambiar Preferencias" arriba para modificar tus preferencias en cualquier momento.
							</p>
						</div>

						<div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
							<h4 class="font-bold text-gray-900 mb-2">Desde tu navegador:</h4>
							<ul class="text-sm text-gray-700 space-y-2 list-disc list-inside">
								<li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
								<li><strong>Firefox:</strong> Preferencias → Privacidad y seguridad → Cookies y datos del sitio</li>
								<li><strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos de sitios web</li>
								<li><strong>Edge:</strong> Configuración → Cookies y permisos del sitio</li>
							</ul>
						</div>
					</div>

					<div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
						<p class="text-sm text-yellow-800">
							<strong>⚠️ Importante:</strong> Si desactivas las cookies necesarias, no podrás iniciar sesión ni usar la aplicación correctamente.
						</p>
					</div>
				</section>

				<!-- Marco legal -->
				<section class="mb-8">
					<h2 class="text-2xl font-bold text-gray-900 mb-4">4. Marco Legal</h2>
					<p class="text-gray-700 leading-relaxed mb-4">
						Esta política de cookies cumple con:
					</p>
					<ul class="text-gray-700 space-y-2 list-disc list-inside">
						<li><strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> - México</li>
						<li><strong>Reglamento General de Protección de Datos (GDPR)</strong> - Unión Europea</li>
						<li><strong>Ley de Cookies</strong> - Directiva 2009/136/CE</li>
					</ul>
				</section>

				<!-- Actualizaciones -->
				<section class="mb-8">
					<h2 class="text-2xl font-bold text-gray-900 mb-4">5. Actualizaciones de esta política</h2>
					<p class="text-gray-700 leading-relaxed">
						Podemos actualizar esta Política de Cookies ocasionalmente para reflejar cambios en las cookies que utilizamos
						o por otras razones operativas, legales o reglamentarias. Si realizamos cambios significativos, te pediremos
						que revises y aceptes la nueva política.
					</p>
				</section>

				<!-- Contacto -->
				<section class="p-6 bg-gray-900 text-white rounded-lg">
					<h2 class="text-2xl font-bold mb-4">¿Tienes dudas?</h2>
					<p class="text-gray-300 mb-4">
						Si tienes preguntas sobre esta Política de Cookies o sobre cómo manejamos tus datos, contáctanos:
					</p>
					<a
						href="mailto:contactoaquastudio@gmail.com"
						class="inline-block text-white underline hover:text-gray-200 font-medium"
					>
						contactoaquastudio@gmail.com
					</a>
				</section>
			</div>
		</div>

		<!-- Enlaces relacionados -->
		<div class="mt-8 text-center text-sm text-gray-600">
			<p class="mb-2">También te puede interesar:</p>
			<div class="flex justify-center gap-4">
				<a href="/terminos" class="underline hover:text-gray-900">Términos y Condiciones</a>
				<span>•</span>
				<a href="/privacidad" class="underline hover:text-gray-900">Aviso de Privacidad</a>
			</div>
		</div>
	</div>

	{#if showResetConfirm}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-xl p-6 max-w-sm">
				<div class="text-center">
					<div class="text-4xl mb-4">✅</div>
					<h3 class="text-xl font-bold text-gray-900 mb-2">Preferencias Restablecidas</h3>
					<p class="text-gray-600">La página se recargará para aplicar los cambios...</p>
				</div>
			</div>
		</div>
	{/if}
</div>
