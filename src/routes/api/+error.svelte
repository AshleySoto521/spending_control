<script lang="ts">
	import { page } from '$app/stores';
	import { json } from '@sveltejs/kit';

	// Las rutas de API deben devolver JSON, no HTML
	// Pero en caso de que se acceda directamente desde el navegador,
	// mostramos un mensaje amigable

	$: status = $page.status;
	$: errorMessage = $page.error?.message || 'Error en la API';
</script>

<svelte:head>
	<title>{status} - Error API | Control de Gastos</title>
</svelte:head>

<div class="min-h-screen bg-gray-900 flex items-center justify-center px-4">
	<div class="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
		<div class="text-6xl mb-4">🔌</div>
		<h1 class="text-2xl font-bold text-white mb-4">API Error</h1>
		<p class="text-gray-400 mb-2">Código de estado: <span class="text-white font-mono">{status}</span></p>
		<p class="text-gray-400 mb-6 text-sm">{errorMessage}</p>

		<div class="bg-gray-900 rounded p-4 mb-6">
			<p class="text-xs text-gray-500 font-mono text-left">
				GET /api/[endpoint]
			</p>
			<p class="text-xs text-gray-400 mt-2 text-left">
				Esta es una ruta de API y debe ser consumida mediante peticiones HTTP, no accedida directamente desde el navegador.
			</p>
		</div>

		<a
			href="/dashboard"
			class="inline-block bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
		>
			Volver al Dashboard
		</a>
	</div>
</div>
