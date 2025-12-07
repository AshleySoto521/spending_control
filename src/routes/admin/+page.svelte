<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { authStore } from '$lib/stores/auth';

	let loading = $state(true);
	let error = $state('');
	let activeTab = $state<'usuarios' | 'logs'>('usuarios');

	// Usuarios
	let usuarios = $state<any[]>([]);
	let loadingUsuarios = $state(false);

	// Logs
	let logs = $state<any[]>([]);
	let loadingLogs = $state(false);
	let totalLogs = $state(0);
	let currentPage = $state(1);
	let logsPerPage = $state(50);
	let filterTipoEvento = $state('');
	let filterFechaInicio = $state('');
	let filterFechaFin = $state('');

	// Modales
	let showResetPasswordModal = $state(false);
	let showDeleteUserModal = $state(false);
	let selectedUser = $state<any>(null);
	let nuevaPassword = $state('');
	let confirmPassword = $state('');

	async function checkAdmin() {
		try {
			const token = $authStore.token;
			const response = await fetch('/api/admin/usuarios', {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				if (response.status === 403) {
					error = 'No tienes permisos de administrador';
					setTimeout(() => goto('/dashboard'), 2000);
				}
				throw new Error('No autorizado');
			}

			loading = false;
		} catch (err) {
			error = 'Error al verificar permisos';
			setTimeout(() => goto('/dashboard'), 2000);
		}
	}

	async function loadUsuarios() {
		loadingUsuarios = true;
		try {
			const token = $authStore.token;
			const response = await fetch('/api/admin/usuarios', {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) throw new Error('Error al cargar usuarios');

			const data = await response.json();
			usuarios = data.usuarios;
		} catch (err: any) {
			error = err.message;
		} finally {
			loadingUsuarios = false;
		}
	}

	async function loadLogs() {
		loadingLogs = true;
		try {
			const token = $authStore.token;
			const offset = (currentPage - 1) * logsPerPage;

			let url = `/api/admin/logs?limit=${logsPerPage}&offset=${offset}`;
			if (filterTipoEvento) url += `&tipo_evento=${filterTipoEvento}`;
			if (filterFechaInicio) url += `&fecha_inicio=${filterFechaInicio}`;
			if (filterFechaFin) url += `&fecha_fin=${filterFechaFin}`;

			const response = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) throw new Error('Error al cargar logs');

			const data = await response.json();
			logs = data.logs;
			totalLogs = data.total;
		} catch (err: any) {
			error = err.message;
		} finally {
			loadingLogs = false;
		}
	}

	async function handleDeleteUser() {
		if (!selectedUser) return;

		try {
			const token = $authStore.token;
			const response = await fetch(`/api/admin/usuarios/${selectedUser.id_usuario}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Error al eliminar usuario');
			}

			showDeleteUserModal = false;
			selectedUser = null;
			await loadUsuarios();
		} catch (err: any) {
			error = err.message;
		}
	}

	async function handleResetPassword() {
		if (!selectedUser) return;

		if (nuevaPassword !== confirmPassword) {
			error = 'Las contraseñas no coinciden';
			return;
		}

		if (nuevaPassword.length < 8) {
			error = 'La contraseña debe tener al menos 8 caracteres';
			return;
		}

		try {
			const token = $authStore.token;
			const response = await fetch(`/api/admin/usuarios/${selectedUser.id_usuario}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					resetPassword: true,
					nuevaPassword
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Error al resetear contraseña');
			}

			showResetPasswordModal = false;
			selectedUser = null;
			nuevaPassword = '';
			confirmPassword = '';
		} catch (err: any) {
			error = err.message;
		}
	}

	async function toggleUserActive(user: any) {
		try {
			const token = $authStore.token;
			const response = await fetch(`/api/admin/usuarios/${user.id_usuario}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					activo: !user.activo
				})
			});

			if (!response.ok) throw new Error('Error al cambiar estado');

			await loadUsuarios();
		} catch (err: any) {
			error = err.message;
		}
	}

	async function handleExportarUsuarios() {
		try {
			const token = $authStore.token;
			const response = await fetch('/api/admin/exportar-usuarios', {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) throw new Error('Error al exportar usuarios');

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const fecha = new Date().toISOString().split('T')[0];
			a.download = `usuarios_${fecha}.xlsx`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		} catch (err: any) {
			error = err.message;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString('es-MX', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getTipoEventoColor(tipo: string): string {
		const colors: Record<string, string> = {
			login_exitoso: 'bg-green-100 text-green-800',
			login_fallido: 'bg-red-100 text-red-800',
			logout: 'bg-blue-100 text-blue-800',
			sesion_expirada: 'bg-yellow-100 text-yellow-800',
			error: 'bg-red-100 text-red-800',
			sesion_invalidada: 'bg-orange-100 text-orange-800'
		};
		return colors[tipo] || 'bg-gray-100 text-gray-800';
	}

	$effect(() => {
		if (activeTab === 'usuarios' && usuarios.length === 0) {
			loadUsuarios();
		} else if (activeTab === 'logs' && logs.length === 0) {
			loadLogs();
		}
	});

	$effect(() => {
		if (activeTab === 'logs') {
			loadLogs();
		}
	});

	onMount(() => {
		checkAdmin();
	});
</script>

<ProtectedRoute>
	<Navbar />

	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			{#if loading}
				<div class="flex justify-center py-20">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
				</div>
			{:else if error && !$authStore.user}
				<div class="card p-6 text-center">
					<p class="text-red-600 font-medium">{error}</p>
					<p class="text-gray-500 mt-2">Redirigiendo...</p>
				</div>
			{:else}
				<div class="mb-8">
					<h1 class="text-3xl font-bold text-gray-900">Panel de Administración</h1>
					<p class="mt-2 text-gray-500">Gestiona usuarios y revisa logs del sistema</p>
				</div>

				{#if error}
					<div class="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-lg mb-4">
						{error}
					</div>
				{/if}

				<!-- Tabs -->
				<div class="border-b border-gray-200 mb-6">
					<nav class="flex space-x-8">
						<button
							onclick={() => activeTab = 'usuarios'}
							class="py-4 px-1 border-b-2 font-medium text-sm transition"
							class:border-gray-800={activeTab === 'usuarios'}
							class:text-gray-900={activeTab === 'usuarios'}
							class:border-transparent={activeTab !== 'usuarios'}
							class:text-gray-500={activeTab !== 'usuarios'}
						>
							Usuarios Registrados
						</button>
						<button
							onclick={() => activeTab = 'logs'}
							class="py-4 px-1 border-b-2 font-medium text-sm transition"
							class:border-gray-800={activeTab === 'logs'}
							class:text-gray-900={activeTab === 'logs'}
							class:border-transparent={activeTab !== 'logs'}
							class:text-gray-500={activeTab !== 'logs'}
						>
							Logs de Seguridad
						</button>
					</nav>
				</div>

				<!-- Usuarios Tab -->
				{#if activeTab === 'usuarios'}
					<div class="card p-6">
						<div class="flex justify-between items-center mb-6">
							<h2 class="text-xl font-bold text-gray-900">Usuarios del Sistema</h2>
							<button onclick={handleExportarUsuarios} class="btn-primary flex items-center space-x-2">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								<span>Descargar Usuarios</span>
							</button>
						</div>

						{#if loadingUsuarios}
							<div class="flex justify-center py-10">
								<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
							</div>
						{:else}
							<div class="overflow-x-auto">
								<table class="min-w-full divide-y divide-gray-200">
									<thead>
										<tr>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Celular</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registro</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estadísticas</th>
											<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-200">
										{#each usuarios as usuario}
											<tr>
												<td class="px-4 py-4 text-sm text-gray-900">{usuario.nombre}</td>
												<td class="px-4 py-4 text-sm text-gray-600">{usuario.email}</td>
												<td class="px-4 py-4 text-sm text-gray-600">{usuario.celular}</td>
												<td class="px-4 py-4 text-sm text-gray-600">{formatDate(usuario.fecha_registro)}</td>
												<td class="px-4 py-4 text-sm">
													<span class="px-2 py-1 rounded-full text-xs font-medium"
														class:bg-green-100={usuario.activo}
														class:text-green-800={usuario.activo}
														class:bg-red-100={!usuario.activo}
														class:text-red-800={!usuario.activo}>
														{usuario.activo ? 'Activo' : 'Inactivo'}
													</span>
												</td>
												<td class="px-4 py-4 text-sm">
													{#if usuario.es_admin}
														<span class="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Admin</span>
													{:else}
														<span class="text-gray-400">—</span>
													{/if}
												</td>
												<td class="px-4 py-4 text-sm text-gray-600">
													<div class="flex space-x-3 text-xs">
														<span>Tarjetas: {usuario.total_tarjetas}</span>
														<span>Ingresos: {usuario.total_ingresos}</span>
														<span>Egresos: {usuario.total_egresos}</span>
													</div>
												</td>
												<td class="px-4 py-4 text-sm text-right">
													<div class="flex justify-end space-x-2">
														<button
															onclick={() => toggleUserActive(usuario)}
															class="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
														>
															{usuario.activo ? 'Desactivar' : 'Activar'}
														</button>
														<button
															onclick={() => {
																selectedUser = usuario;
																showResetPasswordModal = true;
															}}
															class="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
														>
															Resetear Contraseña
														</button>
														<button
															onclick={() => {
																selectedUser = usuario;
																showDeleteUserModal = true;
															}}
															class="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
														>
															Eliminar
														</button>
													</div>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>

								{#if usuarios.length === 0}
									<p class="text-center text-gray-500 py-10">No hay usuarios registrados</p>
								{/if}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Logs Tab -->
				{#if activeTab === 'logs'}
					<div class="card p-6">
						<h2 class="text-xl font-bold text-gray-900 mb-6">Logs de Seguridad</h2>

						<!-- Filtros -->
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Evento</label>
								<select bind:value={filterTipoEvento} class="input-minimal">
									<option value="">Todos</option>
									<option value="login_exitoso">Login Exitoso</option>
									<option value="login_fallido">Login Fallido</option>
									<option value="logout">Logout</option>
									<option value="sesion_expirada">Sesión Expirada</option>
									<option value="error">Error</option>
								</select>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
								<input type="date" bind:value={filterFechaInicio} class="input-minimal" />
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
								<input type="date" bind:value={filterFechaFin} class="input-minimal" />
							</div>
						</div>

						<div class="flex justify-end mb-4">
							<button onclick={() => loadLogs()} class="btn-primary">
								Aplicar Filtros
							</button>
						</div>

						{#if loadingLogs}
							<div class="flex justify-center py-10">
								<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
							</div>
						{:else}
							<div class="overflow-x-auto">
								<table class="min-w-full divide-y divide-gray-200">
									<thead>
										<tr>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-200">
										{#each logs as log}
											<tr>
												<td class="px-4 py-4 text-sm text-gray-600">{formatDate(log.fecha_evento)}</td>
												<td class="px-4 py-4 text-sm">
													<span class="px-2 py-1 rounded-full text-xs font-medium {getTipoEventoColor(log.tipo_evento)}">
														{log.tipo_evento.replace('_', ' ')}
													</span>
												</td>
												<td class="px-4 py-4 text-sm text-gray-900">{log.nombre_usuario || '—'}</td>
												<td class="px-4 py-4 text-sm text-gray-600">{log.email || '—'}</td>
												<td class="px-4 py-4 text-sm text-gray-600">{log.ip_address || '—'}</td>
												<td class="px-4 py-4 text-sm text-gray-600">{log.detalles || '—'}</td>
											</tr>
										{/each}
									</tbody>
								</table>

								{#if logs.length === 0}
									<p class="text-center text-gray-500 py-10">No hay logs disponibles</p>
								{/if}
							</div>

							<!-- Paginación -->
							{#if totalLogs > logsPerPage}
								<div class="flex justify-between items-center mt-6">
									<p class="text-sm text-gray-500">
										Mostrando {(currentPage - 1) * logsPerPage + 1} - {Math.min(currentPage * logsPerPage, totalLogs)} de {totalLogs}
									</p>
									<div class="flex space-x-2">
										<button
											onclick={() => { currentPage--; loadLogs(); }}
											disabled={currentPage === 1}
											class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Anterior
										</button>
										<button
											onclick={() => { currentPage++; loadLogs(); }}
											disabled={currentPage * logsPerPage >= totalLogs}
											class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Siguiente
										</button>
									</div>
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Modal: Resetear Contraseña -->
	{#if showResetPasswordModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick={() => showResetPasswordModal = false}>
			<div class="card p-6 max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
				<h3 class="text-xl font-bold text-gray-900 mb-4">Resetear Contraseña</h3>
				<p class="text-gray-600 mb-4">Usuario: <strong>{selectedUser?.nombre}</strong></p>

				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Nueva Contraseña</label>
						<input
							type="password"
							bind:value={nuevaPassword}
							class="input-minimal"
							placeholder="Mínimo 8 caracteres"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña</label>
						<input
							type="password"
							bind:value={confirmPassword}
							class="input-minimal"
							placeholder="Confirmar contraseña"
						/>
					</div>
				</div>

				<div class="flex justify-end space-x-3 mt-6">
					<button onclick={() => {
						showResetPasswordModal = false;
						selectedUser = null;
						nuevaPassword = '';
						confirmPassword = '';
					}} class="btn-secondary">
						Cancelar
					</button>
					<button onclick={handleResetPassword} class="btn-primary">
						Resetear Contraseña
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Modal: Eliminar Usuario -->
	{#if showDeleteUserModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick={() => showDeleteUserModal = false}>
			<div class="card p-6 max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
				<h3 class="text-xl font-bold text-gray-900 mb-4">Eliminar Usuario</h3>
				<p class="text-gray-600 mb-4">
					¿Estás seguro de que deseas eliminar al usuario <strong>{selectedUser?.nombre}</strong>?
				</p>
				<p class="text-sm text-red-600 mb-6">
					Esta acción eliminará permanentemente toda la información del usuario, incluyendo tarjetas, ingresos, egresos y pagos.
				</p>

				<div class="flex justify-end space-x-3">
					<button onclick={() => {
						showDeleteUserModal = false;
						selectedUser = null;
					}} class="btn-secondary">
						Cancelar
					</button>
					<button onclick={handleDeleteUser} class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
						Eliminar Usuario
					</button>
				</div>
			</div>
		</div>
	{/if}
	<Footer />
</ProtectedRoute>
