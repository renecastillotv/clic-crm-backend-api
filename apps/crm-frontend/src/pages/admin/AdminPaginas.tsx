/**
 * AdminPaginas - Gestión de Tipos de Página de la plataforma
 * Permite crear, editar y configurar la visibilidad de tipos de página para tenants
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  getAllTiposPagina,
  updateTipoPagina,
  createTipoPagina,
  TipoPagina,
  getAllFeatures,
  Feature
} from '../../services/api';

interface TipoPaginaForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  rutaPatron: string;
  rutaPadre: string;
  nivel: number;
  esPlantilla: boolean;
  visible: boolean;
  featured: boolean;
  featureRequerido: string;
  ordenCatalogo: number;
}

const emptyForm: TipoPaginaForm = {
  codigo: '',
  nombre: '',
  descripcion: '',
  rutaPatron: '',
  rutaPadre: '',
  nivel: 0,
  esPlantilla: false,
  visible: true,
  featured: false,
  featureRequerido: '',
  ordenCatalogo: 100,
};

export default function AdminPaginas() {
  const { getToken } = useAuth();
  const [tipos, setTipos] = useState<TipoPagina[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoPagina | null>(null);
  const [form, setForm] = useState<TipoPaginaForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      const [tiposData, featuresData] = await Promise.all([
        getAllTiposPagina(token),
        getAllFeatures(token)
      ]);

      setTipos(tiposData);
      setFeatures(featuresData);

      // Expandir todos los grupos por defecto
      const padres = tiposData.filter(t => t.nivel === 0).map(t => t.codigo);
      setExpandedGroups(new Set(padres));
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (codigo: string, field: 'visible' | 'featured', currentValue: boolean) => {
    try {
      setUpdating(codigo);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      await updateTipoPagina(codigo, { [field]: !currentValue }, token);

      setTipos(prev =>
        prev.map(t => t.codigo === codigo ? { ...t, [field]: !currentValue } : t)
      );
    } catch (err: any) {
      setError(err.message || 'Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const handleFeatureChange = async (codigo: string, featureRequerido: string | null) => {
    try {
      setUpdating(codigo);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      await updateTipoPagina(codigo, { featureRequerido }, token);

      setTipos(prev =>
        prev.map(t => t.codigo === codigo ? { ...t, featureRequerido } : t)
      );
    } catch (err: any) {
      setError(err.message || 'Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const toggleGroup = (codigo: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }
      return next;
    });
  };

  const openCreateModal = () => {
    setEditingTipo(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (tipo: TipoPagina) => {
    setEditingTipo(tipo);
    setForm({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      rutaPatron: tipo.rutaPatron || '',
      rutaPadre: tipo.rutaPadre || '',
      nivel: tipo.nivel,
      esPlantilla: tipo.esPlantilla,
      visible: tipo.visible,
      featured: tipo.featured,
      featureRequerido: tipo.featureRequerido || '',
      ordenCatalogo: tipo.ordenCatalogo,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token');

      const data = {
        ...form,
        featureRequerido: form.featureRequerido || null,
        rutaPadre: form.rutaPadre || null,
      };

      if (editingTipo) {
        await updateTipoPagina(editingTipo.codigo, data, token);
      } else {
        await createTipoPagina(data, token);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Organizar tipos en jerarquía
  const tiposJerarquicos = tipos.filter(t => t.nivel === 0).map(padre => ({
    ...padre,
    hijos: tipos.filter(t => t.rutaPadre === padre.codigo),
  }));

  // Estadísticas
  const stats = {
    total: tipos.length,
    visibles: tipos.filter(t => t.visible).length,
    conFeature: tipos.filter(t => t.featureRequerido).length,
    featured: tipos.filter(t => t.featured).length,
  };

  // Tipos padre disponibles para selector
  const tiposPadre = tipos.filter(t => t.nivel === 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Cargando tipos de página...</p>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="admin-paginas">
      <div className="page-header">
        <div>
          <h1>Tipos de Página</h1>
          <p className="page-subtitle">Gestiona los tipos de página disponibles para los tenants</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo Tipo
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
          <div className="stat-label">Total Tipos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.visibles}</div>
          <div className="stat-label">Visibles</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.conFeature}</div>
          <div className="stat-label">Con Feature</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.featured}</div>
          <div className="stat-label">Destacados</div>
        </div>
      </div>

      {/* Info */}
      <div className="info-box">
        <div className="info-content">
          <p className="info-title">Control de Visibilidad</p>
          <p className="info-text">
            <strong>Visible OFF</strong> = Oculto para todos los tenants.
            <strong> Visible ON + Sin Feature</strong> = Disponible para todos.
            <strong> Visible ON + Feature</strong> = Solo para tenants con ese feature/addon.
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="tipos-table">
        <div className="table-header">
          <div className="col-expand" />
          <div className="col-tipo">Tipo de Página</div>
          <div className="col-ruta">Ruta</div>
          <div className="col-feature">Feature Requerido</div>
          <div className="col-tenants">Tenants</div>
          <div className="col-toggle">Visible</div>
          <div className="col-toggle">Featured</div>
          <div className="col-actions">Acciones</div>
        </div>

        <div className="table-body">
          {tiposJerarquicos.map(tipo => (
            <div key={tipo.codigo} className="tipo-group">
              {/* Fila padre */}
              <div
                className={`tipo-row nivel-0 ${tipo.hijos.length > 0 ? 'tiene-hijos' : ''}`}
                onClick={() => tipo.hijos.length > 0 && toggleGroup(tipo.codigo)}
              >
                <div className="col-expand">
                  {tipo.hijos.length > 0 && (
                    <button
                      className={`btn-expand ${expandedGroups.has(tipo.codigo) ? 'expanded' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleGroup(tipo.codigo); }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  )}
                </div>

                <div className="col-tipo">
                  <div className="tipo-info">
                    <span className="tipo-nombre">{tipo.nombre}</span>
                    <span className="tipo-codigo">{tipo.codigo}</span>
                  </div>
                  {tipo.protegida && <span className="badge-protegida">Protegida</span>}
                </div>

                <div className="col-ruta">
                  <code className="ruta">{tipo.rutaPatron || '-'}</code>
                </div>

                <div className="col-feature" onClick={e => e.stopPropagation()}>
                  <select
                    className="feature-select"
                    value={tipo.featureRequerido || ''}
                    onChange={(e) => handleFeatureChange(tipo.codigo, e.target.value || null)}
                    disabled={updating === tipo.codigo}
                  >
                    <option value="">Sin restricción</option>
                    {features.map(f => (
                      <option key={f.codigo} value={f.codigo}>{f.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="col-tenants">
                  <span className="tenants-count">{tipo.tenantsUsando || 0}</span>
                </div>

                <div className="col-toggle" onClick={e => e.stopPropagation()}>
                  <Toggle
                    checked={tipo.visible}
                    disabled={updating === tipo.codigo}
                    onChange={() => handleToggle(tipo.codigo, 'visible', tipo.visible)}
                  />
                </div>

                <div className="col-toggle" onClick={e => e.stopPropagation()}>
                  <Toggle
                    checked={tipo.featured}
                    disabled={updating === tipo.codigo}
                    onChange={() => handleToggle(tipo.codigo, 'featured', tipo.featured)}
                    color="purple"
                  />
                </div>

                <div className="col-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn-icon"
                    onClick={() => openEditModal(tipo)}
                    title="Editar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Hijos */}
              {tipo.hijos.length > 0 && expandedGroups.has(tipo.codigo) && (
                <div className="tipo-hijos">
                  {tipo.hijos.map(hijo => (
                    <div key={hijo.codigo} className="tipo-row nivel-1">
                      <div className="col-expand" />

                      <div className="col-tipo">
                        <div className="tipo-info">
                          <span className="tipo-nombre">{hijo.nombre}</span>
                          <span className="tipo-codigo">{hijo.codigo}</span>
                        </div>
                        {hijo.esPlantilla && <span className="badge-plantilla">Plantilla</span>}
                      </div>

                      <div className="col-ruta">
                        <code className="ruta">{hijo.rutaPatron || '-'}</code>
                      </div>

                      <div className="col-feature">
                        <select
                          className="feature-select"
                          value={hijo.featureRequerido || ''}
                          onChange={(e) => handleFeatureChange(hijo.codigo, e.target.value || null)}
                          disabled={updating === hijo.codigo}
                        >
                          <option value="">Sin restricción</option>
                          {features.map(f => (
                            <option key={f.codigo} value={f.codigo}>{f.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-tenants">
                        <span className="tenants-count">{hijo.tenantsUsando || 0}</span>
                      </div>

                      <div className="col-toggle">
                        <Toggle
                          checked={hijo.visible}
                          disabled={updating === hijo.codigo}
                          onChange={() => handleToggle(hijo.codigo, 'visible', hijo.visible)}
                        />
                      </div>

                      <div className="col-toggle">
                        <Toggle
                          checked={hijo.featured}
                          disabled={updating === hijo.codigo}
                          onChange={() => handleToggle(hijo.codigo, 'featured', hijo.featured)}
                          color="purple"
                        />
                      </div>

                      <div className="col-actions">
                        <button
                          className="btn-icon"
                          onClick={() => openEditModal(hijo)}
                          title="Editar"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Edición/Creación */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTipo ? 'Editar Tipo de Página' : 'Nuevo Tipo de Página'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Código *</label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={e => setForm({ ...form, codigo: e.target.value })}
                    placeholder="ej: landing_page"
                    disabled={!!editingTipo}
                  />
                  {editingTipo && <span className="help-text">El código no se puede modificar</span>}
                </div>

                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="ej: Landing Page"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción del tipo de página..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Patrón de Ruta</label>
                  <input
                    type="text"
                    value={form.rutaPatron}
                    onChange={e => setForm({ ...form, rutaPatron: e.target.value })}
                    placeholder="ej: /videos/:categoria/:slug"
                  />
                </div>

                <div className="form-group">
                  <label>Orden en Catálogo</label>
                  <input
                    type="number"
                    value={form.ordenCatalogo}
                    onChange={e => setForm({ ...form, ordenCatalogo: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo Padre (Jerarquía)</label>
                  <select
                    value={form.rutaPadre}
                    onChange={e => setForm({
                      ...form,
                      rutaPadre: e.target.value,
                      nivel: e.target.value ? 1 : 0
                    })}
                  >
                    <option value="">Ninguno (nivel raíz)</option>
                    {tiposPadre.filter(t => t.codigo !== form.codigo).map(t => (
                      <option key={t.codigo} value={t.codigo}>{t.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Feature Requerido</label>
                  <select
                    value={form.featureRequerido}
                    onChange={e => setForm({ ...form, featureRequerido: e.target.value })}
                  >
                    <option value="">Sin restricción (público)</option>
                    {features.map(f => (
                      <option key={f.codigo} value={f.codigo}>{f.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.visible}
                    onChange={e => setForm({ ...form, visible: e.target.checked })}
                  />
                  <span>Visible para tenants</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={e => setForm({ ...form, featured: e.target.checked })}
                  />
                  <span>Destacado en catálogo</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.esPlantilla}
                    onChange={e => setForm({ ...form, esPlantilla: e.target.checked })}
                  />
                  <span>Es plantilla (páginas dinámicas)</span>
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
                disabled={saving || !form.codigo || !form.nombre}
              >
                {saving ? 'Guardando...' : (editingTipo ? 'Guardar Cambios' : 'Crear Tipo')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

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
  color?: 'green' | 'purple' | 'blue';
}) {
  const colors = {
    green: '#22c55e',
    purple: '#8b5cf6',
    blue: '#2563eb',
  };

  return (
    <button
      className={`toggle ${checked ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(); }}
      style={{ '--toggle-color': colors[color] } as React.CSSProperties}
    >
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </button>
  );
}

const styles = `
  .admin-paginas {
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
    border-top-color: #2563eb;
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
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
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

  /* Info box */
  .info-box {
    background: #eff6ff;
    border: 1px solid #dbeafe;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
  }

  .info-title {
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 8px 0;
  }

  .info-text {
    color: #475569;
    font-size: 0.9375rem;
    line-height: 1.6;
    margin: 0;
  }

  .info-text strong {
    color: #2563eb;
  }

  /* Tabla */
  .tipos-table {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
  }

  .table-header {
    display: flex;
    align-items: center;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 12px 16px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tipo-group {
    border-bottom: 1px solid #f1f5f9;
  }

  .tipo-group:last-child {
    border-bottom: none;
  }

  .tipo-row {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    transition: background 0.15s;
  }

  .tipo-row:hover {
    background: #f8fafc;
  }

  .tipo-row.nivel-0.tiene-hijos {
    cursor: pointer;
  }

  .tipo-row.nivel-1 {
    padding-left: 48px;
    background: #fafbfc;
  }

  .tipo-hijos {
    border-top: 1px solid #f1f5f9;
  }

  /* Columnas */
  .col-expand {
    width: 32px;
    flex-shrink: 0;
  }

  .col-tipo {
    flex: 2;
    min-width: 200px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .col-ruta {
    flex: 1;
    min-width: 120px;
  }

  .col-feature {
    width: 160px;
  }

  .col-tenants {
    width: 70px;
    text-align: center;
  }

  .col-toggle {
    width: 70px;
    display: flex;
    justify-content: center;
  }

  .col-actions {
    width: 60px;
    display: flex;
    justify-content: center;
  }

  /* Expand button */
  .btn-expand {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: #64748b;
    border-radius: 4px;
    transition: all 0.2s;
    display: flex;
  }

  .btn-expand:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .btn-expand.expanded {
    transform: rotate(90deg);
  }

  /* Tipo info */
  .tipo-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tipo-nombre {
    font-weight: 500;
    color: #0f172a;
  }

  .tipo-codigo {
    font-size: 0.75rem;
    color: #94a3b8;
    font-family: monospace;
  }

  /* Badges */
  .badge-protegida {
    font-size: 0.6875rem;
    padding: 2px 8px;
    background: #fef3c7;
    color: #d97706;
    border-radius: 4px;
    font-weight: 500;
  }

  .badge-plantilla {
    font-size: 0.6875rem;
    padding: 2px 8px;
    background: #e0e7ff;
    color: #4f46e5;
    border-radius: 4px;
    font-weight: 500;
  }

  /* Feature select */
  .feature-select {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.8125rem;
    color: #334155;
    background: white;
    cursor: pointer;
  }

  .feature-select:hover {
    border-color: #cbd5e1;
  }

  .feature-select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .feature-select:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }

  /* Ruta */
  .ruta {
    font-size: 0.8125rem;
    color: #64748b;
    background: #f1f5f9;
    padding: 4px 8px;
    border-radius: 4px;
  }

  /* Tenants count */
  .tenants-count {
    font-weight: 600;
    color: #0f172a;
  }

  /* Icon button */
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #0f172a;
  }

  /* Toggle */
  .toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
  }

  .toggle.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-track {
    width: 40px;
    height: 22px;
    background: #cbd5e1;
    border-radius: 11px;
    position: relative;
    transition: background 0.2s;
    display: block;
  }

  .toggle.active .toggle-track {
    background: var(--toggle-color, #22c55e);
  }

  .toggle-thumb {
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .toggle.active .toggle-thumb {
    transform: translateX(18px);
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
    max-width: 640px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-group input:disabled {
    background: #f1f5f9;
    color: #64748b;
    cursor: not-allowed;
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
    accent-color: #2563eb;
    cursor: pointer;
  }

  @media (max-width: 1024px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
`;
