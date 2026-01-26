/**
 * MÓDULO DE ROLES DEL TENANT
 *
 * Gestión de roles específicos por tenant.
 * Rutas: /api/tenants/:tenantId/roles
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  getRolesByTenant,
  getRolTenantById,
  createRolTenant,
  updateRolTenant,
  deleteRolTenant,
  getUsuariosCountByRol,
  getGlobalRoles,
  getRolModulos,
  saveRolPermisos
} from '../../services/usuariosService.js';

const router = express.Router({ mergeParams: true });

interface TenantParams { tenantId: string }

/**
 * GET /api/tenants/:tenantId/roles
 * Obtiene todos los roles del tenant
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const roles = await getRolesByTenant(tenantId);
    res.json({ roles, total: roles.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/roles/usuarios-count
 * Obtiene el conteo de usuarios por rol
 */
router.get('/usuarios-count', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const roles = await getRolesByTenant(tenantId);

    const counts: Record<string, number> = {};
    for (const rol of roles) {
      counts[rol.id] = await getUsuariosCountByRol(tenantId, rol.id);
    }

    res.json({ counts });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/roles/global-roles
 * Obtiene los roles globales disponibles como padres
 */
router.get('/global-roles', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const roles = await getGlobalRoles();
    res.json({ roles });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/roles/:rolId/permisos
 * Obtiene los permisos (módulos) de un rol
 */
router.get('/:rolId/permisos', async (req: Request<TenantParams & { rolId: string }>, res: Response, next: NextFunction) => {
  try {
    const { rolId } = req.params;
    const modulos = await getRolModulos(rolId);
    res.json({ modulos });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/roles/:rolId/permisos
 * Guarda los permisos de un rol (validando contra el padre)
 */
router.put('/:rolId/permisos', async (req: Request<TenantParams & { rolId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, rolId } = req.params;
    const { parentId, permisos } = req.body;

    if (!parentId) {
      return res.status(400).json({ error: 'Se requiere parentId (rol padre)' });
    }
    if (!permisos || !Array.isArray(permisos)) {
      return res.status(400).json({ error: 'Se requiere un array de permisos' });
    }

    await saveRolPermisos(tenantId, rolId, parentId, permisos);
    res.json({ success: true, message: 'Permisos guardados correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/roles/:rolId
 * Obtiene un rol específico
 */
router.get('/:rolId', async (req: Request<TenantParams & { rolId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, rolId } = req.params;
    const rol = await getRolTenantById(tenantId, rolId);

    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    res.json(rol);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/roles
 * Crea un nuevo rol
 */
router.post('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const rol = await createRolTenant(tenantId, req.body);
    res.status(201).json(rol);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/roles/:rolId
 * Actualiza un rol
 */
router.put('/:rolId', async (req: Request<TenantParams & { rolId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, rolId } = req.params;
    const rol = await updateRolTenant(tenantId, rolId, req.body);

    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    res.json(rol);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/roles/:rolId
 * Elimina un rol
 */
router.delete('/:rolId', async (req: Request<TenantParams & { rolId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, rolId } = req.params;
    const eliminado = await deleteRolTenant(tenantId, rolId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    res.json({ success: true, message: 'Rol eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

export default router;
