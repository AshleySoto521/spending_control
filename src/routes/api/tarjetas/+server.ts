import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { requireAuth, esRespuestaDeAuth } from '$lib/server/middleware';
import { validarUltimosDigitos, textoLimpio } from '$lib/server/validacion';

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
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
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
		const {
			num_tarjeta,
			nom_tarjeta,
			tipo_tarjeta,
			clabe,
			banco,
			linea_credito,
			dia_corte,
			dias_gracia
		} = await event.request.json();

		// Se normalizan antes de validar: así «BBVA » y «BBVA» dejan de ser dos
		// instituciones distintas en la base.
		const nombreLimpio = textoLimpio(nom_tarjeta, 100);
		const bancoLimpio = textoLimpio(banco, 100);

		// Validaciones. El número de tarjeta ya no es obligatorio: solo hacen
		// falta un nombre para reconocerla y su tipo.
		if (!nombreLimpio || !tipo_tarjeta) {
			return json({ error: 'Nombre y tipo de tarjeta son requeridos' }, { status: 400 });
		}

		// Validar tipo de tarjeta
		const tiposValidos = ['CREDITO', 'DEBITO', 'DEPARTAMENTAL', 'SERVICIOS'];
		if (!tiposValidos.includes(tipo_tarjeta)) {
			return json({ error: 'Tipo de tarjeta no válido' }, { status: 400 });
		}

		// Solo se admiten los últimos dígitos.
		//
		// Se rechaza en vez de recortar en silencio: si llega un número completo
		// significa que algún cliente lo está pidiendo todavía, y conviene que
		// falle de forma visible en lugar de aceptar un dato que no queremos
		// tener. Ver migración 017.
		const ultimosDigitos = validarUltimosDigitos(num_tarjeta);

		if (ultimosDigitos.error) {
			return json({ error: ultimosDigitos.error }, { status: 400 });
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
		const lineaCreditoFinal = tipo_tarjeta === 'servicios' ? null : linea_credito || 0;

		const result = await query(
			`INSERT INTO tarjetas
			(id_usuario, num_tarjeta, nom_tarjeta, tipo_tarjeta, clabe, banco, linea_credito, dia_corte, dias_gracia)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *`,
			[
				userId,
				ultimosDigitos.valor,
				nombreLimpio,
				tipo_tarjeta,
				clabe || null,
				bancoLimpio,
				lineaCreditoFinal,
				dia_corte || null,
				dias_gracia || null
			]
		);

		return json({ success: true, tarjeta: result.rows[0] }, { status: 201 });
	} catch (error) {
		if (esRespuestaDeAuth(error)) {
			return error;
		}
		console.error('Error al crear tarjeta:', error);
		return json({ error: 'Error al crear tarjeta' }, { status: 500 });
	}
};
