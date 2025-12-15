/**
 * UserPickerModal - Modal para seleccionar usuarios del tenant
 * Similar a ContactPicker pero para usuarios, con soporte para selección única o múltiple
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, User, X, Check, Loader2, Shield, UserCircle } from 'lucide-react';

interface TenantUser {
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

interface UserPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (userId: string | null, user?: TenantUser) => void;
  onSelectMultiple?: (userIds: string[]) => void; // Para múltiples selecciones (cocaptadores)
  users: TenantUser[];
  loading?: boolean;
  selectedUserId?: string | null; // Para selección única
  selectedUserIds?: string[]; // Para selección múltiple
  filterByRole?: string; // Filtrar por rol (ej: 'asesor')
  multiple?: boolean; // Si es true, permite selección múltiple con checkboxes
  title?: string;
  placeholder?: string;
}

export default function UserPickerModal({
  isOpen,
  onClose,
  onSelect,
  onSelectMultiple,
  users,
  loading = false,
  selectedUserId,
  selectedUserIds = [],
  filterByRole,
  multiple = false,
  title = 'Seleccionar Usuario',
  placeholder = 'Buscar usuario...',
}: UserPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedUserRef = useRef<HTMLButtonElement>(null);
  const prevIsOpenRef = useRef(false);

  // Resetear selección local SOLO cuando el modal se abre (transición de cerrado a abierto)
  useEffect(() => {
    // Solo ejecutar cuando el modal cambia de cerrado a abierto
    if (isOpen && !prevIsOpenRef.current) {
      setLocalSelectedIds(multiple ? [...selectedUserIds] : []);
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 100);

      // Hacer scroll al usuario seleccionado si existe (solo en modo único)
      if (!multiple && selectedUserId) {
        setTimeout(() => {
          selectedUserRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]); // Solo depende de isOpen - los otros valores se leen pero no disparan el efecto

  // Filtrar usuarios por rol si se especifica
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Solo mostrar usuarios activos
      if (user.activo === false) return false;
      
      // Si hay filtro por rol, aplicarlo
      if (filterByRole) {
        const hasRole = user.roles.some(role => 
          role.codigo.toLowerCase().includes(filterByRole.toLowerCase()) ||
          role.nombre.toLowerCase().includes(filterByRole.toLowerCase())
        );
        if (!hasRole) return false;
      }
      
      return true;
    });
  }, [users, filterByRole]);

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtrar usuarios localmente - usar searchQuery directamente para respuesta inmediata
  const displayUsers = useMemo(() => {
    // Si no hay búsqueda, mostrar todos los usuarios filtrados
    if (!searchQuery || !searchQuery.trim()) {
      return filteredUsers;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return filteredUsers.filter(user => {
      const fullName = `${user.nombre || ''} ${user.apellido || ''}`.toLowerCase().trim();
      const email = (user.email || '').toLowerCase().trim();
      const nombre = (user.nombre || '').toLowerCase().trim();
      const apellido = (user.apellido || '').toLowerCase().trim();
      
      // Buscar en nombre completo, email, nombre o apellido por separado
      return fullName.includes(query) || 
             email.includes(query) || 
             nombre.includes(query) || 
             apellido.includes(query);
    });
  }, [filteredUsers, searchQuery]);

  // Referencia estable para onClose
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const getNombreCompleto = (user: TenantUser) => {
    if (user.nombre || user.apellido) {
      return `${user.nombre || ''} ${user.apellido || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  const getIniciales = (user: TenantUser) => {
    if (user.nombre && user.apellido) {
      return `${user.nombre[0]}${user.apellido[0]}`.toUpperCase();
    }
    if (user.nombre) {
      return user.nombre.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const handleUserClick = (user: TenantUser) => {
    if (multiple) {
      // Toggle en selección múltiple
      const newSelectedIds = localSelectedIds.includes(user.id)
        ? localSelectedIds.filter(id => id !== user.id)
        : [...localSelectedIds, user.id];
      setLocalSelectedIds(newSelectedIds);
    } else {
      // Selección única
      onSelect(user.id === selectedUserId ? null : user.id, user);
      onClose();
    }
  };

  const handleConfirmMultiple = () => {
    if (onSelectMultiple) {
      onSelectMultiple(localSelectedIds);
    }
    onClose();
  };

  const handleClear = () => {
    if (multiple) {
      setLocalSelectedIds([]);
    } else {
      onSelect(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div className="user-picker-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="user-picker-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="user-picker-header">
          <div className="user-picker-header-content">
            <div className="user-picker-header-icon">
              <UserCircle className="w-7 h-7" />
            </div>
            <div className="user-picker-header-text">
              <h2>{title}</h2>
              <p>{multiple ? 'Selecciona uno o más usuarios' : 'Selecciona un usuario de la lista'}</p>
            </div>
          </div>
          <button className="user-picker-close" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="user-picker-search-container">
          <div className="user-picker-search">
            <Search style={{ width: 20, height: 20, minWidth: 20, color: '#94a3b8', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={placeholder}
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

        {/* Lista de usuarios */}
        <div className="user-picker-list">
          {loading ? (
            <div className="user-picker-loading">
              <Loader2 className="w-10 h-10 animate-spin" />
              <span>Cargando usuarios...</span>
            </div>
          ) : displayUsers.length === 0 ? (
            <div className="user-picker-empty">
              <div className="empty-icon">
                <User className="w-16 h-16" />
              </div>
              <h3>
                {searchQuery
                  ? 'No se encontraron usuarios'
                  : 'No hay usuarios disponibles'}
              </h3>
              <p>
                {searchQuery
                  ? 'Intenta con otros términos de búsqueda'
                  : 'No hay usuarios que coincidan con los filtros'}
              </p>
            </div>
          ) : (
            <div className="user-list-container">
              {/* Opción para limpiar */}
              {!multiple && (
                <button
                  className="user-list-item clear-item"
                  onClick={handleClear}
                >
                  <div className="clear-item-icon">
                    <X className="w-5 h-5" />
                  </div>
                  <div className="clear-item-text">
                    <span className="clear-item-title">Sin usuario</span>
                    <span className="clear-item-desc">Remover selección</span>
                  </div>
                </button>
              )}

              {/* Lista de usuarios en formato tabla */}
              <div className="user-list">
                {displayUsers.map((user, index) => {
                  const isSelected = multiple
                    ? localSelectedIds.includes(user.id)
                    : user.id === selectedUserId;
                  
                  // Solo asignar el ref al primer usuario seleccionado encontrado
                  const shouldAttachRef = isSelected && !multiple && index === displayUsers.findIndex(u => u.id === selectedUserId);

                  return (
                    <button
                      key={user.id}
                      ref={shouldAttachRef ? selectedUserRef : null}
                      className={`user-list-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleUserClick(user)}
                    >
                      {/* Checkbox para selección múltiple */}
                      {multiple && (
                        <div className="user-list-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Manejado por onClick del botón
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}

                      {/* Indicador de selección */}
                      {!multiple && isSelected && (
                        <div className="user-list-selected-indicator">
                          <Check className="w-4 h-4" />
                        </div>
                      )}

                      {/* Avatar */}
                      <div className="user-list-avatar">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={getNombreCompleto(user)} />
                        ) : (
                          <div className="user-avatar-initials">
                            {getIniciales(user)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="user-list-info">
                        <div className="user-list-name-row">
                          <span className="user-list-name">
                            {getNombreCompleto(user)}
                          </span>
                          {user.esOwner && (
                            <Shield className="w-4 h-4 owner-badge" />
                          )}
                        </div>
                        <div className="user-list-email">{user.email}</div>
                        {user.roles.length > 0 && (
                          <div className="user-list-roles">
                            {user.roles.slice(0, 2).map((role) => (
                              <span
                                key={role.id}
                                className="role-badge-small"
                                style={{
                                  backgroundColor: role.color ? `${role.color}20` : '#e2e8f0',
                                  color: role.color || '#64748b',
                                }}
                              >
                                {role.nombre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        {multiple && (
          <div className="user-picker-footer">
            <button className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleConfirmMultiple}>
              Confirmar ({localSelectedIds.length})
            </button>
          </div>
        )}
      </div>

      <style>{`
        .user-picker-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9998;
          animation: fadeIn 0.2s;
        }

        .user-picker-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease-out;
          overflow: hidden;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        .user-picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 2px solid #f1f5f9;
        }

        .user-picker-header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-picker-header-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .user-picker-header-text h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }

        .user-picker-header-text p {
          margin: 4px 0 0 0;
          font-size: 0.9rem;
          color: #64748b;
        }

        .user-picker-close {
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

        .user-picker-close:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .user-picker-search-container {
          padding: 16px 24px;
          border-bottom: 2px solid #f1f5f9;
        }

        .user-picker-search {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          transition: all 0.2s;
        }

        .user-picker-search:focus-within {
          border-color: #1e293b;
          background: white;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
        }

        .user-picker-search input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.95rem;
          color: #0f172a;
        }

        .user-picker-search input::placeholder {
          color: #94a3b8;
        }

        .search-clear {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .search-clear:hover {
          color: #0f172a;
        }

        .user-picker-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px;
        }

        .user-list-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .user-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .user-list-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .user-list-item:hover {
          border-color: #1e293b;
          background: #f8fafc;
        }

        .user-list-item.selected {
          border-color: #1e293b;
          background: #eff6ff;
        }

        .user-list-checkbox {
          flex-shrink: 0;
        }

        .user-list-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #1e293b;
        }

        .user-list-selected-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #1e293b;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .user-list-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }

        .user-list-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-avatar-initials {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .user-list-info {
          flex: 1;
          min-width: 0;
        }

        .user-list-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .user-list-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #0f172a;
        }

        .owner-badge {
          color: #f59e0b;
          flex-shrink: 0;
        }

        .user-list-email {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 4px;
        }

        .user-list-roles {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .role-badge-small {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }

        .clear-item {
          border-style: dashed;
          background: #f8fafc;
        }

        .clear-item-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          flex-shrink: 0;
        }

        .clear-item-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .clear-item-title {
          font-weight: 600;
          color: #0f172a;
          font-size: 0.95rem;
        }

        .clear-item-desc {
          font-size: 0.85rem;
          color: #64748b;
        }

        .user-picker-loading,
        .user-picker-empty {
          padding: 64px 32px;
          text-align: center;
          color: #64748b;
        }

        .empty-icon {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .user-picker-empty h3 {
          margin: 0 0 8px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .user-picker-empty p {
          margin: 0;
          font-size: 0.9rem;
          color: #64748b;
        }

        .user-picker-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 2px solid #f1f5f9;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: #1e293b;
          color: white;
        }

        .btn-primary:hover {
          background: #0f172a;
        }

        .btn-secondary {
          background: white;
          color: #1e293b;
          border: 2px solid #e2e8f0;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #1e293b;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>,
    document.body
  );
}

