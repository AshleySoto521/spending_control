<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import SessionExpiredModal from '$lib/components/SessionExpiredModal.svelte';
	import { registerServiceWorker } from '$lib/pwa';
	import { sessionStore } from '$lib/stores/session';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		registerServiceWorker();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<InstallPrompt />

<!-- Modal de sesión expirada (global) -->
{#if $sessionStore.showExpiredModal && $sessionStore.reason}
	<SessionExpiredModal reason={$sessionStore.reason} />
{/if}
