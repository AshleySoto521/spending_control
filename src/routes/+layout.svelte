<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import { registerServiceWorker } from '$lib/pwa';
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
