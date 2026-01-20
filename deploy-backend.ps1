# Deploy Backend API a Vercel
# Uso: .\deploy-backend.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY BACKEND API A VERCEL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Verificar que no hay cambios sin commitear en el backend
$status = git status packages/api --porcelain
if ($status) {
    Write-Host "`nHay cambios sin commitear en el backend:" -ForegroundColor Yellow
    Write-Host $status
    $response = Read-Host "`nDeseas continuar de todos modos? (s/n)"
    if ($response -ne "s") {
        Write-Host "Deploy cancelado." -ForegroundColor Red
        exit 1
    }
}

# 2. Extraer subtree y hacer push
Write-Host "`nExtrayendo subtree del backend..." -ForegroundColor Green
git branch -D deploy-backend-temp 2>$null
$hash = git subtree split --prefix=packages/api -b deploy-backend-temp

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al extraer subtree" -ForegroundColor Red
    exit 1
}

Write-Host "Hash del subtree: $hash" -ForegroundColor Gray

# 3. Push a main del repo de backend
Write-Host "`nHaciendo push a GitHub (backend)..." -ForegroundColor Green
git push backend deploy-backend-temp:main --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al hacer push" -ForegroundColor Red
    exit 1
}

# 4. Limpiar rama temporal
git branch -D deploy-backend-temp 2>$null

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  DEPLOY EXITOSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Vercel desplegara automaticamente en unos minutos."
Write-Host "URL: https://clic-crm-backend-api.vercel.app"
