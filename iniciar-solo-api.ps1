# Script para iniciar solo la API

Write-Host "📡 Iniciando API en http://localhost:3001..." -ForegroundColor Yellow
Write-Host ""

# Obtener la ruta del script
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Cambiar al directorio de la API
Set-Location "$scriptRoot\packages\api"

# Iniciar API
pnpm dev














