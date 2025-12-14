<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let savedEmail = $state('');
	let showEmailField = $state(false);

	const SAVED_EMAIL_KEY = 'savedLoginEmail';

	onMount(() => {
		// Cargar el correo guardado si existe
		const stored = localStorage.getItem(SAVED_EMAIL_KEY);
		if (stored) {
			savedEmail = stored;
			email = stored;
			showEmailField = false;
			// Dar foco al campo de password si hay email guardado
			setTimeout(() => {
				document.getElementById('password')?.focus();
			}, 0);
		} else {
			showEmailField = true;
			// Dar foco al campo de email si no hay email guardado
			setTimeout(() => {
				document.getElementById('email')?.focus();
			}, 0);
		}
	});

	function handleChangeEmail() {
		showEmailField = true;
		email = '';
		savedEmail = '';
		// Limpiar el localStorage
		if (browser) {
			localStorage.removeItem(SAVED_EMAIL_KEY);
		}
	}

	async function handleLogin() {
		error = '';
		loading = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Error al iniciar sesión';
				return;
			}

			// Guardar el correo en localStorage para futuros logins
			if (browser) {
				localStorage.setItem(SAVED_EMAIL_KEY, email);
			}

			authStore.login(data.user, data.token);
			goto('/dashboard');
		} catch (err) {
			error = 'Error de conexión';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
	<div class="max-w-md w-full card p-8">
		<div class="mb-6">
			<a href="/" class="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
				</svg>
				Volver al inicio
			</a>
		</div>
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Control de Gastos</h1>
			<p class="text-gray-500">Inicia sesión en tu cuenta</p>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-6">
			{#if error}
				<div class="bg-gray-100 border border-gray-300 text-gray-900 px-4 py-3 rounded-lg">
					{error}
				</div>
			{/if}

			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
					Email
				</label>
				{#if !showEmailField && savedEmail}
					<!-- Mostrar el correo guardado -->
					<div class="input-minimal bg-gray-50 flex items-center justify-between">
						<span class="text-gray-900">{savedEmail}</span>
						<button
							type="button"
							onclick={handleChangeEmail}
							class="text-sm text-gray-600 hover:text-gray-900 font-medium"
						>
							Cambiar
						</button>
					</div>
				{:else}
					<!-- Mostrar campo de entrada -->
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						class="input-minimal"
						placeholder="tu@email.com"
					/>
				{/if}
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
					Contraseña
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					class="input-minimal"
					placeholder="••••••••"
				/>
			</div>

			<div class="flex items-center justify-between">
				<a href="/forgot-password" class="text-sm text-gray-600 hover:text-gray-900 transition">
					¿Olvidaste tu contraseña?
				</a>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
			</button>
		</form>

		<div class="mt-6 text-center">
			<p class="text-gray-500">
				¿No tienes cuenta?
				<a href="/register" class="text-gray-800 hover:text-gray-900 font-semibold transition">
					Regístrate
				</a>
			</p>
		</div>
	</div>
</div>
