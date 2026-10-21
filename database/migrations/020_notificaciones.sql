-- Migración 020: centro de notificaciones dentro de la aplicación
--
-- La aplicación ya guarda el día de corte de cada tarjeta, sus días de gracia y
-- el día de pago de cada préstamo, y no se lo dice a nadie. Que se pase una
-- fecha de pago cuesta intereses y comisión: dinero real, no comodidad.
--
-- Estas notificaciones viven dentro de la aplicación, no en el correo. Un aviso
-- de «tu tarjeta corta mañana» por correo llega tarde por diseño para quien
-- revisa su bandeja dos veces por semana. El correo se reserva para lo que
-- tolera llegar con días de retraso: el recordatorio por inactividad.
--
-- La columna `clave` es lo que hace idempotente la generación: identifica el
-- aviso concreto («el corte de la tarjeta 13 de agosto de 2026»), de modo que
-- la tarea diaria puede correr todas las veces que haga falta sin duplicar
-- nada. Ese es el motivo del índice único.

\c control_gastos;

-- El archivo está en UTF-8; sin esto psql lo reenvía con la página de códigos
-- de la consola de Windows y los textos con tilde se guardan deformados.
\encoding UTF8

BEGIN;

CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo VARCHAR(40) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    cuerpo TEXT,
    -- Ruta interna a la que lleva al tocarla.
    enlace VARCHAR(200),
    -- Identidad del aviso, para no repetirlo. Ej.: 'corte:13:2026-08'
    clave VARCHAR(120) NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Un aviso por usuario y clave: la tarea diaria puede repetirse sin duplicar.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notificaciones_clave
    ON notificaciones (id_usuario, clave);

-- Consulta del panel: las de una persona, sin leer primero.
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario
    ON notificaciones (id_usuario, leida, fecha_creacion DESC);

COMMENT ON COLUMN notificaciones.clave IS
    'Identidad del aviso para evitar duplicados; ej. corte:13:2026-08';

DO $$
BEGIN
    RAISE NOTICE '--- Migración 020 ---';
    RAISE NOTICE 'Tabla de notificaciones creada.';
    RAISE NOTICE 'Los avisos se generan con la tarea diaria ya existente;';
    RAISE NOTICE 'no hace falta configurar nada más.';
END $$;

COMMIT;
