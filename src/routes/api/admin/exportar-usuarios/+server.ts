import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAdmin } from '$lib/server/middleware';
import * as XLSX from 'xlsx';

// Función auxiliar para formatear fechas sin conversión de zona horaria
function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('es-MX', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC'
	});
}

export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);

		// Obtener usuarios con información básica
		const result = await query(
			`SELECT
				u.nombre,
				u.email,
				u.celular,
				u.fecha_registro,
				(SELECT COUNT(*) FROM tarjetas WHERE id_usuario = u.id_usuario) as total_tarjetas
			FROM usuarios u
			ORDER BY u.fecha_registro DESC`
		);

		// Formatear datos para Excel
		const usuarios = result.rows.map((usuario) => ({
			Nombre: usuario.nombre,
			Email: usuario.email,
			'Teléfono': usuario.celular,
			'Tarjetas': usuario.total_tarjetas,
			'Miembro desde': formatDate(usuario.fecha_registro)
		}));

		// Crear libro de Excel
		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.json_to_sheet(usuarios);

		// Ajustar ancho de columnas
		const columnWidths = [
			{ wch: 25 }, // Nombre
			{ wch: 30 }, // Email
			{ wch: 15 }, // Teléfono
			{ wch: 10 }, // Tarjetas
			{ wch: 25 }  // Miembro desde
		];
		worksheet['!cols'] = columnWidths;

		XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

		// Generar buffer
		const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

		// Generar nombre de archivo con fecha
		const fecha = new Date().toISOString().split('T')[0];
		const filename = `usuarios_${fecha}.xlsx`;

		return new Response(excelBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (error: any) {
		if (error.status === 401 || error.status === 403) {
			return error;
		}
		console.error('Error al exportar usuarios:', error);
		return json({ error: 'Error al exportar usuarios' }, { status: 500 });
	}
};
