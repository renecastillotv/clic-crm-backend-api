/**
 * AdminTenants - Gestión de tenants
 * Usa datos reales de la API
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { getAllTenants, TenantAdmin, toggleTenantStatus, deleteTenant } from '../../services/api';

export default function AdminTenants() {
  const { getToken } = useAuth();
  const [tenants, setTenants] = useState<TenantAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const navigate = useNavigate();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación. Por favor, inicia sesión nuevamente.');
      }
      const data = await getAllTenants(token);
      setTenants(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tenants');
      console.error('Error cargando tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeTenants = showInactive ? tenants : tenants.filter(t => t.activo);
  const filteredTenants = activeTenants.filter(
    (t) =>
      t.nombre.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditTenant = (tenant: TenantAdmin) => {
    navigate(`/admin/tenants/${tenant.id}/edit`);
  };

  const handleToggleStatus = async (tenant: TenantAdmin) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      await toggleTenantStatus(tenant.id, !tenant.activo, token);
      await loadTenants(); // Recargar lista
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado del tenant');
      console.error('Error cambiando estado:', err);
    }
  };

  const handleDeleteTenant = async (tenant: TenantAdmin) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el tenant "${tenant.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      await deleteTenant(tenant.id, token);
      await loadTenants(); // Recargar lista
    } catch (err: any) {
      setError(err.message || 'Error al eliminar tenant');
      console.error('Error eliminando tenant:', err);
    }
  };

  if (loading) {
    return (
      <div className="admin-tenants-loading">
        <div className="loading-spinner"></div>
        <p>Cargando tenants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-tenants-error">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3>Error al cargar datos</h3>
        <p>{error}</p>
        <button onClick={loadTenants} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="admin-tenants">
      <div className="page-header">
        <div>
          <h1>Gestión de Tenants</h1>
          <p className="page-subtitle">
            Administra todas las organizaciones de la plataforma
          </p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => navigate('/admin/tenants/new')}
        >
          <span className="btn-icon">+</span>
          Nuevo Tenant
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="filters-section">
        <div className="search-container">
          <span className="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filters-right">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Vista de tarjetas"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3H10V10H3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 3H21V10H14V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 14H10V21H3V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 14H21V21H14V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista de lista"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <label className="toggle-filter">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            <span className="toggle-label">Mostrar inactivos</span>
          </label>
          <div className="filters-stats">
            <span className="filter-stat">
              Mostrando: <strong>{filteredTenants.length}</strong> de {tenants.length} tenants
            </span>
          </div>
        </div>
      </div>

      {/* Vista en tarjetas de tenants */}
      {filteredTenants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 21H21M5 21V7L12 3L19 7V21M5 21H19M9 9V17M15 9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>
            {search ? 'No se encontraron tenants' : 'No hay tenants registrados'}
          </h3>
          <p>
            {search
              ? 'Intenta con otros términos de búsqueda'
              : 'Comienza creando tu primer tenant'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="tenants-grid">
          {filteredTenants.map((tenant) => (
          <TenantCard
            key={tenant.id}
            tenant={tenant}
            onEdit={() => handleEditTenant(tenant)}
            onToggleStatus={() => handleToggleStatus(tenant)}
            onDelete={() => handleDeleteTenant(tenant)}
          />
          ))}
        </div>
      ) : (
        <div className="tenants-list">
          <div className="tenants-list-header">
            <div className="list-col-name">Tenant</div>
            <div className="list-col-stats">Usuarios</div>
            <div className="list-col-stats">Propiedades</div>
            <div className="list-col-stats">Páginas</div>
            <div className="list-col-status">Estado</div>
            <div className="list-col-date">Fecha Creación</div>
            <div className="list-col-actions">Acciones</div>
          </div>
          {filteredTenants.map((tenant) => (
            <TenantListItem
              key={tenant.id}
              tenant={tenant}
              onEdit={() => handleEditTenant(tenant)}
              onToggleStatus={() => handleToggleStatus(tenant)}
              onDelete={() => handleDeleteTenant(tenant)}
            />
          ))}
        </div>
      )}


      <style>{`
        .admin-tenants {
          max-width: 1600px;
        }

        .admin-tenants-loading,
        .admin-tenants-error {
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
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .retry-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 2.25rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          margin: 0;
          color: #64748B;
          font-size: 1rem;
          font-weight: 400;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
        }

        .btn-icon {
          font-size: 1.25rem;
        }

        .filters-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          gap: 20px;
        }

        .filters-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .view-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 4px;
        }

        .view-toggle-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          color: #64748B;
          transition: all 0.2s;
        }

        .view-toggle-btn:hover {
          background: #F1F5F9;
          color: #334155;
        }

        .view-toggle-btn.active {
          background: #FFFFFF;
          color: #2563EB;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .toggle-filter {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          color: #334155;
          white-space: nowrap;
        }

        .toggle-filter input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .toggle-label {
          user-select: none;
        }

        .search-container {
          position: relative;
          flex: 1;
          max-width: 500px;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          color: #0F172A;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .search-input::placeholder {
          color: #94A3B8;
        }

        .filters-stats {
          display: flex;
          gap: 20px;
        }

        .filter-stat {
          color: #64748B;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .filter-stat strong {
          color: #0F172A;
          font-weight: 700;
        }

        .empty-state {
          text-align: center;
          padding: 64px 32px;
          background: #FFFFFF;
          border: 2px dashed #CBD5E1;
          border-radius: 16px;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CBD5E1;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: #0F172A;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .empty-state p {
          margin: 0;
          color: #64748B;
          font-size: 0.9375rem;
        }

        .tenants-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .tenant-card {
          position: relative;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s ease;
          cursor: pointer;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .tenant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          border-color: #CBD5E1;
        }

        .tenant-card-header {
          display: flex;
          align-items: start;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .tenant-card-logo-section {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .tenant-card-avatar {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          font-size: 1.5rem;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          flex-shrink: 0;
        }

        .tenant-card-info h3 {
          margin: 0 0 6px 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #0F172A;
        }

        .tenant-card-info .tenant-slug {
          font-size: 0.8125rem;
          color: #64748B;
          font-family: 'Courier New', monospace;
        }

        .tenant-card-status {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .tenant-card-status.status-active {
          background: #D1FAE5;
          color: #059669;
        }

        .tenant-card-status.status-inactive {
          background: #FEE2E2;
          color: #DC2626;
        }

        .tenant-card-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .tenant-card-stat {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 12px;
          text-align: center;
        }

        .tenant-card-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 4px;
        }

        .tenant-card-stat-label {
          font-size: 0.75rem;
          color: #64748B;
          font-weight: 500;
        }

        .tenant-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #E2E8F0;
        }

        .tenant-card-date {
          font-size: 0.8125rem;
          color: #64748B;
          font-weight: 500;
        }

        .tenant-card-actions {
          display: flex;
          gap: 8px;
        }

        .tenant-card-action-btn {
          width: 36px;
          height: 36px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: #475569;
          padding: 0;
        }

        .tenant-card-action-btn svg {
          width: 18px;
          height: 18px;
        }

        .tenant-card-action-btn:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          color: #2563EB;
        }

        .tenant-card-action-btn-danger {
          color: #DC2626;
        }

        .tenant-card-action-btn-danger:hover {
          background: #FEE2E2;
          border-color: #FECACA;
          color: #B91C1C;
        }

        /* Vista de Lista */
        .tenants-list {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          overflow: hidden;
        }

        .tenants-list-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 120px 140px 120px;
          gap: 16px;
          padding: 16px 20px;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .list-col-name {
          grid-column: 1;
        }

        .list-col-stats {
          text-align: center;
        }

        .list-col-status {
          text-align: center;
        }

        .list-col-date {
          text-align: center;
        }

        .list-col-actions {
          text-align: center;
        }

        .tenant-list-item {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 120px 140px 120px;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid #E2E8F0;
          transition: background 0.2s;
          align-items: center;
        }

        .tenant-list-item:last-child {
          border-bottom: none;
        }

        .tenant-list-item:hover {
          background: #F8FAFC;
        }

        .tenant-list-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tenant-list-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          font-size: 1.125rem;
          flex-shrink: 0;
        }

        .tenant-list-details h4 {
          margin: 0 0 4px 0;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0F172A;
        }

        .tenant-list-details .tenant-slug {
          font-size: 0.8125rem;
          color: #64748B;
          font-family: 'Courier New', monospace;
        }

        .tenant-list-stat {
          text-align: center;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0F172A;
        }

        .tenant-list-status {
          display: flex;
          justify-content: center;
        }

        .tenant-list-date {
          text-align: center;
          font-size: 0.8125rem;
          color: #64748B;
          font-weight: 500;
        }

        .tenant-list-actions {
          display: flex;
          justify-content: center;
          gap: 6px;
        }
      `}</style>
    </div>
  );
}

/**
 * Tarjeta de Tenant - Vista en grid
 */
function TenantCard({ 
  tenant, 
  onEdit,
  onToggleStatus,
  onDelete
}: { 
  tenant: TenantAdmin; 
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="tenant-card">
      <div className="tenant-card-header">
        <div className="tenant-card-logo-section">
          <div className="tenant-card-avatar">
            {tenant.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="tenant-card-info">
            <h3>{tenant.nombre}</h3>
            <div className="tenant-slug">/{tenant.slug}</div>
          </div>
        </div>
        <span
          className={`tenant-card-status ${
            tenant.activo ? 'status-active' : 'status-inactive'
          }`}
        >
          {tenant.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div className="tenant-card-stats">
        <div className="tenant-card-stat">
          <div className="tenant-card-stat-value">{tenant.totalUsuarios || 0}</div>
          <div className="tenant-card-stat-label">Usuarios</div>
        </div>
        <div className="tenant-card-stat">
          <div className="tenant-card-stat-value">{tenant.totalPropiedades || 0}</div>
          <div className="tenant-card-stat-label">Propiedades</div>
        </div>
        <div className="tenant-card-stat">
          <div className="tenant-card-stat-value">{tenant.totalPaginas || 0}</div>
          <div className="tenant-card-stat-label">Páginas</div>
        </div>
      </div>

      <div className="tenant-card-footer">
        <span className="tenant-card-date">
          {new Date(tenant.createdAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
        <div className="tenant-card-actions">
          <button
            className="tenant-card-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus();
            }}
            title={tenant.activo ? 'Desactivar' : 'Activar'}
          >
            {tenant.activo ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <button
            className="tenant-card-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Editar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="tenant-card-action-btn tenant-card-action-btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Eliminar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Item de Tenant - Vista en lista
 */
function TenantListItem({ 
  tenant, 
  onEdit,
  onToggleStatus,
  onDelete
}: { 
  tenant: TenantAdmin; 
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="tenant-list-item">
      <div className="tenant-list-info">
        <div className="tenant-list-avatar">
          {tenant.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="tenant-list-details">
          <h4>{tenant.nombre}</h4>
          <div className="tenant-slug">/{tenant.slug}</div>
        </div>
      </div>
      <div className="tenant-list-stat">{tenant.totalUsuarios || 0}</div>
      <div className="tenant-list-stat">{tenant.totalPropiedades || 0}</div>
      <div className="tenant-list-stat">{tenant.totalPaginas || 0}</div>
      <div className="tenant-list-status">
        <span
          className={`tenant-card-status ${
            tenant.activo ? 'status-active' : 'status-inactive'
          }`}
        >
          {tenant.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <div className="tenant-list-date">
        {new Date(tenant.createdAt).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })}
      </div>
      <div className="tenant-list-actions">
        <button
          className="tenant-card-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus();
          }}
          title={tenant.activo ? 'Desactivar' : 'Activar'}
        >
          {tenant.activo ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <button
          className="tenant-card-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Editar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          className="tenant-card-action-btn tenant-card-action-btn-danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Eliminar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
