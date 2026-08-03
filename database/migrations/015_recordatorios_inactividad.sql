-- Migración 015: recordatorios por correo a usuarios inactivos
--
-- Añade lo mínimo para poder enviarlos sin resultar molesto ni ilegal:
--
--   * `recordatorios_activos`: cada persona puede darse de baja. El correo
--     lleva un enlace para hacerlo sin iniciar sesión.
--   * `ultimo_recordatorio`: evita reenviar antes de tiempo. Sin esta marca,
--     cada ejecución de la tarea programada volvería a escribir a la misma
--     gente todos los días.
--
-- La «última actividad» no se guarda en una columna nueva: se deduce del último
-- `login_exitoso` de `logs_seguridad`, que ya se registra en cada inicio de
-- sesión, con `fecha_registro` como respaldo para quien se dio de alta y no ha
-- vuelto. Duplicar ese dato en `usuarios` obligaría a mantenerlo al día en cada
-- petición y acabaría desincronizándose.

\c control_gastos;

-- El archivo está en UTF-8; sin esto psql lo reenvía con la página de códigos
-- de la consola de Windows y los textos con tilde se guardan deformados.
\encoding UTF8

BEGIN;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS recordatorios_activos BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS ultimo_recordatorio TIMESTAMP;

COMMENT ON COLUMN usuarios.recordatorios_activos IS
    'FALSE si la persona se dio de baja de los correos de recordatorio';
COMMENT ON COLUMN usuarios.ultimo_recordatorio IS
    'Fecha del último recordatorio enviado; NULL si nunca se le ha escrito';

-- La selección de destinatarios busca el último login de cada usuario. Sin este
-- índice, cada ejecución recorre `logs_seguridad` entera, que crece sin límite.
CREATE INDEX IF NOT EXISTS idx_logs_usuario_tipo_fecha
    ON logs_seguridad (id_usuario, tipo_evento, fecha_evento DESC);

-- Filtro de candidatos: quienes siguen aceptando recordatorios.
CREATE INDEX IF NOT EXISTS idx_usuarios_recordatorios
    ON usuarios (recordatorios_activos, ultimo_recordatorio)
    WHERE activo = TRUE;

DO $$
DECLARE
    total INTEGER;
BEGIN
    SELECT count(*) INTO total FROM usuarios WHERE activo = TRUE;
    RAISE NOTICE '--- Migración 015 ---';
    RAISE NOTICE '% usuarios activos quedan suscritos a los recordatorios por defecto.', total;
    RAISE NOTICE 'Nadie recibirá nada hasta que se despliegue la tarea programada y';
    RAISE NOTICE 'se configure CRON_SECRET en las variables de entorno.';
END $$;

COMMIT;
