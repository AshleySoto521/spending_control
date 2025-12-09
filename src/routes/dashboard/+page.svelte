<script lang="ts">
	import { onMount } from 'svelte';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import WelcomeModal from '$lib/components/WelcomeModal.svelte';
	import { authStore } from '$lib/stores/auth';
	import { apiGet, apiPost } from '$lib/utils/apiClient';

	let loading = $state(true);
	let error = $state('');
	let dashboardData: any = $state(null);
	let showWelcomeModal = $state(false);

	async function loadDashboard() {
		try {
			const token = $authStore.token;
			const response = await apiGet('/api/dashboard', token);

			if (!response.ok) {
				throw new Error('Error al cargar dashboard');
			}

			dashboardData = await response.json();
		} catch (err: any) {
			// Los errores 401/403 ya fueron manejados por apiClient
			// Solo mostrar otros errores aquí
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}

	function checkFirstTimeUser() {
		// Verificar si ya se mostró el modal de bienvenida
		const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');

		if (!hasSeenWelcome) {
			// Mostrar modal solo después de cargar el dashboard
			setTimeout(() => {
				showWelcomeModal = true;
			}, 500);
		}
	}

	function handleCloseWelcome() {
		showWelcomeModal = false;
		// Marcar como visto en localStorage
		localStorage.setItem('hasSeenWelcome', 'true');
	}

	onMount(() => {
		loadDashboard();
		checkFirstTimeUser();
	});

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(amount);
	}

	function formatDate(dateString: string, options: Intl.DateTimeFormatOptions = {}): string {
		return new Date(dateString).toLocaleDateString('es-MX', {
			...options,
			timeZone: 'UTC'
		});
	}

	async function marcarCuotaPagada(idEgreso: number) {
		try {
			const token = $authStore.token;
			const response = await apiPost(`/api/egresos/${idEgreso}/meses-pagados`, token, {});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Error al marcar cuota como pagada');
			}

			// Recargar dashboard
			await loadDashboard();
		} catch (err: any) {
			// Los errores 401/403 ya fueron manejados por apiClient
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
				setTimeout(() => {
					error = '';
				}, 3000);
			}
		}
	}
</script>

<ProtectedRoute>
	<Navbar />

	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
				<p class="mt-2 text-gray-600">Resumen de tus finanzas</p>
			</div>

			{#if loading}
				<div class="flex justify-center items-center py-20">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
				</div>
			{:else if error}
				<div class="bg-gray-100 border border-gray-300 text-gray-900 px-4 py-3 rounded-lg">
					{error}
				</div>
			{:else if dashboardData}
				<!-- Tarjetas de resumen -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-500">Total Ingresos</p>
								<p class="text-2xl font-bold text-gray-900 mt-2">
									{formatCurrency(parseFloat(dashboardData.resumen.total_ingresos))}
								</p>
							</div>
							<div class="bg-gray-100 rounded-full p-3">
								<svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
								</svg>
							</div>
						</div>
					</div>

					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-500">Total Egresos</p>
								<p class="text-2xl font-bold text-gray-900 mt-2">
									{formatCurrency(parseFloat(dashboardData.resumen.total_egresos))}
								</p>
							</div>
							<div class="bg-gray-100 rounded-full p-3">
								<svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
								</svg>
							</div>
						</div>
					</div>

					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-500">Saldo Actual</p>
								<p class="text-2xl font-bold text-gray-900 mt-2">
									{formatCurrency(parseFloat(dashboardData.resumen.saldo_actual))}
								</p>
							</div>
							<div class="bg-gray-100 rounded-full p-3">
								<svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
							</div>
						</div>
					</div>

					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-500">Deuda Tarjetas</p>
								<p class="text-2xl font-bold text-gray-900 mt-2">
									{formatCurrency(parseFloat(dashboardData.tarjetas.deuda_total))}
								</p>
								<p class="text-xs text-gray-500 mt-1">
									{dashboardData.tarjetas.num_tarjetas} tarjeta(s)
								</p>
							</div>
							<div class="bg-gray-100 rounded-full p-3">
								<svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
								</svg>
							</div>
						</div>
					</div>
				</div>

				<!-- Próximos Pagos -->
				{#if dashboardData.proximos_pagos && dashboardData.proximos_pagos.length > 0}
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
						<div class="flex justify-between items-center mb-4">
							<h2 class="text-lg font-bold text-gray-900">Próximos Pagos de Tarjetas</h2>
							<a
								href="/proximos-pagos-tarjetas"
								class="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
							>
								Ver todos
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
								</svg>
							</a>
						</div>
						<div class="space-y-3">
							{#each dashboardData.proximos_pagos as pago}
								<div class="flex justify-between items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
									<div class="flex-1">
										<p class="text-sm font-medium text-gray-900">{pago.nom_tarjeta}</p>
										<p class="text-xs text-gray-500">{pago.banco || 'Banco'}</p>
										<p class="text-xs text-gray-600 mt-1">
											Periodo: {formatDate(pago.fecha_corte_anterior, {
												day: '2-digit',
												month: '2-digit'
											})} al {formatDate(pago.fecha_corte, {
												day: '2-digit',
												month: '2-digit',
												year: 'numeric'
											})}
										</p>
										<p class="text-xs text-gray-600 mt-1">
											Límite de pago: {formatDate(pago.fecha_limite_pago, {
												day: 'numeric',
												month: 'long',
												year: 'numeric'
											})}
										</p>
										{#if pago.num_compras_msi > 0}
											<div class="mt-2 text-xs text-gray-600 bg-blue-50 rounded px-2 py-1 inline-block">
												📊 Incluye {pago.num_compras_msi} compra(s) MSI: {formatCurrency(parseFloat(pago.cuotas_msi_mensuales))}
											</div>
										{/if}
										{#if parseFloat(pago.egresos_periodo) > 0}
											<p class="text-xs text-gray-500 mt-1">
												Gastos del periodo: {formatCurrency(parseFloat(pago.egresos_periodo))}
											</p>
										{/if}
									</div>
									<div class="text-right flex flex-col items-end">
										<p class="text-sm font-bold text-gray-900">
											{formatCurrency(parseFloat(pago.monto_pago))}
										</p>
										<p class="text-xs text-gray-500 mt-0.5">Pago del periodo</p>
										{#if parseFloat(pago.saldo_total) > 0 && parseFloat(pago.saldo_total) !== parseFloat(pago.monto_pago)}
											<p class="text-xs text-gray-400 mt-1">
												Saldo total: {formatCurrency(parseFloat(pago.saldo_total))}
											</p>
										{/if}
										{#if new Date(pago.fecha_limite_pago) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
											<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-white mt-1">
												Próximo
											</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Próximas Cuotas MSI -->
				{#if dashboardData.proximas_cuotas_msi && dashboardData.proximas_cuotas_msi.length > 0}
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
						<h2 class="text-lg font-bold text-gray-900 mb-4">Próximas Cuotas MSI (Meses Sin Intereses)</h2>
						<div class="space-y-3">
							{#each dashboardData.proximas_cuotas_msi as cuota}
								<div class="flex justify-between items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
									<div class="flex-1">
										<p class="text-sm font-medium text-gray-900">{cuota.concepto}</p>
										<p class="text-xs text-gray-500">{cuota.nom_tarjeta} - {cuota.banco || 'Banco'}</p>
										<p class="text-xs text-gray-600 mt-1">
											{cuota.establecimiento || 'Sin establecimiento'}
										</p>
										<p class="text-xs text-gray-600 mt-1">
											Progreso: {cuota.meses_pagados}/{cuota.num_meses} cuotas pagadas
										</p>
										{#if cuota.fecha_proxima_cuota}
											<p class="text-xs text-gray-600 mt-1">
												Próxima cuota: {formatDate(cuota.fecha_proxima_cuota, {
													day: 'numeric',
													month: 'long',
													year: 'numeric'
												})}
											</p>
										{/if}
									</div>
									<div class="text-right flex flex-col items-end">
										<p class="text-sm font-bold text-gray-900">
											{formatCurrency(parseFloat(cuota.monto_mensual))}/mes
										</p>
										<p class="text-xs text-gray-500 mt-1">
											Pendiente: {formatCurrency(parseFloat(cuota.monto_pendiente))}
										</p>
										<span
											class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1"
											class:bg-red-100={cuota.estado === 'atrasado'}
											class:text-red-800={cuota.estado === 'atrasado'}
											class:bg-green-100={cuota.estado === 'al_corriente'}
											class:text-green-800={cuota.estado === 'al_corriente'}
											class:bg-gray-100={cuota.estado === 'completado'}
											class:text-gray-800={cuota.estado === 'completado'}
										>
											{cuota.estado === 'atrasado' ? 'Atrasado' : cuota.estado === 'al_corriente' ? 'Al corriente' : 'Completado'}
										</span>
										<button
											onclick={() => marcarCuotaPagada(cuota.id_egreso)}
											class="mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded hover:bg-gray-700 transition-colors"
											title="Marcar cuota como pagada"
										>
											Marcar Pagada
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
					<!-- Gastos más frecuentes -->
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-bold text-gray-900 mb-4">Gastos Más Frecuentes</h2>
						{#if dashboardData.gastos_frecuentes.length > 0}
							<div class="space-y-3">
								{#each dashboardData.gastos_frecuentes.slice(0, 5) as gasto}
									<div class="flex justify-between items-center">
										<div class="flex-1">
											<p class="text-sm font-medium text-gray-900">{gasto.concepto}</p>
											<p class="text-xs text-gray-500">{gasto.frecuencia} veces</p>
										</div>
										<div class="text-right">
											<p class="text-sm font-bold text-gray-900">
												{formatCurrency(parseFloat(gasto.total_gastado))}
											</p>
											<p class="text-xs text-gray-500">
												Promedio: {formatCurrency(parseFloat(gasto.promedio_gasto))}
											</p>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 text-center py-8">No hay datos disponibles</p>
						{/if}
					</div>

					<!-- Distribución por forma de pago -->
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-bold text-gray-900 mb-4">Distribución por Forma de Pago</h2>
						{#if dashboardData.distribucion_forma_pago.length > 0}
							<div class="space-y-3">
								{#each dashboardData.distribucion_forma_pago as forma}
									<div class="flex justify-between items-center">
										<div class="flex-1">
											<p class="text-sm font-medium text-gray-900 capitalize">{forma.tipo}</p>
											<p class="text-xs text-gray-500">{forma.cantidad} transacciones</p>
										</div>
										<p class="text-sm font-bold text-gray-900">
											{formatCurrency(parseFloat(forma.total))}
										</p>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 text-center py-8">No hay datos disponibles</p>
						{/if}
					</div>
				</div>

				<!-- Últimos movimientos -->
				<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-bold text-gray-900 mb-4">Últimos Movimientos</h2>
					{#if dashboardData.ultimos_movimientos.length > 0}
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
										<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each dashboardData.ultimos_movimientos as movimiento}
										<tr>
											<td class="px-6 py-4 whitespace-nowrap">
												<span
													class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
													class:bg-gray-100={movimiento.tipo === 'ingreso'}
													class:text-gray-800={movimiento.tipo === 'ingreso'}
													class:bg-gray-800={movimiento.tipo === 'egreso'}
													class:text-white={movimiento.tipo === 'egreso'}
													class:bg-blue-100={movimiento.tipo === 'pago_tarjeta'}
													class:text-blue-800={movimiento.tipo === 'pago_tarjeta'}
												>
													{movimiento.tipo === 'pago_tarjeta' ? 'pago tarjeta' : movimiento.tipo}
												</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{formatDate(movimiento.fecha)}
											</td>
											<td class="px-6 py-4 text-sm text-gray-900">
												{movimiento.descripcion}
												{#if movimiento.detalle}
													<span class="text-gray-500 text-xs block">{movimiento.detalle}</span>
												{/if}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
												{movimiento.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(parseFloat(movimiento.monto))}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="text-gray-500 text-center py-8">No hay movimientos registrados</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<Footer />

	<!-- Modal de Bienvenida -->
	{#if showWelcomeModal}
		<WelcomeModal
			userName={$authStore.user?.nombre || 'Usuario'}
			onClose={handleCloseWelcome}
		/>
	{/if}
</ProtectedRoute>
