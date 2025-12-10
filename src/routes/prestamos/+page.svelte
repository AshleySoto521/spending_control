<script lang="ts">
    import { onMount } from 'svelte';
    import ProtectedRoute from '$lib/components/ProtectedRoute.svelte';
    import Navbar from '$lib/components/Navbar.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import { authStore } from '$lib/stores/auth';
    import { apiGet, apiPost, apiPut, apiDelete } from '$lib/utils/apiClient';

    interface Prestamo {
        id_prestamo: number;
        tipo_prestamo: string;
        institucion: string;
        monto_original: number;
        tasa_interes: number;
        plazo_meses: number;
        pago_mensual: number;
        dia_pago: number;
        fecha_inicio: string;
        descripcion: string;
        activo: boolean;
        total_pagado: number;
        saldo_pendiente: number;
        meses_transcurridos: number;
    }

    let loading = $state(true);
    let error = $state('');
    let prestamos: Prestamo[] = $state([]);
    let showModal = $state(false);
    let showPagoModal = $state(false);
    let editingPrestamo: Prestamo | null = $state(null);
    let prestamoParaPago: Prestamo | null = $state(null);
    let formasPago: any[] = $state([]);

    // Form fields - Préstamo
    let tipo_prestamo = $state('PERSONAL');
    let institucion = $state('');
    let monto_original = $state(0);
    let tasa_interes = $state(0);
    let plazo_meses = $state(12);
    let pago_mensual = $state(0);
    let dia_pago = $state(1);
    let fecha_inicio = $state('');
    let descripcion = $state('');

    // Form fields - Pago
    let fecha_pago = $state('');
    let monto_pago = $state(0);
    let id_forma_pago = $state(0);
    let descripcion_pago = $state('');

    onMount(() => {
        loadPrestamos();
        loadFormasPago();
    });

    async function loadFormasPago() {
        try {
            const token = $authStore.token;
            const response = await apiGet('/api/formas-pago', token);

            if (!response.ok) {
                throw new Error('Error al cargar formas de pago');
            }

            const data = await response.json();
            formasPago = data.formas_pago || [];

            // Seleccionar la primera forma de pago por defecto
            if (formasPago.length > 0) {
                id_forma_pago = formasPago[0].id_forma_pago;
            }
        } catch (err: any) {
            console.error('Error al cargar formas de pago:', err);
        }
    }

    async function loadPrestamos() {
        try {
            const token = $authStore.token;
            const response = await apiGet('/api/prestamos', token);

            if (!response.ok) {
                throw new Error('Error al cargar préstamos');
            }

            const data = await response.json();
            prestamos = data.prestamos || [];
        } catch (err: any) {
            if (!err.message.includes('Sesión expirada')) {
                error = err.message;
            }
        } finally {
            loading = false;
        }
    }

    function openModal(prestamo: Prestamo | null = null) {
        if (prestamo) {
            editingPrestamo = prestamo;
            tipo_prestamo = prestamo.tipo_prestamo;
            institucion = prestamo.institucion;
            monto_original = prestamo.monto_original;
            tasa_interes = prestamo.tasa_interes || 0;
            plazo_meses = prestamo.plazo_meses;
            pago_mensual = prestamo.pago_mensual;
            dia_pago = prestamo.dia_pago;
            fecha_inicio = prestamo.fecha_inicio;
            descripcion = prestamo.descripcion || '';
        } else {
            resetForm();
        }
        showModal = true;
    }

    function resetForm() {
        editingPrestamo = null;
        tipo_prestamo = 'PERSONAL';
        institucion = '';
        monto_original = 0;
        tasa_interes = 0;
        plazo_meses = 12;
        pago_mensual = 0;
        dia_pago = 1;
        fecha_inicio = '';
        descripcion = '';
    }

    async function handleSubmit() {
        try {
            const token = $authStore.token;
            const data = {
                tipo_prestamo,
                institucion,
                monto_original,
                tasa_interes: tasa_interes || null,
                plazo_meses,
                pago_mensual,
                dia_pago,
                fecha_inicio,
                descripcion
            };

            let response;
            if (editingPrestamo) {
                response = await apiPut('/api/prestamos', token, {
                    ...data,
                    id_prestamo: editingPrestamo.id_prestamo,
                    activo: editingPrestamo.activo
                });
            } else {
                response = await apiPost('/api/prestamos', token, data);
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar préstamo');
            }

            showModal = false;
            resetForm();
            await loadPrestamos();
        } catch (err: any) {
            error = err.message;
        }
    }

    async function deletePrestamo(id: number) {
        if (!confirm('¿Estás seguro de que deseas eliminar este préstamo?')) {
            return;
        }

        try {
            const token = $authStore.token;
            const response = await apiDelete(`/api/prestamos?id_prestamo=${id}`, token);

            if (!response.ok) {
                throw new Error('Error al eliminar préstamo');
            }

            await loadPrestamos();
        } catch (err: any) {
            error = err.message;
        }
    }

    async function toggleActivo(prestamo: Prestamo) {
        try {
            const token = $authStore.token;
            const response = await apiPut('/api/prestamos', token, {
                ...prestamo,
                activo: !prestamo.activo
            });

            if (!response.ok) {
                throw new Error('Error al actualizar préstamo');
            }

            await loadPrestamos();
        } catch (err: any) {
            error = err.message;
        }
    }

    function openPagoModal(prestamo: Prestamo) {
        prestamoParaPago = prestamo;
        fecha_pago = new Date().toISOString().split('T')[0];
        monto_pago = prestamo.pago_mensual;
        descripcion_pago = '';
        showPagoModal = true;
    }

    async function handleRegistrarPago() {
        if (!prestamoParaPago) return;

        try {
            const token = $authStore.token;
            const response = await apiPost('/api/pagos-prestamos', token, {
                id_prestamo: prestamoParaPago.id_prestamo,
                fecha_pago,
                monto: monto_pago,
                id_forma_pago,
                descripcion: descripcion_pago
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al registrar pago');
            }

            showPagoModal = false;
            prestamoParaPago = null;
            await loadPrestamos();
        } catch (err: any) {
            error = err.message;
        }
    }

    function formatCurrency(amount: number): string {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC'
        });
    }

    function getTipoIcon(tipo: string): string {
        switch (tipo) {
            case 'PERSONAL':
                return '👤';
            case 'AUTOMOTRIZ':
                return '🚗';
            case 'HIPOTECARIO':
                return '🏠';
            default:
                return '💰';
        }
    }

    let prestamosActivos = $derived(prestamos.filter(p => p.activo));
    let prestamosPagados = $derived(prestamos.filter(p => !p.activo));
    let totalDeudaPrestamos = $derived(prestamosActivos.reduce((sum, p) => sum + p.saldo_pendiente, 0));
    let totalPagoMensual = $derived(prestamosActivos.reduce((sum, p) => sum + p.pago_mensual, 0));
</script>

<ProtectedRoute>
    <Navbar />

    <div class="min-h-screen bg-gray-50 py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="mb-8">
                <div class="flex justify-between items-start">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Préstamos</h1>
                        <p class="mt-2 text-gray-600">
                            Administra tus préstamos personales, automotrices e hipotecarios
                        </p>
                    </div>
                    <button onclick={() => openModal()} class="btn-primary">
                        + Nuevo Préstamo
                    </button>
                </div>
            </div>

            {#if loading}
                <div class="flex justify-center py-20">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
                </div>
            {:else if error}
                <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Préstamos Activos</p>
                                <p class="text-3xl font-bold text-gray-900 mt-1">{prestamosActivos.length}</p>
                            </div>
                            <div class="bg-gray-100 rounded-full p-3">
                                <span class="text-2xl">💼</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Deuda Total</p>
                                <p class="text-3xl font-bold text-gray-900 mt-1">
                                    {formatCurrency(totalDeudaPrestamos)}
                                </p>
                            </div>
                            <div class="bg-red-100 rounded-full p-3">
                                <span class="text-2xl">💸</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Pago Mensual Total</p>
                                <p class="text-3xl font-bold text-gray-900 mt-1">
                                    {formatCurrency(totalPagoMensual)}
                                </p>
                            </div>
                            <div class="bg-blue-100 rounded-full p-3">
                                <span class="text-2xl">📅</span>
                            </div>
                        </div>
                    </div>
                </div>

                {#if prestamosActivos.length > 0}
                    <div class="mb-8">
                        <h2 class="text-xl font-bold text-gray-900 mb-4">Préstamos Activos</h2>
                        <div class="grid gap-6">
                            {#each prestamosActivos as prestamo}
                                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div class="flex justify-between items-start mb-4">
                                        <div class="flex items-start gap-4">
                                            <div class="text-4xl">{getTipoIcon(prestamo.tipo_prestamo)}</div>
                                            <div>
                                                <h3 class="text-lg font-bold text-gray-900">{prestamo.institucion}</h3>
                                                <p class="text-sm text-gray-500">{prestamo.tipo_prestamo}</p>
                                                {#if prestamo.descripcion}
                                                    <p class="text-sm text-gray-600 mt-1">{prestamo.descripcion}</p>
                                                {/if}
                                            </div>
                                        </div>
                                        <div class="flex gap-2">
                                            <button
                                                onclick={() => openPagoModal(prestamo)}
                                                class="text-blue-600 hover:text-blue-700 p-2"
                                                title="Registrar pago"
                                            >
                                                💰
                                            </button>
                                            <button
                                                onclick={() => openModal(prestamo)}
                                                class="text-gray-600 hover:text-gray-900 p-2"
                                                title="Editar"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onclick={() => toggleActivo(prestamo)}
                                                class="text-green-600 hover:text-green-700 p-2"
                                                title="Marcar como pagado"
                                            >
                                                ✅
                                            </button>
                                            <button
                                                onclick={() => deletePrestamo(prestamo.id_prestamo)}
                                                class="text-red-600 hover:text-red-700 p-2"
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <p class="text-xs text-gray-500">Monto Original</p>
                                            <p class="text-sm font-semibold text-gray-900">
                                                {formatCurrency(prestamo.monto_original)}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-gray-500">Saldo Pendiente</p>
                                            <p class="text-sm font-semibold text-red-600">
                                                {formatCurrency(prestamo.saldo_pendiente)}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-gray-500">Pago Mensual</p>
                                            <p class="text-sm font-semibold text-gray-900">
                                                {formatCurrency(prestamo.pago_mensual)}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-gray-500">Día de Pago</p>
                                            <p class="text-sm font-semibold text-gray-900">Día {prestamo.dia_pago}</p>
                                        </div>
                                    </div>

                                    <div class="bg-gray-50 rounded-lg p-4">
                                        <div class="flex justify-between text-sm mb-2">
                                            <span class="text-gray-600">Capital Pagado:</span>
                                            <span class="font-semibold text-gray-900">
                                                {formatCurrency(prestamo.total_pagado)} / {formatCurrency(prestamo.monto_original)}
                                            </span>
                                        </div>
                                        
                                        <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                                            <div
                                                class="bg-green-600 h-2 rounded-full transition-all"
                                                style="width: {prestamo.monto_original > 0 ? Math.min((prestamo.total_pagado / prestamo.monto_original) * 100, 100) : 0}%"
                                            ></div>
                                        </div>

                                        <div class="flex justify-between items-center text-xs text-gray-500">
                                            <span>
                                                Plazo: {prestamo.meses_transcurridos} / {prestamo.plazo_meses} meses
                                            </span>
                                            <span class="font-medium {prestamo.total_pagado >= prestamo.monto_original ? 'text-green-600' : 'text-blue-600'}">
                                                {prestamo.monto_original > 0 ? ((prestamo.total_pagado / prestamo.monto_original) * 100).toFixed(1) : 0}% Pagado
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            {/each}
                        </div>
                    </div>
                {:else}
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center mb-8">
                        <div class="text-6xl mb-4">💰</div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No tienes préstamos activos</h3>
                        <p class="text-gray-500 mb-4">Comienza registrando tu primer préstamo</p>
                        <button onclick={() => openModal()} class="btn-primary">
                            Agregar Préstamo
                        </button>
                    </div>
                {/if}

                {#if prestamosPagados.length > 0}
                    <div>
                        <h2 class="text-xl font-bold text-gray-900 mb-4">Préstamos Pagados</h2>
                        <div class="grid gap-4">
                            {#each prestamosPagados as prestamo}
                                <div class="bg-gray-50 rounded-xl border border-gray-200 p-4 opacity-75">
                                    <div class="flex justify-between items-center">
                                        <div class="flex items-center gap-3">
                                            <span class="text-2xl">{getTipoIcon(prestamo.tipo_prestamo)}</span>
                                            <div>
                                                <p class="font-semibold text-gray-700">{prestamo.institucion}</p>
                                                <p class="text-sm text-gray-500">Pagado - {formatDate(prestamo.fecha_inicio)}</p>
                                            </div>
                                        </div>
                                        <div class="flex gap-2">
                                            <button
                                                onclick={() => toggleActivo(prestamo)}
                                                class="text-gray-600 hover:text-gray-900 p-2 text-sm"
                                                title="Reactivar"
                                            >
                                                ↩️ Reactivar
                                            </button>
                                            <button
                                                onclick={() => deletePrestamo(prestamo.id_prestamo)}
                                                class="text-red-600 hover:text-red-700 p-2"
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            {/if}
        </div>
    </div>

    {#if showModal}
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">
                        {editingPrestamo ? 'Editar Préstamo' : 'Nuevo Préstamo'}
                    </h2>

                    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label for="tipo_prestamo" class="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Préstamo *
                                </label>
                                <select
                                    id="tipo_prestamo"
                                    bind:value={tipo_prestamo}
                                    required
                                    class="input-minimal"
                                >
                                    <option value="PERSONAL">Personal</option>
                                    <option value="AUTOMOTRIZ">Automotriz</option>
                                    <option value="HIPOTECARIO">Hipotecario</option>
                                </select>
                            </div>

                            <div>
                                <label for="institucion" class="block text-sm font-medium text-gray-700 mb-2">
                                    Institución Financiera *
                                </label>
                                <input
                                    id="institucion"
                                    type="text"
                                    bind:value={institucion}
                                    required
                                    class="input-minimal"
                                    placeholder="Ej: BBVA, Santander"
                                />
                            </div>
                        </div>

                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label for="monto_original" class="block text-sm font-medium text-gray-700 mb-2">
                                    Monto del Préstamo *
                                </label>
                                <input
                                    id="monto_original"
                                    type="number"
                                    bind:value={monto_original}
                                    required
                                    min="0"
                                    step="0.01"
                                    class="input-minimal"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label for="tasa_interes" class="block text-sm font-medium text-gray-700 mb-2">
                                    Tasa de Interés Anual (%)
                                </label>
                                <input
                                    id="tasa_interes"
                                    type="number"
                                    bind:value={tasa_interes}
                                    min="0"
                                    step="0.01"
                                    class="input-minimal"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div class="grid md:grid-cols-3 gap-4">
                            <div>
                                <label for="plazo_meses" class="block text-sm font-medium text-gray-700 mb-2">
                                    Plazo (meses) *
                                </label>
                                <input
                                    id="plazo_meses"
                                    type="number"
                                    bind:value={plazo_meses}
                                    required
                                    min="1"
                                    class="input-minimal"
                                />
                            </div>

                            <div>
                                <label for="pago_mensual" class="block text-sm font-medium text-gray-700 mb-2">
                                    Pago Mensual *
                                </label>
                                <input
                                    id="pago_mensual"
                                    type="number"
                                    bind:value={pago_mensual}
                                    required
                                    min="0"
                                    step="0.01"
                                    class="input-minimal"
                                />
                            </div>

                            <div>
                                <label for="dia_pago" class="block text-sm font-medium text-gray-700 mb-2">
                                    Día de Pago *
                                </label>
                                <input
                                    id="dia_pago"
                                    type="number"
                                    bind:value={dia_pago}
                                    required
                                    min="1"
                                    max="31"
                                    class="input-minimal"
                                />
                            </div>
                        </div>

                        <div>
                            <label for="fecha_inicio" class="block text-sm font-medium text-gray-700 mb-2">
                                Fecha de Inicio *
                            </label>
                            <input
                                id="fecha_inicio"
                                type="date"
                                bind:value={fecha_inicio}
                                required
                                class="input-minimal"
                            />
                        </div>

                        <div>
                            <label for="descripcion" class="block text-sm font-medium text-gray-700 mb-2">
                                Descripción / Propósito
                            </label>
                            <textarea
                                id="descripcion"
                                bind:value={descripcion}
                                rows="3"
                                class="input-minimal"
                                placeholder="Ej: Préstamo para compra de auto"
                            ></textarea>
                        </div>

                        <div class="flex gap-3 pt-4">
                            <button type="submit" class="btn-primary flex-1">
                                {editingPrestamo ? 'Actualizar' : 'Guardar'}
                            </button>
                            <button
                                type="button"
                                onclick={() => { showModal = false; resetForm(); }}
                                class="btn-ghost flex-1"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    {/if}

    {#if showPagoModal && prestamoParaPago}
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div class="p-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">
                        Registrar Pago
                    </h2>
                    <p class="text-sm text-gray-600 mb-6">
                        {prestamoParaPago.institucion} - {prestamoParaPago.tipo_prestamo}
                    </p>

                    <form onsubmit={(e) => { e.preventDefault(); handleRegistrarPago(); }} class="space-y-4">
                        <div>
                            <label for="fecha_pago" class="block text-sm font-medium text-gray-700 mb-2">
                                Fecha de Pago *
                            </label>
                            <input
                                id="fecha_pago"
                                type="date"
                                bind:value={fecha_pago}
                                required
                                class="input-minimal"
                            />
                        </div>

                        <div>
                            <label for="monto_pago" class="block text-sm font-medium text-gray-700 mb-2">
                                Monto del Pago *
                            </label>
                            <input
                                id="monto_pago"
                                type="number"
                                bind:value={monto_pago}
                                required
                                min="0"
                                step="0.01"
                                class="input-minimal"
                                placeholder="0.00"
                            />
                            <p class="text-xs text-gray-500 mt-1">
                                Pago mensual: {formatCurrency(prestamoParaPago.pago_mensual)}
                            </p>
                        </div>

                        <div>
                            <label for="id_forma_pago" class="block text-sm font-medium text-gray-700 mb-2">
                                Forma de Pago *
                            </label>
                            <select
                                id="id_forma_pago"
                                bind:value={id_forma_pago}
                                required
                                class="input-minimal"
                            >
                                {#each formasPago as forma}
                                    <option value={forma.id_forma_pago}>
                                        {forma.tipo}
                                    </option>
                                {/each}
                            </select>
                        </div>

                        <div>
                            <label for="descripcion_pago" class="block text-sm font-medium text-gray-700 mb-2">
                                Nota / Descripción
                            </label>
                            <textarea
                                id="descripcion_pago"
                                bind:value={descripcion_pago}
                                rows="2"
                                class="input-minimal"
                                placeholder="Ej: Pago mensual de enero"
                            ></textarea>
                        </div>

                        <div class="flex gap-3 pt-4">
                            <button type="submit" class="btn-primary flex-1">
                                Registrar Pago
                            </button>
                            <button
                                type="button"
                                onclick={() => { showPagoModal = false; prestamoParaPago = null; }}
                                class="btn-ghost flex-1"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    {/if}

    <Footer />
</ProtectedRoute>