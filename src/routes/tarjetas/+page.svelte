<script lang="ts">
	import { onMount } from 'svelte';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { authStore } from '$lib/stores/auth';
	import { apiGet, apiPost, apiPut, apiDelete } from '$lib/utils/apiClient';

	let loading = $state(true);
	let error = $state('');
	let tarjetas: any[] = $state([]);
	let showModal = $state(false);
	let editingId: number | null = $state(null);
	let formData = $state({
		num_tarjeta: '',
		nom_tarjeta: '',
		tipo_tarjeta: 'CREDITO',
		clabe: '',
		banco: '',
		linea_credito: '',
		dia_corte: '',
		dias_gracia: ''
	});

	async function loadTarjetas() {
		try {
			const token = $authStore.token;
			const response = await apiGet('/api/tarjetas', token);

			if (!response.ok) throw new Error('Error al cargar tarjetas');

			const data = await response.json();
			tarjetas = data.tarjetas;
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		try {
			const token = $authStore.token;
			const url = editingId ? `/api/tarjetas/${editingId}` : '/api/tarjetas';
			const body = {
				...formData,
				linea_credito: formData.tipo_tarjeta === 'SERVICIOS' ? null : (formData.linea_credito ? parseFloat(formData.linea_credito) : 0),
				dia_corte: formData.dia_corte ? parseInt(formData.dia_corte) : null,
				dias_gracia: formData.dias_gracia ? parseInt(formData.dias_gracia) : null
			};

			const response = editingId
				? await apiPut(url, token, body)
				: await apiPost(url, token, body);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || `Error al ${editingId ? 'actualizar' : 'crear'} tarjeta`);
			}

			closeModal();
			loadTarjetas();
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		}
	}

	function openEditModal(tarjeta: any) {
		editingId = tarjeta.id_tarjeta;
		formData = {
			num_tarjeta: tarjeta.num_tarjeta,
			nom_tarjeta: tarjeta.nom_tarjeta,
			tipo_tarjeta: tarjeta.tipo_tarjeta || 'CREDITO',
			clabe: tarjeta.clabe || '',
			banco: tarjeta.banco || '',
			linea_credito: tarjeta.linea_credito?.toString() || '',
			dia_corte: tarjeta.dia_corte?.toString() || '',
			dias_gracia: tarjeta.dias_gracia?.toString() || ''
		};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingId = null;
		formData = {
			num_tarjeta: '',
			nom_tarjeta: '',
			tipo_tarjeta: 'CREDITO',
			clabe: '',
			banco: '',
			linea_credito: '',
			dia_corte: '',
			dias_gracia: ''
		};
	}

	async function handleDelete(id: number) {
		if (!confirm('¿Estás seguro de desactivar esta tarjeta? No se eliminará, solo se ocultará.')) return;

		try {
			const token = $authStore.token;
			const response = await apiDelete(`/api/tarjetas/${id}`, token);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Error al desactivar tarjeta');
			}

			loadTarjetas();
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		}
	}

	async function handleActivate(id: number) {
		if (!confirm('¿Deseas reactivar esta tarjeta?')) return;

		try {
			const token = $authStore.token;
			const response = await apiPut(`/api/tarjetas/${id}`, token, { activa: true });

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Error al reactivar tarjeta');
			}

			loadTarjetas();
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		}
	}

	onMount(() => {
		loadTarjetas();
	});

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(amount);
	}
</script>

<ProtectedRoute>
	<Navbar />

	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Tarjetas</h1>
					<p class="mt-2 text-gray-600">Gestiona tus tarjetas de crédito y débito</p>
				</div>
				<button
					onclick={() => showModal = true}
					class="bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 transition"
				>
					+ Nueva Tarjeta
				</button>
			</div>

			{#if loading}
				<div class="flex justify-center py-20">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
				</div>
			{:else if error}
				<div class="bg-gray-100 border border-gray-300 text-gray-900 px-4 py-3 rounded-lg mb-4">
					{error}
				</div>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each tarjetas as tarjeta}
					<div class="bg-linear-to-br rounded-xl shadow-lg p-6 text-white relative transition-all"
						class:from-gray-700={tarjeta.activa}
						class:to-gray-900={tarjeta.activa}
						class:from-gray-400={!tarjeta.activa}
						class:to-gray-600={!tarjeta.activa}
						class:opacity-75={!tarjeta.activa}
					>
						<div class="flex justify-between items-start mb-4">
							<div>
								<div class="text-xs font-semibold opacity-75">
									{tarjeta.banco || 'Banco'}
								</div>
								<div class="text-xs opacity-60 mt-1">
									{#if tarjeta.tipo_tarjeta === 'CREDITO'}
										Crédito
									{:else if tarjeta.tipo_tarjeta === 'DEBITO'}
										Débito
									{:else if tarjeta.tipo_tarjeta === 'DEPARTAMENTAL'}
										Departamental
									{:else if tarjeta.tipo_tarjeta === 'SERVICIOS'}
										Servicios
									{:else}
										Crédito
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<div class="text-xs opacity-75 mr-1">
									{tarjeta.activa ? '✓ Activa' : '✗ Inactiva'}
								</div>
								<button
									onclick={() => openEditModal(tarjeta)}
									class="bg-white text-gray-700 hover:bg-gray-100 rounded-lg p-1.5 transition shadow-sm"
									aria-label="Editar tarjeta"
									title="Editar tarjeta"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
									</svg>
								</button>
								{#if tarjeta.activa}
									<button
										onclick={() => handleDelete(tarjeta.id_tarjeta)}
										class="bg-white text-gray-700 hover:bg-gray-100 rounded-lg p-1.5 transition shadow-sm"
										aria-label="Desactivar tarjeta"
										title="Desactivar tarjeta"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
										</svg>
									</button>
								{:else}
									<button
										onclick={() => handleActivate(tarjeta.id_tarjeta)}
										class="bg-white text-gray-700 hover:bg-gray-100 rounded-lg p-1.5 transition shadow-sm"
										aria-label="Reactivar tarjeta"
										title="Reactivar tarjeta"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
										</svg>
									</button>
								{/if}
							</div>
						</div>

						<div class="mb-6">
							<div class="text-lg font-semibold mb-2">{tarjeta.nom_tarjeta}</div>
							<div class="text-sm font-mono tracking-wider">
								**** **** **** {tarjeta.num_tarjeta.slice(-4)}
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4 text-sm">
							{#if tarjeta.tipo_tarjeta !== 'SERVICIOS'}
								<div>
									<div class="opacity-75 text-xs mb-1">Línea de Crédito</div>
									<div class="font-semibold">{formatCurrency(parseFloat(tarjeta.linea_credito || 0))}</div>
								</div>
							{/if}
							<div>
								<div class="opacity-75 text-xs mb-1">Saldo Usado</div>
								<div class="font-semibold">{formatCurrency(parseFloat(tarjeta.saldo_usado))}</div>
							</div>
							{#if tarjeta.tipo_tarjeta !== 'SERVICIOS' && tarjeta.saldo_disponible !== null}
								<div>
									<div class="opacity-75 text-xs mb-1">Disponible</div>
									<div class="font-semibold">{formatCurrency(parseFloat(tarjeta.saldo_disponible))}</div>
								</div>
							{/if}
							{#if tarjeta.dia_corte}
								<div>
									<div class="opacity-75 text-xs mb-1">Día de Corte</div>
									<div class="font-semibold">Día {tarjeta.dia_corte}</div>
								</div>
							{/if}
						</div>
					</div>
				{/each}

				{#if tarjetas.length === 0 && !loading}
					<div class="col-span-full text-center py-20">
						<p class="text-gray-500 text-lg">No tienes tarjetas registradas</p>
						<button
							onclick={() => showModal = true}
							class="mt-4 text-gray-700 hover:text-gray-900 font-semibold"
						>
							Agregar tu primera tarjeta
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Modal -->
	{#if showModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
				<div class="p-6">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-2xl font-bold text-gray-900">{editingId ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h2>
						<button onclick={closeModal} class="text-gray-400 hover:text-gray-600" aria-label="Cerrar modal">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
							</svg>
						</button>
					</div>

					<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
						<div>
							<label for="nom_tarjeta" class="block text-sm font-medium text-gray-700 mb-2">Nombre de la Tarjeta</label>
							<input
								id="nom_tarjeta"
								bind:value={formData.nom_tarjeta}
								required
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 "
								placeholder="Ej: Visa Oro, Liverpool, Coppel"
							/>
							<p class="mt-1 text-xs text-gray-500">Puede ser bancaria o departamental</p>
						</div>

						<div>
							<label for="tipo_tarjeta" class="block text-sm font-medium text-gray-700 mb-2">Tipo de Tarjeta</label>
							<select
								id="tipo_tarjeta"
								bind:value={formData.tipo_tarjeta}
								required
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400"
							>
								<option value="CREDITO">CREDITO</option>
								<option value="DEBITO">DEBITO</option>
								<option value="DEPARTAMENTAL">DEPARTAMENTAL</option>
								<option value="SERVICIOS">SERVICIOS (American Express)</option>
							</select>
							<p class="mt-1 text-xs text-gray-500">
								{#if formData.tipo_tarjeta === 'SERVICIOS'}
									Las tarjetas de servicios no tienen límite de crédito fijo
								{:else}
									Selecciona el tipo de tarjeta
								{/if}
							</p>
						</div>

						<div>
							<label for="num_tarjeta" class="block text-sm font-medium text-gray-700 mb-2">Número de Tarjeta</label>
							<input
								id="num_tarjeta"
								bind:value={formData.num_tarjeta}
								required
								minlength="13"
								maxlength="19"
								pattern="\d+"
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 "
								placeholder="1234567890123456"
							/>
							<p class="mt-1 text-xs text-gray-500">13-19 dígitos (soporta bancarias y departamentales)</p>
						</div>

						<div>
							<label for="banco" class="block text-sm font-medium text-gray-700 mb-2">Banco / Institución</label>
							<input
								id="banco"
								bind:value={formData.banco}
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 "
								placeholder="Ej: Banamex, Liverpool, Coppel, Elektra"
							/>
						</div>

						<div>
							<label for="clabe" class="block text-sm font-medium text-gray-700 mb-2">CLABE (opcional)</label>
							<input
								id="clabe"
								type="text"
								bind:value={formData.clabe}
								maxlength="18"
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 "
								placeholder="18 dígitos"
								oninput={(e) => {
									const target = e.currentTarget;
									// Eliminar cualquier caracter que no sea número
									formData.clabe = target.value.replace(/\D/g, '');
								}}
							/>
							<div class="flex justify-between mt-1">
								<p class="text-xs text-gray-500">Solo números</p>
								<p class="text-xs text-gray-400">
									{formData.clabe.length}/18
								</p>
							</div>
						</div>

						{#if formData.tipo_tarjeta !== 'SERVICIOS'}
							<div>
								<label for="linea_credito" class="block text-sm font-medium text-gray-700 mb-2">
									Línea de Crédito
									{#if formData.tipo_tarjeta === 'CREDITO'}
										<span class="text-xs text-gray-500">(opcional para débito)</span>
									{/if}
								</label>
								<input
									id="linea_credito"
									bind:value={formData.linea_credito}
									type="number"
									step="0.01"
									class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 "
									placeholder="0.00"
								/>
							</div>
						{:else}
							<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
								<p class="text-sm text-blue-800">
									<strong>Tarjeta de Servicios:</strong> El límite de crédito es variable y lo determina la institución según el uso.
								</p>
							</div>
						{/if}

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="dia_corte" class="block text-sm font-medium text-gray-700 mb-2">Día de Corte</label>
								<input
									id="dia_corte"
									bind:value={formData.dia_corte}
									type="number"
									min="1"
									max="31"
									class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 "
									placeholder="1-31"
								/>
							</div>
							<div>
								<label for="dias_gracia" class="block text-sm font-medium text-gray-700 mb-2">Días de Gracia</label>
								<input
									id="dias_gracia"
									bind:value={formData.dias_gracia}
									type="number"
									class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 "
									placeholder="20"
								/>
							</div>
						</div>

						<div class="flex space-x-3 pt-4">
							<button
								type="button"
								onclick={closeModal}
								class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
							>
								Cancelar
							</button>
							<button
								type="submit"
								class="flex-1 bg-gray-800 text-white py-2 rounded-lg font-semibold hover:bg-gray-900 transition"
							>
								{editingId ? 'Actualizar' : 'Guardar'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}
	<Footer />
</ProtectedRoute>
