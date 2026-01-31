# Análisis y Plan de Refactorización: Sistema de Ventas, Cobros y Comisiones

## Resumen Ejecutivo

Después de analizar la arquitectura actual, he identificado varios problemas fundamentales que causan inconsistencias y dificultan el flujo correcto. Este documento presenta el diagnóstico completo y un plan de refactorización.

---

## 1. Diagnóstico: Problemas Actuales

### 1.1 Error Conceptual Crítico: Confusión Valor vs Comisión

**El problema más grave:**
- `cache_porcentaje_cobrado` se calculaba como: `(cache_monto_cobrado / monto_comision) × 100`
- Pero `cache_monto_cobrado` viene de `ventas_cobros` (lo que paga el CLIENTE)
- Y `monto_comision` es la comisión (ej: 5% del valor)

**Ejemplo del error:**
- Venta de $100,000 USD
- Comisión: 5% = $5,000
- Cliente paga primer cobro: $50,000 (50% del VALOR)
- El sistema calculaba: (50,000 / 5,000) × 100 = **1000%** (¡absurdo!)

**Corrección:** El porcentaje cobrado debe ser sobre el VALOR de la venta, no sobre la comisión.

### 1.2 Duplicación de Campos en `ventas`

La tabla `ventas` tiene campos legacy mezclados con campos nuevos:

| Campo Legacy | Campo Nuevo | Problema |
|--------------|-------------|----------|
| `estado_comision` | N/A | Obsoleto, se usaba antes de crear tabla `comisiones` |
| `monto_comision_pagado` | `cache_monto_pagado_asesores` | Duplicación |
| `fecha_pago_comision` | En `pagos_comisiones` | Inútil si hay pagos parciales |

### 1.3 Snapshot de Distribución Disperso

El snapshot está en `comisiones.snapshot_distribucion` (uno por participante), pero debería haber **uno solo por venta** que capture la distribución completa al momento del cierre.

### 1.4 Falta de Tabla de Distribución Explícita

No hay una tabla que diga claramente:
- "Esta venta tiene estos participantes con estos porcentajes"
- Separado de los montos calculados y pagados

### 1.5 Cancelación Sin Cascada

Cuando se cancela una venta:
- ❌ No se actualizan metas de productividad
- ❌ No se marcan cobros como inválidos
- ❌ No hay reversión clara de pagos (si los hubo)

---

## 2. Arquitectura Propuesta

### 2.1 Modelo de Datos Limpio

```
┌─────────────────────────────────────────────────────────────────────┐
│                              VENTAS                                  │
│─────────────────────────────────────────────────────────────────────│
│ Datos del cierre + CACHE fields calculados automáticamente         │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ VENTAS_COBROS   │       │ VENTA_DISTRIB.  │       │ VENTAS_HISTORIAL│
│─────────────────│       │─────────────────│       │─────────────────│
│ Pagos del       │       │ Snapshot de     │       │ Audit log       │
│ cliente →       │       │ distribución    │       │ completo        │
│ empresa         │       │ (INMUTABLE)     │       │                 │
└─────────────────┘       └────────┬────────┘       └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   COMISIONES    │
                          │─────────────────│
                          │ Por participante│
                          │ con estado/pago │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │PAGOS_COMISIONES │
                          │─────────────────│
                          │ Cada pago a un  │
                          │ participante    │
                          └─────────────────┘
```

### 2.2 Flujo de Datos

```
CIERRE DE VENTA
    │
    ├──► valor_cierre = $100,000
    ├──► porcentaje_comision = 5%
    ├──► monto_comision = $5,000 (calculado)
    │
    └──► CREAR venta_distribucion (snapshot frozen)
         │
         └──► CREAR comisiones (1 por participante)
              ├── Vendedor: 50% de $5,000 = $2,500
              ├── Captador: 20% de $5,000 = $1,000
              └── Empresa: 30% de $5,000 = $1,500

COBRO #1 (Cliente paga 50% = $50,000)
    │
    ├──► INSERT INTO ventas_cobros (monto: 50000)
    ├──► UPDATE ventas.cache_monto_cobrado = 50000
    ├──► UPDATE ventas.cache_porcentaje_cobrado = 50%
    ├──► UPDATE ventas.estado_cobro = 'parcial'
    │
    └──► ACTUALIZAR comisiones.monto_habilitado (proporcional)
         ├── Vendedor: 50% de $2,500 = $1,250 habilitado
         ├── Captador: 50% de $1,000 = $500 habilitado
         └── Empresa: 50% de $1,500 = $750 habilitado

PAGO #1 (Pagamos al vendedor $1,000)
    │
    ├──► Verificar: $1,000 <= $1,250 (habilitado) ✓
    ├──► INSERT INTO pagos_comisiones
    ├──► UPDATE comision.monto_pagado = 1000
    ├──► UPDATE comision.estado = 'parcial'
    │
    └──► UPDATE ventas.cache_monto_pagado_asesores
```

---

## 3. Cambios en Base de Datos

### 3.1 Limpiar tabla `ventas`

```sql
-- Campos a DEPRECAR (no eliminar aún, marcar como obsoletos):
-- estado_comision, monto_comision_pagado, fecha_pago_comision, notas_comision

-- Campos CACHE que se mantienen (pero con cálculo corregido):
-- cache_monto_cobrado: SUM(ventas_cobros.monto) WHERE activo = true
-- cache_porcentaje_cobrado: (cache_monto_cobrado / valor_cierre) * 100  <-- CORREGIDO
-- cache_monto_pagado_asesores: SUM(pagos_comisiones.monto)
-- estado_cobro: pendiente | parcial | cobrado
-- estado_pagos: pendiente | parcial | pagado

-- Agregar campo:
-- cache_comision_disponible: Proporcional a lo cobrado
```

### 3.2 Crear tabla `venta_distribucion`

```sql
CREATE TABLE venta_distribucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,

  -- Snapshot inmutable de la configuración usada
  plantilla_id UUID REFERENCES catalogos(id),  -- La plantilla usada
  tipo_propiedad VARCHAR(50),  -- lista, proyecto
  escenario VARCHAR(50),  -- solo_capta, solo_vende, capta_y_vende

  -- Snapshot completo de la distribución
  distribucion_snapshot JSONB NOT NULL,
  /* Ejemplo:
  {
    "porcentaje_comision": 5,
    "monto_comision_total": 5000,
    "participantes": [
      {"usuario_id": "...", "rol": "vendedor", "porcentaje": 50, "monto": 2500},
      {"usuario_id": "...", "rol": "captador", "porcentaje": 20, "monto": 1000},
      {"rol": "empresa", "porcentaje": 30, "monto": 1500}
    ],
    "fees_aplicados": [
      {"rol": "mentor", "porcentaje": 5, "monto": 250}
    ]
  }
  */

  -- Control
  es_override BOOLEAN DEFAULT false,  -- Si admin modificó manualmente
  override_por_id UUID REFERENCES usuarios(id),
  override_fecha TIMESTAMP,
  override_razon TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(venta_id)  -- Solo una distribución por venta
);

CREATE INDEX idx_venta_distribucion_venta ON venta_distribucion(venta_id);
CREATE INDEX idx_venta_distribucion_tenant ON venta_distribucion(tenant_id);
```

### 3.3 Modificar tabla `comisiones`

```sql
-- Ya tiene la mayoría de campos necesarios. Agregar/ajustar:

-- Asegurar que monto_habilitado se calcula correctamente
-- Agregar campo para tracking
ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
  venta_distribucion_id UUID REFERENCES venta_distribucion(id);

-- Campo activo si no existe
ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
  activo BOOLEAN DEFAULT true;
```

### 3.4 Agregar campo `activo` a `pagos_comisiones`

```sql
ALTER TABLE pagos_comisiones ADD COLUMN IF NOT EXISTS
  activo BOOLEAN DEFAULT true;
```

---

## 4. Servicios Backend

### 4.1 Servicio: `ventasCobrosService.ts`

```typescript
// Funciones:
registrarCobro(tenantId, ventaId, data) {
  // 1. Validar que venta existe y no está cancelada
  // 2. Validar monto <= valor_cierre - cache_monto_cobrado
  // 3. INSERT ventas_cobros
  // 4. Recalcular caches de venta
  // 5. Actualizar monto_habilitado en todas las comisiones
  // 6. Registrar en ventas_historial
}

recalcularCachesVenta(tenantId, ventaId) {
  // Recalcula todos los caches de una venta
  // Útil para sincronización o corrección
}
```

### 4.2 Servicio: `pagosComisionesService.ts`

```typescript
registrarPago(tenantId, comisionId, data) {
  // 1. Obtener comision con venta asociada
  // 2. Validar monto <= monto_habilitado - monto_pagado
  // 3. INSERT pagos_comisiones
  // 4. UPDATE comision.monto_pagado, estado
  // 5. Recalcular cache_monto_pagado_asesores en venta
  // 6. Registrar en ventas_historial
}

getFondosDisponibles(tenantId, ventaId) {
  // Retorna cuánto hay disponible para pagar por participante
}
```

### 4.3 Servicio: `distribucionService.ts`

```typescript
crearDistribucion(tenantId, ventaId, participantes, plantillaId?) {
  // 1. Validar que no existan cobros/pagos
  // 2. INSERT venta_distribucion
  // 3. INSERT/UPDATE comisiones para cada participante
}

modificarDistribucion(tenantId, ventaId, nuevaDistribucion, razon) {
  // 1. Validar que no existan pagos (cobros OK si se ajusta)
  // 2. UPDATE venta_distribucion (marcar override)
  // 3. UPDATE comisiones
  // 4. Registrar en ventas_historial
}
```

### 4.4 Servicio: `ventasCancelacionService.ts`

```typescript
cancelarVenta(tenantId, ventaId, razon, usuarioId) {
  // Transacción:
  // 1. UPDATE venta: cancelada = true
  // 2. Soft-delete cobros: activo = false
  // 3. Soft-delete comisiones: activo = false
  // 4. Soft-delete pagos: activo = false
  // 5. Actualizar metas/productividad afectadas
  // 6. Registrar todo en ventas_historial
}

reactivarVenta(tenantId, ventaId, usuarioId) {
  // Proceso inverso (con validaciones)
}
```

---

## 5. Corrección del Cálculo de Caches

### Antes (INCORRECTO):
```sql
cache_porcentaje_cobrado = (cache_monto_cobrado / monto_comision) * 100
```

### Después (CORRECTO):
```sql
cache_porcentaje_cobrado = (cache_monto_cobrado / valor_cierre) * 100
cache_comision_disponible = (cache_porcentaje_cobrado / 100) * monto_comision
```

### Trigger/Función para recálculo:
```sql
CREATE OR REPLACE FUNCTION recalcular_caches_venta(p_venta_id UUID)
RETURNS void AS $$
DECLARE
  v_valor_cierre DECIMAL(15,2);
  v_monto_comision DECIMAL(15,2);
  v_monto_cobrado DECIMAL(15,2);
  v_porcentaje_cobrado DECIMAL(5,2);
  v_comision_disponible DECIMAL(15,2);
  v_monto_pagado DECIMAL(15,2);
BEGIN
  -- Obtener valores de la venta
  SELECT valor_cierre, monto_comision
  INTO v_valor_cierre, v_monto_comision
  FROM ventas WHERE id = p_venta_id;

  -- Calcular monto cobrado
  SELECT COALESCE(SUM(monto), 0)
  INTO v_monto_cobrado
  FROM ventas_cobros
  WHERE venta_id = p_venta_id AND activo = true;

  -- Calcular porcentaje cobrado (sobre VALOR, no comisión)
  v_porcentaje_cobrado := CASE
    WHEN v_valor_cierre > 0 THEN ROUND((v_monto_cobrado / v_valor_cierre) * 100, 2)
    ELSE 0
  END;

  -- Calcular comisión disponible (proporcional)
  v_comision_disponible := ROUND((v_porcentaje_cobrado / 100) * v_monto_comision, 2);

  -- Calcular pagos realizados
  SELECT COALESCE(SUM(p.monto), 0)
  INTO v_monto_pagado
  FROM pagos_comisiones p
  JOIN comisiones c ON p.comision_id = c.id
  WHERE c.venta_id = p_venta_id AND p.activo = true;

  -- Actualizar venta
  UPDATE ventas SET
    cache_monto_cobrado = v_monto_cobrado,
    cache_porcentaje_cobrado = v_porcentaje_cobrado,
    cache_comision_disponible = v_comision_disponible,
    cache_monto_pagado_asesores = v_monto_pagado,
    estado_cobro = CASE
      WHEN v_monto_cobrado = 0 THEN 'pendiente'
      WHEN v_monto_cobrado >= v_valor_cierre THEN 'cobrado'
      ELSE 'parcial'
    END,
    estado_pagos = CASE
      WHEN v_monto_pagado = 0 THEN 'pendiente'
      WHEN v_monto_pagado >= v_comision_disponible THEN 'pagado'
      ELSE 'parcial'
    END,
    updated_at = NOW()
  WHERE id = p_venta_id;

  -- Actualizar monto_habilitado en comisiones
  UPDATE comisiones SET
    monto_habilitado = ROUND((v_porcentaje_cobrado / 100) * monto, 2),
    updated_at = NOW()
  WHERE venta_id = p_venta_id AND activo = true;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Cambios en UI/Frontend

### 6.1 Lista de Ventas (`CrmFinanzasVentas.tsx`)

**Columnas actualizadas:**
| Columna | Muestra | Acción |
|---------|---------|--------|
| Valor | `valor_cierre` + moneda | - |
| Cobrado | `cache_monto_cobrado` / `valor_cierre` (%) | Botón "Registrar Cobro" |
| Comisión | `monto_comision` | - |
| Disponible | `cache_comision_disponible` | - |
| Pagado | `cache_monto_pagado_asesores` | - |
| Estado | Badge cobro + Badge pagos | - |

**Modal "Registrar Cobro":**
- Monto pendiente = `valor_cierre` - `cache_monto_cobrado`
- Validar que monto <= pendiente
- Fecha, método, referencia, notas

### 6.2 Lista de Comisiones

**Cada fila muestra:**
- Venta asociada
- Participante (nombre, rol)
- Monto total de su comisión
- Monto habilitado (proporcional a cobros)
- Monto pagado
- Monto pendiente de pago
- Botón "Pagar" (si hay disponible)

**Modal "Registrar Pago":**
- Monto máximo = `monto_habilitado` - `monto_pagado`
- Fecha, notas, recibo

### 6.3 Detalle de Venta

**Secciones:**
1. **Datos del Cierre** - Información básica
2. **Cobros Registrados** - Lista de cobros + botón agregar
3. **Distribución de Comisión** - Tabla de participantes con %
4. **Pagos Realizados** - Lista de pagos por participante
5. **Historial** - Timeline de cambios

---

## 7. Orden de Implementación

### Fase 1: Base de Datos (1-2 días)
1. Crear migración para agregar `cache_comision_disponible` a ventas
2. Crear migración para tabla `venta_distribucion`
3. Crear migración para agregar `activo` a `comisiones` y `pagos_comisiones`
4. Crear función SQL `recalcular_caches_venta`
5. Ejecutar corrección de datos existentes

### Fase 2: Backend Services (2-3 días)
1. Crear `ventasCobrosService.ts` con lógica correcta
2. Modificar endpoint de cobros para usar nuevo servicio
3. Crear `pagosComisionesService.ts`
4. Crear `distribucionService.ts`
5. Crear `ventasCancelacionService.ts`

### Fase 3: Frontend (2-3 días)
1. Corregir modal de cobros (usar valor_cierre, no monto_comision)
2. Agregar columna "Disponible" a lista de ventas
3. Mejorar lista de comisiones con botón de pago
4. Agregar sección de distribución en detalle de venta
5. Mostrar historial de cambios

### Fase 4: Integraciones (1-2 días)
1. Conectar cancelación con metas/productividad
2. Agregar webhooks/eventos para notificaciones
3. Testing end-to-end

---

## 8. Reglas de Negocio Claras

1. **Cobro**: Solo se puede cobrar hasta `valor_cierre`
2. **Pago**: Solo se puede pagar hasta `monto_habilitado - monto_pagado`
3. **Distribución**: Solo se puede cambiar si no hay pagos registrados
4. **Cancelación**: Marca todo como inactivo, no elimina
5. **Reactivación**: Solo posible si no han pasado 30 días
6. **Snapshot**: La distribución original NUNCA se modifica, solo se marca como override

---

## 9. Verificación de Integridad

Query para detectar inconsistencias:
```sql
SELECT
  v.id,
  v.valor_cierre,
  v.monto_comision,
  v.cache_monto_cobrado,
  v.cache_porcentaje_cobrado,
  -- Recálculo correcto
  ROUND((v.cache_monto_cobrado / NULLIF(v.valor_cierre, 0)) * 100, 2) as porcentaje_correcto,
  -- Diferencia
  v.cache_porcentaje_cobrado - ROUND((v.cache_monto_cobrado / NULLIF(v.valor_cierre, 0)) * 100, 2) as diferencia
FROM ventas v
WHERE v.cache_monto_cobrado > 0
  AND v.cache_porcentaje_cobrado != ROUND((v.cache_monto_cobrado / NULLIF(v.valor_cierre, 0)) * 100, 2);
```

---

## 10. Resumen de Cambios

| Componente | Antes | Después |
|------------|-------|---------|
| Cálculo % cobrado | `cobrado / comision` | `cobrado / valor_cierre` |
| Distribución | Dispersa en comisiones | Centralizada en venta_distribucion |
| Cancelación | Solo marca venta | Cascada a cobros, comisiones, pagos, metas |
| Monto habilitado | Calculado ad-hoc | Cache en comisiones, proporcional a cobros |
| Historial | Parcial | Completo con datos antes/después |

---

**Fecha:** 2026-01-31
**Autor:** Claude (Análisis de arquitectura)
**Estado:** Pendiente de aprobación
