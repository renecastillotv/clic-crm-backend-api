/**
 * CrmContenido - Centro Unificado de Contenido
 *
 * 7 tabs internos para gestionar todo el contenido:
 * - Artículos, Videos, FAQs, Testimonios, SEO Stats (navegan a editores)
 * - Categorías y Relacionar (funcionan inline)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import * as LucideIcons from 'lucide-react';
import {
  getArticulos,
  getVideos,
  getFaqs,
  getTestimonios,
  getSeoStats,
  getCategoriasContenido,
  createCategoriaContenido,
  updateCategoriaContenido,
  deleteCategoriaContenido,
  getRelacionesContenido,
  createRelacionContenido,
  deleteRelacionContenido,
  deleteArticulo,
  deleteVideo,
  deleteFaq,
  deleteTestimonio,
  deleteSeoStat,
  updateArticulo,
  updateVideo,
  updateFaq,
  updateTestimonio,
  updateSeoStat,
  getPropiedadesCrm,
  Articulo,
  Video,
  FAQ,
  Testimonio,
  SeoStat,
  CategoriaContenido,
  ContenidoRelacion,
  Propiedad,
} from '../../services/api';
import { contenidoStyles } from './contenido/sharedStyles';
import { stripHtml } from './contenido/utils';

type TabType = 'articulos' | 'videos' | 'faqs' | 'testimonios' | 'seo' | 'categorias' | 'relacionar';

const TIPOS_CONTENIDO = [
  { value: 'articulo', label: 'Artículo' },
  { value: 'video', label: 'Video' },
  { value: 'testimonio', label: 'Testimonio' },
  { value: 'faq', label: 'FAQ' },
  { value: 'seo_stats', label: 'SEO Stats' },
];

const Icons = {
  search: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  link: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  articulo: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  video: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  faq: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  testimonio: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  seo: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  categoria: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
};

// Iconos populares para categorías
const popularIcons = [
  'Folder', 'FileText', 'Video', 'Image', 'Music', 'Film', 'BookOpen', 'Book',
  'Tag', 'Tags', 'Star', 'Heart', 'ThumbsUp', 'MessageCircle', 'Mail', 'Phone',
  'Calendar', 'Clock', 'MapPin', 'Globe', 'Link', 'Share2', 'Download', 'Upload',
  'Search', 'Filter', 'Settings', 'User', 'Users', 'Home', 'Building', 'Briefcase',
];

export default function CrmContenido() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Tab activo desde URL
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'articulos');

  // Estados generales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ tipo: string; id: string } | null>(null);

  // Datos de cada tab
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [testimonios, setTestimonios] = useState<Testimonio[]>([]);
  const [seoStats, setSeoStats] = useState<SeoStat[]>([]);
  const [categorias, setCategorias] = useState<CategoriaContenido[]>([]);
  const [relaciones, setRelaciones] = useState<ContenidoRelacion[]>([]);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroPublicado, setFiltroPublicado] = useState<boolean | undefined>(undefined);
  const [filtroTipo, setFiltroTipo] = useState('');

  // Modal de categorías
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<string | null>(null);
  const [categoriaForm, setCategoriaForm] = useState({
    slug: '',
    tipo: 'articulo' as CategoriaContenido['tipo'],
    nombre: '',
    descripcion: '',
    icono: '',
    color: '#667eea',
    orden: 0,
    activa: true,
  });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Relacionar contenido - nuevo diseño ágil
  type TipoOrigen = 'articulo' | 'video' | 'testimonio' | 'faq' | 'seo_stat';
  type TipoDestino = 'articulo' | 'video' | 'testimonio' | 'faq' | 'seo_stat' | 'propiedad';
  const [tipoContenidoOrigen, setTipoContenidoOrigen] = useState<TipoOrigen | null>(null);
  const [contenidoOrigenSeleccionado, setContenidoOrigenSeleccionado] = useState<any | null>(null);
  const [tipoContenidoDestino, setTipoContenidoDestino] = useState<TipoDestino | null>(null);
  const [contenidoDestinoSeleccionado, setContenidoDestinoSeleccionado] = useState<any | null>(null);
  const [propiedadesSeleccionadas, setPropiedadesSeleccionadas] = useState<string[]>([]);
  const [descripcionRelacion, setDescripcionRelacion] = useState('');
  const [contenidosOrigen, setContenidosOrigen] = useState<any[]>([]);
  const [contenidosDestino, setContenidosDestino] = useState<any[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [showDestinoModal, setShowDestinoModal] = useState(false);
  const [busquedaDestino, setBusquedaDestino] = useState('');
  const [busquedaOrigen, setBusquedaOrigen] = useState('');
  const [creandoRelacion, setCreandoRelacion] = useState(false);

  // Cambiar tab y actualizar URL
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setBusqueda('');
    setFiltroCategoria('');
    setFiltroPublicado(undefined);
  };

  // Configurar header según tab
  useEffect(() => {
    const getHeaderConfig = () => {
      const configs: Record<TabType, { title: string; subtitle: string; action?: React.ReactNode }> = {
        articulos: {
          title: 'Artículos',
          subtitle: 'Gestiona los artículos de tu blog',
          action: (
            <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/articulos/nuevo`)} className="btn-primary">
              <span className="icon">{Icons.plus}</span>
              Nuevo Artículo
            </button>
          ),
        },
        videos: {
          title: 'Videos',
          subtitle: 'Gestiona tu galería de videos',
          action: (
            <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/videos/nuevo`)} className="btn-primary">
              <span className="icon">{Icons.plus}</span>
              Nuevo Video
            </button>
          ),
        },
        faqs: {
          title: 'FAQs',
          subtitle: 'Gestiona las preguntas frecuentes',
          action: (
            <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/faqs/nuevo`)} className="btn-primary">
              <span className="icon">{Icons.plus}</span>
              Nueva FAQ
            </button>
          ),
        },
        testimonios: {
          title: 'Testimonios',
          subtitle: 'Gestiona los testimonios de tus clientes',
          action: (
            <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/testimonios/nuevo`)} className="btn-primary">
              <span className="icon">{Icons.plus}</span>
              Nuevo Testimonio
            </button>
          ),
        },
        seo: {
          title: 'SEO Stats',
          subtitle: 'Contenido enriquecido para SEO',
          action: (
            <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/seo/nuevo`)} className="btn-primary">
              <span className="icon">{Icons.plus}</span>
              Nuevo SEO Stat
            </button>
          ),
        },
        categorias: {
          title: 'Categorías',
          subtitle: 'Organiza tu contenido por categorías',
          action: (
            <button onClick={() => { setEditingCategoria(null); resetCategoriaForm(); setShowCategoriaModal(true); }} className="btn-primary">
              <span className="icon">{Icons.plus}</span>
              Nueva Categoría
            </button>
          ),
        },
        relacionar: {
          title: 'Relacionar Contenido',
          subtitle: 'Crea relaciones entre contenidos',
        },
      };
      return configs[activeTab];
    };

    const config = getHeaderConfig();
    setPageHeader({
      title: config.title,
      subtitle: config.subtitle,
      actions: config.action,
    });
  }, [activeTab, setPageHeader, navigate, tenantSlug]);

  // Cargar datos según tab activo
  useEffect(() => {
    if (!tenantActual?.id) return;
    loadData();
  }, [tenantActual?.id, activeTab, busqueda, filtroCategoria, filtroPublicado, filtroTipo]);

  const loadData = async () => {
    if (!tenantActual?.id) return;
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'articulos':
          const arts = await getArticulos(tenantActual.id, {
            search: busqueda || undefined,
            categoriaId: filtroCategoria || undefined,
            publicado: filtroPublicado,
          });
          setArticulos(arts);
          break;
        case 'videos':
          const vids = await getVideos(tenantActual.id, {
            search: busqueda || undefined,
            categoriaId: filtroCategoria || undefined,
            publicado: filtroPublicado,
          });
          setVideos(vids);
          break;
        case 'faqs':
          const fqs = await getFaqs(tenantActual.id, {
            search: busqueda || undefined,
            categoriaId: filtroCategoria || undefined,
          });
          setFaqs(fqs);
          break;
        case 'testimonios':
          const tests = await getTestimonios(tenantActual.id, {
            search: busqueda || undefined,
            categoriaId: filtroCategoria || undefined,
          });
          setTestimonios(tests);
          break;
        case 'seo':
          const seos = await getSeoStats(tenantActual.id, {
            search: busqueda || undefined,
            tipoAsociacion: filtroTipo || undefined,
          });
          setSeoStats(seos);
          break;
        case 'categorias':
          const cats = await getCategoriasContenido(tenantActual.id, filtroTipo || undefined);
          setCategorias(cats);
          break;
        case 'relacionar':
          await loadRelacionarData();
          break;
      }

      // Siempre cargar categorías para filtros
      if (activeTab !== 'categorias') {
        const tipoCategoria = activeTab === 'seo' ? 'seo_stats' : activeTab === 'testimonios' ? 'testimonio' : activeTab.slice(0, -1);
        const cats = await getCategoriasContenido(tenantActual.id, tipoCategoria as any);
        setCategorias(cats);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadRelacionarData = async () => {
    if (!tenantActual?.id) return;

    // Cargar contenidos de origen según tipo seleccionado
    if (tipoContenidoOrigen) {
      let origenes: any[] = [];
      switch (tipoContenidoOrigen) {
        case 'articulo': origenes = await getArticulos(tenantActual.id, {}); break;
        case 'video': origenes = await getVideos(tenantActual.id, {}); break;
        case 'faq': origenes = await getFaqs(tenantActual.id, {}); break;
        case 'testimonio': origenes = await getTestimonios(tenantActual.id, {}); break;
        case 'seo_stat': origenes = await getSeoStats(tenantActual.id, {}); break;
      }
      setContenidosOrigen(origenes);
    }

    // Cargar contenidos de destino según tipo seleccionado
    if (tipoContenidoDestino && tipoContenidoDestino !== 'propiedad') {
      let destinos: any[] = [];
      switch (tipoContenidoDestino) {
        case 'articulo': destinos = await getArticulos(tenantActual.id, {}); break;
        case 'video': destinos = await getVideos(tenantActual.id, {}); break;
        case 'faq': destinos = await getFaqs(tenantActual.id, {}); break;
        case 'testimonio': destinos = await getTestimonios(tenantActual.id, {}); break;
        case 'seo_stat': destinos = await getSeoStats(tenantActual.id, {}); break;
      }
      setContenidosDestino(destinos);
    }

    // Cargar propiedades si es necesario
    if (tipoContenidoDestino === 'propiedad') {
      const propsResponse = await getPropiedadesCrm(tenantActual.id, {});
      setPropiedades(propsResponse.data || []);
    }

    // Cargar relaciones existentes si hay contenido origen seleccionado
    if (contenidoOrigenSeleccionado && tipoContenidoOrigen) {
      const rels = await getRelacionesContenido(tenantActual.id, { tipoOrigen: tipoContenidoOrigen, idOrigen: contenidoOrigenSeleccionado.id });
      setRelaciones(rels);
    }
  };

  // Cargar contenidos cuando cambia el tipo de origen
  useEffect(() => {
    if (tipoContenidoOrigen && tenantActual?.id) {
      loadOrigenData();
    }
  }, [tipoContenidoOrigen, tenantActual?.id]);

  const loadOrigenData = async () => {
    if (!tenantActual?.id || !tipoContenidoOrigen) return;
    let origenes: any[] = [];
    switch (tipoContenidoOrigen) {
      case 'articulo': origenes = await getArticulos(tenantActual.id, {}); break;
      case 'video': origenes = await getVideos(tenantActual.id, {}); break;
      case 'faq': origenes = await getFaqs(tenantActual.id, {}); break;
      case 'testimonio': origenes = await getTestimonios(tenantActual.id, {}); break;
      case 'seo_stat': origenes = await getSeoStats(tenantActual.id, {}); break;
    }
    setContenidosOrigen(origenes);
  };

  // Cargar contenidos destino cuando cambia el tipo
  useEffect(() => {
    if (tipoContenidoDestino && tenantActual?.id) {
      loadDestinoData();
    }
  }, [tipoContenidoDestino, tenantActual?.id]);

  const loadDestinoData = async () => {
    if (!tenantActual?.id || !tipoContenidoDestino) return;
    if (tipoContenidoDestino === 'propiedad') {
      const propsResponse = await getPropiedadesCrm(tenantActual.id, {});
      setPropiedades(propsResponse.data || []);
    } else {
      let destinos: any[] = [];
      switch (tipoContenidoDestino) {
        case 'articulo': destinos = await getArticulos(tenantActual.id, {}); break;
        case 'video': destinos = await getVideos(tenantActual.id, {}); break;
        case 'faq': destinos = await getFaqs(tenantActual.id, {}); break;
        case 'testimonio': destinos = await getTestimonios(tenantActual.id, {}); break;
        case 'seo_stat': destinos = await getSeoStats(tenantActual.id, {}); break;
      }
      setContenidosDestino(destinos);
    }
  };

  // Cargar relaciones cuando se selecciona contenido origen
  useEffect(() => {
    if (contenidoOrigenSeleccionado && tipoContenidoOrigen && tenantActual?.id) {
      loadRelacionesOrigen();
    }
  }, [contenidoOrigenSeleccionado, tipoContenidoOrigen, tenantActual?.id]);

  const loadRelacionesOrigen = async () => {
    if (!tenantActual?.id || !contenidoOrigenSeleccionado || !tipoContenidoOrigen) return;
    const rels = await getRelacionesContenido(tenantActual.id, { tipoOrigen: tipoContenidoOrigen, idOrigen: contenidoOrigenSeleccionado.id });
    setRelaciones(rels);
  };

  // Handlers de toggle publicado
  const handleTogglePublicado = async (tipo: string, id: string, currentStatus: boolean) => {
    if (!tenantActual?.id) return;
    try {
      switch (tipo) {
        case 'articulo':
          const art = articulos.find(a => a.id === id);
          if (art) await updateArticulo(tenantActual.id, id, { ...art, publicado: !currentStatus });
          setArticulos(prev => prev.map(a => a.id === id ? { ...a, publicado: !currentStatus } : a));
          break;
        case 'video':
          const vid = videos.find(v => v.id === id);
          if (vid) {
            const { tagIds, ...videoData } = vid as any;
            await updateVideo(tenantActual.id, id, { ...videoData, publicado: !currentStatus });
          }
          setVideos(prev => prev.map(v => v.id === id ? { ...v, publicado: !currentStatus } : v));
          break;
        case 'faq':
          const fq = faqs.find(f => f.id === id);
          if (fq) await updateFaq(tenantActual.id, id, { ...fq, publicado: !currentStatus });
          setFaqs(prev => prev.map(f => f.id === id ? { ...f, publicado: !currentStatus } : f));
          break;
        case 'testimonio':
          const test = testimonios.find(t => t.id === id);
          if (test) await updateTestimonio(tenantActual.id, id, { ...test, publicado: !currentStatus });
          setTestimonios(prev => prev.map(t => t.id === id ? { ...t, publicado: !currentStatus } : t));
          break;
        case 'seo':
          const seo = seoStats.find(s => s.id === id);
          if (seo) await updateSeoStat(tenantActual.id, id, { ...seo, publicado: !currentStatus });
          setSeoStats(prev => prev.map(s => s.id === id ? { ...s, publicado: !currentStatus } : s));
          break;
      }
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
    }
  };

  // Handler de eliminar
  const handleDelete = async () => {
    if (!tenantActual?.id || !deleteConfirm) return;
    try {
      switch (deleteConfirm.tipo) {
        case 'articulo': await deleteArticulo(tenantActual.id, deleteConfirm.id); break;
        case 'video': await deleteVideo(tenantActual.id, deleteConfirm.id); break;
        case 'faq': await deleteFaq(tenantActual.id, deleteConfirm.id); break;
        case 'testimonio': await deleteTestimonio(tenantActual.id, deleteConfirm.id); break;
        case 'seo': await deleteSeoStat(tenantActual.id, deleteConfirm.id); break;
        case 'categoria': await deleteCategoriaContenido(tenantActual.id, deleteConfirm.id); break;
      }
      setDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  // Categorías handlers
  const resetCategoriaForm = () => {
    setCategoriaForm({
      slug: '',
      tipo: 'articulo',
      nombre: '',
      descripcion: '',
      icono: '',
      color: '#667eea',
      orden: 0,
      activa: true,
    });
  };

  const generateSlug = (text: string) => {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSaveCategoria = async () => {
    if (!tenantActual?.id || !categoriaForm.nombre) {
      setError('Nombre es requerido');
      return;
    }
    try {
      setSaving(true);
      const data = {
        ...categoriaForm,
        slug: categoriaForm.slug || generateSlug(categoriaForm.nombre),
      };
      if (editingCategoria) {
        await updateCategoriaContenido(tenantActual.id, editingCategoria, data);
      } else {
        await createCategoriaContenido(tenantActual.id, data);
      }
      setShowCategoriaModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCategoria = (cat: CategoriaContenido) => {
    setCategoriaForm({
      slug: cat.slug,
      tipo: cat.tipo,
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      icono: cat.icono || '',
      color: cat.color || '#667eea',
      orden: cat.orden,
      activa: cat.activa,
    });
    setEditingCategoria(cat.id);
    setShowCategoriaModal(true);
  };

  // Relacionar handlers
  const handleCrearRelacion = async () => {
    if (!tenantActual?.id || !contenidoOrigenSeleccionado || !tipoContenidoOrigen || !tipoContenidoDestino) {
      setError('Selecciona contenido origen y destino');
      return;
    }

    // Si es propiedad, crear múltiples relaciones
    if (tipoContenidoDestino === 'propiedad') {
      if (propiedadesSeleccionadas.length === 0) {
        setError('Selecciona al menos una propiedad');
        return;
      }
      try {
        setCreandoRelacion(true);
        for (const propId of propiedadesSeleccionadas) {
          await createRelacionContenido(tenantActual.id, {
            tipoOrigen: tipoContenidoOrigen,
            idOrigen: contenidoOrigenSeleccionado.id,
            tipoDestino: 'propiedad',
            idDestino: propId,
            descripcion: descripcionRelacion || undefined,
            orden: 0,
            activa: true,
          });
        }
        setPropiedadesSeleccionadas([]);
        setDescripcionRelacion('');
        setTipoContenidoDestino(null);
        loadRelacionesOrigen();
      } catch (err: any) {
        setError(err.message || 'Error al crear relación');
      } finally {
        setCreandoRelacion(false);
      }
    } else {
      // Contenido a contenido
      if (!contenidoDestinoSeleccionado) {
        setError('Selecciona contenido destino');
        return;
      }
      try {
        setCreandoRelacion(true);
        await createRelacionContenido(tenantActual.id, {
          tipoOrigen: tipoContenidoOrigen,
          idOrigen: contenidoOrigenSeleccionado.id,
          tipoDestino: tipoContenidoDestino,
          idDestino: contenidoDestinoSeleccionado.id,
          descripcion: descripcionRelacion || undefined,
          orden: 0,
          activa: true,
        });
        setContenidoDestinoSeleccionado(null);
        setDescripcionRelacion('');
        setTipoContenidoDestino(null);
        setShowDestinoModal(false);
        loadRelacionesOrigen();
      } catch (err: any) {
        setError(err.message || 'Error al crear relación');
      } finally {
        setCreandoRelacion(false);
      }
    }
  };

  const handleEliminarRelacion = async (relacionId: string) => {
    if (!tenantActual?.id) return;
    try {
      await deleteRelacionContenido(tenantActual.id, relacionId);
      loadRelacionarData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar relación');
    }
  };

  // Renderizar icono de Lucide
  const renderLucideIcon = (iconName: string, size = 20) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={size} />;
  };

  // Render del listado según tab
  const renderList = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'articulos':
        return renderArticulosList();
      case 'videos':
        return renderVideosList();
      case 'faqs':
        return renderFaqsList();
      case 'testimonios':
        return renderTestimoniosList();
      case 'seo':
        return renderSeoStatsList();
      case 'categorias':
        return renderCategoriasList();
      case 'relacionar':
        return renderRelacionar();
      default:
        return null;
    }
  };

  const renderArticulosList = () => (
    <>
      {articulos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{Icons.articulo}</div>
          <h3>No hay artículos</h3>
          <p>{busqueda ? 'No se encontraron artículos' : 'Crea tu primer artículo'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>TÍTULO</th>
                <th>CATEGORÍA</th>
                <th>ESTADO</th>
                <th>VISTAS</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {articulos.map(art => (
                <tr key={art.id}>
                  <td>
                    <div className="item-with-image">
                      {art.imagenPrincipal ? (
                        <img src={art.imagenPrincipal} alt={art.titulo} className="item-thumb" />
                      ) : (
                        <div className="item-thumb-placeholder">{Icons.articulo}</div>
                      )}
                      <div className="item-info">
                        <div className="item-title">{art.titulo}</div>
                        {art.extracto && <div className="item-excerpt">{stripHtml(art.extracto, 60)}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{categorias.find(c => c.id === art.categoriaId)?.nombre || '-'}</td>
                  <td>
                    <button
                      onClick={() => handleTogglePublicado('articulo', art.id, art.publicado)}
                      className={`status-btn ${art.publicado ? 'published' : 'draft'}`}
                    >
                      {art.publicado ? 'Publicado' : 'Borrador'}
                    </button>
                  </td>
                  <td>{art.vistas || 0}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/articulos/${art.id}`)} className="action-btn">{Icons.edit}</button>
                      <button onClick={() => setDeleteConfirm({ tipo: 'articulo', id: art.id })} className="action-btn action-btn-danger">{Icons.trash}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderVideosList = () => (
    <>
      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{Icons.video}</div>
          <h3>No hay videos</h3>
          <p>{busqueda ? 'No se encontraron videos' : 'Crea tu primer video'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>TÍTULO</th>
                <th>CATEGORÍA</th>
                <th>TIPO</th>
                <th>ESTADO</th>
                <th>VISTAS</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {videos.map(vid => (
                <tr key={vid.id}>
                  <td>
                    <div className="item-with-image">
                      {vid.thumbnail ? (
                        <img src={vid.thumbnail} alt={vid.titulo} className="item-thumb" />
                      ) : (
                        <div className="item-thumb-placeholder">{Icons.video}</div>
                      )}
                      <div className="item-info">
                        <div className="item-title">{vid.titulo}</div>
                        {vid.descripcion && <div className="item-excerpt">{stripHtml(vid.descripcion, 60)}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{categorias.find(c => c.id === vid.categoriaId)?.nombre || '-'}</td>
                  <td>{vid.tipoVideo}</td>
                  <td>
                    <button
                      onClick={() => handleTogglePublicado('video', vid.id, vid.publicado)}
                      className={`status-btn ${vid.publicado ? 'published' : 'draft'}`}
                    >
                      {vid.publicado ? 'Publicado' : 'Borrador'}
                    </button>
                  </td>
                  <td>{vid.vistas || 0}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/videos/${vid.id}`)} className="action-btn">{Icons.edit}</button>
                      <button onClick={() => setDeleteConfirm({ tipo: 'video', id: vid.id })} className="action-btn action-btn-danger">{Icons.trash}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderFaqsList = () => (
    <>
      {faqs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{Icons.faq}</div>
          <h3>No hay FAQs</h3>
          <p>{busqueda ? 'No se encontraron FAQs' : 'Crea tu primera FAQ'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>PREGUNTA</th>
                <th>RESPUESTA</th>
                <th>CONTEXTO</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map(faq => (
                <tr key={faq.id}>
                  <td><div className="item-title">{faq.pregunta}</div></td>
                  <td><div className="item-excerpt">{stripHtml(faq.respuesta, 80)}</div></td>
                  <td>{faq.contexto || '-'}</td>
                  <td>
                    <button
                      onClick={() => handleTogglePublicado('faq', faq.id, faq.publicado)}
                      className={`status-btn ${faq.publicado ? 'published' : 'draft'}`}
                    >
                      {faq.publicado ? 'Publicado' : 'Borrador'}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/faqs/${faq.id}`)} className="action-btn">{Icons.edit}</button>
                      <button onClick={() => setDeleteConfirm({ tipo: 'faq', id: faq.id })} className="action-btn action-btn-danger">{Icons.trash}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderTestimoniosList = () => (
    <>
      {testimonios.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{Icons.testimonio}</div>
          <h3>No hay testimonios</h3>
          <p>{busqueda ? 'No se encontraron testimonios' : 'Crea tu primer testimonio'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>CLIENTE</th>
                <th>CONTENIDO</th>
                <th>RATING</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {testimonios.map(test => (
                <tr key={test.id}>
                  <td>
                    <div className="item-with-image">
                      {test.clienteFoto ? (
                        <img src={test.clienteFoto} alt={test.clienteNombre} className="item-thumb rounded" />
                      ) : (
                        <div className="item-thumb-placeholder rounded">{Icons.testimonio}</div>
                      )}
                      <div className="item-info">
                        <div className="item-title">{test.clienteNombre}</div>
                        {test.clienteCargo && <div className="item-excerpt">{test.clienteCargo}</div>}
                      </div>
                    </div>
                  </td>
                  <td><div className="item-excerpt">{stripHtml(test.contenido, 80)}</div></td>
                  <td>{'⭐'.repeat(test.rating)}</td>
                  <td>
                    <button
                      onClick={() => handleTogglePublicado('testimonio', test.id, test.publicado)}
                      className={`status-btn ${test.publicado ? 'published' : 'draft'}`}
                    >
                      {test.publicado ? 'Publicado' : 'Borrador'}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/testimonios/${test.id}`)} className="action-btn">{Icons.edit}</button>
                      <button onClick={() => setDeleteConfirm({ tipo: 'testimonio', id: test.id })} className="action-btn action-btn-danger">{Icons.trash}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderSeoStatsList = () => (
    <>
      {seoStats.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{Icons.seo}</div>
          <h3>No hay SEO Stats</h3>
          <p>{busqueda ? 'No se encontraron SEO stats' : 'Crea tu primer SEO stat'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>TÍTULO</th>
                <th>TIPO</th>
                <th>ASOCIACIÓN</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {seoStats.map(seo => (
                <tr key={seo.id}>
                  <td><div className="item-title">{seo.titulo}</div></td>
                  <td>{seo.tipoAsociacion}</td>
                  <td>{seo.asociacionNombre || '-'}</td>
                  <td>
                    <button
                      onClick={() => handleTogglePublicado('seo', seo.id, seo.publicado)}
                      className={`status-btn ${seo.publicado ? 'published' : 'draft'}`}
                    >
                      {seo.publicado ? 'Publicado' : 'Borrador'}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/seo/${seo.id}`)} className="action-btn">{Icons.edit}</button>
                      <button onClick={() => setDeleteConfirm({ tipo: 'seo', id: seo.id })} className="action-btn action-btn-danger">{Icons.trash}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderCategoriasList = () => (
    <>
      {categorias.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{Icons.categoria}</div>
          <h3>No hay categorías</h3>
          <p>Crea tu primera categoría</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>TIPO</th>
                <th>DESCRIPCIÓN</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map(cat => (
                <tr key={cat.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: cat.color || '#667eea',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                      }}>
                        {cat.icono ? renderLucideIcon(cat.icono, 16) : Icons.categoria}
                      </div>
                      <span className="item-title">{cat.nombre}</span>
                    </div>
                  </td>
                  <td>{TIPOS_CONTENIDO.find(t => t.value === cat.tipo)?.label || cat.tipo}</td>
                  <td><div className="item-excerpt">{cat.descripcion || '-'}</div></td>
                  <td>
                    <span className={`badge ${cat.activa ? 'badge-success' : 'badge-secondary'}`}>
                      {cat.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => handleEditCategoria(cat)} className="action-btn">{Icons.edit}</button>
                      <button onClick={() => setDeleteConfirm({ tipo: 'categoria', id: cat.id })} className="action-btn action-btn-danger">{Icons.trash}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // Helper para obtener nombre de contenido
  const getContenidoNombre = (contenido: any) => {
    return contenido?.titulo || contenido?.pregunta || contenido?.clienteNombre || contenido?.nombre || 'Sin nombre';
  };

  // Filtrar contenidos origen por búsqueda
  const contenidosOrigenFiltrados = contenidosOrigen.filter(c => {
    const nombre = getContenidoNombre(c).toLowerCase();
    return nombre.includes(busquedaOrigen.toLowerCase());
  });

  // Filtrar contenidos destino por búsqueda
  const contenidosDestinoFiltrados = contenidosDestino.filter(c => {
    if (contenidoOrigenSeleccionado && c.id === contenidoOrigenSeleccionado.id) return false;
    const nombre = getContenidoNombre(c).toLowerCase();
    return nombre.includes(busquedaDestino.toLowerCase());
  });

  // Filtrar propiedades por búsqueda
  const propiedadesFiltradas = propiedades.filter(p => {
    const nombre = (p.titulo || p.codigo || '').toLowerCase();
    return nombre.includes(busquedaDestino.toLowerCase());
  });

  const TIPOS_ORIGEN_BUTTONS = [
    { value: 'articulo', label: 'Artículos', icon: Icons.articulo, color: '#3b82f6' },
    { value: 'video', label: 'Videos', icon: Icons.video, color: '#ef4444' },
    { value: 'faq', label: 'FAQs', icon: Icons.faq, color: '#8b5cf6' },
    { value: 'testimonio', label: 'Testimonios', icon: Icons.testimonio, color: '#10b981' },
    { value: 'seo_stat', label: 'SEO Stats', icon: Icons.seo, color: '#f59e0b' },
  ];

  const TIPOS_DESTINO_BUTTONS = [
    { value: 'articulo', label: 'Artículo', icon: Icons.articulo, color: '#3b82f6' },
    { value: 'video', label: 'Video', icon: Icons.video, color: '#ef4444' },
    { value: 'faq', label: 'FAQ', icon: Icons.faq, color: '#8b5cf6' },
    { value: 'testimonio', label: 'Testimonio', icon: Icons.testimonio, color: '#10b981' },
    { value: 'seo_stat', label: 'SEO Stat', icon: Icons.seo, color: '#f59e0b' },
    { value: 'propiedad', label: 'Propiedades', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, color: '#0ea5e9' },
  ];

  // Verificar si se puede crear relación
  const puedeCrearRelacion = contenidoOrigenSeleccionado && tipoContenidoDestino &&
    (tipoContenidoDestino === 'propiedad' ? propiedadesSeleccionadas.length > 0 : contenidoDestinoSeleccionado);

  const renderRelacionar = () => (
    <div className="relacionar-new">
      <div className="rel-grid-2">
        {/* COLUMNA 1: Origen */}
        <div className="rel-column">
          <div className="rel-column-header">
            <span className="rel-step">1</span>
            <span>Contenido Origen</span>
          </div>

          {/* Tipo de origen */}
          <div className="rel-type-grid">
            {TIPOS_ORIGEN_BUTTONS.map(tipo => (
              <button
                key={tipo.value}
                className={`rel-type-btn-sm ${tipoContenidoOrigen === tipo.value ? 'active' : ''}`}
                style={{ '--btn-color': tipo.color } as React.CSSProperties}
                onClick={() => {
                  setTipoContenidoOrigen(tipo.value as TipoOrigen);
                  setContenidoOrigenSeleccionado(null);
                  setTipoContenidoDestino(null);
                  setContenidoDestinoSeleccionado(null);
                  setBusquedaOrigen('');
                }}
              >
                <span className="rel-type-icon">{tipo.icon}</span>
                <span>{tipo.label}</span>
              </button>
            ))}
          </div>

          {/* Lista de contenidos origen */}
          {tipoContenidoOrigen && (
            <>
              <div className="rel-search-box">
                {Icons.search}
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={busquedaOrigen}
                  onChange={(e) => setBusquedaOrigen(e.target.value)}
                />
              </div>
              <div className="rel-content-list">
                {contenidosOrigenFiltrados.length === 0 ? (
                  <div className="rel-empty-sm">Sin contenidos</div>
                ) : (
                  contenidosOrigenFiltrados.map(c => (
                    <div
                      key={c.id}
                      className={`rel-content-item ${contenidoOrigenSeleccionado?.id === c.id ? 'selected' : ''}`}
                      onClick={() => {
                        setContenidoOrigenSeleccionado(c);
                        setTipoContenidoDestino(null);
                        setContenidoDestinoSeleccionado(null);
                      }}
                    >
                      <div className="rel-content-info">
                        <div className="rel-content-name">{getContenidoNombre(c)}</div>
                        {c.publicado !== undefined && (
                          <span className={`rel-status ${c.publicado ? 'published' : 'draft'}`}>
                            {c.publicado ? 'Pub' : 'Borr'}
                          </span>
                        )}
                      </div>
                      {contenidoOrigenSeleccionado?.id === c.id && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="check-icon">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {!tipoContenidoOrigen && (
            <div className="rel-placeholder">
              Selecciona un tipo de contenido
            </div>
          )}

          {/* Relaciones existentes del origen seleccionado */}
          {contenidoOrigenSeleccionado && relaciones.length > 0 && (
            <div className="rel-existing-section">
              <div className="rel-existing-header">
                {Icons.link}
                <span>Relaciones existentes ({relaciones.length})</span>
              </div>
              <div className="rel-existing-list-compact">
                {relaciones.map(rel => (
                  <div key={rel.id} className="rel-existing-row">
                    <span className="rel-existing-badge">
                      {TIPOS_DESTINO_BUTTONS.find(t => t.value === rel.tipoDestino)?.label || rel.tipoDestino}
                    </span>
                    <span className="rel-existing-id">{rel.idDestino.slice(0, 8)}...</span>
                    <button onClick={() => handleEliminarRelacion(rel.id)} className="rel-delete-mini">
                      {Icons.trash}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA 2: Destino */}
        <div className="rel-column">
          <div className="rel-column-header">
            <span className="rel-step">2</span>
            <span>Relacionar Con</span>
          </div>

          {contenidoOrigenSeleccionado ? (
            <>
              {/* Origen seleccionado mini */}
              <div className="rel-selected-mini">
                <span className="rel-selected-badge" style={{ background: TIPOS_ORIGEN_BUTTONS.find(t => t.value === tipoContenidoOrigen)?.color }}>
                  {TIPOS_ORIGEN_BUTTONS.find(t => t.value === tipoContenidoOrigen)?.label}
                </span>
                <span className="rel-selected-text">{getContenidoNombre(contenidoOrigenSeleccionado)}</span>
                <button className="rel-clear-mini" onClick={() => {
                  setContenidoOrigenSeleccionado(null);
                  setTipoContenidoDestino(null);
                }}>×</button>
              </div>

              {/* Tipos destino */}
              <div className="rel-type-grid">
                {TIPOS_DESTINO_BUTTONS.map(tipo => (
                  <button
                    key={tipo.value}
                    className={`rel-type-btn-sm ${tipoContenidoDestino === tipo.value ? 'active' : ''}`}
                    style={{ '--btn-color': tipo.color } as React.CSSProperties}
                    onClick={() => {
                      setTipoContenidoDestino(tipo.value as TipoDestino);
                      setContenidoDestinoSeleccionado(null);
                      setPropiedadesSeleccionadas([]);
                      setBusquedaDestino('');
                    }}
                  >
                    <span className="rel-type-icon">{tipo.icon}</span>
                    <span>{tipo.label}</span>
                  </button>
                ))}
              </div>

              {/* Lista destino o propiedades */}
              {tipoContenidoDestino && (
                <>
                  <div className="rel-search-box">
                    {Icons.search}
                    <input
                      type="text"
                      placeholder={tipoContenidoDestino === 'propiedad' ? 'Buscar propiedades...' : 'Buscar...'}
                      value={busquedaDestino}
                      onChange={(e) => setBusquedaDestino(e.target.value)}
                    />
                  </div>

                  {tipoContenidoDestino === 'propiedad' ? (
                    <>
                      {propiedadesSeleccionadas.length > 0 && (
                        <div className="rel-props-count">{propiedadesSeleccionadas.length} seleccionada(s)</div>
                      )}
                      <div className="rel-content-list">
                        {propiedadesFiltradas.length === 0 ? (
                          <div className="rel-empty-sm">Sin propiedades</div>
                        ) : (
                          propiedadesFiltradas.map(p => (
                            <div
                              key={p.id}
                              className={`rel-content-item rel-prop-item ${propiedadesSeleccionadas.includes(p.id) ? 'selected' : ''}`}
                              onClick={() => {
                                setPropiedadesSeleccionadas(prev =>
                                  prev.includes(p.id)
                                    ? prev.filter(id => id !== p.id)
                                    : [...prev, p.id]
                                );
                              }}
                            >
                              <div className="rel-prop-checkbox">
                                {propiedadesSeleccionadas.includes(p.id) ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="3" y="3" width="18" height="18" rx="3" fill="#3b82f6"/>
                                    <polyline points="9 12 11 14 15 10" fill="none" stroke="white" strokeWidth="2"/>
                                  </svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                                  </svg>
                                )}
                              </div>
                              <div className="rel-prop-thumb">
                                {p.imagen_principal ? (
                                  <img src={p.imagen_principal} alt={p.titulo || ''} />
                                ) : (
                                  <div className="rel-prop-thumb-placeholder">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="rel-content-info">
                                <div className="rel-content-name">{p.titulo || p.codigo}</div>
                                <div className="rel-prop-meta">{p.operacion} · {p.ciudad || 'N/A'}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rel-content-list">
                      {contenidosDestinoFiltrados.length === 0 ? (
                        <div className="rel-empty-sm">Sin contenidos</div>
                      ) : (
                        contenidosDestinoFiltrados.map(c => (
                          <div
                            key={c.id}
                            className={`rel-content-item ${contenidoDestinoSeleccionado?.id === c.id ? 'selected' : ''}`}
                            onClick={() => setContenidoDestinoSeleccionado(c)}
                          >
                            <div className="rel-content-info">
                              <div className="rel-content-name">{getContenidoNombre(c)}</div>
                            </div>
                            {contenidoDestinoSeleccionado?.id === c.id && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="check-icon">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}

              {!tipoContenidoDestino && (
                <div className="rel-placeholder">
                  Selecciona tipo destino
                </div>
              )}
            </>
          ) : (
            <div className="rel-placeholder">
              Primero selecciona un contenido origen
            </div>
          )}
        </div>
      </div>

      {/* Barra inferior con botón crear - solo aparece cuando hay selección completa */}
      {puedeCrearRelacion && (
        <div className="rel-action-bar">
          <div className="rel-action-summary">
            <span className="rel-action-badge" style={{ background: TIPOS_ORIGEN_BUTTONS.find(t => t.value === tipoContenidoOrigen)?.color }}>
              {getContenidoNombre(contenidoOrigenSeleccionado)}
            </span>
            <span className="rel-action-arrow">→</span>
            <span className="rel-action-badge" style={{ background: TIPOS_DESTINO_BUTTONS.find(t => t.value === tipoContenidoDestino)?.color }}>
              {tipoContenidoDestino === 'propiedad'
                ? `${propiedadesSeleccionadas.length} propiedad(es)`
                : getContenidoNombre(contenidoDestinoSeleccionado)
              }
            </span>
          </div>
          <button
            onClick={handleCrearRelacion}
            className="rel-create-btn"
            disabled={creandoRelacion}
          >
            {creandoRelacion ? 'Creando...' : 'CREAR RELACIÓN'}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="page contenido-page">
      <style>{contenidoStyles}</style>
      <style>{`
        /* Tabs con personalidad */
        .contenido-tabs {
          display: flex;
          gap: 6px;
          padding: 16px 20px;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }
        .contenido-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          position: relative;
        }
        .contenido-tab:hover {
          background: white;
          border-color: #cbd5e1;
          color: #334155;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.08);
        }
        .contenido-tab.active {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-color: transparent;
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
          transform: translateY(-1px);
        }
        .contenido-tab .tab-icon {
          display: flex;
          opacity: 0.7;
        }
        .contenido-tab:hover .tab-icon,
        .contenido-tab.active .tab-icon {
          opacity: 1;
        }
        .contenido-tab .tab-count {
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #64748b;
          min-width: 20px;
          text-align: center;
        }
        .contenido-tab.active .tab-count {
          background: rgba(255,255,255,0.25);
          color: white;
        }
        /* Separador visual entre grupos */
        .tab-separator {
          width: 1px;
          height: 32px;
          background: linear-gradient(180deg, transparent 0%, #cbd5e1 50%, transparent 100%);
          margin: 0 8px;
          align-self: center;
        }

        .item-with-image { display: flex; gap: 12px; align-items: center; }
        .item-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; }
        .item-thumb.rounded { border-radius: 50%; }
        .item-thumb-placeholder { width: 50px; height: 50px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; border: 1px solid #e2e8f0; }
        .item-thumb-placeholder.rounded { border-radius: 50%; }
        .item-info { flex: 1; min-width: 0; }
        .item-title { font-weight: 500; color: #1e293b; }
        .item-excerpt { font-size: 0.8125rem; color: #64748b; margin-top: 2px; }

        .status-btn { padding: 5px 12px; border-radius: 16px; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .status-btn.published { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }
        .status-btn.draft { background: #f1f5f9; color: #64748b; }
        .status-btn:hover { transform: scale(1.05); }

        /* Nuevo diseño Relacionar - 2 columnas */
        .relacionar-new { width: 100%; }
        .rel-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; min-height: 450px; }
        .rel-column { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; }
        .rel-column-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-weight: 600; color: #1e293b; font-size: 1rem; }
        .rel-step { width: 28px; height: 28px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8125rem; font-weight: 700; flex-shrink: 0; }

        .rel-type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
        .rel-type-btn-sm { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; transition: all 0.15s; font-weight: 500; font-size: 0.8125rem; color: #475569; }
        .rel-type-btn-sm:hover { border-color: var(--btn-color, #3b82f6); }
        .rel-type-btn-sm.active { border-color: var(--btn-color, #3b82f6); background: var(--btn-color, #3b82f6); color: white; }
        .rel-type-btn-sm .rel-type-icon { display: flex; }
        .rel-type-btn-sm .rel-type-icon svg { width: 16px; height: 16px; }

        .rel-search-box { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; }
        .rel-search-box input { flex: 1; border: none; background: transparent; outline: none; font-size: 0.875rem; }
        .rel-search-box svg { color: #94a3b8; width: 16px; height: 16px; }

        .rel-content-list { flex: 1; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; max-height: 320px; }
        .rel-content-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: all 0.15s; }
        .rel-content-item:last-child { border-bottom: none; }
        .rel-content-item:hover { background: #f8fafc; }
        .rel-content-item.selected { background: #eff6ff; border-left: 3px solid #3b82f6; }
        .rel-content-info { flex: 1; min-width: 0; }
        .rel-content-name { font-weight: 500; color: #1e293b; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rel-status { display: inline-block; margin-left: 8px; padding: 2px 6px; border-radius: 8px; font-size: 0.6875rem; font-weight: 600; }
        .rel-status.published { background: #dcfce7; color: #16a34a; }
        .rel-status.draft { background: #f1f5f9; color: #64748b; }
        .check-icon { color: #3b82f6; flex-shrink: 0; }
        .rel-empty-sm { padding: 32px 16px; text-align: center; color: #94a3b8; font-size: 0.875rem; }
        .rel-placeholder { flex: 1; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.875rem; text-align: center; padding: 24px; background: #f8fafc; border-radius: 8px; border: 1px dashed #e2e8f0; }

        .rel-selected-mini { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; margin-bottom: 16px; }
        .rel-selected-badge { color: white; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }
        .rel-selected-text { flex: 1; font-size: 0.875rem; font-weight: 500; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rel-clear-mini { width: 22px; height: 22px; border-radius: 50%; border: none; background: #fee2e2; color: #ef4444; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .rel-props-count { padding: 6px 0 10px 0; color: #3b82f6; font-weight: 600; font-size: 0.8125rem; }
        .rel-prop-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; }
        .rel-prop-checkbox { flex-shrink: 0; }
        .rel-prop-thumb { width: 48px; height: 36px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: #f1f5f9; }
        .rel-prop-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .rel-prop-thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
        .rel-prop-meta { font-size: 0.75rem; color: #64748b; margin-top: 2px; }

        .rel-existing-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
        .rel-existing-header { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 600; color: #64748b; margin-bottom: 12px; }
        .rel-existing-header svg { width: 16px; height: 16px; }
        .rel-existing-list-compact { display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto; }
        .rel-existing-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #f8fafc; border-radius: 8px; }
        .rel-existing-badge { background: #e0e7ff; color: #4338ca; padding: 3px 8px; border-radius: 6px; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; flex-shrink: 0; }
        .rel-existing-id { flex: 1; font-size: 0.8125rem; color: #64748b; font-family: monospace; }
        .rel-delete-mini { width: 28px; height: 28px; border: none; background: transparent; color: #ef4444; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: opacity 0.15s; border-radius: 6px; }
        .rel-delete-mini:hover { opacity: 1; background: #fee2e2; }
        .rel-delete-mini svg { width: 16px; height: 16px; }

        /* Barra de acción inferior */
        .rel-action-bar { margin-top: 20px; padding: 16px 20px; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 20px; animation: slideUp 0.2s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .rel-action-summary { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .rel-action-badge { color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rel-action-arrow { color: #94a3b8; font-size: 1.25rem; font-weight: bold; }
        .rel-create-btn { padding: 12px 24px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }
        .rel-create-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
        .rel-create-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 900px) {
          .rel-grid-2 { grid-template-columns: 1fr; }
          .rel-type-grid { grid-template-columns: repeat(2, 1fr); }
          .rel-action-bar { flex-direction: column; gap: 12px; }
          .rel-action-summary { width: 100%; justify-content: center; }
          .rel-create-btn { width: 100%; }
        }

        .icon-picker-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 400px; max-height: 500px; z-index: 1001; }
        .icon-picker-header { padding: 16px; border-bottom: 1px solid #e2e8f0; }
        .icon-picker-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; padding: 16px; max-height: 350px; overflow-y: auto; }
        .icon-picker-item { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: all 0.15s; }
        .icon-picker-item:hover { background: #f1f5f9; border-color: #3b82f6; }
        .icon-picker-item.selected { background: #3b82f6; color: white; }
      `}</style>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="contenido-tabs">
        {/* Contenido principal */}
        <button className={`contenido-tab ${activeTab === 'articulos' ? 'active' : ''}`} onClick={() => handleTabChange('articulos')}>
          <span className="tab-icon">{Icons.articulo}</span>
          Artículos
        </button>
        <button className={`contenido-tab ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => handleTabChange('videos')}>
          <span className="tab-icon">{Icons.video}</span>
          Videos
        </button>
        <button className={`contenido-tab ${activeTab === 'faqs' ? 'active' : ''}`} onClick={() => handleTabChange('faqs')}>
          <span className="tab-icon">{Icons.faq}</span>
          FAQs
        </button>
        <button className={`contenido-tab ${activeTab === 'testimonios' ? 'active' : ''}`} onClick={() => handleTabChange('testimonios')}>
          <span className="tab-icon">{Icons.testimonio}</span>
          Testimonios
        </button>

        {/* Separador */}
        <div className="tab-separator" />

        {/* SEO y configuración */}
        <button className={`contenido-tab ${activeTab === 'seo' ? 'active' : ''}`} onClick={() => handleTabChange('seo')}>
          <span className="tab-icon">{Icons.seo}</span>
          SEO Stats
        </button>
        <button className={`contenido-tab ${activeTab === 'categorias' ? 'active' : ''}`} onClick={() => handleTabChange('categorias')}>
          <span className="tab-icon">{Icons.categoria}</span>
          Categorías
        </button>

        {/* Separador */}
        <div className="tab-separator" />

        {/* Herramientas */}
        <button className={`contenido-tab ${activeTab === 'relacionar' ? 'active' : ''}`} onClick={() => handleTabChange('relacionar')}>
          <span className="tab-icon">{Icons.link}</span>
          Relacionar
        </button>
      </div>

      {/* Filtros (no para categorías ni relacionar) */}
      {!['categorias', 'relacionar'].includes(activeTab) && (
        <div className="filters-bar">
          <div className="search-box">
            <span className="search-icon">{Icons.search}</span>
            <input
              type="text"
              placeholder={`Buscar ${activeTab}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="filters-right" style={{ display: 'flex', gap: '12px' }}>
            {activeTab !== 'seo' && categorias.length > 0 && (
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="filter-select">
                <option value="">Todas las categorías</option>
                {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
              </select>
            )}
            {['articulos', 'videos'].includes(activeTab) && (
              <select value={filtroPublicado === undefined ? '' : filtroPublicado ? 'true' : 'false'} onChange={(e) => setFiltroPublicado(e.target.value === '' ? undefined : e.target.value === 'true')} className="filter-select">
                <option value="">Todos</option>
                <option value="true">Publicados</option>
                <option value="false">Borradores</option>
              </select>
            )}
            {activeTab === 'seo' && (
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="filter-select">
                <option value="">Todos los tipos</option>
                <option value="ubicacion">Ubicación</option>
                <option value="tipo_propiedad">Tipo de Propiedad</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* Filtro de tipo para categorías */}
      {activeTab === 'categorias' && (
        <div className="filters-bar">
          <div className="search-box">
            <span className="search-icon">{Icons.search}</span>
            <input
              type="text"
              placeholder="Buscar categorías..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="filter-select">
            <option value="">Todos los tipos</option>
            {TIPOS_CONTENIDO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}

      {/* Contenido */}
      {renderList()}

      {/* Modal de Categoría */}
      {showCategoriaModal && (
        <div className="modal-overlay" onClick={() => setShowCategoriaModal(false)}>
          <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button onClick={() => setShowCategoriaModal(false)} className="btn-icon">{Icons.x}</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveCategoria(); }}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      value={categoriaForm.nombre}
                      onChange={(e) => {
                        setCategoriaForm({ ...categoriaForm, nombre: e.target.value });
                        if (!editingCategoria) {
                          setCategoriaForm(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                        }
                      }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo *</label>
                    <select value={categoriaForm.tipo} onChange={(e) => setCategoriaForm({ ...categoriaForm, tipo: e.target.value as any })}>
                      {TIPOS_CONTENIDO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Slug</label>
                  <input type="text" value={categoriaForm.slug} onChange={(e) => setCategoriaForm({ ...categoriaForm, slug: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea value={categoriaForm.descripcion} onChange={(e) => setCategoriaForm({ ...categoriaForm, descripcion: e.target.value })} rows={2} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Icono</label>
                    <button type="button" onClick={() => setShowIconPicker(true)} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                      {categoriaForm.icono ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {renderLucideIcon(categoriaForm.icono, 18)}
                          {categoriaForm.icono}
                        </span>
                      ) : 'Seleccionar icono'}
                    </button>
                  </div>
                  <div className="form-group">
                    <label>Color</label>
                    <input type="color" value={categoriaForm.color} onChange={(e) => setCategoriaForm({ ...categoriaForm, color: e.target.value })} style={{ width: '100%', height: '40px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={categoriaForm.activa} onChange={(e) => setCategoriaForm({ ...categoriaForm, activa: e.target.checked })} />
                    Categoría activa
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCategoriaModal(false)} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div className="modal-overlay" onClick={() => setShowIconPicker(false)}>
          <div className="icon-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="icon-picker-header">
              <input
                type="text"
                placeholder="Buscar icono..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </div>
            <div className="icon-picker-grid">
              {popularIcons
                .filter(icon => icon.toLowerCase().includes(iconSearch.toLowerCase()))
                .map(icon => (
                  <div
                    key={icon}
                    className={`icon-picker-item ${categoriaForm.icono === icon ? 'selected' : ''}`}
                    onClick={() => {
                      setCategoriaForm({ ...categoriaForm, icono: icon });
                      setShowIconPicker(false);
                    }}
                  >
                    {renderLucideIcon(icon, 20)}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Eliminar {deleteConfirm.tipo}</h3>
            <p>¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button onClick={() => setDeleteConfirm(null)} className="btn-cancel">Cancelar</button>
              <button onClick={handleDelete} className="btn-danger">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
