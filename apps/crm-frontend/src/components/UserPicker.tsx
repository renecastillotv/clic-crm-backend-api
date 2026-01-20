/**
 * UserPicker - Componente para seleccionar usuarios del tenant
 * Muestra un trigger que abre un modal profesional con búsqueda y selección
 * Consistente con el diseño de UserPickerModal
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
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

interface UserPickerProps {
  value: string | null | undefined;
  onChange: (userId: string | null, user?: TenantUser) => void;
  users: TenantUser[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  filterByRole?: string;
  tenantId?: string;
}

export default function UserPicker({
  value,
  onChange,
  users,
  loading = false,
  placeholder = 'Seleccionar usuario',
  disabled = false,
  clearable = true,
  className = '',
  filterByRole,
}: UserPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedUser = users.find(u => u.id === value);

  // Filtrar usuarios por rol si se especifica
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (user.activo === false) return false;

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

  // Filtrar usuarios por búsqueda
  const displayUsers = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return filteredUsers;
    }

    const query = searchQuery.toLowerCase().trim();
    return filteredUsers.filter(user => {
      const fullName = `${user.nombre || ''} ${user.apellido || ''}`.toLowerCase().trim();
      const email = (user.email || '').toLowerCase().trim();
      return fullName.includes(query) || email.includes(query);
    });
  }, [filteredUsers, searchQuery]);

  // Focus en búsqueda al abrir
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
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
    onChange(user.id === value ? null : user.id, user);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  const handleTriggerClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={`user-picker ${className}`}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(true)}
        className={`user-picker-trigger ${disabled ? 'disabled' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          background: disabled ? '#f9fafb' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '42px',
        }}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" style={{ color: '#9ca3af' }} />
        ) : selectedUser ? (
          <>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {getIniciales(selectedUser)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getNombreCompleto(selectedUser)}
              </div>
            </div>
            {clearable && !disabled && (
              <button
                onClick={handleTriggerClear}
                style={{
                  padding: '4px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} style={{ color: '#9ca3af' }} />
              </button>
            )}
          </>
        ) : (
          <>
            <User size={16} style={{ color: '#9ca3af' }} />
            <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{placeholder}</span>
          </>
        )}
      </div>

      {/* Modal */}
      {isOpen && createPortal(
        <>
          {/* Overlay */}
          <div className="user-picker-overlay" onClick={() => setIsOpen(false)} />

          {/* Modal */}
          <div className="user-picker-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="user-picker-header">
              <div className="user-picker-header-content">
                <div className="user-picker-header-icon">
                  <UserCircle className="w-7 h-7" />
                </div>
                <div className="user-picker-header-text">
                  <h2>Seleccionar Usuario</h2>
                  <p>Selecciona un usuario de la lista</p>
                </div>
              </div>
              <button className="user-picker-close" onClick={() => setIsOpen(false)}>
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
                  placeholder="Buscar usuario..."
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

                  {/* Lista de usuarios */}
                  <div className="user-list">
                    {displayUsers.map((user) => {
                      const isSelected = user.id === value;

                      return (
                        <button
                          key={user.id}
                          className={`user-list-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleUserClick(user)}
                        >
                          {/* Indicador de selección */}
                          {isSelected && (
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
          </div>

          <style>{`
            .user-picker-trigger:hover:not(.disabled) {
              border-color: #d1d5db;
            }

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
              max-width: 600px;
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
            }

            .user-picker-search input {
              flex: 1;
              border: none !important;
              background: transparent !important;
              outline: none !important;
              box-shadow: none !important;
              font-size: 0.95rem;
              color: #0f172a;
              -webkit-appearance: none;
            }

            .user-picker-search input:focus {
              border: none !important;
              outline: none !important;
              box-shadow: none !important;
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
      )}
    </div>
  );
}
