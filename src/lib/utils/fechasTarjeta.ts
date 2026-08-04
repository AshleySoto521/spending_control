/**
 * Fechas de corte y de pago de una tarjeta.
 *
 * Todo se calcula en UTC, igual que el resto de la aplicación, que ya formatea
 * las fechas con `timeZone: 'UTC'`. Mezclar husos aquí produciría avisos con un
 * día de diferencia, que en un aviso de vencimiento es justo el día que
 * importa.
 */

/** Días que tiene un mes concreto. */
function diasDelMes(anio: number, mes: number): number {
	// El día 0 del mes siguiente es el último del mes pedido.
	return new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
}

/**
 * Construye una fecha con el día pedido, recortado a la longitud del mes.
 *
 * Una tarjeta que corta el 31 no puede cortar el 31 de febrero: corta el
 * último día que exista. Sin este recorte, `new Date(2026, 1, 31)` se
 * desbordaría al 3 de marzo y el aviso saldría con tres días de retraso.
 */
function fechaDelMes(anio: number, mes: number, dia: number): Date {
	return new Date(Date.UTC(anio, mes, Math.min(dia, diasDelMes(anio, mes))));
}

/** Fecha sin hora, para poder comparar días completos. */
function soloFecha(fecha: Date): Date {
	return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

/**
 * Próximo corte a partir de hoy, incluido hoy.
 * Si el día ya pasó este mes, devuelve el del mes siguiente.
 */
export function proximoCorte(hoy: Date, diaCorte: number): Date {
	const base = soloFecha(hoy);
	const esteMes = fechaDelMes(base.getUTCFullYear(), base.getUTCMonth(), diaCorte);

	if (esteMes.getTime() >= base.getTime()) return esteMes;

	return fechaDelMes(base.getUTCFullYear(), base.getUTCMonth() + 1, diaCorte);
}

/**
 * Último corte ocurrido, incluido hoy.
 * Es el que determina qué pago está pendiente ahora mismo.
 */
export function ultimoCorte(hoy: Date, diaCorte: number): Date {
	const base = soloFecha(hoy);
	const esteMes = fechaDelMes(base.getUTCFullYear(), base.getUTCMonth(), diaCorte);

	if (esteMes.getTime() <= base.getTime()) return esteMes;

	return fechaDelMes(base.getUTCFullYear(), base.getUTCMonth() - 1, diaCorte);
}

/** Fecha límite de pago: los días de gracia posteriores al corte. */
export function fechaLimitePago(fechaCorte: Date, diasGracia: number): Date {
	const limite = soloFecha(fechaCorte);
	limite.setUTCDate(limite.getUTCDate() + diasGracia);
	return limite;
}

/** Días completos entre dos fechas. Negativo si la segunda ya pasó. */
export function diasHasta(hoy: Date, fecha: Date): number {
	const dia = 86_400_000;
	return Math.round((soloFecha(fecha).getTime() - soloFecha(hoy).getTime()) / dia);
}

/**
 * Próxima ocurrencia de un día del mes, para los pagos de préstamo, que no
 * tienen corte: solo un día fijo cada mes.
 */
export function proximoDiaDelMes(hoy: Date, dia: number): Date {
	return proximoCorte(hoy, dia);
}

/** Etiqueta legible de una cuenta atrás. */
export function enCuantosDias(dias: number): string {
	if (dias === 0) return 'hoy';
	if (dias === 1) return 'mañana';
	return `en ${dias} días`;
}
