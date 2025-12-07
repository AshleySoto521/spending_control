import {
	COOKIE_NAME,
	COOKIE_MAX_AGE,
	COOKIE_HTTP_ONLY,
	COOKIE_SECURE,
	COOKIE_SAME_SITE,
	COOKIE_PATH,
	COOKIE_DOMAIN,
	NODE_ENV
} from '$env/static/private';

export const cookieConfig = {
	name: COOKIE_NAME || 'auth_token',
	maxAge: parseInt(COOKIE_MAX_AGE || '604800000'), // 7 días en milisegundos
	httpOnly: COOKIE_HTTP_ONLY === 'true',
	secure: COOKIE_SECURE === 'true' || NODE_ENV === 'production',
	sameSite: (COOKIE_SAME_SITE || 'lax') as 'strict' | 'lax' | 'none',
	path: COOKIE_PATH || '/',
	domain: COOKIE_DOMAIN !== 'localhost' ? COOKIE_DOMAIN : undefined
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
