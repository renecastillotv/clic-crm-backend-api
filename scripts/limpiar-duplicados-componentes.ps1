# Script para limpiar componentes duplicados de la homepage
$API_URL = "http://localhost:3001/api"
$tenantId = "9763dd67-1b33-40b1-ae78-73e5bcafc2b7"
$paginaId = "2c496765-3d0d-43e1-9a8a-308acb728602"

Write-Host "Limpiando componentes duplicados..." -ForegroundColor Cyan

try {
    # Obtener todos los componentes
    $componentes = Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes?todos=true"
    
    # Filtrar solo los de esta página
    $dePagina = $componentes | Where-Object { $_.paginaId -eq $paginaId }
    
    Write-Host "Componentes de la página encontrados: $($dePagina.Count)" -ForegroundColor Yellow
    
    # Agrupar por tipo
    $porTipo = $dePagina | Group-Object tipo
    
    $idsAEliminar = @()
    
    foreach ($grupo in $porTipo) {
        $tipo = $grupo.Name
        $componentesTipo = $grupo.Group
        
        if ($componentesTipo.Count -gt 1) {
            Write-Host "  Tipo $tipo tiene $($componentesTipo.Count) componentes" -ForegroundColor Yellow
            
            # Ordenar por prioridad: predeterminado activo > activo > predeterminado > otro
            $ordenados = $componentesTipo | Sort-Object -Property @{
                Expression = {
                    $score = 0
                    if ($_.predeterminado -and $_.activo) { $score += 4 }
                    if ($_.activo) { $score += 2 }
                    if ($_.predeterminado) { $score += 1 }
                    return -$score  # Negativo para orden descendente
                }
            }, orden
            
            # Mantener el primero (el mejor)
            $mantener = $ordenados[0]
            $eliminar = $ordenados[1..($ordenados.Count - 1)]
            
            Write-Host "    Mantener: $($mantener.id) (predeterminado: $($mantener.predeterminado), activo: $($mantener.activo))" -ForegroundColor Green
            
            foreach ($comp in $eliminar) {
                $idsAEliminar += $comp.id
                Write-Host "    Eliminar: $($comp.id)" -ForegroundColor Red
            }
        }
    }
    
    Write-Host ""
    Write-Host "Total de componentes a eliminar: $($idsAEliminar.Count)" -ForegroundColor Yellow
    
    if ($idsAEliminar.Count -gt 0) {
        $confirmar = Read-Host "¿Eliminar estos componentes? (s/n)"
        if ($confirmar -eq "s" -or $confirmar -eq "S") {
            $eliminados = 0
            foreach ($id in $idsAEliminar) {
                try {
                    Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes/$id" -Method Delete | Out-Null
                    $eliminados++
                    Write-Host "  Eliminado: $id" -ForegroundColor Green
                } catch {
                    Write-Host "  Error al eliminar $id : $_" -ForegroundColor Red
                }
            }
            Write-Host ""
            Write-Host "OK $eliminados componentes eliminados" -ForegroundColor Green
        } else {
            Write-Host "Cancelado" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No hay duplicados para eliminar" -ForegroundColor Green
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}


