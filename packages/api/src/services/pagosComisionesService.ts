/**
 * Servicio de Pagos de Comisiones
 *
 * Gestiona los pagos aplicados a las comisiones de asesores.
 *
 * FLUJO:
 * 1. La empresa cobra al cliente (ventas_cobros)
 * 2. Se habilitan montos proporcionales para pago a asesores (monto_habilitado en comisiones)
 * 3. Se registran pagos a asesores (pagos_comisiones) - este servicio
 *
 * VALIDACIONES:
 * - No se puede pagar más del monto_habilitado
 * - Se actualiza automáticamente el estado de la comisión
 * - Se registra en el historial de la venta
 */

import { query } from '../utils/db.js';
import * as ventasHistorialService from './ventasHistorialService.js';

export interface PagoComision {
  id: string;
  tenant_id: string;
  venta_id: string | null;
  comision_id: string | null;
  monto: number;
  moneda: string;
  tipo_pago: string; // 'parcial', 'total', 'anticipo', 'final'
  fecha_pago: Date;
  fecha_registro: Date;
  notas: string | null;
  recibo_url: string | null;
  registrado_por_id: string | null;
  distribucion: any; // JSONB con distribución del pago
  created_at: Date;
  updated_at: Date;
  
  // Relaciones
  venta?: any;
  comision?: any;
  registrado_por?: any;
}

export interface CreatePagoComisionData {
  venta_id?: string | null;
  comision_id?: string | null;
  monto: number;
  moneda?: string;
  tipo_pago: string;
  fecha_pago: Date | string;
  notas?: string | null;
  recibo_url?: string | null;
  registrado_por_id?: string | null;
  distribucion?: any;
}

export interface PagoComisionFiltros {
  ventaId?: string;
  comisionId?: string;
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
  tipoPago?: string;
}

/**
 * Obtener pagos de comisiones
 */
export async function getPagosComisiones(
  tenantId: string,
  filtros?: PagoComisionFiltros
): Promise<PagoComision[]> {
  let sql = `
    SELECT 
      p.*,
      v.numero_venta,
      v.nombre_negocio,
      c.monto as comision_monto,
      u.nombre as registrado_por_nombre,
      u.apellido as registrado_por_apellido
    FROM pagos_comisiones p
    LEFT JOIN ventas v ON p.venta_id = v.id
    LEFT JOIN comisiones c ON p.comision_id = c.id
    LEFT JOIN usuarios u ON p.registrado_por_id = u.id
    WHERE p.tenant_id = $1
  `;

  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filtros) {
    if (filtros.ventaId) {
      sql += ` AND p.venta_id = $${paramIndex}`;
      params.push(filtros.ventaId);
      paramIndex++;
    }

    if (filtros.comisionId) {
      sql += ` AND p.comision_id = $${paramIndex}`;
      params.push(filtros.comisionId);
      paramIndex++;
    }

    if (filtros.fechaDesde) {
      sql += ` AND p.fecha_pago >= $${paramIndex}`;
      params.push(filtros.fechaDesde);
      paramIndex++;
    }

    if (filtros.fechaHasta) {
      sql += ` AND p.fecha_pago <= $${paramIndex}`;
      params.push(filtros.fechaHasta);
      paramIndex++;
    }

    if (filtros.tipoPago) {
      sql += ` AND p.tipo_pago = $${paramIndex}`;
      params.push(filtros.tipoPago);
      paramIndex++;
    }
  }

  sql += ` ORDER BY p.fecha_registro DESC, p.fecha_pago DESC`;

  const result = await query(sql, params);

  return result.rows.map(row => ({
    ...row,
    distribucion: typeof row.distribucion === 'string' ? JSON.parse(row.distribucion) : row.distribucion,
    venta: row.venta_id ? {
      id: row.venta_id,
      numero_venta: row.numero_venta,
      nombre_negocio: row.nombre_negocio,
    } : null,
    comision: row.comision_id ? {
      id: row.comision_id,
      monto: row.comision_monto,
    } : null,
    registrado_por: row.registrado_por_id ? {
      id: row.registrado_por_id,
      nombre: row.registrado_por_nombre,
      apellido: row.registrado_por_apellido,
    } : null,
  }));
}

/**
 * Obtener pagos de una venta específica
 */
export async function getPagosByVenta(
  tenantId: string,
  ventaId: string
): Promise<PagoComision[]> {
  return getPagosComisiones(tenantId, { ventaId });
}

/**
 * Obtener pagos de una comisión específica
 */
export async function getPagosByComision(
  tenantId: string,
  comisionId: string
): Promise<PagoComision[]> {
  return getPagosComisiones(tenantId, { comisionId });
}

/**
 * Validar que el pago no exceda el monto disponible
 */
async function validarMontoDisponible(
  tenantId: string,
  comisionId: string,
  montoAPagar: number
): Promise<{ valido: boolean; disponible: number; mensaje?: string }> {
  // Obtener la comisión con su monto_habilitado y pagos existentes
  const sql = `
    SELECT
      c.id,
      c.monto,
      c.monto_habilitado,
      c.estado,
      c.usuario_id,
      c.venta_id,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      COALESCE(SUM(p.monto), 0) as monto_pagado
    FROM comisiones c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    LEFT JOIN pagos_comisiones p ON p.comision_id = c.id AND p.activo = true
    WHERE c.id = $1 AND c.tenant_id = $2
    GROUP BY c.id, u.nombre, u.apellido
  `;

  const result = await query(sql, [comisionId, tenantId]);

  if (result.rows.length === 0) {
    return { valido: false, disponible: 0, mensaje: 'Comisión no encontrada' };
  }

  const comision = result.rows[0];
  const montoHabilitado = parseFloat(comision.monto_habilitado) || 0;
  const montoPagado = parseFloat(comision.monto_pagado) || 0;
  const disponible = montoHabilitado - montoPagado;

  if (montoAPagar > disponible + 0.01) { // Tolerancia de centavos
    return {
      valido: false,
      disponible,
      mensaje: `El monto a pagar ($${montoAPagar.toFixed(2)}) excede el disponible ($${disponible.toFixed(2)}). Habilitado: $${montoHabilitado.toFixed(2)}, Ya pagado: $${montoPagado.toFixed(2)}`
    };
  }

  return { valido: true, disponible };
}

/**
 * Actualizar estado de comisión después de un pago
 */
async function actualizarEstadoComision(
  tenantId: string,
  comisionId: string
): Promise<void> {
  const sql = `
    WITH pagos_sum AS (
      SELECT COALESCE(SUM(monto), 0) as total_pagado
      FROM pagos_comisiones
      WHERE comision_id = $1 AND activo = true
    )
    UPDATE comisiones c
    SET
      monto_pagado = ps.total_pagado,
      estado = CASE
        WHEN ps.total_pagado = 0 THEN 'pendiente'
        WHEN ps.total_pagado >= c.monto_habilitado THEN 'pagado'
        ELSE 'parcial'
      END,
      updated_at = NOW()
    FROM pagos_sum ps
    WHERE c.id = $1 AND c.tenant_id = $2
  `;

  await query(sql, [comisionId, tenantId]);
}

/**
 * Actualizar caches de la venta después de un pago
 */
async function actualizarCachesVenta(
  tenantId: string,
  ventaId: string
): Promise<void> {
  const sql = `
    WITH pagos_sum AS (
      SELECT COALESCE(SUM(p.monto), 0) as total_pagado
      FROM pagos_comisiones p
      JOIN comisiones c ON p.comision_id = c.id
      WHERE c.venta_id = $1 AND p.activo = true
    ),
    comisiones_sum AS (
      SELECT COALESCE(SUM(monto_habilitado), 0) as total_habilitado
      FROM comisiones
      WHERE venta_id = $1 AND tipo_participante != 'empresa'
    )
    UPDATE ventas v
    SET
      cache_monto_pagado_asesores = ps.total_pagado,
      estado_pagos = CASE
        WHEN ps.total_pagado = 0 THEN 'pendiente'
        WHEN ps.total_pagado >= cs.total_habilitado THEN 'pagado'
        ELSE 'parcial'
      END,
      updated_at = NOW()
    FROM pagos_sum ps, comisiones_sum cs
    WHERE v.id = $1 AND v.tenant_id = $2
  `;

  await query(sql, [ventaId, tenantId]);
}

/**
 * Crear un nuevo pago de comisión
 *
 * VALIDACIONES:
 * - El monto no puede exceder el monto_habilitado - monto_pagado
 * - Se actualiza automáticamente el estado de la comisión
 * - Se registra en el historial de la venta
 */
export async function createPagoComision(
  tenantId: string,
  data: CreatePagoComisionData
): Promise<PagoComision> {
  // Validar que se especifique una comisión
  if (!data.comision_id) {
    throw new Error('Debe especificar una comisión para el pago');
  }

  // Validar monto disponible
  const validacion = await validarMontoDisponible(tenantId, data.comision_id, data.monto);
  if (!validacion.valido) {
    throw new Error(validacion.mensaje);
  }

  // Obtener info de la comisión para el historial
  const comisionInfo = await query(`
    SELECT c.venta_id, c.usuario_id, u.nombre, u.apellido, c.tipo_participante
    FROM comisiones c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    WHERE c.id = $1 AND c.tenant_id = $2
  `, [data.comision_id, tenantId]);

  if (comisionInfo.rows.length === 0) {
    throw new Error('Comisión no encontrada');
  }

  const comision = comisionInfo.rows[0];
  const ventaId = data.venta_id || comision.venta_id;

  const sql = `
    INSERT INTO pagos_comisiones (
      tenant_id, venta_id, comision_id, monto, moneda, tipo_pago,
      fecha_pago, notas, recibo_url, registrado_por_id, distribucion, activo
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true
    ) RETURNING *
  `;

  const fechaPago = typeof data.fecha_pago === 'string' ? new Date(data.fecha_pago) : data.fecha_pago;

  const params = [
    tenantId,
    ventaId,
    data.comision_id,
    data.monto,
    data.moneda || 'USD',
    data.tipo_pago,
    fechaPago,
    data.notas || null,
    data.recibo_url || null,
    data.registrado_por_id || null,
    JSON.stringify(data.distribucion || {}),
  ];

  const result = await query(sql, params);
  const pago = result.rows[0];

  // Actualizar estado de la comisión
  await actualizarEstadoComision(tenantId, data.comision_id);

  // Actualizar caches de la venta
  if (ventaId) {
    await actualizarCachesVenta(tenantId, ventaId);
  }

  // Registrar en historial
  const nombreBeneficiario = comision.nombre && comision.apellido
    ? `${comision.nombre} ${comision.apellido}`
    : comision.tipo_participante || 'Asesor';

  await ventasHistorialService.registrarCambio({
    tenantId,
    ventaId,
    tipoCambio: 'pago_registrado',
    entidad: 'pago',
    entidadId: pago.id,
    datosNuevos: {
      monto: data.monto,
      moneda: data.moneda || 'USD',
      tipo_pago: data.tipo_pago,
      fecha_pago: fechaPago,
      beneficiario: nombreBeneficiario,
      comision_id: data.comision_id,
    },
    descripcion: `Pago de $${data.monto.toFixed(2)} registrado para ${nombreBeneficiario}`,
    usuarioId: data.registrado_por_id || undefined,
  });

  return {
    ...pago,
    distribucion: typeof pago.distribucion === 'string' ? JSON.parse(pago.distribucion) : pago.distribucion,
  };
}

/**
 * Actualizar un pago de comisión
 */
export async function updatePagoComision(
  tenantId: string,
  pagoId: string,
  data: Partial<CreatePagoComisionData>
): Promise<PagoComision> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  Object.keys(data).forEach((key) => {
    if (key === 'fecha_pago') {
      updates.push(`fecha_pago = $${paramIndex}`);
      params.push(typeof data[key] === 'string' ? new Date(data[key]!) : data[key]);
    } else if (key === 'distribucion') {
      updates.push(`distribucion = $${paramIndex}`);
      params.push(JSON.stringify(data[key]));
    } else if (data[key as keyof CreatePagoComisionData] !== undefined) {
      updates.push(`${key} = $${paramIndex}`);
      params.push(data[key as keyof CreatePagoComisionData]);
    }
    paramIndex++;
  });

  updates.push(`updated_at = NOW()`);
  params.push(pagoId, tenantId);

  const sql = `
    UPDATE pagos_comisiones
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;

  const result = await query(sql, params);

  if (result.rows.length === 0) {
    throw new Error('Pago no encontrado');
  }

  const pago = result.rows[0];
  return {
    ...pago,
    distribucion: typeof pago.distribucion === 'string' ? JSON.parse(pago.distribucion) : pago.distribucion,
  };
}

/**
 * Eliminar un pago de comisión (soft delete)
 */
export async function deletePagoComision(
  tenantId: string,
  pagoId: string,
  usuarioId?: string
): Promise<void> {
  // Obtener info del pago antes de eliminar
  const pagoInfo = await query(`
    SELECT p.*, c.venta_id, u.nombre, u.apellido
    FROM pagos_comisiones p
    LEFT JOIN comisiones c ON p.comision_id = c.id
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    WHERE p.id = $1 AND p.tenant_id = $2
  `, [pagoId, tenantId]);

  if (pagoInfo.rows.length === 0) {
    throw new Error('Pago no encontrado');
  }

  const pago = pagoInfo.rows[0];

  // Soft delete
  const sql = `
    UPDATE pagos_comisiones
    SET activo = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `;

  await query(sql, [pagoId, tenantId]);

  // Actualizar estado de la comisión
  if (pago.comision_id) {
    await actualizarEstadoComision(tenantId, pago.comision_id);
  }

  // Actualizar caches de la venta
  if (pago.venta_id) {
    await actualizarCachesVenta(tenantId, pago.venta_id);
  }

  // Registrar en historial
  const nombreBeneficiario = pago.nombre && pago.apellido
    ? `${pago.nombre} ${pago.apellido}`
    : 'Asesor';

  await ventasHistorialService.registrarCambio({
    tenantId,
    ventaId: pago.venta_id,
    tipoCambio: 'pago_eliminado',
    entidad: 'pago',
    entidadId: pagoId,
    datosAnteriores: {
      monto: pago.monto,
      moneda: pago.moneda,
      tipo_pago: pago.tipo_pago,
      fecha_pago: pago.fecha_pago,
      beneficiario: nombreBeneficiario,
    },
    descripcion: `Pago de $${parseFloat(pago.monto).toFixed(2)} anulado para ${nombreBeneficiario}`,
    usuarioId,
  });
}

/**
 * Calcular monto pagado total de una comisión
 */
export async function calcularMontoPagadoComision(
  tenantId: string,
  comisionId: string
): Promise<number> {
  const sql = `
    SELECT COALESCE(SUM(monto), 0) as total
    FROM pagos_comisiones
    WHERE tenant_id = $1 AND comision_id = $2 AND activo = true
  `;

  const result = await query(sql, [tenantId, comisionId]);
  return parseFloat(result.rows[0].total) || 0;
}

/**
 * Calcular monto pagado total de una venta
 */
export async function calcularMontoPagadoVenta(
  tenantId: string,
  ventaId: string
): Promise<number> {
  const sql = `
    SELECT COALESCE(SUM(monto), 0) as total
    FROM pagos_comisiones
    WHERE tenant_id = $1 AND venta_id = $2 AND activo = true
  `;

  const result = await query(sql, [tenantId, ventaId]);
  return parseFloat(result.rows[0].total) || 0;
}

/**
 * Obtener resumen de pagos de una venta
 */
export interface ResumenPagosVenta {
  totalComisiones: number;
  totalHabilitado: number;
  totalPagado: number;
  pendientePago: number;
  estadoPagos: 'pendiente' | 'parcial' | 'pagado';
  comisiones: Array<{
    id: string;
    tipo_participante: string;
    usuario_id: string | null;
    usuario_nombre: string | null;
    monto: number;
    monto_habilitado: number;
    monto_pagado: number;
    estado: string;
    pagos: Array<{
      id: string;
      monto: number;
      fecha_pago: Date;
      tipo_pago: string;
    }>;
  }>;
}

export async function getResumenPagosVenta(
  tenantId: string,
  ventaId: string
): Promise<ResumenPagosVenta> {
  // Obtener comisiones con sus pagos
  const sql = `
    SELECT
      c.id,
      c.tipo_participante,
      c.usuario_id,
      CONCAT(u.nombre, ' ', u.apellido) as usuario_nombre,
      c.monto,
      c.monto_habilitado,
      c.monto_pagado,
      c.estado,
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id,
            'monto', p.monto,
            'fecha_pago', p.fecha_pago,
            'tipo_pago', p.tipo_pago
          )
        ) FILTER (WHERE p.id IS NOT NULL AND p.activo = true),
        '[]'
      ) as pagos
    FROM comisiones c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    LEFT JOIN pagos_comisiones p ON p.comision_id = c.id AND p.activo = true
    WHERE c.venta_id = $1 AND c.tenant_id = $2
      AND c.tipo_participante != 'empresa'
    GROUP BY c.id, u.nombre, u.apellido
    ORDER BY c.tipo_participante, c.created_at
  `;

  const result = await query(sql, [ventaId, tenantId]);

  const comisiones = result.rows.map(row => ({
    id: row.id,
    tipo_participante: row.tipo_participante,
    usuario_id: row.usuario_id,
    usuario_nombre: row.usuario_nombre,
    monto: parseFloat(row.monto) || 0,
    monto_habilitado: parseFloat(row.monto_habilitado) || 0,
    monto_pagado: parseFloat(row.monto_pagado) || 0,
    estado: row.estado,
    pagos: row.pagos || [],
  }));

  const totalComisiones = comisiones.reduce((sum, c) => sum + c.monto, 0);
  const totalHabilitado = comisiones.reduce((sum, c) => sum + c.monto_habilitado, 0);
  const totalPagado = comisiones.reduce((sum, c) => sum + c.monto_pagado, 0);
  const pendientePago = totalHabilitado - totalPagado;

  let estadoPagos: 'pendiente' | 'parcial' | 'pagado' = 'pendiente';
  if (totalPagado > 0 && totalPagado >= totalHabilitado) {
    estadoPagos = 'pagado';
  } else if (totalPagado > 0) {
    estadoPagos = 'parcial';
  }

  return {
    totalComisiones,
    totalHabilitado,
    totalPagado,
    pendientePago,
    estadoPagos,
    comisiones,
  };
}

/**
 * Obtener disponible para pago de una comisión específica
 */
export async function getDisponibleComision(
  tenantId: string,
  comisionId: string
): Promise<{ monto: number; habilitado: number; pagado: number; disponible: number }> {
  const sql = `
    SELECT
      c.monto,
      c.monto_habilitado,
      COALESCE(SUM(p.monto), 0) as monto_pagado
    FROM comisiones c
    LEFT JOIN pagos_comisiones p ON p.comision_id = c.id AND p.activo = true
    WHERE c.id = $1 AND c.tenant_id = $2
    GROUP BY c.id
  `;

  const result = await query(sql, [comisionId, tenantId]);

  if (result.rows.length === 0) {
    throw new Error('Comisión no encontrada');
  }

  const row = result.rows[0];
  const monto = parseFloat(row.monto) || 0;
  const habilitado = parseFloat(row.monto_habilitado) || 0;
  const pagado = parseFloat(row.monto_pagado) || 0;

  return {
    monto,
    habilitado,
    pagado,
    disponible: habilitado - pagado,
  };
}













