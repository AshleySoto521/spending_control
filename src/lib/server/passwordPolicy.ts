/**
 * Política de contraseñas compartida por registro, cambio y recuperación.
 *
 * Nota: solo aplica a contraseñas nuevas. Las contraseñas ya existentes
 * (creadas con el mínimo anterior de 8 caracteres) siguen funcionando al
 * iniciar sesión; el usuario solo verá estos requisitos al cambiarla.
 */

export const LONGITUD_MINIMA = 10;
export const LONGITUD_MAXIMA = 128;

// Contraseñas más habituales en filtraciones, en minúsculas y sin espacios.
const COMUNES = new Set([
	'contrasena', 'contrasena1', 'contraseña', 'password', 'password1', 'password123',
	'passw0rd', 'qwerty', 'qwerty123', 'qwertyuiop', '123456', '1234567', '12345678',
	'123456789', '1234567890', '12345678910', '111111', '000000', '123123', '654321',
	'abc123', 'abcd1234', 'a1b2c3d4', 'iloveyou', 'admin', 'admin123', 'administrador',
	'bienvenido', 'bienvenido1', 'welcome', 'welcome1', 'letmein', 'monkey', 'dragon',
	'football', 'futbol', 'baseball', 'sunshine', 'princess', 'mexico', 'mexico123',
	'america', 'chivas', 'cruzazul', 'pumas', 'tigres', 'monterrey', 'guadalajara',
	'controlgastos', 'controldegastos', 'gastos123', 'mipassword', 'micontrasena',
	'secreto', 'secreto123', 'test1234', 'prueba123', 'usuario', 'usuario123',
	'holamundo', 'holahola', 'asdfghjkl', 'zxcvbnm', '1q2w3e4r', '1qaz2wsx'
]);

export interface ResultadoValidacion {
	valida: boolean;
	error?: string;
}

function normalizar(valor: string): string {
	return valor
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // quita acentos
		.replace(/\s+/g, '');
}

/**
 * Valida una contraseña nueva.
 * `contexto` permite rechazar contraseñas derivadas del email o el nombre.
 */
export function validarPassword(
	password: unknown,
	contexto: { email?: string; nombre?: string } = {}
): ResultadoValidacion {
	if (typeof password !== 'string' || password.length === 0) {
		return { valida: false, error: 'La contraseña es requerida' };
	}

	if (password.length < LONGITUD_MINIMA) {
		return {
			valida: false,
			error: `La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres`
		};
	}

	if (password.length > LONGITUD_MAXIMA) {
		return {
			valida: false,
			error: `La contraseña no puede exceder ${LONGITUD_MAXIMA} caracteres`
		};
	}

	const tieneLetra = /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(password);
	const tieneNumero = /\d/.test(password);

	if (!tieneLetra || !tieneNumero) {
		return {
			valida: false,
			error: 'La contraseña debe incluir al menos una letra y un número'
		};
	}

	const normalizada = normalizar(password);

	if (COMUNES.has(normalizada)) {
		return {
			valida: false,
			error: 'Esa contraseña es demasiado común. Elige una diferente'
		};
	}

	// Un solo carácter repetido, o una secuencia trivial.
	if (/^(.)\1+$/.test(password)) {
		return { valida: false, error: 'La contraseña no puede ser un solo carácter repetido' };
	}

	if (contexto.email) {
		const usuario = normalizar(contexto.email.split('@')[0] ?? '');
		if (usuario.length >= 4 && normalizada.includes(usuario)) {
			return { valida: false, error: 'La contraseña no puede contener tu correo' };
		}
	}

	if (contexto.nombre) {
		const nombre = normalizar(contexto.nombre);
		if (nombre.length >= 4 && normalizada.includes(nombre)) {
			return { valida: false, error: 'La contraseña no puede contener tu nombre' };
		}
	}

	return { valida: true };
}
