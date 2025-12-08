# 📱 Configuración de PWA - Control de Gastos

## ✅ Implementación Completa

Tu aplicación ya está configurada como una Progressive Web App (PWA) y está lista para ser instalada en dispositivos móviles.

---

## 🎨 Paso 1: Generar los Iconos

### Opción A: Usar el Generador Automático (Recomendado)

1. **Abre el archivo** `generate-icons.html` en tu navegador
2. **Haz clic** en "Generar Todos los Iconos"
3. **Descarga** el archivo ZIP con todos los iconos
4. **Extrae** el ZIP y copia la carpeta `icons` a `static/`

### Opción B: Crear los Iconos Manualmente

Si prefieres diseñar tus propios iconos:

1. Crea un diseño de 512x512 píxeles
2. Genera las siguientes versiones:
   - 72x72
   - 96x96
   - 128x128
   - 144x144
   - 152x152
   - 192x192
   - 384x384
   - 512x512

3. Guárdalos en `static/icons/` con el nombre: `icon-{tamaño}x{tamaño}.png`
   - Ejemplo: `icon-192x192.png`

---

## 📂 Estructura de Archivos

```
static/
├── icons/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
├── manifest.json (✅ Ya creado)
└── service-worker.js (✅ Ya creado)
```

---

## 🚀 Cómo Funciona

### En Android (Chrome/Edge):

1. El usuario entra a tu sitio desde el navegador
2. Después de 3 segundos, aparece un banner en la parte inferior
3. El usuario hace clic en "Agregar Ahora"
4. Chrome muestra el diálogo nativo de instalación
5. ¡Listo! El icono aparece en la pantalla de inicio

### En iOS (Safari):

1. El usuario entra a tu sitio desde Safari
2. Después de 5 segundos, aparece un banner
3. El usuario hace clic en "Ver Instrucciones"
4. Se muestran pasos visuales para instalar:
   - Tocar el botón de compartir
   - Seleccionar "Agregar a pantalla de inicio"
   - Tocar "Agregar"
5. ¡Listo! El icono aparece en la pantalla de inicio

---

## 🎨 Personalización

### Cambiar Colores

Edita `static/manifest.json`:

```json
{
  "theme_color": "#1f2937",  // Color de la barra superior
  "background_color": "#ffffff"  // Color de fondo al abrir
}
```

### Cambiar Nombre de la App

Edita `static/manifest.json`:

```json
{
  "name": "Control de Gastos MX",  // Nombre completo
  "short_name": "Control Gastos"   // Nombre corto (máx 12 caracteres)
}
```

### Modificar el Banner de Instalación

Edita `src/lib/components/InstallPrompt.svelte` para cambiar:
- Textos
- Colores
- Tiempos de espera
- Comportamiento

---

## 🧪 Cómo Probar

### En Desarrollo Local:

1. Genera los iconos con `generate-icons.html`
2. Copia la carpeta `icons` a `static/`
3. Inicia el servidor: `pnpm dev`
4. Abre DevTools → Application → Manifest
5. Verifica que todo esté correcto

### En Producción:

1. Deploy a Vercel (o tu hosting)
2. Abre la URL desde tu móvil
3. Espera a que aparezca el banner
4. Prueba la instalación

**Nota:** La PWA solo funciona con HTTPS (excepto localhost).

---

## 📱 Características Implementadas

### ✅ Manifest.json
- Metadatos de la app
- Iconos en todos los tamaños
- Shortcuts (accesos rápidos)
- Screenshots (opcional)

### ✅ Meta Tags
- iOS Safari
- Android Chrome
- Windows

### ✅ Service Worker
- Cache de assets estáticos
- Funcionamiento offline básico
- Actualización automática

### ✅ Install Prompt
- Banner personalizado para Android
- Instrucciones para iOS
- Detección automática del navegador
- No volver a mostrar por 7 días si se descarta

---

## 🔧 Solución de Problemas

### El banner no aparece en Android

**Causas:**
- No tienes HTTPS (en producción)
- Ya instalaste la app anteriormente
- El manifest.json tiene errores
- Faltan iconos

**Solución:**
1. Verifica en DevTools → Application → Manifest
2. Revisa la consola en busca de errores
3. Asegúrate de que todos los iconos existen

### No funciona en iOS

**Recuerda:**
- iOS **no** muestra un banner automático
- El usuario debe hacerlo manualmente desde el menú de compartir
- Nuestra app muestra instrucciones para ayudar

### Service Worker no se actualiza

**Solución:**
1. Incrementa `CACHE_NAME` en `static/service-worker.js`
2. Haz un hard refresh (Ctrl+Shift+R)
3. Ve a DevTools → Application → Service Workers
4. Haz clic en "Unregister" y recarga

---

## 📊 Estadísticas de Uso

Para ver cuántos usuarios han instalado la app:

### Google Analytics (si lo tienes configurado):

```javascript
// Detectar si está instalada
if (window.matchMedia('(display-mode: standalone)').matches) {
  gtag('event', 'pwa_installed');
}
```

### Console simple:

Revisa los logs del Service Worker en la consola del navegador.

---

## 🚀 Próximos Pasos (Opcional)

### 1. Notificaciones Push
Implementar notificaciones para recordar pagos de tarjetas.

### 2. Sincronización en Background
Sincronizar datos cuando el usuario recupere conexión.

### 3. Screenshots
Agregar capturas de pantalla a `manifest.json` para mejor presentación en tiendas.

### 4. Compartir
Implementar Web Share API para compartir gastos.

---

## 📚 Recursos

- [Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [MDN - PWA](https://developer.mozilla.org/es/docs/Web/Progressive_web_apps)
- [PWA Builder](https://www.pwabuilder.com/)

---

## ✅ Checklist Final

Antes de deploy a producción:

- [ ] Iconos generados y copiados a `static/icons/`
- [ ] Manifest.json revisado y personalizado
- [ ] Service Worker testeado
- [ ] Probado en Chrome Android
- [ ] Probado en Safari iOS
- [ ] HTTPS habilitado en producción
- [ ] Meta tags verificados

---

¡Tu app ya está lista para ser instalada como una Progressive Web App! 🎉
