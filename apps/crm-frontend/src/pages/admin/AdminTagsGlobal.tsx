/**
 * AdminTagsGlobal - Gestión de Tags Globales
 * Permite crear, editar y administrar los tags globales del sistema
 * para filtrado de propiedades en URLs
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  getTagsGlobal,
  createTagGlobal,
  updateTagGlobal,
  deleteTagGlobal,
  toggleTagGlobalStatus,
  getTagsGlobalStats,
  TagGlobal,
  CreateTagGlobalData,
  TagGlobalStats,
} from '../../services/api';

// Iconos inline
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const IconChevron = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s',
    }}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const IconTag = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41L13.42 20.58C13.2343 20.766 13.0137 20.9135 12.7709 21.0141C12.5281 21.1148 12.2678 21.1666 12.005 21.1666C11.7422 21.1666 11.4819 21.1148 11.2391 21.0141C10.9963 20.9135 10.7757 20.766 10.59 20.58L2 12V2H12L20.59 10.59C20.9625 10.9647 21.1716 11.4716 21.1716 12C21.1716 12.5284 20.9625 13.0353 20.59 13.41Z" />
    <circle cx="7" cy="7" r="1.5" fill="currentColor" />
  </svg>
);

// Configuración de colores por tipo
const TIPO_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  operacion: { label: 'Operación', color: '#DC2626', bgColor: '#FEE2E2' },
  tipo_propiedad: { label: 'Tipo Propiedad', color: '#7C3AED', bgColor: '#EDE9FE' },
  filtro: { label: 'Filtro', color: '#2563EB', bgColor: '#DBEAFE' },
  amenidad: { label: 'Amenidad', color: '#059669', bgColor: '#D1FAE5' },
  caracteristica: { label: 'Característica', color: '#D97706', bgColor: '#FEF3C7' },
  ubicacion: { label: 'Ubicación', color: '#0891B2', bgColor: '#CFFAFE' },
};

// Idiomas soportados
const IDIOMAS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
];

// Operadores disponibles
const OPERADORES = [
  { value: '=', label: '= (igual)' },
  { value: '>=', label: '>= (mayor o igual)' },
  { value: '<=', label: '<= (menor o igual)' },
  { value: '@>', label: '@> (contiene JSON)' },
  { value: 'ILIKE', label: 'ILIKE (contiene texto)' },
];

// Modal para crear/editar tag
function TagModal({
  tag,
  onClose,
  onSaved,
  getToken,
}: {
  tag: TagGlobal | null;
  onClose: () => void;
  onSaved: () => void;
  getToken: () => Promise<string | null>;
}) {
  const isEditing = !!tag;

  const [formData, setFormData] = useState<CreateTagGlobalData>({
    slug: tag?.slug || '',
    tipo: tag?.tipo || 'operacion',
    valor: tag?.valor || '',
    campo_query: tag?.campo_query || '',
    operador: tag?.operador || '=',
    alias_idiomas: tag?.alias_idiomas || {},
    nombre_idiomas: tag?.nombre_idiomas || {},
    pais: tag?.pais || 'DO',
    orden: tag?.orden ?? 0,
    activo: tag?.activo ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIdiomaTab, setActiveIdiomaTab] = useState('es');

  // Generar slug automáticamente
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Actualizar alias del idioma actual
  const handleAliasChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      alias_idiomas: {
        ...prev.alias_idiomas,
        [activeIdiomaTab]: value,
      },
    }));
  };

  // Actualizar nombre del idioma actual
  const handleNombreChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      nombre_idiomas: {
        ...prev.nombre_idiomas,
        [activeIdiomaTab]: value,
      },
      // Auto-generar slug si es español y estamos creando
      slug: activeIdiomaTab === 'es' && !isEditing ? generateSlug(value) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug.trim()) {
      setError('El slug es requerido');
      return;
    }
    if (!formData.tipo) {
      setError('El tipo es requerido');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      if (isEditing && tag) {
        await updateTagGlobal(tag.id, formData, token);
      } else {
        await createTagGlobal(formData, token);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content tag-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Editar Tag' : 'Nuevo Tag'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="form-error">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}>&times;</button>
            </div>
          )}

          <div className="form-grid">
            {/* Tipo */}
            <div className="form-group">
              <label>Tipo *</label>
              <select
                value={formData.tipo}
                onChange={e => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
              >
                {Object.entries(TIPO_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* País */}
            <div className="form-group">
              <label>País</label>
              <select
                value={formData.pais}
                onChange={e => setFormData(prev => ({ ...prev, pais: e.target.value }))}
              >
                <option value="DO">DO - República Dominicana</option>
                <option value="US">US - Estados Unidos</option>
                <option value="MX">MX - México</option>
                <option value="ES">ES - España</option>
                <option value="CO">CO - Colombia</option>
              </select>
            </div>

            {/* Slug */}
            <div className="form-group">
              <label>Slug (URL) *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="ej: comprar, apartamento, 2-habitaciones"
                required
              />
              <span className="field-hint">Identificador único para URLs</span>
            </div>

            {/* Valor */}
            <div className="form-group">
              <label>Valor</label>
              <input
                type="text"
                value={formData.valor || ''}
                onChange={e => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                placeholder="ej: venta, alquiler, 2"
              />
              <span className="field-hint">Valor real para queries (puede diferir del slug)</span>
            </div>

            {/* Campo Query */}
            <div className="form-group">
              <label>Campo Query</label>
              <input
                type="text"
                value={formData.campo_query || ''}
                onChange={e => setFormData(prev => ({ ...prev, campo_query: e.target.value }))}
                placeholder="ej: operacion, tipo, habitaciones, amenidades"
              />
              <span className="field-hint">Campo de la BD a filtrar</span>
            </div>

            {/* Operador */}
            <div className="form-group">
              <label>Operador</label>
              <select
                value={formData.operador}
                onChange={e => setFormData(prev => ({ ...prev, operador: e.target.value }))}
              >
                {OPERADORES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>

            {/* Orden */}
            <div className="form-group">
              <label>Orden</label>
              <input
                type="number"
                value={formData.orden}
                onChange={e => setFormData(prev => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                min={0}
              />
            </div>

            {/* Activo */}
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={e => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                />
                <span>Activo</span>
              </label>
            </div>
          </div>

          {/* Sección de Idiomas */}
          <div className="idiomas-section">
            <h3>Traducciones</h3>
            <div className="idioma-tabs">
              {IDIOMAS.map(idioma => (
                <button
                  key={idioma.code}
                  type="button"
                  className={`idioma-tab ${activeIdiomaTab === idioma.code ? 'active' : ''}`}
                  onClick={() => setActiveIdiomaTab(idioma.code)}
                >
                  {idioma.code.toUpperCase()}
                  {(formData.alias_idiomas?.[idioma.code] || formData.nombre_idiomas?.[idioma.code]) && (
                    <span className="has-content">●</span>
                  )}
                </button>
              ))}
            </div>

            <div className="idioma-fields">
              <div className="form-group">
                <label>Alias URL ({IDIOMAS.find(i => i.code === activeIdiomaTab)?.label})</label>
                <input
                  type="text"
                  value={formData.alias_idiomas?.[activeIdiomaTab] || ''}
                  onChange={e => handleAliasChange(e.target.value)}
                  placeholder={`ej: ${activeIdiomaTab === 'en' ? 'buy' : activeIdiomaTab === 'fr' ? 'acheter' : 'comprar'}`}
                />
                <span className="field-hint">Slug alternativo para este idioma en URLs</span>
              </div>

              <div className="form-group">
                <label>Nombre Display ({IDIOMAS.find(i => i.code === activeIdiomaTab)?.label})</label>
                <input
                  type="text"
                  value={formData.nombre_idiomas?.[activeIdiomaTab] || ''}
                  onChange={e => handleNombreChange(e.target.value)}
                  placeholder={`ej: ${activeIdiomaTab === 'en' ? 'Buy' : activeIdiomaTab === 'fr' ? 'Acheter' : 'Comprar'}`}
                />
                <span className="field-hint">Nombre para mostrar en la UI</span>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Tag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminTagsGlobal() {
  const { getToken } = useAuth();
  const [tags, setTags] = useState<TagGlobal[]>([]);
  const [stats, setStats] = useState<TagGlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagGlobal | null>(null);

  // Tipos expandidos
  const [expandedTipos, setExpandedTipos] = useState<Set<string>>(new Set());

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      const [tagsData, statsData] = await Promise.all([
        getTagsGlobal({ activo: showInactive ? undefined : true }, token),
        getTagsGlobalStats(token),
      ]);

      setTags(tagsData);
      setStats(statsData);

      // Expandir todos los tipos por defecto
      const tipos = new Set(tagsData.map(t => t.tipo));
      setExpandedTipos(tipos);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken, showInactive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle tipo expandido
  const toggleTipo = (tipo: string) => {
    setExpandedTipos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tipo)) {
        newSet.delete(tipo);
      } else {
        newSet.add(tipo);
      }
      return newSet;
    });
  };

  // Handlers
  const handleEdit = (tag: TagGlobal) => {
    setEditingTag(tag);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingTag(null);
    setShowModal(true);
  };

  const handleDelete = async (tag: TagGlobal) => {
    if (!confirm(`¿Eliminar el tag "${tag.slug}"?`)) return;

    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');
      await deleteTagGlobal(tag.id, false, token);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  const handleToggleStatus = async (tag: TagGlobal) => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');
      await toggleTagGlobalStatus(tag.id, !tag.activo, token);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTag(null);
  };

  const handleSaved = () => {
    handleCloseModal();
    loadData();
  };

  // Filtrar tags
  const filteredTags = tags.filter(tag => {
    const matchesSearch = !search ||
      tag.slug.toLowerCase().includes(search.toLowerCase()) ||
      tag.valor?.toLowerCase().includes(search.toLowerCase()) ||
      Object.values(tag.nombre_idiomas || {}).some(n =>
        n.toLowerCase().includes(search.toLowerCase())
      );
    const matchesTipo = !filterTipo || tag.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  });

  // Agrupar por tipo
  const tagsByTipo = filteredTags.reduce<Record<string, TagGlobal[]>>((acc, tag) => {
    if (!acc[tag.tipo]) acc[tag.tipo] = [];
    acc[tag.tipo].push(tag);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="admin-tags-loading">
        <div className="loading-spinner"></div>
        <p>Cargando tags...</p>
        <style>{`
          .admin-tags-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            color: #64748B;
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #E2E8F0;
            border-top-color: #2563EB;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-tags-global">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Tags Globales</h1>
          <p className="page-subtitle">
            Administra los tags para filtrado de propiedades en URLs
          </p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <IconPlus />
          Nuevo Tag
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card active">
            <div className="stat-value">{stats.activos}</div>
            <div className="stat-label">Activos</div>
          </div>
          <div className="stat-card inactive">
            <div className="stat-value">{stats.inactivos}</div>
            <div className="stat-label">Inactivos</div>
          </div>
          {Object.entries(TIPO_CONFIG).map(([tipo, config]) => (
            stats.por_tipo[tipo] ? (
              <div key={tipo} className="stat-card" style={{ borderLeftColor: config.color }}>
                <div className="stat-value">{stats.por_tipo[tipo]}</div>
                <div className="stat-label">{config.label}</div>
              </div>
            ) : null
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <IconSearch />
          <input
            type="text"
            placeholder="Buscar por slug, valor o nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>

        <label className="toggle-filter">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
          />
          <span>Mostrar inactivos</span>
        </label>
      </div>

      {/* Tags agrupados por tipo */}
      <div className="tags-container">
        {Object.keys(tagsByTipo).length === 0 ? (
          <div className="empty-state">
            <IconTag />
            <h3>No hay tags</h3>
            <p>
              {search || filterTipo
                ? 'No se encontraron tags con los filtros aplicados'
                : 'Comienza creando tu primer tag global'}
            </p>
            {!search && !filterTipo && (
              <button className="btn-primary" onClick={handleCreate}>
                Crear primer tag
              </button>
            )}
          </div>
        ) : (
          Object.entries(tagsByTipo)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([tipo, tipoTags]) => {
              const config = TIPO_CONFIG[tipo] || { label: tipo, color: '#64748B', bgColor: '#F1F5F9' };
              const isExpanded = expandedTipos.has(tipo);

              return (
                <div key={tipo} className="tipo-group">
                  <button
                    className="tipo-header"
                    onClick={() => toggleTipo(tipo)}
                    style={{ borderLeftColor: config.color }}
                  >
                    <IconChevron expanded={isExpanded} />
                    <span
                      className="tipo-badge"
                      style={{ color: config.color, backgroundColor: config.bgColor }}
                    >
                      {config.label}
                    </span>
                    <span className="tipo-count">{tipoTags.length} tags</span>
                  </button>

                  {isExpanded && (
                    <div className="tipo-tags">
                      {tipoTags.map(tag => (
                        <div
                          key={tag.id}
                          className={`tag-row ${!tag.activo ? 'inactive' : ''}`}
                        >
                          <div className="tag-info">
                            <span className="tag-slug">{tag.slug}</span>
                            {tag.valor && tag.valor !== tag.slug && (
                              <span className="tag-valor">→ {tag.valor}</span>
                            )}
                            {tag.campo_query && (
                              <span className="tag-campo">{tag.campo_query}</span>
                            )}
                            <span className="tag-operador">{tag.operador}</span>
                          </div>

                          <div className="tag-idiomas">
                            {IDIOMAS.map(idioma => (
                              (tag.alias_idiomas?.[idioma.code] || tag.nombre_idiomas?.[idioma.code]) && (
                                <span key={idioma.code} className="idioma-badge">
                                  {idioma.code.toUpperCase()}
                                </span>
                              )
                            ))}
                          </div>

                          {!tag.activo && (
                            <span className="status-badge inactive">Inactivo</span>
                          )}

                          <div className="tag-actions">
                            <button
                              className="action-btn edit"
                              onClick={() => handleEdit(tag)}
                              title="Editar"
                            >
                              <IconEdit />
                            </button>
                            <button
                              className="action-btn toggle"
                              onClick={() => handleToggleStatus(tag)}
                              title={tag.activo ? 'Desactivar' : 'Activar'}
                            >
                              {tag.activo ? '●' : '○'}
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => handleDelete(tag)}
                              title="Eliminar"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <TagModal
          tag={editingTag}
          onClose={handleCloseModal}
          onSaved={handleSaved}
          getToken={getToken}
        />
      )}

      <style>{`
        .admin-tags-global {
          max-width: 1400px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 2rem;
          font-weight: 700;
          color: #0F172A;
        }

        .page-subtitle {
          margin: 0;
          color: #64748B;
          font-size: 0.9375rem;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
        }

        .error-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #FEE2E2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          color: #DC2626;
          margin-bottom: 20px;
        }

        .error-banner button {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #DC2626;
        }

        /* Stats */
        .stats-grid {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .stat-card {
          flex: 1;
          min-width: 100px;
          padding: 16px 20px;
          background: white;
          border: 1px solid #E2E8F0;
          border-left: 4px solid #2563EB;
          border-radius: 10px;
        }

        .stat-card.active {
          border-left-color: #059669;
        }

        .stat-card.inactive {
          border-left-color: #94A3B8;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0F172A;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #64748B;
          margin-top: 4px;
        }

        /* Filters */
        .filters-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 250px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
        }

        .search-box svg {
          color: #94A3B8;
        }

        .search-box input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.9rem;
        }

        .filter-select {
          padding: 10px 16px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          font-size: 0.9rem;
          color: #374151;
          cursor: pointer;
        }

        .toggle-filter {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.9rem;
          color: #374151;
        }

        /* Tags container */
        .tags-container {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          overflow: hidden;
        }

        .tipo-group {
          border-bottom: 1px solid #E2E8F0;
        }

        .tipo-group:last-child {
          border-bottom: none;
        }

        .tipo-header {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 16px 20px;
          background: #F8FAFC;
          border: none;
          border-left: 4px solid #2563EB;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }

        .tipo-header:hover {
          background: #F1F5F9;
        }

        .tipo-badge {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .tipo-count {
          font-size: 0.85rem;
          color: #64748B;
          margin-left: auto;
        }

        .tipo-tags {
          border-top: 1px solid #E2E8F0;
        }

        .tag-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 20px 12px 44px;
          border-bottom: 1px solid #F1F5F9;
          transition: background 0.15s;
        }

        .tag-row:last-child {
          border-bottom: none;
        }

        .tag-row:hover {
          background: #F8FAFC;
        }

        .tag-row.inactive {
          opacity: 0.6;
        }

        .tag-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .tag-slug {
          font-weight: 600;
          color: #0F172A;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .tag-valor {
          font-size: 0.8rem;
          color: #64748B;
          font-family: monospace;
        }

        .tag-campo {
          padding: 2px 8px;
          background: #F1F5F9;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #64748B;
          font-family: monospace;
        }

        .tag-operador {
          padding: 2px 6px;
          background: #E0E7FF;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #4F46E5;
          font-family: monospace;
        }

        .tag-idiomas {
          display: flex;
          gap: 4px;
        }

        .idioma-badge {
          padding: 2px 6px;
          background: #DBEAFE;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #2563EB;
        }

        .status-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .status-badge.inactive {
          background: #FEE2E2;
          color: #DC2626;
        }

        .tag-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.15s;
        }

        .tag-row:hover .tag-actions {
          opacity: 1;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          color: #64748B;
          cursor: pointer;
          transition: all 0.15s;
        }

        .action-btn:hover {
          background: #E2E8F0;
        }

        .action-btn.edit:hover {
          background: #D1FAE5;
          color: #059669;
          border-color: #6EE7B7;
        }

        .action-btn.toggle:hover {
          background: #FEF3C7;
          color: #D97706;
          border-color: #FCD34D;
        }

        .action-btn.delete:hover {
          background: #FEE2E2;
          color: #DC2626;
          border-color: #FECACA;
        }

        /* Empty state */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #64748B;
          text-align: center;
        }

        .empty-state svg {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: #374151;
        }

        .empty-state p {
          margin: 0 0 20px 0;
          max-width: 400px;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #E2E8F0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #0F172A;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #64748B;
          cursor: pointer;
          padding: 4px 8px;
        }

        .modal-close:hover {
          color: #0F172A;
        }

        .tag-modal form {
          padding: 24px;
        }

        .form-error {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #FEE2E2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          color: #DC2626;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }

        .form-error button {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #DC2626;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group select {
          padding: 10px 14px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #0F172A;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #2563EB;
        }

        .field-hint {
          font-size: 0.75rem;
          color: #94A3B8;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          padding-top: 24px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #374151;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        /* Idiomas section */
        .idiomas-section {
          margin-bottom: 24px;
          padding: 20px;
          background: #F8FAFC;
          border-radius: 12px;
        }

        .idiomas-section h3 {
          margin: 0 0 16px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .idioma-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .idioma-tab {
          position: relative;
          padding: 8px 16px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s;
        }

        .idioma-tab:hover {
          border-color: #CBD5E1;
        }

        .idioma-tab.active {
          background: #2563EB;
          border-color: #2563EB;
          color: white;
        }

        .idioma-tab .has-content {
          position: absolute;
          top: -4px;
          right: -4px;
          font-size: 0.6rem;
          color: #059669;
        }

        .idioma-tab.active .has-content {
          color: #86EFAC;
        }

        .idioma-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .idioma-fields .form-group input {
          background: white;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 20px;
          border-top: 1px solid #E2E8F0;
        }

        .btn-secondary {
          padding: 10px 20px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-weight: 500;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .btn-secondary:disabled,
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .modal-actions .btn-primary {
          padding: 10px 20px;
        }

        @media (max-width: 640px) {
          .form-grid,
          .idioma-fields {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            flex-direction: column;
          }

          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            min-width: 100%;
          }

          .tag-row {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
