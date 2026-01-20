/**
 * MÓDULO DE ACTIVIDADES - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de actividades del CRM.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express from 'express'

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined; tenantId: string; actividadId?: string; }

import {
  getActividades,
  getActividadById,
  createActividad,
  updateActividad,
  deleteActividad,
  completarActividad,
  cambiarEstadoActividad,
  getActividadesPendientes,
  getActividadesStats,
} from '../../services/actividadesService.js';

const router = express.Router({ mergeParams: true });

/**
 * GET /api/tenants/:tenantId/actividades
 * Obtiene lista de actividades con filtros y paginación
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { tipo, estado, prioridad, contacto_id, solicitud_id, propuesta_id, completada, busqueda, fecha_desde, fecha_hasta, page, limit } = req.query;

    const filtros = {
      tipo: tipo as string | undefined,
      estado: estado as any,
      prioridad: prioridad as any,
      contacto_id: contacto_id as string | undefined,
      solicitud_id: solicitud_id as string | undefined,
      propuesta_id: propuesta_id as string | undefined,
      completada: completada === 'true' ? true : completada === 'false' ? false : undefined,
      busqueda: busqueda as string | undefined,
      fecha_desde: fecha_desde as string | undefined,
      fecha_hasta: fecha_hasta as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getActividades(tenantId, filtros);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/actividades/pendientes
 * Obtiene actividades pendientes (tareas no completadas)
 */
router.get('/pendientes', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { usuario_id, limit } = req.query;

    const actividades = await getActividadesPendientes(
      tenantId,
      usuario_id as string | undefined,
      limit ? parseInt(limit as string) : 20
    );
    res.json(actividades);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/actividades/stats
 * Obtiene estadísticas de actividades
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const stats = await getActividadesStats(tenantId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/actividades/:actividadId
 * Obtiene una actividad específica
 */
router.get('/:actividadId', async (req, res, next) => {
  try {
    const { tenantId, actividadId } = req.params as RouteParams;
    const actividad = await getActividadById(tenantId, actividadId);

    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json(actividad);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/actividades
 * Crea una nueva actividad
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const actividad = await createActividad(tenantId, req.body);
    res.status(201).json(actividad);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/actividades/:actividadId
 * Actualiza una actividad existente
 */
router.put('/:actividadId', async (req, res, next) => {
  try {
    const { tenantId, actividadId } = req.params as RouteParams;
    const actividad = await updateActividad(tenantId, actividadId, req.body);

    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json(actividad);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/actividades/:actividadId
 * Elimina una actividad
 */
router.delete('/:actividadId', async (req, res, next) => {
  try {
    const { tenantId, actividadId } = req.params as RouteParams;
    const eliminado = await deleteActividad(tenantId, actividadId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json({ success: true, message: 'Actividad eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/actividades/:actividadId/completar
 * Marca una actividad como completada/no completada
 */
router.post('/:actividadId/completar', async (req, res, next) => {
  try {
    const { tenantId, actividadId } = req.params as RouteParams;
    const { completada, nota } = req.body;

    const actividad = await completarActividad(tenantId, actividadId, completada !== false, nota);

    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json(actividad);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/actividades/:actividadId/estado
 * Cambia el estado de una actividad
 */
router.post('/:actividadId/estado', async (req, res, next) => {
  try {
    const { tenantId, actividadId } = req.params as RouteParams;
    const { estado, nota } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'El estado es requerido' });
    }

    const actividad = await cambiarEstadoActividad(tenantId, actividadId, estado, nota);

    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json(actividad);
  } catch (error) {
    next(error);
  }
});

export default router;
