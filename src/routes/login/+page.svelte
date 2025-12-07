<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

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
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="input-minimal"
					placeholder="tu@email.com"
				/>
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
