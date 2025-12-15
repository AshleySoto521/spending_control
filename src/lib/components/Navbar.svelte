<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { page } from '$app/stores';
	
	// Estado para el menú móvil
	let mobileMenuOpen = $state(false);
	
	// Estado para los dropdowns de escritorio
	let activeDropdown = $state(''); // '' | 'movimientos' | 'creditos'

	// Definición de estilos base para reutilizar (Reemplazo de @apply)
	const baseMobileLink = "block pl-4 pr-4 py-2.5 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border-l-4 border-transparent";
	const activeMobileLink = "bg-blue-50 text-blue-700 border-blue-600";
	
	const btnGhost = "flex items-center px-4 py-2 rounded-lg text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors";

	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			authStore.logout();
			const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
			                    (window.navigator as any).standalone === true;
			goto(isInstalled ? '/login' : '/');
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		}
	}

	// Cerrar menús al navegar
	$effect(() => {
		const path = $page.url.pathname; 
		mobileMenuOpen = false;
		activeDropdown = '';
	});

	function closeDropdowns(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.dropdown-container')) {
			activeDropdown = '';
		}
	}
</script>

<svelte:window onclick={closeDropdowns} />

<nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between h-16">
			
			<div class="flex">
				<div class="shrink-0 flex items-center">
					<a href="/dashboard" class="font-bold text-gray-900 flex items-center gap-2">
						<span class="text-2xl">💰</span>
						<span class="hidden sm:inline text-xl tracking-tight">Control Gastos</span>
					</a>
				</div>

				<div class="hidden md:ml-8 md:flex md:space-x-6 items-center">
					<a
						href="/dashboard"
						class="inline-flex items-center px-1 pt-1 text-sm font-medium transition border-b-2"
						class:border-gray-800={$page.url.pathname === '/dashboard'}
						class:text-gray-900={$page.url.pathname === '/dashboard'}
						class:border-transparent={$page.url.pathname !== '/dashboard'}
						class:text-gray-500={$page.url.pathname !== '/dashboard'}
					>
						Dashboard
					</a>

					<div class="relative dropdown-container">
						<button 
							onclick={(e) => { e.stopPropagation(); activeDropdown = activeDropdown === 'movimientos' ? '' : 'movimientos'; }}
							class="inline-flex items-center px-1 pt-1 text-sm font-medium transition border-b-2 border-transparent text-gray-500 hover:text-gray-900 focus:outline-none"
							class:text-gray-900={$page.url.pathname.includes('ingresos') || $page.url.pathname.includes('egresos')}
						>
							Movimientos
							<svg class="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						
						{#if activeDropdown === 'movimientos'}
							<div class="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 z-50">
								<a href="/ingresos" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">💵 Ingresos</a>
								<a href="/egresos" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">💸 Egresos</a>
							</div>
						{/if}
					</div>

					<div class="relative dropdown-container">
						<button 
							onclick={(e) => { e.stopPropagation(); activeDropdown = activeDropdown === 'creditos' ? '' : 'creditos'; }}
							class="inline-flex items-center px-1 pt-1 text-sm font-medium transition border-b-2 border-transparent text-gray-500 hover:text-gray-900 focus:outline-none"
							class:text-gray-900={['/tarjetas', '/prestamos', '/pagos', '/proximos'].some(p => $page.url.pathname.includes(p))}
						>
							Créditos y Deudas
							<svg class="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>

						{#if activeDropdown === 'creditos'}
							<div class="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 z-50">
								<a href="/tarjetas" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">💳 Tarjetas</a>
								<a href="/prestamos" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🏦 Préstamos</a>
								<div class="border-t border-gray-100 my-1"></div>
								<a href="/pagos-tarjetas" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">💰 Pagos Realizados</a>
								<a href="/proximos-pagos-tarjetas" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">📅 Próximos Vencimientos</a>
							</div>
						{/if}
					</div>

					<a
						href="/proyeccion"
						class="inline-flex items-center px-1 pt-1 text-sm font-medium transition border-b-2"
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
							class="inline-flex items-center px-1 pt-1 text-sm font-medium transition border-b-2 border-transparent text-gray-500 hover:text-gray-900"
						>
							Admin
						</a>
					{/if}
				</div>
			</div>

			<div class="flex items-center gap-4">
				<div class="hidden md:flex items-center gap-4">
					<div class="text-sm text-right hidden lg:block">
						<p class="font-medium text-gray-900">{$authStore.user?.nombre || 'Usuario'}</p>
					</div>
					<button
						onclick={handleLogout}
						class="text-gray-500 hover:text-red-600 transition p-2 rounded-full hover:bg-gray-100"
						title="Cerrar Sesión"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
					</button>
				</div>

				<div class="flex items-center md:hidden">
					<button
						onclick={() => mobileMenuOpen = !mobileMenuOpen}
						class="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
					>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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
	</div>

	{#if mobileMenuOpen}
		<div class="md:hidden bg-white border-t border-gray-200 shadow-lg absolute w-full z-50 max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
			<div class="pt-2 pb-4 space-y-1">
				
				<a href="/dashboard" class="{baseMobileLink} {$page.url.pathname === '/dashboard' ? activeMobileLink : ''}">
					📊 Dashboard
				</a>

				<div class="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
					Movimientos
				</div>
				<a href="/ingresos" class="{baseMobileLink} {$page.url.pathname.startsWith('/ingresos') ? activeMobileLink : ''}">
					💵 Ingresos
				</a>
				<a href="/egresos" class="{baseMobileLink} {$page.url.pathname.startsWith('/egresos') ? activeMobileLink : ''}">
					💸 Egresos
				</a>

				<div class="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
					Créditos
				</div>
				<a href="/tarjetas" class="{baseMobileLink} {$page.url.pathname.startsWith('/tarjetas') ? activeMobileLink : ''}">
					💳 Tarjetas
				</a>
				<a href="/prestamos" class="{baseMobileLink} {$page.url.pathname.startsWith('/prestamos') ? activeMobileLink : ''}">
					🏦 Préstamos
				</a>
				<a href="/pagos-tarjetas" class="{baseMobileLink} {$page.url.pathname === '/pagos-tarjetas' ? activeMobileLink : ''}">
					💰 Pagos
				</a>
				<a href="/proximos-pagos-tarjetas" class="{baseMobileLink} {$page.url.pathname === '/proximos-pagos-tarjetas' ? activeMobileLink : ''}">
					📅 Próximos
				</a>

				<div class="border-t border-gray-100 my-2"></div>
				
				<a href="/proyeccion" class="{baseMobileLink} {$page.url.pathname === '/proyeccion' ? activeMobileLink : ''}">
					📈 Proyección
				</a>
				
				{#if $authStore.user?.es_admin}
					<a href="/admin" class="{baseMobileLink} {$page.url.pathname.startsWith('/admin') ? activeMobileLink : ''}">
						⚙️ Admin
					</a>
				{/if}
			</div>

			<div class="bg-gray-50 p-4 border-t border-gray-200">
				<div class="flex items-center gap-3 mb-4">
					<div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">👤</div>
					<div>
						<div class="font-medium text-gray-900">{$authStore.user?.nombre || 'Usuario'}</div>
						<div class="text-xs text-gray-500">{$authStore.user?.email}</div>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<a href="/perfil" class="{btnGhost} justify-center text-sm">Mi Perfil</a>
					<button onclick={handleLogout} class="{btnGhost} text-red-600 justify-center text-sm">Cerrar Sesión</button>
				</div>
			</div>
		</div>
	{/if}
</nav>