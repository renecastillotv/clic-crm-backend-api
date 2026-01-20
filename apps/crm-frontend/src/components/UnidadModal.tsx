/**
 * UnidadModal - Modal para agregar/editar unidades de un proyecto inmobiliario
 */

import { useState, useEffect } from 'react';

export interface UnidadProyecto {
  id?: string;
  codigo: string;
  tipologia_id?: string;
  tipologia_nombre?: string;
  habitaciones?: number;
  banos?: number;
  m2?: number;
  precio?: number;
  moneda?: string;
  torre?: string;
  piso?: string;
  nivel?: string;
  estado: 'disponible' | 'reservada' | 'bloqueada' | 'vendida';
  notas?: string;
}

interface Tipologia {
  id: string;
  nombre: string;
  habitaciones?: number;
  banos?: number;
  m2?: number;
  precio?: number;
  estacionamiento?: number;
}

interface UnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<UnidadProyecto>) => void;
  initialData?: UnidadProyecto | null;
  tipologias?: Tipologia[];
}

const Icons = {
  x: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
};

const estadoColors: Record<string, { bg: string; text: string; label: string }> = {
  disponible: { bg: '#dcfce7', text: '#166534', label: 'Disponible' },
  reservada: { bg: '#fef3c7', text: '#92400e', label: 'Reservada' },
  bloqueada: { bg: '#e2e8f0', text: '#475569', label: 'Bloqueada' },
  vendida: { bg: '#fee2e2', text: '#991b1b', label: 'Vendida' },
};

export default function UnidadModal({ isOpen, onClose, onSubmit, initialData, tipologias = [] }: UnidadModalProps) {
  const [formData, setFormData] = useState<Partial<UnidadProyecto>>({
    codigo: '',
    tipologia_id: '',
    tipologia_nombre: '',
    habitaciones: undefined,
    banos: undefined,
    m2: undefined,
    precio: undefined,
    moneda: 'USD',
    torre: '',
    piso: '',
    nivel: '',
    estado: 'disponible',
    notas: '',
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        codigo: initialData.codigo || '',
        tipologia_id: initialData.tipologia_id || '',
        tipologia_nombre: initialData.tipologia_nombre || '',
        habitaciones: initialData.habitaciones,
        banos: initialData.banos,
        m2: initialData.m2,
        precio: initialData.precio,
        moneda: initialData.moneda || 'USD',
        torre: initialData.torre || '',
        piso: initialData.piso || '',
        nivel: initialData.nivel || '',
        estado: initialData.estado || 'disponible',
        notas: initialData.notas || '',
      });
    } else if (isOpen && !initialData) {
      setFormData({
        codigo: '',
        tipologia_id: '',
        tipologia_nombre: '',
        habitaciones: undefined,
        banos: undefined,
        m2: undefined,
        precio: undefined,
        moneda: 'USD',
        torre: '',
        piso: '',
        nivel: '',
        estado: 'disponible',
        notas: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleTipologiaChange = (tipologiaId: string) => {
    const tipologia = tipologias.find(t => t.id === tipologiaId);
    if (tipologia) {
      setFormData(prev => ({
        ...prev,
        tipologia_id: tipologiaId,
        tipologia_nombre: tipologia.nombre,
        habitaciones: tipologia.habitaciones ?? prev.habitaciones,
        banos: tipologia.banos ?? prev.banos,
        m2: tipologia.m2 ?? prev.m2,
        precio: tipologia.precio ?? prev.precio,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tipologia_id: '',
        tipologia_nombre: '',
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo?.trim()) {
      alert('Por favor ingresa un codigo para la unidad');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="unidad-modal-overlay" onClick={onClose}>
      <div className="unidad-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="unidad-modal-header">
          <h2>{initialData ? 'Editar Unidad' : 'Agregar Nueva Unidad'}</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            <Icons.x />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="unidad-modal-form">
          <div className="modal-body">
            {/* Codigo y Estado */}
            <div className="form-row">
              <div className="form-group">
                <label>Codigo *</label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                  placeholder="Ej: A-101, T1-501"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value as any }))}
                  style={{
                    backgroundColor: estadoColors[formData.estado || 'disponible'].bg,
                    color: estadoColors[formData.estado || 'disponible'].text,
                  }}
                >
                  {Object.entries(estadoColors).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tipologia */}
            {tipologias.length > 0 && (
              <div className="form-group full-width">
                <label>Tipologia</label>
                <select
                  value={formData.tipologia_id || ''}
                  onChange={(e) => handleTipologiaChange(e.target.value)}
                >
                  <option value="">Seleccionar tipologia...</option>
                  {tipologias.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
                <small className="form-hint">Selecciona una tipologia para autocompletar habitaciones, banos y m2</small>
              </div>
            )}

            {/* Caracteristicas */}
            <div className="form-section-title">Caracteristicas</div>
            <div className="form-row three-cols">
              <div className="form-group">
                <label>Habitaciones</label>
                <input
                  type="number"
                  min="0"
                  value={formData.habitaciones ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    habitaciones: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Banos</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.banos ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    banos: e.target.value ? parseFloat(e.target.value) : undefined
                  }))}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>M2</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.m2 ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    m2: e.target.value ? parseFloat(e.target.value) : undefined
                  }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Precio */}
            <div className="form-section-title">Precio</div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Precio</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precio ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    precio: e.target.value ? parseFloat(e.target.value) : undefined
                  }))}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Moneda</label>
                <select
                  value={formData.moneda || 'USD'}
                  onChange={(e) => setFormData(prev => ({ ...prev, moneda: e.target.value }))}
                >
                  <option value="USD">USD</option>
                  <option value="DOP">DOP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            {/* Notas */}
            <div className="form-group full-width">
              <label>Notas</label>
              <textarea
                value={formData.notas || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Notas adicionales sobre esta unidad..."
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {initialData ? 'Guardar Cambios' : 'Agregar Unidad'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .unidad-modal-overlay {
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

        .unidad-modal-content {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 720px;
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

        .unidad-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          border-bottom: 2px solid #f1f5f9;
          flex-shrink: 0;
        }

        .unidad-modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
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

        .unidad-modal-form {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px 28px;
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

        .form-section-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 20px 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }

        .form-section-title:first-child {
          margin-top: 0;
        }

        .form-row {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-row.three-cols {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
        }

        .form-row > .form-group {
          flex: 1;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 28px;
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
          gap: 6px;
        }

        .form-group.full-width {
          margin-bottom: 16px;
        }

        .form-group label {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.85rem;
          letter-spacing: -0.01em;
        }

        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group select,
        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #334155;
          transition: border-color 0.2s;
          background: white;
        }

        .form-group input[type="text"]:focus,
        .form-group input[type="number"]:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #3b82f6;
          outline: none;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-hint {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
