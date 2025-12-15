# Convención de Nombres para Tipos de Página

## 📋 Documento de Referencia

Este documento define la convención **oficial** de nombres para tipos de página (`tipo_pagina`) en el sistema. Todos los nombres deben seguir estas reglas para mantener consistencia entre el código y la base de datos.

---

## 🎯 Reglas Generales

### 1. Formato de Nombres
- ✅ **Usar guiones bajos (`_`)** - NO guiones (`-`)
- ✅ **Todo en minúsculas**
- ✅ **Sin prefijos adicionales** (NO usar `pagina_`, usar directamente el nombre)
- ✅ **Consistencia** - El mismo nombre en código y BD

### 2. Estructura de Nombres

```
[prefijo]_[tipo]
```

**Ejemplos:**
- `directorio_articulos` ✅
- `single_asesor` ✅
- `videos_listado` ✅

**INCORRECTO:**
- `pagina_contacto` ❌ (no usar prefijo `pagina_`)
- `articulos-listado` ❌ (no usar guiones)
- `Single_Asesor` ❌ (no usar mayúsculas)

---

## 📄 Páginas Estáticas

Páginas simples sin contenido dinámico.

| Nombre | Descripción | Ubicación en DB |
|--------|-------------|-----------------|
| `homepage` | Página principal | `componentes_web.tipo_pagina` |
| `contacto` | Página de contacto | `componentes_web.tipo_pagina` |
| `nosotros` | Página sobre nosotros | `componentes_web.tipo_pagina` |
| `servicios` | Página de servicios | `componentes_web.tipo_pagina` |
| `privacidad` | Política de privacidad | `componentes_web.tipo_pagina` |
| `terminos` | Términos y condiciones | `componentes_web.tipo_pagina` |

**Código de referencia:**
- [routeResolver.ts:1112](../packages/api/src/services/routeResolver.ts#L1112)

---

## 🏢 Propiedades

Sistema de listados y detalles de propiedades inmobiliarias.

| Tipo | Nombre | Descripción | Ruta Ejemplo |
|------|--------|-------------|--------------|
| Directorio | `listados_propiedades` | Listado de propiedades | `/propiedades` |
| Categoría | `categoria_propiedades` | Propiedades por categoría | `/propiedades/casas` |
| Single | `single_property` | Detalle de una propiedad | `/propiedades/casa-moderna-123` |

**NOTA:** También existe `propiedades_listado` en BD (legacy) - considerar migrar a `listados_propiedades`

**Código de referencia:**
- [routeResolver.ts:618](../packages/api/src/services/routeResolver.ts#L618)
- [routeResolver.ts:557](../packages/api/src/services/routeResolver.ts#L557)

---

## 👥 Asesores

Sistema de directorio y perfiles de asesores.

| Tipo | Nombre | Descripción | Ruta Ejemplo |
|------|--------|-------------|--------------|
| Directorio | `directorio_asesores` | Listado de asesores | `/asesores` |
| Categoría | `categoria_asesores` | Asesores por categoría | `/asesores/ventas` |
| Single | `single_asesor` | Perfil de un asesor | `/asesores/juan-perez` |

**Código de referencia:**
- [routeResolver.ts:616](../packages/api/src/services/routeResolver.ts#L616)
- [routeResolver.ts:555](../packages/api/src/services/routeResolver.ts#L555)

---

## 📰 Artículos / Blog

Sistema de contenido editorial (artículos, noticias, blog).

| Tipo | Nombre | Descripción | Ruta Ejemplo |
|------|--------|-------------|--------------|
| Directorio | `directorio_articulos` | Listado de artículos | `/articulos` |
| Categoría | `articulos_categoria` | Artículos por categoría | `/articulos/noticias` |
| Single | `single_articulo` | Detalle de un artículo | `/articulos/guia-compra-casa` |

**NOTA:** `blog` usa los mismos tipos que `articulos`

**LEGACY en BD:** Existen `articulos_listado` y `articulos_single` - considerar migrar a los nombres estándar

**Código de referencia:**
- [routeResolver.ts:614-615](../packages/api/src/services/routeResolver.ts#L614)
- [routeResolver.ts:553-554](../packages/api/src/services/routeResolver.ts#L553)

---

## 🎥 Videos

Sistema de galería y contenido de video.

| Tipo | Nombre | Descripción | Ruta Ejemplo |
|------|--------|-------------|--------------|
| Directorio | `videos_listado` | Listado de videos | `/videos` |
| Categoría | `videos_categoria` | Videos por categoría | `/videos/tutoriales` |
| Single | `videos_single` | Detalle de un video | `/videos/tour-virtual-123` |

**Código de referencia:**
- [routeResolver.ts:613](../packages/api/src/services/routeResolver.ts#L613)
- [routeResolver.ts:553](../packages/api/src/services/routeResolver.ts#L553)

---

## 💬 Testimonios

Sistema de testimonios y reseñas de clientes.

| Tipo | Nombre | Descripción | Ruta Ejemplo |
|------|--------|-------------|--------------|
| Directorio | `directorio_testimonios` | Listado de testimonios | `/testimonios` |
| Categoría | `categoria_testimonios` | Testimonios por categoría | `/testimonios/compras` |
| Single | `single_testimonio` | Detalle de un testimonio | `/testimonios/cliente-123` |

**Código de referencia:**
- [routeResolver.ts:612](../packages/api/src/services/routeResolver.ts#L612)
- [routeResolver.ts:551](../packages/api/src/services/routeResolver.ts#L551)

---

## 🏗️ Proyectos

Sistema de portafolio de proyectos.

| Tipo | Nombre | Descripción | Ruta Ejemplo |
|------|--------|-------------|--------------|
| Directorio | `directorio_proyectos` | Listado de proyectos | `/proyectos` |
| Categoría | `categoria_proyectos` | Proyectos por categoría | `/proyectos/residenciales` |
| Single | `single_proyecto` | Detalle de un proyecto | `/proyectos/edificio-central` |

**Código de referencia:**
- [routeResolver.ts:617](../packages/api/src/services/routeResolver.ts#L617)
- [routeResolver.ts:556](../packages/api/src/services/routeResolver.ts#L556)

---

## 🔍 Verificación de Consistencia

### Consulta SQL para verificar tipos en BD

```sql
SELECT DISTINCT tipo_pagina, COUNT(*) as count
FROM componentes_web
WHERE tipo_pagina IS NOT NULL
GROUP BY tipo_pagina
ORDER BY tipo_pagina;
```

### Script de Verificación

Usar el script temporal: `packages/api/check-tipos-pagina.ts`

```bash
cd packages/api
npx tsx check-tipos-pagina.ts
```

---

## 🔧 Mantenimiento

### Ubicaciones del Código

Los nombres de tipos de página se definen en:

1. **Route Resolver** - `packages/api/src/services/routeResolver.ts`
   - Línea 611-619: Mapeo para contenido dinámico
   - Línea 550-559: Mapeo para páginas single
   - Línea 1112: Páginas estáticas

2. **Migraciones** - `packages/api/src/database/migrations/`
   - Revisar que los componentes se creen con los nombres correctos

3. **Seeder de Páginas** - `packages/api/src/services/tenantInitService.ts`
   - Línea 40+: Configuración de páginas por defecto

### Al Agregar Nuevo Tipo de Página

1. ✅ Definir el nombre siguiendo las reglas (minúsculas, guiones bajos)
2. ✅ Agregar al mapeo en `routeResolver.ts` (ambos mapeos si es dinámico)
3. ✅ Actualizar este documento
4. ✅ Crear migración si es necesario
5. ✅ Verificar en BD que coincida

---

## ⚠️ Problemas Comunes y Soluciones

### Problema: Componentes no cargan en página pública

**Causa:** Nombre de `tipo_pagina` en BD no coincide con el código

**Solución:**
1. Verificar nombre en BD con la consulta SQL arriba
2. Revisar mapeo en `routeResolver.ts`
3. Asegurar que ambos coincidan **exactamente**

### Problema: Página usa fallback en vez de componentes reales

**Síntoma:** Log muestra `⚠️ [getSeccionesResueltas] No hay componentes en BD para...`

**Causa:** El `tipoPagina` generado no existe en la BD

**Solución:**
1. Revisar el log para ver qué `tipoPagina` está buscando
2. Verificar en este documento cuál debe ser
3. Corregir el mapeo en `routeResolver.ts` si es necesario

### Problema: Guiones vs Guiones Bajos

**NUNCA usar guiones (`-`) en `tipo_pagina`**

- ❌ INCORRECTO: `directorio-articulos`
- ✅ CORRECTO: `directorio_articulos`

---

## 📝 Historial de Cambios

### 2025-12-02
- ✅ Eliminado prefijo `pagina_` de páginas estáticas (ej: `pagina_contacto` → `contacto`)
- ✅ Corregido artículos: `articulos_listado` → `directorio_articulos`
- ✅ Corregido artículos: `articulos_single` → `single_articulo`
- ✅ Corregido artículos categoría: `categoria_articulos` → `articulos_categoria`
- ✅ Corregido videos: `single_video` → `videos_single`
- ✅ Documentado todos los tipos existentes

---

## 📞 Contacto

Si tienes dudas sobre nombres de tipos de página:
- Revisar este documento primero
- Verificar en BD con la consulta SQL
- Consultar los archivos de referencia en el código

**Última actualización:** 2025-12-02
