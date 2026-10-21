-- Migración: Agregar tablas de sesiones y logs de seguridad
-- Fecha: 2024-12-07
-- Descripción: Agrega sistema de sesiones con expiración de 4 horas y logs de seguridad

\c control_gastos;

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

-- Función para limpiar sesiones expiradas automáticamente
CREATE OR REPLACE FUNCTION limpiar_sesiones_expiradas()
RETURNS void AS $$
BEGIN
    UPDATE sesiones
    SET activa = FALSE
    WHERE fecha_expiracion < CURRENT_TIMESTAMP AND activa = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE sesiones IS 'Tabla de sesiones activas con expiración de 4 horas';
COMMENT ON TABLE logs_seguridad IS 'Registro de eventos de seguridad: logins exitosos, fallidos, errores, etc.';
COMMENT ON COLUMN sesiones.fecha_expiracion IS 'Sesión válida por 4 horas desde la creación';
COMMENT ON COLUMN logs_seguridad.tipo_evento IS 'Tipos: login_exitoso, login_fallido, logout, sesion_expirada, sesion_invalidada, error';

COMMIT;
