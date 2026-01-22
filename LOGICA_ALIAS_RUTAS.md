# Lógica Correcta de alias_rutas

## 🎯 Regla Fundamental

**Los `alias_rutas` SOLO deben estar en:**
1. ✅ **Directorios** (páginas padre, nivel 0): `ubicaciones`, `tipos_propiedades`, `directorio_proyectos`
2. ✅ **Páginas únicas/estáticas**: `contacto`, `politicas_privacidad`, `terminos_condiciones`, `homepage`

**Los `alias_rutas` NO deben estar en:**
1. ❌ **Singles dinámicos**: `ubicaciones_single`, `tipos_propiedades_single`, `single_proyecto`
2. ❌ **Categorías**: `testimonios_categoria`, `articulos_categoria`, `videos_categoria`

---

## 🔍 Flujo de Detección

### Ejemplo 1: `/en/locations/santo-domingo`

```
1. extractIdioma():
   - Detecta: idioma = "en"
   - cleanPath = "/locations/santo-domingo"
   
2. PASO 0: Buscar ruta exacta
   - Busca "/locations/santo-domingo" → NO encuentra
   - Busca en alias_rutas["en"] = "locations" → NO (es exacta, no por prefijo)
   
3. PASO 1: Buscar por prefijo
   - Extrae primer segmento: "locations"
   - Busca en tipos_pagina:
     * Compara "locations" con ruta_patron "/ubicaciones" → NO coincide
     * Compara "locations" con alias_rutas["en"] de cada tipo
     * Encuentra: ubicaciones.alias_rutas["en"] = "locations" → ✅ COINCIDE
   
4. Resolución:
   - Prefijo detectado: "ubicaciones" (directorio)
   - Segundo segmento: "santo-domingo" (slug)
   - Determina que es "ubicaciones_single" (tiene ruta_patron "/ubicaciones/:slug")
   
5. Búsqueda en BD:
   - Busca en tabla `ubicaciones`:
     * WHERE slug = 'santo-domingo' 
     * OR traducciones->>'en'->>'slug' = 'santo-domingo'
     * Si no encuentra, fallback a español:
     * OR traducciones->>'es'->>'slug' = 'santo-domingo'
```

### Ejemplo 2: `/proyectos/las-margaritas`

```
1. extractIdioma():
   - Detecta: idioma = "es" (por defecto)
   - cleanPath = "/proyectos/las-margaritas"
   
2. PASO 1: Buscar por prefijo
   - Extrae: "proyectos"
   - Busca en tipos_pagina:
     * Compara con ruta_patron "/proyectos" → ✅ COINCIDE
     * Tipo: directorio_proyectos
   
3. Resolución:
   - Prefijo: "proyectos"
   - Segundo segmento: "las-margaritas" (slug único del proyecto)
   - Determina que es "single_proyecto"
   
4. Búsqueda en BD:
   - Busca en tabla `proyectos`:
     * WHERE slug = 'las-margaritas'
     * NOTA: Los proyectos tienen nombres únicos, NO tienen traducciones
     * "Las Margaritas" es el nombre real, no necesita traducción
```

### Ejemplo 3: `/en/property-types/apartment`

```
1. extractIdioma():
   - idioma = "en"
   - cleanPath = "/property-types/apartment"
   
2. PASO 1:
   - Prefijo: "property-types"
   - Busca en alias_rutas["en"] → encuentra tipos_propiedades
   
3. Resolución:
   - Tipo padre: tipos_propiedades
   - Slug: "apartment"
   - Tipo detectado: tipos_propiedades_single
   
4. Búsqueda en BD:
   - Busca en tabla `tipos_propiedades`:
     * WHERE slug = 'apartment'
     * OR traducciones->>'en'->>'slug' = 'apartment'
     * Fallback: traducciones->>'es'->>'slug' = 'apartment'
```

---

## 📊 Tabla de Decisión

| Tipo de Página | ¿Necesita alias_rutas? | Razón |
|----------------|------------------------|-------|
| `ubicaciones` (directorio) | ✅ SÍ | Es un directorio, debe traducirse |
| `ubicaciones_single` | ❌ NO | Se resuelve desde tabla `ubicaciones` usando traducciones |
| `tipos_propiedades` (directorio) | ✅ SÍ | Es un directorio |
| `tipos_propiedades_single` | ❌ NO | Se resuelve desde tabla `tipos_propiedades` |
| `directorio_proyectos` | ✅ SÍ | Es un directorio |
| `single_proyecto` | ❌ NO | Cada proyecto tiene nombre único, se busca por slug |
| `articulos_listado` | ✅ SÍ | Es un directorio |
| `articulos_categoria` | ❌ NO | Se resuelve desde `categorias_contenido` |
| `articulos_single` | ❌ NO | Se resuelve desde tabla `articulos` |
| `contacto` | ✅ SÍ | Página única/estática |
| `politicas_privacidad` | ✅ SÍ | Página única/estática |
| `landing_page` | ✅ SÍ | Página única/estática (aunque tenga slug) |

---

## 🔧 Implementación en Código

### 1. Detección del Directorio (PASO 1)

```typescript
// Busca prefijo en alias_rutas del idioma detectado
if (aliasRutas[idioma] && typeof aliasRutas[idioma] === 'string') {
  const aliasIdiomaSeg = aliasRutas[idioma].split('/').filter(Boolean)[0];
  if (aliasIdiomaSeg === primerSegmento) {
    // Encontró el directorio padre
    // Ejemplo: "locations" → tipo padre = "ubicaciones"
  }
}
```

### 2. Búsqueda del Slug en Tablas (handlers)

```typescript
// En handleSingleLocation():
async function handleSingleLocation(sql: any, slug: string, idioma: string) {
  // Buscar en tabla ubicaciones
  const ubicacion = await sql`
    SELECT * FROM ubicaciones
    WHERE slug = ${slug}
      OR (traducciones->>${idioma}->>'slug')::text = ${slug}
      OR (traducciones->>'es'->>'slug')::text = ${slug}  -- Fallback
    LIMIT 1
  `;
  
  if (!ubicacion || ubicacion.length === 0) {
    return { pageType: '404', error: 'Ubicación no encontrada' };
  }
  
  return { ... };
}
```

---

## ✅ Script SQL Corregido

El script `script_agregar_alias_rutas_CORREGIDO.sql` ahora:
- ✅ Solo agrega alias a directorios
- ✅ Corrige landing_page
- ❌ NO agrega alias a singles/categorías
