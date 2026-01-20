/**
 * CrmArticuloEditor - Editor de Artículos
 *
 * Layout de dos columnas con:
 * - Columna principal: Información básica, contenido (ReactQuill)
 * - Sidebar: Portada, Categoría, Tags, Autor, SEO, Publicación
 * - Soporte multi-idioma con tabs de traducciones
 * - Banco de imágenes para insertar en el contenido
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageHeader } from '../../../layouts/CrmLayout';
import UserPicker from '../../../components/UserPicker';
import TagSelector from '../../../components/TagSelector';
import DatePicker from '../../../components/DatePicker';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  getArticulo,
  createArticulo,
  updateArticulo,
  getCategoriasContenido,
  uploadContenidoImage,
  getUsuariosTenant,
  getTagsGlobales,
  getTagsDeContenido,
  CategoriaContenido,
  UsuarioTenant,
  TagGlobal,
} from '../../../services/api';
import { useIdiomas } from '../../../services/idiomas';
import { contenidoStyles } from './sharedStyles';

const Icons = {
  back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  save: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  image: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  folder: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  tag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  search: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  copy: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  edit: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  images: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>,
};

// Los idiomas ahora se cargan dinámicamente desde el hook useIdiomas

interface Traducciones {
  [idioma: string]: {
    titulo?: string;
    extracto?: string;
    contenido?: string;
    metaTitulo?: string;
    metaDescripcion?: string;
  };
}

export default function CrmArticuloEditor() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id?: string }>();
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const { tenantActual, user } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Cargar idiomas dinámicamente desde el tenant
  const { idiomas } = useIdiomas(tenantActual?.id);

  const isEditing = id && id !== 'nuevo';

  // Fecha actual en formato YYYY-MM-DD
  const todayDate = new Date().toISOString().split('T')[0];

  // Estado de idioma activo
  const [idiomaActivo, setIdiomaActivo] = useState('es');

  // Datos
  const [categorias, setCategorias] = useState<CategoriaContenido[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioTenant[]>([]);
  const [tagsGlobales, setTagsGlobales] = useState<TagGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBancoImage, setUploadingBancoImage] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState(() => ({
    slug: '',
    idioma: 'es',
    titulo: '',
    extracto: '',
    contenido: '',
    categoriaId: '',
    imagenPrincipal: '',
    imagenes: [] as string[],
    autorId: '',
    metaTitulo: '',
    metaDescripcion: '',
    tagIds: [] as string[],
    publicado: false,
    destacado: false,
    // Inicializar con fecha de hoy para artículos nuevos
    fechaPublicacion: new Date().toISOString().split('T')[0],
  }));

  // Traducciones separadas
  const [traducciones, setTraducciones] = useState<Traducciones>({});

  // Ref para evitar stale closure en el header
  const handleSaveRef = useRef<() => void>(() => {});

  // Header
  useEffect(() => {
    setPageHeader({
      title: isEditing ? 'Editar Artículo' : 'Nuevo Artículo',
      subtitle: isEditing ? 'Actualiza la información del artículo' : 'Crea un nuevo artículo para tu blog',
      actions: (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate(`/crm/${tenantSlug}/contenido?tab=articulos`)} className="btn-secondary">
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
  }, [setPageHeader, isEditing, saving, tenantSlug]);

  // Cargar datos iniciales
  useEffect(() => {
    if (!tenantActual?.id) return;
    loadInitialData();
  }, [tenantActual?.id, id]);

  // Preseleccionar autor cuando user esté disponible (para artículos nuevos)
  useEffect(() => {
    if (!isEditing && user?.id && !formData.autorId) {
      setFormData(prev => ({
        ...prev,
        autorId: user.id,
      }));
    }
  }, [user?.id, isEditing, formData.autorId]);

  const loadInitialData = async () => {
    if (!tenantActual?.id) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const [categoriasData, usuariosData] = await Promise.all([
        getCategoriasContenido(tenantActual.id, 'articulo'),
        getUsuariosTenant(tenantActual.id, token),
      ]);
      setCategorias(categoriasData);
      setUsuarios(usuariosData);

      // Cargar tags
      await loadTags();

      // Si es nuevo artículo, preseleccionar autor (usuario actual) y fecha de hoy
      if (!isEditing && user?.id) {
        setFormData(prev => ({
          ...prev,
          autorId: user.id,
          fechaPublicacion: todayDate,
        }));
      }

      // Si es edición, cargar artículo
      if (isEditing && id) {
        const articulo = await getArticulo(tenantActual.id, id);

        // Cargar tags del artículo
        let tagIds: string[] = [];
        try {
          const token = await getToken();
          const articuloTags = await getTagsDeContenido(tenantActual.id, 'articulo', id, token);
          tagIds = articuloTags.map(t => t.id);
        } catch (err) {
          tagIds = (articulo as any).tagIds || [];
        }

        // Mapear campos soportando tanto snake_case (API) como camelCase
        const art = articulo as any;
        setFormData({
          slug: art.slug,
          idioma: art.idioma,
          titulo: art.titulo,
          extracto: art.extracto || '',
          contenido: art.contenido,
          categoriaId: art.categoria_id || art.categoriaId || '',
          imagenPrincipal: art.imagen_principal || art.imagenPrincipal || '',
          imagenes: art.imagenes || [],
          autorId: art.autor_id || art.autorId || '',
          metaTitulo: art.meta_titulo || art.metaTitulo || '',
          metaDescripcion: art.meta_descripcion || art.metaDescripcion || '',
          tagIds,
          publicado: art.publicado,
          destacado: art.destacado,
          fechaPublicacion: (art.fecha_publicacion || art.fechaPublicacion) ? new Date(art.fecha_publicacion || art.fechaPublicacion).toISOString().split('T')[0] : '',
        });

        // Cargar traducciones si existen
        if ((articulo as any).traducciones) {
          setTraducciones((articulo as any).traducciones);
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
    } catch (err) {
      setTagsGlobales([]);
    } finally {
      setLoadingTags(false);
    }
  };

  const generateSlug = (titulo: string) => {
    return titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTituloChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      titulo: value,
      slug: !isEditing ? generateSlug(value) : prev.slug,
    }));
  };

  const handleTraduccionChange = (idioma: string, campo: string, valor: string) => {
    setTraducciones(prev => ({
      ...prev,
      [idioma]: {
        ...prev[idioma],
        [campo]: valor,
      },
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (!tenantActual?.id) return;
    try {
      setUploadingImage(true);
      const token = await getToken();
      const result = await uploadContenidoImage(tenantActual.id, file, token);
      setFormData(prev => ({ ...prev, imagenPrincipal: result.url }));
    } catch (err: any) {
      setError(err.message || 'Error al subir imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBancoImageUpload = async (file: File) => {
    if (!tenantActual?.id) return;
    try {
      setUploadingBancoImage(true);
      const token = await getToken();
      const result = await uploadContenidoImage(tenantActual.id, file, token);
      setFormData(prev => ({
        ...prev,
        imagenes: [...prev.imagenes, result.url],
      }));
    } catch (err: any) {
      setError(err.message || 'Error al subir imagen');
    } finally {
      setUploadingBancoImage(false);
    }
  };

  const handleRemoveBancoImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index),
    }));
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Helper para verificar si un HTML de ReactQuill tiene contenido real
  const tieneContenidoReal = (html: string | undefined): boolean => {
    if (!html) return false;
    // Remover tags HTML y espacios para ver si hay texto real
    const textoLimpio = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return textoLimpio.length > 0;
  };

  const handleSave = useCallback(async () => {
    if (!tenantActual?.id || !formData.titulo) {
      setError('Título es requerido');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Limpiar traducciones vacías (verificar contenido real, no solo tags HTML vacíos)
      const traduccionesLimpias: typeof traducciones = {};
      Object.entries(traducciones).forEach(([idioma, contenido]) => {
        const tieneTitulo = contenido.titulo && contenido.titulo.trim().length > 0;
        const tieneContenido = tieneContenidoReal(contenido.contenido);
        const tieneExtracto = contenido.extracto && contenido.extracto.trim().length > 0;
        if (tieneTitulo || tieneContenido || tieneExtracto) {
          // Solo incluir campos con contenido real
          traduccionesLimpias[idioma] = {
            ...(tieneTitulo ? { titulo: contenido.titulo } : {}),
            ...(tieneContenido ? { contenido: contenido.contenido } : {}),
            ...(tieneExtracto ? { extracto: contenido.extracto } : {}),
          };
        }
      });

      const articuloData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.titulo),
        categoriaId: formData.categoriaId || undefined,
        imagenes: formData.imagenes.filter(img => img.trim()),
        tagIds: formData.tagIds.filter(id => id.trim()),
        autorId: formData.autorId || undefined,
        fechaPublicacion: formData.fechaPublicacion || undefined,
        traducciones: Object.keys(traduccionesLimpias).length > 0 ? traduccionesLimpias : undefined,
      };

      if (isEditing && id) {
        await updateArticulo(tenantActual.id, id, articuloData);
      } else {
        await createArticulo(tenantActual.id, articuloData);
      }

      navigate(`/crm/${tenantSlug}/contenido?tab=articulos`);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [tenantActual?.id, formData, traducciones, isEditing, id, tenantSlug, navigate]);

  // Mantener ref actualizado
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

        .editor-main {
          display: flex;
          flex-direction: column;
          gap: 24px;
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
          overflow: visible;
        }

        .editor-section h4 {
          margin: 0 0 16px 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Tabs de idioma */
        .idioma-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 10px;
        }

        .idioma-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }

        .idioma-tab:hover {
          background: rgba(255, 255, 255, 0.5);
        }

        .idioma-tab.active {
          background: white;
          color: #1e293b;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .idioma-tab .flag {
          font-size: 1.1rem;
        }

        /* ReactQuill mejorado */
        .quill-container {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .quill-container .ql-toolbar {
          border: none;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .quill-container .ql-container {
          border: none;
          font-size: 1rem;
        }

        .quill-container .ql-editor {
          min-height: 300px;
          font-size: 1rem;
          line-height: 1.7;
        }

        .quill-container .ql-editor p {
          margin-bottom: 1em;
        }

        /* Imagen principal */
        .image-upload-area {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #f8fafc;
        }

        .image-upload-area:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .image-upload-area.has-image {
          padding: 12px;
          border-style: solid;
        }

        .image-upload-area img {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
          border-radius: 8px;
        }

        .image-upload-area .remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
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

        .image-upload-area .remove-btn:hover {
          background: #ef4444;
        }

        /* Banco de imágenes */
        .banco-imagenes {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .banco-imagen-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          cursor: pointer;
        }

        .banco-imagen-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .banco-imagen-item .banco-imagen-actions {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .banco-imagen-item:hover .banco-imagen-actions {
          opacity: 1;
        }

        .banco-imagen-actions button {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .banco-imagen-actions .copy-btn {
          background: white;
          color: #1e293b;
        }

        .banco-imagen-actions .copy-btn:hover {
          background: #10b981;
          color: white;
        }

        .banco-imagen-actions .copy-btn.copied {
          background: #10b981;
          color: white;
        }

        .banco-imagen-actions .delete-btn {
          background: #ef4444;
          color: white;
        }

        .banco-imagen-actions .delete-btn:hover {
          background: #dc2626;
        }

        .banco-add-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          aspect-ratio: 1;
          cursor: pointer;
          transition: all 0.2s;
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .banco-add-btn:hover {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #3b82f6;
        }

        /* Categoría selector visual */
        .categoria-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .categoria-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .categoria-option:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .categoria-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .categoria-option .cat-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
        }

        .categoria-option.selected .cat-icon {
          background: #dbeafe;
        }

        .categoria-option .cat-name {
          flex: 1;
          font-weight: 500;
          color: #334155;
        }

        .categoria-option.selected .cat-name {
          color: #1e40af;
        }

        .categoria-option .cat-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .categoria-option.selected .cat-check {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
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
          transition: all 0.2s;
          margin-bottom: 10px;
        }

        .toggle-card:hover {
          border-color: #cbd5e1;
        }

        .toggle-card.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: transparent;
        }

        .toggle-card.active.warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .toggle-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .toggle-title {
          font-weight: 600;
          font-size: 0.9rem;
          color: #334155;
        }

        .toggle-card.active .toggle-title {
          color: white;
        }

        .toggle-subtitle {
          font-size: 0.75rem;
          color: #64748b;
        }

        .toggle-card.active .toggle-subtitle {
          color: rgba(255, 255, 255, 0.8);
        }

        .toggle-switch {
          width: 44px;
          height: 24px;
          background: #cbd5e1;
          border-radius: 12px;
          position: relative;
          transition: all 0.2s;
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
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-card.active .toggle-switch::after {
          left: 22px;
        }

        /* Botones */
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

        @media (max-width: 1024px) {
          .editor-grid {
            grid-template-columns: 1fr;
          }

          .editor-sidebar {
            order: -1;
          }
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
          {/* Información Básica con tabs de idioma */}
          <div className="editor-section">
            <h4>{Icons.edit} Información Básica</h4>

            {/* Tabs de idioma */}
            <div className="idioma-tabs">
              {idiomas.map(idioma => (
                <button
                  key={idioma.code}
                  className={`idioma-tab ${idiomaActivo === idioma.code ? 'active' : ''}`}
                  onClick={() => setIdiomaActivo(idioma.code)}
                >
                  <span className="flag">{idioma.flagEmoji}</span>
                  <span>{idioma.labelNativo}</span>
                </button>
              ))}
            </div>

            {idiomaActivo === 'es' ? (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Título *</label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) => handleTituloChange(e.target.value)}
                      placeholder="Título del artículo"
                    />
                  </div>
                  <div className="form-group">
                    <label>Slug (URL)</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="url-amigable"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Extracto</label>
                  <textarea
                    value={formData.extracto}
                    onChange={(e) => setFormData({ ...formData, extracto: e.target.value })}
                    placeholder="Resumen breve del artículo para listados y previews..."
                    rows={3}
                  />
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
                <div className="form-group">
                  <label>Extracto en {idiomas.find(i => i.code === idiomaActivo)?.labelNativo}</label>
                  <textarea
                    value={traducciones[idiomaActivo]?.extracto || ''}
                    onChange={(e) => handleTraduccionChange(idiomaActivo, 'extracto', e.target.value)}
                    placeholder={`Traducción del extracto en ${idiomas.find(i => i.code === idiomaActivo)?.labelNativo}`}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          {/* Contenido */}
          <div className="editor-section">
            <h4>{Icons.edit} Contenido {idiomaActivo !== 'es' && `(${idiomas.find(i => i.code === idiomaActivo)?.labelNativo})`}</h4>
            <div className="quill-container">
              {idiomaActivo === 'es' ? (
                <ReactQuill
                  theme="snow"
                  value={formData.contenido}
                  onChange={(value) => setFormData({ ...formData, contenido: value })}
                  placeholder="Escribe el contenido del artículo..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'color': [] }, { 'background': [] }],
                      ['blockquote', 'code-block'],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                />
              ) : (
                <ReactQuill
                  key={`contenido-${idiomaActivo}`}
                  theme="snow"
                  value={traducciones[idiomaActivo]?.contenido || ''}
                  onChange={(value) => handleTraduccionChange(idiomaActivo, 'contenido', value)}
                  placeholder={`Traducción del contenido en ${idiomas.find(i => i.code === idiomaActivo)?.labelNativo}...`}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'color': [] }, { 'background': [] }],
                      ['blockquote', 'code-block'],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                />
              )}
            </div>
          </div>

          {/* Banco de Imágenes */}
          <div className="editor-section">
            <h4>{Icons.images} Banco de Imágenes</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Sube imágenes y copia su URL para insertarlas en el contenido
            </p>
            <div className="banco-imagenes">
              {formData.imagenes.map((url, index) => (
                <div key={index} className="banco-imagen-item">
                  <img src={url} alt={`Imagen ${index + 1}`} />
                  <div className="banco-imagen-actions">
                    <button
                      className={`copy-btn ${copiedUrl === url ? 'copied' : ''}`}
                      onClick={() => handleCopyUrl(url)}
                      title="Copiar URL"
                    >
                      {copiedUrl === url ? '✓' : Icons.copy}
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleRemoveBancoImage(index)}
                      title="Eliminar"
                    >
                      {Icons.x}
                    </button>
                  </div>
                </div>
              ))}
              <label className="banco-add-btn">
                {uploadingBancoImage ? (
                  <div className="spinner" style={{ width: 20, height: 20 }} />
                ) : (
                  <>
                    {Icons.plus}
                    <span>Agregar</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBancoImageUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          {/* SEO con idiomas */}
          <div className="editor-section">
            <h4>{Icons.search} SEO {idiomaActivo !== 'es' && `(${idiomas.find(i => i.code === idiomaActivo)?.labelNativo})`}</h4>
            {idiomaActivo === 'es' ? (
              <>
                <div className="form-group">
                  <label>Meta Título</label>
                  <input
                    type="text"
                    value={formData.metaTitulo}
                    onChange={(e) => setFormData({ ...formData, metaTitulo: e.target.value })}
                    placeholder="Título para buscadores (60 caracteres recomendados)"
                  />
                </div>
                <div className="form-group">
                  <label>Meta Descripción</label>
                  <textarea
                    value={formData.metaDescripcion}
                    onChange={(e) => setFormData({ ...formData, metaDescripcion: e.target.value })}
                    placeholder="Descripción para buscadores (160 caracteres recomendados)"
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Meta Título en {idiomas.find(i => i.code === idiomaActivo)?.labelNativo}</label>
                  <input
                    type="text"
                    value={traducciones[idiomaActivo]?.metaTitulo || ''}
                    onChange={(e) => handleTraduccionChange(idiomaActivo, 'metaTitulo', e.target.value)}
                    placeholder="Título SEO traducido"
                  />
                </div>
                <div className="form-group">
                  <label>Meta Descripción en {idiomas.find(i => i.code === idiomaActivo)?.labelNativo}</label>
                  <textarea
                    value={traducciones[idiomaActivo]?.metaDescripcion || ''}
                    onChange={(e) => handleTraduccionChange(idiomaActivo, 'metaDescripcion', e.target.value)}
                    placeholder="Descripción SEO traducida"
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="editor-sidebar">
          {/* Portada */}
          <div className="editor-section">
            <h4>{Icons.image} Portada</h4>
            <div
              className={`image-upload-area ${formData.imagenPrincipal ? 'has-image' : ''}`}
              onClick={() => !formData.imagenPrincipal && document.getElementById('portadaInput')?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '#cbd5e1';
                const file = e.dataTransfer.files[0];
                if (file?.type.startsWith('image/')) handleImageUpload(file);
              }}
            >
              {formData.imagenPrincipal ? (
                <div style={{ position: 'relative' }}>
                  <img src={formData.imagenPrincipal} alt="Portada" />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, imagenPrincipal: '' }); }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '0.9rem' }}>
                    {uploadingImage ? 'Subiendo...' : 'Arrastra o haz clic'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>PNG, JPG, WEBP</p>
                </div>
              )}
              <input
                id="portadaInput"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
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
                <div className="cat-icon">📁</div>
                <span className="cat-name">Sin categoría</span>
                <div className="cat-check">{!formData.categoriaId && '✓'}</div>
              </div>
              {categorias.map(cat => (
                <div
                  key={cat.id}
                  className={`categoria-option ${formData.categoriaId === cat.id ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, categoriaId: cat.id })}
                >
                  <div className="cat-icon">{cat.icono || '📂'}</div>
                  <span className="cat-name">{cat.nombre}</span>
                  <div className="cat-check">{formData.categoriaId === cat.id && '✓'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Autor */}
          <div className="editor-section">
            <h4>{Icons.user} Autor</h4>
            <UserPicker
              value={formData.autorId || null}
              onChange={(userId) => setFormData({ ...formData, autorId: userId || '' })}
              placeholder="Seleccionar autor..."
              users={usuarios}
              loading={loading}
              clearable
            />
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
            <div className="form-group">
              <label>Fecha de Publicación</label>
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
                <span className="toggle-subtitle">{formData.destacado ? 'Aparece en sección destacados' : 'Aparece en listado normal'}</span>
              </div>
              <div className="toggle-switch" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
