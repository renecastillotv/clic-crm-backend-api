/**
 * MÓDULO DE OFICINAS - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de oficinas del CRM.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express from 'express'
import { query } from '../../utils/db.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  oficinaId?: string;
}

const router = express.Router({ mergeParams: true });

/**
 * GET /api/tenants/:tenantId/oficinas
 * Obtiene lista de oficinas del tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { activo } = req.query;

    let sql = `
      SELECT
        o.id, o.nombre, o.codigo, o.direccion, o.ciudad, o.provincia, o.pais,
        o.codigo_postal, o.telefono, o.email, o.zona_trabajo,
        o.administrador_id, o.activo,
        o.created_at, o.updated_at,
        (SELECT COUNT(*) FROM equipos e WHERE e.oficina_id = o.id AND e.activo = true) as total_equipos,
        0 as total_usuarios
      FROM oficinas o
      WHERE o.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (activo !== 'false') {
      sql += ' AND o.activo = true';
    }

    sql += ' ORDER BY o.nombre ASC';

    const result = await query(sql, params);
    res.json({ oficinas: result.rows, total: result.rows.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/oficinas/:oficinaId
 * Obtiene una oficina específica
 */
router.get('/:oficinaId', async (req, res, next) => {
  try {
    const { tenantId, oficinaId } = req.params as RouteParams;

    const result = await query(
      `SELECT
        o.id, o.nombre, o.codigo, o.direccion, o.ciudad, o.provincia, o.pais,
        o.codigo_postal, o.telefono, o.email, o.zona_trabajo,
        o.administrador_id, o.activo,
        o.created_at, o.updated_at
      FROM oficinas o
      WHERE o.id = $1 AND o.tenant_id = $2`,
      [oficinaId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Oficina no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/oficinas
 * Crea una nueva oficina
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const {
      nombre, codigo, direccion, ciudad, provincia, pais,
      codigo_postal, telefono, email, zona_trabajo, administrador_id
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const result = await query(
      `INSERT INTO oficinas (
        tenant_id, nombre, codigo, direccion, ciudad, provincia, pais,
        codigo_postal, telefono, email, zona_trabajo, administrador_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        tenantId, nombre, codigo, direccion, ciudad, provincia, pais,
        codigo_postal, telefono, email, zona_trabajo, administrador_id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/oficinas/:oficinaId
 * Actualiza una oficina existente
 */
router.put('/:oficinaId', async (req, res, next) => {
  try {
    const { tenantId, oficinaId } = req.params as RouteParams;
    const {
      nombre, codigo, direccion, ciudad, provincia, pais,
      codigo_postal, telefono, email, zona_trabajo, administrador_id, activo
    } = req.body;

    const result = await query(
      `UPDATE oficinas SET
        nombre = COALESCE($3, nombre),
        codigo = COALESCE($4, codigo),
        direccion = COALESCE($5, direccion),
        ciudad = COALESCE($6, ciudad),
        provincia = COALESCE($7, provincia),
        pais = COALESCE($8, pais),
        codigo_postal = COALESCE($9, codigo_postal),
        telefono = COALESCE($10, telefono),
        email = COALESCE($11, email),
        zona_trabajo = COALESCE($12, zona_trabajo),
        administrador_id = COALESCE($13, administrador_id),
        activo = COALESCE($14, activo),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [
        oficinaId, tenantId, nombre, codigo, direccion, ciudad, provincia, pais,
        codigo_postal, telefono, email, zona_trabajo, administrador_id, activo
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Oficina no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/oficinas/:oficinaId
 * Elimina una oficina (soft delete)
 */
router.delete('/:oficinaId', async (req, res, next) => {
  try {
    const { tenantId, oficinaId } = req.params as RouteParams;

    const result = await query(
      `UPDATE oficinas SET activo = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [oficinaId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Oficina no encontrada' });
    }

    res.json({ success: true, message: 'Oficina eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/oficinas/:oficinaId/equipos
 * Obtiene los equipos de una oficina
 */
router.get('/:oficinaId/equipos', async (req, res, next) => {
  try {
    const { tenantId, oficinaId } = req.params as RouteParams;

    const result = await query(
      `SELECT
        e.id, e.nombre, e.slug, e.descripcion, e.color, e.activo,
        u.nombre as lider_nombre,
        0 as total_miembros
      FROM equipos e
      LEFT JOIN usuarios u ON e.lider_id = u.id
      WHERE e.oficina_id = $1 AND e.tenant_id = $2 AND e.activo = true
      ORDER BY e.nombre ASC`,
      [oficinaId, tenantId]
    );

    res.json({ equipos: result.rows, total: result.rows.length });
  } catch (error) {
    next(error);
  }
});

export default router;
