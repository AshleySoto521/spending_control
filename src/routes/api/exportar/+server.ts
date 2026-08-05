import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth, esRespuestaDeAuth } from '$lib/server/middleware';
import { fechaISO, nombreArchivoSeguro } from '$lib/server/validacion';
import * as XLSX from 'xlsx';

/** Fila de la consulta de egresos del periodo. */
interface FilaEgreso {
	fecha: string;
	concepto: string;
	establecimiento: string | null;
	monto: string;
	descripcion: string | null;
	compra_meses: boolean;
	num_meses: number | null;
	monto_mensual: string | null;
	forma_pago: string | null;
	nom_tarjeta: string | null;
	banco: string | null;
	tipo_tarjeta: string | null;
}

/** Fila de la consulta de ingresos del periodo. */
interface FilaIngreso {
	fecha: string;
	tipo_ingreso: string;
	monto: string;
	descripcion: string | null;
	forma_pago: string | null;
}

/** Fila de la hoja «Resumen General», con columnas fijas. */
interface FilaResumen {
	Fecha: string;
	Ingreso: number;
	Egreso: number;
	Concepto: string;
	[clave: string]: string | number;
}

/** Fila de una hoja de cálculo: cada celda es texto o número. */
type FilaExcel = Record<string, string | number>;

// Función auxiliar para formatear fechas sin conversión de zona horaria
function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('es-MX', { timeZone: 'UTC' });
}

/**
 * Excel no admite `[ ] : * ? / \` en el nombre de una hoja, ni nombres
 * repetidos, ni más de 31 caracteres. El nombre viene del que la usuaria puso a
 * su tarjeta, así que hay que normalizarlo: con una barra en el nombre, la
 * generación del archivo fallaba con un 500.
 */
function nombreHojaSeguro(base: string, usados: Set<string>): string {
	let nombre =
		(base || 'Tarjeta')
			.replace(/[[\]:*?/\\]/g, '-')
			.trim()
			.slice(0, 31) || 'Tarjeta';

	if (usados.has(nombre.toLowerCase())) {
		let sufijo = 2;
		let candidato = `${nombre.slice(0, 28)} ${sufijo}`;
		while (usados.has(candidato.toLowerCase())) {
			sufijo += 1;
			candidato = `${nombre.slice(0, 28)} ${sufijo}`;
		}
		nombre = candidato;
	}

	usados.add(nombre.toLowerCase());
	return nombre;
}

export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const url = new URL(event.request.url);

		// Las fechas se validan antes de tocar la base o la cabecera de
		// respuesta: sin comprobar, un valor arbitrario llegaba a PostgreSQL
		// como fecha (error 500) y al parámetro `filename` de
		// Content-Disposition, donde unas comillas alteran la cabecera.
		const fechaInicio = fechaISO(url.searchParams.get('fecha_inicio'));
		const fechaFin = fechaISO(url.searchParams.get('fecha_fin'));

		if (!fechaInicio || !fechaFin) {
			return json(
				{ error: 'Fecha de inicio y fin son requeridas con formato YYYY-MM-DD' },
				{ status: 400 }
			);
		}

		if (fechaInicio > fechaFin) {
			return json(
				{ error: 'La fecha de inicio no puede ser posterior a la fecha de fin' },
				{ status: 400 }
			);
		}

		// Obtener todos los egresos del periodo
		const egresosResult = await query(
			`SELECT
				e.fecha_egreso as fecha,
				e.concepto,
				e.establecimiento,
				e.monto,
				e.descripcion,
				e.compra_meses,
				e.num_meses,
				e.monto_mensual,
				fp.tipo as forma_pago,
				t.nom_tarjeta,
				t.banco,
				t.tipo_tarjeta
			FROM egresos e
			LEFT JOIN formas_pago fp ON e.id_forma_pago = fp.id_forma_pago
			LEFT JOIN tarjetas t ON e.id_tarjeta = t.id_tarjeta
			WHERE e.id_usuario = $1
			AND e.fecha_egreso BETWEEN $2 AND $3
			ORDER BY e.fecha_egreso ASC`,
			[userId, fechaInicio, fechaFin]
		);

		// Obtener todos los ingresos del periodo
		const ingresosResult = await query(
			`SELECT
				i.fecha_ingreso as fecha,
				i.tipo_ingreso,
				i.monto,
				i.descripcion,
				fp.tipo as forma_pago
			FROM ingresos i
			LEFT JOIN formas_pago fp ON i.id_forma_pago = fp.id_forma_pago
			WHERE i.id_usuario = $1
			AND i.fecha_ingreso BETWEEN $2 AND $3
			ORDER BY i.fecha_ingreso ASC`,
			[userId, fechaInicio, fechaFin]
		);

		// Obtener tarjetas del usuario
		const tarjetasResult = await query(
			`SELECT
				id_tarjeta,
				nom_tarjeta,
				banco,
				tipo_tarjeta
			FROM tarjetas
			WHERE id_usuario = $1
			ORDER BY nom_tarjeta ASC`,
			[userId]
		);

		// Crear libro de Excel
		const workbook = XLSX.utils.book_new();

		// HOJA 1: Resumen Completo
		const movimientos: FilaResumen[] = [];

		// Agregar ingresos
		ingresosResult.rows.forEach((ingreso: FilaIngreso) => {
			movimientos.push({
				Fecha: formatDate(ingreso.fecha),
				Ingreso: parseFloat(ingreso.monto),
				Egreso: 0,
				Concepto: ingreso.tipo_ingreso,
				Descripción: ingreso.descripcion || '',
				'Forma de Pago': ingreso.forma_pago || ''
			});
		});

		// Agregar egresos
		egresosResult.rows.forEach((egreso: FilaEgreso) => {
			movimientos.push({
				Fecha: formatDate(egreso.fecha),
				Ingreso: 0,
				Egreso: parseFloat(egreso.monto),
				Concepto: egreso.concepto,
				Descripción: egreso.descripcion || '',
				'Forma de Pago': egreso.forma_pago || ''
			});
		});

		// Ordenar por fecha
		movimientos.sort((a, b) => {
			const dateA = new Date(a.Fecha.split('/').reverse().join('-'));
			const dateB = new Date(b.Fecha.split('/').reverse().join('-'));
			return dateA.getTime() - dateB.getTime();
		});

		// Agregar totales
		const totalIngresos = movimientos.reduce((sum, m) => sum + m.Ingreso, 0);
		const totalEgresos = movimientos.reduce((sum, m) => sum + m.Egreso, 0);
		const saldo = totalIngresos - totalEgresos;

		// Las filas de separación y totales llevan texto vacío en columnas
		// numéricas, así que salen del tipo de los datos y van en el arreglo de
		// la hoja, que sí admite ambas cosas.
		const filasResumen: FilaExcel[] = [...movimientos];

		filasResumen.push({
			Fecha: '',
			Ingreso: '',
			Egreso: '',
			Concepto: '',
			Descripción: '',
			'Forma de Pago': ''
		});
		filasResumen.push({
			Fecha: 'TOTALES',
			Ingreso: totalIngresos,
			Egreso: totalEgresos,
			Concepto: 'Saldo',
			Descripción: saldo,
			'Forma de Pago': ''
		});

		const ws1 = XLSX.utils.json_to_sheet(filasResumen);
		XLSX.utils.book_append_sheet(workbook, ws1, 'Resumen General');

		// HOJA 2: Resumen de Ingresos
		// El tipo es explícito porque a estas filas se les añaden después una
		// línea en blanco y una de totales, donde las columnas numéricas llevan
		// texto vacío. Sin la anotación, TypeScript deduce `Monto: number` de la
		// primera fila y rechaza esos añadidos.
		const ingresosData: FilaExcel[] = ingresosResult.rows.map((ingreso: FilaIngreso) => ({
			Fecha: formatDate(ingreso.fecha),
			Tipo: ingreso.tipo_ingreso,
			Monto: parseFloat(ingreso.monto),
			'Forma de Pago': ingreso.forma_pago || '',
			Descripción: ingreso.descripcion || ''
		}));

		ingresosData.push({
			Fecha: '',
			Tipo: '',
			Monto: '',
			'Forma de Pago': '',
			Descripción: ''
		});
		ingresosData.push({
			Fecha: 'TOTAL',
			Tipo: '',
			Monto: totalIngresos,
			'Forma de Pago': '',
			Descripción: ''
		});

		const ws2 = XLSX.utils.json_to_sheet(ingresosData);
		XLSX.utils.book_append_sheet(workbook, ws2, 'Ingresos');

		// HOJA 3: Resumen de Egresos
		const egresosData: FilaExcel[] = egresosResult.rows.map((egreso: FilaEgreso) => {
			let tipoTarjeta = '';
			if (egreso.tipo_tarjeta) {
				const tipos: Record<string, string> = {
					CREDITO: 'Crédito',
					DEBITO: 'Débito',
					DEPARTAMENTAL: 'Departamental',
					SERVICIOS: 'Servicios',
					// Soportar minúsculas por si acaso
					credito: 'Crédito',
					debito: 'Débito',
					departamental: 'Departamental',
					servicios: 'Servicios'
				};
				tipoTarjeta = tipos[egreso.tipo_tarjeta] || '';
			}

			return {
				Fecha: formatDate(egreso.fecha),
				Concepto: egreso.concepto,
				Establecimiento: egreso.establecimiento || '',
				Monto: parseFloat(egreso.monto),
				'Forma de Pago': egreso.forma_pago || '',
				Tarjeta: egreso.nom_tarjeta
					? `${egreso.nom_tarjeta}${egreso.banco ? ' - ' + egreso.banco : ''}`
					: '',
				'Tipo Tarjeta': tipoTarjeta,
				MSI: egreso.compra_meses ? `${egreso.num_meses} meses` : '',
				'Monto Mensual': egreso.monto_mensual ? parseFloat(egreso.monto_mensual) : '',
				Descripción: egreso.descripcion || ''
			};
		});

		egresosData.push({
			Fecha: '',
			Concepto: '',
			Establecimiento: '',
			Monto: '',
			'Forma de Pago': '',
			Tarjeta: '',
			'Tipo Tarjeta': '',
			MSI: '',
			'Monto Mensual': '',
			Descripción: ''
		});
		egresosData.push({
			Fecha: 'TOTAL',
			Concepto: '',
			Establecimiento: '',
			Monto: totalEgresos,
			'Forma de Pago': '',
			Tarjeta: '',
			'Tipo Tarjeta': '',
			MSI: '',
			'Monto Mensual': '',
			Descripción: ''
		});

		const ws3 = XLSX.utils.json_to_sheet(egresosData);
		XLSX.utils.book_append_sheet(workbook, ws3, 'Egresos');

		// HOJAS ADICIONALES: Una por cada tarjeta
		const nombresUsados = new Set(['resumen general', 'ingresos', 'egresos']);

		for (const tarjeta of tarjetasResult.rows) {
			const egresosTarjeta = egresosResult.rows.filter(
				(e: FilaEgreso) => e.nom_tarjeta === tarjeta.nom_tarjeta
			);

			if (egresosTarjeta.length > 0) {
				const tarjetaData: FilaExcel[] = egresosTarjeta.map((egreso: FilaEgreso) => ({
					Fecha: formatDate(egreso.fecha),
					Concepto: egreso.concepto,
					Establecimiento: egreso.establecimiento || '',
					Monto: parseFloat(egreso.monto),
					MSI: egreso.compra_meses ? `${egreso.num_meses} meses` : 'No',
					'Monto Mensual': egreso.monto_mensual ? parseFloat(egreso.monto_mensual) : '',
					Descripción: egreso.descripcion || ''
				}));

				const totalTarjeta = tarjetaData.reduce(
					(sum, e) => sum + (typeof e.Monto === 'number' ? e.Monto : 0),
					0
				);

				tarjetaData.push({
					Fecha: '',
					Concepto: '',
					Establecimiento: '',
					Monto: '',
					MSI: '',
					'Monto Mensual': '',
					Descripción: ''
				});
				tarjetaData.push({
					Fecha: 'TOTAL',
					Concepto: '',
					Establecimiento: '',
					Monto: totalTarjeta,
					MSI: '',
					'Monto Mensual': '',
					Descripción: ''
				});

				const wsTarjeta = XLSX.utils.json_to_sheet(tarjetaData);
				const sheetName = nombreHojaSeguro(`${tarjeta.nom_tarjeta}`, nombresUsados);
				XLSX.utils.book_append_sheet(workbook, wsTarjeta, sheetName);
			}
		}

		// Convertir a buffer
		const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

		// Retornar el archivo
		const nombreArchivo = nombreArchivoSeguro(`reporte_${fechaInicio}_${fechaFin}`, 'reporte');

		return new Response(excelBuffer, {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${nombreArchivo}.xlsx"`
			}
		});
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
			return error;
		}
		console.error('Error al generar reporte:', error);
		return json({ error: 'Error al generar reporte' }, { status: 500 });
	}
};
