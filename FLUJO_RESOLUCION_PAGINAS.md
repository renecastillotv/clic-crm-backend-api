# Flujo de Resolución de Páginas - Documentación Técnica

## Índice
1. [Visión General](#visión-general)
2. [Flujo Completo del Resolver](#flujo-completo-del-resolver)
3. [Búsqueda y Construcción de Componentes](#búsqueda-y-construcción-de-componentes)
4. [Resolución de Datos Dinámicos](#resolución-de-datos-dinámicos)
5. [Estructura de Respuesta](#estructura-de-respuesta)
6. [Cómo Agregar Variantes](#cómo-agregar-variantes)
7. [Cómo Modificar Contenido](#cómo-modificar-contenido)
8. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Visión General

El sistema utiliza un **patrón de resolución unificado** donde:
- **Una sola función** (`routeResolver.ts`) detecta el tipo de página según la URL
- **Un solo servicio** (`seccionesService.ts`) construye los componentes de cualquier página
- **Un solo resolver** (`dynamicDataResolver.ts`) obtiene los datos dinámicos
- **Una sola respuesta estructurada** que el frontend renderiza sin lógica adicional

### Principio fundamental
> **"Todo viene de la base de datos, nada está hardcodeado"**

---

## Flujo Completo del Resolver

### 1. Entrada: URL del usuario
```
Ejemplos:
- /
- /asesores
- /propiedades
- /comprar/apartamento
- /villa-lujo-piscina-infinity
```

### 2. Detección del Tipo de Página
**Archivo**: `packages/api/src/services/routeResolver.ts`

**Función principal**: `resolveRoute(tenantId, pathname)`

#### Proceso de detección:

```
┌─────────────────────────────────────────────────────────┐
│ 1. ¿Es la homepage ("/") ?                              │
│    → SÍ: resolveHomepage()                              │
└─────────────────────────────────────────────────────────┘
                           │ NO
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 2. ¿El primer segmento es un PREFIJO CONOCIDO?         │
│    (asesores, videos, articulos, testimonios, etc.)     │
│                                                          │
│    → Consulta tabla: tenants_rutas_config               │
│      SELECT prefijo, nivel_navegacion                   │
│      WHERE tenant_id = ? AND habilitado = true          │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
                    ┌──────┴──────┐
                    │             │
                   SÍ            NO
                    │             │
                    ↓             ↓
        ┌──────────────────┐   ┌────────────────────┐
        │ Es contenido con │   │ Es búsqueda de     │
        │ prefijo conocido │   │ propiedades por    │
        │                  │   │ tags o slug        │
        │ Ejemplo:         │   │                    │
        │ /asesores        │   │ Ejemplo:           │
        │ /videos/tours    │   │ /comprar/          │
        │ /articulos       │   │ /villa-lujo-...    │
        └──────────────────┘   └────────────────────┘
                │                        │
                ↓                        ↓
    resolveContenidoDinamico()   resolvePropertyPath()
```

#### Tabla de Decisión por Nivel de Navegación

**Tabla**: `tenants_rutas_config`

| Prefijo      | nivel_navegacion | Segmentos | Resultado              |
|--------------|------------------|-----------|------------------------|
| asesores     | 1                | 0         | directorio_asesores    |
| asesores     | 1                | 1         | asesor_single          |
| videos       | 2                | 0         | videos_listado         |
| videos       | 2                | 1         | categoria_videos       |
| videos       | 2                | 2         | video_single           |
| articulos    | 2                | 0         | articulos_listado      |
| articulos    | 2                | 1         | categoria_articulos    |
| articulos    | 2                | 2         | articulo_single        |

**Código de detección**:
```typescript
// routeResolver.ts:474-520
const prefijosConfig = await query(/* SELECT FROM tenants_rutas_config */);
const primerSegmento = segmentos[0];
const prefijoEncontrado = prefijosConfig.find(p =>
  p.prefijo === primerSegmento ||
  p.alias_idiomas?.[idioma] === primerSegmento
);

if (prefijoEncontrado) {
  const nivelNavegacion = prefijoEncontrado.nivel_navegacion;
  const segmentosDespuesPrefijo = segmentos.length - 1;

  if (nivelNavegacion === 1) {
    tipoPagina = segmentosDespuesPrefijo === 0
      ? `directorio_${prefijo}`
      : `${prefijo}_single`;
  } else if (nivelNavegacion === 2) {
    if (segmentosDespuesPrefijo === 0) tipoPagina = `${prefijo}_listado`;
    else if (segmentosDespuesPrefijo === 1) tipoPagina = `categoria_${prefijo}`;
    else tipoPagina = `${prefijo}_single`;
  }
}
```

### 3. Resolución Según Tipo de Página

Una vez detectado el tipo, se llama a la función correspondiente:

| Tipo Detectado          | Función                   | Tipo Página DB          |
|-------------------------|---------------------------|-------------------------|
| Homepage                | resolveHomepage()         | homepage                |
| Directorio asesores     | resolveContenidoDinamico()| directorio_asesores     |
| Asesor individual       | resolveContenidoDinamico()| asesor_single           |
| Listado propiedades     | resolvePropertyListing()  | propiedades_listado     |
| Propiedad individual    | resolveSingleProperty()   | single_property         |
| Videos listado          | resolveContenidoDinamico()| videos_listado          |
| Video categoría         | resolveContenidoDinamico()| categoria_videos        |
| Video single            | resolveContenidoDinamico()| video_single            |

---

## Búsqueda y Construcción de Componentes

### Servicio Central: `seccionesService.ts`

**Función principal**: `getSeccionesResueltas(tenantId, paginaId, tipoPagina)`

#### Proceso en 3 Pasos:

```
PASO 1: Obtener Componentes Globales (Header y Footer)
┌──────────────────────────────────────────────────────────┐
│ SELECT * FROM componentes_web                            │
│ WHERE tenant_id = ?                                      │
│   AND activo = true                                      │
│   AND scope = 'tenant'                                   │
│   AND tipo IN ('header', 'footer')                       │
└──────────────────────────────────────────────────────────┘
                           ↓
        Resultado: Header (orden: 0) + Footer (orden: 999)


PASO 2: Obtener Componentes Específicos del Tipo de Página
┌──────────────────────────────────────────────────────────┐
│ SELECT * FROM componentes_web                            │
│ WHERE tenant_id = ?                                      │
│   AND activo = true                                      │
│   AND scope = 'page_type'                                │
│   AND tipo_pagina = ?                                    │
│ ORDER BY orden ASC                                       │
└──────────────────────────────────────────────────────────┘
                           ↓
        Resultado: Componentes intermedios (orden: 1, 2, 3...)


PASO 3: Inyectar dataType Automático (si no existe)
┌──────────────────────────────────────────────────────────┐
│ Para ciertos tipos de componentes, se inyecta           │
│ automáticamente el dataType si no lo tienen:             │
│                                                           │
│ - team_grid → dataType: 'lista_asesores'                │
│ - property_grid → dataType: 'propiedades'               │
│ - video_gallery → dataType: 'lista_videos'              │
│ - article_grid → dataType: 'lista_articulos'            │
└──────────────────────────────────────────────────────────┘
```

**Código real**:
```typescript
// seccionesService.ts:45-120
export async function getSeccionesResueltas(
  tenantId: string,
  paginaId: string,
  tipoPagina?: string
): Promise<SeccionResuelta[]> {

  // 1. Componentes globales (header, footer)
  const globales = await query(`
    SELECT * FROM componentes_web c
    WHERE c.tenant_id = $1 AND c.activo = true
      AND c.scope = 'tenant'
      AND c.tipo IN ('header', 'footer')
  `, [tenantId]);

  // 2. Componentes del tipo de página
  const especificos = await query(`
    SELECT * FROM componentes_web c
    WHERE c.tenant_id = $1 AND c.activo = true
      AND c.scope = 'page_type'
      AND c.tipo_pagina = $2
    ORDER BY c.orden ASC
  `, [tenantId, tipoPagina]);

  // 3. Combinar y ordenar
  const todosComponentes = [...globales, ...especificos]
    .sort((a, b) => a.orden - b.orden);

  // 4. Inyectar dataType si es necesario
  return todosComponentes.map(comp => {
    if (comp.tipo === 'team_grid' && !comp.datos?.dynamic_data?.dataType) {
      comp.datos.dynamic_data = { dataType: 'lista_asesores' };
    }
    return comp;
  });
}
```

### Estructura de la Tabla `componentes_web`

```sql
CREATE TABLE componentes_web (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL,           -- 'hero', 'property_grid', etc.
  variante VARCHAR(50) DEFAULT 'default',
  nombre VARCHAR(100),                 -- Nombre descriptivo
  scope VARCHAR(20) DEFAULT 'tenant',  -- 'tenant', 'page_type', 'page'
  tipo_pagina VARCHAR(50),             -- 'homepage', 'directorio_asesores', etc.
  pagina_id UUID,                      -- ID específico de página (raro)
  datos JSONB NOT NULL DEFAULT '{}',   -- Configuración completa
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Estructura del campo `datos` (JSONB):

```json
{
  "static_data": {
    "titulo": "Expertos en Inversiones",
    "subtitulo": "Profesionales con años de experiencia",
    "etiquetaContactar": "Agendar Reunión"
  },
  "toggles": {
    "mostrarBio": true,
    "mostrarReviews": true,
    "mostrarContacto": true
  },
  "styles": {
    "gap": "2rem",
    "columnas": 3
  },
  "dynamic_data": {
    "dataType": "lista_asesores",
    "limit": 12,
    "filters": {}
  }
}
```

---

## Resolución de Datos Dinámicos

### Servicio: `dynamicDataResolver.ts`

**Función principal**: `resolveDynamicData(config, tenantId)`

#### Mapeo de Tipos de Datos

```typescript
// dynamicDataResolver.ts:77-128
const typeMapping = {
  // Listas
  'properties': 'propiedades',
  'propiedades': 'propiedades',
  'videos': 'lista_videos',
  'articles': 'lista_articulos',
  'agents': 'lista_asesores',
  'asesores': 'lista_asesores',
  'lista_asesores': 'lista_asesores',

  // Singles
  'property_single': 'propiedad_single',
  'propiedad_single': 'propiedad_single',
  'video_single': 'video_single',
  'article_single': 'articulo_single',
  'agent_single': 'asesor_single',

  // Categorías
  'categoria_videos': 'categoria_videos',
  'categoria_articulos': 'categoria_articulos'
};
```

#### Servicio Universal: `dynamicDataService.ts`

Este servicio centraliza TODAS las consultas de datos dinámicos:

```typescript
// dynamicDataService.ts
export async function resolveDynamicDataType(
  tipo: string,
  params: DynamicDataParams
): Promise<any[]> {

  switch (tipo) {
    case 'propiedades':
      return await getPropiedades(params);

    case 'propiedad_single':
      return await getPropiedadSingle(params);

    case 'lista_asesores':
      return await getAsesores(params);

    case 'asesor_single':
      return await getAsesorSingle(params);

    case 'lista_videos':
      return await getVideos(params);

    // ... más casos
  }
}
```

#### Flujo de Resolución de Datos Dinámicos

```
1. Componente tiene dynamic_data.dataType
   ↓
2. Se mapea el tipo (ej: 'propiedades' → 'propiedades')
   ↓
3. Se llama a dynamicDataService.resolveDynamicDataType()
   ↓
4. Se ejecuta la consulta SQL correspondiente
   ↓
5. Se retornan los datos formateados
   ↓
6. Se agregan a dynamic_data.resolved
```

**Ejemplo con property_grid**:

```javascript
// Componente en BD
{
  "tipo": "property_grid",
  "datos": {
    "dynamic_data": {
      "dataType": "propiedades",
      "limit": 12
    }
  }
}

// Después de resolución
{
  "tipo": "property_grid",
  "datos": {
    "dynamic_data": {
      "dataType": "propiedades",
      "limit": 12,
      "resolved": [
        {
          "id": "...",
          "titulo": "Villa de Lujo",
          "precio": "1850000.00",
          "habitaciones": 5,
          // ... más campos
        },
        // ... 11 propiedades más
      ]
    }
  }
}
```

---

## Estructura de Respuesta

### Formato JSON Completo

```json
{
  "page": {
    "id": "dynamic-asesores-directorio",
    "tenantId": "ec0f1d48-...",
    "tipoPagina": "directorio_asesores",
    "titulo": "Asesores",
    "slug": "/asesores",
    "descripcion": "Página de asesores",
    "publica": true,
    "activa": true
  },
  "theme": {
    "primary": "#e63946",
    "secondary": "#1d3557",
    "accent": "#a8dadc",
    "background": "#f1faee",
    "text": "#1d3557",
    "textSecondary": "#457b9d"
  },
  "components": [
    {
      "id": "af904d2d-...",
      "tipo": "header",
      "variante": "default",
      "datos": {
        "static_data": {
          "links": [
            {"url": "/propiedades?operacion=venta", "texto": "Comprar"},
            {"url": "/propiedades?operacion=renta", "texto": "Alquilar"}
          ],
          "logoAlt": "Otro Demo"
        },
        "toggles": {
          "mostrarMenu": true,
          "mostrarBotonContacto": true
        }
      },
      "activo": true,
      "orden": 0
    },
    {
      "id": "8f706ec2-...",
      "tipo": "hero",
      "variante": "simple",
      "datos": {
        "static_data": {
          "titulo": "Expertos en Inversiones",
          "subtitulo": "Profesionales con años de experiencia"
        },
        "toggles": {
          "mostrarStats": false,
          "mostrarBuscador": false
        }
      },
      "orden": 1
    },
    {
      "id": "4138e594-...",
      "tipo": "team_grid",
      "variante": "default",
      "datos": {
        "static_data": {
          "titulo": "Nuestros Especialistas",
          "subtitulo": "Estamos aquí para ayudarte"
        },
        "toggles": {
          "mostrarRating": true,
          "mostrarContacto": true
        },
        "dynamic_data": {
          "dataType": "lista_asesores",
          "resolved": [
            {
              "id": "bef78f0a-...",
              "nombre": "Carlos",
              "apellido": "Rodríguez",
              "cargo": "Broker Senior",
              "email": "carlos@demo.com",
              "calificacion_promedio": 4.5,
              "propiedades_activas": 3
            }
            // ... más asesores
          ]
        }
      },
      "orden": 2
    },
    {
      "id": "f3c1bd67-...",
      "tipo": "footer",
      "variante": "default",
      "datos": {
        "static_data": {
          "email": "info@otro-demo.com",
          "telefono": "+1 809 555 1234",
          "copyright": "2025 Otro Demo Inmobiliaria"
        }
      },
      "orden": 999
    }
  ],
  "idioma": "es",
  "idiomasDisponibles": ["es", "en", "fr"],
  "dynamicPage": true
}
```

### Responsabilidades del Frontend

El frontend **NO** debe:
- ❌ Buscar datos adicionales
- ❌ Filtrar o procesar datos
- ❌ Decidir qué componentes mostrar

El frontend **SOLO** debe:
- ✅ Iterar sobre `components[]`
- ✅ Renderizar cada componente según su `tipo` y `variante`
- ✅ Usar `datos.static_data` para textos estáticos
- ✅ Usar `datos.dynamic_data.resolved` para datos dinámicos
- ✅ Aplicar `theme` a los estilos

**Código frontend simplificado**:
```astro
---
const { components, theme } = pageData;
---

<div style={`--primary: ${theme.primary}; --secondary: ${theme.secondary}`}>
  {components.map(component => {
    const Component = getComponent(component.tipo, component.variante);
    return <Component datos={component.datos} tema={theme} />;
  })}
</div>
```

---

## Cómo Agregar Variantes

### 1. Crear el Componente Frontend

**Ubicación**: `apps/web/src/components/{tipo}/{Tipo}{Variante}.astro`

Ejemplo para `hero` variante `gradient`:

```astro
---
// apps/web/src/components/hero/HeroGradient.astro
interface Props {
  datos?: any;
  tema?: Record<string, string>;
}

const { datos, tema = {} } = Astro.props;
const staticData = datos?.static_data || {};
const toggles = datos?.toggles || {};

const titulo = staticData?.titulo || 'Título por defecto';
const subtitulo = staticData?.subtitulo || '';
---

<section class="hero-gradient" style={`--primary: ${tema.primary}; --secondary: ${tema.secondary}`}>
  <div class="hero-content">
    <h1>{titulo}</h1>
    {subtitulo && <p>{subtitulo}</p>}
  </div>
</section>

<style>
  .hero-gradient {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    padding: 4rem 2rem;
    color: white;
  }
</style>
```

### 2. Registrar el Componente en el Renderer

**Ubicación**: `apps/web/src/components/ComponentRenderer.astro`

```astro
---
import HeroDefault from './hero/HeroDefault.astro';
import HeroGradient from './hero/HeroGradient.astro'; // Nueva variante

const componentMap = {
  'hero': {
    'default': HeroDefault,
    'gradient': HeroGradient, // Registrar aquí
  },
  // ... otros componentes
};

const Component = componentMap[tipo]?.[variante] || componentMap[tipo]?.['default'];
---
```

### 3. Crear el Registro en Base de Datos

**Opción A - Vía Migración** (para variantes predeterminadas):

```typescript
// packages/api/src/database/migrations/060_add_hero_gradient_variant.ts
export async function up(knex: Knex): Promise<void> {
  const tenants = await knex('tenants').where('activo', true);

  for (const tenant of tenants) {
    await knex('componentes_web').insert({
      tenant_id: tenant.id,
      tipo: 'hero',
      variante: 'gradient',
      nombre: 'Hero con Gradiente',
      scope: 'page_type',
      tipo_pagina: 'homepage',
      datos: JSON.stringify({
        static_data: {
          titulo: 'Bienvenido',
          subtitulo: 'Encuentra tu propiedad ideal'
        },
        toggles: {
          mostrarBoton: true
        }
      }),
      activo: false, // Inactivo por defecto
      orden: 1
    });
  }
}
```

**Opción B - Vía SQL** (para casos específicos):

```sql
INSERT INTO componentes_web (
  tenant_id,
  tipo,
  variante,
  nombre,
  scope,
  tipo_pagina,
  datos,
  activo,
  orden
) VALUES (
  'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471', -- ID del tenant
  'hero',
  'gradient',
  'Hero con Gradiente',
  'page_type',
  'homepage',
  '{
    "static_data": {
      "titulo": "Bienvenido",
      "subtitulo": "Tu próxima inversión está aquí"
    },
    "toggles": {
      "mostrarBoton": true
    }
  }',
  true,
  1
);
```

### 4. Activar/Desactivar Variante

Para cambiar entre variantes:

```sql
-- Desactivar variante actual
UPDATE componentes_web
SET activo = false
WHERE tenant_id = 'ec0f1d48-...'
  AND tipo = 'hero'
  AND scope = 'page_type'
  AND tipo_pagina = 'homepage';

-- Activar nueva variante
UPDATE componentes_web
SET activo = true
WHERE id = 'ID_DEL_HERO_GRADIENT';
```

---

## Cómo Modificar Contenido

### Modificar Texto Estático

**Ejemplo**: Cambiar "Expertos en Inversiones" a "Nuestros Asesores"

```sql
UPDATE componentes_web
SET datos = jsonb_set(
  datos,
  '{static_data,titulo}',
  '"Nuestros Asesores"'
)
WHERE id = '8f706ec2-175c-41e1-98b5-613f0bdde91d';
```

### Modificar Toggle (activar/desactivar funcionalidad)

**Ejemplo**: Ocultar el buscador en el hero

```sql
UPDATE componentes_web
SET datos = jsonb_set(
  datos,
  '{toggles,mostrarBuscador}',
  'false'
)
WHERE id = '8f706ec2-175c-41e1-98b5-613f0bdde91d';
```

### Modificar Múltiples Campos

**Ejemplo**: Cambiar título y subtítulo del hero de asesores

```sql
UPDATE componentes_web
SET datos = datos || '{
  "static_data": {
    "titulo": "Equipo de Expertos",
    "subtitulo": "Más de 20 años de experiencia combinada"
  }
}'::jsonb
WHERE id = '8f706ec2-175c-41e1-98b5-613f0bdde91d';
```

### Agregar un Nuevo Campo

**Ejemplo**: Agregar un badge al hero

```sql
UPDATE componentes_web
SET datos = jsonb_set(
  datos,
  '{static_data,badge}',
  '"NUEVOS ASESORES"'
)
WHERE id = '8f706ec2-175c-41e1-98b5-613f0bdde91d';
```

### Modificar Configuración de Datos Dinámicos

**Ejemplo**: Cambiar el límite de propiedades mostradas

```sql
UPDATE componentes_web
SET datos = jsonb_set(
  datos,
  '{dynamic_data,limit}',
  '20'
)
WHERE tipo = 'property_grid';
```

### Cambiar el Orden de un Componente

**Ejemplo**: Mover el team_grid antes del hero

```sql
-- Hero pasará a orden 2
UPDATE componentes_web SET orden = 2 WHERE id = 'ID_HERO';

-- Team grid pasará a orden 1
UPDATE componentes_web SET orden = 1 WHERE id = 'ID_TEAM_GRID';
```

---

## Ejemplos Prácticos

### Ejemplo 1: Agregar un Nuevo Tipo de Componente "CTA"

#### Paso 1: Crear componente frontend

```astro
---
// apps/web/src/components/cta/CtaDefault.astro
interface Props {
  datos?: any;
  tema?: Record<string, string>;
}

const { datos, tema = {} } = Astro.props;
const { titulo, descripcion, textoBoton, urlBoton } = datos?.static_data || {};
---

<section class="cta-section">
  <div class="cta-container">
    <h2>{titulo}</h2>
    <p>{descripcion}</p>
    <a href={urlBoton} class="cta-button">{textoBoton}</a>
  </div>
</section>

<style>
  .cta-section {
    background: var(--primary);
    padding: 4rem 2rem;
    text-align: center;
  }
  .cta-button {
    background: white;
    color: var(--primary);
    padding: 1rem 2rem;
    border-radius: 8px;
  }
</style>
```

#### Paso 2: Registrar en ComponentRenderer

```astro
import CtaDefault from './cta/CtaDefault.astro';

const componentMap = {
  'cta': {
    'default': CtaDefault
  }
};
```

#### Paso 3: Insertar en base de datos

```sql
INSERT INTO componentes_web (
  tenant_id,
  tipo,
  variante,
  nombre,
  scope,
  tipo_pagina,
  datos,
  activo,
  orden
) VALUES (
  'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471',
  'cta',
  'default',
  'Llamado a la Acción',
  'page_type',
  'homepage',
  '{
    "static_data": {
      "titulo": "¿Listo para Invertir?",
      "descripcion": "Agenda una consulta gratuita con nuestros expertos",
      "textoBoton": "Agendar Ahora",
      "urlBoton": "/contacto"
    }
  }',
  true,
  5
);
```

### Ejemplo 2: Crear Página de "Nosotros" con Componentes Existentes

#### Paso 1: Configurar ruta en tenants_rutas_config

```sql
INSERT INTO tenants_rutas_config (
  tenant_id,
  prefijo,
  nivel_navegacion,
  habilitado
) VALUES (
  'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471',
  'nosotros',
  1,
  true
);
```

#### Paso 2: Crear componentes para la página

```sql
-- Hero de nosotros
INSERT INTO componentes_web (
  tenant_id, tipo, variante, nombre,
  scope, tipo_pagina, datos, activo, orden
) VALUES (
  'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471',
  'hero', 'simple', 'Hero Nosotros',
  'page_type', 'directorio_nosotros',
  '{"static_data": {"titulo": "Sobre Nosotros", "subtitulo": "Más de 20 años transformando inversiones"}}',
  true, 1
);

-- Features (reutilizando componente existente)
INSERT INTO componentes_web (
  tenant_id, tipo, variante, nombre,
  scope, tipo_pagina, datos, activo, orden
) VALUES (
  'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471',
  'features', 'default', 'Nuestros Valores',
  'page_type', 'directorio_nosotros',
  '{
    "static_data": {
      "titulo": "Nuestros Valores",
      "features": [
        {"icono": "shield", "titulo": "Transparencia", "descripcion": "Honestidad en cada transacción"},
        {"icono": "star", "titulo": "Excelencia", "descripcion": "Solo las mejores propiedades"}
      ]
    }
  }',
  true, 2
);

-- Team Grid
INSERT INTO componentes_web (
  tenant_id, tipo, variante, nombre,
  scope, tipo_pagina, datos, activo, orden
) VALUES (
  'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471',
  'team_grid', 'default', 'Nuestro Equipo',
  'page_type', 'directorio_nosotros',
  '{
    "static_data": {"titulo": "Conoce al Equipo"},
    "dynamic_data": {"dataType": "lista_asesores", "limit": 8}
  }',
  true, 3
);
```

### Ejemplo 3: Cambiar Tema de Colores

```sql
UPDATE temas_tenant
SET colores = jsonb_set(
  colores,
  '{primary}',
  '"#2563eb"'
)
WHERE tenant_id = 'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471';

-- O cambiar múltiples colores a la vez
UPDATE temas_tenant
SET colores = '{
  "primary": "#2563eb",
  "secondary": "#1e40af",
  "accent": "#60a5fa",
  "background": "#f8fafc",
  "text": "#0f172a"
}'::jsonb
WHERE tenant_id = 'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471';
```

---

## Diagrama de Flujo Completo

```
┌─────────────┐
│   USUARIO   │
│ http://...  │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│  FRONTEND (Astro)                   │
│  fetch('/api/tenants/{tenant}/      │
│         resolve?pathname=/asesores')│
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  API ROUTE                          │
│  packages/api/src/routes/tenants.ts │
│  GET /resolve                       │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  ROUTE RESOLVER                     │
│  routeResolver.ts                   │
│  - Detecta tipo de página           │
│  - Llama función correspondiente    │
└──────┬──────────────────────────────┘
       │
       ├─ homepage → resolveHomepage()
       │
       ├─ /asesores → resolveContenidoDinamico()
       │                ↓
       │         tipo: 'directorio_asesores'
       │
       ├─ /propiedades → resolvePropertyListing()
       │                  ↓
       │           tipo: 'propiedades_listado'
       │
       └─ /villa-lujo... → resolveSingleProperty()
                           ↓
                    tipo: 'single_property'
       │
       ↓
┌─────────────────────────────────────┐
│  SECCIONES SERVICE                  │
│  seccionesService.ts                │
│  getSeccionesResueltas()            │
│                                     │
│  1. SELECT globales (header/footer)│
│  2. SELECT page_type componentes   │
│  3. Ordenar por 'orden'            │
│  4. Inyectar dataType automático   │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  DYNAMIC DATA RESOLVER              │
│  dynamicDataResolver.ts             │
│                                     │
│  Para cada componente:              │
│  - ¿Tiene dynamic_data.dataType?   │
│    → SÍ: Resolver datos            │
│    → NO: Mantener como está        │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  DYNAMIC DATA SERVICE               │
│  dynamicDataService.ts              │
│                                     │
│  resolveDynamicDataType(tipo)      │
│  - propiedades → SELECT propiedades│
│  - lista_asesores → SELECT asesores│
│  - videos → SELECT videos          │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  BASE DE DATOS                      │
│  - componentes_web                  │
│  - propiedades                      │
│  - perfiles_asesor                  │
│  - videos                           │
│  - temas_tenant                     │
└──────┬──────────────────────────────┘
       │
       │ (datos resueltos)
       ↓
┌─────────────────────────────────────┐
│  RESPUESTA JSON                     │
│  {                                  │
│    page: {...},                     │
│    theme: {...},                    │
│    components: [                    │
│      {tipo, variante, datos},       │
│      ...                            │
│    ]                                │
│  }                                  │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  FRONTEND RENDERING                 │
│  ComponentRenderer.astro            │
│                                     │
│  components.map(c =>                │
│    <Component                       │
│      datos={c.datos}                │
│      tema={theme}                   │
│    />                               │
│  )                                  │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────┐
│   USUARIO   │
│  Ve página  │
│  renderizada│
└─────────────┘
```

---

## Conclusiones

### Ventajas del Sistema

1. **Unificado**: Un solo flujo para todas las páginas
2. **Database-driven**: Todo configurable desde la BD
3. **Sin lógica en frontend**: Frontend solo renderiza
4. **Flexible**: Fácil agregar variantes y componentes
5. **Escalable**: Nuevos tipos de contenido sin cambiar código

### Archivos Clave

| Archivo | Responsabilidad |
|---------|----------------|
| `routeResolver.ts` | Detectar tipo de página según URL |
| `seccionesService.ts` | Construir lista de componentes |
| `dynamicDataResolver.ts` | Mapear tipos de datos |
| `dynamicDataService.ts` | Ejecutar queries de datos |
| `ComponentRenderer.astro` | Renderizar componentes |

### Checklist para Nuevas Funcionalidades

#### Agregar nuevo tipo de componente:
- [ ] Crear componente Astro en `apps/web/src/components/{tipo}/`
- [ ] Registrar en `ComponentRenderer.astro`
- [ ] Insertar configuración en tabla `componentes_web`
- [ ] Probar renderizado

#### Agregar nueva variante:
- [ ] Crear archivo `{Tipo}{Variante}.astro`
- [ ] Registrar en `ComponentRenderer.astro`
- [ ] Insertar en BD con `variante = '{nueva-variante}'`
- [ ] Activar/desactivar según necesidad

#### Modificar contenido:
- [ ] Identificar ID del componente
- [ ] UPDATE del campo `datos` en tabla `componentes_web`
- [ ] Refrescar página en navegador

---

**Última actualización**: 2025-12-01
**Versión**: 1.0
**Autor**: Sistema de Documentación Automática
