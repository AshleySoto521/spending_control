-- Migración 014: recalcular el saldo de la tarjeta al registrar, editar o
-- borrar un pago
--
-- Problema que resuelve
-- ---------------------
-- La migración 009 eliminó los triggers de `pagos_tarjetas` y no los repuso.
-- Desde entonces el único que actualiza `tarjetas.saldo_usado` vive en
-- `egresos`, y su primera línea es:
--
--     IF NEW.id_tarjeta IS NOT NULL THEN ...
--
-- El egreso que la aplicación crea al registrar un pago de tarjeta se inserta
-- con `id_tarjeta` en NULL —a propósito: ese gasto no es una compra cargada a
-- la tarjeta, es dinero que sale de la cuenta—, así que el trigger se salta el
-- cálculo. Resultado: registrar o borrar un pago NO actualizaba el saldo. Solo
-- se corregía de rebote, la próxima vez que se tocara una compra de esa misma
-- tarjeta, momento en el que la fórmula (egresos − pagos) recogía de golpe
-- todos los pagos atrasados.
--
-- El comentario «el trigger se encargará de actualizar el saldo» que hay en los
-- endpoints de pagos llevaba desactualizado desde la 009.
--
-- Se resuelve con un trigger en `pagos_tarjetas`, y no recalculando desde el
-- código, para que el saldo quede correcto aunque alguien inserte o borre un
-- pago desde fuera de la aplicación (una consulta manual, un script de
-- importación).
--
-- El script es idempotente.

\c control_gastos;

-- El archivo está en UTF-8; sin esto psql lo reenvía con la página de códigos
-- de la consola de Windows y los textos con tilde se guardan deformados.
\encoding UTF8

BEGIN;

-- ------------------------------------------------ 1. Cálculo en un solo sitio
--
-- Misma fórmula que usan los triggers de `egresos` desde la 009: total de
-- compras (contando solo las cuotas pendientes en las compras a meses) menos
-- el total de pagos. Extraerla a una función evita que las dos copias se
-- separen con el tiempo.
CREATE OR REPLACE FUNCTION recalcular_saldo_tarjeta(p_id_tarjeta INTEGER)
RETURNS void AS $$
BEGIN
    IF p_id_tarjeta IS NULL THEN
        RETURN;
    END IF;

    UPDATE tarjetas t
    SET saldo_usado = COALESCE((
            SELECT SUM(
                CASE
                    WHEN e.compra_meses = TRUE
                        THEN e.monto_mensual * (e.num_meses - COALESCE(e.meses_pagados, 0))
                    ELSE e.monto
                END
            )
            FROM egresos e
            WHERE e.id_tarjeta = p_id_tarjeta
        ), 0)
        - COALESCE((
            SELECT SUM(p.monto)
            FROM pagos_tarjetas p
            WHERE p.id_tarjeta = p_id_tarjeta
        ), 0)
    WHERE t.id_tarjeta = p_id_tarjeta;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------- 2. Trigger de pagos
--
-- AFTER, igual que los de `egresos`: la fila tiene que estar ya escrita para
-- que la suma la incluya. En un UPDATE que cambie de tarjeta hay que recalcular
-- las dos, la que pierde el pago y la que lo recibe.
CREATE OR REPLACE FUNCTION actualizar_saldo_por_pago()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM recalcular_saldo_tarjeta(OLD.id_tarjeta);
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.id_tarjeta IS DISTINCT FROM NEW.id_tarjeta THEN
        PERFORM recalcular_saldo_tarjeta(OLD.id_tarjeta);
    END IF;

    PERFORM recalcular_saldo_tarjeta(NEW.id_tarjeta);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_saldo_pago_insert ON pagos_tarjetas;
CREATE TRIGGER trigger_saldo_pago_insert
AFTER INSERT ON pagos_tarjetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_por_pago();

DROP TRIGGER IF EXISTS trigger_saldo_pago_update ON pagos_tarjetas;
CREATE TRIGGER trigger_saldo_pago_update
AFTER UPDATE ON pagos_tarjetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_por_pago();

DROP TRIGGER IF EXISTS trigger_saldo_pago_delete ON pagos_tarjetas;
CREATE TRIGGER trigger_saldo_pago_delete
AFTER DELETE ON pagos_tarjetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_por_pago();

-- ------------------------------------------- 3. Recálculo de todos los saldos
--
-- Pone al día lo que quedó desfasado durante el tiempo que no hubo trigger.
-- Igual que hizo la 009 en su momento.
DO $$
DECLARE
    tarjeta RECORD;
    desviadas INTEGER := 0;
    anterior NUMERIC;
    nuevo NUMERIC;
BEGIN
    FOR tarjeta IN SELECT id_tarjeta, nom_tarjeta, saldo_usado FROM tarjetas LOOP
        anterior := tarjeta.saldo_usado;
        PERFORM recalcular_saldo_tarjeta(tarjeta.id_tarjeta);
        SELECT saldo_usado INTO nuevo FROM tarjetas WHERE id_tarjeta = tarjeta.id_tarjeta;

        IF COALESCE(anterior, 0) <> COALESCE(nuevo, 0) THEN
            desviadas := desviadas + 1;
            RAISE NOTICE 'Corregida %: % -> %', tarjeta.nom_tarjeta, anterior, nuevo;
        END IF;
    END LOOP;

    RAISE NOTICE '--- Migración 014: % tarjetas corregidas ---', desviadas;
    RAISE NOTICE 'Un saldo negativo NO es un fallo del cálculo: significa que hay';
    RAISE NOTICE 'pagos registrados sin las compras que los originaron. Revisa esas';
    RAISE NOTICE 'tarjetas antes de dar por buena la cifra.';
END $$;

COMMIT;
