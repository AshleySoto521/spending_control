<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	// Obtener información del error
	$: status = $page.status;
	$: errorMessage = $page.error?.message || 'Ha ocurrido un error inesperado';

	// Configurar mensajes según el código de error
	$: errorConfig = getErrorConfig(status);

	function getErrorConfig(code: number) {
		switch (code) {
			case 404:
				return {
					title: 'Página No Encontrada',
					message: 'La página que buscas no existe o fue movida.',
					icon: '🔍',
					suggestion: 'Verifica la URL o regresa al inicio para continuar.'
				};
			case 403:
				return {
					title: 'Acceso Denegado',
					message: 'No tienes permisos para acceder a esta página.',
					icon: '🔒',
					suggestion: 'Si crees que esto es un error, contacta al administrador.'
				};
			case 401:
				return {
					title: 'Sesión Expirada',
					message: 'Tu sesión ha expirado o no has iniciado sesión.',
					icon: '⏱️',
					suggestion: 'Inicia sesión nuevamente para continuar.'
				};
			case 500:
				return {
					title: 'Error del Servidor',
					message: 'Ocurrió un problema en nuestros servidores.',
					icon: '⚠️',
					suggestion: 'Estamos trabajando para resolverlo. Intenta nuevamente en unos minutos.'
				};
			case 503:
				return {
					title: 'Servicio No Disponible',
					message: 'El servicio está temporalmente no disponible.',
					icon: '🛠️',
					suggestion: 'Estamos realizando mantenimiento. Regresa pronto.'
				};
			default:
				return {
					title: 'Error',
					message: 'Ha ocurrido un error inesperado.',
					icon: '❌',
					suggestion: 'Intenta recargar la página o regresa al inicio.'
				};
		}
	}

	function handleGoHome() {
		goto('/');
	}

	function handleGoDashboard() {
		goto('/dashboard');
	}

	function handleReload() {
		window.location.reload();
	}

	function handleGoBack() {
		window.history.back();
	}
</script>

<svelte:head>
	<title>{status} - {errorConfig.title} | Control de Gastos</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
	<div class="max-w-2xl w-full">
		<!-- Tarjeta de Error -->
		<div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 md:p-12 text-center">
			<!-- Ícono y Código de Error -->
			<div class="mb-6">
				<div class="text-6xl mb-4">{errorConfig.icon}</div>
				<div class="text-8xl font-bold text-gray-900 mb-2">{status}</div>
			</div>

			<!-- Título del Error -->
			<h1 class="text-3xl font-bold text-gray-900 mb-4">
				{errorConfig.title}
			</h1>

			<!-- Mensaje Principal -->
			<p class="text-lg text-gray-600 mb-4">
				{errorConfig.message}
			</p>

			<!-- Sugerencia -->
			<p class="text-sm text-gray-500 mb-8">
				{errorConfig.suggestion}
			</p>

			<!-- Mensaje técnico (si existe) -->
			{#if errorMessage && status !== 404}
				<div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8 text-left">
					<p class="text-xs font-medium text-gray-500 uppercase mb-2">Detalles técnicos:</p>
					<p class="text-sm text-gray-700 font-mono break-words">{errorMessage}</p>
				</div>
			{/if}

			<!-- Botones de Acción -->
			<div class="flex flex-col sm:flex-row gap-3 justify-center">
				{#if status === 401}
					<!-- Para sesión expirada, botón de login -->
					<a
						href="/login"
						class="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
						</svg>
						Iniciar Sesión
					</a>
				{:else}
					<!-- Botones normales para otros errores -->
					<button
						onclick={handleGoDashboard}
						class="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
						</svg>
						Ir al Dashboard
					</button>

					<button
						onclick={handleGoHome}
						class="bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors inline-flex items-center justify-center gap-2"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
						</svg>
						Volver al Inicio
					</button>
				{/if}
			</div>

			<!-- Botones secundarios -->
			<div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
				<button
					onclick={handleGoBack}
					class="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors inline-flex items-center justify-center gap-1"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
					</svg>
					Página Anterior
				</button>

				{#if status >= 500}
					<button
						onclick={handleReload}
						class="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors inline-flex items-center justify-center gap-1"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
						</svg>
						Recargar Página
					</button>
				{/if}
			</div>
		</div>

		<!-- Información de Ayuda -->
		<div class="mt-8 text-center">
			<p class="text-sm text-gray-500">
				¿Necesitas ayuda?
				<a href="mailto:soporte@controldegastos.com" class="text-gray-700 hover:text-gray-900 font-medium underline">
					Contacta a soporte
				</a>
			</p>
		</div>

		<!-- Logo/Nombre de la App -->
		<div class="mt-8 text-center">
			<a href="/" class="inline-block">
				<h2 class="text-xl font-bold text-gray-800">Control de Gastos</h2>
				<p class="text-xs text-gray-500 mt-1">Tu finanzas bajo control</p>
			</a>
		</div>
	</div>
</div>

<style>
	.btn-primary {
		background-color: #1f2937;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 600;
		transition: all 0.2s;
	}

	.btn-primary:hover {
		background-color: #374151;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}
</style>
