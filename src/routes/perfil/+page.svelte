<script lang="ts">
	import { onMount } from 'svelte';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { authStore } from '$lib/stores/auth';
	import { apiGet, apiPut, apiPost, apiDelete } from '$lib/utils/apiClient';
	import { goto } from '$app/navigation';

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

	// Dispositivos con la sesión abierta
	let sesiones: any[] = $state([]);
	let cargandoSesiones = $state(true);
	let errorSesiones = $state('');
	let cerrandoSesion = $state('');

	async function cargarSesiones() {
		cargandoSesiones = true;
		errorSesiones = '';

		try {
			const respuesta = await apiGet('/api/user/sesiones', $authStore.token);

			if (!respuesta.ok) throw new Error('No pudimos cargar tus dispositivos');

			sesiones = (await respuesta.json()).sesiones ?? [];
		} catch (err: any) {
			if (!err.message?.includes('Sesión expirada')) {
				errorSesiones = err.message ?? 'No pudimos cargar tus dispositivos';
			}
		} finally {
			cargandoSesiones = false;
		}
	}

	async function cerrarSesion(id: string, esActual: boolean) {
		if (esActual && !confirm('Es la sesión de este dispositivo. Se cerrará tu sesión aquí. ¿Continuar?')) {
			return;
		}

		cerrandoSesion = id;
		errorSesiones = '';

		try {
			const respuesta = await apiDelete(`/api/user/sesiones/${id}`, $authStore.token);

			if (!respuesta.ok) throw new Error('No pudimos cerrar esa sesión');

			// Si cerró la suya propia, la cookie ya no vale: hay que salir.
			if ((await respuesta.json()).eraLaActual) {
				authStore.logout();
				goto('/login');
				return;
			}

			await cargarSesiones();
		} catch (err: any) {
			errorSesiones = err.message ?? 'No pudimos cerrar esa sesión';
		} finally {
			cerrandoSesion = '';
		}
	}

	// Verificación de correo
	let verificacion: { verificado: boolean; email: string } | null = $state(null);
	let reenviando = $state(false);
	let mensajeVerificacion = $state('');

	async function cargarVerificacion() {
		try {
			const respuesta = await apiGet('/api/user/verificacion', $authStore.token);
			if (respuesta.ok) verificacion = await respuesta.json();
		} catch {
			// Silencioso: es un aviso, no una función crítica.
		}
	}

	async function reenviarVerificacion() {
		reenviando = true;
		mensajeVerificacion = '';

		try {
			const respuesta = await apiPost('/api/user/verificacion', $authStore.token, {});
			const datos = await respuesta.json();

			mensajeVerificacion = respuesta.ok
				? 'Te enviamos un correo nuevo. Revisa tu bandeja, y también la carpeta de spam.'
				: (datos.error ?? 'No pudimos enviarlo.');
		} catch {
			mensajeVerificacion = 'No pudimos conectar con el servidor.';
		} finally {
			reenviando = false;
		}
	}

	// Eliminación de cuenta
	let mostrarEliminar = $state(false);
	let passwordEliminar = $state('');
	let errorEliminar = $state('');
	let eliminando = $state(false);

	async function eliminarCuenta() {
		if (
			!confirm(
				'Se eliminarán tu cuenta y todos tus datos: tarjetas, ingresos, egresos, préstamos y pagos. Esta acción no se puede deshacer. ¿Continuar?'
			)
		) {
			return;
		}

		eliminando = true;
		errorEliminar = '';

		try {
			const respuesta = await apiPost('/api/user/eliminar', $authStore.token, {
				password: passwordEliminar
			});

			if (respuesta.ok) {
				authStore.logout();
				goto('/');
				return;
			}

			errorEliminar = (await respuesta.json()).error ?? 'No pudimos eliminar la cuenta.';
		} catch {
			errorEliminar = 'No pudimos conectar con el servidor.';
		} finally {
			eliminando = false;
		}
	}

	function formatearFechaHora(valor: string): string {
		return new Date(valor).toLocaleString('es-MX', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

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

		if (newPassword.length < 10) {
			passwordError = 'La nueva contraseña debe tener al menos 10 caracteres';
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
		cargarSesiones();
		cargarVerificacion();
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
								<p class="mt-1 text-xs text-gray-500">Mínimo 10 caracteres, con al menos una letra y un número</p>
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

					<!-- Aviso de correo sin confirmar -->
					{#if verificacion && !verificacion.verificado}
						<div class="bg-amber-50 border border-amber-200 rounded-xl p-6 md:col-span-2">
							<h2 class="text-lg font-bold text-amber-900 mb-2">Confirma tu correo</h2>
							<p class="text-sm text-amber-900 mb-4">
								Todavía no has confirmado <strong>{verificacion.email}</strong>. Mientras no
								lo hagas no podremos devolverte el acceso si olvidas tu contraseña, y no te
								enviaremos recordatorios. Puedes seguir usando la aplicación con normalidad.
							</p>

							{#if mensajeVerificacion}
								<p class="text-sm text-amber-900 mb-3 font-medium">{mensajeVerificacion}</p>
							{/if}

							<button
								onclick={reenviarVerificacion}
								disabled={reenviando}
								class="bg-amber-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-800 disabled:opacity-60"
							>
								{reenviando ? 'Enviando…' : 'Reenviar el correo de confirmación'}
							</button>
						</div>
					{/if}

					<!-- Dispositivos con la sesión abierta -->
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:col-span-2">
						<h2 class="text-xl font-bold text-gray-900 mb-2">Dispositivos conectados</h2>
						<p class="text-sm text-gray-600 mb-6">
							Aquí aparece dónde tienes la sesión abierta. Si ves algo que no reconoces,
							ciérralo y cambia tu contraseña.
						</p>

						{#if errorSesiones}
							<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
								{errorSesiones}
							</div>
						{/if}

						{#if cargandoSesiones}
							<p class="text-gray-500 text-sm">Cargando…</p>
						{:else if sesiones.length === 0}
							<p class="text-gray-500 text-sm">No hay sesiones abiertas.</p>
						{:else}
							<ul class="divide-y divide-gray-100">
								{#each sesiones as sesion (sesion.id)}
									<li class="py-4 flex items-center justify-between gap-4">
										<div class="min-w-0">
											<p class="font-medium text-gray-900">
												{sesion.dispositivo}
												{#if sesion.esActual}
													<span class="ml-2 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
														Este dispositivo
													</span>
												{/if}
											</p>
											<p class="text-xs text-gray-500 mt-1">
												Desde el {formatearFechaHora(sesion.inicio)}
												{#if sesion.ip}· IP {sesion.ip}{/if}
											</p>
										</div>
										<button
											onclick={() => cerrarSesion(sesion.id, sesion.esActual)}
											disabled={cerrandoSesion === sesion.id}
											class="shrink-0 text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
										>
											{cerrandoSesion === sesion.id ? 'Cerrando…' : 'Cerrar'}
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<!-- Eliminar la cuenta (derecho de cancelación, LFPDPPP) -->
					<div class="bg-white rounded-xl shadow-sm border border-red-200 p-8 md:col-span-2">
						<h2 class="text-xl font-bold text-gray-900 mb-2">Eliminar mi cuenta</h2>
						<p class="text-sm text-gray-600 mb-6">
							Se borrarán tu cuenta y todo lo que has registrado: tarjetas, ingresos,
							egresos, préstamos y pagos. No se puede deshacer y no guardamos copias.
						</p>

						{#if !mostrarEliminar}
							<button
								onclick={() => (mostrarEliminar = true)}
								class="text-red-600 font-semibold hover:text-red-700 text-sm"
							>
								Quiero eliminar mi cuenta
							</button>
						{:else}
							{#if errorEliminar}
								<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
									{errorEliminar}
								</div>
							{/if}

							<label for="password-eliminar" class="block text-sm font-medium text-gray-700 mb-2">
								Confirma tu contraseña para continuar
							</label>
							<input
								id="password-eliminar"
								type="password"
								bind:value={passwordEliminar}
								class="input-minimal mb-4 max-w-sm"
								placeholder="••••••••"
							/>

							<div class="flex gap-3">
								<button
									onclick={eliminarCuenta}
									disabled={eliminando || passwordEliminar === ''}
									class="bg-red-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
								>
									{eliminando ? 'Eliminando…' : 'Eliminar definitivamente'}
								</button>
								<button
									onclick={() => {
										mostrarEliminar = false;
										passwordEliminar = '';
										errorEliminar = '';
									}}
									class="btn-secondary"
								>
									Cancelar
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
	<Footer />
</ProtectedRoute>
