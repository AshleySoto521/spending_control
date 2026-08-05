/**
 * Entidades del dominio, tal como llegan de la API.
 *
 * Los importes son `string` y no `number` a propósito: el driver de PostgreSQL
 * entrega las columnas DECIMAL como texto para no perder precisión, y por eso
 * en las páginas todo pasa por `parseFloat` antes de mostrarse. Tiparlos como
 * número aquí escondería esa conversión y acabaría en sumas de cadenas.
 */

export type TipoTarjeta = 'CREDITO' | 'DEBITO' | 'DEPARTAMENTAL' | 'SERVICIOS';

export interface FormaPago {
	id_forma_pago: number;
	tipo: string;
	descripcion: string | null;
}

export interface Tarjeta {
	id_tarjeta: number;
	/** Solo los últimos dígitos; ver migración 017. */
	num_tarjeta: string | null;
	nom_tarjeta: string;
	tipo_tarjeta: TipoTarjeta;
	clabe: string | null;
	banco: string | null;
	linea_credito: string | null;
	saldo_usado: string;
	dia_corte: number | null;
	dias_gracia: number | null;
	activa: boolean;
	saldo_disponible?: string | null;
}

export interface Egreso {
	id_egreso: number;
	fecha_egreso: string;
	concepto: string;
	establecimiento: string | null;
	monto: string;
	id_forma_pago: number | null;
	id_tarjeta: number | null;
	descripcion: string | null;
	compra_meses: boolean;
	num_meses: number | null;
	mes_inicio_pago: number | null;
	monto_mensual: string | null;
	meses_pagados: number;
	/** Añadidos por el JOIN con formas_pago y tarjetas al listar. */
	forma_pago?: string;
	nom_tarjeta?: string;
	banco?: string | null;
}

export interface Ingreso {
	id_ingreso: number;
	tipo_ingreso: string;
	monto: string;
	id_forma_pago: number | null;
	fecha_ingreso: string;
	descripcion: string | null;
	forma_pago?: string;
}

export interface PagoTarjeta {
	id_pago: number;
	id_tarjeta: number;
	nom_tarjeta?: string;
	banco?: string | null;
	fecha_pago: string;
	monto: string;
	id_forma_pago: number;
	forma_pago?: string;
	descripcion: string | null;
}

export interface CuotaMsi {
	id_egreso: number;
	concepto: string;
	establecimiento: string | null;
	monto_mensual: string;
	meses_pagados: number;
	num_meses: number;
	cuotas_pendientes?: number;
	monto_pendiente?: string;
	fecha_proxima_cuota?: string;
	estado?: string;
	nom_tarjeta?: string;
	banco?: string | null;
}

/** Resumen por tarjeta de la pantalla de egresos. */
export interface ResumenTarjeta {
	id_tarjeta: number;
	nom_tarjeta: string;
	banco: string | null;
	linea_credito: string | null;
	saldo_usado: string;
	total_egresos: number;
	total_gastado: string;
	egresos_normales: number;
	compras_msi: number;
	/** Compras a meses con cuotas todavía pendientes. */
	msi_activas: number;
	cuotas_msi_mensuales: string;
	ultimo_egreso: string | null;
}

/**
 * Fila de `v_pago_mensual_tarjetas`: el pago pendiente del periodo en curso.
 * No tiene `id_pago` porque no es un pago realizado, sino uno calculado.
 */
export interface ProximoPagoTarjeta {
	id_tarjeta: number;
	nom_tarjeta: string;
	banco: string | null;
	dia_corte: number;
	dias_gracia: number | null;
	saldo_total: string;
	egresos_periodo: string;
	cuotas_msi_mensuales: string;
	pagos_realizados: string;
	monto_pago: string;
	num_compras_msi: number;
	fecha_corte_anterior: string;
	fecha_corte: string;
	fecha_limite_pago: string;
}

export interface Usuario {
	id_usuario: string;
	nombre: string;
	email: string;
	celular: string | null;
	fecha_registro: string;
	activo?: boolean;
	es_admin?: boolean;
	total_tarjetas?: number;
	total_ingresos?: number;
	total_egresos?: number;
}

/** Sesión abierta, tal como la devuelve /api/user/sesiones. */
export interface SesionAbierta {
	id: string;
	dispositivo: string;
	ip: string | null;
	inicio: string;
	expira: string;
	esActual: boolean;
}

export interface LogSeguridad {
	id_log: number;
	tipo_evento: string;
	email: string | null;
	ip_address: string | null;
	user_agent: string | null;
	detalles: string | null;
	fecha_evento: string;
	/** Añadido por el JOIN con usuarios al listar. */
	nombre_usuario?: string | null;
}
