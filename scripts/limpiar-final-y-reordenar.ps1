# Limpieza final y reordenamiento correcto
$API_URL = "http://localhost:3001/api"
$tenantId = "9763dd67-1b33-40b1-ae78-73e5bcafc2b7"
$paginaId = "2c496765-3d0d-43e1-9a8a-308acb728602"

Write-Host "Limpieza Final y Reordenamiento" -ForegroundColor Cyan

function NormalizarDatos {
    param([object]$datos)
    if (-not $datos) { return @{ static_data = @{} } }
    if ($datos -is [Array] -and $datos.Count -gt 0) { $datos = $datos[0] }
    if ($datos.static_data) {
        $result = @{ static_data = $datos.static_data }
        if ($datos.dynamic_data) { $result.dynamic_data = $datos.dynamic_data }
        if ($datos.styles) { $result.styles = $datos.styles }
        if ($datos.toggles) { $result.toggles = $datos.toggles }
        return $result
    }
    $staticData = @{}
    $toggles = @{}
    $staticFields = @('titulo', 'subtitulo', 'descripcion', 'textoBoton', 'textoCopyright', 'urlBoton', 'imagenFondo', 'logo', 'telefono', 'email', 'direccion', 'placeholder', 'itemsPorPagina', 'features')
    $toggleFields = @('mostrarPrecio', 'mostrarFiltros', 'mostrarMenu', 'mostrarBusqueda', 'mostrarTelefono', 'mostrarEmail', 'mostrarMensaje', 'mostrarAutor', 'mostrarFecha', 'mostrarResumen', 'mostrarCaracteristicas', 'mostrarUbicacion', 'mostrarTotal')
    $datos.PSObject.Properties | ForEach-Object {
        if ($staticFields -contains $_.Name) { $staticData[$_.Name] = $_.Value }
        elseif ($toggleFields -contains $_.Name) { $toggles[$_.Name] = [bool]$_.Value }
    }
    $result = @{ static_data = $staticData }
    if ($toggles.Count -gt 0) { $result.toggles = $toggles }
    if ($datos.styles) { $result.styles = $datos.styles }
    if ($datos.dynamic_data) { $result.dynamic_data = $datos.dynamic_data }
    return $result
}

try {
    $componentes = Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes?todos=true"
    
    # Componentes objetivo: 1 header global, 1 footer global, y 5 de página
    $componentesObjetivo = @{
        "header-" = @{ orden = -1; paginaId = $null }
        "hero-$paginaId" = @{ orden = 0; paginaId = $paginaId }
        "features-$paginaId" = @{ orden = 1; paginaId = $paginaId }
        "property_list-$paginaId" = @{ orden = 2; paginaId = $paginaId }
        "testimonials-$paginaId" = @{ orden = 3; paginaId = $paginaId }
        "cta-$paginaId" = @{ orden = 4; paginaId = $paginaId }
        "footer-" = @{ orden = 100; paginaId = $null }
    }
    
    $idsAEliminar = @()
    $idsACorregir = @()
    
    # Agrupar por tipo-paginaId
    $grupos = $componentes | Group-Object { "$($_.tipo)-$(if ($_.paginaId) { $_.paginaId } else { '' })" }
    
    foreach ($grupo in $grupos) {
        $key = $grupo.Name
        $componentesGrupo = $grupo.Group | Sort-Object -Property @{
            Expression = {
                $score = 0
                if ($_.predeterminado -and $_.activo) { $score += 4 }
                if ($_.activo) { $score += 2 }
                if ($_.predeterminado) { $score += 1 }
                return -$score
            }
        }, orden
        
        # Mantener solo el primero
        $mantener = $componentesGrupo[0]
        
        # Verificar si este tipo debería existir
        $debeExistir = $false
        $ordenCorrecto = $mantener.orden
        $paginaIdCorrecto = $mantener.paginaId
        
        if ($componentesObjetivo.ContainsKey($key)) {
            $debeExistir = $true
            $ordenCorrecto = $componentesObjetivo[$key].orden
            $paginaIdCorrecto = $componentesObjetivo[$key].paginaId
        } elseif ($key -eq "header-$paginaId") {
            # Header de página no debería existir si hay header global
            Write-Host "Eliminando header de pagina (ya existe global)" -ForegroundColor Yellow
            $idsAEliminar += $mantener.id
            continue
        }
        
        if ($debeExistir) {
            # Normalizar datos
            $datosNorm = NormalizarDatos $mantener.datos
            
            # Verificar si necesita corrección
            $necesitaCorreccion = ($mantener.orden -ne $ordenCorrecto) -or 
                                  ($mantener.paginaId -ne $paginaIdCorrecto) -or
                                  (-not $mantener.datos.static_data) -or
                                  ($mantener.datos -is [Array])
            
            if ($necesitaCorreccion) {
                $idsACorregir += @{
                    id = $mantener.id
                    datos = $datosNorm
                    orden = $ordenCorrecto
                    paginaId = $paginaIdCorrecto
                    componente = $mantener
                }
            }
        } else {
            Write-Host "Eliminando tipo no deseado: $key" -ForegroundColor Yellow
            $idsAEliminar += $mantener.id
        }
        
        # Eliminar los demás
        foreach ($comp in $componentesGrupo[1..($componentesGrupo.Count-1)]) {
            $idsAEliminar += $comp.id
        }
    }
    
    Write-Host "Eliminando $($idsAEliminar.Count) componentes..." -ForegroundColor Yellow
    foreach ($id in $idsAEliminar) {
        try {
            Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes/$id" -Method Delete | Out-Null
        } catch { }
    }
    
    Write-Host "Corrigiendo $($idsACorregir.Count) componentes..." -ForegroundColor Yellow
    foreach ($item in $idsACorregir) {
        try {
            $comp = $item.componente
            $compActualizado = @{
                id = $comp.id
                tipo = $comp.tipo
                variante = $comp.variante
                datos = $item.datos
                activo = $comp.activo
                orden = $item.orden
                paginaId = $item.paginaId
                predeterminado = $true
            } | ConvertTo-Json -Depth 10
            
            Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes/$($comp.id)" -Method Put -Body $compActualizado -ContentType "application/json" | Out-Null
        } catch { }
    }
    
    Write-Host "Limpieza completada!" -ForegroundColor Green
    $componentesFinal = Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes?todos=true"
    Write-Host "Componentes restantes: $($componentesFinal.Count)" -ForegroundColor White
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}


