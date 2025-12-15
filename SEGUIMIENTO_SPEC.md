# ESPECIFICACIÓN: Módulo Seguimiento (Actividades)

## Objetivo
Replicar exactamente la funcionalidad y visual de la página "Seguimiento" del CRM de referencia ubicado en:
`C:\Users\Rene Castillo\CLIC-PLATFORM\clic-platform-crm\src\app\crm\activities\page.tsx`

---

## 1. RENOMBRAR

### En el menú lateral (CrmLayout.tsx)
- Cambiar label de "Actividades" a **"Seguimiento"**
- Mantener la ruta como `/actividades` (no cambiar URL)
- Icono: Zap (rayo) - polyline points="22 12 18 12 15 21 9 3 6 12 2 12"

### En la página
- Título principal: **"Seguimiento"**
- Subtítulo: **"Gestiona tus actividades y agenda de forma rápida"**

---

## 2. ESTRUCTURA DE DATOS

### Interface CrmActivity (actualizar Actividad)
```typescript
interface Actividad {
  id: string;
  tenant_id: string;
  created_by?: string;           // Usuario que creó
  contacto_id?: string;          // Relacionado a contacto
  solicitud_id?: string;         // Relacionado a solicitud
  tipo: TipoActividad;
  titulo: string;
  descripcion?: string;
  estado: EstadoActividad;       // NUEVO: pending, in_progress, completed, cancelled
  prioridad: Prioridad;          // NUEVO: low, normal, high, urgent
  fecha_programada?: string;     // due_date
  fecha_completada?: string;     // completed_at
  nota_completacion?: string;    // NUEVO: nota al completar
  metadata?: Record<string, any>; // Para evidencias
  created_at: string;
  updated_at: string;
  // JOINs
  contacto_nombre?: string;
  contacto_apellido?: string;
  solicitud_titulo?: string;
  creador_nombre?: string;
  creador_apellido?: string;
}

type TipoActividad = 'llamada' | 'email' | 'reunion' | 'visita' | 'tarea' | 'whatsapp' | 'seguimiento';
type EstadoActividad = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
type Prioridad = 'baja' | 'normal' | 'alta' | 'urgente';
```

---

## 3. CONFIGURACIONES

### TIPOS DE ACTIVIDAD (7 tipos con colores)
```typescript
const ACTIVITY_TYPES = [
  { value: 'llamada', label: 'Llamada', icon: '📞', gradient: 'from-blue-500 to-blue-600', color: '#3b82f6' },
  { value: 'email', label: 'Email', icon: '📧', gradient: 'from-purple-500 to-purple-600', color: '#8b5cf6' },
  { value: 'reunion', label: 'Reunión', icon: '📅', gradient: 'from-green-500 to-green-600', color: '#22c55e' },
  { value: 'visita', label: 'Visita', icon: '🏠', gradient: 'from-cyan-500 to-emerald-500', color: '#06b6d4' },
  { value: 'tarea', label: 'Tarea', icon: '✅', gradient: 'from-pink-500 to-pink-600', color: '#ec4899' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬', gradient: 'from-green-400 to-green-500', color: '#25d366' },
  { value: 'seguimiento', label: 'Seguimiento', icon: '⚡', gradient: 'from-indigo-500 to-indigo-600', color: '#6366f1' },
];
```

### ESTADOS (4 estados)
```typescript
const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  en_progreso: { label: 'En Progreso', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  completada: { label: 'Completada', color: '#22c55e', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  cancelada: { label: 'Cancelada', color: '#6b7280', bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
};
```

### PRIORIDADES (4 niveles)
```typescript
const PRIORITY_CONFIG = {
  baja: { label: 'Baja', color: '#9ca3af', dot: 'bg-gray-400' },
  normal: { label: 'Normal', color: '#3b82f6', dot: 'bg-blue-500' },
  alta: { label: 'Alta', color: '#f97316', dot: 'bg-orange-500' },
  urgente: { label: 'Urgente', color: '#ef4444', dot: 'bg-red-500' },
};
```

---

## 4. LAYOUT DE LA PÁGINA

### 4.1 HEADER CON GRADIENTE
- Fondo: gradiente indigo/purple (from-indigo-600 to-purple-600)
- Icono grande: Zap (rayo) en círculo con fondo blanco/20
- Título: "Seguimiento" (text-4xl font-bold)
- Subtítulo: "Gestiona tus actividades y agenda de forma rápida"
- **Stats a la derecha** (3 métricas):
  - "Este Mes" con icono Calendar
  - "Este Año" con icono TrendingUp
  - "Completadas" con icono CalendarCheck

### 4.2 QUICK ACTION BUTTONS (Botones de Creación Rápida)
- Título: "Crear Actividad Rápida" con icono Plus
- **7 botones en grid de 7 columnas**
- Cada botón:
  - Background blanco, hover muestra gradiente del tipo
  - Icono en círculo con color del tipo
  - Label debajo
  - Al hacer clic: abre modal con ese tipo preseleccionado

### 4.3 BARRA DE FILTROS
- **Búsqueda** (input con icono Search, width 384px)
- **Selector de ordenamiento** (por Fecha, Prioridad, Estado)
- **Filtro de estado** (select con todos los estados)
- **Spacer**
- **Toggle Vista** (Kanban / Lista) - botones con iconos

### 4.4 VISTA KANBAN (3 columnas)
Columnas:
1. **Pendientes** (dot amarillo #f59e0b)
2. **En Progreso** (dot azul #3b82f6)
3. **Completadas** (dot verde #22c55e)

Cada columna muestra:
- Header con dot de color, título, contador

### 4.5 VISTA LISTA (Tabla)
Columnas:
- Actividad (icono + título + descripción)
- Tipo
- Relacionado (contacto o solicitud)
- Estado (dropdown clickeable)
- Prioridad
- Fecha
- Acciones (evidencias, completar, editar, eliminar)

---

## 5. COMPONENTE ActivityCard (Kanban)

```
┌─────────────────────────────────────┐
│ [Indicador prioridad en borde der.] │
│                                     │
│ ○ [Icono Tipo] Tipo    [Prioridad] │
│                                     │
│ **Título de la actividad**          │
│ Descripción corta...                │
│                                     │
│ 📅 Fecha    👤 Contacto            │
│                                     │
│ [Evidencias] [Editar] [Eliminar]   │
└─────────────────────────────────────┘
```

Comportamiento:
- Click en círculo: abre modal de completación (si completando)
- Click en card: abre modal de edición
- Indicador de prioridad: barra vertical derecha del color de prioridad
- Si completada: fondo verde gradiente, título tachado

---

## 6. MODALES

### 6.1 MODAL CREAR/EDITAR ACTIVIDAD
- Header con gradiente del tipo seleccionado
- Icono grande del tipo
- Título: "Nueva [Tipo]" o "Editar [Tipo]"

Campos:
1. **Relacionar con** (radio: Contacto / Solicitud)
2. **Selector de Contacto** (dropdown con búsqueda)
3. **Selector de Solicitud** (dropdown con búsqueda)
4. **Tipo de Actividad** (grid de 7 botones)
5. **Título** (input required)
6. **Descripción** (textarea)
7. **Estado** (select: pendiente, en_progreso, completada, cancelada)
8. **Prioridad** (select: baja, normal, alta, urgente)
9. **Fecha Programada** (datetime-local)

Footer: Cancelar / Guardar

### 6.2 MODAL COMPLETAR ACTIVIDAD
- Título: "Completar Actividad"
- Muestra título de la actividad
- **Textarea para nota de completación** (opcional)
- Botones: Cancelar / Completar

### 6.3 MODAL ELIMINAR ACTIVIDAD
- Título: "Eliminar Actividad"
- Confirmación con textarea para nota de eliminación
- Botones: Cancelar / Eliminar

### 6.4 MODAL EVIDENCIAS (Fase 2 - Opcional)
- Lista de archivos adjuntos
- Botón para subir nuevos
- Preview de imágenes
- Eliminar evidencia

---

## 7. DROPDOWN DE ESTADO (En vista Lista)

Al hacer clic en el badge de estado en la tabla:
- Aparece dropdown fijo con las 4 opciones de estado
- Cada opción: dot de color + label
- Check en la opción actual
- Al seleccionar: cambia estado (si es "completada", abre modal de completación)

---

## 8. FUNCIONALIDADES

### Estados
- [x] Ver lista de actividades (Kanban y Lista)
- [x] Filtrar por búsqueda, tipo, estado
- [x] Ordenar por fecha, prioridad, estado
- [x] Crear actividad con tipo preseleccionado
- [x] Editar actividad
- [x] Cambiar estado con dropdown
- [x] Completar con nota
- [x] Eliminar con nota
- [ ] Subir evidencias (Fase 2)

### Persistencia
- Guardar preferencia de vista (kanban/lista) en localStorage
- Guardar preferencia de ordenamiento en localStorage

---

## 9. API ENDPOINTS REQUERIDOS

### Ya existentes (verificar campos)
- GET /tenants/:tenantId/actividades
- POST /tenants/:tenantId/actividades
- PUT /tenants/:tenantId/actividades/:id
- DELETE /tenants/:tenantId/actividades/:id

### Actualizar campos en backend
- Agregar: `estado`, `prioridad`, `nota_completacion`, `fecha_completada`
- Actualizar migración si es necesario

---

## 10. MIGRACIÓN DE BASE DE DATOS

Agregar campos a tabla `actividades_crm`:
```sql
ALTER TABLE actividades_crm
ADD COLUMN estado VARCHAR(20) DEFAULT 'pendiente',
ADD COLUMN prioridad VARCHAR(20) DEFAULT 'normal',
ADD COLUMN nota_completacion TEXT,
ADD COLUMN fecha_completada TIMESTAMP;

-- Migrar datos existentes
UPDATE actividades_crm SET estado = 'completada' WHERE completada = true;
UPDATE actividades_crm SET estado = 'pendiente' WHERE completada = false;
```

---

## 11. COLORES Y ESTILOS

### Gradiente Header
```css
background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
```

### Cards
- Border radius: 12px (rounded-xl)
- Hover: shadow-lg, slight translate up
- Completada: bg gradient from-green-50 to-emerald-50

### Botones Quick Action
- Border radius: 16px (rounded-2xl)
- Hover: muestra gradiente del tipo
- Transición suave de colores

---

## 12. ORDEN DE IMPLEMENTACIÓN

1. **Actualizar migración** - Agregar campos estado, prioridad, nota_completacion
2. **Actualizar servicio backend** - actividadesService.ts
3. **Actualizar API frontend** - api.ts con nuevos tipos
4. **Renombrar en menú** - CrmLayout.tsx
5. **Reescribir CrmActividades.tsx** - Componente completo
6. **Probar funcionalidad**

---

## 13. ARCHIVOS A MODIFICAR

1. `packages/api/src/database/migrations/XXX_update_actividades_campos.ts` (CREAR)
2. `packages/api/src/services/actividadesService.ts` (ACTUALIZAR)
3. `packages/api/src/routes/tenants.ts` (VERIFICAR)
4. `apps/crm-frontend/src/services/api.ts` (ACTUALIZAR tipos)
5. `apps/crm-frontend/src/layouts/CrmLayout.tsx` (RENOMBRAR label)
6. `apps/crm-frontend/src/pages/crm/CrmActividades.tsx` (REESCRIBIR)

---

*Documento creado: 28/11/2025*
*Para: Módulo Seguimiento del CRM CLIC*
