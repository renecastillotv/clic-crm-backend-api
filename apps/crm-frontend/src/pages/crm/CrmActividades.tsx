/**
 * CrmActividades (Seguimiento) - Gestión de actividades del CRM
 *
 * Réplica exacta del módulo Seguimiento del CRM de referencia
 * - Header con gradiente y stats (Este Mes, Este Año, Completadas)
 * - 7 botones de Acción Rápida
 * - Vista Kanban (3 columnas) y Lista
 * - Estados: pendiente, en_progreso, completada, cancelada
 * - Prioridades: baja, normal, alta, urgente
 * - Modal de evidencias para subir/ver archivos
 * - Iconos Lucide React (idénticos al CRM de referencia)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import './CrmActividades.css';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import DatePicker from '../../components/DatePicker';
import ContactPicker from '../../components/ContactPicker';
import {
  getActividades,
  createActividad,
  updateActividad,
  cambiarEstadoActividad,
  deleteActividad,
  getContactos,
  getSolicitudes,
  Actividad,
  TipoActividad,
  EstadoActividad,
  Prioridad,
} from '../../services/api';

// Lucide React Icons
import {
  Phone,
  Mail,
  Users,
  Eye,
  CheckSquare,
  MessageCircle,
  Zap,
  LayoutGrid,
  List,
  Search,
  Plus,
  Check,
  Pencil,
  Trash2,
  Calendar,
  User,
  ArrowDownUp,
  TrendingUp,
  CalendarCheck,
  ChevronDown,
  X,
  Upload,
  FileText,
  Paperclip,
  ExternalLink,
  Loader2,
  Download,
  ZoomIn,
} from 'lucide-react';

// Configuración de tipos de actividad con iconos Lucide
const ACTIVITY_TYPES: { value: TipoActividad; label: string; icon: React.ElementType; gradient: string; color: string }[] = [
  { value: 'llamada', label: 'Llamada', icon: Phone, gradient: 'from-blue-500 to-blue-600', color: '#3b82f6' },
  { value: 'email', label: 'Email', icon: Mail, gradient: 'from-purple-500 to-purple-600', color: '#8b5cf6' },
  { value: 'reunion', label: 'Reunión', icon: Users, gradient: 'from-green-500 to-green-600', color: '#22c55e' },
  { value: 'visita', label: 'Visita', icon: Eye, gradient: 'from-cyan-500 to-teal-500', color: '#06b6d4' },
  { value: 'tarea', label: 'Tarea', icon: CheckSquare, gradient: 'from-pink-500 to-pink-600', color: '#ec4899' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, gradient: 'from-green-400 to-green-500', color: '#25d366' },
  { value: 'seguimiento', label: 'Seguimiento', icon: Zap, gradient: 'from-indigo-500 to-indigo-600', color: '#6366f1' },
];

// Configuración de estados
const STATUS_CONFIG: Record<EstadoActividad, { label: string; color: string; dotClass: string; bgClass: string }> = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', dotClass: 'bg-amber-500', bgClass: 'bg-amber-50' },
  en_progreso: { label: 'En Progreso', color: '#3b82f6', dotClass: 'bg-blue-500', bgClass: 'bg-blue-50' },
  completada: { label: 'Completada', color: '#22c55e', dotClass: 'bg-green-500', bgClass: 'bg-green-50' },
  cancelada: { label: 'Cancelada', color: '#6b7280', dotClass: 'bg-gray-400', bgClass: 'bg-gray-50' },
};

// Configuración de prioridades
const PRIORITY_CONFIG: Record<Prioridad, { label: string; color: string; dotClass: string }> = {
  baja: { label: 'Baja', color: '#9ca3af', dotClass: 'bg-gray-400' },
  normal: { label: 'Normal', color: '#3b82f6', dotClass: 'bg-blue-500' },
  alta: { label: 'Alta', color: '#f97316', dotClass: 'bg-orange-500' },
  urgente: { label: 'Urgente', color: '#ef4444', dotClass: 'bg-red-500' },
};

// Interfaz para evidencias
interface Evidencia {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export default function CrmActividades() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  // Estados principales
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clave para localStorage
  const STORAGE_KEY = `crm_seguimiento_prefs_${tenantActual?.id || 'default'}`;

  // Cargar preferencias del localStorage
  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading preferences:', e);
    }
    // Valores por defecto
    return {
      vistaKanban: false, // Lista por defecto
      estadosFiltro: ['pendiente', 'en_progreso'], // Solo pendiente y en_progreso seleccionados
      ordenar: 'fecha',
    };
  };

  const [prefs, setPrefs] = useState(loadPreferences);

  // Guardar preferencias cuando cambien
  const savePreferences = (newPrefs: typeof prefs) => {
    setPrefs(newPrefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch (e) {
      console.error('Error saving preferences:', e);
    }
  };

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const estadosFiltro = prefs.estadosFiltro as EstadoActividad[];
  const ordenar = prefs.ordenar as 'fecha' | 'prioridad' | 'estado';
  const vistaKanban = prefs.vistaKanban as boolean;

  // Helpers para cambiar preferencias
  const setVistaKanban = (value: boolean) => savePreferences({ ...prefs, vistaKanban: value });
  const setOrdenar = (value: 'fecha' | 'prioridad' | 'estado') => savePreferences({ ...prefs, ordenar: value });
  const toggleEstadoFiltro = (estado: EstadoActividad) => {
    const current = prefs.estadosFiltro as string[];
    const newEstados = current.includes(estado)
      ? current.filter(e => e !== estado)
      : [...current, estado];
    savePreferences({ ...prefs, estadosFiltro: newEstados });
  };

  // Modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<TipoActividad | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    tipo: 'tarea' as TipoActividad,
    titulo: '',
    descripcion: '',
    estado: 'pendiente' as EstadoActividad,
    prioridad: 'normal' as Prioridad,
    fecha_actividad: '',
    contacto_id: '',
    solicitud_id: '',
  });

  // Datos relacionados
  const [contactos, setContactos] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Modal de completar
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [actividadToComplete, setActividadToComplete] = useState<Actividad | null>(null);
  const [notaCompletacion, setNotaCompletacion] = useState('');

  // Dropdown de estado con posición fixed
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // Modal de evidencias
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [selectedActivityForEvidence, setSelectedActivityForEvidence] = useState<Actividad | null>(null);
  const [evidences, setEvidences] = useState<Evidencia[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Stats calculados
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisYear = new Date(now.getFullYear(), 0, 1);

  const statsThisMonth = actividades.filter(a => new Date(a.created_at) >= thisMonth).length;
  const statsThisYear = actividades.filter(a => new Date(a.created_at) >= thisYear).length;
  const statsCompleted = actividades.filter(a => a.estado === 'completada').length;

  // Configurar header oficial con stats
  useEffect(() => {
    setPageHeader({
      title: 'Seguimiento',
      subtitle: 'Gestiona tus actividades y agenda de forma rápida',
      stats: [
        { label: 'Este Mes', value: statsThisMonth, icon: <Calendar className="w-4 h-4" /> },
        { label: 'Este Año', value: statsThisYear, icon: <TrendingUp className="w-4 h-4" /> },
        { label: 'Completadas', value: statsCompleted, icon: <CalendarCheck className="w-4 h-4" /> },
      ],
      actions: null,
    });
  }, [setPageHeader, statsThisMonth, statsThisYear, statsCompleted]);

  // Cargar actividades
  const cargarActividades = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar todas las actividades (filtraremos en el cliente por checkbox)
      const response = await getActividades(tenantActual.id, {
        busqueda: busqueda || undefined,
      });
      setActividades(response.data);
    } catch (err: any) {
      console.error('Error cargando actividades:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, busqueda]);

  useEffect(() => {
    cargarActividades();
  }, [cargarActividades]);

  // Cargar contactos y solicitudes cuando se abre el modal
  const cargarDatosRelacionados = async () => {
    if (!tenantActual?.id) return;
    setLoadingRelated(true);

    try {
      const [contactosRes, solicitudesRes] = await Promise.all([
        getContactos(tenantActual.id, { limit: 100 }),
        getSolicitudes(tenantActual.id, { limit: 100 }),
      ]);
      setContactos(contactosRes.data || []);
      setSolicitudes(solicitudesRes.data || []);
    } catch (err) {
      console.error('Error cargando datos relacionados:', err);
    } finally {
      setLoadingRelated(false);
    }
  };

  // Click outside para cerrar dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.status-dropdown-container')) {
        setOpenDropdownId(null);
        setDropdownPosition(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdownId]);

  // Abrir dropdown con posición calculada
  const handleOpenDropdown = (e: React.MouseEvent, actividadId: string) => {
    e.stopPropagation();
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    setDropdownPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });
    setOpenDropdownId(openDropdownId === actividadId ? null : actividadId);
  };

  // Crear actividad rápida
  const handleQuickCreate = (tipo: TipoActividad) => {
    setSelectedTipo(tipo);
    setEditingActividad(null);
    setFormData({
      tipo,
      titulo: '',
      descripcion: '',
      estado: 'pendiente',
      prioridad: 'normal',
      fecha_actividad: '',
      contacto_id: '',
      solicitud_id: '',
    });
    cargarDatosRelacionados();
    setShowModal(true);
  };

  // Editar actividad
  const handleEdit = (actividad: Actividad) => {
    setEditingActividad(actividad);
    setSelectedTipo(actividad.tipo);
    setFormData({
      tipo: actividad.tipo,
      titulo: actividad.titulo,
      descripcion: actividad.descripcion || '',
      estado: actividad.estado || 'pendiente',
      prioridad: actividad.prioridad || 'normal',
      fecha_actividad: actividad.fecha_actividad?.slice(0, 16) || '',
      contacto_id: actividad.contacto_id || '',
      solicitud_id: actividad.solicitud_id || '',
    });
    cargarDatosRelacionados();
    setShowModal(true);
  };

  // Guardar actividad
  const handleSave = async () => {
    if (!tenantActual?.id || !formData.titulo?.trim()) return;

    try {
      setSaving(true);
      if (editingActividad) {
        await updateActividad(tenantActual.id, editingActividad.id, formData);
      } else {
        await createActividad(tenantActual.id, formData);
      }
      setShowModal(false);
      cargarActividades();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Cambiar estado
  const handleCambiarEstado = async (actividadId: string, nuevoEstado: EstadoActividad) => {
    if (!tenantActual?.id) return;

    // Si es completada, mostrar modal para nota
    if (nuevoEstado === 'completada') {
      const actividad = actividades.find(a => a.id === actividadId);
      if (actividad && actividad.estado !== 'completada') {
        setActividadToComplete(actividad);
        setNotaCompletacion('');
        setShowCompleteModal(true);
        setOpenDropdownId(null);
        setDropdownPosition(null);
        return;
      }
    }

    try {
      await cambiarEstadoActividad(tenantActual.id, actividadId, nuevoEstado);
      setOpenDropdownId(null);
      setDropdownPosition(null);
      cargarActividades();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Confirmar completar con nota
  const handleConfirmComplete = async () => {
    if (!tenantActual?.id || !actividadToComplete) return;

    try {
      await cambiarEstadoActividad(tenantActual.id, actividadToComplete.id, 'completada', notaCompletacion);
      setShowCompleteModal(false);
      setActividadToComplete(null);
      cargarActividades();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Eliminar actividad
  const handleDelete = async (actividadId: string) => {
    if (!tenantActual?.id || !confirm('¿Eliminar esta actividad?')) return;

    try {
      await deleteActividad(tenantActual.id, actividadId);
      cargarActividades();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Abrir modal de evidencias
  const handleOpenEvidenceModal = (actividad: Actividad) => {
    setSelectedActivityForEvidence(actividad);
    setEvidences(actividad.metadata?.evidences || []);
    setShowEvidenceModal(true);
  };

  // Subir archivo de evidencia
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedActivityForEvidence || !tenantActual?.id) return;

    setUploading(true);
    const newEvidences: Evidencia[] = [...evidences];

    try {
      // Subir archivos a R2 mediante la ruta de upload
      const token = await getToken();

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('images', file);
      });
      formData.append('folder', 'actividades/evidencias');

      // Usar fetch directo porque apiFetch establece Content-Type: application/json
      // y FormData necesita que el browser establezca el Content-Type automáticamente
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(
        `${API_BASE_URL}/tenants/${tenantActual.id}/upload/images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'Error desconocido',
          message: `Error ${response.status}: ${response.statusText}`
        }));
        throw new Error(errorData.message || errorData.error || 'Error al subir archivos');
      }

      const data = await response.json();
      
      // Procesar evidencias subidas exitosamente
      if (data.images && data.images.length > 0) {
        for (const evidence of data.images) {
          newEvidences.push({
            name: evidence.originalName || 'archivo',
            url: evidence.url, // URL persistente de R2
            type: evidence.format || 'application/octet-stream',
            size: evidence.size || 0,
            uploadedAt: new Date().toISOString(),
          });
        }
      }

      setEvidences(newEvidences);

      await updateActividad(tenantActual.id, selectedActivityForEvidence.id, {
        metadata: {
          ...selectedActivityForEvidence.metadata,
          evidences: newEvidences,
        },
      });

      cargarActividades();
    } catch (err: any) {
      console.error('Error subiendo evidencias:', err);
      setError('Error al subir archivos: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Eliminar evidencia
  const handleDeleteEvidence = async (index: number) => {
    if (!selectedActivityForEvidence || !tenantActual?.id) return;

    const newEvidences = evidences.filter((_, i) => i !== index);
    setEvidences(newEvidences);

    try {
      await updateActividad(tenantActual.id, selectedActivityForEvidence.id, {
        metadata: {
          ...selectedActivityForEvidence.metadata,
          evidences: newEvidences,
        },
      });
      cargarActividades();
    } catch (err: any) {
      setError('Error al eliminar evidencia: ' + err.message);
    }
  };

  // Filtrar y ordenar actividades
  const filteredActividades = actividades.filter(a => {
    const searchLower = busqueda.toLowerCase();
    const matchesSearch =
      a.titulo.toLowerCase().includes(searchLower) ||
      (a.descripcion && a.descripcion.toLowerCase().includes(searchLower)) ||
      (a.contacto_nombre && a.contacto_nombre.toLowerCase().includes(searchLower));
    // Filtrar por estados seleccionados en checkboxes
    const estadoActividad = a.estado || 'pendiente';
    const matchesEstado = estadosFiltro.length === 0 || estadosFiltro.includes(estadoActividad);
    return matchesSearch && matchesEstado;
  });

  const sortedActividades = [...filteredActividades].sort((a, b) => {
    if (ordenar === 'fecha') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (ordenar === 'prioridad') {
      const order = { urgente: 4, alta: 3, normal: 2, baja: 1 };
      return (order[b.prioridad || 'normal'] || 0) - (order[a.prioridad || 'normal'] || 0);
    } else if (ordenar === 'estado') {
      const order = { pendiente: 1, en_progreso: 2, completada: 3, cancelada: 4 };
      return (order[a.estado || 'pendiente'] || 0) - (order[b.estado || 'pendiente'] || 0);
    }
    return 0;
  });

  // Agrupar por estado para Kanban
  const groupedActividades = {
    pendiente: sortedActividades.filter(a => a.estado === 'pendiente' || !a.estado),
    en_progreso: sortedActividades.filter(a => a.estado === 'en_progreso'),
    completada: sortedActividades.filter(a => a.estado === 'completada'),
  };

  // Formatear fecha
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (loading && actividades.length === 0) {
    return (
      <div className="seguimiento-page">
        <div className="loading-container">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p>Cargando actividades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seguimiento-page">
      {/* Contenido Principal */}
      <div className="main-content">
        {/* Botones de Acción Rápida */}
        <div className="quick-actions-section">
          <h2 className="section-title">
            <Plus className="w-5 h-5" />
            Crear Actividad Rápida
          </h2>
          <div className="quick-actions-grid">
            {ACTIVITY_TYPES.map((type) => {
              const IconComponent = type.icon;
              return (
                <button
                  key={type.value}
                  className="quick-action-btn"
                  onClick={() => handleQuickCreate(type.value)}
                  style={{ '--gradient': `linear-gradient(135deg, ${type.color}, ${type.color}dd)` } as any}
                >
                  <div className="quick-action-icon" style={{ backgroundColor: `${type.color}15` }}>
                    <IconComponent className="w-6 h-6" style={{ color: type.color }} />
                  </div>
                  <span className="quick-action-label">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="filters-bar">
          <div className="search-box">
            <Search className="search-icon w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar actividades..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Checkboxes de estados */}
          <div className="status-checkboxes">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const isChecked = estadosFiltro.includes(key as EstadoActividad);
              return (
                <label
                  key={key}
                  className={`status-checkbox ${isChecked ? 'active' : ''}`}
                  style={{ '--status-color': config.color } as React.CSSProperties}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleEstadoFiltro(key as EstadoActividad)}
                  />
                  <span className="checkbox-indicator" style={{ color: config.color }}>
                    <Check className="w-3 h-3" />
                  </span>
                  <span className="checkbox-label">{config.label}</span>
                </label>
              );
            })}
          </div>

          <div className="spacer"></div>

          <div className="sort-select">
            <ArrowDownUp className="sort-icon w-4 h-4" />
            <select
              value={ordenar}
              onChange={(e) => setOrdenar(e.target.value as 'fecha' | 'prioridad' | 'estado')}
            >
              <option value="fecha">Fecha</option>
              <option value="prioridad">Prioridad</option>
              <option value="estado">Estado</option>
            </select>
          </div>

          <div className="view-toggle">
            <button
              className={`view-btn ${vistaKanban ? 'active' : ''}`}
              onClick={() => setVistaKanban(true)}
              title="Vista Kanban"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              className={`view-btn ${!vistaKanban ? 'active' : ''}`}
              onClick={() => setVistaKanban(false)}
              title="Vista Lista"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Vista Kanban */}
        {vistaKanban ? (
          <div className="kanban-container">
            {/* Columna Pendientes */}
            <div className="kanban-column">
              <div className="column-header">
                <div className="column-indicator" style={{ backgroundColor: STATUS_CONFIG.pendiente.color }}></div>
                <span className="column-title">Pendientes</span>
                <span className="column-count">{groupedActividades.pendiente.length}</span>
              </div>
              <div className="column-content">
                {groupedActividades.pendiente.map((actividad) => (
                  <ActivityCard
                    key={actividad.id}
                    actividad={actividad}
                    onEdit={() => handleEdit(actividad)}
                    onDelete={() => handleDelete(actividad.id)}
                    onOpenDropdown={handleOpenDropdown}
                    onOpenEvidence={() => handleOpenEvidenceModal(actividad)}
                    tenantSlug={tenantSlug}
                  />
                ))}
                {groupedActividades.pendiente.length === 0 && (
                  <div className="column-empty">No hay actividades pendientes</div>
                )}
              </div>
            </div>

            {/* Columna En Progreso */}
            <div className="kanban-column">
              <div className="column-header">
                <div className="column-indicator" style={{ backgroundColor: STATUS_CONFIG.en_progreso.color }}></div>
                <span className="column-title">En Progreso</span>
                <span className="column-count">{groupedActividades.en_progreso.length}</span>
              </div>
              <div className="column-content">
                {groupedActividades.en_progreso.map((actividad) => (
                  <ActivityCard
                    key={actividad.id}
                    actividad={actividad}
                    onEdit={() => handleEdit(actividad)}
                    onDelete={() => handleDelete(actividad.id)}
                    onOpenDropdown={handleOpenDropdown}
                    onOpenEvidence={() => handleOpenEvidenceModal(actividad)}
                    tenantSlug={tenantSlug}
                  />
                ))}
                {groupedActividades.en_progreso.length === 0 && (
                  <div className="column-empty">No hay actividades en progreso</div>
                )}
              </div>
            </div>

            {/* Columna Completadas */}
            <div className="kanban-column completed">
              <div className="column-header">
                <div className="column-indicator" style={{ backgroundColor: STATUS_CONFIG.completada.color }}></div>
                <span className="column-title">Completadas</span>
                <span className="column-count">{groupedActividades.completada.length}</span>
              </div>
              <div className="column-content">
                {groupedActividades.completada.map((actividad) => (
                  <ActivityCard
                    key={actividad.id}
                    actividad={actividad}
                    onEdit={() => handleEdit(actividad)}
                    onDelete={() => handleDelete(actividad.id)}
                    onOpenDropdown={handleOpenDropdown}
                    onOpenEvidence={() => handleOpenEvidenceModal(actividad)}
                    tenantSlug={tenantSlug}
                  />
                ))}
                {groupedActividades.completada.length === 0 && (
                  <div className="column-empty">No hay actividades completadas</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Vista Lista */
          <div className="list-container">
            {sortedActividades.length === 0 ? (
              <div className="actividades-empty-state">
                <Zap className="w-12 h-12 text-gray-300" />
                <h3>No hay actividades</h3>
                <p>Comienza creando tu primera actividad de seguimiento</p>
              </div>
            ) : (
              <table className="activities-table">
                <thead>
                  <tr>
                    <th>Actividad</th>
                    <th>Tipo</th>
                    <th>Relacionado</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedActividades.map((actividad) => {
                    const typeConfig = ACTIVITY_TYPES.find(t => t.value === actividad.tipo);
                    const estadoConfig = STATUS_CONFIG[actividad.estado || 'pendiente'];
                    const prioridadConfig = PRIORITY_CONFIG[actividad.prioridad || 'normal'];
                    const evidenceCount = actividad.metadata?.evidences?.length || 0;
                    const IconComponent = typeConfig?.icon || Zap;

                    return (
                      <tr key={actividad.id} className={actividad.estado === 'completada' ? 'completed-row' : ''}>
                        <td>
                          <div className="activity-cell">
                            <div className="activity-icon" style={{ backgroundColor: `${typeConfig?.color}15` }}>
                              <IconComponent className="w-5 h-5" style={{ color: typeConfig?.color }} />
                            </div>
                            <div>
                              <div className="activity-title">{actividad.titulo}</div>
                              {actividad.descripcion && (
                                <div className="activity-desc">{actividad.descripcion}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="type-label">{typeConfig?.label || actividad.tipo}</span>
                        </td>
                        <td>
                          {actividad.contacto_nombre ? (
                            <Link
                              to={`/crm/${tenantSlug}/contactos/${actividad.contacto_id}`}
                              className="related-link"
                            >
                              {actividad.contacto_nombre} {actividad.contacto_apellido || ''}
                            </Link>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <button
                            className={`status-dropdown-btn status-dropdown-container ${estadoConfig.bgClass}`}
                            onClick={(e) => handleOpenDropdown(e, actividad.id)}
                          >
                            <div className={`status-dot ${estadoConfig.dotClass}`}></div>
                            <span>{estadoConfig.label}</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td>
                          <span className="priority-badge" style={{ color: prioridadConfig.color }}>
                            <div className={`priority-dot ${prioridadConfig.dotClass}`}></div>
                            {prioridadConfig.label}
                          </span>
                        </td>
                        <td>
                          <div className="date-cell">
                            <div>{formatDate(actividad.created_at)}</div>
                            {actividad.fecha_actividad && (
                              <div className="due-date">Vence: {formatDate(actividad.fecha_actividad)}</div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="actions-cell">
                            {actividad.estado !== 'completada' && (
                              <button
                                className="action-btn complete"
                                onClick={() => handleCambiarEstado(actividad.id, 'completada')}
                                title="Completar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              className="action-btn evidence"
                              onClick={() => handleOpenEvidenceModal(actividad)}
                              title="Evidencias"
                            >
                              <Paperclip className="w-4 h-4" />
                              {evidenceCount > 0 && (
                                <span className="evidence-badge">{evidenceCount}</span>
                              )}
                            </button>
                            <button
                              className="action-btn edit"
                              onClick={() => handleEdit(actividad)}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => handleDelete(actividad.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Fixed Position Dropdown para Estado */}
      {openDropdownId && dropdownPosition && (
        <div
          className="fixed-status-dropdown status-dropdown-container"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const currentActivity = actividades.find(a => a.id === openDropdownId);
            if (!currentActivity) return null;

            return (
              <button
                key={key}
                className={`dropdown-item ${currentActivity.estado === key ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCambiarEstado(openDropdownId, key as EstadoActividad);
                }}
              >
                <div className={`status-dot ${config.dotClass}`}></div>
                <span>{config.label}</span>
                {currentActivity.estado === key && (
                  <Check className="w-4 h-4 text-indigo-600" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="actividades-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="actividades-modal-content large" onClick={(e) => e.stopPropagation()}>
            {/* Header con gradiente */}
            <div
              className="modal-header-gradient"
              style={{
                background: selectedTipo
                  ? `linear-gradient(135deg, ${ACTIVITY_TYPES.find(t => t.value === selectedTipo)?.color || '#6366f1'}, ${ACTIVITY_TYPES.find(t => t.value === selectedTipo)?.color || '#6366f1'}dd)`
                  : 'linear-gradient(135deg, #6b7280, #4b5563)'
              }}
            >
              <div className="modal-header-icon">
                {selectedTipo && (() => {
                  const IconComponent = ACTIVITY_TYPES.find(t => t.value === selectedTipo)?.icon || Zap;
                  return <IconComponent className="w-7 h-7" />;
                })()}
              </div>
              <div>
                <h3>{editingActividad ? 'Editar Actividad' : 'Nueva Actividad'}</h3>
                <p>{selectedTipo ? ACTIVITY_TYPES.find(t => t.value === selectedTipo)?.label : 'Selecciona un tipo'}</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="modal-body">
              {/* Selector de Tipo */}
              <div className="form-group">
                <label>Tipo de Actividad</label>
                <div className="tipo-grid">
                  {ACTIVITY_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        className={`tipo-btn ${formData.tipo === type.value ? 'active' : ''}`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, tipo: type.value }));
                          setSelectedTipo(type.value);
                        }}
                        style={{ '--type-color': type.color } as any}
                      >
                        <IconComponent className="tipo-icon w-6 h-6" style={{ color: formData.tipo === type.value ? type.color : '#6b7280' }} />
                        <span className="tipo-label">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título */}
              <div className="form-group">
                <label htmlFor="titulo">Título *</label>
                <input
                  id="titulo"
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ej: Llamar al cliente para seguimiento"
                  required
                />
              </div>

              {/* Row: Prioridad y Estado */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="prioridad">Prioridad</label>
                  <select
                    id="prioridad"
                    value={formData.prioridad}
                    onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value as Prioridad }))}
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value as EstadoActividad }))}
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fecha */}
              <div className="form-group">
                <label htmlFor="fecha">Fecha Programada</label>
                <DatePicker
                  value={formData.fecha_actividad}
                  onChange={(val) => setFormData(prev => ({ ...prev, fecha_actividad: val || '' }))}
                  showTime
                  placeholder="Seleccionar fecha y hora"
                />
              </div>

              {/* Contacto */}
              <div className="form-group">
                <label htmlFor="contacto">Contacto Relacionado</label>
                <ContactPicker
                  value={formData.contacto_id || null}
                  onChange={(contactId) => setFormData(prev => ({ ...prev, contacto_id: contactId || '' }))}
                  contacts={contactos}
                  loading={loadingRelated}
                  placeholder="Seleccionar contacto"
                />
              </div>

              {/* Descripción */}
              <div className="form-group">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Notas o detalles adicionales..."
                  rows={3}
                />
              </div>

              <div className="actividades-modal-actions">
                {editingActividad && (
                  <button
                    type="button"
                    className="actividades-btn-danger"
                    onClick={() => { handleDelete(editingActividad.id); setShowModal(false); }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="actividades-btn-primary" disabled={saving || !formData.titulo?.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingActividad ? 'Guardar Cambios' : 'Crear Actividad'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Completar con Nota */}
      {showCompleteModal && actividadToComplete && (
        <div className="actividades-modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="actividades-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-simple">
              <h3>Completar Actividad</h3>
              <button className="modal-close-simple" onClick={() => setShowCompleteModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <p className="complete-activity-title">
                <strong>{actividadToComplete.titulo}</strong>
              </p>
              <div className="form-group">
                <label htmlFor="nota">Nota de Completación (opcional)</label>
                <textarea
                  id="nota"
                  value={notaCompletacion}
                  onChange={(e) => setNotaCompletacion(e.target.value)}
                  placeholder="Añade una nota sobre cómo se completó esta actividad..."
                  rows={4}
                />
              </div>
            </div>
            <div className="actividades-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowCompleteModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-success" onClick={handleConfirmComplete}>
                <Check className="w-4 h-4" />
                Completar Actividad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Evidencias */}
      {showEvidenceModal && selectedActivityForEvidence && (
        <div className="actividades-modal-overlay" onClick={() => setShowEvidenceModal(false)}>
          <div className="modal-content evidence-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="evidence-modal-header">
              <div>
                <h3>Evidencias de Actividad</h3>
                <p>{selectedActivityForEvidence.titulo}</p>
              </div>
              <button className="modal-close-simple" onClick={() => setShowEvidenceModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="evidence-modal-body">
              {/* Upload Section */}
              <div className="upload-section">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden-input"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="upload-btn"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon-wrapper">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="upload-text">
                        <p className="upload-title">Clic para subir archivos</p>
                        <p className="upload-subtitle">Imágenes, PDF, DOC (Max 10MB por archivo)</p>
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Evidences Grid */}
              {evidences.length > 0 ? (
                <div className="evidences-section">
                  <div className="evidences-header">
                    <h4>Archivos adjuntos ({evidences.length})</h4>
                  </div>
                  <div className="evidences-grid">
                    {evidences.map((evidence, idx) => {
                      const isImage = evidence.type?.startsWith('image/') ||
                        evidence.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                      return (
                        <div key={idx} className="evidence-card">
                          {/* Image Preview (clickable) or File Icon */}
                          {isImage ? (
                            <div
                              className="evidence-preview clickable"
                              onClick={() => setPreviewImage({ url: evidence.url, name: evidence.name })}
                              title="Clic para ampliar"
                            >
                              <img src={evidence.url} alt={evidence.name} />
                              <div className="preview-overlay">
                                <ZoomIn className="w-6 h-6" />
                              </div>
                            </div>
                          ) : (
                            <div className="evidence-preview file-preview">
                              <FileText className="w-12 h-12" />
                            </div>
                          )}

                          {/* File Info */}
                          <div className="evidence-info">
                            <p className="evidence-name">{evidence.name}</p>
                            <p className="evidence-size">{(evidence.size / 1024).toFixed(1)} KB</p>
                          </div>

                          {/* Actions */}
                          <div className="evidence-actions">
                            <button
                              onClick={() => handleDeleteEvidence(idx)}
                              className="evidence-action-btn delete"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {isImage && (
                              <button
                                onClick={() => setPreviewImage({ url: evidence.url, name: evidence.name })}
                                className="evidence-action-btn view"
                                title="Ver imagen"
                              >
                                <ZoomIn className="w-4 h-4" />
                              </button>
                            )}
                            <a
                              href={evidence.url}
                              download={evidence.name}
                              className="evidence-action-btn download"
                              title="Descargar"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="no-evidences">
                  <div className="no-evidences-icon">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="no-evidences-title">No hay evidencias adjuntas</p>
                  <p className="no-evidences-subtitle">Sube archivos para documentar esta actividad</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="evidence-modal-footer">
              <button onClick={() => setShowEvidenceModal(false)} className="btn-primary full-width">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div className="lightbox-overlay" onClick={() => setPreviewImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setPreviewImage(null)}>
              <X className="w-6 h-6" />
            </button>
            <img src={previewImage.url} alt={previewImage.name} />
            <div className="lightbox-footer">
              <span className="lightbox-name">{previewImage.name}</span>
              <a
                href={previewImage.url}
                download={previewImage.name}
                className="lightbox-download"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-5 h-5" />
                Descargar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente ActivityCard para Kanban
interface ActivityCardProps {
  actividad: Actividad;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDropdown: (e: React.MouseEvent, actividadId: string) => void;
  onOpenEvidence: () => void;
  tenantSlug?: string;
}

function ActivityCard({
  actividad,
  onEdit,
  onDelete,
  onOpenDropdown,
  onOpenEvidence,
  tenantSlug,
}: ActivityCardProps) {
  const typeConfig = ACTIVITY_TYPES.find(t => t.value === actividad.tipo);
  const estadoConfig = STATUS_CONFIG[actividad.estado || 'pendiente'];
  const prioridadConfig = PRIORITY_CONFIG[actividad.prioridad || 'normal'];
  const evidenceCount = actividad.metadata?.evidences?.length || 0;
  const IconComponent = typeConfig?.icon || Zap;

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`activity-card compact ${actividad.estado === 'completada' ? 'completed' : ''}`}>
      {/* Header compacto: tipo + prioridad + título en una línea */}
      <div className="card-header-compact">
        <div className="card-tipo-compact" style={{ backgroundColor: `${typeConfig?.color}20`, color: typeConfig?.color }}>
          <IconComponent className="w-3.5 h-3.5" />
        </div>
        <h4 className="card-title-compact" onClick={onEdit}>{actividad.titulo}</h4>
        <div className={`priority-dot-compact ${prioridadConfig.dotClass}`}></div>
      </div>

      {/* Info compacta */}
      <div className="card-info-compact">
        {actividad.fecha_actividad && (
          <span className="card-date-compact">
            <Calendar className="w-3 h-3" />
            {formatDateTime(actividad.fecha_actividad)}
          </span>
        )}
        {actividad.contacto_nombre && (
          <Link
            to={`/crm/${tenantSlug}/contactos/${actividad.contacto_id}`}
            className="card-contact-compact"
            onClick={(e) => e.stopPropagation()}
          >
            <User className="w-3 h-3" />
            {actividad.contacto_nombre}
          </Link>
        )}
      </div>

      {/* Footer compacto: estado + acciones */}
      <div className="card-footer-compact">
        <button
          className={`status-btn-compact status-dropdown-container ${estadoConfig.bgClass}`}
          onClick={(e) => onOpenDropdown(e, actividad.id)}
        >
          <div className={`status-dot ${estadoConfig.dotClass}`}></div>
          <span>{estadoConfig.label}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        <div className="card-actions-compact">
          <button
            className="action-btn-compact evidence"
            onClick={(e) => { e.stopPropagation(); onOpenEvidence(); }}
            title="Evidencias"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {evidenceCount > 0 && <span className="evidence-count-compact">{evidenceCount}</span>}
          </button>
          <button className="action-btn-compact" onClick={onEdit} title="Editar">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button className="action-btn-compact delete" onClick={onDelete} title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

