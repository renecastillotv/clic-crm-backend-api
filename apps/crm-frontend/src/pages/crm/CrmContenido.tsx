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
import '../../components/Modal.css';
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
  syncYouTubeStats,
  generateArticleAI,
  generateFAQsAI,
  generateSeoStatAI,
  createArticulo,
  createFaq,
  createSeoStat,
  Articulo,
  Video,
  FAQ,
  Testimonio,
  SeoStat,
  CategoriaContenido,
  ContenidoRelacion,
  Propiedad,
  AIArticlePrompt,
  AIFAQPrompt,
  AISeoStatPrompt,
  GeneratedArticle,
  GeneratedFAQ,
  GeneratedSeoStat,
} from '../../services/api';
import { contenidoStyles } from './contenido/sharedStyles';
import { stripHtml } from './contenido/utils';
import { useIdiomas } from '../../services/idiomas';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

// Interface para permisos de contenido
interface PermisosContenido {
  articulos: boolean;
  videos: boolean;
  testimonios: boolean;
  faqs: boolean;
  seo_stats: boolean;
  categorias: boolean;
  relaciones: boolean;
}

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
  eye: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
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

// Iconos populares para categorías - Lista expandida con todas las categorías útiles
const popularIcons = [
  // Documentos y archivos
  'FileText', 'File', 'Files', 'Folder', 'FolderOpen', 'Archive', 'Paperclip', 'ClipboardList',
  // Media
  'Video', 'Image', 'Camera', 'Film', 'Music', 'Headphones', 'Mic', 'Play', 'Youtube',
  // Lectura y educación
  'BookOpen', 'Book', 'BookMarked', 'Library', 'GraduationCap', 'School', 'Lightbulb', 'Brain',
  // Etiquetas y categorías
  'Tag', 'Tags', 'Bookmark', 'Flag', 'Label', 'Hash', 'AtSign',
  // Valoración y feedback
  'Star', 'Heart', 'ThumbsUp', 'ThumbsDown', 'Award', 'Trophy', 'Medal', 'Crown',
  // Comunicación
  'MessageCircle', 'MessageSquare', 'Mail', 'Send', 'Phone', 'PhoneCall', 'Bell', 'Megaphone',
  // Tiempo y calendario
  'Calendar', 'CalendarDays', 'Clock', 'Timer', 'Hourglass', 'History', 'AlarmClock',
  // Ubicación y navegación
  'MapPin', 'Map', 'Compass', 'Navigation', 'Globe', 'Earth', 'Locate',
  // Links y compartir
  'Link', 'Link2', 'ExternalLink', 'Share', 'Share2', 'QrCode', 'Scan',
  // Acciones
  'Download', 'Upload', 'Save', 'Copy', 'Trash2', 'Edit', 'Pencil', 'Eraser',
  // Búsqueda y filtros
  'Search', 'Filter', 'SlidersHorizontal', 'Settings', 'Cog', 'Wrench', 'Tool',
  // Usuarios y personas
  'User', 'Users', 'UserPlus', 'UserCheck', 'Contact', 'BadgeCheck', 'CircleUser',
  // Inmobiliario y propiedades
  'Home', 'Building', 'Building2', 'Castle', 'Hotel', 'Warehouse', 'Store', 'Landmark',
  'DoorOpen', 'Key', 'KeyRound', 'Bed', 'Bath', 'Sofa', 'Lamp', 'Tv',
  // Trabajo y negocios
  'Briefcase', 'Wallet', 'CreditCard', 'DollarSign', 'Coins', 'PiggyBank', 'Receipt', 'FileSpreadsheet',
  'PieChart', 'BarChart', 'TrendingUp', 'TrendingDown', 'Activity', 'Target', 'Crosshair',
  // Naturaleza y exterior
  'Sun', 'Moon', 'Cloud', 'CloudSun', 'Umbrella', 'Tree', 'Flower', 'Mountain', 'Waves',
  // Transporte
  'Car', 'Plane', 'Ship', 'Train', 'Bike', 'Bus', 'Truck', 'Rocket',
  // Tecnología
  'Laptop', 'Monitor', 'Smartphone', 'Tablet', 'Wifi', 'Bluetooth', 'Cpu', 'HardDrive',
  // Seguridad
  'Shield', 'ShieldCheck', 'Lock', 'Unlock', 'Eye', 'EyeOff', 'Fingerprint',
  // Estado y alertas
  'CheckCircle', 'XCircle', 'AlertCircle', 'AlertTriangle', 'Info', 'HelpCircle', 'Ban',
  // Otros útiles
  'Gift', 'Cake', 'PartyPopper', 'Sparkles', 'Flame', 'Zap', 'Battery', 'Plug',
  'Package', 'Box', 'Boxes', 'ShoppingCart', 'ShoppingBag', 'Percent',
  'Palette', 'Brush', 'Scissors', 'Ruler', 'Calculator', 'Printer',
];

export default function CrmContenido() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenantActual, puedeCrear, puedeEditar, puedeEliminar, tieneAcceso, isPlatformAdmin } = useAuth();
  const { getToken } = useClerkAuth();
  const canCreate = puedeCrear('contenido');
  const canEdit = puedeEditar('contenido');
  const canDelete = puedeEliminar('contenido');
  const { setPageHeader } = usePageHeader();

  // Es admin si tiene acceso a contenido-config o es platform admin
  const esAdmin = isPlatformAdmin || tieneAcceso('contenido-config');

  // Es admin real (por rol, no por permiso) - para funciones exclusivas como IA
  // Verifica si tiene rol tenant_admin o tenant_owner, o es platform admin
  const esAdminReal = isPlatformAdmin ||
    tenantActual?.roles?.some((r: any) => ['tenant_admin', 'tenant_owner', 'admin', 'superadmin'].includes(r.codigo));

  // Permisos de contenido para usuarios no-admin
  const [permisosContenido, setPermisosContenido] = useState<PermisosContenido>({
    articulos: true,
    videos: true,
    testimonios: true,
    faqs: true,
    seo_stats: true,
    categorias: true,
    relaciones: true,
  });

  // Idiomas del tenant (para traducciones)
  const { idiomas } = useIdiomas(tenantActual?.id);
  // Filtrar idiomas secundarios (excluir español que es el idioma principal)
  const idiomasSecundarios = idiomas.filter(i => i.code !== 'es' && i.activo);

  // Tab activo desde URL
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'articulos');

  // Estados generales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ tipo: string; id: string } | null>(null);
  const [showYouTubeImportModal, setShowYouTubeImportModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [importingYouTube, setImportingYouTube] = useState(false);
  const [youtubeImportMode, setYoutubeImportMode] = useState<'video' | 'channel'>('video');
  const [youtubePreview, setYoutubePreview] = useState<any>(null);
  const [youtubePreviewLoading, setYoutubePreviewLoading] = useState(false);
  const [youtubePreviewError, setYoutubePreviewError] = useState<string | null>(null);
  const [channelVideos, setChannelVideos] = useState<any[]>([]);
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; importing: boolean }>({ current: 0, total: 0, importing: false });
  // Estados adicionales para importación avanzada
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [videoTypeFilter, setVideoTypeFilter] = useState<'all' | 'regular' | 'shorts'>('all');
  const [channelPlaylists, setChannelPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [importCategoryId, setImportCategoryId] = useState<string>('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  // Canales de YouTube recientes (para sugerencias)
  const [recentChannels, setRecentChannels] = useState<Array<{ url: string; nombre: string; thumbnailUrl?: string }>>([]);

  // Cargar canales recientes desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`youtube_channels_${tenantActual?.id}`);
      if (saved) {
        setRecentChannels(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading recent channels:', e);
    }
  }, [tenantActual?.id]);

  // Función para guardar un canal como reciente
  const saveRecentChannel = (channel: { url: string; nombre: string; thumbnailUrl?: string }) => {
    if (!tenantActual?.id) return;
    const updated = [channel, ...recentChannels.filter(c => c.url !== channel.url)].slice(0, 5);
    setRecentChannels(updated);
    localStorage.setItem(`youtube_channels_${tenantActual.id}`, JSON.stringify(updated));
  };

  // Datos de cada tab
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Selección múltiple para acciones masivas en la lista de videos
  const [selectedCrmVideos, setSelectedCrmVideos] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Paginación de videos
  const [videosPagination, setVideosPagination] = useState({ total: 0, limit: 20, offset: 0 });
  const [syncingStats, setSyncingStats] = useState(false);

  const [testimonios, setTestimonios] = useState<Testimonio[]>([]);
  const [seoStats, setSeoStats] = useState<SeoStat[]>([]);
  const [categorias, setCategorias] = useState<CategoriaContenido[]>([]);
  const [relaciones, setRelaciones] = useState<ContenidoRelacion[]>([]);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroPublicado, setFiltroPublicado] = useState<boolean | undefined>(undefined);
  const [filtroTipo, setFiltroTipo] = useState('');

  // Vista de testimonios (cards o lista)
  const [testimoniosViewMode, setTestimoniosViewMode] = useState<'cards' | 'list'>('cards');

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
    // Traducciones
    traducciones: {} as Record<string, { nombre?: string; descripcion?: string }>,
    slugTraducciones: {} as Record<string, string>,
  });
  const [showTraducciones, setShowTraducciones] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal de generación con IA
  const [showAIModal, setShowAIModal] = useState<'articulo' | 'faq' | 'seo-stat' | null>(null);
  const [aiGenerating, setAIGenerating] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [aiGenerated, setAIGenerated] = useState<GeneratedArticle | GeneratedFAQ[] | GeneratedSeoStat | null>(null);
  const [aiForm, setAIForm] = useState({
    tema: '',
    contexto: '',
    tipoPropiedad: '',
    operacion: '',
    ubicacion: '',
    tono: 'profesional' as 'profesional' | 'casual' | 'informativo',
    longitud: 'medio' as 'corto' | 'medio' | 'largo',
    cantidad: 5,
    operaciones: [] as string[],
    nombreUbicacion: '',
    nombreTipoPropiedad: '',
  });
  const [aiSaving, setAISaving] = useState(false);

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

  // Cargar permisos de contenido para usuarios no-admin
  useEffect(() => {
    const loadPermisosContenido = async () => {
      if (!tenantActual?.id || esAdmin) return; // Admin tiene acceso a todo

      try {
        const token = await getToken();
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/configuracion/permisos-contenido`,
          {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setPermisosContenido(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error('Error cargando permisos de contenido:', error);
      }
    };

    loadPermisosContenido();
  }, [tenantActual?.id, esAdmin, getToken]);

  // Verificar si un tab está permitido
  const tabPermitido = (tab: TabType): boolean => {
    if (esAdmin) return true; // Admin tiene acceso a todo

    const mapeo: Record<TabType, keyof PermisosContenido> = {
      articulos: 'articulos',
      videos: 'videos',
      faqs: 'faqs',
      testimonios: 'testimonios',
      seo: 'seo_stats',
      categorias: 'categorias',
      relacionar: 'relaciones',
    };

    return permisosContenido[mapeo[tab]] ?? false;
  };

  // Redirigir al primer tab permitido si el actual no lo es
  useEffect(() => {
    if (esAdmin) return; // Admin tiene acceso a todo

    const tabs: TabType[] = ['articulos', 'videos', 'faqs', 'testimonios', 'seo', 'categorias', 'relacionar'];

    if (!tabPermitido(activeTab)) {
      const primerTabPermitido = tabs.find(tab => tabPermitido(tab));
      if (primerTabPermitido) {
        handleTabChange(primerTabPermitido);
      }
    }
  }, [permisosContenido, activeTab, esAdmin]);

  // Configurar header según tab
  useEffect(() => {
    const getHeaderConfig = () => {
      const configs: Record<TabType, { title: string; subtitle: string; action?: React.ReactNode }> = {
        articulos: {
          title: 'Artículos',
          subtitle: 'Gestiona los artículos de tu blog',
          action: canCreate ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              {esAdminReal && (
                <button
                  onClick={() => { setShowAIModal('articulo'); setAIGenerated(null); setAIError(null); }}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <LucideIcons.Sparkles size={16} />
                  Crear con IA
                </button>
              )}
              <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/articulos/nuevo`)} className="btn-primary">
                <span className="icon">{Icons.plus}</span>
                Nuevo Artículo
              </button>
            </div>
          ) : undefined,
        },
        videos: {
          title: 'Videos',
          subtitle: 'Gestiona tu galería de videos',
          action: canCreate ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowYouTubeImportModal(true)}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <LucideIcons.Youtube size={16} />
                Importar YouTube
              </button>
              <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/videos/nuevo`)} className="btn-primary">
                <span className="icon">{Icons.plus}</span>
                Nuevo Video
              </button>
            </div>
          ) : undefined,
        },
        faqs: {
          title: 'FAQs',
          subtitle: 'Gestiona las preguntas frecuentes',
          action: canCreate ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              {esAdminReal && (
                <button
                  onClick={() => { setShowAIModal('faq'); setAIGenerated(null); setAIError(null); }}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <LucideIcons.Sparkles size={16} />
                  Crear con IA
                </button>
              )}
              <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/faqs/nuevo`)} className="btn-primary">
                <span className="icon">{Icons.plus}</span>
                Nueva FAQ
              </button>
            </div>
          ) : undefined,
        },
        testimonios: {
          title: 'Testimonios',
          subtitle: 'Gestiona los testimonios de tus clientes',
          action: canCreate ? (
            <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/testimonios/nuevo`)} className="btn-primary">
              <span className="icon">{Icons.plus}</span>
              Nuevo Testimonio
            </button>
          ) : undefined,
        },
        seo: {
          title: 'SEO Stats',
          subtitle: 'Contenido enriquecido para SEO',
          action: canCreate ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              {esAdminReal && (
                <button
                  onClick={() => { setShowAIModal('seo-stat'); setAIGenerated(null); setAIError(null); }}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <LucideIcons.Sparkles size={16} />
                  Crear con IA
                </button>
              )}
              <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/seo-stats/nuevo`)} className="btn-primary">
                <span className="icon">{Icons.plus}</span>
                Nuevo SEO Stat
              </button>
            </div>
          ) : undefined,
        },
        categorias: {
          title: 'Categorías',
          subtitle: 'Organiza tu contenido por categorías',
          action: canCreate ? (
            <button onClick={() => { setEditingCategoria(null); resetCategoriaForm(); setShowCategoriaModal(true); }} className="btn-primary">
              <span className="icon">{Icons.plus}</span>
              Nueva Categoría
            </button>
          ) : undefined,
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
  }, [activeTab, setPageHeader, navigate, tenantSlug, canCreate, esAdmin, esAdminReal]);

  // Resetear paginación cuando cambian los filtros
  useEffect(() => {
    setVideosPagination(prev => ({ ...prev, offset: 0 }));
  }, [busqueda, filtroCategoria, filtroPublicado]);

  // Cargar datos según tab activo
  useEffect(() => {
    if (!tenantActual?.id) return;
    loadData();
  }, [tenantActual?.id, activeTab, busqueda, filtroCategoria, filtroPublicado, filtroTipo, videosPagination.offset]);

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
          const vidsResponse = await getVideos(tenantActual.id, {
            search: busqueda || undefined,
            categoriaId: filtroCategoria || undefined,
            publicado: filtroPublicado,
            limit: videosPagination.limit,
            offset: videosPagination.offset,
          });
          setVideos(vidsResponse.videos);
          setVideosPagination(prev => ({
            ...prev,
            total: vidsResponse.total
          }));
          // Limpiar selección al cambiar de página o filtrar
          setSelectedCrmVideos(new Set());
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

      // Cargar categorías para filtros (solo para tabs que las usan)
      if (activeTab !== 'categorias' && activeTab !== 'relacionar') {
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
    // NOTA: Las relaciones se cargan automáticamente via useEffect cuando se selecciona contenidoOrigenSeleccionado
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
    // Usar modo bidireccional para ver relaciones donde el contenido sea origen O destino
    const rels = await getRelacionesContenido(tenantActual.id, {
      bidireccional: true,
      contenidoId: contenidoOrigenSeleccionado.id,
      contenidoTipo: tipoContenidoOrigen
    });
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

  // Handler de actualización masiva de videos
  const handleBulkUpdateVideos = async (action: 'publicar' | 'despublicar') => {
    if (!tenantActual?.id || selectedCrmVideos.size === 0) return;
    setBulkUpdating(true);
    try {
      const newStatus = action === 'publicar';
      const videoIds = Array.from(selectedCrmVideos);

      // Actualizar cada video
      for (const id of videoIds) {
        const vid = videos.find(v => v.id === id);
        if (vid) {
          const { tagIds, ...videoData } = vid as any;
          await updateVideo(tenantActual.id, id, { ...videoData, publicado: newStatus });
        }
      }

      // Actualizar estado local
      setVideos(prev => prev.map(v =>
        selectedCrmVideos.has(v.id) ? { ...v, publicado: newStatus } : v
      ));

      // Limpiar selección
      setSelectedCrmVideos(new Set());
      setSuccessMessage(`${videoIds.length} videos ${action === 'publicar' ? 'publicados' : 'despublicados'} correctamente`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar videos');
    } finally {
      setBulkUpdating(false);
    }
  };

  // Handler de sincronizar vistas de YouTube
  const handleSyncYouTubeStats = async () => {
    if (!tenantActual?.id) return;
    setSyncingStats(true);
    try {
      const result = await syncYouTubeStats(tenantActual.id);
      if (result.success) {
        setSuccessMessage(`Sincronización completada: ${result.summary.updated} de ${result.summary.total} videos actualizados`);
        setTimeout(() => setSuccessMessage(null), 5000);
        // Recargar videos para mostrar las vistas actualizadas
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar vistas de YouTube');
    } finally {
      setSyncingStats(false);
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
      traducciones: {},
      slugTraducciones: {},
    });
    setShowTraducciones(false);
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
      // Preparar datos con snake_case para el API
      const data = {
        slug: categoriaForm.slug || generateSlug(categoriaForm.nombre),
        tipo: categoriaForm.tipo,
        nombre: categoriaForm.nombre,
        descripcion: categoriaForm.descripcion,
        icono: categoriaForm.icono,
        color: categoriaForm.color,
        orden: categoriaForm.orden,
        activa: categoriaForm.activa,
        traducciones: categoriaForm.traducciones,
        slug_traducciones: categoriaForm.slugTraducciones,
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
      traducciones: cat.traducciones || {},
      slugTraducciones: cat.slug_traducciones || {},
    });
    setShowTraducciones(Object.keys(cat.traducciones || {}).length > 0 || Object.keys(cat.slug_traducciones || {}).length > 0);
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
        const cantidad = propiedadesSeleccionadas.length;
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
        await loadRelacionesOrigen();
        // Mostrar mensaje de éxito
        setSuccessMessage(`${cantidad} relación${cantidad > 1 ? 'es' : ''} creada${cantidad > 1 ? 's' : ''} exitosamente`);
        setTimeout(() => setSuccessMessage(null), 4000);
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
        const nombreDestino = getContenidoNombre(contenidoDestinoSeleccionado);
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
        await loadRelacionesOrigen();
        // Mostrar mensaje de éxito
        setSuccessMessage(`Relación con "${nombreDestino}" creada exitosamente`);
        setTimeout(() => setSuccessMessage(null), 4000);
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

  // Obtener nombre de contenido relacionado por tipo e ID
  // NOTA: Este es un fallback - el nombre debería venir del backend (nombreOrigen/nombreDestino)
  const getRelacionNombre = (tipo: string, id: string): string => {
    // Fallback: solo mostrar ID truncado (sin repetir el tipo ya que hay etiqueta)
    const fallbackId = id.slice(0, 8) + '...';
    switch (tipo) {
      case 'articulo':
        const articulo = articulos.find(a => a.id === id);
        return articulo?.titulo || fallbackId;
      case 'video':
        const video = videos.find(v => v.id === id);
        return video?.titulo || fallbackId;
      case 'faq':
        const faq = faqs.find(f => f.id === id);
        if (faq?.pregunta) {
          return faq.pregunta.length > 40 ? faq.pregunta.slice(0, 40) + '...' : faq.pregunta;
        }
        return fallbackId;
      case 'testimonio':
        const testimonio = testimonios.find(t => t.id === id) as any;
        return testimonio?.cliente_nombre || testimonio?.autor || fallbackId;
      case 'seo_stat':
        const seo = seoStats.find(s => s.id === id);
        return seo?.titulo || fallbackId;
      case 'propiedad':
        const prop = propiedadesDestino.find(p => p.id === id);
        return prop?.titulo || prop?.codigo_interno || fallbackId;
      default:
        return fallbackId;
    }
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
              {articulos.map(art => {
                // Soportar tanto snake_case (API) como camelCase
                const a = art as any;
                const imagenPrincipal = a.imagenPrincipal || a.imagen_principal;
                const categoriaId = a.categoriaId || a.categoria_id;
                return (
                <tr key={art.id}>
                  <td>
                    <div className="item-with-image">
                      {imagenPrincipal ? (
                        <img src={imagenPrincipal} alt={art.titulo} className="item-thumb" />
                      ) : (
                        <div className="item-thumb-placeholder">{Icons.articulo}</div>
                      )}
                      <div className="item-info">
                        <div className="item-title">{art.titulo}</div>
                        {art.extracto && <div className="item-excerpt">{stripHtml(art.extracto, 60)}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{categorias.find(c => c.id === categoriaId)?.nombre || '-'}</td>
                  <td>
                    <button
                      onClick={() => canEdit && handleTogglePublicado('articulo', art.id, art.publicado)}
                      className={`status-btn ${art.publicado ? 'published' : 'draft'}`}
                      style={!canEdit ? { cursor: 'default', opacity: 0.7 } : undefined}
                    >
                      {art.publicado ? 'Publicado' : 'Borrador'}
                    </button>
                  </td>
                  <td>{art.vistas || 0}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/articulos/${art.id}${!canEdit ? '?mode=ver' : ''}`)} className="action-btn" title={canEdit ? 'Editar' : 'Ver'}>{canEdit ? Icons.edit : Icons.eye}</button>
                      {canDelete && <button onClick={() => setDeleteConfirm({ tipo: 'articulo', id: art.id })} className="action-btn action-btn-danger">{Icons.trash}</button>}
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderVideosList = () => {
    const totalPages = Math.ceil(videosPagination.total / videosPagination.limit);
    const currentPage = Math.floor(videosPagination.offset / videosPagination.limit) + 1;

    return (
    <>
      {videos.length === 0 && !busqueda ? (
        <div className="empty-state">
          <div className="empty-icon">{Icons.video}</div>
          <h3>No hay videos</h3>
          <p>Crea tu primer video</p>
        </div>
      ) : videos.length === 0 && busqueda ? (
        <div className="empty-state">
          <div className="empty-icon">{Icons.video}</div>
          <h3>Sin resultados</h3>
          <p>No se encontraron videos con "{busqueda}"</p>
        </div>
      ) : (
        <>
          {/* Barra de herramientas: Sincronizar y total */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            padding: '8px 0'
          }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              {videosPagination.total} video{videosPagination.total !== 1 ? 's' : ''} en total
            </span>
            {canEdit && (
              <button
                onClick={handleSyncYouTubeStats}
                disabled={syncingStats}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  cursor: syncingStats ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}
                title="Sincronizar vistas desde YouTube"
              >
                {syncingStats ? (
                  <LucideIcons.Loader2 size={16} className="animate-spin" />
                ) : (
                  <LucideIcons.RefreshCw size={16} />
                )}
                {syncingStats ? 'Sincronizando...' : 'Sincronizar Vistas YouTube'}
              </button>
            )}
          </div>

          {/* Barra de acciones masivas */}
          {selectedCrmVideos.size > 0 && canEdit && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: '#eff6ff',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid #bfdbfe'
            }}>
              <span style={{ fontWeight: 600, color: '#1e40af' }}>
                {selectedCrmVideos.size} video{selectedCrmVideos.size > 1 ? 's' : ''} seleccionado{selectedCrmVideos.size > 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button
                  onClick={() => handleBulkUpdateVideos('publicar')}
                  disabled={bulkUpdating}
                  style={{
                    padding: '6px 12px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: bulkUpdating ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {bulkUpdating ? <LucideIcons.Loader2 size={14} className="animate-spin" /> : <LucideIcons.Eye size={14} />}
                  Publicar
                </button>
                <button
                  onClick={() => handleBulkUpdateVideos('despublicar')}
                  disabled={bulkUpdating}
                  style={{
                    padding: '6px 12px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: bulkUpdating ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {bulkUpdating ? <LucideIcons.Loader2 size={14} className="animate-spin" /> : <LucideIcons.EyeOff size={14} />}
                  Despublicar
                </button>
                <button
                  onClick={() => setSelectedCrmVideos(new Set())}
                  style={{
                    padding: '6px 12px',
                    background: '#e2e8f0',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {canEdit && (
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={videos.length > 0 && selectedCrmVideos.size === videos.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCrmVideos(new Set(videos.map(v => v.id)));
                          } else {
                            setSelectedCrmVideos(new Set());
                          }
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        title="Seleccionar todos"
                      />
                    </th>
                  )}
                  <th>TÍTULO</th>
                  <th>CATEGORÍA</th>
                  <th>TIPO</th>
                  <th>ESTADO</th>
                  <th>VISTAS</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {videos.map(vid => {
                  // Soportar tanto snake_case (API) como camelCase
                  const v = vid as any;
                  const thumbnail = v.thumbnail || v.thumbnail_url;
                  const categoriaId = v.categoriaId || v.categoria_id;
                  const tipoVideo = v.tipoVideo || v.tipo_video || v.plataforma || '-';
                  const isSelected = selectedCrmVideos.has(vid.id);
                  return (
                  <tr key={vid.id} style={{ background: isSelected ? '#eff6ff' : undefined }}>
                    {canEdit && (
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSet = new Set(selectedCrmVideos);
                            if (e.target.checked) {
                              newSet.add(vid.id);
                            } else {
                              newSet.delete(vid.id);
                            }
                            setSelectedCrmVideos(newSet);
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td>
                      <div className="item-with-image">
                        {thumbnail ? (
                          <img src={thumbnail} alt={vid.titulo} className="item-thumb" />
                        ) : (
                          <div className="item-thumb-placeholder">{Icons.video}</div>
                        )}
                        <div className="item-info">
                          <div className="item-title">{vid.titulo}</div>
                          {vid.descripcion && <div className="item-excerpt">{stripHtml(vid.descripcion, 60)}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{categorias.find(c => c.id === categoriaId)?.nombre || '-'}</td>
                    <td>{tipoVideo}</td>
                    <td>
                      <button
                        onClick={() => canEdit && handleTogglePublicado('video', vid.id, vid.publicado)}
                        className={`status-btn ${vid.publicado ? 'published' : 'draft'}`}
                        style={!canEdit ? { cursor: 'default', opacity: 0.7 } : undefined}
                      >
                        {vid.publicado ? 'Publicado' : 'Borrador'}
                      </button>
                    </td>
                    <td>{vid.vistas || 0}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/videos/${vid.id}${!canEdit ? '?mode=ver' : ''}`)} className="action-btn" title={canEdit ? 'Editar' : 'Ver'}>{canEdit ? Icons.edit : Icons.eye}</button>
                        {canDelete && <button onClick={() => setDeleteConfirm({ tipo: 'video', id: vid.id })} className="action-btn action-btn-danger">{Icons.trash}</button>}
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>

          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '16px',
              padding: '12px 0'
            }}>
              <button
                onClick={() => setVideosPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  background: currentPage === 1 ? '#f1f5f9' : '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <LucideIcons.ChevronLeft size={16} />
                Anterior
              </button>
              <span style={{ fontSize: '0.9rem', color: '#475569' }}>
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setVideosPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  background: currentPage === totalPages ? '#f1f5f9' : '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Siguiente
                <LucideIcons.ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
  };

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
                      onClick={() => canEdit && handleTogglePublicado('faq', faq.id, faq.publicado)}
                      className={`status-btn ${faq.publicado ? 'published' : 'draft'}`}
                      style={!canEdit ? { cursor: 'default', opacity: 0.7 } : undefined}
                    >
                      {faq.publicado ? 'Publicado' : 'Borrador'}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/faqs/${faq.id}${!canEdit ? '?mode=ver' : ''}`)} className="action-btn" title={canEdit ? 'Editar' : 'Ver'}>{canEdit ? Icons.edit : Icons.eye}</button>
                      {canDelete && <button onClick={() => setDeleteConfirm({ tipo: 'faq', id: faq.id })} className="action-btn action-btn-danger">{Icons.trash}</button>}
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

  // Helper para obtener iniciales
  const getInitials = (nombre: string) => {
    if (!nombre) return '?';
    const parts = nombre.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Colores para avatares sin foto
  const avatarColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  const getAvatarColor = (nombre: string) => {
    if (!nombre) return avatarColors[0];
    const index = nombre.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  const renderTestimoniosList = () => (
    <>
      {testimonios.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{Icons.testimonio}</div>
          <h3>No hay testimonios</h3>
          <p>{busqueda ? 'No se encontraron testimonios' : 'Crea tu primer testimonio'}</p>
        </div>
      ) : (
        <>
          {testimoniosViewMode === 'cards' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '20px',
              padding: '4px'
            }}>
              {testimonios.map(test => {
                // Campos en snake_case del API
                const t = test as any;
                const clienteFoto = t.cliente_foto;
                const clienteNombre = t.cliente_nombre || 'Cliente';
                const clienteCargo = t.cliente_cargo;
                const clienteEmpresa = t.cliente_empresa;
                const titulo = t.titulo || '';
                const rating = t.rating || 0;
                const publicado = t.publicado;

            return (
              <div
                key={test.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Quote icon decorativo */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '20px',
                  fontSize: '48px',
                  lineHeight: 1,
                  color: '#e2e8f0',
                  fontFamily: 'Georgia, serif',
                  fontWeight: 'bold',
                  opacity: 0.6
                }}>"</div>

                {/* Header: Avatar + Info del cliente */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {clienteFoto ? (
                    <img
                      src={clienteFoto}
                      alt={clienteNombre}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #f1f5f9'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${getAvatarColor(clienteNombre)}, ${getAvatarColor(clienteNombre)}dd)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: '600',
                      letterSpacing: '0.5px',
                      border: '3px solid #f1f5f9'
                    }}>
                      {getInitials(clienteNombre)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '600',
                      fontSize: '15px',
                      color: '#1e293b',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>{clienteNombre}</div>
                    {(clienteCargo || clienteEmpresa) && (
                      <div style={{
                        fontSize: '13px',
                        color: '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {[clienteCargo, clienteEmpresa].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Título si existe */}
                {titulo && (
                  <div style={{
                    fontWeight: '600',
                    fontSize: '15px',
                    color: '#334155',
                    lineHeight: '1.4'
                  }}>{titulo}</div>
                )}

                {/* Contenido del testimonio */}
                <div style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: '1.65',
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {stripHtml(test.contenido, 200)}
                </div>

                {/* Footer: Rating + Estado + Acciones */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  {/* Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} style={{
                        color: star <= rating ? '#fbbf24' : '#e2e8f0',
                        fontSize: '16px'
                      }}>★</span>
                    ))}
                  </div>

                  {/* Estado + Acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => canEdit && handleTogglePublicado('testimonio', test.id, publicado)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        border: 'none',
                        cursor: canEdit ? 'pointer' : 'default',
                        opacity: canEdit ? 1 : 0.7,
                        background: publicado ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#fef3c7',
                        color: publicado ? 'white' : '#92400e'
                      }}
                    >
                      {publicado ? 'Publicado' : 'Borrador'}
                    </button>
                    <button
                      onClick={() => navigate(`/crm/${tenantSlug}/contenido/testimonios/${test.id}${!canEdit ? '?mode=ver' : ''}`)}
                      title={canEdit ? 'Editar' : 'Ver'}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.color = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      {canEdit ? Icons.edit : Icons.eye}
                    </button>
                    {canDelete && <button
                      onClick={() => setDeleteConfirm({ tipo: 'testimonio', id: test.id })}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      {Icons.trash}
                    </button>}
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          ) : (
            /* Vista de Lista */
            <div className="table-container">
              <table className="data-table testimonios-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>CLIENTE</th>
                    <th style={{ width: '16%' }}>TÍTULO</th>
                    <th style={{ width: '32%' }}>CONTENIDO</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>RATING</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>ESTADO</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {testimonios.map(test => {
                    const t = test as any;
                    const clienteFoto = t.cliente_foto;
                    const clienteNombre = t.cliente_nombre || 'Cliente';
                    const clienteCargo = t.cliente_cargo;
                    const clienteEmpresa = t.cliente_empresa;
                    const titulo = t.titulo || '';
                    const rating = t.rating || 0;
                    const publicado = t.publicado;

                    return (
                      <tr key={test.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {clienteFoto ? (
                              <img
                                src={clienteFoto}
                                alt={clienteNombre}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${getAvatarColor(clienteNombre)}, ${getAvatarColor(clienteNombre)}dd)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: '600'
                              }}>
                                {getInitials(clienteNombre)}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: '500', color: '#1e293b' }}>{clienteNombre}</div>
                              {(clienteCargo || clienteEmpresa) && (
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                  {[clienteCargo, clienteEmpresa].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{titulo || '-'}</td>
                        <td style={{ maxWidth: '300px' }}>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {stripHtml(test.contenido, 100)}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '1px', justifyContent: 'center' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} style={{
                                color: star <= rating ? '#fbbf24' : '#e2e8f0',
                                fontSize: '14px'
                              }}>★</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => canEdit && handleTogglePublicado('testimonio', test.id, publicado)}
                            className={`status-btn ${publicado ? 'published' : 'draft'}`}
                            style={!canEdit ? { cursor: 'default', opacity: 0.7 } : undefined}
                          >
                            {publicado ? 'Publicado' : 'Borrador'}
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="action-buttons">
                            <button
                              className="action-btn"
                              onClick={() => navigate(`/crm/${tenantSlug}/contenido/testimonios/${test.id}${!canEdit ? '?mode=ver' : ''}`)}
                              title={canEdit ? 'Editar' : 'Ver'}
                            >
                              {canEdit ? Icons.edit : Icons.eye}
                            </button>
                            {canDelete && <button
                              className="action-btn action-btn-danger"
                              onClick={() => setDeleteConfirm({ tipo: 'testimonio', id: test.id })}
                              title="Eliminar"
                            >
                              {Icons.trash}
                            </button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
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
              {seoStats.map(seo => {
                // Soportar tanto snake_case (API) como camelCase
                const s = seo as any;
                const tipoAsociacion = s.tipoAsociacion || s.tipo_asociacion || '-';
                const asociacionNombre = s.asociacionNombre || s.asociacion_nombre || '-';

                return (
                  <tr key={seo.id}>
                    <td><div className="item-title">{seo.titulo}</div></td>
                    <td>{tipoAsociacion}</td>
                    <td>{asociacionNombre}</td>
                    <td>
                      <button
                        onClick={() => canEdit && handleTogglePublicado('seo', seo.id, seo.publicado)}
                        className={`status-btn ${seo.publicado ? 'published' : 'draft'}`}
                        style={!canEdit ? { cursor: 'default', opacity: 0.7 } : undefined}
                      >
                        {seo.publicado ? 'Publicado' : 'Borrador'}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => navigate(`/crm/${tenantSlug}/contenido/seo-stats/${seo.id}${!canEdit ? '?mode=ver' : ''}`)} className="action-btn" title={canEdit ? 'Editar' : 'Ver'}>{canEdit ? Icons.edit : Icons.eye}</button>
                        {canDelete && <button onClick={() => setDeleteConfirm({ tipo: 'seo', id: seo.id })} className="action-btn action-btn-danger">{Icons.trash}</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                      {canEdit && <button onClick={() => handleEditCategoria(cat)} className="action-btn" title="Editar">{Icons.edit}</button>}
                      {canDelete && <button onClick={() => setDeleteConfirm({ tipo: 'categoria', id: cat.id })} className="action-btn action-btn-danger">{Icons.trash}</button>}
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
  const puedeCrearRelacion = canCreate && contenidoOrigenSeleccionado && tipoContenidoDestino &&
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
                            {c.publicado ? 'Publicado' : 'Borrador'}
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

          {/* Relaciones existentes del origen seleccionado (bidireccional) */}
          {contenidoOrigenSeleccionado && relaciones.length > 0 && (() => {
            // Separar relaciones salientes (este contenido apunta a) y entrantes (este contenido es referenciado por)
            const relacionesSalientes = relaciones.filter(r => r.direccion === 'origen');
            const relacionesEntrantes = relaciones.filter(r => r.direccion === 'destino');

            return (
              <div className="rel-existing-section">
                <div className="rel-existing-header">
                  {Icons.link}
                  <span>Relaciones ({relaciones.length})</span>
                </div>

                {/* Relaciones salientes - Este contenido apunta a */}
                {relacionesSalientes.length > 0 && (
                  <div className="rel-group">
                    <div className="rel-group-title outgoing">
                      <span className="rel-group-arrow">→</span>
                      <span>Apunta a ({relacionesSalientes.length})</span>
                    </div>
                    <div className="rel-existing-list-compact">
                      {relacionesSalientes.map(rel => {
                        const tipoInfo = TIPOS_DESTINO_BUTTONS.find(t => t.value === rel.tipoDestino);
                        // Usar nombreDestino del backend, fallback a getRelacionNombre si no existe
                        const nombreRelacionado = rel.nombreDestino || getRelacionNombre(rel.tipoDestino, rel.idDestino);
                        return (
                          <div key={rel.id} className="rel-existing-row outgoing">
                            <span
                              className="rel-existing-badge"
                              style={{ background: tipoInfo?.color || '#6366f1' }}
                            >
                              {tipoInfo?.label || rel.tipoDestino}
                            </span>
                            <span className="rel-existing-name" title={nombreRelacionado}>
                              {nombreRelacionado}
                            </span>
                            {canDelete && <button
                              onClick={() => handleEliminarRelacion(rel.id)}
                              className="rel-delete-mini"
                              title="Eliminar relación"
                            >
                              {Icons.trash}
                            </button>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Relaciones entrantes - Este contenido es referenciado por */}
                {relacionesEntrantes.length > 0 && (
                  <div className="rel-group">
                    <div className="rel-group-title incoming">
                      <span className="rel-group-arrow">←</span>
                      <span>Referenciado por ({relacionesEntrantes.length})</span>
                    </div>
                    <div className="rel-existing-list-compact">
                      {relacionesEntrantes.map(rel => {
                        const tipoInfo = TIPOS_DESTINO_BUTTONS.find(t => t.value === rel.tipoOrigen);
                        // Usar nombreOrigen del backend, fallback a getRelacionNombre si no existe
                        const nombreRelacionado = rel.nombreOrigen || getRelacionNombre(rel.tipoOrigen, rel.idOrigen);
                        return (
                          <div key={rel.id} className="rel-existing-row incoming">
                            <span
                              className="rel-existing-badge"
                              style={{ background: tipoInfo?.color || '#6366f1' }}
                            >
                              {tipoInfo?.label || rel.tipoOrigen}
                            </span>
                            <span className="rel-existing-name" title={nombreRelacionado}>
                              {nombreRelacionado}
                            </span>
                            {canDelete && <button
                              onClick={() => handleEliminarRelacion(rel.id)}
                              className="rel-delete-mini"
                              title="Eliminar relación"
                            >
                              {Icons.trash}
                            </button>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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
        /* Banners de mensajes */
        .error-banner, .success-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 0.9rem;
          font-weight: 500;
          animation: slideDown 0.3s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .error-banner {
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          border: 1px solid #fecaca;
          color: #dc2626;
        }
        .success-banner {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 1px solid #bbf7d0;
          color: #16a34a;
        }
        .error-banner button, .success-banner button {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .error-banner button {
          color: #dc2626;
        }
        .error-banner button:hover {
          background: rgba(220, 38, 38, 0.1);
        }
        .success-banner button {
          color: #16a34a;
        }
        .success-banner button:hover {
          background: rgba(22, 163, 74, 0.1);
        }

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

        .rel-group { margin-bottom: 12px; }
        .rel-group:last-child { margin-bottom: 0; }
        .rel-group-title { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 0; }
        .rel-group-title.outgoing { color: #10b981; }
        .rel-group-title.incoming { color: #8b5cf6; }
        .rel-group-arrow { font-size: 1rem; font-weight: 700; }

        .rel-existing-list-compact { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; padding-left: 4px; }
        .rel-existing-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; transition: all 0.15s; }
        .rel-existing-row:hover { background: #f1f5f9; border-color: #cbd5e1; }
        .rel-existing-row.outgoing { border-left: 3px solid #10b981; }
        .rel-existing-row.incoming { border-left: 3px solid #8b5cf6; }
        .rel-existing-badge { color: white; padding: 4px 10px; border-radius: 6px; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; flex-shrink: 0; }
        .rel-existing-name { flex: 1; font-size: 0.8125rem; color: #334155; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rel-existing-id { flex: 1; font-size: 0.8125rem; color: #64748b; font-family: monospace; }
        .rel-direction-indicator { font-size: 1rem; font-weight: 700; color: #3b82f6; width: 18px; text-align: center; flex-shrink: 0; }
        .rel-delete-mini { width: 28px; height: 28px; border: none; background: transparent; color: #ef4444; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: all 0.15s; border-radius: 6px; }
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

        /* Modal Form para Categorías */
        .modal-form { max-width: 540px; }
        .modal-form.modal-categoria-amplio { max-width: 800px; }
        .modal-form .modal-body { padding: 24px; }
        .modal-form .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .modal-form .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .modal-form .form-group:last-child { margin-bottom: 0; }
        .modal-form .form-group label { font-weight: 500; color: #374151; font-size: 0.875rem; }
        .modal-form .form-group input,
        .modal-form .form-group select,
        .modal-form .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .modal-form .form-group input:focus,
        .modal-form .form-group select:focus,
        .modal-form .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        .modal-form .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; color: #374151; }
        .modal-form .checkbox-label input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 14px 14px; }
        .modal-actions .btn-cancel { padding: 10px 18px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; color: #64748b; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .modal-actions .btn-cancel:hover { background: #f1f5f9; border-color: #cbd5e1; }

        /* Sección de categoría con banderas */
        .categoria-seccion { background: #f8fafc; border-radius: 10px; padding: 16px; margin-bottom: 8px; }
        .categoria-seccion-titulo { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #1e293b; margin-bottom: 12px; font-size: 0.95rem; }
        .categoria-seccion-titulo .flag-emoji { font-size: 1.2rem; }
        .categoria-seccion .form-group { margin-bottom: 12px; }
        .categoria-seccion .form-group:last-child { margin-bottom: 0; }
        .traducciones-toggle:hover { color: #2563eb; }

        /* Icon Picker mejorado */
        .icon-picker-modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .icon-picker-header {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        .icon-picker-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
          gap: 8px;
          padding: 16px;
          overflow-y: auto;
          max-height: 400px;
        }
        .icon-picker-item {
          width: 100%;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.15s;
          background: #f8fafc;
        }
        .icon-picker-item:hover { background: #e2e8f0; border-color: #3b82f6; }
        .icon-picker-item.selected { background: #3b82f6; color: white; border-color: #2563eb; }

        /* ========== FILTERS BAR - Diseño mejorado ========== */
        .filters-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filters-bar .search-box {
          flex: 1;
          min-width: 280px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .filters-bar .search-box:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .filters-bar .search-box:focus-within {
          background: white;
          border-color: #3b82f6;
          box-shadow: none;
        }

        .filters-bar .search-box .search-icon {
          color: #94a3b8;
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .filters-bar .search-box:focus-within .search-icon {
          color: #3b82f6;
        }

        .filters-bar .search-box input {
          flex: 1;
          border: none !important;
          background: transparent !important;
          outline: none !important;
          box-shadow: none !important;
          font-size: 0.9375rem;
          color: #1e293b;
          font-weight: 450;
          -webkit-appearance: none;
          appearance: none;
        }

        .filters-bar .search-box input:focus {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          ring: none !important;
        }

        .filters-bar .search-box input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        /* Selectores mejorados */
        .filters-bar .filters-right {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Toggle de vista */
        .view-toggle {
          display: flex;
          background: #f1f5f9;
          border-radius: 8px;
          padding: 3px;
          gap: 2px;
        }
        .view-toggle-btn {
          padding: 8px 10px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          background: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .view-toggle-btn:hover {
          color: #475569;
          background: rgba(255,255,255,0.5);
        }
        .view-toggle-btn.active {
          background: white;
          color: #1e293b;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        /* Tabla de testimonios */
        .testimonios-table {
          table-layout: fixed;
          width: 100%;
        }

        .filter-select {
          appearance: none;
          padding: 12px 40px 12px 16px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 18px;
          min-width: 180px;
        }

        .filter-select:hover {
          border-color: #cbd5e1;
          background-color: #fafafa;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: none;
          background-color: white;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        }

        .filter-select option {
          padding: 12px;
          font-size: 0.875rem;
        }

        /* Responsive filters */
        @media (max-width: 768px) {
          .filters-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .filters-bar .search-box {
            min-width: 100%;
          }
          .filters-bar .filters-right {
            width: 100%;
          }
          .filter-select {
            flex: 1;
            min-width: 0;
          }
        }
      `}</style>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="success-banner">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="contenido-tabs">
        {/* Contenido principal */}
        {tabPermitido('articulos') && (
          <button className={`contenido-tab ${activeTab === 'articulos' ? 'active' : ''}`} onClick={() => handleTabChange('articulos')}>
            <span className="tab-icon">{Icons.articulo}</span>
            Artículos
          </button>
        )}
        {tabPermitido('videos') && (
          <button className={`contenido-tab ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => handleTabChange('videos')}>
            <span className="tab-icon">{Icons.video}</span>
            Videos
          </button>
        )}
        {tabPermitido('faqs') && (
          <button className={`contenido-tab ${activeTab === 'faqs' ? 'active' : ''}`} onClick={() => handleTabChange('faqs')}>
            <span className="tab-icon">{Icons.faq}</span>
            FAQs
          </button>
        )}
        {tabPermitido('testimonios') && (
          <button className={`contenido-tab ${activeTab === 'testimonios' ? 'active' : ''}`} onClick={() => handleTabChange('testimonios')}>
            <span className="tab-icon">{Icons.testimonio}</span>
            Testimonios
          </button>
        )}

        {/* Separador - solo si hay tabs antes y después */}
        {(tabPermitido('articulos') || tabPermitido('videos') || tabPermitido('faqs') || tabPermitido('testimonios')) &&
         (tabPermitido('seo') || tabPermitido('categorias')) && (
          <div className="tab-separator" />
        )}

        {/* SEO y configuración */}
        {tabPermitido('seo') && (
          <button className={`contenido-tab ${activeTab === 'seo' ? 'active' : ''}`} onClick={() => handleTabChange('seo')}>
            <span className="tab-icon">{Icons.seo}</span>
            SEO Stats
          </button>
        )}
        {tabPermitido('categorias') && (
          <button className={`contenido-tab ${activeTab === 'categorias' ? 'active' : ''}`} onClick={() => handleTabChange('categorias')}>
            <span className="tab-icon">{Icons.categoria}</span>
            Categorías
          </button>
        )}

        {/* Separador - solo si hay tabs antes y después */}
        {(tabPermitido('seo') || tabPermitido('categorias')) && tabPermitido('relacionar') && (
          <div className="tab-separator" />
        )}

        {/* Herramientas */}
        {tabPermitido('relacionar') && (
          <button className={`contenido-tab ${activeTab === 'relacionar' ? 'active' : ''}`} onClick={() => handleTabChange('relacionar')}>
            <span className="tab-icon">{Icons.link}</span>
            Relacionar
          </button>
        )}
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

          {/* Toggle de vista para testimonios */}
          {activeTab === 'testimonios' && (
            <div className="view-toggle">
              <button
                onClick={() => setTestimoniosViewMode('cards')}
                className={`view-toggle-btn ${testimoniosViewMode === 'cards' ? 'active' : ''}`}
                title="Vista tarjetas"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>
              <button
                onClick={() => setTestimoniosViewMode('list')}
                className={`view-toggle-btn ${testimoniosViewMode === 'list' ? 'active' : ''}`}
                title="Vista lista"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <circle cx="4" cy="6" r="1.5" fill="currentColor"/>
                  <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="4" cy="18" r="1.5" fill="currentColor"/>
                </svg>
              </button>
            </div>
          )}

          <div className="filters-right">
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
          <div className="modal-content modal-form modal-categoria-amplio" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button onClick={() => setShowCategoriaModal(false)} className="btn-icon">{Icons.x}</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveCategoria(); }}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Sección principal en español */}
                <div className="categoria-seccion">
                  <div className="categoria-seccion-titulo">
                    <span className="flag-emoji">🇪🇸</span> Español (Principal)
                  </div>
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
                </div>

                {/* Toggle para traducciones */}
                {idiomasSecundarios.length > 0 && (
                <div
                  className="traducciones-toggle"
                  onClick={() => setShowTraducciones(!showTraducciones)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 0',
                    cursor: 'pointer',
                    borderTop: '1px solid #e2e8f0',
                    marginTop: '16px',
                    color: '#3b82f6',
                    fontWeight: 500
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showTraducciones ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  <span>🌐 Traducciones ({idiomasSecundarios.map(i => i.labelNativo).join(' / ')})</span>
                </div>
                )}

                {/* Sección de traducciones - Dinámico según idiomas del tenant */}
                {showTraducciones && idiomasSecundarios.length > 0 && (
                  <div className="traducciones-container" style={{ display: 'grid', gridTemplateColumns: idiomasSecundarios.length === 1 ? '1fr' : '1fr 1fr', gap: '20px', marginTop: '12px' }}>
                    {idiomasSecundarios.map((idioma) => (
                      <div key={idioma.code} className="categoria-seccion">
                        <div className="categoria-seccion-titulo">
                          <span className="flag-emoji">{idioma.flagEmoji}</span> {idioma.labelNativo}
                        </div>
                        <div className="form-group">
                          <label>{idioma.code === 'en' ? 'Name' : idioma.code === 'pt' ? 'Nome' : idioma.code === 'fr' ? 'Nom' : 'Nombre'}</label>
                          <input
                            type="text"
                            value={categoriaForm.traducciones?.[idioma.code]?.nombre || ''}
                            onChange={(e) => {
                              const newName = e.target.value;
                              const code = idioma.code;
                              setCategoriaForm(prev => ({
                                ...prev,
                                traducciones: {
                                  ...prev.traducciones,
                                  [code]: { ...prev.traducciones?.[code], nombre: newName }
                                },
                                slugTraducciones: {
                                  ...prev.slugTraducciones,
                                  [code]: !prev.slugTraducciones?.[code] || prev.slugTraducciones[code] === generateSlug(prev.traducciones?.[code]?.nombre || '')
                                    ? generateSlug(newName)
                                    : prev.slugTraducciones[code]
                                }
                              }));
                            }}
                            placeholder={`${idioma.code === 'en' ? 'Category name' : idioma.code === 'pt' ? 'Nome da categoria' : idioma.code === 'fr' ? 'Nom de catégorie' : 'Nombre'} (${idioma.labelNativo})`}
                          />
                        </div>
                        <div className="form-group">
                          <label>Slug ({idioma.code})</label>
                          <input
                            type="text"
                            value={categoriaForm.slugTraducciones?.[idioma.code] || ''}
                            onChange={(e) => {
                              const code = idioma.code;
                              setCategoriaForm(prev => ({
                                ...prev,
                                slugTraducciones: { ...prev.slugTraducciones, [code]: e.target.value }
                              }));
                            }}
                            placeholder={`slug-${idioma.code}`}
                          />
                        </div>
                        <div className="form-group">
                          <label>{idioma.code === 'en' ? 'Description' : idioma.code === 'pt' ? 'Descrição' : idioma.code === 'fr' ? 'Description' : 'Descripcion'}</label>
                          <textarea
                            value={categoriaForm.traducciones?.[idioma.code]?.descripcion || ''}
                            onChange={(e) => {
                              const code = idioma.code;
                              setCategoriaForm(prev => ({
                                ...prev,
                                traducciones: {
                                  ...prev.traducciones,
                                  [code]: { ...prev.traducciones?.[code], descripcion: e.target.value }
                                }
                              }));
                            }}
                            rows={2}
                            placeholder={`${idioma.code === 'en' ? 'Description' : idioma.code === 'pt' ? 'Descrição' : idioma.code === 'fr' ? 'Description' : 'Descripcion'} (${idioma.labelNativo})`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Icono, Color y Estado */}
                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '16px' }}>
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
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Eliminar {deleteConfirm.tipo}</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: 'var(--premium-text-main, #111827)' }}>
                ¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDelete} className="btn-danger">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importar Videos de YouTube */}
      {showYouTubeImportModal && (
        <div className="modal-overlay" onClick={() => {
          setShowYouTubeImportModal(false);
          setYoutubeUrl('');
          setYoutubePreview(null);
          setYoutubePreviewError(null);
          setChannelVideos([]);
          setChannelInfo(null);
          setImportProgress({ current: 0, total: 0, importing: false });
        }}>
          <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #FF0000, #CC0000)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <LucideIcons.Youtube size={20} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>Importar de YouTube</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    {youtubeImportMode === 'video' ? 'Importa un video individual' : 'Importa todos los videos de un canal'}
                  </p>
                </div>
              </div>
              <button onClick={() => {
                setShowYouTubeImportModal(false);
                setYoutubeUrl('');
                setYoutubePreview(null);
                setYoutubePreviewError(null);
                setChannelVideos([]);
                setChannelInfo(null);
              }} className="btn-icon">{Icons.x}</button>
            </div>

            {/* Tabs de modo */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
              <button
                onClick={() => {
                  setYoutubeImportMode('video');
                  setYoutubeUrl('');
                  setYoutubePreview(null);
                  setYoutubePreviewError(null);
                  setChannelVideos([]);
                  setChannelInfo(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: youtubeImportMode === 'video' ? '#fff' : '#f8fafc',
                  borderBottom: youtubeImportMode === 'video' ? '2px solid #FF0000' : 'none',
                  color: youtubeImportMode === 'video' ? '#FF0000' : '#64748b',
                  fontWeight: youtubeImportMode === 'video' ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <LucideIcons.PlayCircle size={18} />
                Video Individual
              </button>
              <button
                onClick={() => {
                  setYoutubeImportMode('channel');
                  setYoutubeUrl('');
                  setYoutubePreview(null);
                  setYoutubePreviewError(null);
                  setChannelVideos([]);
                  setChannelInfo(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: youtubeImportMode === 'channel' ? '#fff' : '#f8fafc',
                  borderBottom: youtubeImportMode === 'channel' ? '2px solid #FF0000' : 'none',
                  color: youtubeImportMode === 'channel' ? '#FF0000' : '#64748b',
                  fontWeight: youtubeImportMode === 'channel' ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <LucideIcons.Users size={18} />
                Canal Completo
              </button>
            </div>

            <div className="modal-body">
              {/* Modo VIDEO INDIVIDUAL */}
              {youtubeImportMode === 'video' && (
                <>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                      URL del Video de YouTube
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="url"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '10px',
                          fontSize: '0.95rem',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#FF0000'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                      <button
                        onClick={async () => {
                          if (!youtubeUrl.trim() || !tenantActual?.id) return;
                          setYoutubePreviewLoading(true);
                          setYoutubePreviewError(null);
                          try {
                            const token = await getToken();
                            const response = await fetch(
                              `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/contenido/youtube/video-info?url=${encodeURIComponent(youtubeUrl)}`,
                              { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
                            );
                            if (!response.ok) {
                              const err = await response.json();
                              throw new Error(err.error || err.message || 'Error al obtener información');
                            }
                            const data = await response.json();
                            setYoutubePreview(data);
                          } catch (err: any) {
                            setYoutubePreviewError(err.message);
                            setYoutubePreview(null);
                          } finally {
                            setYoutubePreviewLoading(false);
                          }
                        }}
                        disabled={!youtubeUrl.trim() || youtubePreviewLoading}
                        style={{
                          padding: '12px 20px',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          cursor: youtubeUrl.trim() && !youtubePreviewLoading ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#475569'
                        }}
                      >
                        {youtubePreviewLoading ? <LucideIcons.Loader2 size={16} className="animate-spin" /> : <LucideIcons.Search size={16} />}
                        Buscar
                      </button>
                    </div>
                  </div>

                  {youtubePreviewError && (
                    <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                        <LucideIcons.AlertCircle size={18} />
                        <span style={{ fontSize: '0.9rem' }}>{youtubePreviewError}</span>
                      </div>
                    </div>
                  )}

                  {youtubePreview && (
                    <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <img
                          src={youtubePreview.youtube?.thumbnailUrl || youtubePreview.youtube?.thumbnailUrlHq}
                          alt="Thumbnail"
                          style={{ width: '180px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                            {youtubePreview.youtube?.titulo}
                          </h4>
                          <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#64748b' }}>
                            <strong>Canal:</strong> {youtubePreview.youtube?.canal?.nombre}
                          </p>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <LucideIcons.Clock size={14} />
                              {Math.floor((youtubePreview.youtube?.duracionSegundos || 0) / 60)}:{String((youtubePreview.youtube?.duracionSegundos || 0) % 60).padStart(2, '0')}
                            </span>
                            {youtubePreview.youtube?.estadisticas?.vistas && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <LucideIcons.Eye size={14} />
                                {youtubePreview.youtube.estadisticas.vistas.toLocaleString()} vistas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: '12px', padding: '12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '0.85rem' }}>
                          <LucideIcons.CheckCircle size={16} />
                          <span>Video encontrado y listo para importar</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Modo CANAL */}
              {youtubeImportMode === 'channel' && (
                <>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                      Canal de YouTube
                    </label>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 8px 0' }}>
                      Escribe el @usuario, URL completa o ID del canal
                    </p>
                    {/* Canales recientes */}
                    {recentChannels.length > 0 && !channelInfo && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 6px 0', fontWeight: 500 }}>
                          Canales recientes:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {recentChannels.map((ch, idx) => (
                            <button
                              key={idx}
                              onClick={() => setYoutubeUrl(ch.url)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 10px',
                                background: youtubeUrl === ch.url ? '#fee2e2' : '#f8fafc',
                                border: youtubeUrl === ch.url ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseOver={(e) => {
                                if (youtubeUrl !== ch.url) {
                                  e.currentTarget.style.background = '#f1f5f9';
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                }
                              }}
                              onMouseOut={(e) => {
                                if (youtubeUrl !== ch.url) {
                                  e.currentTarget.style.background = '#f8fafc';
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                }
                              }}
                            >
                              {ch.thumbnailUrl && (
                                <img
                                  src={ch.thumbnailUrl}
                                  alt=""
                                  style={{ width: '18px', height: '18px', borderRadius: '50%' }}
                                />
                              )}
                              <span style={{ color: '#334155' }}>{ch.nombre}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="@clicinmobiliaria o youtube.com/@canal"
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '10px',
                          fontSize: '0.95rem',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#FF0000'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.target as HTMLInputElement).closest('div')?.querySelector('button')?.click();
                          }
                        }}
                      />
                      <button
                        onClick={async () => {
                          if (!youtubeUrl.trim() || !tenantActual?.id) return;
                          setYoutubePreviewLoading(true);
                          setYoutubePreviewError(null);
                          setSelectedVideoIds(new Set());
                          setVideoTypeFilter('all');

                          // Normalizar el input del usuario
                          let normalizedUrl = youtubeUrl.trim();
                          // Si es solo @usuario, convertir a URL completa
                          if (normalizedUrl.startsWith('@')) {
                            normalizedUrl = `https://www.youtube.com/${normalizedUrl}`;
                          }
                          // Si es youtube.com/@ sin https, agregar protocolo
                          else if (normalizedUrl.match(/^(www\.)?youtube\.com\/@/i)) {
                            normalizedUrl = `https://${normalizedUrl.replace(/^www\./, '')}`;
                          }
                          // Si es solo el nombre de usuario sin @
                          else if (!normalizedUrl.includes('/') && !normalizedUrl.includes('.') && !normalizedUrl.startsWith('UC')) {
                            normalizedUrl = `https://www.youtube.com/@${normalizedUrl}`;
                          }

                          try {
                            const token = await getToken();
                            // Obtener videos con detalles (incluye detección de shorts y duplicados)
                            const videosRes = await fetch(
                              `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/contenido/youtube/channel-videos-detailed?url=${encodeURIComponent(normalizedUrl)}&maxResults=50`,
                              { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
                            );
                            if (!videosRes.ok) {
                              const err = await videosRes.json();
                              throw new Error(err.error || err.message || 'Error al obtener videos del canal');
                            }
                            const data = await videosRes.json();
                            setChannelInfo(data.channelInfo);
                            setChannelVideos(data.videos || []);
                            setNextPageToken(data.nextPageToken);
                            // Actualizar el input con la URL normalizada para futuras referencias
                            setYoutubeUrl(normalizedUrl);

                            // Guardar canal como reciente
                            if (data.channelInfo) {
                              saveRecentChannel({
                                url: normalizedUrl,
                                nombre: data.channelInfo.nombre,
                                thumbnailUrl: data.channelInfo.thumbnailUrl
                              });
                            }

                            // Obtener playlists del canal
                            const playlistsRes = await fetch(
                              `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/contenido/youtube/channel-playlists?url=${encodeURIComponent(normalizedUrl)}`,
                              { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
                            );
                            if (playlistsRes.ok) {
                              const playlistsData = await playlistsRes.json();
                              setChannelPlaylists(playlistsData.playlists || []);
                            }
                          } catch (err: any) {
                            setYoutubePreviewError(err.message);
                            setChannelInfo(null);
                            setChannelVideos([]);
                          } finally {
                            setYoutubePreviewLoading(false);
                          }
                        }}
                        disabled={!youtubeUrl.trim() || youtubePreviewLoading}
                        style={{
                          padding: '12px 20px',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          cursor: youtubeUrl.trim() && !youtubePreviewLoading ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#475569'
                        }}
                      >
                        {youtubePreviewLoading ? <LucideIcons.Loader2 size={16} className="animate-spin" /> : <LucideIcons.Search size={16} />}
                        Buscar
                      </button>
                    </div>
                  </div>

                  {youtubePreviewError && (
                    <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                        <LucideIcons.AlertCircle size={18} />
                        <span style={{ fontSize: '0.9rem' }}>{youtubePreviewError}</span>
                      </div>
                    </div>
                  )}

                  {channelInfo && (
                    <div style={{ marginTop: '16px' }}>
                      {/* Info del canal */}
                      <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <img src={channelInfo.thumbnailUrl} alt={channelInfo.nombre} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{channelInfo.nombre}</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{channelInfo.videoCount?.toLocaleString() || 0} videos</p>
                          </div>
                        </div>
                      </div>

                      {/* Filtros y controles */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                        {/* Filtro por tipo */}
                        <select
                          value={videoTypeFilter}
                          onChange={(e) => setVideoTypeFilter(e.target.value as 'all' | 'regular' | 'shorts')}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                        >
                          <option value="all">Todos los videos</option>
                          <option value="regular">Solo largos</option>
                          <option value="shorts">Solo Shorts</option>
                        </select>

                        {/* Selector de playlist */}
                        {channelPlaylists.length > 0 && (
                          <select
                            value={selectedPlaylist}
                            onChange={async (e) => {
                              const playlistId = e.target.value;
                              setSelectedPlaylist(playlistId);
                              if (!tenantActual?.id) return;
                              setLoadingMore(true);
                              try {
                                const token = await getToken();
                                // Si se selecciona una playlist específica, cargar sus videos
                                // Si se selecciona "Todos", recargar videos del canal
                                const endpoint = playlistId
                                  ? `playlist-videos?playlistId=${playlistId}&maxResults=50`
                                  : `channel-videos-detailed?url=${encodeURIComponent(youtubeUrl)}&maxResults=50`;
                                const res = await fetch(
                                  `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/contenido/youtube/${endpoint}`,
                                  { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
                                );
                                if (res.ok) {
                                  const data = await res.json();
                                  setChannelVideos(data.videos || []);
                                  setNextPageToken(data.nextPageToken);
                                }
                              } finally {
                                setLoadingMore(false);
                              }
                            }}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', maxWidth: '200px' }}
                          >
                            <option value="">Todos (uploads)</option>
                            {channelPlaylists.map(pl => (
                              <option key={pl.playlistId} value={pl.playlistId}>{pl.titulo} ({pl.videoCount})</option>
                            ))}
                          </select>
                        )}

                        {/* Categoría para importar */}
                        <select
                          value={importCategoryId}
                          onChange={(e) => setImportCategoryId(e.target.value)}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                        >
                          <option value="">Sin categoría</option>
                          {categorias.filter(c => c.tipo === 'video').map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                          ))}
                        </select>
                      </div>

                      {/* Botones de selección */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <button
                          onClick={() => {
                            const filtered = channelVideos.filter(v => {
                              if (v.alreadyImported) return false;
                              if (videoTypeFilter === 'regular' && v.isShort) return false;
                              if (videoTypeFilter === 'shorts' && !v.isShort) return false;
                              return true;
                            });
                            setSelectedVideoIds(new Set(filtered.map(v => v.videoId)));
                          }}
                          style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Seleccionar todos
                        </button>
                        <button
                          onClick={() => setSelectedVideoIds(new Set())}
                          style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Deseleccionar todos
                        </button>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: 'auto' }}>
                          {selectedVideoIds.size} seleccionados
                        </span>
                      </div>

                      {/* Lista de videos */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', maxHeight: '300px', overflow: 'auto' }}>
                        {channelVideos
                          .filter(v => {
                            if (videoTypeFilter === 'regular' && v.isShort) return false;
                            if (videoTypeFilter === 'shorts' && !v.isShort) return false;
                            return true;
                          })
                          .map(video => (
                          <div
                            key={video.videoId}
                            onClick={() => {
                              if (video.alreadyImported) return;
                              const newSet = new Set(selectedVideoIds);
                              if (newSet.has(video.videoId)) {
                                newSet.delete(video.videoId);
                              } else {
                                newSet.add(video.videoId);
                              }
                              setSelectedVideoIds(newSet);
                            }}
                            style={{
                              display: 'flex',
                              gap: '10px',
                              padding: '8px 12px',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: video.alreadyImported ? 'not-allowed' : 'pointer',
                              background: video.alreadyImported ? '#f8fafc' : selectedVideoIds.has(video.videoId) ? '#eff6ff' : 'transparent',
                              opacity: video.alreadyImported ? 0.6 : 1
                            }}
                          >
                            {/* Checkbox */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <input
                                type="checkbox"
                                checked={selectedVideoIds.has(video.videoId)}
                                disabled={video.alreadyImported}
                                onChange={() => {}}
                                style={{ width: '16px', height: '16px', cursor: video.alreadyImported ? 'not-allowed' : 'pointer' }}
                              />
                            </div>
                            {/* Thumbnail */}
                            <img src={video.thumbnailUrl} alt="" style={{ width: '60px', height: '34px', objectFit: 'cover', borderRadius: '4px' }} />
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {video.titulo}
                              </p>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: '#94a3b8' }}>
                                <span>{Math.floor((video.duracionSegundos || 0) / 60)}:{String((video.duracionSegundos || 0) % 60).padStart(2, '0')}</span>
                                {video.isShort && <span style={{ background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: '4px' }}>Short</span>}
                                {video.alreadyImported && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: '4px' }}>Ya importado</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                        {loadingMore && (
                          <div style={{ padding: '12px', textAlign: 'center' }}>
                            <LucideIcons.Loader2 size={20} className="animate-spin" style={{ color: '#64748b' }} />
                          </div>
                        )}
                      </div>

                      {/* Cargar más */}
                      {nextPageToken && (
                        <button
                          onClick={async () => {
                            if (!tenantActual?.id || loadingMore) return;
                            setLoadingMore(true);
                            try {
                              const token = await getToken();
                              const endpoint = selectedPlaylist
                                ? `playlist-videos?playlistId=${selectedPlaylist}&maxResults=50&pageToken=${nextPageToken}`
                                : `channel-videos-detailed?url=${encodeURIComponent(youtubeUrl)}&maxResults=50&pageToken=${nextPageToken}`;
                              const res = await fetch(
                                `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/contenido/youtube/${endpoint}`,
                                { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
                              );
                              if (res.ok) {
                                const data = await res.json();
                                setChannelVideos(prev => [...prev, ...(data.videos || [])]);
                                setNextPageToken(data.nextPageToken);
                              }
                            } finally {
                              setLoadingMore(false);
                            }
                          }}
                          disabled={loadingMore}
                          style={{ width: '100%', marginTop: '8px', padding: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          {loadingMore ? <LucideIcons.Loader2 size={16} className="animate-spin" /> : <LucideIcons.ChevronDown size={16} />}
                          Cargar más videos
                        </button>
                      )}

                      {/* Progreso de importación */}
                      {importProgress.importing && (
                        <div style={{ marginTop: '12px', padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <LucideIcons.Loader2 size={16} className="animate-spin" style={{ color: '#2563eb' }} />
                            <span style={{ fontWeight: 600, color: '#1e40af', fontSize: '0.85rem' }}>
                              Importando {importProgress.current} de {importProgress.total}...
                            </span>
                          </div>
                          <div style={{ height: '6px', background: '#dbeafe', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${(importProgress.current / importProgress.total) * 100}%`, height: '100%', background: '#2563eb', transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowYouTubeImportModal(false);
                  setYoutubeUrl('');
                  setYoutubePreview(null);
                  setYoutubePreviewError(null);
                  setChannelVideos([]);
                  setChannelInfo(null);
                  setImportProgress({ current: 0, total: 0, importing: false });
                  setSelectedVideoIds(new Set());
                  setChannelPlaylists([]);
                  setSelectedPlaylist('');
                  setImportCategoryId('');
                }}
                className="btn-secondary"
                disabled={importProgress.importing}
              >
                Cancelar
              </button>

              {youtubeImportMode === 'video' ? (
                <button
                  onClick={async () => {
                    if (!youtubePreview || !tenantActual?.id) {
                      if (!youtubeUrl.trim()) {
                        alert('Por favor ingresa una URL de YouTube');
                        return;
                      }
                      let videoId: string | null = null;
                      const patterns = [
                        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
                        /youtube\.com\/v\/([a-zA-Z0-9_-]+)/,
                      ];
                      for (const pattern of patterns) {
                        const match = youtubeUrl.match(pattern);
                        if (match) { videoId = match[1]; break; }
                      }
                      if (!videoId) {
                        alert('URL de YouTube no válida');
                        return;
                      }
                      navigate(`/crm/${tenantSlug}/contenido/videos/nuevo?youtube=${videoId}`);
                      setShowYouTubeImportModal(false);
                      setYoutubeUrl('');
                      return;
                    }
                    setImportingYouTube(true);
                    try {
                      const token = await getToken();
                      const response = await fetch(
                        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/contenido/youtube/import-video`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                          body: JSON.stringify({ url: youtubeUrl, publicado: true, categoria_id: importCategoryId || undefined })
                        }
                      );
                      if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || err.message || 'Error al importar');
                      }
                      const result = await response.json();
                      setSuccessMessage('Video importado exitosamente');
                      loadData();
                      setShowYouTubeImportModal(false);
                      setYoutubeUrl('');
                      setYoutubePreview(null);
                      if (result.video?.id) {
                        navigate(`/crm/${tenantSlug}/contenido/videos/${result.video.id}`);
                      }
                    } catch (err: any) {
                      alert(err.message || 'Error al importar video');
                    } finally {
                      setImportingYouTube(false);
                    }
                  }}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={importingYouTube}
                >
                  {importingYouTube ? (
                    <><LucideIcons.Loader2 size={16} className="animate-spin" /> Importando...</>
                  ) : (
                    <><LucideIcons.Download size={16} /> {youtubePreview ? 'Importar Video' : 'Continuar al Editor'}</>
                  )}
                </button>
              ) : (
                <button
                  onClick={async () => {
                    if (selectedVideoIds.size === 0 || !tenantActual?.id) {
                      alert('Selecciona al menos un video para importar');
                      return;
                    }
                    const videoIdsArray = Array.from(selectedVideoIds);
                    setImportProgress({ current: 0, total: videoIdsArray.length, importing: true });
                    try {
                      const token = await getToken();
                      const response = await fetch(
                        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/contenido/youtube/import-selected`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                          body: JSON.stringify({
                            videoIds: videoIdsArray,
                            categoria_id: importCategoryId || undefined,
                            publicado: false
                          })
                        }
                      );
                      if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || err.message || 'Error al importar');
                      }
                      const result = await response.json();
                      setImportProgress({ current: result.summary.imported, total: result.summary.requested, importing: false });
                      setSuccessMessage(`Importación completada: ${result.summary.imported} videos importados, ${result.summary.skipped} omitidos, ${result.summary.errors} errores`);
                      loadData();
                      // No cerrar modal - limpiar selección y actualizar lista de videos para marcar los ya importados
                      setSelectedVideoIds(new Set());
                      // Refrescar la lista de videos del canal para marcar los recién importados
                      if (channelInfo && selectedPlaylist === '') {
                        // Recargar videos del canal
                        try {
                          const refreshResponse = await fetch(
                            `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/contenido/youtube/channel-videos-detailed?channelId=${channelInfo.channelId}`,
                            { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
                          );
                          if (refreshResponse.ok) {
                            const refreshData = await refreshResponse.json();
                            setChannelVideos(refreshData.videos || []);
                          }
                        } catch (e) { console.error('Error refreshing videos:', e); }
                      } else if (selectedPlaylist) {
                        // Recargar videos del playlist
                        try {
                          const refreshResponse = await fetch(
                            `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/contenido/youtube/playlist-videos?playlistId=${selectedPlaylist}`,
                            { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
                          );
                          if (refreshResponse.ok) {
                            const refreshData = await refreshResponse.json();
                            setChannelVideos(refreshData.videos || []);
                          }
                        } catch (e) { console.error('Error refreshing playlist videos:', e); }
                      }
                    } catch (err: any) {
                      setImportProgress({ current: 0, total: 0, importing: false });
                      alert(err.message || 'Error al importar videos');
                    }
                  }}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={selectedVideoIds.size === 0 || importProgress.importing}
                >
                  {importProgress.importing ? (
                    <><LucideIcons.Loader2 size={16} className="animate-spin" /> Importando...</>
                  ) : (
                    <><LucideIcons.Download size={16} /> Importar {selectedVideoIds.size} Videos</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Generación con IA */}
      {showAIModal && (
        <div className="modal-overlay" onClick={() => !aiGenerating && !aiSaving && setShowAIModal(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}
          >
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LucideIcons.Sparkles size={24} color="#8b5cf6" />
                {showAIModal === 'articulo' && 'Crear Artículo con IA'}
                {showAIModal === 'faq' && 'Crear FAQs con IA'}
                {showAIModal === 'seo-stat' && 'Crear SEO Stat con IA'}
              </h2>
              <button
                onClick={() => setShowAIModal(null)}
                className="modal-close"
                disabled={aiGenerating || aiSaving}
              >
                {Icons.x}
              </button>
            </div>

            <div className="modal-body">
              {/* Formulario para Artículos */}
              {showAIModal === 'articulo' && !aiGenerated && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Tema del Artículo *</label>
                    <input
                      type="text"
                      value={aiForm.tema}
                      onChange={(e) => setAIForm({ ...aiForm, tema: e.target.value })}
                      placeholder="Ej: Guía para comprar tu primera casa en Santo Domingo"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Tipo de Propiedad (opcional)</label>
                      <input
                        type="text"
                        value={aiForm.tipoPropiedad}
                        onChange={(e) => setAIForm({ ...aiForm, tipoPropiedad: e.target.value })}
                        placeholder="Ej: Apartamento, Casa, Local"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Operación (opcional)</label>
                      <select
                        value={aiForm.operacion}
                        onChange={(e) => setAIForm({ ...aiForm, operacion: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      >
                        <option value="">Cualquiera</option>
                        <option value="comprar">Comprar</option>
                        <option value="alquilar">Alquilar</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Ubicación (opcional)</label>
                    <input
                      type="text"
                      value={aiForm.ubicacion}
                      onChange={(e) => setAIForm({ ...aiForm, ubicacion: e.target.value })}
                      placeholder="Ej: Naco, Santo Domingo"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Tono</label>
                      <select
                        value={aiForm.tono}
                        onChange={(e) => setAIForm({ ...aiForm, tono: e.target.value as any })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      >
                        <option value="profesional">Profesional</option>
                        <option value="casual">Casual</option>
                        <option value="informativo">Informativo</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Longitud</label>
                      <select
                        value={aiForm.longitud}
                        onChange={(e) => setAIForm({ ...aiForm, longitud: e.target.value as any })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      >
                        <option value="corto">Corto (~500 palabras)</option>
                        <option value="medio">Medio (~1000 palabras)</option>
                        <option value="largo">Largo (~1500 palabras)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario para FAQs */}
              {showAIModal === 'faq' && !aiGenerated && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Contexto/Tema *</label>
                    <input
                      type="text"
                      value={aiForm.contexto}
                      onChange={(e) => setAIForm({ ...aiForm, contexto: e.target.value })}
                      placeholder="Ej: Proceso de compra de inmuebles en República Dominicana"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Tipo de Propiedad (opcional)</label>
                      <input
                        type="text"
                        value={aiForm.tipoPropiedad}
                        onChange={(e) => setAIForm({ ...aiForm, tipoPropiedad: e.target.value })}
                        placeholder="Ej: Apartamento"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Operación (opcional)</label>
                      <select
                        value={aiForm.operacion}
                        onChange={(e) => setAIForm({ ...aiForm, operacion: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      >
                        <option value="">Cualquiera</option>
                        <option value="comprar">Comprar</option>
                        <option value="alquilar">Alquilar</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Ubicación (opcional)</label>
                      <input
                        type="text"
                        value={aiForm.ubicacion}
                        onChange={(e) => setAIForm({ ...aiForm, ubicacion: e.target.value })}
                        placeholder="Ej: Santo Domingo"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Cantidad de FAQs</label>
                      <select
                        value={aiForm.cantidad}
                        onChange={(e) => setAIForm({ ...aiForm, cantidad: parseInt(e.target.value) })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      >
                        <option value={3}>3 preguntas</option>
                        <option value={5}>5 preguntas</option>
                        <option value={7}>7 preguntas</option>
                        <option value={10}>10 preguntas</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario para SEO Stats */}
              {showAIModal === 'seo-stat' && !aiGenerated && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Operación *</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={aiForm.operaciones.includes('comprar')}
                          onChange={(e) => {
                            const ops = e.target.checked
                              ? [...aiForm.operaciones, 'comprar']
                              : aiForm.operaciones.filter(o => o !== 'comprar');
                            setAIForm({ ...aiForm, operaciones: ops });
                          }}
                        />
                        Comprar
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={aiForm.operaciones.includes('alquilar')}
                          onChange={(e) => {
                            const ops = e.target.checked
                              ? [...aiForm.operaciones, 'alquilar']
                              : aiForm.operaciones.filter(o => o !== 'alquilar');
                            setAIForm({ ...aiForm, operaciones: ops });
                          }}
                        />
                        Alquilar
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Tipo de Propiedad</label>
                      <input
                        type="text"
                        value={aiForm.nombreTipoPropiedad}
                        onChange={(e) => setAIForm({ ...aiForm, nombreTipoPropiedad: e.target.value })}
                        placeholder="Ej: Apartamento, Casa, Local"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Ubicación</label>
                      <input
                        type="text"
                        value={aiForm.nombreUbicacion}
                        onChange={(e) => setAIForm({ ...aiForm, nombreUbicacion: e.target.value })}
                        placeholder="Ej: Naco, Santo Domingo"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    El contenido SEO generado ayudará a posicionar las páginas de resultados para búsquedas como
                    "{aiForm.operaciones.length > 0 ? aiForm.operaciones.join(' y ') : 'comprar/alquilar'} {aiForm.nombreTipoPropiedad || 'propiedades'} en {aiForm.nombreUbicacion || 'tu zona'}".
                  </p>
                </div>
              )}

              {/* Error */}
              {aiError && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                    <LucideIcons.AlertCircle size={18} />
                    <span>{aiError}</span>
                  </div>
                </div>
              )}

              {/* Preview de Artículo Generado */}
              {showAIModal === 'articulo' && aiGenerated && 'titulo' in aiGenerated && !('operaciones' in aiGenerated) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', marginBottom: '8px' }}>
                      <LucideIcons.CheckCircle size={18} />
                      <span style={{ fontWeight: 600 }}>Artículo generado exitosamente</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Título</label>
                    <p style={{ margin: 0, padding: '10px 12px', background: '#f8fafc', borderRadius: '6px' }}>{(aiGenerated as GeneratedArticle).titulo}</p>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Extracto</label>
                    <p style={{ margin: 0, padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.9rem' }}>{(aiGenerated as GeneratedArticle).extracto}</p>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Contenido (Preview)</label>
                    <div
                      style={{ padding: '16px', background: '#f8fafc', borderRadius: '6px', maxHeight: '200px', overflow: 'auto', fontSize: '0.9rem' }}
                      dangerouslySetInnerHTML={{ __html: (aiGenerated as GeneratedArticle).contenido }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Meta Título</label>
                      <p style={{ margin: 0, padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>{(aiGenerated as GeneratedArticle).metaTitulo}</p>
                    </div>
                    <div className="form-group">
                      <label>Tags</label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(aiGenerated as GeneratedArticle).tags.map((tag, i) => (
                          <span key={i} style={{ padding: '4px 8px', background: '#e0e7ff', color: '#4338ca', borderRadius: '12px', fontSize: '0.8rem' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview de FAQs Generadas */}
              {showAIModal === 'faq' && aiGenerated && Array.isArray(aiGenerated) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a' }}>
                      <LucideIcons.CheckCircle size={18} />
                      <span style={{ fontWeight: 600 }}>{(aiGenerated as GeneratedFAQ[]).length} FAQs generadas exitosamente</span>
                    </div>
                  </div>
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    {(aiGenerated as GeneratedFAQ[]).map((faq, i) => (
                      <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px' }}>
                        <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1e293b' }}>{faq.pregunta}</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{faq.respuesta}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview de SEO Stat Generado */}
              {showAIModal === 'seo-stat' && aiGenerated && 'operaciones' in aiGenerated && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a' }}>
                      <LucideIcons.CheckCircle size={18} />
                      <span style={{ fontWeight: 600 }}>SEO Stat generado exitosamente</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Título</label>
                    <p style={{ margin: 0, padding: '10px 12px', background: '#f8fafc', borderRadius: '6px' }}>{(aiGenerated as GeneratedSeoStat).titulo}</p>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Descripción</label>
                    <p style={{ margin: 0, padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.9rem' }}>{(aiGenerated as GeneratedSeoStat).descripcion}</p>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Contenido (Preview)</label>
                    <div
                      style={{ padding: '16px', background: '#f8fafc', borderRadius: '6px', maxHeight: '200px', overflow: 'auto', fontSize: '0.9rem' }}
                      dangerouslySetInnerHTML={{ __html: (aiGenerated as GeneratedSeoStat).contenido }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Keywords</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(aiGenerated as GeneratedSeoStat).keywords.map((kw, i) => (
                        <span key={i} style={{ padding: '4px 8px', background: '#fef3c7', color: '#92400e', borderRadius: '12px', fontSize: '0.8rem' }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              {!aiGenerated ? (
                <>
                  <button
                    onClick={() => setShowAIModal(null)}
                    className="btn-secondary"
                    disabled={aiGenerating}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!tenantActual?.id) return;
                      setAIGenerating(true);
                      setAIError(null);
                      try {
                        const token = await getToken();
                        if (showAIModal === 'articulo') {
                          if (!aiForm.tema.trim()) {
                            setAIError('El tema es requerido');
                            setAIGenerating(false);
                            return;
                          }
                          const result = await generateArticleAI(tenantActual.id, {
                            tema: aiForm.tema,
                            tipoPropiedad: aiForm.tipoPropiedad || undefined,
                            operacion: aiForm.operacion || undefined,
                            ubicacion: aiForm.ubicacion || undefined,
                            tono: aiForm.tono,
                            longitud: aiForm.longitud,
                          }, token);
                          setAIGenerated(result);
                        } else if (showAIModal === 'faq') {
                          if (!aiForm.contexto.trim()) {
                            setAIError('El contexto es requerido');
                            setAIGenerating(false);
                            return;
                          }
                          const result = await generateFAQsAI(tenantActual.id, {
                            contexto: aiForm.contexto,
                            tipoPropiedad: aiForm.tipoPropiedad || undefined,
                            operacion: aiForm.operacion || undefined,
                            ubicacion: aiForm.ubicacion || undefined,
                            cantidad: aiForm.cantidad,
                          }, token);
                          setAIGenerated(result.faqs);
                        } else if (showAIModal === 'seo-stat') {
                          if (aiForm.operaciones.length === 0) {
                            setAIError('Selecciona al menos una operación');
                            setAIGenerating(false);
                            return;
                          }
                          const result = await generateSeoStatAI(tenantActual.id, {
                            operaciones: aiForm.operaciones,
                            nombreUbicacion: aiForm.nombreUbicacion || undefined,
                            nombreTipoPropiedad: aiForm.nombreTipoPropiedad || undefined,
                          }, token);
                          setAIGenerated(result);
                        }
                      } catch (err: any) {
                        setAIError(err.message || 'Error al generar contenido');
                      } finally {
                        setAIGenerating(false);
                      }
                    }}
                    className="btn-primary"
                    disabled={aiGenerating}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {aiGenerating ? (
                      <><LucideIcons.Loader2 size={16} className="animate-spin" /> Generando...</>
                    ) : (
                      <><LucideIcons.Sparkles size={16} /> Generar con IA</>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAIGenerated(null)}
                    className="btn-secondary"
                    disabled={aiSaving}
                  >
                    <LucideIcons.RefreshCw size={16} style={{ marginRight: '6px' }} />
                    Regenerar
                  </button>
                  <button
                    onClick={async () => {
                      if (!tenantActual?.id || !aiGenerated) return;
                      setAISaving(true);
                      try {
                        const token = await getToken();
                        if (showAIModal === 'articulo' && 'titulo' in aiGenerated && !('operaciones' in aiGenerated)) {
                          const article = aiGenerated as GeneratedArticle;
                          await createArticulo(tenantActual.id, {
                            titulo: article.titulo,
                            slug: article.slug,
                            extracto: article.extracto,
                            contenido: article.contenido,
                            meta_titulo: article.metaTitulo,
                            meta_descripcion: article.metaDescripcion,
                            tags: article.tags,
                            publicado: false,
                          }, token);
                          setSuccessMessage('Artículo guardado como borrador');
                          loadData();
                        } else if (showAIModal === 'faq' && Array.isArray(aiGenerated)) {
                          const faqs = aiGenerated as GeneratedFAQ[];
                          for (const faq of faqs) {
                            await createFaq(tenantActual.id, {
                              pregunta: faq.pregunta,
                              respuesta: faq.respuesta,
                              publicado: false,
                            }, token);
                          }
                          setSuccessMessage(`${faqs.length} FAQs guardadas como borrador`);
                          loadData();
                        } else if (showAIModal === 'seo-stat' && 'operaciones' in aiGenerated) {
                          const seoStat = aiGenerated as GeneratedSeoStat;
                          await createSeoStat(tenantActual.id, {
                            titulo: seoStat.titulo,
                            descripcion: seoStat.descripcion,
                            contenido: seoStat.contenido,
                            slug: seoStat.slug,
                            meta_titulo: seoStat.metaTitulo,
                            meta_descripcion: seoStat.metaDescripcion,
                            keywords: seoStat.keywords,
                            operaciones: seoStat.operaciones,
                            publicado: false,
                          }, token);
                          setSuccessMessage('SEO Stat guardado como borrador');
                          loadData();
                        }
                        setShowAIModal(null);
                        setAIGenerated(null);
                        setAIForm({
                          tema: '',
                          contexto: '',
                          tipoPropiedad: '',
                          operacion: '',
                          ubicacion: '',
                          tono: 'profesional',
                          longitud: 'medio',
                          cantidad: 5,
                          operaciones: [],
                          nombreUbicacion: '',
                          nombreTipoPropiedad: '',
                        });
                      } catch (err: any) {
                        setAIError(err.message || 'Error al guardar');
                      } finally {
                        setAISaving(false);
                      }
                    }}
                    className="btn-primary"
                    disabled={aiSaving}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {aiSaving ? (
                      <><LucideIcons.Loader2 size={16} className="animate-spin" /> Guardando...</>
                    ) : (
                      <><LucideIcons.Save size={16} /> Guardar como Borrador</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
