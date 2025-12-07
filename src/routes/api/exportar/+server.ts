import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';
import * as XLSX from 'xlsx';

export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const url = new URL(event.request.url);
		const fechaInicio = url.searchParams.get('fecha_inicio');
		const fechaFin = url.searchParams.get('fecha_fin');

		if (!fechaInicio || !fechaFin) {
			return json({ error: 'Fecha de inicio y fin son requeridas' }, { status: 400 });
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
		const movimientos: any[] = [];

		// Agregar ingresos
		ingresosResult.rows.forEach((ingreso: any) => {
			movimientos.push({
				Fecha: new Date(ingreso.fecha).toLocaleDateString('es-MX'),
				Ingreso: parseFloat(ingreso.monto),
				Egreso: 0,
				Concepto: ingreso.tipo_ingreso,
				Descripción: ingreso.descripcion || '',
				'Forma de Pago': ingreso.forma_pago || ''
			});
		});

		// Agregar egresos
		egresosResult.rows.forEach((egreso: any) => {
			movimientos.push({
				Fecha: new Date(egreso.fecha).toLocaleDateString('es-MX'),
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

		movimientos.push({
			Fecha: '',
			Ingreso: '',
			Egreso: '',
			Concepto: '',
			Descripción: '',
			'Forma de Pago': ''
		});
		movimientos.push({
			Fecha: 'TOTALES',
			Ingreso: totalIngresos,
			Egreso: totalEgresos,
			Concepto: 'Saldo',
			Descripción: saldo,
			'Forma de Pago': ''
		});

		const ws1 = XLSX.utils.json_to_sheet(movimientos);
		XLSX.utils.book_append_sheet(workbook, ws1, 'Resumen General');

		// HOJA 2: Resumen de Ingresos
		const ingresosData = ingresosResult.rows.map((ingreso: any) => ({
			Fecha: new Date(ingreso.fecha).toLocaleDateString('es-MX'),
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
		const egresosData = egresosResult.rows.map((egreso: any) => {
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
				Fecha: new Date(egreso.fecha).toLocaleDateString('es-MX'),
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
		for (const tarjeta of tarjetasResult.rows) {
			const egresosTarjeta = egresosResult.rows.filter(
				(e: any) => e.nom_tarjeta === tarjeta.nom_tarjeta
			);

			if (egresosTarjeta.length > 0) {
				const tarjetaData = egresosTarjeta.map((egreso: any) => ({
					Fecha: new Date(egreso.fecha).toLocaleDateString('es-MX'),
					Concepto: egreso.concepto,
					Establecimiento: egreso.establecimiento || '',
					Monto: parseFloat(egreso.monto),
					MSI: egreso.compra_meses ? `${egreso.num_meses} meses` : 'No',
					'Monto Mensual': egreso.monto_mensual ? parseFloat(egreso.monto_mensual) : '',
					Descripción: egreso.descripcion || ''
				}));

				const totalTarjeta = tarjetaData.reduce((sum, e) => sum + (e.Monto || 0), 0);

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
				const sheetName = `${tarjeta.nom_tarjeta}`.substring(0, 31); // Excel limita a 31 caracteres
				XLSX.utils.book_append_sheet(workbook, wsTarjeta, sheetName);
			}
		}

		// Convertir a buffer
		const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

		// Retornar el archivo
		return new Response(excelBuffer, {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="reporte_${fechaInicio}_${fechaFin}.xlsx"`
			}
		});
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al generar reporte:', error);
		return json({ error: 'Error al generar reporte' }, { status: 500 });
	}
};
