/**
 * CrmVideoEditor - Editor de Videos
 *
 * Página para crear/editar videos con:
 * - Layout de dos columnas
 * - Soporte para YouTube, Vimeo, MP4, Embed
 * - Miniatura, duración, tags
 * - Soporte multi-idioma (traducciones)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageHeader } from '../../../layouts/CrmLayout';
import TagSelector from '../../../components/TagSelector';
import DatePicker from '../../../components/DatePicker';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  getVideo,
  createVideo,
  updateVideo,
  getCategoriasContenido,
  uploadContenidoImage,
  getTagsGlobales,
  getTagsDeContenido,
  CategoriaContenido,
  TagGlobal,
} from '../../../services/api';
import { useIdiomas } from '../../../services/idiomas';
import { contenidoStyles } from './sharedStyles';

const Icons = {
  back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  save: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  video: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  image: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  tag: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  folder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  edit: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};


// Plataformas de video
const PLATAFORMAS = [
  { value: 'youtube', label: 'YouTube', color: '#FF0000' },
  { value: 'vimeo', label: 'Vimeo', color: '#1AB7EA' },
  { value: 'mp4', label: 'MP4', color: '#10B981' },
  { value: 'embed', label: 'Embed', color: '#8B5CF6' },
];

interface Traducciones {
  [idioma: string]: {
    titulo?: string;
    descripcion?: string;
  };
}

export default function CrmVideoEditor() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id?: string }>();
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();
  const { idiomas } = useIdiomas(tenantActual?.id);

  const isEditing = id && id !== 'nuevo';

  const [categorias, setCategorias] = useState<CategoriaContenido[]>([]);
  const [tagsGlobales, setTagsGlobales] = useState<TagGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Idioma activo para traducciones
  const [idiomaActivo, setIdiomaActivo] = useState('es');

  const [duracion, setDuracion] = useState({ horas: 0, minutos: 0, segundos: 0 });

  const [formData, setFormData] = useState({
    slug: '',
    idioma: 'es',
    titulo: '',
    descripcion: '',
    categoriaId: '',
    tipoVideo: 'youtube',
    videoUrl: '',
    videoId: '',
    embedCode: '',
    thumbnail: '',
    duracionSegundos: 0,
    tagIds: [] as string[],
    publicado: true,
    destacado: false,
    fechaPublicacion: '',
    orden: 0,
  });

  // Traducciones separadas del form principal
  const [traducciones, setTraducciones] = useState<Traducciones>({});

  // Ref para mantener handleSave actualizado
  const handleSaveRef = useRef<() => void>(() => {});

  // Header - usa el ref para evitar stale closure
  useEffect(() => {
    setPageHeader({
      title: isEditing ? 'Editar Video' : 'Nuevo Video',
      subtitle: isEditing ? 'Actualiza la información del video' : 'Agrega un nuevo video a tu galería',
      actions: (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate(`/crm/${tenantSlug}/contenido?tab=videos`)} className="btn-secondary">
            {Icons.back}
            <span>Volver</span>
          </button>
          <button onClick={() => handleSaveRef.current()} className="btn-primary" disabled={saving}>
            {Icons.save}
            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      ),
    });
  }, [setPageHeader, isEditing, saving, tenantSlug, navigate]);

  // Cargar datos
  useEffect(() => {
    if (!tenantActual?.id) return;
    loadInitialData();
  }, [tenantActual?.id, id]);

  // Convertir duración
  const segundosADuracion = (segundos: number) => ({
    horas: Math.floor(segundos / 3600),
    minutos: Math.floor((segundos % 3600) / 60),
    segundos: segundos % 60,
  });

  const duracionASegundos = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;

  useEffect(() => {
    const segundos = duracionASegundos(duracion.horas, duracion.minutos, duracion.segundos);
    setFormData(prev => ({ ...prev, duracionSegundos: segundos }));
  }, [duracion]);

  const loadInitialData = async () => {
    if (!tenantActual?.id) return;
    setLoading(true);
    setError(null);

    try {
      const categoriasData = await getCategoriasContenido(tenantActual.id, 'video');
      setCategorias(categoriasData);

      await loadTags();

      if (isEditing && id) {
        const video = await getVideo(tenantActual.id, id);

        let tagIds: string[] = [];
        try {
          const token = await getToken();
          const videoTags = await getTagsDeContenido(tenantActual.id, 'video', id, token);
          tagIds = videoTags.map(t => t.id);
        } catch {
          tagIds = (video as any).tagIds || [];
        }

        setFormData({
          slug: video.slug,
          idioma: video.idioma,
          titulo: video.titulo,
          descripcion: video.descripcion || '',
          categoriaId: video.categoriaId || '',
          tipoVideo: video.tipoVideo,
          videoUrl: video.videoUrl,
          videoId: video.videoId || '',
          embedCode: video.embedCode || '',
          thumbnail: video.thumbnail || '',
          duracionSegundos: video.duracionSegundos || 0,
          tagIds,
          publicado: video.publicado,
          destacado: video.destacado,
          fechaPublicacion: video.fechaPublicacion ? new Date(video.fechaPublicacion).toISOString().split('T')[0] : '',
          orden: video.orden,
        });

        setDuracion(segundosADuracion(video.duracionSegundos || 0));

        // Cargar traducciones existentes
        if (video.traducciones) {
          setTraducciones(video.traducciones as Traducciones);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    if (!tenantActual?.id) return;
    try {
      setLoadingTags(true);
      const token = await getToken();
      const tagsData = await getTagsGlobales(tenantActual.id, { activo: true }, token);
      setTagsGlobales(tagsData);
    } catch {
      setTagsGlobales([]);
    } finally {
      setLoadingTags(false);
    }
  };

  const generateSlug = (titulo: string) => {
    return titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleThumbnailUpload = async (file: File) => {
    if (!tenantActual?.id) return;
    try {
      setUploadingThumbnail(true);
      const token = await getToken();
      const result = await uploadContenidoImage(tenantActual.id, file, token);
      setFormData(prev => ({ ...prev, thumbnail: result.url }));
    } catch (err: any) {
      setError(err.message || 'Error al subir imagen');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Actualizar traducción de un idioma específico
  const handleTraduccionChange = (idioma: string, campo: 'titulo' | 'descripcion', valor: string) => {
    setTraducciones(prev => ({
      ...prev,
      [idioma]: {
        ...prev[idioma],
        [campo]: valor,
      },
    }));
  };

  const handleSave = useCallback(async () => {
    if (!tenantActual?.id || !formData.titulo || !formData.videoUrl) {
      setError('Título y URL del video son requeridos');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Limpiar traducciones vacías
      const traduccionesLimpias: Traducciones = {};
      Object.entries(traducciones).forEach(([idioma, contenido]) => {
        if (contenido.titulo || contenido.descripcion) {
          traduccionesLimpias[idioma] = contenido;
        }
      });

      const videoData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.titulo),
        categoriaId: formData.categoriaId || undefined,
        tagIds: formData.tagIds || [],
        fechaPublicacion: formData.fechaPublicacion || undefined,
        traducciones: Object.keys(traduccionesLimpias).length > 0 ? traduccionesLimpias : undefined,
      };

      if (isEditing && id) {
        await updateVideo(tenantActual.id, id, videoData);
      } else {
        await createVideo(tenantActual.id, videoData);
      }

      navigate(`/crm/${tenantSlug}/contenido?tab=videos`);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [tenantActual?.id, formData, traducciones, isEditing, id, tenantSlug, navigate]);

  // Mantener el ref actualizado con la última versión de handleSave
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
        <style>{contenidoStyles}</style>
      </div>
    );
  }

  return (
    <div className="page editor-page">
      <style>{contenidoStyles}</style>
      <style>{`
        .editor-page {
          width: 100%;
          padding-bottom: 40px;
        }

        .editor-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
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
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
        }

        .editor-section h4 {
          margin: 0 0 16px 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .editor-section h4 svg {
          color: #64748b;
        }

        /* Idioma tabs */
        .idioma-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0;
        }

        .idioma-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }

        .idioma-tab:hover {
          color: #3b82f6;
        }

        .idioma-tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .idioma-tab .flag {
          font-size: 1.1rem;
        }

        .idioma-tab .has-content {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }

        .traduccion-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Slug preview */
        .slug-preview {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          padding: 8px 12px;
          background: #f1f5f9;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #64748b;
        }

        .slug-preview code {
          background: #e2e8f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #475569;
        }

        /* Video URL section */
        .video-url-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .plataforma-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .plataforma-option {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
          color: #64748b;
        }

        .plataforma-option:hover {
          border-color: #cbd5e1;
        }

        .plataforma-option.selected {
          border-color: var(--plat-color, #3b82f6);
          background: color-mix(in srgb, var(--plat-color, #3b82f6) 10%, white);
          color: var(--plat-color, #3b82f6);
        }

        .plataforma-option .plat-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        /* Duración inputs */
        .duracion-inputs {
          display: flex;
          gap: 8px;
          align-items: center;
          background: #f8fafc;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .duracion-field {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .duracion-field input {
          width: 60px;
          padding: 10px 6px;
          text-align: center;
          font-size: 1.1rem;
          font-weight: 700;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
        }

        .duracion-field input:focus {
          border-color: #3b82f6;
          outline: none;
        }

        .duracion-field label {
          font-size: 0.7rem;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
        }

        .duracion-separator {
          font-size: 1.25rem;
          color: #cbd5e1;
          font-weight: bold;
          margin-top: -16px;
        }

        /* Miniatura upload */
        .miniatura-upload {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #f8fafc;
          position: relative;
        }

        .miniatura-upload:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .miniatura-upload.has-image {
          padding: 12px;
          border-style: solid;
        }

        .miniatura-upload img {
          max-width: 100%;
          max-height: 200px;
          border-radius: 8px;
          object-fit: cover;
        }

        .miniatura-upload .remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #ef4444;
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .miniatura-upload .remove-btn:hover {
          background: #dc2626;
        }

        /* Categoria selector */
        .categoria-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .categoria-option {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
          color: #64748b;
        }

        .categoria-option:hover {
          border-color: #cbd5e1;
        }

        .categoria-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .categoria-option .cat-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        /* Toggle Cards */
        .toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.25s ease;
          margin-bottom: 10px;
        }

        .toggle-card:last-child {
          margin-bottom: 0;
        }

        .toggle-card:hover {
          border-color: #cbd5e1;
        }

        .toggle-card.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .toggle-card.active.warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
        }

        .toggle-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .toggle-title {
          font-weight: 600;
          font-size: 0.9rem;
          color: #374151;
        }

        .toggle-card.active .toggle-title {
          color: white;
        }

        .toggle-subtitle {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .toggle-card.active .toggle-subtitle {
          color: rgba(255, 255, 255, 0.8);
        }

        .toggle-switch {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          background: #cbd5e1;
          position: relative;
          transition: all 0.25s ease;
          flex-shrink: 0;
        }

        .toggle-card.active .toggle-switch {
          background: rgba(255, 255, 255, 0.3);
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          top: 2px;
          left: 2px;
          transition: all 0.25s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-card.active .toggle-switch::after {
          left: 22px;
        }

        /* ReactQuill customization - letras más grandes */
        .quill-container .ql-editor {
          font-size: 1rem;
          line-height: 1.6;
          min-height: 180px;
        }

        .quill-container .ql-editor p {
          font-size: 1rem;
        }

        .quill-container .ql-toolbar {
          border-radius: 8px 8px 0 0;
          border-color: #e2e8f0;
          background: #f8fafc;
        }

        .quill-container .ql-container {
          border-radius: 0 0 8px 8px;
          border-color: #e2e8f0;
          font-size: 1rem;
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #475569;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
      `}</style>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="editor-grid">
        {/* Columna Principal */}
        <div className="editor-main">
          {/* Información Básica */}
          <div className="editor-section">
            <h4>{Icons.video} Información Básica</h4>

            {/* Tabs de idioma */}
            <div className="idioma-tabs">
              {idiomas.map(idioma => {
                const tieneContenido = idioma.code === 'es'
                  ? formData.titulo || formData.descripcion
                  : traducciones[idioma.code]?.titulo || traducciones[idioma.code]?.descripcion;
                return (
                  <button
                    key={idioma.code}
                    type="button"
                    className={`idioma-tab ${idiomaActivo === idioma.code ? 'active' : ''}`}
                    onClick={() => setIdiomaActivo(idioma.code)}
                  >
                    <span className="flag">{idioma.flagEmoji}</span>
                    <span>{idioma.labelNativo}</span>
                    {tieneContenido && <span className="has-content" />}
                  </button>
                );
              })}
            </div>

            {/* Campos según idioma activo */}
            <div className="traduccion-fields">
              {idiomaActivo === 'es' ? (
                <>
                  <div className="form-group">
                    <label>Título *</label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) => {
                        setFormData({ ...formData, titulo: e.target.value });
                        if (!isEditing) {
                          setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                        }
                      }}
                      placeholder="Título del video"
                    />
                    {formData.slug && (
                      <div className="slug-preview">
                        <span>Slug:</span>
                        <code>{formData.slug}</code>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Título en {idiomas.find(i => i.code === idiomaActivo)?.labelNativo}</label>
                    <input
                      type="text"
                      value={traducciones[idiomaActivo]?.titulo || ''}
                      onChange={(e) => handleTraduccionChange(idiomaActivo, 'titulo', e.target.value)}
                      placeholder={`Traducción del título en ${idiomas.find(i => i.code === idiomaActivo)?.labelNativo}`}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Video URL y Plataforma */}
          <div className="editor-section">
            <h4>{Icons.video} Detalles del Video</h4>
            <div className="video-url-section">
              <div className="form-group">
                <label>URL del Video *</label>
                <input
                  type="text"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/..."
                />
              </div>

              <div className="form-group">
                <label>Plataforma</label>
                <div className="plataforma-selector">
                  {PLATAFORMAS.map(plat => (
                    <div
                      key={plat.value}
                      className={`plataforma-option ${formData.tipoVideo === plat.value ? 'selected' : ''}`}
                      style={{ '--plat-color': plat.color } as React.CSSProperties}
                      onClick={() => setFormData({ ...formData, tipoVideo: plat.value })}
                    >
                      <span className="plat-dot" style={{ background: plat.color }} />
                      {plat.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Duración</label>
                <div className="duracion-inputs">
                  <div className="duracion-field">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={duracion.horas}
                      onChange={(e) => setDuracion({ ...duracion, horas: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })}
                    />
                    <label>Horas</label>
                  </div>
                  <span className="duracion-separator">:</span>
                  <div className="duracion-field">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={duracion.minutos}
                      onChange={(e) => setDuracion({ ...duracion, minutos: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                    />
                    <label>Min</label>
                  </div>
                  <span className="duracion-separator">:</span>
                  <div className="duracion-field">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={duracion.segundos}
                      onChange={(e) => setDuracion({ ...duracion, segundos: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                    />
                    <label>Seg</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="editor-section">
            <h4>{Icons.edit} Descripción</h4>
            {idiomaActivo === 'es' ? (
              <div className="form-group quill-container" style={{ marginBottom: 0 }}>
                <ReactQuill
                  theme="snow"
                  value={formData.descripcion}
                  onChange={(value) => setFormData({ ...formData, descripcion: value })}
                  placeholder="Describe el contenido del video..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link'],
                      ['clean']
                    ],
                  }}
                />
              </div>
            ) : (
              <div className="form-group quill-container" style={{ marginBottom: 0 }}>
                <ReactQuill
                  theme="snow"
                  value={traducciones[idiomaActivo]?.descripcion || ''}
                  onChange={(value) => handleTraduccionChange(idiomaActivo, 'descripcion', value)}
                  placeholder={`Descripción en ${idiomas.find(i => i.code === idiomaActivo)?.labelNativo}...`}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link'],
                      ['clean']
                    ],
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="editor-sidebar">
          {/* Miniatura */}
          <div className="editor-section">
            <h4>{Icons.image} Miniatura</h4>
            <div
              className={`miniatura-upload ${formData.thumbnail ? 'has-image' : ''}`}
              onClick={() => !formData.thumbnail && document.getElementById('thumbnailInput')?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '#cbd5e1';
                const file = e.dataTransfer.files[0];
                if (file?.type.startsWith('image/')) handleThumbnailUpload(file);
              }}
            >
              {formData.thumbnail ? (
                <>
                  <img src={formData.thumbnail} alt="Miniatura" />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, thumbnail: '' }); }}
                  >
                    ×
                  </button>
                </>
              ) : (
                <div>
                  <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '0.9rem' }}>
                    {uploadingThumbnail ? 'Subiendo...' : 'Arrastra o haz clic'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>16:9 - PNG, JPG, WEBP</p>
                </div>
              )}
              <input
                id="thumbnailInput"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleThumbnailUpload(file);
                }}
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="editor-section">
            <h4>{Icons.folder} Categoría</h4>
            <div className="categoria-selector">
              <div
                className={`categoria-option ${!formData.categoriaId ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, categoriaId: '' })}
              >
                Sin categoría
              </div>
              {categorias.map(cat => (
                <div
                  key={cat.id}
                  className={`categoria-option ${formData.categoriaId === cat.id ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, categoriaId: cat.id })}
                >
                  {cat.color && <span className="cat-color" style={{ background: cat.color }} />}
                  {cat.nombre}
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="editor-section">
            <h4>{Icons.tag} Tags</h4>
            <TagSelector
              value={formData.tagIds}
              onChange={(tagIds) => setFormData({ ...formData, tagIds })}
              placeholder="Seleccionar tags..."
              tags={tagsGlobales}
              loading={loadingTags}
              tenantId={tenantActual?.id}
            />
          </div>

          {/* Publicación */}
          <div className="editor-section">
            <h4>{Icons.settings} Publicación</h4>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>Fecha de Publicación</label>
              <DatePicker
                value={formData.fechaPublicacion || null}
                onChange={(date) => setFormData({ ...formData, fechaPublicacion: date || '' })}
                placeholder="Seleccionar fecha"
                clearable
              />
            </div>
            <div
              className={`toggle-card ${formData.publicado ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, publicado: !formData.publicado })}
            >
              <div className="toggle-content">
                <span className="toggle-title">{formData.publicado ? 'Publicado' : 'Borrador'}</span>
                <span className="toggle-subtitle">{formData.publicado ? 'Visible en el sitio' : 'Solo visible en el CRM'}</span>
              </div>
              <div className="toggle-switch" />
            </div>
            <div
              className={`toggle-card warning ${formData.destacado ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, destacado: !formData.destacado })}
            >
              <div className="toggle-content">
                <span className="toggle-title">{formData.destacado ? 'Destacado' : 'Normal'}</span>
                <span className="toggle-subtitle">{formData.destacado ? 'Aparece en destacados' : 'Listado normal'}</span>
              </div>
              <div className="toggle-switch" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
