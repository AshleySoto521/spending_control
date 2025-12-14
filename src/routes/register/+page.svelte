<script lang="ts">
    import { goto } from '$app/navigation';
    import { authStore } from '$lib/stores/auth';

    let nombre = $state('');
    let email = $state('');
    let celular = $state('');
    let password = $state('');
    let confirmPassword = $state('');
    let aceptoTerminos = $state(false);
    let aceptoPrivacidad = $state(false);
    let error = $state('');
    let loading = $state(false);

    async function handleRegister() {
        error = '';

        // --- VALIDACIONES MANUALES ---
        
        // 1. Validar celular (10 dígitos exactos)
        if (celular.length !== 10) {
            error = 'El celular debe tener 10 dígitos exactos';
            return;
        }

        // 2. Validar contraseñas
        if (password !== confirmPassword) {
            error = 'Las contraseñas no coinciden';
            return;
        }

        if (password.length < 8) {
            error = 'La contraseña debe tener al menos 8 caracteres';
            return;
        }

        // 3. Validar aceptación de términos y privacidad
        if (!aceptoTerminos) {
            error = 'Debes aceptar los Términos y Condiciones';
            return;
        }

        if (!aceptoPrivacidad) {
            error = 'Debes aceptar el Aviso de Privacidad';
            return;
        }

        loading = true;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    email,
                    celular,
                    password,
                    aceptoTerminos,
                    aceptoPrivacidad
                })
            });

            const data = await response.json();

            if (!response.ok) {
                error = data.error || 'Error al registrar usuario';
                return;
            }

            authStore.login(data.user, data.token);
            goto('/dashboard');
        } catch (err) {
            error = 'Error de conexión';
        } finally {
            loading = false;
        }
    }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full card p-8">
        <div class="mb-6">
            <a href="/" class="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
                Volver al inicio
            </a>
        </div>
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
            <p class="text-gray-500">Regístrate para comenzar</p>
        </div>

        <form onsubmit={(e) => { e.preventDefault(); handleRegister(); }} class="space-y-6">
            {#if error}
                <div class="bg-gray-100 border border-gray-300 text-gray-900 px-4 py-3 rounded-lg">
                    {error}
                </div>
            {/if}

            <div>
                <label for="nombre" class="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo
                </label>
                <input
                    id="nombre"
                    type="text"
                    bind:value={nombre}
                    required
                    class="input-minimal"
                    placeholder="Juan Pérez"
                />
            </div>

            <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    bind:value={email}
                    required
                    class="input-minimal"
                    placeholder="tu@email.com"
                />
            </div>

            <div>
                <label for="celular" class="block text-sm font-medium text-gray-700 mb-2">
                    Celular
                </label>
                <input
                    id="celular"
                    type="tel"
                    bind:value={celular}
                    required
                    maxlength="10"
                    class="input-minimal"
                    placeholder="5512345678"
                    oninput={(e) => {
                        const target = e.currentTarget;
                        // Eliminar cualquier caracter que no sea número
                        celular = target.value.replace(/\D/g, '');
                    }}
                />
                <div class="flex justify-between mt-1">
                    <p class="text-sm text-gray-500">Solo números</p>
                    <p class="text-xs text-gray-400">
                        {celular.length}/10
                    </p>
                </div>
            </div>

            <div>
                <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                </label>
                <input
                    id="password"
                    type="password"
                    bind:value={password}
                    required
                    class="input-minimal"
                    placeholder="••••••••"
                />
                <p class="mt-1 text-sm text-gray-500">Mínimo 8 caracteres</p>
            </div>

            <div>
                <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Contraseña
                </label>
                <input
                    id="confirmPassword"
                    type="password"
                    bind:value={confirmPassword}
                    required
                    class="input-minimal"
                    placeholder="••••••••"
                />
            </div>

            <div class="space-y-3 pt-2">
                <div class="flex items-start">
                    <input
                        id="aceptoTerminos"
                        type="checkbox"
                        bind:checked={aceptoTerminos}
                        required
                        class="mt-1 h-4 w-4 text-gray-800 border-gray-300 rounded focus:ring-gray-500"
                    />
                    <label for="aceptoTerminos" class="ml-3 text-sm text-gray-700">
                        Acepto los <a href="/terminos" target="_blank" class="text-gray-800 hover:text-gray-900 font-semibold underline">Términos y Condiciones de Uso</a>
                    </label>
                </div>

                <div class="flex items-start">
                    <input
                        id="aceptoPrivacidad"
                        type="checkbox"
                        bind:checked={aceptoPrivacidad}
                        required
                        class="mt-1 h-4 w-4 text-gray-800 border-gray-300 rounded focus:ring-gray-500"
                    />
                    <label for="aceptoPrivacidad" class="ml-3 text-sm text-gray-700">
                        Acepto el <a href="/privacidad" target="_blank" class="text-gray-800 hover:text-gray-900 font-semibold underline">Aviso de Privacidad Integral</a>
                    </label>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
        </form>

        <div class="mt-6 text-center">
            <p class="text-gray-500">
                ¿Ya tienes cuenta?
                <a href="/login" class="text-gray-800 hover:text-gray-900 font-semibold transition">
                    Inicia Sesión
                </a>
            </p>
        </div>
    </div>
</div>