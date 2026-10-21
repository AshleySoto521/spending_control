# Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar tu aplicación Control de Gastos en Vercel con Neon.tech como base de datos.

## Prerrequisitos

- ✅ Cuenta en [Vercel](https://vercel.com)
- ✅ Cuenta en [Neon.tech](https://neon.tech) (ya configurada)
- ✅ Repositorio Git (GitHub, GitLab o Bitbucket)
- ✅ Base de datos configurada en Neon (ya hecho)

## Paso 1: Preparar el repositorio

### 1.1 Inicializar Git (si no lo has hecho)

```bash
git init
git add .
git commit -m "Initial commit - Control de Gastos"
```

### 1.2 Crear repositorio en GitHub

1. Ve a [GitHub](https://github.com/new)
2. Crea un nuevo repositorio llamado `control-gastos`
3. **NO** inicialices con README, .gitignore o licencia
4. Copia la URL del repositorio

### 1.3 Subir código a GitHub

```bash
git remote add origin https://github.com/tu-usuario/control-gastos.git
git branch -M main
git push -u origin main
```

## Paso 2: Configurar variables de entorno para producción

Necesitarás las siguientes variables de entorno para Vercel:

```env
# Database
DATABASE_URL=postgresql://tu_usuario:tu_password@ep-xxxxx-xxxxx.region.aws.neon.tech/control_gastos?sslmode=require

# JWT Secret (IMPORTANTE: Genera uno nuevo para producción)
JWT_SECRET=genera_un_nuevo_secreto_aleatorio_super_seguro_aqui

# Cookies
COOKIE_NAME=auth_token
COOKIE_MAX_AGE=14400000
COOKIE_HTTP_ONLY=true
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
COOKIE_PATH=/
COOKIE_DOMAIN=tu-dominio.vercel.app

# Node Environment
NODE_ENV=production

# Email (si usas recuperación de contraseña)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion
EMAIL_FROM=noreply@controlgastos.com
```

### Generar JWT_SECRET seguro

Ejecuta este comando para generar un JWT_SECRET aleatorio:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia el resultado y úsalo como tu `JWT_SECRET` en Vercel.

## Paso 3: Desplegar en Vercel

### Opción A: Desde la web de Vercel (Recomendado)

#### 3.1 Importar proyecto

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Selecciona "Import Git Repository"
3. Autoriza a Vercel para acceder a GitHub (si es la primera vez)
4. Selecciona el repositorio `control-gastos`
5. Haz clic en "Import"

#### 3.2 Configurar el proyecto

En la página de configuración:

- **Framework Preset**: SvelteKit (detectado automáticamente)
- **Root Directory**: `./` (dejar como está)
- **Build Command**: `pnpm build` (ya está en vercel.json)
- **Output Directory**: `.svelte-kit` (automático)
- **Install Command**: `pnpm install` (ya está en vercel.json)

#### 3.3 Agregar variables de entorno

1. Haz clic en "Environment Variables"
2. Agrega **UNA POR UNA** las siguientes variables:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | `postgresql://neondb_owner:...` |
   | `JWT_SECRET` | `tu_secreto_generado` |
   | `COOKIE_NAME` | `auth_token` |
   | `COOKIE_MAX_AGE` | `14400000` |
   | `COOKIE_HTTP_ONLY` | `true` |
   | `COOKIE_SECURE` | `true` |
   | `COOKIE_SAME_SITE` | `lax` |
   | `COOKIE_PATH` | `/` |
   | `COOKIE_DOMAIN` | *(dejar vacío por ahora)* |
   | `NODE_ENV` | `production` |
   | `EMAIL_HOST` | `smtp.gmail.com` |
   | `EMAIL_PORT` | `587` |
   | `EMAIL_USER` | `tu_email@gmail.com` |
   | `EMAIL_PASS` | `tu_contraseña_app` |
   | `EMAIL_FROM` | `noreply@controlgastos.com` |

3. **IMPORTANTE**: Marca todas las variables para los tres ambientes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

#### 3.4 Desplegar

1. Haz clic en **"Deploy"**
2. Espera 2-3 minutos mientras Vercel:
   - Clona tu repositorio
   - Instala dependencias con pnpm
   - Ejecuta el build
   - Despliega la aplicación

#### 3.5 Acceder a tu aplicación

Una vez completado el despliegue:
1. Vercel te mostrará la URL de tu aplicación (ej: `control-gastos.vercel.app`)
2. Haz clic en "Visit" para ver tu aplicación en vivo
3. ¡Tu aplicación ya está en producción! 🎉

### Opción B: Desde la terminal con Vercel CLI

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Login a Vercel
vercel login

# Desplegar
vercel

# Seguir las instrucciones interactivas
# Luego configurar variables de entorno desde el dashboard
```

## Paso 4: Configurar dominio personalizado (Opcional)

### 4.1 Agregar dominio

1. Ve a tu proyecto en Vercel
2. Click en "Settings" → "Domains"
3. Agrega tu dominio personalizado
4. Sigue las instrucciones para configurar DNS

### 4.2 Actualizar COOKIE_DOMAIN

Una vez que tengas tu dominio:
1. Ve a "Settings" → "Environment Variables"
2. Edita `COOKIE_DOMAIN`
3. Cambia de vacío a tu dominio (ej: `miapp.com`)
4. Redespliega: Ve a "Deployments" → "Redeploy"

## Paso 5: Verificar el despliegue

### 5.1 Probar la aplicación

1. Abre tu URL de Vercel
2. Ve a `/register` y crea una cuenta
3. Inicia sesión
4. Prueba las funcionalidades principales:
   - ✅ Registrar tarjeta
   - ✅ Registrar ingreso
   - ✅ Registrar egreso
   - ✅ Ver dashboard
   - ✅ Exportar reporte

### 5.2 Revisar logs

Si algo no funciona:
1. Ve a tu proyecto en Vercel
2. Click en "Deployments" → Selecciona el deployment actual
3. Click en "Functions" para ver logs de las API routes
4. Busca errores en tiempo real

### 5.3 Crear usuario administrador

Desde tu máquina local, ejecuta:

```bash
psql "TU_DATABASE_URL_DE_NEON" -c "UPDATE usuarios SET es_admin = TRUE WHERE email = 'tu@email.com';"
```

O desde el SQL Editor de Neon:

```sql
UPDATE usuarios
SET es_admin = TRUE
WHERE email = 'tu@email.com';
```

## Paso 6: Configuración de despliegues automáticos

Vercel automáticamente:
- ✅ Despliega cada push a `main` → Producción
- ✅ Despliega cada PR → Preview deployment
- ✅ Ejecuta el build en cada deploy
- ✅ Rollback automático si el build falla

### Workflow recomendado

```bash
# Desarrollo local
git checkout -b feature/nueva-funcionalidad
# ... hacer cambios ...
git add .
git commit -m "Add nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# Crear Pull Request en GitHub
# Vercel creará un preview deployment automáticamente

# Una vez aprobado, merge a main
# Vercel desplegará automáticamente a producción
```

## Configuraciones avanzadas

### Aumentar límites de función

Si necesitas más tiempo de ejecución o memoria:

1. Ve a "Settings" → "Functions"
2. Ajusta:
   - **Max Duration**: 10s (Pro: 60s)
   - **Memory**: 1024 MB (Pro: 3008 MB)

### Configurar regiones

El archivo `vercel.json` ya configura la región `iad1` (US East) que está cerca de tu base de datos Neon en US East 1.

Si quieres cambiar la región:
```json
{
  "regions": ["iad1"]  // US East (Virginia) - Mismo que Neon
}
```

### Variables de entorno por ambiente

Si necesitas diferentes valores para Production vs Preview:

1. Ve a "Settings" → "Environment Variables"
2. Edita la variable
3. Desmarca "Preview" o "Production" según necesites
4. Agrega un valor diferente para ese ambiente

## Monitoreo y mantenimiento

### Analytics de Vercel

1. Ve a "Analytics" en tu proyecto
2. Verás:
   - Visitors
   - Page views
   - Top pages
   - Countries
   - Devices

### Logs en tiempo real

```bash
# Con Vercel CLI
vercel logs

# Ver logs de una función específica
vercel logs --follow
```

### Reiniciar base de datos de Neon

Si la DB de Neon se suspende (auto-suspend), la primera petición puede tardar 1-2 segundos. Es normal en el plan gratuito.

## Costos

### Vercel (Plan Hobby - Gratis)
- ✅ 100 GB bandwidth/mes
- ✅ Despliegues ilimitados
- ✅ HTTPS automático
- ✅ Dominios personalizados
- ⚠️ Límite: 10s de ejecución por función

### Neon (Plan Free)
- ✅ 512 MB almacenamiento
- ✅ 100 horas compute/mes
- ⚠️ Auto-suspend después de 5 min

**Total: $0/mes** (ideal para proyectos personales o MVP)

## Actualizar la aplicación

Para actualizar después del despliegue inicial:

```bash
# Hacer cambios en tu código
git add .
git commit -m "Actualización: descripción del cambio"
git push origin main

# Vercel desplegará automáticamente
# Tarda ~2-3 minutos
```

## Troubleshooting

### Error: "Build failed"

1. Revisa los logs de build en Vercel
2. Asegúrate de que `pnpm build` funciona localmente
3. Verifica que todas las dependencias estén en `package.json`

### Error: "Function invocation failed"

1. Ve a "Functions" en el deployment
2. Busca el error específico
3. Verifica que `DATABASE_URL` esté configurada correctamente
4. Verifica que JWT_SECRET esté configurado

### Error: "Database connection failed"

1. Verifica que `DATABASE_URL` tenga el formato correcto
2. Asegúrate de incluir `?sslmode=require`
3. Verifica que la base de datos Neon esté activa
4. Prueba la conexión desde local con la misma URL

### La aplicación está lenta

1. **Primera carga**: Normal si Neon se auto-suspendió (1-2s)
2. **Siempre lenta**: Considera upgrade a Vercel Pro o Neon Pro
3. **Timeout**: Aumenta el límite de función en Vercel

### Cookies no funcionan

1. Verifica que `COOKIE_SECURE=true` en producción
2. Verifica que `COOKIE_DOMAIN` sea correcto (o vacío)
3. Verifica que estés usando HTTPS (Vercel lo hace automáticamente)

## Soporte

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Discord**: https://vercel.com/discord
- **Neon Docs**: https://neon.tech/docs
- **Soporte de la app**: Ver README.md

---

¡Felicidades! Tu aplicación Control de Gastos está ahora en producción en Vercel con Neon.tech 🚀
