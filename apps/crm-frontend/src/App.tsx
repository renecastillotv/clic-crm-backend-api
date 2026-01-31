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
import VerificarCertificado from './pages/VerificarCertificado';

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
import AdminRolPermisos from './pages/admin/AdminRolPermisos';
import AdminRolFieldPermisos from './pages/admin/AdminRolFieldPermisos';
import AdminUbicaciones from './pages/admin/AdminUbicaciones';
import AdminTagsGlobal from './pages/admin/AdminTagsGlobal';
import AdminMemberships from './pages/admin/AdminMemberships';
import AdminUsage from './pages/admin/AdminUsage';

// Páginas CRM
import CrmDashboard from './pages/crm/CrmDashboard';
import CrmPropiedades from './pages/crm/CrmPropiedades';
import CrmPropiedadDetalle from './pages/crm/CrmPropiedadDetalle';
import CrmPropiedadEditar from './pages/crm/CrmPropiedadEditar';
import CrmImportaciones from './pages/crm/CrmImportaciones';
import CrmClientes from './pages/crm/CrmClientes';
import CrmContactos from './pages/crm/CrmContactos';
import ContactoDetalle from './pages/crm/ContactoDetalle';
import CrmSolicitudes from './pages/crm/CrmSolicitudes';
import SolicitudDetalle from './pages/crm/SolicitudDetalle';
import CrmPropuestas from './pages/crm/CrmPropuestas';
import CrmPropuestaEditar from './pages/crm/CrmPropuestaEditar';
import CrmPlanesPago from './pages/crm/CrmPlanesPago';
import CrmPlanPagoEditar from './pages/crm/CrmPlanPagoEditar';
import CrmActividades from './pages/crm/CrmActividades';
import CrmMetas from './pages/crm/CrmMetas';
import CrmEquipo from './pages/crm/CrmEquipo';
import CrmConfiguracion from './pages/crm/CrmConfiguracion';
import CrmContenidoPermisosConfiguracion from './pages/crm/CrmContenidoPermisosConfiguracion';
import { CrmWebPaginas, CrmWebSecciones, CrmWebSeccionEditar, CrmWebTema, CrmWebPaginaEditar } from './pages/crm/web';

// Páginas de Finanzas
import CrmFinanzasVentas from './pages/crm/CrmFinanzasVentas';
import CrmFinanzasVentaDetalle from './pages/crm/CrmFinanzasVentaDetalle';
import CrmFinanzasComisiones from './pages/crm/CrmFinanzasComisiones';
import CrmFinanzasFacturas from './pages/crm/CrmFinanzasFacturas';
import CrmFinanzasConfiguracion from './pages/crm/CrmFinanzasConfiguracion';

// Páginas de Mensajería (sub-rutas en sidebar)
import CrmMensajeriaChats from './pages/crm/CrmMensajeriaChats';
import CrmMensajeriaCorreo from './pages/crm/CrmMensajeriaCorreo';
import CrmMensajeriaConfiguracion from './pages/crm/CrmMensajeriaConfiguracion';
// Documentos - Nuevo sistema simplificado
import CrmMisDocumentos from './pages/crm/CrmMisDocumentos';
import CrmDocumentosConfiguracion from './pages/crm/CrmDocumentosConfiguracion';
// Legacy imports para redirects de compatibilidad
import CrmDocumentosBiblioteca from './pages/crm/CrmDocumentosBiblioteca';
import CrmDocumentosPlantillas from './pages/crm/CrmDocumentosPlantillas';
import CrmDocumentosGenerar from './pages/crm/CrmDocumentosGenerar';
import CrmDocumentosGenerados from './pages/crm/CrmDocumentosGenerados';

// Páginas de Contenido y CLIC Connect
import CrmContenido from './pages/crm/CrmContenido';
import CrmClicConnect from './pages/crm/CrmClicConnect';
import CrmClicConnectSolicitudes from './pages/crm/CrmClicConnectSolicitudes';
import CrmClicConnectUpgradeRequests from './pages/crm/CrmClicConnectUpgradeRequests';

// Páginas de University
import CrmUniversity from './pages/crm/CrmUniversity';
import CrmUniversityCursoEditar from './pages/crm/CrmUniversityCursoEditar';
import CrmUniversityCertificados from './pages/crm/CrmUniversityCertificados';
import CrmUniversityCertificadoEditar from './pages/crm/CrmUniversityCertificadoEditar';
import CrmUniversityCertificadosEmitidos from './pages/crm/CrmUniversityCertificadosEmitidos';

// Mi Entrenamiento (consumo de cursos por usuarios)
import MiEntrenamiento from './pages/crm/MiEntrenamiento';
import MiEntrenamientoCurso from './pages/crm/MiEntrenamientoCurso';

// Editores de Contenido
import CrmArticuloEditor from './pages/crm/contenido/CrmArticuloEditor';
import CrmVideoEditor from './pages/crm/contenido/CrmVideoEditor';
import CrmFaqEditor from './pages/crm/contenido/CrmFaqEditor';
import CrmTestimonioEditor from './pages/crm/contenido/CrmTestimonioEditor';
import CrmSeoStatEditor from './pages/crm/contenido/CrmSeoStatEditor';

// Páginas de Sistema de Fases y Productividad
import CrmSistemaFases from './pages/crm/CrmSistemaFases';
import CrmSistemaFasesConfiguracion from './pages/crm/CrmSistemaFasesConfiguracion';
import CrmProductividad from './pages/crm/CrmProductividad';
import CrmProductividadConfiguracion from './pages/crm/CrmProductividadConfiguracion';

// Páginas de Marketing
import CrmMarketing from './pages/crm/CrmMarketing';
import CrmMarketingApiConfig from './pages/crm/CrmMarketingApiConfig';
import CrmMarketingCreativos from './pages/crm/CrmMarketingCreativos';
import CrmMarketingCampanas from './pages/crm/CrmMarketingCampanas';
import CrmMarketingRedesSociales from './pages/crm/CrmMarketingRedesSociales';
import CrmMarketingAnalytics from './pages/crm/CrmMarketingAnalytics';
import CrmMarketingImageConverter from './pages/crm/CrmMarketingImageConverter';
import CrmMarketingFlyerGenerator from './pages/crm/CrmMarketingFlyerGenerator';
import CrmMarketingStoriesCreator from './pages/crm/CrmMarketingStoriesCreator';
import CrmMarketingTemplates from './pages/crm/CrmMarketingTemplates';
import CrmMarketingCampanaDetalle from './pages/crm/CrmMarketingCampanaDetalle';
import CrmMarketingLeads from './pages/crm/CrmMarketingLeads';

// Páginas de Roles del Tenant
import CrmRoles from './pages/crm/CrmRoles';
import CrmRolEditar from './pages/crm/CrmRolEditar';

// Páginas de Configuración adicionales
import CrmUsuarios from './pages/crm/CrmUsuarios';
import CrmUsuarioEditar from './pages/crm/CrmUsuarioEditar';
import CrmInfoNegocio from './pages/crm/CrmInfoNegocio';
import CrmEquiposConfig from './pages/crm/CrmEquiposConfig';
import CrmOficinasConfig from './pages/crm/CrmOficinasConfig';
import CrmCatalogosConfig from './pages/crm/CrmCatalogosConfig';
import CrmCatalogoEditar from './pages/crm/CrmCatalogoEditar';
import CrmAmenidadesConfig from './pages/crm/CrmAmenidadesConfig';
import CrmFuentesLeadConfig from './pages/crm/CrmFuentesLeadConfig';
import CrmExtensionesContactoConfig from './pages/crm/CrmExtensionesContactoConfig';

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
      <Route path="/verificar" element={<VerificarCertificado />} />
      <Route path="/verificar/:codigo" element={<VerificarCertificado />} />

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
                <Route path="roles/permisos" element={<AdminRolPermisos />} />
                <Route path="roles/:rolId/campos/:moduloId" element={<AdminRolFieldPermisos />} />
                <Route path="ubicaciones" element={<AdminUbicaciones />} />
                <Route path="tags-global" element={<AdminTagsGlobal />} />
                <Route path="memberships" element={<AdminMemberships />} />
                <Route path="usage" element={<AdminUsage />} />
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

        {/* Propiedades */}
        <Route path="propiedades" element={<CrmPropiedades />} />
        <Route path="propiedades/nueva" element={<CrmPropiedadEditar />} />
        <Route path="propiedades/importar" element={<CrmImportaciones />} />
        <Route path="propiedades/:propiedadId" element={<CrmPropiedadDetalle />} />
        <Route path="propiedades/:propiedadId/editar" element={<CrmPropiedadEditar />} />

        {/* CRM Core */}
        <Route path="contactos" element={<CrmContactos />} />
        <Route path="contactos/:contactoId" element={<ContactoDetalle />} />
        <Route path="pipeline" element={<CrmSolicitudes />} />
        <Route path="pipeline/:solicitudId" element={<SolicitudDetalle />} />
        <Route path="propuestas" element={<CrmPropuestas />} />
        <Route path="propuestas/nueva" element={<CrmPropuestaEditar />} />
        <Route path="propuestas/:propuestaId" element={<CrmPropuestaEditar />} />
        <Route path="planes-pago" element={<CrmPlanesPago />} />
        <Route path="planes-pago/nuevo" element={<CrmPlanPagoEditar />} />
        <Route path="planes-pago/:planId" element={<CrmPlanPagoEditar />} />
        <Route path="actividades" element={<CrmActividades />} />
        <Route path="metas" element={<CrmMetas />} />
        <Route path="clientes" element={<CrmClientes />} />
        <Route path="equipo" element={<CrmEquipo />} />

        {/* Contenido y CLIC Connect */}
        <Route path="contenido" element={<CrmContenido />} />
        <Route path="clic-connect" element={<CrmClicConnect />} />
        <Route path="clic-connect/solicitudes" element={<CrmClicConnectSolicitudes />} />
        <Route path="clic-connect/upgrade-requests" element={<CrmClicConnectUpgradeRequests />} />

        {/* University */}
        <Route path="university" element={<CrmUniversity />} />
        <Route path="university/cursos/:cursoId" element={<CrmUniversityCursoEditar />} />
        <Route path="university/certificados" element={<CrmUniversityCertificados />} />
        <Route path="university/certificados/nuevo" element={<CrmUniversityCertificadoEditar />} />
        <Route path="university/certificados/:certificadoId" element={<CrmUniversityCertificadoEditar />} />
        <Route path="university/certificados-emitidos" element={<CrmUniversityCertificadosEmitidos />} />

        {/* Mi Entrenamiento */}
        <Route path="mi-entrenamiento" element={<MiEntrenamiento />} />
        <Route path="mi-entrenamiento/curso/:cursoId" element={<MiEntrenamientoCurso />} />

        {/* Finanzas */}
        <Route path="finanzas/ventas" element={<CrmFinanzasVentas />} />
        <Route path="finanzas/ventas/:ventaId" element={<CrmFinanzasVentaDetalle />} />
        <Route path="finanzas/comisiones" element={<CrmFinanzasComisiones />} />
        <Route path="finanzas/facturas" element={<CrmFinanzasFacturas />} />
        <Route path="finanzas/configuracion" element={<CrmFinanzasConfiguracion />} />

        {/* Mensajería (sub-rutas en sidebar) */}
        <Route path="mensajeria" element={<Navigate to="mensajeria/chats" replace />} />
        <Route path="mensajeria/chats" element={<CrmMensajeriaChats />} />
        <Route path="mensajeria/correo" element={<CrmMensajeriaCorreo />} />
        <Route path="mensajeria/configuracion" element={<CrmMensajeriaConfiguracion />} />

        {/* Documentos - Nueva estructura simplificada */}
        <Route path="documentos" element={<CrmMisDocumentos />} />
        <Route path="documentos/configuracion" element={<CrmDocumentosConfiguracion />} />
        {/* Redirects de compatibilidad para URLs antiguas */}
        <Route path="documentos/biblioteca" element={<Navigate to="../documentos" replace />} />
        <Route path="documentos/plantillas" element={<Navigate to="../documentos/configuracion" replace />} />
        <Route path="documentos/generar" element={<Navigate to="../documentos" replace />} />
        <Route path="documentos/generados" element={<Navigate to="../documentos" replace />} />

        {/* Marketing Centro */}
        <Route path="marketing" element={<CrmMarketing />} />

        {/* Creativos - wrapper con Outlet */}
        <Route path="marketing/creativos" element={<CrmMarketingCreativos />}>
          <Route index element={<Navigate to="artes" replace />} />
          <Route path="artes" element={<CrmMarketingImageConverter />} />
          <Route path="flyers" element={<CrmMarketingFlyerGenerator />} />
          <Route path="stories" element={<CrmMarketingStoriesCreator />} />
          <Route path="plantillas" element={<CrmMarketingTemplates />} />
        </Route>

        {/* Campanas multi-proveedor */}
        <Route path="marketing/campanas" element={<CrmMarketingCampanas />} />
        <Route path="marketing/campanas/:campaignId" element={<CrmMarketingCampanaDetalle />} />

        {/* Redes, Leads, Analytics, Config */}
        <Route path="marketing/redes-sociales" element={<CrmMarketingRedesSociales />} />
        <Route path="marketing/leads" element={<CrmMarketingLeads />} />
        <Route path="marketing/analytics" element={<CrmMarketingAnalytics />} />
        <Route path="marketing/configuracion" element={<CrmMarketingApiConfig />} />

        {/* Redirects de compatibilidad */}
        <Route path="marketing/branding" element={<Navigate to="../marketing/creativos" replace />} />
        <Route path="marketing/email" element={<Navigate to="../marketing/campanas" replace />} />
        <Route path="marketing/convertir-imagenes" element={<Navigate to="../marketing/creativos/artes" replace />} />
        <Route path="marketing/flyers" element={<Navigate to="../marketing/creativos/flyers" replace />} />
        <Route path="marketing/stories" element={<Navigate to="../marketing/creativos/stories" replace />} />
        <Route path="marketing/plantillas" element={<Navigate to="../marketing/creativos/plantillas" replace />} />
        <Route path="marketing/configuracion-apis" element={<Navigate to="../marketing/configuracion" replace />} />

        {/* Sistema de Fases y Productividad */}
        <Route path="sistema-fases" element={<CrmSistemaFases />} />
        <Route path="sistema-fases/configuracion" element={<CrmSistemaFasesConfiguracion />} />
        <Route path="productividad" element={<CrmProductividad />} />
        <Route path="productividad/configuracion" element={<CrmProductividadConfiguracion />} />

        {/* Usuarios */}
        <Route path="usuarios" element={<CrmUsuarios />} />
        <Route path="usuarios/nuevo" element={<CrmUsuarioEditar />} />
        <Route path="usuarios/:usuarioId" element={<CrmUsuarioEditar />} />

        {/* Roles del Tenant */}
        <Route path="roles" element={<CrmRoles />} />
        <Route path="roles/:rolId" element={<CrmRolEditar />} />

        {/* Configuración (Web, Tema, General) */}
        <Route path="web/paginas" element={<CrmWebPaginas />} />
        <Route path="web/paginas/:paginaId" element={<CrmWebPaginaEditar />} />
        <Route path="web/paginas/nueva" element={<CrmWebPaginaEditar />} />
        <Route path="web/secciones" element={<CrmWebSecciones />} />
        <Route path="web/secciones/:tipoSeccion" element={<CrmWebSeccionEditar />} />
        <Route path="web/tema" element={<CrmWebTema />} />
        <Route path="configuracion" element={<CrmConfiguracion />} />

        {/* Configuración sub-páginas */}
        <Route path="configuracion/negocio" element={<CrmInfoNegocio />} />
        <Route path="configuracion/equipos" element={<CrmEquiposConfig />} />
        <Route path="configuracion/oficinas" element={<CrmOficinasConfig />} />
        <Route path="configuracion/personalizar" element={<CrmCatalogosConfig />} />
        <Route path="configuracion/catalogos/:tipo" element={<CrmCatalogoEditar />} />
        <Route path="configuracion/amenidades" element={<CrmAmenidadesConfig />} />
        <Route path="configuracion/fuentes-lead" element={<CrmFuentesLeadConfig />} />
        <Route path="configuracion/extensiones-contacto" element={<CrmExtensionesContactoConfig />} />
        <Route path="configuracion/contenido-permisos" element={<CrmContenidoPermisosConfiguracion />} />

        {/* Contenido editores */}
        <Route path="contenido/articulos/nuevo" element={<CrmArticuloEditor />} />
        <Route path="contenido/articulos/:id" element={<CrmArticuloEditor />} />
        <Route path="contenido/videos/nuevo" element={<CrmVideoEditor />} />
        <Route path="contenido/videos/:id" element={<CrmVideoEditor />} />
        <Route path="contenido/faqs/nuevo" element={<CrmFaqEditor />} />
        <Route path="contenido/faqs/:id" element={<CrmFaqEditor />} />
        <Route path="contenido/testimonios/nuevo" element={<CrmTestimonioEditor />} />
        <Route path="contenido/testimonios/:id" element={<CrmTestimonioEditor />} />
        <Route path="contenido/seo-stats/nuevo" element={<CrmSeoStatEditor />} />
        <Route path="contenido/seo-stats/:id" element={<CrmSeoStatEditor />} />
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
