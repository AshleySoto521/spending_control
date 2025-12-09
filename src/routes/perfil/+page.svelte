<script lang="ts">
	import { onMount } from 'svelte';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { authStore } from '$lib/stores/auth';
	import { apiGet, apiPut, apiPost } from '$lib/utils/apiClient';

	let loading = $state(true);
	let error = $state('');
	let successMessage = $state('');
	let userData: any = $state(null);

	// Datos del perfil
	let nombre = $state('');
	let email = $state('');
	let celular = $state('');

	// Cambio de contraseña
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmNewPassword = $state('');
	let passwordError = $state('');
	let passwordSuccess = $state('');
	let loadingPassword = $state(false);

	async function loadUserData() {
		try {
			const token = $authStore.token;
			const response = await apiGet('/api/user', token);

			if (!response.ok) {
				throw new Error('Error al cargar datos del usuario');
			}

			const data = await response.json();
			userData = data.user;
			nombre = userData.nombre;
			email = userData.email;
			celular = userData.celular || '';
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}

	async function handleUpdateProfile() {
		error = '';
		successMessage = '';

		try {
			const token = $authStore.token;
			const response = await apiPut('/api/user', token, { nombre, celular });

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Error al actualizar perfil');
			}

			successMessage = 'Perfil actualizado correctamente';
			userData = data.user;

			// Actualizar el nombre en el store de autenticación
			authStore.updateUser({ ...userData });

			setTimeout(() => {
				successMessage = '';
			}, 3000);
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		}
	}

	async function handleChangePassword() {
		passwordError = '';
		passwordSuccess = '';

		if (newPassword !== confirmNewPassword) {
			passwordError = 'Las contraseñas nuevas no coinciden';
			return;
		}

		if (newPassword.length < 8) {
			passwordError = 'La nueva contraseña debe tener al menos 8 caracteres';
			return;
		}

		loadingPassword = true;

		try {
			const token = $authStore.token;
			const response = await apiPost('/api/user/change-password', token, {
				currentPassword,
				newPassword
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Error al cambiar contraseña');
			}

			passwordSuccess = 'Contraseña actualizada correctamente';
			currentPassword = '';
			newPassword = '';
			confirmNewPassword = '';

			setTimeout(() => {
				passwordSuccess = '';
			}, 3000);
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				passwordError = err.message;
			}
		} finally {
			loadingPassword = false;
		}
	}

	onMount(() => {
		loadUserData();
	});

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-MX', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		});
	}
</script>

<ProtectedRoute>
	<Navbar />

	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Mi Perfil</h1>
				<p class="mt-2 text-gray-500">Administra tu información personal</p>
			</div>

			{#if loading}
				<div class="flex justify-center py-20">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
				</div>
			{:else}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Información del Perfil -->
					<div class="card p-6">
						<h2 class="text-xl font-bold text-gray-900 mb-6">Información Personal</h2>

						{#if error}
							<div class="bg-gray-100 border border-gray-300 text-gray-900 px-4 py-3 rounded-lg mb-4">
								{error}
							</div>
						{/if}

						{#if successMessage}
							<div class="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg mb-4">
								{successMessage}
							</div>
						{/if}

						<form onsubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }} class="space-y-4">
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
									disabled
									class="input-minimal bg-gray-100 cursor-not-allowed"
								/>
								<p class="mt-1 text-xs text-gray-500">El email no se puede modificar</p>
							</div>

							<div>
								<label for="celular" class="block text-sm font-medium text-gray-700 mb-2">
									Celular
								</label>
								<input
									id="celular"
									type="tel"
									bind:value={celular}
									pattern="[0-9]{10}"
									maxlength="10"
									class="input-minimal"
									placeholder="5512345678"
								/>
								<p class="mt-1 text-xs text-gray-500">10 dígitos sin espacios ni guiones</p>
							</div>

							{#if userData}
								<div class="pt-4 border-t border-gray-200">
									<p class="text-sm text-gray-500">
										Miembro desde: <span class="font-medium text-gray-900">{formatDate(userData.fecha_registro)}</span>
									</p>
								</div>
							{/if}

							<button type="submit" class="btn-primary w-full">
								Guardar Cambios
							</button>
						</form>
					</div>

					<!-- Cambiar Contraseña -->
					<div class="card p-6">
						<h2 class="text-xl font-bold text-gray-900 mb-6">Cambiar Contraseña</h2>

						{#if passwordError}
							<div class="bg-gray-100 border border-gray-300 text-gray-900 px-4 py-3 rounded-lg mb-4">
								{passwordError}
							</div>
						{/if}

						{#if passwordSuccess}
							<div class="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg mb-4">
								{passwordSuccess}
							</div>
						{/if}

						<form onsubmit={(e) => { e.preventDefault(); handleChangePassword(); }} class="space-y-4">
							<div>
								<label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-2">
									Contraseña Actual
								</label>
								<input
									id="currentPassword"
									type="password"
									bind:value={currentPassword}
									required
									class="input-minimal"
									placeholder="••••••••"
								/>
							</div>

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
								<p class="mt-1 text-xs text-gray-500">Mínimo 8 caracteres</p>
							</div>

							<div>
								<label for="confirmNewPassword" class="block text-sm font-medium text-gray-700 mb-2">
									Confirmar Nueva Contraseña
								</label>
								<input
									id="confirmNewPassword"
									type="password"
									bind:value={confirmNewPassword}
									required
									class="input-minimal"
									placeholder="••••••••"
								/>
							</div>

							<button
								type="submit"
								disabled={loadingPassword}
								class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loadingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
							</button>
						</form>
					</div>
				</div>
			{/if}
		</div>
	</div>
	<Footer />
</ProtectedRoute>
