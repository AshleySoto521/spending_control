@echo off
echo ========================================
echo Migracion: Pagos de Tarjeta a Egresos
echo ========================================
echo.
echo Este script migrara todos los pagos de tarjeta existentes
echo a la tabla de egresos para reflejarlos en el dashboard.
echo.
echo Presiona cualquier tecla para continuar o Ctrl+C para cancelar...
pause > nul

echo.
echo Ejecutando migracion...
echo.

REM Ejecutar el script de migración
psql -h localhost -U postgres -d control_gastos -f migrations\005_migrate_pagos_tarjetas_to_egresos.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migracion completada exitosamente!
    echo ========================================
    echo.
    echo Los pagos de tarjeta ahora aparecen en:
    echo - Tabla de egresos
    echo - Dashboard de egresos
    echo - Reportes de gastos
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: La migracion fallo
    echo ========================================
    echo.
    echo Verifica:
    echo 1. PostgreSQL esta corriendo
    echo 2. Las credenciales son correctas
    echo 3. La base de datos 'control_gastos' existe
    echo.
)

pause
