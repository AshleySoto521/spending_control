# Migraciones de Base de Datos

Este directorio contiene las migraciones para actualizar el esquema de la base de datos.

## Cómo aplicar migraciones

### Usando psql (línea de comandos)

```bash
psql -U tu_usuario -d control_gastos -f 001_add_pagos_tarjetas.sql
```

### Usando pgAdmin

1. Abre pgAdmin
2. Conecta a tu base de datos `control_gastos`
3. Abre el Query Tool
4. Abre el archivo de migración
5. Ejecuta el script

## Migraciones disponibles

### 001_add_pagos_tarjetas.sql

**Fecha:** 2025-12-06

**Descripción:** Agrega funcionalidad para registrar pagos a tarjetas de crédito/débito.

**Cambios:**
- Crea tabla `pagos_tarjetas` para registrar pagos
- Agrega índices para mejorar el rendimiento
- Crea función `actualizar_saldo_pago_tarjeta()` para actualizar automáticamente el saldo de las tarjetas
- Crea triggers para ejecutar la función al insertar, actualizar o eliminar pagos

**Notas importantes:**
- Los pagos a tarjetas DEBEN ser registrados con forma de pago "efectivo" o "transferencia"
- Los pagos reducen el `saldo_usado` de la tarjeta
- Los pagos SI afectan el saldo actual del usuario (se debita del efectivo/transferencia)
- La API valida automáticamente que solo se usen formas de pago permitidas

## Verificar si una migración ya fue aplicada

Para verificar si la tabla `pagos_tarjetas` ya existe:

```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'pagos_tarjetas'
);
```

Si retorna `t` (true), la migración ya fue aplicada.
