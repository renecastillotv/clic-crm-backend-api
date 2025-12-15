/**
 * AdminPlantillas - Gestión de Plantillas de Página
 * Permite crear, editar y gestionar variantes visuales para tipos de página
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  getAllPlantillas,
  updatePlantilla,
  createPlantilla,
  deletePlantilla,
  PlantillaPagina,
  PlantillaPaginaCreate,
  getAllTiposPagina,
  TipoPagina,
  getAllFeatures,
  Feature
} from '../../services/api';

interface PlantillaForm {
  codigo: string;
  tipoPagina: string;
  nombre: string;
  descripcion: string;
  previewImage: string;
  categoria: string;
  featureRequerido: string;
  visible: boolean;
  featured: boolean;
  esPremium: boolean;
  orden: number;
}

const emptyForm: PlantillaForm = {
  codigo: '',
  tipoPagina: '',
  nombre: '',
  descripcion: '',
  previewImage: '',
  categoria: '',
  featureRequerido: '',
  visible: true,
  featured: false,
  esPremium: false,
  orden: 100,
};

// Componente Toggle
function Toggle({
  checked,
  disabled,
  onChange,
  color = 'green',
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  color?: 'green' | 'yellow' | 'purple' | 'blue';
}) {
  const colors = {
    green: '#22c55e',
    yellow: '#eab308',
    purple: '#8b5cf6',
    blue: '#2563eb',
  };

  return (
    <button
      className={`toggle ${checked ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(); }}
      style={{ '--toggle-color': colors[color] } as React.CSSProperties}
      type="button"
    >
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </button>
  );
}

export default function AdminPlantillas() {
  const { getToken } = useAuth();
  const [plantillas, setPlantillas] = useState<PlantillaPagina[]>([]);
  const [tiposPagina, setTiposPagina] = useState<TipoPagina[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaPagina | null>(null);
  const [form, setForm] = useState<PlantillaForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<PlantillaPagina | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      const [plantillasData, tiposData, featuresData] = await Promise.all([
        getAllPlantillas(token),
        getAllTiposPagina(token),
        getAllFeatures(token)
      ]);

      setPlantillas(plantillasData);
      setTiposPagina(tiposData.filter(t => t.visible));
      setFeatures(featuresData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, field: 'visible' | 'featured' | 'esPremium', currentValue: boolean) => {
    try {
      setUpdating(id);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      await updatePlantilla(id, { [field]: !currentValue }, token);

      setPlantillas(prev =>
        prev.map(p => p.id === id ? { ...p, [field]: !currentValue } : p)
      );
    } catch (err: any) {
      setError(err.message || 'Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const handleFeatureChange = async (id: string, featureRequerido: string | null) => {
    try {
      setUpdating(id);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      await updatePlantilla(id, { featureRequerido }, token);

      setPlantillas(prev =>
        prev.map(p => p.id === id ? { ...p, featureRequerido } : p)
      );
    } catch (err: any) {
      setError(err.message || 'Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const openCreateModal = () => {
    setEditingPlantilla(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (plantilla: PlantillaPagina) => {
    setEditingPlantilla(plantilla);
    setForm({
      codigo: plantilla.codigo,
      tipoPagina: plantilla.tipoPagina,
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion || '',
      previewImage: plantilla.previewImage || '',
      categoria: plantilla.categoria || '',
      featureRequerido: plantilla.featureRequerido || '',
      visible: plantilla.visible,
      featured: plantilla.featured,
      esPremium: plantilla.esPremium,
      orden: plantilla.orden,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      if (editingPlantilla) {
        await updatePlantilla(editingPlantilla.id, {
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          previewImage: form.previewImage || undefined,
          categoria: form.categoria || undefined,
          featureRequerido: form.featureRequerido || null,
          visible: form.visible,
          featured: form.featured,
          esPremium: form.esPremium,
          orden: form.orden,
        }, token);
      } else {
        const createData: PlantillaPaginaCreate = {
          codigo: form.codigo,
          tipoPagina: form.tipoPagina,
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          previewImage: form.previewImage || undefined,
          categoria: form.categoria || undefined,
          featureRequerido: form.featureRequerido || null,
          visible: form.visible,
          featured: form.featured,
          esPremium: form.esPremium,
          orden: form.orden,
        };
        await createPlantilla(createData, token);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      await deletePlantilla(deleteConfirm.id, token);
      setDeleteConfirm(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  // Obtener categorías únicas
  const categorias = [...new Set(plantillas.map(p => p.categoria).filter(Boolean))] as string[];

  // Filtrar plantillas
  const plantillasFiltradas = plantillas.filter(p => {
    if (filtroTipo && p.tipoPagina !== filtroTipo) return false;
    if (filtroCategoria && p.categoria !== filtroCategoria) return false;
    return true;
  });

  // Agrupar por tipo de página
  const plantillasPorTipo = plantillasFiltradas.reduce((acc, p) => {
    const key = p.tipoPagina;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, PlantillaPagina[]>);

  // Stats
  const stats = {
    total: plantillas.length,
    visibles: plantillas.filter(p => p.visible).length,
    premium: plantillas.filter(p => p.esPremium).length,
    featured: plantillas.filter(p => p.featured).length,
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Cargando plantillas...</p>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="admin-plantillas">
      <div className="page-header">
        <div>
          <h1>Plantillas de Página</h1>
          <p className="page-subtitle">Gestiona las variantes visuales disponibles para cada tipo de página</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva Plantilla
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Plantillas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.visibles}</div>
          <div className="stat-label">Visibles</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.premium}</div>
          <div className="stat-label">Premium</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.featured}</div>
          <div className="stat-label">Destacadas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Tipo de Página</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {tiposPagina.map(tipo => (
              <option key={tipo.codigo} value={tipo.codigo}>{tipo.nombre}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Categoría</label>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info */}
      <div className="info-box">
        <div className="info-content">
          <p className="info-title">Control de Acceso a Plantillas</p>
          <p className="info-text">
            <strong>Visible OFF</strong> = Oculta para todos.
            <strong> Visible ON + Sin Feature</strong> = Disponible para todos los tenants.
            <strong> Visible ON + Feature</strong> = Solo para tenants con ese feature.
            <strong> Premium</strong> = Indicador visual de plantilla de pago.
          </p>
        </div>
      </div>

      {/* Grid de Plantillas */}
      <div className="plantillas-grid">
        {Object.entries(plantillasPorTipo).map(([tipo, items]) => {
          const tipoInfo = tiposPagina.find(t => t.codigo === tipo);
          return (
            <div key={tipo} className="tipo-section">
              <div className="tipo-header">
                <h3>{tipoInfo?.nombre || tipo}</h3>
                <span className="tipo-count">{items.length} plantilla{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="plantillas-list">
                {items.map(plantilla => (
                  <div
                    key={plantilla.id}
                    className={`plantilla-card ${updating === plantilla.id ? 'updating' : ''}`}
                  >
                    <div className="plantilla-preview">
                      {plantilla.previewImage ? (
                        <img src={plantilla.previewImage} alt={plantilla.nombre} />
                      ) : (
                        <div className="preview-placeholder">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                      {plantilla.esPremium && (
                        <span className="badge-premium">Premium</span>
                      )}
                      {plantilla.featured && (
                        <span className="badge-featured">Destacada</span>
                      )}
                    </div>

                    <div className="plantilla-body">
                      <div className="plantilla-header">
                        <h4>{plantilla.nombre}</h4>
                        <code className="plantilla-codigo">{plantilla.codigo}</code>
                      </div>

                      {plantilla.descripcion && (
                        <p className="plantilla-desc">{plantilla.descripcion}</p>
                      )}

                      <div className="plantilla-meta">
                        {plantilla.categoria && (
                          <span className="meta-tag">{plantilla.categoria}</span>
                        )}
                        <span className="meta-uso">{plantilla.paginasUsando || 0} en uso</span>
                      </div>

                      <div className="plantilla-controls">
                        <div className="control-row">
                          <span className="control-label">Feature:</span>
                          <select
                            className="feature-select"
                            value={plantilla.featureRequerido || ''}
                            onChange={(e) => handleFeatureChange(plantilla.id, e.target.value || null)}
                            disabled={updating === plantilla.id}
                          >
                            <option value="">Sin restricción</option>
                            {features.map(f => (
                              <option key={f.id} value={f.codigo}>{f.nombre}</option>
                            ))}
                          </select>
                        </div>

                        <div className="toggles-row">
                          <label className="toggle-label">
                            <Toggle
                              checked={plantilla.visible}
                              disabled={updating === plantilla.id}
                              onChange={() => handleToggle(plantilla.id, 'visible', plantilla.visible)}
                              color="green"
                            />
                            <span>Visible</span>
                          </label>
                          <label className="toggle-label">
                            <Toggle
                              checked={plantilla.featured}
                              disabled={updating === plantilla.id}
                              onChange={() => handleToggle(plantilla.id, 'featured', plantilla.featured)}
                              color="yellow"
                            />
                            <span>Featured</span>
                          </label>
                          <label className="toggle-label">
                            <Toggle
                              checked={plantilla.esPremium}
                              disabled={updating === plantilla.id}
                              onChange={() => handleToggle(plantilla.id, 'esPremium', plantilla.esPremium)}
                              color="purple"
                            />
                            <span>Premium</span>
                          </label>
                        </div>
                      </div>

                      <div className="plantilla-actions">
                        <button
                          className="btn-icon"
                          onClick={() => openEditModal(plantilla)}
                          title="Editar"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Editar
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => setDeleteConfirm(plantilla)}
                          disabled={(plantilla.paginasUsando || 0) > 0}
                          title={(plantilla.paginasUsando || 0) > 0 ? 'No se puede eliminar (en uso)' : 'Eliminar'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {plantillasFiltradas.length === 0 && (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14H21M17.5 14V21" strokeLinecap="round"/>
          </svg>
          <h3>No hay plantillas</h3>
          <p>No se encontraron plantillas con los filtros seleccionados.</p>
          <button className="btn-primary" onClick={openCreateModal}>
            Crear primera plantilla
          </button>
        </div>
      )}

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {!editingPlantilla && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Código *</label>
                    <input
                      type="text"
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                      placeholder="homepage_luxury"
                    />
                    <span className="help-text">Solo letras minúsculas, números y guiones bajos</span>
                  </div>

                  <div className="form-group">
                    <label>Tipo de Página *</label>
                    <select
                      value={form.tipoPagina}
                      onChange={(e) => setForm({ ...form, tipoPagina: e.target.value })}
                    >
                      <option value="">Seleccionar...</option>
                      {tiposPagina.map(tipo => (
                        <option key={tipo.codigo} value={tipo.codigo}>{tipo.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Homepage Luxury"
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                  placeholder="Diseño elegante y sofisticado..."
                />
              </div>

              <div className="form-group">
                <label>URL de Preview</label>
                <input
                  type="text"
                  value={form.previewImage}
                  onChange={(e) => setForm({ ...form, previewImage: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <input
                    type="text"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    placeholder="luxury, modern, classic..."
                  />
                </div>

                <div className="form-group">
                  <label>Orden</label>
                  <input
                    type="number"
                    value={form.orden}
                    onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Feature Requerido</label>
                <select
                  value={form.featureRequerido}
                  onChange={(e) => setForm({ ...form, featureRequerido: e.target.value })}
                >
                  <option value="">Sin restricción (disponible para todos)</option>
                  {features.map(f => (
                    <option key={f.id} value={f.codigo}>{f.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-row checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.visible}
                    onChange={(e) => setForm({ ...form, visible: e.target.checked })}
                  />
                  <span>Visible</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  <span>Destacada</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.esPremium}
                    onChange={(e) => setForm({ ...form, esPremium: e.target.checked })}
                  />
                  <span>Premium</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !form.nombre || (!editingPlantilla && (!form.codigo || !form.tipoPagina))}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar Plantilla</h2>
              <button className="btn-close" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div className="modal-body">
              <p className="delete-message">
                ¿Estás seguro de que deseas eliminar la plantilla <strong>{deleteConfirm.nombre}</strong>?
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button
                className="btn-danger-solid"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .admin-plantillas {
    width: 100%;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 16px;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
  }

  .page-header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px 0;
  }

  .page-subtitle {
    color: #64748b;
    font-size: 1rem;
    margin: 0;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .btn-secondary {
    padding: 10px 20px;
    background: white;
    color: #475569;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .btn-danger-solid {
    padding: 10px 20px;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-danger-solid:hover {
    background: #b91c1c;
  }

  .btn-danger-solid:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    color: #dc2626;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 1.25rem;
    cursor: pointer;
  }

  /* Stats */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #0f172a;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #64748b;
    margin-top: 4px;
  }

  /* Filters */
  .filters-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-group label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #64748b;
  }

  .filter-group select {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #334155;
    background: white;
    min-width: 180px;
  }

  /* Info box */
  .info-box {
    background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
    border: 1px solid #ddd6fe;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
  }

  .info-title {
    font-weight: 600;
    color: #5b21b6;
    margin: 0 0 8px 0;
  }

  .info-text {
    color: #6b21a8;
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0;
  }

  .info-text strong {
    color: #7c3aed;
  }

  /* Plantillas Grid */
  .plantillas-grid {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .tipo-section {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    overflow: hidden;
  }

  .tipo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .tipo-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #0f172a;
  }

  .tipo-count {
    font-size: 0.875rem;
    color: #64748b;
    background: #e2e8f0;
    padding: 4px 12px;
    border-radius: 20px;
  }

  .plantillas-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    padding: 20px;
  }

  .plantilla-card {
    background: #fafbfc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s;
  }

  .plantilla-card:hover {
    border-color: #c4b5fd;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
  }

  .plantilla-card.updating {
    opacity: 0.6;
    pointer-events: none;
  }

  .plantilla-preview {
    position: relative;
    height: 140px;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  }

  .plantilla-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
  }

  .badge-premium,
  .badge-featured {
    position: absolute;
    top: 10px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .badge-premium {
    right: 10px;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
  }

  .badge-featured {
    left: 10px;
    background: #fef3c7;
    color: #d97706;
  }

  .plantilla-body {
    padding: 16px;
  }

  .plantilla-header {
    margin-bottom: 8px;
  }

  .plantilla-header h4 {
    margin: 0 0 4px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .plantilla-codigo {
    font-size: 0.75rem;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .plantilla-desc {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0 0 12px 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .plantilla-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .meta-tag {
    font-size: 0.75rem;
    padding: 3px 8px;
    background: #e0e7ff;
    color: #4f46e5;
    border-radius: 4px;
    font-weight: 500;
  }

  .meta-uso {
    font-size: 0.75rem;
    color: #64748b;
  }

  .plantilla-controls {
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
    margin-bottom: 12px;
  }

  .control-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .control-label {
    font-size: 0.8125rem;
    color: #64748b;
    white-space: nowrap;
  }

  .feature-select {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.8125rem;
    color: #334155;
    background: white;
  }

  .toggles-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8125rem;
    color: #475569;
  }

  .plantilla-actions {
    display: flex;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }

  .btn-icon {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.8125rem;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #0f172a;
  }

  .btn-icon.btn-danger {
    color: #dc2626;
    background: white;
  }

  .btn-icon.btn-danger:hover {
    background: #fef2f2;
    border-color: #fecaca;
  }

  .btn-icon:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-icon:disabled:hover {
    background: white;
    border-color: #e2e8f0;
    color: #475569;
  }

  /* Toggle */
  .toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .toggle.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-track {
    width: 36px;
    height: 20px;
    background: #cbd5e1;
    border-radius: 10px;
    position: relative;
    transition: background 0.2s;
    display: block;
  }

  .toggle.active .toggle-track {
    background: var(--toggle-color, #22c55e);
  }

  .toggle-thumb {
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .toggle.active .toggle-thumb {
    transform: translateX(16px);
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 40px;
    background: white;
    border: 2px dashed #e2e8f0;
    border-radius: 16px;
    text-align: center;
    color: #64748b;
  }

  .empty-state svg {
    margin-bottom: 24px;
    color: #c4b5fd;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #334155;
  }

  .empty-state p {
    margin: 0 0 24px 0;
    font-size: 0.9375rem;
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

  .modal {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .modal.modal-small {
    max-width: 420px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
  }

  .modal-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }

  .btn-close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #64748b;
    cursor: pointer;
    border-radius: 6px;
  }

  .btn-close:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .delete-message {
    font-size: 0.9375rem;
    color: #475569;
    line-height: 1.6;
    margin: 0;
  }

  .delete-message strong {
    color: #0f172a;
  }

  /* Form */
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .form-row.checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    margin-top: 8px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-row .form-group {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }

  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9375rem;
    color: #0f172a;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .help-text {
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 4px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 0.9375rem;
    color: #374151;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #8b5cf6;
    cursor: pointer;
  }

  @media (max-width: 1024px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .plantillas-list {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      gap: 16px;
    }

    .filters-bar {
      flex-direction: column;
    }

    .filter-group select {
      width: 100%;
    }

    .form-row {
      grid-template-columns: 1fr;
    }
  }
`;
