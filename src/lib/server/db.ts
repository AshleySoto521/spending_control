import pkg from 'pg';
const { Pool } = pkg;
import { env } from '$env/dynamic/private';

function limpiar(valor: string | undefined): string | undefined {
	if (valor === undefined || valor === null) return undefined;
	const limpio = String(valor).split('#')[0].trim();
	return limpio === '' ? undefined : limpio;
}

const databaseUrl = limpiar(env.DATABASE_URL);
const esProduccion = limpiar(env.NODE_ENV) === 'production';
const esDesarrollo = !esProduccion;

/**
 * Escotilla de escape para bases con certificado autofirmado.
 * Solo úsala si sabes que el servidor no presenta un certificado válido;
 * desactiva la verificación y reabre la puerta a ataques MITM.
 */
const sslInseguroPermitido = limpiar(env.DATABASE_SSL_INSECURE) === 'true';

function esLocal(url: string): boolean {
	return /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
}

/**
 * Configuración de TLS.
 *
 * Antes se usaba `rejectUnauthorized: false`, que cifra pero NO verifica la
 * identidad del servidor: un atacante en la red puede interponerse y leer o
 * modificar todo el tráfico, incluidos hashes de contraseña y tokens de sesión.
 * Neon y los proveedores gestionados presentan certificados válidos, así que la
 * verificación debe estar activa.
 */
function construirSsl(): false | { rejectUnauthorized: boolean } {
	if (sslInseguroPermitido) {
		console.warn(
			'[db] DATABASE_SSL_INSECURE=true: la verificación del certificado de PostgreSQL está DESACTIVADA.'
		);
		return { rejectUnauthorized: false };
	}

	if (databaseUrl) {
		// Postgres local no suele tener TLS; cualquier host remoto sí debe verificarse.
		return esLocal(databaseUrl) ? false : { rejectUnauthorized: true };
	}

	return limpiar(env.DATABASE_SSL) === 'true' ? { rejectUnauthorized: true } : false;
}

const opcionesComunes = {
	ssl: construirSsl(),
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000
};

const poolConfig = databaseUrl
	? { connectionString: databaseUrl, ...opcionesComunes }
	: {
			host: limpiar(env.DATABASE_HOST),
			port: Number.parseInt(limpiar(env.DATABASE_PORT) ?? '5432', 10) || 5432,
			database: limpiar(env.DATABASE_NAME),
			user: limpiar(env.DATABASE_USER),
			password: limpiar(env.DATABASE_PASSWORD),
			...opcionesComunes
	  };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
	console.error('Error inesperado en el cliente de PostgreSQL', err.message);
});

export async function query(text: string, params?: any[]) {
	const start = Date.now();

	try {
		const res = await pool.query(text, params);

		// El texto completo de cada consulta solo se registra en desarrollo:
		// en producción expondría el esquema de la base en los logs y generaría
		// un volumen que dificulta detectar un incidente real.
		if (esDesarrollo) {
			const duration = Date.now() - start;
			console.log('Consulta ejecutada', { text, duration, rows: res.rowCount });
		}

		return res;
	} catch (error: any) {
		// Nunca registramos `params`: contienen contraseñas hasheadas y tokens.
		console.error('Error en consulta a la base de datos:', error?.message ?? error);
		throw error;
	}
}

export async function getClient() {
	const client = await pool.connect();
	return client;
}

export default pool;
