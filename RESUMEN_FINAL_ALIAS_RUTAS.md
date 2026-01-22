# Resumen Final: Lógica de alias_rutas

## ✅ Respuesta Completa

### 1. ¿El detector usa alias_rutas para otros idiomas?

**SÍ**, ahora está optimizado:
- ✅ **PASO 0**: Verifica `alias_rutas` del idioma detectado para rutas exactas
- ✅ **PASO 1**: Prioriza `alias_rutas[idioma]` antes de buscar en todos los alias

### 2. ¿La tabla tiene todos los alias necesarios?

**NO**, faltan alias para directorios principales, pero **NO se necesitan para singles/categorías**.

---

## 🎯 Regla Fundamental

### ✅ SÍ necesitan alias_rutas:
- **Directorios** (páginas padre, nivel 0):
  - `ubicaciones` → `{"en":"locations","es":"ubicaciones",...}`
  - `tipos_propiedades` → `{"en":"property-types","es":"tipos-de-propiedades",...}`
  - `directorio_proyectos` → `{"en":"projects","es":"proyectos",...}`
  - `videos_listado`, `articulos_listado`, `propiedades_listado`, etc.
- **Páginas únicas/estáticas**:
  - `contacto`, `politicas_privacidad`, `terminos_condiciones`, `homepage`, `landing_page`

### ❌ NO necesitan alias_rutas:
- **Singles dinámicos**:
  - `ubicaciones_single`, `tipos_propiedades_single`, `single_proyecto`
- **Categorías**:
  - `testimonios_categoria`, `articulos_categoria`, `videos_categoria`

**Razón**: Los singles/categorías se resuelven desde las tablas de contenido usando el campo `traducciones` o `slug_traducciones`.

---

## 🔍 Flujo Completo

### Ejemplo: `/en/locations/santo-domingo`

```
1. extractIdioma():
   → idioma = "en"
   → cleanPath = "/locations/santo-domingo"

2. PASO 1: Buscar prefijo "locations"
   → Busca en alias_rutas["en"] de tipos_pagina
   → Encuentra: ubicaciones.alias_rutas["en"] = "locations"
   → ✅ Detecta directorio padre: "ubicaciones"

3. Resolución de tipo:
   → Prefijo: "ubicaciones"
   → Segundo segmento: "santo-domingo" (slug)
   → Determina: tipo = "ubicaciones_single"

4. Búsqueda en BD (handler):
   → Busca en tabla `ubicaciones`:
     WHERE slug = 'santo-domingo'
     OR slug_traducciones->>'en' = 'santo-domingo'
     OR slug_traducciones->>'es' = 'santo-domingo'  -- Fallback
```

---

## 📋 Script SQL Corregido

**Archivo**: `script_agregar_alias_rutas_CORREGIDO.sql`

**Incluye alias SOLO para**:
- ✅ `ubicaciones` (directorio)
- ✅ `tipos_propiedades` (directorio)
- ✅ `directorio_proyectos` (directorio)
- ✅ `videos_listado` (directorio)
- ✅ `landing_page` (corrige alias incorrecto)

**NO incluye** (correctamente):
- ❌ `ubicaciones_single`, `tipos_propiedades_single`, `single_proyecto`
- ❌ `testimonios_categoria`, etc.

---

## 📝 Próximos Pasos

1. ✅ **Ejecutar script SQL corregido**: Solo agrega alias a directorios
2. ⚠️ **Implementar búsqueda en traducciones**: Los handlers deben buscar slugs usando `slug_traducciones->>'en'` con fallback a español
3. ✅ **Código ya optimizado**: routeResolver.ts ya prioriza el idioma detectado

---

## 📊 Estado Actual

| Componente | Estado |
|------------|--------|
| **PASO 0 - alias_rutas** | ✅ Implementado |
| **PASO 1 - alias_rutas** | ✅ Optimizado (prioriza idioma) |
| **Script SQL** | ✅ Corregido (solo directorios) |
| **Búsqueda en traducciones (handlers)** | ⚠️ Pendiente de implementar |
