/**
 * CrmUsuarioEditar - Crear/Editar usuario del tenant
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import {
  getUsuarioTenant,
  getRolesTenant,
  createUsuarioTenant,
  updateUsuarioTenant,
  getDocumentosUsuario,
  crearDocumentoUsuario,
  eliminarDocumentoUsuario,
  UsuarioTenant,
  RolTenant,
  UsuarioDocumento,
} from '../../services/api';
import DatePicker from '../../components/DatePicker';

// Iconos SVG como funciones que retornan JSX
const Icons = {
  arrowLeft: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
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
  user: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  shield: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
};

export default function CrmUsuarioEditar() {
  const { tenantSlug, usuarioId } = useParams<{ tenantSlug: string; usuarioId: string }>();
  const { tenantActual, isTenantAdmin } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const isEditing = usuarioId && usuarioId !== 'nuevo';
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RolTenant[]>([]);
  const [usuario, setUsuario] = useState<UsuarioTenant | null>(null);
  const [documentos, setDocumentos] = useState<UsuarioDocumento[]>([]);
  const [activeTab, setActiveTab] = useState<'basica' | 'permisos' | 'documentacion'>('basica');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Formulario
  const [form, setForm] = useState({
    email: '',
    nombre: '',
    apellido: '',
    telefono: '',
    // Campos extendidos
    cedula: '',
    fechaNacimiento: '',
    direccion: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
    pais: '',
    empresa: '',
    cargo: '',
    departamento: '',
    notas: '',
    // Permisos
    rolIds: [] as string[],
    esOwner: false,
    activo: true,
  });

  // Configurar header
  useEffect(() => {
    const nombreInmobiliaria = tenantActual?.nombre || 'la inmobiliaria';
    setPageHeader({
      title: isEditing ? 'Editar Usuario' : 'Nuevo Usuario',
      subtitle: isEditing 
        ? `Modifica la información y roles del usuario de ${nombreInmobiliaria}` 
        : `Agrega un nuevo usuario a ${nombreInmobiliaria}`,
      backButton: {
        label: 'Volver a Usuarios',
        onClick: () => navigate(`/crm/${tenantSlug}/usuarios`),
      },
    });
  }, [setPageHeader, isEditing, tenantSlug, navigate, tenantActual?.nombre]);

  // Cargar datos
  useEffect(() => {
    async function cargarDatos() {
      if (!tenantActual?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Cargar roles
        const token = await getToken();
        const rolesData = await getRolesTenant(tenantActual.id, token).catch((err) => {
          // Si es error de conexión, devolver array vacío
          if (err.message?.includes('No se pudo conectar')) {
            console.warn('API no disponible, usando roles vacíos');
            return [];
          }
          throw err;
        });
        setRoles(Array.isArray(rolesData) ? rolesData : []);

        // Si es edición, cargar usuario
        if (isEditing && usuarioId) {
          const usuarioData = await getUsuarioTenant(tenantActual.id, usuarioId);
          setUsuario(usuarioData);
          setForm({
            email: usuarioData.email,
            nombre: usuarioData.nombre || '',
            apellido: usuarioData.apellido || '',
            telefono: usuarioData.telefono || '',
            // Campos extendidos
            cedula: usuarioData.cedula || '',
            fechaNacimiento: usuarioData.fechaNacimiento || '',
            direccion: usuarioData.direccion || '',
            ciudad: usuarioData.ciudad || '',
            estado: usuarioData.estado || '',
            codigoPostal: usuarioData.codigoPostal || '',
            pais: usuarioData.pais || '',
            empresa: usuarioData.empresa || '',
            cargo: usuarioData.cargo || '',
            departamento: usuarioData.departamento || '',
            notas: usuarioData.notas || '',
            // Permisos
            rolIds: usuarioData.roles?.map(r => r.id) || [],
            esOwner: usuarioData.esOwner || false,
            activo: usuarioData.activo !== undefined ? usuarioData.activo : true,
          });
          
          // Cargar documentos
          try {
            const docs = await getDocumentosUsuario(tenantActual.id, usuarioId);
            setDocumentos(docs);
          } catch (err) {
            console.warn('Error cargando documentos:', err);
            setDocumentos([]);
          }
        }
      } catch (err: any) {
        console.error('Error cargando datos:', err);
        if (err.message?.includes('No se pudo conectar')) {
          setError('No se pudo conectar con el servidor. Verifica que la API esté corriendo.');
        } else {
          setError(err.message || 'Error al cargar datos');
        }
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, [tenantActual?.id, isEditing, usuarioId]);

  // Guardar
  const handleSave = async () => {
    if (!tenantActual?.id || !form.email.trim()) {
      setError('El email es requerido');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditing && usuarioId) {
        await updateUsuarioTenant(tenantActual.id, usuarioId, {
          nombre: form.nombre || undefined,
          apellido: form.apellido || undefined,
          telefono: form.telefono || undefined,
          // Campos extendidos
          cedula: form.cedula || undefined,
          fechaNacimiento: form.fechaNacimiento || undefined,
          direccion: form.direccion || undefined,
          ciudad: form.ciudad || undefined,
          estado: form.estado || undefined,
          codigoPostal: form.codigoPostal || undefined,
          pais: form.pais || undefined,
          empresa: form.empresa || undefined,
          cargo: form.cargo || undefined,
          departamento: form.departamento || undefined,
          notas: form.notas || undefined,
          // Permisos
          rolIds: form.rolIds,
          esOwner: form.esOwner,
          activo: form.activo,
        });
      } else {
        await createUsuarioTenant(tenantActual.id, {
          email: form.email,
          nombre: form.nombre || undefined,
          apellido: form.apellido || undefined,
          telefono: form.telefono || undefined,
          // Campos extendidos
          cedula: form.cedula || undefined,
          fechaNacimiento: form.fechaNacimiento || undefined,
          direccion: form.direccion || undefined,
          ciudad: form.ciudad || undefined,
          estado: form.estado || undefined,
          codigoPostal: form.codigoPostal || undefined,
          pais: form.pais || undefined,
          empresa: form.empresa || undefined,
          cargo: form.cargo || undefined,
          departamento: form.departamento || undefined,
          notas: form.notas || undefined,
          // Permisos
          rolIds: form.rolIds,
          esOwner: form.esOwner,
        });
      }

      navigate(`/crm/${tenantSlug}/usuarios`);
    } catch (err: any) {
      console.error('Error al guardar usuario:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle rol
  const handleToggleRol = (rolId: string) => {
    setForm(prev => ({
      ...prev,
      rolIds: prev.rolIds.includes(rolId)
        ? prev.rolIds.filter(id => id !== rolId)
        : [...prev.rolIds, rolId],
    }));
  };

  if (!isTenantAdmin) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">
            <Icons.shield />
          </div>
          <h3>Acceso restringido</h3>
          <p>No tienes permisos para gestionar usuarios de {tenantActual?.nombre || 'esta inmobiliaria'}.</p>
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
        {/* Error banner */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs-header">
            <button
              type="button"
              className={`tab-button ${activeTab === 'basica' ? 'active' : ''}`}
              onClick={() => setActiveTab('basica')}
            >
              <Icons.user />
              Información Básica
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'permisos' ? 'active' : ''}`}
              onClick={() => setActiveTab('permisos')}
            >
              <Icons.shield />
              Permisos y Roles
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'documentacion' ? 'active' : ''}`}
              onClick={() => setActiveTab('documentacion')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              Documentación
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {/* Tab: Información Básica */}
            {activeTab === 'basica' && (
              <div className="tab-content">
                <div className="form-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="usuario@ejemplo.com"
                        required
                        disabled={isEditing}
                      />
                      {isEditing && (
                        <p className="form-hint">El email no se puede modificar una vez creado el usuario</p>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Nombre</label>
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Nombre"
                      />
                    </div>
                    <div className="form-group">
                      <label>Apellido</label>
                      <input
                        type="text"
                        value={form.apellido}
                        onChange={(e) => setForm(prev => ({ ...prev, apellido: e.target.value }))}
                        placeholder="Apellido"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input
                        type="tel"
                        value={form.telefono}
                        onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div className="form-group">
                      <label>Cédula</label>
                      <input
                        type="text"
                        value={form.cedula}
                        onChange={(e) => setForm(prev => ({ ...prev, cedula: e.target.value }))}
                        placeholder="Número de cédula"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Fecha de Nacimiento</label>
                      <DatePicker
                        value={form.fechaNacimiento || null}
                        onChange={(value) => setForm(prev => ({ ...prev, fechaNacimiento: value || '' }))}
                        placeholder="dd/mm/aaaa"
                        maxDate={new Date()}
                        clearable={true}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Dirección</label>
                      <input
                        type="text"
                        value={form.direccion}
                        onChange={(e) => setForm(prev => ({ ...prev, direccion: e.target.value }))}
                        placeholder="Dirección completa"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Ciudad</label>
                      <input
                        type="text"
                        value={form.ciudad}
                        onChange={(e) => setForm(prev => ({ ...prev, ciudad: e.target.value }))}
                        placeholder="Ciudad"
                      />
                    </div>
                    <div className="form-group">
                      <label>Estado/Provincia</label>
                      <input
                        type="text"
                        value={form.estado}
                        onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value }))}
                        placeholder="Estado"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Código Postal</label>
                      <input
                        type="text"
                        value={form.codigoPostal}
                        onChange={(e) => setForm(prev => ({ ...prev, codigoPostal: e.target.value }))}
                        placeholder="Código postal"
                      />
                    </div>
                    <div className="form-group">
                      <label>País</label>
                      <input
                        type="text"
                        value={form.pais}
                        onChange={(e) => setForm(prev => ({ ...prev, pais: e.target.value }))}
                        placeholder="País"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Empresa</label>
                      <input
                        type="text"
                        value={form.empresa}
                        onChange={(e) => setForm(prev => ({ ...prev, empresa: e.target.value }))}
                        placeholder="Empresa u organización"
                      />
                    </div>
                    <div className="form-group">
                      <label>Cargo</label>
                      <input
                        type="text"
                        value={form.cargo}
                        onChange={(e) => setForm(prev => ({ ...prev, cargo: e.target.value }))}
                        placeholder="Cargo o puesto"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Departamento</label>
                      <input
                        type="text"
                        value={form.departamento}
                        onChange={(e) => setForm(prev => ({ ...prev, departamento: e.target.value }))}
                        placeholder="Departamento"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Notas</label>
                      <textarea
                        value={form.notas}
                        onChange={(e) => setForm(prev => ({ ...prev, notas: e.target.value }))}
                        placeholder="Notas adicionales sobre el usuario"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Permisos y Roles */}
            {activeTab === 'permisos' && (
              <div className="tab-content">
                <div className="form-section">
                  {roles.length === 0 ? (
                    <p className="form-hint">No hay roles disponibles para {tenantActual?.nombre || 'esta inmobiliaria'}</p>
                  ) : (
                    <div className="roles-grid">
                      {roles
                        .filter((rol) => {
                          const nombreRol = rol.nombre?.toLowerCase() || '';
                          const codigoRol = rol.codigo?.toLowerCase() || '';
                          return !nombreRol.includes('dueño') && !codigoRol.includes('owner');
                        })
                        .map((rol) => {
                          const nombreRol = rol.nombre?.replace(/tenant/gi, tenantActual?.nombre || 'la inmobiliaria') || rol.nombre;
                          const descripcionRol = rol.descripcion?.replace(/tenant/gi, tenantActual?.nombre || 'la inmobiliaria') || rol.descripcion;
                          
                          return (
                            <label key={rol.id} className="role-checkbox">
                              <input
                                type="checkbox"
                                checked={form.rolIds.includes(rol.id)}
                                onChange={() => handleToggleRol(rol.id)}
                              />
                              <div className="role-content">
                                <span className="role-name">{nombreRol}</span>
                                {descripcionRol && (
                                  <span className="role-desc">{descripcionRol}</span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  )}

                  <div className="form-group checkbox-group" style={{ marginTop: '20px' }}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.esOwner}
                        onChange={(e) => setForm(prev => ({ ...prev, esOwner: e.target.checked }))}
                      />
                      <div className="checkbox-content">
                        <span className="checkbox-title">
                          Dueño de {tenantActual?.nombre || 'la inmobiliaria'}
                        </span>
                        <span className="checkbox-desc">
                          El usuario tendrá acceso completo y podrá gestionar todos los aspectos de {tenantActual?.nombre || 'la inmobiliaria'}
                        </span>
                      </div>
                    </label>
                  </div>

                  {isEditing && (
                    <div className="form-group checkbox-group" style={{ marginTop: '20px' }}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={form.activo}
                          onChange={(e) => setForm(prev => ({ ...prev, activo: e.target.checked }))}
                        />
                        <div className="checkbox-content">
                          <span className="checkbox-title">Usuario Activo</span>
                          <span className="checkbox-desc">
                            Los usuarios inactivos no pueden acceder a {tenantActual?.nombre || 'la inmobiliaria'}
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Documentación */}
            {activeTab === 'documentacion' && (
              <div className="tab-content">
                <div className="form-section">
                  <div className="documentos-header">
                    <h4>Documentos Adjuntos</h4>
                    <p className="form-hint">Adjunta documentos como cédula, contratos, certificados, etc.</p>
                  </div>

                  {isEditing && usuarioId && (
                    <>
                      <div className="documentos-list">
                        {documentos.length === 0 ? (
                          <div className="empty-docs">
                            <p>No hay documentos adjuntos</p>
                          </div>
                        ) : (
                          documentos.map((doc) => (
                            <div key={doc.id} className="documento-item">
                              <div className="documento-info">
                                <span className="documento-nombre">{doc.nombre}</span>
                                <span className="documento-tipo">{doc.tipo}</span>
                                {doc.descripcion && (
                                  <span className="documento-desc">{doc.descripcion}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn-delete-doc"
                                onClick={async () => {
                                  if (confirm('¿Eliminar este documento?')) {
                                    try {
                                      await eliminarDocumentoUsuario(tenantActual!.id, usuarioId, doc.id);
                                      setDocumentos(prev => prev.filter(d => d.id !== doc.id));
                                    } catch (err: any) {
                                      setError(err.message);
                                    }
                                  }
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="upload-section">
                        <input
                          type="file"
                          id="file-upload"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !tenantActual?.id || !usuarioId) return;

                            try {
                              setUploadingDoc(true);
                              setError(null);
                              
                              // TODO: Implementar subida de archivo al servidor
                              // Por ahora, solo creamos el registro con información básica
                              const nuevoDoc = await crearDocumentoUsuario(
                                tenantActual.id,
                                usuarioId,
                                {
                                  nombre: file.name,
                                  tipo: 'otro',
                                  nombreArchivo: file.name,
                                  rutaArchivo: `/uploads/usuarios/${usuarioId}/${file.name}`, // Placeholder
                                  tipoMime: file.type,
                                  tamanioBytes: file.size,
                                }
                              );
                              
                              setDocumentos(prev => [nuevoDoc, ...prev]);
                              e.target.value = ''; // Reset input
                            } catch (err: any) {
                              setError(err.message);
                            } finally {
                              setUploadingDoc(false);
                            }
                          }}
                        />
                        <label htmlFor="file-upload" className="btn-upload">
                          {uploadingDoc ? (
                            <>
                              <Icons.loader className="spinner" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                              </svg>
                              Subir Documento
                            </>
                          )}
                        </label>
                      </div>
                    </>
                  )}

                  {!isEditing && (
                    <div className="empty-docs">
                      <p>Guarda el usuario primero para poder adjuntar documentos</p>
                    </div>
                  )}
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
              disabled={saving || !form.email.trim()}
            >
              {saving ? (
                <>
                  <Icons.loader className="spinner" />
                  Guardando...
                </>
              ) : (
                <>
                  <Icons.save />
                  {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                </>
              )}
            </button>
          </div>
        </form>
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

  .form-container {
    max-width: 100%;
    width: 100%;
    background: white;
    border-radius: 16px;
    padding: 0;
    border: 1px solid #e2e8f0;
    overflow: hidden;
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
    position: relative;
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

  .tab-content {
    padding: 32px;
  }

  .form-group textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    font-family: inherit;
    resize: vertical;
    transition: all 0.2s;
  }

  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .documentos-header {
    margin-bottom: 24px;
  }

  .documentos-header h4 {
    margin: 0 0 8px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .documentos-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .documento-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    transition: all 0.2s;
  }

  .documento-item:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .documento-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .documento-nombre {
    font-weight: 500;
    color: #0f172a;
    font-size: 0.9rem;
  }

  .documento-tipo {
    font-size: 0.8rem;
    color: #64748b;
    text-transform: capitalize;
  }

  .documento-desc {
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .btn-delete-doc {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #dc2626;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-delete-doc:hover {
    background: #fef2f2;
    border-color: #fecaca;
  }

  .upload-section {
    margin-top: 24px;
  }

  .btn-upload {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #f1f5f9;
    border: 2px dashed #cbd5e1;
    border-radius: 10px;
    color: #475569;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-upload:hover {
    background: #e2e8f0;
    border-color: #94a3b8;
    color: #0f172a;
  }

  .empty-docs {
    padding: 40px;
    text-align: center;
    color: #94a3b8;
    background: #f8fafc;
    border: 2px dashed #e2e8f0;
    border-radius: 10px;
  }

  .empty-docs p {
    margin: 0;
    font-size: 0.9rem;
  }

  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 24px;
    color: #dc2626;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 4px;
  }

  .form-section {
    margin-bottom: 32px;
  }

  .form-section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 20px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
    padding-bottom: 12px;
    border-bottom: 2px solid #f1f5f9;
  }

  .form-row {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
  }

  .form-row .form-group {
    flex: 1;
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
  .form-group input[type="email"],
  .form-group input[type="tel"] {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-group input:disabled {
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
  }

  .form-hint {
    margin: 8px 0 0 0;
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .roles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 12px;
  }

  .role-checkbox {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .role-checkbox:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  .role-checkbox input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #2563eb;
  }

  .role-checkbox input[type="checkbox"]:checked + .role-content {
    color: #2563eb;
  }

  .role-checkbox:has(input[type="checkbox"]:checked) {
    border-color: #2563eb;
    background: #eff6ff;
  }

  .role-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .role-name {
    font-weight: 500;
    font-size: 0.9rem;
    color: #0f172a;
  }

  .role-desc {
    font-size: 0.8rem;
    color: #64748b;
  }

  .role-color {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .checkbox-group {
    margin-bottom: 16px;
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    cursor: pointer;
    accent-color: #2563eb;
    flex-shrink: 0;
  }

  .checkbox-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .checkbox-title {
    font-weight: 500;
    font-size: 0.9rem;
    color: #0f172a;
  }

  .checkbox-desc {
    font-size: 0.8rem;
    color: #64748b;
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

    .form-row {
      flex-direction: column;
      gap: 0;
    }

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
  }
`;

