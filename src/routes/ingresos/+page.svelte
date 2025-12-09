<script lang="ts">
	import { onMount } from 'svelte';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ExportModal from '$lib/components/ExportModal.svelte';
	import { authStore } from '$lib/stores/auth';
	import { apiGet, apiPost, apiPut, apiDelete } from '$lib/utils/apiClient';

	let loading = $state(true);
	let error = $state('');
	let ingresos: any[] = $state([]);
	let formasPago: any[] = $state([]);
	let showModal = $state(false);
	let showExportModal = $state(false);
	let editingId = $state<number | null>(null);
	let formData = $state({
		tipo_ingreso: '',
		monto: '',
		id_forma_pago: '',
		fecha_ingreso: '',
		descripcion: ''
	});

	async function loadData() {
		try {
			const token = $authStore.token;

			const [ingresosRes, formasPagoRes] = await Promise.all([
				apiGet('/api/ingresos', token),
				fetch('/api/formas-pago')
			]);

			if (!ingresosRes.ok) throw new Error('Error al cargar ingresos');

			const ingresosData = await ingresosRes.json();
			const formasPagoData = await formasPagoRes.json();

			ingresos = ingresosData.ingresos;
			formasPago = formasPagoData.formas_pago;
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}

	function handleEdit(ingreso: any) {
		editingId = ingreso.id_ingreso;

		const idFormaPago = ingreso.id_forma_pago != null ? String(ingreso.id_forma_pago) : '';

		formData = {
			tipo_ingreso: ingreso.tipo_ingreso || '',
			monto: String(ingreso.monto),
			id_forma_pago: idFormaPago,
			fecha_ingreso: ingreso.fecha_ingreso.split('T')[0],
			descripcion: ingreso.descripcion || ''
		};

		showModal = true;
	}

	async function handleSubmit() {
		try {
			const token = $authStore.token;
			const url = editingId ? `/api/ingresos/${editingId}` : '/api/ingresos';
			const body = {
				...formData,
				monto: parseFloat(formData.monto),
				id_forma_pago: parseInt(formData.id_forma_pago)
			};

			const response = editingId
				? await apiPut(url, token, body)
				: await apiPost(url, token, body);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || `Error al ${editingId ? 'actualizar' : 'crear'} ingreso`);
			}

			showModal = false;
			editingId = null;
			formData = {
				tipo_ingreso: '',
				monto: '',
				id_forma_pago: '',
				fecha_ingreso: '',
				descripcion: ''
			};
			loadData();
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('¿Estás seguro de eliminar este ingreso?')) return;

		try {
			const token = $authStore.token;
			const response = await apiDelete(`/api/ingresos/${id}`, token);

			if (!response.ok) throw new Error('Error al eliminar');
			loadData();
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		}
	}

	onMount(() => {
		const today = new Date().toISOString().split('T')[0];
		formData.fecha_ingreso = today;
		loadData();
	});

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-MX', { timeZone: 'UTC' });
	}
</script>

<ProtectedRoute>
	<Navbar />

	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Ingresos</h1>
					<p class="mt-2 text-gray-600">Registra tus ingresos</p>
				</div>
				<div class="flex gap-3">
					<button
						onclick={() => { showExportModal = true; }}
						class="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center"
					>
						<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
						</svg>
						Exportar
					</button>
					<button
						onclick={() => showModal = true}
						class="bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 transition"
					>
						+ Nuevo Ingreso
					</button>
				</div>
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

			<div class="bg-white rounded-xl shadow-md overflow-hidden">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma de Pago</th>
							<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
							<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each ingresos as ingreso}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{formatDate(ingreso.fecha_ingreso)}
								</td>
								<td class="px-6 py-4 text-sm text-gray-900">
									{ingreso.tipo_ingreso}
									{#if ingreso.descripcion}
										<p class="text-xs text-gray-500">{ingreso.descripcion}</p>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
									{ingreso.forma_pago}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
									{formatCurrency(parseFloat(ingreso.monto))}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm">
									<div class="flex justify-end gap-3">
										<button
											onclick={() => handleEdit(ingreso)}
											class="text-gray-600 hover:text-gray-900 font-medium"
										>
											Editar
										</button>
										<button
											onclick={() => handleDelete(ingreso.id_ingreso)}
											class="text-red-600 hover:text-red-900 font-medium"
										>
											Eliminar
										</button>
									</div>
								</td>
							</tr>
						{/each}
						{#if ingresos.length === 0 && !loading}
							<tr>
								<td colspan="5" class="px-6 py-20 text-center text-gray-500">
									No hay ingresos registrados
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	{#if showModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full">
				<div class="p-6">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-2xl font-bold text-gray-900">{editingId ? 'Editar Ingreso' : 'Nuevo Ingreso'}</h2>
						<button onclick={() => { showModal = false; editingId = null; }} class="text-gray-400 hover:text-gray-600" aria-label="Cerrar modal">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
							</svg>
						</button>
					</div>

					<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
						<div>
							<label for="tipo_ingreso" class="block text-sm font-medium text-gray-700 mb-2">Tipo de Ingreso</label>
							<input
								id="tipo_ingreso"
								bind:value={formData.tipo_ingreso}
								required
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
								placeholder="Ej: Nómina, Bonos, Freelance"
							/>
						</div>

						<div>
							<label for="monto" class="block text-sm font-medium text-gray-700 mb-2">Monto</label>
							<input
								id="monto"
								bind:value={formData.monto}
								type="number"
								step="0.01"
								required
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
								placeholder="0.00"
							/>
						</div>

						<div>
							<label for="forma_pago" class="block text-sm font-medium text-gray-700 mb-2">Forma de Pago</label>
							<select
								id="forma_pago"
								bind:value={formData.id_forma_pago}
								required
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
							>
								<option value="">Seleccionar...</option>
								{#each formasPago as forma}
									<option value={String(forma.id_forma_pago)}>{forma.tipo}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="fecha_ingreso" class="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
							<input
								id="fecha_ingreso"
								bind:value={formData.fecha_ingreso}
								type="date"
								required
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
							/>
						</div>

						<div>
							<label for="descripcion" class="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
							<textarea
								id="descripcion"
								bind:value={formData.descripcion}
								rows="3"
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
								placeholder="Detalles adicionales..."
							></textarea>
						</div>

						<div class="flex space-x-3 pt-4">
							<button
								type="button"
								onclick={() => { showModal = false; editingId = null; }}
								class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
							>
								Cancelar
							</button>
							<button
								type="submit"
								class="flex-1 bg-gray-800 text-white py-2 rounded-lg font-semibold hover:bg-gray-900"
							>
								{editingId ? 'Actualizar' : 'Guardar'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<ExportModal bind:show={showExportModal} onClose={() => { showExportModal = false; }} />
	<Footer />
</ProtectedRoute>
