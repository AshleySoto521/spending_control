import pkg from 'pg';
const { Pool } = pkg;
import { env } from '$env/dynamic/private';

// Configuración del pool: soporta DATABASE_URL (Neon.tech) o configuración individual
const poolConfig = env.DATABASE_URL
	? {
			connectionString: env.DATABASE_URL,
			ssl: { rejectUnauthorized: false },
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000
	  }
	: {
			host: env.DATABASE_HOST,
			port: parseInt(env.DATABASE_PORT || '5432'),
			database: env.DATABASE_NAME,
			user: env.DATABASE_USER,
			password: env.DATABASE_PASSWORD,
			ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000
	  };

const pool = new Pool(poolConfig);

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
