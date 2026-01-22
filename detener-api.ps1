# Script para detener la API (puerto 3001)

Write-Host "🛑 Deteniendo API en puerto 3001..." -ForegroundColor Yellow
Write-Host ""

# Buscar el proceso que está usando el puerto 3001
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "📌 Proceso encontrado: PID $process" -ForegroundColor Yellow
    
    # Obtener información del proceso
    $processInfo = Get-Process -Id $process -ErrorAction SilentlyContinue
    if ($processInfo) {
        Write-Host "   Nombre: $($processInfo.ProcessName)" -ForegroundColor White
    }
    
    try {
        Stop-Process -Id $process -Force
        Write-Host "✅ API detenida exitosamente" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error al detener la API: $_" -ForegroundColor Red
        Write-Host "💡 Intenta ejecutar como administrador o detener el proceso manualmente" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️ No hay ningún proceso usando el puerto 3001" -ForegroundColor Gray
}

Write-Host ""














