/**
 * CrmRolEditar - Crear/Editar rol del tenant con editor de permisos
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getRolTenant,
  createRolTenant,
  updateRolTenant,
  getGlobalRoles,
  getRolPermisos,
  saveRolPermisos,
  GlobalRol,
  ModuloPermiso,
} from '../../services/api';

// Iconos SVG
const Icons = {
  save: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
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
  shield: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  lock: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
};

interface PermisoLocal {
  moduloId: string;
  moduloNombre: string;
  moduloCategoria: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  alcanceVer: string;
  alcanceEditar: string;
}

const CATEGORIA_LABELS: Record<string, string> = {
  crm: 'CRM',
  finanzas: 'Finanzas',
  rendimiento: 'Rendimiento',
  web: 'Web / Contenido',
  comunicacion: 'Comunicación',
  tools: 'Herramientas',
  admin: 'Administración',
};

export default function CrmRolEditar() {
  const { tenantSlug, rolId } = useParams<{ tenantSlug: string; rolId: string }>();
  const { tenantActual, isTenantAdmin } = useAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const isEditing = rolId && rolId !== 'nuevo';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario básico
  const [form, setForm] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    color: '#667eea',
  });

  // Parent role
  const [globalRoles, setGlobalRoles] = useState<GlobalRol[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [parentModulos, setParentModulos] = useState<ModuloPermiso[]>([]);

  // Permisos del rol actual (editables)
  const [permisos, setPermisos] = useState<PermisoLocal[]>([]);

  // Configurar header
  useEffect(() => {
    const nombreInmobiliaria = tenantActual?.nombre || 'la inmobiliaria';
    setPageHeader({
      title: isEditing ? 'Editar Rol' : 'Nuevo Rol',
      subtitle: isEditing
        ? `Modifica el rol y sus permisos`
        : `Crea un nuevo rol para ${nombreInmobiliaria}`,
      backButton: {
        label: 'Volver a Usuarios',
        onClick: () => navigate(`/crm/${tenantSlug}/usuarios`),
      },
    });
  }, [setPageHeader, isEditing, tenantSlug, navigate, tenantActual?.nombre]);

  // Generar código automáticamente desde el nombre
  useEffect(() => {
    if (!isEditing && form.nombre && !form.codigo) {
      const codigo = form.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setForm(prev => ({ ...prev, codigo }));
    }
  }, [form.nombre, isEditing]);

  // Cargar datos iniciales
  useEffect(() => {
    async function cargarDatos() {
      if (!tenantActual?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Cargar roles globales disponibles
        const roles = await getGlobalRoles(tenantActual.id);
        setGlobalRoles(roles);

        if (isEditing && rolId) {
          // Cargar el rol
          const rolData = await getRolTenant(tenantActual.id, rolId);
          setForm({
            nombre: rolData.nombre || '',
            codigo: rolData.codigo || '',
            descripcion: rolData.descripcion || '',
            color: rolData.color || '#667eea',
          });

          // Si tiene parent, cargar sus permisos
          const parentId = rolData.parentId;
          if (parentId) {
            setSelectedParentId(parentId);
            const parentPerms = await getRolPermisos(tenantActual.id, parentId);
            setParentModulos(parentPerms);

            // Cargar permisos actuales del rol
            const rolPerms = await getRolPermisos(tenantActual.id, rolId);
            // Mapear con la info del padre
            const permisosLocales = parentPerms.map(pm => {
              const existente = rolPerms.find(rp => rp.moduloId === pm.moduloId);
              return {
                moduloId: pm.moduloId,
                moduloNombre: pm.moduloNombre,
                moduloCategoria: pm.moduloCategoria,
                puedeVer: existente ? existente.puedeVer : false,
                puedeCrear: existente ? existente.puedeCrear : false,
                puedeEditar: existente ? existente.puedeEditar : false,
                puedeEliminar: existente ? existente.puedeEliminar : false,
                alcanceVer: existente ? existente.alcanceVer : 'own',
                alcanceEditar: existente ? existente.alcanceEditar : 'own',
              };
            });
            setPermisos(permisosLocales);
          }
        }
      } catch (err: any) {
        console.error('Error cargando datos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, [tenantActual?.id, isEditing, rolId]);

  // Al seleccionar un parent, cargar sus módulos
  const handleParentChange = async (parentId: string) => {
    setSelectedParentId(parentId);
    if (!parentId || !tenantActual?.id) {
      setParentModulos([]);
      setPermisos([]);
      return;
    }

    try {
      const parentPerms = await getRolPermisos(tenantActual.id, parentId);
      setParentModulos(parentPerms);

      // Inicializar permisos con todo habilitado (hereda todo del padre por default)
      const permisosIniciales = parentPerms.map(pm => ({
        moduloId: pm.moduloId,
        moduloNombre: pm.moduloNombre,
        moduloCategoria: pm.moduloCategoria,
        puedeVer: pm.puedeVer,
        puedeCrear: pm.puedeCrear,
        puedeEditar: pm.puedeEditar,
        puedeEliminar: pm.puedeEliminar,
        alcanceVer: pm.alcanceVer,
        alcanceEditar: pm.alcanceEditar,
      }));
      setPermisos(permisosIniciales);
    } catch (err: any) {
      setError('Error cargando permisos del rol padre: ' + err.message);
    }
  };

  // Toggle un permiso
  const togglePermiso = (moduloId: string, campo: 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar') => {
    setPermisos(prev => prev.map(p => {
      if (p.moduloId !== moduloId) return p;
      const newVal = !p[campo];
      // Si desactiva "ver", desactivar todo lo demás
      if (campo === 'puedeVer' && !newVal) {
        return { ...p, puedeVer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false };
      }
      // Si activa crear/editar/eliminar, activar "ver" también
      if (campo !== 'puedeVer' && newVal && !p.puedeVer) {
        return { ...p, [campo]: true, puedeVer: true };
      }
      return { ...p, [campo]: newVal };
    }));
  };

  // Cambiar alcance
  const changeAlcance = (moduloId: string, campo: 'alcanceVer' | 'alcanceEditar', valor: string) => {
    setPermisos(prev => prev.map(p =>
      p.moduloId === moduloId ? { ...p, [campo]: valor } : p
    ));
  };

  // Guardar
  const handleSave = async () => {
    if (!tenantActual?.id || !form.nombre.trim() || !form.codigo.trim()) {
      setError('Nombre y código son requeridos');
      return;
    }

    if (!selectedParentId) {
      setError('Debes seleccionar un rol base (padre)');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      let targetRolId = rolId;

      if (isEditing && rolId) {
        await updateRolTenant(tenantActual.id, rolId, {
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          color: form.color || undefined,
        });
      } else {
        const nuevoRol = await createRolTenant(tenantActual.id, {
          nombre: form.nombre,
          codigo: form.codigo,
          descripcion: form.descripcion || undefined,
          color: form.color || undefined,
        });
        targetRolId = nuevoRol.id;
      }

      // Guardar permisos
      const permisosToSave = permisos
        .filter(p => p.puedeVer) // Solo guardar módulos con al menos "ver"
        .map(p => ({
          moduloId: p.moduloId,
          puedeVer: p.puedeVer,
          puedeCrear: p.puedeCrear,
          puedeEditar: p.puedeEditar,
          puedeEliminar: p.puedeEliminar,
          alcanceVer: p.alcanceVer,
          alcanceEditar: p.alcanceEditar,
        }));

      await saveRolPermisos(tenantActual.id, targetRolId!, selectedParentId, permisosToSave);

      setSuccessMsg('Rol y permisos guardados correctamente');
      setTimeout(() => {
        navigate(`/crm/${tenantSlug}/usuarios`);
      }, 1000);
    } catch (err: any) {
      console.error('Error al guardar rol:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Agrupar permisos por categoría
  const permisosPorCategoria = permisos.reduce<Record<string, PermisoLocal[]>>((acc, p) => {
    const cat = p.moduloCategoria || 'otro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  // Verificar si un permiso está disponible en el padre
  const parentTiene = (moduloId: string, campo: 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar'): boolean => {
    const pm = parentModulos.find(m => m.moduloId === moduloId);
    return pm ? pm[campo] : false;
  };

  const parentAlcance = (moduloId: string, campo: 'alcanceVer' | 'alcanceEditar'): string => {
    const pm = parentModulos.find(m => m.moduloId === moduloId);
    return pm ? pm[campo] : 'own';
  };

  // Alcances posibles limitados por el padre
  const getAlcancesDisponibles = (moduloId: string, campo: 'alcanceVer' | 'alcanceEditar'): string[] => {
    const parentVal = parentAlcance(moduloId, campo);
    const niveles = ['own', 'team', 'all'];
    const maxIdx = niveles.indexOf(parentVal);
    return niveles.slice(0, maxIdx + 1);
  };

  if (!isTenantAdmin) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon"><Icons.shield /></div>
          <h3>Acceso restringido</h3>
          <p>No tienes permisos para gestionar roles.</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <Icons.loader className="spinner" />
          <p>Cargando...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="form-container">
        {/* Mensajes */}
        {error && (
          <div className="msg-banner error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}
        {successMsg && (
          <div className="msg-banner success-banner">
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {/* Sección: Información del rol */}
          <div className="form-section">
            <h3 className="form-section-title">
              <Icons.shield />
              Información del Rol
            </h3>

            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del Rol *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Asesor Junior"
                  required
                />
              </div>

              <div className="form-group">
                <label>Código *</label>
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                  placeholder="ej: asesor_junior"
                  required
                  disabled={!!isEditing}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Describe qué puede hacer un usuario con este rol..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Color</label>
              <div className="color-picker-group">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                  className="color-input"
                />
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                  className="color-text-input"
                />
              </div>
            </div>
          </div>

          {/* Sección: Tipo de Rol */}
          <div className="form-section">
            <h3 className="form-section-title">
              <Icons.lock />
              Tipo de Rol
            </h3>
            <p className="section-hint">
              Selecciona el tipo de rol base. Los permisos disponibles dependerán del tipo seleccionado.
            </p>

            <div className="parent-roles-grid">
              {globalRoles.map(gr => (
                <button
                  key={gr.id}
                  type="button"
                  className={`parent-role-card ${selectedParentId === gr.id ? 'selected' : ''}`}
                  onClick={() => handleParentChange(gr.id)}
                >
                  <div className="parent-role-indicator" style={{ background: gr.color || '#6366f1' }} />
                  <div className="parent-role-content">
                    <span className="parent-role-name">{gr.nombre}</span>
                    {gr.descripcion && (
                      <span className="parent-role-desc">{gr.descripcion}</span>
                    )}
                  </div>
                  {selectedParentId === gr.id && (
                    <div className="parent-role-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {globalRoles.length === 0 && (
              <div className="empty-permisos">
                <Icons.lock />
                <p>No hay tipos de rol disponibles. Contacta al administrador de la plataforma.</p>
              </div>
            )}
          </div>

          {/* Sección: Permisos */}
          {selectedParentId && permisos.length > 0 && (
            <div className="form-section">
              <h3 className="form-section-title">
                <Icons.shield />
                Permisos del Rol
              </h3>
              <p className="section-hint">
                Marca los permisos que deseas conceder. Los permisos no disponibles en el rol base aparecen deshabilitados.
              </p>

              <div className="permisos-table-wrapper">
                <table className="permisos-table">
                  <thead>
                    <tr>
                      <th className="col-modulo">Módulo</th>
                      <th className="col-perm">Ver</th>
                      <th className="col-perm">Crear</th>
                      <th className="col-perm">Editar</th>
                      <th className="col-perm">Eliminar</th>
                      <th className="col-alcance">Alcance Ver</th>
                      <th className="col-alcance">Alcance Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(permisosPorCategoria).map(([cat, mods]) => (
                      <>
                        <tr key={`cat-${cat}`} className="categoria-row">
                          <td colSpan={7}>{CATEGORIA_LABELS[cat] || cat}</td>
                        </tr>
                        {mods.map(perm => (
                          <tr key={perm.moduloId} className={perm.puedeVer ? 'row-active' : 'row-inactive'}>
                            <td className="col-modulo">{perm.moduloNombre}</td>
                            <td className="col-perm">
                              <input
                                type="checkbox"
                                checked={perm.puedeVer}
                                disabled={!parentTiene(perm.moduloId, 'puedeVer')}
                                onChange={() => togglePermiso(perm.moduloId, 'puedeVer')}
                              />
                            </td>
                            <td className="col-perm">
                              <input
                                type="checkbox"
                                checked={perm.puedeCrear}
                                disabled={!parentTiene(perm.moduloId, 'puedeCrear')}
                                onChange={() => togglePermiso(perm.moduloId, 'puedeCrear')}
                              />
                            </td>
                            <td className="col-perm">
                              <input
                                type="checkbox"
                                checked={perm.puedeEditar}
                                disabled={!parentTiene(perm.moduloId, 'puedeEditar')}
                                onChange={() => togglePermiso(perm.moduloId, 'puedeEditar')}
                              />
                            </td>
                            <td className="col-perm">
                              <input
                                type="checkbox"
                                checked={perm.puedeEliminar}
                                disabled={!parentTiene(perm.moduloId, 'puedeEliminar')}
                                onChange={() => togglePermiso(perm.moduloId, 'puedeEliminar')}
                              />
                            </td>
                            <td className="col-alcance">
                              {perm.puedeVer ? (
                                <select
                                  value={perm.alcanceVer}
                                  onChange={(e) => changeAlcance(perm.moduloId, 'alcanceVer', e.target.value)}
                                >
                                  {getAlcancesDisponibles(perm.moduloId, 'alcanceVer').map(a => (
                                    <option key={a} value={a}>{a === 'own' ? 'Propio' : a === 'team' ? 'Equipo' : 'Todos'}</option>
                                  ))}
                                </select>
                              ) : <span className="alcance-disabled">-</span>}
                            </td>
                            <td className="col-alcance">
                              {perm.puedeEditar ? (
                                <select
                                  value={perm.alcanceEditar}
                                  onChange={(e) => changeAlcance(perm.moduloId, 'alcanceEditar', e.target.value)}
                                >
                                  {getAlcancesDisponibles(perm.moduloId, 'alcanceEditar').map(a => (
                                    <option key={a} value={a}>{a === 'own' ? 'Propio' : a === 'team' ? 'Equipo' : 'Todos'}</option>
                                  ))}
                                </select>
                              ) : <span className="alcance-disabled">-</span>}
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedParentId && permisos.length === 0 && (
            <div className="form-section">
              <div className="empty-permisos">
                <Icons.lock />
                <p>El rol base seleccionado no tiene módulos configurados.</p>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(`/crm/${tenantSlug}/usuarios`)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !form.nombre.trim() || !form.codigo.trim() || !selectedParentId}
            >
              {saving ? (
                <>
                  <Icons.loader className="spinner" />
                  Guardando...
                </>
              ) : (
                <>
                  <Icons.save />
                  {isEditing ? 'Guardar Cambios' : 'Crear Rol'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

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

  .form-container {
    max-width: 100%;
    width: 100%;
    background: white;
    border-radius: 16px;
    padding: 32px;
    border: 1px solid #e2e8f0;
  }

  .msg-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    font-size: 0.9rem;
  }

  .msg-banner button {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    opacity: 0.7;
  }

  .error-banner {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
  }

  .success-banner {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #16a34a;
  }

  .form-section {
    margin-bottom: 32px;
  }

  .form-section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 16px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
    padding-bottom: 12px;
    border-bottom: 2px solid #f1f5f9;
  }

  .section-hint {
    margin: 0 0 16px 0;
    font-size: 0.85rem;
    color: #64748b;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .form-group {
    margin-bottom: 16px;
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
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    transition: all 0.2s;
    font-family: inherit;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-group input:disabled {
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
  }

  .color-picker-group {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .color-input {
    width: 50px;
    height: 36px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    padding: 2px;
  }

  .color-text-input {
    flex: 1;
    max-width: 120px;
  }

  /* Parent role cards */
  .parent-roles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }

  .parent-role-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    position: relative;
  }

  .parent-role-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }

  .parent-role-card.selected {
    border-color: #6366f1;
    background: #f5f3ff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }

  .parent-role-indicator {
    width: 6px;
    height: 36px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .parent-role-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .parent-role-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: #1e293b;
  }

  .parent-role-desc {
    font-size: 0.8rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .parent-role-check {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #6366f1;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* Tabla de permisos */
  .permisos-table-wrapper {
    overflow-x: auto;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }

  .permisos-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .permisos-table thead {
    background: #f8fafc;
  }

  .permisos-table th {
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    white-space: nowrap;
  }

  .permisos-table td {
    padding: 10px 16px;
    border-bottom: 1px solid #f1f5f9;
  }

  .col-modulo {
    min-width: 160px;
    font-weight: 500;
  }

  .col-perm {
    text-align: center !important;
    width: 60px;
  }

  .col-perm input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #6366f1;
  }

  .col-perm input[type="checkbox"]:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }

  .col-alcance {
    width: 120px;
  }

  .col-alcance select {
    padding: 4px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.8rem;
    background: white;
    width: 100%;
  }

  .alcance-disabled {
    color: #cbd5e1;
    text-align: center;
    display: block;
  }

  .categoria-row td {
    background: #f1f5f9;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #475569;
    padding: 8px 16px;
  }

  .row-active {
    background: white;
  }

  .row-inactive {
    background: #fafafa;
  }

  .row-inactive .col-modulo {
    color: #94a3b8;
  }

  .empty-permisos {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px;
    background: #f8fafc;
    border-radius: 12px;
    color: #64748b;
    text-align: center;
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

  @media (max-width: 768px) {
    .form-container {
      padding: 20px;
    }

    .form-grid {
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

    .permisos-table {
      font-size: 0.75rem;
    }

    .permisos-table th,
    .permisos-table td {
      padding: 8px 10px;
    }
  }
`;
