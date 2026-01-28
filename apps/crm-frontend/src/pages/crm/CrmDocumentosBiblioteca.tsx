/**
 * CrmDocumentosBiblioteca - Biblioteca de documentos de la empresa
 *
 * Permite:
 * - Ver documentos organizados por categorías
 * - Buscar documentos
 * - Marcar favoritos
 * - Confirmar lectura de documentos obligatorios
 * - Ver documentos pendientes de confirmación
 * - Admins: CRUD de categorías y documentos
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch } from '../../services/api';
import {
  FolderOpen,
  FileText,
  Plus,
  Search,
  Star,
  StarOff,
  Eye,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Upload,
  Filter,
  X,
  Shield,
  BookOpen,
  ClipboardList,
  Megaphone,
  Folder,
  ChevronRight,
} from 'lucide-react';

// ==================== INTERFACES ====================

interface BibliotecaCategoria {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  orden: number;
  activo: boolean;
  documentos_count?: number;
}

interface BibliotecaDocumento {
  id: string;
  tenant_id: string;
  categoria_id?: string;
  titulo: string;
  descripcion?: string;
  url_documento: string;
  tipo_archivo?: string;
  tamano_archivo?: number;
  version: number;
  version_notas?: string;
  es_obligatorio: boolean;
  fecha_vigencia?: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  categoria?: BibliotecaCategoria;
  confirmado?: boolean;
  es_favorito?: boolean;
}

// ==================== ICON MAPPING ====================

const IconMap: Record<string, React.ReactNode> = {
  Shield: <Shield size={20} />,
  BookOpen: <BookOpen size={20} />,
  FileText: <FileText size={20} />,
  ClipboardList: <ClipboardList size={20} />,
  Megaphone: <Megaphone size={20} />,
  Folder: <Folder size={20} />,
  FolderOpen: <FolderOpen size={20} />,
};

// ==================== COMPONENT ====================

export default function CrmDocumentosBiblioteca() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  // State
  const [categorias, setCategorias] = useState<BibliotecaCategoria[]>([]);
  const [documentos, setDocumentos] = useState<BibliotecaDocumento[]>([]);
  const [pendientes, setPendientes] = useState<BibliotecaDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [vistaFavoritos, setVistaFavoritos] = useState(false);
  const [vistaPendientes, setVistaPendientes] = useState(false);

  // Modals
  const [showDocModal, setShowDocModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<BibliotecaDocumento | null>(null);
  const [editingCat, setEditingCat] = useState<BibliotecaCategoria | null>(null);
  const [viewingDoc, setViewingDoc] = useState<BibliotecaDocumento | null>(null);

  // Form state
  const [formDoc, setFormDoc] = useState({
    titulo: '',
    descripcion: '',
    url_documento: '',
    tipo_archivo: '',
    categoria_id: '',
    es_obligatorio: false,
    fecha_vigencia: '',
  });
  const [formCat, setFormCat] = useState({
    nombre: '',
    descripcion: '',
    icono: 'Folder',
    color: '#6B7280',
  });
  const [saving, setSaving] = useState(false);

  // Check if user can manage (always true for now - can be restricted later)
  const isAdmin = true;

  // ==================== DATA LOADING ====================

  const loadData = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      // Load categories
      const catRes = await apiFetch(`/tenants/${tenantActual.id}/biblioteca/categorias`, {}, token);
      const catData = await catRes.json();
      setCategorias(catData);

      // Load documents based on current view
      let docsUrl = `/tenants/${tenantActual.id}/biblioteca/documentos?limit=100`;
      if (categoriaSeleccionada) {
        docsUrl += `&categoria_id=${categoriaSeleccionada}`;
      }
      if (busqueda) {
        docsUrl += `&busqueda=${encodeURIComponent(busqueda)}`;
      }

      if (vistaFavoritos) {
        const favRes = await apiFetch(`/tenants/${tenantActual.id}/biblioteca/documentos/favoritos`, {}, token);
        const favData = await favRes.json();
        setDocumentos(favData);
      } else {
        const docsRes = await apiFetch(docsUrl, {}, token);
        const docsData = await docsRes.json();
        setDocumentos(docsData.data || []);
      }

      // Load pending documents
      const pendRes = await apiFetch(`/tenants/${tenantActual.id}/biblioteca/documentos/pendientes`, {}, token);
      const pendData = await pendRes.json();
      setPendientes(pendData);

    } catch (err: any) {
      setError(err.message || 'Error al cargar la biblioteca');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken, categoriaSeleccionada, busqueda, vistaFavoritos]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== PAGE HEADER ====================

  useEffect(() => {
    setPageHeader({
      title: 'Biblioteca',
      subtitle: 'Documentos, políticas y manuales de la empresa',
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/documentos/generar`)}
            className="btn-secondary"
          >
            <FileText size={18} />
            Generar Documento
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => navigate(`/crm/${tenantSlug}/documentos/plantillas`)}
                className="btn-secondary"
              >
                <FolderOpen size={18} />
                Plantillas
              </button>
              <button
                onClick={() => {
                  setEditingDoc(null);
                  setFormDoc({
                    titulo: '',
                    descripcion: '',
                    url_documento: '',
                    tipo_archivo: '',
                    categoria_id: categoriaSeleccionada || '',
                    es_obligatorio: false,
                    fecha_vigencia: '',
                  });
                  setShowDocModal(true);
                }}
                className="btn-primary"
              >
                <Plus size={18} />
                Nuevo Documento
              </button>
            </>
          )}
        </div>
      ),
    });
  }, [setPageHeader, isAdmin, categoriaSeleccionada, navigate, tenantSlug]);

  // ==================== HANDLERS ====================

  const handleToggleFavorito = async (doc: BibliotecaDocumento) => {
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      await apiFetch(
        `/tenants/${tenantActual.id}/biblioteca/documentos/${doc.id}/favorito`,
        { method: 'POST' },
        token
      );
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleConfirmarLectura = async (doc: BibliotecaDocumento) => {
    if (!tenantActual?.id) return;
    if (!confirm(`¿Confirmar que has leído "${doc.titulo}"?`)) return;

    try {
      const token = await getToken();
      await apiFetch(
        `/tenants/${tenantActual.id}/biblioteca/documentos/${doc.id}/confirmar`,
        { method: 'POST' },
        token
      );
      loadData();
      setViewingDoc(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleSaveDoc = async () => {
    if (!tenantActual?.id || !formDoc.titulo || !formDoc.url_documento) {
      alert('Título y URL son requeridos');
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const method = editingDoc ? 'PUT' : 'POST';
      const url = editingDoc
        ? `/tenants/${tenantActual.id}/biblioteca/documentos/${editingDoc.id}`
        : `/tenants/${tenantActual.id}/biblioteca/documentos`;

      await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...formDoc,
          categoria_id: formDoc.categoria_id || null,
        }),
      }, token);

      setShowDocModal(false);
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDoc = async (doc: BibliotecaDocumento) => {
    if (!tenantActual?.id) return;
    if (!confirm(`¿Eliminar "${doc.titulo}"? Esta acción no se puede deshacer.`)) return;

    try {
      const token = await getToken();
      await apiFetch(
        `/tenants/${tenantActual.id}/biblioteca/documentos/${doc.id}`,
        { method: 'DELETE' },
        token
      );
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleSaveCat = async () => {
    if (!tenantActual?.id || !formCat.nombre) {
      alert('Nombre es requerido');
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const method = editingCat ? 'PUT' : 'POST';
      const url = editingCat
        ? `/tenants/${tenantActual.id}/biblioteca/categorias/${editingCat.id}`
        : `/tenants/${tenantActual.id}/biblioteca/categorias`;

      await apiFetch(url, {
        method,
        body: JSON.stringify(formCat),
      }, token);

      setShowCatModal(false);
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCat = async (cat: BibliotecaCategoria) => {
    if (!tenantActual?.id) return;
    if (cat.documentos_count && cat.documentos_count > 0) {
      alert('No puedes eliminar una categoría con documentos. Mueve los documentos primero.');
      return;
    }
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) return;

    try {
      const token = await getToken();
      await apiFetch(
        `/tenants/${tenantActual.id}/biblioteca/categorias/${cat.id}`,
        { method: 'DELETE' },
        token
      );
      if (categoriaSeleccionada === cat.id) {
        setCategoriaSeleccionada(null);
      }
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleSeedCategorias = async () => {
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      await apiFetch(
        `/tenants/${tenantActual.id}/biblioteca/seed-categorias`,
        { method: 'POST' },
        token
      );
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // ==================== HELPERS ====================

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFileIcon = (tipo?: string) => {
    if (!tipo) return <FileText size={24} />;
    const t = tipo.toLowerCase();
    if (t.includes('pdf')) return <FileText size={24} className="text-red-500" />;
    if (t.includes('doc')) return <FileText size={24} className="text-blue-500" />;
    if (t.includes('xls')) return <FileText size={24} className="text-green-500" />;
    return <FileText size={24} />;
  };

  // ==================== RENDER ====================

  if (loading && categorias.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando biblioteca...</p>
      </div>
    );
  }

  const documentosFiltrados = vistaPendientes ? pendientes : documentos;

  return (
    <div className="biblioteca-page">
      {/* Alert for pending documents */}
      {pendientes.length > 0 && !vistaPendientes && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} />
          <span>
            Tienes <strong>{pendientes.length}</strong> documento{pendientes.length > 1 ? 's' : ''} obligatorio{pendientes.length > 1 ? 's' : ''} pendiente{pendientes.length > 1 ? 's' : ''} de confirmación.
          </span>
          <button
            onClick={() => {
              setVistaPendientes(true);
              setVistaFavoritos(false);
              setCategoriaSeleccionada(null);
            }}
            className="btn-link"
            style={{ marginLeft: 'auto' }}
          >
            Ver pendientes
          </button>
        </div>
      )}

      <div className="biblioteca-layout">
        {/* Sidebar with categories */}
        <aside className="biblioteca-sidebar">
          <div className="sidebar-section">
            <h3>Filtros</h3>
            <nav className="sidebar-nav">
              <button
                className={`sidebar-item ${!categoriaSeleccionada && !vistaFavoritos && !vistaPendientes ? 'active' : ''}`}
                onClick={() => {
                  setCategoriaSeleccionada(null);
                  setVistaFavoritos(false);
                  setVistaPendientes(false);
                }}
              >
                <FolderOpen size={18} />
                <span>Todos los documentos</span>
              </button>
              <button
                className={`sidebar-item ${vistaFavoritos ? 'active' : ''}`}
                onClick={() => {
                  setVistaFavoritos(true);
                  setVistaPendientes(false);
                  setCategoriaSeleccionada(null);
                }}
              >
                <Star size={18} />
                <span>Favoritos</span>
              </button>
              {pendientes.length > 0 && (
                <button
                  className={`sidebar-item ${vistaPendientes ? 'active' : ''}`}
                  onClick={() => {
                    setVistaPendientes(true);
                    setVistaFavoritos(false);
                    setCategoriaSeleccionada(null);
                  }}
                >
                  <AlertCircle size={18} />
                  <span>Pendientes</span>
                  <span className="badge badge-warning">{pendientes.length}</span>
                </button>
              )}
            </nav>
          </div>

          <div className="sidebar-section">
            <h3>Categorías</h3>
            {categorias.length === 0 ? (
              <div className="sidebar-empty">
                <p>No hay categorías</p>
                {isAdmin && (
                  <button onClick={handleSeedCategorias} className="btn-link">
                    Crear categorías predeterminadas
                  </button>
                )}
              </div>
            ) : (
              <nav className="sidebar-nav">
                {categorias.map((cat) => (
                  <div key={cat.id} className="sidebar-item-group">
                    <button
                      className={`sidebar-item ${categoriaSeleccionada === cat.id && !vistaFavoritos && !vistaPendientes ? 'active' : ''}`}
                      onClick={() => {
                        setCategoriaSeleccionada(cat.id);
                        setVistaFavoritos(false);
                        setVistaPendientes(false);
                      }}
                    >
                      <span style={{ color: cat.color }}>
                        {IconMap[cat.icono || 'Folder'] || <Folder size={18} />}
                      </span>
                      <span>{cat.nombre}</span>
                      <span className="count">{cat.documentos_count || 0}</span>
                    </button>
                    {isAdmin && (
                      <div className="sidebar-item-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCat(cat);
                            setFormCat({
                              nombre: cat.nombre,
                              descripcion: cat.descripcion || '',
                              icono: cat.icono || 'Folder',
                              color: cat.color || '#6B7280',
                            });
                            setShowCatModal(true);
                          }}
                          title="Editar categoría"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCat(cat);
                          }}
                          title="Eliminar categoría"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="biblioteca-content">
          {/* Search bar */}
          <div className="biblioteca-toolbar">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="clear-btn">
                  <X size={16} />
                </button>
              )}
            </div>

            {(vistaFavoritos || vistaPendientes || categoriaSeleccionada) && (
              <div className="active-filters">
                {vistaFavoritos && (
                  <span className="filter-tag">
                    <Star size={14} /> Favoritos
                    <button onClick={() => setVistaFavoritos(false)}><X size={14} /></button>
                  </span>
                )}
                {vistaPendientes && (
                  <span className="filter-tag">
                    <AlertCircle size={14} /> Pendientes
                    <button onClick={() => setVistaPendientes(false)}><X size={14} /></button>
                  </span>
                )}
                {categoriaSeleccionada && (
                  <span className="filter-tag">
                    <Folder size={14} /> {categorias.find(c => c.id === categoriaSeleccionada)?.nombre}
                    <button onClick={() => setCategoriaSeleccionada(null)}><X size={14} /></button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Documents grid */}
          {documentosFiltrados.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>No hay documentos</h3>
              <p>
                {vistaFavoritos
                  ? 'No tienes documentos marcados como favoritos'
                  : vistaPendientes
                  ? 'No tienes documentos pendientes de confirmación'
                  : busqueda
                  ? 'No se encontraron documentos con ese término'
                  : 'Aún no hay documentos en esta categoría'}
              </p>
            </div>
          ) : (
            <div className="documentos-grid">
              {documentosFiltrados.map((doc) => (
                <div key={doc.id} className={`documento-card ${doc.es_obligatorio && !doc.confirmado ? 'pending' : ''}`}>
                  <div className="documento-header">
                    {getFileIcon(doc.tipo_archivo)}
                    <div className="documento-badges">
                      {doc.es_obligatorio && (
                        <span className={`badge ${doc.confirmado ? 'badge-success' : 'badge-warning'}`}>
                          {doc.confirmado ? 'Confirmado' : 'Obligatorio'}
                        </span>
                      )}
                      {doc.categoria && (
                        <span className="badge" style={{ backgroundColor: doc.categoria.color + '20', color: doc.categoria.color }}>
                          {doc.categoria.nombre}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="documento-titulo">{doc.titulo}</h4>
                  {doc.descripcion && <p className="documento-desc">{doc.descripcion}</p>}

                  <div className="documento-meta">
                    <span><Clock size={14} /> {formatDate(doc.updated_at)}</span>
                    {doc.tipo_archivo && <span>{doc.tipo_archivo.toUpperCase()}</span>}
                    {doc.tamano_archivo && <span>{formatFileSize(doc.tamano_archivo)}</span>}
                    <span>v{doc.version}</span>
                  </div>

                  <div className="documento-actions">
                    <button
                      onClick={() => setViewingDoc(doc)}
                      className="btn-icon"
                      title="Ver documento"
                    >
                      <Eye size={18} />
                    </button>
                    <a
                      href={doc.url_documento}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon"
                      title="Descargar"
                    >
                      <Download size={18} />
                    </a>
                    <button
                      onClick={() => handleToggleFavorito(doc)}
                      className={`btn-icon ${doc.es_favorito ? 'active' : ''}`}
                      title={doc.es_favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                      {doc.es_favorito ? <Star size={18} fill="currentColor" /> : <StarOff size={18} />}
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setEditingDoc(doc);
                            setFormDoc({
                              titulo: doc.titulo,
                              descripcion: doc.descripcion || '',
                              url_documento: doc.url_documento,
                              tipo_archivo: doc.tipo_archivo || '',
                              categoria_id: doc.categoria_id || '',
                              es_obligatorio: doc.es_obligatorio,
                              fecha_vigencia: doc.fecha_vigencia || '',
                            });
                            setShowDocModal(true);
                          }}
                          className="btn-icon"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc)}
                          className="btn-icon danger"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Document viewer modal */}
      {viewingDoc && (
        <div className="modal-backdrop" onClick={() => setViewingDoc(null)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{viewingDoc.titulo}</h2>
              <button onClick={() => setViewingDoc(null)} className="modal-close">
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {viewingDoc.descripcion && (
                <p className="doc-description">{viewingDoc.descripcion}</p>
              )}
              <div className="doc-meta-grid">
                <div><strong>Versión:</strong> {viewingDoc.version}</div>
                <div><strong>Tipo:</strong> {viewingDoc.tipo_archivo || 'N/A'}</div>
                <div><strong>Tamaño:</strong> {formatFileSize(viewingDoc.tamano_archivo)}</div>
                <div><strong>Actualizado:</strong> {formatDate(viewingDoc.updated_at)}</div>
                {viewingDoc.fecha_vigencia && (
                  <div><strong>Vigencia:</strong> {formatDate(viewingDoc.fecha_vigencia)}</div>
                )}
              </div>
              {viewingDoc.version_notas && (
                <div className="version-notes">
                  <strong>Notas de versión:</strong>
                  <p>{viewingDoc.version_notas}</p>
                </div>
              )}

              {/* PDF preview if applicable */}
              {viewingDoc.tipo_archivo?.toLowerCase().includes('pdf') && (
                <iframe
                  src={viewingDoc.url_documento}
                  className="pdf-preview"
                  title={viewingDoc.titulo}
                />
              )}
            </div>
            <div className="modal-footer">
              {viewingDoc.es_obligatorio && !viewingDoc.confirmado && (
                <button
                  onClick={() => handleConfirmarLectura(viewingDoc)}
                  className="btn-primary"
                >
                  <CheckCircle2 size={18} />
                  Confirmar Lectura
                </button>
              )}
              <a
                href={viewingDoc.url_documento}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <Download size={18} />
                Descargar
              </a>
              <button onClick={() => setViewingDoc(null)} className="btn-ghost">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document form modal */}
      {showDocModal && (
        <div className="modal-backdrop" onClick={() => setShowDocModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDoc ? 'Editar Documento' : 'Nuevo Documento'}</h2>
              <button onClick={() => setShowDocModal(false)} className="modal-close">
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={formDoc.titulo}
                  onChange={(e) => setFormDoc({ ...formDoc, titulo: e.target.value })}
                  placeholder="Título del documento"
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={formDoc.descripcion}
                  onChange={(e) => setFormDoc({ ...formDoc, descripcion: e.target.value })}
                  placeholder="Descripción breve del documento"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>URL del documento *</label>
                <input
                  type="url"
                  value={formDoc.url_documento}
                  onChange={(e) => setFormDoc({ ...formDoc, url_documento: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo de archivo</label>
                  <select
                    value={formDoc.tipo_archivo}
                    onChange={(e) => setFormDoc({ ...formDoc, tipo_archivo: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="pdf">PDF</option>
                    <option value="doc">Word (DOC)</option>
                    <option value="docx">Word (DOCX)</option>
                    <option value="xls">Excel (XLS)</option>
                    <option value="xlsx">Excel (XLSX)</option>
                    <option value="ppt">PowerPoint (PPT)</option>
                    <option value="pptx">PowerPoint (PPTX)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={formDoc.categoria_id}
                    onChange={(e) => setFormDoc({ ...formDoc, categoria_id: e.target.value })}
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha de vigencia</label>
                  <input
                    type="date"
                    value={formDoc.fecha_vigencia}
                    onChange={(e) => setFormDoc({ ...formDoc, fecha_vigencia: e.target.value })}
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formDoc.es_obligatorio}
                      onChange={(e) => setFormDoc({ ...formDoc, es_obligatorio: e.target.checked })}
                    />
                    Lectura obligatoria
                  </label>
                  <small>Los usuarios deberán confirmar que han leído este documento</small>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDocModal(false)} className="btn-ghost">
                Cancelar
              </button>
              <button onClick={handleSaveDoc} className="btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : editingDoc ? 'Guardar cambios' : 'Crear documento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category form modal */}
      {showCatModal && (
        <div className="modal-backdrop" onClick={() => setShowCatModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCat ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
              <button onClick={() => setShowCatModal(false)} className="modal-close">
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={formCat.nombre}
                  onChange={(e) => setFormCat({ ...formCat, nombre: e.target.value })}
                  placeholder="Nombre de la categoría"
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={formCat.descripcion}
                  onChange={(e) => setFormCat({ ...formCat, descripcion: e.target.value })}
                  placeholder="Descripción de la categoría"
                  rows={2}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Icono</label>
                  <select
                    value={formCat.icono}
                    onChange={(e) => setFormCat({ ...formCat, icono: e.target.value })}
                  >
                    <option value="Shield">Escudo (Políticas)</option>
                    <option value="BookOpen">Libro (Manuales)</option>
                    <option value="FileText">Documento (Contratos)</option>
                    <option value="ClipboardList">Formulario</option>
                    <option value="Megaphone">Megáfono (Comunicados)</option>
                    <option value="Folder">Carpeta (Otros)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="color"
                    value={formCat.color}
                    onChange={(e) => setFormCat({ ...formCat, color: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCatModal(false)} className="btn-ghost">
                Cancelar
              </button>
              <button onClick={handleSaveCat} className="btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : editingCat ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .biblioteca-page {
          padding: 0;
        }

        .biblioteca-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          min-height: calc(100vh - 200px);
        }

        .biblioteca-sidebar {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px;
          height: fit-content;
          position: sticky;
          top: 100px;
        }

        .sidebar-section {
          margin-bottom: 24px;
        }

        .sidebar-section:last-child {
          margin-bottom: 0;
        }

        .sidebar-section h3 {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          padding: 0 8px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-item-group {
          position: relative;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-primary);
          width: 100%;
          text-align: left;
          transition: all 0.15s;
        }

        .sidebar-item:hover {
          background: var(--bg-secondary);
        }

        .sidebar-item.active {
          background: var(--primary-50);
          color: var(--primary-600);
          font-weight: 500;
        }

        .sidebar-item .count {
          margin-left: auto;
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 10px;
        }

        .sidebar-item-actions {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          display: none;
          gap: 4px;
        }

        .sidebar-item-group:hover .sidebar-item-actions {
          display: flex;
        }

        .sidebar-item-actions button {
          padding: 4px;
          border: none;
          background: var(--bg-tertiary);
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-secondary);
        }

        .sidebar-item-actions button:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .sidebar-empty {
          padding: 16px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .biblioteca-content {
          min-width: 0;
        }

        .biblioteca-toolbar {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          align-items: center;
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

        .search-box .clear-btn {
          padding: 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--text-secondary);
        }

        .active-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: var(--primary-50);
          color: var(--primary-600);
          border-radius: 20px;
          font-size: 13px;
        }

        .filter-tag button {
          padding: 2px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--primary-600);
          display: flex;
        }

        .documentos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .documento-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
        }

        .documento-card:hover {
          border-color: var(--primary-200);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .documento-card.pending {
          border-color: var(--warning-200);
          background: var(--warning-50);
        }

        .documento-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .documento-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .documento-titulo {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .documento-desc {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .documento-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .documento-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .documento-actions {
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

        .btn-icon.active {
          color: var(--warning-500);
        }

        .btn-icon.danger:hover {
          background: var(--error-50);
          color: var(--error-500);
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

        /* Modal styles */
        .modal-large {
          max-width: 800px;
          width: 90%;
        }

        .doc-description {
          margin-bottom: 16px;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .doc-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .version-notes {
          margin-bottom: 16px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 8px;
          font-size: 14px;
        }

        .version-notes p {
          margin-top: 8px;
          color: var(--text-secondary);
        }

        .pdf-preview {
          width: 100%;
          height: 500px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-group small {
          color: var(--text-secondary);
          font-size: 12px;
          margin-left: 24px;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
        }

        .alert-warning {
          background: var(--warning-50);
          border: 1px solid var(--warning-200);
          color: var(--warning-700);
        }

        @media (max-width: 768px) {
          .biblioteca-layout {
            grid-template-columns: 1fr;
          }

          .biblioteca-sidebar {
            position: static;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
