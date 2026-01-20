/**
 * MIDDLEWARE DE ACCESO A TENANT
 *
 * Valida que el usuario tenga acceso al tenant solicitado.
 * Se aplica a todas las rutas que requieren un tenantId.
 *
 * Funcionalidades:
 * 1. Valida que el tenant existe y está activo
 * 2. Valida que el usuario pertenece al tenant
 * 3. Carga el rol y permisos del usuario en el request
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../utils/db.js';
import { logger } from '../index.js';

// Extender Request para incluir información del tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        nombre: string;
        slug: string;
        plan: string;
        activo: boolean;
        configuracion: Record<string, any>;
      };
      usuarioTenant?: {
        id: string;
        usuario_id: string;
        rol_id: string;
        rol_nombre: string;
        permisos: PermisosModulo[];
        equipo_id: string | null;
        oficina_id: string | null;
        activo: boolean;
      };
    }
  }
}

export interface PermisosModulo {
  modulo: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  scope: 'all' | 'team' | 'own';
}

/**
 * Middleware para validar acceso al tenant
 * Uso: router.use(validateTenantAccess())
 */
export function validateTenantAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant ID requerido',
          message: 'Se requiere un ID de tenant válido',
        });
      }

      // 1. Verificar que el tenant existe y está activo
      const tenantResult = await query(
        `SELECT id, nombre, slug, plan, activo, configuracion
         FROM tenants WHERE id = $1`,
        [tenantId]
      );

      if (tenantResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Tenant no encontrado',
          message: 'El tenant solicitado no existe',
        });
      }

      const tenant = tenantResult.rows[0];

      if (!tenant.activo) {
        return res.status(403).json({
          error: 'Tenant inactivo',
          message: 'Este tenant está deshabilitado',
        });
      }

      // Guardar tenant en el request
      req.tenant = {
        id: tenant.id,
        nombre: tenant.nombre,
        slug: tenant.slug,
        plan: tenant.plan,
        activo: tenant.activo,
        configuracion: tenant.configuracion || {},
      };

      // 2. Si hay usuario autenticado (via Clerk), validar pertenencia al tenant
      const userId = req.headers['x-user-id'] as string;

      if (userId) {
        const usuarioTenantResult = await query(
          `SELECT
            ut.id, ut.usuario_id, ut.rol_id, ut.equipo_id, ut.activo,
            r.nombre as rol_nombre,
            e.oficina_id,
            (
              SELECT json_agg(json_build_object(
                'modulo', rp.modulo,
                'can_view', rp.can_view,
                'can_create', rp.can_create,
                'can_edit', rp.can_edit,
                'can_delete', rp.can_delete,
                'scope', rp.scope
              ))
              FROM roles_permisos rp
              WHERE rp.rol_id = ut.rol_id
            ) as permisos
           FROM usuarios_tenants ut
           LEFT JOIN roles r ON ut.rol_id = r.id
           LEFT JOIN equipos e ON ut.equipo_id = e.id
           WHERE ut.usuario_id = $1 AND ut.tenant_id = $2`,
          [userId, tenantId]
        );

        if (usuarioTenantResult.rows.length > 0) {
          const ut = usuarioTenantResult.rows[0];

          if (!ut.activo) {
            return res.status(403).json({
              error: 'Usuario inactivo',
              message: 'Tu cuenta está deshabilitada en este tenant',
            });
          }

          req.usuarioTenant = {
            id: ut.id,
            usuario_id: ut.usuario_id,
            rol_id: ut.rol_id,
            rol_nombre: ut.rol_nombre,
            permisos: ut.permisos || [],
            equipo_id: ut.equipo_id,
            oficina_id: ut.oficina_id,
            activo: ut.activo,
          };
        }
      }

      next();
    } catch (error: any) {
      logger.error('Error en validateTenantAccess', error);
      next(error);
    }
  };
}

/**
 * Middleware para requerir que el usuario esté autenticado en el tenant
 * Uso: router.use(requireTenantMembership())
 */
export function requireTenantMembership() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuarioTenant) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes acceso a este tenant',
      });
    }
    next();
  };
}

/**
 * Middleware para requerir un rol específico
 * Uso: router.use(requireRole('admin', 'super_admin'))
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuarioTenant) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No estás autenticado en este tenant',
      });
    }

    if (!roles.includes(req.usuarioTenant.rol_nombre)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: `Se requiere uno de los siguientes roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
}

export default {
  validateTenantAccess,
  requireTenantMembership,
  requireRole,
};
