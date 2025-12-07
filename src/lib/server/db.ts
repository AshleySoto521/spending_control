import pkg from 'pg';
const { Pool } = pkg;
import {
	DATABASE_HOST,
	DATABASE_PORT,
	DATABASE_NAME,
	DATABASE_USER,
	DATABASE_PASSWORD,
	DATABASE_SSL
} from '$env/static/private';

const pool = new Pool({
	host: DATABASE_HOST,
	port: parseInt(DATABASE_PORT),
	database: DATABASE_NAME,
	user: DATABASE_USER,
	password: DATABASE_PASSWORD,
	ssl: DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
	console.error('Error inesperado en el cliente de PostgreSQL', err);
});

export async function query(text: string, params?: any[]) {
	const start = Date.now();
	const res = await pool.query(text, params);
	const duration = Date.now() - start;
	console.log('Consulta ejecutada', { text, duration, rows: res.rowCount });
	return res;
}

export async function getClient() {
	const client = await pool.connect();
	return client;
}

export default pool;
