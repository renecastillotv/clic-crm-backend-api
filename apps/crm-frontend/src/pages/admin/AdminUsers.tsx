/**
 * AdminUsers - Gestión de usuarios del panel de administración
 * Usa datos reales de la API
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { getAllTenants, TenantAdmin, getAllUsers, AdminUser, toggleUserStatus, deleteUser } from '../../services/api';


interface UserStats {
  total: number;
  platformAdmins: number;
  active: number;
}

export default function AdminUsers() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<TenantAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const handleEditUser = (user: AdminUser) => {
    navigate(`/admin/usuarios/${user.id}/edit`);
  };

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      await toggleUserStatus(user.id, !user.activo, token);
      await loadData(); // Recargar lista
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado del usuario');
      console.error('Error cambiando estado:', err);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el usuario "${user.email}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      await deleteUser(user.id, token);
      await loadData(); // Recargar lista
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario');
      console.error('Error eliminando usuario:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación. Por favor, inicia sesión nuevamente.');
      }
      const [usersData, tenantsData] = await Promise.all([
        getAllUsers(token),
        getAllTenants(token),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setTenants(tenantsData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeUsers = showInactive ? users : users.filter(u => u.activo);
  const filteredUsers = activeUsers.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const stats: UserStats = {
    total: users.length,
    platformAdmins: users.filter((u) => u.esPlatformAdmin).length,
    active: users.filter((u) => u.activo).length,
  };

  const hasRole = (user: AdminUser, roleName: string): boolean => {
    return user.roles.some((r) => r.rolNombre === roleName);
  };

  const hasAnyRole = (user: AdminUser, roleNames: string[]): boolean => {
    return user.roles.some((r) => roleNames.includes(r.rolNombre));
  };

  if (loading) {
    return (
      <div className="admin-users-loading">
        <div className="loading-spinner"></div>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-users-error">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3>Error al cargar datos</h3>
        <p>{error}</p>
        <button onClick={loadData} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="admin-users">
      <div className="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="page-subtitle">
            Administra los usuarios de la plataforma
          </p>
        </div>
        <Link to="/admin/usuarios/new" className="btn-primary">
          <span className="btn-icon">+</span>
          Nuevo Usuario
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Usuarios</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 6L15 8L18 6V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V6L9 8L12 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 6V4M12 4L15 6M12 4L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Platform Admins</div>
            <div className="stat-value">{stats.platformAdmins}</div>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 12H16M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Administradores</div>
            <div className="stat-value">
              {users.filter((u) =>
                hasAnyRole(u, ['Platform Admin', 'tenant_admin', 'tenant_owner'])
              ).length}
            </div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Usuarios Activos</div>
            <div className="stat-value">{stats.active}</div>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="filters-section">
        <div className="search-container">
          <span className="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filters-right">
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
              Mostrando: <strong>{filteredUsers.length}</strong> de {users.length} usuarios
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>
            {search ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
          </h3>
          <p>
            {search
              ? 'Intenta con otros términos de búsqueda'
              : 'Los usuarios se sincronizarán automáticamente desde Clerk'}
          </p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Roles</th>
                <th>Tenants</th>
                <th>Estado</th>
                <th>Último Acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <UserRow 
                  key={user.id} 
                  user={user} 
                  tenants={tenants} 
                  onEdit={handleEditUser}
                  onToggleStatus={() => handleToggleStatus(user)}
                  onDelete={() => handleDeleteUser(user)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .admin-users {
          max-width: 1600px;
        }

        .admin-users-loading,
        .admin-users-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
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
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 2rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          margin: 0;
          color: #64748B;
          font-size: 1rem;
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
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
        }

        .btn-icon {
          font-size: 1.25rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
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
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
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
          gap: 20px;
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
          gap: 16px;
        }

        .filter-stat {
          color: #64748B;
          font-size: 0.875rem;
        }

        .filter-stat strong {
          color: #0F172A;
          font-weight: 600;
        }

        .filters-right {
          display: flex;
          align-items: center;
          gap: 20px;
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

        .empty-state {
          text-align: center;
          padding: 64px 24px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(124, 58, 237, 0.02) 100%);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 16px;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: #0F172A;
          font-size: 1.25rem;
        }

        .empty-state p {
          margin: 0;
          color: #64748B;
        }

        .users-table-container {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
        }

        .users-table thead {
          background: #F8FAFC;
        }

        .users-table th {
          padding: 16px 20px;
          text-align: left;
          font-weight: 700;
          font-size: 0.875rem;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #E2E8F0;
        }

        .users-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #E2E8F0;
        }

        .users-table tbody tr {
          transition: all 0.2s;
        }

        .users-table tbody tr:hover {
          background: #F8FAFC;
        }

        .users-table tbody tr:last-child td {
          border-bottom: none;
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          font-size: 1rem;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
        }

        .user-avatar-img {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .user-info strong {
          color: #0F172A;
          font-weight: 600;
          display: block;
          margin-bottom: 4px;
        }

        .user-info .user-email {
          font-size: 0.875rem;
          color: #64748B;
        }

        .roles-cell {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .role-badge {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .role-badge.platform {
          background: #EDE9FE;
          color: #7C3AED;
          border: 1px solid #DDD6FE;
        }

        .role-badge.tenant {
          background: #DBEAFE;
          color: #1E40AF;
          border: 1px solid #BFDBFE;
        }

        .tenants-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tenant-tag {
          font-size: 0.8125rem;
          color: #1E40AF;
          padding: 4px 10px;
          background: #EFF6FF;
          border: 1px solid #DBEAFE;
          border-radius: 8px;
          display: inline-block;
          font-weight: 500;
        }

        .tenant-tag.no-tenant {
          color: #64748B;
          background: #F1F5F9;
          border-color: #E2E8F0;
          font-style: italic;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-block;
        }

        .status-badge.active {
          background: #D1FAE5;
          color: #059669;
          border: 1px solid #A7F3D0;
        }

        .status-badge.inactive {
          background: #FEE2E2;
          color: #DC2626;
          border: 1px solid #FECACA;
        }

        .last-access {
          font-size: 0.875rem;
          color: #64748B;
        }

        .last-access.never {
          color: #94A3B8;
          font-style: italic;
        }

        .actions-cell {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 8px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
        }

        .action-btn:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          color: #2563EB;
        }
        
        .action-btn svg {
          width: 18px;
          height: 18px;
        }

        .action-btn-danger {
          color: #DC2626;
        }

        .action-btn-danger:hover {
          background: #FEE2E2;
          border-color: #FECACA;
          color: #B91C1C;
        }
      `}</style>
    </div>
  );
}

/**
 * Componente para renderizar una fila de usuario
 */
function UserRow({
  user,
  tenants,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  user: AdminUser;
  tenants: TenantAdmin[];
  onEdit: (user: AdminUser) => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const getTenantName = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    return tenant?.nombre || 'Unknown';
  };

  const displayName = `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.email.split('@')[0];
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <tr>
      <td>
        <div className="user-cell">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="user-avatar-img"
            />
          ) : (
            <div className="user-avatar">{initials}</div>
          )}
          <div className="user-info">
            <strong>{displayName}</strong>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
      </td>
      <td>
        <div className="roles-cell">
          {user.roles.length > 0 ? (
            user.roles.map((role, idx) => (
              <span
                key={idx}
                className={`role-badge ${role.rolTipo === 'platform' ? 'platform' : 'tenant'}`}
              >
                {role.rolNombre}
              </span>
            ))
          ) : (
            <span className="role-badge tenant">Sin roles</span>
          )}
        </div>
      </td>
      <td>
        <div className="tenants-cell">
          {user.tenants.length > 0 ? (
            user.tenants.slice(0, 2).map((tenant, idx) => (
              <span key={idx} className="tenant-tag">
                {tenant.tenantNombre}
              </span>
            ))
          ) : (
            <span className="tenant-tag no-tenant">Sin asignar</span>
          )}
          {user.tenants.length > 2 && (
            <span className="tenant-tag">+{user.tenants.length - 2} más</span>
          )}
        </div>
      </td>
      <td>
        <span className={`status-badge ${user.activo ? 'active' : 'inactive'}`}>
          {user.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>
        <span
          className={`last-access ${!user.ultimoAcceso ? 'never' : ''}`}
        >
          {user.ultimoAcceso
            ? new Date(user.ultimoAcceso).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'Nunca'}
        </span>
      </td>
      <td>
        <div className="actions-cell">
          <button 
            className="action-btn" 
            title={user.activo ? 'Desactivar' : 'Activar'}
            onClick={onToggleStatus}
          >
            {user.activo ? (
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
            className="action-btn" 
            title="Editar"
            onClick={() => onEdit(user)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.50023C18.8978 2.10243 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.10243 21.5 2.50023C21.8978 2.89804 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.10243 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button 
            className="action-btn action-btn-danger" 
            title="Eliminar"
            onClick={onDelete}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

