/**
 * CrmDocumentosConfiguracion.tsx
 * Pagina de configuracion de documentos (solo Admin)
 * - Tab Plantillas: gestionar plantillas de documentos
 * - Tab Documentos Empresa: subir documentos estaticos
 * - Tab Categorias: gestionar categorias de biblioteca
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch } from '../../services/api';
import {
  FileText,
  Building2,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Search,
  RefreshCw,
  X,
  Loader2,
  Save,
  Eye,
  Upload,
  AlertCircle,
  CheckCircle,
  MoreVertical,
} from 'lucide-react';

// ==================== TYPES ====================

interface Plantilla {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  contenido_html: string;
  campos_requeridos: any[];
  requiere_firma: boolean;
  firmantes: any[];
  es_publica: boolean;
  activo: boolean;
  created_at: string;
}

interface DocumentoEmpresa {
  id: string;
  titulo: string;
  descripcion?: string;
  url_documento: string;
  tipo_archivo: string;
  es_obligatorio: boolean;
  categoria_id: string;
  categoria_nombre?: string;
  version: number;
  created_at: string;
}

interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  orden: number;
  documento_count?: number;
}

// ==================== STYLES ====================

const styles = `
.config-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Tabs */
.config-tabs {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
  margin-bottom: 24px;
  width: fit-content;
}

.config-tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.config-tab.active {
  background: white;
  color: #1e293b;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.config-tab:hover:not(.active) {
  color: #1e293b;
}

/* Toolbar */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  min-width: 280px;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  font-size: 14px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

/* Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.data-table th {
  text-align: left;
  padding: 14px 16px;
  background: #f8fafc;
  font-weight: 600;
  font-size: 13px;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:hover td {
  background: #f8fafc;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.btn-icon.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* Category Badge */
.category-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: #f1f5f9;
}

/* Status Badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.inactive {
  background: #f1f5f9;
  color: #64748b;
}

.status-badge.obligatorio {
  background: #fef3c7;
  color: #b45309;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-content.xl {
  max-width: 1100px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
}

.modal-close {
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  border-radius: 8px;
}

.modal-close:hover {
  background: #f1f5f9;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
}

/* Form */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-check {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-check input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

/* Editor Container */
.editor-container {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.editor-textarea {
  width: 100%;
  min-height: 300px;
  padding: 16px;
  border: none;
  font-family: monospace;
  font-size: 13px;
  resize: vertical;
}

/* Buttons */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-danger {
  background: #fee2e2;
  color: #dc2626;
}

.btn-danger:hover:not(:disabled) {
  background: #fecaca;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-state svg {
  margin-bottom: 16px;
  color: #cbd5e1;
}

.empty-state h3 {
  font-size: 18px;
  color: #1e293b;
  margin-bottom: 8px;
}

/* Color Picker */
.color-picker-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.color-picker-wrapper input[type="color"] {
  width: 50px;
  height: 40px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
}

/* Loading */
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #64748b;
}

.loading-spinner svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

// ==================== CATEGORIAS DEFAULT ====================

const CATEGORIAS_PLANTILLAS = [
  { value: 'captacion', label: 'Captacion' },
  { value: 'venta', label: 'Venta' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'legal', label: 'Legal' },
  { value: 'kyc', label: 'KYC' },
  { value: 'otro', label: 'Otro' },
];

// ==================== COMPONENT ====================

export default function CrmDocumentosConfiguracion() {
  const { tenantActual, isPlatformAdmin } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  // State - Tabs
  const [activeTab, setActiveTab] = useState<'plantillas' | 'documentos' | 'categorias'>('plantillas');

  // State - Plantillas
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(true);
  const [busquedaPlantilla, setBusquedaPlantilla] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // State - Documentos Empresa
  const [documentos, setDocumentos] = useState<DocumentoEmpresa[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(true);

  // State - Categorias
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  // State - Modals
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<Plantilla | null>(null);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state - Plantilla
  const [plantillaForm, setPlantillaForm] = useState({
    nombre: '',
    descripcion: '',
    categoria: 'captacion',
    contenido_html: '',
    requiere_firma: false,
    es_publica: true,
  });

  // Form state - Categoria
  const [categoriaForm, setCategoriaForm] = useState({
    nombre: '',
    descripcion: '',
    icono: 'folder',
    color: '#2563eb',
  });

  // ==================== DATA LOADING ====================

  const loadPlantillas = useCallback(async () => {
    if (!tenantActual?.id) return;
    setLoadingPlantillas(true);
    try {
      const token = await getToken();
      let url = `/tenants/${tenantActual.id}/documentos/plantillas`;
      const params: string[] = [];
      if (filtroCategoria) params.push(`categoria=${filtroCategoria}`);
      if (params.length) url += `?${params.join('&')}`;

      const res = await apiFetch(url, {}, token);
      const data = await res.json();
      setPlantillas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando plantillas:', err);
    } finally {
      setLoadingPlantillas(false);
    }
  }, [tenantActual?.id, getToken, filtroCategoria]);

  const loadDocumentos = useCallback(async () => {
    if (!tenantActual?.id) return;
    setLoadingDocumentos(true);
    try {
      const token = await getToken();
      const res = await apiFetch(`/tenants/${tenantActual.id}/biblioteca/documentos`, {}, token);
      const data = await res.json();
      setDocumentos(data.data || data || []);
    } catch (err) {
      console.error('Error cargando documentos:', err);
    } finally {
      setLoadingDocumentos(false);
    }
  }, [tenantActual?.id, getToken]);

  const loadCategorias = useCallback(async () => {
    if (!tenantActual?.id) return;
    setLoadingCategorias(true);
    try {
      const token = await getToken();
      const res = await apiFetch(`/tenants/${tenantActual.id}/biblioteca/categorias`, {}, token);
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando categorias:', err);
    } finally {
      setLoadingCategorias(false);
    }
  }, [tenantActual?.id, getToken]);

  useEffect(() => {
    if (activeTab === 'plantillas') loadPlantillas();
    else if (activeTab === 'documentos') loadDocumentos();
    else if (activeTab === 'categorias') loadCategorias();
  }, [activeTab, loadPlantillas, loadDocumentos, loadCategorias]);

  // ==================== PAGE HEADER ====================

  useEffect(() => {
    setPageHeader({
      title: 'Configuracion de Documentos',
      subtitle: 'Gestiona plantillas, documentos de empresa y categorias',
      actions: (
        <button onClick={() => {
          if (activeTab === 'plantillas') loadPlantillas();
          else if (activeTab === 'documentos') loadDocumentos();
          else loadCategorias();
        }} className="btn btn-secondary">
          <RefreshCw size={18} />
        </button>
      ),
    });
  }, [setPageHeader, activeTab, loadPlantillas, loadDocumentos, loadCategorias]);

  // ==================== HANDLERS - PLANTILLAS ====================

  const handleNewPlantilla = () => {
    setEditingPlantilla(null);
    setPlantillaForm({
      nombre: '',
      descripcion: '',
      categoria: 'captacion',
      contenido_html: '<h1>Titulo del Documento</h1>\n<p>Contenido aqui...</p>',
      requiere_firma: false,
      es_publica: true,
    });
    setShowPlantillaModal(true);
  };

  const handleEditPlantilla = (p: Plantilla) => {
    setEditingPlantilla(p);
    setPlantillaForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      categoria: p.categoria,
      contenido_html: p.contenido_html,
      requiere_firma: p.requiere_firma,
      es_publica: p.es_publica,
    });
    setShowPlantillaModal(true);
  };

  const handleSavePlantilla = async () => {
    if (!tenantActual?.id) return;
    setSaving(true);
    try {
      const token = await getToken();
      const url = editingPlantilla
        ? `/tenants/${tenantActual.id}/documentos/plantillas/${editingPlantilla.id}`
        : `/tenants/${tenantActual.id}/documentos/plantillas`;

      await apiFetch(url, {
        method: editingPlantilla ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plantillaForm),
      }, token);

      setShowPlantillaModal(false);
      loadPlantillas();
    } catch (err: any) {
      alert(err.message || 'Error al guardar plantilla');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlantilla = async (id: string) => {
    if (!confirm('Eliminar esta plantilla?')) return;
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      await apiFetch(`/tenants/${tenantActual.id}/documentos/plantillas/${id}`, { method: 'DELETE' }, token);
      loadPlantillas();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleDuplicatePlantilla = async (id: string) => {
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      await apiFetch(`/tenants/${tenantActual.id}/documentos/plantillas/${id}/duplicar`, { method: 'POST' }, token);
      loadPlantillas();
    } catch (err: any) {
      alert(err.message || 'Error al duplicar');
    }
  };

  const handleSeedPlantillas = async () => {
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      await apiFetch(`/tenants/${tenantActual.id}/documentos/plantillas/seed`, { method: 'POST' }, token);
      loadPlantillas();
    } catch (err: any) {
      alert(err.message || 'Error al crear plantillas');
    }
  };

  // ==================== HANDLERS - CATEGORIAS ====================

  const handleNewCategoria = () => {
    setEditingCategoria(null);
    setCategoriaForm({ nombre: '', descripcion: '', icono: 'folder', color: '#2563eb' });
    setShowCategoriaModal(true);
  };

  const handleEditCategoria = (c: Categoria) => {
    setEditingCategoria(c);
    setCategoriaForm({
      nombre: c.nombre,
      descripcion: c.descripcion || '',
      icono: c.icono || 'folder',
      color: c.color || '#2563eb',
    });
    setShowCategoriaModal(true);
  };

  const handleSaveCategoria = async () => {
    if (!tenantActual?.id) return;
    setSaving(true);
    try {
      const token = await getToken();
      const url = editingCategoria
        ? `/tenants/${tenantActual.id}/biblioteca/categorias/${editingCategoria.id}`
        : `/tenants/${tenantActual.id}/biblioteca/categorias`;

      await apiFetch(url, {
        method: editingCategoria ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoriaForm),
      }, token);

      setShowCategoriaModal(false);
      loadCategorias();
    } catch (err: any) {
      alert(err.message || 'Error al guardar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    if (!confirm('Eliminar esta categoria?')) return;
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      await apiFetch(`/tenants/${tenantActual.id}/biblioteca/categorias/${id}`, { method: 'DELETE' }, token);
      loadCategorias();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleSeedCategorias = async () => {
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      await apiFetch(`/tenants/${tenantActual.id}/biblioteca/seed-categorias`, { method: 'POST' }, token);
      loadCategorias();
    } catch (err: any) {
      alert(err.message || 'Error al crear categorias');
    }
  };

  // ==================== FILTER ====================

  const filteredPlantillas = plantillas.filter(p => {
    if (!busquedaPlantilla) return true;
    return p.nombre.toLowerCase().includes(busquedaPlantilla.toLowerCase());
  });

  // ==================== RENDER ====================

  if (!isPlatformAdmin) {
    return (
      <div className="config-page">
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>Acceso restringido</h3>
          <p>Solo los administradores pueden acceder a esta seccion</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="config-page">
        {/* Tabs */}
        <div className="config-tabs">
          <button
            className={`config-tab ${activeTab === 'plantillas' ? 'active' : ''}`}
            onClick={() => setActiveTab('plantillas')}
          >
            <FileText size={18} />
            Plantillas
          </button>
          <button
            className={`config-tab ${activeTab === 'documentos' ? 'active' : ''}`}
            onClick={() => setActiveTab('documentos')}
          >
            <Building2 size={18} />
            Docs. Empresa
          </button>
          <button
            className={`config-tab ${activeTab === 'categorias' ? 'active' : ''}`}
            onClick={() => setActiveTab('categorias')}
          >
            <FolderOpen size={18} />
            Categorias
          </button>
        </div>

        {/* Tab: Plantillas */}
        {activeTab === 'plantillas' && (
          <>
            <div className="toolbar">
              <div className="toolbar-left">
                <div className="search-box">
                  <Search size={18} color="#64748b" />
                  <input
                    type="text"
                    placeholder="Buscar plantillas..."
                    value={busquedaPlantilla}
                    onChange={(e) => setBusquedaPlantilla(e.target.value)}
                  />
                </div>
                <select
                  className="filter-select"
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                >
                  <option value="">Todas las categorias</option>
                  {CATEGORIAS_PLANTILLAS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={handleSeedPlantillas}>
                  Cargar Predeterminadas
                </button>
                <button className="btn btn-primary" onClick={handleNewPlantilla}>
                  <Plus size={18} />
                  Nueva Plantilla
                </button>
              </div>
            </div>

            {loadingPlantillas ? (
              <div className="loading-spinner">
                <Loader2 size={32} />
              </div>
            ) : filteredPlantillas.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} />
                <h3>No hay plantillas</h3>
                <p>Crea tu primera plantilla o carga las predeterminadas</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Categoria</th>
                    <th>Firma</th>
                    <th>Estado</th>
                    <th style={{ width: 120 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlantillas.map(p => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.nombre}</strong>
                        {p.descripcion && (
                          <div style={{ fontSize: 12, color: '#64748b' }}>{p.descripcion}</div>
                        )}
                      </td>
                      <td>
                        <span className="category-badge">{p.categoria}</span>
                      </td>
                      <td>
                        {p.requiere_firma ? (
                          <span className="status-badge obligatorio">Requiere</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${p.activo ? 'active' : 'inactive'}`}>
                          {p.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-icon" onClick={() => handleEditPlantilla(p)} title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDuplicatePlantilla(p.id)} title="Duplicar">
                            <Copy size={16} />
                          </button>
                          <button className="btn-icon danger" onClick={() => handleDeletePlantilla(p.id)} title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Tab: Documentos Empresa */}
        {activeTab === 'documentos' && (
          <>
            <div className="toolbar">
              <div className="toolbar-left">
                <p style={{ color: '#64748b' }}>
                  Documentos estaticos de la empresa (estatutos, politicas, manuales)
                </p>
              </div>
              <button className="btn btn-primary">
                <Upload size={18} />
                Subir Documento
              </button>
            </div>

            {loadingDocumentos ? (
              <div className="loading-spinner">
                <Loader2 size={32} />
              </div>
            ) : documentos.length === 0 ? (
              <div className="empty-state">
                <Building2 size={48} />
                <h3>No hay documentos de empresa</h3>
                <p>Sube documentos como estatutos, politicas o manuales</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Titulo</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th>Obligatorio</th>
                    <th style={{ width: 100 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map(d => (
                    <tr key={d.id}>
                      <td><strong>{d.titulo}</strong></td>
                      <td>{d.categoria_nombre || '-'}</td>
                      <td>{d.tipo_archivo?.toUpperCase()}</td>
                      <td>
                        {d.es_obligatorio ? (
                          <span className="status-badge obligatorio">Si</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>No</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-icon" title="Ver">
                            <Eye size={16} />
                          </button>
                          <button className="btn-icon danger" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Tab: Categorias */}
        {activeTab === 'categorias' && (
          <>
            <div className="toolbar">
              <div className="toolbar-left">
                <p style={{ color: '#64748b' }}>
                  Categorias para organizar documentos de empresa
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={handleSeedCategorias}>
                  Cargar Predeterminadas
                </button>
                <button className="btn btn-primary" onClick={handleNewCategoria}>
                  <Plus size={18} />
                  Nueva Categoria
                </button>
              </div>
            </div>

            {loadingCategorias ? (
              <div className="loading-spinner">
                <Loader2 size={32} />
              </div>
            ) : categorias.length === 0 ? (
              <div className="empty-state">
                <FolderOpen size={48} />
                <h3>No hay categorias</h3>
                <p>Crea categorias para organizar los documentos</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripcion</th>
                    <th>Documentos</th>
                    <th style={{ width: 100 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 12,
                            height: 12,
                            borderRadius: 4,
                            background: c.color || '#64748b'
                          }} />
                          <strong>{c.nombre}</strong>
                        </div>
                      </td>
                      <td style={{ color: '#64748b' }}>{c.descripcion || '-'}</td>
                      <td>{c.documento_count || 0}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-icon" onClick={() => handleEditCategoria(c)} title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon danger"
                            onClick={() => handleDeleteCategoria(c.id)}
                            title="Eliminar"
                            disabled={(c.documento_count || 0) > 0}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Modal: Plantilla */}
        {showPlantillaModal && (
          <div className="modal-overlay" onClick={() => setShowPlantillaModal(false)}>
            <div className="modal-content xl" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
                <button className="modal-close" onClick={() => setShowPlantillaModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      value={plantillaForm.nombre}
                      onChange={(e) => setPlantillaForm({ ...plantillaForm, nombre: e.target.value })}
                      placeholder="Ej: Contrato de Captacion"
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoria</label>
                    <select
                      value={plantillaForm.categoria}
                      onChange={(e) => setPlantillaForm({ ...plantillaForm, categoria: e.target.value })}
                    >
                      {CATEGORIAS_PLANTILLAS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Descripcion</label>
                  <input
                    type="text"
                    value={plantillaForm.descripcion}
                    onChange={(e) => setPlantillaForm({ ...plantillaForm, descripcion: e.target.value })}
                    placeholder="Descripcion breve de la plantilla"
                  />
                </div>

                <div className="form-group">
                  <label>Contenido HTML</label>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    Usa {'{{contacto.nombre}}'}, {'{{propiedad.titulo}}'}, etc. para variables dinamicas
                  </p>
                  <div className="editor-container">
                    <textarea
                      className="editor-textarea"
                      value={plantillaForm.contenido_html}
                      onChange={(e) => setPlantillaForm({ ...plantillaForm, contenido_html: e.target.value })}
                      placeholder="<h1>Titulo</h1><p>Contenido...</p>"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="requiere_firma"
                        checked={plantillaForm.requiere_firma}
                        onChange={(e) => setPlantillaForm({ ...plantillaForm, requiere_firma: e.target.checked })}
                      />
                      <label htmlFor="requiere_firma">Requiere firma electronica</label>
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="es_publica"
                        checked={plantillaForm.es_publica}
                        onChange={(e) => setPlantillaForm({ ...plantillaForm, es_publica: e.target.checked })}
                      />
                      <label htmlFor="es_publica">Visible para todos los usuarios</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPlantillaModal(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSavePlantilla}
                  disabled={saving || !plantillaForm.nombre}
                >
                  {saving ? <Loader2 size={18} /> : <Save size={18} />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Categoria */}
        {showCategoriaModal && (
          <div className="modal-overlay" onClick={() => setShowCategoriaModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingCategoria ? 'Editar Categoria' : 'Nueva Categoria'}</h2>
                <button className="modal-close" onClick={() => setShowCategoriaModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={categoriaForm.nombre}
                    onChange={(e) => setCategoriaForm({ ...categoriaForm, nombre: e.target.value })}
                    placeholder="Ej: Politicas"
                  />
                </div>

                <div className="form-group">
                  <label>Descripcion</label>
                  <input
                    type="text"
                    value={categoriaForm.descripcion}
                    onChange={(e) => setCategoriaForm({ ...categoriaForm, descripcion: e.target.value })}
                    placeholder="Descripcion de la categoria"
                  />
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <div className="color-picker-wrapper">
                    <input
                      type="color"
                      value={categoriaForm.color}
                      onChange={(e) => setCategoriaForm({ ...categoriaForm, color: e.target.value })}
                    />
                    <input
                      type="text"
                      value={categoriaForm.color}
                      onChange={(e) => setCategoriaForm({ ...categoriaForm, color: e.target.value })}
                      style={{ width: 120 }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCategoriaModal(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveCategoria}
                  disabled={saving || !categoriaForm.nombre}
                >
                  {saving ? <Loader2 size={18} /> : <Save size={18} />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
