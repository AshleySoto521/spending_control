import { query } from './db';
import {
	proximoCorte,
	ultimoCorte,
	fechaLimitePago,
	proximoDiaDelMes,
	diasHasta,
	enCuantosDias
} from '$lib/utils/fechasTarjeta';

/**
 * Generación de avisos dentro de la aplicación.
 *
 * Se ejecuta una vez al día desde la tarea programada. Cada aviso lleva una
 * `clave` que lo identifica —«el corte de la tarjeta 13 de agosto de 2026»— y
 * la tabla tiene un índice único sobre ella, así que volver a ejecutar la tarea
 * no duplica nada. Eso permite lanzarla a mano sin miedo.
 */

/** Días de antelación con los que se avisa de cada cosa. */
const AVISO_CORTE_DIAS = 1;
const AVISO_PAGO_DIAS = 3;

export interface NotificacionNueva {
	idUsuario: string;
	tipo: string;
	titulo: string;
	cuerpo: string;
	enlace: string;
	clave: string;
}

/** `YYYY-MM` de una fecha, para componer claves mensuales. */
function periodo(fecha: Date): string {
	return fecha.toISOString().slice(0, 7);
}

function fechaLegible(fecha: Date): string {
	return fecha.toLocaleDateString('es-MX', {
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	});
}

/**
 * Calcula los avisos que corresponden hoy.
 *
 * Está separada de la escritura para poder probarla: recibe las filas y la
 * fecha, y no toca la base.
 */
export function calcularNotificaciones(
	hoy: Date,
	tarjetas: Array<{
		id_tarjeta: number;
		id_usuario: string;
		nom_tarjeta: string;
		dia_corte: number | null;
		dias_gracia: number | null;
		saldo_usado: string | number | null;
	}>,
	prestamos: Array<{
		id_prestamo: number;
		id_usuario: string;
		institucion: string;
		tipo_prestamo: string;
		dia_pago: number;
		pago_mensual: string | number;
	}>
): NotificacionNueva[] {
	const avisos: NotificacionNueva[] = [];

	for (const tarjeta of tarjetas) {
		if (tarjeta.dia_corte) {
			// Aviso de corte. Es el más accionable de todos: sabiendo que corta
			// mañana, una compra de hoy cae en este periodo y una de pasado
			// mañana en el siguiente, con un mes más para pagarla.
			const corte = proximoCorte(hoy, tarjeta.dia_corte);
			const faltan = diasHasta(hoy, corte);

			if (faltan === AVISO_CORTE_DIAS) {
				avisos.push({
					idUsuario: tarjeta.id_usuario,
					tipo: 'corte_tarjeta',
					titulo: `${tarjeta.nom_tarjeta} corta mañana`,
					cuerpo:
						'Lo que compres a partir de pasado mañana entra en el siguiente periodo, ' +
						'así que tendrás un mes más para pagarlo.',
					enlace: '/tarjetas',
					clave: `corte:${tarjeta.id_tarjeta}:${periodo(corte)}`
				});
			}

			// Aviso de pago: los días de gracia después del último corte.
			if (tarjeta.dias_gracia) {
				const limite = fechaLimitePago(ultimoCorte(hoy, tarjeta.dia_corte), tarjeta.dias_gracia);
				const faltanPago = diasHasta(hoy, limite);
				const saldo = Number.parseFloat(String(tarjeta.saldo_usado ?? '0'));

				// Solo si hay algo que pagar. Avisar de un vencimiento con la
				// tarjeta liquidada es ruido, y el ruido enseña a ignorar avisos.
				if (faltanPago >= 0 && faltanPago <= AVISO_PAGO_DIAS && saldo > 0) {
					avisos.push({
						idUsuario: tarjeta.id_usuario,
						tipo: 'pago_tarjeta',
						titulo: `Vence el pago de ${tarjeta.nom_tarjeta} ${enCuantosDias(faltanPago)}`,
						cuerpo: `La fecha límite es el ${fechaLegible(limite)}.`,
						enlace: '/pagos-tarjetas',
						clave: `pago:${tarjeta.id_tarjeta}:${limite.toISOString().slice(0, 10)}`
					});
				}
			}
		}
	}

	for (const prestamo of prestamos) {
		const fecha = proximoDiaDelMes(hoy, prestamo.dia_pago);
		const faltan = diasHasta(hoy, fecha);

		if (faltan >= 0 && faltan <= AVISO_PAGO_DIAS) {
			avisos.push({
				idUsuario: prestamo.id_usuario,
				tipo: 'pago_prestamo',
				titulo: `Vence tu pago de ${prestamo.institucion} ${enCuantosDias(faltan)}`,
				cuerpo: `Préstamo ${prestamo.tipo_prestamo.toLowerCase()}, ${fechaLegible(fecha)}.`,
				enlace: '/prestamos',
				clave: `prestamo:${prestamo.id_prestamo}:${periodo(fecha)}`
			});
		}
	}

	return avisos;
}

/** Genera y guarda los avisos del día. Devuelve cuántos son nuevos. */
export async function generarNotificaciones(hoy = new Date()): Promise<number> {
	const tarjetas = await query(
		`SELECT t.id_tarjeta, t.id_usuario, t.nom_tarjeta, t.dia_corte, t.dias_gracia, t.saldo_usado
		 FROM tarjetas t
		 JOIN usuarios u USING (id_usuario)
		 WHERE t.activa = TRUE AND u.activo = TRUE AND t.dia_corte IS NOT NULL`
	);

	const prestamos = await query(
		`SELECT p.id_prestamo, p.id_usuario, p.institucion, p.tipo_prestamo, p.dia_pago, p.pago_mensual
		 FROM prestamos p
		 JOIN usuarios u USING (id_usuario)
		 WHERE p.activo = TRUE AND u.activo = TRUE`
	);

	const avisos = calcularNotificaciones(hoy, tarjetas.rows, prestamos.rows);

	let nuevos = 0;

	for (const aviso of avisos) {
		// `ON CONFLICT DO NOTHING` sobre el índice único de la clave: si el aviso
		// ya existe, no se toca. Así la tarea es idempotente y se puede lanzar a
		// mano las veces que haga falta.
		const resultado = await query(
			`INSERT INTO notificaciones (id_usuario, tipo, titulo, cuerpo, enlace, clave)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (id_usuario, clave) DO NOTHING
			 RETURNING id_notificacion`,
			[aviso.idUsuario, aviso.tipo, aviso.titulo, aviso.cuerpo, aviso.enlace, aviso.clave]
		);

		nuevos += resultado.rows.length;
	}

	// Las leídas de más de 60 días no aportan nada y la tabla crece a diario.
	await query(
		`DELETE FROM notificaciones
		 WHERE leida = TRUE AND fecha_creacion < NOW() - INTERVAL '60 days'`
	);

	return nuevos;
}

export async function listarNotificaciones(idUsuario: string, limite = 30) {
	const resultado = await query(
		`SELECT id_notificacion, tipo, titulo, cuerpo, enlace, leida, fecha_creacion
		 FROM notificaciones
		 WHERE id_usuario = $1
		 ORDER BY leida ASC, fecha_creacion DESC
		 LIMIT $2`,
		[idUsuario, limite]
	);

	const sinLeer = await query(
		'SELECT COUNT(*)::int AS total FROM notificaciones WHERE id_usuario = $1 AND leida = FALSE',
		[idUsuario]
	);

	return { notificaciones: resultado.rows, sinLeer: sinLeer.rows[0]?.total ?? 0 };
}

/** Marca una notificación como leída, o todas si no se indica cuál. */
export async function marcarLeidas(idUsuario: string, idNotificacion?: number): Promise<number> {
	const resultado = idNotificacion
		? await query(
				`UPDATE notificaciones SET leida = TRUE
				 WHERE id_usuario = $1 AND id_notificacion = $2 AND leida = FALSE
				 RETURNING id_notificacion`,
				[idUsuario, idNotificacion]
			)
		: await query(
				`UPDATE notificaciones SET leida = TRUE
				 WHERE id_usuario = $1 AND leida = FALSE
				 RETURNING id_notificacion`,
				[idUsuario]
			);

	return resultado.rows.length;
}
