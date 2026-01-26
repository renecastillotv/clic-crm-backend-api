/**
 * CrmRoles - Gestión de roles del tenant
 * 
 * Muestra roles del sistema y roles propios del tenant
 * Permite crear, activar/desactivar y eliminar roles propios
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import {
  getRolesTenant,
  createRolTenant,
  updateRolTenant,
  deleteRolTenant,
  getUsuariosCountByRol,
  RolTenant,
} from '../../services/api';

// Iconos SVG
const Icons = {
  shield: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  plus: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
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
};

export default function CrmRoles() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual, isTenantAdmin } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'existentes' | 'crear'>('existentes');
  const [roles, setRoles] = useState<RolTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    rol: RolTenant | null;
    usuariosCount: number;
  }>({
    show: false,
    rol: null,
    usuariosCount: 0,
  });

  // Formulario para crear rol
  const [form, setForm] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    color: '#667eea',
  });

  // Configurar header
  useEffect(() => {
    const nombreInmobiliaria = tenantActual?.nombre || 'la inmobiliaria';
    setPageHeader({
      title: 'Roles',
      subtitle: `Gestiona los roles de ${nombreInmobiliaria}`,
      backButton: {
        label: 'Volver a Usuarios',
        onClick: () => navigate(`/crm/${tenantSlug}/usuarios`),
      },
    });
  }, [setPageHeader, tenantSlug, navigate, tenantActual?.nombre]);

  // Generar código automáticamente desde el nombre
  useEffect(() => {
    if (activeTab === 'crear' && form.nombre && !form.codigo) {
      const codigo = form.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setForm(prev => ({ ...prev, codigo }));
    }
  }, [form.nombre, form.codigo, activeTab]);

  // Cargar roles
  const cargarRoles = async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const rolesData = await getRolesTenant(tenantActual.id, token);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (err: any) {
      console.error('Error cargando roles:', err);
      setError(err.message || 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRoles();
  }, [tenantActual?.id]);

  // Separar roles del sistema y roles propios
  const rolesSistema = roles.filter(rol => !rol.tenantId); // tenant_id = NULL
  const rolesPropios = roles.filter(rol => rol.tenantId); // tenant_id = <tenant_id>

  // Crear rol
  const handleCrearRol = async () => {
    if (!tenantActual?.id || !form.nombre.trim() || !form.codigo.trim()) {
      setError('El nombre y código son requeridos');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const token = await getToken();
      await createRolTenant(tenantActual.id, {
        nombre: form.nombre,
        codigo: form.codigo,
        descripcion: form.descripcion || undefined,
        color: form.color || undefined,
      }, token);

      // Limpiar formulario y recargar roles
      setForm({ nombre: '', codigo: '', descripcion: '', color: '#667eea' });
      await cargarRoles();
      setActiveTab('existentes');
    } catch (err: any) {
      console.error('Error creando rol:', err);
      setError(err.message || 'Error al crear rol');
    } finally {
      setSaving(false);
    }
  };

  // Toggle activo/inactivo
  const handleToggleActivo = async (rol: RolTenant) => {
    if (!tenantActual?.id || !rol.tenantId) return; // Solo roles propios

    try {
      setToggling(rol.id);
      setError(null);
      const token = await getToken();
      await updateRolTenant(tenantActual.id, rol.id, {
        activo: !rol.activo,
      }, token);

      await cargarRoles();
    } catch (err: any) {
      console.error('Error actualizando rol:', err);
      setError(err.message || 'Error al actualizar rol');
    } finally {
      setToggling(null);
    }
  };

  // Eliminar rol - primero verificar usuarios y mostrar modal
  const handleEliminarRol = async (rol: RolTenant) => {
    if (!tenantActual?.id || !rol.tenantId) return; // Solo roles propios

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      // Obtener conteo de usuarios
      const usuariosCount = await getUsuariosCountByRol(tenantActual.id, rol.id, token);
      
      // Mostrar modal de confirmación
      setDeleteConfirm({
        show: true,
        rol,
        usuariosCount,
      });
    } catch (err: any) {
      console.error('Error obteniendo conteo de usuarios:', err);
      setError(err.message || 'Error al verificar usuarios del rol');
    }
  };

  // Confirmar eliminación después de mostrar el modal
  const confirmarEliminacion = async () => {
    if (!deleteConfirm.rol || !tenantActual?.id) return;

    try {
      setDeleting(deleteConfirm.rol.id);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      
      await deleteRolTenant(tenantActual.id, deleteConfirm.rol.id, token);
      
      // Cerrar modal y recargar roles
      setDeleteConfirm({ show: false, rol: null, usuariosCount: 0 });
      await cargarRoles();
    } catch (err: any) {
      console.error('Error eliminando rol:', err);
      setError(err.message || 'Error al eliminar rol');
      setDeleteConfirm({ show: false, rol: null, usuariosCount: 0 });
    } finally {
      setDeleting(null);
    }
  };

  if (!isTenantAdmin) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">
            <Icons.shield />
          </div>
          <h3>Acceso restringido</h3>
          <p>No tienes permisos para gestionar roles de {tenantActual?.nombre || 'esta inmobiliaria'}.</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // Scroll al banner de error cuando se muestra
  useEffect(() => {
    if (error) {
      const banner = document.querySelector('.error-banner');
      if (banner) {
        banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [error]);

  return (
    <div className="page">
      <div className="roles-container">
        {/* Error banner */}
        {error && (
          <div className="error-banner" role="alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64547 18.3024 1.55311 18.6453 1.552 19C1.55089 19.3547 1.64105 19.6983 1.81377 19.9999C1.98649 20.3015 2.23616 20.5498 2.53752 20.7183C2.83887 20.8868 3.18067 20.9693 3.53 20.96H20.47C20.8193 20.9693 21.1611 20.8868 21.4625 20.7183C21.7638 20.5498 22.0135 20.3015 22.1862 19.9999C22.359 19.6983 22.4491 19.3547 22.448 19C22.4469 18.6453 22.3545 18.3024 22.18 18L13.71 3.86C13.5319 3.56609 13.2808 3.32312 12.9813 3.15447C12.6818 2.98582 12.3437 2.89726 12 2.89726C11.6563 2.89726 11.3182 2.98582 11.0187 3.15447C10.7192 3.32312 10.4681 3.56609 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} aria-label="Cerrar error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* Modal de confirmación para eliminar rol */}
        {deleteConfirm.show && deleteConfirm.rol && (
          <div className="delete-modal-overlay" onClick={() => setDeleteConfirm({ show: false, rol: null, usuariosCount: 0 })}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-modal-header">
                <div className="delete-modal-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64547 18.3024 1.55311 18.6453 1.552 19C1.55089 19.3547 1.64105 19.6983 1.81377 19.9999C1.98649 20.3015 2.23616 20.5498 2.53752 20.7183C2.83887 20.8868 3.18067 20.9693 3.53 20.96H20.47C20.8193 20.9693 21.1611 20.8868 21.4625 20.7183C21.7638 20.5498 22.0135 20.3015 22.1862 19.9999C22.359 19.6983 22.4491 19.3547 22.448 19C22.4469 18.6453 22.3545 18.3024 22.18 18L13.71 3.86C13.5319 3.56609 13.2808 3.32312 12.9813 3.15447C12.6818 2.98582 12.3437 2.89726 12 2.89726C11.6563 2.89726 11.3182 2.98582 11.0187 3.15447C10.7192 3.32312 10.4681 3.56609 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Eliminar Rol</h2>
              </div>
              
              <div className="delete-modal-body">
                <p className="delete-modal-message">
                  Estás intentando eliminar el rol <strong>"{deleteConfirm.rol.nombre}"</strong>.
                </p>
                {deleteConfirm.usuariosCount > 0 ? (
                  <div className="delete-modal-warning">
                    <p>
                      Este rol está asignado a <strong>{deleteConfirm.usuariosCount} usuario{deleteConfirm.usuariosCount !== 1 ? 's' : ''}</strong>.
                    </p>
                    <p>
                      Al eliminar este rol, estos usuarios quedarán sin este rol asignado y podrían perder acceso a funcionalidades relacionadas.
                    </p>
                  </div>
                ) : (
                  <p className="delete-modal-info">
                    Este rol no tiene usuarios asignados actualmente.
                  </p>
                )}
                <p className="delete-modal-question">
                  ¿Deseas proceder con la eliminación?
                </p>
              </div>

              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="delete-modal-cancel"
                  onClick={() => setDeleteConfirm({ show: false, rol: null, usuariosCount: 0 })}
                  disabled={deleting === deleteConfirm.rol.id}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="delete-modal-confirm"
                  onClick={confirmarEliminacion}
                  disabled={deleting === deleteConfirm.rol.id}
                >
                  {deleting === deleteConfirm.rol.id ? (
                    <>
                      <Icons.loader className="spinner" />
                      Eliminando...
                    </>
                  ) : (
                    'Sí, eliminar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs-header">
            <button
              type="button"
              className={`tab-button ${activeTab === 'existentes' ? 'active' : ''}`}
              onClick={() => setActiveTab('existentes')}
            >
              <Icons.shield />
              Roles Existentes
            </button>
            <button
              type="button"
              className={`tab-button`}
              onClick={() => navigate(`/crm/${tenantSlug}/roles/nuevo`)}
            >
              <Icons.plus />
              Crear Rol
            </button>
          </div>

          <div className="tabs-content">
            {/* Tab: Roles Existentes */}
            {activeTab === 'existentes' && (
              <div className="tab-panel">
                {loading ? (
                  <div className="loading-container">
                    <Icons.loader className="spinner" />
                    <p>Cargando roles...</p>
                  </div>
                ) : (
                  <>
                    {/* Roles del Sistema */}
                    <div className="roles-section">
                      <h3 className="section-title">Roles del Sistema</h3>
                      <p className="section-description">
                        Estos roles son proporcionados por la plataforma y están disponibles para todos los tenants.
                      </p>
                      {rolesSistema.length === 0 ? (
                        <p className="empty-message">No hay roles del sistema disponibles.</p>
                      ) : (
                        <div className="roles-grid">
                          {rolesSistema.map((rol) => (
                            <div key={rol.id} className="role-card sistema">
                              <div className="role-header">
                                <div className="role-info">
                                  <h4 className="role-name">{rol.nombre}</h4>
                                  <span className="role-code">{rol.codigo}</span>
                                </div>
                                <span className={`role-badge ${rol.activo ? 'activo' : 'inactivo'}`}>
                                  {rol.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                              {rol.descripcion && (
                                <p className="role-description">{rol.descripcion}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Roles Propios */}
                    <div className="roles-section">
                      <h3 className="section-title">Roles Propios</h3>
                      <p className="section-description">
                        Estos son roles personalizados creados específicamente para {tenantActual?.nombre || 'tu inmobiliaria'}.
                      </p>
                      {rolesPropios.length === 0 ? (
                        <p className="empty-message">No has creado roles personalizados aún.</p>
                      ) : (
                        <div className="roles-grid">
                          {rolesPropios.map((rol) => (
                            <div key={rol.id} className="role-card propio">
                              <div className="role-header">
                                <div className="role-info">
                                  <h4 className="role-name">{rol.nombre}</h4>
                                  <span className="role-code">{rol.codigo}</span>
                                </div>
                                <div className="role-actions">
                                  <button
                                    className="edit-btn"
                                    onClick={() => navigate(`/crm/${tenantSlug}/roles/${rol.id}`)}
                                    title="Editar permisos"
                                  >
                                    <Icons.edit />
                                  </button>
                                  <button
                                    className={`toggle-btn ${rol.activo ? 'activo' : 'inactivo'}`}
                                    onClick={() => handleToggleActivo(rol)}
                                    disabled={toggling === rol.id}
                                    title={rol.activo ? 'Desactivar' : 'Activar'}
                                  >
                                    {toggling === rol.id ? (
                                      <Icons.loader className="spinner" />
                                    ) : (
                                      rol.activo ? '✓' : '○'
                                    )}
                                  </button>
                                  <button
                                    className="delete-btn"
                                    onClick={() => handleEliminarRol(rol)}
                                    disabled={deleting === rol.id}
                                    title="Eliminar"
                                  >
                                    {deleting === rol.id ? (
                                      <Icons.loader className="spinner" />
                                    ) : (
                                      <Icons.trash />
                                    )}
                                  </button>
                                </div>
                              </div>
                              {rol.descripcion && (
                                <p className="role-description">{rol.descripcion}</p>
                              )}
                              <div className="role-status">
                                <span className={`status-badge ${rol.activo ? 'activo' : 'inactivo'}`}>
                                  {rol.activo ? 'Activo' : 'Inactivo'}
                                </span>
                                {rol.featureRequerido && (
                                  <span className="feature-badge" title={`Requiere feature: ${rol.featureRequerido}`}>
                                    🔒 {rol.featureRequerido}
                                  </span>
                                )}
                                {rol.visible === false && (
                                  <span className="visibility-badge" title="Rol no visible">
                                    👁️‍🗨️ No visible
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    width: 100%;
  }

  .roles-container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    border-radius: 16px;
    padding: 0;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 2px solid #dc2626;
    padding: 16px 20px;
    margin: 24px;
    border-radius: 10px;
    color: #dc2626;
    font-weight: 500;
    box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.1);
    z-index: 10;
    position: relative;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 4px;
  }

  .tabs-container {
    display: flex;
    flex-direction: column;
  }

  .tabs-header {
    display: flex;
    border-bottom: 2px solid #f1f5f9;
    background: #f8fafc;
    padding: 0;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 24px;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    color: #64748b;
    transition: all 0.2s;
  }

  .tab-button:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .tab-button.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
    background: white;
  }

  .tabs-content {
    padding: 32px;
  }

  .tab-panel {
    min-height: 400px;
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

  .roles-section {
    margin-bottom: 48px;
  }

  .section-title {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
  }

  .section-description {
    margin: 0 0 24px 0;
    color: #64748b;
    font-size: 0.9rem;
  }

  .empty-message {
    padding: 40px;
    text-align: center;
    color: #94a3b8;
    background: #f8fafc;
    border: 2px dashed #e2e8f0;
    border-radius: 10px;
  }

  .roles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .role-card {
    padding: 20px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    background: white;
    transition: all 0.2s;
  }

  .role-card.sistema {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  .role-card.propio {
    border-color: #cbd5e1;
  }

  .role-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .role-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .role-info {
    flex: 1;
  }

  .role-name {
    margin: 0 0 4px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .role-code {
    display: inline-block;
    padding: 2px 8px;
    background: #f1f5f9;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #64748b;
    font-family: monospace;
  }

  .role-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .role-badge.activo {
    background: #dcfce7;
    color: #166534;
  }

  .role-badge.inactivo {
    background: #fee2e2;
    color: #991b1b;
  }

  .role-actions {
    display: flex;
    gap: 8px;
  }

  .toggle-btn,
  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1rem;
  }

  .edit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    color: #64748b;
  }

  .edit-btn:hover {
    background: #eff6ff;
    border-color: #93c5fd;
    color: #2563eb;
  }

  .toggle-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .toggle-btn.activo {
    background: #dcfce7;
    border-color: #86efac;
    color: #166534;
  }

  .toggle-btn.inactivo {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #991b1b;
  }

  .delete-btn:hover {
    background: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;
  }

  .delete-btn:disabled,
  .toggle-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .role-description {
    margin: 12px 0;
    color: #64748b;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .role-status {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.activo {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.inactivo {
    background: #fee2e2;
    color: #991b1b;
  }

  .feature-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    background: #dbeafe;
    color: #1e40af;
  }

  .visibility-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    background: #f3f4f6;
    color: #6b7280;
  }

  .form-section {
    margin-bottom: 32px;
  }

  .form-group {
    margin-bottom: 24px;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }

  .form-group input[type="text"],
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    transition: all 0.2s;
    font-family: inherit;
    background: white;
  }

  .form-group input[type="checkbox"] {
    width: auto;
    margin-right: 8px;
    cursor: pointer;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-group label input[type="checkbox"] {
    margin-right: 8px;
  }

  .form-hint {
    margin: 8px 0 0 0;
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .color-input-group {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .color-input-group input[type="color"] {
    width: 60px;
    height: 40px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
  }

  .color-input-group input[type="text"] {
    flex: 1;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding-top: 24px;
    border-top: 1px solid #f1f5f9;
    margin-top: 32px;
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

  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
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
    margin: 0;
    color: #64748b;
    font-size: 0.95rem;
    max-width: 360px;
  }

  /* Modal de confirmación para eliminar */
  .delete-modal-overlay {
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
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .delete-modal {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .delete-modal-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 32px 24px;
    border-bottom: 1px solid #e2e8f0;
  }

  .delete-modal-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #fef2f2;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #dc2626;
    margin-bottom: 16px;
  }

  .delete-modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #0f172a;
  }

  .delete-modal-body {
    padding: 24px 32px;
  }

  .delete-modal-message {
    font-size: 1rem;
    color: #334155;
    margin: 0 0 16px 0;
    line-height: 1.6;
  }

  .delete-modal-message strong {
    color: #0f172a;
    font-weight: 600;
  }

  .delete-modal-warning {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
  }

  .delete-modal-warning p {
    margin: 0 0 8px 0;
    font-size: 0.95rem;
    color: #991b1b;
    line-height: 1.5;
  }

  .delete-modal-warning p:last-child {
    margin-bottom: 0;
  }

  .delete-modal-warning strong {
    font-weight: 600;
    color: #7f1d1d;
  }

  .delete-modal-info {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
    font-size: 0.95rem;
    color: #0c4a6e;
  }

  .delete-modal-question {
    font-size: 1rem;
    color: #334155;
    margin: 16px 0 0 0;
    font-weight: 500;
  }

  .delete-modal-actions {
    display: flex;
    gap: 12px;
    padding: 24px 32px;
    border-top: 1px solid #e2e8f0;
    justify-content: flex-end;
  }

  .delete-modal-cancel,
  .delete-modal-confirm {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .delete-modal-cancel {
    background: #f1f5f9;
    color: #475569;
  }

  .delete-modal-cancel:hover:not(:disabled) {
    background: #e2e8f0;
    color: #334155;
  }

  .delete-modal-confirm {
    background: #dc2626;
    color: white;
  }

  .delete-modal-confirm:hover:not(:disabled) {
    background: #b91c1c;
  }

  .delete-modal-cancel:disabled,
  .delete-modal-confirm:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .delete-modal-confirm .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 768px) {
    .roles-grid {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .btn-cancel,
    .btn-primary {
      width: 100%;
      justify-content: center;
    }

    .delete-modal {
      max-width: 100%;
      margin: 0;
    }

    .delete-modal-header,
    .delete-modal-body,
    .delete-modal-actions {
      padding: 20px;
    }

    .delete-modal-actions {
      flex-direction: column-reverse;
    }

    .delete-modal-cancel,
    .delete-modal-confirm {
      width: 100%;
      justify-content: center;
    }
  }
`;

