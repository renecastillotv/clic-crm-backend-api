# Script para iniciar todos los servidores

Write-Host "🚀 Iniciando servidores..." -ForegroundColor Cyan
Write-Host ""

# Iniciar API (ya debería estar corriendo)
Write-Host "📡 API: http://localhost:3001" -ForegroundColor Yellow
Write-Host "   (Ya debería estar corriendo)" -ForegroundColor Gray

# Iniciar Web Astro
Write-Host ""
Write-Host "🌐 Iniciando Web Astro en http://localhost:4321..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\web'; pnpm dev" -WindowStyle Normal

# Esperar un poco
Start-Sleep -Seconds 3

# Iniciar CRM
Write-Host "💼 Iniciando CRM en http://localhost:3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\crm-frontend'; pnpm dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Servidores iniciados en ventanas separadas" -ForegroundColor Green
Write-Host ""
Write-Host "📋 URLs:" -ForegroundColor Cyan
Write-Host "   - API: http://localhost:3001" -ForegroundColor White
Write-Host "   - Web Astro: http://localhost:4321" -ForegroundColor White
Write-Host "   - CRM: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Espera 10-15 segundos para que terminen de iniciar..." -ForegroundColor Yellow
Write-Host ""



