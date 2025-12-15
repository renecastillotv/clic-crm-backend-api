# 📄 Guía: Crear Páginas Personalizadas con Componentes

## 📋 Tabla de Contenidos

1. [Visión General del Sistema](#visión-general-del-sistema)
2. [Arquitectura Desacoplada](#arquitectura-desacoplada)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Tipos de Componentes](#tipos-de-componentes)
5. [Scopes de Componentes](#scopes-de-componentes)
6. [Proceso de Creación de Página Custom](#proceso-de-creación-de-página-custom)
7. [Casos de Uso](#casos-de-uso)
8. [Ejemplos Prácticos](#ejemplos-prácticos)
9. [API Endpoints](#api-endpoints)

---

## 🎯 Visión General del Sistema

El sistema está diseñado con una **arquitectura completamente desacoplada**:
- **Frontend (Astro)**: Solo renderiza JSON recibido del backend
- **Backend (API)**: Maneja toda la lógica, resolución de datos y estructuración
- **Base de Datos**: Almacena páginas, componentes y sus relaciones

### Flujo de Datos

```
URL Request → Route Resolver → getPaginaCompleta → getSeccionesResueltas → Frontend Render
```

---

## 🏗️ Arquitectura Desacoplada

### Frontend (Astro)

El frontend **NO sabe** cómo se almacenan los componentes en la BD. Solo recibe:

```typescript
{
  page: {
    id: "uuid",
    titulo: "Mi Página",
    slug: "mi-pagina",
    tipoPagina: "custom",
    // ... más campos
  },
  theme: {
    primary: "#667eea",
    // ... colores
  },
  components: [
    {
      id: "uuid",
      tipo: "hero",
      variante: "default",
      datos: { /* JSON estructurado */ },
      orden: 0
    }
    // ... más componentes
  ]
}
```

### Backend (API)

El backend:
1. **Resuelve** qué página corresponde a la URL
2. **Obtiene** componentes usando herencia y prioridad
3. **Resuelve** datos dinámicos (propiedades, testimonios, etc.)
4. **Devuelve** todo estructurado y listo para renderizar

---

## 💾 Estructura de Base de Datos

### Tabla: `paginas_web`

Almacena las páginas del tenant:

```sql
CREATE TABLE paginas_web (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_pagina VARCHAR(50) NOT NULL REFERENCES tipos_pagina(codigo),
  titulo VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,  -- URL única (ej: "sobre-nosotros")
  descripcion TEXT,
  contenido JSONB DEFAULT '{}',  -- Contenido adicional flexible
  meta JSONB DEFAULT '{}',  -- SEO, meta tags
  publica BOOLEAN DEFAULT true,
  activa BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(tenant_id, slug)  -- Slug único por tenant
);
```

**Campos importantes:**
- `tipo_pagina`: Tipo de página (homepage, custom, single_property, etc.)
- `slug`: URL de la página (debe ser único por tenant)
- `activa`: Si la página está activa (inactivas no se muestran)

### Tabla: `componentes_web`

Almacena los componentes configurados:

```sql
CREATE TABLE componentes_web (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,  -- header, hero, footer, etc.
  variante VARCHAR(50) NOT NULL DEFAULT 'default',  -- default, variant1, etc.
  nombre VARCHAR(255),  -- Nombre identificador (ej: "Hero Principal")
  datos JSONB NOT NULL DEFAULT '{}',  -- Configuración del componente
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  scope VARCHAR(20) NOT NULL,  -- 'tenant' | 'page_type' | 'page'
  tipo_pagina VARCHAR(50),  -- Solo si scope='page_type'
  pagina_id UUID REFERENCES paginas_web(id) ON DELETE CASCADE,  -- Solo si scope='page'
  es_activo BOOLEAN DEFAULT false,  -- Si es la variante activa
  config_completa BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Campos importantes:**
- `scope`: Define el alcance del componente (ver sección Scopes)
- `pagina_id`: NULL para componentes globales, UUID para componentes de página
- `tipo_pagina`: Solo usado cuando `scope='page_type'`
- `datos`: JSONB con estructura `{ static_data: {}, dynamic_data: {}, styles: {}, toggles: {} }`

### Tabla: `paginas_componentes`

Relación many-to-many entre páginas y componentes globales (para reutilización):

```sql
CREATE TABLE paginas_componentes (
  id UUID PRIMARY KEY,
  pagina_id UUID NOT NULL REFERENCES paginas_web(id) ON DELETE CASCADE,
  componente_id UUID NOT NULL REFERENCES componentes_web(id) ON DELETE CASCADE,
  orden INTEGER DEFAULT 0,  -- Orden específico en esta página
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(pagina_id, componente_id)  -- Un componente solo una vez por página
);
```

**Propósito:**
- Permite asignar componentes globales (`scope='tenant'`) a páginas específicas
- Mantiene el orden de componentes por página
- Permite activar/desactivar componentes por página sin eliminar el componente global

### Tabla: `tipos_pagina`

Catálogo de tipos de página disponibles:

```sql
CREATE TABLE tipos_pagina (
  codigo VARCHAR(50) PRIMARY KEY,  -- homepage, custom, single_property, etc.
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  es_estandar BOOLEAN DEFAULT true,
  requiere_slug BOOLEAN DEFAULT true,
  configuracion JSONB DEFAULT '{}'
);
```

---

## 🧩 Tipos de Componentes

### Componentes Disponibles

1. **Layout:**
   - `header` - Encabezado del sitio
   - `footer` - Pie de página

2. **Hero:**
   - `hero` - Sección hero con variantes (default, variant1, variant2, variant3)

3. **Propiedades:**
   - `property_list` - Listado de propiedades
   - `property_card` - Tarjeta de propiedad
   - `property_detail` - Detalle de propiedad

4. **Contenido:**
   - `features` - Características
   - `testimonials` - Testimonios
   - `cta` - Call to Action
   - `blog_list` - Listado de blog

5. **Formularios:**
   - `contact_form` - Formulario de contacto
   - `search_bar` - Barra de búsqueda
   - `filter_panel` - Panel de filtros

6. **Navegación:**
   - `pagination` - Paginación

7. **Personalizados:**
   - `custom` - Componentes HTML/CSS/JS personalizados

### Estructura de Datos del Componente

Los componentes usan una estructura estándar en el campo `datos`:

```json
{
  "static_data": {
    "titulo": "Mi Título",
    "subtitulo": "Mi Subtítulo",
    "imagen": "/ruta/imagen.jpg"
  },
  "dynamic_data": {
    "tipo": "propiedades",  // propiedades, testimonios, etc.
    "filtros": {},
    "limite": 10
  },
  "styles": {
    "backgroundColor": "#ffffff",
    "textColor": "#000000"
  },
  "toggles": {
    "mostrarBoton": true,
    "mostrarImagen": false
  }
}
```

---

## 🎯 Scopes de Componentes

### 1. `scope='tenant'` (Componentes Globales)

**Alcance:** Aplican a todas las páginas del tenant (o se pueden asignar específicamente)

**Ejemplos:**
- Header del sitio
- Footer del sitio
- Hero reutilizable
- CTA global

**Características:**
- `pagina_id` = NULL
- `tipo_pagina` = NULL
- Pueden tener múltiples variantes
- Solo una variante activa por tipo (`es_activo=true`)
- Pueden asignarse a páginas específicas vía `paginas_componentes`

### 2. `scope='page_type'` (Por Tipo de Página)

**Alcance:** Aplican a todas las páginas de un tipo específico

**Ejemplos:**
- Hero específico para todas las páginas de tipo `single_property`
- CTA específico para todas las páginas `blog`

**Características:**
- `pagina_id` = NULL
- `tipo_pagina` = 'single_property', 'blog', etc.

### 3. `scope='page'` (Específicos de Página)

**Alcance:** Solo aplican a una página específica

**Ejemplos:**
- Hero personalizado solo para la página "Sobre Nosotros"
- Sección especial solo para la homepage

**Características:**
- `pagina_id` = UUID de la página específica
- `tipo_pagina` = NULL (no aplica)

---

## 📝 Proceso de Creación de Página Custom

### Paso 1: Crear la Página en la Base de Datos

**Endpoint:** `POST /api/tenants/:tenantId/paginas`

**Payload:**
```json
{
  "tipoPagina": "custom",
  "titulo": "Sobre Nosotros",
  "slug": "sobre-nosotros",
  "descripcion": "Página sobre nuestra empresa",
  "contenido": {},
  "meta": {
    "title": "Sobre Nosotros | Mi Empresa",
    "description": "Conoce más sobre nosotros"
  },
  "publica": true,
  "activa": true,
  "orden": 0
}
```

**Respuesta:**
```json
{
  "id": "uuid-de-la-pagina",
  "tenantId": "uuid-tenant",
  "tipoPagina": "custom",
  "titulo": "Sobre Nosotros",
  "slug": "sobre-nosotros",
  // ... más campos
}
```

### Paso 2: Crear Componentes para la Página

Tienes **3 opciones** para agregar componentes:

#### Opción A: Usar Componentes Globales Existentes

**Endpoint:** `POST /api/tenants/:tenantId/paginas/:paginaId/componentes`

**Payload:**
```json
{
  "componenteId": "uuid-componente-global",
  "orden": 1
}
```

**Qué hace:**
- Crea una referencia en `paginas_componentes`
- El componente global se usa en esta página
- Si editas el componente global, se actualiza en todas las páginas que lo usan

#### Opción B: Crear Componente Específico de la Página

**Endpoint:** `POST /api/tenants/:tenantId/paginas/:paginaId/componentes`

**Payload:**
```json
{
  "tipo": "hero",
  "variante": "default",
  "nombre": "Hero Sobre Nosotros",
  "datos": {
    "static_data": {
      "titulo": "Conoce Nuestra Historia",
      "subtitulo": "Más de 20 años de experiencia"
    },
    "styles": {},
    "toggles": {}
  },
  "orden": 0,
  "scope": "page"
}
```

**Qué hace:**
- Crea un componente nuevo en `componentes_web`
- `scope='page'` y `pagina_id` = UUID de la página
- Solo existe en esta página

#### Opción C: Crear Componente Global Reutilizable

**Endpoint:** `POST /api/tenants/:tenantId/componentes-globales`

**Payload:**
```json
{
  "tipo": "cta",
  "variante": "default",
  "nombre": "CTA Ventas",
  "datos": {
    "static_data": {
      "titulo": "¿Listo para comenzar?",
      "textoBoton": "Contactar"
    }
  },
  "orden": 0
}
```

**Qué hace:**
- Crea un componente con `scope='tenant'`
- `pagina_id` = NULL
- Puede asignarse a múltiples páginas después

Luego asignarlo a la página:
```json
POST /api/tenants/:tenantId/paginas/:paginaId/componentes
{
  "componenteId": "uuid-del-componente-global",
  "orden": 2
}
```

### Paso 3: Ordenar Componentes

Los componentes se ordenan automáticamente por:
1. Header siempre primero
2. Footer siempre último
3. Resto por campo `orden` ASC

Puedes actualizar el orden:

**Endpoint:** `PUT /api/tenants/:tenantId/paginas/:paginaId/componentes/reordenar`

**Payload:**
```json
{
  "ordenComponentes": [
    { "componenteId": "uuid-1", "orden": 0 },
    { "componenteId": "uuid-2", "orden": 1 },
    { "componenteId": "uuid-3", "orden": 2 }
  ]
}
```

### Paso 4: Activar la Página

Asegúrate de que la página tenga:
- `activa = true`
- `publica = true` (si debe ser accesible públicamente)

---

## 🔄 Orden de Prioridad (Herencia)

Cuando el sistema resuelve componentes para una página, usa este orden:

1. **Referencias específicas** (`paginas_componentes`) - Mayor prioridad
2. **Componentes específicos** (`scope='page'`) - Prioridad media
3. **Componentes por tipo** (`scope='page_type'`) - Prioridad baja
4. **Componentes globales** (`scope='tenant'`) - Menor prioridad (solo header/footer siempre aplican)

**Ejemplo:**
```
Página "Sobre Nosotros" (tipo='custom'):
1. Header global (scope='tenant', tipo='header') ← Siempre se aplica
2. Hero específico (scope='page', pagina_id='uuid-sobre-nosotros') ← Usa este
3. CTA global asignado (paginas_componentes) ← Usa este
4. Footer global (scope='tenant', tipo='footer') ← Siempre se aplica
```

---

## 📚 Casos de Uso

### Caso 1: Página "Sobre Nosotros" con Componentes Nuevos

**Objetivo:** Crear una página completamente nueva con componentes específicos

**Pasos:**
1. Crear página tipo `custom` con slug `sobre-nosotros`
2. Crear Hero específico (`scope='page'`) para esta página
3. Crear sección Features específica (`scope='page'`)
4. Asignar CTA global existente a la página
5. Footer global se aplica automáticamente

### Caso 2: Reutilizar Componentes Existentes

**Objetivo:** Crear página nueva reutilizando componentes globales

**Pasos:**
1. Crear página tipo `custom` con slug `servicios`
2. Buscar componentes globales existentes
3. Asignar Hero global, Features global, CTA global
4. Ordenar según necesidad
5. Los componentes globales se reutilizan en múltiples páginas

### Caso 3: Página con Componente Personalizado (Custom)

**Objetivo:** Página con HTML/CSS/JS completamente personalizado

**Pasos:**
1. Crear página tipo `custom`
2. Crear componente tipo `custom`:
   ```json
   {
     "tipo": "custom",
     "variante": "default",
     "datos": {
       "static_data": {
         "html": "<div>...</div>",
         "css": "...",
         "js": "..."
       }
     },
     "scope": "page"
   }
   ```

### Caso 4: Variantes del Mismo Componente

**Objetivo:** Tener múltiples versiones de un componente y elegir cuál activar

**Pasos:**
1. Crear componente Hero Variante 1 (`scope='tenant'`)
2. Crear componente Hero Variante 2 (`scope='tenant'`)
3. Activar la variante deseada (`es_activo=true`)
4. Solo la variante activa se renderiza

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Página "Contacto" Simple

```sql
-- 1. Crear página
INSERT INTO paginas_web (tenant_id, tipo_pagina, titulo, slug, activa)
VALUES ('tenant-uuid', 'contacto', 'Contacto', 'contacto', true);

-- 2. Crear formulario de contacto específico
INSERT INTO componentes_web (tenant_id, tipo, variante, datos, scope, pagina_id, orden, activo)
VALUES (
  'tenant-uuid',
  'contact_form',
  'default',
  '{"static_data": {"titulo": "Contáctanos", "subtitulo": "Estamos aquí para ayudarte"}}'::jsonb,
  'page',
  'pagina-contacto-uuid',
  0,
  true
);
```

### Ejemplo 2: Página "Landing" con Varios Componentes

```sql
-- 1. Crear página
INSERT INTO paginas_web (tenant_id, tipo_pagina, titulo, slug, activa)
VALUES ('tenant-uuid', 'landing_page', 'Landing Producto', 'landing-producto', true);

-- 2. Asignar Hero global
INSERT INTO paginas_componentes (pagina_id, componente_id, orden, activo)
VALUES ('pagina-uuid', 'hero-global-uuid', 0, true);

-- 3. Crear Features específico
INSERT INTO componentes_web (tenant_id, tipo, variante, datos, scope, pagina_id, orden, activo)
VALUES (
  'tenant-uuid',
  'features',
  'default',
  '{"static_data": {"titulo": "Características del Producto"}}'::jsonb,
  'page',
  'pagina-uuid',
  1,
  true
);

-- 4. Asignar CTA global
INSERT INTO paginas_componentes (pagina_id, componente_id, orden, activo)
VALUES ('pagina-uuid', 'cta-global-uuid', 2, true);
```

---

## 🔌 API Endpoints

### Páginas

- `GET /api/tenants/:tenantId/paginas` - Listar todas las páginas
- `GET /api/tenants/:tenantId/paginas/:paginaId` - Obtener página por ID
- `GET /api/tenants/:tenantId/paginas/slug/:slug` - Obtener página por slug
- `POST /api/tenants/:tenantId/paginas` - Crear página
- `PUT /api/tenants/:tenantId/paginas/:paginaId` - Actualizar página
- `DELETE /api/tenants/:tenantId/paginas/:paginaId` - Eliminar página

### Resolución de Rutas (Principal)

- `GET /api/tenants/:tenantId/resolve?pathname=/ruta` - **Endpoint principal**
  - Resuelve cualquier URL y devuelve página completa lista para renderizar
  - Incluye: página, tema, componentes (ya resueltos y ordenados)

### Componentes de Página

- `GET /api/tenants/:tenantId/paginas/:paginaId/componentes` - Obtener componentes de una página
- `POST /api/tenants/:tenantId/paginas/:paginaId/componentes` - Agregar componente a página
- `DELETE /api/tenants/:tenantId/paginas/:paginaId/componentes/:componenteId` - Remover componente de página
- `PUT /api/tenants/:tenantId/paginas/:paginaId/componentes/reordenar` - Reordenar componentes

### Componentes Globales

- `GET /api/tenants/:tenantId/componentes-globales` - Listar componentes globales
- `POST /api/tenants/:tenantId/componentes-globales` - Crear componente global
- `PUT /api/tenants/:tenantId/componentes-globales/:componenteId` - Actualizar componente global
- `DELETE /api/tenants/:tenantId/componentes-globales/:componenteId` - Eliminar componente global

### Componentes (Genérico)

- `POST /api/tenants/:tenantId/componentes` - Crear componente (cualquier scope)
- `PUT /api/tenants/:tenantId/componentes/:componenteId` - Actualizar componente
- `DELETE /api/tenants/:tenantId/componentes/:componenteId` - Eliminar componente

---

## ✅ Checklist para Crear Página Custom

- [ ] 1. Crear registro en `paginas_web` con `tipo_pagina='custom'`
- [ ] 2. Definir slug único para el tenant
- [ ] 3. Marcar `activa=true` y `publica=true`
- [ ] 4. Decidir qué componentes necesitas:
  - [ ] ¿Reutilizar componentes globales existentes?
  - [ ] ¿Crear componentes específicos de página?
  - [ ] ¿Crear nuevos componentes globales?
- [ ] 5. Asignar componentes a la página (vía `paginas_componentes` o crear con `scope='page'`)
- [ ] 6. Definir orden de componentes
- [ ] 7. Configurar datos de cada componente (static_data, styles, toggles)
- [ ] 8. Si hay datos dinámicos, configurar `dynamic_data`
- [ ] 9. Verificar que header y footer globales se aplican automáticamente
- [ ] 10. Probar la página accediendo a la URL: `/tenant/[tenantSlug]/[slug]`

---

## 🎨 Campos Intervienen por Tabla

### `paginas_web`
- ✅ `tipo_pagina` = 'custom' (o tipo estándar)
- ✅ `slug` = URL única (ej: "sobre-nosotros")
- ✅ `titulo` = Título de la página
- ✅ `activa` = true (para que se muestre)
- ✅ `publica` = true (para acceso público)
- ✅ `meta` = SEO, meta tags

### `componentes_web`
- ✅ `scope` = 'tenant' | 'page_type' | 'page'
- ✅ `tipo` = tipo de componente (hero, cta, etc.)
- ✅ `variante` = variante del componente
- ✅ `pagina_id` = NULL (global) o UUID (específico)
- ✅ `tipo_pagina` = solo si scope='page_type'
- ✅ `datos` = JSONB con estructura estándar
- ✅ `orden` = orden de visualización
- ✅ `activo` = true (para que se muestre)
- ✅ `es_activo` = true (si es la variante activa)

### `paginas_componentes`
- ✅ `pagina_id` = UUID de la página
- ✅ `componente_id` = UUID del componente global
- ✅ `orden` = orden en esta página específica
- ✅ `activo` = true (para que se muestre en esta página)

---

## 📖 Resumen

**Para crear una página custom con componentes:**

1. **Crear la página** en `paginas_web` con `tipo_pagina='custom'` y un `slug` único
2. **Agregar componentes** usando una de estas estrategias:
   - **Reutilizar:** Asignar componentes globales vía `paginas_componentes`
   - **Específicos:** Crear componentes con `scope='page'` y `pagina_id` = UUID de la página
   - **Nuevos globales:** Crear componentes con `scope='tenant'` y luego asignarlos
3. **Ordenar** componentes según el orden deseado
4. **Configurar** datos de cada componente (static_data, styles, toggles)
5. **Activar** página y componentes

El sistema automáticamente:
- ✅ Aplica header y footer globales
- ✅ Resuelve la herencia de componentes
- ✅ Resuelve datos dinámicos
- ✅ Ordena componentes correctamente
- ✅ Devuelve todo listo para renderizar en el frontend

---

**Próximos Pasos:**
- Implementar UI en el CRM para crear páginas custom visualmente
- Agregar más tipos de componentes al catálogo
- Mejorar el editor visual de componentes

