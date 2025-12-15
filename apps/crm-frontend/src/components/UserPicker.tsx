/**
 * UserPicker - Componente para seleccionar usuarios del tenant
 * Similar a ContactPicker pero para usuarios/asesores
 */

import React, { useState, useRef, useEffect } from 'react';
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedUser = users.find(u => u.id === value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredUsers = users.filter(user => {
    if (user.activo === false) return false;

    if (filterByRole) {
      const hasRole = user.roles.some(role =>
        role.codigo.toLowerCase().includes(filterByRole.toLowerCase()) ||
        role.nombre.toLowerCase().includes(filterByRole.toLowerCase())
      );
      if (!hasRole) return false;
    }

    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
      const fullName = `${user.nombre || ''} ${user.apellido || ''}`.toLowerCase().trim();
      const email = (user.email || '').toLowerCase();
      return fullName.includes(query) || email.includes(query);
    }
    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const nameA = `${a.nombre || ''} ${a.apellido || ''}`.trim();
    const nameB = `${b.nombre || ''} ${b.apellido || ''}`.trim();
    return nameA.localeCompare(nameB);
  });

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (user: TenantUser) => {
    onChange(user.id, user);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const getFullName = (user: TenantUser) => {
    if (user.nombre || user.apellido) {
      return `${user.nombre || ''} ${user.apellido || ''}`.trim();
    }
    return user.email;
  };

  const renderAvatar = (user: TenantUser, size: 'sm' | 'md' = 'sm') => {
    const sizeClasses = {
      sm: { container: 'w-8 h-8', text: 'text-xs' },
      md: { container: 'w-10 h-10', text: 'text-sm' },
    };

    const initials = `${(user.nombre || '').charAt(0)}${(user.apellido || '').charAt(0)}`.toUpperCase() || user.email.charAt(0).toUpperCase();

    if (user.avatarUrl) {
      return (
        <div className={`${sizeClasses[size].container} rounded-full overflow-hidden flex-shrink-0`}>
          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
        </div>
      );
    }

    return (
      <div
        className={`${sizeClasses[size].container} rounded-full flex items-center justify-center flex-shrink-0`}
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        <span className={`${sizeClasses[size].text} font-medium text-white`}>{initials}</span>
      </div>
    );
  };

  const getDropdownPosition = () => {
    if (!inputRef.current) return { top: 0, left: 0, width: 0 };
    const rect = inputRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    };
  };

  const dropdownPosition = getDropdownPosition();

  return (
    <div className={`user-picker ${className}`} style={{ position: 'relative' }}>
      <div
        ref={inputRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`user-picker-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
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
            {renderAvatar(selectedUser)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getFullName(selectedUser)}
              </div>
              {selectedUser.roles.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {selectedUser.roles.map(r => r.nombre).join(', ')}
                </div>
              )}
            </div>
            {clearable && !disabled && (
              <button
                onClick={handleClear}
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

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: Math.max(dropdownPosition.width, 280),
            zIndex: 9999,
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#f3f4f6',
              borderRadius: '8px',
            }}>
              <Search size={16} style={{ color: '#9ca3af' }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar usuario..."
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '0.875rem',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  <X size={14} style={{ color: '#9ca3af' }} />
                </button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '0.875rem' }}>Cargando usuarios...</p>
              </div>
            ) : sortedUsers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                <UserCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.875rem' }}>
                  {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
                </p>
              </div>
            ) : (
              sortedUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    border: 'none',
                    background: user.id === value ? '#f0f9ff' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (user.id !== value) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = user.id === value ? '#f0f9ff' : 'transparent';
                  }}
                >
                  {renderAvatar(user, 'md')}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#1f2937',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {getFullName(user)}
                      {user.esOwner && (
                        <Shield size={12} style={{ marginLeft: '4px', color: '#f59e0b', display: 'inline' }} />
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.email}</div>
                    {user.roles.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {user.roles.slice(0, 2).map((role) => (
                          <span
                            key={role.id}
                            style={{
                              fontSize: '0.625rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: role.color ? `${role.color}20` : '#e5e7eb',
                              color: role.color || '#4b5563',
                            }}
                          >
                            {role.nombre}
                          </span>
                        ))}
                        {user.roles.length > 2 && (
                          <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
                            +{user.roles.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {user.id === value && (
                    <Check size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .user-picker-trigger:hover:not(.disabled) {
          border-color: #d1d5db;
        }
        .user-picker-trigger.open {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
