# Migración: Pagos de Tarjeta a Egresos

## Propósito
Esta migración registra todos los **pagos de tarjeta existentes** en la tabla de egresos para que aparezcan en:
- ✅ Dashboard de egresos
- ✅ Reportes de gastos totales
- ✅ Análisis de flujo de efectivo

## ¿Cuándo ejecutar esto?
**Ejecutar UNA SOLA VEZ** después de actualizar el código que ahora registra automáticamente los pagos como egresos.

## ⚠️ IMPORTANTE
- Este script es **idempotente** - puede ejecutarse varias veces sin duplicar datos
- Solo migrará pagos que **NO estén ya** registrados como egresos
- Preserva las fechas originales de los pagos

---

## Opciones de Ejecución

### Opción 1: Base de Datos LOCAL (PostgreSQL local)

#### Windows (Recomendado)
1. Abre una terminal en la carpeta `database/`
2. Ejecuta:
   ```bash
   ejecutar_migracion_pagos.bat
   ```

#### Manual con psql
```bash
psql -h localhost -U postgres -d control_gastos -f migrations/005_migrate_pagos_tarjetas_to_egresos.sql
```

Reemplaza:
- `localhost` con tu host de PostgreSQL
- `postgres` con tu usuario de PostgreSQL
- `control_gastos` con el nombre de tu base de datos

---

### Opción 2: Base de Datos en NEON (Serverless PostgreSQL)

#### Desde terminal:
```bash
psql "postgresql://usuario:password@ep-xxx.neon.tech/control_gastos?sslmode=require" -f migrations/005_migrate_pagos_tarjetas_to_egresos.sql
```

Reemplaza con tu **DATABASE_URL** del archivo `.env`

#### Desde Neon Console:
1. Ve a tu dashboard de Neon: https://console.neon.tech
2. Selecciona tu proyecto `control_gastos`
3. Ve a **SQL Editor**
4. Copia y pega el contenido de `005_migrate_pagos_tarjetas_to_egresos.sql`
5. Haz clic en **Run**

---

### Opción 3: Desde DBeaver / pgAdmin / TablePlus

1. Abre tu cliente SQL favorito
2. Conéctate a la base de datos `control_gastos`
3. Abre el archivo `migrations/005_migrate_pagos_tarjetas_to_egresos.sql`
4. Ejecuta el script

---

## ¿Qué hace el script?

1. **Lee** todos los pagos de la tabla `pagos_tarjetas`
2. **Verifica** que cada pago tenga su tarjeta asociada
3. **Crea** un egreso por cada pago con:
   - Concepto: `"Pago de tarjeta - [Nombre de la tarjeta]"`
   - Establecimiento: El banco de la tarjeta
   - Monto: El mismo del pago
   - Fecha: La misma del pago
   - Forma de pago: La misma (efectivo/transferencia)
4. **Evita duplicados** verificando que no exista ya un egreso igual

---

## Verificación Post-Migración

Después de ejecutar el script, verifica:

### 1. En la terminal (si usaste psql)
Deberías ver un mensaje como:
```
NOTICE:  Migración completada: 15 pagos de tarjeta registrados como egresos
```

### 2. En la aplicación web
1. Ve a la página de **Egresos**
2. Deberías ver entradas con concepto: `"Pago de tarjeta - [Nombre]"`
3. Las fechas deben coincidir con tus pagos de tarjeta

### 3. Query SQL manual (opcional)
```sql
-- Ver todos los egresos de pagos de tarjeta
SELECT
    fecha_egreso,
    concepto,
    establecimiento,
    monto,
    descripcion
FROM egresos
WHERE concepto LIKE 'Pago de tarjeta -%'
ORDER BY fecha_egreso DESC;

-- Comparar totales
SELECT
    (SELECT COUNT(*) FROM pagos_tarjetas) AS total_pagos,
    (SELECT COUNT(*) FROM egresos WHERE concepto LIKE 'Pago de tarjeta -%') AS total_egresos_migrados;
```

---

## Solución de Problemas

### Error: "relation 'pagos_tarjetas' does not exist"
- La tabla no existe. Verifica que estás conectado a la base de datos correcta.

### Error: "permission denied"
- Tu usuario no tiene permisos. Ejecuta como superusuario o con permisos de INSERT en egresos.

### No se migró ningún registro
- **Posible causa 1**: Ya fueron migrados anteriormente (el script evita duplicados)
- **Posible causa 2**: No hay pagos de tarjeta en la tabla `pagos_tarjetas`
- **Verificar**: `SELECT COUNT(*) FROM pagos_tarjetas;`

### Los números no coinciden
Si el total de pagos ≠ total de egresos migrados:
- Algunos pagos pueden tener tarjetas eliminadas (el JOIN falla)
- Algunos pagos ya estaban duplicados manualmente en egresos

---

## Reversión (si algo sale mal)

Si necesitas deshacer la migración:

```sql
-- CUIDADO: Esto eliminará TODOS los egresos de pagos de tarjeta
DELETE FROM egresos
WHERE concepto LIKE 'Pago de tarjeta -%';
```

**Solo ejecuta esto si:**
- La migración duplicó datos incorrectamente
- Necesitas volver a ejecutar el script con cambios

---

## Soporte

Si tienes problemas:
1. Revisa los logs de PostgreSQL
2. Verifica que todas las tablas existan: `\dt` en psql
3. Verifica datos: `SELECT * FROM pagos_tarjetas LIMIT 5;`
