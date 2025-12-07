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
		})
	},
	onwarn: (warning, handler) => {
		// Ignorar warnings de accesibilidad en build de producción
		if (warning.code.startsWith('a11y-')) return;
		handler(warning);
	}
};

export default config;
