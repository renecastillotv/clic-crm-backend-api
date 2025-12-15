# Script para crear los componentes faltantes de la homepage
$API_URL = "http://localhost:3001/api"
$tenantId = "9763dd67-1b33-40b1-ae78-73e5bcafc2b7"
$paginaId = "2c496765-3d0d-43e1-9a8a-308acb728602"

Write-Host "Creando componentes de la homepage..." -ForegroundColor Cyan

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
        $response = Invoke-RestMethod -Uri "$API_URL/tenants/$tenantId/componentes" -Method Post -Body $jsonBody -ContentType "application/json"
        Write-Host "   OK $Tipo ($Variante) creado - paginaId: $($componente.paginaId)" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "   ERROR al crear $Tipo : $_" -ForegroundColor Red
        return $null
    }
}

# Hero
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
CrearComponente -Tipo "hero" -Variante "default" -Datos $heroData -Orden 0 -PaginaId $paginaId | Out-Null

# Features
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
CrearComponente -Tipo "features" -Variante "default" -Datos $featuresData -Orden 1 -PaginaId $paginaId | Out-Null

# PropertyList
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
CrearComponente -Tipo "property_list" -Variante "default" -Datos $propertyListData -Orden 2 -PaginaId $paginaId | Out-Null

# Testimonials
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
CrearComponente -Tipo "testimonials" -Variante "default" -Datos $testimonialsData -Orden 3 -PaginaId $paginaId | Out-Null

# CTA
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
CrearComponente -Tipo "cta" -Variante "default" -Datos $ctaData -Orden 4 -PaginaId $paginaId | Out-Null

Write-Host ""
Write-Host "OK Componentes creados!" -ForegroundColor Green


