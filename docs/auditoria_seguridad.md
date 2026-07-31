# Auditoría de seguridad — control_gastos

**Fecha:** 30 de julio de 2026
**Alcance:** revisión estática del código (SvelteKit 2 + PostgreSQL): 30 endpoints de API, capa `src/lib/server`, configuración, service worker y dependencias.
**Limitación:** sin pruebas dinámicas. No se levantó la aplicación ni se atacó un entorno real; todo sale de leer el código, la configuración y `pnpm audit`.

> Nota: existía un documento previo con la auditoría del 29 de julio. Ya no está en disco y no estaba bajo control de versiones, así que no se pudo conservar. Casi todo lo que señalaba estaba corregido en el código cuando se hizo esta revisión: `JWT_SECRET` propio, sin tokens en los logs, cookie httpOnly sin token en localStorage, sesiones hasheadas, cabeceras de seguridad y CSP, TLS verificado contra PostgreSQL, límites de peticiones y guardia SSR de rutas.

---

## Lo que ya estaba bien

- **Sin inyección SQL.** Todas las consultas usan parámetros posicionales; no hay concatenación de entrada de usuario en SQL.
- **Sin IDOR.** Los 30 endpoints exigen sesión y filtran por `id_usuario`; los de administración exigen además el rol.
- El token de sesión vive solo en la cookie `httpOnly`; la tabla `sesiones` guarda una huella SHA-256, no el JWT.
- Cambiar o restablecer la contraseña cierra las demás sesiones.
- `forgot-password` responde igual exista o no la cuenta.

---

## Corregido en esta revisión

### Alta

**Transacción abierta sobre el pool** — `src/routes/api/pagos-tarjetas/+server.ts`
`query('BEGIN')` usaba el pool, que entrega una conexión distinta en cada llamada. El BEGIN, los INSERT, el COMMIT y el ROLLBACK podían caer en conexiones diferentes: la operación no era atómica, el BEGIN quedaba abierto en una conexión devuelta al pool (las escrituras de otra petición entraban en esa transacción ajena) y un ROLLBACK podía deshacer el trabajo de otro usuario.
→ Toda la operación va ahora sobre una conexión reservada con `getClient()`, con `release()` en `finally` y `FOR UPDATE` al tocar las cuotas MSI.

**Escrituras sin transacción** — `src/routes/api/pagos-prestamos/+server.ts`
El alta registraba el pago y su egreso en dos consultas independientes: si la segunda fallaba, quedaba un pago sin el egreso correspondiente y el saldo dejaba de cuadrar sin aviso. El borrado tenía el problema simétrico (egreso huérfano restando del saldo) y, además, borraba **todos** los egresos que casaran con fecha, monto y patrón del concepto: con dos pagos idénticos el mismo día al mismo préstamo, eliminar uno se llevaba los dos.
→ Alta y borrado van en una transacción sobre conexión reservada, con `FOR UPDATE` sobre el pago, y el borrado del egreso se limita a una sola fila.

**El egreso no referenciaba al pago que lo originó** — migración `013`
La relación se reconstruía comparando fecha, monto y un patrón de texto en el concepto. Además de lo anterior, eso dejaba dos agujeros: borrar un pago de tarjeta **nunca** borraba su egreso (quedaba huérfano restando del saldo para siempre), y editar un pago dejaba su egreso con el monto y la fecha antiguos.
→ `egresos.id_pago_tarjeta_origen` y `egresos.id_pago_prestamo_origen`, con clave foránea `ON DELETE CASCADE`, un CHECK que impide declarar los dos orígenes a la vez e índices únicos parciales que garantizan un egreso por pago. La migración rellena los datos históricos emparejando 1 a 1 por posición (`ROW_NUMBER`), de modo que dos pagos idénticos el mismo día no se pisan. El endpoint de edición de pagos de tarjeta sincroniza ahora el egreso vinculado.

Al validar el relleno apareció un defecto de fondo en el código anterior: la descripción del egreso de un préstamo se escribe **«(Préstamo #N)» cuando el pago lleva nota y «Pago de préstamo #N» cuando no**, y el patrón de borrado (`LIKE '%Préstamo #N%'`, sensible a mayúsculas) solo casaba con el primero. Los pagos registrados sin descripción nunca encontraban su egreso. Corregido en la migración y en el camino heredado del endpoint, que ahora usa `ILIKE`.

**El limitador no se aplicaba a las lecturas** — `src/hooks.server.ts`
La condición `method !== 'GET'` dejaba fuera todas las peticiones GET, así que el tope declarado para `/api/exportar` (20/min) nunca llegaba a ejecutarse; es el endpoint más caro de la aplicación.
→ Cada límite tiene ahora un tope propio para lecturas, con cubetas separadas de escritura y lectura.

**El bloqueo de cuenta era un DoS dirigido** — `src/routes/api/auth/login/+server.ts`
El contador iba por correo: cualquiera que conociera un email registrado dejaba a esa persona fuera 15 minutos enviando cinco contraseñas erróneas. Además `change-password` registraba sus fallos como `login_fallido`, así que equivocarse al confirmar la contraseña actual bloqueaba el inicio de sesión.
→ El bloqueo estricto va por (correo + IP) y se reinicia tras un acceso correcto desde esa IP; queda una salvaguarda global de 50 fallos/15 min contra fuerza bruta distribuida; `change-password` usa su propio tipo de evento.

**La guardia SSR de `/admin` no miraba el rol** — `src/hooks.server.ts`
Comprobaba que hubiera sesión, no que fuera administradora. Cualquier usuaria autenticada cargaba el panel (los datos no se filtraban: la API responde 403).
→ Las rutas de administración comprueban `es_admin` en el servidor.

### Media

- **`xlsx@0.18.5`** tenía dos vulnerabilidades altas sin versión parcheada en npm. Se sustituyó por la distribución oficial de SheetJS 0.20.3 (`cdn.sheetjs.com`), sin dependencias transitivas. `uuid` se eliminó: el token de recuperación usa ahora `randomBytes(32)`. `pnpm audit --prod`: **sin vulnerabilidades conocidas**.
- **TLS de SMTP** (`src/lib/server/email.ts`) dependía de que `NODE_ENV` valiera exactamente `production`, y era el único módulo que leía el entorno sin recortar los comentarios en línea que sí usa el `.env`. Ahora la verificación está activa siempre salvo `EMAIL_TLS_INSECURE=true`, y ese módulo lee el entorno igual que el resto.
- **Token de recuperación en claro** en `usuarios.token_recuperacion`. Ahora se guarda su huella SHA-256, igual que los de sesión. Requiere la migración `012`.
- **Fuga de errores internos**: `pagos-tarjetas` devolvía `error.message` (texto de PostgreSQL) al navegador en los 500.
- **Service worker**: precacheaba `/dashboard` con las cookies del usuario y guardaba toda navegación con estado 200. Ahora solo cachea rutas públicas del mismo origen y vacía Cache Storage al cerrar sesión.
- **Enumeración de cuentas en el login**: el estado `activo` se comprobaba antes que la contraseña, así que un 403 confirmaba que el correo existía. Ahora se comprueba después.
- **Altas masivas**: el límite de registros por IP solo vivía en memoria (inútil entre instancias de Vercel). Se añadió un contador persistente sobre `logs_seguridad`.
- **Datos personales en los logs** de `email.ts` (destinatario y nombre en cada recuperación): ahora solo en desarrollo.

### Baja

- `jwt.verify` y `jwt.sign` fijan `HS256`; `verifyToken` comprueba que el payload traiga un `userId` de tipo cadena.
- `requireAuth` verifica que el usuario del JWT coincida con el de la fila de `sesiones`.
- Identificadores de ruta y de cuerpo validados (`esUuid` / `idEntero`) antes de llegar a PostgreSQL: devuelven 400 en lugar de 500.
- Fechas de `/api/exportar` validadas como `YYYY-MM-DD`, y el nombre de archivo saneado antes de entrar en `Content-Disposition`.
- Nombres de hoja de Excel normalizados: una tarjeta con `/` en el nombre rompía la exportación.
- El nombre del usuario se escapa en la plantilla HTML del correo de recuperación.
- CSP: `style-src` pasa a `'self'`, con `'unsafe-inline'` acotado a `style-src-attr`.

---

## Pendiente (decisiones, no olvidos)

**Enumeración de usuarios en el registro.** `/api/auth/register` sigue respondiendo 409 «El email ya está registrado». Cerrarlo del todo exige responder algo genérico y confirmar la cuenta por correo, es decir, añadir verificación de email al alta. Se mantuvo el mensaje explícito porque es lo habitual en aplicaciones de consumo y porque el riesgo real bajó al arreglar el bloqueo por correo: descubrir que una cuenta existe ya no permite dejar a nadie fuera. Si se quiere cerrar, el camino es implementar verificación de correo.

**El limitador en memoria sigue siendo por instancia.** En Vercel el tope efectivo es «máximo × número de instancias». Los flujos sensibles (login, recuperación, registro) tienen ya contadores persistentes en base de datos; el resto se apoya solo en la memoria. Un limitador compartido (Redis/Upstash) sería lo correcto si crece el tráfico.

**`contarEventosPorEmail` falla en abierto.** Si la consulta de conteo falla devuelve 0 y no bloquea. Es deliberado —la base hace falta igualmente para iniciar sesión— pero significa que un incidente en la base desactiva el bloqueo por intentos.

---

## Para aplicar en producción

1. Ejecutar, en orden:
   - `database/migrations/012_seguridad_tokens_y_limites.sql`. Invalida las recuperaciones de contraseña en curso (el enlace dura una hora) y crea los índices de los contadores nuevos.
   - `database/migrations/013_egresos_origen_pago.sql`. Añade el vínculo entre egresos y pagos y rellena el histórico. Va entera en una transacción: si algo falla, no deja nada a medias. Lee el resumen que imprime al final; las dos últimas cifras indican cuántas filas quedaron sin emparejar.
   - `database/migrations/014_saldo_tarjeta_por_pago.sql`. Repone el trigger que la migración 009 eliminó sin sustituto: desde entonces, registrar o borrar un pago no actualizaba `tarjetas.saldo_usado`, y el saldo solo se corregía de rebote al tocar alguna compra de esa misma tarjeta. Recalcula además todos los saldos e imprime una línea por cada tarjeta que corrige.

   **Ejecuta la 014 después de desplegar el código.** El recálculo puede dejar un saldo negativo en las tarjetas que tienen pagos registrados pero ninguna compra —el caso normal de quien da de alta su tarjeta y anota un abono antes de capturar sus gastos—, y la interfaz solo sabe presentarlo como «Saldo a Favor» a partir de esta versión.

   Ambas se probaron sobre una base de datos desechable con datos de ejemplo —incluidos pagos duplicados el mismo día y egresos huérfanos— y son idempotentes: volver a ejecutarlas no duplica nada.

   **Codificación.** Los dos archivos empiezan con `\encoding UTF8`. No es adorno: la lógica de emparejamiento de la `013` busca literales con tilde («préstamo») dentro de los conceptos y descripciones. Ejecutada desde la consola de Windows sin esa línea, psql reenvía el archivo con la página de códigos de la terminal, los patrones llegan deformados y **no casan con ninguna fila, sin dar ningún error**. Medido: 0 de 2 filas emparejadas sin la línea, 2 de 2 con ella. Si añades más migraciones con texto acentuado, ponles la misma cabecera.
2. Desplegar. Al reinstalar dependencias se descarga SheetJS desde `cdn.sheetjs.com`; la integridad queda fijada en `pnpm-lock.yaml`.
3. Comprobar que `NODE_ENV=production`, `COOKIE_SECURE=true` y `COOKIE_DOMAIN` apuntan al dominio real en las variables de entorno de Vercel.
