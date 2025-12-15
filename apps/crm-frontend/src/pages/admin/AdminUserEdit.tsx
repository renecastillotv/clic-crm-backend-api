/**
 * AdminUserEdit - Página completa para editar un usuario existente
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { getUserById, updateUser, getAllPaises, getAllTenants, getAllRoles, Pais, AdminUser, UpdateUserData, TenantAdmin, Role } from '../../services/api';

export default function AdminUserEdit() {
  const { userId } = useParams<{ userId: string }>();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    codigoPais: '',
    idiomaPreferido: 'es',
    esPlatformAdmin: false,
    activo: true,
    password: '',
    confirmPassword: '',
    changePassword: false,
  });
  const [paises, setPaises] = useState<Pais[]>([]);
  const [tenants, setTenants] = useState<TenantAdmin[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedPlatformRoles, setSelectedPlatformRoles] = useState<string[]>([]);
  const [selectedTenantRoles, setSelectedTenantRoles] = useState<Record<string, string[]>>({});
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [userType, setUserType] = useState<'platform' | 'tenant' | 'both' | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadInitialData();
    }
  }, [userId]);

  const loadInitialData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      await Promise.all([
        loadUser(),
        loadPaises(),
        loadTenantsAndRoles(token),
      ]);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
      console.error('Error cargando datos:', err);
    }
  };

  const loadTenantsAndRoles = async (token: string) => {
    try {
      const [tenantsData, rolesData] = await Promise.all([
        getAllTenants(token),
        getAllRoles(token),
      ]);
      setTenants(tenantsData);
      setRoles(rolesData);
    } catch (err: any) {
      console.error('Error cargando tenants y roles:', err);
    }
  };

  const loadUser = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const user = await getUserById(userId, token);
      setFormData({
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        email: user.email,
        codigoPais: user.codigoPais || '',
        idiomaPreferido: user.idiomaPreferido || 'es',
        esPlatformAdmin: user.esPlatformAdmin || false,
        activo: user.activo !== undefined ? user.activo : true,
        password: '',
        confirmPassword: '',
        changePassword: false,
      });

      // Cargar tenants y roles del usuario
      const tenantIds = user.tenants.map(t => t.tenantId);
      setSelectedTenantIds(tenantIds);

      // Separar roles de platform y tenant
      const platformRoleIds: string[] = [];
      const tenantRoleMap: Record<string, string[]> = {};

      user.roles.forEach(role => {
        if (role.rolTipo === 'platform' && role.rolId) {
          platformRoleIds.push(role.rolId);
        } else if (role.rolTipo === 'tenant' && role.tenantId && role.rolId) {
          if (!tenantRoleMap[role.tenantId]) {
            tenantRoleMap[role.tenantId] = [];
          }
          tenantRoleMap[role.tenantId].push(role.rolId);
        }
      });

      setSelectedPlatformRoles(platformRoleIds);
      setSelectedTenantRoles(tenantRoleMap);

      // Determinar el tipo de usuario
      if (platformRoleIds.length > 0 && tenantIds.length > 0) {
        setUserType('both');
      } else if (platformRoleIds.length > 0) {
        setUserType('platform');
      } else if (tenantIds.length > 0) {
        setUserType('tenant');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuario');
      console.error('Error cargando usuario:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPaises = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setError('No se pudo obtener el token de autenticación');
        return;
      }
      const data = await getAllPaises(token);
      setPaises(data);
    } catch (err: any) {
      console.error('Error cargando países:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      // Validar contraseñas si se está cambiando
      if (formData.changePassword && formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        setSaving(false);
        return;
      }

      // Validar que se haya seleccionado un tipo y al menos un rol/tenant
      if (!userType) {
        setError('Debes seleccionar un tipo de usuario');
        setSaving(false);
        return;
      }

      if (userType === 'platform' && selectedPlatformRoles.length === 0) {
        setError('Debes seleccionar al menos un rol de plataforma');
        setSaving(false);
        return;
      }

      if (userType === 'tenant' && selectedTenantIds.length === 0) {
        setError('Debes seleccionar al menos un tenant');
        setSaving(false);
        return;
      }

      if (userType === 'both' && selectedPlatformRoles.length === 0 && selectedTenantIds.length === 0) {
        setError('Debes seleccionar al menos un rol de plataforma o un tenant');
        setSaving(false);
        return;
      }

      // Construir roleIds: roles de platform (tenantId: null) + roles de tenant
      const roleIds: { tenantId: string | null; roleId: string }[] = [];

      // Agregar roles de platform
      selectedPlatformRoles.forEach(roleId => {
        roleIds.push({ tenantId: null, roleId });
      });

      // Agregar roles de tenant
      selectedTenantIds.forEach(tenantId => {
        const tenantRoleIds = selectedTenantRoles[tenantId] || [];
        tenantRoleIds.forEach(roleId => {
          roleIds.push({ tenantId, roleId });
        });
      });

      // Determinar esPlatformAdmin basado en los roles de platform
      const hasPlatformRoles = selectedPlatformRoles.length > 0;

      const updateData: UpdateUserData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        idiomaPreferido: formData.idiomaPreferido,
        codigoPais: formData.codigoPais || undefined,
        esPlatformAdmin: hasPlatformRoles,
        activo: formData.activo,
        tenantIds: selectedTenantIds,
        roleIds,
      };

      // Solo incluir password si se quiere cambiar
      if (formData.changePassword && formData.password.trim()) {
        updateData.password = formData.password;
      }

      await updateUser(userId, updateData, token);
      navigate('/admin/usuarios');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar usuario');
      console.error('Error al actualizar usuario:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-user-edit-loading">
        <div className="loading-spinner"></div>
        <p>Cargando usuario...</p>
      </div>
    );
  }

  return (
    <div className="admin-user-edit">
      <div className="edit-container">
        <div className="edit-header">
          <button
            onClick={() => navigate('/admin/usuarios')}
            className="back-button"
          >
            ← Volver a Usuarios
          </button>
          <div>
            <h1>Editar Usuario</h1>
            <p className="page-subtitle">
              Modifica la información del usuario
            </p>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64547 18.3024 1.55311 18.6453 1.552 19C1.55089 19.3547 1.64105 19.6983 1.81377 19.9999C1.98649 20.3015 2.23616 20.5498 2.53752 20.7183C2.83887 20.8868 3.18067 20.9693 3.53 20.96H20.47C20.8193 20.9693 21.1611 20.8868 21.4625 20.7183C21.7638 20.5498 22.0135 20.3015 22.1862 19.9999C22.359 19.6983 22.4491 19.3547 22.448 19C22.4469 18.6453 22.3545 18.3024 22.18 18L13.71 3.86C13.5319 3.56609 13.2808 3.32312 12.9813 3.15447C12.6818 2.98582 12.3437 2.89726 12 2.89726C11.6563 2.89726 11.3182 2.98582 11.0187 3.15447C10.7192 3.32312 10.4681 3.56609 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-section">
            <h2 className="section-title">Información Personal</h2>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Nombre <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Juan"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Apellido <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Pérez"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@ejemplo.com"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>País</label>
                <select
                  value={formData.codigoPais}
                  onChange={(e) => setFormData({ ...formData, codigoPais: e.target.value })}
                >
                  <option value="">Sin asignar</option>
                  {paises.map((pais) => (
                    <option key={pais.codigo} value={pais.codigo}>
                      {pais.nombre} ({pais.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Idioma Preferido</label>
                <select
                  value={formData.idiomaPreferido}
                  onChange={(e) => setFormData({ ...formData, idiomaPreferido: e.target.value })}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="section-title">Tipo de Usuario y Accesos</h2>
            <p className="section-description">
              Define si este usuario será de plataforma, tenant o ambos, y asigna los roles correspondientes
            </p>

            <div className="form-group">
              <label className="form-label">Tipo de Usuario <span className="required">*</span></label>
              <div className="user-type-selector">
                <label className={`user-type-option ${userType === 'platform' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="userType"
                    value="platform"
                    checked={userType === 'platform'}
                    onChange={(e) => {
                      setUserType('platform');
                      setSelectedTenantIds([]);
                      setSelectedTenantRoles({});
                    }}
                  />
                  <div className="user-type-content">
                    <strong>Plataforma</strong>
                    <span>Usuario con acceso a la administración de la plataforma</span>
                  </div>
                </label>
                <label className={`user-type-option ${userType === 'tenant' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="userType"
                    value="tenant"
                    checked={userType === 'tenant'}
                    onChange={(e) => {
                      setUserType('tenant');
                      setSelectedPlatformRoles([]);
                    }}
                  />
                  <div className="user-type-content">
                    <strong>Tenant</strong>
                    <span>Usuario asignado a uno o más tenants específicos</span>
                  </div>
                </label>
                <label className={`user-type-option ${userType === 'both' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="userType"
                    value="both"
                    checked={userType === 'both'}
                    onChange={(e) => setUserType('both')}
                  />
                  <div className="user-type-content">
                    <strong>Ambos</strong>
                    <span>Usuario con acceso a plataforma y tenants</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Roles de Plataforma - Solo si es platform o both */}
            {(userType === 'platform' || userType === 'both') && (
              <div className="form-group" style={{ marginTop: '32px' }}>
                <label className="form-label">Roles de Plataforma</label>
                <p className="form-hint" style={{ marginBottom: '16px' }}>
                  Selecciona los roles que tendrá este usuario en la plataforma (puedes seleccionar múltiples)
                </p>
                {roles.filter(r => r.tipo === 'platform').length === 0 ? (
                  <p className="form-hint">No hay roles de plataforma disponibles</p>
                ) : (
                  <div className="roles-list">
                    {roles.filter(r => r.tipo === 'platform').map((role) => (
                      <label key={role.id} className="role-checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedPlatformRoles.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlatformRoles([...selectedPlatformRoles, role.id]);
                            } else {
                              setSelectedPlatformRoles(selectedPlatformRoles.filter(id => id !== role.id));
                            }
                          }}
                        />
                        <div className="role-info">
                          <span className="role-name">{role.nombre}</span>
                          {role.descripcion && (
                            <span className="role-description">{role.descripcion}</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Asignación a Tenants - Solo si es tenant o both */}
            {(userType === 'tenant' || userType === 'both') && (
              <div className="form-group" style={{ marginTop: '32px' }}>
                <label className="form-label">Asignación a Tenants</label>
                <p className="form-hint" style={{ marginBottom: '16px' }}>
                  Selecciona el tenant o tenants a los que pertenecerá este usuario y asigna uno o más roles para cada uno
                </p>
                {tenants.length === 0 ? (
                  <p className="form-hint">No hay tenants disponibles</p>
                ) : (
                  <div className="tenants-list">
                    {tenants.map((tenant) => {
                      const isSelected = selectedTenantIds.includes(tenant.id);
                      const tenantSelectedRoles = selectedTenantRoles[tenant.id] || [];
                      return (
                        <div key={tenant.id} className="tenant-selection-item">
                          <label className="checkbox-label tenant-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTenantIds([...selectedTenantIds, tenant.id]);
                                } else {
                                  setSelectedTenantIds(selectedTenantIds.filter(id => id !== tenant.id));
                                  const newSelectedRoles = { ...selectedTenantRoles };
                                  delete newSelectedRoles[tenant.id];
                                  setSelectedTenantRoles(newSelectedRoles);
                                }
                              }}
                            />
                            <span className="tenant-name">{tenant.nombre}</span>
                          </label>
                          {isSelected && (
                            <div className="tenant-roles">
                              <p className="tenant-roles-label">Roles disponibles para este tenant:</p>
                              <div className="roles-checkbox-list">
                                {roles.filter(r => r.tipo === 'tenant').map((role) => (
                                  <label key={role.id} className="role-checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={tenantSelectedRoles.includes(role.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedTenantRoles({
                                            ...selectedTenantRoles,
                                            [tenant.id]: [...tenantSelectedRoles, role.id],
                                          });
                                        } else {
                                          setSelectedTenantRoles({
                                            ...selectedTenantRoles,
                                            [tenant.id]: tenantSelectedRoles.filter(id => id !== role.id),
                                          });
                                        }
                                      }}
                                    />
                                    <div className="role-info">
                                      <span className="role-name">{role.nombre}</span>
                                      {role.descripcion && (
                                        <span className="role-description">{role.descripcion}</span>
                                      )}
                                    </div>
                                  </label>
                                ))}
                              </div>
                              {roles.filter(r => r.tipo === 'tenant').length === 0 && (
                                <p className="form-hint">No hay roles de tenant disponibles</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="form-group" style={{ marginTop: '32px' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                />
                <span>Usuario activo</span>
              </label>
              <p className="form-hint">
                Los usuarios inactivos no podrán iniciar sesión en el sistema
              </p>
            </div>
          </div>

          <div className="form-section">
            <h2 className="section-title">Cambiar Contraseña</h2>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.changePassword}
                  onChange={(e) => setFormData({ ...formData, changePassword: e.target.checked, password: '', confirmPassword: '' })}
                />
                <span>Cambiar contraseña</span>
              </label>
            </div>

            {formData.changePassword && (
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Nueva Contraseña <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    required={formData.changePassword}
                  />
                </div>
                <div className="form-group">
                  <label>
                    Confirmar Contraseña <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Repite la contraseña"
                    minLength={8}
                    required={formData.changePassword}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/admin/usuarios')}
              className="btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !formData.nombre.trim() || !formData.apellido.trim() || !formData.email.trim() || (formData.changePassword && (!formData.password.trim() || formData.password !== formData.confirmPassword)) || !userType || (userType === 'platform' && selectedPlatformRoles.length === 0) || (userType === 'tenant' && selectedTenantIds.length === 0) || (userType === 'both' && selectedPlatformRoles.length === 0 && selectedTenantIds.length === 0)}
              className="btn-primary"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .admin-user-edit {
          width: 100%;
          min-height: calc(100vh - 120px);
          padding: 0;
        }

        .admin-user-edit-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: #1E293B;
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

        .edit-container {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 32px;
        }

        .edit-header {
          margin-bottom: 32px;
        }

        .back-button {
          background: none;
          border: none;
          color: #2563EB;
          cursor: pointer;
          padding: 8px 0;
          margin-bottom: 16px;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s;
          font-weight: 500;
        }

        .back-button:hover {
          color: #1D4ED8;
          text-decoration: underline;
        }

        .edit-header h1 {
          font-size: 2.25rem;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          color: #64748B;
          font-size: 0.9375rem;
        }

        .error-message {
          background: #FEE2E2;
          border: 1px solid #FECACA;
          color: #DC2626;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
        }

        .error-icon {
          font-size: 1.5rem;
        }

        .edit-form {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          padding: 40px;
        }

        .form-section {
          margin-bottom: 40px;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0F172A;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #E2E8F0;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
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
          margin-left: 2px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px 16px;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          color: #0F172A;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .form-group input::placeholder {
          color: #94A3B8;
        }

        .form-group select {
          cursor: pointer;
        }

        .input-readonly {
          background: #F8FAFC !important;
          opacity: 0.7;
          cursor: not-allowed;
        }

        .form-group input:focus,
        .form-group select:focus {
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
          color: #334155;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .section-description {
          color: #64748B;
          font-size: 0.875rem;
          margin-bottom: 16px;
        }

        .tenants-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tenant-selection-item {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
        }

        .tenant-checkbox {
          margin-bottom: 8px;
        }

        .tenant-name {
          font-weight: 600;
          color: #0F172A;
          font-size: 1rem;
        }

        .tenant-roles {
          margin-left: 28px;
          padding-top: 12px;
          border-top: 1px solid #E2E8F0;
        }

        .tenant-roles-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 12px;
        }

        .roles-list,
        .roles-checkbox-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .role-checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .role-checkbox-label:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .role-checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          cursor: pointer;
          accent-color: #2563EB;
          flex-shrink: 0;
        }

        .role-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .role-name {
          font-weight: 500;
          color: #0F172A;
          font-size: 0.9375rem;
        }

        .role-description {
          font-size: 0.8125rem;
          color: #64748B;
          line-height: 1.4;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 12px;
        }

        .user-type-selector {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .user-type-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border: 2px solid #E2E8F0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          background: #FFFFFF;
        }

        .user-type-option:hover {
          border-color: #CBD5E1;
          background: #F8FAFC;
        }

        .user-type-option.active {
          border-color: #2563EB;
          background: #EFF6FF;
        }

        .user-type-option input[type="radio"] {
          width: 20px;
          height: 20px;
          margin-top: 2px;
          cursor: pointer;
          accent-color: #2563EB;
          flex-shrink: 0;
        }

        .user-type-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .user-type-content strong {
          font-size: 1rem;
          font-weight: 600;
          color: #0F172A;
        }

        .user-type-content span {
          font-size: 0.875rem;
          color: #64748B;
          line-height: 1.4;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          padding-top: 32px;
          border-top: 1px solid #E2E8F0;
          margin-top: 32px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 32px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #FFFFFF;
          color: #475569;
          border: 1px solid #CBD5E1;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #F8FAFC;
          border-color: #94A3B8;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

