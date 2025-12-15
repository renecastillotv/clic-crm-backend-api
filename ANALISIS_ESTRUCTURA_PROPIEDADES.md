# Análisis de Estructura de Propiedades - Compatibilidad con Alterestate y EasyBroker

## 📋 Resumen Ejecutivo

Este documento analiza la estructura de datos de propiedades de **Alterestate** y **EasyBroker** para identificar:
1. Campos que ya tenemos
2. Campos que nos faltan
3. Campos que podemos extender
4. Propuesta de estructura compatible

---

## 🔍 Comparación de Campos

### 1. IDENTIFICADORES

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `id` | `uid` / `cid` | `public_id` | `id` (UUID) | ✅ Tenemos |
| `external_id` | `cid` (string) | `public_id` (string) | ❌ **FALTA** | ⚠️ **NECESARIO** |
| `external_source` | `'alterestate'` | `'easybroker'` | ❌ **FALTA** | ⚠️ **NECESARIO** |
| `external_url` | `external_route` | `public_url` | ❌ **FALTA** | ⚠️ **NECESARIO** |
| `internal_code` | Generado `p000XXX` | Generado `p000XXX` | `codigo` (opcional) | ⚠️ **MEJORAR** |
| `slug` | `slug` | Generado desde `title` | `slug` | ✅ Tenemos |

**Recomendación**: Agregar `external_id`, `external_source`, `external_url` para tracking de importaciones.

---

### 2. INFORMACIÓN BÁSICA

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `title` | `name` | `title` | `titulo` | ✅ Tenemos |
| `description` | `description` | `description` | `descripcion` | ✅ Tenemos |
| `short_description` | `short_description` | ❌ | ❌ **FALTA** | ⚠️ Opcional |
| `slug_translations` | JSON `{es: "..."}` | JSON `{es: "..."}` | ❌ **FALTA** | ⚠️ Opcional |

**Recomendación**: Mantener estructura actual, agregar `short_description` opcional.

---

### 3. PRECIOS Y OPERACIÓN

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `price_sale` | `sale_price` | `operations[].amount` (type=sale) | `precio` (solo uno) | ⚠️ **MEJORAR** |
| `price_rent` | `rent_price` | `operations[].amount` (type=rental) | ❌ **FALTA** | ⚠️ **NECESARIO** |
| `price_temp` | ❌ | ❌ | ❌ | ⚠️ Opcional |
| `maintenance` | ❌ | ❌ | ❌ | ⚠️ Opcional |
| `currency` | `currency_sale` / `currency_rent` | `operations[].currency` | `moneda` | ✅ Tenemos |
| `operation` | `listing_type[]` → `'venta'`, `'alquiler'`, `'venta-alquiler'` | `operations[]` → `'venta'`, `'alquiler'`, `'venta_alquiler'` | `operacion` (`'venta'`, `'renta'`, `'traspaso'`) | ⚠️ **AJUSTAR** |

**Recomendación**: 
- Separar `precio` en `precio_venta` y `precio_alquiler`
- Normalizar `operacion` a: `'venta'`, `'alquiler'`, `'venta-alquiler'`
- Agregar `precio_anterior` (ya existe) y `maintenance` opcional

---

### 4. TIPO DE PROPIEDAD

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `type` | `category.name` → mapeado | `property_type` → mapeado | `tipo` (limitado) | ⚠️ **EXTENDER** |

**Mapeo de Tipos**:

| Alterestate | EasyBroker | Nuestro Actual | Propuesto |
|-------------|------------|----------------|-----------|
| `Apartamentos` | `apartamento` | `departamento` | `apartamento` |
| `Casas` | `casa` | `casa` | `casa` |
| `Villas` | `villa` | ❌ | `villa` |
| `Oficinas` | `oficina` | `oficina` | `oficina` |
| `Locales` | `local comercial` | `local` | `local_comercial` |
| `Terrenos` | `terreno` | `terreno` | `terreno` |
| `Penthouse` | `penthouse` | ❌ | `penthouse` |
| `Townhouse` | `townhouse` | ❌ | `townhouse` |
| `Edificio` | `edificio` | ❌ | `edificio` |
| `Finca` | `finca` | ❌ | `finca` |
| `Nave` / `Bodega` | `nave` / `bodega` | `bodega` | `bodega` |

**Recomendación**: Extender tipos a enum completo con soporte para todos los tipos.

---

### 5. CARACTERÍSTICAS FÍSICAS

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `rooms` | `room` | `bedrooms` | `habitaciones` | ✅ Tenemos |
| `bathrooms` | `bathroom` | `bathrooms` | `banos` | ✅ Tenemos |
| `half_bathrooms` | `half_bathrooms` | `half_bathrooms` | `medios_banos` | ✅ Tenemos |
| `parking` | `parkinglot` | `parking_spaces` | `estacionamientos` | ✅ Tenemos |
| `m2_construction` | `property_area` | `construction_size` | `m2_construccion` | ✅ Tenemos |
| `m2_total` | `terrain_area` | `lot_size` | `m2_terreno` | ✅ Tenemos |
| `floor_level` | ❌ | `floor_level` | ❌ **FALTA** | ⚠️ Opcional |
| `building_floors` | ❌ | `building_floors` | `pisos` | ⚠️ Verificar |
| `year_built` | ❌ | `year_built` | `antiguedad` (inverso) | ⚠️ **MEJORAR** |
| `condition` | `condition` (1-10) | ❌ | ❌ **FALTA** | ⚠️ Opcional |

**Recomendación**: 
- Agregar `floor_level` (piso donde está la propiedad)
- Mantener `building_floors` (total de pisos del edificio)
- Agregar `year_built` además de `antiguedad` (más preciso)

---

### 6. UBICACIÓN (Jerarquía: país/provincia/ciudad/sector/zona)

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `country` | `country` (default: RD) | `location.country` | `pais` | ✅ Tenemos |
| `province` | `province` | `location.region` | `provincia` | ✅ Tenemos |
| `city` | `city` | `location.city` | `ciudad` | ✅ Tenemos |
| `sector` | `sector` | `location.city_area` | `sector` | ✅ Tenemos |
| `zona` | ❌ | ❌ | `zona` | ✅ Tenemos (nuevo) |
| `address` | `address` | `location.street` | `direccion` (TEXT) | ✅ Tenemos |
| `latitude` | `latitude` | `location.latitude` | `latitud` | ✅ Tenemos |
| `longitude` | `longitude` | `location.longitude` | `longitud` | ✅ Tenemos |
| `mostrar_ubicacion_exacta` | ❌ | ❌ | `mostrar_ubicacion_exacta` | ✅ Tenemos (nuevo) |
| `codigo_postal` | ❌ | ❌ | `codigo_postal` | ✅ Tenemos |

**Estructura implementada**: 
- ✅ Jerarquía completa: `pais` → `provincia` → `ciudad` → `sector` → `zona`
- ✅ Dirección escrita (TEXT) para direcciones completas (ej: "Calle 26 de Enero esquina...")
- ✅ Coordenadas GPS: `latitud`, `longitud`
- ✅ Control de privacidad: `mostrar_ubicacion_exacta` (boolean)

---

### 7. ESTADO Y FLAGS

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `status` | `status` → `'publicado'`, `'vendido'`, `'alquilado'`, `'borrador'` | `property_status` → `'publicado'`, `'vendido'`, `'arrendado'`, `'no_disponible'` | `estado_propiedad` (`'disponible'`, `'reservada'`, `'vendida'`, `'rentada'`, `'inactiva'`) | ⚠️ **NORMALIZAR** |
| `is_project` | `is_project_v2` | ❌ | ❌ **FALTA** | ⚠️ **NECESARIO** |
| `is_featured` | `featured` | ❌ | `destacada` | ✅ Tenemos |
| `is_exclusive` | `exclusive` | ❌ | `exclusiva` | ✅ Tenemos |
| `is_furnished` | `furnished` | ❌ | ❌ **FALTA** | ⚠️ Opcional |
| `featured_until` | ❌ | ❌ | ❌ **FALTA** | ⚠️ Opcional |

**Recomendación**: 
- Normalizar `status` a: `'publicado'`, `'vendido'`, `'alquilado'`, `'reservado'`, `'borrador'`, `'inactivo'`
- Agregar `is_project` (ya lo usamos en el frontend)
- Agregar `is_furnished` y `featured_until` opcionales

---

### 8. MULTIMEDIA

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `photos` | `featured_image` + `gallery_image[]` | `property_images[]` | `imagen_principal` + `imagenes[]` | ⚠️ **MEJORAR** |
| `videos` | `videos[]` (detail API) | `videos[]` | `video_url` (solo uno) | ⚠️ **MEJORAR** |
| `virtual_tour` | `virtual_tour` (URL) | `virtual_tour` (URL) | `tour_virtual_url` | ✅ Tenemos |

**Recomendación**: 
- **Fotos**: Mantener estructura actual pero considerar tabla `property_photos` con `sort_order`
- **Videos**: Cambiar `video_url` a `videos[]` (array) o tabla `property_videos`
- **Tours**: Mantener `tour_virtual_url` o tabla `property_tours`

---

### 9. AGENTES Y PROPIETARIOS

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `agents` | `agents[]` (nombres) | ❌ | `agente_id` (solo uno) | ⚠️ **MEJORAR** |
| `owner` | ❌ | ❌ | `propietario_id` | ✅ Tenemos |

**Recomendación**: 
- Mantener `agente_id` para agente principal
- Considerar tabla `property_agents` para múltiples agentes con roles (`listing_agent`, `co_agent`)

---

### 10. AMENIDADES Y CARACTERÍSTICAS

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `amenities` | `amenities[]` (detail API) | `features[]` | `amenidades[]` (array) | ✅ Tenemos |
| `caracteristicas` | ❌ | ❌ | `caracteristicas` (JSON) | ✅ Tenemos |

**Recomendación**: Mantener estructura actual. Considerar tabla `property_amenities` para normalización.

---

### 11. INFORMACIÓN ADICIONAL

| Campo | Alterestate | EasyBroker | Nuestro Sistema | Estado |
|-------|-------------|------------|-----------------|--------|
| `share_commission` | `share_comision` (%) | ❌ | ❌ **FALTA** | ⚠️ Opcional |
| `notes` | ❌ | ❌ | `notas` | ✅ Tenemos |
| `created_at` | ❌ | `created_at` | `created_at` | ✅ Tenemos |
| `updated_at` | ❌ | `updated_at` | `updated_at` | ✅ Tenemos |

**Recomendación**: Agregar `share_commission` opcional.

---

## 📊 Resumen de Campos

### ✅ Campos que ya tenemos (compatibles)
- `id`, `tenant_id`, `slug`, `titulo`, `descripcion`
- `tipo`, `operacion`, `precio`, `moneda`
- `pais`, `provincia`, `ciudad`, `sector`, `zona`, `direccion`, `latitud`, `longitud`, `mostrar_ubicacion_exacta`
- `habitaciones`, `banos`, `medios_banos`, `estacionamientos`
- `m2_construccion`, `m2_terreno`, `antiguedad`, `pisos`
- `imagen_principal`, `imagenes[]`, `video_url`, `tour_virtual_url`
- `estado_propiedad`, `destacada`, `exclusiva`
- `agente_id`, `propietario_id`
- `amenidades[]`, `caracteristicas` (JSON)
- `notas`, `activo`, `created_at`, `updated_at`

### ⚠️ Campos que necesitamos agregar (críticos)
1. **`external_id`** (VARCHAR 50) - ID del CRM externo
2. **`external_source`** (VARCHAR 50) - `'alterestate'`, `'easybroker'`, `'manual'`
3. **`external_url`** (TEXT) - URL directa al CRM externo
4. **`precio_venta`** (DECIMAL) - Separar de `precio`
5. **`precio_alquiler`** (DECIMAL) - Nuevo campo
6. **`is_project`** (BOOLEAN) - Ya lo usamos en frontend
7. **`zona`** (VARCHAR 150) - Nuevo campo para zona específica
8. **`mostrar_ubicacion_exacta`** (BOOLEAN) - Control de privacidad GPS

### ⚠️ Campos opcionales (recomendados)
1. **`short_description`** (TEXT) - Descripción corta
2. **`slug_translations`** (JSONB) - Traducciones de slug
3. **`maintenance`** (DECIMAL) - Mantenimiento mensual
4. **`floor_level`** (INTEGER) - Piso donde está la propiedad
5. **`year_built`** (INTEGER) - Año de construcción
6. **`condition`** (INTEGER 1-10) - Estado de la propiedad
7. **`is_furnished`** (BOOLEAN) - Amueblada
8. **`featured_until`** (TIMESTAMP) - Hasta cuándo destacar
9. **`share_commission`** (DECIMAL 5,2) - Porcentaje de comisión compartida

---

## 🗄️ Propuesta de Estructura de Base de Datos

### Tabla Principal: `propiedades`

```sql
CREATE TABLE propiedades (
  -- IDs
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,
  codigo VARCHAR(50), -- internal_code (p000XXX)
  
  -- IDs Externos (NUEVOS)
  external_id VARCHAR(50), -- CID de Alterestate, public_id de EasyBroker
  external_source VARCHAR(50), -- 'alterestate', 'easybroker', 'manual'
  external_url TEXT, -- URL directa al CRM externo
  
  -- Información Básica
  titulo VARCHAR(500) NOT NULL,
  descripcion TEXT,
  short_description TEXT, -- NUEVO (opcional)
  slug_translations JSONB DEFAULT '{}', -- NUEVO (opcional)
  
  -- Precios y Operación
  precio_venta DECIMAL(15, 2), -- RENOMBRAR desde 'precio'
  precio_alquiler DECIMAL(15, 2), -- NUEVO
  precio_anterior DECIMAL(15, 2), -- Ya existe
  maintenance DECIMAL(15, 2), -- NUEVO (opcional)
  moneda VARCHAR(3) DEFAULT 'USD',
  operacion VARCHAR(50), -- 'venta', 'alquiler', 'venta-alquiler'
  
  -- Tipo
  tipo VARCHAR(50), -- apartamento, casa, villa, terreno, etc.
  
  -- Características Físicas
  habitaciones INTEGER, -- Cambiado de 'recamaras'
  banos INTEGER,
  medios_banos DECIMAL(3, 1),
  estacionamientos INTEGER,
  m2_construccion DECIMAL(10, 2),
  m2_terreno DECIMAL(10, 2),
  floor_level INTEGER, -- NUEVO (opcional)
  building_floors INTEGER, -- Ya existe como 'pisos'
  year_built INTEGER, -- NUEVO (opcional)
  antiguedad INTEGER, -- Mantener para compatibilidad
  condition INTEGER, -- NUEVO (opcional, 1-10)
  
  -- Ubicación (Jerarquía: país/provincia/ciudad/sector/zona)
  pais VARCHAR(100),
  provincia VARCHAR(100),
  ciudad VARCHAR(100),
  sector VARCHAR(255),
  zona VARCHAR(150),
  direccion TEXT, -- Dirección escrita completa (puede obtenerse desde Google)
  codigo_postal VARCHAR(20),
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  mostrar_ubicacion_exacta BOOLEAN DEFAULT true, -- Control de privacidad
  
  -- Estado y Flags
  estado_propiedad VARCHAR(50), -- 'publicado', 'vendido', 'alquilado', etc.
  is_project BOOLEAN DEFAULT false, -- NUEVO
  is_featured BOOLEAN DEFAULT false, -- Ya existe como 'destacada'
  is_exclusive BOOLEAN DEFAULT false, -- Ya existe como 'exclusiva'
  is_furnished BOOLEAN DEFAULT false, -- NUEVO (opcional)
  featured_until TIMESTAMP, -- NUEVO (opcional)
  
  -- Multimedia (URLs principales)
  imagen_principal TEXT,
  imagenes JSONB DEFAULT '[]', -- Array de URLs
  video_url TEXT, -- Mantener para compatibilidad
  tour_virtual_url TEXT,
  
  -- Relaciones
  agente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  propietario_id UUID REFERENCES contactos(id) ON DELETE SET NULL,
  
  -- Información Adicional
  amenidades JSONB DEFAULT '[]', -- Array de strings
  caracteristicas JSONB DEFAULT '{}', -- Objeto flexible
  share_commission DECIMAL(5, 2), -- NUEVO (opcional)
  notas TEXT,
  
  -- Control
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT idx_propiedades_tenant_slug UNIQUE (tenant_id, slug),
  CONSTRAINT idx_propiedades_external UNIQUE (tenant_id, external_source, external_id)
);

  -- Índices adicionales
CREATE INDEX idx_propiedades_tenant ON propiedades(tenant_id);
CREATE INDEX idx_propiedades_tipo ON propiedades(tipo);
CREATE INDEX idx_propiedades_operacion ON propiedades(operacion);
CREATE INDEX idx_propiedades_estado ON propiedades(estado_propiedad);
CREATE INDEX idx_propiedades_external_source ON propiedades(external_source);
CREATE INDEX idx_propiedades_external_id ON propiedades(external_id);
CREATE INDEX idx_propiedades_provincia ON propiedades(provincia);
CREATE INDEX idx_propiedades_ciudad ON propiedades(ciudad);
CREATE INDEX idx_propiedades_sector ON propiedades(sector);
CREATE INDEX idx_propiedades_location ON propiedades(provincia, ciudad, sector);
CREATE INDEX idx_propiedades_is_project ON propiedades(is_project);
CREATE INDEX idx_propiedades_is_featured ON propiedades(is_featured);
```

### Tablas Relacionadas (Recomendadas)

#### `property_photos` (Para mejor gestión de fotos)
```sql
CREATE TABLE property_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  caption TEXT,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, url)
);
```

#### `property_videos` (Para múltiples videos)
```sql
CREATE TABLE property_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  platform VARCHAR(50), -- 'youtube', 'vimeo', 'custom'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `property_agents` (Para múltiples agentes)
```sql
CREATE TABLE property_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'listing_agent', -- 'listing_agent', 'co_agent'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, agent_id)
);
```

---

## 🔄 Estrategia de Migración

### Fase 1: Campos Críticos (Sin Breaking Changes)
1. Agregar `external_id`, `external_source`, `external_url` (NULL permitido)
2. Agregar `precio_alquiler` (NULL permitido)
3. Agregar `is_project` (default false)
4. Agregar `zona` y `mostrar_ubicacion_exacta` (NULL permitido para zona, default true para mostrar)

**Nota**: La estructura de ubicación ya está implementada correctamente con `pais/provincia/ciudad/sector/zona` desde la migración base.

### Fase 3: Campos Opcionales
1. Agregar campos opcionales según necesidad
2. Crear tablas relacionadas (`property_photos`, `property_videos`, etc.)

---

## 📝 Notas de Compatibilidad

### Mapeo de Operaciones
- Alterestate: `'Venta'` → `'venta'`, `'Alquiler'` → `'alquiler'`, `'Venta, Alquiler'` → `'venta-alquiler'`
- EasyBroker: `operations[].type === 'sale'` → `'venta'`, `'rental'` → `'alquiler'`, ambos → `'venta-alquiler'`
- Nuestro sistema: Mantener `'venta'`, `'alquiler'`, agregar `'venta-alquiler'`

### Mapeo de Estados
- Alterestate: `'active'` → `'publicado'`, `'sold'` → `'vendido'`, `'rented'` → `'alquilado'`, `'inactive'` → `'borrador'`
- EasyBroker: `'available'` → `'publicado'`, `'sold'` → `'vendido'`, `'rented'` → `'alquilado'`, `'unavailable'` → `'no_disponible'`
- Nuestro sistema: Normalizar a: `'publicado'`, `'vendido'`, `'alquilado'`, `'reservado'`, `'borrador'`, `'inactivo'`

### Mapeo de Tipos
- Ver tabla de mapeo en sección 4
- Usar función de normalización en el importador

---

## ✅ Conclusión

**Campos críticos a agregar**: 8 campos
**Campos opcionales recomendados**: 9 campos
**Tablas relacionadas recomendadas**: 3 tablas

**Prioridad**:
1. **Alta**: `external_id`, `external_source`, `external_url`, `precio_alquiler`, `is_project`, `zona`, `mostrar_ubicacion_exacta`
2. **Media**: `short_description`, `floor_level`, `year_built`, `is_furnished`
3. **Baja**: `maintenance`, `condition`, `featured_until`, `share_commission`, `slug_translations`

**Cambios implementados**:
- ✅ `recamaras` → `habitaciones` (cambio de nombre)
- ✅ Estructura de ubicación: `pais/provincia/ciudad/sector/zona` (jerarquía completa)
- ✅ `direccion` como TEXT (para direcciones completas desde Google)
- ✅ `mostrar_ubicacion_exacta` (control de privacidad GPS)

**Compatibilidad**: ✅ 100% compatible con Alterestate y EasyBroker después de la migración.

