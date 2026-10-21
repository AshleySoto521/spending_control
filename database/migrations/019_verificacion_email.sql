-- Migración 019: verificación de correo electrónico
--
-- Hoy cualquiera puede registrarse con el correo de otra persona, y nadie
-- comprueba nunca que esa dirección sea suya. Eso causa tres problemas reales:
--
--   1. Quien se equivoca al teclear su correo se queda sin recuperación de
--      contraseña para siempre: el enlace va a una dirección que no controla.
--      La cuenta queda inaccesible en cuanto olvide la contraseña.
--   2. Se pueden enviar recordatorios a personas que nunca se registraron.
--   3. Alguien puede «ocupar» el correo de otra persona e impedirle darse de
--      alta, porque el email es único.
--
-- La verificación NO bloquea el uso de la aplicación. Se acaba de trabajar en
-- reducir la fricción del primer uso; obligar a salir al correo antes de poder
-- entrar iría en contra de eso. Lo que sí hace:
--
--   * Muestra un aviso hasta que se confirme.
--   * Impide que se envíen recordatorios a direcciones sin confirmar, que es
--      donde está el daño hacia terceros.
--
-- Los usuarios que ya existen se dan por verificados: llevan meses usando la
-- aplicación y pedirles ahora que confirmen sería ruido sin ganancia. La
-- verificación aplica de aquí en adelante.

\c control_gastos;

-- El archivo está en UTF-8; sin esto psql lo reenvía con la página de códigos
-- de la consola de Windows y los textos con tilde se guardan deformados.
\encoding UTF8

BEGIN;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT FALSE;

-- Se guarda la huella SHA-256, nunca el token, igual que en la recuperación de
-- contraseña: leer la tabla no debe permitir verificar cuentas ajenas.
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS token_verificacion VARCHAR(64);

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS token_verificacion_expira TIMESTAMP;

COMMENT ON COLUMN usuarios.email_verificado IS
    'TRUE cuando la persona confirmó su dirección desde el enlace del correo';
COMMENT ON COLUMN usuarios.token_verificacion IS
    'Huella SHA-256 (hex) del token de verificación, nunca el token en claro';

CREATE INDEX IF NOT EXISTS idx_usuarios_token_verificacion
    ON usuarios (token_verificacion)
    WHERE token_verificacion IS NOT NULL;

-- Los ya registrados quedan verificados: han estado usando la aplicación.
UPDATE usuarios
SET email_verificado = TRUE
WHERE email_verificado = FALSE;

DO $$
DECLARE
    total INTEGER;
BEGIN
    SELECT count(*) INTO total FROM usuarios WHERE email_verificado;
    RAISE NOTICE '--- Migración 019 ---';
    RAISE NOTICE '% usuarios existentes quedan marcados como verificados.', total;
    RAISE NOTICE 'La verificación se exigirá solo a los registros nuevos.';
END $$;

COMMIT;
