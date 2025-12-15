/**
 * SolicitudDetalle - Página de detalle de una solicitud/oportunidad
 *
 * Muestra:
 * - Header con info principal
 * - Timeline de actividades
 * - Cambio de etapa
 * - Historial de cambios
 * - Acciones rápidas
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import ActividadModal, { ActividadFormData } from '../../components/ActividadModal';
import {
  getSolicitud,
  updateSolicitud,
  cambiarEtapaSolicitud,
  getContacto,
  getActividadesBySolicitud,
  createActividad,
  completarActividad,
  deleteActividad,
  Solicitud,
  Contacto,
  Actividad,
  TipoActividad,
} from '../../services/api';
import {
  Zap,
  ChevronDown,
  Check,
  Save,
  Phone,
  Mail,
  Users,
  Eye,
  CheckSquare,
  MessageCircle,
  FileText,
} from 'lucide-react';

// Etapas del pipeline
const ETAPAS = [
  { id: 'nuevo_lead', label: 'Nuevo', color: '#6366f1' },
  { id: 'contactado', label: 'Contactado', color: '#8b5cf6' },
  { id: 'calificado', label: 'Calificado', color: '#0ea5e9' },
  { id: 'mostrando', label: 'Mostrando', color: '#f59e0b' },
  { id: 'negociacion', label: 'Negociación', color: '#ef4444' },
  { id: 'cerrado_ganado', label: 'Ganado', color: '#22c55e' },
  { id: 'cerrado_perdido', label: 'Perdido', color: '#64748b' },
];

const TIPOS_SOLICITUD: Record<string, { label: string; color: string }> = {
  compra: { label: 'Compra', color: '#2563eb' },
  alquiler: { label: 'Alquiler', color: '#7c3aed' },
  inversion: { label: 'Inversión', color: '#059669' },
};

const PRIORIDADES: Record<string, { label: string; color: string }> = {
  urgente: { label: 'Urgente', color: '#dc2626' },
  alta: { label: 'Alta', color: '#f59e0b' },
  media: { label: 'Media', color: '#3b82f6' },
  baja: { label: 'Baja', color: '#6b7280' },
};

// Tipos de propiedad con iconos
const TIPOS_PROPIEDAD: Record<string, { label: string; icon: string }> = {
  casa: { label: 'Casa', icon: '🏠' },
  departamento: { label: 'Departamento', icon: '🏢' },
  apartamento: { label: 'Apartamento', icon: '🏢' },
  terreno: { label: 'Terreno', icon: '🌳' },
  solar: { label: 'Solar', icon: '📐' },
  oficina: { label: 'Oficina', icon: '🏛️' },
  local: { label: 'Local', icon: '🏪' },
  bodega: { label: 'Bodega', icon: '📦' },
  finca: { label: 'Finca', icon: '🌾' },
  penthouse: { label: 'Penthouse', icon: '🌆' },
};

// Motivos de búsqueda
const MOTIVOS: Record<string, { label: string }> = {
  mudanza: { label: 'Mudanza / Vivienda propia' },
  inversion: { label: 'Inversión / Renta' },
  vacaciones: { label: 'Casa de vacaciones' },
  negocio: { label: 'Local comercial / Negocio' },
  oficina: { label: 'Oficina / Consultorio' },
  otro: { label: 'Otro' },
};

const TIPOS_ACTIVIDAD: Record<TipoActividad, { label: string; icon: React.ElementType; color: string }> = {
  llamada: { label: 'Llamada', icon: Phone, color: '#3b82f6' },
  email: { label: 'Email', icon: Mail, color: '#8b5cf6' },
  reunion: { label: 'Reunión', icon: Users, color: '#22c55e' },
  nota: { label: 'Nota', icon: FileText, color: '#f59e0b' },
  tarea: { label: 'Tarea', icon: CheckSquare, color: '#ec4899' },
  visita: { label: 'Visita', icon: Eye, color: '#06b6d4' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: '#25d366' },
  seguimiento: { label: 'Seguimiento', icon: Zap, color: '#6366f1' },
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

// Iconos SVG
const Icons = {
  back: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  money: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
};

export default function SolicitudDetalle() {
  const { tenantSlug, solicitudId } = useParams<{ tenantSlug: string; solicitudId: string }>();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Estados principales
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [contacto, setContacto] = useState<Contacto | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de edición
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Solicitud>>({});
  const [saving, setSaving] = useState(false);

  // Estados de actividad
  const [showActividadModal, setShowActividadModal] = useState(false);

  // Estados PURGE
  const [activePurgeSection, setActivePurgeSection] = useState<string | null>(null);
  const [purgeData, setPurgeData] = useState({
    purge_power: 0,
    purge_urgency: 0,
    purge_resources: 0,
    purge_genuine: 0,
    purge_expectations: 0,
  });
  const [purgeModified, setPurgeModified] = useState(false);
  const [savingPurge, setSavingPurge] = useState(false);

  // Calcular PURGE Score total
  const purgeScoreTotal = purgeData.purge_power + purgeData.purge_urgency +
    purgeData.purge_resources + purgeData.purge_genuine + purgeData.purge_expectations;

  // PURGE Score color
  const getPurgeColor = (score: number) => {
    if (score >= 20) return '#22c55e';
    if (score >= 15) return '#84cc16';
    if (score >= 10) return '#f59e0b';
    if (score >= 5) return '#f97316';
    return '#ef4444';
  };

  // Guardar cambios de edición
  const handleGuardar = useCallback(async () => {
    if (!tenantActual?.id || !solicitudId) return;

    try {
      setSaving(true);
      await updateSolicitud(tenantActual.id, solicitudId, editData);
      setSolicitud(prev => prev ? { ...prev, ...editData } : null);
      setEditMode(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [tenantActual?.id, solicitudId, editData]);

  // Configurar header del layout
  useEffect(() => {
    if (!solicitud) {
      setPageHeader({
        title: 'Cargando...',
        subtitle: '',
        actions: null,
      });
      return;
    }

    const tipoInfo = TIPOS_SOLICITUD[solicitud.tipo_solicitud || ''];
    const prioridadInfo = PRIORIDADES[solicitud.prioridad || ''];

    setPageHeader({
      title: solicitud.titulo,
      subtitle: tipoInfo ? tipoInfo.label : '',
      backButton: {
        label: 'Pipeline',
        onClick: () => navigate(`/crm/${tenantSlug}/pipeline`),
      },
      actions: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* PURGE Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: getPurgeColor(purgeScoreTotal),
              color: 'white',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            <Zap style={{ width: 14, height: 14 }} />
            PURGE: {purgeScoreTotal}
          </div>
          {/* Prioridad Badge */}
          {prioridadInfo && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: `1px solid ${prioridadInfo.color}`,
                color: prioridadInfo.color,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {prioridadInfo.label}
            </span>
          )}
          {/* Botón Editar */}
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: 'white',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {Icons.edit}
              Editar
            </button>
          ) : (
            <>
              <button
                onClick={() => { setEditMode(false); setEditData(solicitud); }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#64748b',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#2563eb',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      ),
    });
  }, [solicitud, editMode, saving, purgeScoreTotal, setPageHeader, navigate, tenantSlug, handleGuardar]);

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!tenantActual?.id || !solicitudId) return;

    try {
      setLoading(true);
      setError(null);

      const sol = await getSolicitud(tenantActual.id, solicitudId);
      setSolicitud(sol);
      setEditData(sol);

      // Inicializar datos PURGE desde la solicitud
      setPurgeData({
        purge_power: sol.purge_power || 0,
        purge_urgency: sol.purge_urgency || 0,
        purge_resources: sol.purge_resources || 0,
        purge_genuine: sol.purge_genuine || 0,
        purge_expectations: sol.purge_expectations || 0,
      });
      setPurgeModified(false);

      // Cargar contacto si existe
      if (sol.contacto_id) {
        try {
          const cont = await getContacto(tenantActual.id, sol.contacto_id);
          setContacto(cont);
        } catch {
          // Contacto puede no existir
        }
      }

      // Cargar actividades
      try {
        const acts = await getActividadesBySolicitud(tenantActual.id, solicitudId);
        setActividades(acts);
      } catch {
        // Sin actividades
      }
    } catch (err: any) {
      console.error('Error cargando solicitud:', err);
      setError(err.message || 'Error al cargar la solicitud');
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, solicitudId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Cambiar etapa
  const handleCambiarEtapa = async (nuevaEtapa: string) => {
    if (!tenantActual?.id || !solicitudId || !solicitud) return;
    if (solicitud.etapa === nuevaEtapa) return;

    const etapaAnterior = solicitud.etapa;
    setSolicitud(prev => prev ? { ...prev, etapa: nuevaEtapa } : null);

    try {
      await cambiarEtapaSolicitud(tenantActual.id, solicitudId, nuevaEtapa);
    } catch (err: any) {
      setSolicitud(prev => prev ? { ...prev, etapa: etapaAnterior } : null);
      setError(err.message);
    }
  };

  // Crear actividad (para el modal reutilizable)
  const handleGuardarActividad = async (data: ActividadFormData) => {
    if (!tenantActual?.id || !solicitudId) return;

    await createActividad(tenantActual.id, {
      ...data,
      solicitud_id: solicitudId,
      contacto_id: solicitud?.contacto_id || data.contacto_id,
    });
    // Recargar actividades
    const acts = await getActividadesBySolicitud(tenantActual.id, solicitudId);
    setActividades(acts);
  };

  // Completar actividad
  const handleCompletarActividad = async (actividadId: string, completada: boolean) => {
    if (!tenantActual?.id) return;

    setActividades(prev =>
      prev.map(a => a.id === actividadId ? { ...a, completada: !completada } : a)
    );

    try {
      await completarActividad(tenantActual.id, actividadId, !completada);
    } catch (err: any) {
      setActividades(prev =>
        prev.map(a => a.id === actividadId ? { ...a, completada } : a)
      );
      setError(err.message);
    }
  };

  // Eliminar actividad
  const handleEliminarActividad = async (actividadId: string) => {
    if (!tenantActual?.id || !confirm('¿Eliminar esta actividad?')) return;

    try {
      await deleteActividad(tenantActual.id, actividadId);
      setActividades(prev => prev.filter(a => a.id !== actividadId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Formatear moneda
  const formatMoney = (value: number | null | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
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

  // Guardar PURGE Score
  const handleGuardarPurge = async () => {
    if (!tenantActual?.id || !solicitudId) return;

    try {
      setSavingPurge(true);
      await updateSolicitud(tenantActual.id, solicitudId, {
        purge: {
          power: purgeData.purge_power,
          urgency: purgeData.purge_urgency,
          resources: purgeData.purge_resources,
          genuine: purgeData.purge_genuine,
          expectations: purgeData.purge_expectations,
          total: purgeScoreTotal,
        },
      });
      // Actualizar solicitud local
      setSolicitud(prev => prev ? {
        ...prev,
        purge_score: purgeScoreTotal,
        purge_power: purgeData.purge_power,
        purge_urgency: purgeData.purge_urgency,
        purge_resources: purgeData.purge_resources,
        purge_genuine: purgeData.purge_genuine,
        purge_expectations: purgeData.purge_expectations,
      } : null);
      setPurgeModified(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPurge(false);
    }
  };

  // Actualizar un campo PURGE
  const handlePurgeChange = (key: string, value: number) => {
    setPurgeData(prev => ({ ...prev, [key]: value }));
    setPurgeModified(true);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando solicitud...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error && !solicitud) {
    return (
      <div className="page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/pipeline`)}>
            Volver al pipeline
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="page">
        <div className="error-container">
          <h2>Solicitud no encontrada</h2>
          <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/pipeline`)}>
            Volver al pipeline
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  const etapaActual = ETAPAS.find(e => e.id === solicitud.etapa);
  const tipoInfo = TIPOS_SOLICITUD[solicitud.tipo_solicitud || ''];
  const prioridadInfo = PRIORIDADES[solicitud.prioridad || ''];

  return (
    <div className="page solicitud-detalle">
      {/* Input de edición de título (cuando está en modo edición) */}
      {editMode && (
        <div className="edit-title-section">
          <label>Título de la solicitud</label>
          <input
            type="text"
            className="titulo-input"
            value={editData.titulo || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, titulo: e.target.value }))}
          />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Pipeline Progress */}
      <div className="pipeline-progress">
        <h3>Etapa</h3>
        <div className="etapas-row">
          {ETAPAS.map((etapa, index) => {
            const isActive = etapa.id === solicitud.etapa;
            const isPast = ETAPAS.findIndex(e => e.id === solicitud.etapa) > index;
            const isClosed = etapa.id.startsWith('cerrado_');

            return (
              <button
                key={etapa.id}
                className={`etapa-btn ${isActive ? 'active' : ''} ${isPast ? 'past' : ''} ${isClosed ? 'closed' : ''}`}
                style={{
                  '--etapa-color': etapa.color,
                  borderColor: isActive ? etapa.color : undefined,
                  backgroundColor: isActive ? `${etapa.color}15` : undefined,
                } as React.CSSProperties}
                onClick={() => handleCambiarEtapa(etapa.id)}
              >
                <span className="etapa-indicator" style={{ backgroundColor: isPast || isActive ? etapa.color : '#e2e8f0' }} />
                <span className="etapa-label">{etapa.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="detalle-grid">
        {/* Columna izquierda - Info principal */}
        <div className="col-main">
          {/* Contacto */}
          <div className="card">
            <div className="card-header">
              <h3>{Icons.user} Contacto</h3>
              {!contacto && solicitud.contacto_id && (
                <span className="text-muted">No encontrado</span>
              )}
            </div>
            {contacto ? (
              <Link to={`/crm/${tenantSlug}/contactos/${contacto.id}`} className="contacto-card">
                <div className="contacto-avatar">
                  {contacto.foto_url ? (
                    <img src={contacto.foto_url} alt="" />
                  ) : (
                    <span>{contacto.nombre?.charAt(0) || '?'}</span>
                  )}
                </div>
                <div className="contacto-info">
                  <span className="contacto-nombre">
                    {contacto.nombre} {contacto.apellido || ''}
                  </span>
                  {contacto.email && (
                    <span className="contacto-email">{Icons.mail} {contacto.email}</span>
                  )}
                  {contacto.telefono && (
                    <span className="contacto-telefono">{Icons.phone} {contacto.telefono}</span>
                  )}
                </div>
              </Link>
            ) : (
              <div className="empty-section">
                <p>Sin contacto vinculado</p>
              </div>
            )}
          </div>

          {/* Información de Búsqueda - Campos clave */}
          <div className="card search-info-card">
            <div className="card-header">
              <h3>{Icons.search} Información de Búsqueda</h3>
            </div>
            <div className="detalles-grid">
              <div className="detalle-item">
                <span className="label">Tipo Propiedad</span>
                {editMode ? (
                  <select
                    value={editData.tipo_propiedad || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, tipo_propiedad: e.target.value }))}
                  >
                    <option value="">Seleccionar...</option>
                    {Object.entries(TIPOS_PROPIEDAD).map(([key, val]) => (
                      <option key={key} value={key}>{val.icon} {val.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="value">
                    {solicitud.tipo_propiedad ? (
                      <>
                        {TIPOS_PROPIEDAD[solicitud.tipo_propiedad]?.icon || ''}{' '}
                        {TIPOS_PROPIEDAD[solicitud.tipo_propiedad]?.label || solicitud.tipo_propiedad}
                      </>
                    ) : '-'}
                  </span>
                )}
              </div>
              <div className="detalle-item">
                <span className="label">Zona de Interés</span>
                {editMode ? (
                  <input
                    type="text"
                    value={editData.zona_interes || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, zona_interes: e.target.value }))}
                    placeholder="Ej: Piantini, Naco..."
                  />
                ) : (
                  <span className="value">{solicitud.zona_interes || '-'}</span>
                )}
              </div>
              <div className="detalle-item">
                <span className="label">Presupuesto Mín</span>
                {editMode ? (
                  <input
                    type="number"
                    value={editData.presupuesto_min || ''}
                    onChange={(e) => {
                      const newMin = parseFloat(e.target.value) || undefined;
                      setEditData(prev => {
                        const newData = { ...prev, presupuesto_min: newMin };
                        // Calcular promedio automáticamente
                        if (newMin || prev.presupuesto_max) {
                          const min = newMin || 0;
                          const max = prev.presupuesto_max || 0;
                          if (min > 0 || max > 0) {
                            newData.valor_estimado = min > 0 && max > 0 ? (min + max) / 2 : (min || max);
                          }
                        }
                        return newData;
                      });
                    }}
                    placeholder="0"
                  />
                ) : (
                  <span className="value">{solicitud.presupuesto_min ? formatMoney(solicitud.presupuesto_min) : '-'}</span>
                )}
              </div>
              <div className="detalle-item">
                <span className="label">Presupuesto Máx</span>
                {editMode ? (
                  <input
                    type="number"
                    value={editData.presupuesto_max || ''}
                    onChange={(e) => {
                      const newMax = parseFloat(e.target.value) || undefined;
                      setEditData(prev => {
                        const newData = { ...prev, presupuesto_max: newMax };
                        // Calcular promedio automáticamente
                        if (newMax || prev.presupuesto_min) {
                          const min = prev.presupuesto_min || 0;
                          const max = newMax || 0;
                          if (min > 0 || max > 0) {
                            newData.valor_estimado = min > 0 && max > 0 ? (min + max) / 2 : (min || max);
                          }
                        }
                        return newData;
                      });
                    }}
                    placeholder="0"
                  />
                ) : (
                  <span className="value">{solicitud.presupuesto_max ? formatMoney(solicitud.presupuesto_max) : '-'}</span>
                )}
              </div>
              <div className="detalle-item full-width">
                <span className="label">Motivo</span>
                {editMode ? (
                  <select
                    value={editData.motivo || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, motivo: e.target.value }))}
                  >
                    <option value="">Seleccionar...</option>
                    {Object.entries(MOTIVOS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="value">{MOTIVOS[solicitud.motivo || '']?.label || solicitud.motivo || '-'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="card">
            <div className="card-header">
              <h3>{Icons.money} Detalles</h3>
            </div>
            <div className="detalles-grid">
              <div className="detalle-item">
                <span className="label">Valor Deal</span>
                {editMode ? (
                  <input
                    type="number"
                    value={editData.valor_estimado || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, valor_estimado: parseFloat(e.target.value) || undefined }))}
                    placeholder="0"
                  />
                ) : (
                  <span className="value">{formatMoney(solicitud.valor_estimado)}</span>
                )}
              </div>
              <div className="detalle-item">
                <span className="label">Tipo Operación</span>
                {editMode ? (
                  <select
                    value={editData.tipo_solicitud || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, tipo_solicitud: e.target.value }))}
                  >
                    {Object.entries(TIPOS_SOLICITUD).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="value">{tipoInfo?.label || '-'}</span>
                )}
              </div>
              <div className="detalle-item">
                <span className="label">Prioridad</span>
                {editMode ? (
                  <select
                    value={editData.prioridad || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, prioridad: e.target.value }))}
                  >
                    {Object.entries(PRIORIDADES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="value">{prioridadInfo?.label || '-'}</span>
                )}
              </div>
              <div className="detalle-item">
                <span className="label">Creada</span>
                <span className="value">{formatDate(solicitud.created_at)}</span>
              </div>
            </div>
            {(solicitud.descripcion || editMode) && (
              <div className="descripcion-section">
                <span className="label">Notas</span>
                {editMode ? (
                  <textarea
                    value={editData.descripcion || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Notas adicionales..."
                    rows={3}
                  />
                ) : (
                  <p>{solicitud.descripcion || '-'}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha - PURGE primero, luego Actividades */}
        <div className="col-activities">
          {/* PURGE Score Card - Primero porque es parte fundamental */}
          <div className="card purge-card">
            <div className="card-header">
              <h3><Zap className="w-4 h-4" /> Calificación PURGE</h3>
              {purgeModified && (
                <button
                  className="btn-sm btn-save"
                  onClick={handleGuardarPurge}
                  disabled={savingPurge}
                >
                  <Save className="w-3 h-3" />
                  {savingPurge ? 'Guardando...' : 'Guardar'}
                </button>
              )}
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
                    const value = purgeData[`purge_${key}` as keyof typeof purgeData];
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
                const fieldKey = `purge_${key}` as keyof typeof purgeData;
                const currentValue = purgeData[fieldKey];
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
                            onClick={() => handlePurgeChange(fieldKey, option.value)}
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

          {/* Actividades - Después porque crecen y empujan al PURGE */}
          <div className="card actividades-card">
            <div className="card-header">
              <h3>{Icons.calendar} Actividades</h3>
              <button className="btn-sm" onClick={() => setShowActividadModal(true)}>
                {Icons.plus} Nueva
              </button>
            </div>

            {actividades.length === 0 ? (
              <div className="empty-section">
                <p>No hay actividades registradas</p>
                <button className="btn-text" onClick={() => setShowActividadModal(true)}>
                  Agregar primera actividad
                </button>
              </div>
            ) : (
              <div className="actividades-timeline">
                {actividades.map((act) => {
                  const tipoAct = TIPOS_ACTIVIDAD[act.tipo as TipoActividad];
                  return (
                    <div key={act.id} className={`actividad-item ${act.completada ? 'completada' : ''}`}>
                      <div className="actividad-icon" style={{ backgroundColor: tipoAct?.color || '#6b7280' }}>
                        {tipoAct?.icon ? <tipoAct.icon className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      </div>
                      <div className="actividad-content">
                        <div className="actividad-header">
                          <span className="actividad-titulo">{act.titulo}</span>
                          <div className="actividad-actions">
                            <button
                              className={`btn-check ${act.completada ? 'checked' : ''}`}
                              onClick={() => handleCompletarActividad(act.id, act.completada)}
                              title={act.completada ? 'Marcar pendiente' : 'Marcar completada'}
                            >
                              {Icons.check}
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleEliminarActividad(act.id)}
                              title="Eliminar"
                            >
                              {Icons.trash}
                            </button>
                          </div>
                        </div>
                        {act.descripcion && (
                          <p className="actividad-descripcion">{act.descripcion}</p>
                        )}
                        <span className="actividad-fecha">
                          {formatDateTime(act.fecha_actividad)}
                          {act.usuario_nombre && ` • ${act.usuario_nombre}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal nueva actividad */}
      <ActividadModal
        isOpen={showActividadModal}
        onClose={() => setShowActividadModal(false)}
        onSave={handleGuardarActividad}
        defaultContactoId={solicitud?.contacto_id}
        defaultSolicitudId={solicitudId}
        hideContactoPicker={true}
      />

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

  .solicitud-detalle {
    padding: 0;
  }

  /* Loading & Error */
  .loading-container,
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    text-align: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-container h2 {
    margin: 0 0 12px 0;
    color: #dc2626;
  }

  .error-container p {
    margin: 0 0 24px 0;
    color: #64748b;
  }

  /* Sección de edición de título */
  .edit-title-section {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .edit-title-section label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: #2563eb;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .titulo-input {
    width: 100%;
    padding: 10px 14px;
    border: 2px solid #2563eb;
    border-radius: 8px;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
    background: white;
  }

  .titulo-input:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
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
    font-size: 1.25rem;
    cursor: pointer;
  }

  /* Pipeline Progress */
  .pipeline-progress {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    margin-bottom: 24px;
  }

  .pipeline-progress h3 {
    margin: 0 0 16px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .etapas-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .etapa-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    flex: 1;
    min-width: 100px;
  }

  .etapa-btn:hover {
    border-color: var(--etapa-color);
  }

  .etapa-btn.active {
    border-width: 2px;
  }

  .etapa-btn.closed {
    opacity: 0.7;
  }

  .etapa-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .etapa-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #0f172a;
  }

  /* Grid Layout */
  .detalle-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  @media (max-width: 1024px) {
    .detalle-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Cards */
  .card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .card-header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-sm {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #eff6ff;
    border: none;
    border-radius: 6px;
    color: #2563eb;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-sm:hover {
    background: #dbeafe;
  }

  /* Contacto Card */
  .contacto-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    text-decoration: none;
    transition: background 0.15s;
  }

  .contacto-card:hover {
    background: #f8fafc;
  }

  .contacto-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .contacto-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .contacto-avatar span {
    color: white;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .contacto-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .contacto-nombre {
    font-weight: 600;
    color: #0f172a;
    font-size: 1rem;
  }

  .contacto-email,
  .contacto-telefono {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: #64748b;
  }

  /* Detalles Grid */
  .detalles-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    padding: 20px;
  }

  .detalle-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detalle-item .label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detalle-item .value {
    font-size: 0.95rem;
    font-weight: 500;
    color: #0f172a;
  }

  .detalle-item input,
  .detalle-item select {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .detalle-item input:focus,
  .detalle-item select:focus {
    outline: none;
    border-color: #2563eb;
  }

  .detalle-item.full-width {
    grid-column: 1 / -1;
  }

  /* Search Info Card */
  .search-info-card {
    background: linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%);
    border-color: #bfdbfe;
  }

  .search-info-card .card-header h3 svg {
    color: #2563eb;
  }

  .descripcion-section {
    padding: 0 20px 20px 20px;
    border-top: 1px solid #f1f5f9;
    margin-top: 0;
    padding-top: 16px;
  }

  .descripcion-section .label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }

  .descripcion-section p {
    margin: 0;
    font-size: 0.9rem;
    color: #374151;
    line-height: 1.6;
  }

  .descripcion-section textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    resize: vertical;
  }

  .descripcion-section textarea:focus {
    outline: none;
    border-color: #2563eb;
  }

  /* Empty sections */
  .empty-section {
    padding: 32px 20px;
    text-align: center;
  }

  .empty-section p {
    margin: 0 0 12px 0;
    color: #94a3b8;
    font-size: 0.9rem;
  }

  .btn-text {
    background: none;
    border: none;
    color: #2563eb;
    font-size: 0.9rem;
    cursor: pointer;
    text-decoration: underline;
  }

  /* Actividades Timeline */
  .actividades-timeline {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 500px;
    overflow-y: auto;
  }

  .actividad-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 10px;
    transition: all 0.15s;
  }

  .actividad-item.completada {
    opacity: 0.6;
  }

  .actividad-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: white;
  }

  .actividad-content {
    flex: 1;
    min-width: 0;
  }

  .actividad-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 4px;
  }

  .actividad-titulo {
    font-weight: 600;
    font-size: 0.9rem;
    color: #0f172a;
  }

  .actividad-item.completada .actividad-titulo {
    text-decoration: line-through;
  }

  .actividad-actions {
    display: flex;
    gap: 4px;
  }

  .btn-check,
  .btn-delete {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-check {
    background: #f1f5f9;
    color: #64748b;
  }

  .btn-check:hover {
    background: #dcfce7;
    color: #22c55e;
  }

  .btn-check.checked {
    background: #dcfce7;
    color: #22c55e;
  }

  .btn-delete {
    background: #f1f5f9;
    color: #64748b;
  }

  .btn-delete:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  .actividad-descripcion {
    margin: 0 0 6px 0;
    font-size: 0.85rem;
    color: #64748b;
    line-height: 1.4;
  }

  .actividad-fecha {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  /* Buttons */
  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
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
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 480px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-content h3 {
    margin: 0 0 20px 0;
    font-size: 1.125rem;
    color: #0f172a;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }

  /* Form */
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

  /* Tipo Grid */
  .tipo-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .tipo-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    background: #f8fafc;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tipo-btn:hover {
    background: #f1f5f9;
  }

  .tipo-btn.active {
    border-color: #2563eb;
    background: #eff6ff;
  }

  .tipo-icon {
    font-size: 1.25rem;
  }

  .tipo-label {
    font-size: 0.7rem;
    font-weight: 500;
    color: #64748b;
  }

  .tipo-btn.active .tipo-label {
    color: #2563eb;
  }

  .text-muted {
    color: #94a3b8;
    font-size: 0.85rem;
  }

  /* ========== PURGE Styles ========== */
  .purge-card .card-header h3 {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Actividades va después de PURGE */
  .actividades-card {
    margin-top: 16px;
  }

  .purge-card .card-header h3 svg {
    color: #f59e0b;
  }

  .btn-save {
    background: #22c55e;
    color: white;
  }

  .btn-save:hover {
    background: #16a34a;
  }

  .purge-summary {
    display: flex;
    flex-direction: column;
    padding: 12px 16px;
    border-bottom: 2px solid;
    gap: 10px;
  }

  .purge-summary-left {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .purge-score-display {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .purge-score-value {
    font-size: 1.25rem;
    font-weight: 800;
  }

  .purge-letters {
    display: flex;
    gap: 3px;
  }

  .purge-letter-item {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
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
    text-align: left;
  }

  .purge-rec-text {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .purge-rec-action {
    margin: 2px 0 0 0;
    font-size: 0.6rem;
    color: #64748b;
  }

  .purge-questions {
    padding: 12px;
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
    padding: 10px 12px;
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
    gap: 10px;
  }

  .purge-letter-badge {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8rem;
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
    font-size: 0.8rem;
    color: #0f172a;
  }

  .purge-question-desc {
    font-size: 0.65rem;
    color: #64748b;
  }

  .purge-question-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .purge-question-value {
    font-weight: 700;
    font-size: 0.85rem;
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
    padding: 10px 12px;
    padding-top: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .purge-question-text {
    margin: 0 0 10px 0;
    font-size: 0.8rem;
    font-weight: 500;
    color: #2563eb;
  }

  .purge-option {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
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
    gap: 8px;
  }

  .purge-option-num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #f1f5f9;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
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
    font-size: 0.75rem;
    font-weight: 500;
    color: #0f172a;
  }

  .purge-option-hint {
    font-size: 0.6rem;
    color: #94a3b8;
  }

  .purge-check {
    color: #2563eb;
  }
`;
