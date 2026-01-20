/**
 * Servicio de Historial de Ventas
 *
 * Audit log de todos los cambios en ventas, cobros, comisiones y pagos.
 * Permite trazabilidad completa y auditoría de operaciones.
 */

import { query } from '../utils/db.js';

// ============================================
// TIPOS
// ============================================

export type TipoCambio =
  | 'venta_creada'
  | 'venta_editada'
  | 'venta_cancelada'
  | 'venta_completada'
  | 'cobro_registrado'
  | 'cobro_editado'
  | 'cobro_eliminado'
  | 'distribucion_creada'
  | 'distribucion_modificada'
  | 'comision_agregada'
  | 'comision_editada'
  | 'comision_eliminada'
  | 'pago_registrado'
  | 'pago_editado'
  | 'pago_eliminado';

export interface HistorialItem {
  id: string;
  tenant_id: string;
  venta_id: string;
  tipo_cambio: TipoCambio;
  entidad?: string;
  entidad_id?: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  descripcion: string;
  usuario_id?: string;
  usuario_nombre?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface RegistrarCambioParams {
  tenantId: string;
  ventaId: string;
  tipoCambio: TipoCambio;
  entidad?: 'venta' | 'cobro' | 'comision' | 'pago';
  entidadId?: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  descripcion: string;
  usuarioId?: string;
  usuarioNombre?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Registrar un cambio en el historial
 */
export async function registrarCambio(params: RegistrarCambioParams): Promise<void> {
  const {
    tenantId,
    ventaId,
    tipoCambio,
    entidad,
    entidadId,
    datosAnteriores,
    datosNuevos,
    descripcion,
    usuarioId,
    usuarioNombre,
    ipAddress,
    userAgent,
  } = params;

  // Obtener nombre del usuario si no se proporcionó
  let nombreUsuario = usuarioNombre;
  if (!nombreUsuario && usuarioId) {
    const userResult = await query(
      `SELECT nombre, apellido FROM usuarios WHERE id = $1`,
      [usuarioId]
    );
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      nombreUsuario = [user.nombre, user.apellido].filter(Boolean).join(' ');
    }
  }

  await query(
    `INSERT INTO ventas_historial (
      tenant_id, venta_id, tipo_cambio, entidad, entidad_id,
      datos_anteriores, datos_nuevos, descripcion,
      usuario_id, usuario_nombre, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      tenantId,
      ventaId,
      tipoCambio,
      entidad || null,
      entidadId || null,
      datosAnteriores ? JSON.stringify(datosAnteriores) : null,
      datosNuevos ? JSON.stringify(datosNuevos) : null,
      descripcion,
      usuarioId || null,
      nombreUsuario || null,
      ipAddress || null,
      userAgent || null,
    ]
  );
}

/**
 * Obtener historial de una venta
 */
export async function obtenerHistorial(
  tenantId: string,
  ventaId: string,
  opciones?: {
    limit?: number;
    offset?: number;
    tipos?: TipoCambio[];
  }
): Promise<{ items: HistorialItem[]; total: number }> {
  const { limit = 50, offset = 0, tipos } = opciones || {};

  // Construir query base
  let whereClause = `tenant_id = $1 AND venta_id = $2`;
  const params: any[] = [tenantId, ventaId];

  // Filtrar por tipos si se especifican
  if (tipos && tipos.length > 0) {
    const tiposPlaceholders = tipos.map((_, i) => `$${params.length + i + 1}`).join(', ');
    whereClause += ` AND tipo_cambio IN (${tiposPlaceholders})`;
    params.push(...tipos);
  }

  // Contar total
  const countResult = await query(
    `SELECT COUNT(*) as total FROM ventas_historial WHERE ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0]?.total || 0);

  // Obtener items
  const result = await query(
    `SELECT * FROM ventas_historial
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    items: result.rows,
    total,
  };
}

/**
 * Obtener último cambio de un tipo específico
 */
export async function obtenerUltimoCambio(
  tenantId: string,
  ventaId: string,
  tipoCambio: TipoCambio
): Promise<HistorialItem | null> {
  const result = await query(
    `SELECT * FROM ventas_historial
    WHERE tenant_id = $1 AND venta_id = $2 AND tipo_cambio = $3
    ORDER BY created_at DESC
    LIMIT 1`,
    [tenantId, ventaId, tipoCambio]
  );

  return result.rows[0] || null;
}

/**
 * Obtener historial de una entidad específica (cobro, comisión, pago)
 */
export async function obtenerHistorialEntidad(
  tenantId: string,
  entidad: string,
  entidadId: string
): Promise<HistorialItem[]> {
  const result = await query(
    `SELECT * FROM ventas_historial
    WHERE tenant_id = $1 AND entidad = $2 AND entidad_id = $3
    ORDER BY created_at DESC`,
    [tenantId, entidad, entidadId]
  );

  return result.rows;
}

/**
 * Obtener estadísticas de cambios por tipo
 */
export async function obtenerEstadisticasCambios(
  tenantId: string,
  ventaId?: string,
  fechaInicio?: Date,
  fechaFin?: Date
): Promise<{ tipo: TipoCambio; cantidad: number }[]> {
  let whereClause = `tenant_id = $1`;
  const params: any[] = [tenantId];

  if (ventaId) {
    whereClause += ` AND venta_id = $${params.length + 1}`;
    params.push(ventaId);
  }

  if (fechaInicio) {
    whereClause += ` AND created_at >= $${params.length + 1}`;
    params.push(fechaInicio);
  }

  if (fechaFin) {
    whereClause += ` AND created_at <= $${params.length + 1}`;
    params.push(fechaFin);
  }

  const result = await query(
    `SELECT tipo_cambio as tipo, COUNT(*) as cantidad
    FROM ventas_historial
    WHERE ${whereClause}
    GROUP BY tipo_cambio
    ORDER BY cantidad DESC`,
    params
  );

  return result.rows;
}

/**
 * Obtener actividad reciente de un usuario
 */
export async function obtenerActividadUsuario(
  tenantId: string,
  usuarioId: string,
  limit: number = 20
): Promise<HistorialItem[]> {
  const result = await query(
    `SELECT vh.*, v.nombre_negocio as venta_nombre
    FROM ventas_historial vh
    LEFT JOIN ventas v ON vh.venta_id = v.id
    WHERE vh.tenant_id = $1 AND vh.usuario_id = $2
    ORDER BY vh.created_at DESC
    LIMIT $3`,
    [tenantId, usuarioId, limit]
  );

  return result.rows;
}

/**
 * Obtener resumen de actividad por día
 */
export async function obtenerResumenActividadDiaria(
  tenantId: string,
  dias: number = 30
): Promise<{ fecha: string; cantidad: number; tipos: Record<string, number> }[]> {
  const result = await query(
    `SELECT
      DATE(created_at) as fecha,
      COUNT(*) as cantidad,
      jsonb_object_agg(tipo_cambio, cnt) as tipos
    FROM (
      SELECT
        created_at,
        tipo_cambio,
        COUNT(*) OVER (PARTITION BY DATE(created_at), tipo_cambio) as cnt
      FROM ventas_historial
      WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '${dias} days'
    ) sub
    GROUP BY DATE(created_at)
    ORDER BY fecha DESC`,
    [tenantId]
  );

  return result.rows;
}

/**
 * Formatear descripción de cambio para UI
 */
export function formatearDescripcion(item: HistorialItem): string {
  const tipoDescripciones: Record<TipoCambio, string> = {
    venta_creada: 'Venta creada',
    venta_editada: 'Venta editada',
    venta_cancelada: 'Venta cancelada',
    venta_completada: 'Venta completada',
    cobro_registrado: 'Cobro registrado',
    cobro_editado: 'Cobro editado',
    cobro_eliminado: 'Cobro eliminado',
    distribucion_creada: 'Distribución creada',
    distribucion_modificada: 'Distribución modificada',
    comision_agregada: 'Comisión agregada',
    comision_editada: 'Comisión editada',
    comision_eliminada: 'Comisión eliminada',
    pago_registrado: 'Pago registrado',
    pago_editado: 'Pago editado',
    pago_eliminado: 'Pago eliminado',
  };

  return item.descripcion || tipoDescripciones[item.tipo_cambio] || 'Cambio registrado';
}

/**
 * Obtener icono para tipo de cambio (para UI)
 */
export function obtenerIconoTipoCambio(tipo: TipoCambio): string {
  const iconos: Record<TipoCambio, string> = {
    venta_creada: 'Plus',
    venta_editada: 'Edit',
    venta_cancelada: 'XCircle',
    venta_completada: 'CheckCircle',
    cobro_registrado: 'DollarSign',
    cobro_editado: 'Edit',
    cobro_eliminado: 'Trash',
    distribucion_creada: 'PieChart',
    distribucion_modificada: 'RefreshCw',
    comision_agregada: 'UserPlus',
    comision_editada: 'Edit',
    comision_eliminada: 'UserMinus',
    pago_registrado: 'CreditCard',
    pago_editado: 'Edit',
    pago_eliminado: 'Trash',
  };

  return iconos[tipo] || 'Activity';
}

/**
 * Obtener color para tipo de cambio (para UI)
 */
export function obtenerColorTipoCambio(tipo: TipoCambio): string {
  const colores: Record<TipoCambio, string> = {
    venta_creada: 'green',
    venta_editada: 'blue',
    venta_cancelada: 'red',
    venta_completada: 'green',
    cobro_registrado: 'green',
    cobro_editado: 'blue',
    cobro_eliminado: 'red',
    distribucion_creada: 'purple',
    distribucion_modificada: 'purple',
    comision_agregada: 'green',
    comision_editada: 'blue',
    comision_eliminada: 'red',
    pago_registrado: 'green',
    pago_editado: 'blue',
    pago_eliminado: 'red',
  };

  return colores[tipo] || 'gray';
}
