/**
 * MÓDULO DE VENTAS - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de ventas del CRM.
 * Incluye: ventas, estados-venta, ventas-stats, expediente
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express, { Request, Response, NextFunction } from 'express';
import { query } from '../../utils/db.js';
import {
  getRequerimientosExpediente,
  getItemsExpediente,
  upsertItemExpediente,
  deleteItemExpediente,
} from '../../services/expedienteService.js';
import { calcularYCrearComisiones, modificarDistribucion, getMisComisiones } from '../../services/comisionesService.js';
import * as ventasCobrosService from '../../services/ventasCobrosService.js';
import * as ventasHistorialService from '../../services/ventasHistorialService.js';
import * as pagosComisionesService from '../../services/pagosComisionesService.js';

const router = express.Router({ mergeParams: true });

// Tipo para request con tenantId del parent router
interface TenantParams { tenantId: string }
interface VentaParams extends TenantParams { ventaId: string }
interface EstadoParams extends TenantParams { estadoId: string }

// ==================== RUTAS: ESTADOS DE VENTA ====================

/**
 * GET /api/tenants/:tenantId/estados-venta
 * Obtiene todos los estados de venta del tenant
 */
router.get('/estados-venta', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const sql = `
      SELECT * FROM estados_venta
      WHERE tenant_id = $1 AND activo = true
      ORDER BY orden ASC, nombre ASC
    `;
    const result = await query(sql, [tenantId]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/estados-venta/:estadoId
 * Obtiene un estado de venta específico
 */
router.get('/estados-venta/:estadoId', async (req: Request<EstadoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, estadoId } = req.params;
    const sql = 'SELECT * FROM estados_venta WHERE tenant_id = $1 AND id = $2';
    const result = await query(sql, [tenantId, estadoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estado de venta no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/estados-venta
 * Crea un nuevo estado de venta
 */
router.post('/estados-venta', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { nombre, descripcion, es_final, orden } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const sql = `
      INSERT INTO estados_venta (tenant_id, nombre, descripcion, es_final, orden)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await query(sql, [tenantId, nombre, descripcion || null, es_final || false, orden || 0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/estados-venta/:estadoId
 * Actualiza un estado de venta
 */
router.put('/estados-venta/:estadoId', async (req: Request<EstadoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, estadoId } = req.params;
    const { nombre, descripcion, es_final, orden, activo } = req.body;

    const sql = `
      UPDATE estados_venta SET
        nombre = COALESCE($3, nombre),
        descripcion = COALESCE($4, descripcion),
        es_final = COALESCE($5, es_final),
        orden = COALESCE($6, orden),
        activo = COALESCE($7, activo),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [tenantId, estadoId, nombre, descripcion, es_final, orden, activo]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estado de venta no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/estados-venta/:estadoId
 * Elimina (desactiva) un estado de venta
 */
router.delete('/estados-venta/:estadoId', async (req: Request<EstadoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, estadoId } = req.params;
    const sql = 'UPDATE estados_venta SET activo = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2 RETURNING *';
    const result = await query(sql, [tenantId, estadoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estado de venta no encontrado' });
    }
    res.json({ success: true, message: 'Estado de venta eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: VENTAS ====================

/**
 * GET /api/tenants/:tenantId/ventas
 * Obtiene lista de ventas con filtros
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const {
      estado_venta_id,
      usuario_cerrador_id,
      contacto_id,
      propiedad_id,
      completada,
      cancelada,
      fecha_inicio,
      fecha_fin,
      busqueda,
      page = '1',
      limit = '50'
    } = req.query;

    let sql = `
      SELECT v.*,
        ev.nombre as estado_venta_nombre,
        c.nombre as contacto_nombre,
        c.apellido as contacto_apellido,
        c.email as contacto_email,
        p.titulo as propiedad_nombre,
        p.codigo as propiedad_codigo,
        p.imagen_principal as propiedad_imagen,
        u.nombre as usuario_cerrador_nombre,
        u.apellido as usuario_cerrador_apellido,
        u.avatar_url as usuario_cerrador_avatar
      FROM ventas v
      LEFT JOIN estados_venta ev ON v.estado_venta_id = ev.id
      LEFT JOIN contactos c ON v.contacto_id = c.id
      LEFT JOIN propiedades p ON v.propiedad_id = p.id
      LEFT JOIN usuarios u ON v.usuario_cerrador_id = u.id
      WHERE v.tenant_id = $1 AND v.activo = true
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (estado_venta_id) {
      sql += ` AND v.estado_venta_id = $${paramIndex}`;
      params.push(estado_venta_id);
      paramIndex++;
    }

    if (usuario_cerrador_id) {
      sql += ` AND v.usuario_cerrador_id = $${paramIndex}`;
      params.push(usuario_cerrador_id);
      paramIndex++;
    }

    if (contacto_id) {
      sql += ` AND v.contacto_id = $${paramIndex}`;
      params.push(contacto_id);
      paramIndex++;
    }

    if (propiedad_id) {
      sql += ` AND v.propiedad_id = $${paramIndex}`;
      params.push(propiedad_id);
      paramIndex++;
    }

    if (completada !== undefined) {
      sql += ` AND v.completada = $${paramIndex}`;
      params.push(completada === 'true');
      paramIndex++;
    }

    if (cancelada !== undefined) {
      sql += ` AND v.cancelada = $${paramIndex}`;
      params.push(cancelada === 'true');
      paramIndex++;
    }

    if (fecha_inicio) {
      sql += ` AND v.fecha_cierre >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin) {
      sql += ` AND v.fecha_cierre <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }

    if (busqueda) {
      sql += ` AND (v.nombre_negocio ILIKE $${paramIndex} OR v.descripcion ILIKE $${paramIndex} OR CAST(v.numero_venta AS TEXT) = $${paramIndex + 1})`;
      params.push(`%${busqueda}%`);
      params.push(busqueda);
      paramIndex += 2;
    }

    // Contar total
    const countSql = sql.replace(/SELECT v\.\*.*FROM ventas v/, 'SELECT COUNT(*) as total FROM ventas v');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Ordenar y paginar
    sql += ' ORDER BY v.created_at DESC';
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await query(sql, params);
    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/ventas/stats
 * Obtiene estadísticas de ventas
 */
router.get('/stats', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    let dateFilter = '';
    const params: any[] = [tenantId];

    if (fecha_inicio && fecha_fin) {
      dateFilter = 'AND fecha_cierre BETWEEN $2 AND $3';
      params.push(fecha_inicio, fecha_fin);
    }

    const sql = `
      SELECT
        COUNT(*) as total_ventas,
        COUNT(*) FILTER (WHERE completada = true) as ventas_completadas,
        COUNT(*) FILTER (WHERE cancelada = true) as ventas_canceladas,
        COUNT(*) FILTER (WHERE completada = false AND cancelada = false) as ventas_en_proceso,
        COALESCE(SUM(valor_cierre) FILTER (WHERE completada = true), 0) as valor_total_completadas,
        COALESCE(SUM(monto_comision) FILTER (WHERE completada = true), 0) as comisiones_totales,
        COALESCE(AVG(valor_cierre) FILTER (WHERE completada = true), 0) as valor_promedio
      FROM ventas
      WHERE tenant_id = $1 AND activo = true ${dateFilter}
    `;

    const result = await query(sql, params);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId
 * Obtiene una venta específica con todos sus detalles
 */
router.get('/:ventaId', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const sql = `
      SELECT v.*,
        ev.nombre as estado_venta_nombre,
        c.nombre as contacto_nombre,
        c.apellido as contacto_apellido,
        c.email as contacto_email,
        c.telefono as contacto_telefono,
        p.titulo as propiedad_nombre,
        p.codigo as propiedad_codigo,
        p.imagen_principal as propiedad_imagen,
        u.nombre as usuario_cerrador_nombre,
        u.apellido as usuario_cerrador_apellido,
        u.email as usuario_cerrador_email,
        u.avatar_url as usuario_cerrador_avatar
      FROM ventas v
      LEFT JOIN estados_venta ev ON v.estado_venta_id = ev.id
      LEFT JOIN contactos c ON v.contacto_id = c.id
      LEFT JOIN propiedades p ON v.propiedad_id = p.id
      LEFT JOIN usuarios u ON v.usuario_cerrador_id = u.id
      WHERE v.tenant_id = $1 AND v.id = $2
    `;
    const result = await query(sql, [tenantId, ventaId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/ventas
 * Crea una nueva venta
 */
router.post('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const {
      nombre_negocio,
      descripcion,
      propiedad_id,
      unidad_id,
      contacto_id,
      usuario_cerrador_id,
      captador_id,
      equipo_id,
      vendedor_externo_tipo,
      vendedor_externo_nombre,
      vendedor_externo_contacto,
      vendedor_externo_id,
      referidor_nombre,
      referidor_id,
      referidor_contacto_id,
      estado_venta_id,
      solicitud_id,
      es_propiedad_externa,
      nombre_propiedad_externa,
      codigo_propiedad_externa,
      ciudad_propiedad,
      sector_propiedad,
      categoria_propiedad,
      numero_unidad,
      valor_cierre,
      moneda,
      porcentaje_comision,
      monto_comision,
      fecha_cierre,
      aplica_impuestos,
      monto_impuestos,
      notas,
      datos_extra
    } = req.body;

    if (!valor_cierre) {
      return res.status(400).json({ error: 'El valor de cierre es requerido' });
    }

    // Calcular monto_comision automáticamente si hay porcentaje pero no monto
    let montoComisionCalculado = monto_comision;
    if (!monto_comision && porcentaje_comision && valor_cierre) {
      montoComisionCalculado = (parseFloat(valor_cierre) * parseFloat(porcentaje_comision)) / 100;
    }

    // Obtener el próximo número de venta
    const numResult = await query(
      'SELECT COALESCE(MAX(numero_venta), 0) + 1 as next_num FROM ventas WHERE tenant_id = $1',
      [tenantId]
    );
    const numero_venta = numResult.rows[0].next_num;

    const sql = `
      INSERT INTO ventas (
        tenant_id, numero_venta, nombre_negocio, descripcion, propiedad_id, unidad_id, contacto_id,
        usuario_cerrador_id, captador_id, equipo_id, vendedor_externo_tipo, vendedor_externo_nombre,
        vendedor_externo_contacto, vendedor_externo_id, referidor_nombre, referidor_id,
        referidor_contacto_id, estado_venta_id, solicitud_id, es_propiedad_externa, nombre_propiedad_externa,
        codigo_propiedad_externa, ciudad_propiedad, sector_propiedad, categoria_propiedad,
        numero_unidad, valor_cierre, moneda, porcentaje_comision, monto_comision,
        fecha_cierre, aplica_impuestos, monto_impuestos, notas, datos_extra
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35
      )
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, numero_venta, nombre_negocio, descripcion, propiedad_id, unidad_id || null, contacto_id,
      usuario_cerrador_id, captador_id || null, equipo_id, vendedor_externo_tipo, vendedor_externo_nombre,
      vendedor_externo_contacto, vendedor_externo_id, referidor_nombre, referidor_id,
      referidor_contacto_id, estado_venta_id, solicitud_id || null, es_propiedad_externa || false, nombre_propiedad_externa,
      codigo_propiedad_externa, ciudad_propiedad, sector_propiedad, categoria_propiedad,
      numero_unidad, valor_cierre, moneda || 'USD', porcentaje_comision, montoComisionCalculado,
      fecha_cierre, aplica_impuestos || false, monto_impuestos, notas,
      datos_extra ? JSON.stringify(datos_extra) : '{}'
    ]);

    const ventaCreada = result.rows[0];

    // Crear comisiones automáticamente si hay monto de comisión
    if (montoComisionCalculado && montoComisionCalculado > 0) {
      try {
        await calcularYCrearComisiones(
          tenantId,
          ventaCreada.id,
          montoComisionCalculado,
          moneda || 'USD',
          porcentaje_comision || 0,
          usuario_cerrador_id || null,
          {
            vendedor_id: usuario_cerrador_id || null,
            captador_id: captador_id || null,
            referidor_id: referidor_id || null,
            referidor_contacto_id: referidor_contacto_id || null,
            referidor_nombre: referidor_nombre || null,
            vendedor_externo_id: vendedor_externo_id || null,
            vendedor_externo_tipo: vendedor_externo_tipo || null,
            vendedor_externo_nombre: vendedor_externo_nombre || null,
          }
        );
        console.log(`✅ Comisiones creadas automáticamente para venta ${ventaCreada.id}`);
      } catch (comisionError) {
        console.error('⚠️ Error creando comisiones:', comisionError);
        // No fallar la creación de venta si las comisiones fallan
      }
    }

    res.status(201).json(ventaCreada);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/ventas/:ventaId
 * Actualiza una venta
 */
router.put('/:ventaId', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const {
      nombre_negocio,
      descripcion,
      propiedad_id,
      unidad_id,
      contacto_id,
      usuario_cerrador_id,
      captador_id,
      equipo_id,
      vendedor_externo_tipo,
      vendedor_externo_nombre,
      vendedor_externo_contacto,
      vendedor_externo_id,
      referidor_nombre,
      referidor_id,
      referidor_contacto_id,
      estado_venta_id,
      solicitud_id,
      es_propiedad_externa,
      nombre_propiedad_externa,
      codigo_propiedad_externa,
      ciudad_propiedad,
      sector_propiedad,
      categoria_propiedad,
      numero_unidad,
      valor_cierre,
      moneda,
      porcentaje_comision,
      monto_comision,
      estado_comision,
      monto_comision_pagado,
      fecha_pago_comision,
      notas_comision,
      fecha_cierre,
      aplica_impuestos,
      monto_impuestos,
      completada,
      cancelada,
      fecha_cancelacion,
      cancelado_por_id,
      razon_cancelacion,
      notas,
      datos_extra
    } = req.body;

    // Calcular monto_comision automáticamente si hay porcentaje pero no monto
    let montoComisionCalculado = monto_comision;
    if (!monto_comision && porcentaje_comision && valor_cierre) {
      montoComisionCalculado = (parseFloat(valor_cierre) * parseFloat(porcentaje_comision)) / 100;
    }

    // Log para debug
    console.log('📝 Actualizando venta:', {
      ventaId,
      estado_venta_id,
      valor_cierre,
      porcentaje_comision,
      monto_comision,
      montoComisionCalculado
    });

    const sql = `
      UPDATE ventas SET
        nombre_negocio = COALESCE($3, nombre_negocio),
        descripcion = COALESCE($4, descripcion),
        propiedad_id = $5,
        unidad_id = $6,
        contacto_id = $7,
        usuario_cerrador_id = $8,
        captador_id = $9,
        equipo_id = $10,
        vendedor_externo_tipo = $11,
        vendedor_externo_nombre = $12,
        vendedor_externo_contacto = $13,
        vendedor_externo_id = $14,
        referidor_nombre = $15,
        referidor_id = $16,
        referidor_contacto_id = $17,
        estado_venta_id = COALESCE($18, estado_venta_id),
        solicitud_id = $19,
        es_propiedad_externa = COALESCE($20, es_propiedad_externa),
        nombre_propiedad_externa = $21,
        codigo_propiedad_externa = $22,
        ciudad_propiedad = $23,
        sector_propiedad = $24,
        categoria_propiedad = $25,
        numero_unidad = $26,
        valor_cierre = COALESCE($27, valor_cierre),
        moneda = COALESCE($28, moneda),
        porcentaje_comision = $29,
        monto_comision = $30,
        estado_comision = COALESCE($31, estado_comision),
        monto_comision_pagado = COALESCE($32, monto_comision_pagado),
        fecha_pago_comision = $33,
        notas_comision = $34,
        fecha_cierre = $35,
        aplica_impuestos = COALESCE($36, aplica_impuestos),
        monto_impuestos = $37,
        completada = COALESCE($38, completada),
        cancelada = COALESCE($39, cancelada),
        fecha_cancelacion = $40,
        cancelado_por_id = $41,
        razon_cancelacion = $42,
        notas = $43,
        datos_extra = COALESCE($44, datos_extra),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, ventaId, nombre_negocio, descripcion, propiedad_id, unidad_id || null, contacto_id,
      usuario_cerrador_id, captador_id || null, equipo_id, vendedor_externo_tipo, vendedor_externo_nombre,
      vendedor_externo_contacto, vendedor_externo_id, referidor_nombre, referidor_id,
      referidor_contacto_id, estado_venta_id, solicitud_id || null, es_propiedad_externa, nombre_propiedad_externa,
      codigo_propiedad_externa, ciudad_propiedad, sector_propiedad, categoria_propiedad,
      numero_unidad, valor_cierre, moneda, porcentaje_comision, montoComisionCalculado,
      estado_comision, monto_comision_pagado, fecha_pago_comision, notas_comision,
      fecha_cierre, aplica_impuestos, monto_impuestos, completada, cancelada,
      fecha_cancelacion, cancelado_por_id, razon_cancelacion, notas,
      datos_extra ? JSON.stringify(datos_extra) : null
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const ventaActualizada = result.rows[0];

    // Crear/actualizar comisiones si hay monto de comisión (calculado o recibido)
    const montoParaComisiones = montoComisionCalculado || ventaActualizada.monto_comision;
    if (montoParaComisiones && montoParaComisiones > 0) {
      try {
        await calcularYCrearComisiones(
          tenantId,
          ventaId,
          montoParaComisiones,
          moneda || ventaActualizada.moneda || 'USD',
          porcentaje_comision || ventaActualizada.porcentaje_comision || 0,
          usuario_cerrador_id || ventaActualizada.usuario_cerrador_id || null,
          {
            vendedor_id: usuario_cerrador_id || ventaActualizada.usuario_cerrador_id || null,
            captador_id: captador_id || ventaActualizada.captador_id || null,
            referidor_id: referidor_id || ventaActualizada.referidor_id || null,
            referidor_contacto_id: referidor_contacto_id || ventaActualizada.referidor_contacto_id || null,
            referidor_nombre: referidor_nombre || ventaActualizada.referidor_nombre || null,
            vendedor_externo_id: vendedor_externo_id || ventaActualizada.vendedor_externo_id || null,
            vendedor_externo_tipo: vendedor_externo_tipo || ventaActualizada.vendedor_externo_tipo || null,
            vendedor_externo_nombre: vendedor_externo_nombre || ventaActualizada.vendedor_externo_nombre || null,
          }
        );
        console.log(`✅ Comisiones actualizadas para venta ${ventaId}`);
      } catch (comisionError) {
        console.error('⚠️ Error actualizando comisiones:', comisionError);
        // No fallar la actualización de venta si las comisiones fallan
      }
    }

    res.json(ventaActualizada);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/ventas/:ventaId
 * Elimina (desactiva) una venta
 */
router.delete('/:ventaId', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const sql = 'UPDATE ventas SET activo = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2 RETURNING *';
    const result = await query(sql, [tenantId, ventaId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json({ success: true, message: 'Venta eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/recalcular-comisiones
 * Recalcula las comisiones de una venta existente, eliminando las anteriores
 * Útil para actualizar ventas creadas antes del nuevo sistema de distribución
 */
router.post('/:ventaId/recalcular-comisiones', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;

    // Obtener la venta con TODOS los campos de participantes
    const ventaResult = await query(
      `SELECT * FROM ventas WHERE tenant_id = $1 AND id = $2 AND activo = true`,
      [tenantId, ventaId]
    );

    if (ventaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = ventaResult.rows[0];

    // Log detallado de los datos de la venta para depuración
    console.log('📋 Datos de la venta para recalcular comisiones:', {
      ventaId: venta.id,
      monto_comision: venta.monto_comision,
      porcentaje_comision: venta.porcentaje_comision,
      usuario_cerrador_id: venta.usuario_cerrador_id,
      captador_id: venta.captador_id,
      referidor_id: venta.referidor_id,
      referidor_contacto_id: venta.referidor_contacto_id,
      referidor_nombre: venta.referidor_nombre,
      vendedor_externo_id: venta.vendedor_externo_id,
      vendedor_externo_tipo: venta.vendedor_externo_tipo,
      vendedor_externo_nombre: venta.vendedor_externo_nombre,
    });

    if (!venta.monto_comision || venta.monto_comision <= 0) {
      return res.status(400).json({ error: 'La venta no tiene monto de comisión definido' });
    }

    // Eliminar comisiones existentes de esta venta
    const deleted = await query(
      `DELETE FROM comisiones WHERE tenant_id = $1 AND venta_id = $2 RETURNING id`,
      [tenantId, ventaId]
    );
    console.log(`🗑️ Eliminadas ${deleted.rows.length} comisiones existentes`);

    console.log(`🔄 Recalculando comisiones para venta ${ventaId}...`);

    // Preparar los participantes para la función
    const participantes = {
      vendedor_id: venta.usuario_cerrador_id || null,
      captador_id: venta.captador_id || null,
      referidor_id: venta.referidor_id || null,
      referidor_contacto_id: venta.referidor_contacto_id || null,
      referidor_nombre: venta.referidor_nombre || null,
      vendedor_externo_id: venta.vendedor_externo_id || null,
      vendedor_externo_tipo: venta.vendedor_externo_tipo || null,
      vendedor_externo_nombre: venta.vendedor_externo_nombre || null,
    };

    console.log('👥 Participantes enviados a calcularYCrearComisiones:', participantes);

    // Crear nuevas comisiones con todos los participantes
    const nuevasComisiones = await calcularYCrearComisiones(
      tenantId,
      ventaId,
      parseFloat(venta.monto_comision),
      venta.moneda || 'USD',
      parseFloat(venta.porcentaje_comision) || 0,
      venta.usuario_cerrador_id || null,
      participantes
    );

    console.log(`✅ Recalculación completa: ${nuevasComisiones.length} comisiones creadas`);

    res.json({
      success: true,
      message: `Comisiones recalculadas: ${nuevasComisiones.length} participantes`,
      comisiones: nuevasComisiones.map(c => ({
        id: c.id,
        tipo: c.datos_extra?.split,
        porcentaje: c.datos_extra?.porcentajeSplit,
        monto: c.monto,
        usuario_id: c.usuario_id,
        nombreExterno: c.datos_extra?.nombreExterno,
      })),
      debug: {
        ventaParticipantes: participantes,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/recalcular-habilitados
 * Recalcula los montos habilitados de las comisiones basándose en los cobros registrados
 * Útil para corregir ventas donde el monto_habilitado no se actualizó correctamente
 */
router.post('/:ventaId/recalcular-habilitados', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;

    // 1. Calcular total cobrado de esta venta (solo cobros)
    const cobrosResult = await query(`
      SELECT COALESCE(SUM(monto), 0) as total_cobrado
      FROM pagos_comisiones
      WHERE tenant_id = $1 AND venta_id = $2 AND (tipo_movimiento = 'cobro' OR tipo_movimiento IS NULL)
    `, [tenantId, ventaId]);

    const totalCobrado = parseFloat(cobrosResult.rows[0]?.total_cobrado || 0);

    // 2. Obtener monto_comision de la venta
    const ventaResult = await query(
      `SELECT id, monto_comision, nombre_negocio FROM ventas WHERE id = $1 AND tenant_id = $2`,
      [ventaId, tenantId]
    );

    if (ventaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = ventaResult.rows[0];
    const montoComision = parseFloat(venta.monto_comision || 0);

    // 3. Calcular porcentaje cobrado
    const porcentajeCobrado = montoComision > 0
      ? Math.round((totalCobrado / montoComision) * 10000) / 100
      : 0;

    // 4. Determinar estado de cobro
    let estadoCobro: string;
    if (totalCobrado === 0) {
      estadoCobro = 'pendiente';
    } else if (totalCobrado >= montoComision) {
      estadoCobro = 'cobrado';
    } else {
      estadoCobro = 'parcial';
    }

    // 5. Actualizar caches de la venta
    await query(`
      UPDATE ventas SET
        cache_monto_cobrado = $1,
        cache_porcentaje_cobrado = $2,
        estado_cobro = $3,
        updated_at = NOW()
      WHERE id = $4 AND tenant_id = $5
    `, [totalCobrado, porcentajeCobrado, estadoCobro, ventaId, tenantId]);

    // 6. Actualizar monto_habilitado de las comisiones (excluyendo empresa/owner)
    const porcentajeHabilitado = porcentajeCobrado / 100;
    const updateResult = await query(`
      UPDATE comisiones SET
        monto_habilitado = ROUND((monto * $1)::numeric, 2),
        updated_at = NOW()
      WHERE tenant_id = $2 AND venta_id = $3
        AND (datos_extra->>'split' IS NULL OR datos_extra->>'split' NOT IN ('empresa', 'owner'))
      RETURNING id, monto, monto_habilitado, datos_extra->>'split' as split
    `, [porcentajeHabilitado, tenantId, ventaId]);

    console.log(`✅ Recalculados montos habilitados para venta ${ventaId}: ${updateResult.rows.length} comisiones actualizadas`);

    res.json({
      success: true,
      message: `Montos habilitados recalculados para ${updateResult.rows.length} comisiones`,
      venta: {
        id: ventaId,
        nombre: venta.nombre_negocio,
        monto_comision: montoComision,
        total_cobrado: totalCobrado,
        porcentaje_cobrado: porcentajeCobrado,
        estado_cobro: estadoCobro,
      },
      comisiones_actualizadas: updateResult.rows.map(c => ({
        id: c.id,
        monto: parseFloat(c.monto),
        monto_habilitado: parseFloat(c.monto_habilitado),
        split: c.split,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/completar
 * Marca una venta como completada
 */
router.post('/:ventaId/completar', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const sql = `
      UPDATE ventas SET
        completada = true,
        fecha_cierre = COALESCE(fecha_cierre, NOW()),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [tenantId, ventaId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/cancelar
 * Cancela una venta
 */
router.post('/:ventaId/cancelar', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const { razon_cancelacion, cancelado_por_id } = req.body;

    const sql = `
      UPDATE ventas SET
        cancelada = true,
        fecha_cancelacion = NOW(),
        cancelado_por_id = $3,
        razon_cancelacion = $4,
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [tenantId, ventaId, cancelado_por_id, razon_cancelacion]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: COMISIONES DE VENTA ====================

interface ComisionParams extends VentaParams { comisionId: string }

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId/comisiones
 * Obtiene las comisiones de una venta
 * Incluye información del usuario, contacto externo y tenant para mostrar nombres correctos
 */
router.get('/:ventaId/comisiones', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const sql = `
      SELECT c.*,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        u.email as usuario_email,
        u.avatar_url as usuario_avatar_url,
        t.nombre as tenant_nombre,
        co.nombre as contacto_nombre,
        co.apellido as contacto_apellido
      FROM comisiones c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      LEFT JOIN contactos co ON c.contacto_externo_id = co.id
      WHERE c.tenant_id = $1 AND c.venta_id = $2
      ORDER BY
        CASE
          WHEN c.datos_extra->>'split' = 'vendedor' THEN 1
          WHEN c.datos_extra->>'split' = 'captador' THEN 2
          WHEN c.datos_extra->>'split' = 'referidor' THEN 3
          WHEN c.datos_extra->>'split' = 'vendedor_externo' THEN 4
          WHEN c.datos_extra->>'split' = 'owner' THEN 5
          ELSE 6
        END,
        c.created_at ASC
    `;
    const result = await query(sql, [tenantId, ventaId]);

    // Formatear la respuesta con el usuario anidado
    const comisiones = result.rows.map(row => {
      // Parsear datos_extra si viene como string
      const datosExtra = typeof row.datos_extra === 'string'
        ? JSON.parse(row.datos_extra)
        : (row.datos_extra || {});

      const tipoParticipante = datosExtra.split || 'vendedor';
      const esEmpresa = tipoParticipante === 'owner' || tipoParticipante === 'empresa';
      const esExterno = datosExtra.esExterno === true;

      // Determinar el nombre a mostrar según el tipo de participante
      let nombreDisplay: string;
      if (esEmpresa) {
        nombreDisplay = row.tenant_nombre || 'Empresa';
      } else if (esExterno && datosExtra.nombreExterno) {
        nombreDisplay = datosExtra.nombreExterno;
      } else if (row.contacto_externo_id && row.contacto_nombre) {
        nombreDisplay = `${row.contacto_nombre || ''} ${row.contacto_apellido || ''}`.trim();
      } else {
        nombreDisplay = `${row.usuario_nombre || ''} ${row.usuario_apellido || ''}`.trim();
      }

      return {
        ...row,
        datos_extra: datosExtra,
        tipo_participante: tipoParticipante,
        usuario: row.usuario_id ? {
          id: row.usuario_id,
          nombre: row.usuario_nombre,
          apellido: row.usuario_apellido,
          email: row.usuario_email,
          avatar_url: row.usuario_avatar_url,
          nombre_display: nombreDisplay,
        } : null,
        contacto: row.contacto_externo_id ? {
          id: row.contacto_externo_id,
          nombre: row.contacto_nombre,
          apellido: row.contacto_apellido,
        } : null,
        tenant_nombre: row.tenant_nombre,
        nombre_display: nombreDisplay,
      };
    });

    res.json({ comisiones });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/comisiones
 * Crea una nueva comisión para una venta
 */
router.post('/:ventaId/comisiones', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const {
      usuario_id,
      monto,
      moneda,
      porcentaje,
      tipo,
      estado,
      notas,
      datos_extra,
      split_porcentaje_vendedor,
      split_porcentaje_owner
    } = req.body;

    if (!usuario_id || !monto) {
      return res.status(400).json({ error: 'usuario_id y monto son requeridos' });
    }

    const sql = `
      INSERT INTO comisiones (
        tenant_id, venta_id, usuario_id, monto, moneda, porcentaje, tipo, estado, notas, datos_extra,
        split_porcentaje_vendedor, split_porcentaje_owner
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, ventaId, usuario_id, monto, moneda || 'USD', porcentaje,
      tipo || 'vendedor', estado || 'pendiente', notas,
      datos_extra ? JSON.stringify(datos_extra) : '{}',
      split_porcentaje_vendedor, split_porcentaje_owner
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/ventas/:ventaId/comisiones/:comisionId
 * Actualiza una comisión
 */
router.put('/:ventaId/comisiones/:comisionId', async (req: Request<ComisionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId, comisionId } = req.params;
    const {
      monto,
      moneda,
      porcentaje,
      estado,
      monto_pagado,
      fecha_pago,
      notas,
      datos_extra
    } = req.body;

    const sql = `
      UPDATE comisiones SET
        monto = COALESCE($4, monto),
        moneda = COALESCE($5, moneda),
        porcentaje = COALESCE($6, porcentaje),
        estado = COALESCE($7, estado),
        monto_pagado = COALESCE($8, monto_pagado),
        fecha_pago = $9,
        notas = COALESCE($10, notas),
        datos_extra = COALESCE($11, datos_extra),
        updated_at = NOW()
      WHERE tenant_id = $1 AND venta_id = $2 AND id = $3
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, ventaId, comisionId, monto, moneda, porcentaje, estado,
      monto_pagado, fecha_pago || null, notas,
      datos_extra ? JSON.stringify(datos_extra) : null
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comisión no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/ventas/:ventaId/comisiones/:comisionId
 * Elimina una comisión
 */
router.delete('/:ventaId/comisiones/:comisionId', async (req: Request<ComisionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId, comisionId } = req.params;
    const sql = 'DELETE FROM comisiones WHERE tenant_id = $1 AND venta_id = $2 AND id = $3 RETURNING *';
    const result = await query(sql, [tenantId, ventaId, comisionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comisión no encontrada' });
    }
    res.json({ success: true, message: 'Comisión eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: PAGOS DE COMISIONES ====================

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId/pagos
 * Obtiene los pagos de comisiones de una venta
 * Incluye información del participante asociado a la comisión
 */
router.get('/:ventaId/pagos', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const sql = `
      SELECT p.*,
        u.nombre as registrado_por_nombre,
        u.apellido as registrado_por_apellido,
        c.datos_extra as comision_datos_extra,
        uc.nombre as comision_usuario_nombre,
        uc.apellido as comision_usuario_apellido,
        co.nombre as comision_contacto_nombre,
        co.apellido as comision_contacto_apellido
      FROM pagos_comisiones p
      LEFT JOIN usuarios u ON p.registrado_por_id = u.id
      LEFT JOIN comisiones c ON p.comision_id = c.id
      LEFT JOIN usuarios uc ON c.usuario_id = uc.id
      LEFT JOIN contactos co ON c.contacto_externo_id = co.id
      WHERE p.tenant_id = $1 AND p.venta_id = $2
      ORDER BY p.fecha_registro DESC
    `;
    const result = await query(sql, [tenantId, ventaId]);

    // Formatear para incluir nombre del participante
    const pagos = result.rows.map(row => {
      const datosExtra = typeof row.comision_datos_extra === 'string'
        ? JSON.parse(row.comision_datos_extra)
        : (row.comision_datos_extra || {});

      // Determinar nombre del participante
      let participanteNombre = '';
      if (datosExtra.nombreExterno) {
        participanteNombre = datosExtra.nombreExterno;
      } else if (row.comision_contacto_nombre) {
        participanteNombre = `${row.comision_contacto_nombre || ''} ${row.comision_contacto_apellido || ''}`.trim();
      } else if (row.comision_usuario_nombre) {
        participanteNombre = `${row.comision_usuario_nombre || ''} ${row.comision_usuario_apellido || ''}`.trim();
      }

      return {
        ...row,
        participante_nombre: participanteNombre,
        tipo_participante: datosExtra.split || null,
      };
    });

    res.json({ pagos });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/pagos
 * Crea un nuevo pago de comisión
 * tipo_movimiento: 'cobro' = entrada de dinero del cliente, 'pago' = salida a participante
 */
router.post('/:ventaId/pagos', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const {
      comision_id,
      monto,
      moneda,
      tipo_pago,
      tipo_movimiento, // 'cobro' o 'pago'
      fecha_pago,
      notas,
      recibo_url,
      registrado_por_id,
      distribucion
    } = req.body;

    if (!monto || !tipo_pago || !fecha_pago) {
      return res.status(400).json({ error: 'monto, tipo_pago y fecha_pago son requeridos' });
    }

    // Intentar agregar la columna si no existe (migración en línea)
    try {
      await query(`ALTER TABLE pagos_comisiones ADD COLUMN IF NOT EXISTS tipo_movimiento VARCHAR(20) DEFAULT 'cobro'`);
    } catch (e) {
      // Ignorar si ya existe o falla
    }

    const sql = `
      INSERT INTO pagos_comisiones (
        tenant_id, venta_id, comision_id, monto, moneda, tipo_pago, tipo_movimiento, fecha_pago, notas,
        recibo_url, registrado_por_id, distribucion, fecha_registro
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, ventaId, comision_id || null, monto, moneda || 'USD', tipo_pago,
      tipo_movimiento || 'cobro', // Por defecto 'cobro' para compatibilidad
      fecha_pago, notas || null, recibo_url || null, registrado_por_id || null,
      distribucion ? JSON.stringify(distribucion) : null
    ]);

    // Si es un COBRO (entrada de dinero del cliente), actualizar caches de la venta y comisiones
    if (tipo_movimiento === 'cobro' || !tipo_movimiento) {
      // Calcular total cobrado de esta venta (solo cobros)
      const cobrosResult = await query(`
        SELECT COALESCE(SUM(monto), 0) as total_cobrado
        FROM pagos_comisiones
        WHERE tenant_id = $1 AND venta_id = $2 AND (tipo_movimiento = 'cobro' OR tipo_movimiento IS NULL)
      `, [tenantId, ventaId]);

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

      // Actualizar caches de la venta
      await query(`
        UPDATE ventas SET
          cache_monto_cobrado = $1,
          cache_porcentaje_cobrado = $2,
          estado_cobro = $3,
          updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5
      `, [totalCobrado, porcentajeCobrado, estadoCobro, ventaId, tenantId]);

      // Habilitar pagos proporcionales a asesores (actualizar monto_habilitado)
      // Actualizar TODAS las comisiones de la venta (excluyendo empresa/owner)
      const porcentajeHabilitado = porcentajeCobrado / 100;
      await query(`
        UPDATE comisiones SET
          monto_habilitado = ROUND((monto * $1)::numeric, 2),
          updated_at = NOW()
        WHERE tenant_id = $2 AND venta_id = $3
          AND (datos_extra->>'split' IS NULL OR datos_extra->>'split' NOT IN ('empresa', 'owner'))
      `, [porcentajeHabilitado, tenantId, ventaId]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: EXPEDIENTE DE VENTA ====================

interface ItemParams extends VentaParams { itemId: string }

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId/expediente/requerimientos
 * Obtiene los requerimientos de expediente disponibles para el tenant
 */
router.get('/:ventaId/expediente/requerimientos', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { categoria = 'cierre_venta' } = req.query;

    const requerimientos = await getRequerimientosExpediente(
      tenantId,
      categoria as 'cierre_venta' | 'cierre_alquiler' | 'cierre_renta'
    );

    res.json(requerimientos);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId/expediente/items
 * Obtiene los items de expediente de una venta (documentos subidos)
 */
router.get('/:ventaId/expediente/items', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;

    const items = await getItemsExpediente(tenantId, ventaId);

    res.json(items);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/expediente/items
 * Sube/actualiza un documento para un requerimiento de expediente
 */
router.post('/:ventaId/expediente/items', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const {
      requerimiento_id,
      url_documento,
      ruta_documento,
      tipo_archivo,
      tamaño_archivo,
      nombre_documento,
      subido_por_id
    } = req.body;

    if (!requerimiento_id || !url_documento) {
      return res.status(400).json({ error: 'requerimiento_id y url_documento son requeridos' });
    }

    const item = await upsertItemExpediente(tenantId, ventaId, requerimiento_id, {
      url_documento,
      ruta_documento,
      tipo_archivo,
      tamaño_archivo,
      nombre_documento,
      subido_por_id
    });

    res.status(201).json(item);
  } catch (error: any) {
    if (error.message === 'Requerimiento no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/ventas/:ventaId/expediente/items/:itemId
 * Elimina un item de expediente (documento)
 */
router.delete('/:ventaId/expediente/items/:itemId', async (req: Request<ItemParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, itemId } = req.params;

    await deleteItemExpediente(tenantId, itemId);

    res.json({ success: true, message: 'Documento eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: COBROS DE EMPRESA ====================

interface CobroParams extends VentaParams { cobroId: string }

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId/cobros
 * Obtiene los cobros de una venta (lo que la empresa ha cobrado al cliente)
 */
router.get('/:ventaId/cobros', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const cobros = await ventasCobrosService.listarCobros(tenantId, ventaId);
    res.json({ cobros });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId/cobros/resumen
 * Obtiene resumen de cobros de una venta
 */
router.get('/:ventaId/cobros/resumen', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const resumen = await ventasCobrosService.getResumenCobros(tenantId, ventaId);
    res.json(resumen);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/cobros
 * Registra un nuevo cobro de la empresa
 */
router.post('/:ventaId/cobros', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const {
      monto,
      moneda,
      fecha_cobro,
      metodo_pago,
      referencia,
      banco,
      recibo_url,
      notas,
      registrado_por_id
    } = req.body;

    if (!monto || !fecha_cobro) {
      return res.status(400).json({ error: 'monto y fecha_cobro son requeridos' });
    }

    const cobro = await ventasCobrosService.registrarCobro({
      tenantId,
      ventaId,
      monto,
      moneda,
      fechaCobro: fecha_cobro,
      metodoPago: metodo_pago,
      referencia,
      banco,
      reciboUrl: recibo_url,
      notas,
      registradoPorId: registrado_por_id
    });

    res.status(201).json(cobro);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/ventas/:ventaId/cobros/:cobroId
 * Actualiza un cobro existente
 */
router.put('/:ventaId/cobros/:cobroId', async (req: Request<CobroParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, cobroId } = req.params;
    const { registrado_por_id, fecha_cobro, metodo_pago, recibo_url, ...rest } = req.body;

    const cobro = await ventasCobrosService.editarCobro({
      tenantId,
      cobroId,
      ...rest,
      fechaCobro: fecha_cobro,
      metodoPago: metodo_pago,
      reciboUrl: recibo_url,
      usuarioId: registrado_por_id
    });
    res.json(cobro);
  } catch (error: any) {
    if (error.message === 'Cobro no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/ventas/:ventaId/cobros/:cobroId
 * Elimina (soft delete) un cobro
 */
router.delete('/:ventaId/cobros/:cobroId', async (req: Request<CobroParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, cobroId } = req.params;
    const { usuario_id } = req.body;

    await ventasCobrosService.eliminarCobro(tenantId, cobroId, usuario_id);
    res.json({ success: true, message: 'Cobro eliminado correctamente' });
  } catch (error: any) {
    if (error.message === 'Cobro no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// ==================== RUTAS: HISTORIAL DE VENTA ====================

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId/historial
 * Obtiene el historial de cambios de una venta
 */
router.get('/:ventaId/historial', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const { limit, offset } = req.query;

    const historial = await ventasHistorialService.obtenerHistorial(tenantId, ventaId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({ historial });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: DISTRIBUCIÓN DE COMISIONES ====================

/**
 * PUT /api/tenants/:tenantId/ventas/:ventaId/comisiones/distribucion
 * Modifica la distribución de comisiones (admin override)
 */
router.put('/:ventaId/comisiones/distribucion', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const { nueva_distribucion, usuario_id } = req.body;

    if (!nueva_distribucion || !Array.isArray(nueva_distribucion)) {
      return res.status(400).json({ error: 'nueva_distribucion debe ser un array' });
    }

    // Validar que cada elemento tenga los campos requeridos
    for (const item of nueva_distribucion) {
      if (!item.comision_id || item.porcentaje === undefined) {
        return res.status(400).json({ error: 'Cada elemento debe tener comision_id y porcentaje' });
      }
    }

    await modificarDistribucion({
      tenantId,
      ventaId,
      nuevaDistribucion: nueva_distribucion.map((item: any) => ({
        comisionId: item.comision_id,
        tipoParticipante: item.tipo_participante || 'vendedor',
        porcentaje: parseFloat(item.porcentaje)
      })),
      registradoPorId: usuario_id
    });

    // Obtener las comisiones actualizadas
    const sql = `
      SELECT c.*,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido
      FROM comisiones c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.tenant_id = $1 AND c.venta_id = $2
      ORDER BY c.tipo_participante, c.created_at
    `;
    const result = await query(sql, [tenantId, ventaId]);

    res.json({ comisiones: result.rows });
  } catch (error: any) {
    if (error.message?.includes('suma de porcentajes')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId/pagos/resumen
 * Obtiene resumen de pagos a asesores de una venta
 */
router.get('/:ventaId/pagos/resumen', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const resumen = await pagosComisionesService.getResumenPagosVenta(tenantId, ventaId);
    res.json(resumen);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/ventas/:ventaId/comisiones/:comisionId/disponible
 * Obtiene el monto disponible para pago de una comisión específica
 */
router.get('/:ventaId/comisiones/:comisionId/disponible', async (req: Request<ComisionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, comisionId } = req.params;
    const disponible = await pagosComisionesService.getDisponibleComision(tenantId, comisionId);
    res.json(disponible);
  } catch (error: any) {
    if (error.message === 'Comisión no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/ventas/:ventaId/pagos-v2
 * Crea un pago de comisión con validaciones
 * (Nueva versión con validaciones de monto_habilitado)
 */
router.post('/:ventaId/pagos-v2', async (req: Request<VentaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, ventaId } = req.params;
    const {
      comision_id,
      monto,
      moneda,
      tipo_pago,
      fecha_pago,
      notas,
      recibo_url,
      registrado_por_id
    } = req.body;

    if (!comision_id || !monto || !tipo_pago || !fecha_pago) {
      return res.status(400).json({ error: 'comision_id, monto, tipo_pago y fecha_pago son requeridos' });
    }

    const pago = await pagosComisionesService.createPagoComision(tenantId, {
      venta_id: ventaId,
      comision_id,
      monto,
      moneda,
      tipo_pago,
      fecha_pago,
      notas,
      recibo_url,
      registrado_por_id
    });

    res.status(201).json(pago);
  } catch (error: any) {
    if (error.message?.includes('excede el disponible') || error.message?.includes('Debe especificar')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Comisión no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/ventas/:ventaId/pagos-v2/:pagoId
 * Elimina (soft delete) un pago de comisión
 */
router.delete('/:ventaId/pagos-v2/:pagoId', async (req: Request<VentaParams & { pagoId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, pagoId } = req.params;
    const { usuario_id } = req.body;

    await pagosComisionesService.deletePagoComision(tenantId, pagoId, usuario_id);
    res.json({ success: true, message: 'Pago eliminado correctamente' });
  } catch (error: any) {
    if (error.message === 'Pago no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// ==================== RUTAS: MIS COMISIONES (VISTA ASESOR) ====================

/**
 * GET /api/tenants/:tenantId/mis-comisiones
 * Obtiene las comisiones del usuario autenticado
 * Nota: Esta ruta debería estar fuera de /ventas pero la incluimos aquí por conveniencia
 */
router.get('/mis-comisiones/:usuarioId', async (req: Request<TenantParams & { usuarioId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const { estado, page, limit } = req.query;

    const resultado = await getMisComisiones(tenantId, usuarioId, {
      estado: estado as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: page ? (parseInt(page as string) - 1) * (limit ? parseInt(limit as string) : 20) : undefined
    });

    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

export default router;
