<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let token = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state(false);
	let loading = $state(false);

	onMount(() => {
		token = $page.url.searchParams.get('token') || '';
		if (!token) {
			error = 'Token inválido o no proporcionado';
		}
	});

	async function handleResetPassword() {
		error = '';

		if (newPassword !== confirmPassword) {
			error = 'Las contraseñas no coinciden';
			return;
		}

		if (newPassword.length < 8) {
			error = 'La contraseña debe tener al menos 8 caracteres';
			return;
		}

		loading = true;

		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, newPassword })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Error al resetear contraseña';
				return;
			}

			success = true;
			setTimeout(() => {
				goto('/login');
			}, 2000);
		} catch (err) {
			error = 'Error de conexión';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
	<div class="max-w-md w-full card p-8">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Resetear Contraseña</h1>
			<p class="text-gray-500">Ingresa tu nueva contraseña</p>
		</div>

		{#if success}
			<div class="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg text-center">
				<p class="font-semibold mb-2">Contraseña actualizada correctamente</p>
				<p class="text-sm">Redirigiendo al inicio de sesión...</p>
			</div>
		{:else}
			<form onsubmit={(e) => { e.preventDefault(); handleResetPassword(); }} class="space-y-6">
				{#if error}
					<div class="bg-gray-100 border border-gray-300 text-gray-900 px-4 py-3 rounded-lg">
						{error}
					</div>
				{/if}

				<div>
					<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
						Nueva Contraseña
					</label>
					<input
						id="newPassword"
						type="password"
						bind:value={newPassword}
						required
						class="input-minimal"
						placeholder="••••••••"
					/>
					<p class="mt-1 text-sm text-gray-500">Mínimo 8 caracteres</p>
				</div>

				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
						Confirmar Contraseña
					</label>
					<input
						id="confirmPassword"
						type="password"
						bind:value={confirmPassword}
						required
						class="input-minimal"
						placeholder="••••••••"
					/>
				</div>

				<button
					type="submit"
					disabled={loading || !token}
					class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Actualizando...' : 'Actualizar Contraseña'}
				</button>
			</form>
		{/if}

		<div class="mt-6 text-center">
			<a href="/login" class="text-gray-600 hover:text-gray-900 font-semibold transition">
				← Volver al inicio de sesión
			</a>
		</div>
	</div>
</div>
