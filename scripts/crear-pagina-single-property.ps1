# Script para crear la página "Propiedad Individual" en la base de datos
# Ejecutar desde la raíz del proyecto: .\scripts\crear-pagina-single-property.ps1

$API_URL = "http://localhost:3001"

Write-Host "Creando página 'Propiedad Individual'..." -ForegroundColor Cyan

# Paso 1: Obtener Tenant ID
try {
    $tenantResponse = Invoke-RestMethod -Uri "$API_URL/api/tenants/first" -Method Get
    $TENANT_ID = $tenantResponse.id
    Write-Host "✅ Tenant ID: $TENANT_ID" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al obtener tenant: $_" -ForegroundColor Red
    exit 1
}

# Paso 2: Crear la página directamente en la base de datos
# Necesitamos usar SQL directo porque no hay endpoint POST para páginas
Write-Host ""
Write-Host "⚠️ No hay endpoint POST para crear páginas." -ForegroundColor Yellow
Write-Host "   Por favor, crea la página manualmente desde el CRM o" -ForegroundColor Yellow
Write-Host "   ejecuta este SQL en tu base de datos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "SQL a ejecutar:" -ForegroundColor Cyan
Write-Host @"
INSERT INTO paginas_web (tenant_id, tipo_pagina, titulo, slug, descripcion, contenido, meta, publica, activa, orden)
VALUES (
    '$TENANT_ID',
    'single_property',
    'Propiedad Individual',
    'propiedad',
    'Página para mostrar detalles de una propiedad específica',
    '{"componentes": ["header", "property_detail", "contact_form", "footer"]}',
    '{"title": "Propiedad - Inmobiliaria", "description": "Detalles de la propiedad"}',
    true,
    true,
    10
);
"@ -ForegroundColor White
Write-Host ""

Write-Host "O bien, crea la página desde el CRM con:" -ForegroundColor Yellow
Write-Host "  - Tipo: Propiedad Individual (single_property)" -ForegroundColor Gray
Write-Host "  - Slug: propiedad" -ForegroundColor Gray
Write-Host "  - Título: Propiedad Individual" -ForegroundColor Gray


