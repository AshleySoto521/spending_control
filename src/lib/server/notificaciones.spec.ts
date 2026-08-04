import { describe, it, expect, vi } from 'vitest';

vi.mock('./db', () => ({ query: vi.fn() }));

const { calcularNotificaciones } = await import('./notificaciones');

const f = (iso: string) => new Date(`${iso}T00:00:00Z`);
const USUARIO = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const tarjeta = (extra = {}) => ({
	id_tarjeta: 13,
	id_usuario: USUARIO,
	nom_tarjeta: 'Rewards',
	dia_corte: 15,
	dias_gracia: 20,
	saldo_usado: '2500.00',
	...extra
});

const prestamo = (extra = {}) => ({
	id_prestamo: 4,
	id_usuario: USUARIO,
	institucion: 'Banorte',
	tipo_prestamo: 'PERSONAL',
	dia_pago: 10,
	pago_mensual: '5000.00',
	...extra
});

describe('aviso de corte', () => {
	it('avisa el día anterior al corte', () => {
		const avisos = calcularNotificaciones(f('2026-08-14'), [tarjeta()], []);
		const corte = avisos.find((a) => a.tipo === 'corte_tarjeta');

		expect(corte?.titulo).toBe('Rewards corta mañana');
		expect(corte?.clave).toBe('corte:13:2026-08');
	});

	it('no avisa con dos días de antelación ni el mismo día', () => {
		expect(
			calcularNotificaciones(f('2026-08-13'), [tarjeta()], []).some(
				(a) => a.tipo === 'corte_tarjeta'
			)
		).toBe(false);
		expect(
			calcularNotificaciones(f('2026-08-15'), [tarjeta()], []).some(
				(a) => a.tipo === 'corte_tarjeta'
			)
		).toBe(false);
	});

	it('no avisa si la tarjeta no tiene día de corte', () => {
		const avisos = calcularNotificaciones(f('2026-08-14'), [tarjeta({ dia_corte: null })], []);
		expect(avisos).toHaveLength(0);
	});
});

describe('aviso de pago de tarjeta', () => {
	it('avisa dentro de los tres días previos al vencimiento', () => {
		// Corte el 15 de julio + 20 días de gracia = vence el 4 de agosto.
		const avisos = calcularNotificaciones(f('2026-08-02'), [tarjeta()], []);
		const pago = avisos.find((a) => a.tipo === 'pago_tarjeta');

		expect(pago?.titulo).toBe('Vence el pago de Rewards en 2 días');
		expect(pago?.clave).toBe('pago:13:2026-08-04');
	});

	it('el mismo día del vencimiento dice «hoy»', () => {
		const avisos = calcularNotificaciones(f('2026-08-04'), [tarjeta()], []);
		expect(avisos.find((a) => a.tipo === 'pago_tarjeta')?.titulo).toContain('hoy');
	});

	it('no avisa cuando ya venció', () => {
		expect(
			calcularNotificaciones(f('2026-08-05'), [tarjeta()], []).some(
				(a) => a.tipo === 'pago_tarjeta'
			)
		).toBe(false);
	});

	it('NO avisa si la tarjeta está liquidada', () => {
		// Avisar de un vencimiento sin nada que pagar es ruido, y el ruido
		// enseña a la gente a ignorar los avisos que sí importan.
		const avisos = calcularNotificaciones(f('2026-08-02'), [tarjeta({ saldo_usado: '0' })], []);
		expect(avisos.some((a) => a.tipo === 'pago_tarjeta')).toBe(false);
	});

	it('tampoco avisa con saldo a favor', () => {
		const avisos = calcularNotificaciones(
			f('2026-08-02'),
			[tarjeta({ saldo_usado: '-10000' })],
			[]
		);
		expect(avisos.some((a) => a.tipo === 'pago_tarjeta')).toBe(false);
	});

	it('sin días de gracia no hay aviso de pago', () => {
		const avisos = calcularNotificaciones(f('2026-08-02'), [tarjeta({ dias_gracia: null })], []);
		expect(avisos.some((a) => a.tipo === 'pago_tarjeta')).toBe(false);
	});
});

describe('aviso de préstamo', () => {
	it('avisa en los tres días previos', () => {
		const avisos = calcularNotificaciones(f('2026-08-08'), [], [prestamo()]);
		const aviso = avisos.find((a) => a.tipo === 'pago_prestamo');

		expect(aviso?.titulo).toBe('Vence tu pago de Banorte en 2 días');
		expect(aviso?.clave).toBe('prestamo:4:2026-08');
	});

	it('no avisa con una semana de antelación', () => {
		expect(calcularNotificaciones(f('2026-08-01'), [], [prestamo()])).toHaveLength(0);
	});
});

describe('claves de deduplicación', () => {
	it('el corte usa el mes, así que el mismo aviso no se repite', () => {
		const uno = calcularNotificaciones(f('2026-08-14'), [tarjeta()], []);
		const otro = calcularNotificaciones(f('2026-08-14'), [tarjeta()], []);

		expect(uno[0].clave).toBe(otro[0].clave);
	});

	it('meses distintos generan claves distintas', () => {
		const agosto = calcularNotificaciones(f('2026-08-14'), [tarjeta()], []);
		const septiembre = calcularNotificaciones(f('2026-09-14'), [tarjeta()], []);

		expect(agosto[0].clave).not.toBe(septiembre[0].clave);
	});
});
