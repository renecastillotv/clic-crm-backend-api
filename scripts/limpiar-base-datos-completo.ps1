# Script completo para limpiar la base de datos de componentes
$API_URL = "http://localhost:3001/api"
$tenantId = "9763dd67-1b33-40b1-ae78-73e5bcafc2b7"
$paginaId = "2c496765-3d0d-43e1-9a8a-308acb728602"

Write-Host "Limpieza Completa de Base de Datos" -ForegroundColor Cyan
Write-Host ""

function NormalizarDatos {
    param([object]$datos)
    
    if (-not $datos) {
        return @{ static_data = @{} }
    }
    
    if ($datos -is [Array] -and $datos.Count -gt 0) {
        $datos = $datos[0]
    }
    
    if ($datos.static_data) {
        $result = @{ static_data = $datos.static_data }
        if ($datos.dynamic_data) { $result.dynamic_data = $datos.dynamic_data }
        if ($datos.styles) { $result.styles = $datos.styles }
        if ($datos.toggles) { $result.toggles = $datos.toggles }
        return $result
    }
    
    $staticData = @{}
    $toggles = @{}
    $styles = @{}
    
    $staticFields = @('titulo', 'subtitulo', 'descripcion', 'textoBoton', 'textoCopyright', 'urlBoton', 'imagenFondo', 'logo', 'telefono', 'email', 'direccion', 'placeholder', 'itemsPorPagina', 'features')
    $toggleFields = @('mostrarPrecio', 'mostrarFiltros', 'mostrarMenu', 'mostrarBusqueda', 'mostrarTelefono', 'mostrarEmail', 'mostrarMensaje', 'mostrarAutor', 'mostrarFecha', 'mostrarResumen', 'mostrarCaracteristicas', 'mostrarUbicacion', 'mostrarTotal')
    
    $datos.PSObject.Properties | ForEach-Object {
        $key = $_.Name
        $value = $_.Value
        
        if ($staticFields -contains $key) {
            $staticData[$key] = $value
        } elseif ($toggleFields -contains $key) {
            $toggles[$key] = [bool]$value
        } elseif ($key -eq 'styles' -and $value -is [PSCustomObject]) {
            $styles = $value
        }
    }
    
    $result = @{ static_data = $staticData }
    if ($toggles.Count -gt 0) { $result.toggles = $toggles }
    if ($styles.Count -gt 0) { $result.styles = $styles }
    if ($datos.dynamic_data) { $result.dynamic_data = $datos.dynamic_data }
    
    return $result
}

try {
    Write-Host "Obteniendo componentes..." -ForegroundColor Yellow
    $componentes = Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes?todos=true"
    Write-Host "Total: $($componentes.Count)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Identificando duplicados..." -ForegroundColor Yellow
    $idsAEliminar = @()
    $idsACorregir = @()
    
    $grupos = $componentes | Group-Object { "$($_.tipo)-$($_.paginaId)" }
    
    foreach ($grupo in $grupos) {
        $componentesGrupo = $grupo.Group | Sort-Object -Property @{
            Expression = {
                $score = 0
                if ($_.predeterminado -and $_.activo) { $score += 4 }
                if ($_.activo) { $score += 2 }
                if ($_.predeterminado) { $score += 1 }
                return -$score
            }
        }, orden
        
        if ($componentesGrupo.Count -gt 1) {
            Write-Host "Tipo: $($grupo.Name) - $($componentesGrupo.Count) componentes" -ForegroundColor Gray
            
            $mantener = $componentesGrupo[0]
            
            $datosNormalizados = NormalizarDatos $mantener.datos
            $necesitaCorreccion = (-not $mantener.datos.static_data) -or ($mantener.datos -is [Array])
            
            if ($necesitaCorreccion) {
                Write-Host "  Componente a mantener necesita correccion" -ForegroundColor Yellow
                $idsACorregir += @{
                    id = $mantener.id
                    datos = $datosNormalizados
                    componente = $mantener
                }
            }
            
            foreach ($comp in $componentesGrupo[1..($componentesGrupo.Count-1)]) {
                $idsAEliminar += $comp.id
            }
        } else {
            $comp = $componentesGrupo[0]
            $datosNormalizados = NormalizarDatos $comp.datos
            $necesitaCorreccion = (-not $comp.datos.static_data) -or ($comp.datos -is [Array])
            
            if ($necesitaCorreccion) {
                Write-Host "Tipo: $($grupo.Name) - necesita correccion" -ForegroundColor Yellow
                $idsACorregir += @{
                    id = $comp.id
                    datos = $datosNormalizados
                    componente = $comp
                }
            }
        }
    }
    
    Write-Host ""
    Write-Host "Resumen:" -ForegroundColor Cyan
    Write-Host "Componentes a eliminar: $($idsAEliminar.Count)" -ForegroundColor $(if ($idsAEliminar.Count -gt 0) { "Red" } else { "Green" })
    Write-Host "Componentes a corregir: $($idsACorregir.Count)" -ForegroundColor $(if ($idsACorregir.Count -gt 0) { "Yellow" } else { "Green" })
    
    if ($idsAEliminar.Count -eq 0 -and $idsACorregir.Count -eq 0) {
        Write-Host ""
        Write-Host "Base de datos limpia" -ForegroundColor Green
        exit 0
    }
    
    Write-Host ""
    Write-Host "Iniciando limpieza automatica..." -ForegroundColor Cyan
    
    if ($idsACorregir.Count -gt 0) {
        Write-Host ""
        Write-Host "Corrigiendo componentes..." -ForegroundColor Yellow
        $corregidos = 0
        foreach ($item in $idsACorregir) {
            try {
                $comp = $item.componente
                $compActualizado = @{
                    id = $comp.id
                    tipo = $comp.tipo
                    variante = $comp.variante
                    datos = $item.datos
                    activo = $comp.activo
                    orden = $comp.orden
                    paginaId = $comp.paginaId
                    predeterminado = $comp.predeterminado
                } | ConvertTo-Json -Depth 10
                
                Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes/$($comp.id)" -Method Put -Body $compActualizado -ContentType "application/json" | Out-Null
                $corregidos++
                Write-Host "Corregido: $($comp.tipo)" -ForegroundColor Green
            } catch {
                Write-Host "Error al corregir: $_" -ForegroundColor Red
            }
        }
        Write-Host "$corregidos componentes corregidos" -ForegroundColor Green
    }
    
    if ($idsAEliminar.Count -gt 0) {
        Write-Host ""
        Write-Host "Eliminando componentes duplicados..." -ForegroundColor Yellow
        $eliminados = 0
        foreach ($id in $idsAEliminar) {
            try {
                Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes/$id" -Method Delete | Out-Null
                $eliminados++
            } catch {
                Write-Host "Error al eliminar $id : $_" -ForegroundColor Red
            }
        }
        Write-Host "$eliminados componentes eliminados" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Limpieza completada!" -ForegroundColor Green
    $componentesFinal = Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes?todos=true"
    Write-Host "Componentes restantes: $($componentesFinal.Count)" -ForegroundColor White
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
