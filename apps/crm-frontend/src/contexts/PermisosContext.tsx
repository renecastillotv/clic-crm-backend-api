/**
 * CONTEXTO DE PERMISOS
 *
 * Gestiona los permisos del usuario actual en el tenant.
 * Permite verificar acceso a módulos y operaciones CRUD.
 *
 * Uso:
 * const { canView, canCreate, canEdit, canDelete, hasModuleAccess } = usePermisos();
 *
 * if (canCreate('contactos')) { ... }
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Tipos
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

export interface PermisosModulo {
  modulo: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  scope: 'all' | 'team' | 'own';
}

interface PermisosContextType {
  permisos: PermisosModulo[];
  rolNombre: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;

  // Verificadores de permisos
  hasModuleAccess: (modulo: ModuloNombre) => boolean;
  canView: (modulo: ModuloNombre) => boolean;
  canCreate: (modulo: ModuloNombre) => boolean;
  canEdit: (modulo: ModuloNombre) => boolean;
  canDelete: (modulo: ModuloNombre) => boolean;
  getScope: (modulo: ModuloNombre) => 'all' | 'team' | 'own' | null;

  // Helper para verificar múltiples permisos
  hasAnyPermission: (modulo: ModuloNombre, operaciones: Operacion[]) => boolean;
  hasAllPermissions: (modulo: ModuloNombre, operaciones: Operacion[]) => boolean;

  // Módulos accesibles (para menú dinámico)
  modulosAccesibles: ModuloNombre[];
}

const PermisosContext = createContext<PermisosContextType | undefined>(undefined);

// Roles con privilegios especiales
const ADMIN_ROLES = ['admin', 'administrador', 'administrator'];
const SUPER_ADMIN_ROLES = ['super_admin', 'superadmin', 'owner', 'propietario'];

export function PermisosProvider({ children }: { children: ReactNode }) {
  const { user, tenantActual } = useAuth();

  // Extraer permisos del usuario actual en el tenant actual
  const permisos = useMemo<PermisosModulo[]>(() => {
    // Por ahora retornamos vacío - los permisos se manejan desde los módulos
    return [];
  }, [user, tenantActual]);

  // Nombre del rol - obtener del tenant actual
  const rolNombre = useMemo(() => {
    if (!user || !tenantActual) return null;
    const tenant = user.tenants?.find(t => t.id === tenantActual.id);
    return tenant?.roles?.[0]?.nombre || null;
  }, [user, tenantActual]);

  // Verificar si es admin
  const isAdmin = useMemo(() => {
    if (!rolNombre) return false;
    return ADMIN_ROLES.includes(rolNombre.toLowerCase()) || SUPER_ADMIN_ROLES.includes(rolNombre.toLowerCase());
  }, [rolNombre]);

  // Verificar si es super admin
  const isSuperAdmin = useMemo(() => {
    if (!rolNombre) return false;
    return SUPER_ADMIN_ROLES.includes(rolNombre.toLowerCase());
  }, [rolNombre]);

  // Obtener permisos de un módulo específico
  const getModulePermisos = (modulo: ModuloNombre): PermisosModulo | null => {
    // Super admin tiene acceso total
    if (isSuperAdmin) {
      return {
        modulo,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        scope: 'all',
      };
    }
    return permisos.find(p => p.modulo === modulo) || null;
  };

  // Verificar si tiene acceso al módulo
  const hasModuleAccess = (modulo: ModuloNombre): boolean => {
    if (isSuperAdmin) return true;
    const p = getModulePermisos(modulo);
    return p?.can_view || false;
  };

  // Verificadores de operaciones
  const canView = (modulo: ModuloNombre): boolean => {
    if (isSuperAdmin) return true;
    const p = getModulePermisos(modulo);
    return p?.can_view || false;
  };

  const canCreate = (modulo: ModuloNombre): boolean => {
    if (isSuperAdmin) return true;
    const p = getModulePermisos(modulo);
    return p?.can_create || false;
  };

  const canEdit = (modulo: ModuloNombre): boolean => {
    if (isSuperAdmin) return true;
    const p = getModulePermisos(modulo);
    return p?.can_edit || false;
  };

  const canDelete = (modulo: ModuloNombre): boolean => {
    if (isSuperAdmin) return true;
    const p = getModulePermisos(modulo);
    return p?.can_delete || false;
  };

  // Obtener scope del módulo
  const getScope = (modulo: ModuloNombre): 'all' | 'team' | 'own' | null => {
    if (isSuperAdmin) return 'all';
    const p = getModulePermisos(modulo);
    return p?.scope || null;
  };

  // Verificar si tiene alguno de los permisos
  const hasAnyPermission = (modulo: ModuloNombre, operaciones: Operacion[]): boolean => {
    if (isSuperAdmin) return true;
    const p = getModulePermisos(modulo);
    if (!p) return false;

    return operaciones.some(op => {
      switch (op) {
        case 'view': return p.can_view;
        case 'create': return p.can_create;
        case 'edit': return p.can_edit;
        case 'delete': return p.can_delete;
        default: return false;
      }
    });
  };

  // Verificar si tiene todos los permisos
  const hasAllPermissions = (modulo: ModuloNombre, operaciones: Operacion[]): boolean => {
    if (isSuperAdmin) return true;
    const p = getModulePermisos(modulo);
    if (!p) return false;

    return operaciones.every(op => {
      switch (op) {
        case 'view': return p.can_view;
        case 'create': return p.can_create;
        case 'edit': return p.can_edit;
        case 'delete': return p.can_delete;
        default: return false;
      }
    });
  };

  // Lista de módulos accesibles para el menú
  const modulosAccesibles = useMemo<ModuloNombre[]>(() => {
    const todos: ModuloNombre[] = [
      'contactos', 'solicitudes', 'propiedades', 'actividades',
      'propuestas', 'metas', 'reportes', 'usuarios',
      'configuracion', 'equipos', 'oficinas'
    ];

    if (isSuperAdmin) return todos;

    return todos.filter(modulo => {
      const p = permisos.find(perm => perm.modulo === modulo);
      return p?.can_view || false;
    });
  }, [permisos, isSuperAdmin]);

  const value: PermisosContextType = {
    permisos,
    rolNombre,
    isAdmin,
    isSuperAdmin,
    hasModuleAccess,
    canView,
    canCreate,
    canEdit,
    canDelete,
    getScope,
    hasAnyPermission,
    hasAllPermissions,
    modulosAccesibles,
  };

  return (
    <PermisosContext.Provider value={value}>
      {children}
    </PermisosContext.Provider>
  );
}

export function usePermisos() {
  const context = useContext(PermisosContext);
  if (context === undefined) {
    throw new Error('usePermisos debe usarse dentro de un PermisosProvider');
  }
  return context;
}

/**
 * Hook para verificar un permiso específico
 * Uso: const canCreateContact = useHasPermission('contactos', 'create');
 */
export function useHasPermission(modulo: ModuloNombre, operacion: Operacion): boolean {
  const { canView, canCreate, canEdit, canDelete, isSuperAdmin } = usePermisos();

  if (isSuperAdmin) return true;

  switch (operacion) {
    case 'view': return canView(modulo);
    case 'create': return canCreate(modulo);
    case 'edit': return canEdit(modulo);
    case 'delete': return canDelete(modulo);
    default: return false;
  }
}

/**
 * Hook para verificar acceso a un módulo
 * Uso: const canAccessContacts = useModuleAccess('contactos');
 */
export function useModuleAccess(modulo: ModuloNombre): boolean {
  const { hasModuleAccess } = usePermisos();
  return hasModuleAccess(modulo);
}
