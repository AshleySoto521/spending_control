import { describe, it, expect } from 'vitest';
import { esUuid, idEntero, fechaISO, montoValido, nombreArchivoSeguro } from './validacion';

describe('esUuid', () => {
	it('acepta un UUID v4 como los que genera la base', () => {
		expect(esUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true);
	});

	it('rechaza lo que llegaría en un escaneo o por error del cliente', () => {
		expect(esUuid('1')).toBe(false);
		expect(esUuid("' OR 1=1--")).toBe(false);
		expect(esUuid('')).toBe(false);
		expect(esUuid(undefined)).toBe(false);
		expect(esUuid(42)).toBe(false);
	});
});

describe('idEntero', () => {
	it('acepta identificadores SERIAL válidos', () => {
		expect(idEntero('7')).toBe(7);
		expect(idEntero(7)).toBe(7);
	});

	it('rechaza valores que PostgreSQL convertiría en un error 500', () => {
		expect(idEntero('abc')).toBeNull();
		expect(idEntero('0')).toBeNull();
		expect(idEntero('-3')).toBeNull();
		expect(idEntero('1.5')).toBeNull();
		expect(idEntero(' 4 ')).toBeNull();
		expect(idEntero(null)).toBeNull();
		expect(idEntero('99999999999999999999')).toBeNull();
	});
});

describe('fechaISO', () => {
	it('acepta una fecha real en formato YYYY-MM-DD', () => {
		expect(fechaISO('2026-07-30')).toBe('2026-07-30');
	});

	it('rechaza formatos y fechas inexistentes', () => {
		expect(fechaISO('2026-02-31')).toBeNull();
		expect(fechaISO('30/07/2026')).toBeNull();
		expect(fechaISO('2026-7-3')).toBeNull();
		expect(fechaISO('')).toBeNull();
		expect(fechaISO(null)).toBeNull();
	});
});

describe('nombreArchivoSeguro', () => {
	it('deja pasar un nombre normal', () => {
		expect(nombreArchivoSeguro('reporte_2026-01-01_2026-01-31')).toBe(
			'reporte_2026-01-01_2026-01-31'
		);
	});

	it('neutraliza lo que rompería la cabecera Content-Disposition', () => {
		expect(nombreArchivoSeguro('a"; filename="b')).not.toContain('"');
		expect(nombreArchivoSeguro('con\r\nsalto')).not.toMatch(/[\r\n]/);
		expect(nombreArchivoSeguro('///')).toBe('archivo');
	});
});

describe('montoValido', () => {
	it('acepta importes positivos y los deja en centavos', () => {
		expect(montoValido(150)).toBe(150);
		expect(montoValido(10.555)).toBe(10.56);
		expect(montoValido(0.01)).toBe(0.01);
	});

	it('rechaza lo que falsearía un saldo', () => {
		expect(montoValido(0)).toBeNull();
		expect(montoValido(-500)).toBeNull();
		expect(montoValido(Number.NaN)).toBeNull();
		expect(montoValido(Number.POSITIVE_INFINITY)).toBeNull();
		expect(montoValido('100')).toBeNull();
		expect(montoValido(undefined)).toBeNull();
		expect(montoValido(1e13)).toBeNull();
	});
});
