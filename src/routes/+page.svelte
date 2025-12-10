<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';

	onMount(() => {
		// Si ya está autenticado, redirigir al dashboard
		if ($authStore.isAuthenticated) {
			goto('/dashboard');
		}
	});

	function goToLogin() {
		goto('/login');
	}

	function goToRegister() {
		goto('/register');
	}
</script>

<div class="min-h-screen bg-linear-to-b from-gray-50 to-white">
	<!-- Navbar -->
	<nav class="bg-white border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<div class="flex items-center">
					<span class="text-2xl font-bold text-gray-800">💰 Control de Gastos</span>
				</div>
				<div class="flex items-center gap-4">
					<button onclick={goToLogin} class="text-gray-700 hover:text-gray-900 font-medium transition-colors">
						Iniciar Sesión
					</button>
					<button onclick={goToRegister} class="btn-primary">
						Registrarse
					</button>
				</div>
			</div>
		</div>
	</nav>

	<!-- Hero Section -->
	<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
		<div class="text-center">
			<h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
				Toma el control de tus
				<span class="text-gray-800 block mt-2">finanzas personales</span>
			</h1>
			<p class="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
				La forma más simple y efectiva de gestionar tus gastos, seguir tus ingresos y alcanzar tus metas financieras. Todo en un solo lugar.
			</p>
			<div class="flex gap-4 justify-center">
				<button onclick={goToRegister} class="btn-primary text-lg px-8 py-4">
					Comenzar Gratis
				</button>
				<button onclick={goToLogin} class="btn-secondary text-lg px-8 py-4">
					Ya tengo cuenta
				</button>
			</div>
		</div>

		<!-- Hero Visual -->
		<div class="mt-16 max-w-4xl mx-auto">
			<div class="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
				<div class="grid grid-cols-3 gap-6">
					<div class="text-center p-6 bg-gray-50 rounded-xl">
						<div class="text-4xl mb-3">📊</div>
						<div class="text-2xl font-bold text-gray-900">$12,450</div>
						<div class="text-sm text-gray-600">Balance Total</div>
					</div>
					<div class="text-center p-6 bg-gray-50 rounded-xl">
						<div class="text-4xl mb-3">💸</div>
						<div class="text-2xl font-bold text-gray-900">$3,280</div>
						<div class="text-sm text-gray-600">Gastos del Mes</div>
					</div>
					<div class="text-center p-6 bg-gray-50 rounded-xl">
						<div class="text-4xl mb-3">💰</div>
						<div class="text-2xl font-bold text-gray-900">$5,500</div>
						<div class="text-sm text-gray-600">Ingresos del Mes</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="bg-gray-50 py-20">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center mb-16">
				<h2 class="text-4xl font-bold text-gray-900 mb-4">
					Todo lo que necesitas para gestionar tu dinero
				</h2>
				<p class="text-xl text-gray-600">
					Herramientas poderosas diseñadas para simplificar tu vida financiera
				</p>
			</div>

			<div class="grid md:grid-cols-3 gap-8">
				<!-- Feature 1 -->
				<div class="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
					<div class="w-14 h-14 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
						<span class="text-2xl">📱</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Registro Rápido de Gastos</h3>
					<p class="text-gray-600">
						Registra tus gastos en segundos. Categoriza automáticamente y mantén un registro detallado de cada transacción.
					</p>
				</div>

				<!-- Feature 2 -->
				<div class="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
					<div class="w-14 h-14 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
						<span class="text-2xl">💳</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Control de Tarjetas</h3>
					<p class="text-gray-600">
						Gestiona tus tarjetas de crédito, rastrea pagos pendientes y nunca pierdas de vista tus fechas de corte.
					</p>
				</div>

				<!-- Feature 3 -->
				<div class="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
					<div class="w-14 h-14 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
						<span class="text-2xl">📈</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Reportes Inteligentes</h3>
					<p class="text-gray-600">
						Visualiza tus patrones de gasto, identifica oportunidades de ahorro y toma decisiones informadas.
					</p>
				</div>

				<!-- Feature 4 -->
				<div class="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
					<div class="w-14 h-14 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
						<span class="text-2xl">📊</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Proyección Financiera</h3>
					<p class="text-gray-600">
						Proyecta tu saldo futuro simulando los pagos de tarjetas por quincena. Anticipa problemas y planifica mejor.
					</p>
				</div>

				<!-- Feature 5 -->
				<div class="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
					<div class="w-14 h-14 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
						<span class="text-2xl">🔒</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Seguridad Total</h3>
					<p class="text-gray-600">
						Tus datos están protegidos con encriptación de nivel bancario. Tu privacidad es nuestra prioridad.
					</p>
				</div>

				<!-- Feature 6 -->
				<div class="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
					<div class="w-14 h-14 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
						<span class="text-2xl">⚡</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Acceso en Tiempo Real</h3>
					<p class="text-gray-600">
						Consulta tu información financiera desde cualquier dispositivo, en cualquier momento y lugar.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Benefits Section -->
	<section class="py-20">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="grid md:grid-cols-2 gap-12 items-center">
				<div>
					<h2 class="text-4xl font-bold text-gray-900 mb-6">
						¿Por qué elegir Control de Gastos?
					</h2>
					<div class="space-y-6">
						<div class="flex gap-4">
							<div class="shrink-0 w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
								<span class="text-xl">✓</span>
							</div>
							<div>
								<h3 class="text-lg font-bold text-gray-900 mb-2">Simple y Fácil de Usar</h3>
								<p class="text-gray-600">
									Diseñado para que cualquier persona pueda gestionar sus finanzas sin complicaciones.
								</p>
							</div>
						</div>

						<div class="flex gap-4">
							<div class="shrink-0 w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
								<span class="text-xl">✓</span>
							</div>
							<div>
								<h3 class="text-lg font-bold text-gray-900 mb-2">Completamente Gratis</h3>
								<p class="text-gray-600">
									Todas las funcionalidades esenciales sin costo alguno. Sin trucos ni sorpresas.
								</p>
							</div>
						</div>

						<div class="flex gap-4">
							<div class="shrink-0 w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
								<span class="text-xl">✓</span>
							</div>
							<div>
								<h3 class="text-lg font-bold text-gray-900 mb-2">Ahorra Tiempo y Dinero</h3>
								<p class="text-gray-600">
									Identifica gastos innecesarios y optimiza tu presupuesto para alcanzar tus metas más rápido.
								</p>
							</div>
						</div>

						<div class="flex gap-4">
							<div class="shrink-0 w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
								<span class="text-xl">✓</span>
							</div>
							<div>
								<h3 class="text-lg font-bold text-gray-900 mb-2">Soporte Dedicado</h3>
								<p class="text-gray-600">
									Nuestro equipo está siempre disponible para ayudarte con cualquier duda o problema.
								</p>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-linear-to-br from-gray-800 to-gray-900 rounded-2xl p-10 text-white">
					<div class="text-5xl mb-4">🚀</div>
					<h3 class="text-3xl font-bold mb-4">Comienza hoy mismo</h3>
					<p class="text-gray-300 mb-6">
						Únete a miles de usuarios que ya están tomando el control de sus finanzas personales.
					</p>
					<ul class="space-y-3 mb-8">
						<li class="flex items-center gap-2">
							<span class="text-green-400">✓</span>
							<span>Creación de cuenta en 30 segundos</span>
						</li>
						<li class="flex items-center gap-2">
							<span class="text-green-400">✓</span>
							<span>Sin tarjeta de crédito requerida</span>
						</li>
						<li class="flex items-center gap-2">
							<span class="text-green-400">✓</span>
							<span>Cancela cuando quieras</span>
						</li>
					</ul>
					<button onclick={goToRegister} class="w-full bg-white text-gray-900 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors">
						Crear mi cuenta gratis
					</button>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="bg-gray-900 text-white py-16">
		<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
			<h2 class="text-4xl font-bold mb-4">
				¿Listo para tomar el control?
			</h2>
			<p class="text-xl text-gray-300 mb-8">
				No esperes más para mejorar tu salud financiera. Comienza gratis hoy.
			</p>
			<button onclick={goToRegister} class="bg-white text-gray-900 px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors">
				Comenzar Ahora
			</button>
		</div>
	</section>

	<!-- Footer -->
	<footer class="bg-white border-t border-gray-200 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center text-gray-600">
				<p class="mb-2">Control de Gastos - Tu aliado financiero personal</p>
				<p class="text-sm">
					¿Necesitas ayuda? Contacta a
					<a href="mailto:contactoaquastudio@gmail.com" class="text-gray-800 hover:underline font-medium">
						soporte
					</a>
				</p>
			</div>
		</div>
	</footer>
</div>
