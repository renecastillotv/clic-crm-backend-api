# Instrucciones de Deploy - CLIC Monorepo

> **NOTA PARA CLAUDE**: Este archivo fue creado por ti mismo (Claude) el 2026-01-20 para recordar cómo hacer deploys correctamente. Si estás leyendo esto, sigue estas instrucciones exactamente.

## IMPORTANTE: Entorno de Pruebas

**TODO se prueba en la versión pública desplegada en Vercel.** No preguntes si el usuario está usando localhost o producción - SIEMPRE asume que está probando en:

- **Frontend**: https://clic-crm-frontend.vercel.app
- **Backend API**: https://clic-crm-backend-api.vercel.app/api

Por lo tanto:
1. Después de cada fix, SIEMPRE haz deploy a Vercel
2. No sugieras reiniciar servidores locales como solución
3. El `.env` local debe apuntar a la API de producción para desarrollo

## Estructura del Proyecto

Este es un **monorepo** con la siguiente estructura:
- `apps/crm-frontend/` → Frontend React (Vite)
- `packages/api/` → Backend Express API

Cada uno se despliega a un repositorio separado en GitHub usando **git subtree**.

## Repositorios Remotos Configurados

```
frontend  → https://github.com/renecastillotv/clic-crm-frontend.git
backend   → https://github.com/renecastillotv/clic-crm-backend-api.git
```

Vercel está configurado para desplegar automáticamente cuando se hace push a `main` en estos repos.

## URLs de Producción

- **Frontend**: https://clic-crm-frontend.vercel.app
- **Backend API**: https://clic-crm-backend-api.vercel.app/api

## Cómo Hacer Deploy

### Deploy del Frontend

```bash
# 1. Asegúrate de que los cambios están commiteados en el monorepo
git add apps/crm-frontend/
git commit -m "descripción del cambio"

# 2. Extraer subtree y hacer push
git branch -D deploy-temp 2>/dev/null
git subtree split --prefix=apps/crm-frontend -b deploy-temp
git push frontend deploy-temp:main --force
git branch -D deploy-temp
```

### Deploy del Backend

```bash
# 1. Asegúrate de que los cambios están commiteados en el monorepo
git add packages/api/
git commit -m "descripción del cambio"

# 2. Extraer subtree y hacer push
git branch -D deploy-temp 2>/dev/null
git subtree split --prefix=packages/api -b deploy-temp
git push backend deploy-temp:main --force
git branch -D deploy-temp
```

## Problemas Comunes y Soluciones

### 1. "Everything up-to-date" pero los cambios no aparecen
**Causa**: No se hizo commit de los cambios antes del subtree split.
**Solución**: Hacer `git add` y `git commit` primero.

### 2. El isotipo no se muestra en el sidebar
**Causa**: El API devuelve el campo como `isotipo` (sin _url) pero el tipo TypeScript usa `isotipo_url`.
**Solución**: En `CrmLayout.tsx`, usar: `(info as any).isotipo || info.isotipo_url`

### 3. El header de las páginas está vacío
**Causa**: Race condition - el useEffect que limpiaba el header se ejecutaba después del que lo configuraba.
**Solución**: NO usar `setPageHeader(null)` automáticamente al cambiar de ruta. Cada página configura su propio header.

### 4. Error de Clerk "authorization_invalid"
**Causa**: El dominio de producción no está en `authorizedParties`.
**Solución**: En `packages/api/src/middleware/clerkAuth.ts`, agregar la URL del frontend a `authorizedParties`:
```typescript
authorizedParties: [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:4321',
  'https://clic-crm-frontend.vercel.app',  // <- producción
],
```

### 5. 404 en rutas del API
**Causa**: El archivo `packages/api/api/index.ts` (entry point de Vercel) no importaba la app completa.
**Solución**: Asegurarse de que importa desde `../src/index.js`:
```typescript
import app from '../src/index.js';
export default async function handler(req, res) {
  return app(req, res);
}
```

## Variables de Entorno en Vercel

### Frontend (clic-crm-frontend)
- `VITE_API_URL` = `https://clic-crm-backend-api.vercel.app/api`
- `VITE_CLERK_PUBLISHABLE_KEY` = (la clave de Clerk)

### Backend (clic-crm-backend-api)
- `DATABASE_URL` = (URL de Neon PostgreSQL)
- `CLERK_SECRET_KEY` = (la clave secreta de Clerk)
- `CLOUDFLARE_R2_*` = (credenciales de R2 para uploads)

## Verificación Post-Deploy

Después de hacer deploy, verificar:

1. **Frontend carga**: https://clic-crm-frontend.vercel.app
2. **Login funciona**: Probar iniciar sesión
3. **API responde**: `curl https://clic-crm-backend-api.vercel.app/api/tenants/{tenant-id}/info-negocio`
4. **Isotipo visible**: El logo en el sidebar debe aparecer
5. **Headers funcionan**: Cada sección debe mostrar su título en el header

## Fecha de Última Actualización

Este documento fue actualizado el **2026-01-20** después de resolver problemas de deploy donde:
- El isotipo no se mostraba (campo incorrecto)
- Los headers estaban vacíos (race condition)
- La versión desplegada no coincidía con la local
