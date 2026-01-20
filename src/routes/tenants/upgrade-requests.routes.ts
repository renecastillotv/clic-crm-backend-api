/**
 * MÓDULO DE UPGRADE REQUESTS - Rutas CRUD
 *
 * Este módulo maneja las solicitudes de upgrade de CLIC Connect.
 * Permite a usuarios solicitar crear un nuevo tenant o regresar a su tenant original.
 */

import express from 'express'
import {
  getUpgradeRequests,
  getUpgradeRequestById,
  createUpgradeRequest,
  approveUpgradeRequest,
  rejectUpgradeRequest,
} from '../../services/clicConnectSolicitudesService.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  requestId?: string;
}

const router = express.Router({ mergeParams: true });

// ==================== UPGRADE REQUESTS ====================

/**
 * GET /api/tenants/:tenantId/upgrade-requests
 * Obtiene lista de solicitudes de upgrade del tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const resultado = await getUpgradeRequests(tenantId);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/upgrade-requests/:requestId
 * Obtiene una solicitud específica
 */
router.get('/:requestId', async (req, res, next) => {
  try {
    const { tenantId, requestId } = req.params as RouteParams;
    const request = await getUpgradeRequestById(tenantId, requestId);

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/upgrade-requests
 * Crea una nueva solicitud de upgrade
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { usuarioId, ...data } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es requerido' });
    }

    const request = await createUpgradeRequest(tenantId, usuarioId, data);
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/upgrade-requests/:requestId/approve
 * Aprueba una solicitud de upgrade
 */
router.post('/:requestId/approve', async (req, res, next) => {
  try {
    const { tenantId, requestId } = req.params as RouteParams;
    const { revisadoPor, notas } = req.body;

    const request = await approveUpgradeRequest(tenantId, requestId, revisadoPor, notas);

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/upgrade-requests/:requestId/reject
 * Rechaza una solicitud de upgrade
 */
router.post('/:requestId/reject', async (req, res, next) => {
  try {
    const { tenantId, requestId } = req.params as RouteParams;
    const { revisadoPor, notas } = req.body;

    const request = await rejectUpgradeRequest(tenantId, requestId, revisadoPor, notas);

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
});

export default router;
