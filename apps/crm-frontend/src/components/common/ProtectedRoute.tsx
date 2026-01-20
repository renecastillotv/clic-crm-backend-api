/**
 * COMPONENTE PROTECTED ROUTE
 *
 * Protege rutas basándose en:
 * 1. Autenticación (usuario logueado)
 * 2. Pertenencia al tenant
 * 3. Permisos de módulo
 *
 * Uso básico (solo autenticación):
 * <ProtectedRoute>
 *   <MiComponente />
 * </ProtectedRoute>
 *
 * Con permisos de módulo:
 * <ProtectedRoute modulo="contactos" operacion="view">
 *   <ContactosPage />
 * </ProtectedRoute>
 *
 * Con roles específicos:
 * <ProtectedRoute roles={['admin', 'super_admin']}>
 *   <AdminPage />
 * </ProtectedRoute>
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermisos, ModuloNombre, Operacion } from '../../contexts/PermisosContext';

interface ProtectedRouteProps {
  children: ReactNode;

  // Requerir módulo y operación específicos
  modulo?: ModuloNombre;
  operacion?: Operacion;

  // Requerir roles específicos
  roles?: string[];

  // Requerir que sea admin
  requireAdmin?: boolean;

  // Requerir que sea super admin
  requireSuperAdmin?: boolean;

  // Ruta a la que redirigir si no tiene acceso
  redirectTo?: string;

  // Componente alternativo a mostrar si no tiene acceso
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  modulo,
  operacion = 'view',
  roles,
  requireAdmin = false,
  requireSuperAdmin = false,
  redirectTo,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, usuarioActual, tenantActual } = useAuth();
  const { canView, canCreate, canEdit, canDelete, isAdmin, isSuperAdmin, rolNombre } = usePermisos();
  const location = useLocation();

  // Mostrar loading mientras verifica autenticación
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated || !usuarioActual) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si no tiene tenant seleccionado
  if (!tenantActual) {
    return <Navigate to="/seleccionar-tenant" state={{ from: location }} replace />;
  }

  // Verificar super admin requerido
  if (requireSuperAdmin && !isSuperAdmin) {
    if (fallback) return <>{fallback}</>;
    return <AccessDenied message="Se requieren permisos de Super Administrador" />;
  }

  // Verificar admin requerido
  if (requireAdmin && !isAdmin) {
    if (fallback) return <>{fallback}</>;
    return <AccessDenied message="Se requieren permisos de Administrador" />;
  }

  // Verificar roles específicos
  if (roles && roles.length > 0) {
    if (!rolNombre || !roles.includes(rolNombre.toLowerCase())) {
      if (fallback) return <>{fallback}</>;
      return <AccessDenied message={`Se requiere uno de los siguientes roles: ${roles.join(', ')}`} />;
    }
  }

  // Verificar permisos de módulo
  if (modulo) {
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
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }
      if (fallback) return <>{fallback}</>;
      return <AccessDenied modulo={modulo} operacion={operacion} />;
    }
  }

  // Todo verificado, renderizar children
  return <>{children}</>;
}

// Componente de acceso denegado
interface AccessDeniedProps {
  message?: string;
  modulo?: ModuloNombre;
  operacion?: Operacion;
}

function AccessDenied({ message, modulo, operacion }: AccessDeniedProps) {
  const operacionTexto = {
    view: 'ver',
    create: 'crear',
    edit: 'editar',
    delete: 'eliminar',
  };

  const moduloTexto = {
    contactos: 'Contactos',
    solicitudes: 'Solicitudes',
    propiedades: 'Propiedades',
    actividades: 'Actividades',
    propuestas: 'Propuestas',
    metas: 'Metas',
    reportes: 'Reportes',
    usuarios: 'Usuarios',
    configuracion: 'Configuración',
    equipos: 'Equipos',
    oficinas: 'Oficinas',
  };

  const displayMessage = message ||
    (modulo && operacion
      ? `No tienes permiso para ${operacionTexto[operacion]} en ${moduloTexto[modulo]}`
      : 'No tienes permiso para acceder a esta sección');

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md text-center">
        <svg
          className="w-16 h-16 text-red-400 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2 className="text-xl font-semibold text-red-800 mb-2">
          Acceso Denegado
        </h2>
        <p className="text-red-600">
          {displayMessage}
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-6 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

export default ProtectedRoute;
