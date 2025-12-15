/**
 * Servicio para gestión de facturación en el panel de administración
 */

import { query, getClient } from '../utils/db.js';

export interface Factura {
  id: string;
  tenantId: string;
  tenantNombre?: string;
  numeroFactura: string;
  plan: string;
  monto: number;
  moneda: string;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'cancelada';
  fechaEmision: string;
  fechaVencimiento: string;
  fechaPago: string | null;
  metodoPago: string | null;
  referenciaPago: string | null;
  detalles: Record<string, any>;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Suscripcion {
  id: string;
  tenantId: string;
  tenantNombre?: string;
  plan: string;
  estado: 'activa' | 'suspendida' | 'cancelada';
  fechaInicio: string;
  fechaFin: string | null;
  proximoCobro: string | null;
  montoMensual: number;
  metodoPagoGuardado: string | null;
  configuracion: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BillingStats {
  totalFacturas: number;
  facturasPendientes: number;
  facturasPagadas: number;
  facturasVencidas: number;
  totalRecaudado: number;
  totalPendiente: number;
  suscripcionesActivas: number;
  suscripcionesSuspendidas: number;
  proximosVencimientos: number;
}

/**
 * Obtiene estadísticas de facturación
 */
export async function getBillingStats(): Promise<BillingStats> {
  try {
    // Estadísticas de facturas
    const facturasStats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'pagada') as pagadas,
        COUNT(*) FILTER (WHERE estado = 'vencida') as vencidas,
        COALESCE(SUM(monto) FILTER (WHERE estado = 'pagada'), 0) as total_recaudado,
        COALESCE(SUM(monto) FILTER (WHERE estado IN ('pendiente', 'vencida')), 0) as total_pendiente
      FROM facturas
    `);

    // Estadísticas de suscripciones
    const suscripcionesStats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE estado = 'activa') as activas,
        COUNT(*) FILTER (WHERE estado = 'suspendida') as suspendidas
      FROM suscripciones
    `);

    // Próximos vencimientos (facturas pendientes en los próximos 7 días)
    const proximosVencimientos = await query(`
      SELECT COUNT(*) as count
      FROM facturas
      WHERE estado IN ('pendiente', 'vencida')
        AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days'
        AND fecha_vencimiento >= CURRENT_DATE
    `);

    const facturas = facturasStats.rows[0];
    const suscripciones = suscripcionesStats.rows[0];
    const vencimientos = proximosVencimientos.rows[0];

    return {
      totalFacturas: parseInt(facturas.total, 10),
      facturasPendientes: parseInt(facturas.pendientes, 10),
      facturasPagadas: parseInt(facturas.pagadas, 10),
      facturasVencidas: parseInt(facturas.vencidas, 10),
      totalRecaudado: parseFloat(facturas.total_recaudado || '0'),
      totalPendiente: parseFloat(facturas.total_pendiente || '0'),
      suscripcionesActivas: parseInt(suscripciones.activas, 10),
      suscripcionesSuspendidas: parseInt(suscripciones.suspendidas, 10),
      proximosVencimientos: parseInt(vencimientos.count, 10),
    };
  } catch (error: any) {
    console.error('Error al obtener estadísticas de facturación:', error);
    throw new Error(`Error al obtener estadísticas: ${error.message}`);
  }
}

/**
 * Obtiene todas las facturas con información del tenant
 */
export async function getAllFacturas(filters?: {
  tenantId?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}): Promise<Factura[]> {
  try {
    let sql = `
      SELECT 
        f.id,
        f.tenant_id as "tenantId",
        t.nombre as "tenantNombre",
        f.numero_factura as "numeroFactura",
        f.plan,
        f.monto,
        f.moneda,
        f.estado,
        f.fecha_emision as "fechaEmision",
        f.fecha_vencimiento as "fechaVencimiento",
        f.fecha_pago as "fechaPago",
        f.metodo_pago as "metodoPago",
        f.referencia_pago as "referenciaPago",
        f.detalles,
        f.notas,
        f.created_at as "createdAt",
        f.updated_at as "updatedAt"
      FROM facturas f
      INNER JOIN tenants t ON f.tenant_id = t.id
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.tenantId) {
      sql += ` AND f.tenant_id = $${paramIndex++}`;
      values.push(filters.tenantId);
    }

    if (filters?.estado) {
      sql += ` AND f.estado = $${paramIndex++}`;
      values.push(filters.estado);
    }

    if (filters?.fechaDesde) {
      sql += ` AND f.fecha_emision >= $${paramIndex++}`;
      values.push(filters.fechaDesde);
    }

    if (filters?.fechaHasta) {
      sql += ` AND f.fecha_emision <= $${paramIndex++}`;
      values.push(filters.fechaHasta);
    }

    sql += ` ORDER BY f.fecha_emision DESC, f.created_at DESC`;

    const result = await query(sql, values);
    return result.rows;
  } catch (error: any) {
    console.error('Error al obtener facturas:', error);
    throw new Error(`Error al obtener facturas: ${error.message}`);
  }
}

/**
 * Obtiene todas las suscripciones con información del tenant
 */
export async function getAllSuscripciones(): Promise<Suscripcion[]> {
  try {
    const sql = `
      SELECT 
        s.id,
        s.tenant_id as "tenantId",
        t.nombre as "tenantNombre",
        s.plan,
        s.estado,
        s.fecha_inicio as "fechaInicio",
        s.fecha_fin as "fechaFin",
        s.proximo_cobro as "proximoCobro",
        s.monto_mensual as "montoMensual",
        s.metodo_pago_guardado as "metodoPagoGuardado",
        s.configuracion,
        s.created_at as "createdAt",
        s.updated_at as "updatedAt"
      FROM suscripciones s
      INNER JOIN tenants t ON s.tenant_id = t.id
      ORDER BY s.created_at DESC
    `;

    const result = await query(sql);
    return result.rows;
  } catch (error: any) {
    console.error('Error al obtener suscripciones:', error);
    throw new Error(`Error al obtener suscripciones: ${error.message}`);
  }
}

