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

// Key para persistir el tenant seleccionado en localStorage
const TENANT_STORAGE_KEY = 'clic_selected_tenant_id';
const PERMISOS_CACHE_PREFIX = 'clic_permisos_cache_';
const PERMISOS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

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

export interface PermisosCampos {
  hide?: string[];           // Campos completamente ocultos
  readonly?: string[];       // Campos visibles pero no editables
  replace?: Record<string, string>; // Reemplazos: mostrar otro campo
  autoFilter?: Record<string, any>; // Filtros automáticos que se aplican al GET
  override?: Record<string, any>;   // Valores override (ej: contacto genérico)
  cardFields?: string[];     // Campos a mostrar en tarjeta (UI hints)
}

export interface Modulo {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  categoria: string;
  orden: number;
  esSubmenu?: boolean;
  moduloPadreId?: string | null;
  ruta?: string | null;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer: 'all' | 'own' | 'team';
  alcanceEditar: 'all' | 'own' | 'team';
  permisosCampos?: PermisosCampos;
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
  getPermisosCampos: (moduloId: string) => PermisosCampos | undefined;
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
      console.log('🔄 syncUser - clerkLoaded:', clerkLoaded, 'isSignedIn:', isSignedIn);
      if (!clerkLoaded) return;

      if (!isSignedIn || !clerkUser) {
        console.log('🔄 No hay sesión, limpiando estado');
        setUser(null);
        setTenantActual(null);
        setModulos([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log('🔄 Obteniendo token...');
        const token = await getTokenStable();
        console.log('🔄 Token obtenido, llamando a /auth/sync...');

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

        console.log('🔄 Respuesta de /auth/sync:', response.status);
        if (!response.ok) {
          throw new Error('Error al sincronizar usuario');
        }

        const userData = await response.json();
        console.log('🔄 Usuario sincronizado:', userData?.email);
        setUser(userData);

        // Establecer tenant por defecto: primero buscar el persistido, si no el primero
        if (userData.tenants && userData.tenants.length > 0) {
          const savedTenantId = localStorage.getItem(TENANT_STORAGE_KEY);
          const savedTenant = savedTenantId
            ? userData.tenants.find((t: Tenant) => t.id === savedTenantId)
            : null;

          const tenantToSet = savedTenant || userData.tenants[0];
          setTenantActual(tenantToSet);

          // Asegurar que el tenant está persistido
          localStorage.setItem(TENANT_STORAGE_KEY, tenantToSet.id);
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
        const cacheKey = `${PERMISOS_CACHE_PREFIX}${tenantId}_${userId}`;

        // 1. Check localStorage cache
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const cacheData = JSON.parse(cached);
            const isExpired = Date.now() - cacheData.timestamp > PERMISOS_CACHE_TTL;

            if (!isExpired) {
              // 2. Check version against server
              const versionRes = await fetch(
                `${API_URL}/auth/permissions/version/${tenantId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (versionRes.ok) {
                const { version } = await versionRes.json();
                if (version === cacheData.version) {
                  // Cache is valid - use it
                  console.log(`📦 [AuthContext] Usando CACHÉ. Version: ${version}, Módulos: ${cacheData.modulos.length}`);
                  console.log(`📦 [AuthContext] IDs cacheados: ${cacheData.modulos.map((m: any) => m.id).join(', ')}`);
                  if (isMounted) setModulos(cacheData.modulos);
                  return;
                } else {
                  console.log(`🔄 [AuthContext] Caché INVÁLIDO. Version servidor: ${version}, Version cache: ${cacheData.version}`);
                }
              }
            } else {
              console.log(`⏰ [AuthContext] Caché EXPIRADO`);
            }
          } catch {
            // Cache corrupted, continue with fresh fetch
          }
        }

        // 3. Fetch fresh data
        console.log(`🔄 [AuthContext] Fetching módulos para tenant: ${tenantId}, user: ${userId}`);
        const response = await fetch(
          `${API_URL}/auth/modulos/${tenantId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.ok && isMounted) {
          const data = await response.json();
          console.log(`📋 [AuthContext] Módulos recibidos: ${data.length}`);
          console.log(`📋 [AuthContext] IDs: ${data.map((m: any) => m.id).join(', ')}`);
          setModulos(data);

          // 4. Get current version and cache
          try {
            const versionRes = await fetch(
              `${API_URL}/auth/permissions/version/${tenantId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const { version } = versionRes.ok ? await versionRes.json() : { version: 1 };
            localStorage.setItem(cacheKey, JSON.stringify({
              modulos: data,
              version,
              timestamp: Date.now(),
            }));
          } catch {
            // Version fetch failed, cache without version
            localStorage.setItem(cacheKey, JSON.stringify({
              modulos: data,
              version: 0,
              timestamp: Date.now(),
            }));
          }
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
    // Limpiar tenant persistido y caché de permisos
    localStorage.removeItem(TENANT_STORAGE_KEY);
    // Clear all permission caches
    Object.keys(localStorage)
      .filter(k => k.startsWith(PERMISOS_CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  };

  // Wrapper para setTenantActual que persiste en localStorage
  const setTenantActualWithPersist = useCallback((tenant: Tenant | null) => {
    setTenantActual(tenant);
    if (tenant) {
      localStorage.setItem(TENANT_STORAGE_KEY, tenant.id);
    } else {
      localStorage.removeItem(TENANT_STORAGE_KEY);
    }
  }, []);

  // Cambiar tenant por slug
  const switchTenant = (tenantSlug: string) => {
    if (!user) return;

    const tenant = user.tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setTenantActualWithPersist(tenant);
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

  // DEBUG: Log cuando isPlatformAdmin cambia
  useEffect(() => {
    if (user) {
      console.log(`👤 [AuthContext] Usuario: ${user.email}, isPlatformAdmin: ${isPlatformAdmin}`);
    }
  }, [user?.email, isPlatformAdmin]);

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
    if (isPlatformAdmin) {
      // DEBUG: Solo loguear para módulos específicos
      if (['finanzas-config', 'mi-entrenamiento', 'university'].includes(moduloId)) {
        console.log(`🔓 [tieneAcceso] ${moduloId}: TRUE (isPlatformAdmin bypass)`);
      }
      return true;
    }
    const tiene = modulos.some((m) => m.id === moduloId && m.puedeVer);
    // DEBUG: Solo loguear para módulos específicos
    if (['finanzas-config', 'mi-entrenamiento', 'university'].includes(moduloId)) {
      console.log(`🔐 [tieneAcceso] ${moduloId}: ${tiene} (found in ${modulos.length} modulos)`);
    }
    return tiene;
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

  const getPermisosCampos = (moduloId: string): PermisosCampos | undefined => {
    if (isPlatformAdmin) return undefined; // Platform admin sees everything
    const modulo = modulos.find((m) => m.id === moduloId);
    return modulo?.permisosCampos;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        tenantActual,
        setTenantActual: setTenantActualWithPersist,
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
        getPermisosCampos,
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
