/**
 * AdminLayout - Layout para el panel de administración de la plataforma
 * Diseño corporativo profesional con tema claro y elegante
 */

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext';

// Iconos SVG claros y reconocibles universalmente
const IconDashboard = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
    <rect x="13" y="3" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="13" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
    <rect x="13" y="13" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const IconTenants = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21H21M4 21V8L12 4L20 8V21M4 21H20M8 9V16M12 9V16M16 9V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconAnalytics = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="17" width="4" height="4" rx="1" fill="currentColor"/>
    <rect x="9" y="13" width="4" height="8" rx="1" fill="currentColor"/>
    <rect x="15" y="9" width="4" height="12" rx="1" fill="currentColor"/>
    <rect x="3" y="21" width="18" height="2" fill="currentColor"/>
  </svg>
);

const IconUsers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M3 21V19C3 15.6863 5.68629 13 9 13H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="17" cy="11" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M21 19V17C21 15.3431 19.6569 14 18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconFeatures = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
  </svg>
);

const IconBilling = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 9V7C17 5.89543 16.1046 5 15 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21H15C16.1046 21 17 20.1046 17 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 9H17M17 9L19 7M17 9L19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 13H11M7 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconRoles = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.3"/>
  </svg>
);

const IconSettings = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 1V3M12 21V23M22.98 12H20.98M3.02 12H1.02M18.31 5.69L16.9 7.1M7.1 16.9L5.69 18.31M18.31 18.31L16.9 16.9M7.1 7.1L5.69 5.69" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconPaginas = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPlantillas = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <path d="M14 14H21M17.5 14V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconUbicaciones = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C12 21 5 14.5 5 9C5 5.13 8.13 2 12 2C15.87 2 19 5.13 19 9C19 14.5 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const IconBuilding = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 14H14M6 6V8M6 10V8M10 6V8M10 10V8M2 14V3C2 2.44772 2.44772 2 3 2H8C8.55228 2 9 2.44772 9 3V6H13C13.5523 6 14 6.44772 14 7V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: IconDashboard, end: true },
    { path: '/admin/tenants', label: 'Tenants', icon: IconTenants },
    { path: '/admin/analytics', label: 'Analytics', icon: IconAnalytics },
    { path: '/admin/usuarios', label: 'Usuarios', icon: IconUsers },
    { path: '/admin/features', label: 'Features', icon: IconFeatures },
    { path: '/admin/paginas', label: 'Páginas', icon: IconPaginas },
    { path: '/admin/plantillas', label: 'Plantillas', icon: IconPlantillas },
    { path: '/admin/roles', label: 'Roles', icon: IconRoles },
    { path: '/admin/facturacion', label: 'Facturación', icon: IconBilling },
    { path: '/admin/ubicaciones', label: 'Ubicaciones', icon: IconUbicaciones },
    { path: '/admin/configuracion', label: 'Configuración', icon: IconSettings },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="url(#logoGradient)"/>
                <path d="M10 16L14 12L18 16L22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 22L14 18L18 22L22 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="logoGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2563EB"/>
                    <stop offset="1" stopColor="#1D4ED8"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="logo-text">
              <div className="logo-title">PLATFORM</div>
              <div className="logo-subtitle">Administration</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <span className="nav-icon">
                  <IconComponent />
                </span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Switch a Tenant */}
        {user?.tenants && user.tenants.length > 0 && (
          <div className="sidebar-footer">
            <div className="sidebar-section">
              <h3>Cambiar a Tenant</h3>
              <div className="tenant-switcher">
                {user.tenants.slice(0, 3).map((tenant) => (
                  <button
                    key={tenant.id}
                    className="tenant-switch-btn"
                    onClick={() => navigate(`/crm/${tenant.slug}`)}
                  >
                    <span className="tenant-switch-icon">
                      <IconBuilding />
                    </span>
                    <span className="tenant-switch-name">{tenant.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="header-left">
            <div className="header-breadcrumb">
              <span className="breadcrumb-text">Panel de Control</span>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user?.nombre || user?.email}</span>
              <span className="user-role">Administrador</span>
            </div>
            <UserButton afterSignOutUrl="/login" />
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #F8FAFC;
          color: #1E293B;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        .admin-sidebar {
          width: 280px;
          background: #FFFFFF;
          border-right: 1px solid #E2E8F0;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          position: fixed;
          height: 100vh;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .sidebar-header {
          padding: 28px 24px;
          border-bottom: 1px solid #E2E8F0;
          background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .logo-text {
          flex: 1;
        }

        .logo-title {
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #0F172A;
          text-transform: uppercase;
          line-height: 1.2;
        }

        .logo-subtitle {
          font-size: 0.75rem;
          color: #64748B;
          font-weight: 500;
          margin-top: 2px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 20px 16px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          color: #475569;
          text-decoration: none;
          border-radius: 10px;
          margin-bottom: 4px;
          transition: all 0.2s ease;
          font-weight: 500;
          font-size: 0.9375rem;
          position: relative;
        }

        .nav-item:hover {
          background: #F1F5F9;
          color: #1E293B;
        }

        .nav-item.active {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          font-weight: 600;
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: #FFFFFF;
          border-radius: 0 3px 3px 0;
        }

        .nav-icon {
          margin-right: 14px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nav-item.active .nav-icon svg {
          stroke: #FFFFFF;
          fill: none;
          stroke-width: 2.5;
        }

        .nav-item:not(.active) .nav-icon svg {
          stroke: #64748B;
          fill: none;
          stroke-width: 2;
        }

        .nav-item:hover:not(.active) .nav-icon svg {
          stroke: #334155;
          stroke-width: 2.2;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #E2E8F0;
          background: #F8FAFC;
        }

        .sidebar-section h3 {
          font-size: 0.6875rem;
          text-transform: uppercase;
          color: #64748B;
          margin: 0 0 12px 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .tenant-switcher {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tenant-switch-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 14px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .tenant-switch-btn:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
          color: #1E293B;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .tenant-switch-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748B;
        }

        .tenant-switch-btn:hover .tenant-switch-icon {
          color: #2563EB;
        }

        .tenant-switch-name {
          flex: 1;
          text-align: left;
        }

        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #F8FAFC;
          margin-left: 280px;
          min-height: 100vh;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          background: #FFFFFF;
          border-bottom: 1px solid #E2E8F0;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .header-left {
          display: flex;
          align-items: center;
        }

        .header-breadcrumb {
          display: flex;
          align-items: center;
        }

        .breadcrumb-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0F172A;
        }

        .user-role {
          font-size: 0.75rem;
          color: #64748B;
          font-weight: 500;
        }

        .admin-content {
          flex: 1;
          padding: 40px;
          overflow-y: auto;
          background: #F8FAFC;
        }

        /* Scrollbar personalizado */
        .sidebar-nav::-webkit-scrollbar,
        .admin-content::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-nav::-webkit-scrollbar-track,
        .admin-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-nav::-webkit-scrollbar-thumb,
        .admin-content::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 3px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb:hover,
        .admin-content::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>
    </div>
  );
}
