/**
 * Middleware de resolución de alcance (scope) para datos
 *
 * Resuelve el usuario autenticado a su ID de base de datos y
 * obtiene los alcances de permisos para el tenant actual.
 * Esto permite filtrar datos según alcance_ver (own, team, all).
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../utils/db.js';

// Extender Request para incluir scope info
declare global {
  namespace Express {
    interface Request {
      scope?: {
        dbUserId: string;
        tenantId: string;
        isPlatformAdmin: boolean;
        alcances: Record<string, { ver: string; editar: string }>;
      };
    }
  }
}

/**
 * Middleware que resuelve el alcance del usuario para el tenant actual.
 * Debe usarse después de requireAuth.
 * Agrega req.scope con: dbUserId, tenantId, isPlatformAdmin, alcances
 */
export async function resolveUserScope(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      // No auth - skip scope resolution
      next();
      return;
    }

    const tenantId = req.params.tenantId;
    if (!tenantId) {
      next();
      return;
    }

    // Get DB user ID and platform admin status
    const userResult = await query(
      'SELECT id, es_platform_admin FROM usuarios WHERE clerk_id = $1 AND activo = true',
      [clerkId]
    );

    if (userResult.rows.length === 0) {
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
        END as alcance_editar
      FROM usuarios_roles ur
      JOIN roles_modulos rm ON ur.rol_id = rm.rol_id
      JOIN modulos m ON rm.modulo_id = m.id
      WHERE ur.usuario_id = $1
        AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
        AND ur.activo = true
        AND rm.puede_ver = true
      GROUP BY m.id
    `, [dbUser.id, tenantId]);

    const alcances: Record<string, { ver: string; editar: string }> = {};
    for (const row of scopeResult.rows) {
      alcances[row.modulo_id] = {
        ver: row.alcance_ver,
        editar: row.alcance_editar,
      };
    }

    req.scope = {
      dbUserId: dbUser.id,
      tenantId,
      isPlatformAdmin: false,
      alcances,
    };

    next();
  } catch (error: any) {
    console.error('Error in resolveUserScope:', error.message);
    // Don't block the request on scope resolution failure
    next();
  }
}

/**
 * Helper to check if the user should only see their own data for a module.
 * Returns the user's DB ID if scope is 'own', null otherwise.
 */
export function getOwnFilter(req: any, moduloId: string): string | null {
  if (!req.scope) return null;
  if (req.scope.isPlatformAdmin) return null;

  const alcance = req.scope.alcances[moduloId];
  if (!alcance || alcance.ver === 'own') {
    // Default to 'own' if module not found in permissions
    return req.scope.dbUserId;
  }

  return null; // 'team' or 'all' - no filter needed
}
