/**
 * TagSelector - Selector de tags globales
 */

import { useState, useRef, useEffect } from 'react';

interface Tag {
  id: string;
  nombre: string;
  color?: string;
  slug?: string;
}

interface Props {
  value: string[];
  onChange: (tagIds: string[]) => void;
  tags: Tag[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const Icons = {
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevronDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
};

export default function TagSelector({
  value,
  onChange,
  tags,
  loading = false,
  placeholder = 'Seleccionar tags...',
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTags = tags.filter(tag => value.includes(tag.id));
  const filteredTags = tags.filter(tag =>
    tag.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTag = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter(id => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  const removeTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(id => id !== tagId));
  };

  return (
    <div className="tag-selector" ref={containerRef}>
      {/* Input/Trigger */}
      <button
        type="button"
        className={`tag-selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="tag-selector-value">
          {selectedTags.length > 0 ? (
            <div className="selected-tags">
              {selectedTags.map(tag => (
                <span
                  key={tag.id}
                  className="selected-tag"
                  style={{ backgroundColor: tag.color || '#e2e8f0' }}
                >
                  {tag.nombre}
                  <button
                    type="button"
                    className="tag-remove"
                    onClick={(e) => removeTag(tag.id, e)}
                  >
                    {Icons.x}
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="tag-placeholder">{placeholder}</span>
          )}
        </div>
        <span className="tag-selector-icon">{Icons.chevronDown}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="tag-selector-dropdown">
          {/* Search */}
          <div className="tag-search">
            <span className="tag-search-icon">{Icons.search}</span>
            <input
              type="text"
              placeholder="Buscar tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Tags list */}
          <div className="tag-list">
            {loading ? (
              <div className="tag-loading">Cargando tags...</div>
            ) : filteredTags.length === 0 ? (
              <div className="tag-empty">
                {search ? 'No se encontraron tags' : 'No hay tags disponibles'}
              </div>
            ) : (
              filteredTags.map(tag => {
                const isSelected = value.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`tag-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag.id)}
                  >
                    <span
                      className="tag-color"
                      style={{ backgroundColor: tag.color || '#94a3b8' }}
                    />
                    <span className="tag-name">{tag.nombre}</span>
                    {isSelected && <span className="tag-check">{Icons.check}</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        .tag-selector {
          position: relative;
          width: 100%;
        }

        .tag-selector-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          min-height: 42px;
        }

        .tag-selector-trigger:hover:not(:disabled) {
          border-color: #cbd5e1;
        }

        .tag-selector-trigger.open {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .tag-selector-trigger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f8fafc;
        }

        .tag-selector-value {
          flex: 1;
          min-width: 0;
        }

        .tag-placeholder {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .selected-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .selected-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px 2px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #1e293b;
        }

        .tag-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: transparent;
          border: none;
          color: currentColor;
          opacity: 0.6;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .tag-remove:hover {
          opacity: 1;
        }

        .tag-selector-icon {
          display: flex;
          color: #94a3b8;
          transition: transform 0.2s;
        }

        .tag-selector-trigger.open .tag-selector-icon {
          transform: rotate(180deg);
        }

        .tag-selector-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          z-index: 100;
          max-height: 280px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .tag-search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .tag-search-icon {
          display: flex;
          color: #94a3b8;
        }

        .tag-search input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.875rem;
          background: transparent;
        }

        .tag-search input::placeholder {
          color: #94a3b8;
        }

        .tag-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px;
        }

        .tag-loading,
        .tag-empty {
          padding: 16px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .tag-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }

        .tag-option:hover {
          background: #f8fafc;
        }

        .tag-option.selected {
          background: #eff6ff;
        }

        .tag-color {
          width: 12px;
          height: 12px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .tag-name {
          flex: 1;
          font-size: 0.875rem;
          color: #1e293b;
        }

        .tag-check {
          display: flex;
          color: #3b82f6;
        }
      `}</style>
    </div>
  );
}
