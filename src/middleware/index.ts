/**
 * MIDDLEWARES DE LA API
 *
 * Exporta todos los middlewares para uso fácil en las rutas.
 *
 * Uso:
 * import { validateTenantAccess, requireModulePermission, canView } from '../middleware/index.js';
 */

export {
  validateTenantAccess,
  requireTenantMembership,
  requireRole,
  type PermisosModulo,
} from './tenantAccess.js';

export {
  requireModulePermission,
  canView,
  canCreate,
  canEdit,
  canDelete,
  getScopeFilter,
  canAccessRecord,
  type ModuloNombre,
  type Operacion,
} from './modulePermissions.js';
