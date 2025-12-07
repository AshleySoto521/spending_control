<script lang="ts">
	import { onMount } from 'svelte';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ExportModal from '$lib/components/ExportModal.svelte';
	import { authStore } from '$lib/stores/auth';

	let loading = $state(true);
	let error = $state('');
	let egresos: any[] = $state([]);
	let formasPago: any[] = $state([]);
	let tarjetas: any[] = $state([]);
	let resumenTarjetas: any[] = $state([]);
	let resumenSinTarjeta: any = $state(null);
	let showModal = $state(false);
	let showExportModal = $state(false);
	let filtroTarjeta = $state<number | null>(null);
	let editingId = $state<number | null>(null);
	let formData = $state({
		concepto: '',
		establecimiento: '',
		monto: '',
		id_forma_pago: '',
		id_tarjeta: '',
		fecha_egreso: '',
		descripcion: '',
		compra_meses: false,
		num_meses: '',
		mes_inicio_pago: '0'
	});

	async function loadData() {
		try {
			const token = $authStore.token;

			const [egresosRes, formasPagoRes, tarjetasRes, resumenRes] = await Promise.all([
				fetch('/api/egresos', {
					headers: { 'Authorization': `Bearer ${token}` }
				}),
				fetch('/api/formas-pago'),
				fetch('/api/tarjetas', {
					headers: { 'Authorization': `Bearer ${token}` }
				}),
				fetch('/api/egresos/resumen-tarjetas', {
					headers: { 'Authorization': `Bearer ${token}` }
				})
			]);

			if (!egresosRes.ok) throw new Error('Error al cargar egresos');

			const egresosData = await egresosRes.json();
			const formasPagoData = await formasPagoRes.json();
			const tarjetasData = await tarjetasRes.json();
			const resumenData = await resumenRes.json();

			egresos = egresosData.egresos;
			formasPago = formasPagoData.formas_pago;
			tarjetas = tarjetasData.tarjetas.filter((t: any) => t.activa);
			resumenTarjetas = resumenData.resumen_tarjetas || [];
			resumenSinTarjeta = resumenData.resumen_sin_tarjeta;
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function handleEdit(egreso: any) {
		editingId = egreso.id_egreso;

		// Convertir id_forma_pago a string, manejando null/undefined
		const idFormaPago = egreso.id_forma_pago != null ? String(egreso.id_forma_pago) : '';
		const idTarjeta = egreso.id_tarjeta != null ? String(egreso.id_tarjeta) : '';
		const numMeses = egreso.num_meses != null ? String(egreso.num_meses) : '';
		const mesInicioPago = egreso.mes_inicio_pago != null ? String(egreso.mes_inicio_pago) : '0';

		formData = {
			concepto: egreso.concepto || '',
			establecimiento: egreso.establecimiento || '',
			monto: String(egreso.monto),
			id_forma_pago: idFormaPago,
			id_tarjeta: idTarjeta,
			fecha_egreso: egreso.fecha_egreso.split('T')[0],
			descripcion: egreso.descripcion || '',
			compra_meses: egreso.compra_meses || false,
			num_meses: numMeses,
			mes_inicio_pago: mesInicioPago
		};

		showModal = true;
	}

	async function handleSubmit() {
		try {
			const token = $authStore.token;
			const url = editingId ? `/api/egresos/${editingId}` : '/api/egresos';
			const method = editingId ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					...formData,
					monto: parseFloat(formData.monto),
					id_forma_pago: parseInt(formData.id_forma_pago),
					id_tarjeta: formData.id_tarjeta ? parseInt(formData.id_tarjeta) : null,
					compra_meses: formData.compra_meses,
					num_meses: formData.compra_meses && formData.num_meses ? parseInt(formData.num_meses) : null,
					mes_inicio_pago: formData.compra_meses ? parseInt(formData.mes_inicio_pago) : null
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || `Error al ${editingId ? 'actualizar' : 'crear'} egreso`);
			}

			showModal = false;
			editingId = null;
			formData = {
				concepto: '',
				establecimiento: '',
				monto: '',
				id_forma_pago: '',
				id_tarjeta: '',
				fecha_egreso: '',
				descripcion: '',
				compra_meses: false,
				num_meses: '',
				mes_inicio_pago: '0'
			};
			loadData();
		} catch (err: any) {
			error = err.message;
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('¿Estás seguro de eliminar este egreso?')) return;

		try {
			const token = $authStore.token;
			const response = await fetch(`/api/egresos/${id}`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			});

			if (!response.ok) throw new Error('Error al eliminar');
			loadData();
		} catch (err: any) {
			error = err.message;
		}
	}

	onMount(() => {
		const today = new Date().toISOString().split('T')[0];
		formData.fecha_egreso = today;
		loadData();
	});

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(amount);
	}

	// Computed: egresos filtrados
	let egresosFiltrados = $derived.by(() => {
		if (filtroTarjeta === null) {
			return egresos;
		}
		if (filtroTarjeta === -1) {
			// Efectivo/Transferencia (sin tarjeta)
			return egresos.filter(e => !e.id_tarjeta);
		}
		// Filtrar por tarjeta específica
		return egresos.filter(e => e.id_tarjeta && parseInt(e.id_tarjeta) === filtroTarjeta);
	});
</script>

<ProtectedRoute>
	<Navbar />

	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Egresos</h1>
					<p class="mt-2 text-gray-600">Registra tus gastos</p>
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
						onclick={() => { showModal = true; }}
						class="bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 transition"
					>
						+ Nuevo Egreso
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

			<!-- Cards de Resumen por Tarjeta -->
			{#if !loading && (resumenTarjetas.length > 0 || (resumenSinTarjeta && resumenSinTarjeta.total_egresos > 0))}
				<div class="mb-8">
					<h2 class="text-xl font-bold text-gray-900 mb-4">Resumen por Tarjeta</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<!-- Egresos en Efectivo/Transferencia -->
						{#if resumenSinTarjeta && resumenSinTarjeta.total_egresos > 0}
							<button
								type="button"
								class="bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer hover:shadow-md transition text-left w-full"
								class:border-gray-800={filtroTarjeta === -1}
								class:border-gray-200={filtroTarjeta !== -1}
								onclick={() => filtroTarjeta = filtroTarjeta === -1 ? null : -1}
							>
								<div class="flex items-start justify-between mb-4">
									<div>
										<h3 class="text-lg font-bold text-gray-900">Efectivo/Transferencia</h3>
										<p class="text-xs text-gray-500 mt-1">Sin tarjeta</p>
									</div>
									<div class="bg-green-100 rounded-full p-2">
										<svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
										</svg>
									</div>
								</div>
								<div class="space-y-2">
									<div>
										<p class="text-2xl font-bold text-gray-900">{formatCurrency(parseFloat(resumenSinTarjeta.total_gastado))}</p>
										<p class="text-xs text-gray-500">Total gastado</p>
									</div>
									<div class="flex justify-between text-sm">
										<span class="text-gray-600">Transacciones:</span>
										<span class="font-medium text-gray-900">{resumenSinTarjeta.total_egresos}</span>
									</div>
									{#if resumenSinTarjeta.ultimo_egreso}
										<div class="text-xs text-gray-500 mt-2">
											Último: {new Date(resumenSinTarjeta.ultimo_egreso).toLocaleDateString('es-MX')}
										</div>
									{/if}
								</div>
							</button>
						{/if}

						<!-- Cards de Tarjetas -->
						{#each resumenTarjetas as tarjeta}
							<button
								type="button"
								class="bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer hover:shadow-md transition text-left w-full"
								class:border-gray-800={filtroTarjeta === tarjeta.id_tarjeta}
								class:border-gray-200={filtroTarjeta !== tarjeta.id_tarjeta}
								onclick={() => filtroTarjeta = filtroTarjeta === tarjeta.id_tarjeta ? null : tarjeta.id_tarjeta}
							>
								<div class="flex items-start justify-between mb-4">
									<div class="flex-1">
										<h3 class="text-lg font-bold text-gray-900">{tarjeta.nom_tarjeta}</h3>
										<p class="text-xs text-gray-500 mt-1">{tarjeta.banco || 'Sin banco'}</p>
									</div>
									<div class="bg-blue-100 rounded-full p-2">
										<svg class="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
										</svg>
									</div>
								</div>

								<div class="space-y-2">
									<div>
										<p class="text-2xl font-bold text-gray-900">{formatCurrency(parseFloat(tarjeta.total_gastado))}</p>
										<p class="text-xs text-gray-500">Total gastado</p>
									</div>

									<div class="grid grid-cols-2 gap-2 text-sm">
										<div>
											<p class="text-gray-600">Saldo usado:</p>
											<p class="font-medium text-gray-900">{formatCurrency(parseFloat(tarjeta.saldo_usado))}</p>
										</div>
										<div>
											<p class="text-gray-600">Disponible:</p>
											<p class="font-medium text-green-600">{formatCurrency(parseFloat(tarjeta.linea_credito) - parseFloat(tarjeta.saldo_usado))}</p>
										</div>
									</div>

									<div class="flex justify-between text-sm pt-2 border-t border-gray-100">
										<span class="text-gray-600">Transacciones:</span>
										<span class="font-medium text-gray-900">{tarjeta.total_egresos}</span>
									</div>

									{#if tarjeta.msi_activas > 0}
										<div class="bg-gray-50 rounded-lg p-2 mt-2">
											<div class="flex justify-between text-xs">
												<span class="text-gray-600">{tarjeta.msi_activas} MSI activas</span>
												<span class="font-medium text-gray-900">{formatCurrency(parseFloat(tarjeta.cuotas_msi_mensuales))}/mes</span>
											</div>
										</div>
									{/if}

									{#if tarjeta.ultimo_egreso}
										<div class="text-xs text-gray-500 mt-2">
											Último: {new Date(tarjeta.ultimo_egreso).toLocaleDateString('es-MX')}
										</div>
									{/if}
								</div>
							</button>
						{/each}
					</div>

					<!-- Botón para limpiar filtro -->
					{#if filtroTarjeta !== null}
						<div class="mt-4 text-center">
							<button
								onclick={() => filtroTarjeta = null}
								class="text-sm text-gray-600 hover:text-gray-900 underline"
							>
								Mostrar todos los egresos
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Tabla de Egresos -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-bold text-gray-900">
						{#if filtroTarjeta === -1}
							Egresos en Efectivo/Transferencia
						{:else if filtroTarjeta}
							Egresos de {resumenTarjetas.find(t => t.id_tarjeta === filtroTarjeta)?.nom_tarjeta || 'Tarjeta'}
						{:else}
							Todos los Egresos
						{/if}
					</h2>
				</div>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Establecimiento</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma de Pago</th>
								<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
								<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each egresosFiltrados as egreso}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{new Date(egreso.fecha_egreso).toLocaleDateString('es-MX')}
									</td>
									<td class="px-6 py-4 text-sm text-gray-900">
										{egreso.concepto}
										{#if egreso.descripcion}
											<p class="text-xs text-gray-500">{egreso.descripcion}</p>
										{/if}
									</td>
									<td class="px-6 py-4 text-sm text-gray-500">
										{egreso.establecimiento || '-'}
									</td>
									<td class="px-6 py-4 text-sm text-gray-500">
										<div class="flex flex-col gap-1">
											<span class="capitalize font-medium text-gray-700">{egreso.forma_pago}</span>
											{#if egreso.nom_tarjeta}
												<span class="text-xs text-gray-600">
													{egreso.nom_tarjeta}
													{#if egreso.banco}
														<span class="text-gray-400">- {egreso.banco}</span>
													{/if}
												</span>
											{/if}
											{#if egreso.compra_meses}
												<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-white w-fit">
													{egreso.num_meses} MSI
												</span>
											{/if}
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
										{formatCurrency(parseFloat(egreso.monto))}
										{#if egreso.compra_meses}
											<p class="text-xs text-gray-500 font-normal">
												{formatCurrency(parseFloat(egreso.monto_mensual))}/mes
											</p>
											<p class="text-xs text-gray-600 font-normal">
												{egreso.meses_pagados}/{egreso.num_meses} pagados
											</p>
										{/if}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-right text-sm">
										<div class="flex justify-end gap-3">
											<button
												onclick={() => { handleEdit(egreso); }}
												class="text-gray-600 hover:text-gray-900 font-medium"
											>
												Editar
											</button>
											<button
												onclick={() => { handleDelete(egreso.id_egreso); }}
												class="text-red-600 hover:text-red-900 font-medium"
											>
												Eliminar
											</button>
										</div>
									</td>
								</tr>
							{/each}
							{#if egresosFiltrados.length === 0 && !loading}
								<tr>
									<td colspan="6" class="px-6 py-20 text-center text-gray-500">
										{#if filtroTarjeta !== null}
											No hay egresos para este filtro
										{:else}
											No hay egresos registrados
										{/if}
									</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>

	{#if showModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
				<div class="p-6">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-2xl font-bold text-gray-900">{editingId ? 'Editar Egreso' : 'Nuevo Egreso'}</h2>
						<button onclick={() => { showModal = false; editingId = null; }} class="text-gray-400 hover:text-gray-600" aria-label="Cerrar modal">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
							</svg>
						</button>
					</div>

					<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
						<div>
							<label for="concepto" class="block text-sm font-medium text-gray-700 mb-2">Concepto</label>
							<input
								id="concepto"
								bind:value={formData.concepto}
								required
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
								placeholder="Ej: Supermercado, Gasolina, Comida"
							/>
						</div>

						<div>
							<label for="establecimiento" class="block text-sm font-medium text-gray-700 mb-2">Establecimiento</label>
							<input
								id="establecimiento"
								bind:value={formData.establecimiento}
								class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
								placeholder="Ej: OXXO, Walmart"
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

						{#if String(formData.id_forma_pago) === '2'}
							<div>
								<label for="tarjeta" class="block text-sm font-medium text-gray-700 mb-2">Tarjeta</label>
								<select
									id="tarjeta"
									bind:value={formData.id_tarjeta}
									class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
								>
									<option value="">Ninguna</option>
									{#each tarjetas as tarjeta}
										<option value={String(tarjeta.id_tarjeta)}>{tarjeta.nom_tarjeta} - {tarjeta.banco}</option>
									{/each}
								</select>
							</div>

							<!-- Compra a meses -->
							<div class="border-t pt-4">
								<div class="flex items-center mb-4">
									<input
										id="compra_meses"
										type="checkbox"
										bind:checked={formData.compra_meses}
										class="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-400"
									/>
									<label for="compra_meses" class="ml-2 text-sm font-medium text-gray-700">
										¿Compra a meses sin intereses?
									</label>
								</div>

								{#if formData.compra_meses}
									<div class="space-y-4 pl-6 border-l-2 border-gray-200">
										<div>
											<label for="num_meses" class="block text-sm font-medium text-gray-700 mb-2">
												Número de meses
											</label>
											<select
												id="num_meses"
												bind:value={formData.num_meses}
												required={formData.compra_meses}
												class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
											>
												<option value="">Seleccionar...</option>
												<option value="3">3 meses</option>
												<option value="6">6 meses</option>
												<option value="9">9 meses</option>
												<option value="12">12 meses</option>
												<option value="18">18 meses</option>
												<option value="24">24 meses</option>
												<option value="36">36 meses</option>
												<option value="48">48 meses</option>
											</select>
										</div>

										<div>
											<label for="mes_inicio_pago" class="block text-sm font-medium text-gray-700 mb-2">
												¿Cuándo inicia el pago?
											</label>
											<select
												id="mes_inicio_pago"
												bind:value={formData.mes_inicio_pago}
												class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
											>
												<option value="0">Siguiente corte (inmediato)</option>
												<option value="1">En 1 mes</option>
												<option value="2">En 2 meses</option>
												<option value="3">En 3 meses</option>
												<option value="4">En 4 meses</option>
												<option value="5">En 5 meses</option>
												<option value="6">En 6 meses</option>
												<option value="7">En 7 meses</option>
												<option value="8">En 8 meses</option>
												<option value="9">En 9 meses</option>
												<option value="10">En 10 meses</option>
												<option value="11">En 11 meses</option>
												<option value="12">En 12 meses</option>
											</select>
										</div>

										{#if formData.num_meses && formData.monto}
											<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
												<p class="text-sm font-medium text-gray-900">
													Pago mensual: {formatCurrency(parseFloat(formData.monto) / parseInt(formData.num_meses))}
												</p>
												<p class="text-xs text-gray-600 mt-1">
													{formData.num_meses} pagos mensuales
													{#if parseInt(formData.mes_inicio_pago) > 0}
														• Primer pago en {formData.mes_inicio_pago} {parseInt(formData.mes_inicio_pago) === 1 ? 'mes' : 'meses'}
													{:else}
														• Primer pago en el siguiente corte
													{/if}
												</p>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/if}

						<div>
							<label for="fecha_egreso" class="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
							<input
								id="fecha_egreso"
								bind:value={formData.fecha_egreso}
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

	<ExportModal bind:show={showExportModal} onClose={() => { showExportModal = false; }} />
	<Footer />
</ProtectedRoute>
