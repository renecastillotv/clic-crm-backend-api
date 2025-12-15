/**
 * CrmOficinasConfig - Gestión de oficinas/franquicias
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getOficinas,
  createOficina,
  updateOficina,
  deleteOficina,
  getUsuariosTenant,
  type Oficina,
  type UsuarioTenant,
} from '../../services/api';
import { Plus, Edit2, Trash2, Building2, X, MapPin, Phone, Mail, User, ChevronRight } from 'lucide-react';
import UserPickerModal from '../../components/UserPickerModal';

interface OficinaFormData {
  nombre: string;
  codigo: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  pais: string;
  codigo_postal: string;
  telefono: string;
  email: string;
  zona_trabajo: string;
  administrador_id: string;
}

// Tipo para el UserPicker
interface TenantUserForPicker {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  avatarUrl: string | null;
  roles: {
    id: string;
    codigo: string;
    nombre: string;
    color: string | null;
  }[];
  esOwner: boolean;
  activo: boolean;
}

// Convertir UsuarioTenant a formato del UserPicker
const convertirUsuarioParaPicker = (usuario: UsuarioTenant): TenantUserForPicker => ({
  id: usuario.id,
  email: usuario.email || '',
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  avatarUrl: usuario.avatarUrl || null,
  roles: usuario.roles?.map(r => ({
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    color: r.color || null,
  })) || [],
  esOwner: usuario.esOwner || false,
  activo: usuario.activo !== false,
});

export default function CrmOficinasConfig() {
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOficina, setEditingOficina] = useState<Oficina | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAdminPicker, setShowAdminPicker] = useState(false);

  const [formData, setFormData] = useState<OficinaFormData>({
    nombre: '',
    codigo: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    pais: 'República Dominicana',
    codigo_postal: '',
    telefono: '',
    email: '',
    zona_trabajo: '',
    administrador_id: '',
  });

  // Convertir usuarios para el UserPicker
  const usuariosParaPicker = useMemo(() =>
    usuarios.filter(u => u.activo !== false).map(convertirUsuarioParaPicker),
    [usuarios]
  );

  // Callbacks memoizados para el modal de usuario
  const handleCloseAdminPicker = useCallback(() => setShowAdminPicker(false), []);

  const handleSelectAdmin = useCallback((userId: string | null) => {
    setFormData(prev => ({ ...prev, administrador_id: userId || '' }));
    setShowAdminPicker(false);
  }, []);

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!tenantActual?.id) return;
    setLoading(true);
    try {
      const token = await getToken();
      const [oficinasData, usuariosData] = await Promise.all([
        getOficinas(tenantActual.id, token),
        getUsuariosTenant(tenantActual.id, token),
      ]);
      setOficinas(oficinasData);
      setUsuarios(usuariosData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken]);

  // Limpiar datos cuando cambia el tenant para evitar flash de datos cruzados
  useEffect(() => {
    setOficinas([]);
    setUsuarios([]);
    setLoading(true);
  }, [tenantActual?.id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: 'Oficinas / Franquicias',
      subtitle: 'Administra las oficinas y zonas de trabajo de tu empresa',
      backButton: {
        label: 'Volver',
        onClick: () => navigate('../configuracion'),
      },
      actions: (
        <button className="btn-primary" onClick={() => abrirModal()}>
          <Plus size={18} />
          Nueva Oficina
        </button>
      ),
    });
  }, [setPageHeader, navigate]);

  const abrirModal = (oficina?: Oficina) => {
    if (oficina) {
      setEditingOficina(oficina);
      setFormData({
        nombre: oficina.nombre || '',
        codigo: oficina.codigo || '',
        direccion: oficina.direccion || '',
        ciudad: oficina.ciudad || '',
        provincia: oficina.provincia || '',
        pais: oficina.pais || 'República Dominicana',
        codigo_postal: oficina.codigo_postal || '',
        telefono: oficina.telefono || '',
        email: oficina.email || '',
        zona_trabajo: oficina.zona_trabajo || '',
        administrador_id: oficina.administrador_id || '',
      });
    } else {
      setEditingOficina(null);
      setFormData({
        nombre: '',
        codigo: '',
        direccion: '',
        ciudad: '',
        provincia: '',
        pais: 'República Dominicana',
        codigo_postal: '',
        telefono: '',
        email: '',
        zona_trabajo: '',
        administrador_id: '',
      });
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingOficina(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantActual?.id || !formData.nombre.trim()) return;

    setSaving(true);
    try {
      const token = await getToken();
      const data = {
        nombre: formData.nombre.trim(),
        codigo: formData.codigo.trim() || undefined,
        direccion: formData.direccion.trim() || undefined,
        ciudad: formData.ciudad.trim() || undefined,
        provincia: formData.provincia.trim() || undefined,
        pais: formData.pais.trim() || undefined,
        codigo_postal: formData.codigo_postal.trim() || undefined,
        telefono: formData.telefono.trim() || undefined,
        email: formData.email.trim() || undefined,
        zona_trabajo: formData.zona_trabajo.trim() || undefined,
        administrador_id: formData.administrador_id || undefined,
      };

      if (editingOficina) {
        await updateOficina(tenantActual.id, editingOficina.id, data, token);
      } else {
        await createOficina(tenantActual.id, data, token);
      }

      await cargarDatos();
      cerrarModal();
    } catch (error: any) {
      console.error('Error al guardar oficina:', error);
      alert(error.message || 'Error al guardar la oficina');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (oficina: Oficina) => {
    if (!tenantActual?.id) return;
    if (!confirm(`¿Estás seguro de eliminar la oficina "${oficina.nombre}"?`)) return;

    setDeleting(oficina.id);
    try {
      const token = await getToken();
      await deleteOficina(tenantActual.id, oficina.id, token);
      await cargarDatos();
    } catch (error: any) {
      console.error('Error al eliminar oficina:', error);
      alert(error.message || 'Error al eliminar la oficina');
    } finally {
      setDeleting(null);
    }
  };

  const getNombreCompleto = (nombre?: string | null, apellido?: string | null) => {
    return [nombre, apellido].filter(Boolean).join(' ') || 'Sin nombre';
  };

  // Obtener usuario seleccionado por ID
  const getUsuarioById = (id: string) => usuariosParaPicker.find(u => u.id === id);

  // Obtener iniciales del usuario
  const getIniciales = (nombre?: string | null, apellido?: string | null) => {
    if (nombre && apellido) return `${nombre[0]}${apellido[0]}`.toUpperCase();
    if (nombre) return nombre.substring(0, 2).toUpperCase();
    return '??';
  };

  const getDireccionCompleta = (oficina: Oficina) => {
    const partes = [oficina.direccion, oficina.ciudad, oficina.provincia].filter(Boolean);
    return partes.join(', ') || 'Sin dirección';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Cargando oficinas...</p>
      </div>
    );
  }

  return (
    <div className="page">
      {oficinas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Building2 size={48} />
          </div>
          <h3>No hay oficinas registradas</h3>
          <p>Crea tu primera oficina o franquicia para organizar mejor tu operación</p>
          <button className="btn-primary" onClick={() => abrirModal()}>
            <Plus size={18} />
            Crear Oficina
          </button>
        </div>
      ) : (
        <div className="oficinas-grid">
          {oficinas.map(oficina => (
            <div key={oficina.id} className={`oficina-card ${!oficina.activo ? 'inactiva' : ''}`}>
              <div className="oficina-header">
                <div className="oficina-info">
                  <div className="oficina-titulo">
                    <Building2 size={20} className="oficina-icon" />
                    <div>
                      <h3>{oficina.nombre}</h3>
                      {oficina.codigo && <span className="oficina-codigo">{oficina.codigo}</span>}
                    </div>
                  </div>
                  {!oficina.activo && <span className="badge-inactiva">Inactiva</span>}
                </div>
                <div className="oficina-actions">
                  <button className="btn-icon" onClick={() => abrirModal(oficina)} title="Editar">
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => handleDelete(oficina)}
                    disabled={deleting === oficina.id}
                    title="Eliminar"
                  >
                    {deleting === oficina.id ? <span className="mini-spinner" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>

              <div className="oficina-body">
                <div className="info-row">
                  <MapPin size={14} />
                  <span>{getDireccionCompleta(oficina)}</span>
                </div>

                {oficina.telefono && (
                  <div className="info-row">
                    <Phone size={14} />
                    <span>{oficina.telefono}</span>
                  </div>
                )}

                {oficina.email && (
                  <div className="info-row">
                    <Mail size={14} />
                    <span>{oficina.email}</span>
                  </div>
                )}

                {oficina.administrador_nombre && (
                  <div className="info-row admin">
                    <User size={14} />
                    <span>
                      <strong>Admin:</strong> {getNombreCompleto(oficina.administrador_nombre, oficina.administrador_apellido)}
                    </span>
                  </div>
                )}
              </div>

              {oficina.zona_trabajo && (
                <div className="oficina-footer">
                  <div className="zona-trabajo">
                    <span className="zona-label">Zona de trabajo:</span>
                    <span className="zona-value">{oficina.zona_trabajo}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingOficina ? 'Editar Oficina' : 'Nueva Oficina'}</h2>
              <button className="modal-close" onClick={cerrarModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre de la oficina *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Oficina Principal"
                      required
                    />
                  </div>
                  <div className="form-group form-group-small">
                    <label>Código</label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                      placeholder="Ej: OF-001"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Dirección</label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Calle, número, sector..."
                  />
                </div>

                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label>Ciudad</label>
                    <input
                      type="text"
                      value={formData.ciudad}
                      onChange={e => setFormData({ ...formData, ciudad: e.target.value })}
                      placeholder="Ej: Santo Domingo"
                    />
                  </div>
                  <div className="form-group">
                    <label>Provincia</label>
                    <input
                      type="text"
                      value={formData.provincia}
                      onChange={e => setFormData({ ...formData, provincia: e.target.value })}
                      placeholder="Ej: Distrito Nacional"
                    />
                  </div>
                  <div className="form-group">
                    <label>Código Postal</label>
                    <input
                      type="text"
                      value={formData.codigo_postal}
                      onChange={e => setFormData({ ...formData, codigo_postal: e.target.value })}
                      placeholder="10101"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="809-555-1234"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="oficina@empresa.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Zona de trabajo</label>
                  <textarea
                    value={formData.zona_trabajo}
                    onChange={e => setFormData({ ...formData, zona_trabajo: e.target.value })}
                    placeholder="Describe las áreas o sectores donde opera esta oficina..."
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <label>Administrador</label>
                  <button
                    type="button"
                    className="user-select-btn"
                    onClick={() => setShowAdminPicker(true)}
                  >
                    {formData.administrador_id ? (
                      <>
                        <div className="user-select-avatar">
                          {getIniciales(
                            getUsuarioById(formData.administrador_id)?.nombre,
                            getUsuarioById(formData.administrador_id)?.apellido
                          )}
                        </div>
                        <div className="user-select-info">
                          <span className="user-select-name">
                            {getNombreCompleto(
                              getUsuarioById(formData.administrador_id)?.nombre,
                              getUsuarioById(formData.administrador_id)?.apellido
                            )}
                          </span>
                          <span className="user-select-email">
                            {getUsuarioById(formData.administrador_id)?.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="user-select-clear"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, administrador_id: '' });
                          }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <User size={18} className="user-select-placeholder-icon" />
                        <span className="user-select-placeholder">Seleccionar administrador...</span>
                        <ChevronRight size={18} className="user-select-arrow" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving || !formData.nombre.trim()}>
                  {saving ? 'Guardando...' : editingOficina ? 'Guardar Cambios' : 'Crear Oficina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de selección de Administrador */}
      <UserPickerModal
        isOpen={showAdminPicker}
        onClose={handleCloseAdminPicker}
        onSelect={handleSelectAdmin}
        users={usuariosParaPicker}
        selectedUserId={formData.administrador_id || null}
        title="Seleccionar Administrador"
        placeholder="Buscar usuario..."
      />

      <style>{`
        .page {
          width: 100%;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          color: #64748b;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        .mini-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e2e8f0;
          border-top-color: #ef4444;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          background: white;
          border: 1px dashed #e2e8f0;
          border-radius: 12px;
          text-align: center;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border-radius: 50%;
          color: #94a3b8;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .empty-state p {
          margin: 0 0 24px 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          padding: 10px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        /* Grid de oficinas */
        .oficinas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .oficina-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .oficina-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .oficina-card.inactiva {
          opacity: 0.7;
        }

        .oficina-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .oficina-info {
          flex: 1;
        }

        .oficina-titulo {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .oficina-icon {
          color: #3b82f6;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .oficina-titulo h3 {
          margin: 0 0 2px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .oficina-codigo {
          font-size: 0.75rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .badge-inactiva {
          display: inline-block;
          margin-top: 8px;
          padding: 2px 8px;
          background: #fee2e2;
          color: #dc2626;
          font-size: 0.7rem;
          font-weight: 500;
          border-radius: 4px;
        }

        .oficina-actions {
          display: flex;
          gap: 4px;
        }

        .btn-icon {
          padding: 8px;
          background: #f1f5f9;
          border: none;
          border-radius: 6px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .btn-icon-danger:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .oficina-body {
          padding: 16px;
        }

        .info-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
          font-size: 0.85rem;
          color: #64748b;
        }

        .info-row:last-child {
          margin-bottom: 0;
        }

        .info-row svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .info-row.admin {
          color: #0f172a;
        }

        .info-row.admin strong {
          color: #64748b;
          font-weight: 500;
        }

        .oficina-footer {
          padding: 12px 16px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }

        .zona-trabajo {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .zona-label {
          font-size: 0.7rem;
          font-weight: 500;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .zona-value {
          font-size: 0.8rem;
          color: #475569;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-content.modal-large {
          max-width: 600px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
        }

        .modal-close {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #64748b;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .modal-body {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
        }

        .form-row-3 {
          grid-template-columns: repeat(3, 1fr);
        }

        .form-group-small {
          width: 120px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
        }

        @media (max-width: 640px) {
          .form-row,
          .form-row-3 {
            grid-template-columns: 1fr;
          }

          .form-group-small {
            width: 100%;
          }
        }

        /* Botón de selección de usuario */
        .user-select-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .user-select-btn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .user-select-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .user-select-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .user-select-name {
          font-weight: 600;
          color: #0f172a;
          font-size: 0.9rem;
        }

        .user-select-email {
          font-size: 0.8rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-select-clear {
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .user-select-clear:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .user-select-placeholder-icon {
          color: #94a3b8;
        }

        .user-select-placeholder {
          flex: 1;
          color: #94a3b8;
          font-weight: 500;
        }

        .user-select-arrow {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
