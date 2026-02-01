# Plan: Creador de Contenido con IA

## Resumen

Implementar un sistema de creación de contenido asistido por IA (ChatGPT) para generar:
1. **Artículos** - Contenido de blog para posicionamiento SEO
2. **FAQs** - Preguntas frecuentes naturales y relevantes
3. **SEO Stats** - Fragmentos enriquecidos con datos y estadísticas para páginas específicas

El sistema usará la integración existente de OpenAI (`gpt-4o-mini`) y será accesible solo para administradores.

---

## Arquitectura Propuesta

### Backend (API)

**Nuevo Servicio:** `packages/api/src/services/aiContentService.ts`

```typescript
// Funciones principales:
- generateArticle(params: ArticlePrompt): Promise<GeneratedArticle>
- generateFAQs(params: FAQPrompt): Promise<GeneratedFAQ[]>
- generateSeoStat(params: SeoStatPrompt): Promise<GeneratedSeoStat>
```

**Nuevas Rutas en:** `packages/api/src/routes/tenants/contenido.routes.ts`

```
POST /contenido/ai/generate-article    - Genera un artículo
POST /contenido/ai/generate-faqs       - Genera FAQs (batch de 5-10)
POST /contenido/ai/generate-seo-stat   - Genera un SEO Stat
```

### Frontend (CRM)

**Modificar:** `apps/crm-frontend/src/pages/crm/CrmContenido.tsx`

- Agregar botón "Crear con IA" junto a cada tipo de contenido
- Modal de generación con formulario de parámetros
- Preview del contenido generado antes de guardar
- Integración con el flujo existente de creación

---

## Detalle de Implementación

### 1. Servicio de IA (`aiContentService.ts`)

#### 1.1 Generador de Artículos

**Input:**
```typescript
interface ArticlePrompt {
  tema: string;           // Ej: "Guía para comprar tu primera casa"
  tipoPropiedad?: string; // apartamento, casa, local, etc.
  operacion?: string;     // comprar, alquilar
  ubicacion?: string;     // Naco, Santo Domingo, etc.
  palabrasClave?: string[];
  tono?: 'profesional' | 'casual' | 'informativo';
  longitud?: 'corto' | 'medio' | 'largo'; // 500, 1000, 1500+ palabras
}
```

**Output:**
```typescript
interface GeneratedArticle {
  titulo: string;
  slug: string;
  extracto: string;      // 150-200 caracteres
  contenido: string;     // HTML formateado
  metaTitulo: string;    // Max 60 caracteres
  metaDescripcion: string; // Max 160 caracteres
  tags: string[];
}
```

**System Prompt:**
```
Eres un experto en marketing inmobiliario y SEO para el mercado de República Dominicana.
Genera contenido profesional, útil y optimizado para motores de búsqueda.
El contenido debe ser natural, informativo y ayudar a los usuarios a tomar decisiones.
Usa datos y estadísticas del mercado inmobiliario dominicano cuando sea relevante.
Formato: HTML con headings (h2, h3), listas, y párrafos bien estructurados.
```

#### 1.2 Generador de FAQs

**Input:**
```typescript
interface FAQPrompt {
  contexto: string;       // Ej: "Proceso de compra de apartamentos en Naco"
  tipoPropiedad?: string;
  operacion?: string;
  ubicacion?: string;
  cantidad?: number;      // 5-10 FAQs
}
```

**Output:**
```typescript
interface GeneratedFAQ {
  pregunta: string;
  respuesta: string;
  contexto?: string;
}
```

**System Prompt:**
```
Genera preguntas frecuentes naturales que los usuarios realmente harían.
Las respuestas deben ser concisas pero completas (100-200 palabras).
Incluye información práctica y útil para el mercado inmobiliario de RD.
Las preguntas deben cubrir: proceso, costos, documentos, plazos, recomendaciones.
```

#### 1.3 Generador de SEO Stats

**Input:**
```typescript
interface SeoStatPrompt {
  // Targeting específico
  operaciones: string[];        // ['comprar', 'alquilar']
  tipoPropiedadIds?: string[];  // UUIDs de tipos
  ubicacionIds?: string[];      // UUIDs de ubicaciones

  // Contexto adicional para el prompt
  nombreUbicacion?: string;     // "Naco, Santo Domingo"
  nombreTipoPropiedad?: string; // "Apartamento"

  // Datos de mercado (opcional)
  precioPromedio?: number;
  propiedadesDisponibles?: number;
}
```

**Output:**
```typescript
interface GeneratedSeoStat {
  titulo: string;         // Ej: "Comprar Apartamento en Naco"
  descripcion: string;    // Resumen breve
  contenido: string;      // HTML con estadísticas y comparativas
  slug: string;
  metaTitulo: string;
  metaDescripcion: string;
  keywords: string[];

  // Matching arrays (para guardar)
  operaciones: string[];
  tipoPropiedadIds: string[];
  ubicacionIds: string[];
}
```

**System Prompt:**
```
Genera contenido SEO enriquecido con estadísticas y datos del mercado inmobiliario.
Incluye:
- Precio promedio por m² en la zona
- Comparativas con zonas similares
- Tendencias del mercado
- Ventajas de la ubicación/tipo de propiedad
- Datos demográficos relevantes
- Amenidades y servicios cercanos

El contenido debe ser informativo y ayudar a posicionar en búsquedas como:
"comprar apartamento en [ubicación]", "alquilar [tipo] en [zona]"

Formato: HTML con secciones claras, listas de datos, y párrafos concisos.
```

---

### 2. Endpoints API

#### `POST /contenido/ai/generate-article`
- Requiere permiso: `contenido:crear` + rol `admin`
- Rate limit: 10/minuto por tenant
- Valida parámetros y llama a `generateArticle()`
- Retorna contenido generado (sin guardar)

#### `POST /contenido/ai/generate-faqs`
- Requiere permiso: `contenido:crear` + rol `admin`
- Rate limit: 10/minuto por tenant
- Genera batch de 5-10 FAQs
- Retorna array de FAQs (sin guardar)

#### `POST /contenido/ai/generate-seo-stat`
- Requiere permiso: `contenido:crear` + rol `admin`
- Rate limit: 10/minuto por tenant
- Valida y enriquece con datos de ubicaciones/tipos
- Retorna SEO Stat completo (sin guardar)

---

### 3. Frontend - Modal de Creación IA

#### 3.1 Estructura del Modal

```jsx
<AIContentModal
  type="articulo" | "faq" | "seo-stat"
  onGenerate={(content) => ...}
  onSave={(content) => ...}
  onClose={() => ...}
/>
```

#### 3.2 Flujo de Usuario

1. **Selección de Tipo:**
   - Admin ve botón "Crear con IA" junto a cada tab (Artículos, FAQs, SEO Stats)
   - Click abre modal de generación

2. **Formulario de Parámetros:**
   - **Artículos:**
     - Tema/Título sugerido (required)
     - Tipo de propiedad (opcional, dropdown)
     - Operación (opcional, comprar/alquilar)
     - Ubicación (opcional, autocomplete)
     - Tono (profesional/casual/informativo)
     - Longitud (corto/medio/largo)

   - **FAQs:**
     - Contexto/Tema (required)
     - Tipo de propiedad (opcional)
     - Operación (opcional)
     - Ubicación (opcional)
     - Cantidad (5-10, default 5)

   - **SEO Stats:**
     - Ubicación (required, multi-select)
     - Tipo de propiedad (required, multi-select)
     - Operación (required, checkboxes)

3. **Generación:**
   - Botón "Generar con IA"
   - Loading state con mensaje
   - Preview del contenido generado

4. **Edición y Guardado:**
   - Contenido editable en el modal
   - Botón "Guardar" que usa el endpoint normal de creación
   - Opción "Regenerar" para nueva versión

#### 3.3 Visibilidad Admin Only

```typescript
// En CrmContenido.tsx
const isAdmin = userFromDb?.role === 'admin' || userFromDb?.role === 'superadmin';

// Solo mostrar botones de IA si es admin
{isAdmin && (
  <button onClick={() => setShowAIModal('articulo')}>
    <Sparkles size={16} /> Crear con IA
  </button>
)}
```

---

### 4. Consideraciones Técnicas

#### 4.1 Modelo OpenAI
- Usar `gpt-4o-mini` por balance costo/calidad
- `temperature: 0.7` para creatividad controlada
- `response_format: { type: "json_object" }` para parseo estructurado

#### 4.2 Rate Limiting
- Implementar rate limit por tenant (10 req/min)
- Guardar uso en cache (Redis o memory)
- Retornar 429 si se excede

#### 4.3 Error Handling
- Timeout de 30s para requests a OpenAI
- Retry con exponential backoff (max 3)
- Fallback a templates si OpenAI falla

#### 4.4 Costos
- gpt-4o-mini: ~$0.15/1M input, ~$0.60/1M output
- Estimado por generación:
  - Artículo largo: ~$0.002
  - 10 FAQs: ~$0.001
  - SEO Stat: ~$0.001

---

## Archivos a Crear/Modificar

### Crear:
1. `packages/api/src/services/aiContentService.ts` - Servicio de generación IA

### Modificar:
1. `packages/api/src/routes/tenants/contenido.routes.ts` - Agregar rutas de IA
2. `apps/crm-frontend/src/pages/crm/CrmContenido.tsx` - Agregar modal y botones

---

## Pasos de Implementación

### Fase 1: Backend (aiContentService)
- [ ] Crear servicio con las 3 funciones de generación
- [ ] Implementar system prompts optimizados
- [ ] Agregar validación de inputs
- [ ] Implementar rate limiting básico

### Fase 2: Backend (Routes)
- [ ] Agregar los 3 endpoints de generación
- [ ] Agregar verificación de rol admin
- [ ] Conectar con el servicio

### Fase 3: Frontend (Modal)
- [ ] Crear componente AIContentModal
- [ ] Implementar formularios para cada tipo
- [ ] Agregar preview y edición
- [ ] Conectar con endpoints

### Fase 4: Frontend (Integración)
- [ ] Agregar botones "Crear con IA" (solo admin)
- [ ] Integrar modal con flujo de guardado existente
- [ ] Testing completo

---

## Ejemplo de System Prompts Finales

### Artículo
```
Eres un escritor experto en bienes raíces para República Dominicana.
Genera un artículo SEO-optimizado sobre el tema proporcionado.

REGLAS:
- Título atractivo con keyword principal
- Extracto de 150-200 caracteres que enganche
- Contenido en HTML con h2, h3, listas y párrafos
- Meta título <= 60 caracteres
- Meta descripción <= 160 caracteres
- 3-5 tags relevantes
- Tono: {tono}
- Longitud: {palabras} palabras aproximadamente
- Incluir datos del mercado dominicano cuando sea relevante

Responde SOLO en JSON con la estructura:
{
  "titulo": "",
  "slug": "",
  "extracto": "",
  "contenido": "",
  "metaTitulo": "",
  "metaDescripcion": "",
  "tags": []
}
```

### FAQs
```
Genera {cantidad} preguntas frecuentes sobre: {contexto}
Contexto: mercado inmobiliario de República Dominicana
{ubicacion ? `Ubicación: ${ubicacion}` : ''}
{tipoPropiedad ? `Tipo de propiedad: ${tipoPropiedad}` : ''}
{operacion ? `Operación: ${operacion}` : ''}

REGLAS:
- Preguntas naturales que usuarios realmente harían
- Respuestas completas pero concisas (100-200 palabras)
- Incluir información práctica y útil
- Cubrir: proceso, costos, documentos, tiempos, recomendaciones

Responde SOLO en JSON:
{
  "faqs": [
    { "pregunta": "", "respuesta": "" }
  ]
}
```

### SEO Stat
```
Genera contenido SEO enriquecido para la página de resultados de:
Operación: {operaciones.join(' y ')}
{tipoPropiedad ? `Tipo: ${nombreTipoPropiedad}` : ''}
{ubicacion ? `Ubicación: ${nombreUbicacion}` : ''}

INCLUIR:
- Rango de precios estimados en la zona
- Comparativas con zonas similares
- Amenidades y servicios destacados
- Ventajas de la zona/tipo de propiedad
- Consejos para compradores/inquilinos

FORMATO:
- HTML con secciones claras
- Datos en listas o tablas simples
- Texto natural y profesional
- Optimizado para la búsqueda "{operacion} {tipo} en {ubicacion}"

Responde SOLO en JSON:
{
  "titulo": "",
  "descripcion": "",
  "contenido": "",
  "slug": "",
  "metaTitulo": "",
  "metaDescripcion": "",
  "keywords": []
}
```

---

## Notas Adicionales

- El contenido generado SIEMPRE se muestra en preview antes de guardar
- El admin puede editar el contenido antes de guardarlo
- Se puede regenerar si el resultado no es satisfactorio
- Los SEO Stats se relacionan automáticamente con las páginas de resultados correspondientes
