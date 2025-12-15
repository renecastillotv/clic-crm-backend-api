/**
 * ExtensionesContactoPanel - Panel de extensiones para un contacto
 *
 * Muestra y permite gestionar las extensiones de un contacto usando
 * el catálogo dinámico de extensiones con UX mejorada v2.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  useExtensionesContacto,
  getInputType,
  formatValue,
  type ExtensionCatalogo,
  type ExtensionContacto,
  type CampoSchema,
} from '../../hooks/useExtensionesContacto';
import {
  UserPlus,
  UserCheck,
  Briefcase,
  Building2,
  Users,
  Home,
  Award,
  Puzzle,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertCircle,
  type LucideIcon
} from 'lucide-react';

// Mapeo de iconos
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

interface ExtensionesContactoPanelProps {
  contactoId: string;
  onExtensionChange?: () => void;
  compact?: boolean;
}

export default function ExtensionesContactoPanel({
  contactoId,
  onExtensionChange,
  compact = false,
}: ExtensionesContactoPanelProps) {
  const {
    extensionesDisponibles,
    extensionesContacto,
    loading,
    loadingContacto,
    error,
    agregarExtension,
    actualizarExtension,
    eliminarExtension,
  } = useExtensionesContacto(contactoId);

  // Estados UI
  const [expandedExtensions, setExpandedExtensions] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExtension, setEditingExtension] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-expandir la primera extensión que tenga datos
  useEffect(() => {
    if (extensionesContacto.length > 0 && expandedExtensions.size === 0) {
      const primeraConDatos = extensionesContacto.find(e => e.datos && Object.keys(e.datos).length > 0);
      if (primeraConDatos) {
        setExpandedExtensions(new Set([primeraConDatos.codigo]));
      } else {
        setExpandedExtensions(new Set([extensionesContacto[0].codigo]));
      }
    }
  }, [extensionesContacto]);

  // Extensiones no asignadas al contacto
  const extensionesNoAsignadas = useMemo(() => {
    const codigosAsignados = new Set(extensionesContacto.map(e => e.codigo));
    return extensionesDisponibles.filter(e => !codigosAsignados.has(e.codigo));
  }, [extensionesDisponibles, extensionesContacto]);

  // Toggle expandir/colapsar extensión
  const toggleExpand = (codigo: string) => {
    setExpandedExtensions(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }
      return next;
    });
  };

  // Iniciar edición de extensión
  const startEdit = (ext: ExtensionContacto) => {
    setEditingExtension(ext.extension_id);
    setEditFormData(ext.datos || {});
    // Asegurar que esté expandida
    if (!expandedExtensions.has(ext.codigo)) {
      setExpandedExtensions(prev => new Set(prev).add(ext.codigo));
    }
  };

  // Cancelar edición
  const cancelEdit = () => {
    setEditingExtension(null);
    setEditFormData({});
  };

  // Guardar cambios
  const handleSave = async (extensionId: string, extensionNombre: string) => {
    setSaving(true);
    const result = await actualizarExtension(contactoId, extensionId, editFormData);
    setSaving(false);

    if (result) {
      setEditingExtension(null);
      setEditFormData({});
      setSuccessMessage(`${extensionNombre} actualizada`);
      setTimeout(() => setSuccessMessage(null), 3000);
      onExtensionChange?.();
    }
  };

  // Agregar nueva extensión
  const handleAddExtension = async (extension: ExtensionCatalogo) => {
    setSaving(true);
    const result = await agregarExtension(contactoId, extension.id, {});
    setSaving(false);

    if (result) {
      setShowAddModal(false);
      setExpandedExtensions(prev => new Set(prev).add(extension.codigo));
      // Iniciar edición automáticamente
      setTimeout(() => {
        setEditingExtension(result.extension_id);
        setEditFormData({});
      }, 100);
      onExtensionChange?.();
    }
  };

  // Eliminar extensión
  const handleRemoveExtension = async (ext: ExtensionContacto) => {
    if (!confirm(`¿Eliminar "${ext.nombre}" de este contacto?`)) return;

    const result = await eliminarExtension(contactoId, ext.extension_id);
    if (result) {
      setSuccessMessage(`${ext.nombre} eliminada`);
      setTimeout(() => setSuccessMessage(null), 3000);
      onExtensionChange?.();
    }
  };

  // Obtener icono
  const getIcon = (iconName: string | undefined): LucideIcon => {
    return ICONOS_MAP[iconName || 'Puzzle'] || Puzzle;
  };

  // Renderizar campo de formulario
  const renderFormField = (campo: CampoSchema, value: any, onChange: (value: any) => void) => {
    const inputType = getInputType(campo.tipo);

    if (inputType === 'select' && campo.opciones) {
      return (
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="ext-form-select"
        >
          <option value="">Seleccionar...</option>
          {campo.opciones.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (inputType === 'checkbox') {
      return (
        <label className="ext-checkbox-label">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
          />
          <span className="ext-checkbox-text">{value ? 'Sí' : 'No'}</span>
        </label>
      );
    }

    return (
      <input
        type={inputType}
        value={value || ''}
        onChange={e => onChange(inputType === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)}
        className="ext-form-input"
        placeholder={campo.label}
        step={campo.tipo === 'percentage' ? '0.01' : undefined}
      />
    );
  };

  // Renderizar valor formateado
  const renderDisplayValue = (value: any, campo: CampoSchema) => {
    const formatted = formatValue(value, campo.tipo);
    if (!formatted) return <span className="ext-value-empty">Sin especificar</span>;
    return <span className="ext-value">{formatted}</span>;
  };

  // Modo compacto: solo mostrar badges
  if (compact) {
    return (
      <div className="ext-badges">
        {extensionesContacto.map(ext => {
          const Icon = getIcon(ext.icono);
          return (
            <span
              key={ext.extension_id}
              className="ext-badge"
              style={{ backgroundColor: `${ext.color}20`, color: ext.color, borderColor: `${ext.color}40` }}
            >
              <Icon size={14} />
              {ext.nombre}
            </span>
          );
        })}
        <style>{`
          .ext-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .ext-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 20px;
            border: 1px solid;
            font-size: 0.75rem;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  // Modo completo
  if (loading || loadingContacto) {
    return <div className="ext-loading">Cargando extensiones...</div>;
  }

  return (
    <div className="ext-panel">
      {/* Mensajes */}
      {error && (
        <div className="ext-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="ext-success">
          <Check size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="ext-panel-header">
        <h3>Extensiones del contacto</h3>
        {extensionesNoAsignadas.length > 0 && (
          <button className="ext-btn-add" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Agregar
          </button>
        )}
      </div>

      {/* Lista de extensiones */}
      {extensionesContacto.length === 0 ? (
        <div className="ext-empty">
          <Puzzle size={40} strokeWidth={1.5} />
          <p>Este contacto no tiene extensiones asignadas</p>
          {extensionesNoAsignadas.length > 0 && (
            <button className="ext-btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Agregar primera extensión
            </button>
          )}
        </div>
      ) : (
        <div className="ext-list">
          {extensionesContacto.map(ext => {
            const Icon = getIcon(ext.icono);
            const isExpanded = expandedExtensions.has(ext.codigo);
            const isEditing = editingExtension === ext.extension_id;
            const hasDatos = ext.datos && Object.keys(ext.datos).length > 0;

            return (
              <div
                key={ext.extension_id}
                className={`ext-card ${isExpanded ? 'ext-card-expanded' : ''} ${isEditing ? 'ext-card-editing' : ''}`}
              >
                {/* Header de la extensión */}
                <div
                  className="ext-card-header"
                  onClick={() => !isEditing && toggleExpand(ext.codigo)}
                  style={{ borderLeftColor: ext.color }}
                >
                  <div className="ext-card-title">
                    <span className="ext-card-name">{ext.nombre}</span>
                    {ext.descripcion && (
                      <span className="ext-card-desc">{ext.descripcion}</span>
                    )}
                  </div>
                  <div className="ext-card-actions">
                    {!isEditing && (
                      <button
                        className="ext-btn-icon"
                        onClick={e => { e.stopPropagation(); startEdit(ext); }}
                        title="Editar datos"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button className="ext-btn-chevron">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Cuerpo expandido */}
                {isExpanded && (
                  <div className="ext-card-body">
                    {ext.campos_schema && ext.campos_schema.length > 0 ? (
                      <>
                        <div className="ext-campos-grid">
                          {ext.campos_schema.map(campo => {
                            const value = isEditing
                              ? editFormData[campo.campo]
                              : ext.datos?.[campo.campo];

                            return (
                              <div key={campo.campo} className="ext-campo">
                                <label className="ext-campo-label">
                                  {campo.label}
                                  {campo.requerido && <span className="ext-required">*</span>}
                                </label>
                                {isEditing ? (
                                  renderFormField(
                                    campo,
                                    value,
                                    (newValue) => setEditFormData(prev => ({
                                      ...prev,
                                      [campo.campo]: newValue
                                    }))
                                  )
                                ) : (
                                  renderDisplayValue(value, campo)
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Acciones de edición */}
                        {isEditing && (
                          <div className="ext-edit-actions">
                            <button
                              className="ext-btn-cancel"
                              onClick={cancelEdit}
                              disabled={saving}
                            >
                              Cancelar
                            </button>
                            <button
                              className="ext-btn-save"
                              onClick={() => handleSave(ext.extension_id, ext.nombre)}
                              disabled={saving}
                            >
                              {saving ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                          </div>
                        )}

                        {/* Acción eliminar (solo visible cuando no está editando) */}
                        {!isEditing && (
                          <div className="ext-footer">
                            <button
                              className="ext-btn-remove"
                              onClick={() => handleRemoveExtension(ext)}
                            >
                              <Trash2 size={14} />
                              Quitar extensión
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="ext-no-campos">
                        Esta extensión no tiene campos definidos.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para agregar extensión */}
      {showAddModal && (
        <div className="ext-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="ext-modal" onClick={e => e.stopPropagation()}>
            <div className="ext-modal-header">
              <h3>Agregar Extensión</h3>
              <button className="ext-btn-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="ext-modal-body">
              {extensionesNoAsignadas.length === 0 ? (
                <p className="ext-modal-empty">Todas las extensiones ya están asignadas a este contacto.</p>
              ) : (
                <div className="ext-options">
                  {extensionesNoAsignadas.map(ext => {
                    const Icon = getIcon(ext.icono);
                    return (
                      <button
                        key={ext.id}
                        className="ext-option"
                        onClick={() => handleAddExtension(ext)}
                        disabled={saving}
                      >
                        <div
                          className="ext-option-icon"
                          style={{ backgroundColor: `${ext.color}15`, color: ext.color }}
                        >
                          <Icon size={22} />
                        </div>
                        <div className="ext-option-info">
                          <span className="ext-option-name">{ext.nombre}</span>
                          <span className="ext-option-desc">{ext.descripcion}</span>
                          <span className="ext-option-campos">
                            {ext.campos_schema?.length || 0} campos
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ext-panel {
          --ext-primary: #2563eb;
          --ext-primary-light: #3b82f6;
          --ext-success: #059669;
          --ext-danger: #dc2626;
          --ext-gray-50: #f8fafc;
          --ext-gray-100: #f1f5f9;
          --ext-gray-200: #e2e8f0;
          --ext-gray-300: #cbd5e1;
          --ext-gray-400: #94a3b8;
          --ext-gray-500: #64748b;
          --ext-gray-600: #475569;
          --ext-gray-700: #334155;
          --ext-gray-900: #0f172a;
        }

        .ext-loading {
          padding: 40px;
          text-align: center;
          color: var(--ext-gray-500);
        }

        .ext-error, .ext-success {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          margin-bottom: 16px;
        }

        .ext-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: var(--ext-danger);
        }

        .ext-success {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: var(--ext-success);
        }

        .ext-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .ext-panel-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--ext-gray-900);
        }

        .ext-btn-add {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: white;
          color: var(--ext-gray-700);
          border: 1px solid var(--ext-gray-200);
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ext-btn-add:hover {
          background: var(--ext-gray-50);
          border-color: var(--ext-gray-300);
        }

        .ext-empty {
          padding: 48px 24px;
          text-align: center;
          color: var(--ext-gray-400);
        }

        .ext-empty svg {
          margin-bottom: 12px;
        }

        .ext-empty p {
          margin: 0 0 20px 0;
          font-size: 0.9rem;
        }

        .ext-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: var(--ext-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .ext-btn-primary:hover {
          background: var(--ext-primary-light);
        }

        .ext-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ext-card {
          background: white;
          border: 1px solid var(--ext-gray-200);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .ext-card-expanded {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .ext-card-editing {
          border-color: var(--ext-primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .ext-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          cursor: pointer;
          border-left: 4px solid;
          transition: background 0.2s;
        }

        .ext-card-header:hover {
          background: var(--ext-gray-50);
        }

        .ext-card-title {
          flex: 1;
          min-width: 0;
        }

        .ext-card-name {
          display: block;
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--ext-gray-900);
        }

        .ext-card-desc {
          display: block;
          font-size: 0.8rem;
          color: var(--ext-gray-500);
          margin-top: 2px;
        }

        .ext-card-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 12px;
        }

        .ext-btn-icon, .ext-btn-chevron {
          padding: 6px;
          background: none;
          border: none;
          border-radius: 6px;
          color: var(--ext-gray-400);
          cursor: pointer;
          transition: all 0.2s;
        }

        .ext-btn-icon:hover {
          background: var(--ext-gray-100);
          color: var(--ext-gray-600);
        }

        .ext-card-body {
          padding: 0 16px 16px 20px;
          border-top: 1px solid var(--ext-gray-100);
        }

        .ext-campos-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          padding-top: 16px;
        }

        @media (max-width: 600px) {
          .ext-campos-grid {
            grid-template-columns: 1fr;
          }
        }

        .ext-campo {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ext-campo-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--ext-gray-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .ext-required {
          color: var(--ext-danger);
          margin-left: 2px;
        }

        .ext-value {
          font-size: 0.9rem;
          color: var(--ext-gray-900);
          font-weight: 500;
        }

        .ext-value-empty {
          font-size: 0.875rem;
          color: var(--ext-gray-400);
          font-style: italic;
        }

        .ext-form-input, .ext-form-select {
          padding: 10px 12px;
          border: 1px solid var(--ext-gray-200);
          border-radius: 8px;
          font-size: 0.875rem;
          width: 100%;
          transition: border-color 0.2s;
        }

        .ext-form-input:focus, .ext-form-select:focus {
          outline: none;
          border-color: var(--ext-primary);
        }

        .ext-checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .ext-checkbox-label input {
          width: 18px;
          height: 18px;
          accent-color: var(--ext-primary);
        }

        .ext-checkbox-text {
          font-size: 0.9rem;
          color: var(--ext-gray-700);
        }

        .ext-no-campos {
          padding: 24px;
          text-align: center;
          color: var(--ext-gray-400);
          font-size: 0.875rem;
        }

        .ext-edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--ext-gray-100);
        }

        .ext-btn-cancel, .ext-btn-save {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ext-btn-cancel {
          background: var(--ext-gray-100);
          color: var(--ext-gray-600);
          border: none;
        }

        .ext-btn-cancel:hover:not(:disabled) {
          background: var(--ext-gray-200);
        }

        .ext-btn-save {
          background: var(--ext-primary);
          color: white;
          border: none;
        }

        .ext-btn-save:hover:not(:disabled) {
          background: var(--ext-primary-light);
        }

        .ext-btn-save:disabled, .ext-btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ext-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--ext-gray-100);
        }

        .ext-btn-remove {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: none;
          border: none;
          color: var(--ext-gray-400);
          font-size: 0.8rem;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .ext-btn-remove:hover {
          background: #fef2f2;
          color: var(--ext-danger);
        }

        /* Modal */
        .ext-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .ext-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .ext-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--ext-gray-200);
        }

        .ext-modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .ext-btn-close {
          padding: 6px;
          background: none;
          border: none;
          border-radius: 6px;
          color: var(--ext-gray-400);
          cursor: pointer;
        }

        .ext-btn-close:hover {
          background: var(--ext-gray-100);
        }

        .ext-modal-body {
          padding: 20px 24px;
          overflow-y: auto;
        }

        .ext-modal-empty {
          color: var(--ext-gray-500);
          text-align: center;
          margin: 0;
          padding: 20px;
        }

        .ext-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ext-option {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          background: var(--ext-gray-50);
          border: 1px solid var(--ext-gray-200);
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .ext-option:hover:not(:disabled) {
          background: white;
          border-color: var(--ext-primary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .ext-option:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ext-option-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .ext-option-info {
          flex: 1;
        }

        .ext-option-name {
          display: block;
          font-weight: 600;
          color: var(--ext-gray-900);
          margin-bottom: 2px;
        }

        .ext-option-desc {
          display: block;
          font-size: 0.8rem;
          color: var(--ext-gray-500);
          line-height: 1.4;
        }

        .ext-option-campos {
          display: inline-block;
          margin-top: 8px;
          padding: 3px 8px;
          background: var(--ext-gray-200);
          border-radius: 20px;
          font-size: 0.7rem;
          color: var(--ext-gray-600);
        }
      `}</style>
    </div>
  );
}
