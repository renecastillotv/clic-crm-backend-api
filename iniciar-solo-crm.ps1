# Script para iniciar solo el CRM

Write-Host "💼 Iniciando CRM en http://localhost:3000..." -ForegroundColor Yellow
Write-Host ""

# Obtener la ruta del script
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Cambiar al directorio del CRM
Set-Location "$scriptRoot\apps\crm-frontend"

# Iniciar CRM
pnpm dev














