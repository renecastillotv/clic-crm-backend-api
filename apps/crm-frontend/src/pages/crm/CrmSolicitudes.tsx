/**
 * CrmSolicitudes - Pipeline de solicitudes con vista Kanban
 *
 * Módulo para gestionar el pipeline de ventas con:
 * - Vista Kanban con drag & drop (etapas activas)
 * - Vista de lista
 * - PURGE Score con desglose
 * - Modal para cerrar solicitudes (Ganado/Perdido/Descartado)
 * - Iconos Lucide React
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import ContactPicker from '../../components/ContactPicker';
import {
  getSolicitudes,
  createSolicitud,
  cambiarEtapaSolicitud,
  getContactos,
  Solicitud,
  SolicitudFiltros,
  Contacto,
} from '../../services/api';
import {
  LayoutGrid,
  List,
  Search,
  Plus,
  Phone,
  Mail,
  Home,
  Calendar,
  Zap,
  GripVertical,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  DollarSign,
  User,
  Target,
  Loader2,
  X,
  Trophy,
  ThumbsDown,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  Check,
  MapPin,
  Building2,
  Upload,
  Paperclip,
  FileText,
  Image,
  Trash2,
} from 'lucide-react';

// Etapas activas del pipeline (las que aparecen en Kanban)
const ETAPAS_ACTIVAS = [
  { id: 'nuevo_lead', label: 'Nuevo', color: '#6366f1', light: '#eef2ff' },
  { id: 'contactado', label: 'Contactado', color: '#8b5cf6', light: '#f5f3ff' },
  { id: 'calificado', label: 'Calificado', color: '#0ea5e9', light: '#f0f9ff' },
  { id: 'mostrando', label: 'Mostrando', color: '#f59e0b', light: '#fffbeb' },
  { id: 'negociacion', label: 'Negociación', color: '#ef4444', light: '#fef2f2' },
];

// Etapas de cierre (aparecen en Kanban según toggles)
const ETAPAS_CIERRE = [
  { id: 'ganado', label: 'Ganado', color: '#22c55e', light: '#f0fdf4', icon: Trophy },
  { id: 'perdido', label: 'Perdido', color: '#64748b', light: '#f8fafc', icon: ThumbsDown },
  { id: 'descartado', label: 'Descartado', color: '#94a3b8', light: '#f8fafc', icon: Ban },
];

// Tipos de solicitud
const TIPOS_SOLICITUD: Record<string, { label: string; color: string; icon: any }> = {
  compra: { label: 'Compra', color: '#2563eb', icon: Home },
  alquiler: { label: 'Alquiler', color: '#7c3aed', icon: Home },
  inversion: { label: 'Inversión', color: '#059669', icon: TrendingUp },
};

// Tipos de propiedad con iconos
const TIPOS_PROPIEDAD: Record<string, { label: string; icon: string }> = {
  casa: { label: 'Casa', icon: '🏠' },
  departamento: { label: 'Depto', icon: '🏢' },
  apartamento: { label: 'Apto', icon: '🏢' },
  terreno: { label: 'Terreno', icon: '🌳' },
  solar: { label: 'Solar', icon: '📐' },
  oficina: { label: 'Oficina', icon: '🏛️' },
  local: { label: 'Local', icon: '🏪' },
  bodega: { label: 'Bodega', icon: '📦' },
  finca: { label: 'Finca', icon: '🌾' },
  penthouse: { label: 'Penthouse', icon: '🌆' },
};

// Prioridades
const PRIORIDADES: Record<string, { label: string; color: string; bg: string }> = {
  urgente: { label: 'Urgente', color: '#dc2626', bg: '#fef2f2' },
  alta: { label: 'Alta', color: '#f59e0b', bg: '#fffbeb' },
  media: { label: 'Media', color: '#3b82f6', bg: '#eff6ff' },
  baja: { label: 'Baja', color: '#6b7280', bg: '#f9fafb' },
};

// Configuración del cuestionario PURGE
const PURGE_CONFIG = {
  power: {
    label: 'Poder de Decisión',
    letter: 'P',
    question: '¿Quién toma la decisión final de compra/alquiler?',
    description: 'Evalúa si el prospecto tiene autonomía para decidir',
    options: [
      { value: 0, label: 'No sabe / No responde', hint: 'No ha dado información' },
      { value: 1, label: 'Depende de terceros', hint: 'Padres, socios, inversionistas' },
      { value: 2, label: 'Consulta con pareja/familia', hint: 'Necesita aprobación' },
      { value: 3, label: 'Decide junto con pareja', hint: 'Decisión compartida' },
      { value: 4, label: 'Alta influencia', hint: 'Casi seguro decide' },
      { value: 5, label: '100% autonomía', hint: 'Decide solo/a' },
    ],
  },
  urgency: {
    label: 'Urgencia',
    letter: 'U',
    question: '¿En cuánto tiempo necesita mudarse/invertir?',
    description: 'Qué tan pronto necesita cerrar la operación',
    options: [
      { value: 0, label: 'Sin fecha definida', hint: 'Solo curioseando' },
      { value: 1, label: 'Más de 1 año', hint: 'Largo plazo' },
      { value: 2, label: '6-12 meses', hint: 'Mediano plazo' },
      { value: 3, label: '3-6 meses', hint: 'Próximamente' },
      { value: 4, label: '1-3 meses', hint: 'Pronto' },
      { value: 5, label: 'Inmediato', hint: 'Este mes' },
    ],
  },
  resources: {
    label: 'Recursos',
    letter: 'R',
    question: '¿Cómo planea financiar la compra/alquiler?',
    description: 'Capacidad económica y financiamiento',
    options: [
      { value: 0, label: 'Sin recursos ni financiamiento', hint: 'No califica' },
      { value: 1, label: 'Necesita vender primero', hint: 'Depende de otra venta' },
      { value: 2, label: 'Buscando financiamiento', hint: 'En proceso' },
      { value: 3, label: 'Pre-aprobado', hint: 'Tiene pre-aprobación' },
      { value: 4, label: 'Inicial + aprobación', hint: 'Listo financieramente' },
      { value: 5, label: 'Pago de contado', hint: 'Fondos disponibles' },
    ],
  },
  genuine: {
    label: 'Interés Genuino',
    letter: 'G',
    question: '¿Qué tan comprometido está con el proceso?',
    description: 'Nivel de seriedad e involucramiento',
    options: [
      { value: 0, label: 'Solo curioseando', hint: 'Sin intención real' },
      { value: 1, label: 'Explorando a futuro', hint: 'Algún día' },
      { value: 2, label: 'Comparando mercado', hint: 'Investigando' },
      { value: 3, label: 'Buscando activamente', hint: 'En búsqueda' },
      { value: 4, label: 'Ya vio propiedades', hint: 'Comprometido' },
      { value: 5, label: 'Listo para ofertar', hint: 'Muy serio' },
    ],
  },
  expectations: {
    label: 'Expectativas',
    letter: 'E',
    question: '¿Son realistas sus expectativas vs presupuesto?',
    description: 'Alineación entre lo que quiere y puede pagar',
    options: [
      { value: 0, label: 'Muy alejadas', hint: 'Imposible satisfacer' },
      { value: 1, label: 'Necesita educación', hint: 'Desconoce el mercado' },
      { value: 2, label: 'Algo desajustadas', hint: 'Educable' },
      { value: 3, label: 'Razonables', hint: 'Con flexibilidad' },
      { value: 4, label: 'Bien alineadas', hint: 'Conoce el mercado' },
      { value: 5, label: 'Perfectas', hint: 'Totalmente realista' },
    ],
  },
};

// Recomendaciones basadas en PURGE Score
const getPurgeRecommendation = (score: number) => {
  if (score >= 20) return { text: 'Excelente prospecto - Prioridad máxima', action: 'Agendar cita inmediatamente', color: '#16a34a', bg: '#dcfce7' };
  if (score >= 15) return { text: 'Buen prospecto - Alta prioridad', action: 'Dar seguimiento activo', color: '#059669', bg: '#d1fae5' };
  if (score >= 10) return { text: 'Prospecto moderado - Requiere nurturing', action: 'Enviar información y educar', color: '#d97706', bg: '#fef3c7' };
  if (score >= 5) return { text: 'Prospecto frío - Bajo potencial actual', action: 'Mantener en lista de seguimiento', color: '#ea580c', bg: '#ffedd5' };
  return { text: 'No califica actualmente', action: 'Re-evaluar en 3-6 meses', color: '#dc2626', bg: '#fee2e2' };
};

export default function CrmSolicitudes() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenantActual, isPlatformAdmin } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Estado
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [prioridadFiltro, setPrioridadFiltro] = useState<string>('');
  const [verTodos, setVerTodos] = useState(false);
  const [vistaKanban, setVistaKanban] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState<Solicitud | null>(null);
  const [closeModalStep, setCloseModalStep] = useState<'select' | 'details'>('select');
  const [closeModalData, setCloseModalData] = useState<{
    etapa: string;
    nota: string;
    archivos: File[];
  }>({ etapa: '', nota: '', archivos: [] });
  const [saving, setSaving] = useState(false);
  // Filtros para mostrar solicitudes cerradas
  const [mostrarGanadas, setMostrarGanadas] = useState(false);
  const [mostrarPerdidas, setMostrarPerdidas] = useState(false);
  const [mostrarDescartadas, setMostrarDescartadas] = useState(false);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [contactoBusqueda, setContactoBusqueda] = useState('');
  const [loadingContactos, setLoadingContactos] = useState(false);
  const [nuevaSolicitud, setNuevaSolicitud] = useState({
    titulo: '',
    tipo_solicitud: 'compra',
    prioridad: 'media',
    descripcion: '',
    valor_estimado: '',
    contacto_id: '',
    // Campos clave de búsqueda
    tipo_propiedad: '',
    zona_interes: '',
    presupuesto_min: '',
    presupuesto_max: '',
    motivo: '',
    // PURGE scores
    purge_power: 0,
    purge_urgency: 0,
    purge_resources: 0,
    purge_genuine: 0,
    purge_expectations: 0,
  });
  const [activePurgeSection, setActivePurgeSection] = useState<string | null>(null);

  // Calcular PURGE Score total
  const purgeScoreTotal = nuevaSolicitud.purge_power + nuevaSolicitud.purge_urgency +
    nuevaSolicitud.purge_resources + nuevaSolicitud.purge_genuine + nuevaSolicitud.purge_expectations;

  // Stats calculados
  const solicitudesActivas = solicitudes.filter(s =>
    ETAPAS_ACTIVAS.some(e => e.id === s.etapa)
  );
  const enProgreso = solicitudes.filter(s =>
    ['contactado', 'calificado', 'mostrando', 'negociacion'].includes(s.etapa)
  ).length;
  const cerradas = solicitudes.filter(s =>
    ['ganado', 'perdido', 'descartado'].includes(s.etapa)
  ).length;

  // Configurar header de la página con stats
  useEffect(() => {
    setPageHeader({
      title: 'Pipeline de Ventas',
      subtitle: 'Gestiona tus oportunidades de negocio',
      stats: [
        { label: 'Total', value: solicitudesActivas.length, icon: <Target className="w-4 h-4" /> },
        { label: 'En Progreso', value: enProgreso, icon: <Clock className="w-4 h-4" /> },
        { label: 'Cerradas', value: cerradas, icon: <CheckCircle2 className="w-4 h-4" /> },
      ],
      actions: (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              className={`view-btn ${vistaKanban ? 'active' : ''}`}
              onClick={() => setVistaKanban(true)}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              className={`view-btn ${!vistaKanban ? 'active' : ''}`}
              onClick={() => setVistaKanban(false)}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button className="btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-3.5 h-3.5" />
            Nueva Solicitud
          </button>
        </div>
      ),
    });
  }, [setPageHeader, vistaKanban, solicitudesActivas.length, enProgreso, cerradas]);

  // Cargar solicitudes
  const cargarSolicitudes = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);

      const filtros: SolicitudFiltros = {
        busqueda: busqueda || undefined,
        tipo: tipoFiltro || undefined,
        prioridad: prioridadFiltro || undefined,
        todos: verTodos || undefined,
      };

      const response = await getSolicitudes(tenantActual.id, filtros);
      setSolicitudes(response.data);
    } catch (err: any) {
      console.error('Error cargando solicitudes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, busqueda, tipoFiltro, prioridadFiltro, verTodos]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  // Abrir modal de crear si viene con query params
  useEffect(() => {
    const crear = searchParams.get('crear');
    const contactoId = searchParams.get('contacto_id');

    if (crear === 'true') {
      setShowCreateModal(true);
      if (contactoId) {
        setNuevaSolicitud(prev => ({ ...prev, contacto_id: contactoId }));
      }
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Cargar contactos cuando se abre el modal
  useEffect(() => {
    if (showCreateModal && tenantActual?.id) {
      const cargarContactos = async () => {
        try {
          setLoadingContactos(true);
          const response = await getContactos(tenantActual.id, { busqueda: contactoBusqueda });
          setContactos(response.data);
        } catch (err) {
          console.error('Error cargando contactos:', err);
        } finally {
          setLoadingContactos(false);
        }
      };
      cargarContactos();
    }
  }, [showCreateModal, tenantActual?.id, contactoBusqueda]);

  // Crear solicitud
  const handleCreateSolicitud = async () => {
    if (!tenantActual?.id || !nuevaSolicitud.titulo.trim()) return;

    try {
      setSaving(true);
      await createSolicitud(tenantActual.id, {
        titulo: nuevaSolicitud.titulo,
        tipo_solicitud: nuevaSolicitud.tipo_solicitud,
        prioridad: nuevaSolicitud.prioridad,
        descripcion: nuevaSolicitud.descripcion || undefined,
        valor_estimado: nuevaSolicitud.valor_estimado ? parseFloat(nuevaSolicitud.valor_estimado) : undefined,
        contacto_id: nuevaSolicitud.contacto_id || undefined,
        // Campos clave de búsqueda
        tipo_propiedad: nuevaSolicitud.tipo_propiedad || undefined,
        zona_interes: nuevaSolicitud.zona_interes || undefined,
        presupuesto_min: nuevaSolicitud.presupuesto_min ? parseFloat(nuevaSolicitud.presupuesto_min) : undefined,
        presupuesto_max: nuevaSolicitud.presupuesto_max ? parseFloat(nuevaSolicitud.presupuesto_max) : undefined,
        motivo: nuevaSolicitud.motivo || undefined,
        // PURGE scores
        purge: {
          power: nuevaSolicitud.purge_power,
          urgency: nuevaSolicitud.purge_urgency,
          resources: nuevaSolicitud.purge_resources,
          genuine: nuevaSolicitud.purge_genuine,
          expectations: nuevaSolicitud.purge_expectations,
          total: purgeScoreTotal,
        },
      });
      setShowCreateModal(false);
      setNuevaSolicitud({
        titulo: '',
        tipo_solicitud: 'compra',
        prioridad: 'media',
        descripcion: '',
        valor_estimado: '',
        contacto_id: '',
        tipo_propiedad: '',
        zona_interes: '',
        presupuesto_min: '',
        presupuesto_max: '',
        motivo: '',
        purge_power: 0,
        purge_urgency: 0,
        purge_resources: 0,
        purge_genuine: 0,
        purge_expectations: 0,
      });
      setContactoBusqueda('');
      setActivePurgeSection(null);
      cargarSolicitudes();
    } catch (err: any) {
      console.error('Error al crear solicitud:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Seleccionar etapa de cierre
  const handleSelectCloseEtapa = (etapa: string) => {
    if (etapa === 'ganado') {
      // Para "Ganado", cerrar directamente sin pedir detalles
      handleCloseSolicitud(etapa, '');
    } else {
      // Para "Perdido" o "Descartado", mostrar paso de detalles
      setCloseModalData({ etapa, nota: '', archivos: [] });
      setCloseModalStep('details');
    }
  };

  // Cerrar solicitud (Ganado/Perdido/Descartado)
  const handleCloseSolicitud = async (nuevaEtapa: string, nota?: string, archivos?: File[]) => {
    if (!showCloseModal || !tenantActual?.id) return;

    try {
      setSaving(true);
      // TODO: Si hay archivos, subirlos primero y guardar la nota
      // Por ahora solo cambiamos la etapa y guardamos la nota en razon_perdida
      await cambiarEtapaSolicitud(tenantActual.id, showCloseModal.id, nuevaEtapa, nota);
      resetCloseModal();
      cargarSolicitudes();
    } catch (err: any) {
      console.error('Error al cerrar solicitud:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Manejar archivos del modal de cierre
  const handleCloseModalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setCloseModalData(prev => ({
        ...prev,
        archivos: [...prev.archivos, ...Array.from(files)]
      }));
    }
  };

  const removeCloseModalFile = (index: number) => {
    setCloseModalData(prev => ({
      ...prev,
      archivos: prev.archivos.filter((_, i) => i !== index)
    }));
  };

  // Reset modal de cierre
  const resetCloseModal = () => {
    setShowCloseModal(null);
    setCloseModalStep('select');
    setCloseModalData({ etapa: '', nota: '', archivos: [] });
  };

  // Calcular etapas visibles según toggles
  const etapasVisibles = [
    ...ETAPAS_ACTIVAS,
    ...(mostrarGanadas ? [ETAPAS_CIERRE.find(e => e.id === 'ganado')!] : []),
    ...(mostrarPerdidas ? [ETAPAS_CIERRE.find(e => e.id === 'perdido')!] : []),
    ...(mostrarDescartadas ? [ETAPAS_CIERRE.find(e => e.id === 'descartado')!] : []),
  ];

  // Agrupar solicitudes por etapa (activas + cerradas según toggles)
  const solicitudesPorEtapa = etapasVisibles.reduce((acc, etapa) => {
    acc[etapa.id] = solicitudes.filter((s) => s.etapa === etapa.id);
    return acc;
  }, {} as Record<string, Solicitud[]>);

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, solicitudId: string) => {
    setDraggedItem(solicitudId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, etapaId: string) => {
    e.preventDefault();
    setDragOverColumn(etapaId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, nuevaEtapa: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedItem || !tenantActual?.id) return;

    const solicitud = solicitudes.find((s) => s.id === draggedItem);
    if (!solicitud || solicitud.etapa === nuevaEtapa) {
      setDraggedItem(null);
      return;
    }

    // Actualizar optimistamente
    setSolicitudes((prev) =>
      prev.map((s) => (s.id === draggedItem ? { ...s, etapa: nuevaEtapa } : s))
    );

    try {
      await cambiarEtapaSolicitud(tenantActual.id, draggedItem, nuevaEtapa);
    } catch (err: any) {
      setSolicitudes((prev) =>
        prev.map((s) => (s.id === draggedItem ? { ...s, etapa: solicitud.etapa } : s))
      );
      setError(err.message);
    }

    setDraggedItem(null);
  };

  // Calcular PURGE Score color
  const getPurgeColor = (score: number) => {
    if (score >= 20) return { bg: '#dcfce7', text: '#166534' };
    if (score >= 15) return { bg: '#fef9c3', text: '#854d0e' };
    if (score >= 10) return { bg: '#ffedd5', text: '#9a3412' };
    if (score >= 5) return { bg: '#fee2e2', text: '#991b1b' };
    return { bg: '#f1f5f9', text: '#64748b' };
  };

  // Formatear nombre del contacto
  const getContactoNombre = (s: Solicitud) => {
    return [s.contacto_nombre, s.contacto_apellido].filter(Boolean).join(' ') || 'Sin contacto';
  };

  // Formatear moneda
  const formatMoney = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Navegar al detalle
  const handleClickSolicitud = (solicitudId: string) => {
    navigate(`/crm/${tenantSlug}/pipeline/${solicitudId}`);
  };

  if (loading && solicitudes.length === 0) {
    return (
      <div className="page">
        <div className="loading-container">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p>Cargando pipeline...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Barra de filtros */}
      <div className="filters-bar">
        <div className="search-box">
          <Search className="search-icon w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar solicitudes..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filters-right">
          {/* Toggles para solicitudes cerradas */}
          <div className="status-toggles">
            <label className={`status-toggle ${mostrarGanadas ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={mostrarGanadas}
                onChange={() => setMostrarGanadas(!mostrarGanadas)}
              />
              <span className="toggle-check" style={{ '--check-color': '#22c55e' } as React.CSSProperties}></span>
              <span className="toggle-label">Ganadas</span>
            </label>

            <label className={`status-toggle ${mostrarPerdidas ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={mostrarPerdidas}
                onChange={() => setMostrarPerdidas(!mostrarPerdidas)}
              />
              <span className="toggle-check" style={{ '--check-color': '#64748b' } as React.CSSProperties}></span>
              <span className="toggle-label">Perdidas</span>
            </label>

            <label className={`status-toggle ${mostrarDescartadas ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={mostrarDescartadas}
                onChange={() => setMostrarDescartadas(!mostrarDescartadas)}
              />
              <span className="toggle-check" style={{ '--check-color': '#94a3b8' } as React.CSSProperties}></span>
              <span className="toggle-label">Descartadas</span>
            </label>
          </div>

          <div className="filter-divider"></div>

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="filter-select"
          >
            <option value="">Tipo</option>
            {Object.entries(TIPOS_SOLICITUD).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <select
            value={prioridadFiltro}
            onChange={(e) => setPrioridadFiltro(e.target.value)}
            className="filter-select"
          >
            <option value="">Prioridad</option>
            {Object.entries(PRIORIDADES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          {isPlatformAdmin && (
            <button
              className={`filter-btn ${verTodos ? 'active' : ''}`}
              onClick={() => setVerTodos(!verTodos)}
            >
              Ver todos
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Vista Kanban */}
      {vistaKanban ? (
        <div className="kanban-container" style={{ gridTemplateColumns: `repeat(${etapasVisibles.length}, 1fr)` }}>
          {etapasVisibles.map((etapa) => {
            const esCerrada = ['ganado', 'perdido', 'descartado'].includes(etapa.id);
            return (
            <div
              key={etapa.id}
              className={`kanban-column ${!esCerrada && dragOverColumn === etapa.id ? 'drag-over' : ''} ${esCerrada ? 'closed-column' : ''}`}
              style={{ '--column-color': etapa.color, '--column-light': etapa.light } as React.CSSProperties}
              onDragOver={!esCerrada ? (e) => handleDragOver(e, etapa.id) : undefined}
              onDragLeave={!esCerrada ? handleDragLeave : undefined}
              onDrop={!esCerrada ? (e) => handleDrop(e, etapa.id) : undefined}
            >
              <div className="column-header" style={{ backgroundColor: etapa.light }}>
                <div className="column-indicator" style={{ backgroundColor: etapa.color }}></div>
                <span className="column-title">{etapa.label}</span>
                <span className="column-count" style={{ backgroundColor: etapa.color }}>
                  {solicitudesPorEtapa[etapa.id]?.length || 0}
                </span>
              </div>

              <div className="column-content">
                {solicitudesPorEtapa[etapa.id]?.map((solicitud) => {
                  const purgeColors = getPurgeColor(solicitud.purge_score);
                  const tipoPropiedad = TIPOS_PROPIEDAD[solicitud.tipo_propiedad || ''];

                  const motivoLabels: Record<string, string> = {
                    mudanza: 'Vivienda',
                    inversion: 'Inversión',
                    vacaciones: 'Vacaciones',
                    negocio: 'Negocio',
                    oficina: 'Oficina',
                    otro: 'Otro',
                  };

                  return (
                    <div
                      key={solicitud.id}
                      className={`kanban-card ${!esCerrada && draggedItem === solicitud.id ? 'dragging' : ''} ${esCerrada ? 'closed-card' : ''}`}
                      draggable={!esCerrada}
                      onDragStart={!esCerrada ? (e) => handleDragStart(e, solicitud.id) : undefined}
                      onClick={() => handleClickSolicitud(solicitud.id)}
                    >
                      {/* Título + drag */}
                      <div className="card-header">
                        <span className="card-title">{solicitud.titulo}</span>
                        {!esCerrada && <GripVertical className="drag-handle w-4 h-4" />}
                      </div>

                      {/* Cliente */}
                      <div className="card-client">{getContactoNombre(solicitud)}</div>

                      {/* Tags: tipo, zona, motivo */}
                      <div className="card-tags">
                        {tipoPropiedad && <span className="tag type">{tipoPropiedad.icon} {tipoPropiedad.label}</span>}
                        {solicitud.zona_interes && <span className="tag zone">{solicitud.zona_interes}</span>}
                        {solicitud.motivo && <span className="tag motivo">{motivoLabels[solicitud.motivo] || solicitud.motivo}</span>}
                      </div>

                      {/* Footer: Presupuesto + PURGE + Cerrar */}
                      <div className="card-footer">
                        <span className="budget">{solicitud.valor_estimado ? `$${formatMoney(solicitud.valor_estimado)}` : '-'}</span>
                        <div className="purge-badge" style={{ backgroundColor: purgeColors.bg, color: purgeColors.text }}>
                          <Zap className="w-3 h-3" /> {solicitud.purge_score}/25
                        </div>
                        {!esCerrada && (
                          <button
                            className="close-btn"
                            onClick={(e) => { e.stopPropagation(); setShowCloseModal(solicitud); }}
                            title="Cerrar Solicitud"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(!solicitudesPorEtapa[etapa.id] || solicitudesPorEtapa[etapa.id].length === 0) && (
                  <div className="column-empty">
                    No hay solicitudes
                  </div>
                )}
              </div>

              {/* Quick Add - solo en columnas activas */}
              {!esCerrada && (
                <div className="column-add">
                  <button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
              )}
            </div>
            )
          })}
        </div>
      ) : (
        /* Vista Lista */
        <div className="list-container">
          {solicitudesActivas.length === 0 ? (
            <div className="empty-state">
              <Target className="w-12 h-12 text-gray-300" />
              <h3>No hay solicitudes</h3>
              <p>Crea tu primera solicitud para comenzar</p>
            </div>
          ) : (
            <table className="solicitudes-table">
              <thead>
                <tr>
                  <th>Solicitud</th>
                  <th>Cliente</th>
                  <th>Inmueble</th>
                  <th>Zona</th>
                  <th>Motivo</th>
                  <th>Presupuesto</th>
                  <th>PURGE</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {solicitudesActivas.map((s) => {
                  const purgeColors = getPurgeColor(s.purge_score);
                  const tipoPropiedad = TIPOS_PROPIEDAD[s.tipo_propiedad || ''];
                  const motivoLabels: Record<string, string> = {
                    mudanza: 'Vivienda',
                    inversion: 'Inversión',
                    vacaciones: 'Vacaciones',
                    negocio: 'Negocio',
                    oficina: 'Oficina',
                    otro: 'Otro',
                  };

                  return (
                    <tr key={s.id} onClick={() => handleClickSolicitud(s.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span className="list-title">{s.titulo}</span>
                      </td>
                      <td>
                        <span className="list-client">{getContactoNombre(s)}</span>
                      </td>
                      <td>
                        {tipoPropiedad ? (
                          <span className="list-tag type">{tipoPropiedad.icon} {tipoPropiedad.label}</span>
                        ) : s.tipo_propiedad ? (
                          <span className="list-tag type">{s.tipo_propiedad}</span>
                        ) : (
                          <span className="list-empty">-</span>
                        )}
                      </td>
                      <td>
                        {s.zona_interes ? (
                          <span className="list-tag zone">{s.zona_interes}</span>
                        ) : (
                          <span className="list-empty">-</span>
                        )}
                      </td>
                      <td>
                        {s.motivo ? (
                          <span className="list-tag motivo">{motivoLabels[s.motivo] || s.motivo}</span>
                        ) : (
                          <span className="list-empty">-</span>
                        )}
                      </td>
                      <td>
                        <span className="list-budget">{s.valor_estimado ? `$${formatMoney(s.valor_estimado)}` : '-'}</span>
                      </td>
                      <td>
                        <div
                          className="purge-score"
                          style={{ backgroundColor: purgeColors.bg, color: purgeColors.text }}
                        >
                          <Zap className="w-3 h-3" />
                          {s.purge_score}/25
                        </div>
                      </td>
                      <td>
                        <button
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCloseModal(s);
                          }}
                          title="Cerrar solicitud"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Leyenda PURGE */}
      <div className="purge-legend">
        <div className="legend-item">
          <Zap className="w-3 h-3 text-amber-500" />
          <span>PURGE Score: Calificación del prospecto (0-25)</span>
        </div>
        <div className="legend-letters">
          <span>P: Poder</span>
          <span>U: Urgencia</span>
          <span>R: Recursos</span>
          <span>G: Genuino</span>
          <span>E: Expectativas</span>
        </div>
      </div>

      {/* Modal de cierre de solicitud */}
      {showCloseModal && (
        <div className="modal-overlay" onClick={resetCloseModal}>
          <div className="modal-content modal-close-solicitud" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{closeModalStep === 'select' ? 'Cerrar Solicitud' :
                   closeModalData.etapa === 'perdido' ? 'Solicitud Perdida' : 'Descartar Solicitud'}</h3>
              <button className="modal-close-btn" onClick={resetCloseModal}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {closeModalStep === 'select' ? (
              <>
                <p className="modal-subtitle">¿Cómo deseas cerrar "{showCloseModal.titulo}"?</p>

                <div className="close-options">
                  {ETAPAS_CIERRE.map((etapa) => {
                    const Icon = etapa.icon;
                    return (
                      <button
                        key={etapa.id}
                        className="close-option"
                        style={{ '--option-color': etapa.color, '--option-bg': etapa.light } as React.CSSProperties}
                        onClick={() => handleSelectCloseEtapa(etapa.id)}
                        disabled={saving}
                      >
                        <div className="close-option-icon">
                          <Icon />
                        </div>
                        <span className="close-option-label">{etapa.label}</span>
                        {etapa.id !== 'ganado' && (
                          <span className="close-option-hint">+ detalles</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button className="btn-cancel-full" onClick={resetCloseModal}>
                  Cancelar
                </button>
              </>
            ) : (
              /* Paso de detalles para Perdido/Descartado */
              <div className="close-details">
                <p className="modal-subtitle">
                  Agrega una nota explicando el motivo y sube evidencias si las tienes.
                </p>

                <div className="form-group">
                  <label htmlFor="close-nota">
                    {closeModalData.etapa === 'perdido' ? 'Razón de pérdida' : 'Motivo del descarte'}
                  </label>
                  <textarea
                    id="close-nota"
                    value={closeModalData.nota}
                    onChange={(e) => setCloseModalData(prev => ({ ...prev, nota: e.target.value }))}
                    placeholder={closeModalData.etapa === 'perdido'
                      ? 'Ej: El cliente eligió otra propiedad, precio fuera de presupuesto...'
                      : 'Ej: Cliente no respondió después de 3 intentos, datos incorrectos...'}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Evidencias (opcional)</label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      id="close-files"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={handleCloseModalFiles}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="close-files" className="file-upload-btn">
                      <Upload className="w-5 h-5" />
                      <span>Subir archivos</span>
                    </label>
                    <span className="file-upload-hint">Imágenes, PDFs, documentos</span>
                  </div>

                  {closeModalData.archivos.length > 0 && (
                    <div className="files-list">
                      {closeModalData.archivos.map((file, index) => (
                        <div key={index} className="file-item">
                          {file.type.startsWith('image/') ? (
                            <Image className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          <span className="file-name">{file.name}</span>
                          <button
                            type="button"
                            className="file-remove"
                            onClick={() => removeCloseModalFile(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setCloseModalStep('select')}
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{
                      background: closeModalData.etapa === 'perdido' ? '#64748b' : '#94a3b8'
                    }}
                    onClick={() => handleCloseSolicitud(
                      closeModalData.etapa,
                      closeModalData.nota,
                      closeModalData.archivos
                    )}
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' :
                      closeModalData.etapa === 'perdido' ? 'Marcar como Perdida' : 'Descartar Solicitud'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de creación de solicitud */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nueva Solicitud</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateSolicitud(); }}>
              {/* Selector de Contacto */}
              <div className="form-group">
                <label htmlFor="contacto">Contacto</label>
                <ContactPicker
                  value={nuevaSolicitud.contacto_id || null}
                  onChange={(contactId) => setNuevaSolicitud(prev => ({ ...prev, contacto_id: contactId || '' }))}
                  contacts={contactos}
                  loading={loadingContactos}
                  placeholder="Seleccionar contacto"
                />
              </div>

              <div className="form-group">
                <label htmlFor="titulo">Título *</label>
                <input
                  id="titulo"
                  type="text"
                  value={nuevaSolicitud.titulo}
                  onChange={(e) => setNuevaSolicitud(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ej: Casa en zona residencial"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tipo_solicitud">Tipo Operación</label>
                  <select
                    id="tipo_solicitud"
                    value={nuevaSolicitud.tipo_solicitud}
                    onChange={(e) => setNuevaSolicitud(prev => ({ ...prev, tipo_solicitud: e.target.value }))}
                  >
                    {Object.entries(TIPOS_SOLICITUD).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="prioridad">Prioridad</label>
                  <select
                    id="prioridad"
                    value={nuevaSolicitud.prioridad}
                    onChange={(e) => setNuevaSolicitud(prev => ({ ...prev, prioridad: e.target.value }))}
                  >
                    {Object.entries(PRIORIDADES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campos clave de búsqueda */}
              <div className="search-fields-section">
                <h4 className="section-title">Información de Búsqueda</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="tipo_propiedad">Tipo de Propiedad</label>
                    <select
                      id="tipo_propiedad"
                      value={nuevaSolicitud.tipo_propiedad}
                      onChange={(e) => setNuevaSolicitud(prev => ({ ...prev, tipo_propiedad: e.target.value }))}
                    >
                      <option value="">Seleccionar...</option>
                      {Object.entries(TIPOS_PROPIEDAD).map(([key, val]) => (
                        <option key={key} value={key}>{val.icon} {val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="zona_interes">Zona de Interés</label>
                    <input
                      id="zona_interes"
                      type="text"
                      value={nuevaSolicitud.zona_interes}
                      onChange={(e) => setNuevaSolicitud(prev => ({ ...prev, zona_interes: e.target.value }))}
                      placeholder="Ej: Piantini, Naco..."
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="presupuesto_min">Presupuesto Mín (USD)</label>
                    <input
                      id="presupuesto_min"
                      type="number"
                      value={nuevaSolicitud.presupuesto_min}
                      onChange={(e) => setNuevaSolicitud(prev => ({ ...prev, presupuesto_min: e.target.value }))}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="presupuesto_max">Presupuesto Máx (USD)</label>
                    <input
                      id="presupuesto_max"
                      type="number"
                      value={nuevaSolicitud.presupuesto_max}
                      onChange={(e) => setNuevaSolicitud(prev => ({ ...prev, presupuesto_max: e.target.value }))}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="motivo">Motivo</label>
                  <select
                    id="motivo"
                    value={nuevaSolicitud.motivo}
                    onChange={(e) => setNuevaSolicitud(prev => ({ ...prev, motivo: e.target.value }))}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="mudanza">Mudanza / Vivienda propia</option>
                    <option value="inversion">Inversión / Renta</option>
                    <option value="vacaciones">Casa de vacaciones</option>
                    <option value="negocio">Local comercial / Negocio</option>
                    <option value="oficina">Oficina / Consultorio</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="valor_estimado">Valor Estimado Deal (USD)</label>
                <input
                  id="valor_estimado"
                  type="number"
                  value={nuevaSolicitud.valor_estimado}
                  onChange={(e) => setNuevaSolicitud(prev => ({ ...prev, valor_estimado: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Notas adicionales</label>
                <textarea
                  id="descripcion"
                  value={nuevaSolicitud.descripcion}
                  onChange={(e) => setNuevaSolicitud(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Requisitos específicos, observaciones..."
                  rows={2}
                />
              </div>

              {/* Sección PURGE Score */}
              <div className="purge-section">
                <div className="purge-header">
                  <div className="purge-title">
                    <HelpCircle className="w-5 h-5" />
                    <span>Calificación PURGE</span>
                  </div>
                  <p className="purge-subtitle">Responde estas preguntas para calificar al prospecto</p>
                </div>

                {/* Score Summary */}
                <div
                  className="purge-summary"
                  style={{
                    backgroundColor: getPurgeRecommendation(purgeScoreTotal).bg,
                    borderColor: getPurgeRecommendation(purgeScoreTotal).color,
                  }}
                >
                  <div className="purge-summary-left">
                    <div className="purge-score-display">
                      <Zap className="w-5 h-5" style={{ color: getPurgeRecommendation(purgeScoreTotal).color }} />
                      <span className="purge-score-value" style={{ color: getPurgeRecommendation(purgeScoreTotal).color }}>
                        {purgeScoreTotal}/25
                      </span>
                    </div>
                    <div className="purge-letters">
                      {Object.entries(PURGE_CONFIG).map(([key, config]) => {
                        const value = nuevaSolicitud[`purge_${key}` as keyof typeof nuevaSolicitud] as number;
                        return (
                          <div
                            key={key}
                            className={`purge-letter-item ${value >= 4 ? 'high' : value >= 2 ? 'medium' : 'low'}`}
                            title={`${config.label}: ${value}/5`}
                          >
                            {config.letter}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="purge-summary-right">
                    <p className="purge-rec-text" style={{ color: getPurgeRecommendation(purgeScoreTotal).color }}>
                      {getPurgeRecommendation(purgeScoreTotal).text}
                    </p>
                    <p className="purge-rec-action">{getPurgeRecommendation(purgeScoreTotal).action}</p>
                  </div>
                </div>

                {/* Preguntas PURGE */}
                <div className="purge-questions">
                  {Object.entries(PURGE_CONFIG).map(([key, config]) => {
                    const fieldKey = `purge_${key}` as keyof typeof nuevaSolicitud;
                    const currentValue = nuevaSolicitud[fieldKey] as number;
                    const isExpanded = activePurgeSection === key;

                    return (
                      <div key={key} className="purge-question-item">
                        <button
                          type="button"
                          onClick={() => setActivePurgeSection(isExpanded ? null : key)}
                          className="purge-question-header"
                        >
                          <div className="purge-question-left">
                            <div className={`purge-letter-badge ${currentValue >= 4 ? 'high' : currentValue >= 2 ? 'medium' : 'low'}`}>
                              {config.letter}
                            </div>
                            <div className="purge-question-info">
                              <span className="purge-question-label">{config.label}</span>
                              <span className="purge-question-desc">{config.description}</span>
                            </div>
                          </div>
                          <div className="purge-question-right">
                            <span className="purge-question-value">{currentValue}/5</span>
                            <ChevronDown className={`w-4 h-4 ${isExpanded ? 'rotate' : ''}`} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="purge-options">
                            <p className="purge-question-text">"{config.question}"</p>
                            {config.options.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setNuevaSolicitud(prev => ({ ...prev, [fieldKey]: option.value }))}
                                className={`purge-option ${currentValue === option.value ? 'selected' : ''}`}
                              >
                                <div className="purge-option-left">
                                  <div className={`purge-option-num ${currentValue === option.value ? 'selected' : ''}`}>
                                    {option.value}
                                  </div>
                                  <div className="purge-option-info">
                                    <span className="purge-option-label">{option.label}</span>
                                    <span className="purge-option-hint">{option.hint}</span>
                                  </div>
                                </div>
                                {currentValue === option.value && (
                                  <Check className="w-5 h-5 purge-check" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving || !nuevaSolicitud.titulo.trim()}>
                  {saving ? 'Guardando...' : 'Crear Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* Loading */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #64748b;
    gap: 16px;
  }

  /* View Toggle */
  .view-toggle {
    display: flex;
    background: #f1f5f9;
    border-radius: 6px;
    padding: 3px;
  }

  .view-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px 8px;
    background: none;
    border: none;
    border-radius: 4px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .view-btn.active {
    background: white;
    color: #0f172a;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  /* Filters Bar */
  .filters-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1;
    min-width: 280px;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  .search-box input {
    width: 100%;
    padding: 12px 16px 12px 44px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    background: white;
    transition: all 0.2s;
  }

  .search-box input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  /* Status Toggles */
  .status-toggles {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .status-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
    padding: 6px 10px;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .status-toggle:hover {
    background: #f1f5f9;
  }

  .status-toggle.active {
    background: #f8fafc;
  }

  .status-toggle input {
    display: none;
  }

  .toggle-check {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 2px solid #cbd5e1;
    transition: all 0.15s;
    position: relative;
  }

  .status-toggle input:checked + .toggle-check {
    background: var(--check-color, #10b981);
    border-color: var(--check-color, #10b981);
  }

  .status-toggle input:checked + .toggle-check::after {
    content: '';
    position: absolute;
    top: 1px;
    left: 4px;
    width: 4px;
    height: 7px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .toggle-label {
    font-size: 0.85rem;
    color: #64748b;
    font-weight: 500;
  }

  .status-toggle:hover .toggle-label,
  .status-toggle.active .toggle-label {
    color: #0f172a;
  }

  .filter-divider {
    width: 1px;
    height: 24px;
    background: #e2e8f0;
  }

  .filters-right {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .filter-select {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.85rem;
    background: white;
    cursor: pointer;
    min-width: 120px;
    color: #475569;
  }

  .filter-select:focus {
    outline: none;
    border-color: #2563eb;
  }

  .filter-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.85rem;
    background: white;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .filter-btn:hover {
    background: #f8fafc;
  }

  .filter-btn.active {
    background: #eff6ff;
    border-color: #2563eb;
    color: #2563eb;
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    color: #dc2626;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 4px;
  }

  /* Kanban Container */
  .kanban-container {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    flex: 1;
    overflow: hidden;
  }

  .kanban-column {
    min-width: 0;
    background: #f8fafc;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    border: 2px solid transparent;
    transition: all 0.2s;
  }

  .kanban-column.drag-over {
    border-color: var(--column-color);
    background: var(--column-light);
  }

  .kanban-column.closed-column {
    background: #f1f5f9;
    opacity: 0.9;
  }

  .kanban-column.closed-column .column-header {
    opacity: 0.8;
  }

  .column-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 10px 10px 0 0;
  }

  .column-indicator {
    width: 4px;
    height: 20px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .column-title {
    font-weight: 600;
    font-size: 0.85rem;
    color: #0f172a;
    flex: 1;
  }

  .column-count {
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .column-content {
    flex: 1;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    max-height: calc(100vh - 340px);
  }

  .column-empty {
    text-align: center;
    padding: 20px 8px;
    color: #94a3b8;
    font-size: 0.8rem;
  }

  .column-add {
    padding: 8px;
    border-top: 1px solid #e2e8f0;
  }

  .column-add button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    background: none;
    border: none;
    border-radius: 8px;
    color: #64748b;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .column-add button:hover {
    background: white;
    color: #2563eb;
  }

  /* Kanban Card - Compacta */
  .kanban-card {
    background: white;
    border-radius: 10px;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.15s;
  }

  .kanban-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #6366f1;
  }

  .kanban-card.dragging {
    opacity: 0.5;
  }

  .kanban-card.closed-card {
    cursor: pointer;
    opacity: 0.85;
  }

  .kanban-card.closed-card:hover {
    opacity: 1;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 4px;
  }

  .card-title {
    font-weight: 600;
    font-size: 0.8rem;
    color: #0f172a;
    line-height: 1.3;
    flex: 1;
  }

  .drag-handle {
    color: #cbd5e1;
    opacity: 0;
    cursor: grab;
  }

  .kanban-card:hover .drag-handle {
    opacity: 1;
  }

  .card-client {
    font-size: 0.75rem;
    color: #6366f1;
    font-weight: 500;
    margin-bottom: 6px;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }

  .card-tags .tag {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
  }

  .card-tags .tag.type {
    background: #e0f2fe;
    color: #0369a1;
  }

  .card-tags .tag.zone {
    background: #fef3c7;
    color: #92400e;
  }

  .card-tags .tag.motivo {
    background: #f3e8ff;
    color: #7c3aed;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid #f1f5f9;
  }

  .card-footer .budget {
    font-size: 0.75rem;
    font-weight: 700;
    color: #059669;
  }

  .card-footer .purge-badge {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .card-footer .close-btn {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }

  .card-footer .close-btn:hover {
    background: #dcfce7;
    border-color: #86efac;
    color: #16a34a;
  }

  /* List View */
  .list-container {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    flex: 1;
  }

  .solicitudes-table {
    width: 100%;
    border-collapse: collapse;
  }

  .solicitudes-table th {
    text-align: left;
    padding: 14px 16px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .solicitudes-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .solicitudes-table tr:hover {
    background: #f8fafc;
  }

  .list-title {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.85rem;
  }

  .list-client {
    font-size: 0.85rem;
    color: #6366f1;
    font-weight: 500;
  }

  .list-tag {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .list-tag.type {
    background: #e0f2fe;
    color: #0369a1;
  }

  .list-tag.zone {
    background: #fef3c7;
    color: #92400e;
  }

  .list-tag.motivo {
    background: #f3e8ff;
    color: #7c3aed;
  }

  .list-empty {
    color: #cbd5e1;
    font-size: 0.85rem;
  }

  .list-budget {
    font-weight: 700;
    color: #059669;
    font-size: 0.85rem;
  }

  .purge-score {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: #f1f5f9;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .action-btn:hover {
    background: #dcfce7;
    color: #16a34a;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    text-align: center;
    color: #64748b;
  }

  .empty-state h3 {
    margin: 16px 0 8px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.9rem;
  }

  /* PURGE Legend */
  .purge-legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-top: 16px;
    font-size: 0.75rem;
    color: #64748b;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-letters {
    display: flex;
    gap: 16px;
  }

  /* Primary button */
  .btn-primary {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary.btn-sm {
    padding: 6px 12px;
    font-size: 0.75rem;
    gap: 4px;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
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
    z-index: 9000;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    z-index: 9001;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: #0f172a;
  }

  .modal-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: #f1f5f9;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
  }

  .modal-close-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .modal-subtitle {
    margin: 0 0 20px 0;
    color: #64748b;
    font-size: 0.9rem;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .btn-cancel {
    padding: 10px 20px;
    background: #f1f5f9;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
  }

  .btn-cancel-full {
    width: 100%;
    padding: 12px;
    background: #f1f5f9;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
    margin-top: 12px;
  }

  .btn-cancel-full:hover {
    background: #e2e8f0;
  }

  /* Close Modal - Solicitudes */
  .modal-close-solicitud {
    max-width: 400px;
    width: 95%;
    background: white !important;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }

  .close-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .close-option {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #1e293b;
    width: 100%;
    text-align: left;
  }

  .close-option:hover {
    background: white;
    border-color: var(--option-color, #3b82f6);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .close-option-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--option-bg, #f0fdf4);
    border-radius: 10px;
    flex-shrink: 0;
  }

  .close-option-icon svg {
    width: 20px;
    height: 20px;
    color: var(--option-color, #22c55e);
  }

  .close-option-label {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--option-color, #1e293b);
    flex: 1;
  }

  .close-option-hint {
    font-size: 0.8rem;
    color: #94a3b8;
    font-weight: 400;
  }

  /* Close Details Step */
  .close-details {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .close-details-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 4px;
  }

  .close-details-header button {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .close-details-header button:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  .close-details-header h4 {
    margin: 0;
    font-size: 1rem;
    color: var(--status-color, #64748b);
  }

  .close-details .form-group {
    margin-bottom: 0;
  }

  .close-details .form-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #475569;
    margin-bottom: 6px;
    display: block;
  }

  .close-details textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    resize: vertical;
    min-height: 80px;
    font-family: inherit;
  }

  .close-details textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .file-upload-area {
    border: 2px dashed #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
    transition: all 0.15s;
  }

  .file-upload-area:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  .file-upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: #f1f5f9;
    border: none;
    border-radius: 8px;
    color: #475569;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .file-upload-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .file-upload-hint {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 8px;
  }

  .files-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .file-item svg:first-child {
    color: #64748b;
    flex-shrink: 0;
  }

  .file-name {
    flex: 1;
    font-size: 0.85rem;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-size: 0.75rem;
    color: #94a3b8;
    flex-shrink: 0;
  }

  .file-remove {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .file-remove:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  .close-details-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }

  .btn-cancel {
    padding: 10px 20px;
    background: #f1f5f9;
    border: none;
    border-radius: 8px;
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .btn-confirm-close {
    padding: 10px 20px;
    background: var(--status-color, #64748b);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-confirm-close:hover {
    filter: brightness(0.9);
  }

  .form-row {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
  }

  .form-row .form-group {
    flex: 1;
    margin-bottom: 0;
  }

  /* Sección de campos de búsqueda */
  .search-fields-section {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .section-title {
    margin: 0 0 12px 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .search-fields-section .form-row {
    margin-bottom: 12px;
  }

  .search-fields-section .form-group {
    margin-bottom: 12px;
  }

  .search-fields-section .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: all 0.2s;
    background: white;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: #94a3b8;
  }

  /* Contacto Selector */
  .contacto-selector {
    position: relative;
  }

  .contacto-selector input {
    width: 100%;
    padding: 10px 14px;
    padding-right: 36px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .contacto-selector input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .loading-text {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .contacto-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    max-height: 260px;
    overflow-y: auto;
    z-index: 100;
    margin-top: 4px;
  }

  .contacto-empty {
    padding: 16px;
    text-align: center;
    color: #94a3b8;
    font-size: 0.85rem;
  }

  .contacto-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .contacto-option:hover {
    background: #f8fafc;
  }

  .contacto-option-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .contacto-option-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .contacto-option-avatar span {
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .contacto-option-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .contacto-option-name {
    font-weight: 500;
    color: #0f172a;
    font-size: 0.9rem;
  }

  .contacto-option-email {
    font-size: 0.75rem;
    color: #64748b;
  }

  .contacto-clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: none;
    background: #f1f5f9;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .contacto-clear:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  /* ========== PURGE Questionnaire Styles ========== */
  .purge-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
  }

  .purge-header {
    margin-bottom: 16px;
  }

  .purge-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 4px;
  }

  .purge-title svg {
    color: #2563eb;
  }

  .purge-subtitle {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
  }

  .purge-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-radius: 12px;
    border: 2px solid;
    margin-bottom: 16px;
  }

  .purge-summary-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .purge-score-display {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .purge-score-value {
    font-size: 1.5rem;
    font-weight: 800;
  }

  .purge-letters {
    display: flex;
    gap: 4px;
  }

  .purge-letter-item {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .purge-letter-item.high {
    background: #dcfce7;
    color: #166534;
  }

  .purge-letter-item.medium {
    background: #fef3c7;
    color: #92400e;
  }

  .purge-letter-item.low {
    background: #f1f5f9;
    color: #94a3b8;
  }

  .purge-summary-right {
    text-align: right;
    max-width: 200px;
  }

  .purge-rec-text {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .purge-rec-action {
    margin: 4px 0 0 0;
    font-size: 0.7rem;
    color: #64748b;
  }

  .purge-questions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .purge-question-item {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
  }

  .purge-question-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: none;
    border: none;
    cursor: pointer;
    transition: background 0.15s;
  }

  .purge-question-header:hover {
    background: #f8fafc;
  }

  .purge-question-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .purge-letter-badge {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .purge-letter-badge.high {
    background: #dcfce7;
    color: #166534;
  }

  .purge-letter-badge.medium {
    background: #fef3c7;
    color: #92400e;
  }

  .purge-letter-badge.low {
    background: #f1f5f9;
    color: #64748b;
  }

  .purge-question-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .purge-question-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: #0f172a;
  }

  .purge-question-desc {
    font-size: 0.75rem;
    color: #64748b;
  }

  .purge-question-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .purge-question-value {
    font-weight: 700;
    font-size: 0.9rem;
    color: #374151;
  }

  .purge-question-right svg {
    color: #94a3b8;
    transition: transform 0.2s;
  }

  .purge-question-right svg.rotate {
    transform: rotate(180deg);
  }

  .purge-options {
    padding: 12px 14px;
    padding-top: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .purge-question-text {
    margin: 0 0 12px 0;
    font-size: 0.85rem;
    font-weight: 500;
    color: #2563eb;
  }

  .purge-option {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.15s;
  }

  .purge-option:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  .purge-option.selected {
    border-color: #2563eb;
    background: #eff6ff;
  }

  .purge-option-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .purge-option-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #f1f5f9;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .purge-option-num.selected {
    background: #2563eb;
    color: white;
  }

  .purge-option-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .purge-option-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #0f172a;
  }

  .purge-option-hint {
    font-size: 0.7rem;
    color: #94a3b8;
  }

  .purge-check {
    color: #2563eb;
  }

  /* Modal form más ancho para PURGE */
  .modal-form {
    max-width: 600px;
    max-height: 85vh;
    overflow-y: auto;
    overflow-x: visible;
  }

  .modal-form select {
    position: relative;
    z-index: 1;
  }
`;
