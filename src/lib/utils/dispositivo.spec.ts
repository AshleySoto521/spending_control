import { describe, it, expect } from 'vitest';
import { describirDispositivo } from './dispositivo';

describe('describirDispositivo', () => {
	it('reconoce Chrome en Windows', () => {
		expect(
			describirDispositivo(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			)
		).toBe('Chrome en Windows');
	});

	it('no confunde Edge con Chrome, aunque Edge diga Chrome', () => {
		expect(
			describirDispositivo(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
			)
		).toBe('Edge en Windows');
	});

	it('no confunde Chrome con Safari, aunque Chrome diga Safari', () => {
		expect(
			describirDispositivo(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			)
		).toBe('Chrome en Mac');
	});

	it('reconoce Safari en iPhone, que es el caso de la PWA', () => {
		expect(
			describirDispositivo(
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
			)
		).toBe('Safari en iPhone');
	});

	it('distingue el iPad, que se anuncia como Macintosh', () => {
		expect(
			describirDispositivo(
				'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1'
			)
		).toBe('Safari en iPad');
	});

	it('reconoce Chrome en Android', () => {
		expect(
			describirDispositivo(
				'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
			)
		).toBe('Chrome en Android');
	});

	it('no revienta con valores vacíos o inesperados', () => {
		expect(describirDispositivo('')).toBe('Dispositivo desconocido');
		expect(describirDispositivo(null)).toBe('Dispositivo desconocido');
		expect(describirDispositivo(undefined)).toBe('Dispositivo desconocido');
		expect(describirDispositivo('curl/8.4.0')).toBe('Dispositivo desconocido');
	});
});
