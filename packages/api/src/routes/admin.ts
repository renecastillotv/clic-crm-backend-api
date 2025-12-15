/**
 * Rutas del panel de administración de la plataforma
 */

import express from 'express';
import { getAdminStats, getAllTenants } from '../services/adminService.js';
import { getAllUsers, getUserStats, createUser, updateUser, getUserById, getAllRoles, toggleUserStatus, deleteUser, assignRoleToUser, unassignRoleFromUser, CreateUserData, UpdateUserData } from '../services/adminUsersService.js';
import { getAllRoles as getAllRolesAdmin, getRoleById, createRole, updateRole, deleteRole, CreateRoleData, UpdateRoleData } from '../services/adminRolesService.js';
import { createTenant, updateTenant, getTenantById, createTenantWithAdmin, getAllFeaturesWithTenantStatus, enableFeatureForTenant, disableFeatureForTenant, toggleTenantStatus, deleteTenant } from '../services/adminTenantsService.js';
import { getAllPaises } from '../services/paisesService.js';
import { getAllFeatures, getFeatureById, createFeature, updateFeature, deleteFeature, CreateFeatureData, UpdateFeatureData } from '../services/adminFeaturesService.js';
import { getBillingStats, getAllFacturas, getAllSuscripciones } from '../services/adminBillingService.js';
import { getAllConfig, getConfigByKey, updateConfig, updateMultipleConfig } from '../services/adminConfigService.js';
import { getAllTiposPagina, getTipoPaginaById, updateTipoPagina, createTipoPagina, TipoPaginaUpdate, TipoPaginaCreate } from '../services/adminTiposPaginaService.js';
import {
  getAllPlantillas,
  getPlantillaById,
  getPlantillasByTipo,
  createPlantilla,
  updatePlantilla,
  deletePlantilla,
  getCategorias,
  PlantillaPaginaCreate,
  PlantillaPaginaUpdate
} from '../services/adminPlantillasPaginaService.js';
import { requireAuth, requirePlatformAdmin } from '../middleware/clerkAuth.js';

const router = express.Router();

// Middleware para todas las rutas de admin
router.use(requireAuth);
router.use(requirePlatformAdmin);

/**
 * GET /api/admin/stats
 * 
 * Obtiene las estadísticas generales de la plataforma
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error en GET /admin/stats:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/tenants
 * 
 * Obtiene todos los tenants para el panel de administración
 */
router.get('/tenants', async (req, res) => {
  try {
    const tenants = await getAllTenants();
    res.json(tenants);
  } catch (error: any) {
    console.error('Error en GET /admin/tenants:', error);
    res.status(500).json({ 
      error: 'Error al obtener tenants',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/tenants/:tenantId
 * 
 * Obtiene un tenant específico por ID
 */
router.get('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getTenantById(tenantId);
    res.json(tenant);
  } catch (error: any) {
    console.error('Error en GET /admin/tenants/:tenantId:', error);
    if (error.message === 'Tenant no encontrado') {
      res.status(404).json({ 
        error: 'Tenant no encontrado',
        message: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Error al obtener tenant',
        message: error.message 
      });
    }
  }
});

/**
 * POST /api/admin/tenants
 * 
 * Crea un nuevo tenant (sin usuario admin)
 */
router.post('/tenants', async (req, res) => {
  try {
    const tenantData = req.body;
    const tenant = await createTenant(tenantData);
    res.status(201).json(tenant);
  } catch (error: any) {
    console.error('Error en POST /admin/tenants:', error);
    res.status(400).json({ 
      error: 'Error al crear tenant',
      message: error.message 
    });
  }
});

/**
 * POST /api/admin/tenants/with-admin
 * 
 * Crea un nuevo tenant con su usuario administrador (onboarding completo)
 */
router.post('/tenants/with-admin', async (req, res) => {
  try {
    const data = req.body;
    
    // Validar datos requeridos
    if (!data.adminUser || !data.adminUser.email || !data.adminUser.password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere email y password para el usuario administrador'
      });
    }

    const result = await createTenantWithAdmin(data);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error en POST /admin/tenants/with-admin:', error);
    res.status(400).json({ 
      error: 'Error al crear tenant con usuario administrador',
      message: error.message 
    });
  }
});

/**
 * PUT /api/admin/tenants/:tenantId
 * 
 * Actualiza un tenant existente
 */
router.put('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenantData = req.body;
    const tenant = await updateTenant(tenantId, tenantData);
    res.json(tenant);
  } catch (error: any) {
    console.error('Error en PUT /admin/tenants/:tenantId:', error);
    if (error.message === 'Tenant no encontrado') {
      res.status(404).json({ 
        error: 'Tenant no encontrado',
        message: error.message 
      });
    } else {
      res.status(400).json({ 
        error: 'Error al actualizar tenant',
        message: error.message 
      });
    }
  }
});

/**
 * PATCH /api/admin/tenants/:tenantId/toggle-status
 * 
 * Activa o desactiva un tenant
 */
router.patch('/tenants/:tenantId/toggle-status', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { activo } = req.body;
    
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ 
        error: 'El campo "activo" debe ser un booleano' 
      });
    }

    await toggleTenantStatus(tenantId, activo);
    res.json({ success: true, activo });
  } catch (error: any) {
    console.error('Error en PATCH /admin/tenants/:tenantId/toggle-status:', error);
    res.status(400).json({ 
      error: 'Error al cambiar estado del tenant',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/admin/tenants/:tenantId
 * 
 * Elimina un tenant (soft delete)
 */
router.delete('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    await deleteTenant(tenantId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error en DELETE /admin/tenants/:tenantId:', error);
    res.status(400).json({ 
      error: 'Error al eliminar tenant',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/users
 * 
 * Obtiene todos los usuarios para el panel de administración
 */
router.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error: any) {
    console.error('Error en GET /admin/users:', error);
    res.status(500).json({ 
      error: 'Error al obtener usuarios',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/users/stats
 * 
 * Obtiene estadísticas de usuarios
 */
router.get('/users/stats', async (req, res) => {
  try {
    const stats = await getUserStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error en GET /admin/users/stats:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas de usuarios',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/users/:userId
 * 
 * Obtiene un usuario específico por ID
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario solicitado no existe'
      });
    }
    
    res.json(user);
  } catch (error: any) {
    console.error('Error en GET /admin/users/:userId:', error);
    res.status(500).json({ 
      error: 'Error al obtener usuario',
      message: error.message 
    });
  }
});

/**
 * POST /api/admin/users
 * 
 * Crea un nuevo usuario
 */
router.post('/users', async (req, res) => {
  try {
    const userData: CreateUserData = req.body;
    const user = await createUser(userData);
    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error en POST /admin/users:', error);
    res.status(400).json({ 
      error: 'Error al crear usuario',
      message: error.message 
    });
  }
});

/**
 * PUT /api/admin/users/:userId
 * 
 * Actualiza un usuario existente
 */
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData: UpdateUserData = req.body;
    const user = await updateUser(userId, userData);
    res.json(user);
  } catch (error: any) {
    console.error('Error en PUT /admin/users/:userId:', error);
    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ 
        error: 'Usuario no encontrado',
        message: error.message 
      });
    } else {
      res.status(400).json({ 
        error: 'Error al actualizar usuario',
        message: error.message 
      });
    }
  }
});

/**
 * PATCH /api/admin/users/:userId/toggle-status
 * 
 * Activa o desactiva un usuario
 */
router.patch('/users/:userId/toggle-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { activo } = req.body;
    
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ 
        error: 'El campo "activo" debe ser un booleano' 
      });
    }

    await toggleUserStatus(userId, activo);
    res.json({ success: true, activo });
  } catch (error: any) {
    console.error('Error en PATCH /admin/users/:userId/toggle-status:', error);
    res.status(400).json({ 
      error: 'Error al cambiar estado del usuario',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * 
 * Elimina un usuario (soft delete)
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await deleteUser(userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error en DELETE /admin/users/:userId:', error);
    res.status(400).json({ 
      error: 'Error al eliminar usuario',
      message: error.message 
    });
  }
});

/**
 * POST /api/admin/users/:userId/roles
 * 
 * Asigna un rol a un usuario
 */
router.post('/users/:userId/roles', async (req, res) => {
  try {
    const { userId } = req.params;
    const { tenantId, roleId } = req.body;
    
    if (!roleId) {
      return res.status(400).json({ 
        error: 'El campo "roleId" es requerido' 
      });
    }

    await assignRoleToUser(userId, tenantId || null, roleId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error en POST /admin/users/:userId/roles:', error);
    res.status(400).json({ 
      error: 'Error al asignar rol',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/admin/users/:userId/roles/:roleId
 * 
 * Desasigna un rol de un usuario
 */
router.delete('/users/:userId/roles/:roleId', async (req, res) => {
  try {
    const { userId, roleId } = req.params;
    const { tenantId } = req.query;
    
    await unassignRoleFromUser(userId, tenantId as string || null, roleId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error en DELETE /admin/users/:userId/roles/:roleId:', error);
    res.status(400).json({ 
      error: 'Error al desasignar rol',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/roles
 * 
 * Obtiene todos los roles disponibles (compatibilidad con adminUsersService)
 */
router.get('/roles', async (req, res) => {
  try {
    const roles = await getAllRoles();
    res.json(roles);
  } catch (error: any) {
    console.error('Error en GET /admin/roles:', error);
    res.status(500).json({ 
      error: 'Error al obtener roles',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/roles/all
 * 
 * Obtiene todos los roles (incluyendo inactivos) para gestión
 */
router.get('/roles/all', async (req, res) => {
  try {
    const roles = await getAllRolesAdmin();
    res.json(roles);
  } catch (error: any) {
    console.error('Error en GET /admin/roles/all:', error);
    res.status(500).json({ 
      error: 'Error al obtener roles',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/roles/:roleId
 * 
 * Obtiene un rol específico por ID
 */
router.get('/roles/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;
    const role = await getRoleById(roleId);
    
    if (!role) {
      return res.status(404).json({
        error: 'Rol no encontrado',
        message: 'El rol solicitado no existe'
      });
    }
    
    res.json(role);
  } catch (error: any) {
    console.error('Error en GET /admin/roles/:roleId:', error);
    res.status(500).json({ 
      error: 'Error al obtener rol',
      message: error.message 
    });
  }
});

/**
 * POST /api/admin/roles
 * 
 * Crea un nuevo rol
 */
router.post('/roles', async (req, res) => {
  try {
    const roleData: CreateRoleData = req.body;
    const role = await createRole(roleData);
    res.status(201).json(role);
  } catch (error: any) {
    console.error('Error en POST /admin/roles:', error);
    res.status(400).json({ 
      error: 'Error al crear rol',
      message: error.message 
    });
  }
});

/**
 * PUT /api/admin/roles/:roleId
 * 
 * Actualiza un rol existente
 */
router.put('/roles/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;
    const roleData: UpdateRoleData = req.body;
    const role = await updateRole(roleId, roleData);
    res.json(role);
  } catch (error: any) {
    console.error('Error en PUT /admin/roles/:roleId:', error);
    if (error.message === 'Rol no encontrado') {
      res.status(404).json({ 
        error: 'Rol no encontrado',
        message: error.message 
      });
    } else {
      res.status(400).json({ 
        error: 'Error al actualizar rol',
        message: error.message 
      });
    }
  }
});

/**
 * DELETE /api/admin/roles/:roleId
 * 
 * Elimina un rol (soft delete)
 */
router.delete('/roles/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;
    await deleteRole(roleId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error en DELETE /admin/roles/:roleId:', error);
    res.status(400).json({ 
      error: 'Error al eliminar rol',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/paises
 * 
 * Obtiene todos los países disponibles
 */
router.get('/paises', async (req, res) => {
  try {
    const paises = await getAllPaises();
    res.json(paises);
  } catch (error: any) {
    console.error('Error en GET /admin/paises:', error);
    res.status(500).json({ 
      error: 'Error al obtener países',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/features
 * 
 * Obtiene todos los features disponibles
 */
router.get('/features', async (req, res) => {
  try {
    const features = await getAllFeatures();
    res.json({ features });
  } catch (error: any) {
    console.error('Error en GET /admin/features:', error);
    res.status(500).json({ 
      error: 'Error al obtener features',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/features/:featureId
 * 
 * Obtiene un feature específico por ID
 */
router.get('/features/:featureId', async (req, res) => {
  try {
    const { featureId } = req.params;
    const feature = await getFeatureById(featureId);
    if (!feature) {
      return res.status(404).json({ error: 'Feature no encontrado' });
    }
    res.json(feature);
  } catch (error: any) {
    console.error('Error en GET /admin/features/:featureId:', error);
    res.status(500).json({ 
      error: 'Error al obtener feature',
      message: error.message 
    });
  }
});

/**
 * POST /api/admin/features
 * 
 * Crea un nuevo feature
 */
router.post('/features', async (req, res) => {
  try {
    const featureData: CreateFeatureData = req.body;
    const feature = await createFeature(featureData);
    res.status(201).json(feature);
  } catch (error: any) {
    console.error('Error en POST /admin/features:', error);
    res.status(400).json({
      error: 'Error al crear feature',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/features/:featureId
 * 
 * Actualiza un feature existente
 */
router.put('/features/:featureId', async (req, res) => {
  try {
    const { featureId } = req.params;
    const featureData: UpdateFeatureData = req.body;
    const feature = await updateFeature(featureId, featureData);
    res.json(feature);
  } catch (error: any) {
    console.error('Error en PUT /admin/features/:featureId:', error);
    if (error.message === 'Feature no encontrado') {
      res.status(404).json({
        error: 'Feature no encontrado',
        message: error.message
      });
    } else {
      res.status(400).json({
        error: 'Error al actualizar feature',
        message: error.message
      });
    }
  }
});

/**
 * DELETE /api/admin/features/:featureId
 * 
 * Elimina un feature
 */
router.delete('/features/:featureId', async (req, res) => {
  try {
    const { featureId } = req.params;
    await deleteFeature(featureId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error en DELETE /admin/features/:featureId:', error);
    if (error.message === 'Feature no encontrado') {
      res.status(404).json({
        error: 'Feature no encontrado',
        message: error.message
      });
    } else {
      res.status(400).json({
        error: 'Error al eliminar feature',
        message: error.message
      });
    }
  }
});

/**
 * GET /api/admin/tenants/:tenantId/features
 * 
 * Obtiene todos los features disponibles con información de si están habilitados para el tenant
 */
router.get('/tenants/:tenantId/features', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const features = await getAllFeaturesWithTenantStatus(tenantId);
    res.json({ features });
  } catch (error: any) {
    console.error('Error en GET /admin/tenants/:tenantId/features:', error);
    res.status(500).json({
      error: 'Error al obtener features del tenant',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/tenants/:tenantId/features/:featureId
 * 
 * Habilita un feature para un tenant
 */
router.post('/tenants/:tenantId/features/:featureId', async (req, res) => {
  try {
    const { tenantId, featureId } = req.params;
    await enableFeatureForTenant(tenantId, featureId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error en POST /admin/tenants/:tenantId/features/:featureId:', error);
    res.status(400).json({
      error: 'Error al habilitar feature',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/tenants/:tenantId/features/:featureId
 * 
 * Deshabilita un feature para un tenant
 */
router.delete('/tenants/:tenantId/features/:featureId', async (req, res) => {
  try {
    const { tenantId, featureId } = req.params;
    await disableFeatureForTenant(tenantId, featureId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error en DELETE /admin/tenants/:tenantId/features/:featureId:', error);
    res.status(400).json({
      error: 'Error al deshabilitar feature',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/billing/stats
 * 
 * Obtiene estadísticas de facturación
 */
router.get('/billing/stats', async (req, res) => {
  try {
    const stats = await getBillingStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error en GET /admin/billing/stats:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas de facturación',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/billing/facturas
 * 
 * Obtiene todas las facturas
 */
router.get('/billing/facturas', async (req, res) => {
  try {
    const filters = {
      tenantId: req.query.tenantId as string | undefined,
      estado: req.query.estado as string | undefined,
      fechaDesde: req.query.fechaDesde as string | undefined,
      fechaHasta: req.query.fechaHasta as string | undefined,
    };
    const facturas = await getAllFacturas(filters);
    res.json({ facturas });
  } catch (error: any) {
    console.error('Error en GET /admin/billing/facturas:', error);
    res.status(500).json({
      error: 'Error al obtener facturas',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/billing/suscripciones
 * 
 * Obtiene todas las suscripciones
 */
router.get('/billing/suscripciones', async (req, res) => {
  try {
    const suscripciones = await getAllSuscripciones();
    res.json({ suscripciones });
  } catch (error: any) {
    console.error('Error en GET /admin/billing/suscripciones:', error);
    res.status(500).json({
      error: 'Error al obtener suscripciones',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/config
 * 
 * Obtiene todas las configuraciones agrupadas por categoría
 */
router.get('/config', async (req, res) => {
  try {
    const config = await getAllConfig();
    res.json({ config });
  } catch (error: any) {
    console.error('Error en GET /admin/config:', error);
    res.status(500).json({
      error: 'Error al obtener configuraciones',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/config/:clave
 * 
 * Obtiene una configuración específica por su clave
 */
router.get('/config/:clave', async (req, res) => {
  try {
    const { clave } = req.params;
    const config = await getConfigByKey(clave);
    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    res.json(config);
  } catch (error: any) {
    console.error('Error en GET /admin/config/:clave:', error);
    res.status(500).json({
      error: 'Error al obtener configuración',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/config/:clave
 * 
 * Actualiza una configuración específica
 */
router.put('/config/:clave', async (req, res) => {
  try {
    const { clave } = req.params;
    const { valor } = req.body;
    
    if (valor === undefined) {
      return res.status(400).json({ error: 'El campo "valor" es requerido' });
    }

    const config = await updateConfig(clave, { valor: String(valor) });
    res.json(config);
  } catch (error: any) {
    console.error('Error en PUT /admin/config/:clave:', error);
    if (error.message.includes('no encontrada')) {
      res.status(404).json({
        error: 'Configuración no encontrada',
        message: error.message
      });
    } else {
      res.status(400).json({
        error: 'Error al actualizar configuración',
        message: error.message
      });
    }
  }
});

/**
 * PUT /api/admin/config
 * 
 * Actualiza múltiples configuraciones a la vez
 */
router.put('/config', async (req, res) => {
  try {
    const { configs } = req.body;
    
    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({ error: 'El campo "configs" es requerido y debe ser un objeto' });
    }

    // Convertir todos los valores a strings
    const configsString: Record<string, string> = {};
    for (const [key, value] of Object.entries(configs)) {
      configsString[key] = String(value);
    }

    const updated = await updateMultipleConfig(configsString);
    res.json({ configs: updated });
  } catch (error: any) {
    console.error('Error en PUT /admin/config:', error);
    res.status(400).json({
      error: 'Error al actualizar configuraciones',
      message: error.message
    });
  }
});

// ========================================
// TIPOS DE PÁGINA
// ========================================

/**
 * GET /api/admin/tipos-pagina
 *
 * Obtiene todos los tipos de página del sistema
 */
router.get('/tipos-pagina', async (req, res) => {
  try {
    const tipos = await getAllTiposPagina();
    res.json({ tipos });
  } catch (error: any) {
    console.error('Error en GET /admin/tipos-pagina:', error);
    res.status(500).json({
      error: 'Error al obtener tipos de página',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/tipos-pagina
 *
 * Crea un nuevo tipo de página
 */
router.post('/tipos-pagina', async (req, res) => {
  try {
    const createData: TipoPaginaCreate = req.body;

    if (!createData.codigo || !createData.nombre) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'El código y nombre son requeridos'
      });
    }

    const tipo = await createTipoPagina(createData);
    res.status(201).json(tipo);
  } catch (error: any) {
    console.error('Error en POST /admin/tipos-pagina:', error);
    if (error.message.includes('Ya existe')) {
      res.status(409).json({
        error: 'Tipo de página duplicado',
        message: error.message
      });
    } else {
      res.status(400).json({
        error: 'Error al crear tipo de página',
        message: error.message
      });
    }
  }
});

/**
 * GET /api/admin/tipos-pagina/:codigo
 *
 * Obtiene un tipo de página específico por código
 */
router.get('/tipos-pagina/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const tipo = await getTipoPaginaById(codigo);
    if (!tipo) {
      return res.status(404).json({ error: 'Tipo de página no encontrado' });
    }
    res.json(tipo);
  } catch (error: any) {
    console.error('Error en GET /admin/tipos-pagina/:codigo:', error);
    res.status(500).json({
      error: 'Error al obtener tipo de página',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/tipos-pagina/:codigo
 *
 * Actualiza un tipo de página (visibilidad, featured, publico)
 */
router.put('/tipos-pagina/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const updateData: TipoPaginaUpdate = req.body;
    const tipo = await updateTipoPagina(codigo, updateData);
    res.json(tipo);
  } catch (error: any) {
    console.error('Error en PUT /admin/tipos-pagina/:codigo:', error);
    if (error.message === 'Tipo de página no encontrado') {
      res.status(404).json({
        error: 'Tipo de página no encontrado',
        message: error.message
      });
    } else {
      res.status(400).json({
        error: 'Error al actualizar tipo de página',
        message: error.message
      });
    }
  }
});

// ========================================
// PLANTILLAS DE PÁGINA
// ========================================

/**
 * GET /api/admin/plantillas
 *
 * Obtiene todas las plantillas de página
 */
router.get('/plantillas', async (req, res) => {
  try {
    const plantillas = await getAllPlantillas();
    res.json({ plantillas });
  } catch (error: any) {
    console.error('Error en GET /admin/plantillas:', error);
    res.status(500).json({
      error: 'Error al obtener plantillas',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/plantillas/categorias
 *
 * Obtiene todas las categorías de plantillas
 */
router.get('/plantillas/categorias', async (req, res) => {
  try {
    const categorias = await getCategorias();
    res.json({ categorias });
  } catch (error: any) {
    console.error('Error en GET /admin/plantillas/categorias:', error);
    res.status(500).json({
      error: 'Error al obtener categorías',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/plantillas/tipo/:tipoPagina
 *
 * Obtiene plantillas por tipo de página
 */
router.get('/plantillas/tipo/:tipoPagina', async (req, res) => {
  try {
    const { tipoPagina } = req.params;
    const plantillas = await getPlantillasByTipo(tipoPagina);
    res.json({ plantillas });
  } catch (error: any) {
    console.error('Error en GET /admin/plantillas/tipo/:tipoPagina:', error);
    res.status(500).json({
      error: 'Error al obtener plantillas por tipo',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/plantillas/:id
 *
 * Obtiene una plantilla específica por ID
 */
router.get('/plantillas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const plantilla = await getPlantillaById(id);
    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json(plantilla);
  } catch (error: any) {
    console.error('Error en GET /admin/plantillas/:id:', error);
    res.status(500).json({
      error: 'Error al obtener plantilla',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/plantillas
 *
 * Crea una nueva plantilla
 */
router.post('/plantillas', async (req, res) => {
  try {
    const createData: PlantillaPaginaCreate = req.body;

    if (!createData.codigo || !createData.tipoPagina || !createData.nombre) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'El código, tipo de página y nombre son requeridos'
      });
    }

    const plantilla = await createPlantilla(createData);
    res.status(201).json(plantilla);
  } catch (error: any) {
    console.error('Error en POST /admin/plantillas:', error);
    if (error.message.includes('Ya existe')) {
      res.status(409).json({
        error: 'Plantilla duplicada',
        message: error.message
      });
    } else if (error.message.includes('no existe')) {
      res.status(400).json({
        error: 'Tipo de página inválido',
        message: error.message
      });
    } else {
      res.status(400).json({
        error: 'Error al crear plantilla',
        message: error.message
      });
    }
  }
});

/**
 * PUT /api/admin/plantillas/:id
 *
 * Actualiza una plantilla existente
 */
router.put('/plantillas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: PlantillaPaginaUpdate = req.body;
    const plantilla = await updatePlantilla(id, updateData);
    res.json(plantilla);
  } catch (error: any) {
    console.error('Error en PUT /admin/plantillas/:id:', error);
    if (error.message === 'Plantilla no encontrada') {
      res.status(404).json({
        error: 'Plantilla no encontrada',
        message: error.message
      });
    } else {
      res.status(400).json({
        error: 'Error al actualizar plantilla',
        message: error.message
      });
    }
  }
});

/**
 * DELETE /api/admin/plantillas/:id
 *
 * Elimina una plantilla
 */
router.delete('/plantillas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deletePlantilla(id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error en DELETE /admin/plantillas/:id:', error);
    if (error.message === 'Plantilla no encontrada') {
      res.status(404).json({
        error: 'Plantilla no encontrada',
        message: error.message
      });
    } else if (error.message.includes('páginas usando')) {
      res.status(409).json({
        error: 'Plantilla en uso',
        message: error.message
      });
    } else {
      res.status(400).json({
        error: 'Error al eliminar plantilla',
        message: error.message
      });
    }
  }
});

export default router;

