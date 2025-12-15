# MANUAL DE DESARROLLO DE COMPONENTES WEB
## Guía definitiva para Claude AI

> **IMPORTANTE**: Este es el único documento de referencia para el desarrollo de componentes.
> Cualquier otra documentación .md relacionada con componentes está obsoleta.

---

## ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE COMPONENTES                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. CATALOGO (DB)          2. INSTANCIA (DB)         3. RENDER (Astro)  │
│  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐│
│  │catalogo_        │       │componentes_web  │       │ComponentRenderer││
│  │componentes      │──────▶│(por tenant)     │──────▶│.astro           ││
│  │                 │       │                 │       │                 ││
│  │- tipo           │       │- tenant_id      │       │Mapea key a      ││
│  │- componente_key │       │- datos (JSONB)  │       │componente Astro ││
│  │- campos_config  │       │- orden          │       │                 ││
│  └─────────────────┘       └─────────────────┘       └─────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PASO 1: CREAR VARIANTE EN BASE DE DATOS

### Tabla: `catalogo_componentes`

Cada registro es una **variante** de componente. El `tipo` agrupa variantes del mismo componente.

```sql
INSERT INTO catalogo_componentes (
  tipo,           -- 'header' (agrupa variantes)
  nombre,         -- 'Header Transparente' (nombre visible)
  componente_key, -- 'header-transparent' (CLAVE PARA ASTRO - UNICO)
  categoria,      -- 'layout' | 'content' | 'forms' | 'display'
  descripcion,    -- Descripción para el CRM
  icono,          -- 'Layout' (nombre de icono Lucide o emoji)
  campos_config,  -- JSONB: Define campos editables en CRM
  active          -- true
) VALUES (
  'header',
  'Header Transparente',
  'header-transparent',
  'layout',
  'Header con fondo transparente para páginas con imagen hero',
  'Layout',
  '[
    {"key": "logo", "label": "Logo URL", "tipo": "image"},
    {"key": "links", "label": "Enlaces de navegación", "tipo": "array", "schema": {
      "texto": {"type": "text", "label": "Texto"},
      "url": {"type": "text", "label": "URL"}
    }},
    {"key": "mostrarBusqueda", "label": "Mostrar búsqueda", "tipo": "toggle", "grupo": "toggles", "default": false}
  ]'::jsonb,
  true
);
```

### Estructura de `campos_config`

```typescript
interface CampoConfig {
  key: string;           // Nombre del campo en datos
  label: string;         // Etiqueta en CRM
  tipo: 'text' | 'textarea' | 'number' | 'image' | 'url' | 'select' | 'toggle' | 'array';
  grupo?: 'toggles';     // Si es toggle, va en datos.toggles
  default?: any;         // Valor por defecto
  required?: boolean;    // Si es requerido
  opciones?: string[];   // Para tipo 'select'
  schema?: {             // Para tipo 'array' - define campos de cada item
    [key: string]: {
      type: string;
      label: string;
    }
  }
}
```

---

## PASO 2: CREAR COMPONENTE ASTRO

### Ubicación

```
apps/web/src/components/
├── [tipo]/
│   ├── [Tipo]Default.astro      // Variante default
│   ├── [Tipo]Transparent.astro  // Variante transparente
│   └── [Tipo]Compact.astro      // Variante compacta
```

### Plantilla Base

```astro
---
/**
 * [Tipo][Variante].astro
 * [Descripción del componente]
 *
 * CONFIGURACION (static_data):
 * - campo1: Descripción
 * - campo2: Descripción
 *
 * TOGGLES:
 * - toggle1: Descripción
 *
 * COLORES (styles):
 * - colorFondo: Color de fondo
 */

import type { ComponenteDataEstructurado } from '../../types/componentesEstructurado';

interface Props {
  datos: ComponenteDataEstructurado;
  tema?: Record<string, string>;
  baseUrl?: string;
}

const { datos, tema = {}, baseUrl = '' } = Astro.props;

// === ACCESO A DATOS ESTRUCTURADOS ===
const staticData = datos?.static_data || {};
const styles = datos?.styles || {};
const toggles = datos?.toggles || {};

// === EXTRAER DATOS ===
const campo1 = staticData.campo1 || 'Valor default';
const arrayData = Array.isArray(staticData.items) ? staticData.items : [];

// === TOGGLES (siempre boolean) ===
const mostrarAlgo = toggles.mostrarAlgo === true;  // default false
const ocultarOtro = toggles.ocultarOtro !== false; // default true

// === COLORES (prioridad: styles > tema > default) ===
const colorPrimario = styles.colorPrimario || tema.primary || '#667eea';
---

<section style={`--color-primario: ${colorPrimario};`}>
  {/* Tu HTML aquí */}
</section>

<style>
  section {
    color: var(--color-primario);
  }
</style>
```

### Estructura de Datos que Recibe

```typescript
interface ComponenteDataEstructurado {
  static_data: {
    // Datos estáticos configurados en CRM
    titulo?: string;
    subtitulo?: string;
    logo?: string;
    links?: Array<{texto: string; url: string}>;
    // ... cualquier campo definido en campos_config
  };

  dynamic_data?: {
    // Para componentes que necesitan datos de BD
    dataType?: 'properties' | 'articles' | 'testimonials';
    resolved?: any[]; // Datos resueltos por el backend
  };

  styles?: {
    // Estilos personalizados
    colorPrimario?: string;
    colorFondo?: string;
  };

  toggles?: {
    // Opciones booleanas
    mostrarBusqueda?: boolean;
    mostrarPrecio?: boolean;
  };
}
```

---

## PASO 3: REGISTRAR EN ComponentRenderer.astro

### Archivo: `apps/web/src/components/ComponentRenderer.astro`

```astro
---
// 1. IMPORTAR el nuevo componente
import HeaderTransparent from './header/HeaderTransparent.astro';

// 2. AGREGAR al mapa de componentes
const componentMap: Record<string, any> = {
  // Componentes existentes...
  'header-default': HeaderDefault,

  // TU NUEVO COMPONENTE (key = componente_key de la BD)
  'header-transparent': HeaderTransparent,
};
---
```

### Regla de Nomenclatura

| En BD (componente_key) | En Astro (archivo) | En componentMap |
|------------------------|--------------------| ----------------|
| `header-default`       | `HeaderDefault.astro` | `'header-default': HeaderDefault` |
| `header-transparent`   | `HeaderTransparent.astro` | `'header-transparent': HeaderTransparent` |
| `hero-search`          | `HeroSearch.astro` | `'hero-search': HeroSearch` |

---

## PASO 4: ASIGNAR A TIPO DE PÁGINA

### Desde CRM

1. Ir a **Web > Páginas**
2. Seleccionar tipo de página (ej: Homepage)
3. Click en **"Agregar Componente"**
4. Seleccionar el componente del catálogo
5. El componente se crea en `componentes_web` con datos default

### O directamente en BD

```sql
INSERT INTO componentes_web (
  tenant_id,
  componente_catalogo_id,  -- ID del registro en catalogo_componentes
  tipo_pagina_id,          -- ID del tipo de página
  orden,
  activo,
  datos                    -- JSONB con la estructura
) VALUES (
  'uuid-tenant',
  'uuid-catalogo',
  'uuid-tipo-pagina',
  0,
  true,
  '{
    "static_data": {
      "logo": "https://...",
      "links": [{"texto": "Inicio", "url": "/"}]
    },
    "toggles": {
      "mostrarBusqueda": true
    }
  }'::jsonb
);
```

---

## FLUJO COMPLETO DE RENDERIZADO

```
1. Usuario visita: /propiedades
                    │
2. routeResolver.ts │
   ├── Detecta tenant por dominio/slug
   ├── Encuentra tipo_pagina: 'listados_propiedades'
   └── Llama a getSeccionesResueltas()
                    │
3. seccionesService │
   ├── SELECT * FROM componentes_web
   │   WHERE tipo_pagina_id = X AND activo = true
   │   ORDER BY orden
   └── Retorna array de componentes con datos
                    │
4. dynamicDataResolver (si hay dynamic_data)
   ├── Detecta dataType: 'properties'
   └── Resuelve datos y los agrega a dynamic_data.resolved
                    │
5. Astro recibe:    │
   {
     components: [
       {tipo: 'header', componente_key: 'header-default', datos: {...}},
       {tipo: 'property_grid', componente_key: 'property-grid-default', datos: {...}},
       {tipo: 'footer', componente_key: 'footer-default', datos: {...}}
     ],
     theme: {primary: '#667eea', ...}
   }
                    │
6. ComponentRenderer.astro
   ├── Para cada componente:
   │   └── componentMap[componente_key] → Componente Astro
   └── Renderiza con datos y tema
```

---

## EJEMPLO COMPLETO: Agregar HeroSearch

### 1. Insertar en catalogo_componentes

```sql
INSERT INTO catalogo_componentes (
  tipo, nombre, componente_key, categoria, descripcion, icono, campos_config, active
) VALUES (
  'hero',
  'Hero con Buscador',
  'hero-search',
  'content',
  'Hero banner con buscador de propiedades integrado',
  'Search',
  '[
    {"key": "titulo", "label": "Título", "tipo": "text", "default": "Encuentra tu hogar ideal"},
    {"key": "subtitulo", "label": "Subtítulo", "tipo": "textarea"},
    {"key": "imagenFondo", "label": "Imagen de fondo", "tipo": "image"},
    {"key": "placeholderBusqueda", "label": "Placeholder del buscador", "tipo": "text", "default": "Buscar por ubicación..."},
    {"key": "mostrarFiltros", "label": "Mostrar filtros", "tipo": "toggle", "grupo": "toggles", "default": true}
  ]'::jsonb,
  true
);
```

### 2. Crear HeroSearch.astro

```astro
---
import type { ComponenteDataEstructurado } from '../../types/componentesEstructurado';

interface Props {
  datos: ComponenteDataEstructurado;
  tema?: Record<string, string>;
  baseUrl?: string;
}

const { datos, tema = {}, baseUrl = '' } = Astro.props;

const staticData = datos?.static_data || {};
const toggles = datos?.toggles || {};

const titulo = staticData.titulo || 'Encuentra tu hogar ideal';
const subtitulo = staticData.subtitulo || '';
const imagenFondo = staticData.imagenFondo || '';
const placeholder = staticData.placeholderBusqueda || 'Buscar...';
const mostrarFiltros = toggles.mostrarFiltros !== false;

const colorPrimario = tema.primary || '#667eea';
---

<section
  class="hero-search"
  style={`
    --hs-primary: ${colorPrimario};
    ${imagenFondo ? `background-image: url(${imagenFondo});` : ''}
  `}
>
  <div class="hero-content">
    <h1>{titulo}</h1>
    {subtitulo && <p>{subtitulo}</p>}

    <form class="search-form" action={`${baseUrl}/propiedades`}>
      <input type="search" name="q" placeholder={placeholder} />
      {mostrarFiltros && (
        <select name="tipo">
          <option value="">Tipo</option>
          <option value="venta">Venta</option>
          <option value="renta">Renta</option>
        </select>
      )}
      <button type="submit">Buscar</button>
    </form>
  </div>
</section>

<style>
  .hero-search {
    min-height: 500px;
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: white;
  }

  .search-form button {
    background: var(--hs-primary);
  }
</style>
```

### 3. Registrar en ComponentRenderer.astro

```astro
---
import HeroSearch from './hero/HeroSearch.astro';

const componentMap: Record<string, any> = {
  // ... existentes
  'hero-search': HeroSearch,
};
---
```

### 4. Listo para usar

Ahora aparece en el CRM al agregar componentes y se renderiza automáticamente.

---

## COMPONENTES CON DATOS DINÁMICOS

Para componentes que muestran datos de BD (propiedades, artículos, etc.):

### En campos_config, NO definir los datos - vienen de dynamic_data

```sql
-- El componente property_grid NO define "propiedades" en campos_config
-- Solo define configuración de visualización
campos_config = '[
  {"key": "titulo", "label": "Título de sección", "tipo": "text"},
  {"key": "mostrarPrecio", "label": "Mostrar precio", "tipo": "toggle", "grupo": "toggles", "default": true}
]'
```

### En el componente Astro

```astro
---
const dynamicData = datos?.dynamic_data || {};
const propiedades = dynamicData.resolved || [];

// Las propiedades vienen ya resueltas por el backend
---

{propiedades.map(prop => (
  <article>
    <h3>{prop.titulo}</h3>
    <p>{prop.precio}</p>
  </article>
))}
```

### El backend resuelve automáticamente

En `routeResolver.ts` → `dynamicDataResolver.ts`:
- Detecta `dynamic_data.dataType`
- Ejecuta query correspondiente
- Agrega resultado a `dynamic_data.resolved`

---

## ARCHIVOS CLAVE

| Archivo | Propósito |
|---------|-----------|
| `packages/api/src/database/migrations/` | Migraciones de BD |
| `packages/api/src/services/routeResolver.ts` | Resuelve rutas y componentes |
| `packages/api/src/services/dynamicDataResolver.ts` | Resuelve datos dinámicos |
| `apps/web/src/components/ComponentRenderer.astro` | Mapea y renderiza componentes |
| `apps/web/src/types/componentesEstructurado.ts` | Tipos TypeScript |
| `apps/crm-frontend/src/pages/crm/PaginaEditor.tsx` | Editor de páginas |
| `apps/crm-frontend/src/components/DynamicComponentEditor.tsx` | Editor de campos |

---

## CHECKLIST PARA NUEVA VARIANTE

- [ ] Insertar registro en `catalogo_componentes` con `componente_key` único
- [ ] Definir `campos_config` con todos los campos editables
- [ ] Crear archivo `.astro` en la carpeta correspondiente
- [ ] Documentar campos en comentario del componente
- [ ] Importar y registrar en `ComponentRenderer.astro`
- [ ] Probar en CRM: agregar a una página
- [ ] Probar en web pública: verificar renderizado

---

## NOTAS IMPORTANTES

1. **componente_key es la clave**: Debe coincidir EXACTAMENTE entre BD y componentMap
2. **Siempre usar fallbacks**: `staticData.campo || 'default'`
3. **Toggles son booleanos**: Comparar explícitamente `=== true` o `!== false`
4. **Prioridad de colores**: styles del componente > tema del tenant > default
5. **Arrays siempre validar**: `Array.isArray(x) ? x : []`
6. **No hardcodear URLs**: Usar `baseUrl` para prefijos de tenant

---

*Última actualización: Diciembre 2024*
*Este documento reemplaza toda documentación anterior sobre componentes.*
