# Plan de Mejoras: Requerimientos de Expediente

## Estado Actual

### Lo que existe:

**Base de Datos:**
- Tabla `ventas_expediente_requerimientos` - Configuración de documentos requeridos por tenant
- Tabla `ventas_expediente_items` - Documentos subidos por venta
- Campos: `categoria` con valores `cierre_venta`, `cierre_alquiler`, `cierre_renta`

**Frontend (CrmFinanzasConfiguracion.tsx > ExpedienteRequerimientosTab):**
- ❌ Solo visualización (READ-ONLY)
- ❌ No permite crear, editar ni eliminar requerimientos
- ❌ No diferencia entre tipos de propiedades (lista vs proyecto)
- ✅ Muestra stats (total, obligatorios, opcionales)
- ✅ Agrupa por categoría
- ✅ Muestra tipos de archivo y tamaño máximo

**API:**
- `GET /tenants/:tenantId/expediente-requerimientos` - Lista requerimientos del tenant
- `GET /tenants/:tenantId/ventas/:ventaId/expediente/requerimientos` - Para una venta específica
- ❌ No hay endpoints para CREAR, EDITAR, ELIMINAR requerimientos

**Seed Data (Migración 057):**
- Crea requerimientos default para todos los tenants
- 6 documentos para ventas (cédulas, contrato, título, certificado, comprobante)
- 5 documentos para alquileres (cédulas, contrato, depósito, primer mes)

---

## Problema Principal

El sistema actual NO PERMITE que cada tenant configure sus propios documentos requeridos. Además, no diferencia entre:
- **Ventas de propiedades listas** (segunda mano)
- **Ventas de proyectos** (construcción/sobre planos)
- **Alquileres**

---

## Plan de Cambios

### FASE 1: Modificar Esquema de Base de Datos

**Nueva migración para agregar campo `subtipo`:**

```sql
-- Migración: add_subtipo_expediente_requerimientos
ALTER TABLE ventas_expediente_requerimientos
ADD COLUMN subtipo VARCHAR(50) NULL;

-- Valores permitidos:
-- Para categoria='cierre_venta': 'propiedad_lista', 'proyecto', 'ambos' (o NULL = ambos)
-- Para categoria='cierre_alquiler': NULL (no aplica subtipo)

COMMENT ON COLUMN ventas_expediente_requerimientos.subtipo IS
'Subtipo de operación: propiedad_lista, proyecto, ambos (aplica solo para ventas)';

-- Actualizar requerimientos existentes como "ambos"
UPDATE ventas_expediente_requerimientos
SET subtipo = 'ambos'
WHERE categoria = 'cierre_venta' AND subtipo IS NULL;
```

### FASE 2: Nuevos Endpoints API

```typescript
// POST /tenants/:tenantId/expediente-requerimientos
// Crear nuevo requerimiento
{
  titulo: string,
  descripcion?: string,
  instrucciones?: string,
  categoria: 'cierre_venta' | 'cierre_alquiler',
  subtipo?: 'propiedad_lista' | 'proyecto' | 'ambos', // Solo para ventas
  tipo?: string,
  requiere_documento: boolean,
  es_obligatorio: boolean,
  orden_visualizacion: number,
  tipos_archivo_permitidos: string[],
  tamaño_maximo_archivo: number
}

// PUT /tenants/:tenantId/expediente-requerimientos/:requerimientoId
// Actualizar requerimiento

// DELETE /tenants/:tenantId/expediente-requerimientos/:requerimientoId
// Eliminar requerimiento (soft delete: activo = false)

// POST /tenants/:tenantId/expediente-requerimientos/reordenar
// Reordenar (actualizar orden_visualizacion en batch)
{
  items: [{ id: string, orden: number }]
}
```

### FASE 3: Rediseño del Frontend

**Nueva estructura de pestañas internas:**

```
Requerimientos de Expediente
├── [Tab] Ventas Propiedades Listas
├── [Tab] Ventas Proyectos
├── [Tab] Alquileres
└── Botón: + Nuevo Requerimiento
```

**Funcionalidades:**
1. **CRUD completo** de requerimientos
2. **Drag & Drop** para reordenar
3. **Modal de edición** con todos los campos:
   - Título (obligatorio)
   - Descripción
   - Instrucciones para el usuario
   - Es obligatorio (toggle)
   - Requiere documento (toggle)
   - Tipos de archivo permitidos (checkboxes o tags)
   - Tamaño máximo (input numérico con unidad)
4. **Confirmación** antes de eliminar
5. **Plantillas predeterminadas** - Botón para cargar documentos típicos

---

## Diseño UI Propuesto

### Vista Principal

```
┌─────────────────────────────────────────────────────────────────────┐
│ Requerimientos de Expediente                                         │
│ Configura los documentos requeridos para cerrar ventas y alquileres │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ [🏠 Ventas Prop. Listas] [🏗️ Ventas Proyectos] [🔑 Alquileres]      │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [📄] Stats                                                    │    │
│  │ Total: 6  |  Obligatorios: 4  |  Opcionales: 2              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [+ Agregar Documento]                [📋 Cargar Plantilla Default] │
│                                                                      │
│  ┌─ Lista de Documentos (Drag & Drop) ─────────────────────────────┐│
│  │                                                                  ││
│  │  ☰ 1. Cédula del Comprador           [OBLIGATORIO] [✏️] [🗑️]   ││
│  │     📄 PDF, JPG • Max 5MB                                       ││
│  │                                                                  ││
│  │  ☰ 2. Contrato de Compraventa        [OBLIGATORIO] [✏️] [🗑️]   ││
│  │     📄 PDF, DOC, JPG • Max 10MB                                 ││
│  │                                                                  ││
│  │  ☰ 3. Certificado de Título          [OBLIGATORIO] [✏️] [🗑️]   ││
│  │     📄 PDF, JPG • Max 10MB                                      ││
│  │                                                                  ││
│  │  ☰ 4. Comprobante de Pago            [OPCIONAL]    [✏️] [🗑️]   ││
│  │     📄 PDF, JPG • Max 5MB                                       ││
│  │                                                                  ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Modal de Edición/Creación

```
┌─────────────────────────────────────────────────────────────────────┐
│ ✏️ Editar Requerimiento                                      [X]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Título *                                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Cédula del Comprador                                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Descripción                                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Copia de la cédula de identidad del comprador               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Instrucciones para el usuario                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Subir copia legible de ambos lados de la cédula             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Configuración                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [✓] Es obligatorio                                          │    │
│  │ [✓] Requiere documento                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Tipos de archivo permitidos                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [✓] PDF  [✓] JPG  [✓] PNG  [ ] DOC  [ ] DOCX               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Tamaño máximo de archivo                                           │
│  ┌──────────────┐                                                   │
│  │ 5           │ MB                                                 │
│  └──────────────┘                                                   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                              [Cancelar]  [💾 Guardar Cambios]       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Documentos Típicos por Categoría

### Ventas - Propiedades Listas (Segunda Mano)
1. Cédula del Comprador ✱
2. Cédula del Vendedor ✱
3. Contrato de Compraventa ✱
4. Certificado de Título ✱
5. Certificado de Libertad de Gravamen ✱
6. Plano Catastral
7. Comprobante de Pago
8. Carta de No Adeudo (mantenimiento/administración)
9. Poder de Representación (si aplica)

### Ventas - Proyectos (Construcción)
1. Cédula del Comprador ✱
2. Contrato de Reserva/Opción de Compra ✱
3. Contrato de Compraventa ✱
4. Cronograma de Pagos ✱
5. Comprobante de Separación/Inicial
6. Comprobantes de Cuotas
7. Ficha del Proyecto (especificaciones)
8. Plano de la Unidad

### Alquileres
1. Cédula del Inquilino ✱
2. Cédula del Propietario ✱
3. Contrato de Alquiler ✱
4. Comprobante de Depósito ✱
5. Comprobante del Primer Mes ✱
6. Carta de Trabajo/Ingresos
7. Referencias Personales/Comerciales
8. Inventario del Inmueble

✱ = Obligatorio por defecto

---

## Orden de Implementación

### Paso 1: Migración de BD (15 min)
- Crear migración para agregar campo `subtipo`
- Actualizar registros existentes

### Paso 2: API Endpoints (45 min)
- POST crear requerimiento
- PUT actualizar requerimiento
- DELETE eliminar requerimiento (soft delete)
- POST reordenar

### Paso 3: Frontend - Estructura (1 hora)
- Agregar sub-tabs por categoría/subtipo
- Crear estado local para gestión
- Integrar llamadas API

### Paso 4: Frontend - CRUD Modal (1.5 horas)
- Modal de creación/edición
- Validaciones de formulario
- Feedback de guardado

### Paso 5: Frontend - Drag & Drop (45 min)
- Implementar reordenamiento
- Guardar nuevo orden en BD

### Paso 6: Plantillas Default (30 min)
- Botón para cargar documentos típicos
- Confirmación antes de sobrescribir

---

## Archivos a Modificar

### Backend (packages/api):
1. `src/database/migrations/XXX_add_subtipo_expediente.ts` - Nueva migración
2. `src/routes/tenants/index.ts` - Nuevos endpoints CRUD
3. `src/services/expedienteService.ts` - Funciones CRUD

### Frontend (apps/crm-frontend):
1. `src/pages/crm/CrmFinanzasConfiguracion.tsx` - Componente ExpedienteRequerimientosTab
2. `src/services/api.ts` - Nuevas funciones API

---

## Consideraciones Técnicas

1. **Soft Delete**: No eliminar físicamente, solo marcar `activo = false`
2. **Ordenamiento**: Usar campo `orden_visualizacion` con incrementos de 10
3. **Validaciones**:
   - Título requerido y único por categoría/subtipo
   - Al menos un tipo de archivo permitido
   - Tamaño máximo entre 1MB y 50MB
4. **Caché**: Invalidar caché de requerimientos al hacer cambios
5. **Audit**: Registrar quién y cuándo modificó

---

## Preguntas para el Cliente

1. ¿Los documentos de proyectos son muy diferentes a los de propiedades listas, o solo algunos cambian?
2. ¿Quieren poder crear categorías personalizadas además de "ventas" y "alquileres"?
3. ¿Necesitan que ciertos documentos sean visibles solo para admins vs asesores?
4. ¿Quieren notificaciones cuando falten documentos obligatorios?
