<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { page } from '$app/stores';

	let mobileMenuOpen = $state(false);

	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			authStore.logout();

			// Detectar si la app está instalada como PWA
			const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
			                    (window.navigator as any).standalone === true;

			// Si está instalada, ir al login; si es navegador, ir a la página de bienvenida
			goto(isInstalled ? '/login' : '/');
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		}
	}

	$effect(() => {
		mobileMenuOpen = false;
	});
</script>

<nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
		<div class="flex justify-between h-14 sm:h-16">
			<div class="flex">
				<div class="shrink-0 flex items-center">
					<a href="/dashboard" class="font-bold text-gray-900">
						<span class="hidden sm:inline text-xl">Control Gastos</span>
						<span class="sm:hidden text-lg">💰 Control $</span>
					</a>
				</div>
				<div class="hidden md:ml-6 md:flex md:space-x-4">
					<a
						href="/dashboard"
						class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
						class:border-gray-800={$page.url.pathname === '/dashboard'}
						class:text-gray-900={$page.url.pathname === '/dashboard'}
						class:border-transparent={$page.url.pathname !== '/dashboard'}
						class:text-gray-500={$page.url.pathname !== '/dashboard'}
					>
						Dashboard
					</a>
					<a
						href="/tarjetas"
						class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
						class:border-gray-800={$page.url.pathname.startsWith('/tarjetas')}
						class:text-gray-900={$page.url.pathname.startsWith('/tarjetas')}
						class:border-transparent={!$page.url.pathname.startsWith('/tarjetas')}
						class:text-gray-500={!$page.url.pathname.startsWith('/tarjetas')}
					>
						Tarjetas
					</a>
					<a
						href="/ingresos"
						class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
						class:border-gray-800={$page.url.pathname.startsWith('/ingresos')}
						class:text-gray-900={$page.url.pathname.startsWith('/ingresos')}
						class:border-transparent={!$page.url.pathname.startsWith('/ingresos')}
						class:text-gray-500={!$page.url.pathname.startsWith('/ingresos')}
					>
						Ingresos
					</a>
					<a
						href="/egresos"
						class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
						class:border-gray-800={$page.url.pathname.startsWith('/egresos')}
						class:text-gray-900={$page.url.pathname.startsWith('/egresos')}
						class:border-transparent={!$page.url.pathname.startsWith('/egresos')}
						class:text-gray-500={!$page.url.pathname.startsWith('/egresos')}
					>
						Egresos
					</a>
					<a
						href="/prestamos"
						class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
						class:border-gray-800={$page.url.pathname.startsWith('/prestamos')}
						class:text-gray-900={$page.url.pathname.startsWith('/prestamos')}
						class:border-transparent={!$page.url.pathname.startsWith('/prestamos')}
						class:text-gray-500={!$page.url.pathname.startsWith('/prestamos')}
					>
						Préstamos
					</a>
					<a
						href="/pagos-tarjetas"
						class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
						class:border-gray-800={$page.url.pathname === '/pagos-tarjetas'}
						class:text-gray-900={$page.url.pathname === '/pagos-tarjetas'}
						class:border-transparent={$page.url.pathname !== '/pagos-tarjetas'}
						class:text-gray-500={$page.url.pathname !== '/pagos-tarjetas'}
					>
						Pagos
					</a>
					<a
						href="/proximos-pagos-tarjetas"
						class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
						class:border-gray-800={$page.url.pathname === '/proximos-pagos-tarjetas'}
						class:text-gray-900={$page.url.pathname === '/proximos-pagos-tarjetas'}
						class:border-transparent={$page.url.pathname !== '/proximos-pagos-tarjetas'}
						class:text-gray-500={$page.url.pathname !== '/proximos-pagos-tarjetas'}
					>
						Próximos
					</a>
					<a
						href="/proyeccion"
						class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
						class:border-gray-800={$page.url.pathname === '/proyeccion'}
						class:text-gray-900={$page.url.pathname === '/proyeccion'}
						class:border-transparent={$page.url.pathname !== '/proyeccion'}
						class:text-gray-500={$page.url.pathname !== '/proyeccion'}
					>
						Proyección
					</a>
					{#if $authStore.user?.es_admin}
						<a
							href="/admin"
							class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
							class:border-gray-800={$page.url.pathname.startsWith('/admin')}
							class:text-gray-900={$page.url.pathname.startsWith('/admin')}
							class:border-transparent={!$page.url.pathname.startsWith('/admin')}
							class:text-gray-500={!$page.url.pathname.startsWith('/admin')}
						>
							Admin
						</a>
					{/if}
				</div>
			</div>
			<div class="hidden md:ml-6 md:flex md:items-center">
				<div class="ml-3 relative">
					<div class="flex items-center space-x-4">
						<a
							href="/ayuda"
							class="text-sm text-gray-700 hover:text-gray-900 transition flex items-center gap-1"
							title="Centro de Ayuda"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Ayuda
						</a>
						<a href="/perfil" class="text-sm text-gray-700 hover:text-gray-900 transition">
							{$authStore.user?.nombre || 'Usuario'}
						</a>
						<button
							onclick={handleLogout}
							class="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition"
						>
							Cerrar Sesión
						</button>
					</div>
				</div>
			</div>
			<div class="flex items-center md:hidden">
				<button
					onclick={() => mobileMenuOpen = !mobileMenuOpen}
					class="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors"
					aria-label="Menú"
				>
					<svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						{#if mobileMenuOpen}
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						{:else}
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
						{/if}
					</svg>
				</button>
			</div>
		</div>
	</div>

	{#if mobileMenuOpen}
		<div class="md:hidden border-t border-gray-200 bg-white">
			<div class="pt-2 pb-3 space-y-1 px-2">
				<a
					href="/dashboard"
					class="block pl-3 pr-4 py-3 border-l-4 text-base font-medium rounded-r-lg transition-colors active:bg-gray-100"
					class:border-gray-800={$page.url.pathname === '/dashboard'}
					class:bg-gray-50={$page.url.pathname === '/dashboard'}
					class:text-gray-900={$page.url.pathname === '/dashboard'}
					class:border-transparent={$page.url.pathname !== '/dashboard'}
					class:text-gray-700={$page.url.pathname !== '/dashboard'}
				>
					📊 Dashboard
				</a>
				<a
					href="/tarjetas"
					class="block pl-3 pr-4 py-3 border-l-4 text-base font-medium rounded-r-lg transition-colors active:bg-gray-100"
					class:border-gray-800={$page.url.pathname.startsWith('/tarjetas')}
					class:bg-gray-50={$page.url.pathname.startsWith('/tarjetas')}
					class:text-gray-900={$page.url.pathname.startsWith('/tarjetas')}
					class:border-transparent={!$page.url.pathname.startsWith('/tarjetas')}
					class:text-gray-700={!$page.url.pathname.startsWith('/tarjetas')}
				>
					💳 Tarjetas
				</a>
				<a
					href="/ingresos"
					class="block pl-3 pr-4 py-3 border-l-4 text-base font-medium rounded-r-lg transition-colors active:bg-gray-100"
					class:border-gray-800={$page.url.pathname.startsWith('/ingresos')}
					class:bg-gray-50={$page.url.pathname.startsWith('/ingresos')}
					class:text-gray-900={$page.url.pathname.startsWith('/ingresos')}
					class:border-transparent={!$page.url.pathname.startsWith('/ingresos')}
					class:text-gray-700={!$page.url.pathname.startsWith('/ingresos')}
				>
					💵 Ingresos
				</a>
				<a
					href="/egresos"
					class="block pl-3 pr-4 py-3 border-l-4 text-base font-medium rounded-r-lg transition-colors active:bg-gray-100"
					class:border-gray-800={$page.url.pathname.startsWith('/egresos')}
					class:bg-gray-50={$page.url.pathname.startsWith('/egresos')}
					class:text-gray-900={$page.url.pathname.startsWith('/egresos')}
					class:border-transparent={!$page.url.pathname.startsWith('/egresos')}
					class:text-gray-700={!$page.url.pathname.startsWith('/egresos')}
				>
					💸 Egresos
				</a>
				<a
					href="/prestamos"
					class="block pl-3 pr-4 py-3 border-l-4 text-base font-medium rounded-r-lg transition-colors active:bg-gray-100"
					class:border-gray-800={$page.url.pathname.startsWith('/prestamos')}
					class:bg-gray-50={$page.url.pathname.startsWith('/prestamos')}
					class:text-gray-900={$page.url.pathname.startsWith('/prestamos')}
					class:border-transparent={!$page.url.pathname.startsWith('/prestamos')}
					class:text-gray-700={!$page.url.pathname.startsWith('/prestamos')}
				>
					🏦 Préstamos
				</a>
				<a
					href="/pagos-tarjetas"
					class="block pl-3 pr-4 py-3 border-l-4 text-base font-medium rounded-r-lg transition-colors active:bg-gray-100"
					class:border-gray-800={$page.url.pathname === '/pagos-tarjetas'}
					class:bg-gray-50={$page.url.pathname === '/pagos-tarjetas'}
					class:text-gray-900={$page.url.pathname === '/pagos-tarjetas'}
					class:border-transparent={$page.url.pathname !== '/pagos-tarjetas'}
					class:text-gray-700={$page.url.pathname !== '/pagos-tarjetas'}
				>
					💰 Pagos
				</a>
				<a
					href="/proximos-pagos-tarjetas"
					class="block pl-3 pr-4 py-3 border-l-4 text-base font-medium rounded-r-lg transition-colors active:bg-gray-100"
					class:border-gray-800={$page.url.pathname === '/proximos-pagos-tarjetas'}
					class:bg-gray-50={$page.url.pathname === '/proximos-pagos-tarjetas'}
					class:text-gray-900={$page.url.pathname === '/proximos-pagos-tarjetas'}
					class:border-transparent={$page.url.pathname !== '/proximos-pagos-tarjetas'}
					class:text-gray-700={$page.url.pathname !== '/proximos-pagos-tarjetas'}
				>
					📅 Próximos
				</a>
				<a
					href="/proyeccion"
					class="block pl-3 pr-4 py-3 border-l-4 text-base font-medium rounded-r-lg transition-colors active:bg-gray-100"
					class:border-gray-800={$page.url.pathname === '/proyeccion'}
					class:bg-gray-50={$page.url.pathname === '/proyeccion'}
					class:text-gray-900={$page.url.pathname === '/proyeccion'}
					class:border-transparent={$page.url.pathname !== '/proyeccion'}
					class:text-gray-700={$page.url.pathname !== '/proyeccion'}
				>
					📈 Proyección
				</a>
				{#if $authStore.user?.es_admin}
					<a
						href="/admin"
						class="block pl-3 pr-4 py-3 border-l-4 text-base font-medium rounded-r-lg transition-colors active:bg-gray-100"
						class:border-gray-800={$page.url.pathname.startsWith('/admin')}
						class:bg-gray-50={$page.url.pathname.startsWith('/admin')}
						class:text-gray-900={$page.url.pathname.startsWith('/admin')}
						class:border-transparent={!$page.url.pathname.startsWith('/admin')}
						class:text-gray-700={!$page.url.pathname.startsWith('/admin')}
					>
						⚙️ Admin
					</a>
				{/if}
			</div>
			<div class="pt-4 pb-4 border-t border-gray-200 bg-gray-50">
				<div class="px-4 mb-3">
					<div class="text-base font-semibold text-gray-900">{$authStore.user?.nombre || 'Usuario'}</div>
					<div class="text-sm text-gray-600">{$authStore.user?.email || ''}</div>
				</div>
				<div class="px-2 space-y-1">
					<a
						href="/ayuda"
						class="w-full text-left px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-white active:bg-gray-100 flex items-center gap-2 transition-colors"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						Centro de Ayuda
					</a>
					<a
						href="/perfil"
						class="block w-full text-left px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-white active:bg-gray-100 transition-colors"
					>
						👤 Mi Perfil
					</a>
					<button
						onclick={handleLogout}
						class="block w-full text-left px-3 py-3 rounded-lg text-base font-medium text-red-600 hover:text-red-700 hover:bg-white active:bg-gray-100 transition-colors"
					>
						🚪 Cerrar Sesión
					</button>
				</div>
			</div>
		</div>
	{/if}
</nav>
