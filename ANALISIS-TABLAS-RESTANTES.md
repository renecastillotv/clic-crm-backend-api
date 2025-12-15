# Análisis de Tablas Restantes

Análisis en profundidad de las 3 tablas que no se eliminaron en la limpieza de arquitectura.

## 📋 Resumen Ejecutivo

Después de analizar las 3 tablas restantes, la recomendación es:

1. **`tenants_rutas_config`**: ✅ **MANTENER** (con refactorización menor)
2. **`paginas_variantes_config`**: ❌ **ELIMINAR** y consolidar en nueva arquitectura
3. **`catalogo_campos`**: ❌ **ELIMINAR** y consolidar en `componentes_web.default_data`

---

## 1. tenants_rutas_config

### 📝 Qué hace

Esta tabla configura el **nivel de navegación** de las rutas dinámicas por tenant.

**Estructura:**
```typescript
{
  id: UUID,
  tenant_id: UUID,
  prefijo: string,           // 'testimonios', 'videos', 'articulos', etc.
  nivel_navegacion: number,  // 0, 1, o 2
  alias_idiomas: JSONB,      // { "en": "testimonials", "es": "testimonios" }
  habilitado: boolean,
  orden: number
}
```

**Ejemplos reales:**
- CLIC (plan enterprise): `testimonios` con nivel 2 → `/testimonios/categoria/single`
- Básico (plan basic): `testimonios` con nivel 0 → `/testimonios/single`

### 🎯 Propósito real

**NO es solo para crear rutas** - es para configurar **cuántos niveles de navegación** tiene cada prefijo.

El nivel determina la estructura de URL:
- **Nivel 0**: `/prefijo/slug` (directo)
- **Nivel 1**: `/prefijo/categoria/slug` (con categoría intermedia)
- **Nivel 2**: `/prefijo/categoria/subcategoria/slug` (con 2 niveles de categorización)

### ✅ Por qué mantenerla

1. **No es redundante con `paginas_web`**:
   - `paginas_web` son páginas estáticas (homepage, about, contact, etc.)
   - `tenants_rutas_config` configura rutas **dinámicas** de contenido (testimonios, videos, artículos, propiedades)

2. **Funcionalidad única**:
   - Configura **alias multiidioma** por tenant
   - Define **nivel de navegación** según plan del tenant
   - Enterprise puede tener 2 niveles, Basic solo 0
   - Es parte de la diferenciación de planes

3. **Usado activamente**:
   - [routeResolver.ts:337](d:\2026 CLIC\packages\api\src\services\routeResolver.ts#L337) - Resolución de rutas
   - [adminTenantsService.ts:130](d:\2026 CLIC\packages\api\src\services\adminTenantsService.ts#L130) - Configuración inicial
   - [037_seed_rutas_estandar_tenant.ts](d:\2026 CLIC\packages\api\src\database\migrations\037_seed_rutas_estandar_tenant.ts) - Seeds de tenants

### 🔧 Refactorización sugerida

**Cambio menor**: Agregar FK a `tipos_pagina` para validar prefijos válidos.

```sql
-- Agregar columna tipo_pagina_id (opcional pero recomendado)
ALTER TABLE tenants_rutas_config
ADD COLUMN tipo_pagina_id UUID REFERENCES tipos_pagina(id) ON DELETE CASCADE;

-- Esto permite validar que solo se configuren rutas para tipos de página que existen
```

**Beneficio**: Mantiene integridad referencial sin cambiar funcionalidad existente.

---

## 2. paginas_variantes_config

### 📝 Qué hace

Almacena **configuraciones por variante** de una página con herencia entre variantes.

**Estructura:**
```typescript
{
  id: UUID,
  pagina_id: UUID,
  variante: string,                    // 'default', 'modern', 'elegant', etc.
  componentes_activos: string[],       // ['header', 'hero', 'footer']
  configuracion_componentes: JSONB,    // { header: {...}, hero: {...} }
  hereda_de_variante: string,          // 'default'
  campos_heredados: string[],          // ['header.logo', 'footer.email']
  last_used_at: timestamp
}
```

**Propósito original**:
- Guardar configuraciones diferentes de una página por variante visual
- Permitir herencia (variante "modern" hereda de "default")
- Preservar datos al cambiar entre variantes

### ❌ Por qué eliminarla

#### Problema 1: Confusión conceptual de "variante"

**Hay 2 tipos de "variantes" mezcladas:**

1. **Variantes de COMPONENTE** (visual):
   - `hero/modern` vs `hero/elegant`
   - Son componentes diferentes con el mismo propósito
   - SOLUCIÓN: Ya lo tenemos en `componentes_web.tipo + variante`

2. **Variantes de PÁGINA** (configuración):
   - "Versión A" vs "Versión B" de una página
   - Son diferentes composiciones de la misma página
   - SOLUCIÓN: Usar `paginas_web` separadas o versionado

**Esta tabla mezcla ambos conceptos**, causando confusión.

#### Problema 2: Duplica funcionalidad de nueva arquitectura

Con la refactorización 073, ya tenemos:

```typescript
// ANTES (paginas_variantes_config):
{
  pagina_id: 'xxx',
  variante: 'modern',
  componentes_activos: ['header', 'hero'],
  configuracion_componentes: { header: { logo: '...' } }
}

// AHORA (nueva arquitectura):
paginas_web {
  tipo_pagina_id → tipos_pagina (define componentes del tipo)
  inherit_from_type: true
}

componentes_web {
  default_data: { logo: '...' } // Datos del catálogo
}

paginas_componentes {
  config_override: { logo: '...' } // Override por página
}
```

#### Problema 3: Herencia innecesaria

El sistema de herencia de variantes (`hereda_de_variante`, `campos_heredados`) es complejo y no es necesario porque:

- **Herencia de tipo**: Ya la tenemos con `inherit_from_type` en `paginas_web`
- **Herencia de componente**: Ya la tenemos con `default_data` + `config_override`
- **Herencia de variante**: No es un caso de uso real - si quieres una variante diferente, creas otra página

### 🎯 Casos de uso y soluciones

#### Caso 1: "Quiero variantes visuales del hero"

**❌ NO usar paginas_variantes_config**

**✅ Solución correcta:**
```sql
-- Crear componentes con diferentes variantes
INSERT INTO componentes_web (tenant_id, tipo, variante, default_data) VALUES
  ('tenant-1', 'hero', 'modern', '{"style": "modern", "layout": "split"}'),
  ('tenant-1', 'hero', 'elegant', '{"style": "elegant", "layout": "centered"}');

-- Asociar la variante que quieres a la página
INSERT INTO paginas_componentes (pagina_id, componente_id)
SELECT 'homepage-id', id
FROM componentes_web
WHERE tipo = 'hero' AND variante = 'modern';
```

#### Caso 2: "Quiero que el usuario cambie entre variantes y preserve datos"

**Requerimientos del usuario:**
1. Al cambiar de `hero/default` a `hero/modern`: heredar datos compatibles
2. Al volver a `hero/default`: recuperar datos originales

**✅ Solución correcta:**

```typescript
// NO necesitas paginas_variantes_config

// Opción A: Usar config_override para preservar datos
// El default_data se preserva en componentes_web
// El config_override se preserva en paginas_componentes
// Solo cambias qué componente está asociado

// Opción B: Soft delete de paginas_componentes
ALTER TABLE paginas_componentes ADD COLUMN activo BOOLEAN DEFAULT true;

// Al "cambiar variante":
// 1. Desactivar componente actual
UPDATE paginas_componentes SET activo = false
WHERE pagina_id = ? AND componente_id IN (
  SELECT id FROM componentes_web WHERE tipo = 'hero' AND variante = 'default'
);

// 2. Activar nuevo componente (o crear si no existe)
INSERT INTO paginas_componentes (pagina_id, componente_id, activo)
SELECT ?, id, true
FROM componentes_web WHERE tipo = 'hero' AND variante = 'modern'
ON CONFLICT (pagina_id, componente_id)
DO UPDATE SET activo = true;

// Al volver: simplemente reactivas el original
UPDATE paginas_componentes SET activo = true
WHERE pagina_id = ? AND componente_id IN (
  SELECT id FROM componentes_web WHERE tipo = 'hero' AND variante = 'default'
);
```

**Beneficios:**
- ✅ Datos preservados en `config_override`
- ✅ No duplica arquitectura
- ✅ Más simple de entender
- ✅ Usa las tablas refactorizadas

---

## 3. catalogo_campos

### 📝 Qué hace

Define **qué campos tiene cada tipo+variante de componente** para el sistema de contenido persistente.

**Estructura:**
```typescript
{
  id: UUID,
  tipo_componente: string,    // 'hero', 'header', 'footer'
  variante: string,           // 'default', 'modern'
  campo: string,              // 'titulo', 'subtitulo', 'badge'
  tipo_campo: string,         // 'text', 'textarea', 'image', 'url'
  categoria: string,          // 'content', 'media', 'config'
  etiqueta: string,           // "Título principal"
  descripcion: string,
  valor_default: string,
  opciones: JSONB,
  orden: number,
  requerido: boolean,
  traducible: boolean
}
```

**Ejemplos reales:**
```sql
-- Hero default tiene estos campos:
- badge (text, "Tu inmobiliaria de confianza")
- titulo (text, "Encuentra tu hogar ideal")
- subtitulo (textarea, "Miles de propiedades...")
- textoBoton (text, "Ver Propiedades")
- urlBoton (url, "/propiedades")
- imagenFondo (image, "https://...")
- stats (array, [{ numero: '500+', etiqueta: 'Propiedades' }])
```

### 🎯 Propósito original

Sistema de "CMS dentro del CMS" para:
1. Definir qué campos son editables en cada componente
2. Separar contenido (texto/imágenes) de configuración
3. Permitir contenido persistente al cambiar variantes

**Tablas relacionadas:**
- `catalogo_campos` - Define los campos
- `contenido_campos` - Almacena valores por componente/idioma
- `contenido_media` - Almacena imágenes/videos

### ❌ Por qué eliminarla

#### Problema 1: Sobrecomplica el sistema

Este sistema asume que necesitas:
- Definir campos dinámicamente en DB
- Crear UI genérica basada en esquema
- Edición de contenido separada de configuración

**Realidad**: En un SaaS B2B inmobiliario:
- Los componentes son **predefinidos** (no los crea el usuario final)
- Los campos de cada componente son **conocidos** (están en el código del componente)
- La UI de edición es **específica** por componente (no genérica)

#### Problema 2: Duplica default_data

```typescript
// ANTES - catalogo_campos (39_sistema_contenido_persistente):
{
  tipo_componente: 'hero',
  variante: 'default',
  campo: 'titulo',
  tipo_campo: 'text',
  valor_default: 'Encuentra tu hogar ideal',
  etiqueta: 'Título principal',
  requerido: true,
  traducible: true
}

// AHORA - componentes_web.default_data (073_refactor):
{
  tipo: 'hero',
  variante: 'default',
  default_data: {
    titulo: 'Encuentra tu hogar ideal',
    subtitulo: 'Miles de propiedades...',
    badge: 'Tu inmobiliaria',
    textoBoton: 'Ver Propiedades',
    urlBoton: '/propiedades'
  }
}
```

**`default_data` hace lo mismo pero más simple:**
- ✅ Todo el default en un solo JSONB
- ✅ No necesita joins
- ✅ No necesita tablas adicionales
- ✅ Más flexible (puedes agregar campos sin migración)

#### Problema 3: contenido_campos y contenido_media redundantes

```typescript
// ANTES - contenido_campos + contenido_media:
INSERT INTO contenido_campos (componente_id, campo, idioma, valor)
VALUES ('comp-1', 'titulo', 'es', 'Mi título custom');

INSERT INTO contenido_media (componente_id, campo, url, alt_text)
VALUES ('comp-1', 'imagenFondo', 'https://...', 'Fondo hero');

// AHORA - paginas_componentes.config_override:
INSERT INTO paginas_componentes (pagina_id, componente_id, config_override)
VALUES ('page-1', 'comp-1', '{
  "titulo": "Mi título custom",
  "imagenFondo": "https://...",
  "imagenFondoAlt": "Fondo hero"
}');
```

**`config_override` hace lo mismo pero más simple:**
- ✅ Todo el override en un solo JSONB
- ✅ No necesita 2 tablas separadas
- ✅ No necesita lógica de merge compleja
- ✅ Más fácil de consultar

#### Problema 4: No se usa en el resolver actual

Revisando [routeResolver.ts](d:\2026 CLIC\packages\api\src\services\routeResolver.ts), el sistema **NO usa** `catalogo_campos` ni `contenido_campos` para resolver páginas.

Usa directamente:
```typescript
const componentes = await query(`
  SELECT c.*, pc.config_override
  FROM paginas_componentes pc
  JOIN componentes_web c ON c.id = pc.componente_id
  WHERE pc.pagina_id = $1
`);

// Merge simple:
const finalData = {
  ...componente.default_data,
  ...config_override
};
```

### 🎯 Migración sugerida

#### Paso 1: Consolidar catalogo_campos → default_data

```sql
-- Script de migración
UPDATE componentes_web c
SET default_data = (
  SELECT jsonb_object_agg(campo,
    CASE
      WHEN tipo_campo IN ('array', 'object') THEN valor_default::jsonb
      ELSE to_jsonb(valor_default)
    END
  )
  FROM catalogo_campos
  WHERE tipo_componente = c.tipo
    AND variante = c.variante
  GROUP BY tipo_componente, variante
)
WHERE default_data IS NULL;
```

#### Paso 2: Consolidar contenido_campos → config_override

```sql
-- Migrar contenido editado a config_override
UPDATE paginas_componentes pc
SET config_override = (
  SELECT jsonb_object_agg(campo,
    COALESCE(valor_json, to_jsonb(valor))
  )
  FROM contenido_campos
  WHERE componente_id = pc.componente_id
    AND idioma = 'es'  -- Por ahora solo ES
)
WHERE EXISTS (
  SELECT 1 FROM contenido_campos
  WHERE componente_id = pc.componente_id
);
```

#### Paso 3: Migrar contenido_media → config_override

```sql
-- Agregar media al config_override
UPDATE paginas_componentes pc
SET config_override = COALESCE(config_override, '{}'::jsonb) || (
  SELECT jsonb_object_agg(
    campo,
    jsonb_build_object(
      'url', url,
      'alt', alt_text,
      'metadata', metadata
    )
  )
  FROM contenido_media
  WHERE componente_id = pc.componente_id
  GROUP BY componente_id
)
WHERE EXISTS (
  SELECT 1 FROM contenido_media
  WHERE componente_id = pc.componente_id
);
```

#### Paso 4: Drop tables

```sql
DROP TABLE IF EXISTS tenant_defaults;
DROP TABLE IF EXISTS contenido_media;
DROP TABLE IF EXISTS contenido_campos;
DROP TABLE IF EXISTS catalogo_campos;
```

---

## 📊 Comparación Final

| Aspecto | Sistema Actual (3 tablas) | Nueva Arquitectura |
|---------|---------------------------|-------------------|
| **Tablas** | 6 tablas (catalogo_campos, contenido_campos, contenido_media, tenant_defaults, paginas_variantes_config, tenants_rutas_config) | 3 tablas (componentes_web, paginas_componentes, tenants_rutas_config) |
| **Complejidad queries** | Múltiples JOINs + merge manual | SELECT directo + merge JSONB |
| **Performance** | Lento (6+ tables JOIN) | Rápido (1-2 tables JOIN) |
| **Flexibilidad** | Rígido (requiere migración para nuevos campos) | Flexible (JSONB dinámico) |
| **Mantenimiento** | Alto (lógica distribuida) | Bajo (centralizado) |
| **Casos de uso reales** | Solo tenants_rutas_config | Todos cubiertos |

---

## ✅ Plan de Acción Recomendado

### Fase 1: Consolidar catalogo_campos (Migración 075)

```typescript
// d:\2026 CLIC\packages\api\src\database\migrations\075_consolidate_catalogo_campos.ts

export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Consolidando catalogo_campos en default_data...');

  // 1. Migrar catalogo → default_data
  // 2. Migrar contenido_campos → config_override (texto)
  // 3. Migrar contenido_media → config_override (media)
  // 4. Drop tenant_defaults
  // 5. Drop contenido_media
  // 6. Drop contenido_campos
  // 7. Drop catalogo_campos

  console.log('✅ Sistema de contenido consolidado');
}
```

### Fase 2: Consolidar paginas_variantes_config (Migración 076)

```typescript
// d:\2026 CLIC\packages\api\src\database\migrations\076_consolidate_variantes.ts

export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Consolidando paginas_variantes_config...');

  // 1. Migrar configuraciones a paginas_componentes
  // 2. Agregar columna activo a paginas_componentes
  // 3. Crear índice en activo
  // 4. Drop paginas_variantes_config

  console.log('✅ Variantes consolidadas');
}
```

### Fase 3: Refinar tenants_rutas_config (Migración 077)

```typescript
// d:\2026 CLIC\packages\api\src\database\migrations\077_refine_rutas_config.ts

export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Refinando tenants_rutas_config...');

  // 1. Agregar tipo_pagina_id (opcional)
  // 2. Agregar FK constraint
  // 3. Agregar índice

  console.log('✅ Rutas config refinado');
}
```

---

## 🎯 Arquitectura Final Propuesta

```
tipos_pagina (catálogo)
  ↓ tipo_pagina_id
paginas_web (instancias)
  ↓ paginas_componentes (junction)
componentes_web (catálogo + config)
  - default_data: JSONB (reemplaza catalogo_campos)
  - scope: 'tenant' | 'page_type' | 'page'

paginas_componentes (junction)
  - config_override: JSONB (reemplaza contenido_campos + contenido_media)
  - activo: BOOLEAN (reemplaza paginas_variantes_config)
  - orden: INTEGER

tenants_rutas_config (config de rutas dinámicas)
  - nivel_navegacion: 0 | 1 | 2
  - alias_idiomas: JSONB
  - tipo_pagina_id: UUID (nuevo FK)
```

**Beneficios:**
- ✅ 5 tablas en lugar de 11
- ✅ Queries más rápidos (menos JOINs)
- ✅ Más flexible (JSONB dinámico)
- ✅ Más fácil de mantener
- ✅ Preparado para CRM de administración

---

## 💡 Respuestas a Preguntas del Usuario

### 1. "¿Una variante no se puede usar `componentes_web` para esto?"

**Respuesta**: ✅ **Sí, exacto**.

`componentes_web` ya tiene `tipo + variante`, por ejemplo:
- `hero/default`
- `hero/modern`
- `hero/elegant`

No necesitas `paginas_variantes_config` porque:
- La variante visual ya está en `componentes_web.variante`
- La asociación a página ya está en `paginas_componentes`
- El override de config ya está en `paginas_componentes.config_override`

### 2. "¿La parte de rutas_config no es lo mismo que `paginas_web` con su slug?"

**Respuesta**: ❌ **No exactamente**.

`tenants_rutas_config` es diferente porque:
- `paginas_web`: Páginas **estáticas** (homepage, about, contact)
- `tenants_rutas_config`: Rutas **dinámicas** con contenido (testimonios/juan-perez, videos/categoria/video-1)

**Pero**: Sí se puede refinar agregando FK a `tipos_pagina` para validar.

### 3. "Al cambiar de variante: (1) heredar data compatible, (2) preservar data al volver"

**Respuesta**: ✅ **Se puede hacer sin `paginas_variantes_config`**.

**Solución:**
```typescript
// 1. Herencia de data compatible: usa default_data
const componenteNuevo = componentes_web.find(
  c => c.tipo === 'hero' && c.variante === 'modern'
);

const dataHeredada = {
  ...componenteNuevo.default_data,  // Defaults de la nueva variante
  ...extractCompatibleFields(configOverrideActual, componenteNuevo.default_data)
};

// 2. Preservar data al volver: usa soft delete
UPDATE paginas_componentes SET activo = false
WHERE componente_id = ? // El componente actual

INSERT INTO paginas_componentes (pagina_id, componente_id, config_override, activo)
VALUES (?, ?, ?, true); // El nuevo componente con data heredada

// Al volver: simplemente reactivas
UPDATE paginas_componentes SET activo = true
WHERE componente_id = ? // El componente original
```

**Beneficios:**
- ✅ No duplica arquitectura
- ✅ Data preservada en `config_override`
- ✅ Más simple que sistema de herencia de variantes

---

## 📌 Conclusión

**MANTENER:**
- ✅ `tenants_rutas_config` (con refactorización menor)

**ELIMINAR Y CONSOLIDAR:**
- ❌ `paginas_variantes_config` → Usar `paginas_componentes.activo`
- ❌ `catalogo_campos` → Usar `componentes_web.default_data`
- ❌ `contenido_campos` → Usar `paginas_componentes.config_override`
- ❌ `contenido_media` → Usar `paginas_componentes.config_override`
- ❌ `tenant_defaults` → Usar `componentes_web.default_data` con `scope='tenant'`

**Resultado final:**
- De 11 tablas → 5 tablas core
- Arquitectura más simple y mantenible
- Preparada para CRM de administración de páginas
- Soporta todos los casos de uso originales
