import { describe, it, expect } from 'vitest';
import { textoLimpio } from './validacion';

describe('textoLimpio', () => {
	it('recorta los espacios de los extremos', () => {
		// Casos reales tomados de la base: «BBVA » y «José Díaz ».
		expect(textoLimpio('BBVA ')).toBe('BBVA');
		expect(textoLimpio(' José Díaz ')).toBe('José Díaz');
	});

	it('colapsa los espacios interiores repetidos', () => {
		// «Aránzazu  del Rayo » con doble espacio, también real.
		expect(textoLimpio('Aránzazu  del Rayo ')).toBe('Aránzazu del Rayo');
	});

	it('hace que dos valores que parecían distintos coincidan', () => {
		expect(textoLimpio('BBVA ')).toBe(textoLimpio(' BBVA'));
	});

	it('devuelve null cuando no queda nada', () => {
		expect(textoLimpio('')).toBeNull();
		expect(textoLimpio('   ')).toBeNull();
		expect(textoLimpio(null)).toBeNull();
		expect(textoLimpio(undefined)).toBeNull();
		expect(textoLimpio(42)).toBeNull();
	});

	it('respeta el límite de longitud', () => {
		expect(textoLimpio('a'.repeat(300), 100)).toHaveLength(100);
	});

	it('no toca mayúsculas ni acentos', () => {
		expect(textoLimpio('NU BANK')).toBe('NU BANK');
		expect(textoLimpio('Mercado Pago')).toBe('Mercado Pago');
	});
});
