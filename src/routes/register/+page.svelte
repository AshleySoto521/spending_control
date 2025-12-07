<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';

	let nombre = $state('');
	let email = $state('');
	let celular = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleRegister() {
		error = '';

		if (password !== confirmPassword) {
			error = 'Las contraseñas no coinciden';
			return;
		}

		if (password.length < 8) {
			error = 'La contraseña debe tener al menos 8 caracteres';
			return;
		}

		loading = true;

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nombre, email, celular, password })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Error al registrar usuario';
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
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
			<p class="text-gray-500">Regístrate para comenzar</p>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleRegister(); }} class="space-y-6">
			{#if error}
				<div class="bg-gray-100 border border-gray-300 text-gray-900 px-4 py-3 rounded-lg">
					{error}
				</div>
			{/if}

			<div>
				<label for="nombre" class="block text-sm font-medium text-gray-700 mb-2">
					Nombre Completo
				</label>
				<input
					id="nombre"
					type="text"
					bind:value={nombre}
					required
					class="input-minimal"
					placeholder="Juan Pérez"
				/>
			</div>

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
				<label for="celular" class="block text-sm font-medium text-gray-700 mb-2">
					Celular
				</label>
				<input
					id="celular"
					type="tel"
					bind:value={celular}
					required
					pattern="[0-9]{10}"
					maxlength="10"
					class="input-minimal"
					placeholder="5512345678"
				/>
				<p class="mt-1 text-sm text-gray-500">10 dígitos sin espacios ni guiones</p>
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
				disabled={loading}
				class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Creando cuenta...' : 'Crear Cuenta'}
			</button>
		</form>

		<div class="mt-6 text-center">
			<p class="text-gray-500">
				¿Ya tienes cuenta?
				<a href="/login" class="text-gray-800 hover:text-gray-900 font-semibold transition">
					Inicia Sesión
				</a>
			</p>
		</div>
	</div>
</div>
