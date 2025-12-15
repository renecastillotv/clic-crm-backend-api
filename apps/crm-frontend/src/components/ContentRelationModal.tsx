/**
 * ContentRelationModal - Modal para buscar y relacionar contenido (FAQs, Videos, Artículos)
 */

import { useState, useEffect } from 'react';

interface ContentItem {
  id: string;
  titulo: string;
  descripcion?: string;
  [key: string]: any;
}

interface ContentRelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: ContentItem) => void;
  contentType: 'faqs' | 'videos' | 'articulos';
  tenantId: string;
  onCreateNew?: () => void;
}

const Icons = {
  x: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  search: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
  ),
  plus: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
};

const CONTENT_TYPE_LABELS = {
  faqs: {
    singular: 'FAQ',
    plural: 'FAQs',
    icon: '❓',
    placeholder: 'Buscar preguntas frecuentes...',
    createLabel: 'Crear Nueva FAQ',
    emptyMessage: 'No se encontraron FAQs. Crea una nueva para relacionarla con esta propiedad.',
  },
  videos: {
    singular: 'Video',
    plural: 'Videos',
    icon: '🎥',
    placeholder: 'Buscar videos...',
    createLabel: 'Crear Nuevo Video',
    emptyMessage: 'No se encontraron videos. Crea uno nuevo para relacionarlo con esta propiedad.',
  },
  articulos: {
    singular: 'Artículo',
    plural: 'Artículos',
    icon: '📄',
    placeholder: 'Buscar artículos...',
    createLabel: 'Crear Nuevo Artículo',
    emptyMessage: 'No se encontraron artículos. Crea uno nuevo para relacionarlo con esta propiedad.',
  },
};

export default function ContentRelationModal({
  isOpen,
  onClose,
  onSelect,
  contentType,
  tenantId,
  onCreateNew,
}: ContentRelationModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const labels = CONTENT_TYPE_LABELS[contentType];

  // Buscar contenido (simulado por ahora - se conectará a la API real)
  useEffect(() => {
    if (!isOpen || !tenantId) return;

    const searchContent = async () => {
      setLoading(true);
      setError(null);

      try {
        // TODO: Conectar con la API real
        // Por ahora simulamos una búsqueda
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulación de resultados vacíos
        setResults([]);
      } catch (err: any) {
        setError(err.message || 'Error al buscar contenido');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    if (searchQuery.trim().length >= 2 || searchQuery.trim().length === 0) {
      searchContent();
    } else {
      setResults([]);
    }
  }, [searchQuery, isOpen, tenantId]);

  // Reset al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (item: ContentItem) => {
    onSelect(item);
    onClose();
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    }
    onClose();
  };

  return (
    <div className="content-relation-modal-overlay" onClick={onClose}>
      <div className="content-relation-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="content-relation-modal-header">
          <div>
            <h2>
              <span style={{ marginRight: '12px', fontSize: '1.5rem' }}>{labels.icon}</span>
              Relacionar con {labels.plural}
            </h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
              Busca {labels.plural.toLowerCase()} existentes o crea uno nuevo para relacionarlo con esta propiedad
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <Icons.x />
          </button>
        </div>

        <div className="content-relation-modal-body">
          {/* Barra de búsqueda */}
          <div className="search-container">
            <div className="search-input-wrapper">
              <Icons.search className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={labels.placeholder}
                autoFocus
                className="search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  <Icons.x />
                </button>
              )}
            </div>
          </div>

          {/* Resultados o estado vacío */}
          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner"></div>
              <p>Buscando {labels.plural.toLowerCase()}...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <span style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</span>
              <p style={{ color: '#dc2626' }}>{error}</p>
            </div>
          ) : results.length > 0 ? (
            <div className="results-list">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="result-item"
                  onClick={() => handleSelect(item)}
                >
                  <div className="result-content">
                    <h4>{item.titulo}</h4>
                    {item.descripcion && (
                      <p className="result-description">{item.descripcion}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="select-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(item);
                    }}
                  >
                    Seleccionar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: '3rem', marginBottom: '16px' }}>{labels.icon}</span>
              <p>{labels.emptyMessage}</p>
              {onCreateNew && (
                <button
                  type="button"
                  className="create-new-btn"
                  onClick={handleCreateNew}
                >
                  <Icons.plus />
                  {labels.createLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .content-relation-modal-overlay {
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

        .content-relation-modal-content {
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

        .content-relation-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 28px 32px;
          border-bottom: 2px solid #f1f5f9;
          flex-shrink: 0;
        }

        .content-relation-modal-header h2 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
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

        .content-relation-modal-body {
          padding: 24px 32px 32px;
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .content-relation-modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .content-relation-modal-body::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .content-relation-modal-body::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .content-relation-modal-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .search-container {
          margin-bottom: 8px;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          color: #94a3b8;
          z-index: 1;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.95rem;
          color: #1e293b;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .clear-search-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .clear-search-btn:hover {
          background: #f1f5f9;
          color: #64748b;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s;
        }

        .result-item:hover {
          border-color: #6366f1;
          background: #f0f4ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
        }

        .result-content {
          flex: 1;
        }

        .result-content h4 {
          margin: 0 0 6px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .result-description {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .select-btn {
          padding: 8px 16px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: 16px;
        }

        .select-btn:hover {
          background: #4f46e5;
          transform: scale(1.05);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .empty-state p {
          margin: 0;
          font-size: 1rem;
          color: #64748b;
          max-width: 400px;
        }

        .create-new-btn {
          margin-top: 24px;
          padding: 12px 24px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .create-new-btn:hover {
          background: #4f46e5;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}













