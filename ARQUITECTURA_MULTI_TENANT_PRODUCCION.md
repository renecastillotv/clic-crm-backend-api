# Arquitectura Multi-Tenant para Producción

## Resumen

El sistema soporta dos formas de identificar tenants en producción:

1. **Subdominios**: `subdominio.dominiosaas.com` → busca tenant con `slug = "subdominio"`
2. **Dominios personalizados**: `inmobiliariadeltenant.com` → busca tenant con `dominio_personalizado = "inmobiliariadeltenant.com"`

## Flujo en Desarrollo

```
http://localhost:4321/
  ↓
Redirige a: http://localhost:4321/tenant/demo/
  ↓
Frontend extrae tenantSlug="demo" de la URL
  ↓
API: GET /api/tenants/demo/resolve?pathname=/
  ↓
API busca tenant con slug="demo"
  ↓
Resuelve y renderiza
```

## Flujo en Producción (Subdominio)

```
Usuario accede: https://demo.dominiosaas.com/
  ↓
Frontend (index.astro) detecta hostname="demo.dominiosaas.com"
  ↓
API: GET /api/tenants/detect?hostname=demo.dominiosaas.com&baseDomain=dominiosaas.com
  ↓
API extrae subdominio="demo" y busca tenant con slug="demo"
  ↓
Frontend redirige a: /tenant/demo/ (o renderiza directamente)
  ↓
API: GET /api/tenants/demo/resolve?pathname=/
  ↓
Resuelve y renderiza
```

## Flujo en Producción (Dominio Personalizado)

```
Usuario accede: https://inmobiliariadeltenant.com/
  ↓
Frontend (index.astro) detecta hostname="inmobiliariadeltenant.com"
  ↓
API: GET /api/tenants/detect?hostname=inmobiliariadeltenant.com&baseDomain=dominiosaas.com
  ↓
API detecta que NO es subdominio, busca tenant con dominio_personalizado="inmobiliariadeltenant.com"
  ↓
Frontend obtiene tenant (ej: slug="tenant-123")
  ↓
Frontend redirige a: /tenant/tenant-123/ (o renderiza directamente)
  ↓
API: GET /api/tenants/tenant-123/resolve?pathname=/
  ↓
Resuelve y renderiza
```

## Configuración DNS

### Para Subdominios

```
Tipo: CNAME
Nombre: demo (o el slug del tenant)
Valor: plataforma.dominiosaas.com
```

### Para Dominios Personalizados

```
Tipo: A o CNAME
Nombre: @ (o www)
Valor: IP del servidor (A) o plataforma.dominiosaas.com (CNAME)
```

**Importante**: El dominio personalizado debe apuntar al mismo servidor donde está la aplicación.

## Base de Datos

### Campo `dominio_personalizado` en tabla `tenants`

```sql
ALTER TABLE tenants 
ADD COLUMN dominio_personalizado VARCHAR(255) NULL UNIQUE;
```

Ejemplo de datos:
- Tenant "demo": `slug = "demo"`, `dominio_personalizado = NULL`
- Tenant "inmobiliaria": `slug = "inmobiliaria"`, `dominio_personalizado = "inmobiliariadeltenant.com"`

## API Endpoints

### Detectar Tenant por Hostname

```
GET /api/tenants/detect?hostname=demo.dominiosaas.com&baseDomain=dominiosaas.com
```

Respuesta:
```json
{
  "id": "uuid-del-tenant",
  "nombre": "Demo Inmobiliaria",
  "slug": "demo",
  "dominioPersonalizado": null,
  "activo": true
}
```

## Variables de Entorno

### Frontend (Astro)

```env
PUBLIC_API_URL=https://api.dominiosaas.com
PUBLIC_BASE_DOMAIN=dominiosaas.com
```

### Backend (API)

```env
BASE_DOMAIN=dominiosaas.com
```

## Ventajas

1. **SEO Friendly**: Cada tenant tiene su propio dominio
2. **Branding**: Los clientes pueden usar su propio dominio
3. **Flexibilidad**: Soporta subdominios y dominios personalizados
4. **Escalabilidad**: Fácil agregar nuevos tenants sin cambios en código

## Próximos Pasos

1. ✅ Agregar campo `dominio_personalizado` a tabla `tenants`
2. ✅ Implementar `getTenantByHostname()` en API
3. ✅ Endpoint `/api/tenants/detect`
4. ✅ Actualizar `index.astro` para producción
5. ⏳ Migración de base de datos
6. ⏳ Panel en CRM para configurar dominio personalizado
7. ⏳ Validación de dominios (verificar que apunten al servidor)


