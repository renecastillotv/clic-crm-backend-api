/**
 * CrmEquiposConfig - Gestión de equipos de trabajo
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getEquipos,
  createEquipo,
  updateEquipo,
  deleteEquipo,
  getUsuariosTenant,
  getOficinas,
  type Equipo,
  type UsuarioTenant,
  type Oficina,
} from '../../services/api';
import { Plus, Edit2, Trash2, Users, X, Crown, UserCheck, Building2, ChevronRight } from 'lucide-react';
import UserPickerModal from '../../components/UserPickerModal';

interface EquipoFormData {
  nombre: string;
  descripcion: string;
  color: string;
  lider_id: string;
  asistente_id: string;
  oficina_id: string;
}

const COLORES_EQUIPO = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

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

export default function CrmEquiposConfig() {
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioTenant[]>([]);
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showLiderPicker, setShowLiderPicker] = useState(false);
  const [showAsistentePicker, setShowAsistentePicker] = useState(false);

  const [formData, setFormData] = useState<EquipoFormData>({
    nombre: '',
    descripcion: '',
    color: '#3b82f6',
    lider_id: '',
    asistente_id: '',
    oficina_id: '',
  });

  // Convertir usuarios para el UserPicker
  const usuariosParaPicker = useMemo(() =>
    usuarios.filter(u => u.activo !== false).map(convertirUsuarioParaPicker),
    [usuarios]
  );

  // Usuarios disponibles para asistente (excluir al líder seleccionado)
  const usuariosParaAsistente = useMemo(() =>
    usuariosParaPicker.filter(u => u.id !== formData.lider_id),
    [usuariosParaPicker, formData.lider_id]
  );

  // Callbacks memoizados para los modales de usuario
  const handleCloseLiderPicker = useCallback(() => setShowLiderPicker(false), []);
  const handleCloseAsistentePicker = useCallback(() => setShowAsistentePicker(false), []);

  const handleSelectLider = useCallback((userId: string | null) => {
    setFormData(prev => ({ ...prev, lider_id: userId || '' }));
    setShowLiderPicker(false);
  }, []);

  const handleSelectAsistente = useCallback((userId: string | null) => {
    setFormData(prev => ({ ...prev, asistente_id: userId || '' }));
    setShowAsistentePicker(false);
  }, []);

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!tenantActual?.id) return;
    setLoading(true);
    try {
      const token = await getToken();
      const [equiposData, usuariosData, oficinasData] = await Promise.all([
        getEquipos(tenantActual.id, token),
        getUsuariosTenant(tenantActual.id, token),
        getOficinas(tenantActual.id, token),
      ]);
      setEquipos(equiposData);
      setUsuarios(usuariosData);
      setOficinas(oficinasData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken]);

  // Limpiar datos cuando cambia el tenant para evitar flash de datos cruzados
  useEffect(() => {
    setEquipos([]);
    setUsuarios([]);
    setOficinas([]);
    setLoading(true);
  }, [tenantActual?.id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: 'Equipos de Trabajo',
      subtitle: 'Organiza tu equipo en grupos con líderes y asistentes',
      backButton: {
        label: 'Volver',
        onClick: () => navigate('../configuracion'),
      },
      actions: (
        <button className="btn-primary" onClick={() => abrirModal()}>
          <Plus size={18} />
          Nuevo Equipo
        </button>
      ),
    });
  }, [setPageHeader, navigate]);

  const abrirModal = (equipo?: Equipo) => {
    if (equipo) {
      setEditingEquipo(equipo);
      setFormData({
        nombre: equipo.nombre || '',
        descripcion: equipo.descripcion || '',
        color: equipo.color || '#3b82f6',
        lider_id: equipo.lider_id || '',
        asistente_id: equipo.asistente_id || '',
        oficina_id: equipo.oficina_id || '',
      });
    } else {
      setEditingEquipo(null);
      setFormData({
        nombre: '',
        descripcion: '',
        color: '#3b82f6',
        lider_id: '',
        asistente_id: '',
        oficina_id: '',
      });
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingEquipo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantActual?.id || !formData.nombre.trim()) return;

    setSaving(true);
    try {
      const token = await getToken();
      const data = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        color: formData.color || undefined,
        lider_id: formData.lider_id || undefined,
        asistente_id: formData.asistente_id || undefined,
        oficina_id: formData.oficina_id || undefined,
      };

      if (editingEquipo) {
        await updateEquipo(tenantActual.id, editingEquipo.id, data, token);
      } else {
        await createEquipo(tenantActual.id, data, token);
      }

      await cargarDatos();
      cerrarModal();
    } catch (error: any) {
      console.error('Error al guardar equipo:', error);
      alert(error.message || 'Error al guardar el equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (equipo: Equipo) => {
    if (!tenantActual?.id) return;
    if (!confirm(`¿Estás seguro de eliminar el equipo "${equipo.nombre}"?`)) return;

    setDeleting(equipo.id);
    try {
      const token = await getToken();
      await deleteEquipo(tenantActual.id, equipo.id, token);
      await cargarDatos();
    } catch (error: any) {
      console.error('Error al eliminar equipo:', error);
      alert(error.message || 'Error al eliminar el equipo');
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Cargando equipos...</p>
      </div>
    );
  }

  return (
    <div className="page">
      {equipos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Users size={48} />
          </div>
          <h3>No hay equipos creados</h3>
          <p>Crea tu primer equipo para organizar mejor a tu personal</p>
          <button className="btn-primary" onClick={() => abrirModal()}>
            <Plus size={18} />
            Crear Equipo
          </button>
        </div>
      ) : (
        <div className="equipos-grid">
          {equipos.map(equipo => (
            <div key={equipo.id} className="equipo-card">
              <div className="equipo-header" style={{ borderLeftColor: equipo.color || '#3b82f6' }}>
                <div className="equipo-info">
                  <h3>{equipo.nombre}</h3>
                  {equipo.descripcion && <p className="equipo-desc">{equipo.descripcion}</p>}
                </div>
                <div className="equipo-actions">
                  <button className="btn-icon" onClick={() => abrirModal(equipo)} title="Editar">
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => handleDelete(equipo)}
                    disabled={deleting === equipo.id}
                    title="Eliminar"
                  >
                    {deleting === equipo.id ? <span className="mini-spinner" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>

              <div className="equipo-body">
                {equipo.lider_nombre && (
                  <div className="rol-item">
                    <div className="rol-icon lider">
                      <Crown size={14} />
                    </div>
                    <div className="rol-info">
                      <span className="rol-label">Líder</span>
                      <span className="rol-nombre">
                        {getNombreCompleto(equipo.lider_nombre, equipo.lider_apellido)}
                      </span>
                    </div>
                  </div>
                )}

                {equipo.asistente_nombre && (
                  <div className="rol-item">
                    <div className="rol-icon asistente">
                      <UserCheck size={14} />
                    </div>
                    <div className="rol-info">
                      <span className="rol-label">Asistente</span>
                      <span className="rol-nombre">
                        {getNombreCompleto(equipo.asistente_nombre, equipo.asistente_apellido)}
                      </span>
                    </div>
                  </div>
                )}

                {equipo.oficina_nombre && (
                  <div className="rol-item">
                    <div className="rol-icon oficina">
                      <Building2 size={14} />
                    </div>
                    <div className="rol-info">
                      <span className="rol-label">Oficina</span>
                      <span className="rol-nombre">{equipo.oficina_nombre}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="equipo-footer">
                <div className="miembros-count">
                  <Users size={14} />
                  <span>{equipo.total_miembros || 0} miembros</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEquipo ? 'Editar Equipo' : 'Nuevo Equipo'}</h2>
              <button className="modal-close" onClick={cerrarModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre del equipo *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Equipo Ventas Norte"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describe el propósito del equipo..."
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <label>Color del equipo</label>
                  <div className="colores-grid">
                    {COLORES_EQUIPO.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`color-btn ${formData.color === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Líder del equipo</label>
                  <button
                    type="button"
                    className="user-select-btn"
                    onClick={() => setShowLiderPicker(true)}
                  >
                    {formData.lider_id ? (
                      <>
                        <div className="user-select-avatar">
                          {getIniciales(
                            getUsuarioById(formData.lider_id)?.nombre,
                            getUsuarioById(formData.lider_id)?.apellido
                          )}
                        </div>
                        <div className="user-select-info">
                          <span className="user-select-name">
                            {getNombreCompleto(
                              getUsuarioById(formData.lider_id)?.nombre,
                              getUsuarioById(formData.lider_id)?.apellido
                            )}
                          </span>
                          <span className="user-select-email">
                            {getUsuarioById(formData.lider_id)?.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="user-select-clear"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, lider_id: '' });
                          }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Crown size={18} className="user-select-placeholder-icon" />
                        <span className="user-select-placeholder">Seleccionar líder...</span>
                        <ChevronRight size={18} className="user-select-arrow" />
                      </>
                    )}
                  </button>
                </div>

                <div className="form-group">
                  <label>Asistente</label>
                  <button
                    type="button"
                    className="user-select-btn"
                    onClick={() => setShowAsistentePicker(true)}
                  >
                    {formData.asistente_id ? (
                      <>
                        <div className="user-select-avatar">
                          {getIniciales(
                            getUsuarioById(formData.asistente_id)?.nombre,
                            getUsuarioById(formData.asistente_id)?.apellido
                          )}
                        </div>
                        <div className="user-select-info">
                          <span className="user-select-name">
                            {getNombreCompleto(
                              getUsuarioById(formData.asistente_id)?.nombre,
                              getUsuarioById(formData.asistente_id)?.apellido
                            )}
                          </span>
                          <span className="user-select-email">
                            {getUsuarioById(formData.asistente_id)?.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="user-select-clear"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, asistente_id: '' });
                          }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <UserCheck size={18} className="user-select-placeholder-icon" />
                        <span className="user-select-placeholder">Seleccionar asistente...</span>
                        <ChevronRight size={18} className="user-select-arrow" />
                      </>
                    )}
                  </button>
                </div>

                <div className="form-group">
                  <label>Oficina asignada</label>
                  <select
                    value={formData.oficina_id}
                    onChange={e => setFormData({ ...formData, oficina_id: e.target.value })}
                  >
                    <option value="">Sin oficina asignada</option>
                    {oficinas.filter(o => o.activo).map(oficina => (
                      <option key={oficina.id} value={oficina.id}>
                        {oficina.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving || !formData.nombre.trim()}>
                  {saving ? 'Guardando...' : editingEquipo ? 'Guardar Cambios' : 'Crear Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de selección de Líder */}
      <UserPickerModal
        isOpen={showLiderPicker}
        onClose={handleCloseLiderPicker}
        onSelect={handleSelectLider}
        users={usuariosParaPicker}
        selectedUserId={formData.lider_id || null}
        title="Seleccionar Líder del Equipo"
        placeholder="Buscar usuario..."
      />

      {/* Modal de selección de Asistente */}
      <UserPickerModal
        isOpen={showAsistentePicker}
        onClose={handleCloseAsistentePicker}
        onSelect={handleSelectAsistente}
        users={usuariosParaAsistente}
        selectedUserId={formData.asistente_id || null}
        title="Seleccionar Asistente"
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

        /* Grid de equipos */
        .equipos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .equipo-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .equipo-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .equipo-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 16px;
          border-left: 4px solid #3b82f6;
        }

        .equipo-info h3 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .equipo-desc {
          margin: 0;
          font-size: 0.8rem;
          color: #64748b;
        }

        .equipo-actions {
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

        .equipo-body {
          padding: 0 16px;
        }

        .rol-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .rol-item:last-child {
          border-bottom: none;
        }

        .rol-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }

        .rol-icon.lider {
          background: #fef3c7;
          color: #d97706;
        }

        .rol-icon.asistente {
          background: #dbeafe;
          color: #2563eb;
        }

        .rol-icon.oficina {
          background: #f0fdf4;
          color: #16a34a;
        }

        .rol-info {
          display: flex;
          flex-direction: column;
        }

        .rol-label {
          font-size: 0.7rem;
          font-weight: 500;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .rol-nombre {
          font-size: 0.85rem;
          color: #0f172a;
        }

        .equipo-footer {
          padding: 12px 16px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }

        .miembros-count {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: #64748b;
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
          margin-bottom: 20px;
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

        .colores-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .color-btn {
          width: 32px;
          height: 32px;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .color-btn:hover {
          transform: scale(1.1);
        }

        .color-btn.selected {
          border-color: #0f172a;
          box-shadow: 0 0 0 2px white, 0 0 0 4px currentColor;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
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
