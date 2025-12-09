<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { sessionStore } from '$lib/stores/session';

	interface Props {
		reason: 'replaced' | 'expired';
	}

	let { reason = 'replaced' }: Props = $props();

	function handleGoToLogin() {
		// Ocultar el modal
		sessionStore.hideSessionExpired();
		// Limpiar el store de autenticación
		authStore.logout();
		// Redirigir al login
		goto('/login');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleGoToLogin();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<!-- Modal Overlay -->
<div
	class="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
	onclick={handleGoToLogin}
	role="button"
	tabindex="-1"
>
	<!-- Modal Content -->
	<div
		class="bg-white rounded-2xl shadow-2xl max-w-md w-full"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
	>
		<!-- Icon Header -->
		<div class="bg-gray-800 text-white p-6 rounded-t-2xl text-center">
			<div class="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
				<span class="text-4xl">⚠️</span>
			</div>
			<h2 class="text-2xl font-bold">Sesión Cerrada</h2>
		</div>

		<!-- Content -->
		<div class="p-6">
			{#if reason === 'replaced'}
				<p class="text-gray-700 text-center mb-4">
					Tu sesión ha sido cerrada porque iniciaste sesión en otro dispositivo o navegador.
				</p>
				<div class="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-4">
					<p class="text-sm text-gray-700">
						<strong>Nota:</strong> Solo puedes tener una sesión activa a la vez.
						La sesión anterior se cierra automáticamente cuando inicias sesión desde otro lugar.
					</p>
				</div>
			{:else}
				<p class="text-gray-700 text-center mb-4">
					Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente.
				</p>
			{/if}

			<!-- Security Warning -->
			<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
				<div class="flex">
					<div class="shrink-0">
						<span class="text-yellow-400 text-xl">🔒</span>
					</div>
					<div class="ml-3">
						<p class="text-sm text-yellow-800">
							<strong>Seguridad:</strong> Si no reconoces esta actividad o crees que tu cuenta
							está comprometida, cambia tu contraseña inmediatamente o contacta a soporte.
						</p>
					</div>
				</div>
			</div>

			<!-- Action Button -->
			<button
				onclick={handleGoToLogin}
				class="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md"
			>
				Iniciar Sesión
			</button>

			<!-- Support Link -->
			<div class="mt-4 text-center">
				<p class="text-sm text-gray-500">
					¿Necesitas ayuda? Contacta a
					<a href="mailto:contactoaquastudio@gmail.com" class="text-gray-800 hover:underline font-medium">
						soporte
					</a>
				</p>
			</div>
		</div>
	</div>
</div>
