<script lang="ts">
	import { authStore } from '$lib/stores/auth';

	interface Props {
		show: boolean;
		onClose: () => void;
	}

	let { show = $bindable(false), onClose }: Props = $props();

	let loading = $state(false);
	let error = $state('');
	let fechaInicio = $state('');
	let fechaFin = $state('');

	// Establecer fechas por defecto (mes actual)
	$effect(() => {
		if (show && !fechaInicio) {
			const now = new Date();
			const primerDia = new Date(now.getFullYear(), now.getMonth(), 1);
			const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0);

			fechaInicio = primerDia.toISOString().split('T')[0];
			fechaFin = ultimoDia.toISOString().split('T')[0];
		}
	});

	async function handleExport() {
		if (!fechaInicio || !fechaFin) {
			error = 'Por favor selecciona ambas fechas';
			return;
		}

		if (new Date(fechaInicio) > new Date(fechaFin)) {
			error = 'La fecha de inicio no puede ser posterior a la fecha fin';
			return;
		}

		try {
			loading = true;
			error = '';

			const token = $authStore.token;
			const response = await fetch(
				`/api/exportar?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Error al exportar');
			}

			// Descargar el archivo
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `reporte_${fechaInicio}_${fechaFin}.xlsx`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			// Cerrar modal
			onClose();
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		error = '';
		onClose();
	}

	// Funciones para establecer rangos predefinidos
	function setMesActual() {
		const now = new Date();
		const primerDia = new Date(now.getFullYear(), now.getMonth(), 1);
		const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		fechaInicio = primerDia.toISOString().split('T')[0];
		fechaFin = ultimoDia.toISOString().split('T')[0];
	}

	function setMesAnterior() {
		const now = new Date();
		const primerDia = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const ultimoDia = new Date(now.getFullYear(), now.getMonth(), 0);

		fechaInicio = primerDia.toISOString().split('T')[0];
		fechaFin = ultimoDia.toISOString().split('T')[0];
	}

	function setUltimos3Meses() {
		const now = new Date();
		const primerDia = new Date(now.getFullYear(), now.getMonth() - 2, 1);

		fechaInicio = primerDia.toISOString().split('T')[0];
		fechaFin = now.toISOString().split('T')[0];
	}

	function setAnioActual() {
		const now = new Date();
		const primerDia = new Date(now.getFullYear(), 0, 1);

		fechaInicio = primerDia.toISOString().split('T')[0];
		fechaFin = now.toISOString().split('T')[0];
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-xl shadow-xl max-w-lg w-full">
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-2xl font-bold text-gray-900">Exportar a Excel</h2>
					<button
						onclick={handleClose}
						class="text-gray-400 hover:text-gray-600"
						aria-label="Cerrar modal"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{#if error}
					<div class="bg-red-100 border border-red-300 text-red-900 px-4 py-3 rounded-lg mb-4">
						{error}
					</div>
				{/if}

				<div class="space-y-4">
					<!-- Rangos predefinidos -->
					<div>
						<p class="block text-sm font-medium text-gray-700 mb-2">Rangos rápidos:</p>
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								onclick={setMesActual}
								class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
							>
								Mes Actual
							</button>
							<button
								type="button"
								onclick={setMesAnterior}
								class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
							>
								Mes Anterior
							</button>
							<button
								type="button"
								onclick={setUltimos3Meses}
								class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
							>
								Últimos 3 Meses
							</button>
							<button
								type="button"
								onclick={setAnioActual}
								class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
							>
								Año Actual
							</button>
						</div>
					</div>

					<!-- Selección manual de fechas -->
					<div class="border-t pt-4">
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="fecha_inicio" class="block text-sm font-medium text-gray-700 mb-2"
									>Fecha Inicio</label
								>
								<input
									id="fecha_inicio"
									type="date"
									bind:value={fechaInicio}
									required
									class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
								/>
							</div>

							<div>
								<label for="fecha_fin" class="block text-sm font-medium text-gray-700 mb-2"
									>Fecha Fin</label
								>
								<input
									id="fecha_fin"
									type="date"
									bind:value={fechaFin}
									required
									class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
								/>
							</div>
						</div>
					</div>

					<!-- Información sobre el reporte -->
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div class="flex items-start">
							<svg
								class="w-5 h-5 text-blue-600 mt-0.5 mr-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<div class="text-sm text-blue-900">
								<p class="font-medium mb-1">El reporte incluirá:</p>
								<ul class="list-disc list-inside space-y-1 text-xs">
									<li>Hoja 1: Resumen general de movimientos</li>
									<li>Hoja 2: Detalle de ingresos</li>
									<li>Hoja 3: Detalle de egresos</li>
									<li>Hojas adicionales: Resumen por cada tarjeta</li>
								</ul>
							</div>
						</div>
					</div>

					<!-- Botones de acción -->
					<div class="flex space-x-3 pt-4">
						<button
							type="button"
							onclick={handleClose}
							disabled={loading}
							class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
						>
							Cancelar
						</button>
						<button
							type="button"
							onclick={handleExport}
							disabled={loading || !fechaInicio || !fechaFin}
							class="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center"
						>
							{#if loading}
								<svg
									class="animate-spin h-5 w-5 text-white mr-2"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Exportando...
							{:else}
								<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								Exportar
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
