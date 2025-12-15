# Script para crear una homepage completa con componentes
# Ejecutar desde la raiz del proyecto: .\scripts\crear-homepage-completa.ps1

$API_URL = "http://localhost:3001"

Write-Host "Creando Homepage Completa..." -ForegroundColor Cyan
Write-Host ""

# Paso 1: Obtener Tenant ID
Write-Host "Paso 1: Obteniendo Tenant ID..." -ForegroundColor Yellow
try {
    $tenantResponse = Invoke-RestMethod -Uri "$API_URL/api/tenants/first" -Method Get
    $TENANT_ID = $tenantResponse.id
    Write-Host "OK Tenant ID: $TENANT_ID" -ForegroundColor Green
    Write-Host "   Nombre: $($tenantResponse.nombre)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR al obtener tenant: $_" -ForegroundColor Red
    exit 1
}

# Paso 2: Verificar/Crear Pagina Homepage
Write-Host ""
Write-Host "Paso 2: Verificando/Creando pagina homepage..." -ForegroundColor Yellow

try {
    $paginas = Invoke-RestMethod -Uri "$API_URL/api/tenants/$TENANT_ID/paginas" -Method Get
    
    $homepage = $paginas | Where-Object { $_.slug -eq "/" -or $_.slug -eq "homepage" -or $_.tipoPagina -eq "homepage" } | Select-Object -First 1
    
    if ($homepage) {
        $PAGE_ID = $homepage.id
        Write-Host "OK Homepage ya existe: $PAGE_ID" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Homepage no encontrada. Ejecutando seed de paginas..." -ForegroundColor Yellow
        Push-Location "packages/api"
        pnpm seed:run
        Pop-Location
        
        Start-Sleep -Seconds 3
        $paginas = Invoke-RestMethod -Uri "$API_URL/api/tenants/$TENANT_ID/paginas" -Method Get
        $homepage = $paginas | Where-Object { $_.slug -eq "/" -or $_.slug -eq "homepage" -or $_.tipoPagina -eq "homepage" } | Select-Object -First 1
        if ($homepage) {
            $PAGE_ID = $homepage.id
            Write-Host "OK Homepage creada: $PAGE_ID" -ForegroundColor Green
        } else {
            Write-Host "ERROR: No se pudo crear la homepage. Creala manualmente desde el CRM." -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "ERROR al verificar/crear pagina: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Paso 3: Creando componentes..." -ForegroundColor Yellow

# Funcion helper para crear componente
function CrearComponente {
    param(
        [string]$Tipo,
        [string]$Variante,
        [object]$Datos,
        [int]$Orden,
        [string]$PaginaId = $null,
        [bool]$Global = $false
    )
    
    $componente = @{
        tipo = $Tipo
        variante = $Variante
        datos = $Datos
        activo = $true
        orden = $Orden
        paginaId = if ($Global) { $null } else { $PaginaId }
        predeterminado = $true
    }
    
    try {
        $jsonBody = $componente | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$API_URL/api/tenants/$TENANT_ID/componentes" -Method Post -Body $jsonBody -ContentType "application/json"
        Write-Host "   OK $Tipo ($Variante) creado" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "   AVISO Error al crear $Tipo : $_" -ForegroundColor Yellow
        return $null
    }
}

# Componente 1: Header (Global)
Write-Host "   Creando Header..." -ForegroundColor Gray
$headerData = @{
    static_data = @{
        logo = ""
    }
    toggles = @{
        mostrarMenu = $true
        mostrarBusqueda = $true
    }
    styles = @{
        colors = @{
            primary = "#667eea"
        }
    }
}
CrearComponente -Tipo "header" -Variante "default" -Datos $headerData -Orden -1 -Global $true | Out-Null

# Componente 2: Hero
Write-Host "   Creando Hero..." -ForegroundColor Gray
$heroData = @{
    static_data = @{
        titulo = "Bienvenido a Nuestra Inmobiliaria"
        subtitulo = "Encuentra la propiedad de tus suenos en el lugar perfecto"
        textoBoton = "Ver Propiedades"
        urlBoton = "/propiedades"
        imagenFondo = ""
    }
    styles = @{
        colors = @{
            primary = "#667eea"
            text = "#ffffff"
        }
    }
}
CrearComponente -Tipo "hero" -Variante "default" -Datos $heroData -Orden 0 -PaginaId $PAGE_ID | Out-Null

# Componente 3: Features
Write-Host "   Creando Features..." -ForegroundColor Gray
$feature1 = @{ icono = "casa"; titulo = "Compra"; descripcion = "Encuentra la propiedad perfecta" }
$feature2 = @{ icono = "dinero"; titulo = "Venta"; descripcion = "Vende tu propiedad al mejor precio" }
$feature3 = @{ icono = "llave"; titulo = "Alquiler"; descripcion = "Alquila propiedades de calidad" }
$featuresArray = @($feature1, $feature2, $feature3)
$featuresData = @{
    static_data = @{
        titulo = "Nuestros Servicios"
        subtitulo = "Ofrecemos las mejores soluciones para ti"
        features = $featuresArray
    }
    styles = @{
        colors = @{
            background = "#ffffff"
        }
        spacing = @{
            padding = "4rem 1rem"
        }
    }
}
CrearComponente -Tipo "features" -Variante "default" -Datos $featuresData -Orden 1 -PaginaId $PAGE_ID | Out-Null

# Componente 4: PropertyList (con dynamic_data)
Write-Host "   Creando PropertyList..." -ForegroundColor Gray
$propertyListData = @{
    static_data = @{
        titulo = "Propiedades Destacadas"
        itemsPorPagina = 6
    }
    dynamic_data = @{
        dataType = "properties"
        pagination = @{
            page = 1
            limit = 6
        }
    }
    toggles = @{
        mostrarFiltros = $false
    }
    styles = @{
        colors = @{
            background = "#f7fafc"
        }
        spacing = @{
            padding = "3rem 1rem"
            gap = "2rem"
        }
    }
}
CrearComponente -Tipo "property_list" -Variante "default" -Datos $propertyListData -Orden 2 -PaginaId $PAGE_ID | Out-Null

# Componente 5: Testimonials (con dynamic_data)
Write-Host "   Creando Testimonials..." -ForegroundColor Gray
$testimonialsData = @{
    static_data = @{
        titulo = "Lo que dicen nuestros clientes"
        subtitulo = "Testimonios reales de personas que confiaron en nosotros"
    }
    dynamic_data = @{
        dataType = "testimonials"
        pagination = @{
            page = 1
            limit = 3
        }
    }
    styles = @{
        colors = @{
            background = "#f7fafc"
        }
        spacing = @{
            padding = "4rem 1rem"
        }
    }
}
CrearComponente -Tipo "testimonials" -Variante "default" -Datos $testimonialsData -Orden 3 -PaginaId $PAGE_ID | Out-Null

# Componente 6: CTA
Write-Host "   Creando CTA..." -ForegroundColor Gray
$ctaData = @{
    static_data = @{
        titulo = "Listo para comenzar?"
        textoBoton = "Contactarnos"
        urlBoton = "/contacto"
    }
    styles = @{
        colors = @{
            primary = "#667eea"
            secondary = "#764ba2"
        }
        spacing = @{
            padding = "4rem 1rem"
        }
    }
}
CrearComponente -Tipo "cta" -Variante "default" -Datos $ctaData -Orden 4 -PaginaId $PAGE_ID | Out-Null

# Componente 7: Footer (Global)
Write-Host "   Creando Footer..." -ForegroundColor Gray
$footerData = @{
    static_data = @{
        textoCopyright = "© 2024 Inmobiliaria. Todos los derechos reservados."
        telefono = "+1 234 567 890"
        email = "contacto@inmobiliaria.com"
        direccion = "Calle Principal 123, Ciudad"
    }
    toggles = @{
        mostrarTelefono = $true
        mostrarEmail = $true
    }
}
CrearComponente -Tipo "footer" -Variante "default" -Datos $footerData -Orden 100 -Global $true | Out-Null

Write-Host ""
Write-Host "OK Homepage completa creada!" -ForegroundColor Green
Write-Host ""
Write-Host "URLs para verificar:" -ForegroundColor Cyan
Write-Host "   - Frontend: http://localhost:4321/tenant/$TENANT_ID/" -ForegroundColor White
Write-Host "   - API: http://localhost:3001/api/tenants/$TENANT_ID/pages/" -ForegroundColor White
Write-Host ""
Write-Host "Verifica que los componentes se crearon:" -ForegroundColor Cyan
$verificarCmd = "curl http://localhost:3001/api/tenants/$TENANT_ID/componentes?todos=true"
Write-Host "   $verificarCmd" -ForegroundColor Gray
Write-Host ""
