const CACHE_NAME = 'control-gastos-v1';
const STATIC_ASSETS = [
	'/',
	'/dashboard',
	'/manifest.json',
	'/icons/icon-192x192.png',
	'/icons/icon-512x512.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
	console.log('[SW] Instalando Service Worker...');
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			console.log('[SW] Cacheando archivos estáticos');
			return cache.addAll(STATIC_ASSETS);
		})
	);
	self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
	console.log('[SW] Activando Service Worker...');
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						console.log('[SW] Eliminando cache antigua:', cacheName);
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
	return self.clients.claim();
});

// Estrategia: Network First, fallback a Cache
self.addEventListener('fetch', (event) => {
	// Solo cachear GET requests
	if (event.request.method !== 'GET') {
		return;
	}

	// No cachear requests a /api/
	if (event.request.url.includes('/api/')) {
		return;
	}

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				// Si la respuesta es válida, clonarla y guardarla en cache
				if (response && response.status === 200) {
					const responseClone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseClone);
					});
				}
				return response;
			})
			.catch(() => {
				// Si falla la red, intentar obtener del cache
				return caches.match(event.request).then((cachedResponse) => {
					if (cachedResponse) {
						return cachedResponse;
					}
					// Si no está en cache y es una navegación, devolver página offline
					if (event.request.mode === 'navigate') {
						return caches.match('/');
					}
				});
			})
	);
});
