/**
 * AdminRoles - Gestión de Roles del Sistema
 * Permite crear, editar y eliminar roles para platform y tenants
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { 
  getAllRolesForManagement, 
  createRole, 
  updateRole, 
  deleteRole,
  getAllFeatures,
  RoleWithDates,
  CreateRoleData,
  UpdateRoleData,
  Feature
} from '../../services/api';

export default function AdminRoles() {
  const { getToken } = useAuth();
  const [roles, setRoles] = useState<RoleWithDates[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null); // Error de carga inicial
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithDates | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const data = await getAllRolesForManagement(token);
      setRoles(data);
      setLoadingError(null); // Limpiar error de carga si se carga correctamente
    } catch (err: any) {
      setLoadingError(err.message || 'Error al cargar roles');
      console.error('Error cargando roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (role: RoleWithDates) => {
    setEditingRole(role);
    setShowCreateModal(true);
  };

  const handleDelete = async (role: RoleWithDates) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el rol "${role.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setError(null); // Limpiar error previo
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      await deleteRole(role.id, token);
      await loadRoles();
    } catch (err: any) {
      // Mostrar el error pero no lanzar excepción - solo mostrar mensaje
      const errorMessage = err.message || 'Error al eliminar rol';
      setError(errorMessage);
      console.error('Error eliminando rol:', err);
      // No usar alert() - el error se muestra en el estado
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingRole(null);
  };

  const handleSaved = () => {
    handleCloseModal();
    loadRoles();
  };

  const activeRoles = showInactive ? roles : roles.filter(r => r.activo);
  const platformRoles = activeRoles.filter(r => r.tipo === 'platform');
  const tenantRoles = activeRoles.filter(r => r.tipo === 'tenant');

  const stats = {
    total: roles.length,
    platform: platformRoles.length,
    tenant: tenantRoles.length,
    active: roles.filter(r => r.activo).length,
  };

  if (loading) {
    return (
      <div className="admin-roles-loading">
        <div className="loading-spinner"></div>
        <p>Cargando roles...</p>
        <style>{`
          .admin-roles-loading {
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
        `}</style>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="admin-roles-error">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3>Error al cargar datos</h3>
        <p>{loadingError}</p>
        <button onClick={loadRoles} className="retry-btn">
          Reintentar
        </button>
        <style>{`
          .admin-roles-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            text-align: center;
          }
          .error-icon {
            color: #EF4444;
          }
          .retry-btn {
            padding: 10px 24px;
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .retry-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-roles">
      <div className="page-header">
        <div>
          <h1>Gestión de Roles</h1>
          <p className="page-subtitle">
            Administra los roles del sistema para platform y tenants
          </p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => {
            setEditingRole(null);
            setShowCreateModal(true);
          }}
        >
          <span className="btn-icon">+</span>
          Nuevo Rol
        </button>
      </div>

      {/* Banner de error para acciones (no bloquea la página) */}
      {error && (
        <div className="action-error-banner">
          <div className="error-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64547 18.3024 1.55311 18.6453 1.552 19C1.55089 19.3547 1.64105 19.6983 1.81377 19.9999C1.98649 20.3015 2.23616 20.5498 2.53752 20.7183C2.83887 20.8868 3.18067 20.9693 3.53 20.96H20.47C20.8193 20.9693 21.1611 20.8868 21.4625 20.7183C21.7638 20.5498 22.0135 20.3015 22.1862 19.9999C22.359 19.6983 22.4491 19.3547 22.448 19C22.4469 18.6453 22.3545 18.3024 22.18 18L13.71 3.86C13.5319 3.56609 13.2808 3.32312 12.9813 3.15447C12.6818 2.98582 12.3437 2.89726 12 2.89726C11.6563 2.89726 11.3182 2.98582 11.0187 3.15447C10.7192 3.32312 10.4681 3.56609 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="error-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Filtro de inactivos */}
      <div className="filters-section">
        <label className="toggle-filter">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          <span className="toggle-label">Mostrar inactivos</span>
        </label>
        <div className="filter-stats">
          <span className="filter-stat">
            Mostrando: <strong>{activeRoles.length}</strong> de {roles.length} roles
          </span>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Roles</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 16V8C21 7.46957 20.7893 6.96086 20.4142 6.58579C20.0391 6.21071 19.5304 6 19 6H5C4.46957 6 3.96086 6.21071 3.58579 6.58579C3.21071 6.96086 3 7.46957 3 8V16C3 16.5304 3.21071 17.0391 3.58579 17.4142C3.96086 17.7893 4.46957 18 5 18H19C19.5304 18 20.0391 17.7893 20.4142 17.4142C20.7893 17.0391 21 16.5304 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 12H17M12 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Platform</div>
            <div className="stat-value">{stats.platform}</div>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 21H21M5 21V7L12 3L19 7V21M5 21H19M9 9V17M15 9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Tenants</div>
            <div className="stat-value">{stats.tenant}</div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Activos</div>
            <div className="stat-value">{stats.active}</div>
          </div>
        </div>
      </div>

      {/* Roles de Platform */}
      <div className="roles-section">
        <h2 className="section-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16V8C21 7.46957 20.7893 6.96086 20.4142 6.58579C20.0391 6.21071 19.5304 6 19 6H5C4.46957 6 3.96086 6.21071 3.58579 6.58579C3.21071 6.96086 3 7.46957 3 8V16C3 16.5304 3.21071 17.0391 3.58579 17.4142C3.96086 17.7893 4.46957 18 5 18H19C19.5304 18 20.0391 17.7893 20.4142 17.4142C20.7893 17.0391 21 16.5304 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Roles de Platform
        </h2>
        {platformRoles.length === 0 ? (
          <div className="empty-state">
            <p>No hay roles de platform definidos</p>
          </div>
        ) : (
          <div className="roles-grid">
            {platformRoles.map((role) => (
              <RoleCard key={role.id} role={role} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Roles de Tenants */}
      <div className="roles-section">
        <h2 className="section-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 21H21M5 21V7L12 3L19 7V21M5 21H19M9 9V17M15 9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Roles de Tenants
        </h2>
        {tenantRoles.length === 0 ? (
          <div className="empty-state">
            <p>No hay roles de tenant definidos</p>
          </div>
        ) : (
          <div className="roles-grid">
            {tenantRoles.map((role) => (
              <RoleCard key={role.id} role={role} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar */}
      {showCreateModal && (
        <RoleModal
          role={editingRole}
          onClose={handleCloseModal}
          onSaved={handleSaved}
          getToken={getToken}
        />
      )}

      <style>{`
        .admin-roles {
          max-width: 1600px;
        }

        .action-error-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-left: 4px solid #DC2626;
          padding: 16px 20px;
          margin-bottom: 24px;
          border-radius: 10px;
          color: #DC2626;
        }

        .action-error-banner .error-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .action-error-banner .error-close {
          background: none;
          border: none;
          color: #DC2626;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .action-error-banner .error-close:hover {
          background: rgba(220, 38, 38, 0.1);
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
          font-size: 0.9375rem;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          gap: 16px;
          align-items: center;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 12px;
          color: white;
          flex-shrink: 0;
        }
        
        .stat-card.stat-purple .stat-icon {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        }
        
        .stat-card.stat-orange .stat-icon {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }
        
        .stat-card.stat-green .stat-icon {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
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
          font-size: 2rem;
          font-weight: 700;
          color: #0F172A;
        }

        .filters-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding: 16px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
        }

        .toggle-filter {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #334155;
        }

        .toggle-filter input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .filter-stats {
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

        .roles-section {
          margin-bottom: 40px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.5rem;
          font-weight: 600;
          color: #0F172A;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #E2E8F0;
        }

        .section-title svg {
          color: #2563EB;
        }

        .roles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          background: #FFFFFF;
          border: 2px dashed #CBD5E1;
          border-radius: 12px;
          color: #64748B;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9375rem;
        }
      `}</style>
    </div>
  );
}

/**
 * Tarjeta de Rol
 */
function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: RoleWithDates;
  onEdit: (role: RoleWithDates) => void;
  onDelete: (role: RoleWithDates) => void;
}) {
  return (
    <div className="role-card">
      <div className="role-card-header">
        <div className="role-card-info">
          <h3 className="role-name">{role.nombre}</h3>
          <span className="role-code">{role.codigo}</span>
          {role.tipo === 'tenant' && (
            <div className="role-badges">
              {role.visible === false && (
                <span className="role-badge badge-hidden" title="Este rol no es visible para los tenants">
                  Oculto
                </span>
              )}
              {role.featureRequerido && (
                <span className="role-badge badge-feature" title={`Requiere el feature: ${role.featureRequerido}`}>
                  Feature: {role.featureRequerido}
                </span>
              )}
            </div>
          )}
        </div>
        <span className={`role-status ${role.activo ? 'active' : 'inactive'}`}>
          {role.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      
      {role.descripcion && (
        <p className="role-description">{role.descripcion}</p>
      )}

      <div className="role-card-footer">
        <span className="role-date">
          {new Date(role.createdAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <div className="role-actions">
          <button
            className="role-action-btn"
            onClick={() => onEdit(role)}
            title="Editar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="role-action-btn role-action-btn-danger"
            onClick={() => onDelete(role)}
            title="Eliminar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .role-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .role-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #CBD5E1;
        }

        .role-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .role-card-info {
          flex: 1;
        }

        .role-name {
          margin: 0 0 4px 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #0F172A;
        }

        .role-code {
          font-size: 0.8125rem;
          color: #64748B;
          font-family: 'Courier New', monospace;
          background: #F8FAFC;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .role-badges {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          line-height: 1.2;
        }

        .badge-hidden {
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FDE68A;
        }

        .badge-feature {
          background: #DBEAFE;
          color: #1E40AF;
          border: 1px solid #BFDBFE;
        }

        .role-status {
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .role-status.active {
          background: #D1FAE5;
          color: #059669;
        }

        .role-status.inactive {
          background: #FEE2E2;
          color: #DC2626;
        }

        .role-description {
          margin: 0 0 16px 0;
          font-size: 0.875rem;
          color: #64748B;
          line-height: 1.5;
        }

        .role-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #E2E8F0;
        }

        .role-date {
          font-size: 0.8125rem;
          color: #64748B;
        }

        .role-actions {
          display: flex;
          gap: 8px;
        }

        .role-action-btn {
          width: 32px;
          height: 32px;
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

        .role-action-btn:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          color: #2563EB;
        }

        .role-action-btn-danger {
          color: #DC2626;
        }

        .role-action-btn-danger:hover {
          background: #FEE2E2;
          border-color: #FECACA;
          color: #B91C1C;
        }
      `}</style>
    </div>
  );
}

/**
 * Modal para crear/editar roles
 */
function RoleModal({
  role,
  onClose,
  onSaved,
  getToken,
}: {
  role: RoleWithDates | null;
  onClose: () => void;
  onSaved: () => void;
  getToken: () => Promise<string | null>;
}) {
  const [formData, setFormData] = useState<CreateRoleData | UpdateRoleData>({
    nombre: role?.nombre || '',
    codigo: role?.codigo || '',
    tipo: role?.tipo || 'tenant',
    descripcion: role?.descripcion || '',
    activo: role?.activo !== undefined ? role.activo : true,
    visible: role?.visible !== undefined ? role.visible : true,
    featureRequerido: role?.featureRequerido || null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);

  // Cargar features solo si es un rol de tenant
  useEffect(() => {
    if (formData.tipo === 'tenant') {
      loadFeatures();
    } else {
      setFeatures([]);
    }
  }, [formData.tipo]);

  const loadFeatures = async () => {
    try {
      setLoadingFeatures(true);
      const token = await getToken();
      const featuresData = await getAllFeatures(token);
      setFeatures(featuresData);
    } catch (err: any) {
      console.error('Error cargando features:', err);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      if (role) {
        // Actualizar
        await updateRole(role.id, formData as UpdateRoleData, token);
      } else {
        // Crear
        if (!formData.nombre || !formData.codigo) {
          throw new Error('El nombre y código son requeridos');
        }
        await createRole(formData as CreateRoleData, token);
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar rol');
      console.error('Error guardando rol:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{role ? 'Editar Rol' : 'Crear Nuevo Rol'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64547 18.3024 1.55311 18.6453 1.552 19C1.55089 19.3547 1.64105 19.6983 1.81377 19.9999C1.98649 20.3015 2.23616 20.5498 2.53752 20.7183C2.83887 20.8868 3.18067 20.9693 3.53 20.96H20.47C20.8193 20.9693 21.1611 20.8868 21.4625 20.7183C21.7638 20.5498 22.0135 20.3015 22.1862 19.9999C22.359 19.6983 22.4491 19.3547 22.448 19C22.4469 18.6453 22.3545 18.3024 22.18 18L13.71 3.86C13.5319 3.56609 13.2808 3.32312 12.9813 3.15447C12.6818 2.98582 12.3437 2.89726 12 2.89726C11.6563 2.89726 11.3182 2.98582 11.0187 3.15447C10.7192 3.32312 10.4681 3.56609 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>
              Nombre <span className="required">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre || ''}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Admin de Ventas"
              required
              disabled={!!role}
            />
          </div>

          <div className="form-group">
            <label>
              Código <span className="required">*</span>
            </label>
            <input
              type="text"
              value={formData.codigo || ''}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="Ej: admin_ventas"
              required
              disabled={!!role}
            />
            <p className="form-hint">El código no se puede cambiar después de crear</p>
          </div>

          <div className="form-group">
            <label>
              Tipo <span className="required">*</span>
            </label>
            <select
              value={formData.tipo || 'tenant'}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'platform' | 'tenant' })}
              required
              disabled={!!role}
            >
              <option value="platform">Platform</option>
              <option value="tenant">Tenant</option>
            </select>
            <p className="form-hint">El tipo no se puede cambiar después de crear</p>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.descripcion || ''}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción del rol..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.activo !== undefined ? formData.activo : true}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              />
              <span>Rol activo</span>
            </label>
          </div>

          {formData.tipo === 'tenant' && (
            <>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.visible !== undefined ? formData.visible : true}
                    onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                  />
                  <span>Rol visible para tenants</span>
                </label>
                <p className="form-hint">
                  Si está desmarcado, el rol no será visible para los tenants (aunque exista en el sistema)
                </p>
              </div>

              <div className="form-group">
                <label>
                  Feature Requerido (Opcional)
                </label>
                <select
                  value={formData.featureRequerido || ''}
                  onChange={(e) => setFormData({ ...formData, featureRequerido: e.target.value || null })}
                  disabled={loadingFeatures}
                >
                  <option value="">Sin feature requerido</option>
                  {features.map((feature) => (
                    <option key={feature.id} value={feature.name}>
                      {feature.name} - {feature.description || 'Sin descripción'}
                    </option>
                  ))}
                </select>
                <p className="form-hint">
                  Si seleccionas un feature, el rol solo será visible para tenants que tengan ese feature activo.
                  Por ejemplo, si seleccionas "connect", solo los tenants con el feature "connect" verán este rol.
                </p>
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !formData.nombre || !formData.codigo}>
              {saving ? 'Guardando...' : role ? 'Guardar Cambios' : 'Crear Rol'}
            </button>
          </div>
        </form>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .modal-content {
            background: #FFFFFF;
            border-radius: 16px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 1px solid #E2E8F0;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: #0F172A;
          }

          .modal-close {
            background: none;
            border: none;
            cursor: pointer;
            color: #64748B;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s;
          }

          .modal-close:hover {
            background: #F1F5F9;
            color: #0F172A;
          }

          .error-message {
            background: #FEE2E2;
            border: 1px solid #FECACA;
            color: #DC2626;
            padding: 16px;
            margin: 24px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
          }

          .modal-form {
            padding: 24px;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            color: #334155;
            margin-bottom: 8px;
          }

          .required {
            color: #DC2626;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            width: 100%;
            padding: 12px 16px;
            background: #FFFFFF;
            border: 1px solid #CBD5E1;
            border-radius: 10px;
            color: #0F172A;
            font-size: 0.9375rem;
            transition: all 0.2s;
          }

          .form-group input:disabled,
          .form-group select:disabled {
            background: #F8FAFC;
            opacity: 0.7;
            cursor: not-allowed;
          }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: #2563EB;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }

          .form-hint {
            margin-top: 6px;
            font-size: 0.75rem;
            color: #64748B;
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            font-weight: 500;
          }

          .checkbox-label input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #2563EB;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #E2E8F0;
          }

          .btn-secondary {
            padding: 12px 24px;
            background: #FFFFFF;
            color: #475569;
            border: 1px solid #CBD5E1;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #F8FAFC;
            border-color: #94A3B8;
          }

          .btn-secondary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-primary {
            padding: 12px 24px;
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-primary:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          }

          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

