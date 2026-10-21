# Configuración con Neon.tech (PostgreSQL Serverless)

Esta guía te ayudará a configurar tu aplicación Control de Gastos con Neon.tech como base de datos.

## ¿Qué es Neon.tech?

Neon es una plataforma de PostgreSQL serverless que ofrece:
- ✅ Base de datos PostgreSQL totalmente administrada
- ✅ Escalado automático
- ✅ Plan gratuito generoso (512 MB de almacenamiento)
- ✅ SSL/TLS por defecto
- ✅ Branching de base de datos para desarrollo
- ✅ Backups automáticos

## Paso 1: Crear cuenta en Neon.tech

1. Ve a [https://neon.tech](https://neon.tech)
2. Haz clic en "Sign Up" o "Get Started"
3. Regístrate con GitHub, Google o email
4. Verifica tu cuenta

## Paso 2: Crear un nuevo proyecto

1. En el dashboard de Neon, haz clic en **"Create Project"**
2. Configura tu proyecto:
   - **Project name**: `control-gastos` (o el nombre que prefieras)
   - **Region**: Selecciona la región más cercana a tus usuarios
     - `US East (Ohio)` - Para usuarios en América
     - `Europe (Frankfurt)` - Para usuarios en Europa
     - `Asia Pacific (Singapore)` - Para usuarios en Asia
   - **PostgreSQL version**: 16 (recomendado) o 15
3. Haz clic en **"Create Project"**

## Paso 3: Obtener la cadena de conexión

Una vez creado el proyecto, Neon te mostrará la cadena de conexión:

```
postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Componentes de la URL:**
- `username`: Tu usuario de Neon (generalmente el nombre del proyecto)
- `password`: Contraseña generada automáticamente
- `ep-cool-darkness-123456.us-east-2.aws.neon.tech`: Host de tu base de datos
- `neondb`: Nombre de la base de datos (puedes cambiarlo)

**IMPORTANTE:** Guarda esta cadena de conexión en un lugar seguro. La necesitarás para configurar tu aplicación.

## Paso 4: Configurar variables de entorno

Tienes **dos opciones** para configurar la conexión:

### Opción A: Usar DATABASE_URL (Recomendado para Neon)

Edita tu archivo `.env`:

```env
# Database - Neon.tech (URL completa)
DATABASE_URL=postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require

# Las siguientes variables NO son necesarias si usas DATABASE_URL
# DATABASE_HOST=
# DATABASE_PORT=
# DATABASE_NAME=
# DATABASE_USER=
# DATABASE_PASSWORD=
# DATABASE_SSL=

# Environment
NODE_ENV=production
APP_URL=https://tu-dominio.com
PORT=5173

# JWT
JWT_SECRET=genera_un_secreto_aleatorio_muy_seguro_aqui

# Cookies
COOKIE_NAME=auth_token
COOKIE_MAX_AGE=14400000
COOKIE_HTTP_ONLY=true
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
COOKIE_PATH=/
COOKIE_DOMAIN=tu-dominio.com
```

### Opción B: Usar configuración individual

Edita tu archivo `.env`:

```env
# Database - Neon.tech (configuración separada)
DATABASE_HOST=ep-cool-darkness-123456.us-east-2.aws.neon.tech
DATABASE_PORT=5432
DATABASE_NAME=neondb
DATABASE_USER=tu_usuario_neon
DATABASE_PASSWORD=tu_password_neon
DATABASE_SSL=true

# No uses DATABASE_URL si usas esta opción
# DATABASE_URL=

# Environment
NODE_ENV=production
APP_URL=https://tu-dominio.com
PORT=5173

# JWT
JWT_SECRET=genera_un_secreto_aleatorio_muy_seguro_aqui

# Cookies
COOKIE_NAME=auth_token
COOKIE_MAX_AGE=14400000
COOKIE_HTTP_ONLY=true
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
COOKIE_PATH=/
COOKIE_DOMAIN=tu-dominio.com
```

## Paso 5: Ejecutar el schema y migraciones

### Opción 1: Desde tu máquina local con psql

Si tienes psql instalado, puedes ejecutar los scripts directamente:

```bash
# Conectar a Neon y ejecutar schema
psql "postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require" -f database/schema.sql

# Ejecutar migraciones (si actualizas desde una versión anterior)
psql "postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require" -f database/migrations/001_dia_corte.sql
psql "postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require" -f database/migrations/002_add_celular.sql
psql "postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require" -f database/migrations/003_clabe_validation.sql
psql "postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require" -f database/migrations/004_fix_msi.sql
psql "postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require" -f database/migrations/005_add_tipo_tarjeta.sql
```

### Opción 2: Desde la consola SQL de Neon (Recomendado)

1. En el dashboard de Neon, ve a tu proyecto
2. Haz clic en **"SQL Editor"** en el menú lateral
3. Copia y pega el contenido de `database/schema.sql`
4. Haz clic en **"Run"**
5. Repite el proceso para cada migración si es necesario

### Opción 3: Usando una herramienta GUI

Puedes usar herramientas como:
- **pgAdmin**: https://www.pgadmin.org/
- **DBeaver**: https://dbeaver.io/
- **TablePlus**: https://tableplus.com/

Configuración de conexión:
- **Host**: `ep-cool-darkness-123456.us-east-2.aws.neon.tech`
- **Port**: `5432`
- **Database**: `neondb`
- **Username**: `tu_usuario_neon`
- **Password**: `tu_password_neon`
- **SSL Mode**: `Require`

## Paso 6: Verificar la conexión

Ejecuta tu aplicación en modo desarrollo:

```bash
pnpm dev
```

Si todo está configurado correctamente, deberías ver en la consola:

```
Consulta ejecutada { text: 'SELECT ...', duration: 50, rows: 0 }
```

## Paso 7: Crear usuario administrador

Conéctate a tu base de datos Neon y ejecuta:

```sql
-- Primero, regístrate en la aplicación normalmente
-- Luego, convierte tu usuario en administrador

UPDATE usuarios
SET es_admin = TRUE
WHERE email = 'tu@email.com';
```

## Consideraciones importantes para Neon.tech

### Límites del plan gratuito

El plan gratuito de Neon incluye:
- **Almacenamiento**: 512 MB
- **Datos compartidos**: 1 proyecto
- **Branches**: 10 por proyecto
- **Compute time**: 100 horas de compute activo por mes
- **Auto-suspend**: La base de datos se suspende después de 5 minutos de inactividad

### Auto-suspend y cold starts

Neon suspende automáticamente tu base de datos después de 5 minutos de inactividad. La primera consulta después de una suspensión puede tardar 1-2 segundos (cold start).

**Solución para reducir cold starts en producción:**
- Considera actualizar al plan Pro ($19/mes) para configuraciones personalizadas
- Implementa un health check que haga ping a la base de datos cada 4 minutos
- Usa Neon's "Always-on compute" (disponible en plan Pro)

### Connection pooling

Neon incluye connection pooling integrado. Puedes usar:

```
# Conexión directa (recomendado para la mayoría de casos)
postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require

# Conexión con pooling (para serverless functions)
postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require&pooler=true
```

### Backups

Neon hace backups automáticos:
- **Point-in-time recovery**: Hasta 7 días en el plan gratuito
- **Branches**: Puedes crear branches de tu base de datos para desarrollo/staging

## Despliegue en producción

### Vercel

Si despliegas en Vercel:

1. Conecta tu repositorio a Vercel
2. En **Settings > Environment Variables**, agrega:
   - `DATABASE_URL`: Tu cadena de conexión de Neon
   - `JWT_SECRET`: Tu secreto JWT
   - Todas las demás variables de `.env`
3. Despliega

### Railway

Si despliegas en Railway:

1. Conecta tu repositorio
2. Agrega las variables de entorno
3. Railway detectará automáticamente tu app de Node.js

### Render

Si despliegas en Render:

1. Crea un nuevo Web Service
2. Conecta tu repositorio
3. Agrega las variables de entorno
4. Build command: `pnpm install && pnpm build`
5. Start command: `node build`

## Monitoreo y mantenimiento

### Dashboard de Neon

Desde el dashboard puedes:
- Ver métricas de uso (CPU, RAM, Storage)
- Monitorear queries lentas
- Crear branches para desarrollo
- Configurar alertas

### Logs de la aplicación

Tu aplicación registra todas las queries en la consola:

```
Consulta ejecutada { text: 'SELECT * FROM usuarios WHERE id_usuario = $1', duration: 25, rows: 1 }
```

### Optimización

Para mejorar el rendimiento:

1. **Índices**: Asegúrate de que las columnas más consultadas tengan índices
2. **Connection pooling**: Ya configurado en `db.ts`
3. **Queries optimizadas**: Usa `EXPLAIN ANALYZE` para analizar queries lentas

## Solución de problemas

### Error: "password authentication failed"

- Verifica que estés usando la contraseña correcta de Neon
- Regenera la contraseña desde el dashboard de Neon si es necesario

### Error: "no pg_hba.conf entry for host"

- Asegúrate de que `DATABASE_SSL=true` o que `sslmode=require` esté en la URL
- Neon requiere SSL para todas las conexiones

### Error: "Connection timeout"

- Verifica que la región de Neon sea accesible desde tu ubicación
- Revisa si hay un firewall bloqueando conexiones salientes al puerto 5432

### La aplicación es lenta después de inactividad

- Es normal en el plan gratuito (auto-suspend)
- Considera el plan Pro para "Always-on compute"
- Implementa un health check para mantener la DB activa

## Recursos adicionales

- **Documentación de Neon**: https://neon.tech/docs
- **Neon Discord**: https://discord.gg/neon
- **Neon Status**: https://neon.tech/status
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

## Soporte

Para soporte técnico de la aplicación:
- Ver README.md

Para soporte de Neon.tech:
- **Docs**: https://neon.tech/docs
- **Discord**: https://discord.gg/neon
- **Support**: https://neon.tech/support
