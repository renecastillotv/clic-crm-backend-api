/**
 * ActividadModal - Componente reutilizable para crear/editar actividades
 *
 * Modal con diseño moderno:
 * - Header con gradiente basado en el tipo de actividad
 * - Selector visual de tipos con iconos
 * - Selectores de prioridad y estado
 * - DatePicker y ContactPicker integrados
 */

import { useState, useEffect } from 'react';
import DatePicker from './DatePicker';
import ContactPicker from './ContactPicker';
import {
  Phone,
  Mail,
  Users,
  Eye,
  CheckSquare,
  MessageCircle,
  Zap,
  Check,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';
import type { TipoActividad, EstadoActividad, Prioridad, Actividad } from '../services/api';

// Configuración de tipos de actividad con iconos Lucide
export const ACTIVITY_TYPES: { value: TipoActividad; label: string; icon: React.ElementType; gradient: string; color: string }[] = [
  { value: 'llamada', label: 'Llamada', icon: Phone, gradient: 'from-blue-500 to-blue-600', color: '#3b82f6' },
  { value: 'email', label: 'Email', icon: Mail, gradient: 'from-purple-500 to-purple-600', color: '#8b5cf6' },
  { value: 'reunion', label: 'Reunión', icon: Users, gradient: 'from-green-500 to-green-600', color: '#22c55e' },
  { value: 'visita', label: 'Visita', icon: Eye, gradient: 'from-cyan-500 to-teal-500', color: '#06b6d4' },
  { value: 'tarea', label: 'Tarea', icon: CheckSquare, gradient: 'from-pink-500 to-pink-600', color: '#ec4899' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, gradient: 'from-green-400 to-green-500', color: '#25d366' },
  { value: 'seguimiento', label: 'Seguimiento', icon: Zap, gradient: 'from-indigo-500 to-indigo-600', color: '#6366f1' },
];

// Configuración de estados
export const STATUS_CONFIG: Record<EstadoActividad, { label: string; color: string; dotClass: string; bgClass: string }> = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', dotClass: 'bg-amber-500', bgClass: 'bg-amber-50' },
  en_progreso: { label: 'En Progreso', color: '#3b82f6', dotClass: 'bg-blue-500', bgClass: 'bg-blue-50' },
  completada: { label: 'Completada', color: '#22c55e', dotClass: 'bg-green-500', bgClass: 'bg-green-50' },
  cancelada: { label: 'Cancelada', color: '#6b7280', dotClass: 'bg-gray-400', bgClass: 'bg-gray-50' },
};

// Configuración de prioridades
export const PRIORITY_CONFIG: Record<Prioridad, { label: string; color: string; dotClass: string }> = {
  baja: { label: 'Baja', color: '#9ca3af', dotClass: 'bg-gray-400' },
  normal: { label: 'Normal', color: '#3b82f6', dotClass: 'bg-blue-500' },
  alta: { label: 'Alta', color: '#f97316', dotClass: 'bg-orange-500' },
  urgente: { label: 'Urgente', color: '#ef4444', dotClass: 'bg-red-500' },
};

export interface ActividadFormData {
  tipo: TipoActividad;
  titulo: string;
  descripcion: string;
  fecha_actividad: string;
  prioridad: Prioridad;
  estado: EstadoActividad;
  contacto_id: string;
  solicitud_id?: string;
}

interface ContactoSimple {
  id: string;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
}

interface ActividadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ActividadFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  editingActividad?: Actividad | null;
  contactos?: ContactoSimple[];
  loadingContactos?: boolean;
  // Para pre-seleccionar contacto o solicitud
  defaultContactoId?: string;
  defaultSolicitudId?: string;
  // Ocultar selector de contacto si ya viene pre-seleccionado
  hideContactoPicker?: boolean;
}

const defaultFormData: ActividadFormData = {
  tipo: 'llamada',
  titulo: '',
  descripcion: '',
  fecha_actividad: '',
  prioridad: 'normal',
  estado: 'pendiente',
  contacto_id: '',
  solicitud_id: '',
};

export default function ActividadModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingActividad,
  contactos = [],
  loadingContactos = false,
  defaultContactoId,
  defaultSolicitudId,
  hideContactoPicker = false,
}: ActividadModalProps) {
  const [formData, setFormData] = useState<ActividadFormData>(defaultFormData);
  const [selectedTipo, setSelectedTipo] = useState<TipoActividad>('llamada');
  const [saving, setSaving] = useState(false);

  // Inicializar form cuando se abre el modal o cambia la actividad a editar
  useEffect(() => {
    if (isOpen) {
      if (editingActividad) {
        setFormData({
          tipo: editingActividad.tipo,
          titulo: editingActividad.titulo,
          descripcion: editingActividad.descripcion || '',
          fecha_actividad: editingActividad.fecha_actividad || '',
          prioridad: editingActividad.prioridad,
          estado: editingActividad.estado,
          contacto_id: editingActividad.contacto_id || '',
          solicitud_id: editingActividad.solicitud_id || '',
        });
        setSelectedTipo(editingActividad.tipo);
      } else {
        setFormData({
          ...defaultFormData,
          contacto_id: defaultContactoId || '',
          solicitud_id: defaultSolicitudId || '',
        });
        setSelectedTipo('llamada');
      }
    }
  }, [isOpen, editingActividad, defaultContactoId, defaultSolicitudId]);

  const handleSave = async () => {
    if (!formData.titulo?.trim()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error guardando actividad:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingActividad || !onDelete) return;

    try {
      await onDelete(editingActividad.id);
      onClose();
    } catch (error) {
      console.error('Error eliminando actividad:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="actividad-modal-overlay" onClick={onClose}>
        <div className="actividad-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header con gradiente */}
          <div
            className="actividad-modal-header"
            style={{
              background: selectedTipo
                ? `linear-gradient(135deg, ${ACTIVITY_TYPES.find(t => t.value === selectedTipo)?.color || '#6366f1'}, ${ACTIVITY_TYPES.find(t => t.value === selectedTipo)?.color || '#6366f1'}dd)`
                : 'linear-gradient(135deg, #6b7280, #4b5563)'
            }}
          >
            <div className="actividad-modal-header-icon">
              {selectedTipo && (() => {
                const IconComponent = ACTIVITY_TYPES.find(t => t.value === selectedTipo)?.icon || Zap;
                return <IconComponent className="w-7 h-7" />;
              })()}
            </div>
            <div>
              <h3>{editingActividad ? 'Editar Actividad' : 'Nueva Actividad'}</h3>
              <p>{selectedTipo ? ACTIVITY_TYPES.find(t => t.value === selectedTipo)?.label : 'Selecciona un tipo'}</p>
            </div>
            <button className="actividad-modal-close" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="actividad-modal-body">
            {/* Selector de Tipo */}
            <div className="actividad-form-group">
              <label>Tipo de Actividad</label>
              <div className="actividad-tipo-grid">
                {ACTIVITY_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      className={`actividad-tipo-btn ${formData.tipo === type.value ? 'active' : ''}`}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, tipo: type.value }));
                        setSelectedTipo(type.value);
                      }}
                      style={{ '--type-color': type.color } as any}
                    >
                      <IconComponent className="actividad-tipo-icon w-6 h-6" style={{ color: formData.tipo === type.value ? type.color : '#6b7280' }} />
                      <span className="actividad-tipo-label">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Título */}
            <div className="actividad-form-group">
              <label htmlFor="actividad-titulo">Título *</label>
              <input
                id="actividad-titulo"
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ej: Llamar al cliente para seguimiento"
                required
              />
            </div>

            {/* Row: Prioridad y Estado */}
            <div className="actividad-form-row">
              <div className="actividad-form-group">
                <label htmlFor="actividad-prioridad">Prioridad</label>
                <select
                  id="actividad-prioridad"
                  value={formData.prioridad}
                  onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value as Prioridad }))}
                >
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div className="actividad-form-group">
                <label htmlFor="actividad-estado">Estado</label>
                <select
                  id="actividad-estado"
                  value={formData.estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value as EstadoActividad }))}
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fecha */}
            <div className="actividad-form-group">
              <label htmlFor="actividad-fecha">Fecha Programada</label>
              <DatePicker
                value={formData.fecha_actividad}
                onChange={(val) => setFormData(prev => ({ ...prev, fecha_actividad: val || '' }))}
                showTime
                placeholder="Seleccionar fecha y hora"
              />
            </div>

            {/* Contacto */}
            {!hideContactoPicker && (
              <div className="actividad-form-group">
                <label htmlFor="actividad-contacto">Contacto Relacionado</label>
                <ContactPicker
                  value={formData.contacto_id || null}
                  onChange={(contactId) => setFormData(prev => ({ ...prev, contacto_id: contactId || '' }))}
                  contacts={contactos}
                  loading={loadingContactos}
                  placeholder="Seleccionar contacto"
                />
              </div>
            )}

            {/* Descripción */}
            <div className="actividad-form-group">
              <label htmlFor="actividad-descripcion">Descripción</label>
              <textarea
                id="actividad-descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Notas o detalles adicionales..."
                rows={3}
              />
            </div>

            <div className="actividad-modal-actions">
              {editingActividad && onDelete && (
                <button
                  type="button"
                  className="actividad-btn-danger"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" className="actividad-btn-cancel" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="actividad-btn-primary" disabled={saving || !formData.titulo?.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editingActividad ? 'Guardar Cambios' : 'Crear Actividad'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .actividad-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .actividad-modal-content {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 720px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        }

        .actividad-modal-header {
          padding: 24px;
          color: white;
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
        }

        .actividad-modal-header-icon {
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .actividad-modal-header h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .actividad-modal-header p {
          margin: 4px 0 0 0;
          opacity: 0.9;
        }

        .actividad-modal-close {
          position: absolute;
          right: 16px;
          top: 16px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }

        .actividad-modal-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .actividad-modal-body {
          padding: 24px;
          overflow-y: auto;
          max-height: calc(90vh - 200px);
        }

        .actividad-form-group {
          margin-bottom: 20px;
        }

        .actividad-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .actividad-form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .actividad-form-group input,
        .actividad-form-group select,
        .actividad-form-group textarea {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.9rem;
          transition: all 0.2s;
          background: white;
        }

        .actividad-form-group input:focus,
        .actividad-form-group select:focus,
        .actividad-form-group textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .actividad-form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .actividad-tipo-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .actividad-tipo-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 10px;
          background: #f9fafb;
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .actividad-tipo-btn:hover {
          background: #f3f4f6;
          border-color: #e5e7eb;
        }

        .actividad-tipo-btn.active {
          border-color: var(--type-color, #6366f1);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(99, 102, 241, 0.1));
        }

        .actividad-tipo-icon {
          transition: color 0.2s;
        }

        .actividad-tipo-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
        }

        .actividad-tipo-btn.active .actividad-tipo-label {
          color: var(--type-color, #6366f1);
        }

        .actividad-modal-actions {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #f3f4f6;
          background: #f9fafb;
        }

        .actividad-btn-cancel {
          padding: 12px 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
        }

        .actividad-btn-cancel:hover {
          background: #f3f4f6;
        }

        .actividad-btn-primary {
          padding: 12px 24px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
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

        .actividad-btn-primary:hover {
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }

        .actividad-btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .actividad-btn-danger {
          padding: 12px 24px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
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

        .actividad-btn-danger:hover {
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
          transform: translateY(-1px);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .actividad-tipo-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .actividad-form-row {
            grid-template-columns: 1fr;
          }

          .actividad-modal-actions {
            flex-wrap: wrap;
          }

          .actividad-btn-cancel,
          .actividad-btn-primary,
          .actividad-btn-danger {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}
