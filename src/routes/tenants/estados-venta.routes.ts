/**
 * MÓDULO DE ESTADOS DE VENTA
 *
 * Rutas: /api/tenants/:tenantId/estados-venta
 * Maneja el catálogo de estados para las ventas.
 */

import express, { Request, Response, NextFunction } from 'express';
import { query } from '../../utils/db.js';

const router = express.Router({ mergeParams: true });

interface TenantParams { tenantId: string }
interface EstadoParams extends TenantParams { estadoId: string }

/**
 * GET /api/tenants/:tenantId/estados-venta
 * Obtiene todos los estados de venta del tenant
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { incluir_inactivos } = req.query;

    let sql = `
      SELECT * FROM estados_venta
      WHERE tenant_id = $1
    `;

    if (incluir_inactivos !== 'true') {
      sql += ' AND activo = true';
    }

    sql += ' ORDER BY orden ASC, nombre ASC';

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
router.get('/:estadoId', async (req: Request<EstadoParams>, res: Response, next: NextFunction) => {
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
router.post('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { nombre, descripcion, color, es_final, orden } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const sql = `
      INSERT INTO estados_venta (tenant_id, nombre, descripcion, color, es_final, orden)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId,
      nombre,
      descripcion || null,
      color || '#6B7280',
      es_final || false,
      orden || 0
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/estados-venta/:estadoId
 * Actualiza un estado de venta
 */
router.put('/:estadoId', async (req: Request<EstadoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, estadoId } = req.params;
    const { nombre, descripcion, color, es_final, orden, activo } = req.body;

    const sql = `
      UPDATE estados_venta SET
        nombre = COALESCE($3, nombre),
        descripcion = COALESCE($4, descripcion),
        color = COALESCE($5, color),
        es_final = COALESCE($6, es_final),
        orden = COALESCE($7, orden),
        activo = COALESCE($8, activo),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [tenantId, estadoId, nombre, descripcion, color, es_final, orden, activo]);
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
router.delete('/:estadoId', async (req: Request<EstadoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, estadoId } = req.params;

    // Verificar si hay ventas usando este estado
    const checkSql = 'SELECT COUNT(*) as count FROM ventas WHERE estado_venta_id = $1 AND tenant_id = $2';
    const checkResult = await query(checkSql, [estadoId, tenantId]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      // Solo desactivar si hay ventas usando este estado
      const sql = 'UPDATE estados_venta SET activo = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2 RETURNING *';
      const result = await query(sql, [tenantId, estadoId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Estado de venta no encontrado' });
      }
      return res.json({ success: true, message: 'Estado de venta desactivado (tiene ventas asociadas)' });
    }

    // Eliminar completamente si no hay ventas
    const sql = 'DELETE FROM estados_venta WHERE tenant_id = $1 AND id = $2 RETURNING *';
    const result = await query(sql, [tenantId, estadoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estado de venta no encontrado' });
    }
    res.json({ success: true, message: 'Estado de venta eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/estados-venta/orden
 * Reordena los estados de venta
 */
router.put('/reordenar', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { estados } = req.body; // Array de { id, orden }

    if (!Array.isArray(estados)) {
      return res.status(400).json({ error: 'Se requiere un array de estados con id y orden' });
    }

    for (const estado of estados) {
      await query(
        'UPDATE estados_venta SET orden = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2',
        [tenantId, estado.id, estado.orden]
      );
    }

    // Retornar estados actualizados
    const result = await query(
      'SELECT * FROM estados_venta WHERE tenant_id = $1 ORDER BY orden ASC, nombre ASC',
      [tenantId]
    );

    res.json({ success: true, estados: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
