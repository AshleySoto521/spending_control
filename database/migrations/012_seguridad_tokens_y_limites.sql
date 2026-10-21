-- Migración 012: huella del token de recuperación e índices de los nuevos límites
--
-- 1. `usuarios.token_recuperacion` pasa a guardar un SHA-256 en hexadecimal
--    (64 caracteres) en lugar del token en claro. Igual que ya se hacía con
--    `sesiones.token`. Los tokens pendientes dejan de ser válidos: quien esté a
--    mitad de una recuperación tendrá que volver a solicitarla (el enlace dura
--    una hora, así que el impacto es mínimo).
--
-- 2. Índices para los contadores persistentes que introdujo la revisión:
--    - bloqueo de login por (email + IP)
--    - límite de altas por IP
--
-- Ejecutar una sola vez sobre la base de producción.

\c control_gastos;

-- El archivo está en UTF-8; sin esto psql lo reenvía con la página de códigos
-- de la consola de Windows y los textos con tilde se guardan deformados.
\encoding UTF8

-- 1. Invalidar las recuperaciones en curso: quedaron guardadas en claro y ya no
--    coincidirían con la huella que calcula la aplicación.
UPDATE usuarios
SET token_recuperacion = NULL,
    token_expiracion = NULL
WHERE token_recuperacion IS NOT NULL;

-- 2. Índices de apoyo para los conteos por IP.
CREATE INDEX IF NOT EXISTS idx_logs_tipo_ip_fecha
    ON logs_seguridad (tipo_evento, ip_address, fecha_evento DESC);

CREATE INDEX IF NOT EXISTS idx_logs_email_ip_tipo_fecha
    ON logs_seguridad (LOWER(email), ip_address, tipo_evento, fecha_evento DESC);

COMMENT ON COLUMN usuarios.token_recuperacion IS
    'Huella SHA-256 (hex) del token de recuperación, nunca el token en claro';
