# 📊 Análisis: Variantes Exclusivas CLIC

## 🎯 Objetivo

Implementar un sistema de **addons/features** para desbloquear variantes exclusivas de componentes del tenant CLIC, basadas en el `HomePageLayout` del proyecto `astro-clic`.

---

## 📋 Componentes Identificados en HomePageLayout

### 1. **MiniSearchBar**
- **Ubicación actual:** `C:\Users\Rene Castillo\astro-clic\astro-clic-project\src\components\MiniSearchBar.astro`
- **Variante usada:** `variant="hero"`
- **Características:**
  - Soporte multiidioma (es, en, fr)
  - Búsqueda avanzada con filtros (ubicación, tipo, precio, habitaciones, baños, parqueos)
  - Soporte de `searchTags`, `locationHierarchy`, `preselectedFilters`
  - Integración con monedas
  - Tracking string
- **Estado:** ✅ Ya existe variante `hero` en el sistema actual
- **Acción:** Verificar compatibilidad o crear variante exclusiva CLIC

### 2. **PropertyCarousel**
- **Ubicación actual:** `C:\Users\Rene Castillo\astro-clic\astro-clic-project\src\components\PropertyCarousel.astro`
- **Características:**
  - Carrusel de propiedades destacadas
  - Temas: `default`, `luxury`, `investment`
  - Soporte multiidioma
  - Integración con favoritos
  - Diseño responsive
- **Estado:** ❌ No existe en el sistema actual
- **Acción:** Crear componente `property_carousel` con variante `clic` exclusiva

### 3. **VideoGallery**
- **Ubicación actual:** `C:\Users\Rene Castillo\astro-clic\astro-clic-project\src\components\VideoGallery.astro`
- **Características:**
  - Galería de videos de YouTube
  - Layouts: `grid`, `carousel`, `featured`
  - Mostrar estadísticas (suscriptores, vistas)
  - Badges (Canal #1 de RD, Casa de Famosos)
  - Soporte multiidioma
- **Estado:** ❌ No existe en el sistema actual
- **Acción:** Crear componente `video_gallery` con variante `clic` exclusiva

### 4. **RelatedArticles**
- **Ubicación actual:** `C:\Users\Rene Castillo\astro-clic\astro-clic-project\src\components\RelatedArticles.astro`
- **Características:**
  - Listado de artículos relacionados
  - Layouts: `grid`, `featured`
  - Información de autor, fecha, tiempo de lectura
  - Estadísticas de vistas
  - Soporte multiidioma
- **Estado:** ❌ No existe en el sistema actual
- **Acción:** Crear componente `related_articles` con variante `clic` exclusiva

### 5. **Testimonials**
- **Ubicación actual:** `C:\Users\Rene Castillo\astro-clic\astro-clic-project\src\components\Testimonials.astro`
- **Características CLIC:**
  - Layouts: `default`, `grid`, `minimal`
  - Información del cliente (avatar, ubicación, profesión)
  - Cliente verificado
  - Rating
  - Ubicación de transacción
  - Soporte multiidioma
- **Estado:** ✅ Existe `testimonials` con variante `default`
- **Acción:** Crear variante `clic` exclusiva con características avanzadas

### 6. **PopularLocations**
- **Ubicación actual:** `C:\Users\Rene Castillo\astro-clic\astro-clic-project\src\components\PopularLocations.astro`
- **Características:**
  - Estilo "valla publicitaria" con hover mejorado
  - Data sources: `real_data`, `expert_zones`, `edge_function`
  - Mostrar ciudades y sectores destacados
  - Badges de propiedades disponibles
  - Soporte multiidioma
- **Estado:** ❌ No existe en el sistema actual
- **Acción:** Crear componente `popular_locations` con variante `clic` exclusiva

### 7. **DynamicFAQs**
- **Ubicación actual:** `C:\Users\Rene Castillo\astro-clic\astro-clic-project\src\components\DynamicFAQs.astro`
- **Características:**
  - FAQs dinámicos con contexto
  - Soporte de categorías y tags
  - Información contextual (ubicación, tipo de propiedad)
  - Soporte multiidioma
- **Estado:** ❌ No existe en el sistema actual
- **Acción:** Crear componente `dynamic_faqs` con variante `clic` exclusiva

---

## 🔐 Sistema de Addons/Features

### Feature: "CLIC Premium Variants"
- **Nombre:** `clic_premium_variants`
- **Categoría:** `addon`
- **Descripción:** "Desbloquea variantes exclusivas de componentes diseñadas específicamente para CLIC Inmobiliaria"
- **Público:** No (solo para tenants específicos)
- **Premium:** Sí
- **Planes disponibles:** `["premium", "enterprise"]` (configurable manualmente por tenant)

### Variantes Exclusivas

| Componente | Variante CLIC | Descripción |
|------------|---------------|-------------|
| `property_carousel` | `clic` | Carrusel de propiedades con temas luxury/investment |
| `video_gallery` | `clic` | Galería de videos con estadísticas y badges |
| `related_articles` | `clic` | Artículos relacionados con diseño avanzado |
| `testimonials` | `clic` | Testimonios con información detallada de clientes |
| `popular_locations` | `clic` | Ubicaciones populares estilo valla publicitaria |
| `dynamic_faqs` | `clic` | FAQs dinámicos con contexto |
| `search_bar` | `hero` | Barra de búsqueda integrada en hero (ya existe, verificar) |

---

## 🏗️ Implementación

### Paso 1: Crear Feature en BD
```sql
INSERT INTO features (
  name, 
  description, 
  icon, 
  category, 
  is_public, 
  is_premium,
  available_in_plans
) VALUES (
  'CLIC Premium Variants',
  'Desbloquea variantes exclusivas de componentes diseñadas específicamente para CLIC Inmobiliaria',
  'sparkles',
  'addon',
  false,
  true,
  '["premium", "enterprise"]'::jsonb
);
```

### Paso 2: Habilitar Feature para Tenant CLIC
```sql
-- Obtener ID del tenant CLIC (slug='clic')
-- Obtener ID del feature 'CLIC Premium Variants'
INSERT INTO tenants_features (tenant_id, feature_id)
VALUES ('<tenant-clic-uuid>', '<feature-uuid>');
```

### Paso 3: Agregar Variantes al Catálogo
- Agregar las nuevas variantes al catálogo de componentes
- Marcar como exclusivas del feature `clic_premium_variants`
- Actualizar el catálogo para incluir los nuevos componentes

### Paso 4: Modificar Servicio de Componentes
- Verificar si el tenant tiene el feature antes de mostrar variantes exclusivas
- Filtrar variantes no disponibles en `getCatalogoComponentes()`
- Validar al crear/configurar componentes

### Paso 5: Crear Componentes Astro
- Migrar componentes de `astro-clic` al proyecto actual
- Adaptar a la estructura de datos del sistema
- Implementar en `apps/web/src/components/`

---

## 📝 Estructura de Datos por Componente

### PropertyCarousel (`property_carousel`, variante `clic`)
```json
{
  "static_data": {
    "titulo": "Propiedades Destacadas",
    "subtitulo": "Las mejores oportunidades de inversión",
    "theme": "luxury",
    "viewAllLink": "/propiedades"
  },
  "dynamic_data": {
    "tipo": "propiedades",
    "filtros": {
      "destacado": true,
      "limite": 10
    }
  },
  "styles": {},
  "toggles": {
    "mostrarFavoritos": true,
    "mostrarPrecio": true
  }
}
```

### VideoGallery (`video_gallery`, variante `clic`)
```json
{
  "static_data": {
    "titulo": "Canal Inmobiliario",
    "subtitulo": "Contenido exclusivo",
    "layout": "featured",
    "mostrarEstadisticas": true,
    "mostrarBadges": true
  },
  "dynamic_data": {
    "tipo": "videos",
    "categoria": null,
    "limite": 6
  }
}
```

### RelatedArticles (`related_articles`, variante `clic`)
```json
{
  "static_data": {
    "titulo": "Artículos Relacionados",
    "subtitulo": "Contenido experto",
    "layout": "featured",
    "mostrarAutor": true,
    "mostrarFecha": true
  },
  "dynamic_data": {
    "tipo": "articulos",
    "limite": 6,
    "categoria": null
  }
}
```

### Testimonials (`testimonials`, variante `clic`)
```json
{
  "static_data": {
    "titulo": "Lo que dicen nuestros clientes",
    "subtitulo": "Experiencias reales",
    "layout": "grid"
  },
  "dynamic_data": {
    "tipo": "testimonios",
    "limite": 4,
    "mostrarRating": true,
    "mostrarUbicacion": true
  }
}
```

### PopularLocations (`popular_locations`, variante `clic`)
```json
{
  "static_data": {
    "titulo": "Destinos de inversión destacados",
    "subtitulo": "Oportunidades en las zonas más prometedoras",
    "showType": "mixed",
    "dataSource": "edge_function",
    "showBadges": true
  },
  "dynamic_data": {
    "tipo": "ubicaciones",
    "maxItems": 12
  }
}
```

### DynamicFAQs (`dynamic_faqs`, variante `clic`)
```json
{
  "static_data": {
    "titulo": "Preguntas Frecuentes",
    "context": {
      "location": "República Dominicana",
      "hasMarketInsights": true
    }
  },
  "dynamic_data": {
    "tipo": "faqs",
    "categoria": null
  }
}
```

---

## ✅ Checklist de Implementación

- [ ] Crear feature "CLIC Premium Variants" en BD
- [ ] Habilitar feature para tenant CLIC
- [ ] Crear migración para agregar variantes al catálogo
- [ ] Modificar `getCatalogoComponentes()` para filtrar por features
- [ ] Crear componente `PropertyCarouselClic.astro`
- [ ] Crear componente `VideoGalleryClic.astro`
- [ ] Crear componente `RelatedArticlesClic.astro`
- [ ] Crear componente `TestimonialsClic.astro`
- [ ] Crear componente `PopularLocationsClic.astro`
- [ ] Crear componente `DynamicFAQsClic.astro`
- [ ] Actualizar `ComponentRenderer.astro` con nuevos componentes
- [ ] Actualizar tipos TypeScript
- [ ] Probar renderizado con tenant CLIC
- [ ] Verificar que otros tenants no ven las variantes exclusivas

---

## 🔍 Verificación de Features

### Endpoint: Verificar Feature
```typescript
async function tenantHasFeature(tenantId: string, featureName: string): Promise<boolean> {
  // 1. Buscar feature por nombre
  // 2. Verificar si tenant tiene el feature habilitado
  // 3. Verificar si el plan del tenant incluye el feature
  // Retornar true si cualquiera de las condiciones se cumple
}
```

### Uso en Servicios
```typescript
// En getCatalogoComponentes()
const hasClicVariants = await tenantHasFeature(tenantId, 'clic_premium_variants');
const variantes = componente.variantes.filter(v => {
  if (v.id.includes('clic') && !hasClicVariants) {
    return false; // Ocultar variantes CLIC si no tiene el feature
  }
  return true;
});
```

---

## 📚 Referencias

- **HomePageLayout:** `C:\Users\Rene Castillo\astro-clic\astro-clic-project\src\layouts\HomePageLayout.astro`
- **Componentes fuente:** `C:\Users\Rene Castillo\astro-clic\astro-clic-project\src\components\`
- **Sistema actual:** `apps/web/src/components/`
- **API Features:** `packages/api/src/services/adminFeaturesService.ts`

