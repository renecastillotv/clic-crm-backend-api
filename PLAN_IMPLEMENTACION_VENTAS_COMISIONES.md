# Plan de Implementación: Sistema de Ventas y Comisiones

## Resumen Ejecutivo

Refactorización del sistema de ventas y comisiones para soportar:
- Separación clara entre **Cobros de Empresa** (cuentas por cobrar) y **Pagos a Asesores** (cuentas por pagar)
- Integración con **plantillas de comisión** existentes
- **Snapshots inmutables** de distribución al momento de la venta
- **Historial de cambios** (audit log) para trazabilidad
- **Vistas diferenciadas** Admin vs Asesor
- **Campos cache** para rendimiento con grandes volúmenes

---

## Arquitectura del Flujo

```
                         VENTA
                    ($100,000 × 5%)
                          │
                          ▼
                 ┌────────────────┐
                 │  COMISIÓN      │
                 │  TOTAL: $5,000 │
                 └───────┬────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌───────────────────┐          ┌─────────────────────┐
│ COBROS EMPRESA    │          │ DISTRIBUCIÓN        │
│ (Cuentas×Cobrar)  │          │ (Snapshot Inmutable)│
├───────────────────┤          ├─────────────────────┤
│ Cobro 1: $2,500   │          │ Vendedor: 42%=$2,100│
│ Cobro 2: $2,500   │          │ Captador: 12%=$600  │
│ ─────────────     │          │ Empresa:  46%=$2,300│
│ Total: $5,000     │          └──────────┬──────────┘
└─────────┬─────────┘                     │
          │                               │
          │    Cuando empresa cobra       │
          │    se habilitan pagos         │
          └───────────────┬───────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │ PAGOS A ASESORES    │
               │ (Cuentas×Pagar)     │
               ├─────────────────────┤
               │ Proporcional a lo   │
               │ cobrado por empresa │
               └─────────────────────┘
```

---

## FASE 1: Migraciones de Base de Datos

### Migración 116: Tabla `ventas_cobros`

```sql
-- Registra los cobros que hace la empresa al cliente
CREATE TABLE ventas_cobros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,

  -- Monto del cobro
  monto DECIMAL(15,2) NOT NULL,
  moneda VARCHAR(3) DEFAULT 'USD',

  -- Información del cobro
  fecha_cobro DATE NOT NULL,
  metodo_pago VARCHAR(50),        -- 'transferencia', 'cheque', 'efectivo', 'tarjeta'
  referencia VARCHAR(100),        -- Número de referencia/cheque/transacción
  banco VARCHAR(100),             -- Banco origen/destino

  -- Documentación
  recibo_url VARCHAR(500),
  notas TEXT,

  -- Auditoría
  registrado_por_id UUID REFERENCES usuarios(id),
  fecha_registro TIMESTAMP DEFAULT NOW(),

  -- Control
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ventas_cobros_tenant ON ventas_cobros(tenant_id);
CREATE INDEX idx_ventas_cobros_venta ON ventas_cobros(venta_id);
CREATE INDEX idx_ventas_cobros_fecha ON ventas_cobros(fecha_cobro);
```

### Migración 117: Tabla `ventas_historial`

```sql
-- Audit log de todos los cambios en ventas y comisiones
CREATE TABLE ventas_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,

  -- Tipo de cambio
  tipo_cambio VARCHAR(50) NOT NULL,
  -- Valores: 'venta_creada', 'venta_editada', 'venta_cancelada',
  --          'cobro_registrado', 'cobro_editado', 'cobro_eliminado',
  --          'distribucion_creada', 'distribucion_modificada',
  --          'pago_registrado', 'pago_editado', 'pago_eliminado'

  -- Datos del cambio
  entidad VARCHAR(50),            -- 'venta', 'cobro', 'comision', 'pago'
  entidad_id UUID,                -- ID de la entidad afectada

  datos_anteriores JSONB,         -- Estado antes del cambio
  datos_nuevos JSONB,             -- Estado después del cambio

  -- Descripción legible
  descripcion TEXT NOT NULL,      -- "Se registró cobro de $2,500"

  -- Quién hizo el cambio
  usuario_id UUID REFERENCES usuarios(id),
  usuario_nombre VARCHAR(200),    -- Cache del nombre para mostrar

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ventas_historial_tenant ON ventas_historial(tenant_id);
CREATE INDEX idx_ventas_historial_venta ON ventas_historial(venta_id);
CREATE INDEX idx_ventas_historial_tipo ON ventas_historial(tipo_cambio);
CREATE INDEX idx_ventas_historial_fecha ON ventas_historial(created_at);
```

### Migración 118: Modificar tabla `comisiones`

```sql
-- Nuevos campos para snapshot y control de pagos
ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
  tipo_participante VARCHAR(50);
  -- 'vendedor', 'captador', 'mentor', 'lider', 'referidor', 'empresa'

ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
  escenario VARCHAR(50);
  -- 'solo_capta', 'solo_vende', 'capta_y_vende'

ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
  snapshot_distribucion JSONB;
  -- Copia INMUTABLE de la distribución al momento de crear la venta
  -- {
  --   plantilla_id: "uuid",
  --   plantilla_nombre: "Asesor Senior",
  --   porcentaje_original: 42,
  --   monto_original: 2100,
  --   tipo_propiedad: "propiedad_lista",
  --   escenario: "capta_y_vende",
  --   config_completa: { ... }  -- Copia de plantilla.config
  -- }

ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
  monto_habilitado DECIMAL(15,2) DEFAULT 0;
  -- Cuánto está habilitado para pago (proporcional a cobros empresa)

ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
  es_override BOOLEAN DEFAULT false;
  -- true si el admin modificó manualmente la distribución

-- Campos CACHE (se recalculan pero se guardan para rendimiento)
-- monto_pagado ya existe, se mantiene como cache
-- estado ya existe, se actualiza automáticamente

-- Índice para tipo de participante
CREATE INDEX IF NOT EXISTS idx_comisiones_tipo_participante
  ON comisiones(tipo_participante);
```

### Migración 119: Campos cache en `ventas`

```sql
-- Campos CACHE para rendimiento (se recalculan con cada operación)
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
  cache_monto_cobrado DECIMAL(15,2) DEFAULT 0;
  -- SUM(ventas_cobros.monto) WHERE activo = true

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
  cache_porcentaje_cobrado DECIMAL(5,2) DEFAULT 0;
  -- (cache_monto_cobrado / monto_comision) * 100

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
  cache_monto_pagado_asesores DECIMAL(15,2) DEFAULT 0;
  -- SUM(pagos_comisiones.monto) para esta venta

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
  estado_cobro VARCHAR(50) DEFAULT 'pendiente';
  -- 'pendiente', 'parcial', 'cobrado'

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS
  estado_pagos VARCHAR(50) DEFAULT 'pendiente';
  -- 'pendiente', 'parcial', 'pagado'

-- Índices para filtros comunes
CREATE INDEX IF NOT EXISTS idx_ventas_estado_cobro ON ventas(estado_cobro);
CREATE INDEX IF NOT EXISTS idx_ventas_estado_pagos ON ventas(estado_pagos);
```

---

## FASE 2: Servicios Backend

### 2.1 Nuevo: `ventasCobrosService.ts`

```typescript
// Funciones principales:

// Registrar cobro de la empresa
async function registrarCobro(params: {
  tenantId: string;
  ventaId: string;
  monto: number;
  moneda: string;
  fechaCobro: Date;
  metodoPago?: string;
  referencia?: string;
  banco?: string;
  reciboUrl?: string;
  notas?: string;
  registradoPorId: string;
}): Promise<VentaCobro>

// Actualizar caches de la venta
async function actualizarCachesVenta(tenantId: string, ventaId: string): Promise<void>
// - Recalcula cache_monto_cobrado
// - Recalcula cache_porcentaje_cobrado
// - Actualiza estado_cobro
// - Habilita pagos proporcionales en comisiones

// Habilitar pagos a asesores proporcionalmente
async function habilitarPagosProporcionales(tenantId: string, ventaId: string): Promise<void>
// - Calcula porcentaje cobrado
// - Actualiza monto_habilitado en cada comisión
// - Envía notificaciones a asesores (futuro)

// Listar cobros de una venta
async function listarCobros(tenantId: string, ventaId: string): Promise<VentaCobro[]>

// Editar cobro
async function editarCobro(params: {...}): Promise<VentaCobro>

// Eliminar cobro (soft delete)
async function eliminarCobro(tenantId: string, cobroId: string, usuarioId: string): Promise<void>

// Recalcular desde cero (utility para correcciones)
async function recalcularTodosLosCaches(tenantId: string, ventaId: string): Promise<void>
```

### 2.2 Nuevo: `ventasHistorialService.ts`

```typescript
// Funciones principales:

// Registrar cambio en historial
async function registrarCambio(params: {
  tenantId: string;
  ventaId: string;
  tipoCambio: TipoCambio;
  entidad: 'venta' | 'cobro' | 'comision' | 'pago';
  entidadId?: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  descripcion: string;
  usuarioId: string;
  usuarioNombre: string;
}): Promise<void>

// Obtener historial de una venta
async function obtenerHistorial(
  tenantId: string,
  ventaId: string,
  opciones?: {
    limit?: number;
    offset?: number;
    tipos?: TipoCambio[];
  }
): Promise<HistorialItem[]>

// Tipos de cambio
type TipoCambio =
  | 'venta_creada'
  | 'venta_editada'
  | 'venta_cancelada'
  | 'cobro_registrado'
  | 'cobro_editado'
  | 'cobro_eliminado'
  | 'distribucion_creada'
  | 'distribucion_modificada'
  | 'pago_registrado'
  | 'pago_editado'
  | 'pago_eliminado';
```

### 2.3 Modificar: `comisionesService.ts`

```typescript
// MODIFICAR calcularYCrearComisiones para integrar plantillas

async function calcularYCrearComisiones(params: {
  tenantId: string;
  ventaId: string;
  montoComisionTotal: number;
  moneda: string;

  // Participantes de la venta
  participantes: {
    usuarioId: string;
    tipo: 'vendedor' | 'captador' | 'mentor' | 'referidor';
    // El porcentaje viene de su plantilla, pero puede ser override
    porcentajeOverride?: number;
  }[];

  // Contexto de la venta
  tipoPropiedad: 'propiedad_lista' | 'proyecto';

  // Usuario que registra
  registradoPorId: string;
}): Promise<Comision[]> {

  // 1. Determinar escenario
  const tieneVendedor = participantes.some(p => p.tipo === 'vendedor');
  const tieneCaptador = participantes.some(p => p.tipo === 'captador');
  const escenario = determinarEscenario(tieneVendedor, tieneCaptador);

  // 2. Para cada participante, obtener su plantilla y calcular
  const comisionesCrear = [];
  let porcentajeAcumulado = 0;

  for (const participante of participantes) {
    // Obtener plantilla del perfil del usuario
    const plantilla = await getPlantillaDeUsuario(tenantId, participante.usuarioId);

    // Calcular porcentaje según plantilla o usar override
    let porcentaje: number;
    let esOverride = false;

    if (participante.porcentajeOverride !== undefined) {
      porcentaje = participante.porcentajeOverride;
      esOverride = true;
    } else {
      porcentaje = obtenerPorcentajeDePlantilla(
        plantilla,
        participante.tipo,
        tipoPropiedad,
        escenario
      );
    }

    const monto = (montoComisionTotal * porcentaje) / 100;
    porcentajeAcumulado += porcentaje;

    // Crear snapshot INMUTABLE
    const snapshot = {
      plantilla_id: plantilla?.id,
      plantilla_nombre: plantilla?.nombre || 'Sin plantilla',
      porcentaje_original: porcentaje,
      monto_original: monto,
      tipo_propiedad: tipoPropiedad,
      escenario,
      fecha_snapshot: new Date().toISOString(),
      config_plantilla: plantilla?.config || null,
    };

    comisionesCrear.push({
      usuarioId: participante.usuarioId,
      tipoParticipante: participante.tipo,
      porcentaje,
      monto,
      escenario,
      snapshotDistribucion: snapshot,
      esOverride,
      montoHabilitado: 0, // Se habilita cuando empresa cobre
      estado: 'pendiente',
    });
  }

  // 3. Calcular parte de la empresa (lo que queda)
  const porcentajeEmpresa = 100 - porcentajeAcumulado;
  if (porcentajeEmpresa > 0) {
    comisionesCrear.push({
      usuarioId: null, // Empresa no tiene usuario
      tipoParticipante: 'empresa',
      porcentaje: porcentajeEmpresa,
      monto: (montoComisionTotal * porcentajeEmpresa) / 100,
      escenario,
      snapshotDistribucion: {
        porcentaje_original: porcentajeEmpresa,
        tipo: 'utilidad_empresa',
        fecha_snapshot: new Date().toISOString(),
      },
      esOverride: false,
      montoHabilitado: 0,
      estado: 'pendiente',
    });
  }

  // 4. Insertar comisiones en BD
  const comisionesCreadas = await insertarComisiones(tenantId, ventaId, comisionesCrear);

  // 5. Registrar en historial
  await registrarCambio({
    tenantId,
    ventaId,
    tipoCambio: 'distribucion_creada',
    entidad: 'comision',
    datosNuevos: { comisiones: comisionesCreadas },
    descripcion: `Distribución creada: ${comisionesCreadas.length} participantes`,
    usuarioId: registradoPorId,
  });

  return comisionesCreadas;
}

// Nueva función para modificar distribución (Admin)
async function modificarDistribucion(params: {
  tenantId: string;
  ventaId: string;
  nuevaDistribucion: {
    comisionId?: string;  // Si existe, modificar
    usuarioId?: string;   // Si es nueva
    tipoParticipante: string;
    porcentaje: number;
  }[];
  registradoPorId: string;
}): Promise<Comision[]> {

  // 1. Obtener distribución actual
  const distribucionActual = await getComisionesVenta(tenantId, ventaId);

  // 2. Validar que porcentajes sumen 100%
  const totalPorcentaje = nuevaDistribucion.reduce((sum, d) => sum + d.porcentaje, 0);
  if (Math.abs(totalPorcentaje - 100) > 0.01) {
    throw new Error(`Los porcentajes deben sumar 100%. Actual: ${totalPorcentaje}%`);
  }

  // 3. Obtener venta para recalcular montos
  const venta = await getVenta(tenantId, ventaId);

  // 4. Aplicar cambios
  for (const nueva of nuevaDistribucion) {
    const monto = (venta.monto_comision * nueva.porcentaje) / 100;

    if (nueva.comisionId) {
      // Modificar existente
      await updateComision(nueva.comisionId, {
        porcentaje: nueva.porcentaje,
        monto,
        esOverride: true,
      });
    } else {
      // Crear nueva
      await insertComision({
        tenantId,
        ventaId,
        usuarioId: nueva.usuarioId,
        tipoParticipante: nueva.tipoParticipante,
        porcentaje: nueva.porcentaje,
        monto,
        esOverride: true,
        snapshotDistribucion: {
          porcentaje_original: nueva.porcentaje,
          monto_original: monto,
          modificado_manualmente: true,
          fecha_snapshot: new Date().toISOString(),
        },
      });
    }
  }

  // 5. Recalcular montos habilitados
  await habilitarPagosProporcionales(tenantId, ventaId);

  // 6. Registrar en historial
  const distribucionNueva = await getComisionesVenta(tenantId, ventaId);
  await registrarCambio({
    tenantId,
    ventaId,
    tipoCambio: 'distribucion_modificada',
    entidad: 'comision',
    datosAnteriores: { comisiones: distribucionActual },
    datosNuevos: { comisiones: distribucionNueva },
    descripcion: 'Distribución modificada manualmente',
    usuarioId: registradoPorId,
  });

  return distribucionNueva;
}
```

### 2.4 Modificar: `pagosComisionesService.ts`

```typescript
// MODIFICAR registrarPago para validar y actualizar automáticamente

async function registrarPago(params: {
  tenantId: string;
  comisionId: string;
  monto: number;
  moneda: string;
  fechaPago: Date;
  tipoPago: 'anticipo' | 'parcial' | 'total';
  metodoPago?: string;
  referencia?: string;
  reciboUrl?: string;
  notas?: string;
  registradoPorId: string;
}): Promise<PagoComision> {

  // 1. Obtener comisión
  const comision = await getComision(params.comisionId);
  if (!comision) {
    throw new Error('Comisión no encontrada');
  }

  // 2. Validar que no exceda lo habilitado
  const disponible = comision.monto_habilitado - (comision.monto_pagado || 0);
  if (params.monto > disponible) {
    throw new Error(
      `Monto excede lo disponible. Habilitado: ${comision.monto_habilitado}, ` +
      `Ya pagado: ${comision.monto_pagado || 0}, Disponible: ${disponible}`
    );
  }

  // 3. Insertar pago
  const pago = await insertPago({
    ...params,
    ventaId: comision.venta_id,
  });

  // 4. Actualizar cache de comisión
  const totalPagado = await calcularTotalPagado(params.comisionId);

  let nuevoEstado: string;
  if (totalPagado === 0) {
    nuevoEstado = 'pendiente';
  } else if (totalPagado >= comision.monto) {
    nuevoEstado = 'pagado';
  } else {
    nuevoEstado = 'parcial';
  }

  await updateComision(params.comisionId, {
    monto_pagado: totalPagado,
    estado: nuevoEstado,
    fecha_pago: nuevoEstado === 'pagado' ? new Date() : null,
  });

  // 5. Actualizar cache de venta
  await actualizarCachePagosVenta(params.tenantId, comision.venta_id);

  // 6. Registrar en historial
  await registrarCambio({
    tenantId: params.tenantId,
    ventaId: comision.venta_id,
    tipoCambio: 'pago_registrado',
    entidad: 'pago',
    entidadId: pago.id,
    datosNuevos: pago,
    descripcion: `Pago de ${params.monto} ${params.moneda} a ${comision.tipo_participante}`,
    usuarioId: params.registradoPorId,
  });

  return pago;
}

// Actualizar cache de pagos en venta
async function actualizarCachePagosVenta(tenantId: string, ventaId: string): Promise<void> {
  const result = await query(`
    SELECT
      COALESCE(SUM(p.monto), 0) as total_pagado
    FROM pagos_comisiones p
    JOIN comisiones c ON p.comision_id = c.id
    WHERE c.venta_id = $1 AND c.tenant_id = $2 AND p.activo = true
  `, [ventaId, tenantId]);

  const totalPagado = result.rows[0]?.total_pagado || 0;

  // Obtener total de comisiones (excluyendo empresa)
  const totalComisiones = await query(`
    SELECT COALESCE(SUM(monto), 0) as total
    FROM comisiones
    WHERE venta_id = $1 AND tenant_id = $2
      AND tipo_participante != 'empresa'
      AND activo = true
  `, [ventaId, tenantId]);

  const montoTotalAsesores = totalComisiones.rows[0]?.total || 0;

  let estadoPagos: string;
  if (totalPagado === 0) {
    estadoPagos = 'pendiente';
  } else if (totalPagado >= montoTotalAsesores) {
    estadoPagos = 'pagado';
  } else {
    estadoPagos = 'parcial';
  }

  await query(`
    UPDATE ventas SET
      cache_monto_pagado_asesores = $1,
      estado_pagos = $2,
      updated_at = NOW()
    WHERE id = $3 AND tenant_id = $4
  `, [totalPagado, estadoPagos, ventaId, tenantId]);
}
```

---

## FASE 3: Rutas API

### 3.1 Nuevas rutas en `ventas.routes.ts`

```typescript
// ══════════════════════════════════════════════════════════
// COBROS DE EMPRESA
// ══════════════════════════════════════════════════════════

// Listar cobros de una venta
router.get('/:ventaId/cobros', requireAuth, async (req, res) => {
  const { tenantId, ventaId } = req.params;
  const cobros = await listarCobros(tenantId, ventaId);
  res.json(cobros);
});

// Registrar cobro
router.post('/:ventaId/cobros', requireAuth, async (req, res) => {
  const { tenantId, ventaId } = req.params;
  const { monto, moneda, fechaCobro, metodoPago, referencia, banco, reciboUrl, notas } = req.body;

  const cobro = await registrarCobro({
    tenantId,
    ventaId,
    monto,
    moneda,
    fechaCobro,
    metodoPago,
    referencia,
    banco,
    reciboUrl,
    notas,
    registradoPorId: req.auth.userId,
  });

  res.status(201).json(cobro);
});

// Editar cobro
router.put('/:ventaId/cobros/:cobroId', requireAuth, async (req, res) => {
  // ...
});

// Eliminar cobro
router.delete('/:ventaId/cobros/:cobroId', requireAuth, async (req, res) => {
  // ...
});

// ══════════════════════════════════════════════════════════
// DISTRIBUCIÓN DE COMISIONES
// ══════════════════════════════════════════════════════════

// Modificar distribución (Admin)
router.put('/:ventaId/distribucion', requireAuth, async (req, res) => {
  const { tenantId, ventaId } = req.params;
  const { distribucion } = req.body;

  const resultado = await modificarDistribucion({
    tenantId,
    ventaId,
    nuevaDistribucion: distribucion,
    registradoPorId: req.auth.userId,
  });

  res.json(resultado);
});

// ══════════════════════════════════════════════════════════
// HISTORIAL
// ══════════════════════════════════════════════════════════

// Obtener historial de cambios
router.get('/:ventaId/historial', requireAuth, async (req, res) => {
  const { tenantId, ventaId } = req.params;
  const { limit, offset, tipos } = req.query;

  const historial = await obtenerHistorial(tenantId, ventaId, {
    limit: parseInt(limit as string) || 50,
    offset: parseInt(offset as string) || 0,
    tipos: tipos ? (tipos as string).split(',') : undefined,
  });

  res.json(historial);
});

// ══════════════════════════════════════════════════════════
// VISTA ASESOR - MIS COMISIONES
// ══════════════════════════════════════════════════════════

// Obtener mis comisiones (para el asesor logueado)
router.get('/mis-comisiones', requireAuth, async (req, res) => {
  const { tenantId } = req.params;
  const usuarioId = req.usuarioId; // Del middleware de auth

  const comisiones = await getMisComisiones(tenantId, usuarioId, {
    estado: req.query.estado,
    limit: parseInt(req.query.limit as string) || 20,
    offset: parseInt(req.query.offset as string) || 0,
  });

  // Resumen
  const resumen = await getResumenMisComisiones(tenantId, usuarioId);

  res.json({
    comisiones,
    resumen: {
      totalProyectado: resumen.total_proyectado,
      totalHabilitado: resumen.total_habilitado,
      totalCobrado: resumen.total_cobrado,
      pendienteCobro: resumen.pendiente_cobro,
    }
  });
});
```

---

## FASE 4: Frontend

### 4.1 Modificar `CrmFinanzasVentaDetalle.tsx`

**Secciones a agregar:**

1. **Sección Cobros de Empresa**
   - Barra de progreso de cobro
   - Lista de cobros con fecha, monto, método
   - Botón "+ Registrar Cobro"
   - Modal para registrar/editar cobro

2. **Sección Distribución de Comisiones**
   - Tabla con participantes, %, monto, habilitado, pagado
   - Indicador visual de estado (pendiente/parcial/pagado)
   - Botón "Editar Distribución" (solo admin)
   - Modal para modificar distribución

3. **Sección Historial de Cambios**
   - Timeline de cambios
   - Filtros por tipo de cambio
   - Expandir para ver detalles

### 4.2 Nueva página `MisComisiones.tsx` (Vista Asesor)

```tsx
// Estructura de la página

export default function MisComisiones() {
  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4">
        <Card title="Por Cobrar" value={resumen.pendienteCobro} />
        <Card title="Habilitado" value={resumen.totalHabilitado} />
        <Card title="Cobrado" value={resumen.totalCobrado} />
        <Card title="Proyectado" value={resumen.totalProyectado} />
      </div>

      {/* Filtros */}
      <Filters estado={estado} onChange={setEstado} />

      {/* Lista de comisiones */}
      <Table>
        <thead>
          <tr>
            <th>Venta</th>
            <th>Propiedad</th>
            <th>Mi Comisión</th>
            <th>Disponible</th>
            <th>Cobrado</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {comisiones.map(c => (
            <tr key={c.id}>
              <td>{c.venta_numero}</td>
              <td>{c.propiedad_nombre}</td>
              <td>${c.monto}</td>
              <td>${c.monto_habilitado - c.monto_pagado}</td>
              <td>${c.monto_pagado}</td>
              <td><Badge status={c.estado} /></td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Nota explicativa */}
      <Note>
        * "Disponible" = Monto que la empresa ya cobró y puedes solicitar tu pago
      </Note>
    </div>
  );
}
```

---

## FASE 5: Tareas de Implementación

| # | Tarea | Prioridad | Dependencias |
|---|-------|-----------|--------------|
| **Backend - Migraciones** |
| 1 | Crear migración 116: `ventas_cobros` | Alta | - |
| 2 | Crear migración 117: `ventas_historial` | Alta | - |
| 3 | Crear migración 118: Modificar `comisiones` | Alta | - |
| 4 | Crear migración 119: Campos cache en `ventas` | Alta | - |
| **Backend - Servicios** |
| 5 | Crear `ventasCobrosService.ts` | Alta | 1 |
| 6 | Crear `ventasHistorialService.ts` | Alta | 2 |
| 7 | Modificar `comisionesService.ts` - integrar plantillas | Alta | 3, 4 |
| 8 | Modificar `pagosComisionesService.ts` - auto-actualizar | Alta | 3, 4 |
| **Backend - Rutas** |
| 9 | Agregar rutas de cobros en `ventas.routes.ts` | Alta | 5 |
| 10 | Agregar ruta de historial | Media | 6 |
| 11 | Agregar ruta modificar distribución | Alta | 7 |
| 12 | Agregar ruta mis-comisiones | Media | 7, 8 |
| **Frontend** |
| 13 | Modificar `CrmFinanzasVentaDetalle.tsx` - sección cobros | Alta | 9 |
| 14 | Modificar `CrmFinanzasVentaDetalle.tsx` - distribución editable | Alta | 11 |
| 15 | Agregar sección historial | Media | 10 |
| 16 | Crear `MisComisiones.tsx` | Media | 12 |
| **Testing** |
| 17 | Migrar datos existentes (si hay) | Alta | 1-4 |
| 18 | Probar flujo completo | Alta | 5-16 |

---

## Notas de Implementación

### Campos Cache vs Cálculo Dinámico

Los campos cache (`cache_monto_cobrado`, `cache_porcentaje_cobrado`, etc.) se actualizan:
- Al registrar/editar/eliminar un cobro
- Al registrar/editar/eliminar un pago
- Función `recalcularTodosLosCaches()` disponible para correcciones

### Snapshots Inmutables

Una vez creada la comisión, el `snapshot_distribucion` **NUNCA se modifica**. Si el admin cambia la distribución:
- Se marca `es_override = true`
- Se actualiza `porcentaje` y `monto`
- El snapshot original permanece para auditoría

### Permisos por Rol

- **Admin/Owner**: Ve todo, puede modificar distribución, registrar cobros/pagos
- **Asesor**: Solo ve sus comisiones, no puede modificar nada

### Notificaciones (Futuro)

Cuando se registra un cobro y se habilitan pagos:
- Enviar notificación push/email a asesores afectados
- "Tienes $X disponibles para cobro de la venta #123"

---

## Aprobación

- [ ] Plan revisado y aprobado
- [ ] Comenzar Fase 1 (Migraciones)
- [ ] Continuar con Fase 2 (Servicios)
- [ ] Continuar con Fase 3 (Rutas)
- [ ] Continuar con Fase 4 (Frontend)
- [ ] Testing final
