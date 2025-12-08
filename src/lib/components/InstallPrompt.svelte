<script lang="ts">
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';

    let showPrompt = $state(false);
    let deferredPrompt: any = null;
    let isIOS = $state(false);
    let isAndroid = $state(false);
    let showIOSInstructions = $state(false);
    let canInstall = $state(false);

    onMount(() => {
        if (!browser) return;

        // Detectar iOS
        isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

        // Detectar Android
        isAndroid = /Android/.test(navigator.userAgent);

        // Verificar si ya está instalada
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        if (isStandalone) {
            return; // Ya está instalada, no mostrar nada
        }

        // Verificar si ya se descartó el prompt
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const now = new Date();
            const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 3600 * 24);

            // Si hace menos de 7 días que se descartó, no mostrar
            if (daysSinceDismissed < 7) {
                return;
            }
        }

        // Para Android/Chrome
        window.addEventListener('beforeinstallprompt', (e: Event) => {
            e.preventDefault();
            deferredPrompt = e;
            canInstall = true;
            setTimeout(() => {
                showPrompt = true;
            }, 3000); // Esperar 3 segundos antes de mostrar
        });

        // Para iOS, mostrar después de un tiempo
        if (isIOS && !isStandalone) {
            setTimeout(() => {
                showPrompt = true;
            }, 5000); // Esperar 5 segundos en iOS
        }
    });

    async function handleInstall() {
        if (isIOS) {
            showIOSInstructions = true;
            return;
        }

        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('PWA instalada');
        }

        deferredPrompt = null;
        showPrompt = false;
    }

    function dismiss() {
        showPrompt = false;
        showIOSInstructions = false;
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    }
</script>

{#if showPrompt && !showIOSInstructions}
    <div class="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none">
        <div
            class="max-w-md mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-6 pointer-events-auto animate-slide-up"
        >
            <div class="flex items-start gap-4">
                <div
                    class="shrink-0 w-12 h-12 bg-linear-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                >
                    $
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-bold text-gray-900 mb-1">
                        ¡Agrega Control de Gastos a tu pantalla!
                    </h3>
                    <p class="text-sm text-gray-600 mb-4">
                        Accede más rápido como si fuera una app. Sin descargas, sin ocupar espacio.
                    </p>

                    <div class="flex gap-2">
                        <button
                            onclick={handleInstall}
                            class="flex-1 bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                        >
                            {#if isIOS}
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                Ver Instrucciones
                            {:else}
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                Agregar Ahora
                            {/if}
                        </button>
                        <button
                            onclick={dismiss}
                            class="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                        >
                            Ahora no
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

{#if showIOSInstructions}
    <div
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
        onclick={dismiss}
        onkeydown={(e) => e.key === 'Escape' && dismiss()}
        role="button"
        tabindex="0"
        aria-label="Cerrar instrucciones"
    >
        <div
            class="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 animate-slide-up"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            tabindex="-1"
        >
            <div class="flex justify-between items-start mb-4">
                <h3 id="ios-install-title" class="text-xl font-bold text-gray-900">
                    Cómo Instalar en iOS
                </h3>
                <button
                    onclick={dismiss}
                    class="text-gray-400 hover:text-gray-600"
                    aria-label="Cerrar"
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <div class="space-y-4">
                <div class="flex gap-3">
                    <div
                        class="shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-sm"
                    >
                        1
                    </div>
                    <div class="flex-1">
                        <p class="text-gray-900 font-medium">Toca el botón de compartir</p>
                        <div class="flex items-center gap-2 mt-2 text-blue-600">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path
                                    d="M16.5 6.75v10.5c0 .621-.504 1.125-1.125 1.125h-6.75A1.125 1.125 0 0 1 7.5 17.25V6.75c0-.621.504-1.125 1.125-1.125h6.75c.621 0 1.125.504 1.125 1.125ZM12 14.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                                />
                                <path
                                    d="M12 2.25a.75.75 0 0 1 .75.75v6.44l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l1.72 1.72V3a.75.75 0 0 1 .75-.75Z"
                                />
                            </svg>
                            <span class="text-sm">(En la barra de abajo en Safari)</span>
                        </div>
                    </div>
                </div>

                <div class="flex gap-3">
                    <div
                        class="shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-sm"
                    >
                        2
                    </div>
                    <div class="flex-1">
                        <p class="text-gray-900 font-medium">Selecciona "Agregar a pantalla de inicio"</p>
                        <div class="flex items-center gap-2 mt-2 text-gray-600">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                            <span class="text-sm">Busca este icono en el menú</span>
                        </div>
                    </div>
                </div>

                <div class="flex gap-3">
                    <div
                        class="shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-sm"
                    >
                        3
                    </div>
                    <div class="flex-1">
                        <p class="text-gray-900 font-medium">Toca "Agregar"</p>
                        <p class="text-sm text-gray-600 mt-1">
                            ¡Listo! Ahora tendrás un acceso directo en tu pantalla de inicio.
                        </p>
                    </div>
                </div>
            </div>

            <button
                onclick={dismiss}
                class="w-full mt-6 bg-gray-800 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors"
            >
                Entendido
            </button>
        </div>
    </div>
{/if}

<style>
    @keyframes slide-up {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .animate-slide-up {
        animation: slide-up 0.3s ease-out;
    }

    .animate-fade-in {
        animation: fade-in 0.2s ease-out;
    }
</style>