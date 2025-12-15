# Estado del Refactor - Componentes Web

## Resumen

Se ha refactorizado la arquitectura de componentes web para eliminar el concepto de `scope` y cambiar de un sistema basado en páginas a un sistema basado en rutas.

## Migraciones Completadas

- ✅ **083**: Agregar componentes faltantes al catálogo
- ✅ **084**: Refactorizar componentes_web (eliminar tipo, variante, scope, etc.)
- ✅ **085**: Crear tenants_rutas_config_custom
- ✅ **086**: Cambiar componentes_web de pagina_id a rutas (tenant_rutas_config_id, tenant_rutas_config_custom_id)
- ✅ **087**: Convertir tenants_rutas_config en tabla global (sin tenant_id)

## Cambios en el Esquema de `componentes_web`

### Campos ELIMINADOS:
- `tipo` (ahora se obtiene via JOIN con `catalogo_componentes`)
- `variante` (usar `nombre` en su lugar)
- `predeterminado`
- `scope` ('tenant', 'page_type', 'page' - concepto OBSOLETO)
- `tipo_pagina`
- `config_completa`
- `default_data`
- `pagina_id` (reemplazado por relaciones a rutas)
- `es_activo` (concepto OBSOLETO)

### Campos AGREGADOS:
- `componente_catalogo_id` (UUID, FK a `catalogo_componentes.id`)
- `tenant_rutas_config_id` (UUID, FK a `tenants_rutas_config.id`, nullable)
- `tenant_rutas_config_custom_id` (UUID, FK a `tenants_rutas_config_custom.id`, nullable)

### Campos que PERMANECEN:
- `id`, `tenant_id`, `nombre`, `datos`, `activo`, `orden`, `created_at`, `updated_at`

## Servicios Actualizados

### ✅ COMPLETADOS:

1. **[routeResolver.ts](d:\2026 CLIC\packages\api\src\services\routeResolver.ts)**
   - ✅ Actualizado para usar UNION de `tenants_rutas_config` y `tenants_rutas_config_custom`
   - ✅ Eliminadas referencias a `tenant_id` en rutas globales

2. **[crm/paginasService.ts](d:\2026 CLIC\packages\api\src\services\crm\paginasService.ts)**
   - ✅ Agregados JOINs con `catalogo_componentes` para obtener `tipo`
   - ✅ Usando `c.nombre` como `variante`
   - ✅ Eliminada lógica de componentes globales

3. **[seccionesService.ts](d:\2026 CLIC\packages\api\src\services\seccionesService.ts)**
   - ✅ Refactorizado completamente
   - ✅ Funciones obsoletas marcadas con TODO
   - ✅ `getComponentesPagina` actualizado
   - ✅ `crearComponenteGlobal` actualizado
   - ✅ `duplicarComponenteGlobal` actualizado
   - ✅ `getSeccionesResueltas` IMPLEMENTADO (busca componentes por ruta)

### ⚠️ PENDIENTES - NECESITAN REFACTOR COMPLETO:

4. **[componentesService.ts](d:\2026 CLIC\packages\api\src\services\componentesService.ts)**
   - ❌ `getComponentesByTenant` - queries con campos inexistentes (`tipo`, `variante`, `pagina_id`, `predeterminado`)
   - ❌ `saveComponente` - referencias a `scope`, `tipo_pagina`, `es_activo`, `predeterminado`
   - 📝 **Cambios necesarios:**
     - Agregar JOIN con `catalogo_componentes` en todos los SELECT
     - Reemplazar `tipo` con `cc.tipo` del catálogo
     - Reemplazar `variante` con `c.nombre`
     - Eliminar toda lógica de `scope`, `tipo_pagina`, `predeterminado`, `es_activo`
     - Usar `tenant_rutas_config_id` / `tenant_rutas_config_custom_id` en lugar de `pagina_id`

5. **[dynamicDataService.ts](d:\2026 CLIC\packages\api\src\services\dynamicDataService.ts)**
   - Necesita revisión para queries con `c.tipo`

6. **Otros servicios potencialmente afectados:**
   - Cualquier servicio que haga query a `componentes_web` y use campos obsoletos

## Patrón de Migración

### Antes (OBSOLETO):
```sql
SELECT
  c.id,
  c.tipo,
  c.variante,
  c.scope,
  c.tipo_pagina,
  c.pagina_id
FROM componentes_web c
WHERE c.tenant_id = $1
  AND c.scope = 'tenant'
  AND c.activo = true
```

### Después (CORRECTO):
```sql
SELECT
  c.id,
  cc.tipo,
  c.nombre as variante,
  c.tenant_rutas_config_id,
  c.tenant_rutas_config_custom_id
FROM componentes_web c
JOIN catalogo_componentes cc ON cc.id = c.componente_catalogo_id
WHERE c.tenant_id = $1
  AND c.activo = true
```

## Nueva Arquitectura Conceptual

### ANTES:
- Componentes relacionados a páginas (`pagina_id`)
- Scope define visibilidad: 'tenant' (global), 'page_type', 'page'
- Campo `tipo` contiene string del tipo de componente
- Campo `variante` contiene string de la variante

### AHORA:
- Componentes relacionados a rutas (`tenant_rutas_config_id` o `tenant_rutas_config_custom_id`)
- NO hay componentes "globales" - cada ruta tiene sus propios componentes
- Campo `componente_catalogo_id` referencia al catálogo
- Campo `nombre` es el identificador/variante del componente
- Los componentes pueden repetirse en una misma ruta tantas veces como el usuario quiera

## Próximos Pasos

1. ❌ **Completar refactor de `componentesService.ts`**
2. ❌ **Completar refactor de `dynamicDataService.ts`**
3. ❌ **Buscar y actualizar TODOS los archivos que hagan query a `componentes_web`**
4. ❌ **Actualizar interfaces/types en TypeScript para reflejar nueva estructura**
5. ❌ **Actualizar frontend CRM para nueva arquitectura**
6. ❌ **Testing completo end-to-end**

## Notas Importantes

- ⚠️ El concepto de `scope` (tenant/page_type/page) está **completamente obsoleto**
- ⚠️ Ya no hay componentes "predeterminados" - cada ruta gestiona sus propios componentes
- ⚠️ Los componentes ahora se relacionan con rutas, NO con páginas individuales
- ⚠️ El sistema de "activar variante" ya no existe - cada instancia de componente es independiente
