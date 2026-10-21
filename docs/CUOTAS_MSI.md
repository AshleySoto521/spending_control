# Sistema de Cuotas MSI (Meses Sin Intereses)

## ¿Cómo funciona?

El sistema calcula automáticamente las cuotas pendientes de las compras a MSI sin necesidad de crear registros individuales por cada mes.

## Características

### 1. **Cálculo Automático**
Cuando registras una compra a MSI, el sistema:
- Calcula el monto mensual (`monto_total / num_meses`)
- Rastrea cuántos meses han pasado desde la compra
- Determina cuántas cuotas están pendientes
- Calcula si estás al corriente o atrasado

### 2. **Estados de Cuotas**

- **Al corriente**: Has pagado todas las cuotas que corresponden hasta la fecha
- **Atrasado**: Tienes cuotas vencidas que no has marcado como pagadas
- **Completado**: Todas las cuotas han sido pagadas

### 3. **Visualización en Dashboard**

El dashboard muestra:
- Concepto de la compra
- Tarjeta utilizada
- Monto mensual
- Progreso (cuotas pagadas / cuotas totales)
- Monto total pendiente
- Fecha estimada de próxima cuota
- Estado actual
- Botón para marcar como pagada

## Flujo de Uso

### Registrar una compra a MSI

1. Ve a **Egresos**
2. Marca la casilla "Compra a Meses"
3. Selecciona el número de meses (3, 6, 9, 12, 18, 24, 36, 48)
4. Opcionalmente, indica el mes de inicio de pago (0-12 meses de diferimiento)
5. El sistema calcula automáticamente el monto mensual

### Marcar cuotas como pagadas

Hay dos formas:

**Opción 1: Desde el Dashboard**
1. Ve al **Dashboard**
2. En la sección "Próximas Cuotas MSI"
3. Haz clic en "Marcar Pagada" en la cuota correspondiente
4. El sistema incrementa automáticamente `meses_pagados`

**Opción 2: Mediante API**
```bash
# Incrementar en 1
POST /api/egresos/{id}/meses-pagados

# Establecer un valor específico
PATCH /api/egresos/{id}/meses-pagados
{
  "meses_pagados": 5
}
```

## Cálculos Importantes

### Meses Transcurridos
```sql
EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_egreso)) * 12 +
EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_egreso)) -
COALESCE(mes_inicio_pago, 0)
```

### Cuotas Pendientes
```sql
num_meses - meses_pagados
```

### Monto Pendiente
```sql
monto_mensual * cuotas_pendientes
```

### Estado
- Si `meses_pagados >= num_meses` → **Completado**
- Si `meses_pagados < meses_transcurridos` → **Atrasado**
- De lo contrario → **Al corriente**

## Vista de Base de Datos

La vista `v_cuotas_msi` calcula toda esta información automáticamente:

```sql
SELECT * FROM v_cuotas_msi WHERE id_usuario = 'user-id';
```

Devuelve:
- `id_egreso`: ID de la compra
- `concepto`: Descripción de la compra
- `nom_tarjeta`, `banco`: Información de la tarjeta
- `monto_mensual`: Cuota mensual
- `cuotas_pendientes`: Cuántas cuotas faltan
- `monto_pendiente`: Total por pagar
- `fecha_proxima_cuota`: Fecha estimada basada en día de corte
- `estado`: al_corriente, atrasado, o completado
- `meses_pagados`, `num_meses`: Progreso

## Importante

⚠️ **El saldo de la tarjeta NO se ve afectado automáticamente por las cuotas MSI**

Cuando haces una compra a MSI:
- El monto total se carga al `saldo_usado` de la tarjeta inmediatamente
- Las cuotas MSI son solo para **tracking** y recordatorios
- Debes pagar el monto que aparece en tu estado de cuenta de la tarjeta
- El sistema solo te ayuda a **recordar** que tienes cuotas pendientes

## Ejemplo

**Compra:**
- Fecha: 1 de enero 2024
- Monto: $12,000
- MSI: 12 meses
- Tarjeta con corte: día 15

**Resultado:**
- Monto mensual: $1,000
- Primera cuota: 15 de febrero (si mes_inicio_pago = 0)
- Última cuota: 15 de enero 2025

**En el Dashboard (1 de marzo):**
- Meses transcurridos: 2
- Cuotas pagadas: 0 (si no has marcado ninguna)
- Estado: **Atrasado** (deberías haber pagado 2 cuotas)
- Monto pendiente: $12,000

**Después de marcar 2 cuotas como pagadas:**
- Meses pagados: 2
- Estado: **Al corriente**
- Cuotas pendientes: 10
- Monto pendiente: $10,000
