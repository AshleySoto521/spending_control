-- Migración 021: un egreso o un pago solo puede ir a una tarjeta de su dueño
--
-- Problema que resuelve
-- ---------------------
-- El PUT de egresos guardaba el `id_tarjeta` recibido sin comprobar de quién
-- era la tarjeta. Como el trigger de saldo suma TODOS los egresos de una
-- tarjeta, sin mirar el usuario, cualquiera podía ligar un egreso propio a la
-- tarjeta de otra persona y subirle o bajarle la deuda, y además ver su nombre
-- y banco en su propio listado. La API ya lo comprueba; esta migración hace que
-- la base lo impida también, para que un descuido futuro en otro endpoint no
-- vuelva a abrir el agujero.
--
-- De paso corrige dos defectos que agravaban el anterior:
--
--   * Al cambiar un egreso de tarjeta, el trigger solo recalculaba la tarjeta
--     NUEVA; la anterior se quedaba con el saldo inflado para siempre.
--   * `egresos.monto` e `ingresos.monto` no tenían CHECK: se aceptaban importes
--     negativos y NaN (PostgreSQL admite 'NaN' en `numeric`, y además lo
--     considera mayor que cualquier número, así que `monto > 0` no lo frena).
--
-- El script es idempotente.

\c control_gastos;

-- El archivo está en UTF-8; sin esto psql lo reenvía con la página de códigos
-- de la consola de Windows y los textos con tilde se guardan deformados.
\encoding UTF8

BEGIN;

-- --------------------------------------- 1. Trigger de egresos: ambas tarjetas
--
-- Usa `recalcular_saldo_tarjeta` (migración 014), la misma fórmula que el
-- trigger de pagos, en lugar de su propia copia.
CREATE OR REPLACE FUNCTION actualizar_saldo_tarjeta()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.id_tarjeta IS DISTINCT FROM NEW.id_tarjeta THEN
        PERFORM recalcular_saldo_tarjeta(OLD.id_tarjeta);
    END IF;

    PERFORM recalcular_saldo_tarjeta(NEW.id_tarjeta);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION actualizar_saldo_tarjeta_delete()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalcular_saldo_tarjeta(OLD.id_tarjeta);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------- 2. Desligar los egresos cruzados que haya
--
-- Si alguien llegó a explotar el fallo, sus egresos apuntan a una tarjeta
-- ajena. Se desligan (el egreso sigue existiendo para su dueño) y el trigger
-- del paso 1 recalcula la tarjeta de la víctima.
DO $$
DECLARE
    cruzado RECORD;
    total INTEGER := 0;
BEGIN
    FOR cruzado IN
        SELECT e.id_egreso, e.id_usuario AS usuario_egreso,
               t.id_tarjeta, t.id_usuario AS usuario_tarjeta
        FROM egresos e
        JOIN tarjetas t ON t.id_tarjeta = e.id_tarjeta
        WHERE e.id_usuario <> t.id_usuario
    LOOP
        RAISE WARNING 'Egreso % de % apuntaba a la tarjeta % de %: desligado',
            cruzado.id_egreso, cruzado.usuario_egreso,
            cruzado.id_tarjeta, cruzado.usuario_tarjeta;
        UPDATE egresos SET id_tarjeta = NULL WHERE id_egreso = cruzado.id_egreso;
        total := total + 1;
    END LOOP;

    RAISE NOTICE 'Egresos ligados a una tarjeta ajena: %', total;
END $$;

-- Los pagos de tarjeta no pueden quedarse sin tarjeta (NOT NULL), así que si
-- aparece alguno cruzado se aborta para que una persona decida qué hacer.
DO $$
DECLARE
    cruzados INTEGER;
BEGIN
    SELECT COUNT(*) INTO cruzados
    FROM pagos_tarjetas p
    JOIN tarjetas t ON t.id_tarjeta = p.id_tarjeta
    WHERE p.id_usuario <> t.id_usuario;

    IF cruzados > 0 THEN
        RAISE EXCEPTION
            'Hay % pagos_tarjetas ligados a una tarjeta de otro usuario. Revísalos antes de continuar.',
            cruzados;
    END IF;
END $$;

-- ------------------------------------------- 3. Claves foráneas compuestas
--
-- Exigen que (id_tarjeta, id_usuario) del egreso o del pago exista en
-- `tarjetas`, es decir, que la tarjeta sea del mismo usuario. Con
-- `id_tarjeta` NULL no se comprueban (MATCH SIMPLE), que es lo que se quiere
-- para los egresos en efectivo. Las claves sencillas que ya había se
-- conservan, con su comportamiento al borrar.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tarjetas_id_usuario
    ON tarjetas (id_tarjeta, id_usuario);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_egresos_tarjeta_mismo_usuario'
    ) THEN
        ALTER TABLE egresos
            ADD CONSTRAINT fk_egresos_tarjeta_mismo_usuario
            FOREIGN KEY (id_tarjeta, id_usuario)
            REFERENCES tarjetas (id_tarjeta, id_usuario);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_pagos_tarjetas_mismo_usuario'
    ) THEN
        ALTER TABLE pagos_tarjetas
            ADD CONSTRAINT fk_pagos_tarjetas_mismo_usuario
            FOREIGN KEY (id_tarjeta, id_usuario)
            REFERENCES tarjetas (id_tarjeta, id_usuario) ON DELETE CASCADE;
    END IF;
END $$;

-- ------------------------------------------------------ 4. Importes válidos
--
-- Se crean NOT VALID para que la migración no falle si ya hay filas
-- incorrectas: a partir de aquí ninguna fila nueva o editada puede romperlos.
-- Después se intenta validar lo existente y, si no se puede, se avisa.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_egresos_monto_positivo') THEN
        ALTER TABLE egresos
            ADD CONSTRAINT chk_egresos_monto_positivo
            CHECK (monto > 0 AND monto <> 'NaN') NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_egresos_monto_mensual') THEN
        ALTER TABLE egresos
            ADD CONSTRAINT chk_egresos_monto_mensual
            CHECK (monto_mensual IS NULL OR (monto_mensual > 0 AND monto_mensual <> 'NaN')) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ingresos_monto_positivo') THEN
        ALTER TABLE ingresos
            ADD CONSTRAINT chk_ingresos_monto_positivo
            CHECK (monto > 0 AND monto <> 'NaN') NOT VALID;
    END IF;
END $$;

DO $$
DECLARE
    restriccion TEXT;
    tabla TEXT;
BEGIN
    FOR tabla, restriccion IN
        VALUES ('egresos', 'chk_egresos_monto_positivo'),
               ('egresos', 'chk_egresos_monto_mensual'),
               ('ingresos', 'chk_ingresos_monto_positivo')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', tabla, restriccion);
        EXCEPTION WHEN check_violation THEN
            RAISE WARNING
                '% tiene filas que no cumplen %. Corrígelas y ejecuta: ALTER TABLE % VALIDATE CONSTRAINT %;',
                tabla, restriccion, tabla, restriccion;
        END;
    END LOOP;
END $$;

-- ------------------------------------------- 5. Recálculo de todos los saldos
--
-- Pone al día las tarjetas que se quedaron con el saldo de un egreso que se
-- les movió a otra tarjeta.
DO $$
DECLARE
    tarjeta RECORD;
    desviadas INTEGER := 0;
    nuevo NUMERIC;
BEGIN
    FOR tarjeta IN SELECT id_tarjeta, saldo_usado FROM tarjetas LOOP
        PERFORM recalcular_saldo_tarjeta(tarjeta.id_tarjeta);
        SELECT saldo_usado INTO nuevo FROM tarjetas WHERE id_tarjeta = tarjeta.id_tarjeta;

        IF COALESCE(tarjeta.saldo_usado, 0) <> COALESCE(nuevo, 0) THEN
            desviadas := desviadas + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '--- Migración 021: % tarjetas con el saldo corregido ---', desviadas;
END $$;

COMMIT;
