/**
 * PropertyPicker - Componente profesional para seleccionar propiedades
 *
 * Modal grande con colores neutros para destacar las propiedades
 * Sin box-shadow ni rings en inputs - solo cambio de borde en focus
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Home,
  X,
  Check,
  Loader2,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Square
} from 'lucide-react';

interface Propiedad {
  id: string;
  titulo: string;
  codigo?: string;
  tipo: string;
  operacion: string;
  precio?: number;
  moneda: string;
  ciudad?: string;
  colonia?: string;
  estado_propiedad?: string;
  imagen_principal?: string;
  recamaras?: number;
  banos?: number;
  m2_construccion?: number;
}

interface PropertyPickerProps {
  value: string | null | undefined;
  onChange: (propertyId: string | null, property?: Propiedad) => void;
  properties: Propiedad[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

// CSS styles - colores neutros, sin box-shadow ni rings
const modalStyles = `
  @keyframes propertyPickerFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes propertyPickerSlideUp {
    from {
      opacity: 0;
      transform: translate(-50%, -48%) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .property-picker-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    z-index: 9998;
    animation: propertyPickerFadeIn 0.2s ease-out;
  }

  .property-picker-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 96%;
    max-width: 800px;
    max-height: 90vh;
    z-index: 9999;
    background: white;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: propertyPickerSlideUp 0.25s ease-out;
  }

  /* Header neutro */
  .property-picker-header {
    padding: 20px 24px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid #e2e8f0;
  }

  .property-picker-header-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .property-picker-icon-container {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #64748b 0%, #475569 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .property-picker-header-text h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
  }

  .property-picker-header-text p {
    margin: 4px 0 0;
    font-size: 0.875rem;
    color: #64748b;
  }

  .property-picker-close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: rgba(100, 116, 139, 0.1);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  }

  .property-picker-close-btn:hover {
    background: rgba(100, 116, 139, 0.2);
  }

  /* Search container neutro - SIN box-shadow */
  .property-picker-search-container {
    padding: 16px 24px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .property-picker-search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    transition: border-color 0.2s ease;
  }

  /* Focus solo cambia el borde - SIN box-shadow ni ring */
  .property-picker-search-input-wrapper:focus-within {
    border-color: #64748b;
  }

  .property-picker-search-input {
    flex: 1;
    border: none !important;
    background: transparent !important;
    outline: none !important;
    box-shadow: none !important;
    font-size: 0.95rem;
    color: #1e293b;
    -webkit-appearance: none;
    appearance: none;
  }

  .property-picker-search-input:focus {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    ring: none !important;
  }

  .property-picker-search-input::placeholder {
    color: #94a3b8;
  }

  /* Lista más grande */
  .property-picker-list {
    flex: 1;
    overflow-y: auto;
    max-height: 500px;
  }

  .property-picker-list-item {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 24px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease;
    border-bottom: 1px solid #f1f5f9;
  }

  .property-picker-list-item:hover {
    background: #f8fafc;
  }

  .property-picker-list-item.selected {
    background: #f1f5f9;
  }

  .property-picker-list-item:last-child {
    border-bottom: none;
  }

  /* Imágenes más grandes */
  .property-picker-property-image {
    width: 80px;
    height: 80px;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    background: #f1f5f9;
  }

  .property-picker-property-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .property-picker-property-image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  }

  .property-picker-property-info {
    flex: 1;
    min-width: 0;
  }

  .property-picker-property-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .property-picker-property-code {
    font-size: 0.8rem;
    color: #94a3b8;
    font-weight: 400;
    margin-left: 8px;
  }

  .property-picker-property-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .property-picker-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .property-picker-badge-tipo {
    background: #f1f5f9;
    color: #475569;
  }

  .property-picker-badge-venta {
    background: #dcfce7;
    color: #166534;
  }

  .property-picker-badge-renta {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .property-picker-property-location {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 6px;
  }

  .property-picker-property-price {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.95rem;
    font-weight: 600;
    color: #059669;
  }

  .property-picker-property-features {
    display: flex;
    gap: 14px;
    margin-top: 8px;
    font-size: 0.8rem;
    color: #64748b;
  }

  .property-picker-property-feature {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .property-picker-check {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #64748b 0%, #475569 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    align-self: center;
  }

  .property-picker-empty {
    padding: 60px 24px;
    text-align: center;
    color: #64748b;
  }

  .property-picker-empty-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }

  .property-picker-loading {
    padding: 60px 24px;
    text-align: center;
    color: #64748b;
  }

  /* Trigger neutro */
  .property-picker-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: white;
    cursor: pointer;
    min-height: 48px;
    transition: border-color 0.2s ease;
  }

  .property-picker-trigger:hover:not(.disabled) {
    border-color: #cbd5e1;
  }

  .property-picker-trigger.open {
    border-color: #64748b;
  }

  .property-picker-trigger.disabled {
    background: #f8fafc;
    cursor: not-allowed;
    opacity: 0.7;
  }

  .property-picker-trigger-image {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .property-picker-trigger-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .property-picker-trigger-placeholder {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .property-picker-trigger-info {
    flex: 1;
    min-width: 0;
  }

  .property-picker-trigger-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: #1e293b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .property-picker-trigger-subtitle {
    font-size: 0.75rem;
    color: #64748b;
  }

  .property-picker-trigger-empty {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
    font-size: 0.9rem;
  }

  .property-picker-clear-btn {
    padding: 6px;
    border-radius: 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  }

  .property-picker-clear-btn:hover {
    background: #f1f5f9;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Override cualquier estilo externo de Tailwind/Radix/shadcn */
  .property-picker-search-input,
  .property-picker-search-input:focus,
  .property-picker-search-input:focus-visible,
  .property-picker-search-input:active {
    outline: none !important;
    outline-offset: 0 !important;
    box-shadow: none !important;
    ring: 0 !important;
    --tw-ring-shadow: none !important;
    --tw-ring-offset-shadow: none !important;
  }
`;

export default function PropertyPicker({
  value,
  onChange,
  properties,
  loading = false,
  placeholder = 'Seleccionar propiedad',
  disabled = false,
  clearable = true,
  className = '',
}: PropertyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedProperty = properties.find(p => p.id === value);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and sort properties
  const filteredProperties = properties.filter(property => {
    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
      const titulo = (property.titulo || '').toLowerCase();
      const codigo = (property.codigo || '').toLowerCase();
      const ciudad = (property.ciudad || '').toLowerCase();
      const colonia = (property.colonia || '').toLowerCase();
      return titulo.includes(query) || codigo.includes(query) || ciudad.includes(query) || colonia.includes(query);
    }
    return true;
  });

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    return (a.titulo || '').localeCompare(b.titulo || '');
  });

  // Handle escape key and focus
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

  const handleSelect = (property: Propiedad) => {
    onChange(property.id, property);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  const formatPrice = (precio?: number, moneda?: string) => {
    if (!precio) return null;
    const formatter = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda || 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(precio);
  };

  const getPropertyTypeLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      casa: 'Casa',
      departamento: 'Departamento',
      terreno: 'Terreno',
      local: 'Local Comercial',
      oficina: 'Oficina',
      bodega: 'Bodega',
      edificio: 'Edificio',
    };
    return tipos[tipo] || tipo;
  };

  const getOperacionLabel = (operacion: string) => {
    const operaciones: Record<string, string> = {
      venta: 'Venta',
      renta: 'Renta',
      traspaso: 'Traspaso',
    };
    return operaciones[operacion] || operacion;
  };

  const renderTriggerImage = () => {
    if (selectedProperty?.imagen_principal) {
      return (
        <div className="property-picker-trigger-image">
          <img src={selectedProperty.imagen_principal} alt="" />
        </div>
      );
    }
    return (
      <div className="property-picker-trigger-placeholder">
        <Home size={18} color="white" />
      </div>
    );
  };

  const renderPropertyImage = (property: Propiedad) => {
    if (property.imagen_principal) {
      return (
        <div className="property-picker-property-image">
          <img src={property.imagen_principal} alt="" />
        </div>
      );
    }
    return (
      <div className="property-picker-property-image">
        <div className="property-picker-property-image-placeholder">
          <Home size={28} color="white" />
        </div>
      </div>
    );
  };

  return (
    <div className={`property-picker ${className}`}>
      <style>{modalStyles}</style>

      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(true)}
        className={`property-picker-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" style={{ color: '#94a3b8' }} />
        ) : selectedProperty ? (
          <>
            {renderTriggerImage()}
            <div className="property-picker-trigger-info">
              <div className="property-picker-trigger-title">
                {selectedProperty.titulo}
              </div>
              <div className="property-picker-trigger-subtitle">
                {getPropertyTypeLabel(selectedProperty.tipo)} • {getOperacionLabel(selectedProperty.operacion)}
                {selectedProperty.ciudad && ` • ${selectedProperty.ciudad}`}
              </div>
            </div>
            {clearable && !disabled && (
              <button onClick={handleClear} className="property-picker-clear-btn">
                <X size={16} style={{ color: '#94a3b8' }} />
              </button>
            )}
          </>
        ) : (
          <div className="property-picker-trigger-empty">
            <Home size={18} />
            <span>{placeholder}</span>
          </div>
        )}
      </div>

      {/* Modal Portal */}
      {isOpen && createPortal(
        <>
          {/* Overlay */}
          <div
            className="property-picker-overlay"
            onClick={handleOverlayClick}
          />

          {/* Modal */}
          <div className="property-picker-modal">
            {/* Header */}
            <div className="property-picker-header">
              <div className="property-picker-header-content">
                <div className="property-picker-icon-container">
                  <Home size={24} color="white" />
                </div>
                <div className="property-picker-header-text">
                  <h2>Seleccionar Propiedad</h2>
                  <p>{properties.length} propiedades disponibles</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="property-picker-close-btn"
              >
                <X size={20} style={{ color: '#64748b' }} />
              </button>
            </div>

            {/* Search */}
            <div className="property-picker-search-container">
              <div className="property-picker-search-input-wrapper">
                <Search size={20} style={{ color: '#64748b' }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por título, código, ciudad..."
                  className="property-picker-search-input"
                  style={{
                    outline: 'none',
                    boxShadow: 'none',
                    border: 'none',
                    WebkitAppearance: 'none'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      padding: '4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={18} style={{ color: '#94a3b8' }} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="property-picker-list">
              {loading ? (
                <div className="property-picker-loading">
                  <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 20px', display: 'block', color: '#64748b' }} />
                  <p style={{ margin: 0, fontSize: '1rem' }}>Cargando propiedades...</p>
                </div>
              ) : sortedProperties.length === 0 ? (
                <div className="property-picker-empty">
                  <div className="property-picker-empty-icon">
                    <Home size={32} style={{ color: '#94a3b8' }} />
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 500, color: '#475569' }}>
                    {searchQuery ? 'Sin resultados' : 'Sin propiedades'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    {searchQuery
                      ? `No se encontraron propiedades para "${searchQuery}"`
                      : 'No hay propiedades disponibles'}
                  </p>
                </div>
              ) : (
                sortedProperties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handleSelect(property)}
                    className={`property-picker-list-item ${property.id === value ? 'selected' : ''}`}
                  >
                    {renderPropertyImage(property)}

                    <div className="property-picker-property-info">
                      <p className="property-picker-property-title">
                        {property.titulo}
                        {property.codigo && (
                          <span className="property-picker-property-code">
                            ({property.codigo})
                          </span>
                        )}
                      </p>

                      <div className="property-picker-property-badges">
                        <span className="property-picker-badge property-picker-badge-tipo">
                          {getPropertyTypeLabel(property.tipo)}
                        </span>
                        <span className={`property-picker-badge ${property.operacion === 'venta' ? 'property-picker-badge-venta' : 'property-picker-badge-renta'}`}>
                          {getOperacionLabel(property.operacion)}
                        </span>
                      </div>

                      {(property.ciudad || property.colonia) && (
                        <div className="property-picker-property-location">
                          <MapPin size={14} />
                          {[property.colonia, property.ciudad].filter(Boolean).join(', ')}
                        </div>
                      )}

                      {property.precio && (
                        <div className="property-picker-property-price">
                          <DollarSign size={16} />
                          {formatPrice(property.precio, property.moneda)}
                        </div>
                      )}

                      {(property.recamaras || property.banos || property.m2_construccion) && (
                        <div className="property-picker-property-features">
                          {property.recamaras && (
                            <span className="property-picker-property-feature">
                              <Bed size={14} />
                              {property.recamaras} rec
                            </span>
                          )}
                          {property.banos && (
                            <span className="property-picker-property-feature">
                              <Bath size={14} />
                              {property.banos} baños
                            </span>
                          )}
                          {property.m2_construccion && (
                            <span className="property-picker-property-feature">
                              <Square size={14} />
                              {property.m2_construccion} m²
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {property.id === value && (
                      <div className="property-picker-check">
                        <Check size={16} color="white" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
