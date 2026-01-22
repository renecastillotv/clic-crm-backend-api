# Script para ejecutar el registro de componentes en la base de datos
# Ejecuta el SQL directamente usando psql o la API

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Registro de Componentes en Homepage" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si psql está disponible
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "✅ psql encontrado, ejecutando SQL directamente..." -ForegroundColor Green
    Write-Host ""
    
    # Solicitar DATABASE_URL
    $databaseUrl = Read-Host "Ingresa la DATABASE_URL (o presiona Enter para usar variable de entorno)"
    
    if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
        $databaseUrl = $env:DATABASE_URL
    }
    
    if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
        Write-Host "❌ ERROR: No se encontró DATABASE_URL" -ForegroundColor Red
        Write-Host "   Por favor, proporciona la DATABASE_URL o configúrala como variable de entorno" -ForegroundColor Yellow
        exit 1
    }
    
    # Ejecutar el script SQL
    $sqlFile = Join-Path $PSScriptRoot "registrar_componentes_homepage.sql"
    
    Write-Host "Ejecutando script SQL..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $result = & psql $databaseUrl -f $sqlFile 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Script ejecutado exitosamente!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Resultado:" -ForegroundColor Cyan
            Write-Host $result
        } else {
            Write-Host ""
            Write-Host "❌ Error al ejecutar el script" -ForegroundColor Red
            Write-Host $result
            exit 1
        }
    } catch {
        Write-Host ""
        Write-Host "❌ Error: $_" -ForegroundColor Red
        exit 1
    }
    
} else {
    Write-Host "⚠️  psql no está disponible" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Cyan
    Write-Host "1. Instalar PostgreSQL client tools (psql)" -ForegroundColor White
    Write-Host "2. Ejecutar el script manualmente en tu cliente SQL favorito" -ForegroundColor White
    Write-Host "3. Usar la API si tiene endpoints para esto" -ForegroundColor White
    Write-Host ""
    Write-Host "El script SQL está en:" -ForegroundColor Yellow
    Write-Host "   $PSScriptRoot\registrar_componentes_homepage.sql" -ForegroundColor White
    Write-Host ""
    Write-Host "Para ejecutarlo manualmente:" -ForegroundColor Cyan
    Write-Host "   1. Abre tu cliente SQL (pgAdmin, DBeaver, etc.)" -ForegroundColor White
    Write-Host "   2. Conéctate a tu base de datos Neon" -ForegroundColor White
    Write-Host "   3. Ejecuta el contenido del archivo SQL" -ForegroundColor White
    Write-Host ""
    
    # Mostrar el contenido del SQL para copiar
    $sqlFile = Join-Path $PSScriptRoot "registrar_componentes_homepage.sql"
    if (Test-Path $sqlFile) {
        Write-Host "¿Deseas ver el contenido del script SQL? (S/N)" -ForegroundColor Yellow
        $verSQL = Read-Host
        if ($verSQL -eq "S" -or $verSQL -eq "s") {
            Write-Host ""
            Write-Host "=== CONTENIDO DEL SCRIPT SQL ===" -ForegroundColor Cyan
            Get-Content $sqlFile
            Write-Host "=== FIN DEL SCRIPT ===" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Proceso completado" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan








