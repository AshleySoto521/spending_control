<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { apiGet, apiPost } from '$lib/utils/apiClient';

	interface Aviso {
		id_notificacion: number;
		tipo: string;
		titulo: string;
		cuerpo: string | null;
		enlace: string | null;
		leida: boolean;
		fecha_creacion: string;
	}

	let abierto = $state(false);
	let cargando = $state(true);
	let notificaciones: Aviso[] = $state([]);
	let sinLeer = $state(0);

	async function cargar() {
		try {
			const respuesta = await apiGet('/api/notificaciones');

			if (respuesta.ok) {
				const datos = await respuesta.json();
				notificaciones = datos.notificaciones ?? [];
				sinLeer = datos.sinLeer ?? 0;
			}
		} catch {
			// Es información complementaria: si falla, la barra sigue usable.
		} finally {
			cargando = false;
		}
	}

	async function abrirAviso(aviso: Aviso) {
		abierto = false;

		if (!aviso.leida) {
			// Optimista: se marca en pantalla sin esperar al servidor, porque la
			// navegación ocurre inmediatamente después.
			aviso.leida = true;
			sinLeer = Math.max(0, sinLeer - 1);
			apiPost('/api/notificaciones', { id: aviso.id_notificacion }).catch(() => {});
		}

		if (aviso.enlace) goto(aviso.enlace);
	}

	async function marcarTodas() {
		notificaciones = notificaciones.map((n) => ({ ...n, leida: true }));
		sinLeer = 0;
		await apiPost('/api/notificaciones', {}).catch(() => {});
	}

	function haceCuanto(fecha: string): string {
		const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
		if (dias <= 0) return 'hoy';
		if (dias === 1) return 'ayer';
		return `hace ${dias} días`;
	}

	/**
	 * Cierre al hacer clic fuera y con Escape.
	 *
	 * Se comprueba si el clic cayó dentro del contenedor, en vez de detener la
	 * propagación desde el panel. Detenerla obligaba a poner un manejador de
	 * clic sobre un `div` que no es interactivo, algo que ningún lector de
	 * pantalla puede anunciar y que además rompía cualquier otro cierre por
	 * clic global de la página.
	 */
	let contenedor: HTMLElement | undefined = $state();

	function alHacerClicFuera(evento: MouseEvent) {
		if (!abierto) return;
		if (contenedor && !contenedor.contains(evento.target as Node)) abierto = false;
	}

	function alPulsarTecla(evento: KeyboardEvent) {
		if (evento.key === 'Escape') abierto = false;
	}

	onMount(cargar);
</script>

<svelte:window onclick={alHacerClicFuera} onkeydown={alPulsarTecla} />

<div class="relative dropdown-container" bind:this={contenedor}>
	<button
		onclick={() => (abierto = !abierto)}
		class="relative flex items-center justify-center h-10 w-10 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
		aria-label={sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
	>
		<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1h6z"
			/>
		</svg>

		{#if sinLeer > 0}
			<span
				class="absolute top-1 right-1 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-red-600 text-white text-[0.65rem] font-bold flex items-center justify-center"
			>
				{sinLeer > 9 ? '9+' : sinLeer}
			</span>
		{/if}
	</button>

	{#if abierto}
		<div
			class="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
			role="menu"
			aria-label="Notificaciones"
		>
			<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
				<span class="font-semibold text-gray-900">Notificaciones</span>
				{#if sinLeer > 0}
					<button onclick={marcarTodas} class="text-xs text-gray-600 hover:text-gray-900 underline">
						Marcar todas
					</button>
				{/if}
			</div>

			<div class="max-h-96 overflow-y-auto">
				{#if cargando}
					<p class="px-4 py-6 text-sm text-gray-500 text-center">Cargando…</p>
				{:else if notificaciones.length === 0}
					<p class="px-4 py-8 text-sm text-gray-500 text-center">
						Nada por ahora. Aquí te avisaremos de tus fechas de corte y de pago.
					</p>
				{:else}
					{#each notificaciones as aviso (aviso.id_notificacion)}
						<button
							onclick={() => abrirAviso(aviso)}
							class="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
							class:bg-blue-50={!aviso.leida}
						>
							<div class="flex items-start gap-2">
								{#if !aviso.leida}
									<span class="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0"></span>
								{:else}
									<span class="mt-1.5 h-2 w-2 shrink-0"></span>
								{/if}
								<div class="min-w-0">
									<p class="text-sm font-semibold text-gray-900">{aviso.titulo}</p>
									{#if aviso.cuerpo}
										<p class="text-xs text-gray-600 mt-0.5">{aviso.cuerpo}</p>
									{/if}
									<p class="text-xs text-gray-400 mt-1">{haceCuanto(aviso.fecha_creacion)}</p>
								</div>
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
