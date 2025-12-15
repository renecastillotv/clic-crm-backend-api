/**
 * AuthContext - Contexto de Autenticación con Clerk
 *
 * Integra Clerk para autenticación y sincroniza con el backend.
 * Maneja:
 * - Estado del usuario autenticado
 * - Tenants del usuario
 * - Roles y permisos
 * - Módulos accesibles
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';

// VITE_API_URL ya incluye /api, por ejemplo: http://localhost:3001/api
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Tipos
export interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  esOwner: boolean;
  roles: Role[];
}

export interface Role {
  id: string;
  codigo: string;
  nombre: string;
  color: string | null;
}

export interface Modulo {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  categoria: string;
  orden: number;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer: 'all' | 'own' | 'team';
  alcanceEditar: 'all' | 'own' | 'team';
}

export interface User {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  avatarUrl: string | null;
  telefono: string | null;
  // Campos extendidos del perfil
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  codigoPostal: string | null;
  pais: string | null;
  empresa: string | null;
  cargo: string | null;
  departamento: string | null;
  // Roles y permisos
  esPlatformAdmin: boolean;
  tenants: Tenant[];
  platformRoles?: Role[];
}

interface AuthContextType {
  // Estado
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Tenant actual
  tenantActual: Tenant | null;
  setTenantActual: (tenant: Tenant | null) => void;

  // Módulos
  modulos: Modulo[];
  loadingModulos: boolean;

  // Computed
  isPlatformAdmin: boolean;
  isTenantOwner: boolean;
  isTenantAdmin: boolean;

  // Acciones
  logout: () => Promise<void>;
  switchTenant: (tenantSlug: string) => void;
  refetch: () => Promise<void>;

  // Helpers de permisos
  tieneAcceso: (moduloId: string) => boolean;
  puedeCrear: (moduloId: string) => boolean;
  puedeEditar: (moduloId: string) => boolean;
  puedeEliminar: (moduloId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { getToken, signOut } = useClerkAuth();

  const [user, setUser] = useState<User | null>(null);
  const [tenantActual, setTenantActual] = useState<Tenant | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingModulos, setLoadingModulos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref estable para getToken - evita recargas por cambios de referencia
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Función estable para obtener token
  const getTokenStable = useCallback(async () => {
    return getTokenRef.current();
  }, []);

  // Sincronizar usuario con backend cuando Clerk carga
  useEffect(() => {
    async function syncUser() {
      if (!clerkLoaded) return;

      if (!isSignedIn || !clerkUser) {
        setUser(null);
        setTenantActual(null);
        setModulos([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const token = await getTokenStable();

        // Sincronizar con backend
        const response = await fetch(`${API_URL}/auth/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            avatarUrl: clerkUser.imageUrl,
          }),
        });

        if (!response.ok) {
          throw new Error('Error al sincronizar usuario');
        }

        const userData = await response.json();
        setUser(userData);

        // Establecer tenant por defecto
        if (userData.tenants && userData.tenants.length > 0) {
          setTenantActual(userData.tenants[0]);
        }
      } catch (err: any) {
        console.error('Error sincronizando usuario:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    syncUser();
  }, [clerkLoaded, isSignedIn, clerkUser, getTokenStable]);

  // Cargar módulos cuando cambia el tenant
  // Usamos user?.id y tenantActual?.id para evitar recargas por cambios de referencia
  const userId = user?.id;
  const tenantId = tenantActual?.id;

  useEffect(() => {
    // Flag para evitar actualizar estado si el componente se desmontó
    let isMounted = true;

    async function loadModulos() {
      if (!userId || !tenantId) {
        if (isMounted) setModulos([]);
        return;
      }

      try {
        if (isMounted) setLoadingModulos(true);
        const token = await getTokenStable();

        const response = await fetch(
          `${API_URL}/auth/modulos/${tenantId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok && isMounted) {
          const data = await response.json();
          setModulos(data);
        }
      } catch (err) {
        console.error('Error cargando módulos:', err);
        // No borrar módulos en error - mantener último estado válido
      } finally {
        if (isMounted) setLoadingModulos(false);
      }
    }

    loadModulos();

    return () => {
      isMounted = false;
    };
  }, [userId, tenantId, getTokenStable]);

  // Logout
  const logout = async () => {
    await signOut();
    setUser(null);
    setTenantActual(null);
    setModulos([]);
  };

  // Cambiar tenant
  const switchTenant = (tenantSlug: string) => {
    if (!user) return;

    const tenant = user.tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setTenantActual(tenant);
    }
  };

  // Refetch datos del usuario
  const refetch = useCallback(async () => {
    if (!isSignedIn || !clerkUser) return;

    try {
      const token = await getTokenStable();
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (err) {
      console.error('Error refetching user:', err);
    }
  }, [isSignedIn, clerkUser, getTokenStable]);

  // Computed properties
  const isPlatformAdmin = user?.esPlatformAdmin || false;

  const isTenantOwner =
    tenantActual?.esOwner ||
    tenantActual?.roles.some((r) => r.codigo === 'tenant_owner') ||
    false;

  const isTenantAdmin =
    isTenantOwner ||
    tenantActual?.roles.some((r) => r.codigo === 'tenant_admin') ||
    false;

  // Helpers de permisos
  const tieneAcceso = (moduloId: string): boolean => {
    if (isPlatformAdmin) return true;
    return modulos.some((m) => m.id === moduloId && m.puedeVer);
  };

  const puedeCrear = (moduloId: string): boolean => {
    if (isPlatformAdmin) return true;
    return modulos.some((m) => m.id === moduloId && m.puedeCrear);
  };

  const puedeEditar = (moduloId: string): boolean => {
    if (isPlatformAdmin) return true;
    return modulos.some((m) => m.id === moduloId && m.puedeEditar);
  };

  const puedeEliminar = (moduloId: string): boolean => {
    if (isPlatformAdmin) return true;
    return modulos.some((m) => m.id === moduloId && m.puedeEliminar);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        tenantActual,
        setTenantActual,
        modulos,
        loadingModulos,
        isPlatformAdmin,
        isTenantOwner,
        isTenantAdmin,
        logout,
        switchTenant,
        refetch,
        tieneAcceso,
        puedeCrear,
        puedeEditar,
        puedeEliminar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
