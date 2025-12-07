<script lang="ts">
	let email = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);
	let resetLink = $state('');

	async function handleForgotPassword() {
		error = '';
		success = '';
		loading = true;

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Error al procesar solicitud';
				return;
			}

			success = data.message;
			// En desarrollo, mostrar el link
			if (data.resetLink) {
				resetLink = data.resetLink;
			}
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
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Recuperar Contraseña</h1>
			<p class="text-gray-500">Ingresa tu email para recuperar tu cuenta</p>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} class="space-y-6">
			{#if error}
				<div class="bg-gray-100 border border-gray-300 text-gray-900 px-4 py-3 rounded-lg">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg">
					{success}
					{#if resetLink}
						<div class="mt-3 p-2 bg-white rounded border border-gray-300">
							<p class="text-xs font-semibold mb-1 text-gray-900">Link de desarrollo:</p>
							<a href={resetLink} class="text-xs text-gray-600 hover:text-gray-900 hover:underline break-all">
								{resetLink}
							</a>
						</div>
					{/if}
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

			<button
				type="submit"
				disabled={loading}
				class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Enviando...' : 'Enviar Instrucciones'}
			</button>
		</form>

		<div class="mt-6 text-center">
			<a href="/login" class="text-gray-600 hover:text-gray-900 font-semibold transition">
				← Volver al inicio de sesión
			</a>
		</div>
	</div>
</div>
