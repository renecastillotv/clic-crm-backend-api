/**
 * AdminLayout - Layout para el panel de administración de la plataforma
 * Diseño Denlla B2B Enterprise - Tema oscuro profesional
 */

import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext';

// Iconos SVG claros y reconocibles universalmente
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
    <rect x="13" y="3" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="13" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
    <rect x="13" y="13" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const IconTenants = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21H21M4 21V8L12 4L20 8V21M4 21H20M8 9V16M12 9V16M16 9V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconAnalytics = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="17" width="4" height="4" rx="1" fill="currentColor"/>
    <rect x="9" y="13" width="4" height="8" rx="1" fill="currentColor"/>
    <rect x="15" y="9" width="4" height="12" rx="1" fill="currentColor"/>
    <rect x="3" y="21" width="18" height="2" fill="currentColor"/>
  </svg>
);

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M3 21V19C3 15.6863 5.68629 13 9 13H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="17" cy="11" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M21 19V17C21 15.3431 19.6569 14 18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconFeatures = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
  </svg>
);

const IconBilling = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 9V7C17 5.89543 16.1046 5 15 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21H15C16.1046 21 17 20.1046 17 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 9H17M17 9L19 7M17 9L19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 13H11M7 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconRoles = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.3"/>
  </svg>
);

const IconPermisos = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);


const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 1V3M12 21V23M22.98 12H20.98M3.02 12H1.02M18.31 5.69L16.9 7.1M7.1 16.9L5.69 18.31M18.31 18.31L16.9 16.9M7.1 7.1L5.69 5.69" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconPaginas = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPlantillas = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <path d="M14 14H21M17.5 14V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconUbicaciones = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C12 21 5 14.5 5 9C5 5.13 8.13 2 12 2C15.87 2 19 5.13 19 9C19 14.5 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const IconTags = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.59 13.41L13.42 20.58C13.2343 20.766 13.0137 20.9135 12.7709 21.0141C12.5281 21.1148 12.2678 21.1666 12.005 21.1666C11.7422 21.1666 11.4819 21.1148 11.2391 21.0141C10.9963 20.9135 10.7757 20.766 10.59 20.58L2 12V2H12L20.59 10.59C20.9625 10.9647 21.1716 11.4716 21.1716 12C21.1716 12.5284 20.9625 13.0353 20.59 13.41Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 7H7.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconMemberships = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 20H22M4 17L2 7L7 10L12 4L17 10L22 7L20 17H4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconUsage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconBuilding = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 14H14M6 6V8M6 10V8M10 6V8M10 10V8M2 14V3C2 2.44772 2.44772 2 3 2H8C8.55228 2 9 2.44772 9 3V6H13C13.5523 6 14 6.44772 14 7V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function AdminLayout() {
  const { user } = useAuth();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setUserMenuOpen(false);
    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [userMenuOpen]);

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: IconDashboard, end: true },
    { path: '/admin/tenants', label: 'Tenants', icon: IconTenants },
    { path: '/admin/analytics', label: 'Analytics', icon: IconAnalytics },
    { path: '/admin/usuarios', label: 'Usuarios', icon: IconUsers },
    { path: '/admin/features', label: 'Features', icon: IconFeatures },
    { path: '/admin/memberships', label: 'Membresías', icon: IconMemberships },
    { path: '/admin/usage', label: 'Uso y Costos', icon: IconUsage },
    { path: '/admin/paginas', label: 'Páginas', icon: IconPaginas },
    { path: '/admin/plantillas', label: 'Plantillas', icon: IconPlantillas },
    { path: '/admin/roles', label: 'Roles', icon: IconRoles },
    { path: '/admin/roles/permisos', label: 'Permisos', icon: IconPermisos },
    { path: '/admin/facturacion', label: 'Facturación', icon: IconBilling },
    { path: '/admin/ubicaciones', label: 'Ubicaciones', icon: IconUbicaciones },
    { path: '/admin/tags-global', label: 'Tags Global', icon: IconTags },
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
                <rect width="32" height="32" rx="8" fill="#2563EB"/>
                <path d="M10 16L14 12L18 16L22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 22L14 18L18 22L22 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="logo-text">
              <div className="logo-title">DENLLA</div>
              <div className="logo-subtitle">Platform Admin</div>
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
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="header-left">
            <div className="header-breadcrumb">
              <span className="breadcrumb-text">Panel de Administración</span>
            </div>
          </div>
          <div className="header-right">
            {/* User Menu con dropdown nativo */}
            <div className="user-menu-wrapper">
              <button
                className="user-menu-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserMenuOpen(!userMenuOpen);
                }}
              >
                <span className="user-name">{user?.nombre || user?.email?.split('@')[0]}</span>
                <div className="user-avatar">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user?.nombre || 'Usuario'} />
                  ) : (
                    <span className="avatar-initials">
                      {(user?.nombre?.[0] || user?.email?.[0] || 'A').toUpperCase()}
                    </span>
                  )}
                </div>
                <IconChevronDown />
              </button>

              {userMenuOpen && (
                <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="dropdown-header">
                    <div className="dropdown-user-info">
                      <span className="dropdown-user-name">{user?.nombre} {user?.apellido}</span>
                      <span className="dropdown-user-email">{user?.email}</span>
                      <span className="dropdown-user-role">Administrador de Plataforma</span>
                    </div>
                  </div>

                  {/* Tenant Switcher */}
                  {user?.tenants && user.tenants.length > 0 && (
                    <>
                      <div className="dropdown-divider" />
                      <div className="dropdown-section">
                        <span className="dropdown-section-label">Ir a Tenant</span>
                        <div className="tenant-list">
                          {user.tenants.slice(0, 5).map((tenant) => (
                            <button
                              key={tenant.id}
                              className="dropdown-item tenant-item"
                              onClick={() => {
                                navigate(`/crm/${tenant.slug}`);
                                setUserMenuOpen(false);
                              }}
                            >
                              <IconBuilding />
                              <span>{tenant.nombre}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      // TODO: Abrir modal de perfil
                      setUserMenuOpen(false);
                    }}
                  >
                    <IconUser />
                    <span>Mi Perfil</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item dropdown-item-danger"
                    onClick={() => {
                      signOut({ redirectUrl: '/login' });
                    }}
                  >
                    <IconLogout />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        /* ========== DENLLA ADMIN THEME ========== */
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #0F1115;
          color: #FFFFFF;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        /* ========== SIDEBAR ========== */
        .admin-sidebar {
          width: 260px;
          background: #121417;
          border-right: 1px solid #2A2E34;
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .sidebar-header {
          padding: 24px 20px;
          border-bottom: 1px solid #2A2E34;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .logo-text {
          flex: 1;
        }

        .logo-title {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #FFFFFF;
        }

        .logo-subtitle {
          font-size: 0.6875rem;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
          margin-top: 2px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          border-radius: 8px;
          margin-bottom: 2px;
          transition: all 0.15s ease;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
        }

        .nav-item.active {
          background: rgba(37, 99, 235, 0.15);
          color: #60A5FA;
        }

        .nav-icon {
          margin-right: 12px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ========== MAIN CONTENT ========== */
        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #0F1115;
          margin-left: 260px;
          min-height: 100vh;
        }

        /* ========== HEADER ========== */
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          background: #121417;
          border-bottom: 1px solid #2A2E34;
        }

        .header-left {
          display: flex;
          align-items: center;
        }

        .breadcrumb-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: #FFFFFF;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        /* ========== USER MENU ========== */
        .user-menu-wrapper {
          position: relative;
        }

        .user-menu-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #2A2E34;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #FFFFFF;
        }

        .user-menu-trigger:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #3A3F45;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #2563EB;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-initials {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #FFFFFF;
        }

        /* ========== DROPDOWN ========== */
        .user-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 280px;
          background: #1A1D21;
          border: 1px solid #2A2E34;
          border-radius: 12px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          overflow: hidden;
        }

        .dropdown-header {
          padding: 16px;
          border-bottom: 1px solid #2A2E34;
        }

        .dropdown-user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dropdown-user-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #FFFFFF;
        }

        .dropdown-user-email {
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .dropdown-user-role {
          font-size: 0.75rem;
          color: #60A5FA;
          font-weight: 500;
          margin-top: 4px;
        }

        .dropdown-divider {
          height: 1px;
          background: #2A2E34;
        }

        .dropdown-section {
          padding: 12px 16px;
        }

        .dropdown-section-label {
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 600;
          display: block;
          margin-bottom: 8px;
        }

        .tenant-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #FFFFFF;
        }

        .tenant-item {
          padding: 8px 12px;
          border-radius: 6px;
        }

        .dropdown-item-danger {
          color: #F87171;
        }

        .dropdown-item-danger:hover {
          background: rgba(248, 113, 113, 0.1);
          color: #F87171;
        }

        /* ========== CONTENT ========== */
        .admin-content {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
          background: #0F1115;
        }

        /* ========== SCROLLBAR ========== */
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
          background: #2A2E34;
          border-radius: 3px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb:hover,
        .admin-content::-webkit-scrollbar-thumb:hover {
          background: #3A3F45;
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 768px) {
          .admin-sidebar {
            width: 220px;
          }
          .admin-main {
            margin-left: 220px;
          }
          .admin-header {
            padding: 12px 20px;
          }
          .admin-content {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
