-- Migración 018: normalizar los textos escritos a mano
--
-- En la base conviven valores que parecen iguales y no lo son:
--
--   «BBVA » con espacio final junto a «BBVA»
--   «Mercado Libre » junto a «Mercado pago »
--   «Aránzazu  del Rayo» con doble espacio interior
--   «José Díaz », «Fernando », «Rebeca Hernández »… con espacio final
--
-- Eso rompe agrupaciones y ordenaciones, impide detectar duplicados, y ya
-- provocó una vez que fallara la exportación a Excel por nombres de hoja
-- repetidos.
--
-- Este script recorta los extremos y colapsa los espacios interiores. NO toca
-- mayúsculas ni acentos: «NU BANK» y «Banco NU» seguirán siendo distintos,
-- porque decidir cuál es el bueno es criterio de cada persona, no del script.
--
-- No destruye información: solo elimina espacios sobrantes. Es idempotente.

\c control_gastos;

-- El archivo está en UTF-8; sin esto psql lo reenvía con la página de códigos
-- de la consola de Windows y los textos con tilde se guardan deformados.
\encoding UTF8

BEGIN;

UPDATE usuarios
SET nombre = regexp_replace(btrim(nombre), '\s+', ' ', 'g')
WHERE nombre IS DISTINCT FROM regexp_replace(btrim(nombre), '\s+', ' ', 'g');

UPDATE tarjetas
SET nom_tarjeta = regexp_replace(btrim(nom_tarjeta), '\s+', ' ', 'g')
WHERE nom_tarjeta IS DISTINCT FROM regexp_replace(btrim(nom_tarjeta), '\s+', ' ', 'g');

UPDATE tarjetas
SET banco = NULLIF(regexp_replace(btrim(banco), '\s+', ' ', 'g'), '')
WHERE banco IS NOT NULL
  AND banco IS DISTINCT FROM NULLIF(regexp_replace(btrim(banco), '\s+', ' ', 'g'), '');

UPDATE egresos
SET concepto = regexp_replace(btrim(concepto), '\s+', ' ', 'g')
WHERE concepto IS DISTINCT FROM regexp_replace(btrim(concepto), '\s+', ' ', 'g');

UPDATE egresos
SET establecimiento = NULLIF(regexp_replace(btrim(establecimiento), '\s+', ' ', 'g'), '')
WHERE establecimiento IS NOT NULL
  AND establecimiento IS DISTINCT FROM NULLIF(regexp_replace(btrim(establecimiento), '\s+', ' ', 'g'), '');

UPDATE prestamos
SET institucion = regexp_replace(btrim(institucion), '\s+', ' ', 'g')
WHERE institucion IS DISTINCT FROM regexp_replace(btrim(institucion), '\s+', ' ', 'g');

-- Informe: tras la limpieza, qué duplicados quedan a la vista.
DO $$
DECLARE
    duplicados INTEGER;
    vacias INTEGER;
BEGIN
    -- Se agrupa por los últimos dígitos, no por el nombre: un mismo banco
    -- reparte varios productos (BBVA Azul y BBVA Oro son tarjetas distintas),
    -- así que coincidir en nombre y banco no prueba nada, mientras que coincidir
    -- en los cuatro dígitos sí apunta a la misma tarjeta física.
    SELECT COALESCE(SUM(repetidas - 1), 0) INTO duplicados
    FROM (
        SELECT COUNT(*) AS repetidas
        FROM tarjetas
        WHERE num_tarjeta IS NOT NULL
        GROUP BY id_usuario, num_tarjeta
        HAVING COUNT(*) > 1
    ) d;

    SELECT COUNT(*) INTO vacias
    FROM tarjetas t
    WHERE NOT EXISTS (SELECT 1 FROM egresos e WHERE e.id_tarjeta = t.id_tarjeta)
      AND NOT EXISTS (SELECT 1 FROM pagos_tarjetas p WHERE p.id_tarjeta = t.id_tarjeta);

    RAISE NOTICE '--- Migración 018 ---';
    RAISE NOTICE 'Textos normalizados.';
    RAISE NOTICE 'Tarjetas que repiten los últimos dígitos del mismo usuario: %', duplicados;
    RAISE NOTICE 'Tarjetas sin ningún movimiento: %', vacias;
    RAISE NOTICE '';
    RAISE NOTICE 'Esas no se tocan desde aquí: son de usuarios distintos y solo';
    RAISE NOTICE 'cada quien sabe cuáles sobran. Las vacías ya se pueden borrar';
    RAISE NOTICE 'desde la propia aplicación.';
END $$;

COMMIT;

-- Para revisar los duplicados que quedan (ejecutar aparte):
--
--   SELECT u.email, t.num_tarjeta AS ultimos_digitos,
--          string_agg(t.nom_tarjeta || ' (' || COALESCE(t.banco,'sin banco') || ')', ' | ') AS fichas
--   FROM tarjetas t JOIN usuarios u USING (id_usuario)
--   WHERE t.num_tarjeta IS NOT NULL
--   GROUP BY u.email, t.num_tarjeta
--   HAVING COUNT(*) > 1
--   ORDER BY u.email;
--
-- Las tarjetas sin dígitos guardados no aparecen aquí: no hay forma de saber si
-- «Nu» y «Nu» son la misma tarjeta o dos productos distintos del mismo banco.
-- Esas hay que mirarlas a ojo con:
--
--   SELECT u.email, t.id_tarjeta, t.nom_tarjeta, t.banco
--   FROM tarjetas t JOIN usuarios u USING (id_usuario)
--   WHERE t.num_tarjeta IS NULL ORDER BY u.email, t.nom_tarjeta;
