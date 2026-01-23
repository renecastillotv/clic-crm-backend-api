/**
 * Comisiones Routes - Endpoints optimizados para gestión de comisiones
 *
 * Este archivo maneja las rutas de comisiones a nivel de tenant (no por venta)
 * para permitir vistas agregadas y filtradas de todas las comisiones.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../utils/db.js';
import { resolveUserScope, getOwnFilter } from '../../middleware/scopeResolver.js';

const router = Router({ mergeParams: true });

// Apply scope resolution
router.use(resolveUserScope);

interface TenantParams {
  tenantId: string;
}

interface ComisionesQuery {
  usuario_id?: string;
  rol?: string; // vendedor, captador, referidor, owner, vendedor_externo
  estado?: string; // pendiente, parcial, pagado
  fecha_inicio?: string;
  fecha_fin?: string;
  limit?: string;
  offset?: string;
  include_empresa?: string; // 'true' para incluir comisiones de empresa
}

// Tipo genérico para filas de la query de comisiones
interface ComisionRow {
  id: string;
  venta_id: string;
  usuario_id: string | null;
  contacto_externo_id: string | null;
  monto: string | number;
  monto_pagado: string | number;
  monto_habilitado: string | number;
  moneda: string | null;
  porcentaje: string | number | null;
  estado: string;
  datos_extra: Record<string, unknown> | string | null;
  created_at: string;
  fecha_pago: string | null;
  venta_nombre: string | null;
  venta_valor: string | number | null;
  venta_estado: string | null;
  venta_fecha: string | null;
  venta_moneda: string | null;
  venta_tipo_comision: string | null;
  venta_monto_comision: string | number | null;
  venta_monto_cobrado: string | number | null;
  venta_porcentaje_cobrado: string | number | null;
  venta_estado_cobro: string | null;
  usuario_nombre: string | null;
  usuario_apellido: string | null;
  usuario_email: string | null;
  usuario_avatar: string | null;
  tenant_nombre: string | null;
  contacto_nombre: string | null;
  contacto_apellido: string | null;
  contacto_email: string | null;
}

// Helper para parsear número de forma segura
function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
}

/**
 * GET /api/tenants/:tenantId/comisiones
 *
 * Obtiene todas las comisiones del tenant con filtros opcionales
 * Query optimizada con JOINs para evitar N+1
 */
router.get('/', async (req: Request<TenantParams, any, any, ComisionesQuery>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const {
      usuario_id,
      rol,
      estado,
      fecha_inicio,
      fecha_fin,
      limit = '100',
      offset = '0',
      include_empresa = 'true'
    } = req.query;

    // Apply scope filter: if alcance_ver = 'own', only show user's comisiones
    const ownUserId = getOwnFilter(req, 'finanzas-comisiones');

    // Construir query dinámica con filtros
    const params: any[] = [tenantId];
    let paramIndex = 2;

    let whereClause = `WHERE c.tenant_id = $1`;

    // Filtro por usuario (scope override or explicit filter)
    const effectiveUsuarioId = ownUserId || (usuario_id as string | undefined);
    if (effectiveUsuarioId) {
      whereClause += ` AND c.usuario_id = $${paramIndex}`;
      params.push(effectiveUsuarioId);
      paramIndex++;
    }

    // Filtro por rol (datos_extra->>'split')
    if (rol) {
      whereClause += ` AND c.datos_extra->>'split' = $${paramIndex}`;
      params.push(rol);
      paramIndex++;
    }

    // Excluir empresa si no se quiere
    if (include_empresa !== 'true') {
      whereClause += ` AND c.datos_extra->>'split' NOT IN ('owner', 'empresa')`;
    }

    // Filtro por estado
    if (estado) {
      whereClause += ` AND c.estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }

    // Filtro por fecha de creación
    if (fecha_inicio) {
      whereClause += ` AND c.created_at >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin) {
      whereClause += ` AND c.created_at <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }

    const sql = `
      SELECT
        c.id,
        c.tenant_id,
        c.venta_id,
        c.usuario_id,
        c.monto,
        c.moneda,
        c.porcentaje,
        c.estado,
        c.monto_pagado,
        c.monto_habilitado,
        c.fecha_pago,
        c.tipo,
        c.notas,
        c.datos_extra,
        c.contacto_externo_id,
        c.created_at,
        c.updated_at,
        -- Datos de la venta
        v.nombre_negocio as venta_nombre,
        v.valor_cierre as venta_valor,
        ev.nombre as venta_estado,
        v.created_at as venta_fecha,
        v.moneda as venta_moneda,
        v.monto_comision as venta_monto_comision,
        v.cache_monto_cobrado as venta_monto_cobrado,
        v.cache_porcentaje_cobrado as venta_porcentaje_cobrado,
        v.estado_cobro as venta_estado_cobro,
        -- Datos del usuario
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        u.email as usuario_email,
        u.avatar_url as usuario_avatar,
        -- Datos del tenant (para comisiones de empresa)
        t.nombre as tenant_nombre,
        -- Datos del contacto externo
        co.nombre as contacto_nombre,
        co.apellido as contacto_apellido
      FROM comisiones c
      INNER JOIN ventas v ON c.venta_id = v.id AND v.activo = true
      LEFT JOIN estados_venta ev ON v.estado_venta_id = ev.id
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      LEFT JOIN contactos co ON c.contacto_externo_id = co.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Formatear respuesta
    const comisiones = result.rows.map((row: ComisionRow) => {
      const datosExtra = typeof row.datos_extra === 'string'
        ? JSON.parse(row.datos_extra)
        : (row.datos_extra || {});

      const rol = datosExtra.split || 'vendedor';
      const esEmpresa = rol === 'owner' || rol === 'empresa';
      const esExterno = datosExtra.esExterno === true;

      // Determinar nombre a mostrar
      let nombreDisplay: string;
      if (esEmpresa) {
        nombreDisplay = row.tenant_nombre || 'Empresa';
      } else if (esExterno && datosExtra.nombreExterno) {
        nombreDisplay = datosExtra.nombreExterno;
      } else if (row.contacto_externo_id && row.contacto_nombre) {
        nombreDisplay = `${row.contacto_nombre || ''} ${row.contacto_apellido || ''}`.trim();
      } else {
        nombreDisplay = `${row.usuario_nombre || ''} ${row.usuario_apellido || ''}`.trim() || 'Sin asignar';
      }

      const monto = toNumber(row.monto);
      const montoPagado = toNumber(row.monto_pagado);
      const montoHabilitado = toNumber(row.monto_habilitado) || monto; // Si no hay habilitado, usar total
      const pendiente = montoHabilitado - montoPagado;

      return {
        id: row.id,
        venta_id: row.venta_id,
        usuario_id: row.usuario_id,
        contacto_externo_id: row.contacto_externo_id,
        // Montos
        monto,
        monto_pagado: montoPagado,
        monto_habilitado: montoHabilitado,
        pendiente: Math.max(0, pendiente),
        moneda: row.moneda || row.venta_moneda || 'USD',
        porcentaje: toNumber(row.porcentaje),
        estado: row.estado,
        // Rol y tipo
        rol,
        porcentaje_split: datosExtra.porcentajeSplit || 0,
        es_empresa: esEmpresa,
        es_externo: esExterno,
        // Datos formateados
        nombre_display: nombreDisplay,
        // Datos de venta
        venta: {
          id: row.venta_id,
          nombre: row.venta_nombre || 'Sin nombre',
          valor: toNumber(row.venta_valor),
          estado: row.venta_estado,
          fecha: row.venta_fecha,
          moneda: row.venta_moneda || 'USD',
          monto_comision: toNumber(row.venta_monto_comision),
          monto_cobrado: toNumber(row.venta_monto_cobrado),
          porcentaje_cobrado: toNumber(row.venta_porcentaje_cobrado),
          estado_cobro: row.venta_estado_cobro || 'pendiente',
        },
        // Datos de usuario
        usuario: row.usuario_id ? {
          id: row.usuario_id,
          nombre: row.usuario_nombre,
          apellido: row.usuario_apellido,
          email: row.usuario_email,
          avatar: row.usuario_avatar,
        } : null,
        // Fechas
        created_at: row.created_at,
        fecha_pago: row.fecha_pago,
      };
    });

    // Contar total para paginación
    const countSql = `
      SELECT COUNT(*) as total
      FROM comisiones c
      INNER JOIN ventas v ON c.venta_id = v.id AND v.activo = true
      LEFT JOIN estados_venta ev ON v.estado_venta_id = ev.id
      ${whereClause}
    `;
    const countResult = await query(countSql, params.slice(0, -2)); // Sin limit/offset
    const total = parseInt(countResult.rows[0]?.total || '0');

    res.json({
      comisiones,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + comisiones.length < total,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/comisiones/resumen
 *
 * Obtiene totales agregados para las cards de resumen
 * CÁLCULO EN TIEMPO REAL desde pagos_comisiones para máxima precisión
 *
 * Flujo de dinero:
 * 1. Total Proyectado = suma de todas las comisiones (lo que se espera recibir)
 * 2. Total Cobrado = suma de pagos_comisiones donde tipo_movimiento='cobro' (dinero recibido del cliente)
 * 3. Total Habilitado = para cada comisión: monto * (cobrado_venta / comision_venta)
 * 4. Total Pagado = suma de pagos_comisiones donde tipo_movimiento='pago' (pagado a participantes)
 * 5. Pendiente Pagar = habilitado - pagado
 * 6. Por Cobrar Futuro = proyectado - cobrado
 */
router.get('/resumen', async (req: Request<TenantParams, any, any, ComisionesQuery>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const {
      usuario_id,
      rol,
      estado,
      include_empresa = 'true'
    } = req.query;

    // Apply scope filter: if alcance_ver = 'own', only show user's comisiones
    const ownUserId = getOwnFilter(req, 'finanzas-comisiones');

    // Construir filtros para comisiones
    const params: any[] = [tenantId];
    let paramIndex = 2;

    let whereClause = `WHERE c.tenant_id = $1`;

    const effectiveUsuarioId = ownUserId || (usuario_id as string | undefined);
    if (effectiveUsuarioId) {
      whereClause += ` AND c.usuario_id = $${paramIndex}`;
      params.push(effectiveUsuarioId);
      paramIndex++;
    }

    if (rol) {
      whereClause += ` AND c.datos_extra->>'split' = $${paramIndex}`;
      params.push(rol);
      paramIndex++;
    }

    if (include_empresa !== 'true') {
      whereClause += ` AND c.datos_extra->>'split' NOT IN ('owner', 'empresa')`;
    }

    if (estado) {
      whereClause += ` AND c.estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }

    // Query principal: calcular todo en tiempo real
    // Usa subqueries para obtener cobros y pagos desde pagos_comisiones
    const sql = `
      WITH
      -- Cobros por venta (dinero recibido del cliente)
      cobros_por_venta AS (
        SELECT
          venta_id,
          COALESCE(SUM(monto), 0) as total_cobrado
        FROM pagos_comisiones
        WHERE tenant_id = $1
          AND (tipo_movimiento = 'cobro' OR tipo_movimiento IS NULL)
        GROUP BY venta_id
      ),
      -- Pagos por comisión (dinero pagado a participantes)
      pagos_por_comision AS (
        SELECT
          comision_id,
          COALESCE(SUM(monto), 0) as total_pagado
        FROM pagos_comisiones
        WHERE tenant_id = $1
          AND tipo_movimiento = 'pago'
        GROUP BY comision_id
      ),
      -- Ventas únicas que tienen comisiones (para no duplicar cobros)
      ventas_con_comisiones AS (
        SELECT DISTINCT c.venta_id
        FROM comisiones c
        INNER JOIN ventas v ON c.venta_id = v.id AND v.activo = true
        ${whereClause}
      ),
      -- Datos de comisiones con cálculos
      comisiones_calc AS (
        SELECT
          c.id,
          c.venta_id,
          c.monto,
          c.estado,
          c.datos_extra->>'split' as split,
          v.monto_comision as venta_monto_comision,
          COALESCE(cv.total_cobrado, 0) as venta_cobrado,
          COALESCE(pc.total_pagado, 0) as comision_pagado,
          -- Calcular monto habilitado: proporción de lo cobrado
          CASE
            WHEN v.monto_comision > 0 THEN
              ROUND((c.monto * COALESCE(cv.total_cobrado, 0) / v.monto_comision)::numeric, 2)
            ELSE 0
          END as monto_habilitado_calc
        FROM comisiones c
        INNER JOIN ventas v ON c.venta_id = v.id AND v.activo = true
        LEFT JOIN cobros_por_venta cv ON c.venta_id = cv.venta_id
        LEFT JOIN pagos_por_comision pc ON c.id = pc.comision_id
        ${whereClause}
      ),
      -- Total cobrado del cliente (sin duplicar por venta)
      total_cobrado AS (
        SELECT COALESCE(SUM(cv.total_cobrado), 0) as total
        FROM ventas_con_comisiones vc
        JOIN cobros_por_venta cv ON vc.venta_id = cv.venta_id
      )
      SELECT
        -- Totales de montos (calculados en tiempo real)
        COALESCE(SUM(monto), 0) as total_proyectado,
        COALESCE(SUM(monto_habilitado_calc), 0) as total_habilitado,
        COALESCE(SUM(comision_pagado), 0) as total_pagado,
        -- Total cobrado del cliente (suma única por venta)
        (SELECT total FROM total_cobrado) as total_cobrado_cliente,
        -- Conteos por estado
        COUNT(*) as total_comisiones,
        COUNT(*) FILTER (WHERE estado = 'pagado') as comisiones_pagadas,
        COUNT(*) FILTER (WHERE estado = 'parcial') as comisiones_parciales,
        COUNT(*) FILTER (WHERE estado = 'pendiente') as comisiones_pendientes,
        -- Conteos por rol
        COUNT(*) FILTER (WHERE split = 'vendedor') as comisiones_vendedor,
        COUNT(*) FILTER (WHERE split = 'captador') as comisiones_captador,
        COUNT(*) FILTER (WHERE split = 'referidor') as comisiones_referidor,
        COUNT(*) FILTER (WHERE split IN ('owner', 'empresa')) as comisiones_empresa,
        COUNT(*) FILTER (WHERE split = 'vendedor_externo') as comisiones_externo
      FROM comisiones_calc
    `;

    const result = await query(sql, params);
    const row = result.rows[0] || {};

    const totalProyectado = parseFloat(row.total_proyectado) || 0;
    const totalHabilitado = parseFloat(row.total_habilitado) || 0;
    const totalPagado = parseFloat(row.total_pagado) || 0;
    const totalCobradoCliente = parseFloat(row.total_cobrado_cliente) || 0;

    // Pendiente de pagar = lo habilitado menos lo ya pagado
    const pendientePagar = Math.max(0, totalHabilitado - totalPagado);
    // Por cobrar futuro = lo proyectado menos lo ya cobrado del cliente
    const porCobrarFuturo = Math.max(0, totalProyectado - totalCobradoCliente);

    res.json({
      montos: {
        total_proyectado: totalProyectado,
        total_cobrado: totalCobradoCliente, // Nuevo: total cobrado del cliente
        total_habilitado: totalHabilitado,
        total_pagado: totalPagado,
        pendiente_cobro: pendientePagar, // Renombrado para claridad: pendiente de pagar a participantes
        por_cobrar_futuro: porCobrarFuturo, // Pendiente de cobrar al cliente
      },
      estados: {
        total: parseInt(row.total_comisiones) || 0,
        pagadas: parseInt(row.comisiones_pagadas) || 0,
        parciales: parseInt(row.comisiones_parciales) || 0,
        pendientes: parseInt(row.comisiones_pendientes) || 0,
      },
      roles: {
        vendedor: parseInt(row.comisiones_vendedor) || 0,
        captador: parseInt(row.comisiones_captador) || 0,
        referidor: parseInt(row.comisiones_referidor) || 0,
        empresa: parseInt(row.comisiones_empresa) || 0,
        externo: parseInt(row.comisiones_externo) || 0,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/comisiones/mis-comisiones
 *
 * Shortcut para obtener comisiones del usuario autenticado
 * Requiere usuario_id en query o header
 */
router.get('/mis-comisiones', async (req: Request<TenantParams, any, any, ComisionesQuery & { mi_usuario_id?: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const usuarioId = req.query.mi_usuario_id || req.headers['x-user-id'] as string;

    if (!usuarioId) {
      return res.status(400).json({ error: 'Se requiere mi_usuario_id o header x-user-id' });
    }

    // Redirigir a la ruta principal con el filtro de usuario
    req.query.usuario_id = usuarioId;
    req.query.include_empresa = 'false'; // No mostrar comisiones de empresa en "mis comisiones"

    // Llamar al handler principal
    const params: any[] = [tenantId, usuarioId];

    const sql = `
      SELECT
        c.*,
        v.nombre_negocio as venta_nombre,
        v.valor_cierre as venta_valor,
        ev.nombre as venta_estado,
        v.created_at as venta_fecha,
        v.moneda as venta_moneda
      FROM comisiones c
      INNER JOIN ventas v ON c.venta_id = v.id AND v.activo = true
      LEFT JOIN estados_venta ev ON v.estado_venta_id = ev.id
      WHERE c.tenant_id = $1 AND c.usuario_id = $2
      ORDER BY c.created_at DESC
      LIMIT 100
    `;

    const result = await query(sql, params);

    // Agrupar por rol para mostrar resumen
    const porRol: Record<string, { cantidad: number; monto: number; pagado: number }> = {};

    interface MisComisionesRow {
      id: string;
      venta_id: string;
      monto: string | number;
      monto_pagado: string | number;
      moneda: string | null;
      estado: string;
      datos_extra: Record<string, unknown> | string | null;
      created_at: string;
      venta_nombre: string | null;
      venta_valor: string | number | null;
      venta_fecha: string | null;
      venta_moneda: string | null;
    }

    const comisiones = result.rows.map((row: MisComisionesRow) => {
      const datosExtra = typeof row.datos_extra === 'string'
        ? JSON.parse(row.datos_extra)
        : (row.datos_extra || {});

      const rol = datosExtra.split || 'vendedor';
      const monto = toNumber(row.monto);
      const pagado = toNumber(row.monto_pagado);

      // Acumular por rol
      if (!porRol[rol]) {
        porRol[rol] = { cantidad: 0, monto: 0, pagado: 0 };
      }
      porRol[rol].cantidad++;
      porRol[rol].monto += monto;
      porRol[rol].pagado += pagado;

      return {
        id: row.id,
        venta_id: row.venta_id,
        rol,
        monto,
        monto_pagado: pagado,
        pendiente: Math.max(0, monto - pagado),
        moneda: row.moneda || row.venta_moneda || 'USD',
        estado: row.estado,
        venta: {
          id: row.venta_id,
          nombre: row.venta_nombre || 'Sin nombre',
          valor: toNumber(row.venta_valor),
          fecha: row.venta_fecha,
        },
        created_at: row.created_at,
      };
    });

    // Calcular totales
    const totales = {
      proyectado: comisiones.reduce((sum, c) => sum + c.monto, 0),
      pagado: comisiones.reduce((sum, c) => sum + c.monto_pagado, 0),
      pendiente: comisiones.reduce((sum, c) => sum + c.pendiente, 0),
    };

    res.json({
      comisiones,
      resumen_por_rol: porRol,
      totales,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
