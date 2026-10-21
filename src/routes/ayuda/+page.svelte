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
								Tarjetas
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
								onclick={() => scrollToSection('proximos-pagos')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'proximos-pagos'}
								class:text-white={activeSection === 'proximos-pagos'}
								class:text-gray-700={activeSection !== 'proximos-pagos'}
							>
								Próximos Pagos
							</button>
							<button
								onclick={() => scrollToSection('proyeccion')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'proyeccion'}
								class:text-white={activeSection === 'proyeccion'}
								class:text-gray-700={activeSection !== 'proyeccion'}
							>
								Proyección Financiera
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
								onclick={() => scrollToSection('exportar')}
								class="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100"
								class:bg-gray-800={activeSection === 'exportar'}
								class:text-white={activeSection === 'exportar'}
								class:text-gray-700={activeSection !== 'exportar'}
							>
								Exportar a Excel
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
					<section
						id="inicio"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">¿Qué es Control de Gastos?</h2>
						<div class="space-y-4 text-gray-700">
							<p class="text-lg">
								Control de Gastos es tu asistente personal para manejar tu dinero de forma
								inteligente. Te ayuda a saber cuánto entra, cuánto sale y en qué lo gastas.
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
					<section
						id="dashboard"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">Dashboard - Tu Vista Principal</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								El Dashboard es como la pantalla principal de tu televisor. Aquí ves un resumen de
								todo lo importante sin tener que buscar.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
								<h3 class="font-semibold text-blue-900 mb-3">
									📊 Resumen Financiero (4 Cards Principales)
								</h3>
								<div class="space-y-2 text-blue-800 text-sm">
									<p>
										<strong>1. Total Ingresos:</strong> Suma de todo el dinero que has registrado como
										ingreso. Ejemplo: tu salario, ventas, regalos, etc.
									</p>
									<p>
										<strong>2. Total Egresos:</strong> Suma de todos los gastos que has hecho (súper,
										gasolina, compras, servicios, etc.).
									</p>
									<p>
										<strong>3. Saldo Actual:</strong> Tu dinero disponible (Ingresos - Egresos). Este
										es el dinero que te queda.
									</p>
									<p>
										<strong>4. Deuda Tarjetas:</strong> La suma de todo lo que debes en todas tus tarjetas
										de crédito.
									</p>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">💳 Próximos Pagos de Tarjetas</h3>
									<p class="text-sm mb-2">
										Lista de tarjetas que debes pagar próximamente. Muestra:
									</p>
									<ul class="list-disc list-inside text-sm space-y-1 pl-2">
										<li>Nombre y banco de la tarjeta</li>
										<li>Periodo de corte</li>
										<li>Fecha límite de pago</li>
										<li>Monto a pagar</li>
										<li>Badge "Próximo" si vence en menos de 7 días</li>
									</ul>
								</div>

								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">📅 Cuotas MSI Pendientes</h3>
									<p class="text-sm mb-2">
										Compras a meses sin intereses que tienes activas. Muestra:
									</p>
									<ul class="list-disc list-inside text-sm space-y-1 pl-2">
										<li>Concepto (qué compraste)</li>
										<li>Progreso (cuotas pagadas/total)</li>
										<li>Próxima fecha de pago</li>
										<li>Monto mensual y pendiente</li>
										<li>Botón para marcar cuota pagada</li>
									</ul>
								</div>

								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">🔥 Gastos Más Frecuentes (Top 5)</h3>
									<p class="text-sm">
										Te muestra los 5 gastos que más repites. Por ejemplo, si gastas frecuentemente
										en "Súper", "Gasolina", etc. Útil para identificar en qué gastas más seguido.
									</p>
								</div>

								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">
										💰 Distribución por Forma de Pago
									</h3>
									<p class="text-sm">
										Gráfica que muestra cómo distribuyes tus gastos: cuánto pagas en efectivo,
										cuánto con tarjeta de crédito, transferencias, etc.
									</p>
								</div>

								<div class="bg-gray-50 p-4 rounded-lg">
									<h3 class="font-semibold text-gray-900 mb-2">📈 Últimos Movimientos</h3>
									<p class="text-sm">
										Tabla con tus últimas transacciones (ingresos, egresos y pagos de tarjeta).
										Muestra tipo, fecha, descripción y monto con colores según el tipo de
										movimiento.
									</p>
								</div>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Revisa tu dashboard cada mañana como si fuera el clima del día. Te toma 30
									segundos y sabrás exactamente cómo van tus finanzas. Presta especial atención a
									los pagos próximos marcados como "Próximo" para que no se te pasen las fechas.
								</p>
							</div>
						</div>
					</section>

					<!-- Ingresos -->
					<section
						id="ingresos"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">
							Ingresos - Registra tu Dinero que Entra
						</h2>
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
										Elige el tipo de ingreso (Salario, Venta, Freelance, Otro, etc.) - esto te
										ayudará a saber de dónde viene tu dinero
									</li>
									<li>Selecciona la fecha en que recibiste el dinero</li>
									<li>
										Elige cómo lo recibiste (Efectivo, Transferencia, Depósito, etc.) - importante
										para saber dónde tienes el dinero
									</li>
									<li>Si quieres, agrega una descripción (ejemplo: "Pago de la quincena")</li>
									<li>Haz clic en "Guardar"</li>
								</ol>
							</div>

							<div class="bg-purple-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">✏️ Gestionar tus Ingresos</h3>
								<div class="space-y-2 text-sm">
									<p>
										<strong>Editar un ingreso:</strong> Haz clic en el botón "Editar" (icono de lápiz)
										en la tabla de ingresos. Puedes modificar cualquier dato y guardar los cambios.
									</p>
									<p>
										<strong>Eliminar un ingreso:</strong> Usa el botón "Eliminar" (icono de basura) para
										borrar un ingreso que registraste por error. Ten cuidado, esta acción no se puede
										deshacer.
									</p>
									<p>
										<strong>Exportar a Excel:</strong> Puedes descargar todos tus ingresos en un archivo
										Excel para análisis o respaldo (ver sección "Exportar a Excel").
									</p>
								</div>
							</div>

							<div class="bg-yellow-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-2">📝 Ejemplos de Ingresos</h3>
								<ul class="space-y-1 text-sm">
									<li>✓ Salario quincenal: $8,000</li>
									<li>✓ Venta de un producto: $1,200</li>
									<li>✓ Trabajo freelance: $3,500</li>
									<li>✓ Regalo de cumpleaños: $500</li>
									<li>✓ Reembolso de un gasto: $300</li>
								</ul>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Registra tus ingresos tan pronto como los recibas. Si esperas mucho, puedes
									olvidarte y tus números no serán correctos. La tabla de ingresos te muestra todos
									tus registros ordenados por fecha.
								</p>
							</div>
						</div>
					</section>

					<!-- Egresos -->
					<section
						id="egresos"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">Egresos - Registra tus Gastos</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Los egresos son todo el dinero que sale de tu bolsillo o cuenta: el súper, la
								gasolina, salidas a comer, pagos de servicios, etc.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">¿Cómo registrar un gasto?</h3>
								<ol class="list-decimal list-inside space-y-2 text-blue-800">
									<li>Ve a la sección "Egresos" en el menú</li>
									<li>Haz clic en "Nuevo Egreso"</li>
									<li>Escribe cuánto gastaste (ejemplo: $450)</li>
									<li>Pon un nombre corto - "Concepto" (ejemplo: "Súper", "Gasolina", "Comida")</li>
									<li>
										Selecciona dónde lo compraste - "Establecimiento" (ejemplo: "Walmart", "Oxxo")
									</li>
									<li>Elige la fecha del gasto</li>
									<li>Selecciona cómo pagaste (Efectivo, Tarjeta de Crédito, Transferencia)</li>
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
									Sin Intereses" y especifica:
								</p>
								<ul class="list-disc list-inside space-y-1 text-sm pl-4">
									<li>Cuántos meses son (3, 6, 9, 12, 15, 18, 24, 36 o 48 meses)</li>
									<li>El total que pagaste (ejemplo: $12,000)</li>
									<li>¿Cuándo inicia el pago? (Inmediato o diferido de 1 a 12 meses)</li>
								</ul>
								<p class="text-sm mt-2 text-purple-800">
									La aplicación calculará automáticamente cuánto pagas cada mes ($1,000 en este
									ejemplo) y te recordará cuándo pagar. Si seleccionaste diferido, el primer pago
									iniciará en el mes que elegiste.
								</p>
							</div>

							<div class="bg-cyan-50 border border-cyan-200 rounded-lg p-6">
								<h3 class="font-semibold text-cyan-900 mb-3">
									📊 Resumen por Tarjeta (Cards Superiores)
								</h3>
								<p class="text-sm text-cyan-800 mb-2">
									En la parte superior de la página de Egresos verás cards con resúmenes:
								</p>
								<ul class="list-disc list-inside space-y-1 text-sm text-cyan-800 pl-4">
									<li>
										<strong>Efectivo/Transferencia:</strong> Total gastado en efectivo o transferencias,
										número de transacciones y último egreso
									</li>
									<li>
										<strong>Por cada tarjeta activa:</strong> Total gastado, saldo usado, crédito disponible,
										número de transacciones, MSI activas (si hay) y último egreso
									</li>
								</ul>
								<p class="text-sm mt-2 text-cyan-800">
									<strong>💡 Tip:</strong> Haz clic en cualquier card de tarjeta para filtrar y ver solo
									los egresos de esa tarjeta específica.
								</p>
							</div>

							<div class="bg-indigo-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">🔍 Filtrar Egresos por Tarjeta</h3>
								<p class="text-sm">
									Puedes filtrar tus gastos haciendo clic en el card de cualquier tarjeta en la
									parte superior. Esto te mostrará solo los egresos realizados con esa tarjeta, útil
									para verificar tus gastos antes del corte o para revisar si hay algún cargo que no
									reconoces.
								</p>
							</div>

							<div class="bg-purple-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">✏️ Gestionar tus Egresos</h3>
								<div class="space-y-2 text-sm">
									<p>
										<strong>Editar un egreso:</strong> Haz clic en el botón "Editar" en la tabla de egresos.
										Puedes modificar cualquier dato del gasto.
									</p>
									<p>
										<strong>Eliminar un egreso:</strong> Usa el botón "Eliminar" para borrar un gasto
										registrado por error. Ten cuidado, esta acción no se puede deshacer.
									</p>
									<p>
										<strong>Exportar a Excel:</strong> Descarga todos tus egresos en un archivo Excel
										para análisis detallado (ver sección "Exportar a Excel").
									</p>
								</div>
							</div>

							<div class="bg-yellow-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-2">📝 Ejemplos de Gastos</h3>
								<ul class="space-y-1 text-sm">
									<li>✓ Despensa en Walmart: $1,800 (Efectivo)</li>
									<li>✓ Gasolina en estación: $600 (Tarjeta BBVA)</li>
									<li>✓ Netflix mensual: $199 (Tarjeta Banamex)</li>
									<li>
										✓ Celular a 12 MSI en Liverpool: $15,000 (pagas $1,250 al mes, tarjeta
										Liverpool)
									</li>
									<li>✓ Cena en restaurante: $850 (Tarjeta Santander)</li>
								</ul>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Usa nombres cortos y consistentes en el "Concepto". Si siempre pones "Súper" para
									el supermercado, luego podrás ver fácilmente cuánto gastas en total cada mes. La
									tabla te muestra si el egreso tiene MSI con un badge especial y el desglose
									mensual.
								</p>
							</div>
						</div>
					</section>

					<!-- Tarjetas -->
					<section
						id="tarjetas"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">
							Tarjetas - Administra tus Plásticos
						</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Aquí registras todas tus tarjetas (crédito, débito, departamentales) para llevar un
								control de cuánto debes, cuánto puedes gastar y cuándo tienes que pagar.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">¿Cómo agregar una tarjeta?</h3>
								<ol class="list-decimal list-inside space-y-2 text-blue-800">
									<li>Ve a la sección "Tarjetas" en el menú</li>
									<li>Haz clic en "Nueva Tarjeta"</li>
									<li>
										Ponle un nombre fácil de recordar (ejemplo: "BBVA Azul", "Liverpool Platino")
									</li>
									<li>
										Selecciona el tipo de tarjeta (Crédito, Débito, Departamental o Servicios)
									</li>
									<li>Escribe el banco/institución (BBVA, Banamex, Liverpool, Coppel, etc.)</li>
									<li>Escribe el número completo de tarjeta (13-19 dígitos)</li>
									<li>CLABE (opcional, 18 dígitos) - para transferencias</li>
									<li>
										Línea de crédito - cuánto te presta el banco (ejemplo: $30,000) - no aplica para
										tipo "Servicios"
									</li>
									<li>Día de corte (1-31) - lo encuentras en tu estado de cuenta</li>
									<li>Días de gracia para pagar después del corte (ejemplo: 20 días)</li>
									<li>Haz clic en "Guardar"</li>
								</ol>
							</div>

							<div class="bg-purple-50 border border-purple-200 rounded-lg p-6">
								<h3 class="font-semibold text-purple-900 mb-3">💳 Tipos de Tarjetas</h3>
								<div class="space-y-2 text-sm text-purple-800">
									<p>
										<strong>CRÉDITO:</strong> Tarjetas bancarias de crédito (BBVA, Banamex, Santander,
										etc.). Tienen línea de crédito y requieren pago mensual.
									</p>
									<p>
										<strong>DÉBITO:</strong> Tarjetas de débito vinculadas a tu cuenta bancaria. Útil
										para llevar control de gastos aunque no generen deuda.
									</p>
									<p>
										<strong>DEPARTAMENTAL:</strong> Tarjetas de tiendas departamentales (Liverpool, Palacio
										de Hierro, Coppel, etc.). Funcionan como crédito.
									</p>
									<p>
										<strong>SERVICIOS:</strong> Tarjetas como American Express que funcionan diferente.
										No requieren línea de crédito en el registro.
									</p>
								</div>
							</div>

							<div class="bg-yellow-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">
									🗓️ ¿Qué es el día de corte y días de gracia?
								</h3>
								<div class="space-y-2 text-sm">
									<p>
										<strong>Día de corte:</strong> Es como una "foto" que toma el banco de lo que debes.
										Por ejemplo, si tu corte es el día 15, el banco suma todos tus gastos del 16 del mes
										pasado hasta el 15 de este mes.
									</p>
									<p>
										<strong>Días de gracia:</strong> Es el tiempo que te da el banco para pagar después
										del corte. Si tu corte es el 15 y tienes 20 días de gracia, tienes hasta el 4 o 5
										del siguiente mes para pagar.
									</p>
									<p class="text-gray-600 italic">
										Ejemplo: Si tu corte es el 15 de enero, debes pagar antes del 4 de febrero.
									</p>
								</div>
							</div>

							<div class="bg-cyan-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">✏️ Gestionar tus Tarjetas</h3>
								<div class="space-y-2 text-sm">
									<p>
										<strong>Editar tarjeta:</strong> Usa el botón "Editar" para actualizar información
										de la tarjeta (límite, día de corte, etc.).
									</p>
									<p>
										<strong>Desactivar/Activar:</strong> Si cancelas una tarjeta pero quieres mantener
										su historial, usa "Desactivar". Podrás reactivarla después si es necesario.
									</p>
									<p>
										<strong>Eliminar tarjeta:</strong> Solo si no tiene gastos asociados. Si tiene historial,
										es mejor desactivarla.
									</p>
								</div>
							</div>

							<div class="bg-green-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">📊 Visualización de Tarjetas</h3>
								<p class="text-sm">
									Tus tarjetas se muestran como cards tipo tarjeta de crédito con diseño de
									gradiente. Cada card muestra: nombre, banco, tipo, últimos 4 dígitos, línea de
									crédito, saldo usado, disponible, día de corte y estado (Activa/Inactiva).
								</p>
							</div>

							<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
								<p class="font-semibold text-red-900 mb-2">⚠️ Importante</p>
								<p class="text-red-800">
									La aplicación te ayuda a llevar el control, pero tú eres responsable de hacer los
									pagos a tiempo. Revisa siempre tu estado de cuenta del banco para confirmar los
									montos y fechas.
								</p>
							</div>
						</div>
					</section>

					<!-- Pagos de Tarjetas -->
					<section
						id="pagos"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">
							Pagos de Tarjetas - Registra tus Abonos
						</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Cada vez que pagas tu tarjeta de crédito, debes registrarlo aquí para que la
								aplicación sepa que ya no debes esa cantidad.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">
									¿Cómo registrar un pago de tarjeta?
								</h3>
								<ol class="list-decimal list-inside space-y-2 text-blue-800">
									<li>Ve a la sección "Pagos de Tarjetas" en el menú</li>
									<li>Haz clic en "Nuevo Pago"</li>
									<li>Selecciona qué tarjeta pagaste</li>
									<li>
										Escribe cuánto pagaste (puede ser el mínimo, total o una cantidad que tú
										decidas)
									</li>
									<li>Pon la fecha en que hiciste el pago</li>
									<li>
										Selecciona con qué pagaste (Efectivo, Transferencia, Débito) - de dónde salió el
										dinero
									</li>
									<li>Si quieres, agrega una nota (ejemplo: "Pago total mes de enero")</li>
									<li>Haz clic en "Guardar"</li>
								</ol>
							</div>

							<div class="bg-purple-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">💳 Tipos de Pago</h3>
								<div class="space-y-2 text-sm">
									<p>
										<strong>Pago mínimo:</strong> Es lo menos que puedes pagar para no tener problemas
										con el banco, pero se te cobran intereses.
									</p>
									<p>
										<strong>Pago para no generar intereses:</strong> Es pagar todo lo que gastaste en
										el periodo. Es lo más recomendado.
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

					<!-- Próximos Pagos -->
					<section
						id="proximos-pagos"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">
							Próximos Pagos de Tarjetas - Vista Detallada
						</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Esta sección te muestra un resumen completo de todas las tarjetas que tienes que
								pagar, con información detallada para que nunca se te pase una fecha.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">📋 Resumen General</h3>
								<p class="text-sm text-blue-800 mb-2">
									En la parte superior verás tres números importantes:
								</p>
								<ul class="list-disc list-inside space-y-1 text-sm text-blue-800 pl-4">
									<li>
										<strong>Total de tarjetas con pago pendiente:</strong> Cuántas tarjetas debes pagar
										este mes
									</li>
									<li><strong>Total a pagar:</strong> La suma de todos los pagos pendientes</li>
									<li>
										<strong>Pagos urgentes:</strong> Cuántas tarjetas vencen en 7 días o menos
									</li>
								</ul>
							</div>

							<div class="bg-purple-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">💳 Detalle por Tarjeta</h3>
								<p class="text-sm mb-2">Cada card de tarjeta muestra:</p>
								<ul class="list-disc list-inside space-y-1 text-sm pl-4">
									<li>Nombre de la tarjeta y banco</li>
									<li>
										Badge de estado:
										<ul class="list-disc list-inside pl-4 text-xs mt-1">
											<li>
												<strong class="text-red-700">Vencido (rojo):</strong> Ya pasó la fecha límite
											</li>
											<li>
												<strong class="text-yellow-700">Urgente (amarillo):</strong> Vence en 7 días o
												menos
											</li>
											<li>
												<strong class="text-gray-700">Normal (gris):</strong> Aún tienes tiempo
											</li>
										</ul>
									</li>
									<li>Periodo del corte (fecha anterior - fecha de corte)</li>
									<li>Fecha límite de pago con días restantes</li>
									<li>Compras MSI incluidas en este periodo (si las hay)</li>
									<li>Total de gastos del periodo</li>
									<li>Pagos que ya realizaste</li>
									<li>Monto pendiente por pagar</li>
									<li>Saldo total de la tarjeta</li>
									<li>Botón para ir a registrar el pago</li>
								</ul>
							</div>

							<div class="bg-yellow-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">🎯 ¿Cómo usar esta sección?</h3>
								<div class="space-y-2 text-sm">
									<p>
										<strong>1. Revísala semanalmente:</strong> Entra cada semana para ver qué pagos se
										aproximan.
									</p>
									<p>
										<strong>2. Prioriza los urgentes:</strong> Atiende primero las tarjetas marcadas como
										"Urgente" o "Vencido".
									</p>
									<p>
										<strong>3. Verifica el monto:</strong> Asegúrate de que el monto coincida con tu estado
										de cuenta bancario.
									</p>
									<p>
										<strong>4. Registra el pago:</strong> Después de pagar, usa el botón "Registrar Pago"
										para actualizar el sistema.
									</p>
								</div>
							</div>

							<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
								<p class="font-semibold text-red-900 mb-2">⚠️ Importante</p>
								<p class="text-red-800">
									Los montos y fechas mostrados son calculados por la aplicación basándose en tus
									registros. SIEMPRE verifica con tu estado de cuenta bancario oficial antes de
									realizar un pago, ya que pueden existir cargos adicionales (intereses, anualidad,
									etc.) que no registraste.
								</p>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Activa notificaciones o crea un recordatorio en tu celular para revisar esta
									sección cada semana. Así nunca olvidarás un pago y evitarás cargos por mora o
									intereses adicionales.
								</p>
							</div>
						</div>
					</section>

					<!-- Proyección Financiera -->
					<section
						id="proyeccion"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">
							Proyección Financiera - Planifica tu Dinero
						</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								La proyección financiera te ayuda a planear cuánto dinero te quedará después de
								pagar tus tarjetas en cada quincena. Es como ver el futuro de tu bolsillo.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">¿Para qué sirve?</h3>
								<p class="text-sm text-blue-800 mb-2">
									Imagina que hoy tienes $10,000 en el banco. Sabes que el día 14 debes pagar 3
									tarjetas que suman $4,500. Con la proyección puedes ver:
								</p>
								<ul class="list-disc list-inside space-y-1 text-sm text-blue-800 pl-4">
									<li>
										<strong>Primera quincena:</strong> Si pagas tus tarjetas, te quedarán $5,500
									</li>
									<li>
										<strong>Segunda quincena:</strong> Si tienes más pagos pendientes, puedes ver cuánto
										te quedará
									</li>
								</ul>
								<p class="text-sm text-blue-800 mt-3">
									Esto te permite saber si te va a alcanzar el dinero o si necesitas ajustar tus
									gastos.
								</p>
							</div>

							<div class="bg-purple-50 border border-purple-200 rounded-lg p-6">
								<h3 class="font-semibold text-purple-900 mb-3">⚙️ Configurar tus Días de Pago</h3>
								<p class="text-sm text-purple-800 mb-2">
									Primero necesitas decirle a la aplicación qué días te pagan. Por ejemplo:
								</p>
								<ul class="list-disc list-inside space-y-1 text-sm text-purple-800 pl-4">
									<li>Si te pagan la primera quincena el día 15, pon 15</li>
									<li>Si te pagan la segunda quincena el día 30 o último día del mes, pon 30</li>
								</ul>
								<p class="text-sm text-purple-800 mt-3">
									Haz clic en "Configurar Días de Pago", ingresa tus días y guarda. Esto se queda
									guardado en tu navegador.
								</p>
							</div>

							<div class="bg-yellow-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">📊 Cómo Leer la Proyección</h3>
								<div class="space-y-2 text-sm">
									<p><strong>Saldo Actual:</strong> Tu dinero disponible ahora mismo.</p>
									<p>
										<strong>Primera Quincena:</strong> Lista de tarjetas que vencen del día 1 al día que
										configuraste (ej: día 15). Muestra cuánto vas a pagar y cuánto te quedará.
									</p>
									<p>
										<strong>Segunda Quincena:</strong> Lista de tarjetas que vencen después (ej: del 16
										al 30). Igual muestra pagos y saldo proyectado.
									</p>
									<p class="text-red-700 mt-2">
										<strong>⚠️ Alerta en Rojo:</strong> Si el saldo proyectado sale negativo, significa
										que no te va a alcanzar el dinero. Necesitas ajustar gastos o conseguir más ingresos.
									</p>
								</div>
							</div>

							<div class="bg-cyan-50 border border-cyan-200 rounded-lg p-6">
								<h3 class="font-semibold text-cyan-900 mb-3">💡 Ejemplo Práctico</h3>
								<div class="space-y-2 text-sm text-cyan-800">
									<p><strong>Situación:</strong></p>
									<ul class="list-disc list-inside pl-4 space-y-1">
										<li>Saldo actual: $12,000</li>
										<li>Día de pago primera quincena: 15</li>
										<li>Día de pago segunda quincena: 30</li>
									</ul>
									<p class="mt-2"><strong>Proyección Primera Quincena (1-15):</strong></p>
									<ul class="list-disc list-inside pl-4 space-y-1">
										<li>Tarjeta BBVA vence el 10: $2,000</li>
										<li>Tarjeta Liverpool vence el 12: $1,500</li>
										<li><strong>Total a pagar: $3,500</strong></li>
										<li><strong class="text-green-700">Saldo proyectado: $8,500 ✓</strong></li>
									</ul>
									<p class="mt-2"><strong>Proyección Segunda Quincena (16-30):</strong></p>
									<ul class="list-disc list-inside pl-4 space-y-1">
										<li>Tarjeta Banamex vence el 25: $4,200</li>
										<li><strong>Total a pagar: $4,200</strong></li>
										<li><strong class="text-green-700">Saldo proyectado: $4,300 ✓</strong></li>
									</ul>
									<p class="mt-3 text-green-800">
										En este ejemplo, te alcanza el dinero en ambas quincenas. Si algún saldo saliera
										en negativo (rojo), sabrías que necesitas ajustar gastos o posponer pagos.
									</p>
								</div>
							</div>

							<div class="bg-indigo-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">🎯 ¿Cuándo Usar la Proyección?</h3>
								<ul class="list-disc list-inside space-y-2 text-sm pl-4">
									<li><strong>Inicio de mes:</strong> Para planear cómo distribuir tu dinero</li>
									<li>
										<strong>Antes de una compra grande:</strong> Para ver si te quedará suficiente dinero
									</li>
									<li>
										<strong>Cuando te paguen:</strong> Para decidir cuánto puedes gastar vs cuánto reservar
									</li>
									<li>
										<strong>Si tienes poco dinero:</strong> Para priorizar qué tarjetas pagar primero
									</li>
								</ul>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Esta proyección es una simulación basada en tus datos actuales. Si registras
									nuevos ingresos, gastos o pagos de tarjetas, los números cambiarán. Revísala
									frecuentemente para mantener una visión realista de tu situación financiera.
								</p>
							</div>

							<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
								<p class="font-semibold text-red-900 mb-2">⚠️ Importante</p>
								<p class="text-red-800">
									La proyección NO incluye gastos futuros que aún no has registrado (como comida,
									gasolina, servicios). Solo considera tus pagos de tarjetas pendientes. Planifica
									dejando un margen extra para tus gastos diarios.
								</p>
							</div>
						</div>
					</section>

					<!-- MSI -->
					<section
						id="msi"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
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
									En el Dashboard, en la sección "Próximas Cuotas MSI", encontrarás un botón "Marcar
									Pagada" junto a cada compra. Presiónalo cada mes que pagues para llevar el control
									correcto.
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

					<!-- Exportar a Excel -->
					<section
						id="exportar"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">
							Exportar a Excel - Respalda tus Datos
						</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								Puedes descargar tus ingresos y egresos en formato Excel (.xlsx) para hacer análisis
								más detallados, crear respaldos o compartir información con tu contador.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">
									📥 ¿Dónde está la opción de exportar?
								</h3>
								<p class="text-sm text-blue-800 mb-2">
									Encontrarás el botón "Exportar a Excel" en:
								</p>
								<ul class="list-disc list-inside space-y-1 text-sm text-blue-800 pl-4">
									<li><strong>Sección Ingresos:</strong> Exporta todos tus ingresos registrados</li>
									<li><strong>Sección Egresos:</strong> Exporta todos tus gastos y compras MSI</li>
								</ul>
							</div>

							<div class="bg-purple-50 border border-purple-200 rounded-lg p-6">
								<h3 class="font-semibold text-purple-900 mb-3">🗓️ Seleccionar Rango de Fechas</h3>
								<p class="text-sm text-purple-800 mb-2">
									Al hacer clic en "Exportar", se abre una ventana donde puedes elegir:
								</p>
								<ul class="list-disc list-inside space-y-2 text-sm text-purple-800 pl-4">
									<li><strong>Mes Actual:</strong> Solo datos del mes en curso</li>
									<li><strong>Mes Anterior:</strong> Datos del mes pasado</li>
									<li><strong>Últimos 3 Meses:</strong> Datos de los últimos 90 días</li>
									<li><strong>Año Actual:</strong> Todos los datos desde enero hasta hoy</li>
									<li>
										<strong>Rango Personalizado:</strong> Tú seleccionas la fecha de inicio y fecha fin
										específicas
									</li>
								</ul>
							</div>

							<div class="bg-yellow-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">📊 ¿Qué contiene el archivo Excel?</h3>
								<p class="text-sm mb-2">El archivo descargado incluye múltiples hojas:</p>
								<div class="space-y-2 text-sm">
									<p>
										<strong>Hoja 1 - Resumen General:</strong> Totales de ingresos, egresos, saldo y deuda
										de tarjetas
									</p>
									<p>
										<strong>Hoja 2 - Detalle Ingresos:</strong> Tabla completa con fecha, tipo, monto,
										forma de pago y descripción de cada ingreso
									</p>
									<p>
										<strong>Hoja 3 - Detalle Egresos:</strong> Tabla con fecha, concepto, establecimiento,
										monto, tarjeta usada, MSI (si aplica)
									</p>
									<p>
										<strong>Hoja 4 - Resumen por Tarjeta:</strong> Total gastado en cada tarjeta, saldo
										usado y disponible
									</p>
								</div>
							</div>

							<div class="bg-cyan-50 p-4 rounded-lg">
								<h3 class="font-semibold text-gray-900 mb-3">🎯 Casos de Uso Prácticos</h3>
								<div class="space-y-2 text-sm">
									<p>
										<strong>📈 Análisis financiero:</strong> Abre el Excel y crea gráficas personalizadas,
										tablas dinámicas o análisis avanzados.
									</p>
									<p>
										<strong>💾 Respaldo:</strong> Guarda una copia de tus datos cada mes como respaldo
										de seguridad.
									</p>
									<p>
										<strong>📧 Compartir:</strong> Envía el archivo a tu contador, asesor financiero o
										familia.
									</p>
									<p>
										<strong>📋 Impuestos:</strong> Usa los datos para declaraciones fiscales o justificación
										de gastos.
									</p>
									<p>
										<strong>🔍 Auditoría:</strong> Revisa detalladamente tus gastos fuera de la aplicación.
									</p>
								</div>
							</div>

							<div class="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
								<h3 class="font-semibold text-indigo-900 mb-3">⚙️ Cómo Exportar Paso a Paso</h3>
								<ol class="list-decimal list-inside space-y-2 text-sm text-indigo-800">
									<li>Ve a la sección "Ingresos" o "Egresos"</li>
									<li>Haz clic en el botón "Exportar a Excel" (icono de descarga)</li>
									<li>Selecciona el rango de fechas que necesitas</li>
									<li>Si elegiste "Rango Personalizado", especifica las fechas inicio y fin</li>
									<li>Haz clic en "Exportar"</li>
									<li>El archivo se descargará automáticamente en tu carpeta de Descargas</li>
									<li>Abre el archivo con Excel, Google Sheets o LibreOffice</li>
								</ol>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Exporta tus datos cada mes y guárdalos en una carpeta organizada por fecha (ej:
									"Finanzas_Enero_2024.xlsx"). Así tendrás un historial completo aunque algo pase
									con la aplicación. También puedes abrir varios archivos y compararlos para ver
									cómo han cambiado tus finanzas mes a mes.
								</p>
							</div>

							<div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
								<p class="font-semibold text-blue-900 mb-2">🔒 Seguridad</p>
								<p class="text-blue-800">
									Los archivos Excel contienen información financiera sensible. Guárdalos en un
									lugar seguro y no los compartas con personas no autorizadas. Considera cifrar la
									carpeta donde los almacenas o usar un servicio de nube con autenticación de dos
									factores.
								</p>
							</div>
						</div>
					</section>

					<!-- Perfil -->
					<section
						id="perfil"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">Mi Perfil - Tus Datos</h2>
						<div class="space-y-6 text-gray-700">
							<p class="text-lg">
								En tu perfil puedes ver y actualizar tu información personal, cambiar tu contraseña
								y revisar los datos de tu cuenta.
							</p>

							<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
								<h3 class="font-semibold text-blue-900 mb-3">👤 Información Personal</h3>
								<p class="text-sm text-blue-800 mb-2">Datos que puedes ver y editar:</p>
								<ul class="list-disc list-inside space-y-1 text-sm text-blue-800 pl-4">
									<li>
										<strong>Nombre Completo:</strong> Puedes actualizarlo en cualquier momento
									</li>
									<li>
										<strong>Email:</strong> Solo lectura, este es tu usuario para iniciar sesión
									</li>
									<li><strong>Celular:</strong> Número de 10 dígitos, puedes editarlo</li>
									<li>
										<strong>Fecha de Registro:</strong> Cuándo creaste tu cuenta (solo lectura)
									</li>
								</ul>
								<p class="text-sm text-blue-800 mt-3">
									Para guardar cambios en tu información personal, edita los campos y haz clic en
									"Guardar Cambios".
								</p>
							</div>

							<div class="bg-purple-50 border border-purple-200 rounded-lg p-6">
								<h3 class="font-semibold text-purple-900 mb-3">🔒 Cambiar Contraseña</h3>
								<p class="text-sm text-purple-800 mb-2">Para actualizar tu contraseña necesitas:</p>
								<ol class="list-decimal list-inside space-y-1 text-sm text-purple-800 pl-4">
									<li>Ingresar tu contraseña actual (para verificar tu identidad)</li>
									<li>
										Escribir tu nueva contraseña (mínimo 10 caracteres, con al menos una letra y un
										número)
									</li>
									<li>Confirmar la nueva contraseña (debe coincidir exactamente)</li>
									<li>Hacer clic en "Cambiar Contraseña"</li>
								</ol>
								<p class="text-sm text-purple-800 mt-3">
									<strong>Nota:</strong> Si olvidaste tu contraseña, cierra sesión y usa la opción "¿Olvidaste
									tu contraseña?" en la página de login.
								</p>
							</div>

							<div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
								<p class="font-semibold text-blue-900 mb-2">🔐 Consejos de Seguridad</p>
								<ul class="list-disc list-inside space-y-1 text-blue-800 text-sm">
									<li>
										Tu contraseña debe tener al menos 10 caracteres e incluir una letra y un número
									</li>
									<li>Usa combinación de letras, números y símbolos para mayor seguridad</li>
									<li>No compartas tu contraseña con nadie</li>
									<li>Cambia tu contraseña cada 3-6 meses</li>
									<li>No uses la misma contraseña que utilizas en otros sitios</li>
									<li>Cierra sesión si usas una computadora compartida o pública</li>
								</ul>
							</div>

							<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
								<p class="font-semibold text-green-900 mb-2">💡 Consejo</p>
								<p class="text-green-800">
									Mantén tu información de contacto actualizada, especialmente tu email y celular.
									Esto es importante para la seguridad de tu cuenta y para que puedas recuperar tu
									contraseña si la olvidas. Revisa tu perfil cada vez que cambies de número o
									correo.
								</p>
							</div>

							<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
								<p class="font-semibold text-red-900 mb-2">⚠️ Importante</p>
								<p class="text-red-800">
									Si sospechas que alguien más tiene acceso a tu cuenta, cambia tu contraseña
									inmediatamente. Si no puedes acceder a tu cuenta, contacta al soporte técnico.
								</p>
							</div>
						</div>
					</section>

					<!-- Consejos -->
					<section
						id="consejos"
						class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 scroll-mt-8"
					>
						<h2 class="text-3xl font-bold text-gray-900 mb-6">Consejos y Buenas Prácticas</h2>
						<div class="space-y-6 text-gray-700">
							<div
								class="bg-linear-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200"
							>
								<h3 class="font-semibold text-gray-900 mb-4 text-xl">
									🌟 Consejos para Usar la Aplicación
								</h3>
								<div class="space-y-3">
									<div class="flex items-start gap-3">
										<span class="text-2xl">1️⃣</span>
										<div>
											<p class="font-semibold">Sé Constante</p>
											<p class="text-sm">
												Registra tus gastos el mismo día. Si dejas pasar días, se te olvidarán cosas
												y tus números no serán correctos.
											</p>
										</div>
									</div>

									<div class="flex items-start gap-3">
										<span class="text-2xl">2️⃣</span>
										<div>
											<p class="font-semibold">Usa Nombres Consistentes</p>
											<p class="text-sm">
												Si un día pones "Súper" y otro día "Supermercado", la aplicación los verá
												como diferentes. Decide un nombre y úsalo siempre.
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
												El Dashboard te muestra en qué gastas más. Úsalo para encontrar áreas donde
												puedes ahorrar.
											</p>
										</div>
									</div>
								</div>
							</div>

							<div
								class="bg-linear-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-200"
							>
								<h3 class="font-semibold text-gray-900 mb-4 text-xl">
									💰 Consejos Financieros Generales
								</h3>
								<div class="space-y-3">
									<div class="flex items-start gap-3">
										<span class="text-xl">💳</span>
										<div>
											<p class="font-semibold">Paga Más del Mínimo</p>
											<p class="text-sm">
												Si solo pagas el mínimo de tu tarjeta, tardarás años en salir de deudas por
												los intereses.
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
									Esta aplicación es una herramienta que te ayuda a organizarte, pero la disciplina
									y las decisiones son tuyas. ¡Tú tienes el control de tu dinero!
								</p>
							</div>
						</div>
					</section>

					<!-- Necesitas más ayuda -->
					<section
						class="bg-linear-to-r from-gray-800 to-gray-900 rounded-xl shadow-lg p-8 text-white"
					>
						<h2 class="text-2xl font-bold mb-4">¿Necesitas Más Ayuda?</h2>
						<p class="mb-6">
							Si algo no te quedó claro o tienes problemas usando la aplicación, no dudes en
							contactarnos.
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
