<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { authStore } from '$lib/stores/auth';
	import { apiGet } from '$lib/utils/apiClient';

	interface PagoPendiente {
		id_tarjeta: number;
		nom_tarjeta: string;
		banco: string;
		monto_pago: number;
		fecha_limite_pago: string;
	}

	interface PrestamoPendiente {
		id_prestamo: number;
		nombre: string;
		tipo_prestamo: string;
		monto_pago: number;
		dia_pago: number;
	}

	let loading = $state(true);
	let error = $state('');
	let saldoActual = $state(0);
	let pagosPendientes: PagoPendiente[] = $state([]);
	let prestamosPendientes: PrestamoPendiente[] = $state([]);

	// Configuración de días de pago (guardado en localStorage)
	let diaPrimerPago = $state(15);
	let diaSegundoPago = $state(30);
	let configurando = $state(false);

	const STORAGE_KEY = 'proyeccion_dias_pago';

	onMount(() => {
		loadConfiguracion();
		loadDatos();
	});

	function loadConfiguracion() {
		if (browser) {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const config = JSON.parse(stored);
				diaPrimerPago = config.dia_primer_pago || 15;
				diaSegundoPago = config.dia_segundo_pago || 30;
			}
		}
	}

	function saveConfiguracion() {
		if (browser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({
				dia_primer_pago: diaPrimerPago,
				dia_segundo_pago: diaSegundoPago
			}));
		}
		configurando = false;
	}

	async function loadDatos() {
		try {
			const token = $authStore.token;
			const response = await apiGet('/api/proyeccion', token);

			if (!response.ok) {
				throw new Error('Error al cargar datos de proyección');
			}

			const data = await response.json();
			saldoActual = data.saldo_actual || 0;
			pagosPendientes = data.pagos_pendientes || [];
			prestamosPendientes = data.prestamos_pendientes || [];
		} catch (err: any) {
			if (!err.message.includes('Sesión expirada')) {
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}

	// Funciones de cálculo
	function getPagosPrimeraQuincena(): PagoPendiente[] {
		const hoy = new Date();
		const mesActual = hoy.getMonth();
		const anioActual = hoy.getFullYear();

		const inicioPeriodo = new Date(anioActual, mesActual, 1);
		const finPeriodo = new Date(anioActual, mesActual, diaPrimerPago);

		return pagosPendientes.filter(pago => {
			const fechaLimite = new Date(pago.fecha_limite_pago);
			return fechaLimite >= inicioPeriodo && fechaLimite <= finPeriodo;
		});
	}

	function getPagosSegundaQuincena(): PagoPendiente[] {
		const hoy = new Date();
		const mesActual = hoy.getMonth();
		const anioActual = hoy.getFullYear();

		const inicioPeriodo = new Date(anioActual, mesActual, diaPrimerPago + 1);
		const finPeriodo = new Date(anioActual, mesActual + 1, 0); // Último día del mes

		return pagosPendientes.filter(pago => {
			const fechaLimite = new Date(pago.fecha_limite_pago);
			return fechaLimite >= inicioPeriodo && fechaLimite <= finPeriodo;
		});
	}

	function getPrestamosPrimeraQuincena(): PrestamoPendiente[] {
		return prestamosPendientes.filter(prestamo => prestamo.dia_pago <= diaPrimerPago);
	}

	function getPrestamosSegundaQuincena(): PrestamoPendiente[] {
		return prestamosPendientes.filter(prestamo => prestamo.dia_pago > diaPrimerPago);
	}

	function getTotalPagos(pagos: PagoPendiente[]): number {
		return pagos.reduce((sum, pago) => sum + parseFloat(pago.monto_pago.toString()), 0);
	}

	function getTotalPrestamos(prestamos: PrestamoPendiente[]): number {
		return prestamos.reduce((sum, prestamo) => sum + parseFloat(prestamo.monto_pago.toString()), 0);
	}

	function getSaldoProyectado(pagos: PagoPendiente[], prestamos: PrestamoPendiente[]): number {
		return saldoActual - getTotalPagos(pagos) - getTotalPrestamos(prestamos);
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-MX', {
			day: '2-digit',
			month: 'short',
			timeZone: 'UTC'
		});
	}

	let pagosPrimeraQuincena = $derived(getPagosPrimeraQuincena());
	let pagosSegundaQuincena = $derived(getPagosSegundaQuincena());
	let prestamosPrimeraQuincena = $derived(getPrestamosPrimeraQuincena());
	let prestamosSegundaQuincena = $derived(getPrestamosSegundaQuincena());
	let totalPrimeraQuincena = $derived(getTotalPagos(pagosPrimeraQuincena) + getTotalPrestamos(prestamosPrimeraQuincena));
	let totalSegundaQuincena = $derived(getTotalPagos(pagosSegundaQuincena) + getTotalPrestamos(prestamosSegundaQuincena));
	let saldoPrimeraQuincena = $derived(getSaldoProyectado(pagosPrimeraQuincena, prestamosPrimeraQuincena));
	let saldoSegundaQuincena = $derived(getSaldoProyectado(pagosSegundaQuincena, prestamosSegundaQuincena));
</script>

<ProtectedRoute>
	<Navbar />

	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<!-- Header -->
			<div class="mb-8">
				<div class="flex justify-between items-start">
					<div>
						<h1 class="text-3xl font-bold text-gray-900">Proyección Financiera</h1>
						<p class="mt-2 text-gray-600">
							Simula tus pagos de tarjetas y proyecta tu saldo al final de cada quincena
						</p>
					</div>
					<button
						onclick={() => configurando = !configurando}
						class="btn-secondary"
					>
						⚙️ Configurar Días de Pago
					</button>
				</div>
			</div>

			{#if loading}
				<div class="flex justify-center py-20">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
				</div>
			{:else if error}
				<div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
					{error}
				</div>
			{:else}
				<!-- Configuración de días de pago -->
				{#if configurando}
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
						<h2 class="text-xl font-bold text-gray-900 mb-4">Configurar Días de Pago</h2>
						<p class="text-sm text-gray-600 mb-6">
							Configura los días en que recibes tu pago para calcular las proyecciones de saldo.
						</p>
						<div class="grid md:grid-cols-2 gap-6">
							<div>
								<label for="dia_primer_pago" class="block text-sm font-medium text-gray-700 mb-2">
									Día de pago de primera quincena
								</label>
								<input
									id="dia_primer_pago"
									type="number"
									bind:value={diaPrimerPago}
									min="1"
									max="31"
									class="input-minimal"
								/>
								<p class="mt-1 text-xs text-gray-500">
									Ejemplo: Si te pagan el 15, ingresa 15
								</p>
							</div>
							<div>
								<label for="dia_segundo_pago" class="block text-sm font-medium text-gray-700 mb-2">
									Día de pago de segunda quincena
								</label>
								<input
									id="dia_segundo_pago"
									type="number"
									bind:value={diaSegundoPago}
									min="1"
									max="31"
									class="input-minimal"
								/>
								<p class="mt-1 text-xs text-gray-500">
									Ejemplo: Si te pagan el último día, ingresa 30 o 31
								</p>
							</div>
						</div>
						<div class="mt-6 flex gap-3">
							<button onclick={saveConfiguracion} class="btn-primary">
								Guardar Configuración
							</button>
							<button onclick={() => configurando = false} class="btn-ghost">
								Cancelar
							</button>
						</div>
					</div>
				{/if}

				<!-- Saldo Actual -->
				<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">Saldo Actual</p>
							<p class="text-3xl font-bold text-gray-900 mt-1">
								{formatCurrency(saldoActual)}
							</p>
						</div>
						<div class="bg-gray-100 rounded-full p-4">
							<svg class="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
						</div>
					</div>
					<p class="mt-4 text-sm text-gray-500">
						Este es tu saldo disponible después de considerar ingresos, egresos y pagos de tarjetas realizados.
					</p>
				</div>

				<!-- Proyecciones -->
				<div class="grid md:grid-cols-2 gap-6">
					<!-- Primera Quincena -->
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between mb-4">
							<h2 class="text-xl font-bold text-gray-900">
								Primera Quincena
							</h2>
							<span class="text-sm text-gray-500">
								Día 1 al {diaPrimerPago}
							</span>
						</div>

						{#if pagosPrimeraQuincena.length === 0}
							<div class="text-center py-8">
								<p class="text-gray-500">No hay pagos de tarjetas en este periodo</p>
							</div>
						{:else}
							<div class="space-y-3 mb-4">
								<p class="text-sm font-medium text-gray-600">Pagos a realizar:</p>
								{#each pagosPrimeraQuincena as pago}
									<div class="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
										<div class="flex-1">
											<p class="font-medium text-gray-900">{pago.nom_tarjeta}</p>
											<p class="text-xs text-gray-500">{pago.banco}</p>
											<p class="text-xs text-gray-500 mt-1">
												Vence: {formatDate(pago.fecha_limite_pago)}
											</p>
										</div>
										<p class="font-semibold text-gray-900">
											{formatCurrency(pago.monto_pago)}
										</p>
									</div>
								{/each}
							</div>

							<div class="border-t border-gray-200 pt-4 space-y-2">
								<div class="flex justify-between text-sm">
									<span class="text-gray-600">Total a pagar:</span>
									<span class="font-semibold text-gray-900">
										{formatCurrency(totalPrimeraQuincena)}
									</span>
								</div>
								<div class="flex justify-between text-lg">
									<span class="font-semibold text-gray-900">Saldo proyectado:</span>
									<span
										class="font-bold"
										class:text-green-600={saldoPrimeraQuincena >= 0}
										class:text-red-600={saldoPrimeraQuincena < 0}
									>
										{formatCurrency(saldoPrimeraQuincena)}
									</span>
								</div>
								{#if saldoPrimeraQuincena < 0}
									<p class="text-xs text-red-600 mt-2">
										⚠️ Tu saldo quedaría en negativo. Considera ajustar tus gastos.
									</p>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Segunda Quincena -->
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between mb-4">
							<h2 class="text-xl font-bold text-gray-900">
								Segunda Quincena
							</h2>
							<span class="text-sm text-gray-500">
								Día {diaPrimerPago + 1} al {diaSegundoPago}
							</span>
						</div>

						{#if pagosSegundaQuincena.length === 0}
							<div class="text-center py-8">
								<p class="text-gray-500">No hay pagos de tarjetas en este periodo</p>
							</div>
						{:else}
							<div class="space-y-3 mb-4">
								<p class="text-sm font-medium text-gray-600">Pagos a realizar:</p>
								{#each pagosSegundaQuincena as pago}
									<div class="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
										<div class="flex-1">
											<p class="font-medium text-gray-900">{pago.nom_tarjeta}</p>
											<p class="text-xs text-gray-500">{pago.banco}</p>
											<p class="text-xs text-gray-500 mt-1">
												Vence: {formatDate(pago.fecha_limite_pago)}
											</p>
										</div>
										<p class="font-semibold text-gray-900">
											{formatCurrency(pago.monto_pago)}
										</p>
									</div>
								{/each}
							</div>

							<div class="border-t border-gray-200 pt-4 space-y-2">
								<div class="flex justify-between text-sm">
									<span class="text-gray-600">Total a pagar:</span>
									<span class="font-semibold text-gray-900">
										{formatCurrency(totalSegundaQuincena)}
									</span>
								</div>
								<div class="flex justify-between text-lg">
									<span class="font-semibold text-gray-900">Saldo proyectado:</span>
									<span
										class="font-bold"
										class:text-green-600={saldoSegundaQuincena >= 0}
										class:text-red-600={saldoSegundaQuincena < 0}
									>
										{formatCurrency(saldoSegundaQuincena)}
									</span>
								</div>
								{#if saldoSegundaQuincena < 0}
									<p class="text-xs text-red-600 mt-2">
										⚠️ Tu saldo quedaría en negativo. Considera ajustar tus gastos.
									</p>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Información adicional -->
				<div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div class="flex">
						<svg class="w-5 h-5 text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
						</svg>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-blue-800">Acerca de esta proyección</h3>
							<div class="mt-2 text-sm text-blue-700">
								<p>
									Esta proyección te ayuda a planificar tus finanzas mostrándote cuánto dinero tendrás
									después de pagar tus tarjetas en cada quincena. Los cálculos se basan en:
								</p>
								<ul class="list-disc list-inside mt-2 space-y-1">
									<li>Tu saldo actual (ingresos - egresos - pagos realizados)</li>
									<li>Los pagos pendientes de tarjetas según sus fechas límite</li>
									<li>La configuración de tus días de pago</li>
								</ul>
								<p class="mt-2">
									<strong>Nota:</strong> Esta es una simulación. Los valores reales pueden variar
									según nuevos ingresos, gastos o pagos que realices.
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<Footer />
</ProtectedRoute>
