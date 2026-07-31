import { describe, it, expect } from 'vitest';
import { presentarSaldo, calcularDisponible } from './saldo';

describe('presentarSaldo', () => {
	it('trata un saldo positivo como deuda', () => {
		expect(presentarSaldo(2500.5)).toEqual({
			etiqueta: 'Saldo Usado',
			monto: 2500.5,
			aFavor: false
		});
	});

	it('convierte el negativo en saldo a favor, sin signo', () => {
		expect(presentarSaldo(-10000)).toEqual({
			etiqueta: 'Saldo a Favor',
			monto: 10000,
			aFavor: true
		});
	});

	it('acepta el texto que devuelve el driver de PostgreSQL para DECIMAL', () => {
		expect(presentarSaldo('-10000.00').aFavor).toBe(true);
		expect(presentarSaldo('594.70').monto).toBe(594.7);
	});

	it('trata el cero como deuda cero, no como saldo a favor', () => {
		expect(presentarSaldo(0).aFavor).toBe(false);
		expect(presentarSaldo('0.00').monto).toBe(0);
	});

	it('no rompe con valores ausentes o basura', () => {
		expect(presentarSaldo(null).monto).toBe(0);
		expect(presentarSaldo(undefined).monto).toBe(0);
		expect(presentarSaldo('abc').monto).toBe(0);
	});
});

describe('calcularDisponible', () => {
	it('resta el saldo usado a la línea de crédito', () => {
		expect(calcularDisponible(50000, 12000)).toBe(38000);
	});

	it('con saldo a favor el disponible supera la línea', () => {
		expect(calcularDisponible(50000, -10000)).toBe(60000);
	});

	it('tolera valores nulos', () => {
		expect(calcularDisponible(null, null)).toBe(0);
		expect(calcularDisponible('50000', '0')).toBe(50000);
	});
});
