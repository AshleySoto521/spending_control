import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			runtime: 'nodejs20.x'
		}),

		// Content-Security-Policy.
		// Se declara aquí (y no en hooks.server.ts) porque SvelteKit necesita
		// añadir el nonce a sus propios scripts de hidratación; en modo 'auto'
		// usa nonce para páginas con SSR y hash para las prerenderizadas.
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				// 'unsafe-inline' se acota a los atributos `style=` (la app usa
				// uno, la barra de progreso de préstamos). Las hojas de estilo
				// como elemento quedan restringidas a 'self', así que una
				// inyección no puede colar un bloque <style> para exfiltrar
				// datos por CSS. En desarrollo SvelteKit vuelve a añadir
				// 'unsafe-inline' por su cuenta para el HMR.
				'style-src': ['self'],
				'style-src-attr': ['unsafe-inline'],
				'img-src': ['self', 'data:'],
				'font-src': ['self', 'data:'],
				'connect-src': ['self'],
				'manifest-src': ['self'],
				'worker-src': ['self'],
				'frame-ancestors': ['none'],
				'form-action': ['self'],
				'base-uri': ['self'],
				'object-src': ['none']
			}
		}
	},
	onwarn: (warning, handler) => {
		// Ignorar warnings de accesibilidad en build de producción
		if (warning.code.startsWith('a11y-')) return;
		handler(warning);
	}
};

export default config;
