# DOCUMENTO DE MIGRACION CRM
## De: clic-platform-crm (Next.js) -> 2026 CLIC (React + Express)

---

## 1. ANALISIS DEL PROYECTO ORIGEN

### Ubicacion
`C:\Users\Rene Castillo\CLIC-PLATFORM\clic-platform-crm\src\app\crm`

### Modulos Existentes en el Origen

| Modulo | Archivos | Descripcion |
|--------|----------|-------------|
| **contacts** | `page.tsx`, `[id]/page.tsx` | Gestion de contactos con tipos multiples (lead, cliente, asesor, desarrollador, referidor, propietario). Detalle con tabs, interacciones, propiedades vinculadas. |
| **requests** | `page.tsx`, `new/page.tsx`, `[id]/page.tsx` | Pipeline Kanban con etapas, drag & drop, formulario de creacion. |
| **proposals** | `page.tsx`, `new/page.tsx`, `[id]/page.tsx` | Propuestas comerciales con seleccion de propiedades, estados, URL publica. |
| **activities** | `page.tsx` | Seguimiento de actividades (llamadas, emails, reuniones, tareas) con vista Kanban/Lista. |
| **properties** | `page.tsx`, `new/page.tsx`, `[id]/page.tsx` | Gestion de propiedades inmobiliarias con filtros, grid, detalles. |
| **goals** | `page.tsx` | Metas personales y de equipo con sistema de recompensas y tracking de progreso. |

---

## 2. ANALISIS DEL PROYECTO DESTINO

### Ubicacion
`d:\2026 CLIC\apps\crm-frontend\src\pages\crm`

### Modulos Actuales

| Modulo | Archivo | Estado | Notas |
|--------|---------|--------|-------|
| **Dashboard** | `CrmDashboard.tsx` | Placeholder | Solo estructura basica |
| **Contactos** | `CrmContactos.tsx` | PARCIAL | Lista basica, modal crear, filtros. Falta detalle completo. |
| **ContactoDetalle** | `ContactoDetalle.tsx` | PARCIAL | Tabs, info basica, timeline. Falta: relaciones, solicitudes vinculadas, edicion inline. |
| **Pipeline/Solicitudes** | `CrmSolicitudes.tsx` | PARCIAL | Kanban 5 etapas, modal crear. Falta: integracion contacto, detalle solicitud, PURGE score funcional. |
| **Propiedades** | `CrmPropiedades.tsx` | Placeholder | No implementado |
| **Propuestas** | `CrmPropuestas.tsx` | Placeholder | No implementado |
| **Clientes** | `CrmClientes.tsx` | Placeholder | Deberia mostrar contactos tipo=cliente |
| **Equipo** | `CrmEquipo.tsx` | Placeholder | No implementado |
| **Configuracion** | `CrmConfiguracion.tsx` | Placeholder | No implementado |

---

## 3. COMPARATIVA DE FUNCIONALIDADES

### 3.1 CONTACTOS

| Funcionalidad | Origen | Destino | Estado |
|--------------|--------|---------|--------|
| Lista con busqueda y filtros | SI | SI | OK |
| Tipos multiples (lead, cliente, etc.) | SI | SI | OK |
| Favoritos | SI | SI | OK |
| Modal crear/editar | SI | SI | OK |
| Pagina de detalle | SI | SI | PARCIAL |
| Tabs (Info, Actividades, Solicitudes, Propuestas) | SI | SI | PARCIAL |
| Datos de extension (advisor_data, lead_data, etc.) | SI | NO | FALTA |
| Interacciones/Historial | SI | PARCIAL | Timeline basico |
| Propiedades vinculadas | SI | NO | FALTA |
| Estadisticas de referidor | SI | NO | FALTA |
| Relaciones entre contactos | SI | PARCIAL | Solo estructura |

### 3.2 SOLICITUDES/PIPELINE

| Funcionalidad | Origen | Destino | Estado |
|--------------|--------|---------|--------|
| Vista Kanban | SI | SI | OK |
| Drag & drop cambio etapa | SI | SI | OK |
| Vista Lista alternativa | SI | SI | OK |
| Modal crear solicitud | SI | SI | PARCIAL |
| Vinculacion a contacto | SI | NO | FALTA - Crea sin contacto |
| Vinculacion a propiedades | SI | NO | FALTA |
| Detalle de solicitud | SI | NO | FALTA |
| Historial de actividades | SI | NO | FALTA |
| Notas/comentarios | SI | NO | FALTA |

### 3.3 PROPUESTAS

| Funcionalidad | Origen | Destino | Estado |
|--------------|--------|---------|--------|
| Lista de propuestas | SI | NO | FALTA |
| Estados (borrador, enviada, vista, etc.) | SI | NO | FALTA |
| Crear desde solicitud | SI | NO | FALTA |
| Selector de propiedades con filtros | SI | NO | FALTA |
| URL publica para cliente | SI | NO | FALTA |
| Tracking de vistas | SI | NO | FALTA |

### 3.4 ACTIVIDADES

| Funcionalidad | Origen | Destino | Estado |
|--------------|--------|---------|--------|
| Vista Kanban por estado | SI | NO | FALTA |
| Vista Lista | SI | NO | FALTA |
| Tipos (llamada, email, reunion, etc.) | SI | PARCIAL | Solo estructura DB |
| Vinculacion a contacto/solicitud | SI | NO | FALTA |
| Fechas de vencimiento | SI | NO | FALTA |
| Prioridades | SI | NO | FALTA |
| Completar con notas | SI | NO | FALTA |
| Evidencias/Adjuntos | SI | NO | FALTA |

### 3.5 PROPIEDADES

| Funcionalidad | Origen | Destino | Estado |
|--------------|--------|---------|--------|
| Grid de propiedades | SI | NO | FALTA |
| Filtros avanzados | SI | NO | FALTA |
| Detalle de propiedad | SI | NO | FALTA |
| Crear/Editar propiedad | SI | NO | FALTA |
| Imagenes y galeria | SI | NO | FALTA |
| Vinculacion a agente | SI | NO | FALTA |

### 3.6 METAS (GOALS)

| Funcionalidad | Origen | Destino | Estado |
|--------------|--------|---------|--------|
| Dashboard de metas | SI | NO | FALTA |
| Crear meta personal | SI | NO | FALTA |
| Asignar meta a equipo | SI | NO | FALTA |
| Tipos de meta | SI | NO | FALTA |
| Sistema de recompensas | SI | NO | FALTA |
| Tracking automatico | SI | NO | FALTA |

---

## 4. PLAN DE MIGRACION POR FASES

### FASE 1: CORRECCION DE ERRORES CRITICOS
**Prioridad: URGENTE**
**Estimacion: Inmediato**

1. **Arreglar error API solicitudes** - El endpoint devuelve HTML en vez de JSON
2. **Vincular solicitudes a contactos** - El modal de crear solicitud debe requerir o permitir seleccionar contacto

### FASE 2: COMPLETAR CONTACTOS
**Prioridad: ALTA**

1. **Mejorar ContactoDetalle.tsx**
   - Tab Solicitudes: mostrar solicitudes vinculadas al contacto
   - Tab Propuestas: mostrar propuestas vinculadas
   - Tab Actividades: mostrar actividades vinculadas
   - Edicion inline de campos
   - Boton "Nueva Solicitud" desde contacto

2. **Datos de extension por tipo**
   - lead_data: estado, fuente, presupuesto, intereses
   - advisor_data: especialidades, idiomas, codigo referido
   - owner_data: tipo propietario, propiedades vinculadas
   - referrer_data: estadisticas, comisiones

### FASE 3: COMPLETAR PIPELINE/SOLICITUDES
**Prioridad: ALTA**

1. **Modal crear solicitud mejorado**
   - Selector de contacto (obligatorio o crear nuevo)
   - Selector de propiedades de interes
   - PURGE Score interactivo
   - Campos de presupuesto y requisitos

2. **Pagina detalle de solicitud** (`/crm/:tenant/pipeline/:id`)
   - Header con info principal
   - Timeline de actividades
   - Propiedades vinculadas
   - Historial de cambios de etapa
   - Acciones rapidas

3. **Crear solicitud desde contacto**
   - Boton en ContactoDetalle
   - Pre-llenar datos del contacto

### FASE 4: ACTIVIDADES/SEGUIMIENTO
**Prioridad: MEDIA**

1. **Nueva pagina CrmActividades.tsx**
   - Vista Kanban por estado (pendiente, en progreso, completada)
   - Vista Lista alternativa
   - Filtros por tipo, fecha, prioridad
   - Quick actions para tipos comunes

2. **CRUD de actividades**
   - Modal crear/editar
   - Selector de contacto/solicitud
   - Fecha vencimiento
   - Prioridad
   - Notas de completion

3. **Integracion en otras vistas**
   - Widget en ContactoDetalle
   - Widget en detalle solicitud
   - Notificaciones de vencimiento

### FASE 5: PROPUESTAS
**Prioridad: MEDIA**

1. **CrmPropuestas.tsx completo**
   - Lista con estados y filtros
   - Estadisticas (activas, ganadas, etc.)

2. **Crear propuesta**
   - Desde solicitud o contacto directo
   - Selector de propiedades con filtros
   - Personalizacion de precios
   - Mensaje personalizado
   - Fecha expiracion

3. **Vista publica de propuesta**
   - URL unica compartible
   - Tracking de visualizaciones
   - Diseño profesional

### FASE 6: PROPIEDADES
**Prioridad: MEDIA-BAJA**

1. **CrmPropiedades.tsx completo**
   - Grid con imagenes
   - Filtros avanzados
   - Paginacion

2. **Detalle y edicion**
   - Galeria de imagenes
   - Datos completos
   - Vinculacion a agente

### FASE 7: METAS Y GAMIFICACION
**Prioridad: BAJA**

1. **CrmMetas.tsx**
   - Dashboard visual de progreso
   - Crear metas personales
   - Ver metas asignadas

2. **Para admins**
   - Asignar metas al equipo
   - Definir recompensas
   - Ver progreso del equipo

### FASE 8: DASHBOARD Y REPORTES
**Prioridad: BAJA**

1. **CrmDashboard.tsx mejorado**
   - KPIs principales
   - Grafico de pipeline
   - Actividades pendientes
   - Metas en progreso

---

## 5. ENDPOINTS API REQUERIDOS

### Ya Existentes (verificar funcionamiento)
- `GET/POST/PUT/DELETE /tenants/:tenantId/contactos`
- `GET/POST/PUT/DELETE /tenants/:tenantId/solicitudes`
- `GET/POST/PUT/DELETE /tenants/:tenantId/propuestas`
- `GET/POST/PUT/DELETE /tenants/:tenantId/actividades_crm`

### Nuevos Requeridos
- `GET /tenants/:tenantId/contactos/:id/solicitudes` - Solicitudes de un contacto
- `GET /tenants/:tenantId/contactos/:id/propuestas` - Propuestas de un contacto
- `GET /tenants/:tenantId/contactos/:id/actividades` - Actividades de un contacto
- `GET /tenants/:tenantId/solicitudes/:id/actividades` - Actividades de una solicitud
- `POST /tenants/:tenantId/solicitudes/:id/actividades` - Crear actividad en solicitud
- `GET /tenants/:tenantId/solicitudes/:id/historial` - Historial de cambios
- `GET /tenants/:tenantId/propiedades` - Listado de propiedades
- `GET /tenants/:tenantId/metas` - Metas del usuario
- `POST /tenants/:tenantId/metas` - Crear meta
- `GET /tenants/:tenantId/equipo/metas` - Metas del equipo (admin)

---

## 6. ESTRUCTURA DE BASE DE DATOS

### Tablas Ya Existentes
- `contactos` - OK
- `contactos_relaciones` - OK
- `solicitudes` - OK
- `propuestas` - OK
- `actividades_crm` - OK

### Tablas Nuevas Requeridas

```sql
-- Metas/Goals
CREATE TABLE metas (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  usuario_id UUID REFERENCES usuarios(id),
  creado_por UUID REFERENCES usuarios(id),
  tipo_meta VARCHAR(50), -- ventas, actividades, contactos, cierres, etc.
  titulo VARCHAR(255),
  descripcion TEXT,
  valor_objetivo DECIMAL(15,2),
  valor_actual DECIMAL(15,2) DEFAULT 0,
  periodo VARCHAR(50), -- diario, semanal, mensual, etc.
  fecha_inicio TIMESTAMP,
  fecha_fin TIMESTAMP,
  estado VARCHAR(50) DEFAULT 'activo',
  origen VARCHAR(50), -- personal, asignado
  tipo_recompensa VARCHAR(50),
  descripcion_recompensa TEXT,
  monto_recompensa DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Historial de cambios de solicitud
CREATE TABLE solicitudes_historial (
  id UUID PRIMARY KEY,
  solicitud_id UUID REFERENCES solicitudes(id),
  usuario_id UUID REFERENCES usuarios(id),
  tipo_cambio VARCHAR(50), -- etapa, asignacion, datos
  valor_anterior TEXT,
  valor_nuevo TEXT,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Propiedades (si no existe completa)
CREATE TABLE propiedades (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  titulo VARCHAR(255),
  slug VARCHAR(255),
  tipo VARCHAR(50), -- apartamento, casa, terreno, etc.
  operacion VARCHAR(50), -- venta, alquiler
  precio_venta DECIMAL(15,2),
  precio_alquiler DECIMAL(15,2),
  moneda VARCHAR(3) DEFAULT 'USD',
  ciudad VARCHAR(100),
  sector VARCHAR(100),
  direccion TEXT,
  habitaciones INT,
  banos INT,
  m2_construccion DECIMAL(10,2),
  m2_terreno DECIMAL(10,2),
  descripcion TEXT,
  caracteristicas JSONB DEFAULT '[]',
  imagenes JSONB DEFAULT '[]',
  estado VARCHAR(50) DEFAULT 'activo',
  agente_id UUID REFERENCES usuarios(id),
  propietario_id UUID REFERENCES contactos(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. PROXIMOS PASOS INMEDIATOS

1. **AHORA**: Arreglar el error de API que devuelve HTML
2. **AHORA**: Revisar por que solicitudes se crean sin contacto
3. **HOY**: Implementar selector de contacto en modal de solicitud
4. **ESTA SEMANA**: Completar tab de solicitudes en ContactoDetalle
5. **ESTA SEMANA**: Crear pagina detalle de solicitud basica

---

## 8. NOTAS TECNICAS

### Diferencias de Stack
- **Origen**: Next.js 14 (App Router), API externa Go/REST
- **Destino**: React + Vite, Express API propia, PostgreSQL

### Patrones a Mantener
- Componentes funcionales con hooks
- Estados locales para UI
- Llamadas API con try/catch
- Modales para formularios
- Tabs para organizar informacion

### Estilos
- Origen usa Tailwind CSS
- Destino usa CSS-in-JS (style tags) con variables CSS
- Mantener consistencia visual con el nuevo sistema

---

*Documento generado: 28/11/2025*
*Proyecto: CLIC CRM Multi-tenant*
