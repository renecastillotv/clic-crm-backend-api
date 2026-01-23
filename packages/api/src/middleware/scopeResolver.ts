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
        console.log('[ScopeResolver] No auth header, skipping');
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
      console.log('[ScopeResolver] No clerkId resolved');
      res.setHeader('X-Scope-Status', 'no-clerk-id');
      next();
      return;
    }

    const tenantId = req.params.tenantId;
    if (!tenantId) {
      console.log('[ScopeResolver] No tenantId in params. Available params:', JSON.stringify(req.params));
      res.setHeader('X-Scope-Status', 'no-tenant-id-in-params');
      next();
      return;
    }

    console.log(`[ScopeResolver] Resolving scope for clerkId=${clerkId}, tenantId=${tenantId}`);

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
    console.log(`[ScopeResolver] Found user: id=${dbUser.id}, isPlatformAdmin=${dbUser.es_platform_admin}`);

    // Platform admins see everything
    if (dbUser.es_platform_admin) {
      req.scope = {
        dbUserId: dbUser.id,
        tenantId,
        isPlatformAdmin: true,
        alcances: {},
      };
      console.log('[ScopeResolver] Platform admin - bypassing scope filter');
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

    console.log(`[ScopeResolver] Resolved ${Object.keys(alcances).length} module alcances:`, JSON.stringify(alcances));

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
      console.log(`[getOwnFilter] Scope attempted but not set for module=${moduloId}, DENYING (fail-closed)`);
      return '00000000-0000-0000-0000-000000000000'; // UUID that matches nothing
    }
    // Scope middleware didn't run (route without scope) - allow
    return null;
  }
  if (req.scope.isPlatformAdmin) {
    return null;
  }

  const alcance = req.scope.alcances[moduloId];
  if (!alcance || alcance.ver === 'own') {
    console.log(`[getOwnFilter] module=${moduloId}, alcance_ver=${alcance?.ver || 'not found'}, filtering to userId=${req.scope.dbUserId}`);
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

  if (alcance.editar === 'all') return true;
  if (alcance.editar === 'own') {
    return recordOwnerId === req.scope.dbUserId;
  }
  // 'team' - TODO: implement team check
  return true;
}
