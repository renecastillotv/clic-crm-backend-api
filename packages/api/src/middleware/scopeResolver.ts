/**
 * Middleware de resolución de alcance (scope) para datos
 *
 * Resuelve el usuario autenticado a su ID de base de datos y
 * obtiene los alcances de permisos para el tenant actual.
 * Esto permite filtrar datos según alcance_ver (own, team, all).
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { query } from '../utils/db.js';

// Tipo para permisos de campo
export interface PermisosCampos {
  hide?: string[];           // Campos completamente ocultos
  readonly?: string[];       // Campos visibles pero no editables
  replace?: Record<string, string>; // Reemplazos: mostrar otro campo
  autoFilter?: Record<string, any>; // Filtros automáticos que se aplican al GET
  override?: Record<string, any>;   // Valores override (ej: contacto genérico)
  cardFields?: string[];     // Campos a mostrar en tarjeta (UI hints)
}

// Extender Request para incluir scope info
declare global {
  namespace Express {
    interface Request {
      scope?: {
        dbUserId: string;
        tenantId: string;
        isPlatformAdmin: boolean;
        alcances: Record<string, {
          ver: string;
          editar: string;
          puedeVer: boolean;
          puedeCrear: boolean;
          puedeEditar: boolean;
          puedeEliminar: boolean;
          permisosCampos?: PermisosCampos;
        }>;
      };
    }
  }
}

/**
 * Middleware que resuelve el alcance del usuario para el tenant actual.
 * Verifica el token de Clerk y resuelve permisos del usuario.
 * Agrega req.scope con: dbUserId, tenantId, isPlatformAdmin, alcances
 */
export async function resolveUserScope(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Mark that scope resolution was attempted (for fail-closed behavior)
  (req as any)._scopeAttempted = true;

  try {
    // Try to get clerkId from existing auth or verify token directly
    let clerkId = req.auth?.userId;

    if (!clerkId) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.setHeader('X-Scope-Status', 'no-auth-header');
        next();
        return;
      }
      const token = authHeader.split('Bearer ')[1];
      try {
        const payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY!,
        });
        clerkId = payload.sub;
      } catch (tokenError: any) {
        console.error('[ScopeResolver] Token verification failed:', tokenError.message);
        res.setHeader('X-Scope-Status', 'token-verification-failed: ' + tokenError.message);
        next();
        return;
      }
    }

    if (!clerkId) {
      res.setHeader('X-Scope-Status', 'no-clerk-id');
      next();
      return;
    }

    // Extract tenantId from params or URL path (router.use() may not populate params)
    let tenantId = req.params.tenantId;
    if (!tenantId) {
      // Fallback: extract UUID from originalUrl path after /tenants/
      const match = req.originalUrl?.match(/\/tenants\/([0-9a-f-]{36})/i);
      if (match) {
        tenantId = match[1];
      }
    }
    if (!tenantId) {
      res.setHeader('X-Scope-Status', 'no-tenant-id-in-params');
      next();
      return;
    }

    // Get DB user ID and platform admin status
    const userResult = await query(
      'SELECT id, es_platform_admin FROM usuarios WHERE clerk_id = $1 AND activo = true',
      [clerkId]
    );

    if (userResult.rows.length === 0) {
      res.setHeader('X-Scope-Status', 'user-not-found-for-clerk-id');
      next();
      return;
    }

    const dbUser = userResult.rows[0];

    // Platform admins see everything
    if (dbUser.es_platform_admin) {
      req.scope = {
        dbUserId: dbUser.id,
        tenantId,
        isPlatformAdmin: true,
        alcances: {},
      };
      res.setHeader('X-Scope-Status', 'platform-admin');
      next();
      return;
    }

    // Get user's module scopes for this tenant
    const scopeResult = await query(`
      SELECT
        m.id as modulo_id,
        CASE MAX(CASE rm.alcance_ver WHEN 'all' THEN 2 WHEN 'team' THEN 1 ELSE 0 END)
          WHEN 2 THEN 'all'
          WHEN 1 THEN 'team'
          ELSE 'own'
        END as alcance_ver,
        CASE MAX(CASE rm.alcance_editar WHEN 'all' THEN 2 WHEN 'team' THEN 1 ELSE 0 END)
          WHEN 2 THEN 'all'
          WHEN 1 THEN 'team'
          ELSE 'own'
        END as alcance_editar,
        BOOL_OR(rm.puede_ver) as puede_ver,
        BOOL_OR(rm.puede_crear) as puede_crear,
        BOOL_OR(rm.puede_editar) as puede_editar,
        BOOL_OR(rm.puede_eliminar) as puede_eliminar,
        (SELECT rm2.permisos_campos
         FROM roles_modulos rm2
         JOIN usuarios_roles ur2 ON rm2.rol_id = ur2.rol_id
         WHERE ur2.usuario_id = $1
           AND (ur2.tenant_id = $2 OR ur2.tenant_id IS NULL)
           AND ur2.activo = true
           AND rm2.modulo_id = m.id
           AND rm2.permisos_campos IS NOT NULL
           AND rm2.permisos_campos::text != '{}'
         LIMIT 1
        ) as permisos_campos
      FROM usuarios_roles ur
      JOIN roles_modulos rm ON ur.rol_id = rm.rol_id
      JOIN modulos m ON rm.modulo_id = m.id
      WHERE ur.usuario_id = $1
        AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
        AND ur.activo = true
        AND rm.puede_ver = true
        AND (m.requiere_feature IS NULL OR EXISTS (
          SELECT 1 FROM tenants_features tf
          JOIN features f ON tf.feature_id = f.id
          WHERE tf.tenant_id = $2 AND f.name = m.requiere_feature
        ))
      GROUP BY m.id
    `, [dbUser.id, tenantId]);

    const alcances: Record<string, { ver: string; editar: string; puedeVer: boolean; puedeCrear: boolean; puedeEditar: boolean; puedeEliminar: boolean; permisosCampos?: PermisosCampos }> = {};
    for (const row of scopeResult.rows) {
      alcances[row.modulo_id] = {
        ver: row.alcance_ver,
        editar: row.alcance_editar,
        puedeVer: row.puede_ver,
        puedeCrear: row.puede_crear,
        puedeEditar: row.puede_editar,
        puedeEliminar: row.puede_eliminar,
        permisosCampos: row.permisos_campos || undefined,
      };
    }

    req.scope = {
      dbUserId: dbUser.id,
      tenantId,
      isPlatformAdmin: false,
      alcances,
    };

    res.setHeader('X-Scope-Status', `resolved:${Object.keys(alcances).length}-modules`);
    next();
  } catch (error: any) {
    console.error('Error in resolveUserScope:', error.message);
    res.setHeader('X-Scope-Status', 'error: ' + error.message);
    // Don't block the request on scope resolution failure
    next();
  }
}

/**
 * Helper to check if the user should only see their own data for a module.
 * Returns the user's DB ID if scope is 'own', null otherwise.
 */
export function getOwnFilter(req: any, moduloId: string): string | null {
  if (!req.scope) {
    // FAIL-CLOSED: If scope middleware ran but couldn't resolve, deny access
    if (req._scopeAttempted) {
      return '00000000-0000-0000-0000-000000000000'; // UUID that matches nothing (fail-closed)
    }
    // Scope middleware didn't run (route without scope) - allow
    return null;
  }
  if (req.scope.isPlatformAdmin) {
    return null;
  }

  const alcance = req.scope.alcances[moduloId];
  if (!alcance || alcance.ver === 'own') {
    return req.scope.dbUserId;
  }

  return null; // 'team' or 'all' - no filter needed
}

/**
 * Helper to check if the user can edit a specific record.
 * Returns true if the user can edit, false if not.
 * Uses alcance_editar: 'own' means only records assigned to them.
 */
export function canEdit(req: any, moduloId: string, recordOwnerId: string | null): boolean {
  if (!req.scope) return true; // No scope = no restriction
  if (req.scope.isPlatformAdmin) return true;

  const alcance = req.scope.alcances[moduloId];
  if (!alcance) return false; // No permission for this module

  if (!alcance.puedeEditar) return false;

  if (alcance.editar === 'all') return true;
  if (alcance.editar === 'own') {
    return recordOwnerId === req.scope.dbUserId;
  }
  // 'team' - TODO: implement team check
  return true;
}

/**
 * Checks if user has a specific permission (crear, editar, eliminar) for a module.
 * Returns true if allowed, false if not.
 * Use this in route handlers to block unauthorized POST/PUT/DELETE operations.
 */
export function hasPermission(req: any, moduloId: string, action: 'ver' | 'crear' | 'editar' | 'eliminar'): boolean {
  if (!req.scope) {
    // If scope middleware ran but couldn't resolve, deny (fail-closed)
    return !req._scopeAttempted;
  }
  if (req.scope.isPlatformAdmin) return true;

  const alcance = req.scope.alcances[moduloId];
  if (!alcance) return false;

  switch (action) {
    case 'ver': return alcance.puedeVer;
    case 'crear': return alcance.puedeCrear;
    case 'editar': return alcance.puedeEditar;
    case 'eliminar': return alcance.puedeEliminar;
    default: return false;
  }
}

/**
 * Express middleware factory that blocks requests if user doesn't have permission.
 * Usage: router.post('/', requirePermission('contenido', 'crear'), handler)
 */
export function requirePermission(moduloId: string, action: 'ver' | 'crear' | 'editar' | 'eliminar') {
  return (req: any, res: any, next: any) => {
    if (hasPermission(req, moduloId, action)) {
      next();
    } else {
      res.status(403).json({
        error: 'Sin permisos',
        message: `No tienes permiso para ${action} en ${moduloId}`,
      });
    }
  };
}

/**
 * Get field permissions for a module
 */
export function getFieldPermissions(req: any, moduloId: string): PermisosCampos | undefined {
  if (!req.scope) return undefined;
  if (req.scope.isPlatformAdmin) return undefined; // Platform admin sees everything
  return req.scope.alcances[moduloId]?.permisosCampos;
}

/**
 * Get auto filters to apply for a module (e.g., { connect: true })
 */
export function getAutoFilter(req: any, moduloId: string): Record<string, any> | undefined {
  const permisosCampos = getFieldPermissions(req, moduloId);
  return permisosCampos?.autoFilter;
}

/**
 * Apply field permissions to transform a data object.
 * - Hides specified fields
 * - Applies field replacements
 * - Applies override values
 */
export function applyFieldPermissions<T extends Record<string, any>>(
  data: T,
  permisosCampos: PermisosCampos | undefined
): T {
  if (!permisosCampos) return data;

  const result = { ...data };

  // 1. Hide specified fields
  if (permisosCampos.hide) {
    for (const field of permisosCampos.hide) {
      // Support wildcards like "propietario_*"
      if (field.endsWith('*')) {
        const prefix = field.slice(0, -1);
        for (const key of Object.keys(result)) {
          if (key.startsWith(prefix)) {
            delete result[key];
          }
        }
      } else {
        delete result[field];
      }
    }
  }

  // 2. Apply replacements (show a different field's value)
  if (permisosCampos.replace) {
    for (const [displayField, sourceField] of Object.entries(permisosCampos.replace)) {
      if (data[sourceField] !== undefined) {
        (result as any)[displayField] = data[sourceField];
      }
    }
  }

  // 3. Apply overrides (fixed values)
  if (permisosCampos.override) {
    Object.assign(result, permisosCampos.override);
  }

  return result;
}

/**
 * Apply field permissions to an array of objects
 */
export function applyFieldPermissionsToArray<T extends Record<string, any>>(
  dataArray: T[],
  permisosCampos: PermisosCampos | undefined
): T[] {
  if (!permisosCampos) return dataArray;
  return dataArray.map(item => applyFieldPermissions(item, permisosCampos));
}
