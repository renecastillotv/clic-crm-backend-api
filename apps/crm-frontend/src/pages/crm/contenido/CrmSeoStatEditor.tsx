/**
 * CrmSeoStatEditor - Editor de SEO Stats
 *
 * Página completa para crear o editar SEO Stats
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageHeader } from '../../../layouts/CrmLayout';
import {
  getSeoStat,
  createSeoStat,
  updateSeoStat,
  getCategoriasContenido,
} from '../../../services/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { contenidoStyles } from './sharedStyles';

const Icons = {
  arrowLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  save: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  globe: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  link: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  tag: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  mapPin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
};

// Configuración de React Quill
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    [{ align: [] }],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'link', 'align',
];

interface FormData {
  idioma: string;
  titulo: string;
  descripcion: string;
  contenido: string;
  categoriaId: string;
  tipoAsociacion: string;
  asociacionId: string;
  asociacionNombre: string;
  keywords: string[];
  publicado: boolean;
  destacado: boolean;
  orden: number;
}

const initialFormData: FormData = {
  idioma: 'es',
  titulo: '',
  descripcion: '',
  contenido: '',
  categoriaId: '',
  tipoAsociacion: 'ubicacion',
  asociacionId: '',
  asociacionNombre: '',
  keywords: [],
  publicado: true,
  destacado: false,
  orden: 0,
};

export default function CrmSeoStatEditor() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const isEditing = id && id !== 'nuevo';

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState('');

  // Ref para evitar stale closure en el header
  const handleSaveRef = useRef<() => void>(() => {});

  useEffect(() => {
    setPageHeader({
      title: isEditing ? 'Editar SEO Stat' : 'Nuevo SEO Stat',
      subtitle: 'Contenido enriquecido para SEO por ubicación y tipo',
      actions: (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/contenido?tab=seo`)}
            className="btn-secondary"
          >
            {Icons.arrowLeft}
            <span>Volver</span>
          </button>
          <button
            onClick={() => handleSaveRef.current()}
            className="btn-primary"
            disabled={saving}
          >
            {Icons.save}
            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      ),
    });
  }, [setPageHeader, isEditing, tenantSlug, saving]);

  useEffect(() => {
    loadData();
  }, [tenantActual?.id, id]);

  const loadData = async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar categorías
      const categoriasData = await getCategoriasContenido(tenantActual.id, 'seo_stats');
      setCategorias(categoriasData);

      // Si estamos editando, cargar el SEO Stat
      if (isEditing && id) {
        const seoStat = await getSeoStat(tenantActual.id, id);
        setFormData({
          idioma: seoStat.idioma || 'es',
          titulo: seoStat.titulo || '',
          descripcion: seoStat.descripcion || '',
          contenido: seoStat.contenido || '',
          categoriaId: seoStat.categoriaId || '',
          tipoAsociacion: seoStat.tipoAsociacion || 'ubicacion',
          asociacionId: seoStat.asociacionId || '',
          asociacionNombre: seoStat.asociacionNombre || '',
          keywords: seoStat.keywords || [],
          publicado: seoStat.publicado ?? true,
          destacado: seoStat.destacado ?? false,
          orden: seoStat.orden || 0,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!tenantActual?.id) return;

    if (!formData.titulo.trim()) {
      setError('El título es requerido');
      return;
    }

    if (!formData.contenido.trim()) {
      setError('El contenido es requerido');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const dataToSave = {
        ...formData,
        categoriaId: formData.categoriaId || undefined,
        asociacionId: formData.asociacionId || undefined,
        keywords: formData.keywords.filter(k => k.trim()),
      };

      if (isEditing && id) {
        await updateSeoStat(tenantActual.id, id, dataToSave);
      } else {
        await createSeoStat(tenantActual.id, dataToSave);
      }

      navigate(`/crm/${tenantSlug}/contenido?tab=seo`);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [tenantActual?.id, formData, isEditing, id, tenantSlug, navigate]);

  // Mantener el ref actualizado con la última versión de handleSave
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter(k => k !== keyword),
    });
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const getTipoAsociacionIcon = (tipo: string) => {
    switch (tipo) {
      case 'ubicacion':
        return Icons.mapPin;
      case 'tipo_propiedad':
        return Icons.home;
      case 'zona':
        return Icons.globe;
      case 'barrio':
        return Icons.mapPin;
      default:
        return Icons.globe;
    }
  };

  if (loading) {
    return (
      <div className="page">
        <style>{contenidoStyles}</style>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <style>{contenidoStyles}</style>
      <style>{`
        .editor-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .editor-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .editor-grid {
            grid-template-columns: 1fr;
          }
        }

        .editor-main {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .editor-sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .editor-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .editor-section h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .editor-section h3 svg {
          color: #64748b;
        }

        .quill-container {
          border-radius: 8px;
          overflow: hidden;
        }

        .quill-container .ql-toolbar {
          border-color: #e2e8f0;
          background: #f8fafc;
        }

        .quill-container .ql-container {
          border-color: #e2e8f0;
          min-height: 300px;
          font-size: 1rem;
        }

        .quill-container .ql-editor {
          min-height: 300px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .keywords-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .keyword-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #e0f2fe;
          color: #0369a1;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .keyword-tag button {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: #0369a1;
          display: flex;
          align-items: center;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .keyword-tag button:hover {
          opacity: 1;
        }

        .keyword-input-group {
          display: flex;
          gap: 8px;
        }

        .keyword-input-group input {
          flex: 1;
        }

        .keyword-input-group button {
          padding: 10px 16px;
          background: #3b82f6;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .keyword-input-group button:hover {
          background: #2563eb;
        }

        .toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 12px;
        }

        .toggle-card:last-child {
          margin-bottom: 0;
        }

        .toggle-card.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .toggle-card.inactive {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .toggle-card.destacado.active {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
        }

        .toggle-card-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .toggle-card-title {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .toggle-card-subtitle {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .toggle-switch-mini {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          position: relative;
          transition: all 0.3s;
        }

        .toggle-card.active .toggle-switch-mini {
          background: rgba(255, 255, 255, 0.3);
        }

        .toggle-card.inactive .toggle-switch-mini {
          background: #cbd5e1;
        }

        .toggle-switch-mini::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          top: 2px;
          transition: all 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-card.active .toggle-switch-mini::after {
          left: 22px;
          background: white;
        }

        .toggle-card.inactive .toggle-switch-mini::after {
          left: 2px;
          background: white;
        }

        .tipo-asociacion-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .tipo-asociacion-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
          font-weight: 500;
          color: #64748b;
        }

        .tipo-asociacion-btn:hover {
          border-color: #94a3b8;
          background: #f8fafc;
        }

        .tipo-asociacion-btn.selected {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .tipo-asociacion-btn svg {
          flex-shrink: 0;
        }
      `}</style>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="editor-container">
        <div className="editor-grid">
          {/* Columna Principal */}
          <div className="editor-main">
            {/* Información Básica */}
            <div className="editor-section">
              <h3>
                {Icons.globe}
                Información Básica
              </h3>

              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Título del contenido SEO"
                />
              </div>

              <div className="form-group">
                <label>Descripción corta</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Breve descripción para identificar el contenido"
                  rows={2}
                />
              </div>
            </div>

            {/* Contenido */}
            <div className="editor-section">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Contenido Semántico *
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                Este contenido se agregará a las páginas para enriquecer el SEO semántico
              </p>

              <div className="quill-container">
                <ReactQuill
                  theme="snow"
                  value={formData.contenido}
                  onChange={(value) => setFormData({ ...formData, contenido: value })}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Contenido enriquecido para SEO semántico..."
                />
              </div>
            </div>

            {/* Keywords */}
            <div className="editor-section">
              <h3>
                {Icons.tag}
                Keywords
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                Palabras clave relacionadas con este contenido
              </p>

              <div className="form-group">
                <div className="keyword-input-group">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    placeholder="Agregar keyword y presionar Enter"
                  />
                  <button type="button" onClick={handleAddKeyword}>
                    Agregar
                  </button>
                </div>
                {formData.keywords.length > 0 && (
                  <div className="keywords-container">
                    {formData.keywords.map((keyword, idx) => (
                      <span key={idx} className="keyword-tag">
                        {keyword}
                        <button onClick={() => handleRemoveKeyword(keyword)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="editor-sidebar">
            {/* Tipo de Asociación */}
            <div className="editor-section">
              <h3>
                {Icons.link}
                Tipo de Asociación
              </h3>

              <div className="tipo-asociacion-grid">
                {[
                  { value: 'ubicacion', label: 'Ubicación' },
                  { value: 'tipo_propiedad', label: 'Tipo Propiedad' },
                  { value: 'zona', label: 'Zona' },
                  { value: 'barrio', label: 'Barrio' },
                ].map(tipo => (
                  <button
                    key={tipo.value}
                    type="button"
                    className={`tipo-asociacion-btn ${formData.tipoAsociacion === tipo.value ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, tipoAsociacion: tipo.value })}
                  >
                    {getTipoAsociacionIcon(tipo.value)}
                    {tipo.label}
                  </button>
                ))}
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>ID de Asociación</label>
                <input
                  type="text"
                  value={formData.asociacionId}
                  onChange={(e) => setFormData({ ...formData, asociacionId: e.target.value })}
                  placeholder="ID o slug de la asociación"
                />
              </div>

              <div className="form-group">
                <label>Nombre de Referencia</label>
                <input
                  type="text"
                  value={formData.asociacionNombre}
                  onChange={(e) => setFormData({ ...formData, asociacionNombre: e.target.value })}
                  placeholder="Nombre para identificar"
                />
              </div>
            </div>

            {/* Categoría */}
            <div className="editor-section">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                Categoría
              </h3>

              <div className="form-group">
                <select
                  value={formData.categoriaId}
                  onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                >
                  <option value="">Sin categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Configuración */}
            <div className="editor-section">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Configuración
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label>Idioma</label>
                  <select
                    value={formData.idioma}
                    onChange={(e) => setFormData({ ...formData, idioma: e.target.value })}
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Orden</label>
                  <input
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Publicación */}
            <div className="editor-section">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Publicación
              </h3>

              <div
                className={`toggle-card ${formData.publicado ? 'active' : 'inactive'}`}
                onClick={() => setFormData({ ...formData, publicado: !formData.publicado })}
              >
                <div className="toggle-card-content">
                  <span className="toggle-card-title">
                    {formData.publicado ? 'Publicado' : 'Borrador'}
                  </span>
                  <span className="toggle-card-subtitle">
                    {formData.publicado ? 'Visible en el sitio' : 'Solo visible en el CRM'}
                  </span>
                </div>
                <div className="toggle-switch-mini" />
              </div>

              <div
                className={`toggle-card destacado ${formData.destacado ? 'active' : 'inactive'}`}
                onClick={() => setFormData({ ...formData, destacado: !formData.destacado })}
              >
                <div className="toggle-card-content">
                  <span className="toggle-card-title">
                    {formData.destacado ? 'Destacado' : 'Normal'}
                  </span>
                  <span className="toggle-card-subtitle">
                    {formData.destacado ? 'Aparece en secciones destacadas' : 'Aparece normalmente'}
                  </span>
                </div>
                <div className="toggle-switch-mini" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
