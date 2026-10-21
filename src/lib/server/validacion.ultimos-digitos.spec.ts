import { describe, it, expect } from 'vitest';
import { validarUltimosDigitos } from './validacion';

describe('validarUltimosDigitos', () => {
	it('acepta de uno a cuatro dígitos', () => {
		expect(validarUltimosDigitos('1234')).toEqual({ valor: '1234' });
		expect(validarUltimosDigitos('7')).toEqual({ valor: '7' });
		expect(validarUltimosDigitos(' 4321 ')).toEqual({ valor: '4321' });
	});

	it('el campo es opcional', () => {
		expect(validarUltimosDigitos(undefined)).toEqual({ valor: null });
		expect(validarUltimosDigitos(null)).toEqual({ valor: null });
		expect(validarUltimosDigitos('')).toEqual({ valor: null });
		expect(validarUltimosDigitos('   ')).toEqual({ valor: null });
	});

	it('RECHAZA un número completo en lugar de recortarlo en silencio', () => {
		const resultado = validarUltimosDigitos('4111111111111111');

		expect(resultado.valor).toBeNull();
		expect(resultado.error).toContain('últimos 4 dígitos');
	});

	it('rechaza cualquier cosa que no sean dígitos', () => {
		expect(validarUltimosDigitos('12a4').error).toBeDefined();
		expect(validarUltimosDigitos('1 2 3').error).toBeDefined();
		expect(validarUltimosDigitos(1234).error).toBeDefined();
	});
});
