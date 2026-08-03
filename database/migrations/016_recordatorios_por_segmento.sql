-- Migración 016: contador de recordatorios enviados
--
-- Los recordatorios se dividen en dos públicos con necesidades opuestas:
--
--   * Quien ya usó la aplicación —tiene tarjetas, gastos, ingresos o
--     préstamos— y se enfrió. Tiene datos dentro que le importan; recordárselo
--     cada quince días es un servicio razonable y puede seguir indefinidamente.
--
--   * Quien se registró y no llegó a hacer nada. A esa persona no se le puede
--     escribir «hace 80 días que no registras tus gastos», porque nunca
--     registró ninguno, y perseguirla cada quince días para siempre es
--     justamente lo que hace que alguien marque el correo como spam. Se le
--     escribe un par de veces y se la deja en paz.
--
-- Ese tope total necesita saber cuántos avisos lleva cada persona, y
-- `ultimo_recordatorio` solo guarda el último. De ahí esta columna.
--
-- El segmento no se almacena: se deduce en cada ejecución de si existen filas
-- suyas en tarjetas, egresos, ingresos, préstamos o pagos. Guardarlo obligaría
-- a actualizarlo cada vez que alguien crea su primer movimiento y acabaría
-- desincronizado.

\c control_gastos;

-- El archivo está en UTF-8; sin esto psql lo reenvía con la página de códigos
-- de la consola de Windows y los textos con tilde se guardan deformados.
\encoding UTF8

BEGIN;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS recordatorios_enviados INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN usuarios.recordatorios_enviados IS
    'Total de recordatorios enviados a esta persona; limita los avisos a quien nunca usó la aplicación';

-- Coherencia con lo ya enviado: quien tiene fecha de último recordatorio pero
-- el contador a cero recibió al menos uno antes de esta migración.
UPDATE usuarios
SET recordatorios_enviados = 1
WHERE ultimo_recordatorio IS NOT NULL
  AND recordatorios_enviados = 0;

DO $$
DECLARE
    con_actividad INTEGER;
    sin_actividad INTEGER;
BEGIN
    SELECT
        count(*) FILTER (WHERE tiene),
        count(*) FILTER (WHERE NOT tiene)
    INTO con_actividad, sin_actividad
    FROM (
        SELECT (
            EXISTS (SELECT 1 FROM tarjetas        t WHERE t.id_usuario  = u.id_usuario) OR
            EXISTS (SELECT 1 FROM egresos         e WHERE e.id_usuario  = u.id_usuario) OR
            EXISTS (SELECT 1 FROM ingresos        i WHERE i.id_usuario  = u.id_usuario) OR
            EXISTS (SELECT 1 FROM prestamos       p WHERE p.id_usuario  = u.id_usuario) OR
            EXISTS (SELECT 1 FROM pagos_tarjetas  pt WHERE pt.id_usuario = u.id_usuario) OR
            EXISTS (SELECT 1 FROM pagos_prestamos pp WHERE pp.id_usuario = u.id_usuario)
        ) AS tiene
        FROM usuarios u
        WHERE u.activo = TRUE
    ) s;

    RAISE NOTICE '--- Migración 016 ---';
    RAISE NOTICE 'Usuarios que llegaron a registrar algo: %', con_actividad;
    RAISE NOTICE 'Usuarios que solo se registraron:       %', sin_actividad;
END $$;

COMMIT;
