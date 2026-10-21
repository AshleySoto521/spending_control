/**
 * Qué tan al día van los registros de una persona.
 *
 * El hueco se mide contra la fecha del movimiento más reciente, no contra
 * cuándo se capturó. Alguien puede sentarse hoy a meter gastos de junio y
 * seguir teniendo tres semanas sin cubrir: lo que importa es hasta dónde llega
 * su historial.
 */

export interface EstadoAlDia {
	/** Clave para elegir color y tono del mensaje. */
	nivel: 'sin_datos' | 'al_dia' | 'reciente' | 'atrasado' | 'muy_atrasado';
	titulo: string;
	detalle: string;
}

/**
 * @param dias Días transcurridos desde el movimiento más reciente, o `null`
 *             cuando todavía no hay ninguno.
 */
export function estadoAlDia(dias: number | null | undefined): EstadoAlDia {
	if (dias === null || dias === undefined || !Number.isFinite(Number(dias))) {
		return {
			nivel: 'sin_datos',
			titulo: 'Aún no hay movimientos',
			detalle: 'Registra tu primer gasto o ingreso para empezar a llevar la cuenta.'
		};
	}

	const d = Math.max(0, Math.trunc(Number(dias)));

	if (d <= 1) {
		return {
			nivel: 'al_dia',
			titulo: 'Vas al día',
			detalle: d === 0 ? 'Tu último movimiento es de hoy.' : 'Tu último movimiento es de ayer.'
		};
	}

	if (d <= 6) {
		return {
			nivel: 'reciente',
			titulo: `${d} días sin registrar`,
			detalle: 'Nada grave, pero es más fácil ponerse al día ahora que el domingo.'
		};
	}

	if (d <= 29) {
		return {
			nivel: 'atrasado',
			titulo: `${d} días sin registrar`,
			detalle: 'Tus proyecciones se calculan con lo que hay registrado, así que van cortas.'
		};
	}

	const meses = Math.floor(d / 30);

	return {
		nivel: 'muy_atrasado',
		titulo: `${d} días sin registrar`,
		detalle:
			meses >= 2
				? `Llevas más de ${meses} meses sin capturar. Empieza por lo del mes en curso; lo viejo puede esperar.`
				: 'Llevas más de un mes sin capturar. Empieza por lo del mes en curso; lo viejo puede esperar.'
	};
}
