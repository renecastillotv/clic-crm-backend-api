# Script para iniciar API y CRM por separado

Write-Host "🚀 Iniciando API y CRM en ventanas separadas..." -ForegroundColor Cyan
Write-Host ""

# Obtener la ruta del script
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Iniciar API
Write-Host "📡 Iniciando API en http://localhost:3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot\packages\api'; pnpm dev" -WindowStyle Normal

# Esperar un poco
Start-Sleep -Seconds 2

# Iniciar CRM
Write-Host "💼 Iniciando CRM en http://localhost:3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot\apps\crm-frontend'; pnpm dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Servidores iniciados en ventanas separadas" -ForegroundColor Green
Write-Host ""
Write-Host "📋 URLs:" -ForegroundColor Cyan
Write-Host "   - API: http://localhost:3001" -ForegroundColor White
Write-Host "   - CRM: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Espera 10-15 segundos para que terminen de iniciar..." -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Para detener los servidores, cierra las ventanas de PowerShell" -ForegroundColor Gray
Write-Host ""














