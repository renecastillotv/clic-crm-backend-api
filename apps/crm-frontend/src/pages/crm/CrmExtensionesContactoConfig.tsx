/**
 * CrmExtensionesContactoConfig - Configuración de Extensiones de Contacto
 *
 * Permite configurar las extensiones de contacto:
 * - Ver extensiones de sistema y personalizadas
 * - Activar/desactivar extensiones
 * - Crear extensiones personalizadas con campos dinámicos
 * - Editar campos de extensiones personalizadas
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  Puzzle,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  GripVertical,
  UserPlus,
  UserCheck,
  Briefcase,
  Building2,
  Users,
  Home,
  Award,
  Type,
  Hash,
  DollarSign,
  Percent,
  Calendar,
  List,
  Link,
  ToggleLeft,
  type LucideIcon
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Mapeo de iconos por código
const ICONOS_MAP: Record<string, LucideIcon> = {
  UserPlus,
  UserCheck,
  Briefcase,
  Building2,
  Users,
  Home,
  Award,
  Puzzle,
};

// Tipos de campo soportados con iconos
const TIPOS_CAMPO = [
  { value: 'text', label: 'Texto', icon: Type, description: 'Campo de texto libre' },
  { value: 'number', label: 'Número', icon: Hash, description: 'Valor numérico' },
  { value: 'currency', label: 'Moneda', icon: DollarSign, description: 'Valor monetario con formato' },
  { value: 'percentage', label: 'Porcentaje', icon: Percent, description: 'Valor porcentual (0-100)' },
  { value: 'date', label: 'Fecha', icon: Calendar, description: 'Selector de fecha' },
  { value: 'select', label: 'Lista', icon: List, description: 'Selección de opciones predefinidas' },
  { value: 'url', label: 'URL', icon: Link, description: 'Enlace web' },
  { value: 'boolean', label: 'Sí/No', icon: ToggleLeft, description: 'Opción binaria' },
];

interface CampoSchema {
  campo: string;
  label: string;
  tipo: string;
  opciones?: string[];
  opciones_editables?: boolean; // Si true, el tenant puede personalizar las opciones
  requerido?: boolean;
  orden: number;
}

interface ExtensionContacto {
  id: string;
  tenant_id: string | null;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  campos_schema: CampoSchema[];
  orden: number;
  activo: boolean;
  es_sistema: boolean;
  activo_tenant?: boolean;
  origen: 'sistema' | 'custom';
}

interface FormData {
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  campos_schema: CampoSchema[];
}

const INITIAL_FORM: FormData = {
  codigo: '',
  nombre: '',
  descripcion: '',
  icono: 'Puzzle',
  color: '#7c3aed',
  campos_schema: [],
};

const INITIAL_CAMPO: CampoSchema = {
  campo: '',
  label: '',
  tipo: 'text',
  opciones: [],
  requerido: false,
  orden: 0,
};

export default function CrmExtensionesContactoConfig() {
  const { tenantActual } = useAuth();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();

  const [extensiones, setExtensiones] = useState<ExtensionContacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingExtension, setEditingExtension] = useState<ExtensionContacto | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // Estado para expandir/colapsar campos
  const [expandedExtension, setExpandedExtension] = useState<string | null>(null);

  // Estado para campo expandido en el editor
  const [expandedCampoIndex, setExpandedCampoIndex] = useState<number | null>(null);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: 'Extensiones de Contacto',
      subtitle: 'Define tipos de contacto con campos personalizados',
      backButton: {
        label: 'Volver',
        onClick: () => navigate(`/crm/${tenantActual?.slug}/configuracion/personalizar`),
      },
    });
  }, [setPageHeader, tenantActual?.slug, navigate]);

  // Cargar extensiones
  const fetchExtensiones = useCallback(async () => {
    if (!tenantActual?.id) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/tenants/${tenantActual.id}/extensiones-contacto`);
      if (!response.ok) throw new Error('Error al cargar extensiones');
      const data = await response.json();
      setExtensiones(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id]);

  useEffect(() => {
    fetchExtensiones();
  }, [fetchExtensiones]);

  // Toggle activación
  const handleToggleActivo = async (extension: ExtensionContacto) => {
    if (!tenantActual?.id) return;
    try {
      const newActivo = !extension.activo_tenant;
      const response = await fetch(
        `${API_URL}/tenants/${tenantActual.id}/extensiones-contacto/${extension.id}/toggle`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activo: newActivo }),
        }
      );
      if (!response.ok) throw new Error('Error al cambiar estado');
      fetchExtensiones();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Abrir modal para crear
  const handleCreate = () => {
    setEditingExtension(null);
    setFormData(INITIAL_FORM);
    setShowModal(true);
  };

  // Abrir modal para ver/editar extensión
  const handleEdit = (extension: ExtensionContacto) => {
    setEditingExtension(extension);
    setFormData({
      codigo: extension.codigo,
      nombre: extension.nombre,
      descripcion: extension.descripcion || '',
      icono: extension.icono || 'Puzzle',
      color: extension.color || '#7c3aed',
      campos_schema: extension.campos_schema || [],
    });
    setShowModal(true);
  };

  // Guardar extensión
  const handleSave = async () => {
    if (!tenantActual?.id) return;
    if (!formData.codigo || !formData.nombre) {
      setError('Código y nombre son requeridos');
      return;
    }

    try {
      setSaving(true);
      const url = editingExtension
        ? `${API_URL}/tenants/${tenantActual.id}/extensiones-contacto/${editingExtension.id}`
        : `${API_URL}/tenants/${tenantActual.id}/extensiones-contacto`;

      const response = await fetch(url, {
        method: editingExtension ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }

      setShowModal(false);
      fetchExtensiones();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar extensión
  const handleDelete = async (extension: ExtensionContacto) => {
    if (extension.es_sistema) return;
    if (!confirm(`¿Eliminar la extensión "${extension.nombre}"?`)) return;

    try {
      const response = await fetch(
        `${API_URL}/tenants/${tenantActual?.id}/extensiones-contacto/${extension.id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar');
      }
      fetchExtensiones();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Agregar campo al schema
  const handleAddCampo = () => {
    const newCampo: CampoSchema = {
      ...INITIAL_CAMPO,
      orden: formData.campos_schema.length + 1,
    };
    setFormData({
      ...formData,
      campos_schema: [...formData.campos_schema, newCampo],
    });
    // Expandir el nuevo campo automáticamente
    setExpandedCampoIndex(formData.campos_schema.length);
  };

  // Actualizar campo
  const handleUpdateCampo = (index: number, campo: CampoSchema) => {
    const newCampos = [...formData.campos_schema];
    newCampos[index] = campo;
    setFormData({ ...formData, campos_schema: newCampos });
  };

  // Eliminar campo
  const handleRemoveCampo = (index: number) => {
    const newCampos = formData.campos_schema.filter((_, i) => i !== index);
    setFormData({ ...formData, campos_schema: newCampos });
  };

  // Mover campo arriba/abajo
  const handleMoveCampo = (index: number, direction: 'up' | 'down') => {
    const newCampos = [...formData.campos_schema];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newCampos.length) return;
    [newCampos[index], newCampos[newIndex]] = [newCampos[newIndex], newCampos[index]];
    // Actualizar orden
    newCampos.forEach((c, i) => c.orden = i + 1);
    setFormData({ ...formData, campos_schema: newCampos });
  };

  const getIconComponent = (iconName: string): LucideIcon => {
    return ICONOS_MAP[iconName] || Puzzle;
  };

  const getTipoCampoInfo = (tipo: string) => {
    return TIPOS_CAMPO.find(t => t.value === tipo) || TIPOS_CAMPO[0];
  };

  if (loading) {
    return <div className="loading">Cargando extensiones...</div>;
  }

  return (
    <div className="extensiones-config">
      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      <div className="header-actions">
        <button className="btn-primary" onClick={handleCreate}>
          <Plus size={18} />
          Nueva Extensión
        </button>
      </div>

      <div className="extensiones-list">
        {extensiones.map(ext => {
          const Icon = getIconComponent(ext.icono || 'Puzzle');
          const isExpanded = expandedExtension === ext.id;
          const isActive = ext.activo_tenant !== false;

          return (
            <div
              key={ext.id}
              className={`extension-card ${!isActive ? 'inactive' : ''}`}
            >
              <div className="extension-header">
                <div
                  className="extension-icon"
                  style={{ backgroundColor: `${ext.color}15`, color: ext.color }}
                >
                  <Icon size={20} />
                </div>

                <div className="extension-info">
                  <h3>{ext.nombre}</h3>
                  <p>{ext.descripcion}</p>
                  <div className="extension-meta">
                    <span className={`badge ${ext.es_sistema ? 'badge-sistema' : 'badge-custom'}`}>
                      {ext.es_sistema ? 'Sistema' : 'Personalizada'}
                    </span>
                    <span className="campos-count">
                      {ext.campos_schema?.length || 0} campos
                    </span>
                  </div>
                </div>

                <div className="extension-actions">
                  <button
                    className={`btn-toggle ${isActive ? 'active' : ''}`}
                    onClick={() => handleToggleActivo(ext)}
                    title={isActive ? 'Desactivar' : 'Activar'}
                  >
                    {isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>

                  <button
                    className="btn-icon"
                    onClick={() => handleEdit(ext)}
                    title={ext.es_sistema ? "Ver campos" : "Editar"}
                  >
                    <Edit2 size={18} />
                  </button>

                  {!ext.es_sistema && (
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => handleDelete(ext)}
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  <button
                    className="btn-expand"
                    onClick={() => setExpandedExtension(isExpanded ? null : ext.id)}
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {isExpanded && ext.campos_schema && ext.campos_schema.length > 0 && (
                <div className="extension-campos">
                  <h4>Campos definidos:</h4>
                  <div className="campos-list-expanded">
                    {ext.campos_schema.map((campo, idx) => {
                      const tipoInfo = getTipoCampoInfo(campo.tipo);
                      const TipoIcon = tipoInfo.icon;
                      return (
                        <div key={idx} className="campo-item-expanded">
                          <div className="campo-item-main">
                            <div className="campo-tipo-icon">
                              <TipoIcon size={16} />
                            </div>
                            <div className="campo-item-info">
                              <span className="campo-label">{campo.label}</span>
                              <span className="campo-tipo-text">{tipoInfo.label}</span>
                            </div>
                            {campo.requerido && <span className="campo-requerido-badge">Requerido</span>}
                            {campo.tipo === 'select' && (
                              <div className="campo-opciones-info">
                                <span className="opciones-count">{campo.opciones?.length || 0} opciones</span>
                              </div>
                            )}
                          </div>
                          {campo.tipo === 'select' && campo.opciones && campo.opciones.length > 0 && (
                            <div className="campo-opciones-preview">
                              {campo.opciones.slice(0, 5).map((op, i) => (
                                <span key={i} className="opcion-chip">{op}</span>
                              ))}
                              {campo.opciones.length > 5 && (
                                <span className="opcion-more">+{campo.opciones.length - 5} más</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal para crear/editar extensión */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {(() => {
              const isReadOnly = editingExtension?.es_sistema || false;
              return (
                <>
                  <div className="modal-header">
                    <h2>
                      {editingExtension
                        ? (isReadOnly ? 'Ver Extensión de Sistema' : 'Editar Extensión')
                        : 'Nueva Extensión'}
                    </h2>
                    <button className="btn-close" onClick={() => setShowModal(false)}>
                      <X size={20} />
                    </button>
                  </div>

                  {isReadOnly && (
                    <div className="readonly-notice">
                      Las extensiones de sistema no pueden editarse. Solo puedes activarlas o desactivarlas.
                    </div>
                  )}

                  <div className="modal-body">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Código *</label>
                        <input
                          type="text"
                          value={formData.codigo}
                          onChange={e => setFormData({ ...formData, codigo: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                          placeholder="ej: inversor"
                          disabled={!!editingExtension || isReadOnly}
                        />
                      </div>
                      <div className="form-group">
                        <label>Nombre *</label>
                        <input
                          type="text"
                          value={formData.nombre}
                          onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                          placeholder="ej: Inversor"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Descripción</label>
                      <input
                        type="text"
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                        placeholder="Descripción de la extensión"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Icono</label>
                        <select
                          value={formData.icono}
                          onChange={e => setFormData({ ...formData, icono: e.target.value })}
                          disabled={isReadOnly}
                        >
                          <option value="Puzzle">Puzzle</option>
                          <option value="UserPlus">UserPlus</option>
                          <option value="UserCheck">UserCheck</option>
                          <option value="Briefcase">Briefcase</option>
                          <option value="Building2">Building2</option>
                          <option value="Users">Users</option>
                          <option value="Home">Home</option>
                          <option value="Award">Award</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Color</label>
                        <input
                          type="color"
                          value={formData.color}
                          onChange={e => setFormData({ ...formData, color: e.target.value })}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>

                    {/* Editor de campos mejorado */}
                    <div className="campos-editor">
                      <div className="campos-header">
                        <h3>Campos del Formulario</h3>
                        {!isReadOnly && (
                          <button className="btn-add-campo" onClick={handleAddCampo}>
                            <Plus size={16} /> Agregar Campo
                          </button>
                        )}
                      </div>

                      {formData.campos_schema.length === 0 ? (
                        <div className="no-campos">
                          <List size={32} />
                          <p>{isReadOnly
                            ? 'Esta extensión no tiene campos definidos.'
                            : 'No hay campos definidos'}</p>
                          {!isReadOnly && (
                            <span>Agrega campos para definir qué información capturar</span>
                          )}
                        </div>
                      ) : (
                        <div className="campos-form-list">
                          {formData.campos_schema.map((campo, idx) => {
                            const tipoInfo = getTipoCampoInfo(campo.tipo);
                            const TipoIcon = tipoInfo.icon;
                            const isExpanded = expandedCampoIndex === idx;

                            return (
                              <div key={idx} className={`campo-card ${isReadOnly ? 'readonly' : ''} ${isExpanded ? 'expanded' : ''}`}>
                                <div className="campo-card-header">
                                  {!isReadOnly && (
                                    <div className="campo-drag-handle">
                                      <GripVertical size={16} />
                                    </div>
                                  )}
                                  <div
                                    className="campo-card-summary"
                                    onClick={() => !isReadOnly && setExpandedCampoIndex(isExpanded ? null : idx)}
                                  >
                                    <div className="campo-icon-wrapper" style={{ background: `${formData.color}15`, color: formData.color }}>
                                      <TipoIcon size={16} />
                                    </div>
                                    <div className="campo-summary-info">
                                      <span className="campo-summary-label">
                                        {campo.label || <em>Sin etiqueta</em>}
                                      </span>
                                      <span className="campo-summary-meta">
                                        {tipoInfo.label}
                                        {campo.requerido && <span className="req-dot">•</span>}
                                        {campo.requerido && 'Requerido'}
                                        {campo.tipo === 'select' && campo.opciones && (
                                          <> • {campo.opciones.length} opciones</>
                                        )}
                                      </span>
                                    </div>
                                    {!isReadOnly && (
                                      <ChevronDown size={18} className={`expand-icon ${isExpanded ? 'rotated' : ''}`} />
                                    )}
                                  </div>
                                  {!isReadOnly && (
                                    <div className="campo-card-actions">
                                      <button
                                        className="btn-icon-sm"
                                        onClick={() => handleMoveCampo(idx, 'up')}
                                        disabled={idx === 0}
                                        title="Mover arriba"
                                      >
                                        <ChevronUp size={14} />
                                      </button>
                                      <button
                                        className="btn-icon-sm"
                                        onClick={() => handleMoveCampo(idx, 'down')}
                                        disabled={idx === formData.campos_schema.length - 1}
                                        title="Mover abajo"
                                      >
                                        <ChevronDown size={14} />
                                      </button>
                                      <button
                                        className="btn-icon-sm btn-danger"
                                        onClick={() => handleRemoveCampo(idx)}
                                        title="Eliminar campo"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {(isExpanded || isReadOnly) && (
                                  <div className="campo-card-body">
                                    <div className="campo-form-grid">
                                      <div className="campo-form-field">
                                        <label>Etiqueta (visible al usuario)</label>
                                        <input
                                          type="text"
                                          placeholder="Ej: Fuente del Lead"
                                          value={campo.label}
                                          onChange={e => handleUpdateCampo(idx, { ...campo, label: e.target.value })}
                                          disabled={isReadOnly}
                                        />
                                      </div>
                                      <div className="campo-form-field">
                                        <label>Código interno</label>
                                        <input
                                          type="text"
                                          placeholder="Ej: fuente_lead"
                                          value={campo.campo}
                                          onChange={e => handleUpdateCampo(idx, {
                                            ...campo,
                                            campo: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                                          })}
                                          disabled={isReadOnly}
                                        />
                                      </div>
                                      <div className="campo-form-field">
                                        <label>Tipo de campo</label>
                                        <div className="tipo-selector">
                                          <select
                                            value={campo.tipo}
                                            onChange={e => handleUpdateCampo(idx, { ...campo, tipo: e.target.value, opciones: e.target.value === 'select' ? [] : undefined })}
                                            disabled={isReadOnly}
                                          >
                                            {TIPOS_CAMPO.map(t => (
                                              <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                          </select>
                                          <span className="tipo-description">{tipoInfo.description}</span>
                                        </div>
                                      </div>
                                      <div className="campo-form-field campo-form-checkbox">
                                        <label className="checkbox-container">
                                          <input
                                            type="checkbox"
                                            checked={campo.requerido || false}
                                            onChange={e => handleUpdateCampo(idx, { ...campo, requerido: e.target.checked })}
                                            disabled={isReadOnly}
                                          />
                                          <span className="checkmark"></span>
                                          Campo requerido
                                        </label>
                                        {!isReadOnly && campo.tipo === 'select' && (
                                          <label className="checkbox-container">
                                            <input
                                              type="checkbox"
                                              checked={campo.opciones_editables || false}
                                              onChange={e => handleUpdateCampo(idx, { ...campo, opciones_editables: e.target.checked })}
                                            />
                                            <span className="checkmark"></span>
                                            Opciones personalizables por tenant
                                          </label>
                                        )}
                                      </div>
                                    </div>

                                    {campo.tipo === 'select' && (
                                      <div className="opciones-section">
                                        <label>Opciones de selección</label>
                                        <div className="opciones-chips">
                                          {(campo.opciones || []).map((op, opIdx) => (
                                            <div key={opIdx} className="opcion-chip-editable">
                                              <span>{op}</span>
                                              {!isReadOnly && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newOpciones = (campo.opciones || []).filter((_, i) => i !== opIdx);
                                                    handleUpdateCampo(idx, { ...campo, opciones: newOpciones });
                                                  }}
                                                >
                                                  <X size={12} />
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                          {!isReadOnly && (
                                            <input
                                              type="text"
                                              className="opcion-input"
                                              placeholder="Nueva opción + Enter"
                                              onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  const value = (e.target as HTMLInputElement).value.trim();
                                                  if (value && !(campo.opciones || []).includes(value)) {
                                                    handleUpdateCampo(idx, {
                                                      ...campo,
                                                      opciones: [...(campo.opciones || []), value]
                                                    });
                                                    (e.target as HTMLInputElement).value = '';
                                                  }
                                                }
                                              }}
                                            />
                                          )}
                                        </div>
                                        {!isReadOnly && (campo.opciones || []).length === 0 && (
                                          <p className="opciones-hint">Escribe una opción y presiona Enter para agregarla</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => setShowModal(false)}>
                      {isReadOnly ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {!isReadOnly && (
                      <button className="btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Guardando...' : (editingExtension ? 'Guardar Cambios' : 'Crear Extensión')}
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <style>{`
        .extensiones-config {
          padding: 0;
        }

        .loading {
          padding: 60px;
          text-align: center;
          color: #64748b;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          margin-bottom: 16px;
        }

        .error-banner button {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
        }

        .header-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #6d28d9;
        }

        .btn-primary:disabled {
          background: #a78bfa;
          cursor: not-allowed;
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .extensiones-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .extension-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .extension-card.inactive {
          opacity: 0.6;
        }

        .extension-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
        }

        .extension-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .extension-info {
          flex: 1;
          min-width: 0;
        }

        .extension-info h3 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .extension-info p {
          margin: 0 0 8px 0;
          font-size: 0.875rem;
          color: #64748b;
        }

        .extension-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
        }

        .badge-sistema {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .badge-custom {
          background: #f3e8ff;
          color: #7c3aed;
        }

        .campos-count {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .extension-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-icon, .btn-toggle, .btn-expand {
          padding: 8px;
          background: none;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .btn-icon:hover, .btn-expand:hover {
          background: #f1f5f9;
          color: #334155;
        }

        .btn-toggle {
          color: #94a3b8;
        }

        .btn-toggle.active {
          color: #16a34a;
        }

        .btn-toggle:hover {
          background: #f1f5f9;
        }

        .btn-danger:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        .extension-campos {
          padding: 16px 20px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .extension-campos h4 {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
        }

        .campos-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .campo-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .campo-label {
          font-weight: 500;
          color: #334155;
        }

        .campo-tipo {
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .campo-requerido {
          color: #dc2626;
        }

        .campo-opciones {
          color: #94a3b8;
          font-size: 0.75rem;
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
          max-width: 800px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
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
        }

        .btn-close {
          padding: 8px;
          background: none;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: #64748b;
        }

        .btn-close:hover {
          background: #f1f5f9;
        }

        .readonly-notice {
          margin: 0 24px;
          padding: 12px 16px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          color: #92400e;
          font-size: 0.875rem;
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #334155;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #7c3aed;
        }

        .form-group input[type="color"] {
          padding: 4px;
          height: 42px;
          cursor: pointer;
        }

        .form-group input:disabled {
          background: #f8fafc;
          color: #94a3b8;
        }

        /* Campos editor mejorado */
        .campos-editor {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .campos-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .campos-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .btn-add-campo {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-add-campo:hover {
          background: #6d28d9;
        }

        .no-campos {
          padding: 40px 24px;
          text-align: center;
          color: #94a3b8;
          background: #f8fafc;
          border-radius: 12px;
          border: 2px dashed #e2e8f0;
        }

        .no-campos p {
          margin: 12px 0 4px;
          font-weight: 500;
          color: #64748b;
        }

        .no-campos span {
          font-size: 0.875rem;
        }

        .campos-form-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* Campo card */
        .campo-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .campo-card.expanded {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .campo-card.readonly {
          background: #f1f5f9;
        }

        .campo-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
        }

        .campo-drag-handle {
          color: #94a3b8;
          cursor: grab;
          padding: 4px;
        }

        .campo-card-summary {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          cursor: pointer;
        }

        .campo-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .campo-summary-info {
          flex: 1;
          min-width: 0;
        }

        .campo-summary-label {
          display: block;
          font-weight: 500;
          color: #0f172a;
          font-size: 0.9rem;
        }

        .campo-summary-label em {
          color: #94a3b8;
          font-style: italic;
        }

        .campo-summary-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: #64748b;
        }

        .req-dot {
          margin: 0 2px;
        }

        .expand-icon {
          color: #94a3b8;
          transition: transform 0.2s;
        }

        .expand-icon.rotated {
          transform: rotate(180deg);
        }

        .campo-card-actions {
          display: flex;
          gap: 2px;
        }

        .campo-card-body {
          padding: 16px;
          background: white;
          border-top: 1px solid #e2e8f0;
        }

        .campo-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .campo-form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .campo-form-field label {
          font-size: 0.8rem;
          font-weight: 500;
          color: #475569;
        }

        .campo-form-field input,
        .campo-form-field select {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .campo-form-field input:focus,
        .campo-form-field select:focus {
          outline: none;
          border-color: #7c3aed;
        }

        .campo-form-field input:disabled,
        .campo-form-field select:disabled {
          background: #f1f5f9;
          color: #64748b;
        }

        .tipo-selector {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tipo-description {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .campo-form-checkbox {
          grid-column: span 2;
          flex-direction: row;
          gap: 16px;
          flex-wrap: wrap;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #475569;
          cursor: pointer;
        }

        .checkbox-container input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #7c3aed;
        }

        /* Sección de opciones */
        .opciones-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .opciones-section > label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: #475569;
          margin-bottom: 8px;
        }

        .opciones-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          min-height: 50px;
        }

        .opcion-chip-editable {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #334155;
        }

        .opcion-chip-editable button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          border-radius: 4px;
        }

        .opcion-chip-editable button:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .opcion-input {
          flex: 1;
          min-width: 140px;
          padding: 6px 10px !important;
          border: 1px dashed #cbd5e1 !important;
          border-radius: 6px !important;
          font-size: 0.875rem !important;
          background: white;
        }

        .opcion-input:focus {
          border-style: solid !important;
          border-color: #7c3aed !important;
        }

        .opciones-hint {
          margin: 8px 0 0;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .btn-icon-sm {
          padding: 6px;
          background: none;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          color: #94a3b8;
          transition: all 0.2s;
        }

        .btn-icon-sm:hover:not(:disabled) {
          background: #e2e8f0;
          color: #334155;
        }

        .btn-icon-sm:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .btn-icon-sm.btn-danger:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        /* Campos expandidos en lista principal */
        .campos-list-expanded {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .campo-item-expanded {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
        }

        .campo-item-main {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .campo-tipo-icon {
          width: 32px;
          height: 32px;
          background: #f1f5f9;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .campo-item-info {
          flex: 1;
        }

        .campo-item-info .campo-label {
          display: block;
          font-weight: 500;
          color: #0f172a;
        }

        .campo-tipo-text {
          font-size: 0.75rem;
          color: #64748b;
        }

        .campo-requerido-badge {
          font-size: 0.7rem;
          padding: 2px 8px;
          background: #fef3c7;
          color: #92400e;
          border-radius: 4px;
        }

        .campo-opciones-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .opciones-count {
          font-size: 0.75rem;
          color: #64748b;
        }

        .campo-opciones-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #f1f5f9;
        }

        .opcion-chip {
          padding: 3px 8px;
          background: #f1f5f9;
          color: #475569;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .opcion-more {
          padding: 3px 8px;
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .campo-form-grid {
            grid-template-columns: 1fr;
          }

          .campo-form-checkbox {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}
