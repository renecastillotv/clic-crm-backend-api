# Correcciones Pendientes - Detección de Rutas

## Problemas Identificados

### 1. `/favoritos` se detecta como `property-list` en vez de `favoritos` (directorio)
**Causa**: El resolver no encuentra `tipoDirectorio` para `/favoritos` cuando hay 0 segmentos adicionales.

**Solución necesaria**: Asegurar que el PASO 0 o PASO 1 encuentre correctamente el tipo directorio cuando el patrón es exactamente `/favoritos`.

### 2. `/propiedades` detecta `propiedades_listado` pero no hay handler
**Estado**: ✅ CORREGIDO - Se agregó handler en dispatcher

### 3. `/propiedades/:slug` detecta `propiedades_single` pero no hay handler
**Estado**: ✅ CORREGIDO - Se agregó handler en dispatcher

### 4. `landing_page` y `listados_curados` necesitan directorios
**Problema**: Solo tienen patrón con `:slug` pero no tienen directorio base.
**Necesita**: Agregar directorios en la BD:
- `landing_page` necesita un directorio `/landing` (o mantener solo `landing_page` como directorio)
- `listados_curados` necesita un directorio `/listados-de-propiedades` (o similar)

---

## Notas sobre Favoritos

El usuario menciona que:
- Cada usuario da like mientras navega
- Cuando va a `/favoritos` debe ver sus favoritos
- Cuando comparte es `/favoritos/token` o `/favoritos/token?id=x-cosa`
- Puede usar IP/device ID para identificar al dueño

**Para la detección de rutas**:
- `/favoritos` → `favoritos` (directorio/main) - muestra favoritos del usuario actual
- `/favoritos/:token` → `favoritos_token` (single) - muestra favoritos compartidos

El tema de identificar al dueño vs compartido es lógica de negocio que se maneja en el handler, no en la detección de rutas.




