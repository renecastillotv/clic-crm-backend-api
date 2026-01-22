# 📖 BIBLIA: Creación e Integración de Componentes Web

**Versión:** 1.0  
**Fecha:** 2025-01-XX  
**Propósito:** Documento de referencia completa para crear e integrar componentes web en el sistema multitenant

---

## 📋 Tabla de Contenidos

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Estructura de Base de Datos](#estructura-de-base-de-datos)
3. [Flujo Completo: BD → API → Astro](#flujo-completo-bd--api--astro)
4. [Crear un Nuevo Componente (Paso a Paso)](#crear-un-nuevo-componente-paso-a-paso)
5. [Asignar Componente a Página Estándar](#asignar-componente-a-página-estándar)
6. [Integración en Astro](#integración-en-astro)
7. [Estructura de Datos de Componentes](#estructura-de-datos-de-componentes)
8. [Ejemplos Prácticos](#ejemplos-prácticos)
9. [Checklist Completo](#checklist-completo)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura del Sistema

### Visión General

El sistema es **completamente desacoplado** y **database-driven**:

```
┌─────────────┐
│   USUARIO   │ Visita: /tenant/clic/
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│  ASTRO (Frontend)                   │
│  - Recibe URL                       │
│  - Llama API: /resolve?pathname=/   │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  API (Backend)                       │
│  - Detecta tipo de página           │
│  - Busca componentes en BD          │
│  - Resuelve datos dinámicos         │
│  - Retorna JSON estructurado        │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  BASE DE DATOS (Neon)                │
│  - catalogo_componentes              │
│  - componentes_web                   │
│  - tipos_pagina                      │
│  - rutas_tenant_config_custom       │
└─────────────────────────────────────┘
```

### Principio Fundamental

> **"Todo viene de la base de datos, nada está hardcodeado"**

- Los componentes se definen en `catalogo_componentes`
- Las instancias se crean en `componentes_web`
- El frontend solo renderiza lo que recibe del backend
- No hay lógica de negocio en Astro

---

## 💾 Estructura de Base de Datos

### 1. `catalogo_componentes` (Catálogo Maestro)

**Propósito:** Define qué componentes existen en el sistema y qué campos aceptan.

```sql
CREATE TABLE catalogo_componentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL,              -- 'hero', 'header', 'footer', etc.
  componente_key VARCHAR(100) NOT NULL,   -- 'hero-clic', 'header-default' (CLAVE para mapeo)
  nombre VARCHAR(200) NOT NULL,          -- Nombre legible
  descripcion TEXT,
  categoria VARCHAR(50),                 -- 'layout', 'content', 'media', etc.
  campos_config JSONB NOT NULL,          -- Esquema del formulario (para CRM)
  default_data JSONB,                    -- Datos por defecto
  active BOOLEAN DEFAULT true,
  required_features JSONB,               -- Features requeridos (opcional)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(componente_key)                 -- componente_key debe ser único
);
```

**Campos Importantes:**

- `tipo`: Tipo genérico del componente (ej: 'hero')
- `componente_key`: **CLAVE ÚNICA** que se usa para mapear en Astro (ej: 'hero-clic')
- `campos_config`: JSON con el esquema del formulario que se muestra en el CRM

**Ejemplo de `campos_config`:**

```json
{
  "campos": [
    {
      "key": "titulo",
      "label": "Título",
      "type": "text",
      "required": true,
      "default": "Bienvenido"
    },
    {
      "key": "subtitulo",
      "label": "Subtítulo",
      "type": "textarea",
      "required": false
    },
    {
      "key": "mostrarBuscador",
      "label": "Mostrar Buscador",
      "type": "boolean",
      "default": false
    }
  ]
}
```

### 2. `tipos_pagina` (Páginas Estándar)

**Propósito:** Define los tipos de páginas estándar del sistema.

```sql
CREATE TABLE tipos_pagina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,     -- 'homepage', 'propiedades_listado', etc.
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  es_estandar BOOLEAN DEFAULT true,
  requiere_slug BOOLEAN DEFAULT true,
  configuracion JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Tipos Estándar Comunes:**

- `homepage`: Página de inicio
- `propiedades_listado`: Listado de propiedades
- `single_property`: Propiedad individual
- `directorio_asesores`: Directorio de asesores
- `asesor_single`: Asesor individual
- `videos_listado`: Listado de videos
- `video_single`: Video individual
- `articulos_listado`: Listado de artículos
- `articulo_single`: Artículo individual

### 3. `rutas_tenant_config_custom` (Páginas Personalizadas)

**Propósito:** Páginas personalizadas creadas por cada tenant.

```sql
CREATE TABLE rutas_tenant_config_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,             -- URL única (ej: 'sobre-nosotros')
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  publica BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, slug)                 -- Slug único por tenant
);
```

### 4. `componentes_web` (Instancias de Componentes)

**Propósito:** Instancias de componentes asignadas a páginas específicas.

```sql
CREATE TABLE componentes_web (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  componente_catalogo_id UUID NOT NULL REFERENCES catalogo_componentes(id),
  tipo_pagina_id UUID REFERENCES tipos_pagina(id),           -- Si es página estándar
  tenant_rutas_config_custom_id UUID REFERENCES rutas_tenant_config_custom(id), -- Si es página custom
  nombre VARCHAR(255),                    -- Nombre descriptivo (ej: 'Hero Principal Homepage')
  datos JSONB NOT NULL DEFAULT '{}',      -- Configuración completa (static_data, dynamic_data, etc.)
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,                -- Orden de visualización
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Campos Importantes:**

- `componente_catalogo_id`: FK a `catalogo_componentes` (define qué componente es)
- `tipo_pagina_id`: FK a `tipos_pagina` (si es página estándar)
- `tenant_rutas_config_custom_id`: FK a `rutas_tenant_config_custom` (si es página custom)
- `datos`: JSONB con la estructura completa (ver sección "Estructura de Datos")

**Relaciones:**

- **Una página estándar** tiene múltiples componentes → `tipo_pagina_id` se repite
- **Una página custom** tiene múltiples componentes → `tenant_rutas_config_custom_id` se repite
- **Un componente del catálogo** puede tener múltiples instancias → `componente_catalogo_id` se repite

---

## 🔄 Flujo Completo: BD → API → Astro

### Paso 1: Usuario Visita URL

```
Usuario visita: /tenant/clic/
```

### Paso 2: Astro Captura la Ruta

**Archivo:** `apps/web/src/pages/tenant/[tenantId]/index.astro`

```astro
---
const { tenantId } = Astro.params; // "clic"
const pathname = '/'; // Homepage

// LLAMADA ÚNICA A LA API
const response = await fetch(
  `${API_URL}/api/tenants/${tenantId}/resolve?pathname=${encodeURIComponent(pathname)}`
);

const paginaCompleta = await response.json();
// {
//   page: {...},
//   theme: {...},
//   components: [...]
// }
---
```

### Paso 3: API Resuelve la Ruta

**Archivo:** `packages/api/src/services/routeResolver.ts`

```typescript
// 1. Detecta el tipo de página según pathname
if (pathname === '/') {
  tipoPagina = 'homepage';
} else if (pathname === '/propiedades') {
  tipoPagina = 'propiedades_listado';
} else {
  // Busca en tipos_pagina o rutas_tenant_config_custom
}

// 2. Llama a getSeccionesResueltas()
const componentes = await getSeccionesResueltas(tenantId, tipoPagina);
```

### Paso 4: API Busca Componentes en BD

**Archivo:** `packages/api/src/services/seccionesService.ts`

```typescript
// Si es página estándar:
const sql = `
  SELECT
    c.id,
    c.tenant_id,
    cc.tipo,                    -- Tipo del componente
    cc.componente_key,          -- CLAVE para mapeo en Astro
    c.nombre,
    c.datos,                    -- JSON con static_data, dynamic_data, etc.
    c.activo,
    c.orden
  FROM componentes_web c
  JOIN catalogo_componentes cc ON cc.id = c.componente_catalogo_id
  WHERE c.tenant_id = $1
    AND c.tipo_pagina_id = $2    -- ID del tipo de página
    AND c.activo = true
  ORDER BY c.orden ASC
`;

// Si es página custom:
const sql = `
  SELECT ...
  FROM componentes_web c
  JOIN catalogo_componentes cc ON cc.id = c.componente_catalogo_id
  WHERE c.tenant_id = $1
    AND c.tenant_rutas_config_custom_id = $2
    AND c.activo = true
  ORDER BY c.orden ASC
`;
```

### Paso 5: API Resuelve Datos Dinámicos

**Archivo:** `packages/api/src/services/dynamicDataResolver.ts`

```typescript
// Si el componente tiene dynamic_data.dataType:
if (componente.datos?.dynamic_data?.dataType) {
  const resolvedData = await resolveDynamicData(
    componente.datos.dynamic_data,
    tenantId
  );
  
  // Agrega los datos resueltos
  componente.datos.dynamic_data.resolved = resolvedData;
}
```

### Paso 6: API Retorna JSON Estructurado

```json
{
  "page": {
    "id": "homepage",
    "tenantId": "uuid-clic",
    "tipoPagina": "homepage",
    "titulo": "Inicio",
    "slug": "/"
  },
  "theme": {
    "primary": "#667eea",
    "secondary": "#764ba2",
    ...
  },
  "components": [
    {
      "id": "uuid-1",
      "tipo": "hero",
      "componente_key": "hero-clic",        // ← CLAVE para mapeo
      "variante": "clic",
      "datos": {
        "static_data": {
          "titulo": "Bienvenido a CLIC",
          "subtitulo": "..."
        },
        "dynamic_data": {
          "dataType": "propiedades",
          "resolved": [...]                  // ← Datos ya resueltos
        }
      },
      "orden": 0
    },
    // ... más componentes
  ]
}
```

### Paso 7: Astro Pasa al Layout

**Archivo:** `apps/web/src/pages/tenant/[tenantId]/index.astro`

```astro
<PageLayout
  title={pagina.titulo}
  componentes={componentes}  // ← Array de componentes
  tema={tema}
/>
```

### Paso 8: Layout Itera Componentes

**Archivo:** `apps/web/src/layouts/PageLayout.astro`

```astro
<main>
  {componentes.map((componente) => (
    <ComponentRenderer
      componente={componente}
      tema={tema}
      baseUrl={baseUrl}
    />
  ))}
</main>
```

### Paso 9: ComponentRenderer Mapea y Renderiza

**Archivo:** `apps/web/src/components/ComponentRenderer.astro`

```astro
---
// 1. Importar componentes
import HeroClic from './hero/HeroClic.astro';
import HeaderClic from './header/HeaderClic.astro';

// 2. Mapa de componentes (clave = componente_key de BD)
const componentMap = {
  'hero-clic': HeroClic,
  'header-clic': HeaderClic,
  // ...
};

// 3. Obtener componente_key del componente recibido
const componenteKey = componente.componente_key || `${componente.tipo}-default`;

// 4. Buscar en el mapa
const Component = componentMap[componenteKey];
---

{Component ? (
  <Component
    datos={componente.datos}
    tema={tema}
    baseUrl={baseUrl}
  />
) : (
  <Placeholder tipo={componente.tipo} />
)}
```

### Paso 10: Componente Astro Renderiza HTML

**Archivo:** `apps/web/src/components/hero/HeroClic.astro`

```astro
---
interface Props {
  datos?: {
    static_data?: {
      titulo?: string;
      subtitulo?: string;
    };
  };
  tema?: Record<string, string>;
}

const { datos, tema = {} } = Astro.props;
const staticData = datos?.static_data || {};
---

<section class="hero-clic">
  <h1>{staticData.titulo}</h1>
  {staticData.subtitulo && <p>{staticData.subtitulo}</p>}
</section>
```

---

## 🆕 Crear un Nuevo Componente (Paso a Paso)

### Paso 1: Crear el Componente Astro

**Ubicación:** `apps/web/src/components/[tipo]/[NombreComponente].astro`

**Ejemplo:** `apps/web/src/components/testimonial/TestimonialClic.astro`

```astro
---
interface Props {
  datos?: {
    static_data?: {
      titulo?: string;
      subtitulo?: string;
    };
    dynamic_data?: {
      resolved?: Array<{
        nombre: string;
        testimonio: string;
        calificacion: number;
      }>;
    };
  };
  tema?: Record<string, string>;
}

const { datos, tema = {} } = Astro.props;
const staticData = datos?.static_data || {};
const testimonios = datos?.dynamic_data?.resolved || [];
---

<section class="testimonial-clic">
  {staticData.titulo && <h2>{staticData.titulo}</h2>}
  {staticData.subtitulo && <p>{staticData.subtitulo}</p>}
  
  <div class="testimonials-grid">
    {testimonios.map((testimonio) => (
      <div class="testimonial-card">
        <p>{testimonio.testimonio}</p>
        <div class="author">
          <strong>{testimonio.nombre}</strong>
          <div class="rating">
            {'⭐'.repeat(testimonio.calificacion)}
          </div>
        </div>
      </div>
    ))}
  </div>
</section>

<style>
  .testimonial-clic {
    padding: 4rem 2rem;
    background: var(--background-color);
  }
  
  .testimonials-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }
  
  .testimonial-card {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
</style>
```

### Paso 2: Registrar en ComponentRenderer

**Archivo:** `apps/web/src/components/ComponentRenderer.astro`

```astro
---
// 1. Importar el nuevo componente
import TestimonialClic from './testimonial/TestimonialClic.astro';

// 2. Agregar al componentMap
const componentMap: Record<string, any> = {
  // ... componentes existentes
  'testimonial-clic': TestimonialClic,  // ← La clave debe coincidir con componente_key
};
---
```

**⚠️ IMPORTANTE:** La clave en `componentMap` debe coincidir EXACTAMENTE con el `componente_key` que definas en la BD.

### Paso 3: Crear Registro en catalogo_componentes

```sql
INSERT INTO catalogo_componentes (
  tipo,
  componente_key,                    -- ← DEBE coincidir con componentMap
  nombre,
  descripcion,
  categoria,
  campos_config,                      -- Esquema del formulario para CRM
  default_data,
  active
) VALUES (
  'testimonial',                      -- Tipo genérico
  'testimonial-clic',                 -- CLAVE ÚNICA (debe coincidir con componentMap)
  'Testimonial CLIC',
  'Componente para mostrar testimonios de clientes',
  'content',
  '{
    "campos": [
      {
        "key": "titulo",
        "label": "Título",
        "type": "text",
        "required": false,
        "default": "Lo que dicen nuestros clientes"
      },
      {
        "key": "subtitulo",
        "label": "Subtítulo",
        "type": "textarea",
        "required": false
      },
      {
        "key": "mostrarCalificacion",
        "label": "Mostrar Calificación",
        "type": "boolean",
        "default": true
      }
    ]
  }'::jsonb,
  '{
    "static_data": {
      "titulo": "Lo que dicen nuestros clientes",
      "subtitulo": "Testimonios reales de personas que confiaron en nosotros"
    },
    "toggles": {
      "mostrarCalificacion": true
    }
  }'::jsonb,
  true
);
```

**Verificar que se creó:**

```sql
SELECT id, tipo, componente_key, nombre 
FROM catalogo_componentes 
WHERE componente_key = 'testimonial-clic';
```

**Guarda el `id` del registro creado** (lo necesitarás en el siguiente paso).

---

## 📄 Asignar Componente a Página Estándar

### Para Página Estándar (ej: Homepage)

```sql
-- 1. Obtener IDs necesarios
SELECT id FROM tenants WHERE slug = 'clic';                    -- tenant_id
SELECT id FROM tipos_pagina WHERE codigo = 'homepage';         -- tipo_pagina_id
SELECT id FROM catalogo_componentes WHERE componente_key = 'testimonial-clic'; -- componente_catalogo_id

-- 2. Insertar componente en componentes_web
INSERT INTO componentes_web (
  tenant_id,
  componente_catalogo_id,
  tipo_pagina_id,                    -- ← Para página estándar
  nombre,
  datos,
  activo,
  orden
) VALUES (
  'UUID_TENANT_CLIC',                -- tenant_id
  'UUID_COMPONENTE_CATALOGO',        -- componente_catalogo_id (del paso anterior)
  'UUID_TIPO_PAGINA_HOMEPAGE',       -- tipo_pagina_id
  'Testimonios Homepage',            -- Nombre descriptivo
  '{
    "static_data": {
      "titulo": "Lo que dicen nuestros clientes",
      "subtitulo": "Testimonios reales de personas que confiaron en nosotros"
    },
    "toggles": {
      "mostrarCalificacion": true
    },
    "dynamic_data": {
      "dataType": "testimonials",     -- Si necesita datos dinámicos
      "limit": 6
    }
  }'::jsonb,
  true,                              -- activo
  3                                  -- orden (después del hero, features, etc.)
);
```

### Para Página Custom

```sql
-- 1. Obtener IDs necesarios
SELECT id FROM tenants WHERE slug = 'clic';
SELECT id FROM rutas_tenant_config_custom WHERE slug = 'sobre-nosotros' AND tenant_id = 'UUID_TENANT';
SELECT id FROM catalogo_componentes WHERE componente_key = 'testimonial-clic';

-- 2. Insertar componente
INSERT INTO componentes_web (
  tenant_id,
  componente_catalogo_id,
  tenant_rutas_config_custom_id,     -- ← Para página custom
  nombre,
  datos,
  activo,
  orden
) VALUES (
  'UUID_TENANT_CLIC',
  'UUID_COMPONENTE_CATALOGO',
  'UUID_RUTA_CUSTOM',                 -- tenant_rutas_config_custom_id
  'Testimonios Sobre Nosotros',
  '{...}'::jsonb,
  true,
  2
);
```

### Verificar que se Creó Correctamente

```sql
SELECT 
  cw.id,
  cw.nombre,
  cc.tipo,
  cc.componente_key,
  tp.codigo as tipo_pagina,
  cw.activo,
  cw.orden,
  jsonb_pretty(cw.datos) as datos_configurados
FROM componentes_web cw
JOIN catalogo_componentes cc ON cc.id = cw.componente_catalogo_id
LEFT JOIN tipos_pagina tp ON tp.id = cw.tipo_pagina_id
LEFT JOIN rutas_tenant_config_custom trc ON trc.id = cw.tenant_rutas_config_custom_id
WHERE cw.tenant_id = 'UUID_TENANT_CLIC'
  AND (tp.codigo = 'homepage' OR trc.slug = 'sobre-nosotros')
ORDER BY cw.orden ASC;
```

---

## 🎨 Integración en Astro

### Estructura de Archivos

```
apps/web/src/
├── components/
│   ├── ComponentRenderer.astro      ← Mapeo de componentes
│   ├── hero/
│   │   ├── HeroClic.astro
│   │   └── HeroDefault.astro
│   ├── testimonial/
│   │   └── TestimonialClic.astro   ← Nuevo componente
│   └── ...
├── layouts/
│   └── PageLayout.astro             ← Itera componentes
└── pages/
    └── tenant/
        └── [tenantId]/
            ├── index.astro          ← Homepage
            └── [...slug].astro       ← Otras rutas
```

### ComponentRenderer.astro (Mapeo)

```astro
---
// IMPORTAR todos los componentes
import HeroClic from './hero/HeroClic.astro';
import TestimonialClic from './testimonial/TestimonialClic.astro';
// ... más imports

// MAPA: clave = componente_key de catalogo_componentes
const componentMap: Record<string, any> = {
  'hero-clic': HeroClic,
  'testimonial-clic': TestimonialClic,  // ← Nuevo
  // ... más componentes
};

// Función para obtener componente
function getComponentByKey(key: string | undefined) {
  if (!key) return null;
  return componentMap[key] || null;
}

// Obtener componente_key del componente recibido
const componenteKey = componente.componente_key || `${componente.tipo}-default`;
const Component = getComponentByKey(componenteKey);
---

{Component ? (
  <Component
    datos={componente.datos}
    tema={tema}
    baseUrl={baseUrl}
  />
) : (
  <Placeholder tipo={componente.tipo} />
)}
```

### PageLayout.astro (Iteración)

```astro
---
const { componentes, tema } = Astro.props;
---

<main>
  {componentes.map((componente) => (
    <ComponentRenderer
      componente={componente}
      tema={tema}
      baseUrl={baseUrl}
    />
  ))}
</main>
```

### Componente Individual (Ejemplo)

```astro
---
interface Props {
  datos?: {
    static_data?: {
      titulo?: string;
      subtitulo?: string;
    };
    dynamic_data?: {
      resolved?: any[];
    };
  };
  tema?: Record<string, string>;
}

const { datos, tema = {} } = Astro.props;
const staticData = datos?.static_data || {};
const items = datos?.dynamic_data?.resolved || [];
---

<section class="mi-componente">
  {staticData.titulo && <h2>{staticData.titulo}</h2>}
  {staticData.subtitulo && <p>{staticData.subtitulo}</p>}
  
  {items.map((item) => (
    <div>{/* Renderizar item */}</div>
  ))}
</section>

<style>
  .mi-componente {
    /* Estilos */
  }
</style>
```

---

## 📊 Estructura de Datos de Componentes

### Campo `datos` (JSONB en componentes_web)

```json
{
  "static_data": {
    "titulo": "Texto estático",
    "subtitulo": "Más texto",
    "textoBoton": "Click aquí",
    "urlBoton": "/ruta",
    "imagen": "/ruta/imagen.jpg"
  },
  "dynamic_data": {
    "dataType": "propiedades",        // Tipo de datos dinámicos
    "limit": 12,                      // Límite de resultados
    "filters": {                       // Filtros opcionales
      "operacion": "venta",
      "precio_min": 100000
    },
    "resolved": [                     // ← Se agrega automáticamente por la API
      {
        "id": "uuid",
        "titulo": "Propiedad 1",
        "precio": 250000
      }
    ]
  },
  "toggles": {
    "mostrarBuscador": true,
    "mostrarBoton": true,
    "mostrarImagen": false
  },
  "styles": {
    "colors": {
      "primary": "#667eea",
      "background": "#ffffff"
    },
    "spacing": {
      "padding": "4rem 2rem",
      "gap": "2rem"
    }
  }
}
```

### Tipos de Datos Dinámicos Soportados

| dataType | Descripción | Tabla Origen |
|----------|-------------|--------------|
| `propiedades` | Lista de propiedades | `propiedades` |
| `propiedad_single` | Propiedad individual | `propiedades` |
| `lista_asesores` | Lista de asesores | `perfiles_asesor` |
| `asesor_single` | Asesor individual | `perfiles_asesor` |
| `lista_videos` | Lista de videos | `videos` |
| `video_single` | Video individual | `videos` |
| `lista_articulos` | Lista de artículos | `articulos` |
| `articulo_single` | Artículo individual | `articulos` |
| `testimonials` | Testimonios | `testimonios` |

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Componente Simple (Sin Datos Dinámicos)

**Componente:** CTA (Call to Action)

**1. Crear componente Astro:**

```astro
---
// apps/web/src/components/cta/CTAClic.astro
interface Props {
  datos?: {
    static_data?: {
      titulo?: string;
      descripcion?: string;
      textoBoton?: string;
      urlBoton?: string;
    };
  };
  tema?: Record<string, string>;
}

const { datos, tema = {} } = Astro.props;
const staticData = datos?.static_data || {};
---

<section class="cta-clic">
  <h2>{staticData.titulo}</h2>
  {staticData.descripcion && <p>{staticData.descripcion}</p>}
  {staticData.textoBoton && (
    <a href={staticData.urlBoton} class="cta-button">
      {staticData.textoBoton}
    </a>
  )}
</section>

<style>
  .cta-clic {
    padding: 4rem 2rem;
    text-align: center;
    background: var(--primary-color);
    color: white;
  }
  
  .cta-button {
    display: inline-block;
    padding: 1rem 2rem;
    background: white;
    color: var(--primary-color);
    border-radius: 8px;
    text-decoration: none;
    margin-top: 1rem;
  }
</style>
```

**2. Registrar en ComponentRenderer:**

```astro
import CTAClic from './cta/CTAClic.astro';

const componentMap = {
  'cta-clic': CTAClic,
};
```

**3. Crear en catalogo_componentes:**

```sql
INSERT INTO catalogo_componentes (
  tipo, componente_key, nombre, categoria, campos_config, active
) VALUES (
  'cta',
  'cta-clic',
  'CTA CLIC',
  'content',
  '{
    "campos": [
      {"key": "titulo", "label": "Título", "type": "text", "required": true},
      {"key": "descripcion", "label": "Descripción", "type": "textarea"},
      {"key": "textoBoton", "label": "Texto del Botón", "type": "text"},
      {"key": "urlBoton", "label": "URL del Botón", "type": "text"}
    ]
  }'::jsonb,
  true
);
```

**4. Asignar a homepage:**

```sql
INSERT INTO componentes_web (
  tenant_id, componente_catalogo_id, tipo_pagina_id, nombre, datos, activo, orden
) VALUES (
  'UUID_TENANT',
  (SELECT id FROM catalogo_componentes WHERE componente_key = 'cta-clic'),
  (SELECT id FROM tipos_pagina WHERE codigo = 'homepage'),
  'CTA Principal',
  '{
    "static_data": {
      "titulo": "¿Listo para comenzar?",
      "descripcion": "Agenda una consulta gratuita",
      "textoBoton": "Contactar Ahora",
      "urlBoton": "/contacto"
    }
  }'::jsonb,
  true,
  4
);
```

### Ejemplo 2: Componente con Datos Dinámicos

**Componente:** Property Grid (Grid de Propiedades)

**1. Crear componente Astro:**

```astro
---
// apps/web/src/components/property-grid/PropertyGridClic.astro
interface Props {
  datos?: {
    static_data?: {
      titulo?: string;
      subtitulo?: string;
    };
    dynamic_data?: {
      resolved?: Array<{
        id: string;
        titulo: string;
        precio: number;
        habitaciones: number;
        banos: number;
        imagen_principal?: string;
      }>;
    };
  };
  tema?: Record<string, string>;
}

const { datos, tema = {} } = Astro.props;
const staticData = datos?.static_data || {};
const propiedades = datos?.dynamic_data?.resolved || [];
---

<section class="property-grid-clic">
  {staticData.titulo && <h2>{staticData.titulo}</h2>}
  {staticData.subtitulo && <p>{staticData.subtitulo}</p>}
  
  <div class="properties-grid">
    {propiedades.map((prop) => (
      <div class="property-card">
        {prop.imagen_principal && (
          <img src={prop.imagen_principal} alt={prop.titulo} />
        )}
        <h3>{prop.titulo}</h3>
        <p class="price">${prop.precio.toLocaleString()}</p>
        <div class="features">
          <span>{prop.habitaciones} hab</span>
          <span>{prop.banos} baños</span>
        </div>
      </div>
    ))}
  </div>
</section>

<style>
  .property-grid-clic {
    padding: 4rem 2rem;
  }
  
  .properties-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }
  
  .property-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
</style>
```

**2. Registrar y crear en BD (igual que ejemplo 1)**

**3. Asignar con datos dinámicos:**

```sql
INSERT INTO componentes_web (
  tenant_id, componente_catalogo_id, tipo_pagina_id, nombre, datos, activo, orden
) VALUES (
  'UUID_TENANT',
  (SELECT id FROM catalogo_componentes WHERE componente_key = 'property-grid-clic'),
  (SELECT id FROM tipos_pagina WHERE codigo = 'homepage'),
  'Propiedades Destacadas',
  '{
    "static_data": {
      "titulo": "Propiedades Destacadas",
      "subtitulo": "Encuentra tu propiedad ideal"
    },
    "dynamic_data": {
      "dataType": "propiedades",     -- ← Tipo de datos dinámicos
      "limit": 6                      -- ← Límite de resultados
    }
  }'::jsonb,
  true,
  2
);
```

**La API automáticamente resolverá `dynamic_data.resolved` con las propiedades.**

---

## ✅ Checklist Completo

### Para Crear un Nuevo Componente

- [ ] **1. Crear archivo Astro** en `apps/web/src/components/[tipo]/[Nombre].astro`
- [ ] **2. Definir interface Props** con `datos` y `tema`
- [ ] **3. Implementar renderizado** usando `static_data` y `dynamic_data.resolved`
- [ ] **4. Agregar estilos** (CSS scoped o global)
- [ ] **5. Importar en ComponentRenderer.astro**
- [ ] **6. Agregar al componentMap** con clave única
- [ ] **7. Crear registro en catalogo_componentes:**
  - [ ] Definir `tipo` (genérico)
  - [ ] Definir `componente_key` (debe coincidir con componentMap)
  - [ ] Definir `campos_config` (esquema del formulario)
  - [ ] Definir `default_data` (datos por defecto)
- [ ] **8. Verificar que se creó** en BD
- [ ] **9. Asignar a página** (estándar o custom) en `componentes_web`
- [ ] **10. Probar renderizado** visitando la página

### Para Asignar Componente a Página

- [ ] **1. Obtener IDs necesarios:**
  - [ ] `tenant_id` (del tenant)
  - [ ] `componente_catalogo_id` (del componente en catálogo)
  - [ ] `tipo_pagina_id` (si es página estándar) O
  - [ ] `tenant_rutas_config_custom_id` (si es página custom)
- [ ] **2. Insertar en componentes_web:**
  - [ ] Definir `nombre` descriptivo
  - [ ] Definir `datos` (JSONB con static_data, dynamic_data, etc.)
  - [ ] Definir `orden` (orden de visualización)
  - [ ] Marcar `activo = true`
- [ ] **3. Verificar que se creó** correctamente
- [ ] **4. Probar en la página** visitando la URL

### Verificación Final

- [ ] El componente se renderiza en la página
- [ ] Los datos estáticos se muestran correctamente
- [ ] Los datos dinámicos se resuelven (si aplica)
- [ ] Los estilos se aplican correctamente
- [ ] El tema (colores) se aplica correctamente
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en consola del servidor

---

## 🔧 Troubleshooting

### Problema: Componente no se renderiza

**Síntomas:** Se muestra Placeholder o no aparece nada.

**Soluciones:**

1. **Verificar componente_key:**
   ```sql
   -- Verificar en BD
   SELECT componente_key FROM catalogo_componentes WHERE id = 'UUID';
   
   -- Verificar en ComponentRenderer.astro
   -- La clave en componentMap debe coincidir EXACTAMENTE
   ```

2. **Verificar que el componente está activo:**
   ```sql
   SELECT activo FROM componentes_web WHERE id = 'UUID';
   ```

3. **Verificar que está asignado a la página correcta:**
   ```sql
   SELECT 
     cw.id,
     tp.codigo as tipo_pagina,
     trc.slug as ruta_custom
   FROM componentes_web cw
   LEFT JOIN tipos_pagina tp ON tp.id = cw.tipo_pagina_id
   LEFT JOIN rutas_tenant_config_custom trc ON trc.id = cw.tenant_rutas_config_custom_id
   WHERE cw.id = 'UUID';
   ```

### Problema: Datos dinámicos no se resuelven

**Síntomas:** `dynamic_data.resolved` está vacío o undefined.

**Soluciones:**

1. **Verificar dataType:**
   ```sql
   SELECT datos->'dynamic_data'->>'dataType' 
   FROM componentes_web 
   WHERE id = 'UUID';
   ```

2. **Verificar que el dataType es válido:**
   - Ver lista de tipos soportados en la sección "Estructura de Datos"
   - Verificar en `dynamicDataResolver.ts` que el tipo está mapeado

3. **Verificar que hay datos en la tabla origen:**
   ```sql
   -- Si dataType = 'propiedades'
   SELECT COUNT(*) FROM propiedades WHERE tenant_id = 'UUID';
   ```

### Problema: Estilos no se aplican

**Síntomas:** El componente se renderiza pero sin estilos.

**Soluciones:**

1. **Verificar que los estilos están en el componente:**
   - Revisar que hay `<style>` en el archivo .astro
   - Verificar que las clases CSS coinciden con el HTML

2. **Verificar variables CSS del tema:**
   ```astro
   <!-- En PageLayout.astro se definen las variables -->
   :root {
     --primary-color: ${tema.primary};
   }
   ```

### Problema: Componente aparece en orden incorrecto

**Síntomas:** Los componentes no aparecen en el orden esperado.

**Soluciones:**

1. **Verificar orden en BD:**
   ```sql
   SELECT id, nombre, orden 
   FROM componentes_web 
   WHERE tenant_id = 'UUID' 
     AND tipo_pagina_id = 'UUID'
   ORDER BY orden ASC;
   ```

2. **Actualizar orden:**
   ```sql
   UPDATE componentes_web 
   SET orden = 2 
   WHERE id = 'UUID';
   ```

---

## 📝 Notas Importantes

### Reglas de Oro

1. **`componente_key` debe ser único** y coincidir exactamente entre:
   - `catalogo_componentes.componente_key`
   - `ComponentRenderer.astro` componentMap key

2. **Solo un componente activo por tipo** en la misma página (a menos que sea intencional)

3. **Los datos dinámicos se resuelven automáticamente** por la API, no hacer fetch adicionales en Astro

4. **El orden importa:** Los componentes se renderizan según `orden ASC`

5. **Header y Footer son globales:** Se aplican automáticamente a todas las páginas

### Convenciones de Nomenclatura

- **Componente Astro:** `[Tipo][Variante].astro` (ej: `HeroClic.astro`)
- **componente_key:** `[tipo]-[variante]` (ej: `hero-clic`)
- **Carpeta:** `apps/web/src/components/[tipo]/` (ej: `hero/`)

### Estructura de Datos Recomendada

```json
{
  "static_data": {
    // Textos, URLs, imágenes estáticas
  },
  "dynamic_data": {
    // Configuración de datos dinámicos (se resuelve automáticamente)
  },
  "toggles": {
    // Booleanos para activar/desactivar funcionalidades
  },
  "styles": {
    // Estilos personalizados (opcional, usar tema cuando sea posible)
  }
}
```

---

## 🚀 Siguientes Pasos

Después de crear un componente:

1. **Probar en diferentes páginas** (homepage, custom, etc.)
2. **Agregar variantes** si es necesario (ej: `hero-default`, `hero-clic`, `hero-minimal`)
3. **Documentar el componente** en el README del proyecto
4. **Agregar tests** si aplica
5. **Optimizar rendimiento** (lazy loading, imágenes optimizadas, etc.)

---

**Última actualización:** 2025-01-XX  
**Mantenido por:** Equipo de Desarrollo  
**Versión del Sistema:** 2.0.0

---

*Este documento es la fuente de verdad para crear e integrar componentes. Consultar antes de crear cualquier componente nuevo.*








