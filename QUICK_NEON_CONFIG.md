# Configuración Rápida para Neon.tech

## Resumen de 3 pasos

### 1. Crear proyecto en Neon.tech

- Ve a https://neon.tech
- Crea una cuenta y un nuevo proyecto
- Copia la cadena de conexión que se ve así:
  ```
  postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
  ```

### 2. Configurar .env

Edita tu archivo `.env` y agrega **solo** esta línea:

```env
DATABASE_URL=postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
```

**Nota:** Si usas `DATABASE_URL`, NO necesitas configurar `DATABASE_HOST`, `DATABASE_PORT`, etc.

### 3. Ejecutar el schema

Opción A - Desde el SQL Editor de Neon (Recomendado):
1. Abre el SQL Editor en el dashboard de Neon
2. Copia y pega el contenido de `database/schema.sql`
3. Haz clic en "Run"

Opción B - Desde terminal con psql:
```bash
psql "postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require" -f database/schema.sql
```

## ¡Listo!

Ahora ejecuta:
```bash
pnpm dev
```

Tu aplicación ya está conectada a Neon.tech.

---

Para más detalles, consulta [NEON_SETUP.md](NEON_SETUP.md)
