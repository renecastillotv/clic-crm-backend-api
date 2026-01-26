/**
 * MÓDULO CLIC CONNECT - Rutas de solicitudes de conexión
 *
 * Este módulo maneja las solicitudes de CLIC Connect:
 * - Solicitudes de unión a una red
 * - Solicitudes de upgrade de plan
 */

import express from 'express'
import {
  getJoinRequests,
  getJoinRequestById,
  createJoinRequest,
  approveJoinRequest,
  rejectJoinRequest,
  getUpgradeRequests,
  getUpgradeRequestById,
  approveUpgradeRequest,
  rejectUpgradeRequest,
} from '../../services/clicConnectSolicitudesService.js';
import { resolveUserScope } from '../../middleware/scopeResolver.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  solicitudId?: string;
  upgradeId?: string;
}

const router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

// ==================== JOIN REQUESTS ====================

/**
 * GET /api/tenants/:tenantId/clic-connect/solicitudes
 * Obtiene solicitudes de unión
 */
router.get('/solicitudes', async (req, res, next) => {
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
 * GET /api/tenants/:tenantId/clic-connect/solicitudes/:solicitudId
 * Obtiene una solicitud específica
 */
router.get('/solicitudes/:solicitudId', async (req, res, next) => {
  try {
    const { tenantId, solicitudId } = req.params as RouteParams;
    const solicitud = await getJoinRequestById(tenantId, solicitudId);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/clic-connect/solicitudes
 * Crea una nueva solicitud de unión
 */
router.post('/solicitudes', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const solicitud = await createJoinRequest(tenantId, req.body);
    res.status(201).json(solicitud);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/clic-connect/solicitudes/:solicitudId/aprobar
 * Aprueba una solicitud de unión
 */
router.post('/solicitudes/:solicitudId/aprobar', async (req, res, next) => {
  try {
    const { tenantId, solicitudId } = req.params as RouteParams;
    const { aprobado_por, notas } = req.body;

    const solicitud = await approveJoinRequest(tenantId, solicitudId, aprobado_por, notas);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/clic-connect/solicitudes/:solicitudId/rechazar
 * Rechaza una solicitud de unión
 */
router.post('/solicitudes/:solicitudId/rechazar', async (req, res, next) => {
  try {
    const { tenantId, solicitudId } = req.params as RouteParams;
    const { rechazado_por, razon } = req.body;

    const solicitud = await rejectJoinRequest(tenantId, solicitudId, rechazado_por, razon);

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error) {
    next(error);
  }
});

// ==================== UPGRADE REQUESTS ====================

/**
 * GET /api/tenants/:tenantId/clic-connect/upgrades
 * Obtiene solicitudes de upgrade
 */
router.get('/upgrades', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { estado, page, limit } = req.query;

    const filtros = {
      estado: estado as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getUpgradeRequests(tenantId);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/clic-connect/upgrades/:upgradeId
 * Obtiene una solicitud de upgrade específica
 */
router.get('/upgrades/:upgradeId', async (req, res, next) => {
  try {
    const { tenantId, upgradeId } = req.params as RouteParams;
    const upgrade = await getUpgradeRequestById(tenantId, upgradeId);

    if (!upgrade) {
      return res.status(404).json({ error: 'Solicitud de upgrade no encontrada' });
    }

    res.json(upgrade);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/clic-connect/upgrades/:upgradeId/aprobar
 * Aprueba una solicitud de upgrade
 */
router.post('/upgrades/:upgradeId/aprobar', async (req, res, next) => {
  try {
    const { tenantId, upgradeId } = req.params as RouteParams;
    const { aprobado_por, notas } = req.body;

    const upgrade = await approveUpgradeRequest(tenantId, upgradeId, aprobado_por, notas);

    if (!upgrade) {
      return res.status(404).json({ error: 'Solicitud de upgrade no encontrada' });
    }

    res.json(upgrade);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/clic-connect/upgrades/:upgradeId/rechazar
 * Rechaza una solicitud de upgrade
 */
router.post('/upgrades/:upgradeId/rechazar', async (req, res, next) => {
  try {
    const { tenantId, upgradeId } = req.params as RouteParams;
    const { rechazado_por, razon } = req.body;

    const upgrade = await rejectUpgradeRequest(tenantId, upgradeId, rechazado_por, razon);

    if (!upgrade) {
      return res.status(404).json({ error: 'Solicitud de upgrade no encontrada' });
    }

    res.json(upgrade);
  } catch (error) {
    next(error);
  }
});

export default router;
