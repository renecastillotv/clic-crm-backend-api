/**
 * AdminDashboard - Dashboard principal del panel de administración
 * Usa datos reales de la API
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { getAdminStats, AdminStats } from '../../services/api';

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación. Por favor, inicia sesión nuevamente.');
      }
      const data = await getAdminStats(token);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-error">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3>Error al cargar datos</h3>
        <p>{error}</p>
        <button onClick={loadStats} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Panel de Control</h1>
        <p className="dashboard-subtitle">
          Vista general de la plataforma y estadísticas principales
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 21H21M5 21V7L12 3L19 7V21M5 21H19M9 9V17M15 9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Tenants Totales</div>
            <div className="stat-value">{stats.totalTenants}</div>
            <div className="stat-meta">
              <span className="stat-badge stat-active">
                {stats.activeTenants} activos
              </span>
              {stats.inactiveTenants > 0 && (
                <span className="stat-badge stat-inactive">
                  {stats.inactiveTenants} inactivos
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card stat-secondary">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Usuarios Totales</div>
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-meta">
              <span className="stat-text">En toda la plataforma</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-accent">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Propiedades</div>
            <div className="stat-value">{stats.totalProperties}</div>
            <div className="stat-meta">
              <span className="stat-text">Listadas en el sistema</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Tasa de Activos</div>
            <div className="stat-value">
              {stats.totalTenants > 0
                ? Math.round((stats.activeTenants / stats.totalTenants) * 100)
                : 0}
              <span className="stat-unit">%</span>
            </div>
            <div className="stat-meta">
              <span className="stat-text">Tenants activos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tenants recientes */}
      {stats.recentTenants && stats.recentTenants.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Tenants Recientes</h2>
            <Link to="/admin/tenants" className="view-all-link">
              Ver todos →
            </Link>
          </div>
          <div className="recent-tenants-list">
            {stats.recentTenants.map((tenant) => (
              <div key={tenant.id} className="recent-tenant-item">
                <div className="tenant-avatar">
                  {tenant.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="tenant-info">
                  <div className="tenant-name">{tenant.nombre}</div>
                  <div className="tenant-slug">/{tenant.slug}</div>
                </div>
                <div className="tenant-status">
                  <span
                    className={`status-badge ${
                      tenant.activo ? 'status-active' : 'status-inactive'
                    }`}
                  >
                    {tenant.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="tenant-date">
                  {new Date(tenant.createdAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Acciones Rápidas</h2>
        </div>
        <div className="quick-actions-grid">
          <Link to="/admin/tenants" className="quick-action-card">
            <div className="quick-action-icon quick-action-blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 21H21M5 21V7L12 3L19 7V21M5 21H19M9 9V17M15 9V17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="quick-action-content">
              <h3>Gestionar Tenants</h3>
              <p>Administra las inmobiliarias</p>
            </div>
            <div className="quick-action-arrow">→</div>
          </Link>
          <Link to="/admin/usuarios" className="quick-action-card">
            <div className="quick-action-icon quick-action-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="quick-action-content">
              <h3>Gestionar Usuarios</h3>
              <p>Administra usuarios de la plataforma</p>
            </div>
            <div className="quick-action-arrow">→</div>
          </Link>
          <Link to="/admin/configuracion" className="quick-action-card">
            <div className="quick-action-icon quick-action-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9867C9.5799 19.7154 9.31074 19.5053 9 19.38C8.69838 19.2469 8.36381 19.2072 8.03941 19.266C7.71502 19.3248 7.41568 19.4795 7.18 19.71L7.12 19.77C6.93425 19.956 6.71368 20.1035 6.47088 20.2041C6.22808 20.3048 5.96783 20.3566 5.705 20.3566C5.44217 20.3566 5.18192 20.3048 4.93912 20.2041C4.69632 20.1035 4.47575 19.956 4.29 19.77C4.10405 19.5843 3.95653 19.3637 3.85588 19.1209C3.75523 18.8781 3.70343 18.6178 3.70343 18.355C3.70343 18.0922 3.75523 17.8319 3.85588 17.5891C3.95653 17.3463 4.10405 17.1257 4.29 16.94L4.35 16.88C4.58054 16.6443 4.73519 16.345 4.794 16.0206C4.85282 15.6962 4.81312 15.3616 4.68 15.06C4.55324 14.7642 4.34276 14.512 4.07447 14.3343C3.80618 14.1566 3.49179 14.0613 3.17 14.06H3C2.46957 14.06 1.96086 13.8493 1.58579 13.4742C1.21071 13.0991 1 12.5904 1 12.06C1 11.5296 1.21071 11.0209 1.58579 10.6458C1.96086 10.2707 2.46957 10.06 3 10.06H3.09C3.42099 10.0523 3.742 9.94512 4.0133 9.75251C4.28459 9.5599 4.49472 9.29074 4.62 8.98C4.75312 8.67838 4.79282 8.34381 4.734 8.01941C4.67519 7.69502 4.52054 7.39568 4.29 7.16L4.23 7.1C4.04405 6.91425 3.89653 6.69368 3.79588 6.45088C3.69523 6.20808 3.64343 5.94783 3.64343 5.685C3.64343 5.42217 3.69523 5.16192 3.79588 4.91912C3.89653 4.67632 4.04405 4.45575 4.23 4.27C4.41575 4.08405 4.63632 3.93653 4.87912 3.83588C5.12192 3.73523 5.38217 3.68343 5.645 3.68343C5.90783 3.68343 6.16808 3.73523 6.41088 3.83588C6.65368 3.93653 6.87425 4.08405 7.06 4.27L7.12 4.33C7.35568 4.56054 7.65502 4.71519 7.97941 4.774C8.30381 4.83282 8.63838 4.79312 8.94 4.66H9C9.29577 4.53324 9.54802 4.32276 9.72569 4.05447C9.90337 3.78618 9.99872 3.47179 10 3.15V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="quick-action-content">
              <h3>Configuración</h3>
              <p>Configura permisos</p>
            </div>
            <div className="quick-action-arrow">→</div>
          </Link>
          <Link to="/admin/analytics" className="quick-action-card">
            <div className="quick-action-icon quick-action-orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3V21H21M7 16L12 11L16 15L21 10M21 10H17M21 10V14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="quick-action-content">
              <h3>Analytics</h3>
              <p>Ver métricas</p>
            </div>
            <div className="quick-action-arrow">→</div>
          </Link>
        </div>
      </div>

      {/* Actividad Reciente y Estado del Sistema */}
      <div className="dashboard-section-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Actividad Reciente</h2>
          </div>
          <div className="activity-list">
            {stats.recentTenants && stats.recentTenants.length > 0 ? (
              stats.recentTenants.slice(0, 4).map((tenant, index) => (
                <div key={tenant.id} className="activity-item">
                  <div className="activity-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 21H21M5 21V7L12 3L19 7V21M5 21H19M9 9V17M15 9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                  <div className="activity-content">
                    <p>
                      Nuevo tenant registrado: <strong>{tenant.nombre}</strong>
                    </p>
                    <span className="activity-time">
                      {new Date(tenant.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="activity-item">
                <div className="activity-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="activity-content">
                  <p>No hay actividad reciente</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>Estado del Sistema</h2>
          </div>
          <div className="system-status-list">
            <div className="status-item">
              <span className="status-label">API</span>
              <div className="status-indicator">
                <span className="status-dot status-operational"></span>
                <span className="status-text">Operacional</span>
              </div>
            </div>
            <div className="status-item">
              <span className="status-label">Base de Datos</span>
              <div className="status-indicator">
                <span className="status-dot status-operational"></span>
                <span className="status-text">Operacional</span>
              </div>
            </div>
            <div className="status-item">
              <span className="status-label">Almacenamiento</span>
              <div className="status-indicator">
                <span className="status-dot status-operational"></span>
                <span className="status-text">Operacional</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-dashboard {
          max-width: 1400px;
        }

        .admin-dashboard-loading,
        .admin-dashboard-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
          color: #64748B;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #E2E8F0;
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-icon {
          width: 48px;
          height: 48px;
          color: #EF4444;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .retry-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }

        .retry-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }

        .dashboard-header {
          margin-bottom: 40px;
        }

        .dashboard-header h1 {
          margin: 0 0 8px 0;
          font-size: 2.25rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
        }

        .dashboard-subtitle {
          margin: 0;
          color: #64748B;
          font-size: 1rem;
          font-weight: 400;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 28px;
          display: flex;
          gap: 20px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          border-color: #CBD5E1;
        }

        .stat-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: white;
        }

        .stat-card.stat-secondary .stat-icon {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }

        .stat-card.stat-accent .stat-icon {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .stat-card.stat-success .stat-icon {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #64748B;
          margin-bottom: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 8px;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .stat-unit {
          font-size: 1.5rem;
          color: #64748B;
        }

        .stat-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-top: 8px;
        }

        .stat-badge {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .stat-badge.stat-active {
          background: #D1FAE5;
          color: #059669;
        }

        .stat-badge.stat-inactive {
          background: #FEE2E2;
          color: #DC2626;
        }

        .stat-text {
          font-size: 0.8125rem;
          color: #64748B;
          font-weight: 500;
        }

        .dashboard-section {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.01em;
        }

        .view-all-link {
          color: #2563EB;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .view-all-link:hover {
          color: #1D4ED8;
          transform: translateX(2px);
        }

        .recent-tenants-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .recent-tenant-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .recent-tenant-item:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .tenant-avatar {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
        }

        .tenant-info {
          flex: 1;
        }

        .tenant-name {
          font-weight: 600;
          color: #0F172A;
          margin-bottom: 4px;
          font-size: 0.9375rem;
        }

        .tenant-slug {
          font-size: 0.8125rem;
          color: #64748B;
          font-family: 'Courier New', monospace;
        }

        .tenant-status {
          flex-shrink: 0;
        }

        .status-badge {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.status-active {
          background: #D1FAE5;
          color: #059669;
        }

        .status-badge.status-inactive {
          background: #FEE2E2;
          color: #DC2626;
        }

        .tenant-date {
          font-size: 0.8125rem;
          color: #64748B;
          flex-shrink: 0;
          font-weight: 500;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        .quick-action-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          text-decoration: none;
          color: inherit;
          transition: all 0.3s ease;
          cursor: pointer;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }
        
        .quick-action-card,
        .quick-action-card * {
          text-decoration: none;
        }
        
        .quick-action-card:visited,
        .quick-action-card:link {
          color: inherit;
        }

        .quick-action-card:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .quick-action-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .quick-action-blue {
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
        }

        .quick-action-green {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }

        .quick-action-purple {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        }

        .quick-action-orange {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .quick-action-content {
          flex: 1;
        }

        .quick-action-content h3 {
          margin: 0 0 6px 0;
          font-size: 1.0625rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.01em;
        }

        .quick-action-content p {
          margin: 0;
          font-size: 0.875rem;
          color: #64748B;
          font-weight: 400;
        }

        .quick-action-arrow {
          font-size: 1.5rem;
          color: #CBD5E1;
          transition: all 0.2s;
          font-weight: 300;
        }

        .quick-action-card:hover .quick-action-arrow {
          transform: translateX(4px);
          color: #2563EB;
        }

        .dashboard-section-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }

        .system-status-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .status-item:hover {
          background: #F1F5F9;
        }

        .status-label {
          font-weight: 600;
          color: #0F172A;
          font-size: 0.9375rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .status-dot.status-operational {
          background: #10B981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .status-text {
          font-size: 0.875rem;
          color: #64748B;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
