/**
 * App.tsx - Rutas principales del CRM
 *
 * Estructura de rutas:
 * - / → Página SaaS pública
 * - /login, /signup → Autenticación con Clerk
 * - /admin/* → Panel de administración de la plataforma (solo platform admins)
 * - /crm/:tenantSlug/* → CRM de cada tenant
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import CrmLayout from './layouts/CrmLayout';

// Páginas públicas
import SaasPage from './pages/SaasPage';

// Páginas de autenticación
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

// Páginas Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTenants from './pages/admin/AdminTenants';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminTenantOnboarding from './pages/admin/AdminTenantOnboarding';
import AdminTenantEdit from './pages/admin/AdminTenantEdit';
import AdminUserCreate from './pages/admin/AdminUserCreate';
import AdminUserEdit from './pages/admin/AdminUserEdit';
import AdminUsers from './pages/admin/AdminUsers';
import AdminFeatures from './pages/admin/AdminFeatures';
import AdminFacturacion from './pages/admin/AdminFacturacion';
import AdminConfiguracion from './pages/admin/AdminConfiguracion';
import AdminRoles from './pages/admin/AdminRoles';

// Páginas CRM
import CrmDashboard from './pages/crm/CrmDashboard';
import CrmPropiedades from './pages/crm/CrmPropiedades';
import CrmClientes from './pages/crm/CrmClientes';
import CrmContactos from './pages/crm/CrmContactos';
import ContactoDetalle from './pages/crm/ContactoDetalle';
import CrmSolicitudes from './pages/crm/CrmSolicitudes';
import SolicitudDetalle from './pages/crm/SolicitudDetalle';
import CrmPropuestas from './pages/crm/CrmPropuestas';
import CrmActividades from './pages/crm/CrmActividades';
import CrmMetas from './pages/crm/CrmMetas';
import CrmEquipo from './pages/crm/CrmEquipo';
import CrmConfiguracion from './pages/crm/CrmConfiguracion';
import { CrmWebPaginas, CrmWebSecciones, CrmWebSeccionEditar, CrmWebTema, CrmWebPaginaEditar } from './pages/crm/web';

// Páginas de Finanzas
import CrmFinanzasVentas from './pages/crm/CrmFinanzasVentas';
import CrmFinanzasVentaDetalle from './pages/crm/CrmFinanzasVentaDetalle';
import CrmFinanzasFacturas from './pages/crm/CrmFinanzasFacturas';
import CrmFinanzasConfiguracion from './pages/crm/CrmFinanzasConfiguracion';

// Páginas de Mensajería
import CrmMensajeria from './pages/crm/CrmMensajeria';
import CrmMensajeriaWhatsapp from './pages/crm/CrmMensajeriaWhatsapp';
import CrmMensajeriaInstagram from './pages/crm/CrmMensajeriaInstagram';
import CrmMensajeriaFacebook from './pages/crm/CrmMensajeriaFacebook';
import CrmMensajeriaCorreo from './pages/crm/CrmMensajeriaCorreo';
import CrmMensajeriaChatVivo from './pages/crm/CrmMensajeriaChatVivo';
import CrmMensajeriaConfiguracion from './pages/crm/CrmMensajeriaConfiguracion';

// Páginas de Contenido y CLIC Connect
import CrmContenido from './pages/crm/CrmContenido';
import CrmClicConnect from './pages/crm/CrmClicConnect';
import CrmClicConnectSolicitudes from './pages/crm/CrmClicConnectSolicitudes';

// Páginas de Configuración adicionales
import CrmUsuarios from './pages/crm/CrmUsuarios';
import CrmUsuarioEditar from './pages/crm/CrmUsuarioEditar';
import CrmRoles from './pages/crm/CrmRoles';
import CrmRolEditar from './pages/crm/CrmRolEditar';
import CrmCatalogosConfig from './pages/crm/CrmCatalogosConfig';
import CrmCatalogoEditar from './pages/crm/CrmCatalogoEditar';
import CrmOficinasConfig from './pages/crm/CrmOficinasConfig';
import CrmEquiposConfig from './pages/crm/CrmEquiposConfig';
import CrmInfoNegocio from './pages/crm/CrmInfoNegocio';

import './App.css';

/**
 * RequireAuth - Wrapper que requiere autenticación
 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

/**
 * RequireAdmin - Requiere ser platform admin
 */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    // Redirigir al primer tenant del usuario o a login
    if (user?.tenants && user.tenants.length > 0) {
      return <Navigate to={`/crm/${user.tenants[0].slug}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * RequireTenantAccess - Verifica acceso al tenant específico
 */
function RequireTenantAccess({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isPlatformAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  // Platform admins tienen acceso a todos los tenants
  if (isPlatformAdmin) {
    return <>{children}</>;
  }

  // Verificar que el usuario tenga tenants
  if (!user?.tenants || user.tenants.length === 0) {
    return (
      <div className="no-access-screen">
        <h1>Sin acceso</h1>
        <p>No tienes acceso a ningún tenant.</p>
        <p>Contacta al administrador para obtener acceso.</p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * PostLoginRedirect - Redirige después del login
 */
function PostLoginRedirect() {
  const { user, isLoading, isPlatformAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Preparando tu dashboard...</p>
      </div>
    );
  }

  // Platform admin va al panel de admin
  if (isPlatformAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Usuario normal va a su primer tenant
  if (user?.tenants && user.tenants.length > 0) {
    return <Navigate to={`/crm/${user.tenants[0].slug}`} replace />;
  }

  // Sin tenants - mostrar mensaje
  return (
    <div className="no-access-screen">
      <h1>Bienvenido</h1>
      <p>Tu cuenta aún no tiene acceso a ningún CRM.</p>
      <p>El administrador de tu inmobiliaria debe agregarte.</p>
    </div>
  );
}

/**
 * AppRoutes - Definición de todas las rutas
 */
function AppRoutes() {
  return (
    <Routes>
      {/* ========== RUTAS PÚBLICAS ========== */}
      <Route path="/" element={<SaasPage />} />

      {/* ========== AUTENTICACIÓN ========== */}
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/signup/*" element={<SignupPage />} />

      {/* Post-login redirect */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <PostLoginRedirect />
          </RequireAuth>
        }
      />

      {/* ========== PANEL ADMIN ========== */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="tenants" element={<AdminTenants />} />
        <Route path="tenants/new" element={<AdminTenantOnboarding />} />
        <Route path="tenants/:tenantId/edit" element={<AdminTenantEdit />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="usuarios" element={<AdminUsers />} />
        <Route path="usuarios/new" element={<AdminUserCreate />} />
        <Route path="usuarios/:userId/edit" element={<AdminUserEdit />} />
                <Route path="features" element={<AdminFeatures />} />
                <Route path="facturacion" element={<AdminFacturacion />} />
                <Route path="configuracion" element={<AdminConfiguracion />} />
                <Route path="roles" element={<AdminRoles />} />
      </Route>

      {/* ========== CRM POR TENANT ========== */}
      <Route
        path="/crm/:tenantSlug"
        element={
          <RequireAuth>
            <RequireTenantAccess>
              <CrmLayout />
            </RequireTenantAccess>
          </RequireAuth>
        }
      >
        <Route index element={<CrmDashboard />} />
        <Route path="propiedades" element={<CrmPropiedades />} />
        <Route path="contactos" element={<CrmContactos />} />
        <Route path="contactos/:contactoId" element={<ContactoDetalle />} />
        <Route path="pipeline" element={<CrmSolicitudes />} />
        <Route path="pipeline/:solicitudId" element={<SolicitudDetalle />} />
        <Route path="propuestas" element={<CrmPropuestas />} />
        <Route path="actividades" element={<CrmActividades />} />
        <Route path="metas" element={<CrmMetas />} />
        <Route path="clientes" element={<CrmClientes />} />
        <Route path="equipo" element={<CrmEquipo />} />
        <Route path="configuracion" element={<CrmConfiguracion />} />

        {/* Web Builder */}
        <Route path="web/paginas" element={<CrmWebPaginas />} />
        <Route path="web/paginas/:paginaId" element={<CrmWebPaginaEditar />} />
        <Route path="web/paginas/nueva" element={<CrmWebPaginaEditar />} />
        <Route path="web/secciones" element={<CrmWebSecciones />} />
        <Route path="web/secciones/:tipoSeccion" element={<CrmWebSeccionEditar />} />
        <Route path="web/tema" element={<CrmWebTema />} />

        {/* Finanzas */}
        <Route path="finanzas/ventas" element={<CrmFinanzasVentas />} />
        <Route path="finanzas/ventas/:ventaId" element={<CrmFinanzasVentaDetalle />} />
        <Route path="finanzas/facturas" element={<CrmFinanzasFacturas />} />
        <Route path="finanzas/configuracion" element={<CrmFinanzasConfiguracion />} />

        {/* Mensajería */}
        <Route path="mensajeria" element={<CrmMensajeria />} />
        <Route path="mensajeria/whatsapp" element={<CrmMensajeriaWhatsapp />} />
        <Route path="mensajeria/instagram" element={<CrmMensajeriaInstagram />} />
        <Route path="mensajeria/facebook" element={<CrmMensajeriaFacebook />} />
        <Route path="mensajeria/correo" element={<CrmMensajeriaCorreo />} />
        <Route path="mensajeria/chat-vivo" element={<CrmMensajeriaChatVivo />} />
        <Route path="mensajeria/configuracion" element={<CrmMensajeriaConfiguracion />} />

        {/* Contenido y CLIC Connect */}
        <Route path="contenido" element={<CrmContenido />} />
        <Route path="clic-connect" element={<CrmClicConnect />} />
        <Route path="clic-connect/solicitudes" element={<CrmClicConnectSolicitudes />} />

        {/* Configuración adicional */}
        <Route path="usuarios" element={<CrmUsuarios />} />
        <Route path="usuarios/nuevo" element={<CrmUsuarioEditar />} />
        <Route path="usuarios/:usuarioId" element={<CrmUsuarioEditar />} />
        <Route path="roles" element={<CrmRoles />} />
        <Route path="roles/nuevo" element={<CrmRolEditar />} />
        <Route path="roles/:rolId" element={<CrmRolEditar />} />
        <Route path="catalogos" element={<CrmCatalogosConfig />} />
        <Route path="catalogos/:tipo" element={<CrmCatalogoEditar />} />
        <Route path="oficinas" element={<CrmOficinasConfig />} />
        <Route path="equipos" element={<CrmEquiposConfig />} />
        <Route path="info-negocio" element={<CrmInfoNegocio />} />
      </Route>

      {/* ========== REDIRECTS DE COMPATIBILIDAD ========== */}
      {/* Rutas antiguas que redirigen a las nuevas */}
      <Route path="/tenant/*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/tenants/*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/platform/*" element={<Navigate to="/admin" replace />} />
      <Route path="/saas" element={<Navigate to="/" replace />} />

      {/* ========== 404 ========== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/**
 * Placeholder para páginas admin no implementadas
 */
function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="admin-placeholder">
      <div className="admin-placeholder-header">
        <h1>{title}</h1>
        <p className="admin-placeholder-subtitle">Módulo en desarrollo</p>
      </div>
      <div className="admin-placeholder-content">
        <div className="admin-placeholder-icon">🚧</div>
        <p>Esta sección estará disponible próximamente</p>
        <p className="admin-placeholder-note">
          Estamos trabajando para traerte las mejores funcionalidades
        </p>
      </div>
      
      <style>{`
        .admin-placeholder {
          max-width: 800px;
        }
        
        .admin-placeholder-header {
          margin-bottom: 32px;
        }
        
        .admin-placeholder-header h1 {
          margin: 0 0 8px 0;
          font-size: 2rem;
          font-weight: 700;
          color: #f3e8ff;
          letter-spacing: -0.02em;
        }
        
        .admin-placeholder-subtitle {
          margin: 0;
          color: #a78bfa;
          font-size: 1rem;
        }
        
        .admin-placeholder-content {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(124, 58, 237, 0.02) 100%);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 16px;
          padding: 64px 40px;
          text-align: center;
        }
        
        .admin-placeholder-icon {
          font-size: 64px;
          margin-bottom: 24px;
        }
        
        .admin-placeholder-content p {
          margin: 0 0 12px 0;
          color: #ddd6fe;
          font-size: 1.125rem;
        }
        
        .admin-placeholder-note {
          color: #a78bfa !important;
          font-size: 0.9375rem !important;
          margin-top: 8px !important;
        }
      `}</style>
    </div>
  );
}

/**
 * Página 404
 */
function NotFound() {
  return (
    <div className="not-found-screen">
      <h1>404</h1>
      <p>Página no encontrada</p>
      <a href="/">Volver al inicio</a>

      <style>{`
        .not-found-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          color: #f1f5f9;
        }

        .not-found-screen h1 {
          font-size: 6rem;
          margin: 0;
          color: #3b82f6;
        }

        .not-found-screen p {
          font-size: 1.5rem;
          color: #94a3b8;
          margin: 16px 0 32px;
        }

        .not-found-screen a {
          color: #3b82f6;
          text-decoration: none;
          padding: 12px 24px;
          border: 1px solid #3b82f6;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .not-found-screen a:hover {
          background: #3b82f6;
          color: white;
        }
      `}</style>
    </div>
  );
}

/**
 * App - Componente principal
 */
function App() {
  return (
    <Router>
    <AuthProvider>
        <AppRoutes />
      </AuthProvider>
      </Router>
  );
}

export default App;
