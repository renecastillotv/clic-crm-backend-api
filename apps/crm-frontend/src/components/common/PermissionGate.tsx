/**
 * COMPONENTE PERMISSION GATE
 *
 * Renderiza condicionalmente contenido basado en permisos.
 * Útil para mostrar/ocultar botones, enlaces y secciones.
 *
 * Uso:
 * <PermissionGate modulo="contactos" operacion="create">
 *   <Button>Crear Contacto</Button>
 * </PermissionGate>
 *
 * Con fallback:
 * <PermissionGate modulo="contactos" operacion="delete" fallback={<DisabledButton />}>
 *   <DeleteButton />
 * </PermissionGate>
 */

import { ReactNode } from 'react';
import { usePermisos, ModuloNombre, Operacion } from '../../contexts/PermisosContext';

interface PermissionGateProps {
  children: ReactNode;

  // Módulo a verificar
  modulo: ModuloNombre;

  // Operación requerida
  operacion?: Operacion;

  // Múltiples operaciones (cualquiera)
  anyOf?: Operacion[];

  // Múltiples operaciones (todas)
  allOf?: Operacion[];

  // Contenido alternativo si no tiene permiso
  fallback?: ReactNode;

  // Requerir admin
  requireAdmin?: boolean;

  // Requerir super admin
  requireSuperAdmin?: boolean;
}

export function PermissionGate({
  children,
  modulo,
  operacion,
  anyOf,
  allOf,
  fallback = null,
  requireAdmin = false,
  requireSuperAdmin = false,
}: PermissionGateProps) {
  const {
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isSuperAdmin,
  } = usePermisos();

  // Verificar super admin
  if (requireSuperAdmin && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  // Verificar admin
  if (requireAdmin && !isAdmin) {
    return <>{fallback}</>;
  }

  // Verificar operación única
  if (operacion) {
    let hasPermission = false;

    switch (operacion) {
      case 'view':
        hasPermission = canView(modulo);
        break;
      case 'create':
        hasPermission = canCreate(modulo);
        break;
      case 'edit':
        hasPermission = canEdit(modulo);
        break;
      case 'delete':
        hasPermission = canDelete(modulo);
        break;
    }

    if (!hasPermission) {
      return <>{fallback}</>;
    }
  }

  // Verificar cualquiera de las operaciones
  if (anyOf && anyOf.length > 0) {
    if (!hasAnyPermission(modulo, anyOf)) {
      return <>{fallback}</>;
    }
  }

  // Verificar todas las operaciones
  if (allOf && allOf.length > 0) {
    if (!hasAllPermissions(modulo, allOf)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Componente para mostrar contenido solo a admins
 */
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isAdmin } = usePermisos();

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Componente para mostrar contenido solo a super admins
 */
export function SuperAdminOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isSuperAdmin } = usePermisos();

  if (!isSuperAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Componente para ocultar contenido a ciertos roles
 */
export function HideFromRoles({
  children,
  roles,
}: {
  children: ReactNode;
  roles: string[];
}) {
  const { rolNombre } = usePermisos();

  if (rolNombre && roles.includes(rolNombre.toLowerCase())) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Componente para mostrar contenido solo a ciertos roles
 */
export function ShowForRoles({
  children,
  roles,
  fallback = null,
}: {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}) {
  const { rolNombre, isSuperAdmin } = usePermisos();

  // Super admin siempre puede ver
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!rolNombre || !roles.includes(rolNombre.toLowerCase())) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default PermissionGate;
