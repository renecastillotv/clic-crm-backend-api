import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, User, X, Check, Loader2, Phone, Mail, Building2, Star, ChevronRight, UserCircle } from 'lucide-react';

interface Contact {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  tipo: string;
  tipos_contacto?: string[];
  empresa: string | null;
  favorito?: boolean;
  foto_url?: string | null;
  activo?: boolean;
}

interface ContactPickerProps {
  value: string | null;
  onChange: (contactId: string | null, contact?: Contact) => void;
  contacts: Contact[];
  loading?: boolean;
  onSearch?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  showInactive?: boolean;
}

const TIPO_COLORS: Record<string, string> = {
  lead: '#f59e0b',
  cliente: '#10b981',
  asesor: '#6366f1',
  desarrollador: '#8b5cf6',
  referidor: '#ec4899',
  propietario: '#14b8a6',
  vendedor: '#f97316',
};

const TIPO_LABELS: Record<string, string> = {
  lead: 'Lead',
  cliente: 'Cliente',
  asesor: 'Asesor',
  desarrollador: 'Desarrollador',
  referidor: 'Referidor',
  propietario: 'Propietario',
  vendedor: 'Vendedor',
};

export default function ContactPicker({
  value,
  onChange,
  contacts,
  loading = false,
  onSearch,
  placeholder = 'Seleccionar contacto',
  disabled = false,
  clearable = true,
  className = '',
  showInactive = false,
}: ContactPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Encontrar el contacto seleccionado
  const selectedContact = contacts.find(c => c.id === value);

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

  // Filtrar contactos localmente
  const filteredContacts = contacts.filter(contact => {
    if (!showInactive && contact.activo === false) return false;

    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
      const fullName = `${contact.nombre} ${contact.apellido || ''}`.toLowerCase();
      const email = (contact.email || '').toLowerCase();
      const phone = (contact.telefono || '').toLowerCase();
      const company = (contact.empresa || '').toLowerCase();

      return fullName.includes(query) ||
             email.includes(query) ||
             phone.includes(query) ||
             company.includes(query);
    }
    return true;
  });

  // Ordenar: favoritos primero, luego alfabéticamente
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (a.favorito && !b.favorito) return -1;
    if (!a.favorito && b.favorito) return 1;
    return `${a.nombre} ${a.apellido || ''}`.localeCompare(`${b.nombre} ${b.apellido || ''}`);
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
  const handleSelect = (contact: Contact) => {
    onChange(contact.id, contact);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Limpiar selección
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Renderizar avatar
  const renderAvatar = (contact: Contact, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: { container: 'w-9 h-9', text: 'text-sm' },
      md: { container: 'w-14 h-14', text: 'text-lg' },
      lg: { container: 'w-16 h-16', text: 'text-xl' },
    };

    const initials = `${contact.nombre.charAt(0)}${(contact.apellido || '').charAt(0)}`.toUpperCase();
    const bgColor = TIPO_COLORS[contact.tipo] || '#6b7280';

    if (contact.foto_url) {
      return (
        <div className={`contact-avatar ${sizeClasses[size].container}`}>
          <img src={contact.foto_url} alt={contact.nombre} />
        </div>
      );
    }

    return (
      <div
        className={`contact-avatar-initials ${sizeClasses[size].container} ${sizeClasses[size].text}`}
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>
    );
  };

  // Renderizar el modal usando Portal
  const renderModal = () => {
    if (!isOpen) return null;

    const modal = (
      <>
        {/* Overlay */}
        <div className="contact-picker-overlay" onClick={() => setIsOpen(false)} />

        {/* Modal */}
        <div className="contact-picker-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="contact-picker-header">
            <div className="contact-picker-header-content">
              <div className="contact-picker-header-icon">
                <UserCircle className="w-7 h-7" />
              </div>
              <div className="contact-picker-header-text">
                <h2>Seleccionar Contacto</h2>
                <p>Busca y selecciona un contacto de tu lista</p>
              </div>
            </div>
            <button className="contact-picker-close" onClick={() => setIsOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Búsqueda */}
          <div className="contact-picker-search-container">
            <div className="contact-picker-search">
              <Search style={{ width: 20, height: 20, minWidth: 20, color: '#94a3b8', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nombre, email, teléfono o empresa..."
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

          {/* Lista de contactos */}
          <div className="contact-picker-list">
            {loading ? (
              <div className="contact-picker-loading">
                <Loader2 className="w-10 h-10 animate-spin" />
                <span>Cargando contactos...</span>
              </div>
            ) : sortedContacts.length === 0 ? (
              <div className="contact-picker-empty">
                <div className="empty-icon">
                  <User className="w-16 h-16" />
                </div>
                <h3>
                  {searchQuery
                    ? 'No se encontraron contactos'
                    : 'No hay contactos disponibles'}
                </h3>
                <p>
                  {searchQuery
                    ? 'Intenta con otros términos de búsqueda'
                    : 'Crea un contacto primero para poder seleccionarlo'}
                </p>
              </div>
            ) : (
              <div className="contact-grid">
                {/* Opción para limpiar */}
                {clearable && value && (
                  <button
                    className="contact-card clear-card"
                    onClick={() => { onChange(null); setIsOpen(false); }}
                  >
                    <div className="clear-card-icon">
                      <X className="w-6 h-6" />
                    </div>
                    <div className="clear-card-text">
                      <span className="clear-card-title">Sin contacto</span>
                      <span className="clear-card-desc">Remover selección</span>
                    </div>
                  </button>
                )}

                {/* Lista de contactos */}
                {sortedContacts.map((contact) => {
                  const isSelected = value === contact.id;
                  const tipoColor = TIPO_COLORS[contact.tipo] || '#6b7280';

                  return (
                    <button
                      key={contact.id}
                      className={`contact-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(contact)}
                    >
                      {/* Indicador de selección */}
                      {isSelected && (
                        <div className="selected-indicator">
                          <Check className="w-4 h-4" />
                        </div>
                      )}

                      {/* Favorito */}
                      {contact.favorito && (
                        <div className="favorite-indicator">
                          <Star className="w-4 h-4" />
                        </div>
                      )}

                      {/* Avatar */}
                      <div className="contact-card-avatar">
                        {renderAvatar(contact, 'md')}
                      </div>

                      {/* Info */}
                      <div className="contact-card-info">
                        <h4 className="contact-card-name">
                          {contact.nombre} {contact.apellido || ''}
                        </h4>

                        {/* Tipo badge */}
                        <div className="contact-card-type" style={{ backgroundColor: `${tipoColor}15`, color: tipoColor }}>
                          {TIPO_LABELS[contact.tipo] || contact.tipo}
                        </div>

                        {/* Detalles */}
                        <div className="contact-card-details">
                          {contact.email && (
                            <div className="detail-item">
                              <Mail className="w-3.5 h-3.5" />
                              <span>{contact.email}</span>
                            </div>
                          )}
                          {contact.telefono && (
                            <div className="detail-item">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{contact.telefono}</span>
                            </div>
                          )}
                          {contact.empresa && (
                            <div className="detail-item">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{contact.empresa}</span>
                            </div>
                          )}
                        </div>

                        {/* Tipos adicionales */}
                        {contact.tipos_contacto && contact.tipos_contacto.length > 1 && (
                          <div className="contact-card-tags">
                            {contact.tipos_contacto.filter(t => t !== contact.tipo).slice(0, 2).map((tipo) => (
                              <span
                                key={tipo}
                                className="contact-tag"
                                style={{
                                  backgroundColor: `${TIPO_COLORS[tipo] || '#6b7280'}15`,
                                  color: TIPO_COLORS[tipo] || '#6b7280'
                                }}
                              >
                                {TIPO_LABELS[tipo] || tipo}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Chevron */}
                      <ChevronRight className="contact-card-chevron" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="contact-picker-footer">
            <div className="footer-info">
              <span className="contact-count">
                {filteredContacts.length} contacto{filteredContacts.length !== 1 ? 's' : ''}
                {searchQuery && ` encontrado${filteredContacts.length !== 1 ? 's' : ''}`}
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
    <div className={`contact-picker-container ${className}`}>
      <style>{`
        .contact-picker-container {
          position: relative;
          width: 100%;
        }

        .contact-picker-input {
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

        .contact-picker-input:hover:not(.disabled) {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .contact-picker-input.open {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .contact-picker-input.disabled {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .contact-picker-icon {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .contact-picker-input.open .contact-picker-icon {
          color: #6366f1;
        }

        .contact-picker-value {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .contact-picker-placeholder {
          color: #94a3b8;
          font-size: 0.95rem;
        }

        .selected-contact-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .selected-contact-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1f2937;
        }

        .selected-contact-email {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .contact-picker-clear {
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

        .contact-picker-clear:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        /* Input Avatar */
        .input-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .input-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .input-avatar-initials {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          color: white;
        }

        /* Overlay */
        .contact-picker-overlay {
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
        .contact-picker-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 94%;
          max-width: 700px;
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
        .contact-picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
        }

        .contact-picker-header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .contact-picker-header-icon {
          width: 52px;
          height: 52px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .contact-picker-header-text h2 {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
        }

        .contact-picker-header-text p {
          margin: 4px 0 0 0;
          font-size: 0.9rem;
          opacity: 0.85;
        }

        .contact-picker-close {
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

        .contact-picker-close:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.05);
        }

        /* Search Container */
        .contact-picker-search-container {
          padding: 20px 28px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .contact-picker-search {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          transition: all 0.2s;
        }

        .contact-picker-search:focus-within {
          border-color: #6366f1;
        }

        .contact-picker-search input {
          flex: 1;
          border: none !important;
          background: transparent !important;
          font-size: 1rem;
          color: #1f2937;
          outline: none !important;
          box-shadow: none !important;
          -webkit-appearance: none;
        }

        .contact-picker-search input:focus {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        .contact-picker-search input::placeholder {
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
          transition: all 0.15s;
        }

        .search-clear:hover {
          background: #e2e8f0;
          color: #374151;
        }

        /* List */
        .contact-picker-list {
          flex: 1;
          overflow-y: auto;
          padding: 20px 28px;
          min-height: 300px;
          max-height: 450px;
        }

        .contact-picker-loading,
        .contact-picker-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .contact-picker-loading svg {
          color: #6366f1;
        }

        .contact-picker-loading span {
          margin-top: 16px;
          color: #64748b;
          font-size: 1rem;
        }

        .contact-picker-empty .empty-icon {
          width: 100px;
          height: 100px;
          background: #f1f5f9;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .contact-picker-empty .empty-icon svg {
          color: #cbd5e1;
        }

        .contact-picker-empty h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
        }

        .contact-picker-empty p {
          margin: 8px 0 0 0;
          font-size: 0.9rem;
          color: #94a3b8;
        }

        /* Contact Grid */
        .contact-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Contact Card */
        .contact-card {
          position: relative;
          display: flex;
          align-items: center;
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

        .contact-card:hover {
          border-color: #c7d2fe;
          background: #fafbff;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.1);
        }

        .contact-card.selected {
          border-color: #6366f1;
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.15);
        }

        .contact-card.clear-card {
          background: #f8fafc;
          border-style: dashed;
        }

        .contact-card.clear-card:hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }

        .clear-card-icon {
          width: 56px;
          height: 56px;
          background: #e2e8f0;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .contact-card.clear-card:hover .clear-card-icon {
          background: #fecaca;
          color: #dc2626;
        }

        .clear-card-text {
          flex: 1;
        }

        .clear-card-title {
          display: block;
          font-weight: 600;
          font-size: 1rem;
          color: #374151;
        }

        .clear-card-desc {
          display: block;
          font-size: 0.85rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        /* Selected indicator */
        .selected-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          background: #6366f1;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* Favorite indicator */
        .favorite-indicator {
          position: absolute;
          top: 12px;
          left: 12px;
          color: #f59e0b;
        }

        .favorite-indicator svg {
          fill: #f59e0b;
        }

        /* Avatar */
        .contact-card-avatar {
          flex-shrink: 0;
        }

        .contact-avatar {
          border-radius: 14px;
          overflow: hidden;
        }

        .contact-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .contact-avatar-initials {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          font-weight: 700;
          color: white;
        }

        /* Card Info */
        .contact-card-info {
          flex: 1;
          min-width: 0;
        }

        .contact-card-name {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 6px;
        }

        .contact-card-type {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 10px;
        }

        .contact-card-details {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: #64748b;
        }

        .detail-item svg {
          color: #94a3b8;
        }

        .contact-card-tags {
          display: flex;
          gap: 6px;
          margin-top: 10px;
        }

        .contact-tag {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .contact-card-chevron {
          width: 24px;
          height: 24px;
          color: #cbd5e1;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .contact-card:hover .contact-card-chevron {
          color: #6366f1;
          transform: translateX(4px);
        }

        /* Footer */
        .contact-picker-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 28px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .footer-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .contact-count {
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
          transition: all 0.15s;
        }

        .footer-cancel:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #374151;
        }
      `}</style>

      {/* Input */}
      <div
        ref={inputRef}
        className={`contact-picker-input ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <User className="contact-picker-icon w-5 h-5" />
        <div className="contact-picker-value">
          {selectedContact ? (
            <>
              <div
                className="input-avatar-initials"
                style={{ backgroundColor: TIPO_COLORS[selectedContact.tipo] || '#6b7280' }}
              >
                {`${selectedContact.nombre.charAt(0)}${(selectedContact.apellido || '').charAt(0)}`.toUpperCase()}
              </div>
              <div className="selected-contact-info">
                <span className="selected-contact-name">
                  {selectedContact.nombre} {selectedContact.apellido || ''}
                </span>
                {selectedContact.email && (
                  <span className="selected-contact-email">{selectedContact.email}</span>
                )}
              </div>
            </>
          ) : (
            <span className="contact-picker-placeholder">{placeholder}</span>
          )}
        </div>
        {clearable && selectedContact && !disabled && (
          <button type="button" className="contact-picker-clear" onClick={handleClear}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Modal via Portal */}
      {renderModal()}
    </div>
  );
}
