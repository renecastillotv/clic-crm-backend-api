/**
 * MIDDLEWARE DE PERMISOS POR MÓDULO
 *
 * Valida que el usuario tenga los permisos necesarios para acceder
 * a un módulo específico y realizar operaciones CRUD.
 *
 * Módulos disponibles:
 * - contactos
 * - solicitudes
 * - propiedades
 * - actividades
 * - propuestas
 * - metas
 * - reportes
 * - usuarios
 * - configuracion
 * - equipos
 * - oficinas
 *
 * Operaciones:
 * - view: Ver registros
 * - create: Crear nuevos registros
 * - edit: Editar registros existentes
 * - delete: Eliminar registros
 *
 * Scopes:
 * - all: Todos los registros del tenant
 * - team: Solo registros del equipo
 * - own: Solo registros propios
 */

import { Request, Response, NextFunction } from 'express';
import { PermisosModulo } from './tenantAccess.js';

export type ModuloNombre =
  | 'contactos'
  | 'solicitudes'
  | 'propiedades'
  | 'actividades'
  | 'propuestas'
  | 'metas'
  | 'reportes'
  | 'usuarios'
  | 'configuracion'
  | 'equipos'
  | 'oficinas';

export type Operacion = 'view' | 'create' | 'edit' | 'delete';

/**
 * Obtiene los permisos de un módulo específico para el usuario actual
 */
function getModulePermissions(req: Request, modulo: ModuloNombre): PermisosModulo | null {
  if (!req.usuarioTenant?.permisos) return null;
  return req.usuarioTenant.permisos.find(p => p.modulo === modulo) || null;
}

/**
 * Verifica si el usuario tiene permiso para una operación específica
 */
function hasPermission(permisos: PermisosModulo | null, operacion: Operacion): boolean {
  if (!permisos) return false;

  switch (operacion) {
    case 'view':
      return permisos.can_view;
    case 'create':
      return permisos.can_create;
    case 'edit':
      return permisos.can_edit;
    case 'delete':
      return permisos.can_delete;
    default:
      return false;
  }
}

/**
 * Middleware para requerir permiso de módulo
 *
 * @param modulo - Nombre del módulo
 * @param operacion - Operación requerida (view, create, edit, delete)
 *
 * Uso:
 * router.get('/', requireModulePermission('contactos', 'view'), handler)
 * router.post('/', requireModulePermission('contactos', 'create'), handler)
 * router.put('/:id', requireModulePermission('contactos', 'edit'), handler)
 * router.delete('/:id', requireModulePermission('contactos', 'delete'), handler)
 */
export function requireModulePermission(modulo: ModuloNombre, operacion: Operacion) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Si no hay usuario autenticado en el tenant, denegar
    if (!req.usuarioTenant) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No estás autenticado en este tenant',
      });
    }

    // Obtener permisos del módulo
    const permisos = getModulePermissions(req, modulo);

    // Si no tiene permisos para este módulo, denegar
    if (!permisos) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: `No tienes acceso al módulo de ${modulo}`,
        modulo,
      });
    }

    // Verificar la operación específica
    if (!hasPermission(permisos, operacion)) {
      const operacionesTexto = {
        view: 'ver',
        create: 'crear',
        edit: 'editar',
        delete: 'eliminar',
      };

      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: `No tienes permiso para ${operacionesTexto[operacion]} en ${modulo}`,
        modulo,
        operacion,
      });
    }

    // Agregar permisos al request para uso posterior
    (req as any).moduloPermisos = permisos;

    next();
  };
}

/**
 * Middleware para requerir acceso de lectura a un módulo
 * Shorthand para requireModulePermission(modulo, 'view')
 */
export function canView(modulo: ModuloNombre) {
  return requireModulePermission(modulo, 'view');
}

/**
 * Middleware para requerir permiso de creación
 */
export function canCreate(modulo: ModuloNombre) {
  return requireModulePermission(modulo, 'create');
}

/**
 * Middleware para requerir permiso de edición
 */
export function canEdit(modulo: ModuloNombre) {
  return requireModulePermission(modulo, 'edit');
}

/**
 * Middleware para requerir permiso de eliminación
 */
export function canDelete(modulo: ModuloNombre) {
  return requireModulePermission(modulo, 'delete');
}

/**
 * Helper para filtrar queries según el scope del usuario
 *
 * @param req - Request con información del usuario
 * @param modulo - Módulo a verificar
 * @returns Condiciones SQL para filtrar según el scope
 *
 * Uso:
 * const { whereClause, params } = getScopeFilter(req, 'contactos');
 * const query = `SELECT * FROM contactos WHERE tenant_id = $1 ${whereClause}`;
 */
export function getScopeFilter(
  req: Request,
  modulo: ModuloNombre
): { whereClause: string; params: any[] } {
  const permisos = getModulePermissions(req, modulo);

  if (!permisos || !req.usuarioTenant) {
    return { whereClause: 'AND 1=0', params: [] }; // No devolver nada
  }

  switch (permisos.scope) {
    case 'all':
      // Sin filtro adicional - acceso a todo
      return { whereClause: '', params: [] };

    case 'team':
      // Solo registros del equipo
      if (!req.usuarioTenant.equipo_id) {
        // Si no tiene equipo, solo ver los propios
        return {
          whereClause: 'AND usuario_asignado_id = $__NEXT_PARAM__',
          params: [req.usuarioTenant.usuario_id],
        };
      }
      return {
        whereClause: `AND (
          usuario_asignado_id IN (
            SELECT ut.usuario_id FROM usuarios_tenants ut
            WHERE ut.equipo_id = $__NEXT_PARAM__
          )
          OR usuario_asignado_id = $__NEXT_PARAM2__
        )`,
        params: [req.usuarioTenant.equipo_id, req.usuarioTenant.usuario_id],
      };

    case 'own':
      // Solo registros propios
      return {
        whereClause: 'AND usuario_asignado_id = $__NEXT_PARAM__',
        params: [req.usuarioTenant.usuario_id],
      };

    default:
      return { whereClause: 'AND 1=0', params: [] };
  }
}

/**
 * Verifica si el usuario puede acceder a un registro específico
 * según el scope de sus permisos
 *
 * @param req - Request con información del usuario
 * @param modulo - Módulo a verificar
 * @param usuarioAsignadoId - ID del usuario asignado al registro
 * @param equipoIdDelRegistro - ID del equipo del registro (opcional)
 * @returns true si tiene acceso, false si no
 */
export function canAccessRecord(
  req: Request,
  modulo: ModuloNombre,
  usuarioAsignadoId: string | null,
  equipoIdDelRegistro?: string | null
): boolean {
  const permisos = getModulePermissions(req, modulo);

  if (!permisos || !req.usuarioTenant) {
    return false;
  }

  switch (permisos.scope) {
    case 'all':
      return true;

    case 'team':
      // Puede acceder si es del mismo equipo o es el asignado
      if (usuarioAsignadoId === req.usuarioTenant.usuario_id) return true;
      if (equipoIdDelRegistro && equipoIdDelRegistro === req.usuarioTenant.equipo_id) return true;
      return false;

    case 'own':
      return usuarioAsignadoId === req.usuarioTenant.usuario_id;

    default:
      return false;
  }
}

export default {
  requireModulePermission,
  canView,
  canCreate,
  canEdit,
  canDelete,
  getScopeFilter,
  canAccessRecord,
};
