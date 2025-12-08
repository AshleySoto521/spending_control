<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';

	let activeSection = $state('inicio');

	function scrollToSection(id: string) {
		activeSection = id;
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<ProtectedRoute>
	<Navbar />

	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<!-- Header -->
			<div class="text-center mb-12">
				<h1 class="text-4xl font-bold text-gray-900 mb-4">Centro de Ayuda</h1>
				<p class="text-xl text-gray-600">
					Aprende a usar Control de Gastos y toma el control de tus finanzas
				</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
				<!-- Sidebar - Índice -->
				<aside class="lg:col-span-1">
					<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
						<h2 class="text-lg font-bold text-gray-900 mb-4">Contenido</h2>
						<nav class="space-y-2">
							<button
								onclick={() => scrollToSection('inicio')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'inicio'}
								class:text-white={activeSection === 'inicio'}
								class:text-gray-700={activeSection !== 'inicio'}
							>
								¿Qué es Control de Gastos?
							</button>
							<button
								onclick={() => scrollToSection('dashboard')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'dashboard'}
								class:text-white={activeSection === 'dashboard'}
								class:text-gray-700={activeSection !== 'dashboard'}
							>
								Dashboard
							</button>
							<button
								onclick={() => scrollToSection('ingresos')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'ingresos'}
								class:text-white={activeSection === 'ingresos'}
								class:text-gray-700={activeSection !== 'ingresos'}
							>
								Ingresos
							</button>
							<button
								onclick={() => scrollToSection('egresos')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'egresos'}
								class:text-white={activeSection === 'egresos'}
								class:text-gray-700={activeSection !== 'egresos'}
							>
								Egresos (Gastos)
							</button>
							<button
								onclick={() => scrollToSection('tarjetas')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'tarjetas'}
								class:text-white={activeSection === 'tarjetas'}
								class:text-gray-700={activeSection !== 'tarjetas'}
							>
								Tarjetas de Crédito
							</button>
							<button
								onclick={() => scrollToSection('pagos')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'pagos'}
								class:text-white={activeSection === 'pagos'}
								class:text-gray-700={activeSection !== 'pagos'}
							>
								Pagos de Tarjetas
							</button>
							<button
								onclick={() => scrollToSection('msi')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'msi'}
								class:text-white={activeSection === 'msi'}
								class:text-gray-700={activeSection !== 'msi'}
							>
								Meses Sin Intereses
							</button>
							<button
								onclick={() => scrollToSection('perfil')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'perfil'}
								class:text-white={activeSection === 'perfil'}
								class:text-gray-700={activeSection !== 'perfil'}
							>
								Mi Perfil
							</button>
							<button
								onclick={() => scrollToSection('consejos')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'consejos'}
								class:text-white={activeSection === 'consejos'}
								class:text-gray-700={activeSection !== 'consejos'}
							>
								Consejos y Buenas Prácticas
							</button>
						</nav>
					</div>
				</aside>

				<!-- Main Content -->
				<main class="lg:col-span-3 space-y-12">
					<!-- Inicio -->
					<section id="inicio" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8">
						<h2 class="text-3xl font-bold text-gray-900 mb-6">¿Qué es Control de Gastos?</h2>
						<div class="space-y-4 text-gray-700">
							<p class="text-lg">
								Control de Gastos es tu asistente personal para manejar tu dinero de forma inteligente.
								Te ayuda a saber cuánto entra, cuánto sale y en qué lo gastas.
							</p>
							<div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
								<p class="font-semibold text-blue-900 mb-2">¿Para qué sirve?</p>
								<ul class="list-disc list-inside space-y-1 text-blue-800">
									<li>Ver todo tu dinero en un solo lugar</li>
									<li>Registrar tus entradas de dinero (salarios, ventas, etc.)</li>
									<li>Llevar el control de tus gastos diarios</li>
									<li>Administrar tus tarjetas de crédito</li>
									<li>Nunca olvidar un pago importante</li>
									<li>Entender en qué gastas tu dinero</li>
								</ul>
							</div>
							<p class="text-lg">
								Es como tener un cuaderno donde anotas todo, pero mucho más inteligente porque hace
								cuentas por ti y te avisa de cosas importantes.
							</p>
						</div>
					</section>

					<!-- Dashboard -->
					<section id="dashboard" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8">
						<h2 class="text-3xl font-bold text-gray-900 mb-6">Dashboard - Tu Vista Principal</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								El Dashboard es como la pantalla principal de tu televisor. Aquí ves un resumen de todo
								lo importante sin tener que buscar.
							</p>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">📊 Resumen Financiero</h3>
									<p class="text-sm">
										Muestra cuatro números importantes: cuánto dinero te ha entrado, cuánto has
										gastado, cuánto te queda disponible y cuánto debes en tarjetas.
									</p>
								</div>

								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">💳 Próximos Pagos de Tarjetas</h3>
									<p class="text-sm">
										Te avisa qué tarjetas tienes que pagar pronto, cuánto debes pagar y para cuándo.
									</p>
								</div>

								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">📅 Cuotas MSI Pendientes</h3>
									<p class="text-sm">
										Si compraste algo a meses sin intereses, aquí ves cuántas mensualidades te
										faltan pagar.
									</p>
								</div>

								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">📈 Últimos Movimientos</h3>
									<p class="text-sm">
										Una lista de tus gastos e ingresos más recientes, como un estado de cuenta pero
										más simple.
									</p>
								</div>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Revisa tu dashboard cada mañana como si fuera el clima del día. Te toma 30 segundos
									y sabrás exactamente cómo van tus finanzas.
								</p>
							</div>
						</div>
					</section>

					<!-- Ingresos -->
					<section id="ingresos" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8">
						<h2 class="text-3xl font-bold text-gray-900 mb-6">Ingresos - Registra tu Dinero que Entra</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Los ingresos son todo el dinero que recibes: tu sueldo, un pago que te hicieron, una
								venta, un regalo, etc.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">¿Cómo registrar un ingreso?</h3>
								<ol class="list-decimal list-inside space-y-2 text-blue-800">
									<li>Ve a la sección "Ingresos" en el menú</li>
									<li>Haz clic en "Nuevo Ingreso"</li>
									<li>Escribe cuánto dinero recibiste (ejemplo: $5,000)</li>
									<li>
										Elige el tipo de ingreso (Salario, Venta, Otro, etc.) - esto te ayudará a saber
										de dónde viene tu dinero
									</li>
									<li>Selecciona la fecha en que recibiste el dinero</li>
									<li>
										Elige cómo lo recibiste (Efectivo, Transferencia, etc.) - importante para saber
										dónde tienes el dinero
									</li>
									<li>Si quieres, agrega una descripción (ejemplo: "Pago de la quincena")</li>
									<li>Haz clic en "Guardar"</li>
								</ol>
							</div>

							<div class="bg-yellow-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-2">📝 Ejemplos de Ingresos</h3>
								<ul class="space-y-1 text-sm">
									<li>✓ Salario quincenal: $8,000</li>
									<li>✓ Venta de un producto: $1,200</li>
									<li>✓ Regalo de cumpleaños: $500</li>
									<li>✓ Reembolso de un gasto: $300</li>
								</ul>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Registra tus ingresos tan pronto como los recibas. Si esperas mucho, puedes
									olvidarte y tus números no serán correctos.
								</p>
							</div>
						</div>
					</section>

					<!-- Egresos -->
					<section id="egresos" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8">
						<h2 class="text-3xl font-bold text-gray-900 mb-6">Egresos - Registra tus Gastos</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Los egresos son todo el dinero que sale de tu bolsillo o cuenta: el súper, la gasolina,
								salidas a comer, pagos de servicios, etc.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">¿Cómo registrar un gasto?</h3>
								<ol class="list-decimal list-inside space-y-2 text-blue-800">
									<li>Ve a la sección "Egresos" en el menú</li>
									<li>Haz clic en "Nuevo Egreso"</li>
									<li>Escribe cuánto gastaste (ejemplo: $450)</li>
									<li>Pon un nombre corto (ejemplo: "Súper", "Gasolina", "Comida")</li>
									<li>Selecciona dónde lo compraste (ejemplo: "Walmart", "Oxxo")</li>
									<li>Elige la fecha del gasto</li>
									<li>Selecciona cómo pagaste (Efectivo, Tarjeta, Transferencia)</li>
									<li>Si fue con tarjeta, selecciona cuál tarjeta usaste</li>
									<li>Si quieres, agrega más detalles en la descripción</li>
									<li>Haz clic en "Guardar"</li>
								</ol>
							</div>

							<div class="bg-purple-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">
									🔢 ¿Compras a Meses Sin Intereses (MSI)?
								</h3>
								<p class="text-sm mb-2">
									Si compraste algo a meses (como un celular en 12 meses), marca la casilla "Meses
									Sin Intereses" y escribe:
								</p>
								<ul class="list-disc list-inside space-y-1 text-sm pl-4">
									<li>Cuántos meses son (ejemplo: 12 meses)</li>
									<li>El total que pagaste (ejemplo: $12,000)</li>
								</ul>
								<p class="text-sm mt-2 text-purple-800">
									La aplicación calculará automáticamente cuánto pagas cada mes ($1,000 en este
									ejemplo) y te recordará cuándo pagar.
								</p>
							</div>

							<div class="bg-yellow-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-2">📝 Ejemplos de Gastos</h3>
								<ul class="space-y-1 text-sm">
									<li>✓ Despensa en Walmart: $1,800</li>
									<li>✓ Gasolina en estación: $600</li>
									<li>✓ Netflix mensual: $199</li>
									<li>✓ Celular a 12 MSI en Liverpool: $15,000 (pagas $1,250 al mes)</li>
									<li>✓ Cena en restaurante: $850</li>
								</ul>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Usa nombres cortos y consistentes. Si siempre pones "Súper" para el
									supermercado, luego podrás ver fácilmente cuánto gastas en total cada mes.
								</p>
							</div>
						</div>
					</section>

					<!-- Tarjetas -->
					<section id="tarjetas" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8">
						<h2 class="text-3xl font-bold text-gray-900 mb-6">
							Tarjetas de Crédito - Administra tus Plásticos
						</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Aquí registras todas tus tarjetas de crédito para llevar un control de cuánto debes,
								cuánto puedes gastar y cuándo tienes que pagar.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">¿Cómo agregar una tarjeta?</h3>
								<ol class="list-decimal list-inside space-y-2 text-blue-800">
									<li>Ve a la sección "Tarjetas" en el menú</li>
									<li>Haz clic en "Nueva Tarjeta"</li>
									<li>Ponle un nombre fácil de recordar (ejemplo: "BBVA Azul", "Banamex Oro")</li>
									<li>Escribe el banco (BBVA, Banamex, Santander, etc.)</li>
									<li>
										Escribe tu límite de crédito - es cuánto te presta el banco (ejemplo: $30,000)
									</li>
									<li>
										Pon qué día del mes se corta tu tarjeta (ejemplo: 15) - lo encuentras en tu
										estado de cuenta
									</li>
									<li>Pon cuántos días tienes para pagar después del corte (ejemplo: 20 días)</li>
									<li>Escribe los últimos 4 dígitos de tu tarjeta (opcional, solo para identificarla)</li>
									<li>Haz clic en "Guardar"</li>
								</ol>
							</div>

							<div class="bg-yellow-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">🗓️ ¿Qué es el día de corte y límite de pago?</h3>
								<div class="space-y-2 text-sm">
									<p>
										<strong>Día de corte:</strong> Es como una "foto" que toma el banco de lo que
										debes. Por ejemplo, si tu corte es el día 15, el banco suma todos tus gastos
										del 16 del mes pasado hasta el 15 de este mes.
									</p>
									<p>
										<strong>Días de gracia:</strong> Es el tiempo que te da el banco para pagar
										después del corte. Si tu corte es el 15 y tienes 20 días de gracia, tienes
										hasta el 4 o 5 del siguiente mes para pagar.
									</p>
									<p class="text-gray-600 italic">
										Ejemplo: Si tu corte es el 15 de enero, debes pagar antes del 4 de febrero.
									</p>
								</div>
							</div>

							<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
								<p class="font-semibold text-red-900 mb-2">⚠️ Importante</p>
								<p class="text-red-800">
									La aplicación te ayuda a llevar el control, pero tú eres responsable de hacer los
									pagos a tiempo. Revisa siempre tu estado de cuenta del banco para confirmar.
								</p>
							</div>
						</div>
					</section>

					<!-- Pagos de Tarjetas -->
					<section id="pagos" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8">
						<h2 class="text-3xl font-bold text-gray-900 mb-6">
							Pagos de Tarjetas - Registra tus Abonos
						</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Cada vez que pagas tu tarjeta de crédito, debes registrarlo aquí para que la aplicación
								sepa que ya no debes esa cantidad.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">¿Cómo registrar un pago de tarjeta?</h3>
								<ol class="list-decimal list-inside space-y-2 text-blue-800">
									<li>Ve a la sección "Pagos de Tarjetas" en el menú</li>
									<li>Haz clic en "Nuevo Pago"</li>
									<li>Selecciona qué tarjeta pagaste</li>
									<li>Escribe cuánto pagaste (puede ser el mínimo, total o una cantidad que tú decidas)</li>
									<li>Pon la fecha en que hiciste el pago</li>
									<li>
										Selecciona con qué pagaste (Efectivo, Transferencia, Débito) - de dónde salió
										el dinero
									</li>
									<li>Si quieres, agrega una nota (ejemplo: "Pago total mes de enero")</li>
									<li>Haz clic en "Guardar"</li>
								</ol>
							</div>

							<div class="bg-purple-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">💳 Tipos de Pago</h3>
								<div class="space-y-2 text-sm">
									<p>
										<strong>Pago mínimo:</strong> Es lo menos que puedes pagar para no tener
										problemas con el banco, pero se te cobran intereses.
									</p>
									<p>
										<strong>Pago para no generar intereses:</strong> Es pagar todo lo que gastaste
										en el periodo. Es lo más recomendado.
									</p>
									<p>
										<strong>Pago total:</strong> Incluye todo: lo que gastaste + deudas anteriores + intereses.
									</p>
								</div>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Trata siempre de pagar más del mínimo. Entre más pagues, menos intereses te
									cobrarán y más rápido saldrás de deudas.
								</p>
							</div>
						</div>
					</section>

					<!-- MSI -->
					<section id="msi" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8">
						<h2 class="text-3xl font-bold text-gray-900 mb-6">
							Meses Sin Intereses (MSI) - Compras a Plazos
						</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Cuando compras algo a meses sin intereses, la aplicación te ayuda a recordar cuánto
								debes pagar cada mes y cuántas mensualidades te faltan.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">¿Cómo funciona?</h3>
								<div class="space-y-3 text-blue-800">
									<p>
										Cuando registras un gasto con MSI (en la sección de Egresos), la aplicación
										automáticamente:
									</p>
									<ul class="list-disc list-inside space-y-1 pl-4">
										<li>Divide el total entre el número de meses</li>
										<li>Te muestra cuánto pagas cada mes</li>
										<li>Te recuerda en el Dashboard cuándo toca pagar</li>
										<li>Lleva la cuenta de cuántos meses te faltan</li>
									</ul>
								</div>
							</div>

							<div class="bg-yellow-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">📝 Ejemplo Práctico</h3>
								<div class="space-y-2 text-sm">
									<p>Compraste una laptop en $18,000 a 12 meses sin intereses:</p>
									<ul class="list-disc list-inside space-y-1 pl-4">
										<li>Pagarás $1,500 cada mes</li>
										<li>En el Dashboard verás: "Laptop - 8/12 meses pagados"</li>
										<li>Cuando pagues un mes, marcas la cuota como pagada</li>
										<li>La aplicación actualiza: "Laptop - 9/12 meses pagados"</li>
									</ul>
								</div>
							</div>

							<div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
								<h3 class="font-semibold text-purple-900 mb-2">🎯 Marcar una Cuota como Pagada</h3>
								<p class="text-sm text-purple-800">
									En el Dashboard, en la sección "Próximas Cuotas MSI", encontrarás un botón
									"Marcar Pagada" junto a cada compra. Presiónalo cada mes que pagues para llevar
									el control correcto.
								</p>
							</div>

							<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
								<p class="font-semibold text-red-900 mb-2">⚠️ Recuerda</p>
								<p class="text-red-800">
									"Sin intereses" NO significa gratis. Debes pagar completo cada mes, si no pagas,
									el banco puede cobrarte intereses sobre todo lo que debes.
								</p>
							</div>
						</div>
					</section>

					<!-- Perfil -->
					<section id="perfil" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8">
						<h2 class="text-3xl font-bold text-gray-900 mb-6">Mi Perfil - Tus Datos</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Aquí puedes ver y actualizar tu información personal y cambiar tu contraseña.
							</p>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">👤 Información Personal</h3>
									<p class="text-sm">Puedes actualizar tu nombre, email y número de teléfono.</p>
								</div>

								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">🔒 Cambiar Contraseña</h3>
									<p class="text-sm">
										Por seguridad, cambia tu contraseña cada cierto tiempo. Necesitas saber tu
										contraseña actual.
									</p>
								</div>
							</div>

							<div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
								<p class="font-semibold text-blue-900 mb-2">🔐 Seguridad</p>
								<ul class="list-disc list-inside space-y-1 text-blue-800 text-sm">
									<li>Tu contraseña debe tener al menos 8 caracteres</li>
									<li>No compartas tu contraseña con nadie</li>
									<li>Cierra sesión si usas una computadora compartida</li>
								</ul>
							</div>
						</div>
					</section>

					<!-- Consejos -->
					<section id="consejos" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8">
						<h2 class="text-3xl font-bold text-gray-900 mb-6">
							Consejos y Buenas Prácticas
						</h2>
						<div class="space-y-6 text-gray-700">
							<div class="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
								<h3 class="font-semibold text-gray-900 mb-4 text-xl">
									🌟 Consejos para Usar la Aplicación
								</h3>
								<div class="space-y-3">
									<div class="flex items-start gap-3">
										<span class="text-2xl">1️⃣</span>
										<div>
											<p class="font-semibold">Sé Constante</p>
											<p class="text-sm">
												Registra tus gastos el mismo día. Si dejas pasar días, se te olvidarán
												cosas y tus números no serán correctos.
											</p>
										</div>
									</div>

									<div class="flex items-start gap-3">
										<span class="text-2xl">2️⃣</span>
										<div>
											<p class="font-semibold">Usa Nombres Consistentes</p>
											<p class="text-sm">
												Si un día pones "Súper" y otro día "Supermercado", la aplicación los
												verá como diferentes. Decide un nombre y úsalo siempre.
											</p>
										</div>
									</div>

									<div class="flex items-start gap-3">
										<span class="text-2xl">3️⃣</span>
										<div>
											<p class="font-semibold">Revisa tu Dashboard Diariamente</p>
											<p class="text-sm">
												Solo toma un minuto y te mantiene consciente de tu situación financiera.
											</p>
										</div>
									</div>

									<div class="flex items-start gap-3">
										<span class="text-2xl">4️⃣</span>
										<div>
											<p class="font-semibold">Registra TODO</p>
											<p class="text-sm">
												Incluso los gastos pequeños como un café o un chicle. $20 aquí y $30 allá
												suman mucho al final del mes.
											</p>
										</div>
									</div>

									<div class="flex items-start gap-3">
										<span class="text-2xl">5️⃣</span>
										<div>
											<p class="font-semibold">Revisa tus Gastos Frecuentes</p>
											<p class="text-sm">
												El Dashboard te muestra en qué gastas más. Úsalo para encontrar áreas
												donde puedes ahorrar.
											</p>
										</div>
									</div>
								</div>
							</div>

							<div class="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-200">
								<h3 class="font-semibold text-gray-900 mb-4 text-xl">
									💰 Consejos Financieros Generales
								</h3>
								<div class="space-y-3">
									<div class="flex items-start gap-3">
										<span class="text-xl">💳</span>
										<div>
											<p class="font-semibold">Paga Más del Mínimo</p>
											<p class="text-sm">
												Si solo pagas el mínimo de tu tarjeta, tardarás años en salir de deudas
												por los intereses.
											</p>
										</div>
									</div>

									<div class="flex items-start gap-3">
										<span class="text-xl">🎯</span>
										<div>
											<p class="font-semibold">Establece un Presupuesto</p>
											<p class="text-sm">
												Decide cuánto puedes gastar en cada categoría (comida, transporte,
												entretenimiento) y respétalo.
											</p>
										</div>
									</div>

									<div class="flex items-start gap-3">
										<span class="text-xl">🚨</span>
										<div>
											<p class="font-semibold">Ten un Fondo de Emergencias</p>
											<p class="text-sm">
												Trata de ahorrar para imprevistos. Lo ideal es tener al menos 3 meses de
												gastos guardados.
											</p>
										</div>
									</div>

									<div class="flex items-start gap-3">
										<span class="text-xl">📊</span>
										<div>
											<p class="font-semibold">Revisa Tus Estados de Cuenta</p>
											<p class="text-sm">
												Compara lo que dice la aplicación con tus estados de cuenta del banco.
												Pueden haber cargos que olvidaste registrar.
											</p>
										</div>
									</div>
								</div>
							</div>

							<div class="bg-purple-50 border-l-4 border-purple-500 p-6 rounded">
								<p class="font-semibold text-purple-900 mb-2">🎓 Recuerda</p>
								<p class="text-purple-800">
									Esta aplicación es una herramienta que te ayuda a organizarte, pero la disciplina y
									las decisiones son tuyas. ¡Tú tienes el control de tu dinero!
								</p>
							</div>
						</div>
					</section>

					<!-- Necesitas más ayuda -->
					<section class="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-lg p-8 text-white">
						<h2 class="text-2xl font-bold mb-4">¿Necesitas Más Ayuda?</h2>
						<p class="mb-6">
							Si algo no te quedó claro o tienes problemas usando la aplicación, no dudes en contactarnos.
						</p>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="bg-white/10 p-4 rounded-lg">
								<h3 class="font-semibold mb-2">📧 Email</h3>
								<p class="text-sm text-gray-300">contactoaquastudio@gmail.com</p>
							</div>
							<div class="bg-white/10 p-4 rounded-lg">
								<h3 class="font-semibold mb-2">🌐 Sitio Web</h3>
								<p class="text-sm text-gray-300">controlgastosmx.vercel.app</p>
							</div>
						</div>
					</section>
				</main>
			</div>
		</div>
	</div>

	<Footer />
</ProtectedRoute>
