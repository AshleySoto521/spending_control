<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { page } from '$app/stores';

	let mobileMenuOpen = $state(false);

	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			authStore.logout();
			goto('/login');
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		}
	}

	$effect(() => {
		mobileMenuOpen = false;
	});
</script>

<nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between h-16">
			<div class="flex">
				<div class="shrink-0 flex items-center">
					<a href="/dashboard" class="text-2xl font-bold text-gray-900">
						Control Gastos
					</a>
				</div>
				<div class="hidden md:ml-10 md:flex md:space-x-8">
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
						href="/pagos-tarjetas"
						class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
						class:border-gray-800={$page.url.pathname.startsWith('/pagos-tarjetas')}
						class:text-gray-900={$page.url.pathname.startsWith('/pagos-tarjetas')}
						class:border-transparent={!$page.url.pathname.startsWith('/pagos-tarjetas')}
						class:text-gray-500={!$page.url.pathname.startsWith('/pagos-tarjetas')}
					>
						Pagos Tarjetas
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
							Administración
						</a>
					{/if}
				</div>
			</div>
			<div class="hidden md:ml-6 md:flex md:items-center">
				<div class="ml-3 relative">
					<div class="flex items-center space-x-4">
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
					class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						{#if mobileMenuOpen}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						{:else}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						{/if}
					</svg>
				</button>
			</div>
		</div>
	</div>

	{#if mobileMenuOpen}
		<div class="md:hidden border-t border-gray-200">
			<div class="pt-2 pb-3 space-y-1">
				<a
					href="/dashboard"
					class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
					class:border-gray-800={$page.url.pathname === '/dashboard'}
					class:bg-gray-50={$page.url.pathname === '/dashboard'}
					class:text-gray-900={$page.url.pathname === '/dashboard'}
					class:border-transparent={$page.url.pathname !== '/dashboard'}
					class:text-gray-600={$page.url.pathname !== '/dashboard'}
				>
					Dashboard
				</a>
				<a
					href="/tarjetas"
					class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
					class:border-gray-800={$page.url.pathname.startsWith('/tarjetas')}
					class:bg-gray-50={$page.url.pathname.startsWith('/tarjetas')}
					class:text-gray-900={$page.url.pathname.startsWith('/tarjetas')}
					class:border-transparent={!$page.url.pathname.startsWith('/tarjetas')}
					class:text-gray-600={!$page.url.pathname.startsWith('/tarjetas')}
				>
					Tarjetas
				</a>
				<a
					href="/ingresos"
					class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
					class:border-gray-800={$page.url.pathname.startsWith('/ingresos')}
					class:bg-gray-50={$page.url.pathname.startsWith('/ingresos')}
					class:text-gray-900={$page.url.pathname.startsWith('/ingresos')}
					class:border-transparent={!$page.url.pathname.startsWith('/ingresos')}
					class:text-gray-600={!$page.url.pathname.startsWith('/ingresos')}
				>
					Ingresos
				</a>
				<a
					href="/egresos"
					class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
					class:border-gray-800={$page.url.pathname.startsWith('/egresos')}
					class:bg-gray-50={$page.url.pathname.startsWith('/egresos')}
					class:text-gray-900={$page.url.pathname.startsWith('/egresos')}
					class:border-transparent={!$page.url.pathname.startsWith('/egresos')}
					class:text-gray-600={!$page.url.pathname.startsWith('/egresos')}
				>
					Egresos
				</a>
				<a
					href="/pagos-tarjetas"
					class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
					class:border-gray-800={$page.url.pathname.startsWith('/pagos-tarjetas')}
					class:bg-gray-50={$page.url.pathname.startsWith('/pagos-tarjetas')}
					class:text-gray-900={$page.url.pathname.startsWith('/pagos-tarjetas')}
					class:border-transparent={!$page.url.pathname.startsWith('/pagos-tarjetas')}
					class:text-gray-600={!$page.url.pathname.startsWith('/pagos-tarjetas')}
				>
					Pagos Tarjetas
				</a>
				{#if $authStore.user?.es_admin}
					<a
						href="/admin"
						class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
						class:border-gray-800={$page.url.pathname.startsWith('/admin')}
						class:bg-gray-50={$page.url.pathname.startsWith('/admin')}
						class:text-gray-900={$page.url.pathname.startsWith('/admin')}
						class:border-transparent={!$page.url.pathname.startsWith('/admin')}
						class:text-gray-600={!$page.url.pathname.startsWith('/admin')}
					>
						Administración
					</a>
				{/if}
			</div>
			<div class="pt-4 pb-3 border-t border-gray-200">
				<div class="px-4">
					<div class="text-base font-medium text-gray-800">{$authStore.user?.nombre || 'Usuario'}</div>
					<div class="text-sm font-medium text-gray-500">{$authStore.user?.email || ''}</div>
				</div>
				<div class="mt-3 px-2 space-y-1">
					<a
						href="/perfil"
						class="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
					>
						Mi Perfil
					</a>
					<button
						onclick={handleLogout}
						class="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
					>
						Cerrar Sesión
					</button>
				</div>
			</div>
		</div>
	{/if}
</nav>
