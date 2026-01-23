/**
 * MÓDULO DE SOLICITUDES - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de solicitudes del CRM.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express from 'express'
import {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  updateSolicitud,
  deleteSolicitud,
  cambiarEtapaSolicitud,
} from '../../services/solicitudesService.js';
import { getActividadesBySolicitud } from '../../services/actividadesService.js';
import { getOwnFilter } from '../../middleware/scopeResolver.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  solicitudId?: string;
}

const router = express.Router({ mergeParams: true });

/**
 * GET /api/tenants/:tenantId/solicitudes
 * Obtiene lista de solicitudes con filtros y paginación
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { etapa, etapas, contacto_id, usuario_asignado_id, busqueda, page, limit } = req.query;

    // Apply scope filter: if alcance_ver = 'own', force user's own pipeline items
    const ownUserId = getOwnFilter(req, 'pipeline');

    const filtros = {
      etapa: etapa as string | undefined,
      etapas: etapas ? (etapas as string).split(',') : undefined,
      contacto_id: contacto_id as string | undefined,
      usuario_asignado_id: ownUserId || (usuario_asignado_id as string | undefined),
      busqueda: busqueda as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 100,
    };

    const resultado = await getSolicitudes(tenantId, filtros);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/solicitudes/:solicitudId
 * Obtiene una solicitud específica
 */
router.get('/:solicitudId', async (req, res, next) => {
  try {
    const { tenantId, solicitudId } = req.params as RouteParams;
    const solicitud = await getSolicitudById(tenantId, solicitudId);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/solicitudes
 * Crea una nueva solicitud
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const data = { ...req.body };

    // Auto-assign the creating user as owner if not explicitly set
    if (!data.usuario_asignado_id && req.scope?.dbUserId) {
      data.usuario_asignado_id = req.scope.dbUserId;
    }

    const solicitud = await createSolicitud(tenantId, data);
    res.status(201).json(solicitud);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/solicitudes/:solicitudId
 * Actualiza una solicitud existente
 */
router.put('/:solicitudId', async (req, res, next) => {
  try {
    const { tenantId, solicitudId } = req.params as RouteParams;
    const solicitud = await updateSolicitud(tenantId, solicitudId, req.body);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/solicitudes/:solicitudId
 * Elimina (desactiva) una solicitud
 */
router.delete('/:solicitudId', async (req, res, next) => {
  try {
    const { tenantId, solicitudId } = req.params as RouteParams;
    const eliminado = await deleteSolicitud(tenantId, solicitudId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json({ success: true, message: 'Solicitud eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/solicitudes/:solicitudId/etapa
 * Cambia la etapa de una solicitud
 */
router.post('/:solicitudId/etapa', async (req, res, next) => {
  try {
    const { tenantId, solicitudId } = req.params as RouteParams;
    const { etapa, razonPerdida } = req.body;

    if (!etapa) {
      return res.status(400).json({ error: 'La etapa es requerida' });
    }

    const solicitud = await cambiarEtapaSolicitud(tenantId, solicitudId, etapa, razonPerdida);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/solicitudes/:solicitudId/actividades
 * Obtiene actividades de una solicitud específica
 */
router.get('/:solicitudId/actividades', async (req, res, next) => {
  try {
    const { tenantId, solicitudId } = req.params as RouteParams;
    const { limit } = req.query;

    const actividades = await getActividadesBySolicitud(
      tenantId,
      solicitudId,
      limit ? parseInt(limit as string) : 20
    );
    res.json(actividades);
  } catch (error) {
    next(error);
  }
});

export default router;
