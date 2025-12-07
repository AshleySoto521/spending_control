import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
	return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '4h' });
}

export function verifyToken(token: string): { userId: string } | null {
	try {
		return jwt.verify(token, JWT_SECRET) as { userId: string };
	} catch (error) {
		return null;
	}
}

export function generateResetToken(): string {
	return uuidv4();
}

export function getTokenExpiration(): Date {
	const expiration = new Date();
	expiration.setHours(expiration.getHours() + 1); // Token válido por 1 hora
	return expiration;
}
