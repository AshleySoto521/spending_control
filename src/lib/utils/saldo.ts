/**
 * Presentación del saldo de una tarjeta.
 *
 * `tarjetas.saldo_usado` se calcula como compras − pagos, así que puede salir
 * negativo cuando hay pagos registrados por encima de las compras. Ocurre en un
 * caso muy real y nada excepcional: alguien da de alta su tarjeta, registra un
 * abono y todavía no ha capturado ninguna compra.
 *
 * El dato se guarda tal cual —truncarlo a cero en la base perdería la
 * diferencia entre «tarjeta liquidada» y «has pagado de más»— y es aquí, al
 * mostrarlo, donde se traduce a algo que se entienda. Una tarjeta que anuncia
 * «Saldo Usado: −$10,000.00» parece un error de la aplicación.
 */

export interface SaldoPresentado {
	/** Etiqueta a mostrar sobre la cifra. */
	etiqueta: string;
	/** Importe siempre en positivo: el signo lo comunica la etiqueta. */
	monto: number;
	/** `true` cuando se ha pagado más de lo gastado. */
	aFavor: boolean;
}

/**
 * Traduce un `saldo_usado` en bruto a etiqueta e importe.
 *
 * @param valor El `saldo_usado` de la tarjeta, en cualquier formato que llegue
 *              de la API (la columna es DECIMAL y `pg` la entrega como texto).
 */
export function presentarSaldo(valor: unknown): SaldoPresentado {
	const numero = Number.parseFloat(String(valor ?? '0'));
	const saldo = Number.isFinite(numero) ? numero : 0;

	if (saldo < 0) {
		return { etiqueta: 'Saldo a Favor', monto: Math.abs(saldo), aFavor: true };
	}

	return { etiqueta: 'Saldo Usado', monto: saldo, aFavor: false };
}

/**
 * Crédito disponible.
 *
 * Con saldo a favor el disponible supera la línea de crédito, que es lo
 * correcto: además del límite, la tarjeta tiene dinero adelantado.
 */
export function calcularDisponible(lineaCredito: unknown, saldoUsado: unknown): number {
	const linea = Number.parseFloat(String(lineaCredito ?? '0'));
	const usado = Number.parseFloat(String(saldoUsado ?? '0'));

	return (Number.isFinite(linea) ? linea : 0) - (Number.isFinite(usado) ? usado : 0);
}
