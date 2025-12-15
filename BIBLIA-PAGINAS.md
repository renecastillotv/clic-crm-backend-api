# BIBLIA DE PAGINAS - Sistema CLIC

> **Documento de referencia definitivo** para la creacion, personalizacion y renderizado de paginas en el sistema CLIC.

---

## TABLA DE CONTENIDOS

1. [Arquitectura General](#1-arquitectura-general)
2. [Base de Datos - Tablas](#2-base-de-datos---tablas)
3. [Catalogo de Componentes](#3-catalogo-de-componentes)
4. [Flujo de Resolucion de Paginas](#4-flujo-de-resolucion-de-paginas)
5. [Estructura de Datos de Componentes](#5-estructura-de-datos-de-componentes)
6. [Sistema de Scopes y Herencia](#6-sistema-de-scopes-y-herencia)
7. [Componentes del Frontend](#7-componentes-del-frontend)
8. [TODO - Pendientes de Implementacion](#8-todo---pendientes-de-implementacion)

---

## 1. ARQUITECTURA GENERAL

### Flujo de una Peticion

```
URL del usuario
       |
       v
[routeResolver.ts]  -->  Determina tipo de pagina
       |
       v
[getSeccionesResueltas()]  -->  Obtiene componentes
       |
       v
[ComponentRenderer.astro]  -->  Renderiza cada componente
       |
       v
HTML final
```

### Archivos Clave

| Archivo | Ubicacion | Funcion |
|---------|-----------|---------|
| `routeResolver.ts` | `packages/api/src/services/` | Resuelve URL -> tipo de pagina |
| `seccionesService.ts` | `packages/api/src/services/` | Obtiene componentes configurados |
| `paginasService.ts` | `packages/api/src/services/` | Gestion de paginas |
| `ComponentRenderer.astro` | `apps/web/src/components/` | Renderiza componentes dinamicamente |

---

## 2. BASE DE DATOS - TABLAS

### 2.1 `catalogo_componentes`

**Proposito**: Define TODOS los tipos de componentes disponibles en el sistema y sus campos configurables.

```sql
CREATE TABLE catalogo_componentes (
  tipo VARCHAR(50) PRIMARY KEY,           -- Identificador unico del tipo
  nombre VARCHAR(100) NOT NULL,           -- Nombre legible
  descripcion VARCHAR(255),               -- Descripcion corta
  icono VARCHAR(10),                      -- Emoji representativo
  categoria VARCHAR(50) NOT NULL,         -- layout, content, display, forms
  variantes JSONB NOT NULL DEFAULT '[]',  -- Array de variantes disponibles
  campos_config JSONB NOT NULL DEFAULT '[]', -- Campos que acepta el componente
  es_global BOOLEAN DEFAULT false,        -- Si es global (header, footer)
  disponible BOOLEAN DEFAULT true,        -- Si esta disponible para uso
  orden INTEGER DEFAULT 0                 -- Orden en la UI
);
```

### 2.2 `componentes_web`

**Proposito**: Almacena las configuraciones de componentes por tenant.

```sql
CREATE TABLE componentes_web (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tipo VARCHAR(50) NOT NULL,              -- Tipo del componente (header, hero, etc.)
  variante VARCHAR(50) DEFAULT 'default', -- Variante del componente
  nombre VARCHAR(100),                    -- Nombre identificador opcional
  datos JSONB DEFAULT '{}',               -- Configuracion del componente
  activo BOOLEAN DEFAULT true,            -- Si esta activo
  orden INTEGER DEFAULT 0,                -- Orden de visualizacion
  scope VARCHAR(20) DEFAULT 'tenant',     -- tenant, page_type, page
  tipo_pagina VARCHAR(50),                -- Para scope=page_type
  pagina_id UUID REFERENCES paginas_web(id), -- Para scope=page
  es_activo BOOLEAN DEFAULT false,        -- Si esta variante es la activa
  config_completa BOOLEAN DEFAULT false,  -- Si tiene todos los campos requeridos
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.3 `paginas_componentes`

**Proposito**: Relacion muchos-a-muchos entre paginas y componentes (referencias).

```sql
CREATE TABLE paginas_componentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagina_id UUID NOT NULL REFERENCES paginas_web(id),
  componente_id UUID NOT NULL REFERENCES componentes_web(id),
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pagina_id, componente_id)
);
```

---

## 3. CATALOGO DE COMPONENTES

### 3.1 Componentes de Layout (Globales)

#### HEADER
```json
{
  "tipo": "header",
  "categoria": "layout",
  "es_global": true,
  "variantes": [
    { "id": "default", "nombre": "Clasico", "descripcion": "Logo izquierda, nav centro, CTA derecha" }
  ],
  "campos_config": [
    { "key": "logo", "label": "Logo URL", "type": "image", "required": true },
    { "key": "logoAlt", "label": "Texto alternativo del logo", "type": "text", "required": false },
    { "key": "links", "label": "Enlaces de navegacion", "type": "array", "required": false },
    { "key": "mostrarBotonContacto", "label": "Mostrar boton contacto", "type": "boolean", "default": true },
    { "key": "textoBotonContacto", "label": "Texto del boton", "type": "text", "default": "Contactar" },
    { "key": "urlBotonContacto", "label": "URL del boton", "type": "text", "default": "/contacto" }
  ]
}
```

#### FOOTER
```json
{
  "tipo": "footer",
  "categoria": "layout",
  "es_global": true,
  "variantes": [
    { "id": "default", "nombre": "Completo", "descripcion": "Logo, columnas, redes, copyright" }
  ],
  "campos_config": [
    { "key": "logo", "label": "Logo URL", "type": "image", "required": false },
    { "key": "descripcion", "label": "Descripcion de la empresa", "type": "textarea", "required": false },
    { "key": "copyright", "label": "Texto copyright", "type": "text", "required": true },
    { "key": "columnas", "label": "Columnas de enlaces", "type": "array", "required": false },
    { "key": "redesSociales", "label": "Redes sociales", "type": "array", "required": false },
    { "key": "direccion", "label": "Direccion", "type": "text", "required": false },
    { "key": "telefono", "label": "Telefono", "type": "text", "required": false },
    { "key": "email", "label": "Email", "type": "email", "required": false }
  ]
}
```

### 3.2 Componentes de Contenido

#### HERO
```json
{
  "tipo": "hero",
  "categoria": "content",
  "variantes": [
    { "id": "default", "nombre": "Centrado", "descripcion": "Imagen fondo con texto centrado y CTAs" },
    { "id": "variant1", "nombre": "Dividido", "descripcion": "Texto izquierda, imagen derecha" },
    { "id": "variant2", "nombre": "Con busqueda", "descripcion": "Hero con barra de busqueda" },
    { "id": "variant3", "nombre": "Lateral", "descripcion": "Imagen fondo, texto alineado izquierda" },
    { "id": "simple", "nombre": "Simple", "descripcion": "Solo titulo y subtitulo" }
  ],
  "campos_config": [
    { "key": "titulo", "label": "Titulo", "type": "text", "required": true },
    { "key": "subtitulo", "label": "Subtitulo", "type": "text", "required": false },
    { "key": "descripcion", "label": "Descripcion", "type": "textarea", "required": false },
    { "key": "textoBoton", "label": "Texto del boton", "type": "text", "required": false },
    { "key": "urlBoton", "label": "URL del boton", "type": "text", "required": false },
    { "key": "textoBoton2", "label": "Texto boton secundario", "type": "text", "required": false },
    { "key": "urlBoton2", "label": "URL boton secundario", "type": "text", "required": false },
    { "key": "imagenFondo", "label": "Imagen de fondo", "type": "image", "required": true },
    { "key": "imagenLateral", "label": "Imagen lateral (variant1)", "type": "image", "required": false }
  ]
}
```

**Campos especiales para Hero con buscador (homepage):**
```json
{
  "static_data": {
    "badge": "Texto del badge",
    "stats": [
      { "numero": "10,000+", "etiqueta": "Propiedades" }
    ],
    "buscador_tabs": [
      { "valor": "venta", "etiqueta": "Comprar" },
      { "valor": "renta", "etiqueta": "Alquilar" }
    ],
    "buscador_placeholder_ubicacion": "Ciudad, zona o direccion",
    "buscador_label_tipo": "Tipo de propiedad",
    "buscador_label_precio": "Rango de precio",
    "buscador_texto_boton": "Buscar Propiedades"
  },
  "toggles": {
    "mostrarBadge": true,
    "mostrarStats": true,
    "mostrarBuscador": true
  }
}
```

#### FEATURES
```json
{
  "tipo": "features",
  "categoria": "content",
  "variantes": [
    { "id": "default", "nombre": "Grid", "descripcion": "Caracteristicas en grid con iconos" }
  ],
  "campos_config": [
    { "key": "titulo", "label": "Titulo de seccion", "type": "text", "required": false },
    { "key": "subtitulo", "label": "Subtitulo", "type": "text", "required": false },
    { "key": "items", "label": "Caracteristicas", "type": "array", "required": true }
  ]
}
```

**Estructura de items (features):**
```json
{
  "static_data": {
    "features": [
      {
        "icono": "home",  // Iconos disponibles: home, dollar, key, chart, building, shield, star, heart, users, check, clock
        "titulo": "Titulo del feature",
        "descripcion": "Descripcion del feature"
      }
    ]
  }
}
```

#### TESTIMONIALS
```json
{
  "tipo": "testimonials",
  "categoria": "content",
  "variantes": [
    { "id": "default", "nombre": "Carrusel", "descripcion": "Testimonios en carrusel" },
    { "id": "clic", "nombre": "CLIC Premium", "descripcion": "Testimonios con estilo premium" }
  ],
  "campos_config": [
    { "key": "titulo", "label": "Titulo", "type": "text", "required": false },
    { "key": "subtitulo", "label": "Subtitulo", "type": "text", "required": false },
    { "key": "testimonios", "label": "Testimonios", "type": "array", "required": true }
  ]
}
```

**Estructura de testimonios:**
```json
{
  "static_data": {
    "testimonios": [
      {
        "nombre": "Maria Garcia",
        "cargo": "Compradora",
        "texto": "Excelente servicio...",
        "calificacion": 5
      }
    ]
  }
}
```

**Campos alternativos soportados (dynamic_data):**
- `nombre_cliente` | `nombre` | `client_name`
- `testimonio` | `texto` | `full_testimonial`
- `ubicacion` | `cargo` | `client_location` | `tipo_propiedad`

#### CTA
```json
{
  "tipo": "cta",
  "categoria": "content",
  "variantes": [
    { "id": "default", "nombre": "Estandar", "descripcion": "Fondo color, titulo, descripcion, boton" }
  ],
  "campos_config": [
    { "key": "titulo", "label": "Titulo", "type": "text", "required": true },
    { "key": "descripcion", "label": "Descripcion", "type": "textarea", "required": false },
    { "key": "textoBoton", "label": "Texto del boton", "type": "text", "required": true },
    { "key": "urlBoton", "label": "URL del boton", "type": "text", "required": true },
    { "key": "colorFondo", "label": "Color de fondo", "type": "color", "required": false }
  ]
}
```

### 3.3 Componentes de Display

#### PROPERTY_LIST
```json
{
  "tipo": "property_list",
  "categoria": "display",
  "variantes": [
    { "id": "default", "nombre": "Grid", "descripcion": "Listado en grid con paginacion" }
  ],
  "campos_config": [
    { "key": "titulo", "label": "Titulo", "type": "text", "required": false },
    { "key": "itemsPorPagina", "label": "Items por pagina", "type": "number", "default": 12 },
    { "key": "mostrarFiltros", "label": "Mostrar filtros", "type": "boolean", "default": true }
  ]
}
```

#### PROPERTY_CARD
```json
{
  "tipo": "property_card",
  "categoria": "display",
  "variantes": [
    { "id": "default", "nombre": "Vertical", "descripcion": "Tarjeta vertical con imagen, precio, caracteristicas" }
  ],
  "campos_config": [
    { "key": "mostrarPrecio", "label": "Mostrar precio", "type": "boolean", "default": true },
    { "key": "mostrarUbicacion", "label": "Mostrar ubicacion", "type": "boolean", "default": true },
    { "key": "mostrarCaracteristicas", "label": "Mostrar caracteristicas", "type": "boolean", "default": true },
    { "key": "mostrarFavoritos", "label": "Boton favoritos", "type": "boolean", "default": false }
  ]
}
```

#### PROPERTY_DETAIL
```json
{
  "tipo": "property_detail",
  "categoria": "display",
  "variantes": [
    { "id": "default", "nombre": "Completo", "descripcion": "Galeria, descripcion, caracteristicas, formulario" }
  ],
  "campos_config": [
    { "key": "mostrarMapa", "label": "Mostrar mapa", "type": "boolean", "default": true },
    { "key": "mostrarFormContacto", "label": "Mostrar formulario", "type": "boolean", "default": true },
    { "key": "mostrarPropiedadesSimilares", "label": "Propiedades similares", "type": "boolean", "default": true },
    { "key": "mostrarAgente", "label": "Mostrar info del agente", "type": "boolean", "default": true }
  ]
}
```

### 3.4 Componentes de Formularios

#### CONTACT_FORM
```json
{
  "tipo": "contact_form",
  "categoria": "forms",
  "variantes": [
    { "id": "default", "nombre": "Estandar", "descripcion": "Nombre, email, telefono, mensaje" }
  ],
  "campos_config": [
    { "key": "titulo", "label": "Titulo", "type": "text", "required": false },
    { "key": "subtitulo", "label": "Subtitulo", "type": "text", "required": false },
    { "key": "textoBoton", "label": "Texto del boton", "type": "text", "default": "Enviar" },
    { "key": "emailDestino", "label": "Email destino", "type": "email", "required": true },
    { "key": "mostrarTelefono", "label": "Campo telefono", "type": "boolean", "default": true },
    { "key": "mensajeExito", "label": "Mensaje de exito", "type": "text", "default": "Mensaje enviado!" }
  ]
}
```

#### SEARCH_BAR
```json
{
  "tipo": "search_bar",
  "categoria": "forms",
  "variantes": [
    { "id": "default", "nombre": "Completa", "descripcion": "Busqueda con filtros tipo, ubicacion, precio" }
  ],
  "campos_config": [
    { "key": "placeholder", "label": "Placeholder", "type": "text", "default": "Buscar propiedades..." },
    { "key": "mostrarTipoOperacion", "label": "Filtro tipo operacion", "type": "boolean", "default": true },
    { "key": "mostrarUbicacion", "label": "Filtro ubicacion", "type": "boolean", "default": true },
    { "key": "mostrarPrecio", "label": "Filtro precio", "type": "boolean", "default": true }
  ]
}
```

---

## 4. FLUJO DE RESOLUCION DE PAGINAS

### 4.1 `routeResolver.ts` - Funcion `resolveRoute()`

```
1. Parsear URL (extraer tracking params, query strings)
2. Extraer idioma del pathname (/en/, /fr/, /pt/ o 'es' por defecto)
3. Si es "/" -> resolveHomepage()
4. Parsear segmentos de la URL
5. Buscar si primer segmento es PREFIJO CONOCIDO (testimonios, videos, etc.)
   -> SI: resolveContenidoPrefijo()
   -> NO: resolvePropiedades()
```

### 4.2 Tipos de Pagina

| tipoPagina | Descripcion | URL Ejemplo |
|------------|-------------|-------------|
| `homepage` | Pagina principal | `/` |
| `directorio_testimonios` | Listado de testimonios | `/testimonios` |
| `single_testimonio` | Testimonio individual | `/testimonios/slug` |
| `directorio_videos` | Listado de videos | `/videos` |
| `single_video` | Video individual | `/videos/slug` |
| `propiedades_listado` | Listado de propiedades | `/comprar/apartamento` |
| `propiedades_single` | Propiedad individual | `/comprar/apartamento/mi-propiedad` |
| `pagina_contacto` | Pagina de contacto | `/contacto` |
| `pagina_nosotros` | Pagina de nosotros | `/nosotros` |

### 4.3 `seccionesService.ts` - Funcion `getSeccionesResueltas()`

```typescript
async function getSeccionesResueltas(
  tenantId: string,
  paginaId: string,
  tipoPagina: string
): Promise<SeccionConfig[]>
```

**Logica actual (TEMPORAL - datos hardcoded):**

```
1. Buscar header y footer globales del tenant (scope='tenant')
2. Si tipoPagina === 'homepage':
   - Agregar Hero con buscador (datos hardcoded)
   - Agregar Features (datos hardcoded)
   - Agregar Testimonials (datos hardcoded)
3. Si es otra pagina:
   - Agregar Hero simple
4. Agregar footer
```

**Logica futura (leer de BD):**

```
1. Buscar componentes globales (header, footer) de componentes_web WHERE scope='tenant'
2. Buscar componentes por tipo de pagina WHERE scope='page_type' AND tipo_pagina=$tipoPagina
3. Buscar componentes especificos de la pagina WHERE scope='page' AND pagina_id=$paginaId
4. Aplicar herencia: pagina > page_type > tenant
5. Resolver dynamic_data si existe
```

---

## 5. ESTRUCTURA DE DATOS DE COMPONENTES

### 5.1 Formato del objeto `datos`

Cada componente tiene un objeto `datos` con esta estructura:

```typescript
interface ComponenteDatos {
  static_data?: {
    // Datos estaticos configurados por el usuario
    titulo?: string;
    subtitulo?: string;
    // ... campos segun campos_config del catalogo
  };

  dynamic_data?: {
    dataType?: string;      // Tipo de datos a resolver (testimonios, propiedades, etc.)
    query?: object;         // Parametros de query
    resolved?: any[];       // Datos ya resueltos (inyectados por el backend)
  };

  styles?: {
    colors?: {
      background?: string;
      text?: string;
      // ...
    };
    spacing?: {
      padding?: string;
      margin?: string;
    };
  };

  toggles?: {
    // Booleanos para mostrar/ocultar partes del componente
    mostrarTitulo?: boolean;
    mostrarSubtitulo?: boolean;
    mostrarBuscador?: boolean;
    // ...
  };

  tipoPagina?: string;  // Contexto de la pagina donde se usa
}
```

### 5.2 Prioridad de datos en componentes

Los componentes Astro leen datos con esta prioridad:

```typescript
// Ejemplo en TestimonialsDefault.astro
const testimonios = dynamicData?.resolved || staticData.testimonios || [fallback...];
```

1. **`dynamic_data.resolved`** - Datos dinamicos resueltos por el backend
2. **`static_data.campo`** - Datos estaticos configurados
3. **Fallback hardcoded** - Datos por defecto si no hay nada

---

## 6. SISTEMA DE SCOPES Y HERENCIA

### 6.1 Scopes disponibles

| Scope | Descripcion | Aplicacion |
|-------|-------------|------------|
| `tenant` | Configuracion global | Se aplica a TODAS las paginas del tenant |
| `page_type` | Por tipo de pagina | Se aplica a todas las paginas de ese tipo |
| `page` | Pagina especifica | Solo se aplica a esa pagina |

### 6.2 Herencia (de menor a mayor prioridad)

```
tenant < page_type < page
```

**Ejemplo:**
- Header configurado con `scope='tenant'` se muestra en todas las paginas
- Hero configurado con `scope='page_type', tipo_pagina='homepage'` solo se muestra en homepage
- CTA configurado con `scope='page', pagina_id='xxx'` solo se muestra en esa pagina

### 6.3 Componentes globales (es_global=true)

- `header` y `footer` siempre se incluyen automaticamente
- Se buscan con `scope='tenant'` y `tipo IN ('header', 'footer')`

---

## 7. COMPONENTES DEL FRONTEND

### 7.1 ComponentRenderer.astro

**Ubicacion:** `apps/web/src/components/ComponentRenderer.astro`

**Funcion:** Mapea tipo+variante al componente Astro correcto.

```typescript
const componentMap: Record<string, any> = {
  // Layout
  'header-default': HeaderDefault,
  'footer-default': FooterDefault,
  'hero-default': HeroDefault,
  'hero-variant1': HeroVariant1,
  'hero-variant2': HeroVariant2,
  'hero-variant3': HeroVariant3,
  'hero-simple': HeroSimple,

  // Display
  'property_list-default': PropertyListDefault,
  'property_card-default': PropertyCardDefault,
  'property_detail-default': PropertyDetailDefault,

  // Forms
  'contact_form-default': ContactFormDefault,
  'search_bar-default': SearchBarDefault,
  'filter_panel-default': FilterPanelDefault,

  // Content
  'cta-default': CTADefault,
  'features-default': FeaturesDefault,
  'testimonials-default': TestimonialsDefault,
  'testimonials-clic': TestimonialsClic,

  // CLIC Premium
  'property_carousel-clic': PropertyCarouselClic,
  'video_gallery-clic': VideoGalleryClic,
  'video_detail-clic': VideoDetailClic,
  'related_articles-clic': RelatedArticlesClic,
  'popular_locations-clic': PopularLocationsClic,
  'dynamic_faqs-clic': DynamicFAQsClic,
};
```

### 7.2 Estructura de un componente Astro

```astro
---
import type { ComponenteDataEstructurado } from '../../types/componentesEstructurado';

interface Props {
  datos: ComponenteDataEstructurado;
  tema?: Record<string, string>;
}

const { datos, tema = {} } = Astro.props;

// Acceso a datos estructurados
const staticData = datos.static_data || {};
const dynamicData = datos.dynamic_data;
const styles = datos.styles || {};
const toggles = datos.toggles || {};

// Leer campos con prioridad
const titulo = staticData.titulo || 'Titulo por defecto';
const items = dynamicData?.resolved || staticData.items || [];
---

<section>
  <h2>{titulo}</h2>
  {items.map((item: any) => (
    <div>{item.titulo}</div>
  ))}
</section>
```

---

## 8. TODO - PENDIENTES DE IMPLEMENTACION

### 8.1 getSeccionesResueltas() - Leer de BD

**Estado actual:** Datos hardcoded para homepage
**Estado deseado:** Leer de `componentes_web` segun scope y tipo_pagina

```typescript
// ACTUAL (lineas 549-695 de seccionesService.ts)
if (tipoPagina === 'homepage') {
  // Datos hardcoded de hero, features, testimonials
}

// FUTURO
if (tipoPagina === 'homepage') {
  // Buscar componentes con scope='page_type' AND tipo_pagina='homepage'
  const componentesPagina = await query(`
    SELECT * FROM componentes_web
    WHERE tenant_id = $1
      AND scope = 'page_type'
      AND tipo_pagina = 'homepage'
      AND activo = true
    ORDER BY orden
  `, [tenantId]);

  // Agregar cada componente encontrado
  for (const comp of componentesPagina.rows) {
    componentes.push({
      id: comp.id,
      tipo: comp.tipo,
      variante: comp.variante,
      datos: comp.datos,
      // ...
    });
  }
}
```

### 8.2 Resolucion de dynamic_data

**Funcion necesaria:** `resolveDynamicData()`

```typescript
async function resolveDynamicData(
  tenantId: string,
  dynamicData: { dataType: string; query?: object }
): Promise<any[]> {
  switch (dynamicData.dataType) {
    case 'testimonios':
      return await getTestimonios(tenantId, dynamicData.query);
    case 'propiedades':
      return await getPropiedades(tenantId, dynamicData.query);
    case 'videos':
      return await getVideos(tenantId, dynamicData.query);
    // ...
  }
}
```

### 8.3 Configuracion de homepage en BD

Para que la homepage lea de BD, se necesita:

1. **Insertar registros en `componentes_web`:**

```sql
-- Hero para homepage
INSERT INTO componentes_web (tenant_id, tipo, variante, datos, scope, tipo_pagina, es_activo, orden)
VALUES (
  'tenant-uuid',
  'hero',
  'default',
  '{
    "static_data": {
      "badge": "Plataforma #1",
      "titulo": "Encuentra tu hogar",
      "subtitulo": "Miles de propiedades...",
      "stats": [...],
      "buscador_tabs": [...]
    },
    "toggles": { "mostrarBuscador": true }
  }',
  'page_type',
  'homepage',
  true,
  1
);

-- Features para homepage
INSERT INTO componentes_web (tenant_id, tipo, variante, datos, scope, tipo_pagina, es_activo, orden)
VALUES (
  'tenant-uuid',
  'features',
  'default',
  '{
    "static_data": {
      "titulo": "Por que elegirnos",
      "features": [...]
    }
  }',
  'page_type',
  'homepage',
  true,
  2
);

-- Testimonials para homepage
INSERT INTO componentes_web (tenant_id, tipo, variante, datos, scope, tipo_pagina, es_activo, orden)
VALUES (
  'tenant-uuid',
  'testimonials',
  'default',
  '{
    "static_data": {
      "titulo": "Lo que dicen nuestros clientes",
      "testimonios": [...]
    }
  }',
  'page_type',
  'homepage',
  true,
  3
);
```

2. **Modificar `getSeccionesResueltas()` para leer estos registros**

### 8.4 Admin UI para editar componentes

Se necesita un panel de administracion donde el tenant pueda:

1. Ver los componentes de una pagina
2. Editar los `datos` (static_data, toggles) de cada componente
3. Cambiar la variante activa
4. Agregar/quitar componentes
5. Reordenar componentes

---

## APENDICE A: Iconos disponibles para Features

```typescript
const iconMap: Record<string, string> = {
  home: '...',      // Casa
  dollar: '...',    // Signo de dolar
  key: '...',       // Llave
  chart: '...',     // Grafico de barras
  building: '...',  // Edificio
  shield: '...',    // Escudo
  star: '...',      // Estrella
  heart: '...',     // Corazon
  users: '...',     // Usuarios
  check: '...',     // Check/palomita
  clock: '...',     // Reloj
};
```

---

## APENDICE B: Tipos de pagina y sus componentes tipicos

| Tipo Pagina | Componentes |
|-------------|-------------|
| `homepage` | header, hero (con buscador), features, testimonials, cta, footer |
| `propiedades_listado` | header, hero-simple, filter_panel, property_list, pagination, footer |
| `propiedades_single` | header, property_detail, contact_form, property_carousel (similares), footer |
| `directorio_testimonios` | header, hero-simple, testimonials-grid, pagination, footer |
| `single_testimonio` | header, testimonio-detail, related_articles, footer |
| `pagina_contacto` | header, hero-simple, contact_form, footer |

---

**Ultima actualizacion:** 2025-11-30
**Autor:** Sistema CLIC
