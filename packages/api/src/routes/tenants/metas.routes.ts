/**
 * MÓDULO DE METAS - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de metas del CRM.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express from 'express'
import {
  getMetas,
  getMetaById,
  createMeta,
  updateMeta,
  deleteMeta,
  actualizarProgresoMeta,
  getMetasResumen,
} from '../../services/metasService.js';
import { resolveUserScope, getOwnFilter } from '../../middleware/scopeResolver.js';
import { query } from '../../utils/db.js';

/**
 * Helper para verificar si el usuario es admin del tenant
 * Consulta los roles del usuario para verificar si tiene tenant_owner o tenant_admin
 */
async function isUserTenantAdmin(userId: string, tenantId: string): Promise<boolean> {
  if (!userId || !tenantId) return false;

  try {
    const result = await query(`
      SELECT r.codigo
      FROM usuarios_roles ur
      JOIN roles r ON ur.rol_id = r.id
      WHERE ur.usuario_id = $1
        AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
        AND ur.activo = true
        AND r.codigo IN ('tenant_owner', 'tenant_admin')
      LIMIT 1
    `, [userId, tenantId]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('[isUserTenantAdmin] Error:', error);
    return false;
  }
}

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  metaId?: string;
}

const router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

/**
 * GET /api/tenants/:tenantId/metas
 * Obtiene lista de metas con filtros y paginación
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { tipo, estado, usuario_id, equipo_id, periodo, page, limit } = req.query;

    const ownUserId = getOwnFilter(req, 'metas');

    const filtros = {
      tipo: tipo as string | undefined,
      estado: estado as string | undefined,
      usuario_id: ownUserId || (usuario_id as string | undefined),
      equipo_id: equipo_id as string | undefined,
      periodo: periodo as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getMetas(tenantId, filtros);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/metas/resumen
 * Obtiene resumen de metas
 */
router.get('/resumen', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { usuario_id } = req.query;

    const ownUserId = getOwnFilter(req, 'metas');

    const resumen = await getMetasResumen(
      tenantId,
      ownUserId || (usuario_id as string | undefined)
    );
    res.json(resumen);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/metas/:metaId
 * Obtiene una meta específica
 */
router.get('/:metaId', async (req, res, next) => {
  try {
    const { tenantId, metaId } = req.params as RouteParams;
    const meta = await getMetaById(tenantId, metaId);

    if (!meta) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }

    res.json(meta);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/metas
 * Crea una nueva meta
 *
 * Permisos:
 * - Admin: puede crear metas para cualquier usuario
 * - Usuario normal: solo puede crear metas personales (para sí mismo)
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const scope = (req as any).scope;
    const currentUserId = scope?.dbUserId;

    // Verificar si es admin consultando sus roles (no usar scope.roleCode que no existe)
    const isAdmin = scope?.isPlatformAdmin || await isUserTenantAdmin(currentUserId, tenantId);

    console.log('[Metas POST] userId:', currentUserId, 'isAdmin:', isAdmin);
    console.log('[Metas POST] body.origen:', req.body.origen, 'body.usuario_id:', req.body.usuario_id);

    // Si no es admin, solo puede crear metas para sí mismo
    if (!isAdmin) {
      console.log('[Metas POST] NO es admin, forzando origen=personal');
      if (!currentUserId) {
        return res.status(403).json({ error: 'No autorizado para crear metas' });
      }
      // Forzar que la meta sea para el usuario actual y sea personal
      req.body.usuario_id = currentUserId;
      req.body.origen = 'personal';
    } else {
      console.log('[Metas POST] ES admin, respetando origen:', req.body.origen);
    }

    const meta = await createMeta(tenantId, req.body);
    console.log('[Metas POST] Meta creada:', { id: meta.id, origen: meta.origen, usuario_id: meta.usuario_id });
    res.status(201).json(meta);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/metas/:metaId
 * Actualiza una meta existente
 *
 * Permisos:
 * - Admin: puede editar cualquier meta
 * - Usuario normal: solo puede editar sus propias metas personales
 */
router.put('/:metaId', async (req, res, next) => {
  try {
    const { tenantId, metaId } = req.params as RouteParams;
    const scope = (req as any).scope;
    const currentUserId = scope?.dbUserId;
    const isAdmin = scope?.isPlatformAdmin || await isUserTenantAdmin(currentUserId, tenantId);

    // Si no es admin, verificar que sea una meta personal del usuario
    if (!isAdmin) {
      const metaExistente = await getMetaById(tenantId, metaId);
      if (!metaExistente) {
        return res.status(404).json({ error: 'Meta no encontrada' });
      }

      // Solo puede editar metas personales que le pertenecen
      if (metaExistente.origen !== 'personal' || metaExistente.usuario_id !== currentUserId) {
        return res.status(403).json({ error: 'No tienes permiso para editar esta meta. Solo puedes editar tus metas personales.' });
      }

      // No permitir cambiar el usuario_id ni el origen
      delete req.body.usuario_id;
      delete req.body.origen;
    }

    const meta = await updateMeta(tenantId, metaId, req.body);

    if (!meta) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }

    res.json(meta);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/metas/:metaId
 * Elimina una meta
 *
 * Permisos:
 * - Admin: puede eliminar cualquier meta
 * - Usuario normal: solo puede eliminar sus propias metas personales
 */
router.delete('/:metaId', async (req, res, next) => {
  try {
    const { tenantId, metaId } = req.params as RouteParams;
    const scope = (req as any).scope;
    const currentUserId = scope?.dbUserId;
    const isAdmin = scope?.isPlatformAdmin || await isUserTenantAdmin(currentUserId, tenantId);

    // Si no es admin, verificar que sea una meta personal del usuario
    if (!isAdmin) {
      const metaExistente = await getMetaById(tenantId, metaId);
      if (!metaExistente) {
        return res.status(404).json({ error: 'Meta no encontrada' });
      }

      // Solo puede eliminar metas personales que le pertenecen
      if (metaExistente.origen !== 'personal' || metaExistente.usuario_id !== currentUserId) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta meta. Solo puedes eliminar tus metas personales.' });
      }
    }

    const eliminado = await deleteMeta(tenantId, metaId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }

    res.json({ success: true, message: 'Meta eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/metas/:metaId/progreso
 * Actualiza el progreso de una meta
 */
router.post('/:metaId/progreso', async (req, res, next) => {
  try {
    const { tenantId, metaId } = req.params as RouteParams;
    const { valor_actual } = req.body;

    if (valor_actual === undefined) {
      return res.status(400).json({ error: 'El valor_actual es requerido' });
    }

    const meta = await actualizarProgresoMeta(tenantId, metaId, valor_actual);

    if (!meta) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }

    res.json(meta);
  } catch (error) {
    next(error);
  }
});

export default router;
