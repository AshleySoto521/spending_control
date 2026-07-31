import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';
import { randomBytes } from 'node:crypto';

const SALT_ROUNDS = 10;

/**
 * Algoritmo fijado explícitamente.
 *
 * `jwt.verify(token, secreto)` sin `algorithms` acepta cualquier algoritmo que
 * el propio token declare en su cabecera. jsonwebtoken 9 ya rechaza `alg: none`
 * y la confusión HMAC/RSA, pero fijarlo aquí deja de depender de ese detalle de
 * la librería: solo se firma y solo se acepta HS256.
 */
const ALGORITMO = 'HS256' as const;

export async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
	return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '4h', algorithm: ALGORITMO });
}

export function verifyToken(token: string): { userId: string } | null {
	try {
		const payload = jwt.verify(token, JWT_SECRET, { algorithms: [ALGORITMO] });

		// Un token válido pero sin `userId` (o con un tipo inesperado) no sirve
		// para identificar a nadie: se trata como inválido.
		if (typeof payload === 'string' || typeof payload.userId !== 'string') return null;

		return { userId: payload.userId };
	} catch {
		return null;
	}
}

/**
 * Token de recuperación de contraseña: 256 bits de aleatoriedad criptográfica.
 *
 * Antes se usaba `uuidv4()`, que solo aporta 122 bits y depende de un paquete
 * externo. `randomBytes` viene de Node y no añade dependencias.
 */
export function generateResetToken(): string {
	return randomBytes(32).toString('hex');
}

export function getTokenExpiration(): Date {
	// Usar UTC para evitar problemas de zona horaria con la base de datos
	const expiration = new Date();
	expiration.setTime(expiration.getTime() + 60 * 60 * 1000); // 1 hora en milisegundos
	return expiration;
}
