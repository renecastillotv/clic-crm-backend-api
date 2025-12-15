/**
 * Servicio de Pagos de Comisiones
 * 
 * Gestiona los pagos aplicados a las comisiones
 * Los pagos pueden aplicarse directamente a una venta (distribución proporcional)
 * o a una comisión específica
 */

import { query } from '../utils/db';

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
 * Crear un nuevo pago de comisión
 */
export async function createPagoComision(
  tenantId: string,
  data: CreatePagoComisionData
): Promise<PagoComision> {
  const sql = `
    INSERT INTO pagos_comisiones (
      tenant_id, venta_id, comision_id, monto, moneda, tipo_pago, 
      fecha_pago, notas, recibo_url, registrado_por_id, distribucion
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    ) RETURNING *
  `;

  const fechaPago = typeof data.fecha_pago === 'string' ? new Date(data.fecha_pago) : data.fecha_pago;

  const params = [
    tenantId,
    data.venta_id || null,
    data.comision_id || null,
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
 * Eliminar un pago de comisión
 */
export async function deletePagoComision(
  tenantId: string,
  pagoId: string
): Promise<void> {
  const sql = `
    DELETE FROM pagos_comisiones
    WHERE id = $1 AND tenant_id = $2
  `;

  const result = await query(sql, [pagoId, tenantId]);

  if (result.rowCount === 0) {
    throw new Error('Pago no encontrado');
  }
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
    WHERE tenant_id = $1 AND comision_id = $2
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
    WHERE tenant_id = $1 AND venta_id = $2
  `;

  const result = await query(sql, [tenantId, ventaId]);
  return parseFloat(result.rows[0].total) || 0;
}












