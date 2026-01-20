# Deploy Completo (Frontend + Backend) a Vercel
# Uso: .\deploy-all.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY COMPLETO A VERCEL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Verificar cambios sin commitear
$statusFrontend = git status apps/crm-frontend --porcelain
$statusBackend = git status packages/api --porcelain

if ($statusFrontend -or $statusBackend) {
    Write-Host "`nHay cambios sin commitear:" -ForegroundColor Yellow
    if ($statusFrontend) {
        Write-Host "`nFrontend:" -ForegroundColor Gray
        Write-Host $statusFrontend
    }
    if ($statusBackend) {
        Write-Host "`nBackend:" -ForegroundColor Gray
        Write-Host $statusBackend
    }
    $response = Read-Host "`nDeseas continuar de todos modos? (s/n)"
    if ($response -ne "s") {
        Write-Host "Deploy cancelado." -ForegroundColor Red
        exit 1
    }
}

# Deploy Frontend
Write-Host "`n--- FRONTEND ---" -ForegroundColor Magenta
git branch -D deploy-frontend-temp 2>$null
git subtree split --prefix=apps/crm-frontend -b deploy-frontend-temp
git push frontend deploy-frontend-temp:main --force
git branch -D deploy-frontend-temp 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en deploy de frontend" -ForegroundColor Red
    exit 1
}
Write-Host "Frontend desplegado!" -ForegroundColor Green

# Deploy Backend
Write-Host "`n--- BACKEND ---" -ForegroundColor Magenta
git branch -D deploy-backend-temp 2>$null
git subtree split --prefix=packages/api -b deploy-backend-temp
git push backend deploy-backend-temp:main --force
git branch -D deploy-backend-temp 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en deploy de backend" -ForegroundColor Red
    exit 1
}
Write-Host "Backend desplegado!" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  DEPLOY COMPLETO EXITOSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nURLs:"
Write-Host "  Frontend: https://clic-crm-frontend.vercel.app"
Write-Host "  Backend:  https://clic-crm-backend-api.vercel.app"
