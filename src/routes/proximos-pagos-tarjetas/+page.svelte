<script lang="ts">
	import { onMount } from 'svelte';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { authStore } from '$lib/stores/auth';
	import { apiGet } from '$lib/utils/apiClient';

	let loading = $state(true);
	let error = $state('');
	let proximosPagos: any[] = $state([]);

	async function loadProximosPagos() {
		try {
			const token = $authStore.token;
			const response = await apiGet('/api/proximos-pagos-tarjetas', token);

			if (!response.ok) {
				throw new Error('Error al cargar próximos pagos');
			}

			const data = await response.json();
			proximosPagos = data.proximos_pagos || [];
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadProximosPagos();
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

	function getDiasRestantes(fechaLimite: string): number {
		const hoy = new Date();
		const limite = new Date(fechaLimite);
		const diff = limite.getTime() - hoy.getTime();
		return Math.ceil(diff / (1000 * 60 * 60 * 24));
	}

	function getEstadoPago(diasRestantes: number): string {
		if (diasRestantes < 0) return 'vencido';
		if (diasRestantes <= 7) return 'urgente';
		return 'normal';
	}
</script>

<ProtectedRoute>
	<Navbar />

	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Próximos Pagos de Tarjetas</h1>
				<p class="mt-2 text-gray-600">
					Todos los pagos pendientes de tus tarjetas de crédito
				</p>
			</div>

			{#if loading}
				<div class="flex justify-center py-20">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
				</div>
			{:else if error}
				<div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
					{error}
				</div>
			{:else if proximosPagos.length === 0}
				<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">No hay pagos pendientes</h3>
					<p class="mt-1 text-sm text-gray-500">
						No tienes pagos de tarjeta pendientes en este momento.
					</p>
				</div>
			{:else}
				<!-- Resumen general -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<div class="flex items-center">
							<div class="shrink-0 bg-gray-100 rounded-lg p-3">
								<svg class="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
								</svg>
							</div>
							<div class="ml-5">
								<p class="text-sm font-medium text-gray-500">Total de Tarjetas</p>
								<p class="text-2xl font-bold text-gray-900">{proximosPagos.length}</p>
							</div>
						</div>
					</div>

					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<div class="flex items-center">
							<div class="shrink-0 bg-red-100 rounded-lg p-3">
								<svg class="h-6 w-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
							</div>
							<div class="ml-5">
								<p class="text-sm font-medium text-gray-500">Total a Pagar</p>
								<p class="text-2xl font-bold text-gray-900">
									{formatCurrency(proximosPagos.reduce((sum, p) => sum + parseFloat(p.monto_pago || 0), 0))}
								</p>
							</div>
						</div>
					</div>

					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<div class="flex items-center">
							<div class="shrink-0 bg-yellow-100 rounded-lg p-3">
								<svg class="h-6 w-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
							</div>
							<div class="ml-5">
								<p class="text-sm font-medium text-gray-500">Pagos Urgentes</p>
								<p class="text-2xl font-bold text-gray-900">
									{proximosPagos.filter(p => getDiasRestantes(p.fecha_limite_pago) <= 7 && getDiasRestantes(p.fecha_limite_pago) >= 0).length}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Lista de pagos -->
				<div class="space-y-4">
					{#each proximosPagos as pago}
						{@const diasRestantes = getDiasRestantes(pago.fecha_limite_pago)}
						{@const estado = getEstadoPago(diasRestantes)}

						<div
							class="bg-white rounded-xl shadow-sm border-2 p-6 transition-all hover:shadow-md"
							class:border-red-300={estado === 'vencido'}
							class:border-yellow-300={estado === 'urgente'}
							class:border-gray-200={estado === 'normal'}
						>
							<div class="flex flex-col md:flex-row md:items-center md:justify-between">
								<!-- Información de la tarjeta -->
								<div class="flex-1 mb-4 md:mb-0">
									<div class="flex items-start justify-between">
										<div>
											<h3 class="text-lg font-bold text-gray-900">{pago.nom_tarjeta}</h3>
											<p class="text-sm text-gray-500">{pago.banco || 'Banco'}</p>
										</div>
										{#if estado === 'vencido'}
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
												Vencido
											</span>
										{:else if estado === 'urgente'}
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
												Urgente
											</span>
										{/if}
									</div>

									<div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
										<div>
											<p class="text-gray-600">Periodo:</p>
											<p class="font-medium text-gray-900">
												{formatDate(pago.fecha_corte_anterior, { day: '2-digit', month: '2-digit' })}
												al
												{formatDate(pago.fecha_corte, { day: '2-digit', month: '2-digit', year: 'numeric' })}
											</p>
										</div>
										<div>
											<p class="text-gray-600">Fecha límite de pago:</p>
											<p class="font-medium text-gray-900">
												{formatDate(pago.fecha_limite_pago, { day: 'numeric', month: 'long', year: 'numeric' })}
												<span class="text-xs text-gray-500 ml-1">
													({diasRestantes >= 0 ? `${diasRestantes} días` : `Vencido hace ${Math.abs(diasRestantes)} días`})
												</span>
											</p>
										</div>
									</div>

									{#if pago.num_compras_msi > 0}
										<div class="mt-2 text-xs text-gray-600 bg-blue-50 rounded px-2 py-1 inline-block">
											Incluye {pago.num_compras_msi} compra(s) MSI: {formatCurrency(parseFloat(pago.cuotas_msi_mensuales))}
										</div>
									{/if}

									{#if parseFloat(pago.egresos_periodo) > 0}
										<p class="text-xs text-gray-500 mt-1">
											Gastos del periodo: {formatCurrency(parseFloat(pago.egresos_periodo))}
										</p>
									{/if}

									{#if parseFloat(pago.pagos_realizados) > 0}
										<p class="text-xs text-green-600 mt-1">
											Pagos realizados: {formatCurrency(parseFloat(pago.pagos_realizados))}
										</p>
									{/if}
								</div>

								<!-- Monto del pago -->
								<div class="text-right flex flex-col items-end">
									<p class="text-sm text-gray-500">Pago del periodo</p>
									<p class="text-3xl font-bold text-gray-900">
										{formatCurrency(parseFloat(pago.monto_pago))}
									</p>
									{#if parseFloat(pago.saldo_total) > 0 && parseFloat(pago.saldo_total) !== parseFloat(pago.monto_pago)}
										<p class="text-xs text-gray-400 mt-1">
											Saldo total: {formatCurrency(parseFloat(pago.saldo_total))}
										</p>
									{/if}

									<a
										href="/pagos-tarjetas"
										class="mt-3 inline-flex items-center px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
										</svg>
										Registrar Pago
									</a>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<Footer />
</ProtectedRoute>
