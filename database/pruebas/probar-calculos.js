/**
 * Pruebas de los cálculos financieros contra una base de datos real.
 *
 * Por qué contra la base y no con mocks: la aritmética del saldo no vive en
 * TypeScript, vive en los triggers y las vistas de PostgreSQL. Los dos fallos
 * encontrados en la revisión de agosto de 2026 estaban ahí —un trigger que la
 * migración 009 eliminó sin sustituto, y un egreso duplicado— y ninguna prueba
 * unitaria con datos simulados los habría visto, porque el código de la
 * aplicación era correcto: lo que fallaba era la base.
 *
 * Cada ejecución crea una base desechable, le aplica `schema.sql`, ejecuta los
 * casos y la elimina. No toca `control_gastos` en ningún momento.
 *
 *   pnpm test:calculos
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE_PRUEBAS = 'control_gastos_pruebas';

// ---------------------------------------------------------------- utilidades

function leerEnv() {
	const texto = readFileSync(join(raiz, '.env'), 'utf8');
	const config = {};

	for (const linea of texto.split(/\r?\n/)) {
		const igual = linea.indexOf('=');
		if (igual < 1 || linea.trimStart().startsWith('#')) continue;

		const clave = linea.slice(0, igual).trim();
		const valor = linea.slice(igual + 1).split('#')[0].trim();
		if (valor !== '') config[clave] = valor;
	}

	return config;
}

/**
 * Quita los metacomandos de psql del esquema.
 *
 * `schema.sql` empieza con `\c control_gastos`. Si esa línea sobreviviera, el
 * script se aplicaría sobre la base REAL en lugar de sobre la desechable. Por
 * eso se aborta en vez de continuar si queda cualquier rastro.
 */
function prepararEsquema() {
	const lineas = readFileSync(join(raiz, 'database', 'schema.sql'), 'utf8')
		.split(/\r?\n/)
		.filter((l) => !l.trimStart().startsWith('\\') && !/^CREATE DATABASE/i.test(l.trim()));

	const sospechosas = lineas.filter((l) => l.includes('control_gastos'));

	if (sospechosas.length > 0) {
		throw new Error(
			`El esquema preparado todavía menciona control_gastos en ${sospechosas.length} línea(s). ` +
				'Abortando para no tocar la base real.'
		);
	}

	return lineas.join('\n');
}

// ------------------------------------------------------------------- arnés

const casos = [];
let actual = null;

function prueba(nombre, fn) {
	casos.push({ nombre, fn });
}

function esperar(descripcion, obtenido, esperado) {
	const iguales = Number(obtenido).toFixed(2) === Number(esperado).toFixed(2);
	actual.assertions.push({ descripcion, obtenido, esperado, iguales });
	if (!iguales) actual.ok = false;
}

// ------------------------------------------------------------------- casos

/** Crea un usuario y una tarjeta, y devuelve sus identificadores. */
async function escenario(cliente, { limite = 100000 } = {}) {
	const usuario = await cliente.query(
		`INSERT INTO usuarios (nombre, email, celular, password_hash)
		 VALUES ('Prueba', $1, '5555555555', 'x') RETURNING id_usuario`,
		[`prueba-${Math.floor(performance.now() * 1000)}@ejemplo.mx`]
	);
	const idUsuario = usuario.rows[0].id_usuario;

	const tarjeta = await cliente.query(
		`INSERT INTO tarjetas (id_usuario, nom_tarjeta, banco, tipo_tarjeta, linea_credito)
		 VALUES ($1, 'Prueba', 'BBVA', 'CREDITO', $2) RETURNING id_tarjeta`,
		[idUsuario, limite]
	);

	return { idUsuario, idTarjeta: tarjeta.rows[0].id_tarjeta };
}

async function saldo(cliente, idTarjeta) {
	const r = await cliente.query('SELECT saldo_usado FROM tarjetas WHERE id_tarjeta = $1', [
		idTarjeta
	]);
	return Number(r.rows[0].saldo_usado);
}

async function agregarCompra(cliente, idUsuario, idTarjeta, monto) {
	await cliente.query(
		`INSERT INTO egresos (id_usuario, fecha_egreso, concepto, monto, id_forma_pago, id_tarjeta, compra_meses)
		 VALUES ($1, CURRENT_DATE, 'Compra', $2, 1, $3, FALSE)`,
		[idUsuario, monto, idTarjeta]
	);
}

async function agregarMSI(cliente, idUsuario, idTarjeta, monto, meses, pagadas = 0) {
	await cliente.query(
		`INSERT INTO egresos (id_usuario, fecha_egreso, concepto, monto, id_forma_pago, id_tarjeta,
		                      compra_meses, num_meses, monto_mensual, meses_pagados)
		 VALUES ($1, CURRENT_DATE, 'Compra a meses', $2, 1, $3, TRUE, $4, $5, $6)`,
		[idUsuario, monto, idTarjeta, meses, monto / meses, pagadas]
	);
}

async function agregarPago(cliente, idUsuario, idTarjeta, monto) {
	const r = await cliente.query(
		`INSERT INTO pagos_tarjetas (id_usuario, id_tarjeta, fecha_pago, monto, id_forma_pago)
		 VALUES ($1, $2, CURRENT_DATE, $3, 1) RETURNING id_pago`,
		[idUsuario, idTarjeta, monto]
	);
	return r.rows[0].id_pago;
}

prueba('Una compra normal se refleja íntegra en el saldo', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarCompra(cliente, idUsuario, idTarjeta, 1500);

	esperar('saldo tras comprar 1500', await saldo(cliente, idTarjeta), 1500);
});

prueba('Un pago reduce el saldo', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarCompra(cliente, idUsuario, idTarjeta, 1500);
	await agregarPago(cliente, idUsuario, idTarjeta, 500);

	// Este es el caso que estuvo roto entre las migraciones 009 y 014: el pago
	// se registraba pero el saldo se quedaba en 1500.
	esperar('1500 de compras - 500 de pago', await saldo(cliente, idTarjeta), 1000);
});

prueba('Borrar un pago devuelve el saldo a su valor anterior', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarCompra(cliente, idUsuario, idTarjeta, 1500);
	const idPago = await agregarPago(cliente, idUsuario, idTarjeta, 500);

	await cliente.query('DELETE FROM pagos_tarjetas WHERE id_pago = $1', [idPago]);

	esperar('saldo tras deshacer el pago', await saldo(cliente, idTarjeta), 1500);
});

prueba('Editar el importe de un pago recalcula el saldo', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarCompra(cliente, idUsuario, idTarjeta, 1500);
	const idPago = await agregarPago(cliente, idUsuario, idTarjeta, 500);

	await cliente.query('UPDATE pagos_tarjetas SET monto = 900 WHERE id_pago = $1', [idPago]);

	esperar('1500 - 900', await saldo(cliente, idTarjeta), 600);
});

prueba('Mover un pago a otra tarjeta ajusta las dos', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	const segunda = await cliente.query(
		`INSERT INTO tarjetas (id_usuario, nom_tarjeta, banco, tipo_tarjeta, linea_credito)
		 VALUES ($1, 'Segunda', 'BBVA', 'CREDITO', 50000) RETURNING id_tarjeta`,
		[idUsuario]
	);
	const idSegunda = segunda.rows[0].id_tarjeta;

	await agregarCompra(cliente, idUsuario, idTarjeta, 1500);
	await agregarCompra(cliente, idUsuario, idSegunda, 2000);
	const idPago = await agregarPago(cliente, idUsuario, idTarjeta, 500);

	await cliente.query('UPDATE pagos_tarjetas SET id_tarjeta = $1 WHERE id_pago = $2', [
		idSegunda,
		idPago
	]);

	esperar('la que pierde el pago vuelve a 1500', await saldo(cliente, idTarjeta), 1500);
	esperar('la que lo recibe baja a 1500', await saldo(cliente, idSegunda), 1500);
});

prueba('Una compra a meses cuenta solo sus cuotas pendientes', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	// 12000 a 12 meses, tres cuotas ya pagadas: quedan 9 de 1000.
	await agregarMSI(cliente, idUsuario, idTarjeta, 12000, 12, 3);

	esperar('9 cuotas de 1000 pendientes', await saldo(cliente, idTarjeta), 9000);
});

prueba('Una compra a meses recién hecha cuenta completa', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarMSI(cliente, idUsuario, idTarjeta, 12000, 12, 0);

	esperar('12 cuotas de 1000', await saldo(cliente, idTarjeta), 12000);
});

prueba('Una compra a meses liquidada deja de contar', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarMSI(cliente, idUsuario, idTarjeta, 12000, 12, 12);

	esperar('sin cuotas pendientes', await saldo(cliente, idTarjeta), 0);
});

prueba('Avanzar una cuota MSI reduce el saldo en una mensualidad', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarMSI(cliente, idUsuario, idTarjeta, 12000, 12, 3);

	await cliente.query(
		'UPDATE egresos SET meses_pagados = meses_pagados + 1 WHERE id_tarjeta = $1',
		[idTarjeta]
	);

	esperar('de 9000 a 8000', await saldo(cliente, idTarjeta), 8000);
});

prueba('Compras normales y a meses se suman en la misma tarjeta', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarCompra(cliente, idUsuario, idTarjeta, 500);
	await agregarMSI(cliente, idUsuario, idTarjeta, 12000, 12, 3);
	await agregarPago(cliente, idUsuario, idTarjeta, 1000);

	esperar('500 + 9000 - 1000', await saldo(cliente, idTarjeta), 8500);
});

prueba('Un pago sin compras deja saldo a favor, no cero', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarPago(cliente, idUsuario, idTarjeta, 10000);

	// El caso real de dos usuarios: dieron de alta la tarjeta, registraron un
	// abono y no capturaron ninguna compra. La interfaz lo muestra como
	// «Saldo a Favor»; el dato guardado tiene que ser el negativo verdadero.
	esperar('saldo negativo', await saldo(cliente, idTarjeta), -10000);
});

prueba('Los movimientos de una tarjeta no afectan a otra', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	const otra = await cliente.query(
		`INSERT INTO tarjetas (id_usuario, nom_tarjeta, banco, tipo_tarjeta, linea_credito)
		 VALUES ($1, 'Otra', 'BANAMEX', 'CREDITO', 50000) RETURNING id_tarjeta`,
		[idUsuario]
	);

	await agregarCompra(cliente, idUsuario, idTarjeta, 1500);
	await agregarPago(cliente, idUsuario, idTarjeta, 500);

	esperar('la otra tarjeta sigue en cero', await saldo(cliente, otra.rows[0].id_tarjeta), 0);
});

prueba('Borrar un egreso recalcula el saldo', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarCompra(cliente, idUsuario, idTarjeta, 1500);
	await agregarCompra(cliente, idUsuario, idTarjeta, 300);

	await cliente.query('DELETE FROM egresos WHERE id_tarjeta = $1 AND monto = 300', [idTarjeta]);

	esperar('queda solo la compra de 1500', await saldo(cliente, idTarjeta), 1500);
});

prueba('El egreso automático de un pago no infla la deuda de la tarjeta', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	await agregarCompra(cliente, idUsuario, idTarjeta, 1500);
	const idPago = await agregarPago(cliente, idUsuario, idTarjeta, 500);

	// Así lo crea la aplicación: sin `id_tarjeta`, porque no es una compra
	// cargada a la tarjeta sino dinero que sale de la cuenta.
	await cliente.query(
		`INSERT INTO egresos (id_usuario, fecha_egreso, concepto, monto, id_forma_pago,
		                      compra_meses, id_pago_tarjeta_origen)
		 VALUES ($1, CURRENT_DATE, 'Pago de tarjeta - Prueba', 500, 1, FALSE, $2)`,
		[idUsuario, idPago]
	);

	esperar('sigue siendo 1500 - 500', await saldo(cliente, idTarjeta), 1000);
});

prueba('Borrar el pago se lleva su egreso automático', async (cliente) => {
	const { idUsuario, idTarjeta } = await escenario(cliente);
	const idPago = await agregarPago(cliente, idUsuario, idTarjeta, 500);

	await cliente.query(
		`INSERT INTO egresos (id_usuario, fecha_egreso, concepto, monto, id_forma_pago,
		                      compra_meses, id_pago_tarjeta_origen)
		 VALUES ($1, CURRENT_DATE, 'Pago de tarjeta - Prueba', 500, 1, FALSE, $2)`,
		[idUsuario, idPago]
	);

	await cliente.query('DELETE FROM pagos_tarjetas WHERE id_pago = $1', [idPago]);

	const egresos = await cliente.query(
		'SELECT COUNT(*)::int AS total FROM egresos WHERE id_usuario = $1',
		[idUsuario]
	);

	esperar('el egreso huérfano no sobrevive', egresos.rows[0].total, 0);
});

// ------------------------------------------------------------------ ejecución

async function principal() {
	const env = leerEnv();
	const esquema = prepararEsquema();

	const conexionAdmin = {
		host: env.DATABASE_HOST ?? 'localhost',
		port: Number.parseInt(env.DATABASE_PORT ?? '5432', 10),
		user: env.DATABASE_USER ?? 'postgres',
		password: env.DATABASE_PASSWORD,
		database: 'postgres'
	};

	const admin = new pg.Client(conexionAdmin);
	await admin.connect();
	await admin.query(`DROP DATABASE IF EXISTS ${BASE_PRUEBAS}`);
	await admin.query(`CREATE DATABASE ${BASE_PRUEBAS}`);
	await admin.end();

	const cliente = new pg.Client({ ...conexionAdmin, database: BASE_PRUEBAS });
	await cliente.connect();

	let fallos = 0;

	try {
		await cliente.query(esquema);

		for (const caso of casos) {
			actual = { ok: true, assertions: [] };

			// Cada caso corre en su propia transacción y se deshace al terminar:
			// así el orden de los casos nunca puede influir en el resultado.
			await cliente.query('BEGIN');

			try {
				await caso.fn(cliente);
			} catch (error) {
				actual.ok = false;
				actual.assertions.push({ descripcion: `excepción: ${error.message}`, iguales: false });
			}

			await cliente.query('ROLLBACK');

			if (actual.ok) {
				console.log(`  ✓ ${caso.nombre}`);
			} else {
				fallos += 1;
				console.log(`  ✗ ${caso.nombre}`);
				for (const a of actual.assertions.filter((x) => !x.iguales)) {
					const detalle =
						a.esperado === undefined
							? a.descripcion
							: `${a.descripcion}: esperado ${a.esperado}, obtenido ${a.obtenido}`;
					console.log(`      ${detalle}`);
				}
			}
		}
	} finally {
		await cliente.end();

		const limpieza = new pg.Client(conexionAdmin);
		await limpieza.connect();
		await limpieza.query(`DROP DATABASE IF EXISTS ${BASE_PRUEBAS}`);
		await limpieza.end();
	}

	console.log('');
	console.log(`${casos.length - fallos}/${casos.length} casos correctos`);

	if (fallos > 0) process.exit(1);
}

principal().catch((error) => {
	console.error('Error al ejecutar las pruebas:', error.message);
	process.exit(1);
});
