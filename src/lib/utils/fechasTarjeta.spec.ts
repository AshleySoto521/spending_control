import { describe, it, expect } from 'vitest';
import {
	proximoCorte,
	ultimoCorte,
	fechaLimitePago,
	diasHasta,
	enCuantosDias
} from './fechasTarjeta';

/** Fecha UTC a partir de 'YYYY-MM-DD', para que las pruebas se lean. */
const f = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('proximoCorte', () => {
	it('si el día aún no llega, es este mes', () => {
		expect(iso(proximoCorte(f('2026-08-03'), 15))).toBe('2026-08-15');
	});

	it('si ya pasó, es el mes siguiente', () => {
		expect(iso(proximoCorte(f('2026-08-20'), 15))).toBe('2026-09-15');
	});

	it('el día del corte cuenta como próximo, no como pasado', () => {
		expect(iso(proximoCorte(f('2026-08-15'), 15))).toBe('2026-08-15');
	});

	it('una tarjeta que corta el 31 corta el último día de los meses cortos', () => {
		// Sin recorte, `new Date(2026, 8, 31)` se desbordaría al 1 de octubre.
		expect(iso(proximoCorte(f('2026-09-15'), 31))).toBe('2026-09-30');
		expect(iso(proximoCorte(f('2026-02-10'), 31))).toBe('2026-02-28');
	});

	it('respeta el 29 de febrero en año bisiesto', () => {
		expect(iso(proximoCorte(f('2028-02-10'), 31))).toBe('2028-02-29');
	});

	it('cruza el cambio de año', () => {
		expect(iso(proximoCorte(f('2026-12-20'), 5))).toBe('2027-01-05');
	});
});

describe('ultimoCorte', () => {
	it('si el día ya pasó este mes, es el de este mes', () => {
		expect(iso(ultimoCorte(f('2026-08-20'), 15))).toBe('2026-08-15');
	});

	it('si aún no llega, es el del mes anterior', () => {
		expect(iso(ultimoCorte(f('2026-08-03'), 15))).toBe('2026-07-15');
	});

	it('cruza el cambio de año hacia atrás', () => {
		expect(iso(ultimoCorte(f('2027-01-03'), 20))).toBe('2026-12-20');
	});

	it('recorta también hacia atrás en meses cortos', () => {
		expect(iso(ultimoCorte(f('2026-03-10'), 31))).toBe('2026-02-28');
	});
});

describe('fechaLimitePago', () => {
	it('suma los días de gracia al corte', () => {
		expect(iso(fechaLimitePago(f('2026-08-15'), 20))).toBe('2026-09-04');
	});

	it('cruza el cambio de año', () => {
		expect(iso(fechaLimitePago(f('2026-12-20'), 20))).toBe('2027-01-09');
	});

	it('sin días de gracia, vence el mismo día del corte', () => {
		expect(iso(fechaLimitePago(f('2026-08-15'), 0))).toBe('2026-08-15');
	});
});

describe('diasHasta', () => {
	it('cuenta días completos hacia adelante', () => {
		expect(diasHasta(f('2026-08-03'), f('2026-08-06'))).toBe(3);
		expect(diasHasta(f('2026-08-03'), f('2026-08-04'))).toBe(1);
		expect(diasHasta(f('2026-08-03'), f('2026-08-03'))).toBe(0);
	});

	it('es negativo si la fecha ya pasó', () => {
		expect(diasHasta(f('2026-08-03'), f('2026-08-01'))).toBe(-2);
	});

	it('no se descuadra al cruzar el cambio de horario', () => {
		// México no aplica horario de verano desde 2022, pero la aritmética no
		// debe depender de eso: al trabajar en UTC, marzo y octubre son iguales.
		expect(diasHasta(f('2026-03-30'), f('2026-04-02'))).toBe(3);
		expect(diasHasta(f('2026-10-24'), f('2026-10-27'))).toBe(3);
	});
});

describe('enCuantosDias', () => {
	it('usa palabras para lo inmediato', () => {
		expect(enCuantosDias(0)).toBe('hoy');
		expect(enCuantosDias(1)).toBe('mañana');
		expect(enCuantosDias(3)).toBe('en 3 días');
	});
});
