# Migración al API Client con Detección de Sesión Expirada

Este documento explica cómo migrar las llamadas `fetch` existentes al nuevo `apiClient` que intercepta automáticamente errores de sesión.

## 🎯 Qué hace el API Client

El `apiClient` intercepta automáticamente:
- **Errores 401** (Token inválido/expirado)
- **Errores 403** relacionados con sesión
- Detecta si la sesión fue **reemplazada** (login en otro dispositivo) o simplemente **expiró**
- Muestra un modal informativo al usuario
- Guía al usuario de vuelta al login

## 📝 Cómo Migrar

### ❌ ANTES (fetch directo):
```typescript
async function loadDashboard() {
    try {
        const token = $authStore.token;
        const response = await fetch('/api/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar dashboard');
        }

        dashboardData = await response.json();
    } catch (err: any) {
        error = err.message;
    } finally {
        loading = false;
    }
}
```

### ✅ DESPUÉS (con apiClient):
```typescript
import { apiGet } from '$lib/utils/apiClient';

async function loadDashboard() {
    try {
        const token = $authStore.token;
        const response = await apiGet('/api/dashboard', token);

        if (!response.ok) {
            throw new Error('Error al cargar dashboard');
        }

        dashboardData = await response.json();
    } catch (err: any) {
        // Los errores 401/403 ya fueron manejados por apiClient
        // Solo manejar otros errores aquí
        error = err.message;
    } finally {
        loading = false;
    }
}
```

## 🔧 Funciones Disponibles

### GET
```typescript
import { apiGet } from '$lib/utils/apiClient';

const response = await apiGet('/api/endpoint', token);
```

### POST
```typescript
import { apiPost } from '$lib/utils/apiClient';

const response = await apiPost('/api/endpoint', token, {
    campo: 'valor'
});
```

### PUT
```typescript
import { apiPut } from '$lib/utils/apiClient';

const response = await apiPut('/api/endpoint', token, {
    campo: 'valor actualizado'
});
```

### DELETE
```typescript
import { apiDelete } from '$lib/utils/apiClient';

const response = await apiDelete('/api/endpoint', token);
```

### Personalizado (con opciones completas)
```typescript
import { apiClient } from '$lib/utils/apiClient';

const response = await apiClient('/api/endpoint', {
    method: 'PATCH',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Custom-Header': 'valor'
    },
    body: JSON.stringify(data)
});
```

## 🎨 Mensajes del Backend

Para que el modal detecte correctamente si la sesión fue **reemplazada**, el backend debe incluir en el error 401:

```json
{
    "error": "Sesión reemplazada por inicio de sesión en otro dispositivo"
}
```

Palabras clave que el cliente detecta:
- "sesión reemplazada" / "sesion reemplazada"
- "token reemplazado"
- "otra sesión"
- "otro dispositivo"

Si el error no contiene estas palabras, se asume que la sesión simplemente **expiró**.

## 📋 Lista de Archivos a Migrar

Busca todos los archivos que usan `fetch` con headers de Authorization:

```bash
# En Windows (PowerShell)
Get-ChildItem -Recurse -Include *.svelte,*.ts | Select-String "fetch.*Authorization"

# O manualmente buscar en:
- src/routes/dashboard/+page.svelte
- src/routes/ingresos/+page.svelte
- src/routes/egresos/+page.svelte
- src/routes/tarjetas/+page.svelte
- src/routes/pagos-tarjetas/+page.svelte
- src/routes/proximos-pagos-tarjetas/+page.svelte
- src/routes/perfil/+page.svelte
```

## ✨ Beneficios

1. ✅ **Mensajes claros** para el usuario
2. ✅ **Detección automática** de sesión reemplazada vs expirada
3. ✅ **Código más limpio** - no repetir lógica de manejo de errores
4. ✅ **Experiencia consistente** en toda la app
5. ✅ **Seguridad mejorada** - usuario sabe si alguien más accedió a su cuenta

## 🔒 Recomendación de Seguridad

El modal recomienda automáticamente al usuario:
- Cambiar su contraseña si no reconoce la actividad
- Contactar a soporte si cree que su cuenta está comprometida

## 🧪 Cómo Probar

1. Inicia sesión en el navegador A
2. Inicia sesión en el navegador B con el mismo usuario
3. Vuelve al navegador A
4. Intenta cualquier acción (cargar dashboard, etc.)
5. Deberías ver el modal con el mensaje de "sesión reemplazada"
