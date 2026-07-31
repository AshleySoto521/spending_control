-- Migración 013: vincular cada egreso automático con el pago que lo originó
--
-- Problema que resuelve
-- ---------------------
-- Al registrar un pago de tarjeta o de préstamo, la aplicación crea además un
-- egreso para que el movimiento afecte al saldo. Hasta ahora ese egreso no
-- guardaba ninguna referencia al pago: la correspondencia se reconstruía a mano
-- comparando fecha, monto y un patrón de texto en el concepto. Eso provocaba
-- tres problemas reales:
--
--   1. Con dos pagos idénticos el mismo día al mismo préstamo, borrar uno
--      borraba los egresos de ambos.
--   2. Borrar un pago de tarjeta no borraba su egreso: quedaba huérfano
--      restando del saldo para siempre.
--   3. Cualquier cambio en el texto del concepto rompía la correspondencia en
--      silencio.
--
-- Con la clave foránea la relación es explícita y la impone la base de datos.
-- `ON DELETE CASCADE` hace que borrar el pago se lleve su egreso, sin depender
-- de que la aplicación acierte con el texto.
--
-- Son dos columnas y no una porque el origen puede estar en dos tablas
-- distintas (`pagos_tarjetas` o `pagos_prestamos`) y una única columna no puede
-- referenciar a ambas con integridad garantizada. Un CHECK impide que un mismo
-- egreso declare los dos orígenes a la vez.
--
-- El script es idempotente: puede ejecutarse varias veces sin duplicar nada.

\c control_gastos;

-- Este archivo está en UTF-8 y su lógica depende de literales con tilde
-- («préstamo»): el emparejamiento del histórico busca ese texto en los
-- conceptos y descripciones. En la consola de Windows psql asume por defecto la
-- página de códigos de la terminal (850/1252), reenvía estos bytes como si
-- fueran latin1 y el servidor los vuelve a convertir: los patrones llegan
-- deformados y no casan con NINGUNA fila, sin dar ningún error. Esta línea fija
-- la codificación del cliente y hace que el resultado no dependa de la consola.
\encoding UTF8

BEGIN;

-- ---------------------------------------------------------------- 1. Columnas
ALTER TABLE egresos ADD COLUMN IF NOT EXISTS id_pago_tarjeta_origen INTEGER;
ALTER TABLE egresos ADD COLUMN IF NOT EXISTS id_pago_prestamo_origen INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_egresos_pago_tarjeta_origen'
    ) THEN
        ALTER TABLE egresos
            ADD CONSTRAINT fk_egresos_pago_tarjeta_origen
            FOREIGN KEY (id_pago_tarjeta_origen)
            REFERENCES pagos_tarjetas(id_pago) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_egresos_pago_prestamo_origen'
    ) THEN
        ALTER TABLE egresos
            ADD CONSTRAINT fk_egresos_pago_prestamo_origen
            FOREIGN KEY (id_pago_prestamo_origen)
            REFERENCES pagos_prestamos(id_pago) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_egresos_un_solo_origen'
    ) THEN
        ALTER TABLE egresos
            ADD CONSTRAINT chk_egresos_un_solo_origen
            CHECK (id_pago_tarjeta_origen IS NULL OR id_pago_prestamo_origen IS NULL);
    END IF;
END $$;

-- ------------------------------------------- 2. Relleno: pagos de tarjeta
--
-- Se emparejan pagos y egresos por (usuario, fecha, monto, forma de pago,
-- concepto). Cuando varias filas caen en el mismo grupo —dos pagos idénticos el
-- mismo día— se numeran ambos lados con ROW_NUMBER() y se cruzan por posición,
-- de modo que el emparejamiento es 1 a 1 y no queda ningún egreso reclamado por
-- dos pagos. Los criterios son exactamente los que usaba la migración 005 para
-- crear estos egresos.
WITH pagos_numerados AS (
    SELECT
        pt.id_pago,
        pt.id_usuario,
        pt.fecha_pago,
        pt.monto,
        pt.id_forma_pago,
        CONCAT('Pago de tarjeta - ', t.nom_tarjeta) AS concepto,
        ROW_NUMBER() OVER (
            PARTITION BY pt.id_usuario, pt.fecha_pago, pt.monto, pt.id_forma_pago,
                         CONCAT('Pago de tarjeta - ', t.nom_tarjeta)
            ORDER BY pt.id_pago
        ) AS posicion
    FROM pagos_tarjetas pt
    INNER JOIN tarjetas t ON t.id_tarjeta = pt.id_tarjeta
    WHERE NOT EXISTS (
        SELECT 1 FROM egresos e WHERE e.id_pago_tarjeta_origen = pt.id_pago
    )
),
egresos_numerados AS (
    SELECT
        e.id_egreso,
        e.id_usuario,
        e.fecha_egreso,
        e.monto,
        e.id_forma_pago,
        e.concepto,
        ROW_NUMBER() OVER (
            PARTITION BY e.id_usuario, e.fecha_egreso, e.monto, e.id_forma_pago, e.concepto
            ORDER BY e.id_egreso
        ) AS posicion
    FROM egresos e
    WHERE e.id_pago_tarjeta_origen IS NULL
      AND e.id_pago_prestamo_origen IS NULL
      AND e.concepto LIKE 'Pago de tarjeta - %'
      AND e.compra_meses = FALSE
      AND e.id_tarjeta IS NULL
)
UPDATE egresos e
SET id_pago_tarjeta_origen = p.id_pago
FROM egresos_numerados en
INNER JOIN pagos_numerados p
    ON  p.id_usuario    = en.id_usuario
    AND p.fecha_pago    = en.fecha_egreso
    AND p.monto         = en.monto
    AND p.id_forma_pago = en.id_forma_pago
    AND p.concepto      = en.concepto
    AND p.posicion      = en.posicion
WHERE e.id_egreso = en.id_egreso;

-- ------------------------------------------ 3. Relleno: pagos de préstamo
--
-- Aquí el número de préstamo sí viaja en el texto, así que se extrae con una
-- expresión regular y entra en la clave de emparejamiento. Mismo criterio de
-- posición para los grupos con varias filas idénticas.
--
-- Ojo con la P: la aplicación genera DOS formatos según haya descripción o no
-- («… (Préstamo #12)» y «Pago de préstamo #12»), por eso el patrón acepta
-- ambas grafías. Buscar solo «Préstamo» dejaba fuera todos los pagos
-- registrados sin descripción.
WITH pagos_numerados AS (
    SELECT
        pp.id_pago,
        pp.id_usuario,
        pp.fecha_pago,
        pp.monto,
        pp.id_forma_pago,
        pp.id_prestamo,
        ROW_NUMBER() OVER (
            PARTITION BY pp.id_usuario, pp.fecha_pago, pp.monto, pp.id_forma_pago, pp.id_prestamo
            ORDER BY pp.id_pago
        ) AS posicion
    FROM pagos_prestamos pp
    WHERE NOT EXISTS (
        SELECT 1 FROM egresos e WHERE e.id_pago_prestamo_origen = pp.id_pago
    )
),
egresos_numerados AS (
    SELECT
        e.id_egreso,
        e.id_usuario,
        e.fecha_egreso,
        e.monto,
        e.id_forma_pago,
        (substring(e.descripcion from '[Pp]réstamo #([0-9]+)'))::INTEGER AS id_prestamo,
        ROW_NUMBER() OVER (
            PARTITION BY e.id_usuario, e.fecha_egreso, e.monto, e.id_forma_pago,
                         (substring(e.descripcion from '[Pp]réstamo #([0-9]+)'))::INTEGER
            ORDER BY e.id_egreso
        ) AS posicion
    FROM egresos e
    WHERE e.id_pago_tarjeta_origen IS NULL
      AND e.id_pago_prestamo_origen IS NULL
      AND e.concepto LIKE 'Pago de préstamo%'
      AND e.descripcion ~ '[Pp]réstamo #[0-9]+'
      AND e.compra_meses = FALSE
)
UPDATE egresos e
SET id_pago_prestamo_origen = p.id_pago
FROM egresos_numerados en
INNER JOIN pagos_numerados p
    ON  p.id_usuario    = en.id_usuario
    AND p.fecha_pago    = en.fecha_egreso
    AND p.monto         = en.monto
    AND p.id_forma_pago = en.id_forma_pago
    AND p.id_prestamo   = en.id_prestamo
    AND p.posicion      = en.posicion
WHERE e.id_egreso = en.id_egreso;

-- --------------------------------------------------------------- 4. Índices
--
-- Únicos y parciales: un pago no puede tener dos egresos automáticos. Se crean
-- después del relleno; si el emparejamiento hubiera producido duplicados, la
-- creación falla aquí y toda la migración se revierte.
CREATE UNIQUE INDEX IF NOT EXISTS idx_egresos_pago_tarjeta_origen
    ON egresos (id_pago_tarjeta_origen)
    WHERE id_pago_tarjeta_origen IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_egresos_pago_prestamo_origen
    ON egresos (id_pago_prestamo_origen)
    WHERE id_pago_prestamo_origen IS NOT NULL;

COMMENT ON COLUMN egresos.id_pago_tarjeta_origen IS
    'Pago de tarjeta que generó este egreso automáticamente. NULL en egresos capturados a mano.';
COMMENT ON COLUMN egresos.id_pago_prestamo_origen IS
    'Pago de préstamo que generó este egreso automáticamente. NULL en egresos capturados a mano.';

-- ---------------------------------------------------------------- 5. Informe
DO $$
DECLARE
    tarjetas_vinculadas   INTEGER;
    tarjetas_sin_egreso   INTEGER;
    prestamos_vinculados  INTEGER;
    prestamos_sin_egreso  INTEGER;
    egresos_sueltos       INTEGER;
BEGIN
    SELECT COUNT(*) INTO tarjetas_vinculadas
    FROM egresos WHERE id_pago_tarjeta_origen IS NOT NULL;

    SELECT COUNT(*) INTO tarjetas_sin_egreso
    FROM pagos_tarjetas pt
    WHERE NOT EXISTS (SELECT 1 FROM egresos e WHERE e.id_pago_tarjeta_origen = pt.id_pago);

    SELECT COUNT(*) INTO prestamos_vinculados
    FROM egresos WHERE id_pago_prestamo_origen IS NOT NULL;

    SELECT COUNT(*) INTO prestamos_sin_egreso
    FROM pagos_prestamos pp
    WHERE NOT EXISTS (SELECT 1 FROM egresos e WHERE e.id_pago_prestamo_origen = pp.id_pago);

    SELECT COUNT(*) INTO egresos_sueltos
    FROM egresos
    WHERE id_pago_tarjeta_origen IS NULL
      AND id_pago_prestamo_origen IS NULL
      AND (concepto LIKE 'Pago de tarjeta - %' OR concepto LIKE 'Pago de préstamo%');

    RAISE NOTICE '--- Migración 013 ---';
    RAISE NOTICE 'Egresos vinculados a un pago de tarjeta:  %', tarjetas_vinculadas;
    RAISE NOTICE 'Pagos de tarjeta sin egreso vinculado:    %', tarjetas_sin_egreso;
    RAISE NOTICE 'Egresos vinculados a un pago de préstamo: %', prestamos_vinculados;
    RAISE NOTICE 'Pagos de préstamo sin egreso vinculado:   %', prestamos_sin_egreso;
    RAISE NOTICE 'Egresos con aspecto de pago pero sueltos: %', egresos_sueltos;
    RAISE NOTICE '';
    RAISE NOTICE 'Las dos últimas cifras son residuo histórico esperable: egresos que';
    RAISE NOTICE 'se editaron a mano y ya no casan, o pagos borrados en el pasado que';
    RAISE NOTICE 'dejaron su egreso huérfano. Si no son cero, revísalos con la consulta';
    RAISE NOTICE 'de verificación que acompaña a esta migración antes de tocar nada.';
END $$;

COMMIT;

-- Verificación posterior (ejecutar aparte si el informe mostró filas sueltas):
--
--   SELECT id_egreso, fecha_egreso, monto, concepto, descripcion
--   FROM egresos
--   WHERE id_pago_tarjeta_origen IS NULL
--     AND id_pago_prestamo_origen IS NULL
--     AND (concepto LIKE 'Pago de tarjeta - %' OR concepto LIKE 'Pago de préstamo%')
--   ORDER BY fecha_egreso DESC;
--
-- Esos egresos siguen funcionando como cualquier egreso capturado a mano; lo
-- único que pierden es el borrado en cascada cuando se elimina el pago.
