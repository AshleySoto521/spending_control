-- Migración: Agregar funcionalidad de pagos a tarjetas
-- Fecha: 2025-12-06
-- Descripción: Agrega tabla de pagos_tarjetas y triggers para actualizar saldo
\c control_gastos;
-- Crear tabla de pagos a tarjetas
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

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pagos_tarjetas_usuario ON pagos_tarjetas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_pagos_tarjetas_tarjeta ON pagos_tarjetas(id_tarjeta);
CREATE INDEX IF NOT EXISTS idx_pagos_tarjetas_fecha ON pagos_tarjetas(fecha_pago);

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

-- Crear triggers para actualizar saldo de tarjeta
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_pago_insert ON pagos_tarjetas;
CREATE TRIGGER trigger_actualizar_saldo_pago_insert
AFTER INSERT ON pagos_tarjetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_pago_tarjeta();

DROP TRIGGER IF EXISTS trigger_actualizar_saldo_pago_update ON pagos_tarjetas;
CREATE TRIGGER trigger_actualizar_saldo_pago_update
AFTER UPDATE ON pagos_tarjetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_pago_tarjeta();

DROP TRIGGER IF EXISTS trigger_actualizar_saldo_pago_delete ON pagos_tarjetas;
CREATE TRIGGER trigger_actualizar_saldo_pago_delete
AFTER DELETE ON pagos_tarjetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_pago_tarjeta();

-- Comentarios para documentación
COMMENT ON TABLE pagos_tarjetas IS 'Registro de pagos realizados a tarjetas de crédito/débito';
COMMENT ON COLUMN pagos_tarjetas.monto IS 'Monto del pago, debe ser positivo y reduce el saldo_usado de la tarjeta';
COMMENT ON COLUMN pagos_tarjetas.id_forma_pago IS 'Solo debe ser efectivo o transferencia, ya que debita del saldo actual';
