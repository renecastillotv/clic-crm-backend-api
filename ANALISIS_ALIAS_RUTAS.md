# Análisis de alias_rutas en tipos_pagina

## 🔍 Cómo Funciona Actualmente

### Flujo de Detección con Idiomas:

```
URL: /en/articles
    ↓
extractIdioma():
  - Detecta idioma: "en"
  - cleanPath: "/articles"
    ↓
PASO 1: Buscar prefijo "articles"
  - Busca en ruta_patron: "/articulos" → NO coincide
  - Busca en alias_rutas:
    * Compara "articles" con TODOS los valores de alias_rutas
    * Encuentra: { "en": "articles", "es": "articulos", ... }
    * → Coincide
```

**Problema actual**: El código busca en TODOS los valores de `alias_rutas`, no prioriza el idioma detectado.

---

## 📊 Análisis de alias_rutas en la BD

### ✅ Páginas CON alias_rutas completos:

1. **politicas_privacidad**
   - ✅ `{"en":"privacy-policy","es":"politicas-privacidad","fr":"politique-confidentialite","pt":"politica-privacidade"}`

2. **testimonio_single**
   - ✅ `{"en":"testimonials","es":"testimonios","fr":"temoignages","pt":"depoimentos"}`

3. **listado_asesores**
   - ✅ `{"en":"agents","es":"asesores","fr":"agents","pt":"consultores"}`

4. **homepage**
   - ✅ `{"en":"","es":"","fr":"","pt":""}` (vacío pero existe)

5. **articulos_single**
   - ✅ `{"en":"articles","es":"articulos","fr":"articles","pt":"artigos"}`

6. **videos_categoria**
   - ✅ `{"en":"videos","es":"videos","fr":"videos","pt":"videos"}`

7. **contacto**
   - ✅ `{"en":"contact","es":"contacto","fr":"contact","pt":"contato"}`

8. **terminos_condiciones**
   - ✅ `{"en":"terms-conditions","es":"terminos-condiciones","fr":"termes-conditions","pt":"termos-condicoes"}`

9. **videos_single**
   - ✅ `{"en":"videos","es":"videos","fr":"videos","pt":"videos"}`

10. **testimonios**
    - ✅ `{"en":"testimonials","es":"testimonios","fr":"temoignages","pt":"depoimentos"}`

11. **propiedades_single**
    - ✅ `{"en":"properties","es":"propiedades","fr":"proprietes","pt":"imoveis"}`

12. **asesor_single**
    - ✅ `{"en":"agents","es":"asesores","fr":"agents","pt":"consultores"}`

13. **articulos_categoria**
    - ✅ `{"en":"articles","es":"articulos","fr":"articles","pt":"artigos"}`

14. **articulos_listado**
    - ✅ `{"en":"articles","es":"articulos","fr":"articles","pt":"artigos"}`

15. **propiedades_listado**
    - ✅ `{"en":"properties","es":"propiedades","fr":"proprietes","pt":"imoveis"}`

16. **landing_page**
    - ⚠️ `{"en":"projects","es":"proyectos","fr":"projets","pt":"projetos"}` (pero debería ser "landing")

---

### ❌ Páginas SIN alias_rutas (vacío `{}`):

**NOTA IMPORTANTE**: Según la lógica correcta, estas páginas NO deben tener alias_rutas:

#### Páginas Single (NO necesitan alias):
- El slug se busca en sus tablas usando `slug_traducciones`
1. **ubicaciones_single** → `{}` ✅ Correcto
2. **tipos_propiedades_single** → `{}` ✅ Correcto
3. **single_proyecto** → `{}` ✅ Correcto (cada proyecto tiene nombre único)
4. **articulos_single** → Ya tiene, pero no debería necesitarlo
5. **videos_single** → Ya tiene, pero no debería necesitarlo
6. **testimonio_single** → Ya tiene, pero no debería necesitarlo
7. **asesor_single** → Ya tiene, pero no debería necesitarlo
8. **propiedades_single** → Ya tiene, pero no debería necesitarlo

#### Páginas Categoría (NO necesitan alias):
- El slug se busca en tablas de categorías usando `slug_traducciones`
9. **testimonios_categoria** → `{}` ✅ Correcto
10. **articulos_categoria** → Ya tiene, pero no debería necesitarlo
11. **videos_categoria** → Ya tiene, pero no debería necesitarlo

#### Páginas Privadas/Especiales (NO necesitan alias):
12. **favoritos** → `{}` ✅ Correcto (página privada)
13. **favoritos_token** → `{}` ✅ Correcto (compartido por token)
14. **propuestas_token** → `{}` ✅ Correcto (compartido por token)
15. **listados_curados** → `{}` ✅ Correcto (slug se busca en su tabla)

#### Páginas Personalizadas:
16. **custom** → `{}` ✅ Correcto (personalizada)

#### ⚠️ Páginas Directorio que SÍ necesitan alias (actualmente vacío):
17. **ubicaciones** → `{}` ❌ **DEBE TENER alias**
18. **tipos_propiedades** → `{}` ❌ **DEBE TENER alias**
19. **directorio_proyectos** → `{}` ❌ **DEBE TENER alias**
20. **videos_listado** → `{}` ❌ **DEBE TENER alias**

---

## 🔧 Mejoras Realizadas

### 1. ✅ Optimizar Búsqueda de Alias en PASO 1

**Problema anterior**: Buscaba en TODOS los alias sin priorizar el idioma detectado.

**Mejora aplicada**: Ahora prioriza el alias del idioma detectado antes de buscar en todos:

```typescript
```typescript
// ✅ CORREGIDO en routeResolver.ts (líneas 399-415):
// 1. Primero verificar alias del idioma detectado (más eficiente)
if (aliasRutas[idioma] && typeof aliasRutas[idioma] === 'string') {
  const aliasIdiomaSeg = aliasRutas[idioma].split('/').filter(Boolean)[0];
  if (aliasIdiomaSeg === primerSegmento) return true;
}

// 2. Fallback: buscar en todos los alias (por si el idioma no tiene alias definido)
const aliasPrimerSegmento = Object.values(aliasRutas).find((alias: any) => {
  if (typeof alias === 'string') {
    const aliasSeg = alias.split('/').filter(Boolean)[0];
    return aliasSeg === primerSegmento;
  }
  return false;
});
if (aliasPrimerSegmento) return true;
```

### 2. ✅ Agregar Búsqueda de Alias en PASO 0

**Problema anterior**: PASO 0 solo buscaba por `ruta_patron` exacto, no verificaba `alias_rutas`.

**Mejora aplicada**: Ahora también verifica `alias_rutas` del idioma detectado si no encuentra por `ruta_patron`:

```typescript
// ✅ CORREGIDO en routeResolver.ts (PASO 0):
// Primero busca por ruta_patron
let rutaDirectaResult = await sql`... WHERE ruta_patron = ${normalizedPath}`;

// Si no encuentra, busca en alias_rutas del idioma detectado
if (!rutaDirectaResult || rutaDirectaResult.length === 0) {
  // Busca en todos los tipos y filtra por alias_rutas[idioma]
  rutaDirectaResult = todosTipos.filter((tipo: any) => {
    const alias = tipo.alias_rutas[idioma];
    return alias === normalizedPath;
  });
}
```

### 2. Agregar alias_rutas Faltantes

Las siguientes páginas deberían tener alias_rutas:

#### Directorios que DEBEN tener alias_rutas:

1. **ubicaciones** ✅ Directorio principal
   ```json
   {"en":"locations","es":"ubicaciones","fr":"emplacements","pt":"localizacoes"}
   ```

2. **tipos_propiedades** ✅ Directorio principal
   ```json
   {"en":"property-types","es":"tipos-de-propiedades","fr":"types-proprietes","pt":"tipos-propriedades"}
   ```

3. **directorio_proyectos** ✅ Directorio principal
   ```json
   {"en":"projects","es":"proyectos","fr":"projets","pt":"projetos"}
   ```

4. **videos_listado** ✅ Directorio principal
   ```json
   {"en":"videos","es":"videos","fr":"videos","pt":"videos"}
   ```

5. **landing_page** ⚠️ Corregir (actualmente dice "projects" pero debería ser "landing")
   ```json
   {"en":"landing","es":"landing","fr":"landing","pt":"landing"}
   ```

#### ❌ NO agregar alias a estas páginas (single/categoría):

- **ubicaciones_single** → NO necesita (busca slug en tabla `ubicaciones` con `slug_traducciones`)
- **tipos_propiedades_single** → NO necesita (busca slug en tabla `categoria_propiedades` con `slug_traducciones`)
- **single_proyecto** → NO necesita (busca slug en tabla `proyectos` con `slug_traducciones`, cada proyecto tiene nombre único)
- **testimonios_categoria** → NO necesita (busca slug en tabla `categorias_testimonios` con `slug_traducciones`)

#### ❌ NO agregar alias a páginas privadas:

- **favoritos** → NO necesita (página privada)
- **favoritos_token** → NO necesita (compartido por token)
- **propuestas_token** → NO necesita (compartido por token)
- **listados_curados** → NO necesita (slug se busca en su tabla)

---

## 🎯 Recomendaciones

1. ✅ **Optimizar búsqueda de alias**: Ya implementado - Prioriza el idioma detectado
2. ✅ **Búsqueda de alias en PASO 0**: Ya implementado - Verifica alias para rutas exactas
3. ✅ **Corregir script SQL**: Usar `script_agregar_alias_rutas_CORREGIDO.sql` (solo directorios)
4. ⚠️ **Implementar búsqueda en traducciones**: Los handlers deben buscar slugs en campo `traducciones` con fallback a español
5. ⚠️ **Verificar landing_page**: Corregir alias de "projects" a "landing"




