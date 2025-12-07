-- Script de creación de base de datos para Control de Gastos
---PostgreSQL Database Schema

-- Crear base de datos (ejecutar como superusuario)
CREATE DATABASE control_gastos;

-- Conectarse a la base de datos
\c control_gastos;

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    celular VARCHAR(10) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    es_admin BOOLEAN DEFAULT FALSE,
    token_recuperacion VARCHAR(255),
    token_expiracion TIMESTAMP,
    CHECK (celular IS NULL OR LENGTH(celular) = 10)
);

-- Tabla de catálogo de formas de pago
CREATE TABLE IF NOT EXISTS formas_pago (
    id_forma_pago SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT
);

-- Tabla de tarjetas de crédito/débito, departamentales y de servicios
CREATE TABLE IF NOT EXISTS tarjetas (
    id_tarjeta SERIAL PRIMARY KEY,
    id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    num_tarjeta VARCHAR(19) NOT NULL,  -- 13-19 dígitos para soportar bancarias y departamentales
    nom_tarjeta VARCHAR(100) NOT NULL,
    tipo_tarjeta VARCHAR(20) NOT NULL DEFAULT 'CREDITO',  -- 'CREDITO', 'DEBITO', 'DEPARTAMENTAL', 'SERVICIOS'
    clabe VARCHAR(18),
    banco VARCHAR(100),  -- Puede ser banco, tienda departamental o emisor (Amex, etc.)
    linea_credito DECIMAL(12, 2),  -- NULL para tarjetas de servicios (límite variable)
    saldo_usado DECIMAL(12, 2) DEFAULT 0,
    dia_corte INTEGER CHECK (dia_corte >= 1 AND dia_corte <= 31),
    dias_gracia INTEGER,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activa BOOLEAN DEFAULT TRUE,
    CHECK (LENGTH(num_tarjeta) >= 13 AND LENGTH(num_tarjeta) <= 19),
    CHECK (tipo_tarjeta IN ('CREDITO', 'DEBITO', 'DEPARTAMENTAL', 'SERVICIOS'))
);

-- Tabla de ingresos
CREATE TABLE IF NOT EXISTS ingresos (
    id_ingreso SERIAL PRIMARY KEY,
    id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo_ingreso VARCHAR(100) NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    id_forma_pago INTEGER REFERENCES formas_pago(id_forma_pago),
    fecha_ingreso DATE NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de egresos (gastos)
CREATE TABLE IF NOT EXISTS egresos (
    id_egreso SERIAL PRIMARY KEY,
    id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    fecha_egreso DATE NOT NULL,
    concepto VARCHAR(200) NOT NULL,
    establecimiento VARCHAR(200),
    monto DECIMAL(12, 2) NOT NULL,
    id_forma_pago INTEGER REFERENCES formas_pago(id_forma_pago),
    id_tarjeta INTEGER REFERENCES tarjetas(id_tarjeta),
    descripcion TEXT,
    -- Campos para compras a meses
    compra_meses BOOLEAN DEFAULT FALSE,
    num_meses INTEGER CHECK (num_meses IN (3, 6, 9, 12, 18, 24, 36, 48)),
    mes_inicio_pago INTEGER CHECK (mes_inicio_pago >= 0 AND mes_inicio_pago <= 12),
    monto_mensual DECIMAL(12, 2),
    meses_pagados INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pagos a tarjetas
CREATE TABLE IF NOT EXISTS pagos_tarjetas (
    id_pago SERIAL PRIMARY KEY,
    id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_tarjeta INTEGER NOT NULL REFERENCES tarjetas(id_tarjeta) ON DELETE CASCADE,
    fecha_pago DATE NOT NULL,
    monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
    id_forma_pago INTEGER NOT NULL REFERENCES formas_pago(id_forma_pago),
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_tarjetas_usuario ON tarjetas(id_usuario);
CREATE INDEX idx_ingresos_usuario ON ingresos(id_usuario);
CREATE INDEX idx_ingresos_fecha ON ingresos(fecha_ingreso);
CREATE INDEX idx_egresos_usuario ON egresos(id_usuario);
CREATE INDEX idx_egresos_fecha ON egresos(fecha_egreso);
CREATE INDEX idx_pagos_tarjetas_usuario ON pagos_tarjetas(id_usuario);
CREATE INDEX idx_pagos_tarjetas_tarjeta ON pagos_tarjetas(id_tarjeta);
CREATE INDEX idx_pagos_tarjetas_fecha ON pagos_tarjetas(fecha_pago);

-- Insertar datos iniciales de formas de pago
INSERT INTO formas_pago (tipo, descripcion) VALUES
    ('EFECTIVO', 'para pagos en efectivo'),
    ('TARJETA', 'para pagos realizados con tarjeta de crédito o débito'),
    ('TRANSFERENCIA', 'para pagos realizados con transferencia bancaria')
ON CONFLICT DO NOTHING;

-- Vista para el dashboard: resumen financiero por usuario
CREATE OR REPLACE VIEW v_resumen_financiero AS
SELECT
    u.id_usuario,
    u.nombre,
    u.email,
    COALESCE(SUM(i.monto), 0) as total_ingresos,
    COALESCE(SUM(e.monto), 0) as total_egresos,
    COALESCE(SUM(i.monto), 0) - COALESCE(SUM(e.monto), 0) as saldo_actual
FROM usuarios u
LEFT JOIN ingresos i ON u.id_usuario = i.id_usuario
LEFT JOIN egresos e ON u.id_usuario = e.id_usuario
GROUP BY u.id_usuario, u.nombre, u.email;

-- Vista para deuda total de tarjetas por usuario
CREATE OR REPLACE VIEW v_deuda_tarjetas AS
SELECT
    id_usuario,
    COUNT(*) as num_tarjetas,
    COALESCE(SUM(saldo_usado), 0) as deuda_total,
    COALESCE(SUM(linea_credito), 0) as credito_total,
    COALESCE(SUM(linea_credito - saldo_usado), 0) as credito_disponible
FROM tarjetas
WHERE activa = TRUE
GROUP BY id_usuario;

-- Vista para gastos más frecuentes por usuario
CREATE OR REPLACE VIEW v_gastos_frecuentes AS
SELECT
    id_usuario,
    concepto,
    COUNT(*) as frecuencia,
    SUM(monto) as total_gastado,
    AVG(monto) as promedio_gasto
FROM egresos
GROUP BY id_usuario, concepto
ORDER BY frecuencia DESC;

-- Vista para calcular el pago del periodo vencido de cada tarjeta
CREATE OR REPLACE VIEW v_pago_mensual_tarjetas AS
WITH fecha_calculo AS (
    SELECT
        t.id_tarjeta,
        t.id_usuario,
        t.nom_tarjeta,
        t.banco,
        t.dia_corte,
        t.dias_gracia,
        t.saldo_usado,
        -- Calcular el último corte que ya pasó
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                -- Si ya pasó el día de corte este mes, el último corte es de este mes
                make_date(
                    EXTRACT(YEAR FROM CURRENT_DATE)::int,
                    EXTRACT(MONTH FROM CURRENT_DATE)::int,
                    t.dia_corte
                )
            ELSE
                -- Si no ha llegado el día de corte, el último corte fue el mes pasado
                make_date(
                    EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                    EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::int,
                    t.dia_corte
                )
        END as ultimo_corte,
        -- Calcular el año y mes del corte anterior
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                -- El último corte es de este mes, así que el anterior es del mes pasado
                EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::int
            ELSE
                -- El último corte es del mes pasado, así que el anterior es de hace 2 meses
                EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '2 month'))::int
        END as year_corte_anterior,
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::int
            ELSE
                EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '2 month'))::int
        END as month_corte_anterior,
        -- Calcular el año y mes del próximo corte
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                -- El último corte es de este mes, así que el próximo es del mes siguiente
                EXTRACT(YEAR FROM (CURRENT_DATE + INTERVAL '1 month'))::int
            ELSE
                -- El último corte es del mes pasado, así que el próximo es de este mes
                EXTRACT(YEAR FROM CURRENT_DATE)::int
        END as year_proximo_corte,
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) >= t.dia_corte THEN
                EXTRACT(MONTH FROM (CURRENT_DATE + INTERVAL '1 month'))::int
            ELSE
                EXTRACT(MONTH FROM CURRENT_DATE)::int
        END as month_proximo_corte
    FROM tarjetas t
    WHERE t.activa = TRUE
)
SELECT
    fc.id_tarjeta,
    fc.id_usuario,
    fc.nom_tarjeta,
    fc.banco,
    fc.dia_corte,
    fc.dias_gracia,
    fc.saldo_usado as saldo_total,
    -- Último corte que pasó
    fc.ultimo_corte as fecha_ultimo_corte,
    -- Corte anterior (construido explícitamente con año y mes correcto)
    make_date(fc.year_corte_anterior, fc.month_corte_anterior, fc.dia_corte) as fecha_corte_anterior,
    -- Próximo corte (construido explícitamente con año y mes correcto)
    make_date(fc.year_proximo_corte, fc.month_proximo_corte, fc.dia_corte) as fecha_proximo_corte,
    -- Egresos normales del periodo vencido (entre corte anterior y último corte)
    COALESCE(SUM(
        CASE
            WHEN (e.compra_meses = FALSE OR e.compra_meses IS NULL)
            AND e.fecha_egreso > make_date(fc.year_corte_anterior, fc.month_corte_anterior, fc.dia_corte)
            AND e.fecha_egreso <= fc.ultimo_corte
            THEN e.monto
            ELSE 0
        END
    ), 0) as egresos_periodo,
    -- Suma de cuotas mensuales de MSI pendientes
    COALESCE(SUM(
        CASE
            WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses
            THEN e.monto_mensual
            ELSE 0
        END
    ), 0) as cuotas_msi_mensuales,
    -- Pago del periodo vencido = egresos del periodo + cuotas MSI mensuales
    COALESCE(SUM(
        CASE
            WHEN (e.compra_meses = FALSE OR e.compra_meses IS NULL)
            AND e.fecha_egreso > make_date(fc.year_corte_anterior, fc.month_corte_anterior, fc.dia_corte)
            AND e.fecha_egreso <= fc.ultimo_corte
            THEN e.monto
            ELSE 0
        END
    ), 0) + COALESCE(SUM(
        CASE
            WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses
            THEN e.monto_mensual
            ELSE 0
        END
    ), 0) as pago_periodo,
    -- Número de compras MSI activas
    COUNT(CASE WHEN e.compra_meses = TRUE AND e.meses_pagados < e.num_meses THEN 1 END) as num_compras_msi
FROM fecha_calculo fc
LEFT JOIN egresos e ON fc.id_tarjeta = e.id_tarjeta
GROUP BY fc.id_tarjeta, fc.nom_tarjeta, fc.banco, fc.dia_corte, fc.dias_gracia, fc.saldo_usado, fc.id_usuario, fc.ultimo_corte, fc.year_corte_anterior, fc.month_corte_anterior, fc.year_proximo_corte, fc.month_proximo_corte;

-- Vista para calcular cuotas MSI pendientes y próximas
CREATE OR REPLACE VIEW v_cuotas_msi AS
SELECT
    e.id_egreso,
    e.id_usuario,
    e.id_tarjeta,
    t.nom_tarjeta,
    t.banco,
    t.dia_corte,
    e.concepto,
    e.establecimiento,
    e.fecha_egreso,
    e.monto as monto_total,
    e.num_meses,
    e.mes_inicio_pago,
    e.monto_mensual,
    e.meses_pagados,
    -- Calcular cuántos meses han pasado desde la compra
    GREATEST(0,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.fecha_egreso))::INTEGER * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.fecha_egreso))::INTEGER -
        COALESCE(e.mes_inicio_pago, 0)
    ) as meses_transcurridos,
    -- Cuotas pendientes
    GREATEST(0, e.num_meses - COALESCE(e.meses_pagados, 0)) as cuotas_pendientes,
    -- Monto total pendiente
    e.monto_mensual * GREATEST(0, e.num_meses - COALESCE(e.meses_pagados, 0)) as monto_pendiente,
    -- Fecha estimada de próxima cuota (basada en día de corte)
    CASE
        WHEN e.meses_pagados >= e.num_meses THEN NULL
        WHEN EXTRACT(DAY FROM CURRENT_DATE) <= t.dia_corte THEN
            make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, t.dia_corte)
        ELSE
            make_date(
                EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month')::int,
                EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')::int,
                t.dia_corte
            )
    END as fecha_proxima_cuota,
    -- Estado de la cuota
    CASE
        WHEN e.meses_pagados >= e.num_meses THEN 'completado'
        WHEN e.meses_pagados < GREATEST(0,
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.fecha_egreso))::INTEGER * 12 +
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.fecha_egreso))::INTEGER -
            COALESCE(e.mes_inicio_pago, 0)
        ) THEN 'atrasado'
        ELSE 'al_corriente'
    END as estado
FROM egresos e
JOIN tarjetas t ON e.id_tarjeta = t.id_tarjeta
WHERE e.compra_meses = TRUE
    AND e.num_meses IS NOT NULL
    AND e.monto_mensual IS NOT NULL
    AND t.activa = TRUE;

-- Función para actualizar saldo usado de tarjetas automáticamente
CREATE OR REPLACE FUNCTION actualizar_saldo_tarjeta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_tarjeta IS NOT NULL THEN
        UPDATE tarjetas
        SET saldo_usado = (
            SELECT COALESCE(SUM(
                CASE
                    -- Para compras a meses, solo sumar las cuotas pendientes
                    WHEN e.compra_meses = TRUE THEN
                        e.monto_mensual * (e.num_meses - COALESCE(e.meses_pagados, 0))
                    -- Para compras normales, sumar el monto completo
                    ELSE
                        e.monto
                END
            ), 0)
            FROM egresos e
            WHERE e.id_tarjeta = NEW.id_tarjeta
        )
        WHERE id_tarjeta = NEW.id_tarjeta;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar saldo de tarjeta al insertar egreso
CREATE TRIGGER trigger_actualizar_saldo_insert
AFTER INSERT ON egresos
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_tarjeta();

-- Trigger para actualizar saldo de tarjeta al actualizar egreso
CREATE TRIGGER trigger_actualizar_saldo_update
AFTER UPDATE ON egresos
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_tarjeta();

-- Función para actualizar saldo de tarjeta al eliminar egreso
CREATE OR REPLACE FUNCTION actualizar_saldo_tarjeta_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.id_tarjeta IS NOT NULL THEN
        UPDATE tarjetas
        SET saldo_usado = (
            SELECT COALESCE(SUM(
                CASE
                    -- Para compras a meses, solo sumar las cuotas pendientes
                    WHEN e.compra_meses = TRUE THEN
                        e.monto_mensual * (e.num_meses - COALESCE(e.meses_pagados, 0))
                    -- Para compras normales, sumar el monto completo
                    ELSE
                        e.monto
                END
            ), 0)
            FROM egresos e
            WHERE e.id_tarjeta = OLD.id_tarjeta
        )
        WHERE id_tarjeta = OLD.id_tarjeta;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar saldo de tarjeta al eliminar egreso
CREATE TRIGGER trigger_actualizar_saldo_delete
AFTER DELETE ON egresos
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_tarjeta_delete();

-- Función para actualizar saldo usado de tarjetas cuando se registra un pago
CREATE OR REPLACE FUNCTION actualizar_saldo_pago_tarjeta()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Al eliminar un pago, aumenta el saldo usado
        UPDATE tarjetas
        SET saldo_usado = saldo_usado + OLD.monto
        WHERE id_tarjeta = OLD.id_tarjeta;
        RETURN OLD;
    ELSE
        -- Al insertar o actualizar un pago, disminuye el saldo usado
        IF TG_OP = 'UPDATE' THEN
            -- Primero revertir el pago anterior
            UPDATE tarjetas
            SET saldo_usado = saldo_usado + OLD.monto
            WHERE id_tarjeta = OLD.id_tarjeta;
        END IF;

        -- Aplicar el nuevo pago
        UPDATE tarjetas
        SET saldo_usado = GREATEST(saldo_usado - NEW.monto, 0)
        WHERE id_tarjeta = NEW.id_tarjeta;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar saldo de tarjeta al insertar pago
CREATE TRIGGER trigger_actualizar_saldo_pago_insert
AFTER INSERT ON pagos_tarjetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_pago_tarjeta();

-- Trigger para actualizar saldo de tarjeta al actualizar pago
CREATE TRIGGER trigger_actualizar_saldo_pago_update
AFTER UPDATE ON pagos_tarjetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_pago_tarjeta();

-- Trigger para actualizar saldo de tarjeta al eliminar pago
CREATE TRIGGER trigger_actualizar_saldo_pago_delete
AFTER DELETE ON pagos_tarjetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_pago_tarjeta();

-- Tabla de sesiones activas
CREATE TABLE IF NOT EXISTS sesiones (
    id_sesion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(45),  -- IPv4 o IPv6
    user_agent TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    activa BOOLEAN DEFAULT TRUE
);

-- Índices para sesiones
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(id_usuario);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones(token);
CREATE INDEX IF NOT EXISTS idx_sesiones_activa ON sesiones(activa);

-- Tabla de logs de seguridad
CREATE TABLE IF NOT EXISTS logs_seguridad (
    id_log SERIAL PRIMARY KEY,
    id_usuario UUID REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    tipo_evento VARCHAR(50) NOT NULL,  -- 'login_exitoso', 'login_fallido', 'logout', 'sesion_expirada', 'error'
    email VARCHAR(255),  -- Para registrar intentos fallidos aunque no exista el usuario
    ip_address VARCHAR(45),
    user_agent TEXT,
    detalles TEXT,
    fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_seguridad(id_usuario);
CREATE INDEX IF NOT EXISTS idx_logs_tipo ON logs_seguridad(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_logs_fecha ON logs_seguridad(fecha_evento);
CREATE INDEX IF NOT EXISTS idx_logs_email ON logs_seguridad(email);
