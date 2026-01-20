/**
 * MÓDULO DE JOIN REQUESTS - Rutas CRUD
 *
 * Este módulo maneja las solicitudes de unión a CLIC Connect de un tenant.
 * Permite a usuarios externos solicitar unirse a la red de asesores.
 */

import express from 'express'
import {
  getJoinRequests,
  getJoinRequestById,
  createJoinRequest,
  approveJoinRequest,
  rejectJoinRequest,
} from '../../services/clicConnectSolicitudesService.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  requestId?: string;
}

const router = express.Router({ mergeParams: true });

// ==================== JOIN REQUESTS ====================

/**
 * GET /api/tenants/:tenantId/join-requests
 * Obtiene lista de solicitudes de unión del tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { estado, page, limit } = req.query;

    const filtros = {
      estado: estado as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getJoinRequests(tenantId);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/join-requests/:requestId
 * Obtiene una solicitud específica
 */
router.get('/:requestId', async (req, res, next) => {
  try {
    const { tenantId, requestId } = req.params as RouteParams;
    const request = await getJoinRequestById(tenantId, requestId);

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/join-requests
 * Crea una nueva solicitud de unión
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const request = await createJoinRequest(tenantId, req.body);
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/join-requests/:requestId/approve
 * Aprueba una solicitud de unión
 */
router.post('/:requestId/approve', async (req, res, next) => {
  try {
    const { tenantId, requestId } = req.params as RouteParams;
    const { revisadoPor, notas } = req.body;

    const request = await approveJoinRequest(tenantId, requestId, revisadoPor, notas);

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/join-requests/:requestId/reject
 * Rechaza una solicitud de unión
 */
router.post('/:requestId/reject', async (req, res, next) => {
  try {
    const { tenantId, requestId } = req.params as RouteParams;
    const { revisadoPor, notas } = req.body;

    const request = await rejectJoinRequest(tenantId, requestId, revisadoPor, notas);

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
});

export default router;
