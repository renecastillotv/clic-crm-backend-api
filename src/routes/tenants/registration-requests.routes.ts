/**
 * Rutas para gestionar solicitudes de registro de un tenant
 *
 * Prefix: /api/tenants/:tenantId/registration-requests
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  getRegistrationRequests,
  getRegistrationRequestById,
  updateRegistrationRequest,
  markAsViewed,
  getRequestsCountByStatus,
  deleteRegistrationRequest,
} from '../../services/registrationRequestsService.js';
import { resolveUserScope } from '../../middleware/scopeResolver.js';

interface RouteParams {
  [key: string]: string | undefined;
  tenantId: string;
  requestId?: string;
}

const router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

/**
 * GET /api/tenants/:tenantId/registration-requests
 * Listar solicitudes de registro con filtros
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.scope?.tenantId || (req.params as RouteParams).tenantId;
    const { estado, tipo_solicitud, limit, offset } = req.query;

    console.log(`📋 GET registration-requests [tenant: ${tenantId}]`);

    const result = await getRegistrationRequests(tenantId, {
      estado: estado as string,
      tipo_solicitud: tipo_solicitud as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error listando registration requests:', error);
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/registration-requests/stats
 * Obtener conteo por estado
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.scope?.tenantId || (req.params as RouteParams).tenantId;

    const counts = await getRequestsCountByStatus(tenantId);

    res.json({
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    console.error('❌ Error obteniendo stats:', error);
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/registration-requests/:requestId
 * Obtener una solicitud específica
 */
router.get('/:requestId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.scope?.tenantId || (req.params as RouteParams).tenantId;
    const { requestId } = req.params;

    const request = await getRegistrationRequestById(requestId, tenantId);

    if (!request) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
      });
    }

    res.json(request);
  } catch (error) {
    console.error('❌ Error obteniendo request:', error);
    next(error);
  }
});

/**
 * PATCH /api/tenants/:tenantId/registration-requests/:requestId
 * Actualizar una solicitud (cambiar estado, agregar notas, etc.)
 */
router.patch('/:requestId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.scope?.tenantId || (req.params as RouteParams).tenantId;
    const userId = req.scope?.dbUserId || '';
    const { requestId } = req.params;
    const { estado, accion_tomada, usuario_creado_id, notas_admin } = req.body;

    console.log(`✏️ PATCH registration-request ${requestId} [estado: ${estado}]`);

    const updated = await updateRegistrationRequest(requestId, tenantId, userId, {
      estado,
      accion_tomada,
      usuario_creado_id,
      notas_admin,
    });

    if (!updated) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('❌ Error actualizando request:', error);
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/registration-requests/:requestId/mark-viewed
 * Marcar solicitud como vista
 */
router.post('/:requestId/mark-viewed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.scope?.tenantId || (req.params as RouteParams).tenantId;
    const userId = req.scope?.dbUserId || '';
    const { requestId } = req.params;

    const updated = await markAsViewed(requestId, tenantId, userId);

    if (!updated) {
      return res.status(404).json({
        error: 'Solicitud no encontrada o ya fue revisada',
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('❌ Error marcando como visto:', error);
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/registration-requests/:requestId/approve
 * Aprobar solicitud con acción específica
 */
router.post('/:requestId/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.scope?.tenantId || (req.params as RouteParams).tenantId;
    const userId = req.scope?.dbUserId || '';
    const { requestId } = req.params;
    const { accion_tomada, notas_admin, usuario_creado_id } = req.body;

    console.log(`✅ Aprobando request ${requestId} [accion: ${accion_tomada}]`);

    const updated = await updateRegistrationRequest(requestId, tenantId, userId, {
      estado: 'aprobado',
      accion_tomada: accion_tomada || 'aprobado',
      usuario_creado_id,
      notas_admin,
    });

    if (!updated) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('❌ Error aprobando request:', error);
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/registration-requests/:requestId/reject
 * Rechazar solicitud
 */
router.post('/:requestId/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.scope?.tenantId || (req.params as RouteParams).tenantId;
    const userId = req.scope?.dbUserId || '';
    const { requestId } = req.params;
    const { notas_admin } = req.body;

    console.log(`❌ Rechazando request ${requestId}`);

    const updated = await updateRegistrationRequest(requestId, tenantId, userId, {
      estado: 'rechazado',
      accion_tomada: 'rechazado',
      notas_admin,
    });

    if (!updated) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('❌ Error rechazando request:', error);
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/registration-requests/:requestId
 * Eliminar una solicitud
 */
router.delete('/:requestId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.scope?.tenantId || (req.params as RouteParams).tenantId;
    const { requestId } = req.params;

    const deleted = await deleteRegistrationRequest(requestId, tenantId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error eliminando request:', error);
    next(error);
  }
});

export default router;
