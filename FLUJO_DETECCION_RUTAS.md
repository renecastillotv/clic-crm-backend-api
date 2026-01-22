# Flujo Completo de Detección y Control de Rutas

## 🎯 Visión General

El sistema funciona en **2 etapas principales**:

1. **DETECCIÓN** (routeResolver.ts) - Determina QUÉ tipo de página es la URL
2. **CONTROL/DESPACHO** (index.ts) - Decide QUÉ handler ejecutar y QUÉ datos devolver

---

## 📋 PASO 1: DETECCIÓN DE RUTAS (routeResolver.ts)

### Ubicación: `edge/api-universal-resolver/resolvers/routeResolver.ts`

La función `resolveRoute()` es la encargada de **detectar** qué tipo de página es la URL.

### Flujo de Detección:

```
URL Entrante (ej: /articulos/inversiones)
    ↓
1. PASO 0: Buscar ruta EXACTA en tipos_pagina
   - Busca si existe una entrada con ruta_patron exacto = "/articulos/inversiones"
   - Si encuentra → retorna el codigo (pageType) de esa entrada
   - Si NO encuentra → continúa
    ↓
2. PASO 1: Buscar por PREFIJO en tipos_pagina
   - Extrae el primer segmento: "articulos"
   - Busca TODAS las entradas cuyo ruta_patron empiece con "/articulos"
   - Ejemplos encontrados:
     * articulos_listado: /articulos (nivel 0)
     * articulos_categoria: /articulos/categoria/:slug (nivel 1)
     * articulos_single: /articulos/:slug (nivel 2)
   - Llama a resolveTipoPaginaSimple() para determinar cuál es según segmentos
    ↓
3. resolveTipoPaginaSimple() determina:
   - Si URL tiene 0 segmentos adicionales → Directorio (articulos_listado)
   - Si URL tiene 1 segmento adicional:
     * Si tiene categorías → Categoría (articulos_categoria)
     * Si solo tiene single → Single (articulos_single)
   - Si URL tiene 2 segmentos → Single con categoría
    ↓
4. Si NO encuentra en tipos_pagina → PASO 2: Buscar en tenants_rutas_config_custom
   - Similar pero en tabla de rutas personalizadas del tenant
    ↓
5. Si NO encuentra nada → PASO 3 y 4: Tratar como PROPIEDADES
   - PASO 3: Verificar si el último segmento es slug de propiedad (single property)
   - PASO 4: Si no, todos los segmentos son tags para listado de propiedades
```

### Qué Devuelve routeResolver:

```typescript
{
  tipo: 'contenido' | 'propiedad_single' | 'propiedad_listado' | 'homepage',
  prefijo?: string,           // ej: "articulos"
  nivel?: number,             // 0=directorio, 1=categoría, 2=single
  categoria?: string,         // si es categoría
  slug?: string,              // si es single
  tags?: string[],            // si es property list
  idioma: string,             // 'es', 'en', 'fr'
  pageType?: string           // ⚠️ IMPORTANTE: El código de tipos_pagina (ej: "articulos_categoria")
}
```

**Ejemplo de retorno:**
```json
{
  "tipo": "contenido",
  "prefijo": "articulos",
  "nivel": 1,
  "categoria": "inversiones",
  "idioma": "es",
  "pageType": "articulos_categoria"
}
```

---

## 📋 PASO 2: CONTROL/DESPACHO (index.ts)

### Ubicación: `edge/api-universal-resolver/index.ts`

La función principal del Express **despacha** según el `tipo` y `pageType` devuelto por routeResolver.

### Flujo de Despacho:

```typescript
routeResolution = await resolveRoute(sql, pathname)
    ↓
if (tipo === 'homepage')
  → handleHomepage()
    ↓
else if (tipo === 'propiedad_single')
  → handleSingleProperty()
    ↓
else if (tipo === 'propiedad_listado')
  → handlePropertyList()
    ↓
else if (tipo === 'contenido')  // ⚠️ AQUÍ ES DONDE VA LA MAYORÍA
  → pageType = routeResolution.pageType  // "articulos_categoria"
    ↓
  if (pageType === 'articulos_listado')
    → handleArticleList()
    ↓
  else if (pageType === 'articulos_categoria')
    → handleArticleCategory()
    ↓
  else if (pageType === 'articulos_single')
    → handleSingleArticle()
    ↓
  // ... más pageTypes ...
    ↓
  else
    → ERROR: "Tipo de contenido no implementado"
```

### Mapeo Completo de pageType → Handler:

| pageType | Handler | Ubicación |
|----------|---------|-----------|
| `articulos_listado` | `handleArticleList` | handlers/articleHandler.ts |
| `articulos_categoria` | `handleArticleCategory` | handlers/articleHandler.ts |
| `articulos_single` | `handleSingleArticle` | handlers/articleHandler.ts |
| `videos_listado` | `handleVideoList` | handlers/videoHandler.ts |
| `videos_categoria` | `handleVideoCategory` | handlers/videoHandler.ts |
| `videos_single` | `handleSingleVideo` | handlers/videoHandler.ts |
| `testimonios` | `handleTestimonialList` | handlers/testimonialHandler.ts |
| `testimonios_categoria` | `handleTestimonialCategory` | handlers/testimonialHandler.ts |
| `testimonio_single` | `handleSingleTestimonial` | handlers/testimonialHandler.ts |
| `listado_asesores` | `handleAdvisorList` | handlers/advisorHandler.ts |
| `asesor_single` | `handleSingleAdvisor` | handlers/advisorHandler.ts |
| `favoritos` | `handleFavoritesMain` | handlers/favoritesHandler.ts |
| `favoritos_token` | `handleFavoritesShared` | handlers/favoritesHandler.ts |
| `ubicaciones` | `handleLocationList` | handlers/locationHandler.ts |
| `ubicaciones_single` | `handleSingleLocation` | handlers/locationHandler.ts |
| `tipos_propiedades` | `handlePropertyTypeList` | handlers/propertyTypeHandler.ts |
| `tipos_propiedades_single` | `handleSinglePropertyType` | handlers/propertyTypeHandler.ts |
| `propuestas_token` | `handleProposalShared` | handlers/proposalHandler.ts |
| `propiedades_listado` | `handlePropertyList` | handlers/propertyHandler.ts |
| `propiedades_single` | `handleSingleProperty` | handlers/propertyHandler.ts |
| `directorio_proyectos` | (inline) | index.ts |
| `single_proyecto` | (inline) | index.ts |
| `listados_curados` | `handleCuratedList` | handlers/curatedListHandler.ts |
| `landing_page` | `handleLanding` | handlers/landingHandler.ts |
| `politicas_privacidad` | (inline) | index.ts |
| `contacto` | (inline) | index.ts |
| `terminos_condiciones` | (inline) | index.ts |

---

## 📋 PASO 3: HANDLERS (handlers/*.ts)

### Qué Hace Cada Handler:

Cada handler es responsable de:

1. **Obtener datos de la BD** (si es necesario)
   - Ej: `handleSingleArticle()` busca el artículo por slug
   - Ej: `handleArticleList()` lista todos los artículos
   
2. **Normalizar los datos** (usando normalizers)
   - Convierte datos de BD a formato estándar
   - Asegura que todos los campos tengan nombres consistentes
   
3. **Retornar estructura completa**
   ```typescript
   {
     pageType: string,        // El pageType de BD
     language: string,        // Idioma detectado
     seo: {...},             // Metadatos SEO
     // ... datos específicos del contenido
   }
   ```

---

## 🔄 Flujo Completo: Ejemplo Real

### Ejemplo: `/articulos/inversiones`

```
1. Usuario hace request: GET /articulos/inversiones
    ↓
2. index.ts recibe el request
    ↓
3. Llama a resolveRoute(sql, "/articulos/inversiones")
    ↓
4. routeResolver.ts:
   a) Paso 0: Busca ruta exacta "/articulos/inversiones" → NO encuentra
   b) Paso 1: Busca prefijo "articulos"
      - Encuentra: articulos_listado, articulos_categoria, articulos_single
   c) resolveTipoPaginaSimple():
      - URL tiene 2 segmentos: ["articulos", "inversiones"]
      - Segmentos adicionales: 1
      - Tiene categorías (nivel máximo = 2)
      - Retorna: { tipo: 'contenido', pageType: 'articulos_categoria', categoria: 'inversiones' }
    ↓
5. index.ts recibe routeResolution:
   {
     tipo: 'contenido',
     pageType: 'articulos_categoria',
     categoria: 'inversiones',
     idioma: 'es'
   }
    ↓
6. index.ts evalúa:
   if (tipo === 'contenido') {
     if (pageType === 'articulos_categoria') {
       → handleArticleCategory(sql, 'inversiones', queryParams, 'es', 'articulos_categoria')
    ↓
7. handleArticleCategory():
   a) Busca categoría "inversiones" en categorias_contenido
   b) Llama a handleArticleList() con categoriaId
   c) Retorna estructura con artículos filtrados
    ↓
8. index.ts envía respuesta JSON al cliente
```

---

## ⚙️ Control de Qué Sale

### ¿Quién Controla Qué Sale?

1. **routeResolver.ts** → Controla QUÉ TIPO de página es (detecta)
2. **index.ts (dispatcher)** → Controla QUÉ HANDLER se ejecuta (despacha)
3. **handlers/*.ts** → Controlan QUÉ DATOS se devuelven (procesan)

### Ejemplo de Control:

```typescript
// routeResolver.ts controla:
"Esta URL es de tipo 'contenido' con pageType 'articulos_categoria'"
    ↓
// index.ts controla:
"Para 'articulos_categoria', ejecutar handleArticleCategory()"
    ↓
// handleArticleCategory() controla:
"Devolver lista de artículos de la categoría 'inversiones'"
```

---

## 🗄️ Base de Datos: La Fuente de Verdad

### Tabla: `tipos_pagina`

Esta tabla define TODAS las rutas disponibles:

| codigo | ruta_patron | nivel | ruta_padre | publico |
|--------|-------------|-------|------------|---------|
| `articulos_listado` | `/articulos` | 0 | null | true |
| `articulos_categoria` | `/articulos/categoria/:slug` | 1 | `articulos_listado` | true |
| `articulos_single` | `/articulos/:slug` | 2 | `articulos_categoria` | true |
| `favoritos` | `/favoritos` | 0 | null | false |
| `favoritos_token` | `/favoritos/:token` | 1 | `favoritos` | true |

**⚠️ IMPORTANTE**: 
- El campo `codigo` es lo que se usa como `pageType`
- El campo `ruta_patron` es lo que routeResolver compara con la URL
- El campo `nivel` define la jerarquía (0=directorio, 1=categoría, 2=single)
- El campo `publico` determina si se muestra en búsquedas públicas

---

## 🔍 Casos Especiales

### 1. Propiedades (Wildcard)
```
URL: /comprar/apartamento/bella-vista
    ↓
routeResolver NO encuentra prefijo conocido
    ↓
PASO 3: Verifica si "bella-vista" es slug de propiedad → NO
    ↓
PASO 4: Trata como property-list con tags: ["comprar", "apartamento", "bella-vista"]
```

### 2. Páginas con publico = false
```
URL: /favoritos
    ↓
routeResolver busca con visible = true (NO filtra por publico)
    ↓
Encuentra: favoritos (publico: false, visible: true)
    ↓
Retorna: pageType: "favoritos"
    ↓
index.ts ejecuta: handleFavoritesMain()
```

### 3. Rutas Exactas (PASO 0)
```
URL: /politicas-privacidad
    ↓
routeResolver PASO 0: Busca ruta exacta
    ↓
Encuentra: politicas_privacidad con ruta_patron = "/politicas-privacidad"
    ↓
Retorna INMEDIATAMENTE sin pasar por PASO 1
```

---

## 📝 Resumen Ejecutivo

1. **routeResolver.ts** = "Detector" - Determina QUÉ tipo de página es
2. **index.ts** = "Despachador" - Decide QUÉ handler ejecutar
3. **handlers/*.ts** = "Procesadores" - Obtienen datos y los devuelven
4. **tipos_pagina (BD)** = "Fuente de verdad" - Define todas las rutas disponibles

**Flujo: URL → Detección → Despacho → Procesamiento → Respuesta**




