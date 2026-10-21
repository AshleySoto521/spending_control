<script lang="ts">
	import { page } from '$app/state';

	// Estados posibles de la pantalla.
	let estado = $state<'confirmar' | 'enviando' | 'listo' | 'error'>('confirmar');
	let mensajeError = $state('');

	const idUsuario = $derived(page.url.searchParams.get('u') ?? '');
	const token = $derived(page.url.searchParams.get('t') ?? '');
	const enlaceCompleto = $derived(idUsuario !== '' && token !== '');

	/**
	 * La baja se confirma con un clic, no al abrir el enlace.
	 * Los clientes de correo y los filtros antispam visitan los enlaces por su
	 * cuenta para analizarlos; si esto fuera un GET, esas visitas darían de baja
	 * a gente que nunca lo pidió.
	 */
	async function darDeBaja() {
		estado = 'enviando';

		try {
			const respuesta = await fetch('/api/recordatorios/baja', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ u: idUsuario, t: token })
			});

			if (respuesta.ok) {
				estado = 'listo';
				return;
			}

			const datos = await respuesta.json().catch(() => ({}));
			mensajeError = datos.error ?? 'No pudimos procesar la solicitud.';
			estado = 'error';
		} catch {
			mensajeError = 'No pudimos conectar con el servidor. Inténtalo de nuevo.';
			estado = 'error';
		}
	}
</script>

<svelte:head>
	<title>Recordatorios por correo · Control de Gastos</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
	<div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
		{#if !enlaceCompleto}
			<h1 class="text-2xl font-bold text-gray-900 mb-3">Enlace incompleto</h1>
			<p class="text-gray-700">
				El enlace que abriste no trae toda la información. Abre de nuevo el que viene al final del
				correo de recordatorio.
			</p>
		{:else if estado === 'listo'}
			<h1 class="text-2xl font-bold text-gray-900 mb-3">Listo</h1>
			<p class="text-gray-700 mb-4">No volveremos a enviarte recordatorios de inactividad.</p>
			<p class="text-sm text-gray-600 mb-6">
				Seguirás recibiendo los correos necesarios para tu cuenta, como el de recuperación de
				contraseña. Tu información y tus movimientos no se han modificado.
			</p>
			<a href="/login" class="text-gray-900 font-semibold hover:underline">
				Ir a Control de Gastos
			</a>
		{:else if estado === 'error'}
			<h1 class="text-2xl font-bold text-gray-900 mb-3">No se pudo completar</h1>
			<p class="text-gray-700 mb-6">{mensajeError}</p>
			<button
				onclick={darDeBaja}
				class="bg-gray-900 text-white px-5 py-2 rounded-lg font-semibold hover:bg-gray-800"
			>
				Intentar de nuevo
			</button>
		{:else}
			<h1 class="text-2xl font-bold text-gray-900 mb-3">Dejar de recibir recordatorios</h1>
			<p class="text-gray-700 mb-4">
				Dejaremos de escribirte cuando pasen varios días sin que entres a la aplicación.
			</p>
			<p class="text-sm text-gray-600 mb-6">
				Esto no cancela tu cuenta ni borra nada. Los correos imprescindibles, como el de
				recuperación de contraseña, los seguirás recibiendo.
			</p>
			<button
				onclick={darDeBaja}
				disabled={estado === 'enviando'}
				class="bg-gray-900 text-white px-5 py-2 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-60"
			>
				{estado === 'enviando' ? 'Procesando…' : 'Confirmar baja'}
			</button>
		{/if}
	</div>
</div>
