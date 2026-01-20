/**
 * MÓDULO DE EQUIPOS - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de equipos del CRM.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express from 'express'
import { query } from '../../utils/db.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  equipoId?: string;
  miembroId?: string;
}

const router = express.Router({ mergeParams: true });

/**
 * GET /api/tenants/:tenantId/equipos
 * Obtiene lista de equipos del tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { activo } = req.query;

    let sql = `
      SELECT
        e.id, e.nombre, e.slug, e.descripcion, e.color,
        e.lider_id, e.oficina_id, e.activo,
        e.zona_principal, e.zonas_cobertura, e.meta_mensual,
        e.split_comision_equipo, e.asistente_id, e.metadata,
        e.created_at, e.updated_at,
        u.nombre as lider_nombre,
        o.nombre as oficina_nombre,
        0 as total_miembros
      FROM equipos e
      LEFT JOIN usuarios u ON e.lider_id = u.id
      LEFT JOIN oficinas o ON e.oficina_id = o.id
      WHERE e.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (activo !== 'false') {
      sql += ' AND e.activo = true';
    }

    sql += ' ORDER BY e.nombre ASC';

    const result = await query(sql, params);
    res.json({ equipos: result.rows, total: result.rows.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/equipos/:equipoId
 * Obtiene un equipo específico
 */
router.get('/:equipoId', async (req, res, next) => {
  try {
    const { tenantId, equipoId } = req.params as RouteParams;

    const result = await query(
      `SELECT
        e.id, e.nombre, e.slug, e.descripcion, e.color,
        e.lider_id, e.oficina_id, e.activo,
        e.zona_principal, e.zonas_cobertura, e.meta_mensual,
        e.split_comision_equipo, e.asistente_id, e.metadata,
        e.created_at, e.updated_at,
        u.nombre as lider_nombre,
        o.nombre as oficina_nombre
      FROM equipos e
      LEFT JOIN usuarios u ON e.lider_id = u.id
      LEFT JOIN oficinas o ON e.oficina_id = o.id
      WHERE e.id = $1 AND e.tenant_id = $2`,
      [equipoId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/equipos
 * Crea un nuevo equipo
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { nombre, descripcion, color, lider_id, oficina_id, zona_principal, zonas_cobertura, meta_mensual } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const result = await query(
      `INSERT INTO equipos (tenant_id, nombre, descripcion, color, lider_id, oficina_id, zona_principal, zonas_cobertura, meta_mensual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [tenantId, nombre, descripcion, color, lider_id, oficina_id, zona_principal, zonas_cobertura, meta_mensual]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/equipos/:equipoId
 * Actualiza un equipo existente
 */
router.put('/:equipoId', async (req, res, next) => {
  try {
    const { tenantId, equipoId } = req.params as RouteParams;
    const { nombre, descripcion, color, lider_id, oficina_id, activo, zona_principal, zonas_cobertura, meta_mensual } = req.body;

    const result = await query(
      `UPDATE equipos
       SET nombre = COALESCE($3, nombre),
           descripcion = COALESCE($4, descripcion),
           color = COALESCE($5, color),
           lider_id = COALESCE($6, lider_id),
           oficina_id = COALESCE($7, oficina_id),
           activo = COALESCE($8, activo),
           zona_principal = COALESCE($9, zona_principal),
           zonas_cobertura = COALESCE($10, zonas_cobertura),
           meta_mensual = COALESCE($11, meta_mensual),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [equipoId, tenantId, nombre, descripcion, color, lider_id, oficina_id, activo, zona_principal, zonas_cobertura, meta_mensual]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/equipos/:equipoId
 * Elimina un equipo (soft delete)
 */
router.delete('/:equipoId', async (req, res, next) => {
  try {
    const { tenantId, equipoId } = req.params as RouteParams;

    const result = await query(
      `UPDATE equipos SET activo = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [equipoId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json({ success: true, message: 'Equipo eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/equipos/:equipoId/miembros
 * Obtiene los miembros de un equipo
 * Nota: usuarios_tenants no tiene equipo_id actualmente, devuelve array vacío
 */
router.get('/:equipoId/miembros', async (req, res, next) => {
  try {
    // La tabla usuarios_tenants no tiene equipo_id ni rol_id
    // Devolvemos array vacío hasta que se agreguen las columnas
    res.json({ miembros: [], total: 0 });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/equipos/:equipoId/miembros
 * Agrega un miembro al equipo
 * Nota: usuarios_tenants no tiene equipo_id actualmente
 */
router.post('/:equipoId/miembros', async (req, res, next) => {
  try {
    // La tabla usuarios_tenants no tiene equipo_id
    res.status(501).json({
      error: 'Funcionalidad no disponible',
      message: 'La gestión de miembros de equipos requiere actualizar el esquema de base de datos'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/equipos/:equipoId/miembros/:miembroId
 * Remueve un miembro del equipo
 * Nota: usuarios_tenants no tiene equipo_id actualmente
 */
router.delete('/:equipoId/miembros/:miembroId', async (req, res, next) => {
  try {
    // La tabla usuarios_tenants no tiene equipo_id
    res.status(501).json({
      error: 'Funcionalidad no disponible',
      message: 'La gestión de miembros de equipos requiere actualizar el esquema de base de datos'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
