# Changelog

## [1.4.0] - 2025-12-05

### Mejoras en Tarjetas

#### Soporte para Tarjetas Departamentales

**Validación flexible de números de tarjeta**

##### Motivación
Las tarjetas departamentales (Liverpool, Coppel, Elektra, Suburbia, etc.) no siempre siguen el formato estándar de 16 dígitos que usan las tarjetas bancarias (Visa, Mastercard, AMEX). Algunas tienen entre 13-19 dígitos y no comienzan necesariamente con 3, 4 o 5.

##### Cambios Realizados

**Base de Datos:**
- Campo `num_tarjeta` actualizado de `VARCHAR(16)` a `VARCHAR(19)`
- Agregado CHECK constraint: `LENGTH(num_tarjeta) >= 13 AND LENGTH(num_tarjeta) <= 19`
- Comentarios actualizados para indicar soporte de tarjetas departamentales

**Backend:**
- `src/routes/api/tarjetas/+server.ts`
  - Validación actualizada: acepta 13-19 dígitos
  - Validación de solo números con regex
  - Mensaje de error más descriptivo

**Frontend:**
- `src/routes/tarjetas/+page.svelte`
  - Input actualizado: `minlength="13"` `maxlength="19"`
  - Pattern actualizado: `[0-9]{13,19}`
  - Placeholder y textos de ayuda actualizados
  - Labels mejorados: "Banco / Institución"
  - Ejemplos incluyen tarjetas departamentales
  - Corregidas advertencias de accesibilidad (aria-label, for/id)

##### Tarjetas Soportadas

**Bancarias (típicamente 16 dígitos):**
- Visa (inicia con 4)
- Mastercard (inicia con 5)
- American Express (inicia con 3, 15 dígitos)

**Departamentales (13-19 dígitos, varios prefijos):**
- Liverpool
- Palacio de Hierro
- Coppel
- Elektra
- Suburbia
- Sears
- Sanborns
- Famsa
- Otras tiendas departamentales

##### Beneficios

1. **Inclusivo**: Soporta todas las tarjetas del mercado mexicano
2. **Flexible**: Rango amplio de longitudes de tarjeta (13-19)
3. **Sin Discriminación**: No valida prefijos específicos
4. **Accesible**: Formularios con labels correctamente asociados
5. **Intuitivo**: Placeholders y textos de ayuda actualizados

##### Ejemplo de Uso

```typescript
// Tarjeta bancaria tradicional
{
  num_tarjeta: "4152313812345678",  // 16 dígitos (Visa)
  nom_tarjeta: "Visa Oro BBVA",
  banco: "BBVA"
}

// Tarjeta departamental
{
  num_tarjeta: "6279856234567",  // 13 dígitos (Liverpool)
  nom_tarjeta: "Liverpool Premium",
  banco: "Liverpool"
}
```

---

## [1.3.0] - 2025-12-05

### Mejoras en Configuración

#### Refactorización de Variables de Entorno

**Configuración más granular y flexible**

##### Motivación
Se refactorizó la configuración de variables de entorno para tener mayor control y flexibilidad sobre la conexión a la base de datos, cookies de autenticación, y configuración del entorno.

##### Cambios Realizados

**Variables de Base de Datos:**
- Cambio de `DATABASE_URL` (string de conexión) a variables individuales:
  - `DATABASE_HOST`
  - `DATABASE_PORT`
  - `DATABASE_NAME`
  - `DATABASE_USER`
  - `DATABASE_PASSWORD`
  - `DATABASE_SSL`

**Variables de Entorno:**
- `NODE_ENV` - Ambiente de ejecución (development/production)
- `APP_URL` - URL de la aplicación
- `PORT` - Puerto de ejecución

**Variables de Cookies:**
- `COOKIE_NAME` - Nombre de la cookie de autenticación
- `COOKIE_MAX_AGE` - Tiempo de vida en milisegundos
- `COOKIE_HTTP_ONLY` - HttpOnly flag
- `COOKIE_SECURE` - Secure flag
- `COOKIE_SAME_SITE` - SameSite policy (lax/strict/none)
- `COOKIE_PATH` - Path de la cookie
- `COOKIE_DOMAIN` - Dominio de la cookie

##### Archivos Modificados

**Configuración:**
- `.env.example` - Template actualizado con todas las variables organizadas por sección

**Backend:**
- `src/lib/server/db.ts` - Actualizado para usar variables individuales de DB
- `src/lib/server/cookies.ts` (nuevo) - Módulo de configuración centralizada de cookies
- `src/lib/server/middleware.ts` - Usa cookieConfig
- `src/routes/api/auth/login/+server.ts` - Usa getCookieOptions()
- `src/routes/api/auth/register/+server.ts` - Usa getCookieOptions()
- `src/routes/api/auth/logout/+server.ts` - Usa cookieConfig

**Documentación:**
- `README.md` - Actualizado con nueva estructura de variables de entorno

##### Beneficios

1. **Mayor Control**: Configuración individual de cada aspecto de la conexión
2. **Flexibilidad**: Fácil cambio de base de datos sin reconstruir connection string
3. **Seguridad**: Configuración explícita de políticas de cookies
4. **Mantenibilidad**: Configuración centralizada en módulos reutilizables
5. **Ambiente-Aware**: Variables específicas por ambiente (dev/prod)
6. **SSL Configurable**: Soporte para conexiones SSL a base de datos

##### Migración

Para proyectos existentes, actualiza tu archivo `.env`:

**Antes:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/control_gastos
```

**Después:**
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=control_gastos
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_SSL=false
```

---

## [1.2.0] - 2025-12-05

### Nuevas Funcionalidades

#### Compras a Meses Sin Intereses (MSI)

**Funcionalidad de compras a meses con tarjeta de crédito**

##### Motivación
Se agregó la funcionalidad para registrar compras a meses sin intereses, permitiendo diferir el inicio del pago hasta 12 meses. Esta característica es común en establecimientos mexicanos que ofrecen promociones como "Compra hoy y empieza a pagar en 3 meses".

##### Características
- Checkbox para indicar si es una compra a MSI
- Selección de número de meses: 3, 6, 9, 12, 18, 24, 36, 48
- Opción de diferir el primer pago de 0 a 12 meses
- Cálculo automático del monto mensual
- Seguimiento de meses pagados vs meses totales
- Visualización con badge distintivo en la tabla de egresos

##### Archivos Modificados

**Base de Datos:**
- `database/schema.sql`
  - Agregados campos: `compra_meses`, `num_meses`, `mes_inicio_pago`, `monto_mensual`, `meses_pagados`
  - Constraints para validar num_meses (3,6,9,12,18,24,36,48) y mes_inicio_pago (0-12)

**Backend (APIs):**
- `src/routes/api/egresos/+server.ts`
  - GET: retorna campos MSI
  - POST: valida datos MSI y calcula monto_mensual automáticamente
- `src/routes/api/egresos/[id]/+server.ts`
  - PUT: soporta actualización de campos MSI con validación

**Frontend:**
- `src/routes/egresos/+page.svelte`
  - Formulario con sección condicional para MSI (solo visible con pago por tarjeta)
  - Preview de pago mensual en tiempo real
  - Badge "X MSI" en tabla de egresos
  - Muestra monto/mes y progreso de pagos (X/Y pagados)

##### Ejemplo de Uso

**Formulario:**
- Usuario selecciona forma de pago: "tarjeta"
- Marca checkbox "¿Compra a meses sin intereses?"
- Selecciona "12 meses"
- Selecciona "En 3 meses" (diferir primer pago)
- Sistema calcula y muestra: "Pago mensual: $833.33" para compra de $10,000

**Visualización en tabla:**
```
Concepto: Laptop
Monto: $10,000.00
Badge: "12 MSI"
Detalle: $833.33/mes
Progreso: 0/12 pagados
```

##### Beneficios

1. **Gestión financiera mejorada**: Conocer pagos mensuales de compras a meses
2. **Planificación**: Saber cuándo inicia el primer pago
3. **Seguimiento**: Tracking de meses pagados vs pendientes
4. **Realismo**: Refleja prácticas comerciales mexicanas
5. **Flexibilidad**: Soporta tanto MSI como compras de una exhibición

---

## [1.1.0] - 2025-12-05

### Cambios

#### Actualización del Campo de Fecha de Corte en Tarjetas

**Cambio de `fecha_corte` a `dia_corte`**

##### Motivación
Se cambió el campo `fecha_corte` (VARCHAR) por `dia_corte` (INTEGER) para mayor facilidad de uso y simplicidad en el manejo de fechas de corte de tarjetas.

##### Archivos Modificados

**Base de Datos:**
- `database/schema.sql`
  - Cambio de `fecha_corte VARCHAR(20)` a `dia_corte INTEGER CHECK (dia_corte >= 1 AND dia_corte <= 31)`
- `database/migration_001_dia_corte.sql` (nuevo)
  - Script de migración para bases de datos existentes

**Backend (APIs):**
- `src/routes/api/tarjetas/+server.ts`
  - Actualizado GET: retorna `dia_corte` en lugar de `fecha_corte`
  - Actualizado POST: acepta `dia_corte` como INTEGER con validación (1-31)
- `src/routes/api/tarjetas/[id]/+server.ts`
  - Actualizado PUT: usa `dia_corte` en lugar de `fecha_corte`

**Frontend:**
- `src/routes/tarjetas/+page.svelte`
  - Formulario actualizado: campo numérico para día de corte (1-31)
  - Visualización: muestra "Día X" en lugar de fecha completa
  - FormData actualizado con campo `dia_corte`

**Documentación:**
- `README.md` - Documentación actualizada con instrucciones de migración

##### Antes y Después

**Antes:**
```typescript
{
  fecha_corte: "02/12/2025"  // VARCHAR(20)
}
```

**Después:**
```typescript
{
  dia_corte: 2  // INTEGER (1-31)
}
```

##### Beneficios

1. **Validación Simple**: Campo numérico con constraint CHECK (1-31)
2. **Tipo de Dato Correcto**: INTEGER en lugar de VARCHAR
3. **Menor Complejidad**: No se requiere parseo de fechas
4. **Flexibilidad**: Permite calcular fechas de corte dinámicamente
5. **Mejor UX**: Input numérico más intuitivo (1-31)

##### Instrucciones de Migración

**Para nuevas instalaciones:**
```bash
psql -U postgres -d control_gastos -f database/schema.sql
```

**Para bases de datos existentes:**
```bash
psql -U postgres -d control_gastos -f database/migration_001_dia_corte.sql
```

El script de migración:
1. Agrega la columna `dia_corte`
2. Intenta migrar datos existentes de `fecha_corte`
3. Elimina la columna `fecha_corte` antigua

---

## [1.0.0] - 2025-12-05

### Lanzamiento Inicial

- Sistema de autenticación completo (registro, login, recuperación de contraseña)
- Dashboard con Business Intelligence
- Gestión de tarjetas de crédito/débito
- Registro de ingresos y egresos
- API REST completa
- Diseño responsive con TailwindCSS
- Base de datos PostgreSQL con triggers automáticos
