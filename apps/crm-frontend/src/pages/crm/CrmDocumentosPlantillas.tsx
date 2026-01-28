/**
 * CrmDocumentosPlantillas - Gestión de plantillas de documentos (Admin)
 *
 * Permite:
 * - Ver lista de plantillas por categoría
 * - Crear nuevas plantillas
 * - Editar plantillas existentes
 * - Duplicar plantillas
 * - Eliminar plantillas
 * - Vista previa de plantillas
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch } from '../../utils/api';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Eye,
  X,
  Filter,
  CheckCircle2,
  Signature,
  FolderOpen,
  FileSignature,
  Home,
  Key,
  MoreHorizontal,
} from 'lucide-react';

// ==================== INTERFACES ====================

interface CampoPlantilla {
  nombre: string;
  label: string;
  tipo: 'text' | 'number' | 'date' | 'currency' | 'textarea' | 'select';
  fuente?: string;
  opciones?: string[];
  requerido?: boolean;
  valorDefault?: string;
}

interface FirmantePlantilla {
  rol: string;
  nombre: string;
  email_campo?: string;
  orden: number;
}

interface PlantillaDocumento {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  categoria: 'captacion' | 'venta' | 'alquiler' | 'legal' | 'kyc' | 'otro';
  contenido_html: string;
  campos_requeridos: CampoPlantilla[];
  requiere_firma: boolean;
  firmantes: FirmantePlantilla[];
  es_publica: boolean;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIAS = [
  { value: 'captacion', label: 'Captación', icon: <Home size={16} /> },
  { value: 'venta', label: 'Venta', icon: <FileSignature size={16} /> },
  { value: 'alquiler', label: 'Alquiler', icon: <Key size={16} /> },
  { value: 'legal', label: 'Legal', icon: <FileText size={16} /> },
  { value: 'kyc', label: 'KYC', icon: <CheckCircle2 size={16} /> },
  { value: 'otro', label: 'Otro', icon: <FolderOpen size={16} /> },
];

// ==================== COMPONENT ====================

export default function CrmDocumentosPlantillas() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual, user } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  // State
  const [plantillas, setPlantillas] = useState<PlantillaDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');

  // Modals
  const [showPreview, setShowPreview] = useState(false);
  const [previewPlantilla, setPreviewPlantilla] = useState<PlantillaDocumento | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaDocumento | null>(null);

  // Editor form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: 'otro' as PlantillaDocumento['categoria'],
    contenido_html: '',
    campos_requeridos: [] as CampoPlantilla[],
    requiere_firma: false,
    firmantes: [] as FirmantePlantilla[],
    es_publica: true,
  });
  const [saving, setSaving] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ plantilla: PlantillaDocumento; x: number; y: number } | null>(null);

  // Check if user is admin
  const isAdmin = user?.rol === 'admin' || user?.rol === 'superadmin';

  // ==================== DATA LOADING ====================

  const loadData = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      let url = `/tenants/${tenantActual.id}/documentos/plantillas?activo=true`;
      if (categoriaFiltro) {
        url += `&categoria=${categoriaFiltro}`;
      }

      const res = await apiFetch(url, {}, token);
      const data = await res.json();
      setPlantillas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar plantillas');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken, categoriaFiltro]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== PAGE HEADER ====================

  useEffect(() => {
    setPageHeader({
      title: 'Plantillas de Documentos',
      subtitle: 'Crea y gestiona plantillas para generar documentos',
      actions: isAdmin ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSeedPlantillas}
            className="btn-secondary"
          >
            <FolderOpen size={18} />
            Cargar Predeterminadas
          </button>
          <button
            onClick={() => {
              setEditingPlantilla(null);
              setFormData({
                nombre: '',
                descripcion: '',
                categoria: 'otro',
                contenido_html: '',
                campos_requeridos: [],
                requiere_firma: false,
                firmantes: [],
                es_publica: true,
              });
              setShowEditorModal(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} />
            Nueva Plantilla
          </button>
        </div>
      ) : undefined,
    });
  }, [setPageHeader, isAdmin]);

  // ==================== HANDLERS ====================

  const handleSeedPlantillas = async () => {
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      await apiFetch(`/tenants/${tenantActual.id}/documentos/plantillas/seed`, { method: 'POST' }, token);
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handlePreview = (plantilla: PlantillaDocumento) => {
    setPreviewPlantilla(plantilla);
    setShowPreview(true);
  };

  const handleEdit = (plantilla: PlantillaDocumento) => {
    setEditingPlantilla(plantilla);
    setFormData({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion || '',
      categoria: plantilla.categoria,
      contenido_html: plantilla.contenido_html,
      campos_requeridos: plantilla.campos_requeridos,
      requiere_firma: plantilla.requiere_firma,
      firmantes: plantilla.firmantes,
      es_publica: plantilla.es_publica,
    });
    setShowEditorModal(true);
    setContextMenu(null);
  };

  const handleDuplicate = async (plantilla: PlantillaDocumento) => {
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      await apiFetch(
        `/tenants/${tenantActual.id}/documentos/plantillas/${plantilla.id}/duplicar`,
        { method: 'POST' },
        token
      );
      loadData();
      setContextMenu(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (plantilla: PlantillaDocumento) => {
    if (!tenantActual?.id) return;
    if (!confirm(`¿Eliminar la plantilla "${plantilla.nombre}"? Esta acción no se puede deshacer.`)) return;

    try {
      const token = await getToken();
      await apiFetch(
        `/tenants/${tenantActual.id}/documentos/plantillas/${plantilla.id}`,
        { method: 'DELETE' },
        token
      );
      loadData();
      setContextMenu(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleSave = async () => {
    if (!tenantActual?.id || !formData.nombre) {
      alert('El nombre es requerido');
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const method = editingPlantilla ? 'PUT' : 'POST';
      const url = editingPlantilla
        ? `/tenants/${tenantActual.id}/documentos/plantillas/${editingPlantilla.id}`
        : `/tenants/${tenantActual.id}/documentos/plantillas`;

      await apiFetch(url, {
        method,
        body: JSON.stringify(formData),
      }, token);

      setShowEditorModal(false);
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ==================== HELPERS ====================

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoriaInfo = (cat: string) => {
    return CATEGORIAS.find(c => c.value === cat) || CATEGORIAS[5];
  };

  // Filter plantillas
  const plantillasFiltradas = plantillas.filter(p => {
    if (busqueda) {
      const search = busqueda.toLowerCase();
      return p.nombre.toLowerCase().includes(search) ||
        p.descripcion?.toLowerCase().includes(search);
    }
    return true;
  });

  // Group by categoria
  const plantillasPorCategoria = CATEGORIAS.reduce((acc, cat) => {
    acc[cat.value] = plantillasFiltradas.filter(p => p.categoria === cat.value);
    return acc;
  }, {} as Record<string, PlantillaDocumento[]>);

  // ==================== RENDER ====================

  if (loading && plantillas.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando plantillas...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <FileText size={48} />
        <h3>Acceso restringido</h3>
        <p>Solo los administradores pueden gestionar plantillas de documentos.</p>
      </div>
    );
  }

  return (
    <div className="plantillas-page">
      {/* Toolbar */}
      <div className="plantillas-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar plantillas..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="clear-btn">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="filter-select">
          <Filter size={16} />
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {plantillasFiltradas.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No hay plantillas</h3>
          <p>
            {busqueda
              ? 'No se encontraron plantillas con ese término'
              : 'Crea tu primera plantilla o carga las predeterminadas'}
          </p>
          <button onClick={handleSeedPlantillas} className="btn-primary">
            Cargar Plantillas Predeterminadas
          </button>
        </div>
      ) : (
        <div className="plantillas-grid">
          {(categoriaFiltro ? [getCategoriaInfo(categoriaFiltro)] : CATEGORIAS).map(cat => {
            const plantillasCategoria = plantillasPorCategoria[cat.value];
            if (plantillasCategoria.length === 0) return null;

            return (
              <div key={cat.value} className="categoria-section">
                <h3 className="categoria-header">
                  {cat.icon}
                  <span>{cat.label}</span>
                  <span className="count">{plantillasCategoria.length}</span>
                </h3>

                <div className="plantillas-list">
                  {plantillasCategoria.map(plantilla => (
                    <div key={plantilla.id} className="plantilla-card">
                      <div className="plantilla-header">
                        <FileText size={24} />
                        <div className="plantilla-info">
                          <h4>{plantilla.nombre}</h4>
                          {plantilla.descripcion && (
                            <p className="descripcion">{plantilla.descripcion}</p>
                          )}
                        </div>
                        <button
                          className="btn-icon more-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({
                              plantilla,
                              x: e.currentTarget.getBoundingClientRect().right,
                              y: e.currentTarget.getBoundingClientRect().bottom,
                            });
                          }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </div>

                      <div className="plantilla-meta">
                        <span>
                          <FileText size={14} />
                          {plantilla.campos_requeridos.length} campos
                        </span>
                        {plantilla.requiere_firma && (
                          <span className="badge badge-info">
                            <Signature size={14} />
                            Requiere firma ({plantilla.firmantes.length})
                          </span>
                        )}
                        <span className="date">
                          Actualizado: {formatDate(plantilla.updated_at)}
                        </span>
                      </div>

                      <div className="plantilla-actions">
                        <button
                          onClick={() => handlePreview(plantilla)}
                          className="btn-icon"
                          title="Vista previa"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(plantilla)}
                          className="btn-icon"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(plantilla)}
                          className="btn-icon"
                          title="Duplicar"
                        >
                          <Copy size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(plantilla)}
                          className="btn-icon danger"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="context-menu-backdrop"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x - 150 }}
          >
            <button onClick={() => handlePreview(contextMenu.plantilla)}>
              <Eye size={16} /> Vista previa
            </button>
            <button onClick={() => handleEdit(contextMenu.plantilla)}>
              <Edit2 size={16} /> Editar
            </button>
            <button onClick={() => handleDuplicate(contextMenu.plantilla)}>
              <Copy size={16} /> Duplicar
            </button>
            <hr />
            <button className="danger" onClick={() => handleDelete(contextMenu.plantilla)}>
              <Trash2 size={16} /> Eliminar
            </button>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {showPreview && previewPlantilla && (
        <div className="modal-backdrop" onClick={() => setShowPreview(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Vista previa: {previewPlantilla.nombre}</h2>
              <button onClick={() => setShowPreview(false)} className="modal-close">
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="preview-info">
                <span className="badge">{getCategoriaInfo(previewPlantilla.categoria).label}</span>
                {previewPlantilla.requiere_firma && (
                  <span className="badge badge-info">
                    <Signature size={14} /> Requiere {previewPlantilla.firmantes.length} firma(s)
                  </span>
                )}
                <span>{previewPlantilla.campos_requeridos.length} campos requeridos</span>
              </div>

              <div className="preview-content">
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                      </style>
                    </head>
                    <body>${previewPlantilla.contenido_html}</body>
                    </html>
                  `}
                  title="Preview"
                  className="preview-iframe"
                />
              </div>

              {previewPlantilla.campos_requeridos.length > 0 && (
                <div className="campos-list">
                  <h4>Campos del documento:</h4>
                  <div className="campos-grid">
                    {previewPlantilla.campos_requeridos.map((campo, idx) => (
                      <div key={idx} className="campo-item">
                        <code>{`{{${campo.nombre}}}`}</code>
                        <span>{campo.label}</span>
                        <span className="campo-tipo">{campo.tipo}</span>
                        {campo.fuente && <span className="campo-fuente">← {campo.fuente}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowPreview(false)} className="btn-ghost">
                Cerrar
              </button>
              <button onClick={() => {
                setShowPreview(false);
                handleEdit(previewPlantilla);
              }} className="btn-primary">
                <Edit2 size={18} /> Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditorModal && (
        <div className="modal-backdrop" onClick={() => setShowEditorModal(false)}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
              <button onClick={() => setShowEditorModal(false)} className="modal-close">
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="editor-layout">
                {/* Form fields */}
                <div className="editor-sidebar">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Nombre de la plantilla"
                    />
                  </div>

                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Descripción breve"
                      rows={2}
                    />
                  </div>

                  <div className="form-group">
                    <label>Categoría</label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                    >
                      {CATEGORIAS.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.es_publica}
                        onChange={(e) => setFormData({ ...formData, es_publica: e.target.checked })}
                      />
                      Visible para todos los usuarios
                    </label>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.requiere_firma}
                        onChange={(e) => setFormData({ ...formData, requiere_firma: e.target.checked })}
                      />
                      Requiere firma digital
                    </label>
                  </div>
                </div>

                {/* HTML Editor */}
                <div className="editor-main">
                  <div className="form-group">
                    <label>Contenido HTML</label>
                    <p className="form-hint">
                      Usa {`{{variable}}`} para campos dinámicos. Ej: {`{{cliente_nombre}}`}, {`{{propiedad_precio}}`}
                    </p>
                    <textarea
                      value={formData.contenido_html}
                      onChange={(e) => setFormData({ ...formData, contenido_html: e.target.value })}
                      placeholder="<div>Contenido del documento con {{variables}}...</div>"
                      className="html-editor"
                      rows={20}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowEditorModal(false)} className="btn-ghost">
                Cancelar
              </button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : editingPlantilla ? 'Guardar cambios' : 'Crear plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .plantillas-page {
          padding: 0;
        }

        .plantillas-toolbar {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 12px;
          flex: 1;
          min-width: 200px;
          max-width: 400px;
        }

        .search-box input {
          border: none;
          background: transparent;
          flex: 1;
          outline: none;
          font-size: 14px;
        }

        .filter-select {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 12px;
        }

        .filter-select select {
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
        }

        .categoria-section {
          margin-bottom: 32px;
        }

        .categoria-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid var(--border-color);
        }

        .categoria-header .count {
          margin-left: auto;
          font-size: 14px;
          font-weight: 400;
          color: var(--text-secondary);
        }

        .plantillas-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
        }

        .plantilla-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
        }

        .plantilla-card:hover {
          border-color: var(--primary-200);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .plantilla-header {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .plantilla-info {
          flex: 1;
          min-width: 0;
        }

        .plantilla-info h4 {
          margin: 0 0 4px;
          font-size: 16px;
        }

        .plantilla-info .descripcion {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .more-btn {
          align-self: flex-start;
        }

        .plantilla-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .plantilla-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .plantilla-meta .date {
          margin-left: auto;
        }

        .plantilla-actions {
          display: flex;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
        }

        .btn-icon {
          padding: 8px;
          border: none;
          background: var(--bg-secondary);
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .btn-icon:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .btn-icon.danger:hover {
          background: var(--error-50);
          color: var(--error-500);
        }

        /* Context menu */
        .context-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
        }

        .context-menu {
          position: fixed;
          z-index: 101;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          min-width: 150px;
          padding: 4px;
        }

        .context-menu button {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
          border-radius: 4px;
        }

        .context-menu button:hover {
          background: var(--bg-secondary);
        }

        .context-menu button.danger {
          color: var(--error-500);
        }

        .context-menu hr {
          border: none;
          border-top: 1px solid var(--border-color);
          margin: 4px 0;
        }

        /* Preview modal */
        .preview-info {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .preview-content {
          margin-bottom: 16px;
        }

        .preview-iframe {
          width: 100%;
          height: 400px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: white;
        }

        .campos-list h4 {
          margin-bottom: 12px;
        }

        .campos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 8px;
        }

        .campo-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-size: 13px;
        }

        .campo-item code {
          background: var(--bg-tertiary);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
        }

        .campo-tipo {
          color: var(--text-secondary);
          font-size: 11px;
        }

        .campo-fuente {
          color: var(--primary-500);
          font-size: 11px;
        }

        /* Editor modal */
        .modal-xl {
          max-width: 1200px;
          width: 95%;
          max-height: 90vh;
        }

        .editor-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
        }

        .editor-sidebar {
          border-right: 1px solid var(--border-color);
          padding-right: 24px;
        }

        .form-hint {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .html-editor {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 13px;
          line-height: 1.5;
          resize: vertical;
          min-height: 400px;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: var(--text-secondary);
        }

        .empty-state svg {
          color: var(--text-tertiary);
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .empty-state button {
          margin-top: 16px;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        @media (max-width: 900px) {
          .editor-layout {
            grid-template-columns: 1fr;
          }

          .editor-sidebar {
            border-right: none;
            padding-right: 0;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--border-color);
          }
        }
      `}</style>
    </div>
  );
}
