/**
 * AdminRolPermisos - Gestión de Permisos por Rol
 *
 * Permite configurar qué módulos puede ver cada rol y con qué permisos
 * (puede_ver, puede_crear, puede_editar, puede_eliminar) y alcances (all, team, own)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  getAllRolesForManagement,
  getRolModulosMatrix,
  updateRolModulos,
  copyRolPermisos,
  RoleWithDates,
  RolModulosMatrix,
  RolModuloInput,
  ModuloConPermisos,
} from '../../services/api';

export default function AdminRolPermisos() {
  const { getToken } = useAuth();
  const [roles, setRoles] = useState<RoleWithDates[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [matrix, setMatrix] = useState<RolModulosMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Estado para permisos editados
  const [editedPermisos, setEditedPermisos] = useState<Map<string, {
    puedeVer: boolean;
    puedeCrear: boolean;
    puedeEditar: boolean;
    puedeEliminar: boolean;
    alcanceVer: 'all' | 'team' | 'own';
    alcanceEditar: 'all' | 'team' | 'own';
  }>>(new Map());

  // Modal para copiar permisos
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceRoleId, setCopySourceRoleId] = useState<string>('');

  // Cargar roles al inicio
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const rolesData = await getAllRolesForManagement(token);
      // Filtrar solo roles activos
      setRoles(rolesData.filter(r => r.activo));
    } catch (err: any) {
      setError(err.message || 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  // Cargar matriz cuando se selecciona un rol
  useEffect(() => {
    if (selectedRoleId) {
      loadMatrix(selectedRoleId);
    } else {
      setMatrix(null);
      setEditedPermisos(new Map());
    }
  }, [selectedRoleId]);

  const loadMatrix = async (roleId: string) => {
    try {
      setLoadingMatrix(true);
      setError(null);
      setHasChanges(false);
      const token = await getToken();
      const matrixData = await getRolModulosMatrix(roleId, token);
      setMatrix(matrixData);

      // Inicializar estado de permisos editados
      const permisos = new Map<string, any>();
      matrixData.modulos.forEach(modulo => {
        permisos.set(modulo.id, {
          puedeVer: modulo.permisos?.puedeVer ?? false,
          puedeCrear: modulo.permisos?.puedeCrear ?? false,
          puedeEditar: modulo.permisos?.puedeEditar ?? false,
          puedeEliminar: modulo.permisos?.puedeEliminar ?? false,
          alcanceVer: modulo.permisos?.alcanceVer ?? 'own',
          alcanceEditar: modulo.permisos?.alcanceEditar ?? 'own',
        });
      });
      setEditedPermisos(permisos);
    } catch (err: any) {
      setError(err.message || 'Error al cargar permisos del rol');
    } finally {
      setLoadingMatrix(false);
    }
  };

  // Manejar cambio de checkbox
  const handlePermisoChange = (
    moduloId: string,
    campo: 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar',
    valor: boolean
  ) => {
    setEditedPermisos(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(moduloId) || {
        puedeVer: false,
        puedeCrear: false,
        puedeEditar: false,
        puedeEliminar: false,
        alcanceVer: 'own' as const,
        alcanceEditar: 'own' as const,
      };

      // Si se desmarca "Ver", desmarcar los demás también
      if (campo === 'puedeVer' && !valor) {
        newMap.set(moduloId, {
          ...current,
          puedeVer: false,
          puedeCrear: false,
          puedeEditar: false,
          puedeEliminar: false,
        });
      } else {
        // Si se marca cualquier otro permiso, marcar "Ver" automáticamente
        if (valor && campo !== 'puedeVer') {
          newMap.set(moduloId, {
            ...current,
            puedeVer: true,
            [campo]: valor,
          });
        } else {
          newMap.set(moduloId, { ...current, [campo]: valor });
        }
      }

      return newMap;
    });
    setHasChanges(true);
    setSuccess(null);
  };

  // Manejar cambio de alcance
  const handleAlcanceChange = (
    moduloId: string,
    campo: 'alcanceVer' | 'alcanceEditar',
    valor: 'all' | 'team' | 'own'
  ) => {
    setEditedPermisos(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(moduloId);
      if (current) {
        newMap.set(moduloId, { ...current, [campo]: valor });
      }
      return newMap;
    });
    setHasChanges(true);
    setSuccess(null);
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!selectedRoleId || !matrix) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = await getToken();

      // Convertir Map a array de RolModuloInput
      const modulos: RolModuloInput[] = Array.from(editedPermisos.entries()).map(
        ([moduloId, permisos]) => ({
          moduloId,
          ...permisos,
        })
      );

      await updateRolModulos(selectedRoleId, modulos, token);
      setSuccess('Permisos guardados correctamente');
      setHasChanges(false);

      // Recargar matriz
      await loadMatrix(selectedRoleId);
    } catch (err: any) {
      setError(err.message || 'Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  };

  // Copiar permisos de otro rol
  const handleCopyPermisos = async () => {
    if (!selectedRoleId || !copySourceRoleId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = await getToken();
      const result = await copyRolPermisos(selectedRoleId, copySourceRoleId, token);

      setSuccess(`Se copiaron ${result.permisosCopiados} permisos correctamente`);
      setShowCopyModal(false);
      setCopySourceRoleId('');

      // Recargar matriz
      await loadMatrix(selectedRoleId);
    } catch (err: any) {
      setError(err.message || 'Error al copiar permisos');
    } finally {
      setSaving(false);
    }
  };

  // Marcar/desmarcar todos los permisos de una columna
  const handleToggleColumn = (campo: 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar') => {
    if (!matrix) return;

    // Verificar si todos están marcados
    const allChecked = matrix.modulos.every(m => editedPermisos.get(m.id)?.[campo]);

    setEditedPermisos(prev => {
      const newMap = new Map(prev);
      matrix.modulos.forEach(modulo => {
        const current = newMap.get(modulo.id);
        if (current) {
          if (campo === 'puedeVer') {
            // Si se desmarca Ver, desmarcar todos
            if (allChecked) {
              newMap.set(modulo.id, {
                ...current,
                puedeVer: false,
                puedeCrear: false,
                puedeEditar: false,
                puedeEliminar: false,
              });
            } else {
              newMap.set(modulo.id, { ...current, puedeVer: true });
            }
          } else {
            // Para otros permisos, marcar Ver también si se está marcando
            newMap.set(modulo.id, {
              ...current,
              [campo]: !allChecked,
              puedeVer: !allChecked ? true : current.puedeVer,
            });
          }
        }
      });
      return newMap;
    });
    setHasChanges(true);
    setSuccess(null);
  };

  // Roles filtrados para el selector (excluir el rol seleccionado)
  const rolesParaCopiar = roles.filter(r => r.id !== selectedRoleId);

  // Separar roles por tipo
  const rolesPlatform = roles.filter(r => r.tipo === 'platform');
  const rolesTenant = roles.filter(r => r.tipo === 'tenant');

  if (loading) {
    return (
      <div className="admin-permisos-loading">
        <div className="loading-spinner"></div>
        <p>Cargando roles...</p>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="admin-permisos">
      <div className="page-header">
        <div>
          <h1>Permisos por Rol</h1>
          <p className="page-subtitle">
            Configura qué módulos puede ver cada rol y con qué permisos
          </p>
        </div>
      </div>

      {/* Mensajes de error/éxito */}
      {error && (
        <div className="message-banner error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && (
        <div className="message-banner success">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {/* Selector de rol */}
      <div className="role-selector-section">
        <div className="role-selector">
          <label>Selecciona un rol para configurar sus permisos:</label>
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            disabled={loadingMatrix || saving}
          >
            <option value="">-- Seleccionar rol --</option>
            {rolesPlatform.length > 0 && (
              <optgroup label="Roles de Platform">
                {rolesPlatform.map(rol => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre} ({rol.codigo})
                  </option>
                ))}
              </optgroup>
            )}
            {rolesTenant.length > 0 && (
              <optgroup label="Roles de Tenant">
                {rolesTenant.map(rol => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre} ({rol.codigo})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {selectedRoleId && (
          <div className="role-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowCopyModal(true)}
              disabled={loadingMatrix || saving}
            >
              Copiar de otro rol
            </button>
          </div>
        )}
      </div>

      {/* Matriz de permisos */}
      {loadingMatrix ? (
        <div className="loading-matrix">
          <div className="loading-spinner"></div>
          <p>Cargando permisos...</p>
        </div>
      ) : matrix && (
        <div className="matrix-section">
          <div className="matrix-header">
            <h2>
              Permisos de: <span className="role-name">{matrix.rol.nombre}</span>
              <span className="role-type">{matrix.rol.tipo}</span>
            </h2>
            <div className="matrix-actions">
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          <div className="matrix-table-container">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="module-col">Módulo</th>
                  <th className="perm-col">
                    <div className="col-header">
                      <span>Ver</span>
                      <button
                        className="toggle-all-btn"
                        onClick={() => handleToggleColumn('puedeVer')}
                        title="Marcar/desmarcar todos"
                      >
                        ☑
                      </button>
                    </div>
                  </th>
                  <th className="perm-col">
                    <div className="col-header">
                      <span>Crear</span>
                      <button
                        className="toggle-all-btn"
                        onClick={() => handleToggleColumn('puedeCrear')}
                        title="Marcar/desmarcar todos"
                      >
                        ☑
                      </button>
                    </div>
                  </th>
                  <th className="perm-col">
                    <div className="col-header">
                      <span>Editar</span>
                      <button
                        className="toggle-all-btn"
                        onClick={() => handleToggleColumn('puedeEditar')}
                        title="Marcar/desmarcar todos"
                      >
                        ☑
                      </button>
                    </div>
                  </th>
                  <th className="perm-col">
                    <div className="col-header">
                      <span>Eliminar</span>
                      <button
                        className="toggle-all-btn"
                        onClick={() => handleToggleColumn('puedeEliminar')}
                        title="Marcar/desmarcar todos"
                      >
                        ☑
                      </button>
                    </div>
                  </th>
                  <th className="scope-col">Alcance Ver</th>
                  <th className="scope-col">Alcance Editar</th>
                </tr>
              </thead>
              <tbody>
                {matrix.modulos.map(modulo => {
                  const permisos = editedPermisos.get(modulo.id);
                  return (
                    <tr key={modulo.id} className={permisos?.puedeVer ? 'has-access' : 'no-access'}>
                      <td className="module-col">
                        <div className="module-info">
                          <span className="module-name">{modulo.nombre}</span>
                          <span className="module-code">{modulo.id}</span>
                          {modulo.categoria && (
                            <span className="module-category">{modulo.categoria}</span>
                          )}
                        </div>
                      </td>
                      <td className="perm-col">
                        <input
                          type="checkbox"
                          checked={permisos?.puedeVer ?? false}
                          onChange={(e) => handlePermisoChange(modulo.id, 'puedeVer', e.target.checked)}
                          disabled={saving}
                        />
                      </td>
                      <td className="perm-col">
                        <input
                          type="checkbox"
                          checked={permisos?.puedeCrear ?? false}
                          onChange={(e) => handlePermisoChange(modulo.id, 'puedeCrear', e.target.checked)}
                          disabled={saving || !permisos?.puedeVer}
                        />
                      </td>
                      <td className="perm-col">
                        <input
                          type="checkbox"
                          checked={permisos?.puedeEditar ?? false}
                          onChange={(e) => handlePermisoChange(modulo.id, 'puedeEditar', e.target.checked)}
                          disabled={saving || !permisos?.puedeVer}
                        />
                      </td>
                      <td className="perm-col">
                        <input
                          type="checkbox"
                          checked={permisos?.puedeEliminar ?? false}
                          onChange={(e) => handlePermisoChange(modulo.id, 'puedeEliminar', e.target.checked)}
                          disabled={saving || !permisos?.puedeVer}
                        />
                      </td>
                      <td className="scope-col">
                        <select
                          value={permisos?.alcanceVer ?? 'own'}
                          onChange={(e) => handleAlcanceChange(modulo.id, 'alcanceVer', e.target.value as any)}
                          disabled={saving || !permisos?.puedeVer}
                          className="scope-select"
                        >
                          <option value="own">Propios</option>
                          <option value="team">Equipo</option>
                          <option value="all">Todos</option>
                        </select>
                      </td>
                      <td className="scope-col">
                        <select
                          value={permisos?.alcanceEditar ?? 'own'}
                          onChange={(e) => handleAlcanceChange(modulo.id, 'alcanceEditar', e.target.value as any)}
                          disabled={saving || !permisos?.puedeEditar}
                          className="scope-select"
                        >
                          <option value="own">Propios</option>
                          <option value="team">Equipo</option>
                          <option value="all">Todos</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="legend">
            <h4>Leyenda de Alcances:</h4>
            <ul>
              <li><strong>Propios (own):</strong> Solo puede ver/editar/eliminar registros que le pertenecen</li>
              <li><strong>Equipo (team):</strong> Puede ver/editar/eliminar registros de su equipo</li>
              <li><strong>Todos (all):</strong> Puede ver/editar/eliminar todos los registros del tenant</li>
            </ul>
          </div>
        </div>
      )}

      {!selectedRoleId && !loading && (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Selecciona un rol</h3>
          <p>Elige un rol del selector de arriba para configurar sus permisos de acceso a los módulos del sistema.</p>
        </div>
      )}

      {/* Modal para copiar permisos */}
      {showCopyModal && (
        <div className="modal-overlay" onClick={() => setShowCopyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Copiar permisos de otro rol</h2>
              <button className="modal-close" onClick={() => setShowCopyModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                Esto reemplazará todos los permisos actuales del rol
                <strong> {matrix?.rol.nombre}</strong> con los permisos del rol seleccionado.
              </p>
              <div className="form-group">
                <label>Copiar permisos de:</label>
                <select
                  value={copySourceRoleId}
                  onChange={(e) => setCopySourceRoleId(e.target.value)}
                >
                  <option value="">-- Seleccionar rol origen --</option>
                  {rolesParaCopiar.map(rol => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre} ({rol.codigo}) - {rol.tipo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowCopyModal(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleCopyPermisos}
                disabled={saving || !copySourceRoleId}
              >
                {saving ? 'Copiando...' : 'Copiar permisos'}
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
  .admin-permisos {
    max-width: 1600px;
  }

  .admin-permisos-loading,
  .loading-matrix {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
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

  .page-header {
    margin-bottom: 32px;
  }

  .page-header h1 {
    margin: 0 0 8px 0;
    font-size: 2.25rem;
    font-weight: 700;
    color: #0F172A;
  }

  .page-subtitle {
    margin: 0;
    color: #64748B;
    font-size: 0.9375rem;
  }

  .message-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    margin-bottom: 24px;
    border-radius: 10px;
    font-weight: 500;
  }

  .message-banner.error {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
  }

  .message-banner.success {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    color: #16A34A;
  }

  .message-banner button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    line-height: 1;
  }

  .message-banner button:hover {
    opacity: 1;
  }

  .role-selector-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .role-selector {
    flex: 1;
  }

  .role-selector label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #334155;
    margin-bottom: 8px;
  }

  .role-selector select {
    width: 100%;
    max-width: 400px;
    padding: 12px 16px;
    border: 1px solid #CBD5E1;
    border-radius: 10px;
    font-size: 0.9375rem;
    color: #0F172A;
    background: #FFFFFF;
    cursor: pointer;
  }

  .role-selector select:focus {
    outline: none;
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .role-actions {
    display: flex;
    gap: 12px;
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

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
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
    opacity: 0.6;
    cursor: not-allowed;
  }

  .matrix-section {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    overflow: hidden;
  }

  .matrix-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
  }

  .matrix-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .role-name {
    color: #2563EB;
  }

  .role-type {
    display: inline-block;
    padding: 4px 12px;
    background: #DBEAFE;
    color: #1E40AF;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .matrix-table-container {
    overflow-x: auto;
  }

  .matrix-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .matrix-table th,
  .matrix-table td {
    padding: 12px 16px;
    text-align: center;
    border-bottom: 1px solid #E2E8F0;
  }

  .matrix-table th {
    background: #F1F5F9;
    font-weight: 600;
    color: #475569;
    white-space: nowrap;
  }

  .module-col {
    text-align: left !important;
    min-width: 200px;
  }

  .perm-col {
    width: 80px;
  }

  .scope-col {
    width: 120px;
  }

  .col-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .toggle-all-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    color: #64748B;
    padding: 2px;
  }

  .toggle-all-btn:hover {
    color: #2563EB;
  }

  .module-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .module-name {
    font-weight: 500;
    color: #0F172A;
  }

  .module-code {
    font-size: 0.75rem;
    color: #94A3B8;
    font-family: monospace;
  }

  .module-category {
    font-size: 0.65rem;
    color: white;
    background: #64748B;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    margin-left: 6px;
  }

  .matrix-table tr.has-access {
    background: #FAFFFE;
  }

  .matrix-table tr.no-access {
    background: #FAFAFA;
  }

  .matrix-table tr.no-access .module-name {
    color: #94A3B8;
  }

  .matrix-table input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #2563EB;
  }

  .matrix-table input[type="checkbox"]:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .scope-select {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    font-size: 0.75rem;
    background: #FFFFFF;
    cursor: pointer;
  }

  .scope-select:disabled {
    background: #F8FAFC;
    cursor: not-allowed;
    opacity: 0.5;
  }

  .legend {
    padding: 20px 24px;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
  }

  .legend h4 {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
  }

  .legend ul {
    margin: 0;
    padding: 0 0 0 20px;
    font-size: 0.8125rem;
    color: #64748B;
  }

  .legend li {
    margin-bottom: 4px;
  }

  .legend strong {
    color: #334155;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    background: #FFFFFF;
    border: 2px dashed #CBD5E1;
    border-radius: 12px;
    text-align: center;
  }

  .empty-icon {
    color: #94A3B8;
    margin-bottom: 16px;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0F172A;
  }

  .empty-state p {
    margin: 0;
    color: #64748B;
    max-width: 400px;
  }

  /* Modal */
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
    max-width: 500px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #E2E8F0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #0F172A;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #64748B;
    line-height: 1;
    padding: 4px;
  }

  .modal-close:hover {
    color: #0F172A;
  }

  .modal-body {
    padding: 24px;
  }

  .modal-body p {
    margin: 0 0 20px 0;
    color: #475569;
  }

  .modal-body strong {
    color: #0F172A;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #334155;
    margin-bottom: 8px;
  }

  .form-group select {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #CBD5E1;
    border-radius: 10px;
    font-size: 0.9375rem;
    color: #0F172A;
    background: #FFFFFF;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #E2E8F0;
  }

  @media (max-width: 1024px) {
    .matrix-table-container {
      margin: 0 -12px;
    }

    .matrix-table th,
    .matrix-table td {
      padding: 10px 8px;
    }

    .module-col {
      min-width: 150px;
    }

    .scope-col {
      width: 100px;
    }
  }

  @media (max-width: 768px) {
    .role-selector-section {
      flex-direction: column;
      align-items: stretch;
    }

    .role-actions {
      justify-content: flex-end;
    }

    .matrix-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }

    .matrix-actions {
      display: flex;
      justify-content: flex-end;
    }
  }
`;
