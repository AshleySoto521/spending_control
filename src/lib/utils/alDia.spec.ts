import { describe, it, expect } from 'vitest';
import { estadoAlDia } from './alDia';

describe('estadoAlDia', () => {
	it('hoy y ayer cuentan como al día', () => {
		expect(estadoAlDia(0).nivel).toBe('al_dia');
		expect(estadoAlDia(1).nivel).toBe('al_dia');
		expect(estadoAlDia(0).detalle).toContain('hoy');
		expect(estadoAlDia(1).detalle).toContain('ayer');
	});

	it('unos días es un aviso suave', () => {
		expect(estadoAlDia(3).nivel).toBe('reciente');
		expect(estadoAlDia(6).nivel).toBe('reciente');
		expect(estadoAlDia(3).titulo).toBe('3 días sin registrar');
	});

	it('a partir de una semana ya afecta a las proyecciones', () => {
		expect(estadoAlDia(7).nivel).toBe('atrasado');
		expect(estadoAlDia(29).nivel).toBe('atrasado');
		expect(estadoAlDia(14).detalle).toContain('proyecciones');
	});

	it('más de un mes cambia el consejo', () => {
		expect(estadoAlDia(30).nivel).toBe('muy_atrasado');
		expect(estadoAlDia(30).detalle).toContain('mes en curso');
		expect(estadoAlDia(90).detalle).toContain('3 meses');
	});

	it('sin movimientos no regaña', () => {
		const sinDatos = estadoAlDia(null);
		expect(sinDatos.nivel).toBe('sin_datos');
		expect(sinDatos.titulo).toContain('Aún no hay movimientos');
		expect(estadoAlDia(undefined).nivel).toBe('sin_datos');
	});

	it('tolera valores inesperados sin romper el panel', () => {
		expect(estadoAlDia(Number.NaN).nivel).toBe('sin_datos');
		// Un movimiento con fecha futura no debe producir «-3 días».
		expect(estadoAlDia(-3).nivel).toBe('al_dia');
	});
});
