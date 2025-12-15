/**
 * CrmUsuarios - Gestión de usuarios del tenant
 *
 * Módulo completo para gestionar usuarios con:
 * - Lista con búsqueda y filtros
 * - Roles y permisos
 * - CRUD completo
 * - Solo visible para admins del tenant
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getUsuariosTenant,
  getRolesTenant,
  deleteUsuarioTenant,
  UsuarioTenant,
  RolTenant,
} from '../../services/api';

// Iconos SVG como funciones que retornan JSX
const Icons = {
  search: (props?: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  plus: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  trash: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  edit: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  user: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  shield: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  x: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  loader: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  ),
  grid: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  list: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
};

export default function CrmUsuarios() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual, isTenantAdmin } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  // Estado
  const [usuarios, setUsuarios] = useState<UsuarioTenant[]>([]);
  const [roles, setRoles] = useState<RolTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [rolFiltro, setRolFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [vista, setVista] = useState<'tarjeta' | 'lista'>('tarjeta');

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Usuarios',
      subtitle: 'Gestiona los usuarios y permisos de tu tenant',
      actions: (
        <>
          <button 
            className="btn-secondary" 
            onClick={() => navigate(`/crm/${tenantSlug}/roles`)}
            style={{ marginRight: '12px' }}
          >
            <Icons.shield />
            Roles
          </button>
          <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/usuarios/nuevo`)}>
            <Icons.plus />
            Nuevo Usuario
          </button>
        </>
      ),
    });
  }, [setPageHeader, tenantSlug, navigate]);

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      const [usuariosData, rolesData] = await Promise.all([
        getUsuariosTenant(tenantActual.id, token).catch((err) => {
          // Si es error de conexión, devolver array vacío en lugar de fallar
          if (err.message?.includes('No se pudo conectar')) {
            console.warn('API no disponible, usando datos vacíos');
            return [];
          }
          throw err;
        }),
        getRolesTenant(tenantActual.id, token).catch((err) => {
          // Si es error de conexión, devolver array vacío en lugar de fallar
          if (err.message?.includes('No se pudo conectar')) {
            console.warn('API no disponible, usando roles vacíos');
            return [];
          }
          throw err;
        }),
      ]);

      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (err: any) {
      console.error('Error cargando usuarios:', err);
      // Solo mostrar error si no es un error de conexión (ya manejado arriba)
      if (!err.message?.includes('No se pudo conectar')) {
        setError(err.message || 'Error al cargar usuarios');
      } else {
        setError('No se pudo conectar con el servidor. Verifica que la API esté corriendo.');
      }
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Verificar permisos
  if (!isTenantAdmin) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">
            <Icons.shield />
          </div>
          <h3>Acceso restringido</h3>
          <p>No tienes permisos para gestionar usuarios. Contacta al administrador del tenant.</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // Filtrar usuarios
  const usuariosFiltrados = usuarios.filter((usuario) => {
    const matchBusqueda =
      !busqueda ||
      usuario.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      usuario.apellido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      usuario.email.toLowerCase().includes(busqueda.toLowerCase());

    const matchRol =
      !rolFiltro ||
      usuario.roles.some((rol) => rol.id === rolFiltro || rol.codigo === rolFiltro);

    const matchEstado =
      !estadoFiltro ||
      (estadoFiltro === 'activo' && usuario.activo) ||
      (estadoFiltro === 'inactivo' && !usuario.activo);

    return matchBusqueda && matchRol && matchEstado;
  });

  // Eliminar usuario
  const handleDelete = async (usuarioId: string) => {
    if (!tenantActual?.id) return;

    try {
      setDeleting(true);
      await deleteUsuarioTenant(tenantActual.id, usuarioId);
      setUsuarios(prev => prev.filter(u => u.id !== usuarioId));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error al eliminar usuario:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Formatear nombre completo
  const getNombreCompleto = (usuario: UsuarioTenant) => {
    return [usuario.nombre, usuario.apellido].filter(Boolean).join(' ') || usuario.email;
  };

  // Obtener iniciales para avatar
  const getIniciales = (usuario: UsuarioTenant) => {
    if (usuario.nombre && usuario.apellido) {
      return (usuario.nombre.charAt(0) + usuario.apellido.charAt(0)).toUpperCase();
    }
    if (usuario.nombre) {
      return usuario.nombre.charAt(0).toUpperCase();
    }
    return usuario.email.charAt(0).toUpperCase();
  };

  if (loading && usuarios.length === 0) {
    return (
      <div className="page">
        <div className="loading-container">
          <Icons.loader className="spinner" />
          <p>Cargando usuarios...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Barra de filtros */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon"><Icons.search /></span>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filters-right">
          <select
            value={rolFiltro}
            onChange={(e) => setRolFiltro(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los roles</option>
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>
                {rol.nombre}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>

          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${vista === 'tarjeta' ? 'active' : ''}`}
              onClick={() => setVista('tarjeta')}
              title="Vista de tarjetas"
            >
              <Icons.grid />
            </button>
            <button
              className={`view-toggle-btn ${vista === 'lista' ? 'active' : ''}`}
              onClick={() => setVista('lista')}
              title="Vista de lista"
            >
              <Icons.list />
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <strong>⚠️ Error:</strong>
            <span>{error}</span>
            {error.includes('No se pudo conectar') && (
              <p className="error-hint">
                Asegúrate de que el servidor API esté corriendo en <code>http://localhost:3001</code>
              </p>
            )}
          </div>
          <button onClick={() => setError(null)}>
            <Icons.x />
          </button>
        </div>
      )}

      {/* Lista de usuarios */}
      {usuariosFiltrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Icons.user />
          </div>
          <h3>No hay usuarios</h3>
          <p>
            {busqueda || rolFiltro || estadoFiltro
              ? 'No se encontraron usuarios con los filtros aplicados'
              : 'Agrega usuarios para gestionar tu equipo'}
          </p>
          {!busqueda && !rolFiltro && !estadoFiltro && (
            <button
              className="btn-primary"
              onClick={() => navigate(`/crm/${tenantSlug}/usuarios/nuevo`)}
            >
              <Icons.plus />
              Agregar Primer Usuario
            </button>
          )}
        </div>
      ) : vista === 'lista' ? (
        <div className="usuarios-lista">
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id} className={!usuario.activo ? 'inactivo' : ''}>
                  <td>
                    <div className="usuario-cell">
                      <div className="usuario-avatar-small">
                        {usuario.avatarUrl ? (
                          <img src={usuario.avatarUrl} alt={getNombreCompleto(usuario)} />
                        ) : (
                          <span>{getIniciales(usuario)}</span>
                        )}
                      </div>
                      <div className="usuario-info-cell">
                        <span className="usuario-nombre-cell">
                          {getNombreCompleto(usuario)}
                          {usuario.esOwner && (
                            <span className="owner-badge-small" title="Dueño del tenant">
                              <Icons.shield />
                            </span>
                          )}
                        </span>
                        {usuario.telefono && (
                          <span className="usuario-telefono-cell">{usuario.telefono}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="email-cell">{usuario.email}</span>
                  </td>
                  <td>
                    <div className="roles-cell">
                      {usuario.roles.length > 0 ? (
                        usuario.roles.map((rol) => (
                          <span
                            key={rol.id}
                            className="rol-badge-small"
                            style={{
                              backgroundColor: rol.color ? `${rol.color}20` : '#e2e8f0',
                              color: rol.color || '#64748b',
                            }}
                          >
                            {rol.nombre}
                          </span>
                        ))
                      ) : (
                        <span className="rol-badge-small sin-rol">Sin roles</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${usuario.activo ? 'activo' : 'inactivo'}`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="action-btn"
                        onClick={() => navigate(`/crm/${tenantSlug}/usuarios/${usuario.id}`)}
                        title="Editar usuario"
                      >
                        <Icons.edit />
                      </button>
                      {!usuario.esOwner && (
                        <button
                          className="action-btn danger"
                          onClick={() => setDeleteConfirm(usuario.id)}
                          title="Eliminar usuario"
                        >
                          <Icons.trash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="usuarios-grid">
          {usuariosFiltrados.map((usuario) => (
            <div key={usuario.id} className={`usuario-card ${!usuario.activo ? 'inactivo' : ''}`}>
              <div className="usuario-header">
                <div className="usuario-avatar">
                  {usuario.avatarUrl ? (
                    <img src={usuario.avatarUrl} alt={getNombreCompleto(usuario)} />
                  ) : (
                    <span>{getIniciales(usuario)}</span>
                  )}
                </div>
                <div className="usuario-info">
                  <h3 className="usuario-nombre">{getNombreCompleto(usuario)}</h3>
                  <p className="usuario-email">{usuario.email}</p>
                </div>
                {usuario.esOwner && (
                  <div className="owner-badge" title="Dueño del tenant">
                    <Icons.shield />
                  </div>
                )}
              </div>

              {usuario.telefono && (
                <div className="usuario-detail">
                  <span className="detail-label">Teléfono:</span>
                  <span className="detail-value">{usuario.telefono}</span>
                </div>
              )}

              <div className="usuario-roles">
                {usuario.roles.length > 0 ? (
                  usuario.roles.map((rol) => (
                    <span
                      key={rol.id}
                      className="rol-badge"
                      style={{
                        backgroundColor: rol.color ? `${rol.color}20` : '#e2e8f0',
                        color: rol.color || '#64748b',
                      }}
                    >
                      {rol.nombre}
                    </span>
                  ))
                ) : (
                  <span className="rol-badge sin-rol">Sin roles</span>
                )}
              </div>

              <div className="usuario-status">
                <span className={`status-badge ${usuario.activo ? 'activo' : 'inactivo'}`}>
                  {usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="usuario-actions">
                <button
                  className="action-btn"
                  onClick={() => navigate(`/crm/${tenantSlug}/usuarios/${usuario.id}`)}
                  title="Editar usuario"
                >
                  <Icons.edit />
                </button>
                {!usuario.esOwner && (
                  <button
                    className="action-btn danger"
                    onClick={() => setDeleteConfirm(usuario.id)}
                    title="Eliminar usuario"
                  >
                    <Icons.trash />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon warning">
              <Icons.trash />
            </div>
            <h3>¿Eliminar usuario?</h3>
            <p>Esta acción eliminará al usuario del tenant. El usuario no se eliminará del sistema.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
              >
                {deleting ? <Icons.loader className="spinner" /> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    width: 100%;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px;
    color: #64748b;
    gap: 16px;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .filters-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1;
    min-width: 250px;
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    color: #94a3b8;
    pointer-events: none;
  }

  .search-box input {
    width: 100%;
    padding: 10px 16px 10px 40px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .search-box input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .filters-right {
    display: flex;
    gap: 12px;
  }

  .filter-select {
    padding: 10px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    background: white;
    cursor: pointer;
    min-width: 150px;
  }

  .filter-select:focus {
    outline: none;
    border-color: #2563eb;
  }

  .view-toggle {
    display: flex;
    gap: 4px;
    background: #f1f5f9;
    border-radius: 10px;
    padding: 4px;
  }

  .view-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    color: #64748b;
    transition: all 0.15s;
  }

  .view-toggle-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .view-toggle-btn.active {
    background: white;
    color: #2563eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    color: #dc2626;
  }

  .error-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .error-content strong {
    font-weight: 600;
  }

  .error-hint {
    margin: 8px 0 0 0;
    font-size: 0.875rem;
    color: #991b1b;
    font-weight: normal;
  }

  .error-hint code {
    background: rgba(0, 0, 0, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 4px;
    flex-shrink: 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    background: white;
    border: 2px dashed #e2e8f0;
    border-radius: 16px;
    text-align: center;
  }

  .empty-icon {
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border-radius: 50%;
    color: #94a3b8;
    margin-bottom: 24px;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
  }

  .empty-state p {
    margin: 0 0 24px 0;
    color: #64748b;
    font-size: 0.95rem;
    max-width: 360px;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: white;
    color: #6366f1;
    border: 1px solid #6366f1;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #f0f4ff;
    border-color: #4f46e5;
    color: #4f46e5;
  }

  .usuarios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .usuario-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px;
    transition: all 0.2s;
  }

  .usuario-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  .usuario-card.inactivo {
    opacity: 0.7;
    border-color: #cbd5e1;
  }

  .usuario-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    position: relative;
  }

  .usuario-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    font-weight: 600;
    font-size: 1rem;
    flex-shrink: 0;
    overflow: hidden;
  }

  .usuario-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .usuario-info {
    flex: 1;
    min-width: 0;
  }

  .usuario-nombre {
    margin: 0 0 4px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .usuario-email {
    margin: 0;
    font-size: 0.85rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .owner-badge {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fef3c7;
    color: #f59e0b;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .usuario-detail {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 0.85rem;
  }

  .detail-label {
    color: #94a3b8;
    font-weight: 500;
  }

  .detail-value {
    color: #64748b;
  }

  .usuario-roles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .rol-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .rol-badge.sin-rol {
    background: #f1f5f9;
    color: #94a3b8;
  }

  .usuario-status {
    margin-bottom: 16px;
  }

  .status-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.activo {
    background: #dcfce7;
    color: #16a34a;
  }

  .status-badge.inactivo {
    background: #fef2f2;
    color: #dc2626;
  }

  .usuario-actions {
    display: flex;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border: none;
    background: #f8fafc;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .action-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .action-btn.danger:hover {
    background: #fef2f2;
    color: #dc2626;
  }

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
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: white;
    border-radius: 20px;
    padding: 28px;
    max-width: 440px;
    width: 100%;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .modal-small {
    max-width: 360px;
    text-align: center;
  }

  .modal-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-icon.warning {
    background: #fef2f2;
    color: #dc2626;
  }

  .modal-content h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    color: #0f172a;
  }

  .modal-content p {
    margin: 0 0 24px 0;
    color: #64748b;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn-cancel {
    padding: 12px 24px;
    background: #f1f5f9;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
  }

  .btn-danger {
    padding: 12px 24px;
    background: #dc2626;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }

  .btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .view-toggle {
    display: flex;
    gap: 4px;
    background: #f1f5f9;
    border-radius: 10px;
    padding: 4px;
  }

  .view-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    color: #64748b;
    transition: all 0.15s;
  }

  .view-toggle-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .view-toggle-btn.active {
    background: white;
    color: #2563eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .usuarios-lista {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    overflow: hidden;
  }

  .usuarios-table {
    width: 100%;
    border-collapse: collapse;
  }

  .usuarios-table thead {
    background: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
  }

  .usuarios-table th {
    padding: 16px;
    text-align: left;
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .usuarios-table tbody tr {
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
  }

  .usuarios-table tbody tr:hover {
    background: #f8fafc;
  }

  .usuarios-table tbody tr.inactivo {
    opacity: 0.7;
  }

  .usuarios-table td {
    padding: 16px;
    font-size: 0.9rem;
    color: #0f172a;
  }

  .usuario-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .usuario-avatar-small {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    flex-shrink: 0;
    overflow: hidden;
  }

  .usuario-avatar-small img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .usuario-info-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .usuario-nombre-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #0f172a;
  }

  .usuario-telefono-cell {
    font-size: 0.8rem;
    color: #64748b;
  }

  .owner-badge-small {
    display: inline-flex;
    align-items: center;
    width: 20px;
    height: 20px;
    background: #fef3c7;
    color: #f59e0b;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .email-cell {
    color: #64748b;
  }

  .roles-cell {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .rol-badge-small {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .rol-badge-small.sin-rol {
    background: #f1f5f9;
    color: #94a3b8;
  }

  .actions-cell {
    display: flex;
    gap: 8px;
  }

  @media (max-width: 768px) {
    .usuarios-grid {
      grid-template-columns: 1fr;
    }

    .filters-bar {
      flex-direction: column;
    }

    .filters-right {
      width: 100%;
    }

    .filter-select {
      flex: 1;
    }

    .usuarios-table {
      font-size: 0.8rem;
    }

    .usuarios-table th,
    .usuarios-table td {
      padding: 12px 8px;
    }

    .usuarios-table th:nth-child(2),
    .usuarios-table td:nth-child(2) {
      display: none;
    }
  }
`;

