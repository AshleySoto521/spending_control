-- Migración 017: dejar de guardar el número completo de las tarjetas
--
-- ⚠️  ESTA MIGRACIÓN DESTRUYE DATOS DE FORMA IRREVERSIBLE. Léela entera.
--
-- Qué pasa hoy
-- ------------
-- El alta de tarjeta exige el número completo, entre 13 y 19 dígitos, y lo
-- guarda en claro. Pero en toda la aplicación ese número se usa exactamente en
-- un sitio:
--
--     src/routes/tarjetas/+page.svelte:  **** **** **** {num_tarjeta.slice(-4)}
--
-- Es decir: se piden 16 dígitos para mostrar 4. Los otros 12 no se leen nunca.
--
-- Por qué importa
-- ---------------
-- 1. Responsabilidad. Guardar números de tarjeta completos convierte esta base
--    en un objetivo serio: una filtración deja de ser «se supieron mis gastos»
--    para pasar a «se pueden usar mis tarjetas». Los datos de tarjeta están
--    regulados (PCI-DSS) y su custodia exige controles que una aplicación
--    personal no tiene ni necesita tener.
--
-- 2. Registro de usuarios. Lo primero que la aplicación le pide a alguien que
--    acaba de darse de alta es el número completo de su tarjeta. Esa es
--    exactamente la señal que enseña cualquier campaña contra el fraude a
--    reconocer como phishing. De 32 personas registradas, 24 no llegaron a
--    crear nada; esta pantalla es la primera candidata a explicarlo.
--
-- Qué hace este script
-- --------------------
-- Recorta cada `num_tarjeta` a sus últimos 4 dígitos. Los dígitos anteriores
-- **se pierden y no se pueden recuperar**. Es intencionado: es justo el dato
-- que no debería estar ahí.
--
-- ANTES DE EJECUTARLO en producción, crea una rama en Neon (Branches → Create
-- branch) como red de seguridad. Si algo sale mal, la rama conserva el estado
-- anterior.

\c control_gastos;

-- El archivo está en UTF-8; sin esto psql lo reenvía con la página de códigos
-- de la consola de Windows y los textos con tilde se guardan deformados.
\encoding UTF8

BEGIN;

-- 1. Retirar el CHECK que exige 13-19 dígitos.
--    Se busca por definición y no por nombre: la restricción se declaró sin
--    nombre dentro del CREATE TABLE, así que PostgreSQL le puso uno automático
--    que puede variar entre instalaciones.
DO $$
DECLARE
    restriccion RECORD;
BEGIN
    FOR restriccion IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'tarjetas'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%num_tarjeta%'
    LOOP
        EXECUTE format('ALTER TABLE tarjetas DROP CONSTRAINT %I', restriccion.conname);
        RAISE NOTICE 'Retirada la restricción %', restriccion.conname;
    END LOOP;
END $$;

-- 2. Recortar a los últimos 4 dígitos. Aquí se pierden los demás.
UPDATE tarjetas
SET num_tarjeta = RIGHT(regexp_replace(num_tarjeta, '\D', '', 'g'), 4)
WHERE num_tarjeta IS NOT NULL
  AND LENGTH(regexp_replace(num_tarjeta, '\D', '', 'g')) > 4;

-- 3. El número pasa a ser opcional y de 4 dígitos como mucho.
ALTER TABLE tarjetas ALTER COLUMN num_tarjeta DROP NOT NULL;
ALTER TABLE tarjetas ALTER COLUMN num_tarjeta TYPE VARCHAR(4);

ALTER TABLE tarjetas
    ADD CONSTRAINT chk_tarjetas_ultimos_digitos
    CHECK (num_tarjeta IS NULL OR num_tarjeta ~ '^\d{1,4}$');

COMMENT ON COLUMN tarjetas.num_tarjeta IS
    'Solo los últimos dígitos, para reconocer la tarjeta. Nunca el número completo.';

-- 4. La CLABE queda a tu criterio.
--    Se pide en el alta, se valida a 18 dígitos, se guarda… y no se muestra en
--    ninguna pantalla. Es dato bancario sin ninguna función actual. Un CLABE no
--    es una credencial —se comparte para recibir transferencias— así que no lo
--    borro por mi cuenta. Si tampoco lo vas a usar, descomenta:
--
-- UPDATE tarjetas SET clabe = NULL WHERE clabe IS NOT NULL;

DO $$
DECLARE
    total INTEGER;
    con_numero INTEGER;
    con_clabe INTEGER;
BEGIN
    SELECT count(*), count(*) FILTER (WHERE num_tarjeta IS NOT NULL),
           count(*) FILTER (WHERE clabe IS NOT NULL)
    INTO total, con_numero, con_clabe
    FROM tarjetas;

    RAISE NOTICE '--- Migración 017 ---';
    RAISE NOTICE 'Tarjetas: %', total;
    RAISE NOTICE 'Con dígitos guardados (ahora solo los últimos 4): %', con_numero;
    RAISE NOTICE 'Con CLABE todavía almacenada: %', con_clabe;
    RAISE NOTICE '';
    RAISE NOTICE 'Los números completos ya no están en la base.';
END $$;

COMMIT;
