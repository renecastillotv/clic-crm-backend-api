# 🏗️ Nuevo Sistema de Gestión de Páginas y Componentes

## 📋 Resumen Ejecutivo

Este documento describe la nueva arquitectura del sistema de páginas y componentes para el platform SaaS de inmobiliarias. El sistema resuelve los problemas de:
- Mezcla de páginas del sistema vs personalizadas
- Pérdida de configuración al cambiar variantes
- Falta de control de visibilidad por plan
- Ausencia de catálogo de componentes

## 🗂️ Nueva Arquitectura de Base de Datos

### 1. **componentes_catalogo** (Nueva)
**Propósito**: Catálogo master de todos los componentes del sistema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| codigo | VARCHAR(100) | Código único (ej: header, hero) |
| nombre | VARCHAR(200) | Nombre legible |
| categoria | VARCHAR(50) | layout / content / forms / media |
| descripcion | TEXT | Descripción del componente |
| variantes | JSONB | Array de variantes disponibles |
| schema_config | JSONB | Schema de configuración (campos que acepta) |
| plan_minimo | VARCHAR(20) | basic / pro / premium / enterprise |
| feature_requerido | VARCHAR(100) | Feature opcional requerido |
| es_sistema | BOOLEAN | Si es componente del sistema |
| activo | BOOLEAN | Si está activo |
| orden | INTEGER | Orden de visualización |
| icono | VARCHAR(50) | Icono para UI |
| tags | JSONB | Tags para búsqueda |

**Ejemplo de registro**:
```json
{
  "codigo": "header",
  "nombre": "Header",
  "categoria": "layout",
  "variantes": [
    {"codigo": "default", "nombre": "Estándar"},
    {"codigo": "transparent", "nombre": "Transparente"}
  ],
  "schema_config": {
    "campos": [
      {"nombre": "logo_url", "tipo": "text", "requerido": false},
      {"nombre": "mostrar_busqueda", "tipo": "boolean", "default": false}
    ]
  },
  "plan_minimo": null,
  "es_sistema": true
}
```

---

### 2. **tenant_paginas_activas** (Nueva)
**Propósito**: Control de qué páginas están activas y visibles para cada tenant

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK a tenants |
| tipo_pagina | VARCHAR(50) | FK a tipos_pagina.codigo |
| is_visible | BOOLEAN | Visible según plan/features |
| is_enabled | BOOLEAN | Usuario activó esta página |
| variante_activa | VARCHAR(50) | Variante actualmente activa |
| configuracion_variantes | JSONB | Config guardada por variante |
| last_activated_at | TIMESTAMP | Última activación |

**Unique**: (tenant_id, tipo_pagina)

**Flujo de uso**:
1. Tenant crea homepage → se crea registro con `is_enabled=true`, `variante_activa='default'`
2. Usuario cambia a variant1 → se actualiza `variante_activa='variant1'`, se guarda config previa en `configuracion_variantes`
3. Usuario vuelve a default → se recupera config desde `configuracion_variantes.default`

---

### 3. **paginas_variantes_config** (Nueva)
**Propósito**: Historial completo de configuraciones por variante

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| pagina_id | UUID | FK a paginas_web |
| variante | VARCHAR(50) | Código de variante |
| componentes_activos | JSONB | Array de códigos de componentes |
| configuracion_componentes | JSONB | Config por componente |
| hereda_de_variante | VARCHAR(50) | Variante padre para herencia |
| campos_heredados | JSONB | Campos que se heredan |
| last_used_at | TIMESTAMP | Última vez activada |

**Unique**: (pagina_id, variante)

**Ejemplo de herencia**:
```json
{
  "pagina_id": "xxx",
  "variante": "variant2",
  "componentes_activos": ["header", "hero", "footer"],
  "configuracion_componentes": {
    "hero": {"titulo": "Nuevo Título"}  // Solo lo que cambia
  },
  "hereda_de_variante": "default",  // Hereda resto de "default"
  "campos_heredados": ["header", "footer"]
}
```

---

### 4. **tenant_componentes_disponibles** (Nueva)
**Propósito**: Control de qué componentes puede usar cada tenant

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK a tenants |
| componente_catalogo_id | UUID | FK a componentes_catalogo |
| is_visible | BOOLEAN | Visible según plan |
| is_enabled | BOOLEAN | Usuario puede usarlo |

**Unique**: (tenant_id, componente_catalogo_id)

**Lógica de visibilidad**:
- Plan basic: Solo componentes sin `plan_minimo` o `plan_minimo='basic'`
- Plan pro: Los anteriores + `plan_minimo='pro'`
- Plan premium: Los anteriores + `plan_minimo='premium'`
- Plan enterprise: Todos

---

### 5. **tipos_pagina** (Extendida)
**Campos nuevos agregados**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| categoria | VARCHAR(20) | sistema / estandar / premium |
| plan_minimo | VARCHAR(20) | Plan mínimo requerido |
| is_visible_default | BOOLEAN | Si es visible por defecto |

**Clasificación**:
- `sistema`: Homepage, Contacto, Propiedades (no se pueden eliminar)
- `estandar`: Blog, Videos, Testimonios (disponibles para todos)
- `premium`: Landing projects, Multi-nivel (solo planes altos)

---

### 6. **paginas_web** (Extendida)
**Campos nuevos agregados**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| origen | VARCHAR(20) | sistema / custom |
| pagina_padre_id | UUID | Para herencia de config |

**Clasificación automática**:
- `origen='sistema'`: Páginas estándar del sistema
- `origen='custom'`: Páginas creadas por el usuario (/mis-servicios, /conoce-mas, etc.)

---

## 🔄 Flujos de Trabajo

### Flujo 1: Tenant Nuevo se Registra

```
1. Se crea tenant con plan='basic'
2. Trigger/Migration crea registros en tenant_paginas_activas
   - Homepage: is_visible=true, is_enabled=false
   - Contacto: is_visible=true, is_enabled=false
   - Propiedades: is_visible=true, is_enabled=false
   - Blog: is_visible=true, is_enabled=false
   - Videos: is_visible=false (requiere plan pro)
3. Trigger/Migration crea registros en tenant_componentes_disponibles
   - Header, Footer, Hero, etc: is_visible=true
   - Video Gallery: is_visible=false (requiere plan pro)
```

### Flujo 2: Usuario Crea Homepage

```
1. GET /api/tenants/:id/paginas-disponibles
   → Retorna tipos de página visibles según plan
2. POST /api/tenants/:id/paginas
   {
     "tipo_pagina": "homepage",
     "variante": "default",
     "titulo": "Inicio",
     "slug": "/"
   }
3. Backend crea:
   a) Registro en paginas_web con origen='sistema'
   b) Actualiza tenant_paginas_activas.is_enabled=true
   c) Crea registro en paginas_variantes_config
```

### Flujo 3: Usuario Cambia de Variante

```
1. Usuario tiene homepage con variant='default' configurado
2. PUT /api/paginas/:id/variante
   {
     "variante": "centered"
   }
3. Backend:
   a) Guarda config actual en tenant_paginas_activas.configuracion_variantes.default
   b) Busca config previa de 'centered' en paginas_variantes_config
   c) Si existe: la carga
   d) Si no existe: crea nueva con herencia de 'default'
   e) Actualiza tenant_paginas_activas.variante_activa='centered'
4. Usuario configura 'centered', luego vuelve a 'default'
   → Se recupera la config original sin pérdida
```

### Flujo 4: Tenant Upgradea su Plan

```
1. Tenant pasa de 'basic' a 'pro'
2. Trigger actualiza tenant_componentes_disponibles:
   - video_gallery.is_visible = true
   - search_box (advanced).is_visible = true
3. Trigger actualiza tenant_paginas_activas:
   - videos.is_visible = true
4. Frontend muestra nuevas páginas y componentes disponibles
```

### Flujo 5: Usuario Crea Página Custom

```
1. POST /api/tenants/:id/paginas-custom
   {
     "titulo": "Mis Servicios Especiales",
     "slug": "mis-servicios",
     "componentes": ["header", "hero", "footer"]
   }
2. Backend crea:
   a) Registro en paginas_web con:
      - tipo_pagina='custom'
      - origen='custom'
   b) Registro en paginas_variantes_config con config inicial
3. Página aparece en tab "Rutas Personalizadas" del CRM
```

---

## 📊 Queries Comunes

### Listar páginas disponibles para un tenant
```sql
SELECT
  tp.codigo,
  tp.nombre,
  tpa.is_visible,
  tpa.is_enabled,
  tpa.variante_activa
FROM tipos_pagina tp
LEFT JOIN tenant_paginas_activas tpa ON tpa.tipo_pagina = tp.codigo AND tpa.tenant_id = $1
WHERE tpa.is_visible = true
ORDER BY tp.orden;
```

### Listar componentes disponibles para un tenant
```sql
SELECT
  cc.codigo,
  cc.nombre,
  cc.categoria,
  cc.variantes,
  tcd.is_visible,
  tcd.is_enabled
FROM componentes_catalogo cc
INNER JOIN tenant_componentes_disponibles tcd ON tcd.componente_catalogo_id = cc.id
WHERE tcd.tenant_id = $1 AND tcd.is_visible = true
ORDER BY cc.categoria, cc.orden;
```

### Obtener config de una página con variante
```sql
SELECT
  pw.*,
  pvc.componentes_activos,
  pvc.configuracion_componentes,
  pvc.hereda_de_variante
FROM paginas_web pw
LEFT JOIN paginas_variantes_config pvc ON pvc.pagina_id = pw.id AND pvc.variante = pw.variante
WHERE pw.id = $1;
```

### Separar páginas estándar vs custom
```sql
-- Páginas estándar
SELECT * FROM paginas_web WHERE origen = 'sistema' AND tenant_id = $1;

-- Páginas custom
SELECT * FROM paginas_web WHERE origen = 'custom' AND tenant_id = $1;
```

---

## 🎯 Beneficios del Nuevo Sistema

### ✅ Separación Clara
- **Antes**: Todo mezclado en `paginas_web`, difícil saber qué es del sistema
- **Ahora**: Campo `origen` + tabs separados en CRM

### ✅ Sin Pérdida de Configuración
- **Antes**: Cambias de variante → pierdes config anterior
- **Ahora**: Config guardada en `configuracion_variantes`, recuperable al volver

### ✅ Control de Planes
- **Antes**: No podías ocultar páginas según plan
- **Ahora**: `tenant_paginas_activas.is_visible` basado en plan

### ✅ Catálogo de Componentes
- **Antes**: No sabías qué componentes existen o qué campos aceptan
- **Ahora**: `componentes_catalogo` con schemas completos

### ✅ Herencia entre Variantes
- **Antes**: No existía
- **Ahora**: `hereda_de_variante` permite heredar config base

### ✅ Visibilidad de Páginas Inactivas
- **Antes**: Páginas desactivadas igual aparecían en listados
- **Ahora**: `is_enabled=false` permite filtrar fácilmente

---

## 🚀 Plan de Implementación

### ✅ Fase 1: Migraciones (COMPLETADO)
- [x] Crear `componentes_catalogo` con 13 componentes base
- [x] Extender `tipos_pagina` con categoria, plan_minimo
- [x] Extender `paginas_web` con origen, pagina_padre_id
- [x] Crear `tenant_paginas_activas`
- [x] Crear `paginas_variantes_config`
- [x] Crear `tenant_componentes_disponibles`
- [x] Migrar datos existentes

### 🔄 Fase 2: Servicios Backend (EN PROGRESO)
- [ ] Crear `ComponentesCatalogoService`
- [ ] Crear `TenantPaginasService` (con lógica de visibilidad)
- [ ] Crear `PaginasVariantesService` (con lógica de herencia)
- [ ] Actualizar endpoints de API

### 📝 Fase 3: CRM Frontend (PENDIENTE)
- [ ] Actualizar `CrmWebPaginas` para usar nuevo sistema
- [ ] Crear vista de catálogo de componentes
- [ ] Agregar selector de variantes con preview
- [ ] Implementar herencia visual entre variantes

### 🌐 Fase 4: API Pública + Frontend Web (PENDIENTE)
- [ ] Actualizar routeResolver para usar nuevas tablas
- [ ] Actualizar componentes Astro para leer de variantes_config
- [ ] Testing de rutas y renderizado

---

## 📝 Notas Técnicas

### Compatibilidad Retroactiva
- Las migraciones automáticamente clasifican páginas existentes
- APIs antiguas siguen funcionando mientras se migra el CRM
- Campo `contenido` de `paginas_web` se mantiene como fallback

### Performance
- Índices creados en todas las FK y campos de filtro
- Queries optimizados con JOINs sobre primary keys
- JSONB indexable para búsquedas en configuraciones

### Seguridad
- Validación de `plan_minimo` en backend antes de permitir uso
- `es_sistema` evita eliminación accidental de componentes core
- `protegida` en `tipos_pagina` evita eliminación de páginas críticas

---

## 🤝 Equipo y Mantenimiento

**Creado por**: Claude AI + Rene Castillo
**Fecha**: Diciembre 2025
**Versión del Sistema**: 2.0.0

**Contacto para dudas**: [Agregar contacto del equipo]

---

*Este documento es un living document y se actualizará conforme el sistema evolucione.*
