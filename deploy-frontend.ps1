# Deploy Frontend a Vercel
# Uso: .\deploy-frontend.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY FRONTEND A VERCEL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Verificar que no hay cambios sin commitear en el frontend
$status = git status apps/crm-frontend --porcelain
if ($status) {
    Write-Host "`nHay cambios sin commitear en el frontend:" -ForegroundColor Yellow
    Write-Host $status
    $response = Read-Host "`nDeseas continuar de todos modos? (s/n)"
    if ($response -ne "s") {
        Write-Host "Deploy cancelado." -ForegroundColor Red
        exit 1
    }
}

# 2. Extraer subtree y hacer push
Write-Host "`nExtrayendo subtree del frontend..." -ForegroundColor Green
git branch -D deploy-frontend-temp 2>$null
$hash = git subtree split --prefix=apps/crm-frontend -b deploy-frontend-temp

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al extraer subtree" -ForegroundColor Red
    exit 1
}

Write-Host "Hash del subtree: $hash" -ForegroundColor Gray

# 3. Push a main del repo de frontend
Write-Host "`nHaciendo push a GitHub (frontend)..." -ForegroundColor Green
git push frontend deploy-frontend-temp:main --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al hacer push" -ForegroundColor Red
    exit 1
}

# 4. Limpiar rama temporal
git branch -D deploy-frontend-temp 2>$null

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  DEPLOY EXITOSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Vercel desplegara automaticamente en unos minutos."
Write-Host "URL: https://clic-crm-frontend.vercel.app"
