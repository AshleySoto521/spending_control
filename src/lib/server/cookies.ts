import { env } from '$env/dynamic/private';

export const cookieConfig = {
	name: env.COOKIE_NAME || 'auth_token',
	maxAge: parseInt(env.COOKIE_MAX_AGE || '604800000'), // 7 días en milisegundos
	httpOnly: env.COOKIE_HTTP_ONLY === 'true',
	secure: env.COOKIE_SECURE === 'true' || env.NODE_ENV === 'production',
	sameSite: (env.COOKIE_SAME_SITE || 'lax') as 'strict' | 'lax' | 'none',
	path: env.COOKIE_PATH || '/',
	domain: env.COOKIE_DOMAIN && env.COOKIE_DOMAIN !== 'localhost' ? env.COOKIE_DOMAIN : undefined
};

export function getCookieOptions() {
	return {
		path: cookieConfig.path,
		httpOnly: cookieConfig.httpOnly,
		secure: cookieConfig.secure,
		sameSite: cookieConfig.sameSite,
		maxAge: Math.floor(cookieConfig.maxAge / 1000), // convertir a segundos
		...(cookieConfig.domain && { domain: cookieConfig.domain })
	};
}
