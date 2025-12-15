# Diseño: CRM Sitio Web - Compatible con Arquitectura 073-077

## 🎯 Objetivo

Refactorizar el CRM `/crm/clic/sitio-web` para que sea:
1. **Compatible** con la nueva arquitectura (migraciones 073-077)
2. **Fácil** - UX intuitivo para administrar páginas
3. **Ágil** - Respuestas rápidas, sin recargas innecesarias
4. **Robusto** - Manejo de errores, validaciones
5. **Elegante** - UI moderna y profesional

---

## 📐 Arquitectura Nueva (Post-Refactorización)

### Tablas Core

```
tipos_pagina
├─ id (UUID)
├─ codigo (string) - 'homepage', 'propiedades', etc.
├─ nombre (string)
└─ categoria (string)

paginas_web
├─ id (UUID)
├─ tenant_id (UUID)
├─ tipo_pagina_id (UUID FK → tipos_pagina.id) ✅ NUEVO
├─ slug (string)
├─ titulo (string)
├─ activa (boolean)
└─ inherit_from_type (boolean) ✅ NUEVO

componentes_web
├─ id (UUID)
├─ tenant_id (UUID)
├─ tipo (string) - 'hero', 'header', 'footer'
├─ variante (string) - 'default', 'modern', 'elegant'
├─ default_data (JSONB) ✅ NUEVO - Datos de ejemplo/catálogo
├─ scope ('tenant' | 'page_type' | 'page')
└─ activo (boolean)

paginas_componentes (junction)
├─ id (UUID)
├─ pagina_id (UUID FK → paginas_web.id)
├─ componente_id (UUID FK → componentes_web.id)
├─ orden (integer)
├─ config_override (JSONB) ✅ NUEVO - Override de datos específicos
└─ activo (boolean) ✅ NUEVO - Para soft delete de variantes
```

---

## 🔄 Flujos del CRM

### Flujo 1: Listar Páginas

**Endpoint**: `GET /api/tenants/:tenantId/paginas`

**Response**:
```typescript
{
  paginas: [
    {
      id: 'uuid',
      tipo_pagina: { codigo: 'homepage', nombre: 'Inicio' },
      slug: '/',
      titulo: 'Inicio',
      activa: true,
      inherit_from_type: true,
      componentes_count: 5
    },
    ...
  ]
}
```

**UI**:
- Tabla con columnas: Nombre, Tipo, Slug, Componentes, Estado, Acciones
- Filtro por tipo de página
- Búsqueda por nombre/slug
- Acción "Editar" → Va al Flujo 2

---

### Flujo 2: Editar Página (Seleccionar Componentes)

**Ruta CRM**: `/crm/:tenant/sitio-web/paginas/:paginaId`

**Endpoint**: `GET /api/tenants/:tenantId/paginas/:paginaId/editor`

**Response**:
```typescript
{
  pagina: {
    id: 'uuid',
    titulo: 'Inicio',
    tipo_pagina: { codigo: 'homepage', nombre: 'Inicio' },
    inherit_from_type: true
  },

  // Componentes ACTUALMENTE asignados a esta página
  componentes_asignados: [
    {
      id: 'comp-1',
      tipo: 'header',
      variante: 'default',
      orden: 1,
      activo: true, // ✅ Para soft delete
      default_data: { logo: '...', links: [...] },
      config_override: { logo: 'custom-logo.png' } // Solo los campos customizados
    },
    {
      id: 'comp-2',
      tipo: 'hero',
      variante: 'modern',
      orden: 2,
      activo: true,
      default_data: { titulo: '...', subtitulo: '...' },
      config_override: { titulo: 'Título custom' }
    },
    ...
  ],

  // Componentes DISPONIBLES del catálogo (para agregar nuevos)
  componentes_disponibles: [
    {
      tipo: 'hero',
      variantes: ['default', 'modern', 'elegant'],
      categoria: 'Hero Sections'
    },
    {
      tipo: 'features',
      variantes: ['default', 'grid', 'list'],
      categoria: 'Features'
    },
    ...
  ]
}
```

**UI - Vista de Editor**:

```
┌─────────────────────────────────────────────────────────────────┐
│  📄 Editar Página: Inicio (homepage)                            │
│                                                        [Guardar]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Componentes Activos (5)                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1. header/default               [↑] [↓] [✎] [👁] [🗑]      │ │
│  │     ↳ Logo: custom-logo.png (customizado)                  │ │
│  │                                                              │ │
│  │  2. hero/modern                  [↑] [↓] [✎] [👁] [🗑]      │ │
│  │     ↳ Título: "Título custom" (customizado)                │ │
│  │                                                              │ │
│  │  3. features/grid                [↑] [↓] [✎] [👁] [🗑]      │ │
│  │     ↳ Usando datos default                                  │ │
│  │                                                              │ │
│  │  4. testimonials/carousel        [↑] [↓] [✎] [👁] [🗑]      │ │
│  │     ↳ Usando datos default                                  │ │
│  │                                                              │ │
│  │  5. footer/default               [↑] [↓] [✎] [👁] [🗑]      │ │
│  │     ↳ Teléfono: "+1..." (customizado)                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [+ Agregar Componente]                                          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Componentes Disponibles (Mostrar al hacer click en "Agregar")  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Hero Sections                                              │ │
│  │    • hero/default        [+]                                │ │
│  │    • hero/modern         [+]                                │ │
│  │    • hero/elegant        [+]                                │ │
│  │                                                              │ │
│  │  Features                                                    │ │
│  │    • features/default    [+]                                │ │
│  │    • features/grid       [+]  (Ya en uso)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Acciones UI**:
1. **[↑] [↓]** - Reordenar componentes (actualizar `orden`)
2. **[✎]** - Editar datos → Abre Flujo 3 (modal de configuración)
3. **[👁]** - Toggle activo/inactivo (soft delete) → Actualiza `activo`
4. **[🗑]** - Eliminar componente de la página → Borra registro en `paginas_componentes`
5. **[+ Agregar]** - Agregar componente nuevo → Inserta en `paginas_componentes`

---

### Flujo 3: Configurar Datos de Componente

**Ruta CRM**: Modal dentro del editor

**Endpoint**: `PATCH /api/tenants/:tenantId/paginas/:paginaId/componentes/:componenteId`

**Request**:
```typescript
{
  config_override: {
    titulo: "Nuevo título custom",
    subtitulo: "Nuevo subtítulo",
    imagenFondo: "https://..."
  }
}
```

**UI - Modal de Configuración**:

```
┌──────────────────────────────────────────────────────────┐
│  Configurar: hero/modern                        [X]       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  📋 Datos del Componente                                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Título *                                            │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │ Encuentra tu hogar ideal                      │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  │  📌 Default: "Encuentra tu hogar ideal"            │ │
│  │                                                     │ │
│  │  Subtítulo                                          │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │ Miles de propiedades...                       │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  │  📌 Default: "Miles de propiedades te esperan"    │ │
│  │                                                     │ │
│  │  Imagen de Fondo                                    │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │ https://unsplash.com/photo-123               │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  │  [📁 Subir Imagen]                                 │ │
│  │                                                     │ │
│  │  ✅ Mostrar Badge                                  │ │
│  │  ✅ Mostrar Estadísticas                           │ │
│  │                                                     │ │
│  │  [🔄 Restaurar Defaults]                           │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  💡 Solo los campos modificados se guardan en            │
│     config_override. Los demás usan default_data.        │
│                                                           │
│            [Cancelar]                    [Guardar]       │
└──────────────────────────────────────────────────────────┘
```

**Lógica**:
- Mostrar `default_data` como placeholder/hint
- Guardar SOLO campos modificados en `config_override`
- Botón "Restaurar Defaults" limpia `config_override`

---

### Flujo 4: Cambiar Variante de Componente

**Escenario**: Usuario tiene `hero/default` y quiere cambiarlo a `hero/modern`

**Opción A - Reemplazar**:
1. Buscar componente `hero/modern` en `componentes_web` (o crear si no existe)
2. Actualizar `paginas_componentes.componente_id` al nuevo ID
3. **Preservar `config_override`** si campos son compatibles
4. Marcar componente antiguo como `activo=false` (soft delete)

**Opción B - Agregar Nuevo**:
1. Insertar nuevo registro en `paginas_componentes`
2. Copiar `config_override` compatible del anterior
3. Mantener ambos (uno activo, otro inactivo)

**Endpoint**: `POST /api/tenants/:tenantId/paginas/:paginaId/componentes/:componenteId/cambiar-variante`

**Request**:
```typescript
{
  nueva_variante: 'modern',
  preservar_datos: true, // Copiar config_override compatible
  reemplazar: true // Si false, agrega nuevo sin eliminar anterior
}
```

**UI**:
```
Cambiar variante de hero/default

• hero/default (actual)     → hero/modern  ✓
                            → hero/elegant

Acción:
  ○ Reemplazar (mantiene datos compatibles)
  ○ Agregar como nuevo (crea nuevo sin eliminar)

          [Cancelar]    [Cambiar Variante]
```

---

### Flujo 5: Crear Página Personalizada

**Endpoint**: `POST /api/tenants/:tenantId/paginas`

**Request**:
```typescript
{
  tipo_pagina_id: 'uuid', // Seleccionar de tipos_pagina
  slug: '/mi-pagina',
  titulo: 'Mi Página Custom',
  activa: true,
  inherit_from_type: true, // Si true, hereda componentes del tipo

  // Opcional: componentes iniciales custom
  componentes: [
    { componente_id: 'uuid', orden: 1 },
    { componente_id: 'uuid', orden: 2 }
  ]
}
```

**UI**:
```
┌─────────────────────────────────────────────────────┐
│  Nueva Página Personalizada                 [X]     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Tipo de Página *                                    │
│  ┌────────────────────────────────────────────────┐ │
│  │ ▼ Página custom                                │ │
│  └────────────────────────────────────────────────┘ │
│     • homepage     • propiedades   • articulos      │
│     • custom       • landing-page  • promocion      │
│                                                      │
│  Título *                                            │
│  ┌────────────────────────────────────────────────┐ │
│  │ Mi Página Custom                                │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Slug (URL) *                                        │
│  ┌────────────────────────────────────────────────┐ │
│  │ /mi-pagina-custom                               │ │
│  └────────────────────────────────────────────────┘ │
│  🔗 https://tudominio.com/mi-pagina-custom          │
│                                                      │
│  ☑ Heredar componentes del tipo seleccionado        │
│                                                      │
│            [Cancelar]              [Crear Página]   │
└─────────────────────────────────────────────────────┘
```

---

## 🗂️ Estructura de Endpoints API

### Páginas

```
GET    /api/tenants/:tenantId/paginas
       → Listar todas las páginas del tenant

GET    /api/tenants/:tenantId/paginas/:paginaId
       → Detalle de una página

POST   /api/tenants/:tenantId/paginas
       → Crear página personalizada

PATCH  /api/tenants/:tenantId/paginas/:paginaId
       → Actualizar título, slug, activa, etc.

DELETE /api/tenants/:tenantId/paginas/:paginaId
       → Eliminar página (solo custom)

GET    /api/tenants/:tenantId/paginas/:paginaId/editor
       → Datos para el editor (componentes asignados + disponibles)
```

### Componentes de Página

```
GET    /api/tenants/:tenantId/paginas/:paginaId/componentes
       → Componentes asignados a esta página

POST   /api/tenants/:tenantId/paginas/:paginaId/componentes
       → Agregar componente a la página
       Body: { componente_id, orden }

PATCH  /api/tenants/:tenantId/paginas/:paginaId/componentes/:componenteId
       → Actualizar config_override o activo
       Body: { config_override: {...}, activo: true }

DELETE /api/tenants/:tenantId/paginas/:paginaId/componentes/:componenteId
       → Eliminar componente de la página

POST   /api/tenants/:tenantId/paginas/:paginaId/componentes/:componenteId/cambiar-variante
       → Cambiar variante del componente
       Body: { nueva_variante, preservar_datos, reemplazar }

POST   /api/tenants/:tenantId/paginas/:paginaId/componentes/reordenar
       → Actualizar orden de múltiples componentes
       Body: { componentes: [{ id, orden }] }
```

### Catálogo de Componentes

```
GET    /api/tenants/:tenantId/componentes/catalogo
       → Catálogo de componentes disponibles agrupados por tipo
       Response: {
         hero: { variantes: ['default', 'modern'], default_data_example: {...} },
         features: { variantes: ['default', 'grid'], default_data_example: {...} }
       }

GET    /api/componentes/:tipo/:variante/schema
       → Schema de campos del componente (para form dinámico)
       Response: {
         fields: [
           { key: 'titulo', type: 'text', label: 'Título', required: true },
           { key: 'subtitulo', type: 'textarea', label: 'Subtítulo' },
           ...
         ]
       }
```

---

## 🎨 Componentes React del CRM

### 1. **PaginasList.tsx** (Lista de páginas)
```typescript
export default function PaginasList() {
  const [paginas, setPaginas] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('all');

  // GET /api/tenants/:tenantId/paginas

  return (
    <div>
      <Table>
        <TableRow>
          <td>{pagina.titulo}</td>
          <td>{pagina.tipo_pagina.nombre}</td>
          <td><code>{pagina.slug}</code></td>
          <td>{pagina.componentes_count} componentes</td>
          <td><StatusBadge activa={pagina.activa} /></td>
          <td>
            <Button onClick={() => navigate(`/editar/${pagina.id}`)}>
              Editar
            </Button>
          </td>
        </TableRow>
      </Table>
    </div>
  );
}
```

### 2. **PaginaEditor.tsx** (Editor de componentes)
```typescript
export default function PaginaEditor({ paginaId }: Props) {
  const [componentes, setComponentes] = useState([]);
  const [disponibles, setDisponibles] = useState([]);

  // GET /api/tenants/:tenantId/paginas/:paginaId/editor

  const handleReorder = (componenteId, direction) => {
    // POST /api/.../componentes/reordenar
  };

  const handleToggleActivo = (componenteId) => {
    // PATCH /api/.../componentes/:id { activo: !activo }
  };

  const handleEliminar = (componenteId) => {
    // DELETE /api/.../componentes/:id
  };

  return (
    <div>
      <h1>Editar: {pagina.titulo}</h1>

      <ComponentesList
        componentes={componentes}
        onReorder={handleReorder}
        onEdit={handleEdit}
        onToggle={handleToggleActivo}
        onDelete={handleEliminar}
      />

      <Button onClick={() => setShowAgregarModal(true)}>
        + Agregar Componente
      </Button>

      <AgregarComponenteModal
        disponibles={disponibles}
        onAgregar={handleAgregar}
      />
    </div>
  );
}
```

### 3. **ComponenteConfigModal.tsx** (Configurar datos)
```typescript
export default function ComponenteConfigModal({
  componente,
  onSave
}: Props) {
  const [schema, setSchema] = useState([]);
  const [formData, setFormData] = useState({});

  // GET /api/componentes/:tipo/:variante/schema
  // Poblar formData con default_data + config_override

  const handleSave = async () => {
    // PATCH /api/.../componentes/:id
    // Body: { config_override: formData }
  };

  return (
    <Modal>
      <h2>Configurar {componente.tipo}/{componente.variante}</h2>

      <DynamicForm
        schema={schema}
        defaultData={componente.default_data}
        values={formData}
        onChange={setFormData}
      />

      <Button onClick={handleRestaurar}>
        Restaurar Defaults
      </Button>

      <Button onClick={handleSave}>
        Guardar
      </Button>
    </Modal>
  );
}
```

---

## 📝 Servicios API (Backend)

### `packages/api/src/routes/crm/paginas.ts`

```typescript
import { Router } from 'express';
import { getPaginasService, getPaginaEditorService, ... } from '../../services/crm/paginasService';

const router = Router();

// GET /api/tenants/:tenantId/paginas
router.get('/:tenantId/paginas', async (req, res) => {
  const paginas = await getPaginasService(req.params.tenantId);
  res.json({ paginas });
});

// GET /api/tenants/:tenantId/paginas/:paginaId/editor
router.get('/:tenantId/paginas/:paginaId/editor', async (req, res) => {
  const data = await getPaginaEditorService(
    req.params.tenantId,
    req.params.paginaId
  );
  res.json(data);
});

// PATCH /api/tenants/:tenantId/paginas/:paginaId/componentes/:componenteId
router.patch('/:tenantId/paginas/:paginaId/componentes/:componenteId', async (req, res) => {
  const updated = await updateComponenteConfigService(
    req.params.componenteId,
    req.body.config_override,
    req.body.activo
  );
  res.json({ componente: updated });
});

export default router;
```

### `packages/api/src/services/crm/paginasService.ts`

```typescript
import { query } from '../../utils/db';

export async function getPaginaEditorService(
  tenantId: string,
  paginaId: string
) {
  // 1. Obtener página
  const pagina = await query(`
    SELECT pw.*, tp.codigo as tipo_codigo, tp.nombre as tipo_nombre
    FROM paginas_web pw
    JOIN tipos_pagina tp ON tp.id = pw.tipo_pagina_id
    WHERE pw.id = $1 AND pw.tenant_id = $2
  `, [paginaId, tenantId]);

  // 2. Obtener componentes asignados (con merge de default_data + config_override)
  const componentesAsignados = await query(`
    SELECT
      pc.id as relacion_id,
      pc.orden,
      pc.activo,
      pc.config_override,
      c.id as componente_id,
      c.tipo,
      c.variante,
      c.default_data
    FROM paginas_componentes pc
    JOIN componentes_web c ON c.id = pc.componente_id
    WHERE pc.pagina_id = $1
    ORDER BY pc.orden ASC
  `, [paginaId]);

  // 3. Obtener catálogo de componentes disponibles
  const catalogoComponentes = await query(`
    SELECT DISTINCT tipo, variante, default_data
    FROM componentes_web
    WHERE tenant_id = $1 OR tenant_id IS NULL
    ORDER BY tipo, variante
  `, [tenantId]);

  // Agrupar catálogo por tipo
  const disponibles = catalogoComponentes.rows.reduce((acc, c) => {
    if (!acc[c.tipo]) acc[c.tipo] = { variantes: [], default_data_example: {} };
    acc[c.tipo].variantes.push(c.variante);
    if (c.variante === 'default') {
      acc[c.tipo].default_data_example = c.default_data;
    }
    return acc;
  }, {});

  return {
    pagina: pagina.rows[0],
    componentes_asignados: componentesAsignados.rows.map(comp => ({
      ...comp,
      // Merge default_data con config_override
      datos_finales: {
        ...comp.default_data,
        ...(comp.config_override || {})
      }
    })),
    componentes_disponibles: disponibles
  };
}

export async function updateComponenteConfigService(
  componenteId: string,
  configOverride: any,
  activo?: boolean
) {
  const updates = [];
  const params = [componenteId];
  let paramIndex = 2;

  if (configOverride !== undefined) {
    updates.push(`config_override = $${paramIndex}`);
    params.push(JSON.stringify(configOverride));
    paramIndex++;
  }

  if (activo !== undefined) {
    updates.push(`activo = $${paramIndex}`);
    params.push(activo);
    paramIndex++;
  }

  const result = await query(`
    UPDATE paginas_componentes
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `, params);

  return result.rows[0];
}
```

---

## ✅ Checklist de Implementación

### Fase 1: Backend API ✓
- [ ] Crear `routes/crm/paginas.ts`
- [ ] Crear `services/crm/paginasService.ts`
- [ ] Implementar endpoint GET `/paginas`
- [ ] Implementar endpoint GET `/paginas/:id/editor`
- [ ] Implementar endpoint PATCH `/paginas/:id/componentes/:compId`
- [ ] Implementar endpoint POST `/paginas/:id/componentes/reordenar`
- [ ] Implementar endpoint POST `/paginas/:id/componentes/:compId/cambiar-variante`
- [ ] Implementar endpoint GET `/componentes/catalogo`

### Fase 2: Frontend - Lista de Páginas
- [ ] Crear `PaginasList.tsx`
- [ ] Integrar con API
- [ ] Agregar filtros y búsqueda
- [ ] Agregar botón "Nueva Página"

### Fase 3: Frontend - Editor de Página
- [ ] Crear `PaginaEditor.tsx`
- [ ] Implementar lista de componentes con drag & drop
- [ ] Implementar acciones (reordenar, toggle, eliminar)
- [ ] Agregar modal para agregar componentes

### Fase 4: Frontend - Configuración de Componentes
- [ ] Crear `ComponenteConfigModal.tsx`
- [ ] Crear `DynamicForm.tsx` (form basado en schema)
- [ ] Implementar preview de default_data
- [ ] Implementar guardado de config_override

### Fase 5: Frontend - Variantes
- [ ] Crear UI para cambiar variantes
- [ ] Implementar preview de variantes
- [ ] Implementar preservación de datos

### Fase 6: Testing & Pulido
- [ ] Crear tests para endpoints
- [ ] Validar flujos completos
- [ ] Optimizar performance
- [ ] Agregar loading states y error handling

---

## 🚀 Notas de Implementación

### Manejo de default_data + config_override

**En el backend**:
```typescript
// Al devolver componente al frontend
const datosFin ales = {
  ...componente.default_data,
  ...(componente.config_override || {})
};
```

**En el frontend**:
```typescript
// Al editar, solo guardar campos modificados
const camposModificados = {};
Object.keys(formData).forEach(key => {
  if (formData[key] !== componente.default_data[key]) {
    camposModificados[key] = formData[key];
  }
});

await api.patch(`/componentes/${id}`, {
  config_override: camposModificados
});
```

### Soft Delete de Variantes

Cuando usuario cambia de `hero/default` a `hero/modern`:

1. Desactivar el actual:
```sql
UPDATE paginas_componentes
SET activo = false
WHERE id = 'relacion-id-antiguo';
```

2. Crear/activar el nuevo:
```sql
INSERT INTO paginas_componentes (pagina_id, componente_id, orden, activo, config_override)
VALUES (?, ?, ?, true, ?)
ON CONFLICT (pagina_id, componente_id)
DO UPDATE SET activo = true;
```

### Performance

- Usar JOINs para evitar N+1 queries
- Cachear catálogo de componentes (no cambia frecuentemente)
- Usar WebSockets para preview en tiempo real (opcional)
- Lazy load componentes en el editor

---

Este diseño es **compatible 100% con la arquitectura refactorizada (073-077)** y proporciona una base sólida para implementar el CRM de forma elegante y robusta.
