/**
 * TipologiaModal - Modal para agregar/editar tipologías
 */

import { useState, useEffect } from 'react';
import NumberToggle from './NumberToggle';
import ToggleSwitch from './ToggleSwitch';

interface TipologiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nombre: string;
    habitaciones: string;
    banos: string;
    medios_banos: string;
    studio: boolean;
    estacionamiento: string;
    precio: string;
    m2: string;
  }) => void;
  initialData?: {
    nombre: string;
    habitaciones: string;
    banos: string;
    medios_banos: string;
    studio: boolean;
    estacionamiento: string;
    precio: string;
    m2: string;
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

export default function TipologiaModal({ isOpen, onClose, onSubmit, initialData }: TipologiaModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    habitaciones: '0',
    banos: '0',
    medios_banos: '0',
    studio: false,
    estacionamiento: '0',
    precio: '',
    m2: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombre: initialData.nombre || '',
        habitaciones: initialData.habitaciones || '0',
        banos: initialData.banos || '0',
        medios_banos: initialData.medios_banos || '0',
        studio: initialData.studio || false,
        estacionamiento: initialData.estacionamiento || '0',
        precio: initialData.precio || '',
        m2: initialData.m2 || '',
      });
    } else {
      setFormData({
        nombre: '',
        habitaciones: '0',
        banos: '0',
        medios_banos: '0',
        studio: false,
        estacionamiento: '0',
        precio: '',
        m2: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert('Por favor ingresa un nombre para la tipología');
      return;
    }
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="tipologia-modal-overlay" onClick={onClose}>
      <div className="tipologia-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="tipologia-modal-header">
          <h2>{initialData ? 'Editar Tipología' : 'Agregar Tipología'}</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            <Icons.x />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tipologia-modal-form">
          <div className="tipologia-modal-body">
            <div className="form-group full-width">
              <label>Nombre de la Tipología *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: 1 Habitación + Studio"
                required
                autoFocus
              />
              <small className="form-hint">Ej: 1 Habitación + Studio, 2 Habitaciones, etc.</small>
            </div>

            <div className="form-grid" style={{ gap: '16px', marginTop: '20px' }}>
              <div className="form-group">
                <NumberToggle
                  label="Habitaciones"
                  value={parseInt(formData.habitaciones) || 0}
                  onChange={(value) => setFormData(prev => ({ ...prev, habitaciones: value.toString() }))}
                  min={0}
                  max={50}
                  quickOptions={[1, 2, 3, 4, 5]}
                />
              </div>

              <div className="form-group">
                <NumberToggle
                  label="Baños Completos"
                  value={parseInt(formData.banos) || 0}
                  onChange={(value) => setFormData(prev => ({ ...prev, banos: value.toString() }))}
                  min={0}
                  max={20}
                  quickOptions={[1, 2, 3]}
                />
              </div>

              <div className="form-group">
                <NumberToggle
                  label="Medios Baños"
                  value={parseInt(formData.medios_banos) || 0}
                  onChange={(value) => setFormData(prev => ({ ...prev, medios_banos: value.toString() }))}
                  min={0}
                  max={10}
                  quickOptions={[1, 2, 3]}
                />
              </div>

              <div className="form-group">
                <NumberToggle
                  label="Estacionamiento"
                  value={parseInt(formData.estacionamiento) || 0}
                  onChange={(value) => setFormData(prev => ({ ...prev, estacionamiento: value.toString() }))}
                  min={0}
                  max={10}
                  quickOptions={[1, 2, 3]}
                />
              </div>
            </div>

            <div className="form-group full-width" style={{ marginTop: '20px' }}>
              <ToggleSwitch
                label="Studio"
                description="¿Esta tipología incluye un studio?"
                checked={formData.studio}
                onChange={(checked) => setFormData(prev => ({ ...prev, studio: checked }))}
              />
            </div>

            <div className="form-grid" style={{ gap: '16px', marginTop: '20px' }}>
              <div className="form-group">
                <label>Metraje (M²)</label>
                <input
                  type="text"
                  value={formData.m2}
                  onChange={(e) => setFormData(prev => ({ ...prev, m2: e.target.value }))}
                  placeholder="Ej: 45"
                />
              </div>

              <div className="form-group">
                <label>Precio</label>
                <input
                  type="text"
                  value={formData.precio}
                  onChange={(e) => setFormData(prev => ({ ...prev, precio: e.target.value }))}
                  placeholder="Ej: USD 85,000"
                />
              </div>
            </div>
          </div>

          <div className="tipologia-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {initialData ? 'Guardar Cambios' : 'Agregar Tipología'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .tipologia-modal-overlay {
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

        .tipologia-modal-content {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 700px;
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

        .tipologia-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 32px;
          border-bottom: 2px solid #f1f5f9;
          flex-shrink: 0;
        }

        .tipologia-modal-header h2 {
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

        .tipologia-modal-form {
          padding: 32px;
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        .tipologia-modal-body {
          flex: 1;
          overflow-y: auto;
          padding-right: 8px;
        }

        .tipologia-modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .tipologia-modal-body::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .tipologia-modal-body::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .tipologia-modal-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .tipologia-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 24px 32px;
          border-top: 2px solid #f1f5f9;
          flex-shrink: 0;
        }

        .tipologia-modal-form .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tipologia-modal-form .form-group.full-width {
          grid-column: 1 / -1;
        }

        .tipologia-modal-form .form-group label {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
          letter-spacing: -0.01em;
          margin-bottom: 6px;
        }

        .tipologia-modal-form .form-group input {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.2s;
          background: white;
        }

        .tipologia-modal-form .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .tipologia-modal-form .form-hint {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 4px;
        }

        .tipologia-modal-form .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .btn-primary, .btn-secondary {
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }
      `}</style>
    </div>
  );
}

