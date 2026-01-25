/**
 * Rutas para gestión de Planes de Pago
 *
 * Base: /api/tenants/:tenantId/planes-pago
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  getPlanesPago,
  getPlanPagoById,
  createPlanPago,
  updatePlanPago,
  deletePlanPago,
  cambiarEstadoPlanPago,
  regenerarUrlPublica,
  PlanPagoFiltros,
  EstadoPlanPago,
} from '../../services/planesPagoService.js';
import { resolveUserScope, getOwnFilter } from '../../middleware/scopeResolver.js';

interface RouteParams {
  tenantId: string;
  planId?: string;
}

const router = express.Router({ mergeParams: true });

// Apply scope resolution
router.use(resolveUserScope);

/**
 * GET /api/tenants/:tenantId/planes-pago
 * Lista planes de pago con filtros y paginación
 */
router.get('/', async (req: Request<RouteParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const {
      estado,
      estados,
      solicitud_id,
      contacto_id,
      propiedad_id,
      busqueda,
      page,
      limit,
    } = req.query;

    // Apply scope filter for role-based access
    const ownUserId = getOwnFilter(req, 'planes-pago');

    const filtros: PlanPagoFiltros = {
      estado: estado as string | undefined,
      estados: estados ? (Array.isArray(estados) ? estados : [estados]) as string[] : undefined,
      solicitud_id: solicitud_id as string | undefined,
      contacto_id: contacto_id as string | undefined,
      propiedad_id: propiedad_id as string | undefined,
      usuario_creador_id: ownUserId || undefined,
      busqueda: busqueda as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getPlanesPago(tenantId, filtros);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/planes-pago/:planId
 * Obtiene un plan de pago por ID
 */
router.get('/:planId', async (req: Request<RouteParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, planId } = req.params;

    const plan = await getPlanPagoById(tenantId, planId!);

    if (!plan) {
      return res.status(404).json({ error: 'Plan de pago no encontrado' });
    }

    res.json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/planes-pago
 * Crea un nuevo plan de pago
 */
router.post('/', async (req: Request<RouteParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const data = { ...req.body };

    // Auto-assign creating user if not specified
    if (!data.usuario_creador_id && req.scope?.dbUserId) {
      data.usuario_creador_id = req.scope.dbUserId;
    }

    const plan = await createPlanPago(tenantId, data);
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/planes-pago/:planId
 * Actualiza un plan de pago
 */
router.put('/:planId', async (req: Request<RouteParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, planId } = req.params;

    const plan = await updatePlanPago(tenantId, planId!, req.body);

    if (!plan) {
      return res.status(404).json({ error: 'Plan de pago no encontrado' });
    }

    res.json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/planes-pago/:planId
 * Elimina un plan de pago (soft delete)
 */
router.delete('/:planId', async (req: Request<RouteParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, planId } = req.params;

    const deleted = await deletePlanPago(tenantId, planId!);

    if (!deleted) {
      return res.status(404).json({ error: 'Plan de pago no encontrado' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/planes-pago/:planId/estado
 * Cambia el estado de un plan de pago
 */
router.post('/:planId/estado', async (req: Request<RouteParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, planId } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'Se requiere el campo estado' });
    }

    const estadosValidos: EstadoPlanPago[] = ['borrador', 'enviado', 'visto', 'aceptado', 'rechazado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}` });
    }

    const plan = await cambiarEstadoPlanPago(tenantId, planId!, estado);

    if (!plan) {
      return res.status(404).json({ error: 'Plan de pago no encontrado' });
    }

    res.json(plan);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/planes-pago/:planId/regenerar-url
 * Regenera la URL pública de un plan de pago
 */
router.post('/:planId/regenerar-url', async (req: Request<RouteParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, planId } = req.params;

    const plan = await regenerarUrlPublica(tenantId, planId!);

    if (!plan) {
      return res.status(404).json({ error: 'Plan de pago no encontrado' });
    }

    res.json(plan);
  } catch (error) {
    next(error);
  }
});

export default router;
