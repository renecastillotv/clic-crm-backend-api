/**
 * EtapaModal - Modal para agregar/editar etapas del proyecto
 */

import { useState, useEffect } from 'react';
import MonthYearPicker from './MonthYearPicker';

interface EtapaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nombre: string;
    fecha_entrega: string;
  }) => void;
  initialData?: {
    nombre: string;
    fecha_entrega: string;
  } | null;
}

const Icons = {
  x: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
};

export default function EtapaModal({ isOpen, onClose, onSubmit, initialData }: EtapaModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    fecha_entrega: '',
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        nombre: initialData.nombre || '',
        fecha_entrega: initialData.fecha_entrega || '',
      });
    } else if (isOpen && !initialData) {
      // Reset form for new etapa
      setFormData({
        nombre: '',
        fecha_entrega: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert('Por favor ingresa un nombre para la etapa');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="etapa-modal-overlay" onClick={onClose}>
      <div className="etapa-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="etapa-modal-header">
          <h2>{initialData ? 'Editar Etapa' : 'Agregar Nueva Etapa'}</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            <Icons.x />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="etapa-modal-form">
          <div className="modal-body">
            <div className="form-group full-width">
              <label>Nombre de la Etapa *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Etapa 1, Primera Fase, etc."
                required
                autoFocus
              />
              <small className="form-hint">Ej: Etapa 1, Primera Fase, etc.</small>
            </div>

            <div className="form-group full-width" style={{ marginTop: '20px' }}>
              <label>Fecha de Entrega (Mes y Año)</label>
              <MonthYearPicker
                value={formData.fecha_entrega || null}
                onChange={(value) => setFormData(prev => ({ ...prev, fecha_entrega: value || '' }))}
                placeholder="Seleccionar mes y año"
                clearable
              />
              <small className="form-hint">Selecciona el mes y año de entrega de esta etapa</small>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {initialData ? 'Guardar Cambios' : 'Agregar Etapa'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .etapa-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: fadeIn 0.2s;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .etapa-modal-content {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .etapa-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 32px;
          border-bottom: 2px solid #f1f5f9;
          flex-shrink: 0;
        }

        .etapa-modal-header h2 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .etapa-modal-form {
          padding: 32px;
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding-right: 8px;
        }

        .modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 32px;
          border-top: 2px solid #f1f5f9;
          background: #f8fafc;
          border-bottom-left-radius: 20px;
          border-bottom-right-radius: 20px;
          flex-shrink: 0;
        }

        .btn-primary {
          background-color: #0f172a;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          transition: background-color 0.2s;
          border: none;
          cursor: pointer;
        }

        .btn-primary:hover {
          background-color: #1e293b;
        }

        .btn-secondary {
          background-color: #e2e8f0;
          color: #1e293b;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          transition: background-color 0.2s;
          border: none;
          cursor: pointer;
        }

        .btn-secondary:hover {
          background-color: #cbd5e1;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
          letter-spacing: -0.01em;
        }

        .form-group input[type="text"],
        .form-group input[type="number"] {
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #334155;
          transition: border-color 0.2s;
        }

        .form-group input[type="text"]:focus,
        .form-group input[type="number"]:focus {
          border-color: #3b82f6;
          outline: none;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-hint {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}













