-- Migración: Agregar tabla de préstamos
-- Fecha: 2025-12-10
-- Descripción: Tabla para gestionar préstamos personales, automotrices e hipotecarios
\c control_gastos;
-- Tabla de préstamos
CREATE TABLE IF NOT EXISTS prestamos (
    id_prestamo SERIAL PRIMARY KEY,
    id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo_prestamo VARCHAR(20) NOT NULL,  -- 'PERSONAL', 'AUTOMOTRIZ', 'HIPOTECARIO'
    institucion VARCHAR(200) NOT NULL,    -- Banco o institución que otorga el préstamo
    monto_original DECIMAL(12, 2) NOT NULL,  -- Monto total del préstamo
    tasa_interes DECIMAL(5, 2),           -- Tasa de interés anual (opcional)
    plazo_meses INTEGER NOT NULL,         -- Plazo total en meses
    pago_mensual DECIMAL(12, 2) NOT NULL, -- Monto del pago mensual
    dia_pago INTEGER NOT NULL,            -- Día del mes para pagar (1-31)
    fecha_inicio DATE NOT NULL,           -- Fecha de inicio del préstamo
    descripcion TEXT,                     -- Propósito o detalles del préstamo
    activo BOOLEAN DEFAULT TRUE,          -- Si el préstamo está activo o ya fue pagado
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (tipo_prestamo IN ('PERSONAL', 'AUTOMOTRIZ', 'HIPOTECARIO')),
    CHECK (dia_pago >= 1 AND dia_pago <= 31),
    CHECK (monto_original > 0),
    CHECK (pago_mensual > 0),
    CHECK (plazo_meses > 0)
);

-- Tabla de pagos de préstamos
CREATE TABLE IF NOT EXISTS pagos_prestamos (
    id_pago SERIAL PRIMARY KEY,
    id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_prestamo INTEGER NOT NULL REFERENCES prestamos(id_prestamo) ON DELETE CASCADE,
    fecha_pago DATE NOT NULL,
    monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
    id_forma_pago INTEGER NOT NULL REFERENCES formas_pago(id_forma_pago),
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_prestamos_usuario ON prestamos(id_usuario);
CREATE INDEX idx_prestamos_activo ON prestamos(activo);
CREATE INDEX idx_pagos_prestamos_usuario ON pagos_prestamos(id_usuario);
CREATE INDEX idx_pagos_prestamos_prestamo ON pagos_prestamos(id_prestamo);

-- Comentarios
COMMENT ON TABLE prestamos IS 'Tabla para gestionar préstamos personales, automotrices e hipotecarios';
COMMENT ON COLUMN prestamos.tipo_prestamo IS 'Tipo de préstamo: PERSONAL, AUTOMOTRIZ, HIPOTECARIO';
COMMENT ON COLUMN prestamos.monto_original IS 'Monto total del préstamo otorgado';
COMMENT ON COLUMN prestamos.tasa_interes IS 'Tasa de interés anual en porcentaje';
COMMENT ON COLUMN prestamos.plazo_meses IS 'Plazo total del préstamo en meses';
COMMENT ON COLUMN prestamos.pago_mensual IS 'Monto fijo mensual a pagar';
COMMENT ON COLUMN prestamos.dia_pago IS 'Día del mes para realizar el pago';
COMMENT ON COLUMN prestamos.activo IS 'TRUE si el préstamo está activo, FALSE si ya fue liquidado';

COMMENT ON TABLE pagos_prestamos IS 'Tabla para registrar los pagos realizados a préstamos';
