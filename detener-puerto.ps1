# Script para detener un proceso que está usando un puerto específico

param(
    [Parameter(Mandatory=$true)]
    [int]$Port
)

Write-Host "🔍 Buscando proceso en el puerto $Port..." -ForegroundColor Cyan

# Buscar el proceso que está usando el puerto
$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "📌 Proceso encontrado: PID $process" -ForegroundColor Yellow
    
    # Obtener información del proceso
    $processInfo = Get-Process -Id $process -ErrorAction SilentlyContinue
    if ($processInfo) {
        Write-Host "   Nombre: $($processInfo.ProcessName)" -ForegroundColor White
        Write-Host "   Ruta: $($processInfo.Path)" -ForegroundColor Gray
    }
    
    Write-Host ""
    $confirm = Read-Host "¿Deseas detener este proceso? (S/N)"
    
    if ($confirm -eq 'S' -or $confirm -eq 's' -or $confirm -eq 'Y' -or $confirm -eq 'y') {
        try {
            Stop-Process -Id $process -Force
            Write-Host "✅ Proceso detenido exitosamente" -ForegroundColor Green
        } catch {
            Write-Host "❌ Error al detener el proceso: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Operación cancelada" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️ No se encontró ningún proceso usando el puerto $Port" -ForegroundColor Gray
}














