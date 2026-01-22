# Lógica Correcta de alias_rutas

## 🎯 Principio Fundamental

**SOLO los DIRECTORIOS y PÁGINAS ÚNICAS necesitan `alias_rutas`.**

Las páginas **single** y **categoría** NO necesitan `alias_rutas` porque:
- El slug se busca directamente en sus tablas respectivas
- Las tablas tienen campo `slug_traducciones` JSONB para búsquedas multilingües
- El detector ya sabe el tipo de página por el directorio padre

---

## 📋 Categorías de Páginas

### ✅ DIRECTORIOS (NECESITAN alias_rutas)

Estas son las páginas que actúan como prefijo en la URL:
- `ubicaciones` → `/ubicaciones` o `/en/locations`
- `tipos_propiedades` → `/tipos-de-propiedades` o `/en/property-types`
- `directorio_proyectos` → `/proyectos` o `/en/projects`
- `videos_listado` → `/videos` o `/en/videos`
- `testimonios` → `/testimonios` o `/en/testimonials`
- `articulos_listado` → `/articulos` o `/en/articles`
- `propiedades_listado` → `/propiedades` o `/en/properties`

**Lógica**: El detector usa `alias_rutas` para identificar qué tipo de directorio es basándose en el prefijo de la URL.

---

### ✅ PÁGINAS ÚNICAS/ESTÁTICAS (NECESITAN alias_rutas)

Estas son páginas completas sin parámetros dinámicos:
- `contacto` → `/contacto` o `/en/contact`
- `politicas_privacidad` → `/politicas-privacidad` o `/en/privacy-policy`
- `terminos_condiciones` → `/terminos-condiciones` o `/en/terms-conditions`
- `landing_page` → `/landing/:slug` (el prefijo "landing" necesita alias, pero cada landing individual no)

**Lógica**: Son rutas completas que se detectan directamente, necesitan alias para ser encontradas en otros idiomas.

---

### ❌ PÁGINAS SINGLE (NO NECESITAN alias_rutas)

Estas páginas tienen un padre directorio y el slug se busca en sus tablas:

| Código | Padre | Tabla de Búsqueda | Campo de Traducción |
|--------|-------|-------------------|---------------------|
| `ubicaciones_single` | `ubicaciones` | `ubicaciones` | `slug_traducciones` |
| `tipos_propiedades_single` | `tipos_propiedades` | `categoria_propiedades` | `slug_traducciones` |
| `single_proyecto` | `directorio_proyectos` | `proyectos` | `slug_traducciones` |
| `articulos_single` | `articulos_listado` | `articulos` | `slug_traducciones` |
| `videos_single` | `videos_listado` | `mock_videos` | `slug_traducciones` |
| `testimonio_single` | `testimonios` | `mock_testimonios` | `slug_traducciones` |
| `asesor_single` | `listado_asesores` | `mock_asesores` | `slug_traducciones` |
| `propiedades_single` | `propiedades_listado` | `propiedades` | `slug_traducciones` |

**Lógica**: 
1. El detector identifica el directorio padre usando `alias_rutas`
2. El siguiente segmento (slug) se busca en la tabla correspondiente
3. La búsqueda usa `slug_traducciones->>'idioma'` o fallback a `slug` en español

**Ejemplo**: 
```
URL: /en/locations/santo-domingo
    ↓
1. Detecta idioma: "en"
2. Detecta prefijo: "locations"
3. Busca en alias_rutas: "locations" → encuentra "ubicaciones"
4. Ya sabe que es tipo "ubicaciones" (directorio)
5. Siguiente segmento: "santo-domingo"
6. Busca en tabla "ubicaciones":
   SELECT * FROM ubicaciones 
   WHERE (slug_traducciones->>'en') = 'santo-domingo' 
      OR slug = 'santo-domingo'
7. Si encuentra → es ubicaciones_single
```

---

### ❌ PÁGINAS CATEGORÍA (NO NECESITAN alias_rutas)

Similar a single, pero para categorías:

| Código | Padre | Tabla de Búsqueda | Campo de Traducción |
|--------|-------|-------------------|---------------------|
| `articulos_categoria` | `articulos_listado` | `categorias_articulos` | `slug_traducciones` |
| `videos_categoria` | `videos_listado` | `categorias_videos` | `slug_traducciones` |
| `testimonios_categoria` | `testimonios` | `categorias_testimonios` | `slug_traducciones` |

**Lógica**: Igual que single, el slug se busca en la tabla de categorías correspondiente.

---

### ❌ PÁGINAS PRIVADAS/ESPECIALES (NO NECESITAN alias_rutas)

- `favoritos` → Página privada del usuario, no necesita traducción de ruta
- `favoritos_token` → Página compartida por token, no necesita alias
- `propuestas_token` → Página compartida por token, no necesita alias
- `listados_curados` → Si es `/listados-de-propiedades/:slug`, el slug se busca en su tabla

---

## 🔄 Flujo Completo de Detección

### Ejemplo 1: `/en/locations/santo-domingo`

```
1. extractIdioma() → { idioma: "en", cleanPath: "/locations/santo-domingo" }
2. Segmentos: ["locations", "santo-domingo"]

3. PASO 1: Buscar prefijo "locations"
   - Busca en ruta_patron: NO encuentra (ruta_patron es "/ubicaciones")
   - Busca en alias_rutas["en"]:
     * ubicaciones.alias_rutas["en"] = "locations" → ✅ COINCIDE
   - Identifica: tipo = "ubicaciones" (directorio)

4. resolveTipoPaginaSimple():
   - URL tiene 1 segmento adicional: "santo-domingo"
   - nivelMaximo = 1 (ubicaciones tiene singles)
   - → Es SINGLE

5. Buscar en tabla "ubicaciones":
   SELECT * FROM ubicaciones 
   WHERE (slug_traducciones->>'en') = 'santo-domingo' 
      OR slug = 'santo-domingo'
   - Si encuentra → pageType = "ubicaciones_single"
   - Si NO encuentra → fallback a propiedades o 404
```

---

### Ejemplo 2: `/en/projects/las-margaritas`

```
1. extractIdioma() → { idioma: "en", cleanPath: "/projects/las-margaritas" }
2. Segmentos: ["projects", "las-margaritas"]

3. PASO 1: Buscar prefijo "projects"
   - Busca en alias_rutas["en"]:
     * directorio_proyectos.alias_rutas["en"] = "projects" → ✅ COINCIDE
   - Identifica: tipo = "directorio_proyectos"

4. resolveTipoPaginaSimple():
   - URL tiene 1 segmento adicional: "las-margaritas"
   - → Es SINGLE

5. Buscar en tabla "proyectos":
   SELECT * FROM proyectos 
   WHERE (slug_traducciones->>'en') = 'las-margaritas' 
      OR slug = 'las-margaritas'
   - NOTA: "Las Margaritas" es un nombre propio, probablemente solo tenga slug en español
   - Si NO encuentra en inglés → fallback a español (slug = 'las-margaritas')
   - Si encuentra → pageType = "single_proyecto"
```

---

### Ejemplo 3: `/en/property-types/apartment`

```
1. extractIdioma() → { idioma: "en", cleanPath: "/property-types/apartment" }
2. Segmentos: ["property-types", "apartment"]

3. PASO 1: Buscar prefijo "property-types"
   - Busca en alias_rutas["en"]:
     * tipos_propiedades.alias_rutas["en"] = "property-types" → ✅ COINCIDE
   - Identifica: tipo = "tipos_propiedades"

4. resolveTipoPaginaSimple():
   - URL tiene 1 segmento adicional: "apartment"
   - → Es SINGLE

5. Buscar en tabla "categoria_propiedades":
   SELECT * FROM categoria_propiedades 
   WHERE (slug_traducciones->>'en') = 'apartment' 
      OR slug = 'apartment'
   - Si encuentra → pageType = "tipos_propiedades_single"
   - Si NO encuentra → fallback a español o 404
```

---

## 📝 Resumen de Cambios

### Script SQL Corregido

El script `script_agregar_alias_rutas_CORREGIDO.sql` ahora:
- ✅ Solo agrega alias_rutas a DIRECTORIOS y PÁGINAS ÚNICAS
- ❌ NO modifica páginas single/categoría (dejan alias_rutas vacío)
- ✅ Corrige landing_page si es necesario

### Páginas que DEBEN tener alias_rutas:

1. `ubicaciones` ✅
2. `tipos_propiedades` ✅
3. `directorio_proyectos` ✅
4. `videos_listado` ✅
5. `landing_page` ✅ (si es directorio)

### Páginas que NO deben tener alias_rutas:

- Todos los `*_single`
- Todos los `*_categoria`
- Páginas privadas/especiales




