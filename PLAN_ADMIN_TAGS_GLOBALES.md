# Plan: Administrador de Tags Globales

## Resumen

Crear una sección de administración en el panel de la plataforma para gestionar los tags globales del sistema. Los tags globales son aquellos con `tenant_id = NULL` y están disponibles para todos los tenants.

**Tabla**: `tags_global`

---

## 1. Esquema de la Tabla tags_global

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| id | UUID | gen_random_uuid() | Primary key |
| slug | VARCHAR(150) | NOT NULL | Identificador URL-friendly |
| tipo | VARCHAR(50) | NOT NULL | Categoría del tag |
| valor | VARCHAR(255) | - | Valor real para queries |
| campo_query | VARCHAR(100) | - | Campo de BD a filtrar |
| operador | VARCHAR(20) | '=' | Operador SQL |
| alias_idiomas | JSONB | '{}' | Aliases URL por idioma |
| nombre_idiomas | JSONB | '{}' | Nombres display por idioma |
| tenant_id | UUID | NULL | NULL = global |
| pais | VARCHAR(2) | 'DO' | Código país |
| orden | INTEGER | 0 | Orden de visualización |
| activo | BOOLEAN | true | Estado |
| created_at | TIMESTAMP | CURRENT_TIMESTAMP | - |
| updated_at | TIMESTAMP | CURRENT_TIMESTAMP | - |

---

## 2. Tipos de Tags

| Tipo | Propósito | Ejemplos | campo_query | operador |
|------|-----------|----------|-------------|----------|
| operacion | Transacciones | comprar→venta, alquilar→alquiler | operacion | = |
| tipo_propiedad | Tipo de inmueble | apartamento, casa, penthouse | tipo | = |
| filtro | Rangos numéricos | 1-habitacion, 2-banos | habitaciones, banos | >= |
| amenidad | Features | gym, piscina, terraza | amenidades | @> |

---

## 3. Implementación Backend

### A. Crear Servicio: adminTagsGlobalService.ts

**Ubicación**: `packages/api/src/services/adminTagsGlobalService.ts`

**Funciones:**
- `getTagsGlobal(filters)` - Listar tags (tenant_id IS NULL)
- `getTagGlobalById(id)` - Obtener tag por ID
- `createTagGlobal(data)` - Crear tag
- `updateTagGlobal(id, data)` - Actualizar tag
- `deleteTagGlobal(id)` - Eliminar tag
- `getTagsGlobalStats()` - Estadísticas
- `toggleTagGlobalStatus(id, activo)` - Activar/desactivar

### B. Agregar Rutas en admin.ts

**Endpoints:**
```
GET    /api/admin/tags-global              - Listar tags globales
GET    /api/admin/tags-global/stats        - Estadísticas
GET    /api/admin/tags-global/:id          - Obtener tag
POST   /api/admin/tags-global              - Crear tag
PUT    /api/admin/tags-global/:id          - Actualizar tag
DELETE /api/admin/tags-global/:id          - Eliminar tag
POST   /api/admin/tags-global/:id/toggle   - Activar/desactivar
```

---

## 4. Implementación Frontend

### A. Funciones API en api.ts

```typescript
interface TagGlobal {
  id: string;
  slug: string;
  tipo: string;
  valor: string;
  campo_query: string;
  operador: string;
  alias_idiomas: Record<string, string>;
  nombre_idiomas: Record<string, string>;
  pais: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// Funciones
getTagsGlobal(filters?)
getTagGlobalById(id)
createTagGlobal(data)
updateTagGlobal(id, data)
deleteTagGlobal(id)
toggleTagGlobalStatus(id, activo)
getTagsGlobalStats()
```

### B. Crear AdminTagsGlobal.tsx

**Estructura:**

1. **Header** - Título y botón "Nuevo Tag"

2. **Estadísticas** - Cards con totales por tipo

3. **Filtros** - Búsqueda, tipo, país, mostrar inactivos

4. **Vista de Tags** - Agrupados por tipo (acordeón)
   - Cada tag muestra: slug, valor, operador, idiomas, estado, acciones

5. **Modal Crear/Editar**
   - Tipo (select)
   - Slug (auto-generado, editable)
   - Valor
   - Campo Query
   - Operador (=, >=, <=, @>, ILIKE)
   - País (default DO)
   - Orden
   - Idiomas (ES, EN, FR, PT):
     - Alias URL (alias_idiomas)
     - Nombre display (nombre_idiomas)
   - Activo (checkbox)

### C. Registrar Rutas

- `App.tsx`: Agregar `<Route path="tags-global" element={<AdminTagsGlobal />} />`
- `AdminLayout.tsx`: Agregar entrada "Tags Global" en menú

---

## 5. Orden de Implementación

### Fase 1: Backend
1. Crear `adminTagsGlobalService.ts`
2. Agregar rutas en `admin.ts`

### Fase 2: Frontend
1. Agregar funciones API en `api.ts`
2. Agregar menú en `AdminLayout.tsx`
3. Agregar ruta en `App.tsx`
4. Crear `AdminTagsGlobal.tsx`

---

## 6. Archivos a Crear/Modificar

### Backend
| Archivo | Acción |
|---------|--------|
| `packages/api/src/services/adminTagsGlobalService.ts` | Crear |
| `packages/api/src/routes/admin.ts` | Modificar |

### Frontend
| Archivo | Acción |
|---------|--------|
| `apps/crm-frontend/src/services/api.ts` | Modificar |
| `apps/crm-frontend/src/pages/admin/AdminTagsGlobal.tsx` | Crear |
| `apps/crm-frontend/src/layouts/AdminLayout.tsx` | Modificar |
| `apps/crm-frontend/src/App.tsx` | Modificar |

---

## 7. Colores por Tipo de Tag

| Tipo | Color | Background |
|------|-------|------------|
| operacion | #DC2626 | #FEE2E2 |
| tipo_propiedad | #7C3AED | #EDE9FE |
| filtro | #2563EB | #DBEAFE |
| amenidad | #059669 | #D1FAE5 |
