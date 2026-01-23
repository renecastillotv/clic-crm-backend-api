/**
 * MÓDULO DE PROPIEDADES - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de propiedades del CRM.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express from 'express'
import {
  getPropiedades,
  getPropiedadById,
  createPropiedad,
  updatePropiedad,
  deletePropiedad,
  getPropiedadesStats,
} from '../../services/propiedadesCrmService.js';
import {
  syncTagsForProperty,
  syncAllPropertiesTags,
  getTagsForProperty,
  getTagsStats,
} from '../../services/tagsSyncService.js';
import unidadesRouter from './unidades.routes.js';
import { getOwnFilter, canEdit } from '../../middleware/scopeResolver.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  propiedadId?: string;
}

const router = express.Router({ mergeParams: true });

/**
 * GET /api/tenants/:tenantId/propiedades
 * Obtiene lista de propiedades con filtros y paginación
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const {
      tipo, operacion, estado_propiedad, ciudad,
      precio_min, precio_max, recamaras_min, banos_min,
      m2_min, m2_max, destacada, busqueda, agente_id,
      include_red_global,
      page, limit
    } = req.query;

    // Apply scope filter: if alcance_ver = 'own', force user's own properties
    const ownUserId = getOwnFilter(req, 'propiedades');

    const filtros = {
      tipo: tipo as string | undefined,
      operacion: operacion as string | undefined,
      estado_propiedad: estado_propiedad as string | undefined,
      ciudad: ciudad as string | undefined,
      precio_min: precio_min ? parseFloat(precio_min as string) : undefined,
      precio_max: precio_max ? parseFloat(precio_max as string) : undefined,
      recamaras_min: recamaras_min ? parseInt(recamaras_min as string) : undefined,
      banos_min: banos_min ? parseInt(banos_min as string) : undefined,
      m2_min: m2_min ? parseFloat(m2_min as string) : undefined,
      m2_max: m2_max ? parseFloat(m2_max as string) : undefined,
      destacada: destacada === 'true' ? true : destacada === 'false' ? false : undefined,
      busqueda: busqueda as string | undefined,
      agente_id: ownUserId || (agente_id as string | undefined),
      include_red_global: include_red_global === 'true' ? true : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 24,
    };

    const resultado = await getPropiedades(tenantId, filtros);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/propiedades/stats
 * Obtiene estadísticas de propiedades
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const stats = await getPropiedadesStats(tenantId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/propiedades/:propiedadId
 * Obtiene una propiedad específica
 */
router.get('/:propiedadId', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as RouteParams;
    const propiedad = await getPropiedadById(tenantId, propiedadId);

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.json(propiedad);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/propiedades
 * Crea una nueva propiedad
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const propiedad = await createPropiedad(tenantId, req.body);
    res.status(201).json(propiedad);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/propiedades/:propiedadId
 * Actualiza una propiedad existente
 */
router.put('/:propiedadId', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as RouteParams;

    // Check edit scope: get current record to verify ownership
    const existing = await getPropiedadById(tenantId, propiedadId);
    if (!existing) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    if (!canEdit(req, 'propiedades', existing.agente_id || existing.captador_id)) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta propiedad' });
    }

    const propiedad = await updatePropiedad(tenantId, propiedadId, req.body);
    res.json(propiedad);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/propiedades/:propiedadId
 * Elimina una propiedad (soft delete)
 */
router.delete('/:propiedadId', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as RouteParams;
    const eliminado = await deletePropiedad(tenantId, propiedadId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.json({ success: true, message: 'Propiedad eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== SINCRONIZACIÓN DE TAGS ====================

/**
 * POST /api/tenants/:tenantId/propiedades/:propiedadId/sync-tags
 * Sincroniza los tags de una propiedad específica
 */
router.post('/:propiedadId/sync-tags', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as RouteParams;
    const resultado = await syncTagsForProperty(propiedadId, tenantId);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/propiedades/:propiedadId/tags
 * Obtiene los tags asignados a una propiedad
 */
router.get('/:propiedadId/tags', async (req, res, next) => {
  try {
    const { tenantId, propiedadId } = req.params as RouteParams;
    const tags = await getTagsForProperty(propiedadId, tenantId);
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/propiedades/sync-tags/all
 * Sincroniza tags de TODAS las propiedades del tenant (barrido completo)
 */
router.post('/sync-tags/all', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { batchSize, soloActivas } = req.body;

    const resultado = await syncAllPropertiesTags(tenantId, {
      batchSize: batchSize ? parseInt(batchSize) : undefined,
      soloActivas: soloActivas !== false
    });

    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/propiedades/tags/stats
 * Obtiene estadísticas de tags del tenant
 */
router.get('/tags/stats', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const stats = await getTagsStats(tenantId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Montar rutas de unidades bajo /:propiedadId (debe ir al final para evitar conflictos)
router.use('/:propiedadId', unidadesRouter);

export default router;
