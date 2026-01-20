/**
 * Servicio de Cobros de Ventas
 *
 * Gestiona los cobros que hace la empresa (inmobiliaria) al cliente.
 * Separado de los pagos a asesores para mantener claridad contable.
 *
 * Flujo:
 * 1. Se registra un cobro de la empresa
 * 2. Se actualizan los caches de la venta (monto_cobrado, porcentaje_cobrado)
 * 3. Se habilitan pagos proporcionales a los asesores
 * 4. Se registra en el historial
 */

import { query } from '../utils/db.js';
import { registrarCambio } from './ventasHistorialService.js';

// ============================================
// TIPOS
// ============================================

export interface VentaCobro {
  id: string;
  tenant_id: string;
  venta_id: string;
  monto: number;
  moneda: string;
  fecha_cobro: Date;
  metodo_pago?: string;
  referencia?: string;
  banco?: string;
  recibo_url?: string;
  notas?: string;
  registrado_por_id?: string;
  registrado_por_nombre?: string;
  registrado_por_apellido?: string;
  fecha_registro: Date;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CrearCobroParams {
  tenantId: string;
  ventaId: string;
  monto: number;
  moneda?: string;
  fechaCobro: Date | string;
  metodoPago?: string;
  referencia?: string;
  banco?: string;
  reciboUrl?: string;
  notas?: string;
  registradoPorId: string;
  usuarioNombre?: string;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Registrar un cobro de la empresa
 */
export async function registrarCobro(params: CrearCobroParams): Promise<VentaCobro> {
  const {
    tenantId,
    ventaId,
    monto,
    moneda = 'USD',
    fechaCobro,
    metodoPago,
    referencia,
    banco,
    reciboUrl,
    notas,
    registradoPorId,
    usuarioNombre,
  } = params;

  // Validar que la venta existe
  const ventaResult = await query(
    `SELECT id, monto_comision, nombre_negocio FROM ventas WHERE id = $1 AND tenant_id = $2`,
    [ventaId, tenantId]
  );

  if (ventaResult.rows.length === 0) {
    throw new Error('Venta no encontrada');
  }

  const venta = ventaResult.rows[0];

  // Insertar cobro
  const result = await query(
    `INSERT INTO ventas_cobros (
      tenant_id, venta_id, monto, moneda, fecha_cobro,
      metodo_pago, referencia, banco, recibo_url, notas,
      registrado_por_id, fecha_registro
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    RETURNING *`,
    [
      tenantId, ventaId, monto, moneda, fechaCobro,
      metodoPago, referencia, banco, reciboUrl, notas,
      registradoPorId,
    ]
  );

  const cobro = result.rows[0];

  // Actualizar caches de la venta
  await actualizarCachesVenta(tenantId, ventaId);

  // Habilitar pagos proporcionales a asesores
  await habilitarPagosProporcionales(tenantId, ventaId);

  // Registrar en historial
  await registrarCambio({
    tenantId,
    ventaId,
    tipoCambio: 'cobro_registrado',
    entidad: 'cobro',
    entidadId: cobro.id,
    datosNuevos: cobro,
    descripcion: `Cobro registrado: ${monto} ${moneda} - ${venta.nombre_negocio}`,
    usuarioId: registradoPorId,
    usuarioNombre: usuarioNombre || '',
  });

  return cobro;
}

/**
 * Listar cobros de una venta
 */
export async function listarCobros(
  tenantId: string,
  ventaId: string
): Promise<VentaCobro[]> {
  const result = await query(
    `SELECT vc.*,
      u.nombre as registrado_por_nombre,
      u.apellido as registrado_por_apellido
    FROM ventas_cobros vc
    LEFT JOIN usuarios u ON vc.registrado_por_id = u.id
    WHERE vc.tenant_id = $1 AND vc.venta_id = $2 AND vc.activo = true
    ORDER BY vc.fecha_cobro DESC, vc.created_at DESC`,
    [tenantId, ventaId]
  );

  return result.rows;
}

/**
 * Obtener un cobro por ID
 */
export async function getCobro(
  tenantId: string,
  cobroId: string
): Promise<VentaCobro | null> {
  const result = await query(
    `SELECT vc.*,
      u.nombre as registrado_por_nombre,
      u.apellido as registrado_por_apellido
    FROM ventas_cobros vc
    LEFT JOIN usuarios u ON vc.registrado_por_id = u.id
    WHERE vc.tenant_id = $1 AND vc.id = $2`,
    [tenantId, cobroId]
  );

  return result.rows[0] || null;
}

/**
 * Editar un cobro
 */
export async function editarCobro(params: {
  tenantId: string;
  cobroId: string;
  monto?: number;
  moneda?: string;
  fechaCobro?: Date | string;
  metodoPago?: string;
  referencia?: string;
  banco?: string;
  reciboUrl?: string;
  notas?: string;
  usuarioId: string;
  usuarioNombre?: string;
}): Promise<VentaCobro> {
  const {
    tenantId, cobroId, monto, moneda, fechaCobro,
    metodoPago, referencia, banco, reciboUrl, notas,
    usuarioId, usuarioNombre,
  } = params;

  // Obtener cobro actual
  const cobroActual = await getCobro(tenantId, cobroId);
  if (!cobroActual) {
    throw new Error('Cobro no encontrado');
  }

  // Construir actualización
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (monto !== undefined) {
    updates.push(`monto = $${paramIndex++}`);
    values.push(monto);
  }
  if (moneda !== undefined) {
    updates.push(`moneda = $${paramIndex++}`);
    values.push(moneda);
  }
  if (fechaCobro !== undefined) {
    updates.push(`fecha_cobro = $${paramIndex++}`);
    values.push(fechaCobro);
  }
  if (metodoPago !== undefined) {
    updates.push(`metodo_pago = $${paramIndex++}`);
    values.push(metodoPago);
  }
  if (referencia !== undefined) {
    updates.push(`referencia = $${paramIndex++}`);
    values.push(referencia);
  }
  if (banco !== undefined) {
    updates.push(`banco = $${paramIndex++}`);
    values.push(banco);
  }
  if (reciboUrl !== undefined) {
    updates.push(`recibo_url = $${paramIndex++}`);
    values.push(reciboUrl);
  }
  if (notas !== undefined) {
    updates.push(`notas = $${paramIndex++}`);
    values.push(notas);
  }

  updates.push(`updated_at = NOW()`);

  values.push(cobroId);
  values.push(tenantId);

  const result = await query(
    `UPDATE ventas_cobros SET ${updates.join(', ')}
    WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
    RETURNING *`,
    values
  );

  const cobroActualizado = result.rows[0];

  // Actualizar caches de la venta
  await actualizarCachesVenta(tenantId, cobroActual.venta_id);

  // Habilitar pagos proporcionales
  await habilitarPagosProporcionales(tenantId, cobroActual.venta_id);

  // Registrar en historial
  await registrarCambio({
    tenantId,
    ventaId: cobroActual.venta_id,
    tipoCambio: 'cobro_editado',
    entidad: 'cobro',
    entidadId: cobroId,
    datosAnteriores: cobroActual,
    datosNuevos: cobroActualizado,
    descripcion: `Cobro editado: ${cobroActualizado.monto} ${cobroActualizado.moneda}`,
    usuarioId,
    usuarioNombre: usuarioNombre || '',
  });

  return cobroActualizado;
}

/**
 * Eliminar un cobro (soft delete)
 */
export async function eliminarCobro(
  tenantId: string,
  cobroId: string,
  usuarioId: string,
  usuarioNombre?: string
): Promise<void> {
  // Obtener cobro actual
  const cobroActual = await getCobro(tenantId, cobroId);
  if (!cobroActual) {
    throw new Error('Cobro no encontrado');
  }

  // Soft delete
  await query(
    `UPDATE ventas_cobros SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2`,
    [cobroId, tenantId]
  );

  // Actualizar caches de la venta
  await actualizarCachesVenta(tenantId, cobroActual.venta_id);

  // Actualizar montos habilitados
  await habilitarPagosProporcionales(tenantId, cobroActual.venta_id);

  // Registrar en historial
  await registrarCambio({
    tenantId,
    ventaId: cobroActual.venta_id,
    tipoCambio: 'cobro_eliminado',
    entidad: 'cobro',
    entidadId: cobroId,
    datosAnteriores: cobroActual,
    descripcion: `Cobro eliminado: ${cobroActual.monto} ${cobroActual.moneda}`,
    usuarioId,
    usuarioNombre: usuarioNombre || '',
  });
}

// ============================================
// FUNCIONES DE CÁLCULO
// ============================================

/**
 * Actualizar caches de la venta
 * Se llama después de registrar/editar/eliminar un cobro
 */
export async function actualizarCachesVenta(
  tenantId: string,
  ventaId: string
): Promise<void> {
  // Calcular total cobrado
  const cobrosResult = await query(
    `SELECT COALESCE(SUM(monto), 0) as total_cobrado
    FROM ventas_cobros
    WHERE tenant_id = $1 AND venta_id = $2 AND activo = true`,
    [tenantId, ventaId]
  );

  const totalCobrado = parseFloat(cobrosResult.rows[0]?.total_cobrado || 0);

  // Obtener monto_comision de la venta
  const ventaResult = await query(
    `SELECT monto_comision FROM ventas WHERE id = $1 AND tenant_id = $2`,
    [ventaId, tenantId]
  );

  const montoComision = parseFloat(ventaResult.rows[0]?.monto_comision || 0);

  // Calcular porcentaje cobrado
  const porcentajeCobrado = montoComision > 0
    ? Math.round((totalCobrado / montoComision) * 10000) / 100
    : 0;

  // Determinar estado de cobro
  let estadoCobro: string;
  if (totalCobrado === 0) {
    estadoCobro = 'pendiente';
  } else if (totalCobrado >= montoComision) {
    estadoCobro = 'cobrado';
  } else {
    estadoCobro = 'parcial';
  }

  // Actualizar venta
  await query(
    `UPDATE ventas SET
      cache_monto_cobrado = $1,
      cache_porcentaje_cobrado = $2,
      estado_cobro = $3,
      updated_at = NOW()
    WHERE id = $4 AND tenant_id = $5`,
    [totalCobrado, porcentajeCobrado, estadoCobro, ventaId, tenantId]
  );
}

/**
 * Habilitar pagos proporcionales a asesores
 * Cuando la empresa cobra, se habilita proporcionalmente para pago a asesores
 */
export async function habilitarPagosProporcionales(
  tenantId: string,
  ventaId: string
): Promise<void> {
  // Obtener venta con caches actualizados
  const ventaResult = await query(
    `SELECT monto_comision, cache_monto_cobrado, cache_porcentaje_cobrado
    FROM ventas WHERE id = $1 AND tenant_id = $2`,
    [ventaId, tenantId]
  );

  if (ventaResult.rows.length === 0) return;

  const venta = ventaResult.rows[0];
  const porcentajeCobrado = parseFloat(venta.cache_porcentaje_cobrado || 0) / 100;

  // Obtener comisiones de la venta (excluyendo empresa/owner)
  const comisionesResult = await query(
    `SELECT id, monto FROM comisiones
    WHERE tenant_id = $1 AND venta_id = $2
      AND (datos_extra->>'split' IS NULL OR datos_extra->>'split' NOT IN ('empresa', 'owner'))
      AND activo = true`,
    [tenantId, ventaId]
  );

  // Actualizar monto_habilitado de cada comisión
  for (const comision of comisionesResult.rows) {
    const montoHabilitado = Math.round(parseFloat(comision.monto) * porcentajeCobrado * 100) / 100;

    await query(
      `UPDATE comisiones SET
        monto_habilitado = $1,
        updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3`,
      [montoHabilitado, comision.id, tenantId]
    );
  }
}

/**
 * Recalcular todos los caches de una venta
 * Utility para correcciones manuales
 */
export async function recalcularTodosLosCaches(
  tenantId: string,
  ventaId: string
): Promise<void> {
  // Recalcular caches de cobro
  await actualizarCachesVenta(tenantId, ventaId);

  // Recalcular montos habilitados
  await habilitarPagosProporcionales(tenantId, ventaId);

  // Recalcular cache de pagos a asesores
  const pagosResult = await query(
    `SELECT COALESCE(SUM(p.monto), 0) as total_pagado
    FROM pagos_comisiones p
    JOIN comisiones c ON p.comision_id = c.id
    WHERE c.venta_id = $1 AND c.tenant_id = $2`,
    [ventaId, tenantId]
  );

  const totalPagado = parseFloat(pagosResult.rows[0]?.total_pagado || 0);

  // Calcular total de comisiones a asesores
  const comisionesResult = await query(
    `SELECT COALESCE(SUM(monto), 0) as total
    FROM comisiones
    WHERE venta_id = $1 AND tenant_id = $2
      AND tipo_participante != 'empresa'
      AND activo = true`,
    [ventaId, tenantId]
  );

  const totalComisiones = parseFloat(comisionesResult.rows[0]?.total || 0);

  // Determinar estado de pagos
  let estadoPagos: string;
  if (totalPagado === 0) {
    estadoPagos = 'pendiente';
  } else if (totalPagado >= totalComisiones) {
    estadoPagos = 'pagado';
  } else {
    estadoPagos = 'parcial';
  }

  // Actualizar venta
  await query(
    `UPDATE ventas SET
      cache_monto_pagado_asesores = $1,
      estado_pagos = $2,
      updated_at = NOW()
    WHERE id = $3 AND tenant_id = $4`,
    [totalPagado, estadoPagos, ventaId, tenantId]
  );
}

/**
 * Obtener resumen de cobros de una venta
 */
export async function getResumenCobros(
  tenantId: string,
  ventaId: string
): Promise<{
  totalComision: number;
  totalCobrado: number;
  porcentajeCobrado: number;
  pendienteCobrar: number;
  estadoCobro: string;
  cantidadCobros: number;
}> {
  const result = await query(
    `SELECT
      v.monto_comision as total_comision,
      v.cache_monto_cobrado as total_cobrado,
      v.cache_porcentaje_cobrado as porcentaje_cobrado,
      v.estado_cobro,
      (SELECT COUNT(*) FROM ventas_cobros vc WHERE vc.venta_id = v.id AND vc.activo = true) as cantidad_cobros
    FROM ventas v
    WHERE v.id = $1 AND v.tenant_id = $2`,
    [ventaId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new Error('Venta no encontrada');
  }

  const row = result.rows[0];
  const totalComision = parseFloat(row.total_comision || 0);
  const totalCobrado = parseFloat(row.total_cobrado || 0);

  return {
    totalComision,
    totalCobrado,
    porcentajeCobrado: parseFloat(row.porcentaje_cobrado || 0),
    pendienteCobrar: totalComision - totalCobrado,
    estadoCobro: row.estado_cobro || 'pendiente',
    cantidadCobros: parseInt(row.cantidad_cobros || 0),
  };
}
