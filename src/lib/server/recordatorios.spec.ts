import { describe, it, expect, vi } from 'vitest';

// El módulo lee JWT_SECRET de $env/static/private, que solo existe dentro del
// build de SvelteKit; en las pruebas se sustituye por un valor fijo.
vi.mock('$env/static/private', () => ({ JWT_SECRET: 'secreto-de-pruebas-no-usar-en-produccion' }));
vi.mock('./db', () => ({ query: vi.fn() }));

const { tokenDeBaja, tokenDeBajaValido } = await import('./recordatorios');

const USUARIO = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const OTRO = '7c4cb1b8-ad98-4bea-b3eb-650e75ea8ad2';

describe('tokenDeBaja', () => {
	it('es estable: un enlace enviado hace meses sigue funcionando', () => {
		expect(tokenDeBaja(USUARIO)).toBe(tokenDeBaja(USUARIO));
	});

	it('es distinto para cada usuario', () => {
		expect(tokenDeBaja(USUARIO)).not.toBe(tokenDeBaja(OTRO));
	});

	it('no revela el identificador del usuario', () => {
		expect(tokenDeBaja(USUARIO)).not.toContain(USUARIO.slice(0, 8));
	});
});

describe('tokenDeBajaValido', () => {
	it('acepta el token propio del usuario', () => {
		expect(tokenDeBajaValido(USUARIO, tokenDeBaja(USUARIO))).toBe(true);
	});

	it('rechaza el token de otro usuario', () => {
		expect(tokenDeBajaValido(USUARIO, tokenDeBaja(OTRO))).toBe(false);
	});

	it('rechaza tokens manipulados, aunque midan lo mismo', () => {
		const token = tokenDeBaja(USUARIO);
		const alterado = (token[0] === 'a' ? 'b' : 'a') + token.slice(1);

		expect(alterado).toHaveLength(token.length);
		expect(tokenDeBajaValido(USUARIO, alterado)).toBe(false);
	});

	it('rechaza lo que no sea una cadena', () => {
		expect(tokenDeBajaValido(USUARIO, undefined)).toBe(false);
		expect(tokenDeBajaValido(USUARIO, null)).toBe(false);
		expect(tokenDeBajaValido(USUARIO, 123)).toBe(false);
		expect(tokenDeBajaValido(USUARIO, '')).toBe(false);
	});
});
