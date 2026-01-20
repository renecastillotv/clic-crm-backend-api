/**
 * MÓDULO DE USUARIOS - Rutas CRUD
 *
 * Este módulo maneja la gestión de usuarios dentro de un tenant.
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express from 'express'
import {
  getUsuariosByTenant,
  getUsuarioTenantById,
  agregarUsuarioATenant,
  actualizarUsuarioTenant,
  eliminarUsuarioDeTenant,
  getRolesByTenant,
  getRolTenantById,
  createRolTenant,
  updateRolTenant,
  deleteRolTenant,
} from '../../services/usuariosService.js';

// Tipos para params con mergeParams
interface RouteParams { [key: string]: string | undefined;
  tenantId: string;
  usuarioTenantId?: string;
  rolId?: string;
}

const router = express.Router({ mergeParams: true });

// ==================== USUARIOS DEL TENANT ====================

/**
 * GET /api/tenants/:tenantId/usuarios
 * Obtiene lista de usuarios del tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const { activo, rol_id, equipo_id, oficina_id, busqueda, page, limit } = req.query;

    const filtros = {
      activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
      rol_id: rol_id as string | undefined,
      equipo_id: equipo_id as string | undefined,
      oficina_id: oficina_id as string | undefined,
      busqueda: busqueda as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const resultado = await getUsuariosByTenant(tenantId);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/usuarios/:usuarioTenantId
 * Obtiene un usuario específico del tenant
 */
router.get('/:usuarioTenantId', async (req, res, next) => {
  try {
    const { tenantId, usuarioTenantId } = req.params as RouteParams;
    const usuario = await getUsuarioTenantById(tenantId, usuarioTenantId);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado en el tenant' });
    }

    res.json(usuario);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/usuarios
 * Agrega un usuario al tenant
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const usuario = await agregarUsuarioATenant(tenantId, req.body);
    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/usuarios/:usuarioTenantId
 * Actualiza un usuario del tenant
 */
router.put('/:usuarioTenantId', async (req, res, next) => {
  try {
    const { tenantId, usuarioTenantId } = req.params as RouteParams;
    const usuario = await actualizarUsuarioTenant(tenantId, usuarioTenantId, req.body);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/usuarios/:usuarioTenantId
 * Elimina (desactiva) un usuario del tenant
 */
router.delete('/:usuarioTenantId', async (req, res, next) => {
  try {
    const { tenantId, usuarioTenantId } = req.params as RouteParams;
    const eliminado = await eliminarUsuarioDeTenant(tenantId, usuarioTenantId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, message: 'Usuario eliminado del tenant' });
  } catch (error) {
    next(error);
  }
});

// ==================== ROLES DEL TENANT ====================

/**
 * GET /api/tenants/:tenantId/usuarios/roles
 * Obtiene los roles del tenant
 */
router.get('/roles/list', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const roles = await getRolesByTenant(tenantId);
    res.json({ roles, total: roles.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/usuarios/roles/:rolId
 * Obtiene un rol específico
 */
router.get('/roles/:rolId', async (req, res, next) => {
  try {
    const { tenantId, rolId } = req.params as RouteParams;
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
 * POST /api/tenants/:tenantId/usuarios/roles
 * Crea un nuevo rol
 */
router.post('/roles', async (req, res, next) => {
  try {
    const { tenantId } = req.params as RouteParams;
    const rol = await createRolTenant(tenantId, req.body);
    res.status(201).json(rol);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/usuarios/roles/:rolId
 * Actualiza un rol
 */
router.put('/roles/:rolId', async (req, res, next) => {
  try {
    const { tenantId, rolId } = req.params as RouteParams;
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
 * DELETE /api/tenants/:tenantId/usuarios/roles/:rolId
 * Elimina un rol
 */
router.delete('/roles/:rolId', async (req, res, next) => {
  try {
    const { tenantId, rolId } = req.params as RouteParams;
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
