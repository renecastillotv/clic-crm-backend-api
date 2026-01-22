# Nueva Lógica para resolveTipoPaginaSimple

## Flujo Completo

Para URL: `/en/testimonials/categoria/inversiones/mi-testimonio`

1. **Detectar tipo de página base**:
   - `/en/testimonials` → detecta `testimonios` (directorio)
   - Identifica: tiene categorías (`testimonios_categoria`) y single (`testimonio_single`)

2. **Descomponer segmentos**:
   - `categoria` → detecta que es el prefijo literal "categoria"
   - `inversiones` → slug de categoría
   - `mi-testimonio` → slug de single

3. **Buscar en BD con fallback**:
   - Buscar categoría `inversiones` en `categorias_contenido` tipo `testimonio`:
     * Primero en inglés (`slug_traducciones->>'en'`)
     * Si no encuentra, fallback a español (`slug`)
   - Buscar single `mi-testimonio` en `mock_testimonios`:
     * Primero en inglés (`slug_traducciones->>'en'`)
     * Si no encuentra, fallback a español (`slug`)

4. **Devolver estructura completa**:
   ```typescript
   {
     tipo: 'contenido',
     prefijo: 'testimonials',
     nivel: 2, // single con categoría
     categoria: 'inversiones', // slug original
     slug: 'mi-testimonio', // slug original
     idioma: 'en',
     pageType: 'testimonio_single',
     categoriaNotFound: false, // true si no se encontró
     slugNotFound: false // true si no se encontró
   }
   ```

## Casos a Manejar

### Caso 1: 0 segmentos adicionales → Directorio
- `/en/testimonials` → `testimonios` (listado)
- No necesita búsqueda en BD

### Caso 2: 1 segmento adicional
- Si tiene categorías: `/en/testimonials/inversiones` → Categoría
  * Buscar categoría en BD con fallback
  * Devolver `testimonios_categoria` con `categoriaNotFound` si no se encuentra
- Si solo tiene single: `/en/testimonials/mi-testimonio` → Single
  * Buscar single en BD con fallback
  * Devolver `testimonio_single` con `slugNotFound` si no se encuentra

### Caso 3: 2 segmentos adicionales
- Si segundo segmento es "categoria": `/en/testimonials/categoria/inversiones`
  * Buscar categoría `inversiones` en BD
  * Devolver `testimonios_categoria` con `categoriaNotFound` si no se encuentra
- Si no es "categoria": `/en/testimonials/inversiones/mi-testimonio`
  * Segundo segmento es categoría, tercero es slug
  * Buscar ambos en BD con fallback
  * Devolver `testimonio_single` con flags correspondientes

### Caso 4: 3 segmentos adicionales (con "categoria" literal)
- `/en/testimonials/categoria/inversiones/mi-testimonio`
  * Segundo segmento es "categoria" literal
  * Tercero es slug de categoría
  * Cuarto es slug de single
  * Buscar ambos en BD con fallback
  * Devolver `testimonio_single` con flags correspondientes




