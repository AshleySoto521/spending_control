<script lang="ts">
	import { onMount } from 'svelte';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { authStore } from '$lib/stores/auth';

	let loading = $state(true);
	let loadingPagos = $state(true);
	let error = $state('');
	let success = $state('');
	let tarjetas: any[] = $state([]);
	let formasPago: any[] = $state([]);
	let pagos: any[] = $state([]);

	let formData = $state({
		id_tarjeta: '',
		fecha_pago: new Date().toISOString().split('T')[0],
		monto: '',
		id_forma_pago: '',
		descripcion: ''
	});

	async function loadTarjetas() {
		try {
			const token = $authStore.token;
			const response = await fetch('/api/tarjetas', {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Error al cargar tarjetas');
			}

			const data = await response.json();
			tarjetas = data.tarjetas || [];
		} catch (err: any) {
			error = err.message;
		}
	}

	async function loadFormasPago() {
		try {
			const token = $authStore.token;
			const response = await fetch('/api/formas-pago', {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Error al cargar formas de pago');
			}

			const data = await response.json();
			// Filtrar solo efectivo y transferencia
			formasPago = (data.formas_pago || []).filter((fp: any) =>
				fp.tipo === 'efectivo' || fp.tipo === 'transferencia'
			);
		} catch (err: any) {
			error = err.message;
		}
	}

	async function loadPagos() {
		try {
			const token = $authStore.token;
			const response = await fetch('/api/pagos-tarjetas', {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Error al cargar pagos');
			}

			pagos = await response.json();
		} catch (err: any) {
			error = err.message;
		} finally {
			loadingPagos = false;
		}
	}

	onMount(async () => {
		await Promise.all([loadTarjetas(), loadFormasPago(), loadPagos()]);
		loading = false;
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		success = '';

		try {
			const token = $authStore.token;
			const response = await fetch('/api/pagos-tarjetas', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(formData)
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Error al registrar pago');
			}

			success = 'Pago registrado correctamente';

			// Resetear formulario
			formData = {
				id_tarjeta: '',
				fecha_pago: new Date().toISOString().split('T')[0],
				monto: '',
				id_forma_pago: '',
				descripcion: ''
			};

			// Recargar lista de pagos y tarjetas (para actualizar saldos)
			await loadPagos();
			await loadTarjetas();

			// Limpiar mensaje de éxito después de 3 segundos
			setTimeout(() => {
				success = '';
			}, 3000);
		} catch (err: any) {
			error = err.message;
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('¿Estás seguro de eliminar este pago?')) {
			return;
		}

		try {
			const token = $authStore.token;
			const response = await fetch(`/api/pagos-tarjetas/${id}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Error al eliminar pago');
			}

			success = 'Pago eliminado correctamente';

			// Recargar lista de pagos y tarjetas
			await loadPagos();
			await loadTarjetas();

			setTimeout(() => {
				success = '';
			}, 3000);
		} catch (err: any) {
			error = err.message;
		}
	}

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
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Pagos a Tarjetas</h1>
				<p class="mt-2 text-gray-600">Registra los pagos realizados a tus tarjetas de crédito</p>
			</div>

			{#if loading}
				<div class="flex justify-center items-center py-20">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
				</div>
			{:else}
				<!-- Mensajes -->
				{#if error}
					<div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
						{error}
					</div>
				{/if}

				{#if success}
					<div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
						{success}
					</div>
				{/if}

				<!-- Formulario -->
				<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
					<h2 class="text-lg font-bold text-gray-900 mb-6">Registrar Pago</h2>

					<form onsubmit={handleSubmit} class="space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="tarjeta" class="block text-sm font-medium text-gray-700 mb-2">
									Tarjeta *
								</label>
								<select
									id="tarjeta"
									bind:value={formData.id_tarjeta}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
								>
									<option value="">Selecciona una tarjeta</option>
									{#each tarjetas as tarjeta}
										<option value={tarjeta.id_tarjeta}>
											{tarjeta.nom_tarjeta} - {tarjeta.banco || 'Sin banco'} (Deuda: {formatCurrency(parseFloat(tarjeta.saldo_usado))})
										</option>
									{/each}
								</select>
							</div>

							<div>
								<label for="fecha" class="block text-sm font-medium text-gray-700 mb-2">
									Fecha de Pago *
								</label>
								<input
									type="date"
									id="fecha"
									bind:value={formData.fecha_pago}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
								/>
							</div>

							<div>
								<label for="monto" class="block text-sm font-medium text-gray-700 mb-2">
									Monto *
								</label>
								<input
									type="number"
									id="monto"
									step="0.01"
									min="0.01"
									bind:value={formData.monto}
									required
									placeholder="0.00"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
								/>
							</div>

							<div>
								<label for="forma_pago" class="block text-sm font-medium text-gray-700 mb-2">
									Forma de Pago *
								</label>
								<select
									id="forma_pago"
									bind:value={formData.id_forma_pago}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
								>
									<option value="">Selecciona forma de pago</option>
									{#each formasPago as forma}
										<option value={forma.id_forma_pago}>
											{forma.tipo.charAt(0).toUpperCase() + forma.tipo.slice(1)}
										</option>
									{/each}
								</select>
								<p class="text-xs text-gray-500 mt-1">Solo efectivo o transferencia</p>
							</div>
						</div>

						<div>
							<label for="descripcion" class="block text-sm font-medium text-gray-700 mb-2">
								Descripción (Opcional)
							</label>
							<textarea
								id="descripcion"
								bind:value={formData.descripcion}
								rows="3"
								placeholder="Notas adicionales sobre el pago..."
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
							></textarea>
						</div>

						<div class="flex justify-end">
							<button
								type="submit"
								class="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
							>
								Registrar Pago
							</button>
						</div>
					</form>
				</div>

				<!-- Historial de Pagos -->
				<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-bold text-gray-900 mb-4">Historial de Pagos</h2>

					{#if loadingPagos}
						<div class="flex justify-center items-center py-10">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
						</div>
					{:else if pagos.length > 0}
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarjeta</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banco</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma de Pago</th>
										<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
										<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each pagos as pago}
										<tr>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{new Date(pago.fecha_pago).toLocaleDateString('es-MX')}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{pago.nom_tarjeta}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{pago.banco || 'N/A'}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												<span class="capitalize">{pago.forma_pago}</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
												{formatCurrency(parseFloat(pago.monto))}
											</td>
											<td class="px-6 py-4 text-sm text-gray-500">
												{pago.descripcion || '-'}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-center text-sm">
												<button
													onclick={() => handleDelete(pago.id_pago)}
													class="text-red-600 hover:text-red-800"
													title="Eliminar pago"
												>
													<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
													</svg>
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="text-gray-500 text-center py-8">No hay pagos registrados</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<Footer />
</ProtectedRoute>
