import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, Loader2, User, Building2, DollarSign, ChevronRight, FileText, Target } from 'lucide-react';

interface SolicitudSimple {
  id: string;
  titulo: string;
  etapa: string;
  tipo_operacion: string | null;
  prioridad: string;
  purge_score: number;
  valor_estimado: number | null;
  // Contacto
  contacto_id: string | null;
  contacto_nombre: string | null;
  contacto_apellido: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  // Asesor asignado
  asignado_id: string | null;
  asignado_nombre: string | null;
  asignado_apellido: string | null;
  asignado_avatar: string | null;
  // Búsqueda
  tipo_propiedad: string | null;
  zona_interes: string | null;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  // Propiedades
  propiedades_count: number;
  propiedades_preview: any[];
  created_at: string;
}

interface SolicitudPickerProps {
  value: string | null;
  onChange: (solicitudId: string | null, solicitud?: SolicitudSimple) => void;
  solicitudes: SolicitudSimple[];
  loading?: boolean;
  onSearch?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

const ETAPA_COLORS: Record<string, string> = {
  nuevo: '#3b82f6',
  contactado: '#8b5cf6',
  calificado: '#f59e0b',
  propuesta: '#ec4899',
  negociacion: '#f97316',
  ganado: '#10b981',
  perdido: '#ef4444',
};

const ETAPA_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  calificado: 'Calificado',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  ganado: 'Ganado',
  perdido: 'Perdido',
};

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: '#ef4444',
  media: '#f59e0b',
  baja: '#10b981',
};

export default function SolicitudPicker({
  value,
  onChange,
  solicitudes,
  loading = false,
  onSearch,
  placeholder = 'Vincular solicitud (opcional)',
  disabled = false,
  clearable = true,
  className = '',
}: SolicitudPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Encontrar la solicitud seleccionada
  const selectedSolicitud = solicitudes.find(s => s.id === value);

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (onSearch) {
        onSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  // Filtrar solicitudes localmente
  const filteredSolicitudes = solicitudes.filter(solicitud => {
    // Solo mostrar solicitudes en etapas activas (no ganadas/perdidas)
    if (['ganado', 'perdido'].includes(solicitud.etapa)) return false;

    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
      const titulo = solicitud.titulo.toLowerCase();
      const contactoNombre = `${solicitud.contacto_nombre || ''} ${solicitud.contacto_apellido || ''}`.toLowerCase();
      const zona = (solicitud.zona_interes || '').toLowerCase();

      return titulo.includes(query) ||
             contactoNombre.includes(query) ||
             zona.includes(query);
    }
    return true;
  });

  // Ordenar: por purge_score desc, luego por fecha más reciente
  const sortedSolicitudes = [...filteredSolicitudes].sort((a, b) => {
    if (b.purge_score !== a.purge_score) return b.purge_score - a.purge_score;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Manejar selección
  const handleSelect = (solicitud: SolicitudSimple) => {
    onChange(solicitud.id, solicitud);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Limpiar selección
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Formatear moneda
  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  // Renderizar el modal usando Portal
  const renderModal = () => {
    if (!isOpen) return null;

    const modal = (
      <>
        {/* Overlay */}
        <div className="solicitud-picker-overlay" onClick={() => setIsOpen(false)} />

        {/* Modal */}
        <div className="solicitud-picker-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="solicitud-picker-header">
            <div className="solicitud-picker-header-content">
              <div className="solicitud-picker-header-icon">
                <Target className="w-7 h-7" />
              </div>
              <div className="solicitud-picker-header-text">
                <h2>Vincular Solicitud</h2>
                <p>Auto-rellena cliente, asesor y propiedad desde una solicitud existente</p>
              </div>
            </div>
            <button className="solicitud-picker-close" onClick={() => setIsOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Búsqueda */}
          <div className="solicitud-picker-search-container">
            <div className="solicitud-picker-search">
              <Search style={{ width: 20, height: 20, minWidth: 20, color: '#94a3b8', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por título, cliente o zona..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de solicitudes */}
          <div className="solicitud-picker-list">
            {loading ? (
              <div className="solicitud-picker-loading">
                <Loader2 className="w-10 h-10 animate-spin" />
                <span>Cargando solicitudes...</span>
              </div>
            ) : sortedSolicitudes.length === 0 ? (
              <div className="solicitud-picker-empty">
                <div className="empty-icon">
                  <FileText className="w-16 h-16" />
                </div>
                <h3>
                  {searchQuery
                    ? 'No se encontraron solicitudes'
                    : 'No hay solicitudes activas'}
                </h3>
                <p>
                  {searchQuery
                    ? 'Intenta con otros términos de búsqueda'
                    : 'Las solicitudes ganadas o perdidas no se muestran'}
                </p>
              </div>
            ) : (
              <div className="solicitud-grid">
                {/* Opción para limpiar */}
                {clearable && value && (
                  <button
                    className="solicitud-card clear-card"
                    onClick={() => { onChange(null); setIsOpen(false); }}
                  >
                    <div className="clear-card-icon">
                      <X className="w-6 h-6" />
                    </div>
                    <div className="clear-card-text">
                      <span className="clear-card-title">Sin vincular</span>
                      <span className="clear-card-desc">Crear venta sin solicitud</span>
                    </div>
                  </button>
                )}

                {/* Lista de solicitudes */}
                {sortedSolicitudes.map((solicitud) => {
                  const isSelected = value === solicitud.id;
                  const etapaColor = ETAPA_COLORS[solicitud.etapa] || '#6b7280';
                  const prioridadColor = PRIORIDAD_COLORS[solicitud.prioridad] || '#6b7280';

                  return (
                    <button
                      key={solicitud.id}
                      className={`solicitud-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(solicitud)}
                    >
                      {/* Indicador de selección */}
                      {isSelected && (
                        <div className="selected-indicator">
                          <Check className="w-4 h-4" />
                        </div>
                      )}

                      {/* Score Badge */}
                      <div
                        className="solicitud-score"
                        style={{
                          backgroundColor: solicitud.purge_score >= 80 ? '#dcfce7' :
                                          solicitud.purge_score >= 60 ? '#fef3c7' : '#fee2e2',
                          color: solicitud.purge_score >= 80 ? '#16a34a' :
                                 solicitud.purge_score >= 60 ? '#d97706' : '#dc2626'
                        }}
                      >
                        {solicitud.purge_score}%
                      </div>

                      {/* Main Content */}
                      <div className="solicitud-card-content">
                        {/* Título y etapa */}
                        <div className="solicitud-card-header">
                          <h4 className="solicitud-card-title">{solicitud.titulo}</h4>
                          <div className="solicitud-badges">
                            <span
                              className="solicitud-etapa"
                              style={{ backgroundColor: `${etapaColor}15`, color: etapaColor }}
                            >
                              {ETAPA_LABELS[solicitud.etapa] || solicitud.etapa}
                            </span>
                            <span
                              className="solicitud-prioridad"
                              style={{ backgroundColor: `${prioridadColor}15`, color: prioridadColor }}
                            >
                              {solicitud.prioridad}
                            </span>
                          </div>
                        </div>

                        {/* Info rows */}
                        <div className="solicitud-card-details">
                          {/* Cliente */}
                          {solicitud.contacto_nombre && (
                            <div className="detail-row">
                              <User className="w-4 h-4" />
                              <span className="detail-label">Cliente:</span>
                              <span className="detail-value">
                                {solicitud.contacto_nombre} {solicitud.contacto_apellido || ''}
                              </span>
                            </div>
                          )}

                          {/* Asesor */}
                          {solicitud.asignado_nombre && (
                            <div className="detail-row">
                              <User className="w-4 h-4" />
                              <span className="detail-label">Asesor:</span>
                              <span className="detail-value">
                                {solicitud.asignado_nombre} {solicitud.asignado_apellido || ''}
                              </span>
                            </div>
                          )}

                          {/* Tipo operación y propiedad */}
                          {(solicitud.tipo_operacion || solicitud.tipo_propiedad) && (
                            <div className="detail-row">
                              <Building2 className="w-4 h-4" />
                              <span className="detail-label">Busca:</span>
                              <span className="detail-value">
                                {[solicitud.tipo_operacion, solicitud.tipo_propiedad].filter(Boolean).join(' - ')}
                              </span>
                            </div>
                          )}

                          {/* Zona */}
                          {solicitud.zona_interes && (
                            <div className="detail-row">
                              <Building2 className="w-4 h-4" />
                              <span className="detail-label">Zona:</span>
                              <span className="detail-value">{solicitud.zona_interes}</span>
                            </div>
                          )}

                          {/* Valor estimado o presupuesto */}
                          {(solicitud.valor_estimado || solicitud.presupuesto_max) && (
                            <div className="detail-row">
                              <DollarSign className="w-4 h-4" />
                              <span className="detail-label">
                                {solicitud.valor_estimado ? 'Valor est.:' : 'Presupuesto:'}
                              </span>
                              <span className="detail-value highlight">
                                {formatCurrency(solicitud.valor_estimado || solicitud.presupuesto_max)}
                              </span>
                            </div>
                          )}

                          {/* Propiedades vinculadas */}
                          {solicitud.propiedades_count > 0 && (
                            <div className="detail-row">
                              <Building2 className="w-4 h-4" />
                              <span className="detail-label">Propiedades:</span>
                              <span className="detail-value">
                                {solicitud.propiedades_count} vinculada{solicitud.propiedades_count > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight className="solicitud-card-chevron" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="solicitud-picker-footer">
            <div className="footer-info">
              <span className="solicitud-count">
                {filteredSolicitudes.length} solicitud{filteredSolicitudes.length !== 1 ? 'es' : ''} activa{filteredSolicitudes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button className="footer-cancel" onClick={() => setIsOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      </>
    );

    return createPortal(modal, document.body);
  };

  return (
    <div className={`solicitud-picker-container ${className}`}>
      <style>{`
        .solicitud-picker-container {
          position: relative;
          width: 100%;
        }

        .solicitud-picker-input {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 52px;
        }

        .solicitud-picker-input:hover:not(.disabled) {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .solicitud-picker-input.open {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .solicitud-picker-input.has-value {
          border-color: #10b981;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }

        .solicitud-picker-input.disabled {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .solicitud-picker-icon {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .solicitud-picker-input.has-value .solicitud-picker-icon {
          color: #10b981;
        }

        .solicitud-picker-value {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .solicitud-picker-placeholder {
          color: #94a3b8;
          font-size: 0.95rem;
        }

        .selected-solicitud-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1f2937;
        }

        .selected-solicitud-meta {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .solicitud-picker-clear {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .solicitud-picker-clear:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        /* Overlay */
        .solicitud-picker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 99998;
          animation: overlayFadeIn 0.2s ease-out;
        }

        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Modal */
        .solicitud-picker-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 94%;
          max-width: 750px;
          max-height: 85vh;
          background: white;
          border-radius: 24px;
          box-shadow: 0 25px 100px rgba(0, 0, 0, 0.3);
          z-index: 99999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        /* Header */
        .solicitud-picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .solicitud-picker-header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .solicitud-picker-header-icon {
          width: 52px;
          height: 52px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .solicitud-picker-header-text h2 {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
        }

        .solicitud-picker-header-text p {
          margin: 4px 0 0 0;
          font-size: 0.9rem;
          opacity: 0.85;
        }

        .solicitud-picker-close {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }

        .solicitud-picker-close:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.05);
        }

        /* Search */
        .solicitud-picker-search-container {
          padding: 20px 28px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .solicitud-picker-search {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          transition: all 0.2s;
        }

        .solicitud-picker-search:focus-within {
          border-color: #10b981;
        }

        .solicitud-picker-search input {
          flex: 1;
          border: none !important;
          background: transparent !important;
          font-size: 1rem;
          color: #1f2937;
          outline: none !important;
          box-shadow: none !important;
        }

        .solicitud-picker-search input::placeholder {
          color: #94a3b8;
        }

        .search-clear {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* List */
        .solicitud-picker-list {
          flex: 1;
          overflow-y: auto;
          padding: 20px 28px;
          min-height: 300px;
          max-height: 450px;
        }

        .solicitud-picker-loading,
        .solicitud-picker-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .solicitud-picker-loading svg {
          color: #10b981;
        }

        .solicitud-picker-loading span {
          margin-top: 16px;
          color: #64748b;
        }

        .solicitud-picker-empty .empty-icon {
          width: 100px;
          height: 100px;
          background: #f1f5f9;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .solicitud-picker-empty .empty-icon svg {
          color: #cbd5e1;
        }

        .solicitud-picker-empty h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
        }

        .solicitud-picker-empty p {
          margin: 8px 0 0 0;
          font-size: 0.9rem;
          color: #94a3b8;
        }

        /* Grid */
        .solicitud-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Card */
        .solicitud-card {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          width: 100%;
          padding: 16px 20px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .solicitud-card:hover {
          border-color: #a7f3d0;
          background: #f0fdf4;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.1);
        }

        .solicitud-card.selected {
          border-color: #10b981;
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }

        .solicitud-card.clear-card {
          background: #f8fafc;
          border-style: dashed;
          align-items: center;
        }

        .solicitud-card.clear-card:hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }

        .clear-card-icon {
          width: 48px;
          height: 48px;
          background: #e2e8f0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .solicitud-card.clear-card:hover .clear-card-icon {
          background: #fecaca;
          color: #dc2626;
        }

        .clear-card-text {
          flex: 1;
        }

        .clear-card-title {
          display: block;
          font-weight: 600;
          color: #374151;
        }

        .clear-card-desc {
          display: block;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        /* Score Badge */
        .solicitud-score {
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        /* Selected indicator */
        .selected-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        /* Content */
        .solicitud-card-content {
          flex: 1;
          min-width: 0;
        }

        .solicitud-card-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .solicitud-card-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: #1f2937;
        }

        .solicitud-badges {
          display: flex;
          gap: 8px;
        }

        .solicitud-etapa,
        .solicitud-prioridad {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        /* Details */
        .solicitud-card-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #64748b;
        }

        .detail-row svg {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .detail-label {
          color: #94a3b8;
        }

        .detail-value {
          color: #374151;
          font-weight: 500;
        }

        .detail-value.highlight {
          color: #10b981;
          font-weight: 700;
        }

        .solicitud-card-chevron {
          width: 24px;
          height: 24px;
          color: #cbd5e1;
          flex-shrink: 0;
          align-self: center;
        }

        .solicitud-card:hover .solicitud-card-chevron {
          color: #10b981;
          transform: translateX(4px);
        }

        /* Footer */
        .solicitud-picker-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 28px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .solicitud-count {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        .footer-cancel {
          padding: 12px 24px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
        }

        .footer-cancel:hover {
          background: #f1f5f9;
          color: #374151;
        }
      `}</style>

      {/* Input */}
      <div
        ref={inputRef}
        className={`solicitud-picker-input ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${selectedSolicitud ? 'has-value' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <Target className="solicitud-picker-icon w-5 h-5" />
        <div className="solicitud-picker-value">
          {selectedSolicitud ? (
            <>
              <span className="selected-solicitud-title">{selectedSolicitud.titulo}</span>
              <span className="selected-solicitud-meta">
                {selectedSolicitud.contacto_nombre && `${selectedSolicitud.contacto_nombre} ${selectedSolicitud.contacto_apellido || ''}`}
                {selectedSolicitud.contacto_nombre && selectedSolicitud.asignado_nombre && ' • '}
                {selectedSolicitud.asignado_nombre && `Asesor: ${selectedSolicitud.asignado_nombre}`}
              </span>
            </>
          ) : (
            <span className="solicitud-picker-placeholder">{placeholder}</span>
          )}
        </div>
        {clearable && selectedSolicitud && !disabled && (
          <button type="button" className="solicitud-picker-clear" onClick={handleClear}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Modal via Portal */}
      {renderModal()}
    </div>
  );
}
