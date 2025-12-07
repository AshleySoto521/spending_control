import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth } from '$lib/server/middleware';

// GET - Obtener todas las tarjetas del usuario
export const GET: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);

		const result = await query(
			`SELECT
				id_tarjeta,
				num_tarjeta,
				nom_tarjeta,
				UPPER(tipo_tarjeta) as tipo_tarjeta,
				clabe,
				banco,
				linea_credito,
				saldo_usado,
				CASE
					WHEN UPPER(tipo_tarjeta) = 'SERVICIOS' THEN NULL
					ELSE (linea_credito - saldo_usado)
				END as saldo_disponible,
				dia_corte,
				dias_gracia,
				fecha_creacion,
				activa
			FROM tarjetas
			WHERE id_usuario = $1
			ORDER BY fecha_creacion DESC`,
			[userId]
		);

		return json({ tarjetas: result.rows });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al obtener tarjetas:', error);
		return json({ error: 'Error al obtener tarjetas' }, { status: 500 });
	}
};

// POST - Crear nueva tarjeta
export const POST: RequestHandler = async (event) => {
	try {
		const userId = await requireAuth(event);
		const { num_tarjeta, nom_tarjeta, tipo_tarjeta, clabe, banco, linea_credito, dia_corte, dias_gracia } =
			await event.request.json();

		// Validaciones
		if (!num_tarjeta || !nom_tarjeta || !tipo_tarjeta) {
			return json({ error: 'Número, nombre y tipo de tarjeta son requeridos' }, { status: 400 });
		}

		// Validar tipo de tarjeta
		const tiposValidos = ['CREDITO', 'DEBITO', 'DEPARTAMENTAL', 'SERVICIOS'];
		if (!tiposValidos.includes(tipo_tarjeta)) {
			return json({ error: 'Tipo de tarjeta no válido' }, { status: 400 });
		}

		// Validar longitud de tarjeta (13-19 dígitos para soportar bancarias y departamentales)
		if (num_tarjeta.length < 13 || num_tarjeta.length > 19) {
			return json(
				{ error: 'El número de tarjeta debe tener entre 13 y 19 dígitos' },
				{ status: 400 }
			);
		}

		// Validar que solo contenga números
		if (!/^\d+$/.test(num_tarjeta)) {
			return json({ error: 'El número de tarjeta debe contener solo dígitos' }, { status: 400 });
		}

		// Validar CLABE si se proporciona (18 dígitos)
		if (clabe) {
			if (!/^\d{18}$/.test(clabe)) {
				return json({ error: 'La CLABE debe contener exactamente 18 dígitos' }, { status: 400 });
			}
		}

		if (dia_corte && (dia_corte < 1 || dia_corte > 31)) {
			return json({ error: 'El día de corte debe estar entre 1 y 31' }, { status: 400 });
		}

		// Para tarjetas de servicios, la línea de crédito es NULL
		const lineaCreditoFinal = tipo_tarjeta === 'servicios' ? null : (linea_credito || 0);

		const result = await query(
			`INSERT INTO tarjetas
			(id_usuario, num_tarjeta, nom_tarjeta, tipo_tarjeta, clabe, banco, linea_credito, dia_corte, dias_gracia)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *`,
			[
				userId,
				num_tarjeta,
				nom_tarjeta,
				tipo_tarjeta,
				clabe || null,
				banco || null,
				lineaCreditoFinal,
				dia_corte || null,
				dias_gracia || null
			]
		);

		return json({ success: true, tarjeta: result.rows[0] }, { status: 201 });
	} catch (error: any) {
		if (error.status === 401) {
			return error;
		}
		console.error('Error al crear tarjeta:', error);
		return json({ error: 'Error al crear tarjeta' }, { status: 500 });
	}
};
