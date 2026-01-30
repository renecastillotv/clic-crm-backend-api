/**
 * Servicio para comunicarse con la API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Log para debugging (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log('🔧 API_BASE_URL configurado:', API_BASE_URL);
}

// Tipo para la API global de Clerk
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
  }
}

/**
 * Obtiene el token de autenticación de Clerk
 * Si se pasa un token explícitamente, lo usa.
 * Si no, intenta obtenerlo del objeto global de Clerk.
 */
async function getAuthToken(providedToken?: string | null): Promise<string | null> {
  // Si ya tenemos un token válido, usarlo
  if (providedToken && typeof providedToken === 'string' && providedToken.trim().length > 0) {
    return providedToken;
  }

  // Intentar obtener token del objeto global de Clerk
  try {
    if (window.Clerk?.session?.getToken) {
      const token = await window.Clerk.session.getToken();
      return token;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ No se pudo obtener token de Clerk:', error);
    }
  }

  return null;
}

/**
 * Helper para hacer fetch con mejor manejo de errores
 * @param url - URL relativa o absoluta
 * @param options - Opciones de fetch
 * @param token - Token de autenticación de Clerk (opcional, se obtiene automáticamente si no se provee)
 */
export async function apiFetch(url: string, options: RequestInit = {}, token?: string | null) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;

  if (import.meta.env.DEV) {
    console.log(`🌐 Fetching: ${options.method || 'GET'} ${fullUrl}`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Obtener token de autenticación (del parámetro o automáticamente de Clerk)
  const authToken = await getAuthToken(token);

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  } else if (import.meta.env.DEV) {
    console.warn(`[apiFetch] NO TOKEN | ${options.method || 'GET'} ${url}`);
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      
      if (import.meta.env.DEV) {
        console.error(`❌ Error en ${fullUrl}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
      }
      
      throw new Error(errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error(`❌ Error de red en ${fullUrl}:`, error);
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`No se pudo conectar con el servidor API. Verifica que esté corriendo en ${API_BASE_URL}`);
    }
    
    throw error;
  }
}

export interface ComponenteWeb {
  id?: string;
  tipo: string;
  variante: string;
  datos: Record<string, any>;
  activo?: boolean;
  orden?: number;
  paginaId?: string | null;
  predeterminado?: boolean;
  scope?: 'tenant' | 'page_type' | 'page';
  nombre?: string | null;
}

export interface TemaColores {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

/**
 * Obtiene el primer tenant (para desarrollo)
 */
export async function getFirstTenant() {
  const response = await fetch(`${API_BASE_URL}/tenants/first`);
  if (!response.ok) {
    throw new Error('Error al obtener tenant');
  }
  return response.json();
}

/**
 * Obtiene todos los componentes de un tenant
 * @param todos - Si es true, obtiene todos los componentes (para CRM). Si es false, solo los predeterminados (para frontend)
 */
export async function getComponentes(tenantId: string, paginaId?: string, todos: boolean = true): Promise<ComponenteWeb[]> {
  const url = new URL(`${API_BASE_URL}/tenants/${tenantId}/componentes`, window.location.origin);
  if (paginaId) {
    url.searchParams.append('paginaId', paginaId);
  }
  if (todos) {
    url.searchParams.append('todos', 'true');
  }
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Error al obtener componentes');
  }
  return response.json();
}

/**
 * Guarda o actualiza un componente
 */
export async function saveComponente(tenantId: string, componente: ComponenteWeb): Promise<ComponenteWeb> {
  const url = componente.id
    ? `${API_BASE_URL}/tenants/${tenantId}/componentes/${componente.id}`
    : `${API_BASE_URL}/tenants/${tenantId}/componentes`;
  
  const method = componente.id ? 'PUT' : 'POST';
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(componente),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al guardar componente');
  }
  
  return response.json();
}

/**
 * Elimina un componente
 */
export async function deleteComponente(tenantId: string, componenteId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tenants/${tenantId}/componentes/${componenteId}`,
    {
      method: 'DELETE',
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar componente');
  }
}

/**
 * Obtiene el tema de un tenant
 */
export async function getTema(tenantId: string): Promise<TemaColores> {
  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/tema`);
  if (!response.ok) {
    throw new Error('Error al obtener tema');
  }
  return response.json();
}

/**
 * Actualiza el tema de un tenant
 */
export async function updateTema(tenantId: string, colores: TemaColores): Promise<TemaColores> {
  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/tema`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ colores }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar tema');
  }
  
  return response.json();
}

/**
 * Obtiene todas las páginas de un tenant
 */
export async function getPaginas(tenantId: string) {
  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/paginas`);
  if (!response.ok) {
    throw new Error('Error al obtener páginas');
  }
  return response.json();
}

/**
 * Obtiene una página específica por ID
 */
export async function getPagina(tenantId: string, paginaId: string) {
  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/paginas/${paginaId}`);
  if (!response.ok) {
    throw new Error('Error al obtener página');
  }
  return response.json();
}

/**
 * Guarda o actualiza una página
 */
export async function savePagina(tenantId: string, pagina: any) {
  // Solo incluir ID si es un UUID válido (evitar IDs inválidos como "custom-123456")
  const tieneIdValido = pagina.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pagina.id);
  const paginaData = { ...pagina };

  // Si el ID no es válido, no enviarlo (la base de datos lo generará)
  if (!tieneIdValido) {
    delete paginaData.id;
  }

  const url = tieneIdValido
    ? `${API_BASE_URL}/tenants/${tenantId}/paginas/${pagina.id}`
    : `${API_BASE_URL}/tenants/${tenantId}/paginas`;

  const method = tieneIdValido ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paginaData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al guardar página');
  }

  return response.json();
}

// ==========================================
// SECCIONES - Sistema de configuración v2
// ==========================================

// Información de cada variante con nombre y descripción
export interface VarianteInfo {
  id: string;
  nombre: string;
  descripcion: string;
}

// Configuración de campo del catálogo
export interface CampoConfig {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  default?: any;
}

export interface CatalogoComponente {
  id: string;  // UUID del componente en el catálogo
  tipo: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  categoria: string;
  variantes: VarianteInfo[];  // Ahora es array de objetos con id, nombre, descripcion
  camposConfig: CampoConfig[];
  esGlobal: boolean;
  disponible: boolean;
  orden: number;
}

export interface SeccionConfig {
  id?: string;
  tenantId?: string;
  tipo: string;
  variante: string;
  datos: Record<string, any>;
  activo: boolean;
  orden: number;
  scope: 'tenant' | 'page_type' | 'page';
  tipoPagina?: string | null;
  paginaId?: string | null;
  esActivo?: boolean;         // Si esta variante es la activa para renderizar
  configCompleta?: boolean;   // Si tiene todos los campos requeridos llenos
}

/**
 * Obtiene el catálogo global de componentes disponibles
 * @param tenantId - ID del tenant (opcional) para filtrar variantes por features
 */
export async function getCatalogoComponentes(tenantId?: string): Promise<CatalogoComponente[]> {
  const url = new URL(`${API_BASE_URL}/secciones/catalogo`, window.location.origin);
  if (tenantId) {
    url.searchParams.set('tenantId', tenantId);
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Error al obtener catálogo de componentes');
  }
  return response.json();
}

/**
 * Obtiene las secciones configuradas de un tenant (scope='tenant')
 */
export async function getSeccionesTenant(tenantId: string): Promise<SeccionConfig[]> {
  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/secciones`);
  if (!response.ok) {
    throw new Error('Error al obtener secciones');
  }
  return response.json();
}

/**
 * Guarda o actualiza una sección del tenant
 */
export async function saveSeccion(tenantId: string, seccion: SeccionConfig): Promise<SeccionConfig> {
  const url = seccion.id
    ? `${API_BASE_URL}/tenants/${tenantId}/secciones/${seccion.id}`
    : `${API_BASE_URL}/tenants/${tenantId}/secciones`;

  const method = seccion.id ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(seccion),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al guardar sección');
  }

  return response.json();
}

/**
 * Elimina una sección
 */
export async function deleteSeccion(tenantId: string, seccionId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tenants/${tenantId}/secciones/${seccionId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar sección');
  }
}

// ==========================================
// SECCIONES v2 - Configuración por variante
// ==========================================

/**
 * Obtiene TODAS las configuraciones de variantes para un tipo de componente
 */
export async function getSeccionesPorTipo(tenantId: string, tipo: string): Promise<SeccionConfig[]> {
  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/secciones/componente/${tipo}`);
  if (!response.ok) {
    throw new Error('Error al obtener configuraciones de variantes');
  }
  return response.json();
}

/**
 * Obtiene solo las secciones ACTIVAS (una por tipo)
 */
export async function getSeccionesActivas(tenantId: string): Promise<SeccionConfig[]> {
  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/secciones/activas`);
  if (!response.ok) {
    throw new Error('Error al obtener secciones activas');
  }
  return response.json();
}

/**
 * Activa una variante específica para un tipo de componente
 */
export async function activarVariante(
  tenantId: string,
  tipo: string,
  variante: string
): Promise<{ success: boolean; tipo: string; variante: string }> {
  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/secciones/activar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tipo, variante }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al activar variante');
  }

  return response.json();
}

// ==========================================
// COMPONENTES GLOBALES REUTILIZABLES v3
// ==========================================

export interface ComponenteGlobal extends SeccionConfig {
  nombre: string | null;
}

export interface ComponentePagina extends ComponenteGlobal {
  esReferencia: boolean;  // true si es referencia a componente global
}

/**
 * Obtiene todos los componentes globales del tenant
 * @param tipo - Opcional: filtrar por tipo de componente (hero, cta, etc)
 */
export async function getComponentesGlobales(
  tenantId: string,
  tipo?: string
): Promise<ComponenteGlobal[]> {
  const url = new URL(`${API_BASE_URL}/tenants/${tenantId}/componentes-globales`, window.location.origin);
  if (tipo) {
    url.searchParams.append('tipo', tipo);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Error al obtener componentes globales');
  }
  return response.json();
}

/**
 * Crea un nuevo componente global reutilizable
 */
export async function crearComponenteGlobal(
  tenantId: string,
  data: { tipo: string; variante: string; nombre: string; datos?: Record<string, any> }
): Promise<ComponenteGlobal> {
  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/componentes-globales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear componente global');
  }

  return response.json();
}

/**
 * Actualiza el nombre de un componente global
 */
export async function actualizarNombreComponente(
  tenantId: string,
  componenteId: string,
  nombre: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tenants/${tenantId}/componentes-globales/${componenteId}/nombre`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nombre }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar nombre');
  }
}

/**
 * Duplica un componente global con un nuevo nombre
 */
export async function duplicarComponenteGlobal(
  tenantId: string,
  componenteId: string,
  nombre: string
): Promise<ComponenteGlobal> {
  const response = await fetch(
    `${API_BASE_URL}/tenants/${tenantId}/componentes-globales/${componenteId}/duplicar`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nombre }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al duplicar componente');
  }

  return response.json();
}

/**
 * Obtiene los componentes asignados a una página específica
 */
export async function getComponentesPagina(
  tenantId: string,
  paginaId: string
): Promise<ComponentePagina[]> {
  const response = await fetch(
    `${API_BASE_URL}/tenants/${tenantId}/paginas/${paginaId}/componentes`
  );
  if (!response.ok) {
    throw new Error('Error al obtener componentes de página');
  }
  return response.json();
}

/**
 * Agrega un componente global a una página (crea referencia)
 */
export async function agregarComponenteAPagina(
  tenantId: string,
  paginaId: string,
  componenteId: string,
  orden?: number
): Promise<{ id: string }> {
  const response = await fetch(
    `${API_BASE_URL}/tenants/${tenantId}/paginas/${paginaId}/componentes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ componenteId, orden }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al agregar componente a página');
  }

  return response.json();
}

/**
 * Remueve un componente de una página (solo la referencia, no el componente global)
 */
export async function removerComponenteDePagina(
  tenantId: string,
  paginaId: string,
  componenteId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tenants/${tenantId}/paginas/${paginaId}/componentes/${componenteId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al remover componente de página');
  }
}

/**
 * Reordena los componentes de una página
 */
export async function reordenarComponentesPagina(
  tenantId: string,
  paginaId: string,
  ordenComponentes: Array<{ componenteId: string; orden: number }>
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tenants/${tenantId}/paginas/${paginaId}/componentes/orden`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ordenComponentes),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al reordenar componentes');
  }
}

// ==================== ADMIN API ====================

export interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  totalUsers: number;
  totalProperties: number;
  recentTenants: Array<{
    id: string;
    nombre: string;
    slug: string;
    activo: boolean;
    createdAt: string;
  }>;
  platformUsers?: number;
  tenantUsers?: number;
  plansDistribution?: {
    basic: number;
    pro: number;
    premium: number;
  };
}

export interface TenantAdmin {
  id: string;
  nombre: string;
  slug: string;
  codigoPais?: string;
  idiomaDefault?: string;
  activo: boolean;
  plan?: string;
  dominioPersonalizado?: string | null;
  createdAt: string;
  updatedAt: string;
  totalUsuarios?: number;
  totalPropiedades?: number;
  totalPaginas?: number;
  // Membresía y facturación
  tipo_membresia_id?: string | null;
  tipo_membresia_codigo?: string | null;
  tipo_membresia_nombre?: string | null;
  estado_cuenta?: string;
  saldo_pendiente?: number;
}

/**
 * Obtiene las estadísticas de la plataforma para el admin
 */
export async function getAdminStats(token?: string | null): Promise<AdminStats> {
  const response = await apiFetch('/admin/stats', {}, token);
  return response.json();
}

/**
 * Obtiene todos los tenants para el panel de administración
 */
export async function getAllTenants(token?: string | null): Promise<TenantAdmin[]> {
  const response = await apiFetch('/admin/tenants', {}, token);
  return response.json();
}

// ==================== ADMIN USERS API ====================

export interface AdminUser {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  avatarUrl: string | null;
  codigoPais?: string;
  idiomaPreferido?: string;
  esPlatformAdmin: boolean;
  activo: boolean;
  ultimoAcceso: string | null;
  createdAt: string;
  updatedAt: string;
  tenants: Array<{
    tenantId: string;
    tenantNombre: string;
    tenantSlug: string;
    rolNombre: string;
    esOwner: boolean;
  }>;
  roles: Array<{
    rolId: string;
    rolNombre: string;
    rolTipo: string;
    tenantId: string | null;
  }>;
}

/**
 * Obtiene todos los usuarios para el panel de administración
 */
export async function getAllUsers(token?: string | null): Promise<AdminUser[]> {
  const response = await apiFetch('/admin/users', {}, token);
  return response.json();
}

export interface Role {
  id: string;
  nombre: string;
  codigo: string;
  tipo: 'platform' | 'tenant';
  descripcion: string | null;
  activo?: boolean;
  visible?: boolean;
  featureRequerido?: string | null;
}

export interface CreateUserData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  codigoPais?: string;
  idiomaPreferido?: string;
  esPlatformAdmin?: boolean;
  activo?: boolean;
  tenantIds?: string[];
  roleIds?: { tenantId: string; roleId: string }[];
}

export interface UpdateUserData {
  email?: string;
  nombre?: string;
  apellido?: string;
  codigoPais?: string;
  idiomaPreferido?: string;
  esPlatformAdmin?: boolean;
  activo?: boolean;
  password?: string;
  tenantIds?: string[];
  roleIds?: { tenantId: string | null; roleId: string }[];
}

export async function getUserById(userId: string, token?: string | null): Promise<AdminUser> {
  const response = await apiFetch(`/admin/users/${userId}`, {}, token);
  return response.json();
}

export async function createUser(data: CreateUserData, token?: string | null): Promise<AdminUser> {
  const response = await apiFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function updateUser(userId: string, data: UpdateUserData, token?: string | null): Promise<AdminUser> {
  const response = await apiFetch(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function getAllRoles(token?: string | null): Promise<Role[]> {
  const response = await apiFetch('/admin/roles', {}, token);
  return response.json();
}

// ==================== ADMIN ROLES MANAGEMENT API ====================

export interface CreateRoleData {
  nombre: string;
  codigo: string;
  tipo: 'platform' | 'tenant';
  descripcion?: string;
  activo?: boolean;
  visible?: boolean;
  featureRequerido?: string | null;
}

export interface UpdateRoleData {
  nombre?: string;
  codigo?: string;
  tipo?: 'platform' | 'tenant';
  descripcion?: string;
  activo?: boolean;
  visible?: boolean;
  featureRequerido?: string | null;
}

export interface RoleWithDates extends Role {
  createdAt: string;
  updatedAt: string;
}

/**
 * Obtiene todos los roles (incluyendo inactivos) para gestión
 */
export async function getAllRolesForManagement(token?: string | null): Promise<RoleWithDates[]> {
  const response = await apiFetch('/admin/roles/all', {}, token);
  return response.json();
}

/**
 * Obtiene un rol por ID
 */
export async function getRoleById(roleId: string, token?: string | null): Promise<RoleWithDates> {
  const response = await apiFetch(`/admin/roles/${roleId}`, {}, token);
  return response.json();
}

/**
 * Crea un nuevo rol
 */
export async function createRole(data: CreateRoleData, token?: string | null): Promise<RoleWithDates> {
  const response = await apiFetch('/admin/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

/**
 * Actualiza un rol existente
 */
export async function updateRole(roleId: string, data: UpdateRoleData, token?: string | null): Promise<RoleWithDates> {
  const response = await apiFetch(`/admin/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

/**
 * Elimina un rol (soft delete)
 */
export async function deleteRole(roleId: string, token?: string | null): Promise<void> {
  const response = await apiFetch(`/admin/roles/${roleId}`, {
    method: 'DELETE',
  }, token);

  if (response.status === 204) {
    return;
  }

  const text = await response.text();
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return;
    }
  }
}

// ==================== ADMIN MODULOS Y PERMISOS API ====================

export interface Modulo {
  id: string;          // El ID es el código/slug del módulo
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  categoria: string;   // crm, web, admin, tools
  orden: number;
  activo: boolean;
}

// Permisos a nivel de campo para un módulo
export interface PermisosCampos {
  hide?: string[];           // Campos completamente ocultos
  readonly?: string[];       // Campos visibles pero no editables
  replace?: Record<string, string>; // Reemplazos: mostrar otro campo
  autoFilter?: Record<string, any>; // Filtros automáticos que se aplican al GET
  override?: Record<string, any>;   // Valores override (ej: contacto genérico)
  cardFields?: string[];     // Campos a mostrar en tarjeta (UI hints)
}

export interface RolModulo {
  id: string;
  rolId: string;
  moduloId: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer: 'all' | 'team' | 'own';
  alcanceEditar: 'all' | 'team' | 'own';
  moduloNombre?: string;
  moduloDescripcion?: string;
  moduloCategoria?: string;
  permisosCampos?: PermisosCampos;
}

export interface RolModuloInput {
  moduloId: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer?: 'all' | 'team' | 'own';
  alcanceEditar?: 'all' | 'team' | 'own';
  permisosCampos?: PermisosCampos;
}

export interface ModuloConPermisos extends Modulo {
  permisos: RolModulo | null;
}

export interface RolModulosMatrix {
  rol: { id: string; nombre: string; codigo: string; tipo: string };
  modulos: ModuloConPermisos[];
}

export interface RolModuloStats {
  rolId: string;
  rolNombre: string;
  rolCodigo: string;
  rolTipo: string;
  totalModulos: number;
  modulosConVer: number;
  modulosConCrear: number;
  modulosConEditar: number;
  modulosConEliminar: number;
}

/**
 * Obtiene todos los módulos del sistema
 */
export async function getAllModulos(token?: string | null): Promise<Modulo[]> {
  const response = await apiFetch('/admin/modulos', {}, token);
  const data = await response.json();
  return data.modulos || [];
}

/**
 * Obtiene estadísticas de permisos por rol
 */
export async function getRolesModulosStats(token?: string | null): Promise<RolModuloStats[]> {
  const response = await apiFetch('/admin/roles-modulos/stats', {}, token);
  const data = await response.json();
  return data.stats || [];
}

/**
 * Obtiene los módulos asignados a un rol
 */
export async function getModulosByRol(roleId: string, token?: string | null): Promise<RolModulo[]> {
  const response = await apiFetch(`/admin/roles/${roleId}/modulos`, {}, token);
  const data = await response.json();
  return data.modulos || [];
}

/**
 * Obtiene la matriz completa de módulos y permisos para un rol
 */
export async function getRolModulosMatrix(roleId: string, token?: string | null): Promise<RolModulosMatrix> {
  const response = await apiFetch(`/admin/roles/${roleId}/modulos/matrix`, {}, token);
  return response.json();
}

/**
 * Actualiza todos los permisos de módulos para un rol
 */
export async function updateRolModulos(
  roleId: string,
  modulos: RolModuloInput[],
  token?: string | null
): Promise<{ modulos: RolModulo[]; message: string }> {
  const response = await apiFetch(`/admin/roles/${roleId}/modulos`, {
    method: 'PUT',
    body: JSON.stringify({ modulos }),
  }, token);
  return response.json();
}

/**
 * Actualiza permisos de un módulo específico para un rol
 */
export async function updateRolModulo(
  roleId: string,
  moduloId: string,
  permisos: Partial<RolModuloInput>,
  token?: string | null
): Promise<RolModulo> {
  const response = await apiFetch(`/admin/roles/${roleId}/modulos/${moduloId}`, {
    method: 'PUT',
    body: JSON.stringify(permisos),
  }, token);
  const data = await response.json();
  return data.permiso;
}

/**
 * Elimina un permiso de módulo de un rol
 */
export async function removeModuloFromRol(
  roleId: string,
  moduloId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/admin/roles/${roleId}/modulos/${moduloId}`, {
    method: 'DELETE',
  }, token);
}

/**
 * Copia los permisos de un rol a otro
 */
export async function copyRolPermisos(
  targetRoleId: string,
  sourceRoleId: string,
  token?: string | null
): Promise<{ success: boolean; permisosCopiados: number }> {
  const response = await apiFetch(`/admin/roles/${targetRoleId}/copy-permisos`, {
    method: 'POST',
    body: JSON.stringify({ sourceRoleId }),
  }, token);
  return response.json();
}

// ============================================
// TEMPLATES DE ROLES
// ============================================

export interface RolTemplate {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  icono: string | null;
  color: string | null;
  esActivo: boolean;
  visibleParaTenants: boolean;
  createdAt: string;
  updatedAt: string;
  totalRoles?: number;
  totalTenants?: number;
}

export interface TemplateModulo {
  id: string;
  templateId: string;
  moduloId: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer: 'all' | 'team' | 'own';
  alcanceEditar: 'all' | 'team' | 'own';
  permisosCampos: Record<string, any>;
  moduloNombre?: string;
  moduloCategoria?: string;
  moduloOrden?: number;
  moduloEsSubmenu?: boolean;
  moduloPadreId?: string | null;
}

export interface TemplateModuloInput {
  moduloId: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer?: 'all' | 'team' | 'own';
  alcanceEditar?: 'all' | 'team' | 'own';
  permisosCampos?: Record<string, any>;
}

export interface TemplateMatrix {
  template: RolTemplate;
  modulos: Array<{
    id: string;
    nombre: string;
    categoria: string;
    orden: number;
    esSubmenu: boolean;
    moduloPadreId: string | null;
    permisos: TemplateModulo | null;
  }>;
}

export async function getAllTemplates(token?: string | null): Promise<RolTemplate[]> {
  const response = await apiFetch('/admin/templates', {}, token);
  const data = await response.json();
  return data.templates;
}

export async function getTemplateById(id: string, token?: string | null): Promise<RolTemplate> {
  const response = await apiFetch(`/admin/templates/${id}`, {}, token);
  const data = await response.json();
  return data.template;
}

export async function createTemplate(
  data: { codigo: string; nombre: string; descripcion?: string; categoria?: string; icono?: string; color?: string; visibleParaTenants?: boolean },
  token?: string | null
): Promise<RolTemplate> {
  const response = await apiFetch('/admin/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  const result = await response.json();
  return result.template;
}

export async function updateTemplate(
  id: string,
  data: Partial<{ nombre: string; descripcion: string; categoria: string; icono: string; color: string; visibleParaTenants: boolean }>,
  token?: string | null
): Promise<RolTemplate> {
  const response = await apiFetch(`/admin/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  const result = await response.json();
  return result.template;
}

export async function toggleTemplateStatus(id: string, esActivo: boolean, token?: string | null): Promise<RolTemplate> {
  const response = await apiFetch(`/admin/templates/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ esActivo }),
  }, token);
  const data = await response.json();
  return data.template;
}

export async function deleteTemplate(id: string, token?: string | null): Promise<void> {
  await apiFetch(`/admin/templates/${id}`, { method: 'DELETE' }, token);
}

export async function getTemplateModulos(templateId: string, token?: string | null): Promise<TemplateModulo[]> {
  const response = await apiFetch(`/admin/templates/${templateId}/modulos`, {}, token);
  const data = await response.json();
  return data.modulos;
}

export async function getTemplateMatrix(templateId: string, token?: string | null): Promise<TemplateMatrix> {
  const response = await apiFetch(`/admin/templates/${templateId}/matrix`, {}, token);
  return response.json();
}

export async function updateTemplateModulos(
  templateId: string,
  modulos: TemplateModuloInput[],
  token?: string | null
): Promise<TemplateModulo[]> {
  const response = await apiFetch(`/admin/templates/${templateId}/modulos`, {
    method: 'PUT',
    body: JSON.stringify({ modulos }),
  }, token);
  const data = await response.json();
  return data.modulos;
}

export async function upsertTemplateModulo(
  templateId: string,
  moduloId: string,
  permisos: Partial<TemplateModuloInput>,
  token?: string | null
): Promise<TemplateModulo> {
  const response = await apiFetch(`/admin/templates/${templateId}/modulos/${moduloId}`, {
    method: 'PUT',
    body: JSON.stringify(permisos),
  }, token);
  const data = await response.json();
  return data.modulo;
}

export async function removeTemplateModulo(templateId: string, moduloId: string, token?: string | null): Promise<void> {
  await apiFetch(`/admin/templates/${templateId}/modulos/${moduloId}`, { method: 'DELETE' }, token);
}

export async function propagateTemplateModulo(
  templateId: string,
  moduloId: string,
  permisos: Partial<TemplateModuloInput>,
  token?: string | null
): Promise<{ propagatedCount: number }> {
  const response = await apiFetch(`/admin/templates/${templateId}/propagate/${moduloId}`, {
    method: 'POST',
    body: JSON.stringify(permisos),
  }, token);
  return response.json();
}

/**
 * Activa o desactiva un usuario
 */
export async function toggleUserStatus(userId: string, activo: boolean, token?: string | null): Promise<void> {
  const response = await apiFetch(`/admin/users/${userId}/toggle-status`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  }, token);
  
  // Si la respuesta tiene contenido, parsearlo, si no solo retornar
  if (response.status === 204) {
    return;
  }
  
  const text = await response.text();
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return;
    }
  }
}

/**
 * Elimina un usuario (soft delete)
 */
export async function deleteUser(userId: string, token?: string | null): Promise<void> {
  const response = await apiFetch(`/admin/users/${userId}`, {
    method: 'DELETE',
  }, token);
  
  // Si la respuesta es 204 (sin contenido), retornar sin procesar
  if (response.status === 204) {
    return;
  }
  
  // Si hay contenido, intentar parsearlo
  const text = await response.text();
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return;
    }
  }
}

/**
 * Asigna un rol a un usuario
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  tenantId?: string | null,
  token?: string | null
): Promise<void> {
  await apiFetch(`/admin/users/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roleId, tenantId }),
  }, token);
}

/**
 * Desasigna un rol de un usuario
 */
export async function unassignRoleFromUser(
  userId: string,
  roleId: string,
  tenantId?: string | null,
  token?: string | null
): Promise<void> {
  let path = `/admin/users/${userId}/roles/${roleId}`;
  if (tenantId) path += `?tenantId=${encodeURIComponent(tenantId)}`;

  await apiFetch(path, {
    method: 'DELETE',
  }, token);
}

// ==================== ADMIN TENANTS API ====================

export interface CreateTenantData {
  nombre: string;
  slug: string;
  codigoPais?: string;
  idiomaDefault?: string;
  idiomasDisponibles?: string[];
  activo?: boolean;
  configuracion?: Record<string, any>;
  plan?: string;
  dominioPersonalizado?: string | null;
}

export interface CreateTenantWithAdminData extends CreateTenantData {
  adminUser: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
  };
}

export interface CreateTenantWithAdminResponse {
  tenant: {
    id: string;
    nombre: string;
    slug: string;
    plan: string;
    dominioPersonalizado: string | null;
  };
  adminUser: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
  };
}

export interface UpdateTenantData {
  nombre?: string;
  slug?: string;
  codigoPais?: string;
  idiomaDefault?: string;
  idiomasDisponibles?: string[];
  activo?: boolean;
  configuracion?: Record<string, any>;
  plan?: string;
  dominioPersonalizado?: string | null;
  tipo_membresia_id?: string | null;
}

/**
 * Crea un nuevo tenant
 */
export async function createTenant(data: CreateTenantData, token?: string | null): Promise<TenantAdmin> {
  const response = await apiFetch('/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  
  return response.json();
}

/**
 * Crea un nuevo tenant con su usuario administrador (onboarding completo)
 */
export async function createTenantWithAdmin(
  data: CreateTenantWithAdminData,
  token?: string | null
): Promise<CreateTenantWithAdminResponse> {
  const response = await apiFetch('/admin/tenants/with-admin', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);

  return response.json();
}

/**
 * Actualiza un tenant existente
 */
export async function updateTenant(tenantId: string, data: UpdateTenantData, token?: string | null): Promise<TenantAdmin> {
  const response = await apiFetch(`/admin/tenants/${tenantId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  
  return response.json();
}

/**
 * Obtiene un tenant por ID
 */
export async function getTenantById(tenantId: string, token?: string | null): Promise<TenantAdmin> {
  const response = await apiFetch(`/admin/tenants/${tenantId}`, {}, token);
  return response.json();
}

/**
 * Activa o desactiva un tenant
 */
export async function toggleTenantStatus(tenantId: string, activo: boolean, token?: string | null): Promise<void> {
  const response = await apiFetch(`/admin/tenants/${tenantId}/toggle-status`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  }, token);
  
  // Si la respuesta tiene contenido, parsearlo, si no solo retornar
  if (response.status === 204) {
    return;
  }
  
  const text = await response.text();
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return;
    }
  }
}

/**
 * Elimina un tenant (soft delete)
 */
export async function deleteTenant(tenantId: string, token?: string | null): Promise<void> {
  const response = await apiFetch(`/admin/tenants/${tenantId}`, {
    method: 'DELETE',
  }, token);
  
  // Si la respuesta es 204 (sin contenido), retornar sin procesar
  if (response.status === 204) {
    return;
  }
  
  // Si hay contenido, intentar parsearlo
  const text = await response.text();
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return;
    }
  }
}

// ==================== PAISES API ====================

export interface Pais {
  codigo: string;
  nombre: string;
  nombreEn: string | null;
  moneda: string | null;
  zonaHoraria: string | null;
}

/**
 * Obtiene todos los países disponibles
 */
export async function getAllPaises(token?: string | null): Promise<Pais[]> {
  const response = await apiFetch('/admin/paises', {}, token);
  return response.json();
}

// ==================== CRM CONTACTOS API ====================

export interface Contacto {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  telefono_secundario: string | null;
  whatsapp: string | null;
  tipo: 'lead' | 'cliente' | 'asesor' | 'desarrollador' | 'referidor' | 'propietario' | 'vendedor';
  tipos_contacto: string[];
  empresa: string | null;
  cargo: string | null;
  origen: string | null;
  favorito: boolean;
  notas: string | null;
  etiquetas: string[];
  datos_extra: Record<string, any>;
  usuario_asignado_id: string | null;
  activo: boolean;
  foto_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactosResponse {
  data: Contacto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContactoFiltros {
  busqueda?: string;
  tipo?: string;
  favoritos?: boolean;
  todos?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Obtiene los contactos de un tenant con filtros y paginación
 */
export async function getContactos(tenantId: string, filtros?: ContactoFiltros): Promise<ContactosResponse> {
  const params = new URLSearchParams();

  if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
  if (filtros?.tipo) params.append('tipo', filtros.tipo);
  if (filtros?.favoritos) params.append('favoritos', 'true');
  if (filtros?.todos) params.append('todos', 'true');
  if (filtros?.page) params.append('page', String(filtros.page));
  if (filtros?.limit) params.append('limit', String(filtros.limit));

  const queryString = params.toString();
  const url = `/tenants/${tenantId}/contactos${queryString ? `?${queryString}` : ''}`;

  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error('Error al obtener contactos');
  }
  return response.json();
}

/**
 * Obtiene un contacto por ID
 */
export async function getContacto(tenantId: string, contactoId: string): Promise<Contacto> {
  const response = await apiFetch(`/tenants/${tenantId}/contactos/${contactoId}`);
  if (!response.ok) {
    throw new Error('Error al obtener contacto');
  }
  return response.json();
}

/**
 * Crea un nuevo contacto
 */
export async function createContacto(tenantId: string, data: Partial<Contacto>): Promise<Contacto> {
  const response = await apiFetch(`/tenants/${tenantId}/contactos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear contacto');
  }

  return response.json();
}

/**
 * Actualiza un contacto
 */
export async function updateContacto(tenantId: string, contactoId: string, data: Partial<Contacto>): Promise<Contacto> {
  const response = await apiFetch(`/tenants/${tenantId}/contactos/${contactoId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar contacto');
  }

  return response.json();
}

/**
 * Elimina un contacto
 */
export async function deleteContacto(tenantId: string, contactoId: string): Promise<void> {
  const response = await apiFetch(`/tenants/${tenantId}/contactos/${contactoId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar contacto');
  }
}

/**
 * Toggle favorito de un contacto
 */
export async function toggleContactoFavorito(tenantId: string, contactoId: string): Promise<Contacto> {
  const response = await apiFetch(`/tenants/${tenantId}/contactos/${contactoId}/favorito`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al cambiar favorito');
  }

  return response.json();
}

// ==================== CRM RELACIONES DE CONTACTOS API ====================

export interface ContactoRelacion {
  id: string;
  tenant_id: string;
  contacto_origen_id: string;
  contacto_destino_id: string;
  tipo_relacion: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  contacto_relacionado?: Partial<Contacto>;
}

/**
 * Obtiene las relaciones de un contacto
 */
export async function getRelacionesContacto(tenantId: string, contactoId: string): Promise<ContactoRelacion[]> {
  const response = await apiFetch(`/tenants/${tenantId}/contactos/${contactoId}/relaciones`);
  if (!response.ok) {
    throw new Error('Error al obtener relaciones');
  }
  return response.json();
}

/**
 * Crea una relación entre contactos
 */
export async function createRelacionContacto(
  tenantId: string,
  contactoOrigenId: string,
  data: {
    contacto_destino_id: string;
    tipo_relacion: string;
    notas?: string;
  }
): Promise<ContactoRelacion> {
  const response = await apiFetch(`/tenants/${tenantId}/contactos/${contactoOrigenId}/relaciones`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear relación');
  }

  return response.json();
}

/**
 * Elimina una relación entre contactos
 */
export async function deleteRelacionContacto(
  tenantId: string,
  contactoId: string,
  relacionId: string
): Promise<void> {
  const response = await apiFetch(`/tenants/${tenantId}/contactos/${contactoId}/relaciones/${relacionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar relación');
  }
}

// ==================== CRM SOLICITUDES/PIPELINE API ====================

export interface Solicitud {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion: string | null;
  etapa: string;
  tipo_solicitud: string;
  prioridad: string;
  purge_score: number;
  purge_power: number;
  purge_urgency: number;
  purge_resources: number;
  purge_genuine: number;
  purge_expectations: number;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  // Información de búsqueda
  tipo_propiedad: string | null;
  tipo_operacion: string | null;
  zona_interes: string | null;
  motivo: string | null;
  // Contacto
  contacto_id: string | null;
  contacto_nombre: string | null;
  contacto_apellido: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  contacto_foto: string | null;
  // Asignado
  asignado_id: string | null;
  asignado_nombre: string | null;
  asignado_apellido: string | null;
  asignado_avatar: string | null;
  // Propiedades
  propiedades_count: number;
  propiedades_preview: any[];
  valor_estimado: number | null;
  fecha_cierre_esperada: string | null;
  ultima_actividad: string | null;
  fuente: string | null;
  created_at: string;
  updated_at: string;
}

export interface SolicitudesResponse {
  data: Solicitud[];
  total: number;
  byEtapa: Record<string, number>;
}

export interface SolicitudFiltros {
  busqueda?: string;
  etapa?: string;
  tipo?: string;
  prioridad?: string;
  todos?: boolean;
  contacto_id?: string;
}

/**
 * Obtiene las solicitudes de un tenant
 */
export async function getSolicitudes(tenantId: string, filtros?: SolicitudFiltros): Promise<SolicitudesResponse> {
  const params = new URLSearchParams();

  if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
  if (filtros?.etapa) params.append('etapa', filtros.etapa);
  if (filtros?.tipo) params.append('tipo', filtros.tipo);
  if (filtros?.prioridad) params.append('prioridad', filtros.prioridad);
  if (filtros?.todos) params.append('todos', 'true');
  if (filtros?.contacto_id) params.append('contacto_id', filtros.contacto_id);

  const queryString = params.toString();
  const url = `/tenants/${tenantId}/solicitudes${queryString ? `?${queryString}` : ''}`;

  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error('Error al obtener solicitudes');
  }
  return response.json();
}

/**
 * Obtiene una solicitud por ID
 */
export async function getSolicitud(tenantId: string, solicitudId: string): Promise<Solicitud> {
  const response = await apiFetch(`/tenants/${tenantId}/solicitudes/${solicitudId}`);
  if (!response.ok) {
    throw new Error('Error al obtener solicitud');
  }
  return response.json();
}

/**
 * Crea una nueva solicitud
 */
export async function createSolicitud(tenantId: string, data: Partial<Solicitud>): Promise<Solicitud> {
  const response = await apiFetch(`/tenants/${tenantId}/solicitudes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear solicitud');
  }

  return response.json();
}

/**
 * Actualiza una solicitud
 */
export async function updateSolicitud(tenantId: string, solicitudId: string, data: Partial<Solicitud>): Promise<Solicitud> {
  const response = await apiFetch(`/tenants/${tenantId}/solicitudes/${solicitudId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar solicitud');
  }

  return response.json();
}

/**
 * Cambia la etapa de una solicitud (drag & drop)
 * @param razonPerdida - Nota/razón cuando se marca como perdida o descartada
 */
export async function cambiarEtapaSolicitud(
  tenantId: string,
  solicitudId: string,
  nuevaEtapa: string,
  razonPerdida?: string
): Promise<Solicitud> {
  const response = await apiFetch(`/tenants/${tenantId}/solicitudes/${solicitudId}/etapa`, {
    method: 'POST',
    body: JSON.stringify({
      etapa: nuevaEtapa,
      razonPerdida: razonPerdida || undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al cambiar etapa');
  }

  return response.json();
}

/**
 * Elimina una solicitud
 */
export async function deleteSolicitud(tenantId: string, solicitudId: string): Promise<void> {
  const response = await apiFetch(`/tenants/${tenantId}/solicitudes/${solicitudId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar solicitud');
  }
}

// ==================== CRM PROPUESTAS API ====================

export type EstadoPropuesta =
  | 'borrador'
  | 'enviada'
  | 'vista'
  | 'aceptada'
  | 'rechazada'
  | 'expirada';

export interface PropuestaPropiedadResumen {
  id: string;
  propiedad_id: string;
  titulo: string;
  codigo?: string;
  precio?: number;
  moneda?: string;
  imagen_principal?: string;
  tipo?: string;
  operacion?: string;
  ciudad?: string;
  habitaciones?: number;
  banos?: number;
  m2_construccion?: number;
  orden: number;
  notas?: string;
  precio_especial?: number;
}

export interface Propuesta {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string | null;
  estado: EstadoPropuesta;
  solicitud_id?: string | null;
  solicitud_titulo?: string | null;
  contacto_id?: string | null;
  contacto?: {
    id: string;
    nombre: string;
    apellido?: string;
    email?: string;
  };
  // Compatibilidad con vista anterior
  contacto_nombre?: string | null;
  contacto_apellido?: string | null;
  contacto_email?: string | null;
  propiedad_id?: string | null; // Mantener por compatibilidad
  propiedades?: PropuestaPropiedadResumen[]; // Nuevo: array de propiedades
  propiedades_count?: number; // Conteo rápido para listados
  usuario_creador_id?: string | null;
  precio_propuesto?: number | null;
  moneda: string;
  comision_porcentaje?: number | null;
  comision_monto?: number | null;
  condiciones?: string | null;
  notas_internas?: string | null;
  url_publica?: string | null;
  fecha_expiracion?: string | null;
  fecha_enviada?: string | null;
  fecha_vista?: string | null;
  fecha_respuesta?: string | null;
  veces_vista?: number;
  datos_extra?: Record<string, any>;
  activo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropuestasResponse {
  data: Propuesta[];
  total: number;
}

export interface PropuestaFiltros {
  busqueda?: string;
  estado?: string;
  solicitud_id?: string;
  contacto_id?: string;
}

/**
 * Obtiene las propuestas de un tenant
 */
export async function getPropuestas(tenantId: string, filtros?: PropuestaFiltros): Promise<PropuestasResponse> {
  const params = new URLSearchParams();

  if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
  if (filtros?.estado) params.append('estado', filtros.estado);
  if (filtros?.solicitud_id) params.append('solicitud_id', filtros.solicitud_id);
  if (filtros?.contacto_id) params.append('contacto_id', filtros.contacto_id);

  const queryString = params.toString();
  const url = `/tenants/${tenantId}/propuestas${queryString ? `?${queryString}` : ''}`;

  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error('Error al obtener propuestas');
  }
  return response.json();
}

/**
 * Obtiene una propuesta por ID
 */
export async function getPropuesta(tenantId: string, propuestaId: string): Promise<Propuesta> {
  const response = await apiFetch(`/tenants/${tenantId}/propuestas/${propuestaId}`);
  if (!response.ok) {
    throw new Error('Error al obtener propuesta');
  }
  return response.json();
}

/**
 * Crea una nueva propuesta
 */
export async function createPropuesta(tenantId: string, data: Partial<Propuesta>): Promise<Propuesta> {
  const response = await apiFetch(`/tenants/${tenantId}/propuestas`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Actualiza una propuesta
 */
export async function updatePropuesta(tenantId: string, propuestaId: string, data: Partial<Propuesta>): Promise<Propuesta> {
  const response = await apiFetch(`/tenants/${tenantId}/propuestas/${propuestaId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Cambia el estado de una propuesta
 */
export async function cambiarEstadoPropuesta(tenantId: string, propuestaId: string, nuevoEstado: string): Promise<Propuesta> {
  const response = await apiFetch(`/tenants/${tenantId}/propuestas/${propuestaId}/estado`, {
    method: 'PUT',
    body: JSON.stringify({ estado: nuevoEstado }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al cambiar estado');
  }

  return response.json();
}

/**
 * Elimina una propuesta
 */
export async function deletePropuesta(tenantId: string, propuestaId: string): Promise<void> {
  const response = await apiFetch(`/tenants/${tenantId}/propuestas/${propuestaId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar propuesta');
  }
}

/**
 * Obtiene las propiedades de una propuesta
 */
export async function getPropiedadesDePropuesta(tenantId: string, propuestaId: string): Promise<PropuestaPropiedadResumen[]> {
  const response = await apiFetch(`/tenants/${tenantId}/propuestas/${propuestaId}/propiedades`);
  if (!response.ok) {
    throw new Error('Error al obtener propiedades de la propuesta');
  }
  return response.json();
}

/**
 * Sincroniza las propiedades de una propuesta (reemplaza todas)
 */
export async function sincronizarPropiedadesPropuesta(
  tenantId: string,
  propuestaId: string,
  propiedadIds: string[]
): Promise<PropuestaPropiedadResumen[]> {
  const response = await apiFetch(`/tenants/${tenantId}/propuestas/${propuestaId}/propiedades`, {
    method: 'PUT',
    body: JSON.stringify({ propiedad_ids: propiedadIds }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al sincronizar propiedades');
  }

  return response.json();
}

/**
 * Agrega una propiedad a una propuesta
 */
export async function agregarPropiedadAPropuesta(
  tenantId: string,
  propuestaId: string,
  propiedadId: string,
  notas?: string,
  precioEspecial?: number
): Promise<PropuestaPropiedadResumen[]> {
  const response = await apiFetch(`/tenants/${tenantId}/propuestas/${propuestaId}/propiedades`, {
    method: 'POST',
    body: JSON.stringify({ propiedad_id: propiedadId, notas, precio_especial: precioEspecial }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al agregar propiedad');
  }

  return response.json();
}

/**
 * Elimina una propiedad de una propuesta
 */
export async function eliminarPropiedadDePropuesta(
  tenantId: string,
  propuestaId: string,
  propiedadId: string
): Promise<PropuestaPropiedadResumen[]> {
  const response = await apiFetch(`/tenants/${tenantId}/propuestas/${propuestaId}/propiedades/${propiedadId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar propiedad de la propuesta');
  }

  return response.json();
}

/**
 * Regenera la URL pública de una propuesta
 */
export async function regenerarUrlPublicaPropuesta(tenantId: string, propuestaId: string): Promise<Propuesta> {
  const response = await apiFetch(`/tenants/${tenantId}/propuestas/${propuestaId}/regenerar-url`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al regenerar URL');
  }

  return response.json();
}

// ==================== CRM ACTIVIDADES/SEGUIMIENTO API ====================

export type TipoActividad = 'llamada' | 'email' | 'reunion' | 'visita' | 'tarea' | 'whatsapp' | 'seguimiento';
export type EstadoActividad = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
export type Prioridad = 'baja' | 'normal' | 'alta' | 'urgente';

export interface Actividad {
  id: string;
  tenant_id: string;
  tipo: TipoActividad;
  titulo: string;
  descripcion?: string;
  contacto_id?: string;
  solicitud_id?: string;
  propuesta_id?: string;
  usuario_id?: string;
  // Campos de fecha
  fecha_actividad?: string;
  fecha_programada?: string;
  fecha_recordatorio?: string;
  fecha_completada?: string;
  // Estado y prioridad
  estado: EstadoActividad;
  prioridad: Prioridad;
  completada: boolean; // Compatibilidad
  nota_completacion?: string;
  // Metadata
  metadata?: Record<string, any>;
  datos_extra?: Record<string, any>;
  // Timestamps
  created_at: string;
  updated_at: string;
  // JOINs
  contacto_nombre?: string;
  contacto_apellido?: string;
  contacto_email?: string;
  solicitud_titulo?: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
}

export interface ActividadesStats {
  porTipo: Record<TipoActividad, number>;
  porEstado: Record<EstadoActividad, number>;
  esteMes: number;
  esteAno: number;
  completadas: number;
}

export interface ActividadesResponse {
  data: Actividad[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: ActividadesStats;
}

export interface ActividadFiltros {
  tipo?: string;
  estado?: EstadoActividad;
  prioridad?: Prioridad;
  contacto_id?: string;
  solicitud_id?: string;
  propuesta_id?: string;
  completada?: boolean;
  busqueda?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  limit?: number;
}

/**
 * Obtiene las actividades de un tenant
 */
export async function getActividades(tenantId: string, filtros?: ActividadFiltros): Promise<ActividadesResponse> {
  const params = new URLSearchParams();

  if (filtros?.tipo) params.append('tipo', filtros.tipo);
  if (filtros?.estado) params.append('estado', filtros.estado);
  if (filtros?.prioridad) params.append('prioridad', filtros.prioridad);
  if (filtros?.contacto_id) params.append('contacto_id', filtros.contacto_id);
  if (filtros?.solicitud_id) params.append('solicitud_id', filtros.solicitud_id);
  if (filtros?.propuesta_id) params.append('propuesta_id', filtros.propuesta_id);
  if (filtros?.completada !== undefined) params.append('completada', String(filtros.completada));
  if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
  if (filtros?.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
  if (filtros?.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
  if (filtros?.page) params.append('page', String(filtros.page));
  if (filtros?.limit) params.append('limit', String(filtros.limit));

  const queryString = params.toString();
  const url = `/tenants/${tenantId}/actividades${queryString ? `?${queryString}` : ''}`;

  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error('Error al obtener actividades');
  }
  return response.json();
}

/**
 * Obtiene una actividad por ID
 */
export async function getActividad(tenantId: string, actividadId: string): Promise<Actividad> {
  const response = await apiFetch(`/tenants/${tenantId}/actividades/${actividadId}`);
  if (!response.ok) {
    throw new Error('Error al obtener actividad');
  }
  return response.json();
}

/**
 * Obtiene las actividades de un contacto
 */
export async function getActividadesByContacto(tenantId: string, contactoId: string, limit?: number): Promise<Actividad[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));
  const queryString = params.toString();

  const response = await apiFetch(`/tenants/${tenantId}/contactos/${contactoId}/actividades${queryString ? `?${queryString}` : ''}`);
  if (!response.ok) {
    throw new Error('Error al obtener actividades del contacto');
  }
  return response.json();
}

/**
 * Obtiene las actividades de una solicitud
 */
export async function getActividadesBySolicitud(tenantId: string, solicitudId: string, limit?: number): Promise<Actividad[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));
  const queryString = params.toString();

  const response = await apiFetch(`/tenants/${tenantId}/solicitudes/${solicitudId}/actividades${queryString ? `?${queryString}` : ''}`);
  if (!response.ok) {
    throw new Error('Error al obtener actividades de la solicitud');
  }
  return response.json();
}

/**
 * Obtiene actividades pendientes
 */
export async function getActividadesPendientes(tenantId: string, usuarioId?: string, limit?: number): Promise<Actividad[]> {
  const params = new URLSearchParams();
  if (usuarioId) params.append('usuario_id', usuarioId);
  if (limit) params.append('limit', String(limit));
  const queryString = params.toString();

  const response = await apiFetch(`/tenants/${tenantId}/actividades/pendientes${queryString ? `?${queryString}` : ''}`);
  if (!response.ok) {
    throw new Error('Error al obtener actividades pendientes');
  }
  return response.json();
}

/**
 * Crea una nueva actividad
 */
export async function createActividad(tenantId: string, data: Partial<Actividad>): Promise<Actividad> {
  const response = await apiFetch(`/tenants/${tenantId}/actividades`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear actividad');
  }

  return response.json();
}

/**
 * Actualiza una actividad
 */
export async function updateActividad(tenantId: string, actividadId: string, data: Partial<Actividad>): Promise<Actividad> {
  const response = await apiFetch(`/tenants/${tenantId}/actividades/${actividadId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar actividad');
  }

  return response.json();
}

/**
 * Marca una actividad como completada/no completada
 */
export async function completarActividad(
  tenantId: string,
  actividadId: string,
  completada: boolean = true,
  nota?: string
): Promise<Actividad> {
  const response = await apiFetch(`/tenants/${tenantId}/actividades/${actividadId}/completar`, {
    method: 'POST',
    body: JSON.stringify({ completada, nota }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al completar actividad');
  }

  return response.json();
}

/**
 * Cambia el estado de una actividad
 */
export async function cambiarEstadoActividad(
  tenantId: string,
  actividadId: string,
  estado: EstadoActividad,
  nota?: string
): Promise<Actividad> {
  const response = await apiFetch(`/tenants/${tenantId}/actividades/${actividadId}/estado`, {
    method: 'POST',
    body: JSON.stringify({ estado, nota }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al cambiar estado');
  }

  return response.json();
}

/**
 * Obtiene estadísticas de actividades
 */
export async function getActividadesStats(tenantId: string): Promise<{
  total: number;
  pendientes: number;
  enProgreso: number;
  completadas: number;
  canceladas: number;
  esteMes: number;
  esteAno: number;
  porTipo: Record<TipoActividad, number>;
}> {
  const response = await apiFetch(`/tenants/${tenantId}/actividades/stats`);
  if (!response.ok) {
    throw new Error('Error al obtener estadísticas');
  }
  return response.json();
}

/**
 * Elimina una actividad
 */
export async function deleteActividad(tenantId: string, actividadId: string): Promise<void> {
  const response = await apiFetch(`/tenants/${tenantId}/actividades/${actividadId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar actividad');
  }
}

// ==================== CRM PROPIEDADES API ====================

export type TipoPropiedad = 'casa' | 'departamento' | 'terreno' | 'oficina' | 'local' | 'bodega';
export type OperacionPropiedad = 'venta' | 'renta' | 'traspaso';
export type EstadoPropiedad = 'disponible' | 'reservada' | 'vendida' | 'rentada' | 'inactiva';

export interface Propiedad {
  id: string;
  tenant_id: string;
  titulo: string;
  codigo?: string;
  descripcion?: string;
  tipo: TipoPropiedad;
  operacion: OperacionPropiedad;
  precio?: number;
  precio_venta?: number;
  precio_alquiler?: number;
  precio_anterior?: number;
  moneda: string;
  pais?: string;
  estado?: string;
  ciudad?: string;
  colonia?: string;
  direccion?: string;
  codigo_postal?: string;
  latitud?: number;
  longitud?: number;
  recamaras?: number;
  banos?: number;
  medios_banos?: number;
  estacionamientos?: number;
  m2_construccion?: number;
  m2_terreno?: number;
  antiguedad?: number;
  pisos?: number;
  amenidades: string[];
  caracteristicas: Record<string, any>;
  imagen_principal?: string;
  imagenes: string[];
  video_url?: string;
  tour_virtual_url?: string;
  estado_propiedad: EstadoPropiedad;
  destacada: boolean;
  exclusiva: boolean;
  agente_id?: string;
  propietario_id?: string;
  slug?: string;
  notas?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  agente_nombre?: string;
  agente_apellido?: string;
  propietario_nombre?: string;
  propietario_apellido?: string;
  // Campos de comisión
  comision?: string | number | null;
  comision_nota?: string | null;
  // Red Global
  red_global?: boolean;
  tenant_nombre?: string;
}

export interface PropiedadesResponse {
  data: Propiedad[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PropiedadFiltros {
  tipo?: string;
  operacion?: string;
  estado_propiedad?: string;
  ciudad?: string;
  precio_min?: number;
  precio_max?: number;
  recamaras_min?: number;
  banos_min?: number;
  m2_min?: number;
  m2_max?: number;
  destacada?: boolean;
  busqueda?: string;
  agente_id?: string;
  include_red_global?: boolean;
  page?: number;
  limit?: number;
}

export interface PropiedadesStats {
  total: number;
  disponibles: number;
  reservadas: number;
  vendidas: number;
  porTipo: Record<string, number>;
  porOperacion: Record<string, number>;
}

/**
 * Obtiene las propiedades de un tenant
 */
export async function getPropiedadesCrm(tenantId: string, filtros?: PropiedadFiltros, token?: string | null): Promise<PropiedadesResponse> {
  const params = new URLSearchParams();

  if (filtros?.tipo) params.append('tipo', filtros.tipo);
  if (filtros?.operacion) params.append('operacion', filtros.operacion);
  if (filtros?.estado_propiedad) params.append('estado_propiedad', filtros.estado_propiedad);
  if (filtros?.ciudad) params.append('ciudad', filtros.ciudad);
  if (filtros?.precio_min !== undefined) params.append('precio_min', String(filtros.precio_min));
  if (filtros?.precio_max !== undefined) params.append('precio_max', String(filtros.precio_max));
  if (filtros?.recamaras_min !== undefined) params.append('recamaras_min', String(filtros.recamaras_min));
  if (filtros?.banos_min !== undefined) params.append('banos_min', String(filtros.banos_min));
  if (filtros?.m2_min !== undefined) params.append('m2_min', String(filtros.m2_min));
  if (filtros?.m2_max !== undefined) params.append('m2_max', String(filtros.m2_max));
  if (filtros?.destacada !== undefined) params.append('destacada', String(filtros.destacada));
  if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
  if (filtros?.agente_id) params.append('agente_id', filtros.agente_id);
  if (filtros?.include_red_global) params.append('include_red_global', String(filtros.include_red_global));
  if (filtros?.page) params.append('page', String(filtros.page));
  if (filtros?.limit) params.append('limit', String(filtros.limit));

  const queryString = params.toString();
  const url = `/tenants/${tenantId}/propiedades${queryString ? `?${queryString}` : ''}`;

  const response = await apiFetch(url, {}, token);
  if (!response.ok) {
    throw new Error('Error al obtener propiedades');
  }
  return response.json();
}

/**
 * Obtiene una propiedad por ID
 */
export async function getPropiedadCrm(tenantId: string, propiedadId: string, token?: string | null): Promise<Propiedad> {
  const response = await apiFetch(`/tenants/${tenantId}/propiedades/${propiedadId}`, {}, token);
  if (!response.ok) {
    throw new Error('Error al obtener propiedad');
  }
  return response.json();
}

/**
 * Obtiene estadísticas de propiedades
 */
export async function getPropiedadesStats(tenantId: string, token?: string | null): Promise<PropiedadesStats> {
  const response = await apiFetch(`/tenants/${tenantId}/propiedades/stats`, {}, token);
  if (!response.ok) {
    throw new Error('Error al obtener estadísticas');
  }
  return response.json();
}

/**
 * Crea una nueva propiedad
 */
export async function createPropiedadCrm(tenantId: string, data: Partial<Propiedad>, token?: string | null): Promise<Propiedad> {
  const response = await apiFetch(`/tenants/${tenantId}/propiedades`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear propiedad');
  }

  return response.json();
}

/**
 * Actualiza una propiedad
 */
export async function updatePropiedadCrm(tenantId: string, propiedadId: string, data: Partial<Propiedad>, token?: string | null): Promise<Propiedad> {
  const response = await apiFetch(`/tenants/${tenantId}/propiedades/${propiedadId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar propiedad');
  }

  return response.json();
}

/**
 * Elimina una propiedad
 */
export async function deletePropiedadCrm(tenantId: string, propiedadId: string, token?: string | null): Promise<void> {
  const response = await apiFetch(`/tenants/${tenantId}/propiedades/${propiedadId}`, {
    method: 'DELETE',
  }, token);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar propiedad');
  }
}

// ============================================
// UNIDADES DE PROYECTO
// ============================================

export interface UnidadProyecto {
  id: string;
  propiedad_id: string;
  tenant_id: string;
  codigo: string;
  tipologia_id?: string;
  tipologia_nombre?: string;
  habitaciones?: number;
  banos?: number;
  m2?: number;
  precio?: number;
  moneda?: string;
  torre?: string;
  piso?: string;
  nivel?: string;
  estado: 'disponible' | 'reservada' | 'bloqueada' | 'vendida';
  fecha_reserva?: Date;
  fecha_venta?: Date;
  reservado_por?: string;
  vendido_a?: string;
  notas?: string;
  orden?: number;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Obtiene las unidades de un proyecto (propiedad)
 */
export async function getUnidadesProyecto(
  tenantId: string,
  propiedadId: string,
  token?: string | null
): Promise<UnidadProyecto[]> {
  const response = await apiFetch(
    `/tenants/${tenantId}/propiedades/${propiedadId}/unidades`,
    {},
    token
  );
  if (!response.ok) {
    // Si no tiene unidades, retornar array vacío
    if (response.status === 404) {
      return [];
    }
    throw new Error('Error al obtener unidades del proyecto');
  }
  return response.json();
}

/**
 * Regenera los slugs de una propiedad
 * ADVERTENCIA: Puede afectar SEO si la propiedad está publicada
 */
export async function regeneratePropiedadSlugs(
  tenantId: string,
  propiedadId: string,
  options?: {
    forceRegenerate?: boolean;
    nuevoTitulo?: string;
  },
  token?: string | null
): Promise<{
  success: boolean;
  slug: string;
  slug_traducciones: Record<string, string>;
  warning?: string;
}> {
  const response = await apiFetch(
    `/tenants/${tenantId}/propiedades/${propiedadId}/regenerate-slugs`,
    {
      method: 'POST',
      body: JSON.stringify(options || {}),
    },
    token
  );
  return response.json();
}

// ==================== CRM METAS API (GAMIFICACIÓN) ====================

export type TipoMeta = 'ventas' | 'contactos' | 'actividades' | 'cierres' | 'propuestas' | 'propiedades';
export type EstadoMeta = 'activa' | 'completada' | 'fallida' | 'cancelada';
export type PeriodoMeta = 'diario' | 'semanal' | 'mensual' | 'trimestral' | 'anual' | 'personalizado';

export interface Meta {
  id: string;
  tenant_id: string;
  usuario_id?: string;
  creado_por_id?: string;
  titulo: string;
  descripcion?: string;
  tipo_meta: TipoMeta;
  metrica: 'cantidad' | 'monto' | 'porcentaje';
  valor_objetivo: number;
  valor_actual: number;
  periodo: PeriodoMeta;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoMeta;
  origen: 'personal' | 'asignada';
  tipo_recompensa?: string;
  descripcion_recompensa?: string;
  monto_recompensa?: number;
  fecha_completada?: string;
  historial_progreso: any[];
  activo: boolean;
  created_at: string;
  updated_at: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
  creador_nombre?: string;
  creador_apellido?: string;
  porcentaje_avance?: number;
}

export interface MetasResponse {
  data: Meta[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MetaFiltros {
  tipo_meta?: string;
  estado?: string;
  origen?: string;
  usuario_id?: string;
  periodo?: string;
  page?: number;
  limit?: number;
}

export interface MetasResumen {
  activas: number;
  completadas: number;
  fallidas: number;
  porcentajeExito: number;
  progresoPromedio: number;
}

/**
 * Obtiene las metas de un tenant
 */
export async function getMetas(tenantId: string, filtros?: MetaFiltros): Promise<MetasResponse> {
  const params = new URLSearchParams();
  if (filtros?.tipo_meta) params.append('tipo_meta', filtros.tipo_meta);
  if (filtros?.estado) params.append('estado', filtros.estado);
  if (filtros?.origen) params.append('origen', filtros.origen);
  if (filtros?.usuario_id) params.append('usuario_id', filtros.usuario_id);
  if (filtros?.periodo) params.append('periodo', filtros.periodo);
  if (filtros?.page) params.append('page', String(filtros.page));
  if (filtros?.limit) params.append('limit', String(filtros.limit));

  const qs = params.toString();
  const response = await apiFetch(`/tenants/${tenantId}/metas${qs ? '?' + qs : ''}`);
  if (!response.ok) {
    throw new Error('Error al obtener metas');
  }
  return response.json();
}

/**
 * Obtiene una meta por ID
 */
export async function getMetaCrm(tenantId: string, metaId: string): Promise<Meta> {
  const response = await apiFetch(`/tenants/${tenantId}/metas/${metaId}`);
  if (!response.ok) {
    throw new Error('Error al obtener meta');
  }
  return response.json();
}

/**
 * Obtiene el resumen de metas
 */
export async function getMetasResumen(tenantId: string, usuarioId?: string): Promise<MetasResumen> {
  const params = new URLSearchParams();
  if (usuarioId) params.append('usuario_id', usuarioId);
  const qs = params.toString();

  const response = await apiFetch(`/tenants/${tenantId}/metas/resumen${qs ? '?' + qs : ''}`);
  if (!response.ok) {
    throw new Error('Error al obtener resumen');
  }
  return response.json();
}

/**
 * Crea una nueva meta
 */
export async function createMeta(tenantId: string, data: Partial<Meta>): Promise<Meta> {
  const response = await apiFetch(`/tenants/${tenantId}/metas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear meta');
  }

  return response.json();
}

/**
 * Actualiza una meta
 */
export async function updateMeta(tenantId: string, metaId: string, data: Partial<Meta>): Promise<Meta> {
  const response = await apiFetch(`/tenants/${tenantId}/metas/${metaId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar meta');
  }

  return response.json();
}

/**
 * Actualiza el progreso de una meta
 */
export async function actualizarProgresoMeta(tenantId: string, metaId: string, valor: number, nota?: string): Promise<Meta> {
  const response = await apiFetch(`/tenants/${tenantId}/metas/${metaId}/progreso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valor, nota }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar progreso');
  }

  return response.json();
}

/**
 * Elimina una meta
 */
export async function deleteMeta(tenantId: string, metaId: string): Promise<void> {
  const response = await apiFetch(`/tenants/${tenantId}/metas/${metaId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar meta');
  }
}

// ==================== FEATURES API ====================

export interface Feature {
  id: string;
  codigo?: string; // Código único del feature
  name: string;
  nombre?: string; // Alias para nombre (usado en algunos lugares)
  description: string;
  icon: string;
  category: string;
  isPublic: boolean;
  isPremium: boolean;
  availableInPlans: string[];
  enabledCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFeatureData {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  isPublic?: boolean;
  isPremium?: boolean;
  availableInPlans?: string[];
}

export interface UpdateFeatureData {
  name?: string;
  description?: string;
  icon?: string;
  category?: string;
  isPublic?: boolean;
  isPremium?: boolean;
  availableInPlans?: string[];
}

/**
 * Obtiene todos los features
 */
export async function getAllFeatures(token?: string | null): Promise<Feature[]> {
  const response = await apiFetch('/admin/features', {}, token);
  const data = await response.json();
  return data.features || data;
}

/**
 * Crea un nuevo feature
 */
export async function createFeature(data: CreateFeatureData, token?: string | null): Promise<Feature> {
  const response = await apiFetch('/admin/features', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

/**
 * Actualiza un feature existente
 */
export async function updateFeature(featureId: string, data: UpdateFeatureData, token?: string | null): Promise<Feature> {
  const response = await apiFetch(`/admin/features/${featureId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

/**
 * Elimina un feature
 */
export async function deleteFeature(featureId: string, token?: string | null): Promise<void> {
  await apiFetch(`/admin/features/${featureId}`, {
    method: 'DELETE',
  }, token);
}

export interface FeatureWithTenantStatus extends Feature {
  enabled: boolean;
}

/**
 * Obtiene todos los features disponibles con información de si están habilitados para un tenant
 */
export async function getTenantFeatures(tenantId: string, token?: string | null): Promise<FeatureWithTenantStatus[]> {
  const response = await apiFetch(`/admin/tenants/${tenantId}/features`, {}, token);
  const data = await response.json();
  return data.features || data;
}

/**
 * Habilita un feature para un tenant
 */
export async function enableFeatureForTenant(tenantId: string, featureId: string, token?: string | null): Promise<void> {
  await apiFetch(`/admin/tenants/${tenantId}/features/${featureId}`, {
    method: 'POST',
  }, token);
}

/**
 * Deshabilita un feature para un tenant
 */
export async function disableFeatureForTenant(tenantId: string, featureId: string, token?: string | null): Promise<void> {
  await apiFetch(`/admin/tenants/${tenantId}/features/${featureId}`, {
    method: 'DELETE',
  }, token);
}

// ==================== BILLING API ====================

export interface BillingStats {
  totalFacturas: number;
  facturasPendientes: number;
  facturasPagadas: number;
  facturasVencidas: number;
  totalRecaudado: number;
  totalPendiente: number;
  suscripcionesActivas: number;
  suscripcionesSuspendidas: number;
  proximosVencimientos: number;
}

export interface Factura {
  id: string;
  tenantId: string;
  tenantNombre?: string;
  numeroFactura: string;
  plan: string;
  monto: number;
  moneda: string;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'cancelada';
  fechaEmision: string;
  fechaVencimiento: string;
  fechaPago: string | null;
  metodoPago: string | null;
  referenciaPago: string | null;
  detalles: Record<string, any>;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Suscripcion {
  id: string;
  tenantId: string;
  tenantNombre?: string;
  plan: string;
  estado: 'activa' | 'suspendida' | 'cancelada';
  fechaInicio: string;
  fechaFin: string | null;
  proximoCobro: string | null;
  montoMensual: number;
  metodoPagoGuardado: string | null;
  configuracion: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Obtiene estadísticas de facturación
 */
export async function getBillingStats(token?: string | null): Promise<BillingStats> {
  const response = await apiFetch('/admin/billing/stats', {}, token);
  return response.json();
}

/**
 * Obtiene todas las facturas
 */
export async function getAllFacturas(token?: string | null, filters?: {
  tenantId?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}): Promise<Factura[]> {
  const params = new URLSearchParams();
  if (filters?.tenantId) params.append('tenantId', filters.tenantId);
  if (filters?.estado) params.append('estado', filters.estado);
  if (filters?.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
  if (filters?.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
  
  const queryString = params.toString();
  const url = `/admin/billing/facturas${queryString ? `?${queryString}` : ''}`;
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.facturas || data;
}

/**
 * Obtiene todas las suscripciones
 */
export async function getAllSuscripciones(token?: string | null): Promise<Suscripcion[]> {
  const response = await apiFetch('/admin/billing/suscripciones', {}, token);
  const data = await response.json();
  return data.suscripciones || data;
}

// ==================== CONFIGURACIÓN API ====================

export interface PlatformConfig {
  clave: string;
  categoria: string;
  valor: string;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  descripcion: string | null;
  esSensible: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Obtiene todas las configuraciones agrupadas por categoría
 */
export async function getAllConfig(token?: string | null): Promise<Record<string, PlatformConfig[]>> {
  const response = await apiFetch('/admin/config', {}, token);
  const data = await response.json();
  return data.config || data;
}

/**
 * Obtiene una configuración por su clave
 */
export async function getConfigByKey(clave: string, token?: string | null): Promise<PlatformConfig> {
  const response = await apiFetch(`/admin/config/${clave}`, {}, token);
  return response.json();
}

/**
 * Actualiza una configuración específica
 */
export async function updateConfig(clave: string, valor: string, token?: string | null): Promise<PlatformConfig> {
  const response = await apiFetch(`/admin/config/${clave}`, {
    method: 'PUT',
    body: JSON.stringify({ valor }),
  }, token);
  return response.json();
}

/**
 * Actualiza múltiples configuraciones a la vez
 */
export async function updateMultipleConfig(configs: Record<string, string>, token?: string | null): Promise<PlatformConfig[]> {
  const response = await apiFetch('/admin/config', {
    method: 'PUT',
    body: JSON.stringify({ configs }),
  }, token);
  const data = await response.json();
  return data.configs || [];
}

// ==================== CATÁLOGOS API ====================

export interface Operacion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  activo: boolean;
}

export interface CategoriaPropiedad {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  activo: boolean;
}

/**
 * Obtiene el catálogo de operaciones (venta, renta, etc.)
 * @param soloActivas - Si es true, solo devuelve operaciones activas (default: true)
 * @param token - Token de autenticación opcional
 */
export async function getOperacionesCatalogo(soloActivas: boolean = true, token?: string | null): Promise<Operacion[]> {
  const url = soloActivas ? '/catalogos/operaciones' : '/catalogos/operaciones?soloActivas=false';
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data || [];
}

/**
 * Obtiene el catálogo de categorías de propiedades (casa, apartamento, etc.)
 * @param soloActivas - Si es true, solo devuelve categorías activas (default: true)
 * @param token - Token de autenticación opcional
 */
export async function getCategoriasPropiedadesCatalogo(soloActivas: boolean = true, token?: string | null): Promise<CategoriaPropiedad[]> {
  const url = soloActivas ? '/catalogos/categorias' : '/catalogos/categorias?soloActivas=false';
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data || [];
}

// ==================== MONEDAS API ====================

export interface Moneda {
  codigo: string;
  nombre: string;
  nombreEn?: string;
  simbolo: string;
  tasaUsd: number;
  decimales: number;
  formato: string;
  orden: number;
  activo: boolean;
}

export interface TenantMoneda {
  codigo: string;
  esDefault: boolean;
}

/**
 * Obtiene el catálogo de monedas
 * @param soloActivas - Si es true, solo devuelve monedas activas (default: true)
 * @param token - Token de autenticación opcional
 */
export async function getMonedasCatalogo(soloActivas: boolean = true, token?: string | null): Promise<Moneda[]> {
  const url = soloActivas ? '/catalogos/monedas' : '/catalogos/monedas?soloActivas=false';
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data || [];
}

/**
 * Obtiene las monedas habilitadas para un tenant
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getTenantMonedas(tenantId: string, token?: string | null): Promise<Moneda[]> {
  const response = await apiFetch(`/catalogos/monedas/tenant/${tenantId}`, {}, token);
  const data = await response.json();
  return data || [];
}

/**
 * Configura las monedas habilitadas para un tenant
 * @param tenantId - ID del tenant
 * @param monedas - Array de monedas con su configuración
 * @param token - Token de autenticación opcional
 */
export async function setTenantMonedasHabilitadas(
  tenantId: string,
  monedas: TenantMoneda[],
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await apiFetch(`/catalogos/monedas/tenant/${tenantId}`, {
    method: 'PUT',
    body: JSON.stringify({ monedas }),
  }, token);
  return response.json();
}

// ==================== TIPOS DE PÁGINA Y PLANTILLAS API ====================

export interface ComponentePlantilla {
  codigo: string;
  orden: number;
  configuracion?: Record<string, any>;
}

export interface PlantillaPagina {
  id: string;
  codigo: string;
  tipoPagina: string;
  tipoPaginaNombre?: string;
  nombre: string;
  descripcion: string | null;
  previewImage: string | null;
  categoria: string | null;
  componentes: ComponentePlantilla[];
  configuracionDefault: Record<string, any>;
  estilos: Record<string, any>;
  featureRequerido: string | null;
  visible: boolean;
  featured: boolean;
  esPremium: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
  paginasUsando?: number;
}

export interface TipoPaginaDB {
  codigo: string;
  nombre: string;
  descripcion: string;
  esEstandar: boolean;
  requiereSlug: boolean;
  configuracion: Record<string, any>;
  rutaPatron: string | null;
  rutaPadre: string | null;
  nivel: number;
  fuenteDatos: string | null;
  featureRequerido: string | null;
  esPlantilla: boolean;
  protegida: boolean;
  parametros: any[];
  aliasRutas: Record<string, string>;
  componentesRequeridos: string[];
  visible: boolean;
  featured: boolean;
  publico: boolean;
  ordenCatalogo: number;
  createdAt: string;
  updatedAt: string;
  tenantsUsando?: number;
}

export interface TipoPaginaConPlantillas extends TipoPaginaDB {
  plantillas?: PlantillaPagina[];
}

/**
 * Obtiene todos los tipos de página del sistema
 * @param token - Token de autenticación opcional
 */
export async function getAllTiposPagina(token?: string | null): Promise<TipoPaginaDB[]> {
  const response = await apiFetch('/admin/tipos-pagina', {}, token);
  const data = await response.json();
  return data.tipos || [];
}

/**
 * Obtiene los tipos de página disponibles para un tenant con sus plantillas
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getTiposPaginaParaTenant(tenantId: string, token?: string | null): Promise<TipoPaginaConPlantillas[]> {
  // Por ahora usa el mismo endpoint admin
  const response = await apiFetch('/admin/tipos-pagina', {}, token);
  const data = await response.json();
  return data.tipos || [];
}

/**
 * Obtiene las plantillas disponibles para un tenant y tipo de página específico
 * @param tenantId - ID del tenant
 * @param tipoPagina - Código del tipo de página
 * @param token - Token de autenticación opcional
 */
export async function getPlantillasParaTenant(tenantId: string, tipoPagina: string, token?: string | null): Promise<PlantillaPagina[]> {
  const response = await apiFetch(`/admin/plantillas/tipo/${tipoPagina}`, {}, token);
  const data = await response.json();
  return data.plantillas || [];
}

// ==================== UPLOAD DE IMÁGENES ====================

export interface UploadImageResult {
  url: string;
  key?: string;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
}

/**
 * Sube una imagen para un componente
 * @param tenantId - ID del tenant
 * @param file - Archivo de imagen a subir
 * @param token - Token de autenticación opcional
 */
export async function uploadComponentImage(
  tenantId: string,
  file: File,
  token?: string | null
): Promise<UploadImageResult> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', 'componentes');

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/upload/image`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error al subir imagen: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// ==================== COMPONENTES - SCHEMA ====================

export interface ComponenteSchemaField {
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'color' | 'image' | 'array' | 'select' | 'richtext';
  required?: boolean;
  default?: any;
  options?: { value: string; label: string }[];
  schema?: Record<string, ComponenteSchemaField>;
}

export interface ComponenteSchema {
  campos: {
    nombre: string;
    label: string;
    tipo: string;
    requerido?: boolean;
    default?: any;
    opciones?: { value: string; label: string }[];
    schema?: Record<string, any>;
  }[];
  toggles?: {
    nombre: string;
    label: string;
    default?: boolean;
  }[];
}

export interface CatalogoComponenteConSchema {
  id: string;
  tipo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  categoria?: string;
  schema_config?: ComponenteSchema;
}

/**
 * Obtiene el schema de configuración de un componente por su tipo
 * @param tipo - Tipo del componente
 * @param token - Token de autenticación
 */
export async function getComponenteSchema(tipo: string, token?: string | null): Promise<CatalogoComponenteConSchema | null> {
  try {
    const response = await apiFetch(`/secciones/catalogo/${tipo}`, {}, token);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo schema del componente:', error);
    return null;
  }
}

// ==================== TIPOS DE PÁGINA - ADMIN ====================

// Alias para compatibilidad
export type TipoPagina = TipoPaginaDB;

export interface CreateTipoPaginaData {
  codigo: string;
  nombre: string;
  descripcion?: string;
  rutaPatron?: string | null;
  rutaPadre?: string | null;
  nivel?: number;
  esPlantilla?: boolean;
  visible?: boolean;
  featured?: boolean;
  featureRequerido?: string | null;
  ordenCatalogo?: number;
}

export interface UpdateTipoPaginaData {
  nombre?: string;
  descripcion?: string;
  rutaPatron?: string | null;
  rutaPadre?: string | null;
  nivel?: number;
  esPlantilla?: boolean;
  visible?: boolean;
  featured?: boolean;
  featureRequerido?: string | null;
  ordenCatalogo?: number;
}

/**
 * Crea un nuevo tipo de página
 * @param data - Datos del tipo de página
 * @param token - Token de autenticación
 */
export async function createTipoPagina(data: CreateTipoPaginaData, token?: string | null): Promise<TipoPagina> {
  const response = await apiFetch('/admin/tipos-pagina', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  const result = await response.json();
  return result.tipo || result;
}

/**
 * Actualiza un tipo de página existente
 * @param codigo - Código del tipo de página
 * @param data - Datos a actualizar
 * @param token - Token de autenticación
 */
export async function updateTipoPagina(codigo: string, data: UpdateTipoPaginaData, token?: string | null): Promise<TipoPagina> {
  const response = await apiFetch(`/admin/tipos-pagina/${codigo}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  const result = await response.json();
  return result.tipo || result;
}

// ==================== AMENIDADES ====================

export interface CategoriaAmenidad {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
}

/**
 * Obtiene las categorías de amenidades disponibles (solo los códigos/nombres)
 * @param tenantId - ID del tenant (opcional)
 * @param token - Token de autenticación
 */
export async function getCategoriasAmenidades(tenantId?: string, token?: string | null): Promise<string[]> {
  const url = tenantId
    ? `/tenants/${tenantId}/amenidades/categorias`
    : '/catalogos/amenidades/categorias';
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  // Si el API devuelve objetos, extraer solo los códigos/nombres
  const categorias = data.categorias || data || [];
  if (categorias.length > 0 && typeof categorias[0] === 'object') {
    return categorias.map((c: CategoriaAmenidad) => c.codigo || c.nombre);
  }
  return categorias;
}

/**
 * Obtiene las amenidades agrupadas por categoría
 * @param incluirInactivas - Si incluir amenidades inactivas
 * @param tenantId - ID del tenant para obtener amenidades del tenant
 * @param token - Token de autenticación
 */
export async function getAmenidadesPorCategoria(
  incluirInactivas = false,
  tenantId?: string,
  token?: string | null
): Promise<Record<string, Amenidad[]>> {
  // Obtener amenidades del tenant si se proporciona tenantId
  let amenidades: Amenidad[] = [];

  if (tenantId) {
    let url = `/tenants/${tenantId}/amenidades`;
    if (incluirInactivas) url += '?incluirInactivas=true';
    const response = await apiFetch(url, {}, token);
    const data = await response.json();
    amenidades = data.amenidades || data || [];
  } else {
    // Amenidades del catálogo global
    const response = await apiFetch('/catalogos/amenidades', {}, token);
    const data = await response.json();
    amenidades = data.amenidades || data || [];
  }

  // Agrupar por categoría
  const porCategoria: Record<string, Amenidad[]> = {};
  for (const amenidad of amenidades) {
    const categoria = amenidad.categoria || 'General';
    if (!porCategoria[categoria]) {
      porCategoria[categoria] = [];
    }
    porCategoria[categoria].push(amenidad);
  }

  return porCategoria;
}

// ==================== PLANTILLAS DE PÁGINA ====================

export interface PlantillaPaginaCreate {
  codigo: string;
  tipoPagina: string;
  nombre: string;
  descripcion?: string | null;
  previewImage?: string | null;
  categoria?: string | null;
  componentes?: ComponentePlantilla[];
  configuracionDefault?: Record<string, any>;
  estilos?: Record<string, any>;
  featureRequerido?: string | null;
  visible?: boolean;
  featured?: boolean;
  esPremium?: boolean;
  orden?: number;
}

export interface PlantillaPaginaUpdate {
  nombre?: string;
  descripcion?: string | null;
  previewImage?: string | null;
  categoria?: string | null;
  componentes?: ComponentePlantilla[];
  configuracionDefault?: Record<string, any>;
  estilos?: Record<string, any>;
  featureRequerido?: string | null;
  visible?: boolean;
  featured?: boolean;
  esPremium?: boolean;
  orden?: number;
}

/**
 * Obtiene todas las plantillas de página
 * @param token - Token de autenticación
 */
export async function getAllPlantillas(token?: string | null): Promise<PlantillaPagina[]> {
  const response = await apiFetch('/admin/plantillas', {}, token);
  const data = await response.json();
  return data.plantillas || [];
}

/**
 * Crea una nueva plantilla de página
 * @param data - Datos de la plantilla
 * @param token - Token de autenticación
 */
export async function createPlantilla(data: PlantillaPaginaCreate, token?: string | null): Promise<PlantillaPagina> {
  const response = await apiFetch('/admin/plantillas', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  const result = await response.json();
  return result.plantilla || result;
}

/**
 * Actualiza una plantilla de página
 * @param id - ID de la plantilla
 * @param data - Datos a actualizar
 * @param token - Token de autenticación
 */
export async function updatePlantilla(id: string, data: PlantillaPaginaUpdate, token?: string | null): Promise<PlantillaPagina> {
  const response = await apiFetch(`/admin/plantillas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  const result = await response.json();
  return result.plantilla || result;
}

/**
 * Elimina una plantilla de página
 * @param id - ID de la plantilla
 * @param token - Token de autenticación
 */
export async function deletePlantilla(id: string, token?: string | null): Promise<void> {
  await apiFetch(`/admin/plantillas/${id}`, {
    method: 'DELETE',
  }, token);
}

// ==================== TASAS DE CAMBIO ====================

/**
 * Tipo para las tasas de cambio
 * Mapea código de moneda a su tasa contra USD
 */
export type TasasCambio = Record<string, number>;

/**
 * Obtiene las tasas de cambio actuales para un tenant
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 * @returns Objeto con tasas de cambio (ej: { DOP: 58.5, EUR: 0.92, MXN: 17.2 })
 */
export async function getTasasCambio(tenantId: string, token?: string | null): Promise<TasasCambio> {
  try {
    const response = await apiFetch(`/tenants/${tenantId}/tasas-cambio`, {}, token);
    const data = await response.json();
    return data.tasas || data || {};
  } catch (error) {
    // Devolver tasas por defecto si hay error
    console.warn('Error obteniendo tasas de cambio, usando valores por defecto:', error);
    return {
      DOP: 58.5,
      EUR: 0.92,
      MXN: 17.2,
    };
  }
}

/**
 * Convierte un valor a USD usando las tasas de cambio proporcionadas
 * @param valor - Valor a convertir
 * @param moneda - Código de la moneda origen (ej: 'DOP', 'EUR', 'MXN')
 * @param tasas - Objeto con las tasas de cambio
 * @returns Valor convertido a USD
 */
export function convertirAUSD(valor: number, moneda: string, tasas: TasasCambio): number {
  if (!valor || isNaN(valor)) return 0;

  // Si ya es USD, devolver el valor directamente
  if (moneda === 'USD') return valor;

  // Obtener la tasa de cambio para esta moneda
  const tasa = tasas[moneda];

  // Si no hay tasa, devolver el valor sin convertir
  if (!tasa || tasa === 0) {
    console.warn(`No hay tasa de cambio para ${moneda}, devolviendo valor sin convertir`);
    return valor;
  }

  // Convertir dividiendo por la tasa (ya que las tasas son: 1 USD = X moneda)
  return valor / tasa;
}

// ==================== USUARIOS TENANT ====================

/**
 * Representa un usuario del tenant
 */
export interface UsuarioTenant {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono?: string | null;
  avatarUrl: string | null;
  roles: {
    id: string;
    codigo: string;
    nombre: string;
    color: string | null;
  }[];
  esOwner: boolean;
  activo: boolean;
  visibleEnWeb?: boolean;
}

/**
 * Obtiene los usuarios de un tenant
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getUsuariosTenant(tenantId: string, token?: string | null): Promise<UsuarioTenant[]> {
  const response = await apiFetch(`/tenants/${tenantId}/usuarios`, {}, token);
  const data = await response.json();
  return data.usuarios || data || [];
}

// ==================== ESTADOS DE VENTA ====================

/**
 * Representa un estado de venta
 */
export interface EstadoVenta {
  id: string;
  nombre: string;
  codigo: string;
  color: string | null;
  orden: number;
  esCompletado: boolean;
  esCancelado: boolean;
  activo: boolean;
}

/**
 * Obtiene los estados de venta de un tenant
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getEstadosVenta(tenantId: string, token?: string | null): Promise<EstadoVenta[]> {
  const response = await apiFetch(`/tenants/${tenantId}/estados-venta`, {}, token);
  const data = await response.json();
  return data.estados || data || [];
}

// ==================== VENTAS ====================

/**
 * Representa una venta (deal)
 */
export interface Venta {
  id: string;
  nombre_negocio: string | null;
  descripcion: string | null;
  propiedad_id: string | null;
  unidad_id: string | null;
  contacto_id: string | null;
  usuario_cerrador_id: string | null;
  captador_id: string | null;
  estado_venta_id: string | null;
  valor_cierre: number | string | null;
  moneda: string;
  porcentaje_comision: number | string | null;
  monto_comision: number | string | null;
  fecha_cierre: string | null;
  vendedor_externo_tipo: string | null;
  vendedor_externo_id: string | null;
  vendedor_externo_nombre: string | null;
  vendedor_externo_contacto: string | null;
  referidor_nombre: string | null;
  referidor_id: string | null;
  referidor_contacto_id: string | null;
  notas: string | null;
  solicitud_id: string | null;
  completada: boolean;
  cancelada: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  // Relaciones expandidas (objetos anidados)
  propiedad?: Propiedad | null;
  contacto?: Contacto | null;
  usuario_cerrador?: UsuarioTenant | null;
  estado_venta?: EstadoVenta | null;
  // Campos planos del API (alternativa a objetos anidados)
  propiedad_nombre?: string | null;
  propiedad_imagen?: string | null;
  propiedad_codigo?: string | null;
  contacto_nombre?: string | null;
  contacto_apellido?: string | null;
  contacto_email?: string | null;
  usuario_cerrador_nombre?: string | null;
  usuario_cerrador_apellido?: string | null;
  usuario_cerrador_email?: string | null;
  estado_nombre?: string | null;
  estado_color?: string | null;
  numero_venta?: number | string | null;
  es_propiedad_externa?: boolean;
  nombre_propiedad_externa?: string | null;
  codigo_propiedad_externa?: string | null;
  fecha_cancelacion?: string | null;
}

/**
 * Filtros para buscar ventas
 */
export interface VentaFiltros {
  estadoVentaId?: string;
  usuarioId?: string;
  usuarioIds?: string[];
  soloMisVentas?: boolean;
  soloParticipadas?: boolean;
  tipoOperacion?: string;
  ciudad?: string;
  sector?: string;
  categoria?: string;
  esPropiedadExterna?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
  limit?: number;
  offset?: number;
}

/**
 * Obtiene las ventas de un tenant
 * @param tenantId - ID del tenant
 * @param filtros - Filtros opcionales
 * @param token - Token de autenticación opcional
 */
export async function getVentas(tenantId: string, filtros?: VentaFiltros, token?: string | null): Promise<Venta[]> {
  const params = new URLSearchParams();

  if (filtros) {
    if (filtros.estadoVentaId) params.append('estadoVentaId', filtros.estadoVentaId);
    if (filtros.usuarioId) params.append('usuarioId', filtros.usuarioId);
    if (filtros.usuarioIds?.length) params.append('usuarioIds', filtros.usuarioIds.join(','));
    if (filtros.soloMisVentas) params.append('soloMisVentas', 'true');
    if (filtros.soloParticipadas) params.append('soloParticipadas', 'true');
    if (filtros.tipoOperacion) params.append('tipoOperacion', filtros.tipoOperacion);
    if (filtros.ciudad) params.append('ciudad', filtros.ciudad);
    if (filtros.sector) params.append('sector', filtros.sector);
    if (filtros.categoria) params.append('categoria', filtros.categoria);
    if (filtros.esPropiedadExterna !== undefined) params.append('esPropiedadExterna', String(filtros.esPropiedadExterna));
    if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
    if (filtros.limit) params.append('limit', String(filtros.limit));
    if (filtros.offset) params.append('offset', String(filtros.offset));
  }

  const queryString = params.toString();
  const url = `/tenants/${tenantId}/ventas${queryString ? `?${queryString}` : ''}`;
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  // La API devuelve { data: [], pagination: {} }
  return data.data || data.ventas || (Array.isArray(data) ? data : []);
}

/**
 * Crea una nueva venta
 * @param tenantId - ID del tenant
 * @param venta - Datos de la venta
 * @param token - Token de autenticación opcional
 */
export async function createVenta(tenantId: string, venta: Partial<Venta>, token?: string | null): Promise<Venta> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas`, {
    method: 'POST',
    body: JSON.stringify(venta),
  }, token);
  const data = await response.json();
  return data.venta || data;
}

/**
 * Actualiza una venta existente
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param venta - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateVenta(tenantId: string, ventaId: string, venta: Partial<Venta>, token?: string | null): Promise<Venta> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}`, {
    method: 'PUT',
    body: JSON.stringify(venta),
  }, token);
  const data = await response.json();
  return data.venta || data;
}

/**
 * Elimina una venta
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param token - Token de autenticación opcional
 */
export async function deleteVenta(tenantId: string, ventaId: string, token?: string | null): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}`, {
    method: 'DELETE',
  }, token);
}

/**
 * Cancela (anula) una venta
 * Solo admin o creador puede cancelar
 * No se puede cancelar si tiene cobros registrados
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param razonCancelacion - Motivo de la cancelación
 * @param token - Token de autenticación opcional
 */
export async function cancelarVenta(
  tenantId: string,
  ventaId: string,
  razonCancelacion: string,
  token?: string | null
): Promise<Venta & { comisiones_anuladas: number }> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ razon_cancelacion: razonCancelacion }),
  }, token);
  return response.json();
}

// ==================== COMISIONES ====================

/**
 * Representa una comisión
 */
export interface Comision {
  id: string;
  venta_id: string;
  usuario_id: string;
  tipo: string;
  porcentaje: number | null;
  monto: number | null;
  moneda: string;
  estado: string;
  monto_pagado: number | null;
  fecha_pago: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // Campos de distribución
  tipo_participante?: string | null;
  split_porcentaje_vendedor?: number | null;
  split_porcentaje_owner?: number | null;
  datos_extra?: Record<string, any> | null;
  monto_habilitado?: number | null;
  escenario?: string | null;
  es_override?: boolean | null;
  snapshot_distribucion?: Record<string, any> | null;
  // Campos adicionales de participantes externos
  contacto_externo_id?: string | null;
  nombre_display?: string | null;  // Nombre calculado por el backend
  tenant_nombre?: string | null;
  // Relaciones
  usuario?: UsuarioTenant | null;
  venta?: Venta | null;
  contacto?: {
    id: string;
    nombre: string;
    apellido?: string;
  } | null;
}

/**
 * Obtiene las comisiones de una venta
 * @param tenantId - ID del tenant
 * @param filtrosOrVentaId - ID de la venta (string) o filtros con ventaId ({ ventaId: string })
 * @param token - Token de autenticación opcional
 */
export async function getComisiones(
  tenantId: string,
  filtrosOrVentaId: string | { ventaId: string },
  token?: string | null
): Promise<Comision[]> {
  const ventaId = typeof filtrosOrVentaId === 'string' ? filtrosOrVentaId : filtrosOrVentaId.ventaId;
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}/comisiones`, {}, token);
  const data = await response.json();
  return data.comisiones || data || [];
}

/**
 * Crea una nueva comisión
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param comision - Datos de la comisión
 * @param token - Token de autenticación opcional
 */
export async function createComision(tenantId: string, ventaId: string, comision: Partial<Comision>, token?: string | null): Promise<Comision> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}/comisiones`, {
    method: 'POST',
    body: JSON.stringify(comision),
  }, token);
  const data = await response.json();
  return data.comision || data;
}

/**
 * Actualiza una comisión existente
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param comisionId - ID de la comisión
 * @param comision - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateComision(
  tenantId: string,
  ventaId: string,
  comisionId: string,
  comision: Partial<Comision>,
  token?: string | null
): Promise<Comision> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}/comisiones/${comisionId}`, {
    method: 'PUT',
    body: JSON.stringify(comision),
  }, token);
  const data = await response.json();
  return data.comision || data;
}

/**
 * Obtiene una venta específica por ID
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param token - Token de autenticación opcional
 */
export async function getVenta(tenantId: string, ventaId: string, token?: string | null): Promise<Venta> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}`, {}, token);
  const data = await response.json();
  return data.venta || data;
}

/**
 * Recalcula las comisiones de una venta
 * Elimina las comisiones existentes y crea nuevas basadas en los participantes actuales
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param token - Token de autenticación opcional
 */
export async function recalcularComisionesVenta(
  tenantId: string,
  ventaId: string,
  token?: string | null
): Promise<{ success: boolean; message: string; comisiones: any[] }> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}/recalcular-comisiones`, {
    method: 'POST',
  }, token);
  return response.json();
}

// ==================== COMISIONES AGREGADAS (NUEVO ENDPOINT OPTIMIZADO) ====================

/**
 * Filtros para obtener comisiones agregadas
 */
export interface ComisionesFiltros {
  usuario_id?: string;
  rol?: 'vendedor' | 'captador' | 'referidor' | 'owner' | 'vendedor_externo';
  estado?: 'pendiente' | 'parcial' | 'pagado';
  fecha_inicio?: string;
  fecha_fin?: string;
  include_empresa?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Comisión con datos completos de venta y usuario
 */
export interface ComisionCompleta {
  id: string;
  venta_id: string;
  usuario_id: string | null;
  contacto_externo_id: string | null;
  // Montos
  monto: number;
  monto_pagado: number;
  monto_habilitado: number;
  pendiente: number;
  moneda: string;
  porcentaje: number;
  estado: string;
  // Rol y tipo
  rol: string;
  porcentaje_split: number;
  es_empresa: boolean;
  es_externo: boolean;
  nombre_display: string;
  // Datos de venta
  venta: {
    id: string;
    nombre: string;
    valor: number;
    estado: string;
    fecha: string;
    moneda: string;
    monto_comision: number;
    monto_cobrado: number;
    porcentaje_cobrado: number;
    estado_cobro: string;
  };
  // Datos de usuario
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    avatar: string | null;
  } | null;
  // Fechas
  created_at: string;
  fecha_pago: string | null;
}

/**
 * Respuesta del endpoint de comisiones
 */
export interface ComisionesResponse {
  comisiones: ComisionCompleta[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Resumen de comisiones
 */
export interface ComisionesResumen {
  montos: {
    total_proyectado: number;
    total_cobrado: number; // Total cobrado del cliente
    total_habilitado: number;
    total_pagado: number;
    pendiente_cobro: number;
    por_cobrar_futuro: number;
  };
  estados: {
    total: number;
    pagadas: number;
    parciales: number;
    pendientes: number;
  };
  roles: {
    vendedor: number;
    captador: number;
    referidor: number;
    empresa: number;
    externo: number;
  };
}

/**
 * Obtiene todas las comisiones del tenant con filtros opcionales
 * Endpoint optimizado que trae datos de venta y usuario en una sola query
 * @param tenantId - ID del tenant
 * @param filtros - Filtros opcionales
 * @param token - Token de autenticación opcional
 */
export async function getComisionesAgregadas(
  tenantId: string,
  filtros: ComisionesFiltros = {},
  token?: string | null
): Promise<ComisionesResponse> {
  const params = new URLSearchParams();

  if (filtros.usuario_id) params.append('usuario_id', filtros.usuario_id);
  if (filtros.rol) params.append('rol', filtros.rol);
  if (filtros.estado) params.append('estado', filtros.estado);
  if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
  if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
  if (filtros.include_empresa !== undefined) params.append('include_empresa', String(filtros.include_empresa));
  if (filtros.limit) params.append('limit', String(filtros.limit));
  if (filtros.offset) params.append('offset', String(filtros.offset));

  const queryString = params.toString();
  const url = `/tenants/${tenantId}/comisiones${queryString ? `?${queryString}` : ''}`;

  const response = await apiFetch(url, {}, token);
  return response.json();
}

/**
 * Obtiene el resumen de comisiones (totales agregados)
 * @param tenantId - ID del tenant
 * @param filtros - Filtros opcionales (mismo que getComisionesAgregadas)
 * @param token - Token de autenticación opcional
 */
export async function getComisionesResumen(
  tenantId: string,
  filtros: Omit<ComisionesFiltros, 'limit' | 'offset'> = {},
  token?: string | null
): Promise<ComisionesResumen> {
  const params = new URLSearchParams();

  if (filtros.usuario_id) params.append('usuario_id', filtros.usuario_id);
  if (filtros.rol) params.append('rol', filtros.rol);
  if (filtros.estado) params.append('estado', filtros.estado);
  if (filtros.include_empresa !== undefined) params.append('include_empresa', String(filtros.include_empresa));

  const queryString = params.toString();
  const url = `/tenants/${tenantId}/comisiones/resumen${queryString ? `?${queryString}` : ''}`;

  const response = await apiFetch(url, {}, token);
  return response.json();
}

/**
 * Obtiene las comisiones del usuario actual
 * @param tenantId - ID del tenant
 * @param usuarioId - ID del usuario
 * @param token - Token de autenticación opcional
 */
export async function getMisComisiones(
  tenantId: string,
  usuarioId: string,
  token?: string | null
): Promise<{
  comisiones: ComisionCompleta[];
  resumen_por_rol: Record<string, { cantidad: number; monto: number; pagado: number }>;
  totales: { proyectado: number; pagado: number; pendiente: number };
}> {
  const response = await apiFetch(`/tenants/${tenantId}/comisiones/mis-comisiones?mi_usuario_id=${usuarioId}`, {}, token);
  return response.json();
}

// ==================== PAGOS DE COMISIONES ====================

/**
 * Representa un pago de comisión
 */
export interface PagoComision {
  id: string;
  tenant_id?: string;
  comision_id: string;
  venta_id: string;
  monto: number;
  moneda: string;
  tipo_pago?: string | null;
  tipo_movimiento?: 'cobro' | 'pago' | null; // cobro = entrada, pago = salida a participante
  fecha_pago: string | null;
  metodo_pago: string | null;
  referencia: string | null;
  notas: string | null;
  recibo_url?: string | null;
  registrado_por_id?: string | null;
  distribucion?: Record<string, any> | null;
  fecha_registro?: string;
  participante_nombre?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene los pagos de una venta
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param token - Token de autenticación opcional
 */
export async function getPagosByVenta(tenantId: string, ventaId: string, token?: string | null): Promise<PagoComision[]> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}/pagos`, {}, token);
  const data = await response.json();
  return data.pagos || data || [];
}

/**
 * Crea un nuevo pago de comisión
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param pago - Datos del pago
 * @param token - Token de autenticación opcional
 */
export async function createPagoComision(
  tenantId: string,
  ventaId: string,
  pago: Partial<PagoComision>,
  token?: string | null
): Promise<PagoComision> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}/pagos`, {
    method: 'POST',
    body: JSON.stringify(pago),
  }, token);
  const data = await response.json();
  return data.pago || data;
}

// ==================== EXPEDIENTE DE VENTAS ====================

/**
 * Representa un requerimiento de expediente (configuración del tenant)
 */
export interface RequerimientoExpedienteConfig {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  categoria: 'cierre_venta' | 'cierre_alquiler' | 'cierre_renta';
  tipo: string | null;
  requiere_documento: boolean;
  es_obligatorio: boolean;
  orden_visualizacion: number;
  tipos_archivo_permitidos: string[];
  tamaño_maximo_archivo: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Representa un requerimiento de expediente (legacy - para compatibilidad)
 */
export interface RequerimientoExpediente {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo_archivo: string;
  obligatorio: boolean;
  orden: number;
  tipo_operacion: string | null;
  activo: boolean;
}

/**
 * Obtiene todos los requerimientos de expediente del tenant
 * @param tenantId - ID del tenant
 * @param categoria - Filtrar por categoría (opcional)
 */
export async function getRequerimientosExpedienteTenant(
  tenantId: string,
  categoria?: 'cierre_venta' | 'cierre_alquiler' | 'cierre_renta'
): Promise<RequerimientoExpedienteConfig[]> {
  const params = categoria ? `?categoria=${categoria}` : '';
  const response = await apiFetch(`/tenants/${tenantId}/expediente-requerimientos${params}`);
  return response.json();
}

/**
 * Representa un item de expediente subido
 */
export interface ItemExpediente {
  id: string;
  venta_id: string;
  requerimiento_id: string;
  archivo_url: string | null;
  archivo_nombre: string | null;
  archivo_tipo: string | null;
  archivo_size: number | null;
  estado: string;
  notas: string | null;
  fecha_subida: string | null;
  subido_por_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene los requerimientos de expediente para una venta
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param token - Token de autenticación opcional
 */
export async function getRequerimientosExpediente(
  tenantId: string,
  ventaId: string,
  token?: string | null
): Promise<RequerimientoExpediente[]> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}/expediente/requerimientos`, {}, token);
  const data = await response.json();
  return data.requerimientos || data || [];
}

/**
 * Obtiene los items de expediente subidos para una venta
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param token - Token de autenticación opcional
 */
export async function getItemsExpediente(
  tenantId: string,
  ventaId: string,
  token?: string | null
): Promise<ItemExpediente[]> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}/expediente/items`, {}, token);
  const data = await response.json();
  return data.items || data || [];
}

/**
 * Crea o actualiza un item de expediente
 * @param tenantId - ID del tenant
 * @param ventaId - ID de la venta
 * @param item - Datos del item
 * @param token - Token de autenticación opcional
 */
export async function upsertItemExpediente(
  tenantId: string,
  ventaId: string,
  item: Partial<ItemExpediente>,
  token?: string | null
): Promise<ItemExpediente> {
  const response = await apiFetch(`/tenants/${tenantId}/ventas/${ventaId}/expediente/items`, {
    method: 'POST',
    body: JSON.stringify(item),
  }, token);
  const data = await response.json();
  return data.item || data;
}

// ==================== CONTENIDO - CATEGORÍAS ====================

/**
 * Representa una categoría de contenido
 */
export interface CategoriaContenido {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  tipo: string;
  color: string | null;
  icono: string | null;
  orden: number;
  activo: boolean;
  traducciones?: Record<string, { nombre?: string; descripcion?: string }>;
  slug_traducciones?: Record<string, string>;
}

/**
 * Obtiene las categorías de contenido de un tenant
 * @param tenantId - ID del tenant
 * @param tipo - Tipo de contenido (articulo, testimonio, faq, video)
 * @param token - Token de autenticación opcional
 */
export async function getCategoriasContenido(
  tenantId: string,
  tipo?: string,
  token?: string | null
): Promise<CategoriaContenido[]> {
  const params = tipo ? `?tipo=${tipo}` : '';
  const response = await apiFetch(`/tenants/${tenantId}/contenido/categorias${params}`, {}, token);
  const data = await response.json();
  return data.categorias || data || [];
}

// ==================== CONTENIDO - TAGS GLOBALES ====================

/**
 * Representa un tag global
 */
export interface TagGlobal {
  id: string;
  nombre: string;
  slug: string;
  color: string | null;
  activo: boolean;
}

/**
 * Obtiene los tags globales de un tenant
 * @param tenantId - ID del tenant
 * @param filtros - Filtros opcionales (activo, etc.)
 * @param token - Token de autenticación opcional
 */
export async function getTagsGlobales(
  tenantId: string,
  filtros?: { activo?: boolean } | null,
  token?: string | null
): Promise<TagGlobal[]> {
  let url = `/tenants/${tenantId}/contenido/tags`;
  if (filtros) {
    const params = new URLSearchParams();
    if (filtros.activo !== undefined) params.append('activo', String(filtros.activo));
    if (params.toString()) url += `?${params.toString()}`;
  }
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.tags || data || [];
}

/**
 * Obtiene los tags asociados a un contenido
 * @param tenantId - ID del tenant
 * @param tipoContenido - Tipo de contenido (articulo, video, etc.)
 * @param contenidoId - ID del contenido
 * @param token - Token de autenticación opcional
 */
export async function getTagsDeContenido(
  tenantId: string,
  tipoContenido: string,
  contenidoId: string,
  token?: string | null
): Promise<TagGlobal[]> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/${tipoContenido}/${contenidoId}/tags`, {}, token);
  const data = await response.json();
  return data.tags || data || [];
}

// ==================== CONTENIDO - TESTIMONIOS ====================

/**
 * Representa un testimonio
 */
export interface Testimonio {
  id: string;
  tenant_id: string;
  nombre_cliente: string;
  cargo: string | null;
  empresa: string | null;
  contenido: string;
  foto_url: string | null;
  calificacion: number | null;
  contacto_id: string | null;
  propiedad_id: string | null;
  usuario_id: string | null;
  destacado: boolean;
  activo: boolean;
  slug: string;
  idioma: string;
  traducciones: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene un testimonio por ID
 * @param tenantId - ID del tenant
 * @param testimonioId - ID del testimonio
 * @param token - Token de autenticación opcional
 */
export async function getTestimonio(
  tenantId: string,
  testimonioId: string,
  token?: string | null
): Promise<Testimonio> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/testimonios/${testimonioId}`, {}, token);
  const data = await response.json();
  return data.testimonio || data;
}

/**
 * Crea un nuevo testimonio
 * @param tenantId - ID del tenant
 * @param testimonio - Datos del testimonio
 * @param token - Token de autenticación opcional
 */
export async function createTestimonio(
  tenantId: string,
  testimonio: Partial<Testimonio>,
  token?: string | null
): Promise<Testimonio> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/testimonios`, {
    method: 'POST',
    body: JSON.stringify(testimonio),
  }, token);
  const data = await response.json();
  return data.testimonio || data;
}

/**
 * Actualiza un testimonio existente
 * @param tenantId - ID del tenant
 * @param testimonioId - ID del testimonio
 * @param testimonio - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateTestimonio(
  tenantId: string,
  testimonioId: string,
  testimonio: Partial<Testimonio>,
  token?: string | null
): Promise<Testimonio> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/testimonios/${testimonioId}`, {
    method: 'PUT',
    body: JSON.stringify(testimonio),
  }, token);
  const data = await response.json();
  return data.testimonio || data;
}

// ==================== CONTENIDO - ARTÍCULOS ====================

/**
 * Representa un artículo
 */
export interface Articulo {
  id: string;
  tenant_id: string;
  titulo: string;
  slug: string;
  extracto: string | null;
  contenido: string | null;
  imagen_portada: string | null;
  categoria_id: string | null;
  autor_id: string | null;
  fecha_publicacion: string | null;
  publicado: boolean;
  destacado: boolean;
  idioma: string;
  traducciones: Record<string, any>;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  categoria?: CategoriaContenido | null;
  autor?: UsuarioTenant | null;
  tags?: TagGlobal[];
  // Campos camelCase adicionales usados por el componente
  categoriaId?: string | null;
  imagenPrincipal?: string | null;
  imagenes?: string[];
  metaTitulo?: string | null;
  metaDescripcion?: string | null;
  fechaPublicacion?: string | null;
}

/**
 * Obtiene un artículo por ID
 * @param tenantId - ID del tenant
 * @param articuloId - ID del artículo
 * @param token - Token de autenticación opcional
 */
export async function getArticulo(
  tenantId: string,
  articuloId: string,
  token?: string | null
): Promise<Articulo> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/articulos/${articuloId}`, {}, token);
  const data = await response.json();
  return data.articulo || data;
}

/**
 * Crea un nuevo artículo
 * @param tenantId - ID del tenant
 * @param articulo - Datos del artículo
 * @param token - Token de autenticación opcional
 */
export async function createArticulo(
  tenantId: string,
  articulo: Partial<Articulo>,
  token?: string | null
): Promise<Articulo> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/articulos`, {
    method: 'POST',
    body: JSON.stringify(articulo),
  }, token);
  const data = await response.json();
  return data.articulo || data;
}

/**
 * Actualiza un artículo existente
 * @param tenantId - ID del tenant
 * @param articuloId - ID del artículo
 * @param articulo - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateArticulo(
  tenantId: string,
  articuloId: string,
  articulo: Partial<Articulo>,
  token?: string | null
): Promise<Articulo> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/articulos/${articuloId}`, {
    method: 'PUT',
    body: JSON.stringify(articulo),
  }, token);
  const data = await response.json();
  return data.articulo || data;
}

// ==================== CONTENIDO - UPLOAD DE IMÁGENES ====================

/**
 * Sube una imagen para contenido
 * @param tenantId - ID del tenant
 * @param file - Archivo de imagen
 * @param folder - Carpeta de destino
 * @param token - Token de autenticación opcional
 */
export async function uploadContenidoImage(
  tenantId: string,
  file: File,
  folder: string = 'contenido',
  token?: string | null
): Promise<{ url: string; key?: string }> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/upload/image`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error al subir imagen: ${response.status}`);
  }

  return response.json();
}

/**
 * Crea una nueva categoría de contenido
 * @param tenantId - ID del tenant
 * @param categoria - Datos de la categoría
 * @param token - Token de autenticación opcional
 */
export async function createCategoriaContenido(
  tenantId: string,
  categoria: Partial<CategoriaContenido>,
  token?: string | null
): Promise<CategoriaContenido> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/categorias`, {
    method: 'POST',
    body: JSON.stringify(categoria),
  }, token);
  const data = await response.json();
  return data.categoria || data;
}

/**
 * Actualiza una categoría de contenido
 * @param tenantId - ID del tenant
 * @param categoriaId - ID de la categoría
 * @param categoria - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateCategoriaContenido(
  tenantId: string,
  categoriaId: string,
  categoria: Partial<CategoriaContenido>,
  token?: string | null
): Promise<CategoriaContenido> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/categorias/${categoriaId}`, {
    method: 'PUT',
    body: JSON.stringify(categoria),
  }, token);
  const data = await response.json();
  return data.categoria || data;
}

/**
 * Elimina una categoría de contenido
 * @param tenantId - ID del tenant
 * @param categoriaId - ID de la categoría
 * @param token - Token de autenticación opcional
 */
export async function deleteCategoriaContenido(
  tenantId: string,
  categoriaId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/contenido/categorias/${categoriaId}`, {
    method: 'DELETE',
  }, token);
}

// ==================== CONTENIDO - LISTAS ====================

/**
 * Obtiene la lista de artículos
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getArticulos(tenantId: string, token?: string | null): Promise<Articulo[]> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/articulos`, {}, token);
  const data = await response.json();
  return data.articulos || data || [];
}

/**
 * Elimina un artículo
 * @param tenantId - ID del tenant
 * @param articuloId - ID del artículo
 * @param token - Token de autenticación opcional
 */
export async function deleteArticulo(tenantId: string, articuloId: string, token?: string | null): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/contenido/articulos/${articuloId}`, {
    method: 'DELETE',
  }, token);
}

/**
 * Obtiene la lista de testimonios
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getTestimonios(tenantId: string, token?: string | null): Promise<Testimonio[]> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/testimonios`, {}, token);
  const data = await response.json();
  return data.testimonios || data || [];
}

/**
 * Elimina un testimonio
 * @param tenantId - ID del tenant
 * @param testimonioId - ID del testimonio
 * @param token - Token de autenticación opcional
 */
export async function deleteTestimonio(tenantId: string, testimonioId: string, token?: string | null): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/contenido/testimonios/${testimonioId}`, {
    method: 'DELETE',
  }, token);
}

// ==================== CONTENIDO - VIDEOS ====================

/**
 * Representa un video
 */
export interface Video {
  id: string;
  tenant_id: string;
  titulo: string;
  slug: string;
  descripcion: string | null;
  url_video: string | null;
  plataforma: string | null;
  video_id: string | null;
  thumbnail_url: string | null;
  duracion: number | null;
  categoria_id: string | null;
  publicado: boolean;
  destacado: boolean;
  idioma: string;
  traducciones: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene la lista de videos
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getVideos(tenantId: string, token?: string | null): Promise<Video[]> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/videos`, {}, token);
  const data = await response.json();
  return data.videos || data || [];
}

/**
 * Obtiene un video por ID
 * @param tenantId - ID del tenant
 * @param videoId - ID del video
 * @param token - Token de autenticación opcional
 */
export async function getVideo(tenantId: string, videoId: string, token?: string | null): Promise<Video> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/videos/${videoId}`, {}, token);
  const data = await response.json();
  return data.video || data;
}

/**
 * Crea un nuevo video
 * @param tenantId - ID del tenant
 * @param video - Datos del video
 * @param token - Token de autenticación opcional
 */
export async function createVideo(tenantId: string, video: Partial<Video>, token?: string | null): Promise<Video> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/videos`, {
    method: 'POST',
    body: JSON.stringify(video),
  }, token);
  const data = await response.json();
  return data.video || data;
}

/**
 * Actualiza un video
 * @param tenantId - ID del tenant
 * @param videoId - ID del video
 * @param video - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateVideo(tenantId: string, videoId: string, video: Partial<Video>, token?: string | null): Promise<Video> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/videos/${videoId}`, {
    method: 'PUT',
    body: JSON.stringify(video),
  }, token);
  const data = await response.json();
  return data.video || data;
}

/**
 * Elimina un video
 * @param tenantId - ID del tenant
 * @param videoId - ID del video
 * @param token - Token de autenticación opcional
 */
export async function deleteVideo(tenantId: string, videoId: string, token?: string | null): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/contenido/videos/${videoId}`, {
    method: 'DELETE',
  }, token);
}

// ==================== CONTENIDO - FAQs ====================

/**
 * Representa un FAQ
 */
export interface FAQ {
  id: string;
  tenant_id: string;
  pregunta: string;
  respuesta: string;
  slug: string;
  categoria_id: string | null;
  orden: number;
  publicado: boolean;
  destacado: boolean;
  idioma: string;
  traducciones: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene la lista de FAQs
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getFaqs(tenantId: string, token?: string | null): Promise<FAQ[]> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/faqs`, {}, token);
  const data = await response.json();
  return data.faqs || data || [];
}

/**
 * Obtiene un FAQ por ID
 * @param tenantId - ID del tenant
 * @param faqId - ID del FAQ
 * @param token - Token de autenticación opcional
 */
export async function getFaq(tenantId: string, faqId: string, token?: string | null): Promise<FAQ> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/faqs/${faqId}`, {}, token);
  const data = await response.json();
  return data.faq || data;
}

/**
 * Crea un nuevo FAQ
 * @param tenantId - ID del tenant
 * @param faq - Datos del FAQ
 * @param token - Token de autenticación opcional
 */
export async function createFaq(tenantId: string, faq: Partial<FAQ>, token?: string | null): Promise<FAQ> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/faqs`, {
    method: 'POST',
    body: JSON.stringify(faq),
  }, token);
  const data = await response.json();
  return data.faq || data;
}

/**
 * Actualiza un FAQ
 * @param tenantId - ID del tenant
 * @param faqId - ID del FAQ
 * @param faq - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateFaq(tenantId: string, faqId: string, faq: Partial<FAQ>, token?: string | null): Promise<FAQ> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/faqs/${faqId}`, {
    method: 'PUT',
    body: JSON.stringify(faq),
  }, token);
  const data = await response.json();
  return data.faq || data;
}

/**
 * Elimina un FAQ
 * @param tenantId - ID del tenant
 * @param faqId - ID del FAQ
 * @param token - Token de autenticación opcional
 */
export async function deleteFaq(tenantId: string, faqId: string, token?: string | null): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/contenido/faqs/${faqId}`, {
    method: 'DELETE',
  }, token);
}

// ==================== CONTENIDO - SEO STATS ====================

/**
 * Representa un SEO Stat
 */
export interface SeoStat {
  id: string;
  tenant_id: string;
  titulo: string;
  valor: string;
  descripcion: string | null;
  icono: string | null;
  orden: number;
  publicado: boolean;
  idioma: string;
  traducciones: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene la lista de SEO Stats
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getSeoStats(tenantId: string, token?: string | null): Promise<SeoStat[]> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/seo-stats`, {}, token);
  const data = await response.json();
  return data.stats || data || [];
}

/**
 * Obtiene un SEO Stat por ID
 * @param tenantId - ID del tenant
 * @param statId - ID del stat
 * @param token - Token de autenticación opcional
 */
export async function getSeoStat(tenantId: string, statId: string, token?: string | null): Promise<SeoStat> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/seo-stats/${statId}`, {}, token);
  const data = await response.json();
  return data.stat || data;
}

/**
 * Crea un nuevo SEO Stat
 * @param tenantId - ID del tenant
 * @param stat - Datos del stat
 * @param token - Token de autenticación opcional
 */
export async function createSeoStat(tenantId: string, stat: Partial<SeoStat>, token?: string | null): Promise<SeoStat> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/seo-stats`, {
    method: 'POST',
    body: JSON.stringify(stat),
  }, token);
  const data = await response.json();
  return data.stat || data;
}

/**
 * Actualiza un SEO Stat
 * @param tenantId - ID del tenant
 * @param statId - ID del stat
 * @param stat - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateSeoStat(tenantId: string, statId: string, stat: Partial<SeoStat>, token?: string | null): Promise<SeoStat> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/seo-stats/${statId}`, {
    method: 'PUT',
    body: JSON.stringify(stat),
  }, token);
  const data = await response.json();
  return data.stat || data;
}

/**
 * Elimina un SEO Stat
 * @param tenantId - ID del tenant
 * @param statId - ID del stat
 * @param token - Token de autenticación opcional
 */
export async function deleteSeoStat(tenantId: string, statId: string, token?: string | null): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/contenido/seo-stats/${statId}`, {
    method: 'DELETE',
  }, token);
}

// ==================== CATÁLOGOS Y UBICACIONES ====================

/**
 * Representa un item de catálogo
 */
export interface CatalogoItem {
  id: string;
  tipo: string;
  codigo: string;
  nombre: string;
  nombre_plural?: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  orden: number;
  activo: boolean;
  origen: 'global' | 'tenant';
}

/**
 * Representa una ubicación geográfica
 */
export interface Ubicacion {
  id: string;
  nombre: string;
  slug: string;
  tipo: 'pais' | 'provincia' | 'ciudad' | 'sector';
  parent_id?: string;
  activo: boolean;
  destacado: boolean;
  nivel: number;
  path_completo?: string;
}

/**
 * Obtiene los items de un tipo de catálogo para el tenant
 * @param tenantId - ID del tenant
 * @param tipo - Tipo de catálogo (ej: 'tipos_propiedad', 'operaciones')
 * @param token - Token de autenticación opcional
 */
export async function getCatalogoTenant(tenantId: string, tipo: string, token?: string | null): Promise<CatalogoItem[]> {
  const response = await apiFetch(`/tenants/${tenantId}/catalogos/${tipo}`, {}, token);
  const data = await response.json();
  return data.items || data || [];
}

/**
 * Obtiene las ubicaciones disponibles
 * @param filtros - Filtros opcionales (tipo, parent_id, activo, search)
 * @param token - Token de autenticación opcional
 */
export async function getUbicaciones(filtros?: { tipo?: string; parent_id?: string; activo?: boolean; search?: string }, token?: string | null): Promise<Ubicacion[]> {
  let url = '/ubicaciones';
  if (filtros) {
    const params: string[] = [];
    if (filtros.tipo) params.push(`tipo=${filtros.tipo}`);
    if (filtros.parent_id) params.push(`parent_id=${filtros.parent_id}`);
    if (filtros.activo !== undefined) params.push(`activo=${filtros.activo}`);
    if (filtros.search) params.push(`search=${encodeURIComponent(filtros.search)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
  }
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.ubicaciones || data || [];
}

/**
 * Obtiene el árbol de ubicaciones
 * @param opciones - Opciones (maxNivel, soloDestacados, soloMenu)
 * @param token - Token de autenticación opcional
 */
export async function getArbolUbicaciones(opciones?: { maxNivel?: number; soloDestacados?: boolean; soloMenu?: boolean }, token?: string | null): Promise<Ubicacion[]> {
  let url = '/ubicaciones/arbol';
  if (opciones) {
    const params: string[] = [];
    if (opciones.maxNivel) params.push(`maxNivel=${opciones.maxNivel}`);
    if (opciones.soloDestacados) params.push(`soloDestacados=true`);
    if (opciones.soloMenu) params.push(`soloMenu=true`);
    if (params.length > 0) url += `?${params.join('&')}`;
  }
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.arbol || data || [];
}

// ==================== CONTENIDO - RELACIONES ====================

/**
 * Representa una relación entre contenidos
 * Nota: La API devuelve snake_case, pero aquí usamos camelCase para el frontend
 */
export interface ContenidoRelacion {
  id: string;
  tenantId: string;
  tipoOrigen: string;
  idOrigen: string;
  tipoDestino: string;
  idDestino: string;
  descripcion?: string;
  orden: number;
  activa: boolean;
  createdAt: string;
  updatedAt?: string;
  direccion?: 'origen' | 'destino'; // Indica si el contenido consultado es origen o destino en esta relación
  nombreOrigen?: string; // Título/nombre del contenido origen (desde el backend)
  nombreDestino?: string; // Título/nombre del contenido destino (desde el backend)
}

/**
 * Obtiene las relaciones de contenido
 * @param tenantId - ID del tenant
 * @param contenidoTipo - Tipo de contenido
 * @param contenidoId - ID del contenido
 * @param token - Token de autenticación opcional
 */
export async function getRelacionesContenido(
  tenantId: string,
  filtros?: {
    tipo?: string;
    tipoOrigen?: string;
    idOrigen?: string;
    tipoDestino?: string;
    idDestino?: string;
    bidireccional?: boolean; // Si es true, busca donde el contenido sea origen O destino
    contenidoId?: string;    // ID del contenido para búsqueda bidireccional
    contenidoTipo?: string;  // Tipo del contenido para búsqueda bidireccional
  } | string,
  contenidoId?: string,
  token?: string | null
): Promise<ContenidoRelacion[]> {
  let url = `/tenants/${tenantId}/contenido/relaciones`;
  const params: string[] = [];

  // Soportar tanto el formato antiguo (string) como el nuevo (objeto)
  if (typeof filtros === 'string') {
    // Formato antiguo: tipo como string
    params.push(`tipo=${filtros}`);
    if (contenidoId) params.push(`id_origen=${contenidoId}`);
  } else if (filtros && typeof filtros === 'object') {
    // Modo bidireccional
    if (filtros.bidireccional && filtros.contenidoId && filtros.contenidoTipo) {
      params.push('bidireccional=true');
      params.push(`contenido_id=${filtros.contenidoId}`);
      params.push(`contenido_tipo=${filtros.contenidoTipo}`);
    } else {
      // Formato tradicional unidireccional
      if (filtros.tipo) params.push(`tipo=${filtros.tipo}`);
      if (filtros.tipoOrigen) params.push(`tipo_origen=${filtros.tipoOrigen}`);
      if (filtros.idOrigen) params.push(`id_origen=${filtros.idOrigen}`);
      if (filtros.tipoDestino) params.push(`tipo_destino=${filtros.tipoDestino}`);
      if (filtros.idDestino) params.push(`id_destino=${filtros.idDestino}`);
    }
  }

  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  const rawRelaciones = data.relaciones || data || [];

  // Mapear de snake_case a camelCase
  return rawRelaciones.map((rel: any) => ({
    id: rel.id,
    tenantId: rel.tenant_id,
    tipoOrigen: rel.tipo_origen,
    idOrigen: rel.id_origen,
    tipoDestino: rel.tipo_destino,
    idDestino: rel.id_destino,
    descripcion: rel.descripcion,
    orden: rel.orden,
    activa: rel.activa,
    createdAt: rel.created_at,
    updatedAt: rel.updated_at,
    direccion: rel.direccion, // 'origen' o 'destino'
    nombreOrigen: rel.nombre_origen, // título del contenido origen
    nombreDestino: rel.nombre_destino, // título del contenido destino
  }));
}

/**
 * Crea una relación de contenido
 * @param tenantId - ID del tenant
 * @param relacion - Datos de la relación
 * @param token - Token de autenticación opcional
 */
export async function createRelacionContenido(
  tenantId: string,
  relacion: Partial<ContenidoRelacion>,
  token?: string | null
): Promise<ContenidoRelacion> {
  const response = await apiFetch(`/tenants/${tenantId}/contenido/relaciones`, {
    method: 'POST',
    body: JSON.stringify(relacion),
  }, token);
  const data = await response.json();
  const rel = data.relacion || data;

  // Mapear de snake_case a camelCase
  return {
    id: rel.id,
    tenantId: rel.tenant_id,
    tipoOrigen: rel.tipo_origen,
    idOrigen: rel.id_origen,
    tipoDestino: rel.tipo_destino,
    idDestino: rel.id_destino,
    descripcion: rel.descripcion,
    orden: rel.orden,
    activa: rel.activa,
    createdAt: rel.created_at,
    updatedAt: rel.updated_at,
  };
}

/**
 * Elimina una relación de contenido
 * @param tenantId - ID del tenant
 * @param relacionId - ID de la relación
 * @param token - Token de autenticación opcional
 */
export async function deleteRelacionContenido(
  tenantId: string,
  relacionId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/contenido/relaciones/${relacionId}`, {
    method: 'DELETE',
  }, token);
}

// ==========================================
// Roles de Tenant
// ==========================================

/**
 * Interfaz de Rol de Tenant
 */
export interface RolTenant {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  permisos: string[];
  activo: boolean;
  tenant_id: string;
  parentId?: string | null;
  parentNombre?: string | null;
  parentCodigo?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene los roles del tenant
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getRolesTenant(
  tenantId: string,
  token?: string | null
): Promise<RolTenant[]> {
  const response = await apiFetch(`/tenants/${tenantId}/roles`, {}, token);
  const data = await response.json();
  return data.roles || data || [];
}

// ==========================================
// CRUD de Roles del Tenant
// ==========================================

/**
 * Obtiene un rol específico del tenant
 * @param tenantId - ID del tenant
 * @param rolId - ID del rol
 * @param token - Token de autenticación opcional
 */
export async function getRolTenant(
  tenantId: string,
  rolId: string,
  token?: string | null
): Promise<RolTenant> {
  const response = await apiFetch(`/tenants/${tenantId}/roles/${rolId}`, {}, token);
  const data = await response.json();
  return data.rol || data;
}

/**
 * Crea un nuevo rol en el tenant
 * @param tenantId - ID del tenant
 * @param rol - Datos del rol
 * @param token - Token de autenticación opcional
 */
export async function createRolTenant(
  tenantId: string,
  rol: Partial<RolTenant>,
  token?: string | null
): Promise<RolTenant> {
  const response = await apiFetch(`/tenants/${tenantId}/roles`, {
    method: 'POST',
    body: JSON.stringify(rol),
  }, token);
  const data = await response.json();
  return data.rol || data;
}

/**
 * Actualiza un rol del tenant
 * @param tenantId - ID del tenant
 * @param rolId - ID del rol
 * @param rol - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateRolTenant(
  tenantId: string,
  rolId: string,
  rol: Partial<RolTenant>,
  token?: string | null
): Promise<RolTenant> {
  const response = await apiFetch(`/tenants/${tenantId}/roles/${rolId}`, {
    method: 'PUT',
    body: JSON.stringify(rol),
  }, token);
  const data = await response.json();
  return data.rol || data;
}

/**
 * Elimina un rol del tenant
 * @param tenantId - ID del tenant
 * @param rolId - ID del rol
 * @param token - Token de autenticación opcional
 */
export async function deleteRolTenant(
  tenantId: string,
  rolId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/roles/${rolId}`, {
    method: 'DELETE',
  }, token);
}

// ==========================================
// Permisos de Roles
// ==========================================

export interface ModuloPermiso {
  moduloId: string;
  moduloNombre: string;
  moduloCategoria: string;
  moduloIcono: string | null;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer: string;
  alcanceEditar: string;
}

export interface GlobalRol {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
}

/**
 * Obtiene roles globales disponibles como padres
 */
export async function getGlobalRoles(
  tenantId: string,
  token?: string | null
): Promise<GlobalRol[]> {
  const response = await apiFetch(`/tenants/${tenantId}/roles/global-roles`, {}, token);
  const data = await response.json();
  return data.roles || [];
}

/**
 * Obtiene los permisos (módulos) de un rol
 */
export async function getRolPermisos(
  tenantId: string,
  rolId: string,
  token?: string | null
): Promise<ModuloPermiso[]> {
  const response = await apiFetch(`/tenants/${tenantId}/roles/${rolId}/permisos`, {}, token);
  const data = await response.json();
  return data.modulos || [];
}

/**
 * Guarda los permisos de un rol
 */
export async function saveRolPermisos(
  tenantId: string,
  rolId: string,
  parentId: string,
  permisos: Array<{
    moduloId: string;
    puedeVer: boolean;
    puedeCrear: boolean;
    puedeEditar: boolean;
    puedeEliminar: boolean;
    alcanceVer: string;
    alcanceEditar: string;
  }>,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/roles/${rolId}/permisos`, {
    method: 'PUT',
    body: JSON.stringify({ parentId, permisos }),
  }, token);
}

/**
 * Obtiene el conteo de usuarios por rol
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getUsuariosCountByRol(
  tenantId: string,
  token?: string | null
): Promise<Record<string, number>> {
  const response = await apiFetch(`/tenants/${tenantId}/roles/usuarios-count`, {}, token);
  const data = await response.json();
  return data.counts || data || {};
}

// ==========================================
// CRUD de Usuarios del Tenant
// ==========================================

/**
 * Obtiene un usuario específico del tenant
 * @param tenantId - ID del tenant
 * @param userId - ID del usuario
 * @param token - Token de autenticación opcional
 */
export async function getUsuarioTenant(
  tenantId: string,
  userId: string,
  token?: string | null
): Promise<UsuarioTenant> {
  const response = await apiFetch(`/tenants/${tenantId}/usuarios/${userId}`, {}, token);
  const data = await response.json();
  return data.usuario || data;
}

/**
 * Crea un nuevo usuario en el tenant
 * @param tenantId - ID del tenant
 * @param usuario - Datos del usuario (incluye password opcional para contraseña temporal)
 * @param token - Token de autenticación opcional
 */
export async function createUsuarioTenant(
  tenantId: string,
  usuario: Partial<UsuarioTenant> & { roleIds?: string[]; password?: string },
  token?: string | null
): Promise<UsuarioTenant> {
  const response = await apiFetch(`/tenants/${tenantId}/usuarios`, {
    method: 'POST',
    body: JSON.stringify(usuario),
  }, token);
  const data = await response.json();
  return data.usuario || data;
}

/**
 * Actualiza un usuario del tenant
 * @param tenantId - ID del tenant
 * @param userId - ID del usuario
 * @param usuario - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateUsuarioTenant(
  tenantId: string,
  userId: string,
  usuario: Partial<UsuarioTenant> & { roleIds?: string[] },
  token?: string | null
): Promise<UsuarioTenant> {
  const response = await apiFetch(`/tenants/${tenantId}/usuarios/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(usuario),
  }, token);
  const data = await response.json();
  return data.usuario || data;
}

/**
 * Elimina un usuario del tenant
 * @param tenantId - ID del tenant
 * @param userId - ID del usuario
 * @param token - Token de autenticación opcional
 */
export async function deleteUsuarioTenant(
  tenantId: string,
  userId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/usuarios/${userId}`, {
    method: 'DELETE',
  }, token);
}

/**
 * Activa o desactiva un usuario del tenant
 */
export async function toggleUsuarioStatus(
  tenantId: string,
  userId: string,
  activo: boolean,
  token?: string | null
): Promise<{ success: boolean; activo: boolean; message: string }> {
  const response = await apiFetch(`/tenants/${tenantId}/usuarios/${userId}/toggle-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo }),
  }, token);
  return response.json();
}

/**
 * Muestra u oculta un usuario (asesor) en la página web
 */
export async function toggleUsuarioVisibility(
  tenantId: string,
  userId: string,
  visible: boolean,
  token?: string | null
): Promise<{ success: boolean; visibleEnWeb: boolean; message: string }> {
  const response = await apiFetch(`/tenants/${tenantId}/usuarios/${userId}/toggle-visibility`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visible }),
  }, token);
  return response.json();
}

/**
 * Cambia la contraseña de un usuario (admin del tenant)
 */
export async function resetUsuarioPassword(
  tenantId: string,
  userId: string,
  newPassword: string,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await apiFetch(`/tenants/${tenantId}/usuarios/${userId}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  }, token);
  return response.json();
}

// ==========================================
// Documentos de Usuario
// ==========================================

/**
 * Interfaz para documentos de usuario
 */
export interface UsuarioDocumento {
  id: string;
  usuario_id: string;
  tipo: string;
  nombre: string;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo: string;
  archivo_size: number;
  fecha_vencimiento: string | null;
  notas: string | null;
  verificado: boolean;
  verificado_por: string | null;
  fecha_verificacion: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene los documentos de un usuario
 * @param tenantId - ID del tenant
 * @param userId - ID del usuario
 * @param token - Token de autenticación opcional
 */
export async function getDocumentosUsuario(
  tenantId: string,
  userId: string,
  token?: string | null
): Promise<UsuarioDocumento[]> {
  const response = await apiFetch(`/tenants/${tenantId}/usuarios/${userId}/documentos`, {}, token);
  const data = await response.json();
  return data.documentos || data || [];
}

/**
 * Crea un documento de usuario
 * @param tenantId - ID del tenant
 * @param userId - ID del usuario
 * @param documento - Datos del documento
 * @param token - Token de autenticación opcional
 */
export async function crearDocumentoUsuario(
  tenantId: string,
  userId: string,
  documento: Partial<UsuarioDocumento>,
  token?: string | null
): Promise<UsuarioDocumento> {
  const response = await apiFetch(`/tenants/${tenantId}/usuarios/${userId}/documentos`, {
    method: 'POST',
    body: JSON.stringify(documento),
  }, token);
  const data = await response.json();
  return data.documento || data;
}

/**
 * Elimina un documento de usuario
 * @param tenantId - ID del tenant
 * @param userId - ID del usuario
 * @param documentoId - ID del documento
 * @param token - Token de autenticación opcional
 */
export async function eliminarDocumentoUsuario(
  tenantId: string,
  userId: string,
  documentoId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/usuarios/${userId}/documentos/${documentoId}`, {
    method: 'DELETE',
  }, token);
}

// ==========================================
// Join Requests (Solicitudes de CLIC Connect)
// ==========================================

/**
 * Interfaz para usuario que revisó la solicitud
 */
export interface JoinRequestRevisor {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
}

/**
 * Interfaz para usuario que refirió la solicitud
 */
export interface JoinRequestReferidor {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
}

/**
 * Interfaz para solicitudes de unirse a CLIC Connect
 */
export interface JoinRequest {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  empresa: string | null;
  mensaje: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'pending' | 'approved' | 'rejected';
  notas_revision: string | null;
  revisado_por: string | null;
  fecha_revision: string | null;
  created_at: string;
  updated_at: string;
  // Campos adicionales (camelCase desde el API)
  createdAt: string;
  anosExperiencia: number | null;
  especializacion: string | null;
  agenciaActual: string | null;
  motivacion: string | null;
  referidor: JoinRequestReferidor | null;
  notasRevision: string | null;
  revisor: JoinRequestRevisor | null;
  revisadoAt: string | null;
}

/**
 * Obtiene las solicitudes de unirse a CLIC Connect
 * @param tenantId - ID del tenant
 * @param estado - Filtro por estado (opcional)
 * @param token - Token de autenticación opcional
 */
export async function getJoinRequests(
  tenantId: string,
  estado?: string,
  token?: string | null
): Promise<JoinRequest[]> {
  let url = `/tenants/${tenantId}/join-requests`;
  if (estado) url += `?estado=${estado}`;
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.solicitudes || data || [];
}

/**
 * Aprueba una solicitud de unirse a CLIC Connect
 * @param tenantId - ID del tenant
 * @param requestId - ID de la solicitud
 * @param notas - Notas de aprobación (opcional)
 * @param token - Token de autenticación opcional
 */
export async function approveJoinRequest(
  tenantId: string,
  requestId: string,
  notas?: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/join-requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notas }),
  }, token);
}

/**
 * Rechaza una solicitud de unirse a CLIC Connect
 * @param tenantId - ID del tenant
 * @param requestId - ID de la solicitud
 * @param notas - Notas de rechazo (opcional)
 * @param token - Token de autenticación opcional
 */
export async function rejectJoinRequest(
  tenantId: string,
  requestId: string,
  notas?: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/join-requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notas }),
  }, token);
}

// ==========================================
// Upgrade Requests (Solicitudes de Upgrade CLIC Connect)
// ==========================================

/**
 * Interfaz para usuario que hace la solicitud
 */
export interface UpgradeRequestUsuario {
  nombre: string | null;
  apellido: string | null;
  email: string;
}

/**
 * Interfaz para usuario que revisó la solicitud
 */
export interface UpgradeRequestRevisor {
  nombre: string | null;
  apellido: string | null;
  email: string;
}

/**
 * Interfaz para solicitudes de upgrade de CLIC Connect
 */
export interface UpgradeRequest {
  id: string;
  tenantId: string;
  usuarioId: string;
  tipoSolicitud: 'create_new_tenant' | 'return_to_tenant';
  razon: string;
  nombreTenantPropuesto: string | null;
  planPropuesto: string | null;
  tamanoEquipoEstimado: number | null;
  tenantOriginalId: string | null;
  propiedadesAMigrar: number;
  propiedadesPublicadas: number;
  propiedadesCaptacion: number;
  propiedadesRechazadas: number;
  tarifaSetup: number;
  tarifaSetupPagada: boolean;
  estado: 'pending' | 'approved' | 'rejected';
  revisadoPor: string | null;
  revisadoAt: string | null;
  notasRevision: string | null;
  createdAt: string;
  updatedAt: string;
  usuario?: UpgradeRequestUsuario;
  revisor?: UpgradeRequestRevisor | null;
}

/**
 * Obtiene las solicitudes de upgrade de CLIC Connect
 * @param tenantId - ID del tenant
 * @param estado - Filtro por estado (opcional)
 * @param token - Token de autenticación opcional
 */
export async function getUpgradeRequests(
  tenantId: string,
  estado?: string,
  token?: string | null
): Promise<UpgradeRequest[]> {
  let url = `/tenants/${tenantId}/upgrade-requests`;
  if (estado) url += `?estado=${estado}`;
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.solicitudes || data || [];
}

/**
 * Aprueba una solicitud de upgrade de CLIC Connect
 * @param tenantId - ID del tenant
 * @param requestId - ID de la solicitud
 * @param notas - Notas de aprobación (opcional)
 * @param token - Token de autenticación opcional
 */
export async function approveUpgradeRequest(
  tenantId: string,
  requestId: string,
  notas?: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/upgrade-requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notas }),
  }, token);
}

/**
 * Rechaza una solicitud de upgrade de CLIC Connect
 * @param tenantId - ID del tenant
 * @param requestId - ID de la solicitud
 * @param notas - Notas de rechazo (opcional)
 * @param token - Token de autenticación opcional
 */
export async function rejectUpgradeRequest(
  tenantId: string,
  requestId: string,
  notas?: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/upgrade-requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notas }),
  }, token);
}

// ==========================================
// Info Negocio
// ==========================================

/**
 * Interfaz de Info Negocio
 */
export interface InfoNegocio {
  id: string;
  tenant_id: string;
  nombre: string;
  nombre_traducciones: Record<string, string> | null;
  slogan: string | null;
  slogan_traducciones: Record<string, string> | null;
  descripcion: string | null;
  descripcion_traducciones: Record<string, string> | null;
  logo_url: string | null;
  isotipo_url: string | null;
  favicon_url: string | null;
  telefono_principal: string | null;
  telefono_secundario: string | null;
  whatsapp: string | null;
  email_principal: string | null;
  email_ventas: string | null;
  email_soporte: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado_provincia: string | null;
  pais: string | null;
  codigo_postal: string | null;
  latitud: number | null;
  longitud: number | null;
  horario_lunes_viernes: string | null;
  horario_sabado: string | null;
  horario_domingo: string | null;
  zona_horaria: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  rnc: string | null;
  razon_social: string | null;
  tipo_empresa: string | null;
  ceo_nombre: string | null;
  ceo_cargo: string | null;
  ceo_foto_url: string | null;
  ceo_bio: string | null;
  ceo_bio_traducciones: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene la información del negocio
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getInfoNegocio(
  tenantId: string,
  token?: string | null
): Promise<InfoNegocio> {
  const response = await apiFetch(`/tenants/${tenantId}/info-negocio`, {}, token);
  const data = await response.json();
  return data.infoNegocio || data;
}

/**
 * Actualiza parcialmente la información del negocio
 * @param tenantId - ID del tenant
 * @param updates - Campos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function patchInfoNegocio(
  tenantId: string,
  updates: Partial<InfoNegocio>,
  token?: string | null
): Promise<InfoNegocio> {
  const response = await apiFetch(`/tenants/${tenantId}/info-negocio`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }, token);
  const data = await response.json();
  return data.infoNegocio || data;
}

// ==========================================
// Asesor Default del Tenant
// ==========================================

/**
 * Interfaz del Asesor Default
 */
export interface AsesorDefault {
  id: string;
  usuario_id: string;
  slug: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  email: string;
  titulo_profesional: string | null;
  foto_url: string | null;
  whatsapp: string | null;
  telefono_directo: string | null;
}

/**
 * Interfaz de Asesor Disponible (para selector)
 */
export interface AsesorDisponible {
  id: string;
  slug: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  email: string;
  titulo_profesional: string | null;
  foto_url: string | null;
}

/**
 * Obtiene el asesor por defecto del tenant
 */
export async function getAsesorDefault(
  tenantId: string,
  token?: string | null
): Promise<AsesorDefault | null> {
  const response = await apiFetch(`/tenants/${tenantId}/info-negocio/asesor-default`, {}, token);
  const data = await response.json();
  return data.asesorDefault;
}

/**
 * Obtiene la lista de asesores disponibles para seleccionar como default
 */
export async function getAsesoresDisponibles(
  tenantId: string,
  token?: string | null
): Promise<AsesorDisponible[]> {
  const response = await apiFetch(`/tenants/${tenantId}/info-negocio/asesores-disponibles`, {}, token);
  const data = await response.json();
  return data.asesores || [];
}

/**
 * Actualiza el asesor por defecto del tenant
 */
export async function updateAsesorDefault(
  tenantId: string,
  asesorId: string,
  token?: string | null
): Promise<AsesorDefault> {
  const response = await apiFetch(`/tenants/${tenantId}/info-negocio/asesor-default`, {
    method: 'PATCH',
    body: JSON.stringify({ asesor_id: asesorId }),
  }, token);
  const data = await response.json();
  return data.asesorDefault;
}

// ==========================================
// Sistema de Fases
// ==========================================

/**
 * Interfaz de Proyecto del Sistema de Fases
 */
export interface SistemaFasesProyecto {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Interfaz de Asesor del Sistema de Fases
 */
export interface SistemaFasesAsesor {
  id: string;
  tenant_id: string;
  usuario_id: string;
  proyecto_id: string;
  fase_actual: number;
  leads_asignados: number;
  leads_convertidos: number;
  puntos_prestige: number;
  puntos_ultra: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  usuario?: UsuarioTenant;
}

/**
 * Interfaz de Lead del Sistema de Fases
 */
export interface SistemaFasesLead {
  id: string;
  tenant_id: string;
  proyecto_id: string;
  asesor_id: string;
  contacto_id: string;
  estado: string;
  fecha_asignacion: string;
  fecha_conversion: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  contacto?: Contacto;
}

/**
 * Obtiene los proyectos del sistema de fases
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getSistemaFasesProyectos(
  tenantId: string,
  token?: string | null
): Promise<SistemaFasesProyecto[]> {
  const response = await apiFetch(`/tenants/${tenantId}/sistema-fases/proyectos`, {}, token);
  const data = await response.json();
  return data.proyectos || data || [];
}

/**
 * Obtiene los asesores del sistema de fases
 * @param tenantId - ID del tenant
 * @param proyectoId - ID del proyecto (opcional)
 * @param token - Token de autenticación opcional
 */
export async function getSistemaFasesAsesores(
  tenantId: string,
  proyectoId?: string,
  token?: string | null
): Promise<SistemaFasesAsesor[]> {
  let url = `/tenants/${tenantId}/sistema-fases/asesores`;
  if (proyectoId) url += `?proyectoId=${proyectoId}`;
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.asesores || data || [];
}

/**
 * Obtiene los leads del sistema de fases
 * @param tenantId - ID del tenant
 * @param asesorId - ID del asesor (opcional)
 * @param proyectoId - ID del proyecto (opcional)
 * @param token - Token de autenticación opcional
 */
export async function getSistemaFasesLeads(
  tenantId: string,
  asesorId?: string,
  proyectoId?: string,
  token?: string | null
): Promise<SistemaFasesLead[]> {
  let url = `/tenants/${tenantId}/sistema-fases/leads`;
  const params: string[] = [];
  if (asesorId) params.push(`asesorId=${asesorId}`);
  if (proyectoId) params.push(`proyectoId=${proyectoId}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.leads || data || [];
}

/**
 * Crea un proyecto del sistema de fases
 * @param tenantId - ID del tenant
 * @param proyecto - Datos del proyecto
 * @param token - Token de autenticación opcional
 */
export async function createSistemaFasesProyecto(
  tenantId: string,
  proyecto: Partial<SistemaFasesProyecto>,
  token?: string | null
): Promise<SistemaFasesProyecto> {
  const response = await apiFetch(`/tenants/${tenantId}/sistema-fases/proyectos`, {
    method: 'POST',
    body: JSON.stringify(proyecto),
  }, token);
  const data = await response.json();
  return data.proyecto || data;
}

/**
 * Actualiza un proyecto del sistema de fases
 * @param tenantId - ID del tenant
 * @param proyectoId - ID del proyecto
 * @param proyecto - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateSistemaFasesProyecto(
  tenantId: string,
  proyectoId: string,
  proyecto: Partial<SistemaFasesProyecto>,
  token?: string | null
): Promise<SistemaFasesProyecto> {
  const response = await apiFetch(`/tenants/${tenantId}/sistema-fases/proyectos/${proyectoId}`, {
    method: 'PUT',
    body: JSON.stringify(proyecto),
  }, token);
  const data = await response.json();
  return data.proyecto || data;
}

/**
 * Elimina un proyecto del sistema de fases
 * @param tenantId - ID del tenant
 * @param proyectoId - ID del proyecto
 * @param token - Token de autenticación opcional
 */
export async function deleteSistemaFasesProyecto(
  tenantId: string,
  proyectoId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/sistema-fases/proyectos/${proyectoId}`, {
    method: 'DELETE',
  }, token);
}

/**
 * Agrega un asesor al sistema de fases
 * @param tenantId - ID del tenant
 * @param proyectoId - ID del proyecto
 * @param usuarioId - ID del usuario
 * @param token - Token de autenticación opcional
 */
export async function agregarAsesorSistemaFases(
  tenantId: string,
  proyectoId: string,
  usuarioId: string,
  token?: string | null
): Promise<SistemaFasesAsesor> {
  const response = await apiFetch(`/tenants/${tenantId}/sistema-fases/asesores`, {
    method: 'POST',
    body: JSON.stringify({ proyectoId, usuarioId }),
  }, token);
  const data = await response.json();
  return data.asesor || data;
}

/**
 * Obtiene estadísticas del sistema de fases
 * @param tenantId - ID del tenant
 * @param proyectoId - ID del proyecto (opcional)
 * @param token - Token de autenticación opcional
 */
export async function getSistemaFasesEstadisticas(
  tenantId: string,
  proyectoId?: string,
  token?: string | null
): Promise<any> {
  let url = `/tenants/${tenantId}/sistema-fases/estadisticas`;
  if (proyectoId) url += `?proyectoId=${proyectoId}`;
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data;
}

// ==========================================
// Oficinas
// ==========================================

/**
 * Interfaz de Oficina
 */
export interface Oficina {
  id: string;
  tenant_id: string;
  nombre: string;
  codigo: string;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  codigo_postal: string | null;
  telefono: string | null;
  email: string | null;
  zona_trabajo: string | null;
  administrador_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  administrador?: UsuarioTenant;
}

/**
 * Obtiene las oficinas del tenant
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getOficinas(
  tenantId: string,
  token?: string | null
): Promise<Oficina[]> {
  const response = await apiFetch(`/tenants/${tenantId}/oficinas`, {}, token);
  const data = await response.json();
  return data.oficinas || data || [];
}

/**
 * Crea una nueva oficina
 * @param tenantId - ID del tenant
 * @param oficina - Datos de la oficina
 * @param token - Token de autenticación opcional
 */
export async function createOficina(
  tenantId: string,
  oficina: Partial<Oficina>,
  token?: string | null
): Promise<Oficina> {
  const response = await apiFetch(`/tenants/${tenantId}/oficinas`, {
    method: 'POST',
    body: JSON.stringify(oficina),
  }, token);
  const data = await response.json();
  return data.oficina || data;
}

/**
 * Actualiza una oficina
 * @param tenantId - ID del tenant
 * @param oficinaId - ID de la oficina
 * @param oficina - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateOficina(
  tenantId: string,
  oficinaId: string,
  oficina: Partial<Oficina>,
  token?: string | null
): Promise<Oficina> {
  const response = await apiFetch(`/tenants/${tenantId}/oficinas/${oficinaId}`, {
    method: 'PUT',
    body: JSON.stringify(oficina),
  }, token);
  const data = await response.json();
  return data.oficina || data;
}

/**
 * Elimina una oficina
 * @param tenantId - ID del tenant
 * @param oficinaId - ID de la oficina
 * @param token - Token de autenticación opcional
 */
export async function deleteOficina(
  tenantId: string,
  oficinaId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/oficinas/${oficinaId}`, {
    method: 'DELETE',
  }, token);
}

// ==========================================
// Equipos
// ==========================================

/**
 * Interfaz de Equipo
 */
export interface Equipo {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  lider_id: string | null;
  asistente_id: string | null;
  oficina_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  lider?: UsuarioTenant;
  asistente?: UsuarioTenant;
  oficina?: Oficina;
}

/**
 * Obtiene los equipos del tenant
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getEquipos(
  tenantId: string,
  token?: string | null
): Promise<Equipo[]> {
  const response = await apiFetch(`/tenants/${tenantId}/equipos`, {}, token);
  const data = await response.json();
  return data.equipos || data || [];
}

/**
 * Crea un nuevo equipo
 * @param tenantId - ID del tenant
 * @param equipo - Datos del equipo
 * @param token - Token de autenticación opcional
 */
export async function createEquipo(
  tenantId: string,
  equipo: Partial<Equipo>,
  token?: string | null
): Promise<Equipo> {
  const response = await apiFetch(`/tenants/${tenantId}/equipos`, {
    method: 'POST',
    body: JSON.stringify(equipo),
  }, token);
  const data = await response.json();
  return data.equipo || data;
}

/**
 * Actualiza un equipo
 * @param tenantId - ID del tenant
 * @param equipoId - ID del equipo
 * @param equipo - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateEquipo(
  tenantId: string,
  equipoId: string,
  equipo: Partial<Equipo>,
  token?: string | null
): Promise<Equipo> {
  const response = await apiFetch(`/tenants/${tenantId}/equipos/${equipoId}`, {
    method: 'PUT',
    body: JSON.stringify(equipo),
  }, token);
  const data = await response.json();
  return data.equipo || data;
}

/**
 * Elimina un equipo
 * @param tenantId - ID del tenant
 * @param equipoId - ID del equipo
 * @param token - Token de autenticación opcional
 */
export async function deleteEquipo(
  tenantId: string,
  equipoId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/equipos/${equipoId}`, {
    method: 'DELETE',
  }, token);
}

// ==========================================
// Amenidades
// ==========================================

/**
 * Interfaz de Amenidad
 */
export interface Amenidad {
  id: string;
  tenant_id: string | null;
  nombre: string;
  nombre_traducciones: Record<string, string> | null;
  icono: string | null;
  categoria: string;
  activo: boolean;
  es_global: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Interfaz de Categoría de Amenidad
 */
export interface CategoriaAmenidad {
  codigo: string;
  nombre: string;
}

/**
 * Obtiene las amenidades del tenant
 * @param tenantId - ID del tenant
 * @param incluirInactivas - Si incluir las inactivas
 * @param token - Token de autenticación opcional
 */
export async function getAmenidadesTenant(
  tenantId: string,
  incluirInactivas = false,
  token?: string | null
): Promise<Amenidad[]> {
  let url = `/tenants/${tenantId}/amenidades`;
  if (incluirInactivas) url += '?incluirInactivas=true';
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.amenidades || data || [];
}

/**
 * Crea una nueva amenidad para el tenant
 * @param tenantId - ID del tenant
 * @param amenidad - Datos de la amenidad
 * @param token - Token de autenticación opcional
 */
export async function createAmenidadTenant(
  tenantId: string,
  amenidad: Omit<Amenidad, 'id'>,
  token?: string | null
): Promise<Amenidad> {
  const response = await apiFetch(`/tenants/${tenantId}/amenidades`, {
    method: 'POST',
    body: JSON.stringify(amenidad),
  }, token);
  const data = await response.json();
  return data.amenidad || data;
}

/**
 * Actualiza una amenidad del tenant
 * @param tenantId - ID del tenant
 * @param amenidadId - ID de la amenidad
 * @param amenidad - Datos a actualizar
 * @param token - Token de autenticación opcional
 */
export async function updateAmenidadTenant(
  tenantId: string,
  amenidadId: string,
  amenidad: Partial<Amenidad>,
  token?: string | null
): Promise<Amenidad> {
  const response = await apiFetch(`/tenants/${tenantId}/amenidades/${amenidadId}`, {
    method: 'PUT',
    body: JSON.stringify(amenidad),
  }, token);
  const data = await response.json();
  return data.amenidad || data;
}

/**
 * Elimina una amenidad del tenant
 * @param tenantId - ID del tenant
 * @param amenidadId - ID de la amenidad
 * @param token - Token de autenticación opcional
 */
export async function deleteAmenidadTenant(
  tenantId: string,
  amenidadId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/amenidades/${amenidadId}`, {
    method: 'DELETE',
  }, token);
}

// ==================== Configuración del Tenant ====================

export interface TenantConfiguracion {
  id: string;
  nombre: string;
  slug: string;
  dominio_personalizado: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  email_contacto: string | null;
  telefono_contacto: string | null;
  configuracion: Record<string, any> | null;
  plan: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene la configuración general del tenant
 * @param tenantId - ID del tenant
 * @param token - Token de autenticación opcional
 */
export async function getTenantConfiguracion(
  tenantId: string,
  token?: string | null
): Promise<TenantConfiguracion> {
  const response = await apiFetch(`/tenants/${tenantId}/configuracion`, {}, token);
  return response.json();
}

// ==================== Configuración de Comisiones ====================

export interface TenantComisionConfig {
  red_global_comision_default: string | null;
  connect_comision_default: string | null;
}

export async function getTenantComisionConfig(
  tenantId: string,
  token?: string | null
): Promise<TenantComisionConfig> {
  const response = await apiFetch(`/tenants/${tenantId}/comision-config`, {}, token);
  const data = await response.json();
  return {
    red_global_comision_default: data.red_global_comision_default || null,
    connect_comision_default: data.connect_comision_default || null
  };
}

// ==================== UNIVERSITY ====================

export interface UniversityCurso {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string;
  imagen_portada?: string;
  nivel: string;
  duracion_estimada_minutos: number;
  estado: 'borrador' | 'publicado' | 'archivado';
  es_pago: boolean;
  precio?: number;
  moneda: string;
  orden: number;
  metadata?: Record<string, any>;
  fecha_publicacion?: string;
  created_at: string;
  updated_at: string;
  // Campos agregados (del servicio backend)
  secciones_count?: number;
  videos_count?: number;
  total_secciones?: number;
  total_videos?: number;
  certificados?: UniversityCertificado[];
}

export interface UniversitySeccion {
  id: string;
  curso_id: string;
  titulo: string;
  descripcion?: string;
  orden: number;
  es_pago_adicional: boolean;
  precio_seccion?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  videos?: UniversityVideo[];
}

export interface UniversityVideo {
  id: string;
  seccion_id: string;
  titulo: string;
  descripcion?: string;
  url_video: string;
  proveedor: string;
  video_id?: string;
  duracion_segundos: number;
  thumbnail?: string;
  orden: number;
  es_preview: boolean;
  es_pago_adicional: boolean;
  precio_video?: number;
  recursos_adjuntos?: any[];
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UniversityCertificado {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  imagen_template?: string;
  campos_personalizados?: Record<string, any>;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UniversityStats {
  total_cursos: number;
  cursos_publicados: number;
  total_secciones: number;
  total_videos: number;
  total_certificados: number;
  total_inscripciones: number;
  certificados_emitidos: number;
}

// Cursos
export async function getUniversityCursos(
  tenantId: string,
  token?: string | null,
  params?: { estado?: string; limit?: number; offset?: number }
): Promise<UniversityCurso[]> {
  const queryParams = new URLSearchParams();
  if (params?.estado) queryParams.append('estado', params.estado);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const url = `/tenants/${tenantId}/university/cursos${queryString ? `?${queryString}` : ''}`;
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.cursos || [];
}

export async function getUniversityCurso(
  tenantId: string,
  cursoId: string,
  token?: string | null,
  detalle: boolean = false
): Promise<UniversityCurso & { secciones?: UniversitySeccion[] }> {
  const url = `/tenants/${tenantId}/university/cursos/${cursoId}${detalle ? '?detalle=true' : ''}`;
  const response = await apiFetch(url, {}, token);
  return response.json();
}

export async function createUniversityCurso(
  tenantId: string,
  data: Partial<UniversityCurso>,
  token?: string | null
): Promise<UniversityCurso> {
  const response = await apiFetch(`/tenants/${tenantId}/university/cursos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function updateUniversityCurso(
  tenantId: string,
  cursoId: string,
  data: Partial<UniversityCurso>,
  token?: string | null
): Promise<UniversityCurso> {
  const response = await apiFetch(`/tenants/${tenantId}/university/cursos/${cursoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function deleteUniversityCurso(
  tenantId: string,
  cursoId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/university/cursos/${cursoId}`, {
    method: 'DELETE',
  }, token);
}

// Secciones
export async function getUniversitySecciones(
  tenantId: string,
  cursoId: string,
  token?: string | null
): Promise<UniversitySeccion[]> {
  const response = await apiFetch(`/tenants/${tenantId}/university/cursos/${cursoId}/secciones`, {}, token);
  return response.json();
}

export async function createUniversitySeccion(
  tenantId: string,
  cursoId: string,
  data: Partial<UniversitySeccion>,
  token?: string | null
): Promise<UniversitySeccion> {
  const response = await apiFetch(`/tenants/${tenantId}/university/cursos/${cursoId}/secciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function updateUniversitySeccion(
  tenantId: string,
  seccionId: string,
  data: Partial<UniversitySeccion>,
  token?: string | null
): Promise<UniversitySeccion> {
  const response = await apiFetch(`/tenants/${tenantId}/university/secciones/${seccionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function deleteUniversitySeccion(
  tenantId: string,
  seccionId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/university/secciones/${seccionId}`, {
    method: 'DELETE',
  }, token);
}

export async function reorderUniversitySecciones(
  tenantId: string,
  cursoId: string,
  ordenIds: string[],
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/university/cursos/${cursoId}/secciones/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ordenIds }),
  }, token);
}

// Videos
export async function getUniversityVideos(
  tenantId: string,
  seccionId: string,
  token?: string | null
): Promise<UniversityVideo[]> {
  const response = await apiFetch(`/tenants/${tenantId}/university/secciones/${seccionId}/videos`, {}, token);
  return response.json();
}

export async function createUniversityVideo(
  tenantId: string,
  seccionId: string,
  data: Partial<UniversityVideo>,
  token?: string | null
): Promise<UniversityVideo> {
  const response = await apiFetch(`/tenants/${tenantId}/university/secciones/${seccionId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function updateUniversityVideo(
  tenantId: string,
  videoId: string,
  data: Partial<UniversityVideo>,
  token?: string | null
): Promise<UniversityVideo> {
  const response = await apiFetch(`/tenants/${tenantId}/university/videos/${videoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function deleteUniversityVideo(
  tenantId: string,
  videoId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/university/videos/${videoId}`, {
    method: 'DELETE',
  }, token);
}

export async function reorderUniversityVideos(
  tenantId: string,
  seccionId: string,
  ordenIds: string[],
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/university/secciones/${seccionId}/videos/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ordenIds }),
  }, token);
}

// Certificados
export async function getUniversityCertificados(
  tenantId: string,
  token?: string | null
): Promise<UniversityCertificado[]> {
  const response = await apiFetch(`/tenants/${tenantId}/university/certificados`, {}, token);
  return response.json();
}

export async function getUniversityCertificadoById(
  tenantId: string,
  certificadoId: string,
  token?: string | null
): Promise<UniversityCertificado | null> {
  const response = await apiFetch(`/tenants/${tenantId}/university/certificados/${certificadoId}`, {}, token);
  return response.json();
}

export async function createUniversityCertificado(
  tenantId: string,
  data: Partial<UniversityCertificado>,
  token?: string | null
): Promise<UniversityCertificado> {
  const response = await apiFetch(`/tenants/${tenantId}/university/certificados`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function updateUniversityCertificado(
  tenantId: string,
  certificadoId: string,
  data: Partial<UniversityCertificado>,
  token?: string | null
): Promise<UniversityCertificado> {
  const response = await apiFetch(`/tenants/${tenantId}/university/certificados/${certificadoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function deleteUniversityCertificado(
  tenantId: string,
  certificadoId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/university/certificados/${certificadoId}`, {
    method: 'DELETE',
  }, token);
}

// Curso-Certificado
export async function asignarCertificadoACurso(
  tenantId: string,
  cursoId: string,
  certificadoId: string,
  porcentajeRequerido: number = 100,
  requiereExamen: boolean = false,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/university/cursos/${cursoId}/certificados/${certificadoId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ porcentaje_requerido: porcentajeRequerido, requiere_examen: requiereExamen }),
  }, token);
}

export async function removerCertificadoDeCurso(
  tenantId: string,
  cursoId: string,
  certificadoId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/university/cursos/${cursoId}/certificados/${certificadoId}`, {
    method: 'DELETE',
  }, token);
}

// Certificados Emitidos
export interface CertificadoEmitido {
  id: string;
  inscripcion_id: string;
  certificado_id: string;
  codigo_verificacion: string;
  url_pdf?: string;
  fecha_emision: string;
  datos_certificado: Record<string, any>;
  created_at: string;
  nombre_usuario?: string;
  email_usuario?: string;
  nombre_curso?: string;
  nombre_certificado?: string;
  imagen_template?: string;
  nombre_empresa?: string;
}

export async function getCertificadosEmitidos(
  tenantId: string,
  options: { limit?: number; offset?: number } = {},
  token?: string | null
): Promise<{ certificados: CertificadoEmitido[]; total: number }> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const response = await apiFetch(`/tenants/${tenantId}/university/certificados-emitidos${queryStr}`, {}, token);
  return response.json();
}

export async function getCertificadosEmitidosByUsuario(
  tenantId: string,
  usuarioId: string,
  token?: string | null
): Promise<CertificadoEmitido[]> {
  const response = await apiFetch(`/tenants/${tenantId}/university/certificados-emitidos/usuario/${usuarioId}`, {}, token);
  return response.json();
}

export async function emitirCertificadoManual(
  tenantId: string,
  data: {
    curso_id: string;
    certificado_id: string;
    email: string;
    nombre: string;
    usuario_id?: string;
  },
  token?: string | null
): Promise<CertificadoEmitido> {
  const response = await apiFetch(`/tenants/${tenantId}/university/certificados-emitidos/manual`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function verificarCertificado(
  tenantId: string,
  codigo: string,
  token?: string | null
): Promise<CertificadoEmitido | null> {
  try {
    const response = await apiFetch(`/tenants/${tenantId}/university/verificar/${codigo}`, {}, token);
    return response.json();
  } catch (error) {
    return null;
  }
}

// Stats
export async function getUniversityStats(
  tenantId: string,
  token?: string | null
): Promise<UniversityStats> {
  const response = await apiFetch(`/tenants/${tenantId}/university/stats`, {}, token);
  const data = await response.json();
  // Mapear campos de camelCase a snake_case para consistencia con frontend
  return {
    total_cursos: data.totalCursos || 0,
    cursos_publicados: data.cursosPublicados || 0,
    total_secciones: data.totalSecciones || 0,
    total_videos: data.totalVideos || 0,
    total_certificados: data.totalCertificadosEmitidos || 0,
    total_inscripciones: data.totalInscripciones || 0,
    certificados_emitidos: data.totalCertificadosEmitidos || 0,
  };
}

// ==================== ACCESO POR ROL (ADMIN) ====================

export interface AccesoRolCurso {
  id: string;
  curso_id: string;
  rol_id: string;
  rol_nombre?: string;
  rol_codigo?: string;
  seccion_limite_id?: string;
  seccion_limite_titulo?: string;
  seccion_limite_orden?: number;
}

export async function getAccesoRolesCurso(
  tenantId: string,
  cursoId: string,
  token?: string | null
): Promise<AccesoRolCurso[]> {
  const response = await apiFetch(`/tenants/${tenantId}/university/cursos/${cursoId}/acceso-roles`, {}, token);
  return response.json();
}

export async function setAccesoRolCurso(
  tenantId: string,
  cursoId: string,
  data: { rol_id: string; seccion_limite_id?: string | null },
  token?: string | null
): Promise<AccesoRolCurso> {
  const response = await apiFetch(`/tenants/${tenantId}/university/cursos/${cursoId}/acceso-roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

export async function removeAccesoRolCurso(
  tenantId: string,
  cursoId: string,
  rolId: string,
  token?: string | null
): Promise<void> {
  await apiFetch(`/tenants/${tenantId}/university/cursos/${cursoId}/acceso-roles/${rolId}`, {
    method: 'DELETE',
  }, token);
}

// ==================== MI ENTRENAMIENTO ====================

export interface CursoDisponible {
  id: string;
  titulo: string;
  descripcion?: string;
  imagen_portada?: string;
  nivel: 'principiante' | 'intermedio' | 'avanzado';
  duracion_estimada_minutos: number;
  estado: string;
  es_pago: boolean;
  precio?: number;
  total_secciones: number;
  total_videos: number;
  secciones_accesibles: number;
  progreso_porcentaje: number;
  tiene_certificado: boolean;
  inscripcion_id?: string;
}

export interface VideoConProgreso {
  id: string;
  titulo: string;
  descripcion?: string;
  url_video: string;
  proveedor: string;
  video_id?: string;
  duracion_segundos: number;
  thumbnail?: string;
  orden: number;
  es_preview: boolean;
  recursos_adjuntos: any[];
  segundos_vistos: number;
  porcentaje_completado: number;
  completado: boolean;
}

export interface SeccionConAcceso {
  id: string;
  titulo: string;
  descripcion?: string;
  orden: number;
  total_videos: number;
  tiene_acceso: boolean;
  videos: VideoConProgreso[];
}

export interface CursoConAcceso {
  id: string;
  titulo: string;
  descripcion?: string;
  imagen_portada?: string;
  nivel: string;
  duracion_estimada_minutos: number;
  total_secciones: number;
  total_videos: number;
  secciones_accesibles: number;
  progreso_porcentaje: number;
  inscripcion_id?: string;
  secciones: SeccionConAcceso[];
  certificados_disponibles: { id: string; nombre: string; porcentaje_requerido: number }[];
  certificados_obtenidos: { id: string; nombre: string; codigo_verificacion: string; fecha_emision: Date }[];
}

export interface ProgresoResult {
  progreso_video: any;
  progreso_curso: number;
  certificado_emitido?: any;
}

export interface MiCertificado {
  id: string;
  codigo_verificacion: string;
  fecha_emision: string;
  nombre_certificado: string;
  imagen_template?: string;
  nombre_curso: string;
  fecha_completado?: string;
  url_pdf?: string;
}

// Obtener cursos disponibles para el usuario
export async function getMiEntrenamientoCursos(
  tenantId: string,
  token?: string | null
): Promise<CursoDisponible[]> {
  console.log('[API] getMiEntrenamientoCursos called', { tenantId, hasToken: !!token });
  const response = await apiFetch(`/tenants/${tenantId}/mi-entrenamiento/cursos`, {}, token);
  const data = await response.json();
  console.log('[API] getMiEntrenamientoCursos response', data);
  return data;
}

// Obtener detalle de un curso con secciones y progreso
export async function getMiEntrenamientoCurso(
  tenantId: string,
  cursoId: string,
  token?: string | null
): Promise<CursoConAcceso> {
  const response = await apiFetch(`/tenants/${tenantId}/mi-entrenamiento/cursos/${cursoId}`, {}, token);
  return response.json();
}

// Registrar progreso de video
export async function registrarProgresoVideo(
  tenantId: string,
  data: {
    inscripcion_id: string;
    video_id: string;
    segundos_vistos: number;
    porcentaje_completado: number;
  },
  token?: string | null
): Promise<ProgresoResult> {
  const response = await apiFetch(`/tenants/${tenantId}/mi-entrenamiento/progreso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

// Obtener certificados del usuario
export async function getMisCertificados(
  tenantId: string,
  token?: string | null
): Promise<MiCertificado[]> {
  const response = await apiFetch(`/tenants/${tenantId}/mi-entrenamiento/mis-certificados`, {}, token);
  return response.json();
}

// ============================================
// PLANTILLAS DE COMISIÓN
// ============================================

// Interfaces para plantillas de comisión
export interface DistribucionEscenario {
  captador: number;
  vendedor: number;
  empresa: number;
}

export interface DistribucionesTipoPropiedad {
  solo_capta: DistribucionEscenario;
  solo_vende: DistribucionEscenario;
  capta_y_vende: DistribucionEscenario;
}

export interface FeePrevio {
  rol: string;
  porcentaje: number;
  descripcion: string;
  aplica_a?: string[];
}

export interface DistribucionEmpresaItem {
  rol: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
  moneda?: string;
  descripcion: string;
}

export interface PlantillaComisionConfig {
  distribuciones: {
    propiedad_lista: DistribucionesTipoPropiedad;
    proyecto: DistribucionesTipoPropiedad;
  };
  fees_previos: FeePrevio[];
  distribucion_empresa?: DistribucionEmpresaItem[];
  roles_aplicables: string[];
  es_personal: boolean;
  usuario_id?: string;
  fee_referidor?: {
    tipo: 'porcentaje' | 'fijo';
    valor: number;
    descripcion: string;
  };
}

export interface PlantillaComision {
  id: string;
  tenant_id: string | null;
  tipo: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  color: string | null;
  orden: number;
  activo: boolean;
  es_default: boolean;
  config: PlantillaComisionConfig;
  created_at: string;
  updated_at: string;
}

export interface DistribucionEmpresaConfig {
  distribuciones: DistribucionEmpresaItem[];
  nota?: string;
}

export interface CalculoComisionResult {
  montoOriginal: number;
  feesPrevios: { rol: string; monto: number; porcentaje: number }[];
  montoBaseDistribucion: number;
  distribucion: {
    captador: { porcentaje: number; monto: number };
    vendedor: { porcentaje: number; monto: number };
    empresa: { porcentaje: number; monto: number };
  };
  snapshot: PlantillaComisionConfig;
}

// Obtener todas las plantillas de comisión
export async function getPlantillasComision(
  tenantId: string,
  token?: string | null
): Promise<PlantillaComision[]> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/plantillas-comision`, {}, token);
  return response.json();
}

// Obtener una plantilla específica
export async function getPlantillaComision(
  tenantId: string,
  plantillaId: string,
  token?: string | null
): Promise<PlantillaComision> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/plantillas-comision/${plantillaId}`, {}, token);
  return response.json();
}

// Crear plantilla de comisión
export async function createPlantillaComision(
  tenantId: string,
  data: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    icono?: string;
    color?: string;
    config: PlantillaComisionConfig;
  },
  token?: string | null
): Promise<PlantillaComision> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/plantillas-comision`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

// Actualizar plantilla de comisión
export async function updatePlantillaComision(
  tenantId: string,
  plantillaId: string,
  data: Partial<{
    nombre: string;
    descripcion: string;
    icono: string;
    color: string;
    activo: boolean;
    config: PlantillaComisionConfig;
  }>,
  token?: string | null
): Promise<PlantillaComision> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/plantillas-comision/${plantillaId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

// Eliminar plantilla de comisión
export async function deletePlantillaComision(
  tenantId: string,
  plantillaId: string,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/plantillas-comision/${plantillaId}`, {
    method: 'DELETE',
  }, token);
  return response.json();
}

// Crear plantilla personalizada para un usuario
export async function createPlantillaPersonalizada(
  tenantId: string,
  data: {
    usuarioId: string;
    nombreUsuario: string;
    config: PlantillaComisionConfig;
  },
  token?: string | null
): Promise<PlantillaComision> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/plantillas-comision/personalizada`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

// Obtener distribución interna de empresa
export async function getDistribucionEmpresa(
  tenantId: string,
  token?: string | null
): Promise<DistribucionEmpresaConfig> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/distribucion-empresa`, {}, token);
  return response.json();
}

// Actualizar distribución interna de empresa
export async function updateDistribucionEmpresa(
  tenantId: string,
  distribuciones: DistribucionEmpresaItem[],
  token?: string | null
): Promise<DistribucionEmpresaConfig> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/distribucion-empresa`, {
    method: 'PUT',
    body: JSON.stringify({ distribuciones }),
  }, token);
  return response.json();
}

// Asignar plantilla a un perfil de asesor
export async function asignarPlantillaAPerfil(
  tenantId: string,
  perfilId: string,
  plantillaId: string,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/perfiles/${perfilId}/plantilla`, {
    method: 'PUT',
    body: JSON.stringify({ plantillaId }),
  }, token);
  return response.json();
}

// Obtener plantilla de un perfil
export async function getPlantillaDePerfil(
  tenantId: string,
  perfilId: string,
  token?: string | null
): Promise<PlantillaComision> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/perfiles/${perfilId}/plantilla`, {}, token);
  return response.json();
}

// Calcular distribución de comisión
export async function calcularDistribucionComision(
  tenantId: string,
  data: {
    montoComision: number;
    tipoPropiedad: 'propiedad_lista' | 'proyecto';
    escenario: 'solo_capta' | 'solo_vende' | 'capta_y_vende';
    plantillaId: string;
  },
  token?: string | null
): Promise<CalculoComisionResult> {
  const response = await apiFetch(`/tenants/${tenantId}/finanzas/calcular-comision`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

// ==================== UBICACIONES - ADMIN CRUD ====================

/**
 * Interfaz extendida de Ubicacion para el admin con campos adicionales
 */
export interface UbicacionAdmin extends Ubicacion {
  codigo?: string;
  latitud?: number;
  longitud?: number;
  mostrar_en_menu?: boolean;
  mostrar_en_filtros?: boolean;
  children_count?: number;
  propiedades_count?: number;
  created_at?: string;
  updated_at?: string;
  children?: UbicacionAdmin[];
  breadcrumb?: Array<{ id: string; nombre: string; slug: string; tipo: string }>;
}

/**
 * Datos para crear una ubicación
 */
export interface CreateUbicacionData {
  nombre: string;
  tipo: 'pais' | 'provincia' | 'ciudad' | 'sector';
  parent_id?: string | null;
  slug?: string;
  codigo?: string;
  latitud?: number;
  longitud?: number;
  destacado?: boolean;
  mostrar_en_menu?: boolean;
  mostrar_en_filtros?: boolean;
  activo?: boolean;
}

/**
 * Obtiene una ubicación por ID con breadcrumb
 */
export async function getUbicacionById(id: string, token?: string | null): Promise<UbicacionAdmin> {
  const response = await apiFetch(`/ubicaciones/${id}`, {}, token);
  const data = await response.json();
  return data.ubicacion || data;
}

/**
 * Obtiene ubicaciones hijas de un parent
 */
export async function getUbicacionesHijas(parentId: string, token?: string | null): Promise<UbicacionAdmin[]> {
  const response = await apiFetch(`/ubicaciones/hijos/${parentId}`, {}, token);
  const data = await response.json();
  return data.ubicaciones || data || [];
}

/**
 * Crea una nueva ubicación
 */
export async function createUbicacion(data: CreateUbicacionData, token?: string | null): Promise<UbicacionAdmin> {
  const response = await apiFetch('/ubicaciones', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  const result = await response.json();
  return result.ubicacion || result;
}

/**
 * Actualiza una ubicación existente
 */
export async function updateUbicacion(id: string, data: Partial<CreateUbicacionData>, token?: string | null): Promise<UbicacionAdmin> {
  const response = await apiFetch(`/ubicaciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  const result = await response.json();
  return result.ubicacion || result;
}

/**
 * Elimina una ubicación (soft delete por defecto)
 */
export async function deleteUbicacion(id: string, hardDelete: boolean = false, token?: string | null): Promise<void> {
  const url = hardDelete ? `/ubicaciones/${id}?hard=true` : `/ubicaciones/${id}`;
  await apiFetch(url, {
    method: 'DELETE',
  }, token);
}

/**
 * Activa o desactiva una ubicación
 */
export async function toggleUbicacionStatus(id: string, activo: boolean, token?: string | null): Promise<UbicacionAdmin> {
  return updateUbicacion(id, { activo }, token);
}

// ==================== TAGS GLOBAL - ADMIN ====================

/**
 * Interfaz para tag global
 */
export interface TagGlobal {
  id: string;
  slug: string;
  tipo: string;
  valor: string | null;
  campo_query: string | null;
  operador: string;
  alias_idiomas: Record<string, string>;
  nombre_idiomas: Record<string, string>;
  pais: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Datos para crear un tag global
 */
export interface CreateTagGlobalData {
  slug: string;
  tipo: string;
  valor?: string | null;
  campo_query?: string | null;
  operador?: string;
  alias_idiomas?: Record<string, string>;
  nombre_idiomas?: Record<string, string>;
  pais?: string;
  orden?: number;
  activo?: boolean;
}

/**
 * Estadísticas de tags globales
 */
export interface TagGlobalStats {
  total: number;
  activos: number;
  inactivos: number;
  por_tipo: Record<string, number>;
  por_pais: Record<string, number>;
}

/**
 * Filtros para listar tags globales
 */
export interface TagGlobalFilters {
  tipo?: string;
  pais?: string;
  activo?: boolean;
  search?: string;
}

/**
 * Obtiene todos los tags globales
 */
export async function getTagsGlobal(filters?: TagGlobalFilters, token?: string | null): Promise<TagGlobal[]> {
  let url = '/admin/tags-global';
  if (filters) {
    const params: string[] = [];
    if (filters.tipo) params.push(`tipo=${filters.tipo}`);
    if (filters.pais) params.push(`pais=${filters.pais}`);
    if (filters.activo !== undefined) params.push(`activo=${filters.activo}`);
    if (filters.search) params.push(`search=${encodeURIComponent(filters.search)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
  }
  const response = await apiFetch(url, {}, token);
  const data = await response.json();
  return data.tags || [];
}

/**
 * Obtiene un tag global por ID
 */
export async function getTagGlobalById(id: string, token?: string | null): Promise<TagGlobal> {
  const response = await apiFetch(`/admin/tags-global/${id}`, {}, token);
  const data = await response.json();
  return data.tag;
}

/**
 * Crea un nuevo tag global
 */
export async function createTagGlobal(data: CreateTagGlobalData, token?: string | null): Promise<TagGlobal> {
  const response = await apiFetch('/admin/tags-global', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  const result = await response.json();
  return result.tag;
}

/**
 * Actualiza un tag global
 */
export async function updateTagGlobal(id: string, data: Partial<CreateTagGlobalData>, token?: string | null): Promise<TagGlobal> {
  const response = await apiFetch(`/admin/tags-global/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  const result = await response.json();
  return result.tag;
}

/**
 * Elimina un tag global
 */
export async function deleteTagGlobal(id: string, hardDelete: boolean = false, token?: string | null): Promise<void> {
  const url = hardDelete ? `/admin/tags-global/${id}?hard=true` : `/admin/tags-global/${id}`;
  await apiFetch(url, {
    method: 'DELETE',
  }, token);
}

/**
 * Activa o desactiva un tag global
 */
export async function toggleTagGlobalStatus(id: string, activo: boolean, token?: string | null): Promise<TagGlobal> {
  const response = await apiFetch(`/admin/tags-global/${id}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ activo }),
  }, token);
  const result = await response.json();
  return result.tag;
}

/**
 * Obtiene estadísticas de tags globales
 */
export async function getTagsGlobalStats(token?: string | null): Promise<TagGlobalStats> {
  const response = await apiFetch('/admin/tags-global/stats', {}, token);
  return response.json();
}

/**
 * Obtiene los tipos de tags existentes
 */
export async function getTagGlobalTipos(token?: string | null): Promise<string[]> {
  const response = await apiFetch('/admin/tags-global/tipos', {}, token);
  const data = await response.json();
  return data.tipos || [];
}

// ============================================================================
// PLANES DE PAGO
// ============================================================================

export type EstadoPlanPago = 'borrador' | 'enviado' | 'visto' | 'aceptado' | 'rechazado';

export interface PlanDetalleItem {
  tipo: 'porcentaje' | 'valor';
  valor: number;
  descripcion?: string;
  cuotas?: number; // Solo para inicial
}

export interface PlanDetalle {
  reserva?: PlanDetalleItem;
  separacion?: PlanDetalleItem;
  inicial?: PlanDetalleItem;
  contra_entrega?: PlanDetalleItem;
  financiamiento?: {
    tipo: 'bancario' | 'desarrollador' | 'otro';
    porcentaje: number;
    plazo_meses?: number;
    descripcion?: string;
  };
  notas_adicionales?: string;
  valores_calculados?: {
    reserva_monto?: number;
    separacion_monto?: number;
    inicial_monto?: number;
    contra_entrega_monto?: number;
    financiamiento_monto?: number;
  };
}

export interface PlanPago {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string | null;
  estado: EstadoPlanPago;
  contacto_id?: string | null;
  contacto?: {
    id: string;
    nombre: string;
    apellido?: string;
    email?: string;
    telefono?: string;
  };
  solicitud_id?: string | null;
  solicitud?: {
    id: string;
    titulo?: string;
  };
  propiedad_id?: string | null;
  propiedad?: {
    id: string;
    titulo: string;
    codigo?: string;
    precio?: number;
    moneda?: string;
    imagen_principal?: string;
    tipo?: string;
    operacion?: string;
    ciudad?: string;
  };
  unidad_id?: string | null;
  unidad?: {
    id: string;
    nombre: string;
    codigo?: string;
    precio?: number;
    moneda?: string;
  };
  usuario_creador_id?: string | null;
  usuario_creador?: {
    id: string;
    nombre: string;
    apellido?: string;
  };
  precio_total?: number | null;
  moneda: string;
  plan_detalle: PlanDetalle;
  condiciones?: string | null;
  notas_internas?: string | null;
  url_publica?: string | null;
  fecha_expiracion?: string | null;
  fecha_enviada?: string | null;
  fecha_vista?: string | null;
  fecha_respuesta?: string | null;
  veces_vista: number;
  datos_extra?: Record<string, any>;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanesPagoResponse {
  data: PlanPago[];
  total: number;
}

export interface PlanPagoFiltros {
  busqueda?: string;
  estado?: string;
  estados?: string[];
  solicitud_id?: string;
  contacto_id?: string;
  propiedad_id?: string;
  page?: number;
  limit?: number;
}

/**
 * Obtiene los planes de pago de un tenant
 */
export async function getPlanesPago(tenantId: string, filtros?: PlanPagoFiltros): Promise<PlanesPagoResponse> {
  const params = new URLSearchParams();

  if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
  if (filtros?.estado) params.append('estado', filtros.estado);
  if (filtros?.estados) {
    filtros.estados.forEach(e => params.append('estados', e));
  }
  if (filtros?.solicitud_id) params.append('solicitud_id', filtros.solicitud_id);
  if (filtros?.contacto_id) params.append('contacto_id', filtros.contacto_id);
  if (filtros?.propiedad_id) params.append('propiedad_id', filtros.propiedad_id);
  if (filtros?.page) params.append('page', filtros.page.toString());
  if (filtros?.limit) params.append('limit', filtros.limit.toString());

  const queryString = params.toString();
  const url = `/tenants/${tenantId}/planes-pago${queryString ? `?${queryString}` : ''}`;

  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error('Error al obtener planes de pago');
  }
  return response.json();
}

/**
 * Obtiene un plan de pago por ID
 */
export async function getPlanPago(tenantId: string, planId: string): Promise<PlanPago> {
  const response = await apiFetch(`/tenants/${tenantId}/planes-pago/${planId}`);
  if (!response.ok) {
    throw new Error('Error al obtener plan de pago');
  }
  return response.json();
}

/**
 * Crea un nuevo plan de pago
 */
export async function createPlanPago(tenantId: string, data: Partial<PlanPago>): Promise<PlanPago> {
  const response = await apiFetch(`/tenants/${tenantId}/planes-pago`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear plan de pago');
  }
  return response.json();
}

/**
 * Actualiza un plan de pago
 */
export async function updatePlanPago(tenantId: string, planId: string, data: Partial<PlanPago>): Promise<PlanPago> {
  const response = await apiFetch(`/tenants/${tenantId}/planes-pago/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar plan de pago');
  }
  return response.json();
}

/**
 * Elimina un plan de pago
 */
export async function deletePlanPago(tenantId: string, planId: string): Promise<void> {
  const response = await apiFetch(`/tenants/${tenantId}/planes-pago/${planId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Error al eliminar plan de pago');
  }
}

/**
 * Cambia el estado de un plan de pago
 */
export async function cambiarEstadoPlanPago(tenantId: string, planId: string, estado: EstadoPlanPago): Promise<PlanPago> {
  const response = await apiFetch(`/tenants/${tenantId}/planes-pago/${planId}/estado`, {
    method: 'POST',
    body: JSON.stringify({ estado }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al cambiar estado del plan');
  }
  return response.json();
}

/**
 * Regenera la URL pública de un plan de pago
 */
export async function regenerarUrlPlanPago(tenantId: string, planId: string): Promise<PlanPago> {
  const response = await apiFetch(`/tenants/${tenantId}/planes-pago/${planId}/regenerar-url`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al regenerar URL');
  }
  return response.json();
}

// ==================== MEMBERSHIPS API ====================

export interface TipoMembresia {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number;
  moneda: string;
  ciclo_facturacion: string;
  usuarios_incluidos: number;
  propiedades_incluidas: number;
  costo_usuario_adicional: number;
  costo_propiedad_adicional: number;
  permite_pagina_web: boolean;
  permite_subtenants: boolean;
  es_individual: boolean;
  features_incluidos: string[];
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
  // Stats
  tenants_count?: number;
}

export interface CreateTipoMembresiaData {
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio_base: number;
  moneda?: string;
  ciclo_facturacion?: string;
  usuarios_incluidos?: number;
  propiedades_incluidas?: number;
  costo_usuario_adicional?: number;
  costo_propiedad_adicional?: number;
  permite_pagina_web?: boolean;
  permite_subtenants?: boolean;
  es_individual?: boolean;
  features_incluidos?: string[];
  orden?: number;
}

export interface UpdateTipoMembresiaData {
  nombre?: string;
  descripcion?: string;
  precio_base?: number;
  moneda?: string;
  ciclo_facturacion?: string;
  usuarios_incluidos?: number;
  propiedades_incluidas?: number;
  costo_usuario_adicional?: number;
  costo_propiedad_adicional?: number;
  permite_pagina_web?: boolean;
  permite_subtenants?: boolean;
  es_individual?: boolean;
  features_incluidos?: string[];
  activo?: boolean;
  orden?: number;
}

export interface PrecioFeature {
  id: string;
  feature_id: string;
  feature_nombre?: string;
  tipo_membresia_id: string | null;
  precio_mensual: number | null;
  precio_unico: number | null;
  moneda: string;
  activo: boolean;
  created_at: string;
}

export interface UsoTenant {
  id: string;
  tenant_id: string;
  usuarios_activos: number;
  propiedades_activas: number;
  propiedades_publicadas: number;
  usuarios_max_periodo: number;
  propiedades_max_periodo: number;
  features_activos: Array<{ feature_id: string; fecha_activacion: string; precio: number }>;
  periodo_inicio: string;
  periodo_fin: string;
  costo_base_periodo: number;
  costo_usuarios_extra: number;
  costo_propiedades_extra: number;
  costo_features_extra: number;
  costo_total_periodo: number;
  updated_at: string;
}

export interface LimitesTenant {
  usuarios_incluidos: number;
  propiedades_incluidas: number;
  limite_usuarios_override: number | null;
  limite_propiedades_override: number | null;
  costo_usuario_adicional: number;
  costo_propiedad_adicional: number;
  tipo_membresia?: TipoMembresia;
}

export interface CostosPeriodo {
  costo_base: number;
  usuarios_incluidos: number;
  usuarios_activos: number;
  usuarios_extra: number;
  costo_usuarios_extra: number;
  propiedades_incluidas: number;
  propiedades_activas: number;
  propiedades_extra: number;
  costo_propiedades_extra: number;
  features_activos: Array<{ feature_id: string; nombre: string; precio: number }>;
  costo_features_extra: number;
  subtotal: number;
  descuento: number;
  total: number;
  periodo_inicio: string;
  periodo_fin: string;
}

export interface ResumenUsoTenant {
  tenant_id: string;
  tenant_nombre: string;
  tipo_membresia_codigo: string | null;
  tipo_membresia_nombre: string | null;
  estado_cuenta: string;
  usuarios_activos: number;
  propiedades_publicadas: number;
  costo_total_periodo: number;
  periodo_inicio: string;
  periodo_fin: string;
}

/**
 * Obtiene todos los tipos de membresía
 */
export async function getTiposMembresia(incluirInactivos: boolean = false, token?: string | null): Promise<TipoMembresia[]> {
  const response = await apiFetch(`/admin/memberships?incluirInactivos=${incluirInactivos}`, {}, token);
  const data = await response.json();
  return data.tipos || data;
}

/**
 * Obtiene un tipo de membresía por ID
 */
export async function getTipoMembresiaById(id: string, token?: string | null): Promise<TipoMembresia> {
  const response = await apiFetch(`/admin/memberships/${id}`, {}, token);
  return response.json();
}

/**
 * Crea un nuevo tipo de membresía
 */
export async function createTipoMembresia(data: CreateTipoMembresiaData, token?: string | null): Promise<TipoMembresia> {
  const response = await apiFetch('/admin/memberships', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

/**
 * Actualiza un tipo de membresía
 */
export async function updateTipoMembresia(id: string, data: UpdateTipoMembresiaData, token?: string | null): Promise<TipoMembresia> {
  const response = await apiFetch(`/admin/memberships/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

/**
 * Elimina (desactiva) un tipo de membresía
 */
export async function deleteTipoMembresia(id: string, token?: string | null): Promise<void> {
  await apiFetch(`/admin/memberships/${id}`, {
    method: 'DELETE',
  }, token);
}

/**
 * Obtiene los precios de features para un tipo de membresía
 */
export async function getPreciosFeatures(tipoMembresiaId: string, token?: string | null): Promise<PrecioFeature[]> {
  const response = await apiFetch(`/admin/memberships/${tipoMembresiaId}/features`, {}, token);
  const data = await response.json();
  return data.precios || data;
}

/**
 * Establece precio de un feature para un tipo de membresía
 */
export async function setPrecioFeature(
  tipoMembresiaId: string,
  featureId: string,
  precioMensual: number | null,
  precioUnico: number | null,
  moneda: string = 'USD',
  token?: string | null
): Promise<PrecioFeature> {
  const response = await apiFetch(`/admin/memberships/${tipoMembresiaId}/features`, {
    method: 'POST',
    body: JSON.stringify({
      feature_id: featureId,
      precio_mensual: precioMensual,
      precio_unico: precioUnico,
      moneda,
    }),
  }, token);
  return response.json();
}

/**
 * Elimina precio de un feature
 */
export async function deletePrecioFeature(tipoMembresiaId: string, featureId: string, token?: string | null): Promise<void> {
  await apiFetch(`/admin/memberships/${tipoMembresiaId}/features/${featureId}`, {
    method: 'DELETE',
  }, token);
}

/**
 * Asigna membresía a un tenant
 */
export async function asignarMembresiaTenant(tenantId: string, tipoMembresiaId: string, token?: string | null): Promise<void> {
  await apiFetch(`/admin/memberships/assign/${tenantId}`, {
    method: 'PUT',
    body: JSON.stringify({ tipo_membresia_id: tipoMembresiaId }),
  }, token);
}

/**
 * Obtiene límites de un tenant
 */
export async function getLimitesTenant(tenantId: string, token?: string | null): Promise<LimitesTenant> {
  const response = await apiFetch(`/admin/memberships/limits/${tenantId}`, {}, token);
  return response.json();
}

/**
 * Establece límites personalizados para un tenant
 */
export async function setLimitesOverride(tenantId: string, limites: { usuarios?: number; propiedades?: number }, token?: string | null): Promise<LimitesTenant> {
  const response = await apiFetch(`/admin/memberships/limits/${tenantId}`, {
    method: 'PUT',
    body: JSON.stringify(limites),
  }, token);
  const data = await response.json();
  return data.limites || data;
}

/**
 * Obtiene resumen de uso de todos los tenants
 */
export async function getResumenUsoTodos(filtros?: { estado_cuenta?: string; tipo_membresia_id?: string }, token?: string | null): Promise<ResumenUsoTenant[]> {
  const params = new URLSearchParams();
  if (filtros?.estado_cuenta) params.append('estado_cuenta', filtros.estado_cuenta);
  if (filtros?.tipo_membresia_id) params.append('tipo_membresia_id', filtros.tipo_membresia_id);

  const response = await apiFetch(`/admin/memberships/usage?${params.toString()}`, {}, token);
  const data = await response.json();
  return data.data || data;
}

/**
 * Obtiene uso detallado de un tenant
 */
export async function getUsoTenant(tenantId: string, token?: string | null): Promise<{ uso: UsoTenant; costos: CostosPeriodo; limites: LimitesTenant }> {
  const response = await apiFetch(`/admin/memberships/usage/${tenantId}`, {}, token);
  return response.json();
}

/**
 * Recalcula contadores de un tenant
 */
export async function recalcularContadores(tenantId: string, token?: string | null): Promise<UsoTenant> {
  const response = await apiFetch(`/admin/memberships/usage/${tenantId}/recalculate`, {
    method: 'POST',
  }, token);
  const data = await response.json();
  return data.uso || data;
}

/**
 * Calcula factura pendiente de un tenant
 */
export async function calcularFacturaTenant(tenantId: string, token?: string | null): Promise<CostosPeriodo> {
  const response = await apiFetch(`/admin/memberships/usage/${tenantId}/calculate`, {}, token);
  return response.json();
}

// ==================== BILLING CALCULATION API ====================

export interface CalculoFactura {
  tenant_id: string;
  tenant_nombre: string;
  tipo_membresia_id: string | null;
  tipo_membresia_nombre: string | null;
  periodo: {
    inicio: string;
    fin: string;
  };
  costo_base: number;
  usuarios_incluidos: number;
  usuarios_activos: number;
  usuarios_max_periodo: number;
  usuarios_extra: number;
  costo_usuario_adicional: number;
  costo_usuarios_extra: number;
  propiedades_incluidas: number;
  propiedades_publicadas: number;
  propiedades_max_periodo: number;
  propiedades_extra: number;
  costo_propiedad_adicional: number;
  costo_propiedades_extra: number;
  features_extra: Array<{ feature_id: string; nombre: string; precio_mensual: number }>;
  costo_features_extra: number;
  subtotal: number;
  descuento: number;
  descuento_porcentaje: number;
  descripcion_descuento: string | null;
  total: number;
  moneda: string;
}

export interface EstadoCuenta {
  tenant_id: string;
  tenant_nombre: string;
  estado: 'al_dia' | 'por_vencer' | 'vencido' | 'suspendido';
  saldo_pendiente: number;
  fecha_ultimo_pago: string | null;
  facturas_pendientes: number;
  facturas_vencidas: number;
  proxima_factura?: {
    monto_estimado: number;
    fecha_emision: string;
  };
}

export interface FacturaDetallada extends Factura {
  costo_base: number;
  costo_usuarios_extra: number;
  cantidad_usuarios_extra: number;
  costo_propiedades_extra: number;
  cantidad_propiedades_extra: number;
  costo_features: number;
  features_facturados: Array<{ feature_id: string; nombre: string; precio: number }>;
  descuento: number;
  descripcion_descuento: string | null;
  subtotal: number;
  tipo_membresia_nombre: string | null;
}

export interface ResumenFacturacion {
  total_facturado: number;
  total_cobrado: number;
  total_pendiente: number;
  total_vencido: number;
  moneda: string;
  por_estado: Array<{ estado: string; cantidad: number; monto: number }>;
  por_membresia: Array<{ tipo: string; cantidad: number; monto: number }>;
}

/**
 * Obtiene el cálculo de factura de un tenant (sin generar)
 */
export async function getCalculoFactura(tenantId: string, token?: string | null): Promise<CalculoFactura> {
  const response = await apiFetch(`/admin/billing/calculate/${tenantId}`, {}, token);
  return response.json();
}

/**
 * Genera una factura para un tenant
 */
export async function generarFactura(tenantId: string, opciones?: {
  fecha_vencimiento?: string;
  notas?: string;
  forzar?: boolean;
}, token?: string | null): Promise<Factura> {
  const response = await apiFetch(`/admin/billing/generate/${tenantId}`, {
    method: 'POST',
    body: JSON.stringify(opciones || {}),
  }, token);
  return response.json();
}

/**
 * Obtiene factura detallada por ID
 */
export async function getFacturaDetallada(facturaId: string, token?: string | null): Promise<FacturaDetallada> {
  const response = await apiFetch(`/admin/billing/facturas/${facturaId}`, {}, token);
  return response.json();
}

/**
 * Cambia el estado de una factura
 */
export async function cambiarEstadoFactura(facturaId: string, estado: string, opciones?: {
  metodo_pago?: string;
  referencia_pago?: string;
  notas?: string;
}, token?: string | null): Promise<void> {
  await apiFetch(`/admin/billing/facturas/${facturaId}/estado`, {
    method: 'PUT',
    body: JSON.stringify({ estado, ...opciones }),
  }, token);
}

/**
 * Registra un pago para un tenant
 */
export async function registrarPago(tenantId: string, data: {
  monto: number;
  factura_id?: string;
  metodo_pago?: string;
  referencia_pago?: string;
  notas?: string;
}, token?: string | null): Promise<{
  monto_aplicado: number;
  facturas_pagadas: string[];
  saldo_restante: number;
}> {
  const response = await apiFetch(`/admin/billing/payment/${tenantId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  return response.json();
}

/**
 * Obtiene estado de cuenta de un tenant
 */
export async function getEstadoCuentaTenant(tenantId: string, token?: string | null): Promise<EstadoCuenta> {
  const response = await apiFetch(`/admin/billing/account/${tenantId}`, {}, token);
  return response.json();
}

/**
 * Obtiene proyección de costo mensual
 */
export async function getProyeccionCosto(tenantId: string, token?: string | null): Promise<{
  tenant_id: string;
  costo_actual: number;
  costo_proyectado: number;
  moneda: string;
  desglose: {
    base: number;
    usuarios_extra: number;
    propiedades_extra: number;
    features: number;
  };
  tendencia: string;
  nota?: string;
}> {
  const response = await apiFetch(`/admin/billing/projection/${tenantId}`, {}, token);
  return response.json();
}

/**
 * Obtiene resumen de facturación
 */
export async function getResumenFacturacion(filtros?: {
  mes?: number;
  anio?: number;
  estado?: string;
}, token?: string | null): Promise<ResumenFacturacion> {
  const params = new URLSearchParams();
  if (filtros?.mes) params.append('mes', filtros.mes.toString());
  if (filtros?.anio) params.append('anio', filtros.anio.toString());
  if (filtros?.estado) params.append('estado', filtros.estado);

  const response = await apiFetch(`/admin/billing/resumen?${params.toString()}`, {}, token);
  return response.json();
}

