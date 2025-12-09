<script lang="ts">
	import { goto } from '$app/navigation';

	interface Props {
		userName: string;
		onClose: () => void;
	}

	let { userName, onClose }: Props = $props();

	function handleStartTour() {
		// Redirigir a Tarjetas para comenzar
		onClose();
		goto('/tarjetas');
	}

	function handleViewHelp() {
		// Redirigir al Centro de Ayuda
		onClose();
		goto('/ayuda');
	}

	function handleDismiss() {
		onClose();
	}
</script>

<!-- Modal Overlay -->
<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
	<!-- Modal Content -->
	<div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
		<!-- Header con diseño minimalista -->
		<div class="bg-gray-800 text-white p-8 rounded-t-2xl">
			<h2 class="text-3xl font-bold mb-2">¡Bienvenido a Control de Gastos!</h2>
			<p class="text-gray-300 text-lg">Hola {userName}, estamos felices de tenerte aquí</p>
		</div>

		<!-- Content -->
		<div class="p-8">
			<p class="text-gray-700 text-lg mb-6">
				Esta aplicación te ayudará a tomar control de tus finanzas de forma simple y eficiente.
				Para comenzar, sigue estos pasos:
			</p>

			<!-- Pasos -->
			<div class="space-y-4 mb-8">
				<!-- Paso 1 -->
				<div class="flex items-start gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
					<div class="shrink-0 w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold text-lg">
						1
					</div>
					<div>
						<h3 class="font-bold text-gray-900 text-lg mb-1">Agrega tus tarjetas</h3>
						<p class="text-gray-600 text-sm">
							Registra tus tarjetas de crédito para llevar el control de cuánto gastas y cuánto debes.
						</p>
					</div>
				</div>

				<!-- Paso 2 -->
				<div class="flex items-start gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
					<div class="shrink-0 w-10 h-10 bg-gray-700 text-white rounded-full flex items-center justify-center font-bold text-lg">
						2
					</div>
					<div>
						<h3 class="font-bold text-gray-900 text-lg mb-1">Registra tus ingresos</h3>
						<p class="text-gray-600 text-sm">
							Anota todo el dinero que recibes: salario, ventas, regalos, etc. Así sabrás cuánto tienes disponible.
						</p>
					</div>
				</div>

				<!-- Paso 3 -->
				<div class="flex items-start gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
					<div class="shrink-0 w-10 h-10 bg-gray-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
						3
					</div>
					<div>
						<h3 class="font-bold text-gray-900 text-lg mb-1">Registra tus gastos</h3>
						<p class="text-gray-600 text-sm">
							Cada vez que gastes dinero, regístralo. Verás en qué gastas más y podrás tomar mejores decisiones.
						</p>
					</div>
				</div>

				<!-- Paso 4 -->
				<div class="flex items-start gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
					<div class="shrink-0 w-10 h-10 bg-gray-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
						4
					</div>
					<div>
						<h3 class="font-bold text-gray-900 text-lg mb-1">Revisa tu Dashboard</h3>
						<p class="text-gray-600 text-sm">
							Tu dashboard te mostrará un resumen de tu situación financiera, próximos pagos y más.
						</p>
					</div>
				</div>
			</div>

			<!-- Info adicional -->
			<div class="bg-gray-100 p-4 rounded-lg border border-gray-200 mb-6">
				<p class="text-sm text-gray-700">
					💡 <strong>Tip:</strong> Visita el <strong>Centro de Ayuda</strong> en cualquier momento para aprender
					más sobre todas las funcionalidades de la aplicación.
				</p>
			</div>

			<!-- Botones de acción -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
				<button
					onclick={handleStartTour}
					class="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-md"
				>
					🚀 Comenzar ahora
				</button>

				<button
					onclick={handleViewHelp}
					class="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md"
				>
					📚 Ver Centro de Ayuda
				</button>

				<button
					onclick={handleDismiss}
					class="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all border-2 border-gray-300"
				>
					Cerrar
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			transform: translateY(50px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.3s ease-out;
	}

	.animate-slideUp {
		animation: slideUp 0.4s ease-out;
	}
</style>
