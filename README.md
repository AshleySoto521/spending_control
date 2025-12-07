# Control de Gastos - Aplicación Web

Aplicación web full-stack para gestión de finanzas personales desarrollada con SvelteKit y PostgreSQL.

## Características Principales

### Gestión Financiera
- ✅ **Dashboard Inteligente** con estadísticas de Business Intelligence
- ✅ **Registro de Ingresos y Egresos** con múltiples formas de pago
- ✅ **Gestión de Tarjetas**: Crédito, Débito, Departamentales y de Servicios
- ✅ **Compras a Meses Sin Intereses (MSI)** con seguimiento de cuotas
- ✅ **Pagos a Tarjetas** con registro histórico
- ✅ **Exportación a Excel** con reportes detallados por periodo

### Autenticación y Seguridad
- ✅ Sistema completo de autenticación (registro, login, logout)
- ✅ Recuperación de contraseña con tokens JWT
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Una sesión activa por usuario
- ✅ Registro de seguridad (logs de acceso)
- ✅ Panel de administración para usuarios admin

### Experiencia de Usuario
- ✅ Diseño responsive (móvil y escritorio)
- ✅ Tema minimalista en escala de grises
- ✅ Navegación intuitiva con Navbar
- ✅ Modales para acciones importantes
- ✅ Validaciones en tiempo real
- ✅ Mensajes de error y éxito claros

## Tecnologías

- **Frontend**: SvelteKit 5 con Runes ($state, $derived, $effect)
- **Styling**: Tailwind CSS v4
- **Backend**: SvelteKit API Routes
- **Base de Datos**: PostgreSQL 14+
- **Autenticación**: JWT + bcrypt
- **Excel Export**: xlsx (v0.18.5)
- **Gestión de Paquetes**: pnpm

## Requisitos Previos

- Node.js 18+
- PostgreSQL 14+
- pnpm (gestor de paquetes)

## Instalación

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar PostgreSQL

Crear la base de datos:

```bash
psql -U postgres
CREATE DATABASE control_gastos;
\q
```

Ejecutar el schema inicial:

```bash
psql -U postgres -d control_gastos -f database/schema.sql
```

### 3. Ejecutar migraciones (si es necesario)

Si actualizas desde una versión anterior, ejecuta las migraciones en orden:

```bash
# Migración 001: Campo dia_corte
psql -U postgres -d control_gastos -f database/migrations/001_dia_corte.sql

# Migración 002: Campo celular en usuarios
psql -U postgres -d control_gastos -f database/migrations/002_add_celular.sql

# Migración 003: Validación de CLABE
psql -U postgres -d control_gastos -f database/migrations/003_clabe_validation.sql

# Migración 004: Corrección de MSI
psql -U postgres -d control_gastos -f database/migrations/004_fix_msi.sql

# Migración 005: Tipo de tarjeta (servicios)
psql -U postgres -d control_gastos -f database/migrations/005_add_tipo_tarjeta.sql
```

### 4. Configurar variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=control_gastos
DATABASE_USER=postgres
DATABASE_PASSWORD=tu_contraseña
DATABASE_SSL=false

# Environment
NODE_ENV=development
APP_URL=http://localhost:5173
PORT=5173

# JWT
JWT_SECRET=tu_secreto_super_seguro_cambiar_en_produccion

# Cookies
COOKIE_NAME=auth_token
COOKIE_MAX_AGE=14400000  # 4 horas en milisegundos
COOKIE_HTTP_ONLY=true
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_PATH=/
COOKIE_DOMAIN=localhost
```

### 5. Ejecutar la aplicación

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:5173`

## Uso

### Primer Acceso

1. Accede a `/register` para crear una cuenta
2. Completa el formulario con:
   - Nombre
   - Email
   - Teléfono
   - Contraseña
3. Inicia sesión con tus credenciales

### Usuario Administrador

Para crear un usuario administrador, edita directamente en la base de datos:

```sql
UPDATE usuarios SET es_admin = TRUE WHERE email = 'tu@email.com';
```

Los administradores tienen acceso a:
- Panel de administración (`/admin`)
- Gestión de usuarios
- Logs de seguridad
- Exportación de usuarios

### Flujo de Trabajo Recomendado

1. **Registrar Tarjetas** (`/tarjetas`)
   - Agrega tus tarjetas de crédito, débito, departamentales o de servicios
   - Configura línea de crédito, día de corte y días de gracia

2. **Registrar Ingresos** (`/ingresos`)
   - Registra tus ingresos con fecha y forma de pago
   - Tipos: Sueldo, Extra, Bonificación, Otros

3. **Registrar Egresos** (`/egresos`)
   - Registra gastos con concepto, establecimiento y monto
   - Opción de MSI para compras a meses sin intereses
   - Diferir primer pago si es necesario

4. **Registrar Pagos a Tarjetas** (`/pagos-tarjetas`)
   - Registra pagos mensuales a tus tarjetas
   - Reduce automáticamente el saldo usado

5. **Revisar Dashboard** (`/dashboard`)
   - Visualiza resumen financiero
   - Próximos pagos de tarjetas
   - Cuotas MSI pendientes
   - Gastos más frecuentes
   - Últimos movimientos

6. **Exportar Reportes**
   - Desde cualquier sección, usa el botón de exportación
   - Selecciona rango de fechas
   - Descarga Excel con múltiples hojas

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/forgot-password` - Solicitar recuperación
- `POST /api/auth/reset-password` - Restablecer contraseña

### Perfil
- `GET /api/perfil` - Obtener datos del perfil
- `PUT /api/perfil` - Actualizar perfil
- `PUT /api/perfil/password` - Cambiar contraseña

### Tarjetas
- `GET /api/tarjetas` - Listar tarjetas
- `GET /api/tarjetas/:id` - Obtener tarjeta específica
- `POST /api/tarjetas` - Crear tarjeta
- `PUT /api/tarjetas/:id` - Actualizar tarjeta
- `DELETE /api/tarjetas/:id` - Desactivar tarjeta (soft delete)

### Ingresos
- `GET /api/ingresos` - Listar ingresos
- `GET /api/ingresos/:id` - Obtener ingreso específico
- `POST /api/ingresos` - Crear ingreso
- `PUT /api/ingresos/:id` - Actualizar ingreso
- `DELETE /api/ingresos/:id` - Eliminar ingreso

### Egresos
- `GET /api/egresos` - Listar egresos
- `GET /api/egresos/:id` - Obtener egreso específico
- `POST /api/egresos` - Crear egreso
- `PUT /api/egresos/:id` - Actualizar egreso
- `DELETE /api/egresos/:id` - Eliminar egreso
- `POST /api/egresos/:id/meses-pagados` - Marcar cuota MSI como pagada

### Pagos de Tarjetas
- `GET /api/pagos-tarjetas` - Listar pagos
- `POST /api/pagos-tarjetas` - Registrar pago

### Dashboard y Reportes
- `GET /api/dashboard` - Estadísticas completas del dashboard
- `GET /api/exportar?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD` - Exportar a Excel

### Administración (solo admins)
- `GET /api/admin/usuarios` - Listar usuarios
- `GET /api/admin/logs` - Ver logs de seguridad
- `DELETE /api/admin/usuarios/:id` - Eliminar usuario
- `GET /api/admin/exportar-usuarios` - Exportar usuarios a Excel

## Estructura del Proyecto

```
Control_gastos/
├── catalogos/                    # CSVs de referencia
├── database/
│   ├── schema.sql               # Schema principal
│   └── migrations/              # Migraciones de base de datos
│       ├── 001_dia_corte.sql
│       ├── 002_add_celular.sql
│       ├── 003_clabe_validation.sql
│       ├── 004_fix_msi.sql
│       └── 005_add_tipo_tarjeta.sql
├── src/
│   ├── lib/
│   │   ├── components/          # Componentes reutilizables
│   │   │   ├── Navbar.svelte
│   │   │   ├── Footer.svelte
│   │   │   ├── ProtectedRoute.svelte
│   │   │   └── ExportModal.svelte
│   │   ├── server/              # Lógica del servidor
│   │   │   ├── db.ts           # Conexión a PostgreSQL
│   │   │   └── middleware.ts   # requireAuth, requireAdmin
│   │   └── stores/              # Stores de Svelte
│   │       └── auth.ts         # Store de autenticación
│   └── routes/
│       ├── api/                 # API endpoints
│       │   ├── auth/
│       │   ├── tarjetas/
│       │   ├── ingresos/
│       │   ├── egresos/
│       │   ├── pagos-tarjetas/
│       │   ├── dashboard/
│       │   ├── exportar/
│       │   ├── perfil/
│       │   └── admin/
│       ├── dashboard/           # Página principal
│       ├── tarjetas/
│       ├── ingresos/
│       ├── egresos/
│       ├── pagos-tarjetas/
│       ├── perfil/
│       ├── admin/
│       ├── login/
│       ├── register/
│       ├── forgot-password/
│       └── reset-password/
├── .env
├── .env.example
├── package.json
├── tailwind.config.js
├── svelte.config.js
└── README.md
```

## Funcionalidades Detalladas

### Tipos de Tarjetas

La aplicación soporta 4 tipos de tarjetas:

1. **CREDITO** - Tarjetas de crédito tradicionales
   - Requiere línea de crédito
   - Día de corte y días de gracia
   - Seguimiento de saldo usado

2. **DEBITO** - Tarjetas de débito
   - Línea de crédito opcional (sobregiro)
   - Vinculadas a cuenta bancaria

3. **DEPARTAMENTAL** - Tarjetas de tiendas departamentales
   - Liverpool, Coppel, Palacio de Hierro, Suburbia, etc.
   - Validación flexible: 13-19 dígitos
   - Línea de crédito según la tienda

4. **SERVICIOS** - Tarjetas de servicios (American Express)
   - Límite de crédito variable determinado por la institución
   - **NO requiere línea de crédito** (se almacena como NULL)
   - Ideal para tarjetas con límite dinámico

**Ejemplo:**
```typescript
// Tarjeta de crédito
{
  num_tarjeta: "4152313812345678",
  nom_tarjeta: "Visa Oro",
  tipo_tarjeta: "CREDITO",
  banco: "BBVA",
  linea_credito: 50000,
  dia_corte: 15,
  dias_gracia: 20
}

// Tarjeta de servicios (American Express)
{
  num_tarjeta: "374245455400126",
  nom_tarjeta: "American Express",
  tipo_tarjeta: "SERVICIOS",
  banco: "American Express",
  linea_credito: null,  // Sin límite fijo
  dia_corte: 5,
  dias_gracia: 25
}
```

### Compras a Meses Sin Intereses (MSI)

Funcionalidad completa para registrar compras con tarjeta a meses sin intereses:

**Características:**
- Selección de meses: 3, 6, 9, 12, 18, 24, 36, 48
- Diferir primer pago: 0-12 meses (mes_inicio_pago)
- Cálculo automático del pago mensual
- Seguimiento de meses pagados
- Badge visual en tabla de egresos
- Vista dedicada en Dashboard

**Ejemplo:**
```typescript
{
  concepto: "Laptop",
  monto: 10000,
  compra_meses: true,
  num_meses: 12,
  mes_inicio_pago: 3,      // Primer pago en 3 meses
  monto_mensual: 833.33,   // Calculado automáticamente
  meses_pagados: 0
}
```

Esta funcionalidad refleja prácticas comerciales comunes en México donde los establecimientos ofrecen promociones como "Compra hoy y empieza a pagar en X meses".

### Dashboard Inteligente

El dashboard proporciona una vista completa de tus finanzas:

**Métricas Principales:**
- Total de Ingresos (solo efectivo y transferencia)
- Total de Egresos (solo efectivo y transferencia)
- Saldo Actual
- Deuda Total en Tarjetas

**Nota:** Los ingresos y egresos realizados con tarjeta NO afectan el saldo actual, ya que representan deuda de tarjeta.

**Secciones:**
- **Próximos Pagos de Tarjetas**: Calculados automáticamente por periodo de corte
- **Próximas Cuotas MSI**: Con estado (al corriente, atrasado, completado)
- **Gastos Más Frecuentes**: Top 5 conceptos con mayor frecuencia
- **Distribución por Forma de Pago**: Visualización de gastos por método
- **Últimos Movimientos**: Historial reciente de ingresos, egresos y pagos

### Exportación a Excel

La funcionalidad de exportación genera archivos Excel con múltiples hojas:

**Hojas incluidas:**
1. **Resumen General**: Todos los movimientos (ingresos y egresos) con totales
2. **Ingresos**: Detalle de ingresos con subtotal
3. **Egresos**: Detalle de egresos con información de tarjetas y MSI
4. **Hoja por Tarjeta**: Una hoja individual para cada tarjeta con gastos

**Datos exportados en Egresos:**
- Fecha, Concepto, Establecimiento
- Monto, Forma de Pago
- Tarjeta utilizada (nombre + banco)
- **Tipo de Tarjeta** (Crédito, Débito, Departamental, Servicios)
- MSI (número de meses)
- Monto Mensual
- Descripción

### Sistema de Seguridad

**Autenticación:**
- JWT con expiración de 4 horas
- Una sesión activa por usuario (invalidación automática de sesiones previas)
- Contraseñas hasheadas con bcrypt (10 rounds)

**Registro de Seguridad:**
- `login_exitoso`: Registro de accesos correctos
- `login_fallido`: Intentos fallidos con detalle
- `logout`: Cierre de sesión
- `sesion_expirada`: Tokens JWT expirados
- IP, User-Agent y timestamp de cada evento

**Validaciones:**
- Queries parametrizadas (prevención de SQL injection)
- Validación de datos en cliente y servidor
- Cookies httpOnly (prevención de XSS)
- Middleware de autenticación y autorización

### Panel de Administración

Los usuarios con rol de administrador tienen acceso a:

**Gestión de Usuarios:**
- Vista completa de usuarios registrados
- Información: nombre, email, teléfono, fecha de registro
- Número de tarjetas por usuario
- Opción de eliminación (con confirmación)
- Exportación de usuarios a Excel

**Logs de Seguridad:**
- Filtrado por tipo de evento
- Vista de eventos recientes
- Información detallada: usuario, IP, timestamp
- Útil para auditoría y detección de problemas

## Cambios Importantes

### Campo `dia_corte` en Tarjetas

El campo de fecha de corte se cambió de `fecha_corte` (texto con formato DD/MM/YYYY) a `dia_corte` (número del 1 al 31) para mayor facilidad de uso.

**Ejemplo:**
- Antes: `fecha_corte: "02/12/2025"`
- Ahora: `dia_corte: 2`

Esto permite:
- Validación más simple (1-31)
- Cálculos automáticos de fechas de corte
- Menor complejidad en el frontend
- Cálculo dinámico de periodos mensuales

### Campo `celular` en Usuarios

Se agregó el campo `celular` a la tabla de usuarios para:
- Información de contacto completa
- Futuras notificaciones SMS
- Recuperación de cuenta adicional

### Validación de CLABE

Se agregó validación estricta para números CLABE:
- Exactamente 18 dígitos numéricos
- Formato estándar bancario mexicano
- Validación en frontend y backend

### Corrección de MSI

Se corrigió el cálculo y seguimiento de compras a meses sin intereses:
- Campo `mes_inicio_pago` para diferir primera cuota
- Cálculo correcto de fecha de próxima cuota
- Vista `v_cuotas_msi` para seguimiento
- Botón para marcar cuotas como pagadas

### Soporte de Tarjetas de Servicios

Se agregó el tipo `SERVICIOS` para tarjetas como American Express:
- Línea de crédito NULL (límite variable)
- Validación en base de datos con CHECK constraint
- Interfaz condicional (no muestra campo de línea de crédito)
- Saldo disponible NULL en lugar de calculado

## Seguridad y Mejores Prácticas

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Autenticación JWT con expiración
- ✅ Cookies httpOnly, secure (en producción)
- ✅ Queries parametrizadas (prevención SQL injection)
- ✅ Validaciones cliente y servidor
- ✅ Middleware de autorización
- ✅ Soft deletes para datos críticos
- ✅ Logs de seguridad para auditoría
- ✅ Una sesión activa por usuario
- ✅ Sanitización de inputs

## Compilación para Producción

```bash
# Build
pnpm build

# Preview
pnpm preview

# En producción, asegúrate de:
# - Cambiar JWT_SECRET a un valor único y seguro
# - Configurar COOKIE_SECURE=true
# - Configurar DATABASE_SSL=true si tu DB lo requiere
# - Usar HTTPS para toda la aplicación
# - Configurar CORS apropiadamente
```

## Soporte Técnico

Para soporte técnico, favor de contactarnos en: **contactoaquastudio@gmail.com**

## Licencia

Proyecto privado - Todos los derechos reservados
