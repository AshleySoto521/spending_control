<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	let estado = $state<'verificando' | 'listo' | 'error'>('verificando');
	let mensaje = $state('');

	onMount(async () => {
		const token = page.url.searchParams.get('t') ?? '';

		if (!token) {
			estado = 'error';
			mensaje = 'El enlace está incompleto. Ábrelo de nuevo desde el correo.';
			return;
		}

		try {
			const respuesta = await fetch('/api/auth/verificar-email', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token })
			});

			if (respuesta.ok) {
				estado = 'listo';
				return;
			}

			const datos = await respuesta.json().catch(() => ({}));
			mensaje = datos.error ?? 'No pudimos confirmar tu correo.';
			estado = 'error';
		} catch {
			mensaje = 'No pudimos conectar con el servidor. Inténtalo de nuevo.';
			estado = 'error';
		}
	});
</script>

<svelte:head>
	<title>Confirmar correo · Control de Gastos</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
	<div class="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
		{#if estado === 'verificando'}
			<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800 mx-auto mb-4"></div>
			<p class="text-gray-600">Confirmando tu correo…</p>
		{:else if estado === 'listo'}
			<h1 class="text-2xl font-bold text-gray-900 mb-3">Correo confirmado</h1>
			<p class="text-gray-700 mb-6">
				Listo. Si alguna vez olvidas tu contraseña, podremos devolverte el acceso a
				esta dirección.
			</p>
			<a
				href="/dashboard"
				class="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800"
			>
				Ir a mi cuenta
			</a>
		{:else}
			<h1 class="text-2xl font-bold text-gray-900 mb-3">No pudimos confirmarlo</h1>
			<p class="text-gray-700 mb-2">{mensaje}</p>
			<p class="text-sm text-gray-600 mb-6">
				Los enlaces caducan a las 48 horas y solo sirven una vez. Puedes pedir uno nuevo
				desde tu perfil.
			</p>
			<a href="/perfil" class="text-gray-900 font-semibold hover:underline">Ir a mi perfil</a>
		{/if}
	</div>
</div>
