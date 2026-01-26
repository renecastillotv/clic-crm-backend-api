/**
 * Middleware de autenticación con Clerk
 *
 * Valida el token JWT de Clerk y extrae información del usuario.
 * Agrega el usuario autenticado a req.auth
 */

import { Request, Response, NextFunction } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { query } from '../utils/db.js';

// Extender Request para incluir auth
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        claims?: Record<string, unknown>;
      };
    }
  }
}

// Cliente de Clerk
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Middleware que requiere autenticación
 * Rechaza requests sin token válido
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'Token de autenticación requerido',
      });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    console.log('🔐 Verificando token de Clerk...');
    // Verificar token con Clerk
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      authorizedParties: [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:4321',
        'https://clic-crm-frontend.vercel.app',
      ],
    });
    console.log('🔐 Token válido para usuario:', payload.sub);

    // Agregar info de auth al request
    req.auth = {
      userId: payload.sub,
      sessionId: payload.sid as string,
      claims: payload as Record<string, unknown>,
    };

    next();
  } catch (error: any) {
    console.error('❌ Error de autenticación:', error.message, error);
    res.status(401).json({
      error: 'Token inválido',
      message: 'El token de autenticación es inválido o ha expirado',
    });
  }
}

/**
 * Middleware opcional de autenticación
 * Permite requests sin token pero agrega info si existe
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];

      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
        authorizedParties: [
          'http://localhost:3000',
          'http://localhost:3002',
          'http://localhost:4321',
          'https://clic-crm-frontend.vercel.app',
        ],
      });

      req.auth = {
        userId: payload.sub,
        sessionId: payload.sid as string,
        claims: payload as Record<string, unknown>,
      };
    }

    next();
  } catch (error) {
    // Si el token es inválido, continuar sin auth
    next();
  }
}

/**
 * Obtener usuario de Clerk por ID
 */
export async function getClerkUser(userId: string) {
  try {
    return await clerkClient.users.getUser(userId);
  } catch (error) {
    console.error('Error al obtener usuario de Clerk:', error);
    return null;
  }
}

/**
 * Crear usuario en Clerk con contraseña y email pre-verificado
 * El admin puede crear usuarios con contraseña temporal que pueden loguearse inmediatamente
 */
export async function createClerkUser(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  try {
    // Crear usuario con password checks deshabilitados (admin puede poner cualquier password)
    const user = await clerkClient.users.createUser({
      emailAddress: [data.email],
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      skipPasswordChecks: true,
    });

    // Si el email no está verificado, verificarlo automáticamente
    const primaryEmail = user.emailAddresses.find(e => e.emailAddress === data.email);
    if (primaryEmail && primaryEmail.verification?.status !== 'verified') {
      try {
        await clerkClient.emailAddresses.updateEmailAddress(primaryEmail.id, {
          verified: true,
        });
      } catch (verifyError: any) {
        console.warn(`⚠️ No se pudo verificar email: ${verifyError.message}`);
      }
    }

    return user;
  } catch (error: any) {
    // Extraer detalles de error de Clerk
    const clerkErrors = error.errors || error.clerkError?.errors;
    if (clerkErrors && Array.isArray(clerkErrors)) {
      const messages = clerkErrors.map((e: any) => e.longMessage || e.message).join('; ');
      throw new Error(messages);
    }
    throw new Error(error.message || 'Error desconocido al crear usuario en Clerk');
  }
}

/**
 * Crear usuario en Clerk sin contraseña (envía invitación automáticamente)
 */
export async function createClerkUserWithoutPassword(data: {
  email: string;
  firstName?: string;
  lastName?: string;
}) {
  try {
    return await clerkClient.users.createUser({
      emailAddress: [data.email],
      skipPasswordChecks: true,
      skipPasswordRequirement: true,
      firstName: data.firstName,
      lastName: data.lastName,
    });
  } catch (error: any) {
    console.error('Error al crear usuario en Clerk (sin contraseña):', error);
    throw new Error(`Error al crear usuario: ${error.message}`);
  }
}

/**
 * Actualizar usuario en Clerk
 */
export async function updateClerkUser(clerkUserId: string, data: {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}) {
  try {
    const updateData: any = {};
    if (data.email) updateData.emailAddress = [data.email];
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.password) updateData.password = data.password;
    
    return await clerkClient.users.updateUser(clerkUserId, updateData);
  } catch (error: any) {
    console.error('Error al actualizar usuario en Clerk:', error);
    throw new Error(`Error al actualizar usuario: ${error.message}`);
  }
}

/**
 * Eliminar usuario de Clerk (hard delete)
 */
export async function deleteClerkUser(userId: string) {
  try {
    await clerkClient.users.deleteUser(userId);
    return true;
  } catch (error) {
    console.error('Error al eliminar usuario de Clerk:', error);
    return false;
  }
}

/**
 * Desactivar usuario en Clerk (soft delete - banned)
 * El usuario no podrá loguearse pero su cuenta sigue existiendo
 */
export async function deactivateClerkUser(clerkUserId: string) {
  try {
    await clerkClient.users.banUser(clerkUserId);
    console.log(`✅ Usuario baneado en Clerk: ${clerkUserId}`);
    return true;
  } catch (error: any) {
    console.error('Error al desactivar usuario en Clerk:', error);
    return false;
  }
}

/**
 * Reactivar usuario en Clerk (quitar ban)
 */
export async function reactivateClerkUser(clerkUserId: string) {
  try {
    await clerkClient.users.unbanUser(clerkUserId);
    console.log(`✅ Usuario desbaneado en Clerk: ${clerkUserId}`);
    return true;
  } catch (error: any) {
    console.error('Error al reactivar usuario en Clerk:', error);
    return false;
  }
}

/**
 * Middleware que requiere ser Platform Admin
 * Debe usarse después de requireAuth
 */
export async function requirePlatformAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'Autenticación requerida',
      });
      return;
    }

    // Buscar usuario en la base de datos por clerk_id
    const result = await query(
      `SELECT id, es_platform_admin FROM usuarios WHERE clerk_id = $1 AND activo = true`,
      [req.auth.userId]
    );

    if (result.rows.length === 0) {
      res.status(403).json({
        error: 'Acceso denegado',
        message: 'Usuario no encontrado en el sistema',
      });
      return;
    }

    const user = result.rows[0];

    if (!user.es_platform_admin) {
      res.status(403).json({
        error: 'Acceso denegado',
        message: 'Se requieren permisos de administrador de plataforma',
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error('❌ Error en requirePlatformAdmin:', error.message);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al verificar permisos de administrador',
    });
  }
}

export { clerkClient };
