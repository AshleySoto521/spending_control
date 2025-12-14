<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { page } from '$app/stores';

	// SEO Configuration
	const seoConfig = {
		title: 'Control de Gastos México - Gestiona tus Finanzas Personales Gratis',
		description: 'App gratuita de control de gastos para México. Proyecta tu futuro financiero, gestiona tarjetas de crédito, registra ingresos y egresos. Herramienta 100% gratis hecha para mexicanos.',
		keywords: 'control de gastos, finanzas personales méxico, app gastos gratis, control tarjetas crédito, presupuesto personal, gestión financiera, control dinero, app financiera méxico, gastos quincenales',
		url: 'https://controlgastosmx.vercel.app',
		image: 'https://controlgastosmx.vercel.app/og-image.png',
		siteName: 'ControlGastosMX',
		locale: 'es_MX',
		type: 'website'
	};

	onMount(() => {
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

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{seoConfig.title}</title>
	<meta name="title" content={seoConfig.title} />
	<meta name="description" content={seoConfig.description} />
	<meta name="keywords" content={seoConfig.keywords} />
	<meta name="author" content="Aqua Studio" />
	<meta name="robots" content="index, follow" />
	<meta name="language" content="Spanish" />
	<meta name="revisit-after" content="7 days" />

	<!-- Canonical URL -->
	<link rel="canonical" href={seoConfig.url} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={seoConfig.type} />
	<meta property="og:url" content={seoConfig.url} />
	<meta property="og:title" content={seoConfig.title} />
	<meta property="og:description" content={seoConfig.description} />
	<meta property="og:image" content={seoConfig.image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content={seoConfig.siteName} />
	<meta property="og:locale" content={seoConfig.locale} />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content={seoConfig.url} />
	<meta property="twitter:title" content={seoConfig.title} />
	<meta property="twitter:description" content={seoConfig.description} />
	<meta property="twitter:image" content={seoConfig.image} />

	<!-- Mobile Optimization -->
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="theme-color" content="#1f2937" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

	<!-- Geographic Tags -->
	<meta name="geo.region" content="MX" />
	<meta name="geo.placename" content="México" />

	<!-- Structured Data / JSON-LD for Google -->
	{@html `
		<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			"name": "ControlGastosMX",
			"applicationCategory": "FinanceApplication",
			"operatingSystem": "Web, iOS, Android",
			"offers": {
				"@type": "Offer",
				"price": "0",
				"priceCurrency": "MXN"
			},
			"aggregateRating": {
				"@type": "AggregateRating",
				"ratingValue": "4.8",
				"ratingCount": "127"
			},
			"description": "${seoConfig.description}",
			"screenshot": "${seoConfig.image}",
			"featureList": [
				"Proyección Financiera",
				"Control de Tarjetas de Crédito",
				"Registro de Gastos e Ingresos",
				"Reportes y Gráficas",
				"Gestión de Préstamos",
				"Sincronización en la Nube"
			],
			"inLanguage": "es-MX",
			"availableOnDevice": ["Desktop", "Mobile", "Tablet"],
			"softwareVersion": "1.0",
			"author": {
				"@type": "Organization",
				"name": "Aqua Studio",
				"url": "${seoConfig.url}",
				"email": "contactoaquastudio@gmail.com"
			},
			"provider": {
				"@type": "Organization",
				"name": "Aqua Studio"
			}
		}
		<\/script>
	`}
</svelte:head>

<div class="min-h-screen bg-linear-to-b from-gray-50 to-white">
	<nav class="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<div class="flex items-center gap-2">
					<span class="text-2xl">💰</span>
					<span class="text-xl font-bold text-gray-800 tracking-tight">ControlGastos<span class="text-blue-600">MX</span></span>
				</div>
				<div class="flex items-center gap-4">
					<button onclick={goToLogin} class="text-gray-600 hover:text-gray-900 font-medium transition-colors hidden sm:block">
						Iniciar Sesión
					</button>
					<button onclick={goToRegister} class="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
						Registrarse
					</button>
				</div>
			</div>
		</div>
	</nav>

	<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16 lg:pt-24">
		<div class="text-center max-w-4xl mx-auto">
			<div class="inline-block bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-blue-100">
				✨ Nueva función: Proyección de Saldos
			</div>
			<h1 class="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
				Control de Gastos y Finanzas Personales en México
				<span class="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600 block mt-2">100% Gratis y Fácil de Usar</span>
			</h1>
			<p class="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
				Gestiona tu dinero, proyecta tu futuro financiero y controla tus tarjetas de crédito. <strong>App mexicana</strong> que entiende tus quincenas, meses sin intereses y necesidades reales.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
				<button onclick={goToRegister} class="w-full sm:w-auto bg-gray-900 text-white text-lg px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
					Comenzar Gratis Ahora
				</button>
				<button onclick={goToLogin} class="w-full sm:w-auto text-gray-600 text-lg px-8 py-4 font-medium hover:text-gray-900 transition-colors">
					Ya tengo cuenta &rarr;
				</button>
			</div>
		</div>

		<div class="mt-20 flex justify-center perspective-1000">
			<div class="relative bg-gray-900 rounded-[3rem] p-4 shadow-2xl border-4 border-gray-800 max-w-[320px] sm:max-w-[380px] w-full transform rotate-x-12 hover:rotate-0 transition-transform duration-700">
				<div class="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-20"></div>
				
				<div class="bg-white rounded-[2.5rem] overflow-hidden h-[600px] flex flex-col relative">
					<div class="bg-blue-600 p-8 pt-12 text-white">
						<div class="text-sm opacity-80 mb-1">Balance Total</div>
						<div class="text-4xl font-bold">$12,450.00</div>
						<div class="mt-4 inline-flex gap-2 text-xs bg-blue-500/30 p-2 rounded-lg items-center">
							<span>📅</span> <span>Faltan 5 días para la quincena</span>
						</div>
					</div>

					<div class="p-6 grid grid-cols-2 gap-4 -mt-6">
						<div class="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
							<div class="text-red-500 text-sm font-bold mb-1">Gastos</div>
							<div class="text-xl font-bold text-gray-800">$3,280</div>
						</div>
						<div class="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
							<div class="text-green-500 text-sm font-bold mb-1">Ingresos</div>
							<div class="text-xl font-bold text-gray-800">$5,500</div>
						</div>
					</div>

					<div class="px-6 flex-1">
						<h3 class="font-bold text-gray-800 mb-4">Movimientos recientes</h3>
						<div class="space-y-3">
							<div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">☕</div>
									<div class="text-sm font-medium">Starbucks</div>
								</div>
								<span class="text-red-600 font-bold">-$85.00</span>
							</div>
							<div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">💰</div>
									<div class="text-sm font-medium">Nómina</div>
								</div>
								<span class="text-green-600 font-bold">+$8,000</span>
							</div>
						</div>
					</div>
					
					<div class="bg-white border-t p-4 flex justify-around text-2xl text-gray-400">
						<div class="text-blue-600">🏠</div>
						<div>📊</div>
						<div>💳</div>
						<div>⚙️</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="bg-gray-50 py-24">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center mb-16">
				<h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
					Tu dinero, bajo tus reglas
				</h2>
				<p class="text-xl text-gray-600 max-w-2xl mx-auto">
					Herramientas diseñadas para la realidad económica de México. Sin complicaciones.
				</p>
			</div>

			<div class="grid md:grid-cols-3 gap-8">
				
				<div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
					<div class="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">STAR</div>
					<div class="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
						<span class="text-3xl">🔮</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Proyección Financiera</h3>
					<p class="text-gray-600 leading-relaxed">
						¿Te alcanzará para la tarjeta? Nuestra herramienta te dice <strong>hoy</strong> cómo terminarás la quincena simulando tus pagos futuros.
					</p>
				</div>

				<div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
					<div class="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
						<span class="text-3xl">⚡</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Registro Flash</h3>
					<p class="text-gray-600 leading-relaxed">
						Registra tus gastos en lo que tardas en pedir tu café. Categorización automática y sin formularios eternos.
					</p>
				</div>

				<div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
					<div class="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
						<span class="text-3xl">💳</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Control de Tarjetas</h3>
					<p class="text-gray-600 leading-relaxed">
						Gestiona fechas de corte y pagos mínimos. Nunca más pagues intereses por olvidar una fecha.
					</p>
				</div>

				<div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
					<div class="w-14 h-14 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
						<span class="text-3xl">📈</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Reportes Claros</h3>
					<p class="text-gray-600 leading-relaxed">
						Gráficas que sí se entienden. Visualiza a dónde se va tu dinero y encuentra fugas de capital al instante.
					</p>
				</div>

				<div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
					<div class="w-14 h-14 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
						<span class="text-3xl">🔒</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Privacidad Total</h3>
					<p class="text-gray-600 leading-relaxed">
						Tus finanzas son asunto tuyo. Datos encriptados nivel bancario y política de cero venta de datos.
					</p>
				</div>

				<div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
					<div class="w-14 h-14 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
						<span class="text-3xl">☁️</span>
					</div>
					<h3 class="text-xl font-bold text-gray-900 mb-3">Siempre disponible</h3>
					<p class="text-gray-600 leading-relaxed">
						En tu celular, tablet o computadora. Tu información se sincroniza en tiempo real estés donde estés.
					</p>
				</div>
			</div>
		</div>
	</section>

	<section class="py-20 bg-white">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="grid md:grid-cols-2 gap-16 items-center">
				<div>
					<h2 class="text-4xl font-bold text-gray-900 mb-6 leading-tight">
						¿Por qué <span class="text-blue-600">ControlGastosMX</span> es diferente?
					</h2>
					<div class="space-y-8">
						<div class="flex gap-5">
							<div class="shrink-0 w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
								<span class="text-xl font-bold">✓</span>
							</div>
							<div>
								<h3 class="text-xl font-bold text-gray-900 mb-2">Simplicidad Radical</h3>
								<p class="text-gray-600">
									Otras apps te piden hasta el RFC del comercio. Nosotros solo te pedimos lo esencial para que no te de flojera registrar.
								</p>
							</div>
						</div>

						<div class="flex gap-5">
							<div class="shrink-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
								<span class="text-xl font-bold">✓</span>
							</div>
							<div>
								<h3 class="text-xl font-bold text-gray-900 mb-2">100% Gratis (De verdad)</h3>
								<p class="text-gray-600">
									Todas las funcionalidades PRO están liberadas. Sin periodos de prueba engañosos.
								</p>
							</div>
						</div>

						<div class="flex gap-5">
							<div class="shrink-0 w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
								<span class="text-xl font-bold">✓</span>
							</div>
							<div>
								<h3 class="text-xl font-bold text-gray-900 mb-2">Hecho para México</h3>
								<p class="text-gray-600">
									Entendemos qué es una quincena, qué son los meses sin intereses y cómo funciona tu economía.
								</p>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-gray-900 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
					<div class="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
					<div class="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

					<div class="relative z-10">
						<div class="text-5xl mb-6">🚀</div>
						<h3 class="text-3xl font-bold mb-4">Acceso Anticipado</h3>
						<p class="text-gray-300 mb-8 text-lg">
							Estamos construyendo la mejor herramienta financiera y queremos que seas parte. Crea tu cuenta hoy y obtén acceso ilimitado de por vida.
						</p>
						<ul class="space-y-4 mb-8">
							<li class="flex items-center gap-3">
								<span class="text-green-400 bg-green-400/10 p-1 rounded-full text-xs">✓</span>
								<span>Registro en 30 segundos</span>
							</li>
							<li class="flex items-center gap-3">
								<span class="text-green-400 bg-green-400/10 p-1 rounded-full text-xs">✓</span>
								<span>No pedimos tarjeta</span>
							</li>
						</ul>
						<button onclick={goToRegister} class="w-full bg-white text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg">
							Crear mi cuenta gratis
						</button>
					</div>
				</div>
			</div>
		</div>
	</section>

	<footer class="bg-white border-t border-gray-100 py-12">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex flex-col md:flex-row justify-between items-center gap-6">
				<div class="text-center md:text-left">
					<p class="font-bold text-gray-900 text-lg mb-2">ControlGastosMX</p>
					<p class="text-gray-500 text-sm">Tu aliado financiero personal.</p>
				</div>
				<div class="text-center md:text-center">
					<div class="flex flex-wrap justify-center items-center gap-3 text-sm mb-3">
						<a href="/terminos" class="text-gray-600 hover:text-gray-900 font-medium transition-colors hover:underline">
							Términos y Condiciones
						</a>
						<span class="text-gray-400">|</span>
						<a href="/privacidad" class="text-gray-600 hover:text-gray-900 font-medium transition-colors hover:underline">
							Aviso de Privacidad
						</a>
						<span class="text-gray-400">|</span>
						<a href="/politica-cookies" class="text-gray-600 hover:text-gray-900 font-medium transition-colors hover:underline">
							Política de Cookies
						</a>
					</div>
					<div class="text-gray-500 text-sm">
						<p class="mb-2">¿Necesitas ayuda?</p>
						<a href="mailto:contactoaquastudio@gmail.com" class="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
							contactoaquastudio@gmail.com
						</a>
					</div>
				</div>
			</div>
			<div class="text-center mt-6 text-sm text-gray-500">
				<p>&copy; {new Date().getFullYear()} Aqua Studio. Todos los derechos reservados.</p>
			</div>
		</div>
	</footer>
</div>

<style>
	/* Animación sutil para el fondo del CTA */
	@keyframes blob {
		0% { transform: translate(0px, 0px) scale(1); }
		33% { transform: translate(30px, -50px) scale(1.1); }
		66% { transform: translate(-20px, 20px) scale(0.9); }
		100% { transform: translate(0px, 0px) scale(1); }
	}
	.animate-blob {
		animation: blob 7s infinite;
	}
	.animation-delay-2000 {
		animation-delay: 2s;
	}
</style>