-- Migración 011: índices de apoyo para el limitador de intentos
--
-- El bloqueo de cuenta tras varios logins fallidos y el límite de solicitudes
-- de recuperación cuentan filas de logs_seguridad filtrando por email, tipo de
-- evento y fecha. Sin este índice compuesto, cada intento de login provoca un
-- recorrido secuencial de la tabla, que crece de forma indefinida.

\c control_gastos;

CREATE INDEX IF NOT EXISTS idx_logs_email_tipo_fecha
    ON logs_seguridad (LOWER(email), tipo_evento, fecha_evento DESC);

-- La validación de sesión busca por la huella del token en cada peticion.
CREATE INDEX IF NOT EXISTS idx_sesiones_token_activa
    ON sesiones (token, activa);

-- Nota: la columna sesiones.token ahora guarda un SHA-256 en hexadecimal
-- (64 caracteres) en lugar del JWT completo. Las filas anteriores dejan de
-- validar automáticamente, por lo que las sesiones abiertas se cerraran y los
-- usuarios tendran que iniciar sesion de nuevo una sola vez.
