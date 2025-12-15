# Script para detener procesos que usan el puerto 3001

Write-Host "🔍 Buscando procesos en el puerto 3001..." -ForegroundColor Cyan
Write-Host ""

# Obtener procesos que usan el puerto 3001
$connections = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    
    foreach ($pid in $pids) {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "🛑 Deteniendo proceso: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force
            Write-Host "✅ Proceso detenido" -ForegroundColor Green
        }
    }
} else {
    Write-Host "ℹ️ No se encontraron procesos usando el puerto 3001" -ForegroundColor Gray
}

Write-Host ""
Write-Host "💡 Ahora puedes iniciar la API nuevamente" -ForegroundColor Cyan

