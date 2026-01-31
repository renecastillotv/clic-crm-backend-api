/**
 * ContactoDetalle - Página completa de detalle de un contacto
 *
 * Funcionalidades:
 * - Ver/editar datos básicos del contacto
 * - Extender con roles (desarrollador, referidor, propietario, asesor, etc.)
 * - Relacionar con otros contactos (socio, familiar, pareja)
 * - Historial de actividad
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import ActividadModal, { ActividadFormData } from '../../components/ActividadModal';
import ExtensionesContactoPanel from '../../components/contactos/ExtensionesContactoPanel';
import { useExtensionesContacto } from '../../hooks/useExtensionesContacto';
import {
  getContacto,
  getContactos,
  updateContacto,
  getRelacionesContacto,
  createRelacionContacto,
  deleteRelacionContacto,
  getSolicitudes,
  getPropuestas,
  getPlanesPago,
  getActividadesByContacto,
  createActividad,
  completarActividad,
  deleteActividad,
  Contacto,
  ContactoRelacion,
  Solicitud,
  Propuesta,
  Actividad,
  PlanPago,
} from '../../services/api';

// Extensiones/Tipos disponibles para un contacto
const EXTENSIONES_CONTACTO = {
  lead: {
    label: 'Lead',
    description: 'Prospecto interesado en comprar/rentar',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    campos: [
      { key: 'fuente_lead', label: 'Fuente del Lead', type: 'select', options: ['web', 'referido', 'portal', 'redes_sociales', 'llamada', 'otro'] },
      { key: 'interes_tipo', label: 'Tipo de interés', type: 'select', options: ['compra', 'renta', 'inversion'] },
      { key: 'presupuesto_min', label: 'Presupuesto mínimo', type: 'number' },
      { key: 'presupuesto_max', label: 'Presupuesto máximo', type: 'number' },
      { key: 'zona_interes', label: 'Zona de interés', type: 'text' },
    ],
  },
  cliente: {
    label: 'Cliente',
    description: 'Ha cerrado al menos una operación',
    color: '#16a34a',
    bgColor: '#dcfce7',
    campos: [
      { key: 'fecha_primera_operacion', label: 'Primera operación', type: 'date' },
      { key: 'total_operaciones', label: 'Total operaciones', type: 'number' },
      { key: 'valor_total_operaciones', label: 'Valor total operaciones', type: 'number' },
      { key: 'preferencias_contacto', label: 'Preferencia de contacto', type: 'select', options: ['email', 'telefono', 'whatsapp'] },
    ],
  },
  asesor: {
    label: 'Asesor Inmobiliario',
    description: 'Asesor que trabaja con nosotros o externa',
    color: '#7c3aed',
    bgColor: '#f3e8ff',
    campos: [
      { key: 'licencia_inmobiliaria', label: 'Número de licencia', type: 'text' },
      { key: 'inmobiliaria', label: 'Inmobiliaria', type: 'text' },
      { key: 'especialidad', label: 'Especialidad', type: 'select', options: ['residencial', 'comercial', 'industrial', 'terrenos', 'lujo'] },
      { key: 'zonas_trabajo', label: 'Zonas de trabajo', type: 'text' },
      { key: 'comision_default', label: 'Comisión default (%)', type: 'number' },
    ],
  },
  desarrollador: {
    label: 'Desarrollador',
    description: 'Empresa o persona que desarrolla proyectos',
    color: '#4338ca',
    bgColor: '#e0e7ff',
    campos: [
      { key: 'razon_social', label: 'Razón social', type: 'text' },
      { key: 'rfc', label: 'RFC', type: 'text' },
      { key: 'tipo_desarrollos', label: 'Tipo de desarrollos', type: 'select', options: ['residencial', 'comercial', 'mixto', 'industrial'] },
      { key: 'proyectos_activos', label: 'Proyectos activos', type: 'number' },
      { key: 'sitio_web', label: 'Sitio web', type: 'text' },
    ],
  },
  referidor: {
    label: 'Referidor',
    description: 'Refiere clientes a cambio de comisión',
    color: '#be185d',
    bgColor: '#fce7f3',
    campos: [
      { key: 'tipo_referidor', label: 'Tipo', type: 'select', options: ['particular', 'profesional', 'empresa'] },
      { key: 'comision_referido', label: 'Comisión por referido (%)', type: 'number' },
      { key: 'total_referidos', label: 'Total referidos', type: 'number' },
      { key: 'referidos_convertidos', label: 'Referidos convertidos', type: 'number' },
      { key: 'metodo_pago', label: 'Método de pago preferido', type: 'select', options: ['transferencia', 'cheque', 'efectivo'] },
    ],
  },
  propietario: {
    label: 'Propietario',
    description: 'Dueño de propiedades en cartera',
    color: '#b45309',
    bgColor: '#fef3c7',
    campos: [
      { key: 'total_propiedades', label: 'Total propiedades', type: 'number' },
      { key: 'tipo_propiedades', label: 'Tipo de propiedades', type: 'select', options: ['residencial', 'comercial', 'terreno', 'mixto'] },
      { key: 'disponibilidad_visitas', label: 'Disponibilidad visitas', type: 'select', options: ['flexible', 'solo_citas', 'restringido'] },
      { key: 'exclusividad', label: 'Exclusividad', type: 'select', options: ['exclusiva', 'abierta', 'preferente'] },
    ],
  },
  master_broker: {
    label: 'Master Broker',
    description: 'Broker principal o socio estratégico',
    color: '#0d9488',
    bgColor: '#ccfbf1',
    campos: [
      { key: 'empresa_broker', label: 'Empresa', type: 'text' },
      { key: 'territorios', label: 'Territorios asignados', type: 'text' },
      { key: 'comision_override', label: 'Comisión override (%)', type: 'number' },
      { key: 'nivel_acuerdo', label: 'Nivel de acuerdo', type: 'select', options: ['oro', 'plata', 'bronce', 'basico'] },
    ],
  },
};

// Tipos de relaciones entre contactos
const TIPOS_RELACION = {
  socio: { label: 'Socio', color: '#6366f1', icon: '🤝' },
  familiar: { label: 'Familiar', color: '#f59e0b', icon: '👨‍👩‍👧' },
  pareja: { label: 'Pareja', color: '#ec4899', icon: '💑' },
  representante: { label: 'Representante Legal', color: '#8b5cf6', icon: '⚖️' },
  asistente: { label: 'Asistente', color: '#10b981', icon: '📋' },
  referido_por: { label: 'Referido por', color: '#3b82f6', icon: '🔗' },
};

// Tipos de contacto con sus colores (para mostrar en el modal de relaciones)
const TIPOS_CONTACTO: Record<string, { label: string; color: string }> = {
  lead: { label: 'Lead', color: '#1d4ed8' },
  cliente: { label: 'Cliente', color: '#16a34a' },
  asesor: { label: 'Asesor', color: '#7c3aed' },
  desarrollador: { label: 'Desarrollador', color: '#4338ca' },
  referidor: { label: 'Referidor', color: '#be185d' },
  propietario: { label: 'Propietario', color: '#b45309' },
  vendedor: { label: 'Vendedor', color: '#0d9488' },
};

// Iconos SVG
const Icons = {
  back: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  save: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  chevronDown: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  phone: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  mail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  building: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  ),
  mapPin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  starFilled: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
};

export default function ContactoDetalle() {
  const { tenantSlug, contactoId } = useParams<{ tenantSlug: string; contactoId: string }>();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Estado
  const [contacto, setContacto] = useState<Contacto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'extensiones' | 'relaciones' | 'actividad' | 'solicitudes' | 'propuestas' | 'planes-pago'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Contacto>>({});
  const [showAddExtensionModal, setShowAddExtensionModal] = useState(false);
  const [showAddRelacionModal, setShowAddRelacionModal] = useState(false);
  const [busquedaContacto, setBusquedaContacto] = useState('');
  const [contactosEncontrados, setContactosEncontrados] = useState<Contacto[]>([]);
  const [buscandoContactos, setBuscandoContactos] = useState(false);
  const [tipoRelacion, setTipoRelacion] = useState('socio');
  const [savingExtension, setSavingExtension] = useState(false);
  const [relaciones, setRelaciones] = useState<ContactoRelacion[]>([]);
  const [loadingRelaciones, setLoadingRelaciones] = useState(false);
  const [savingRelacion, setSavingRelacion] = useState(false);
  const [showEditExtensionModal, setShowEditExtensionModal] = useState(false);
  const [editingExtensionType, setEditingExtensionType] = useState<string | null>(null);
  const [extensionData, setExtensionData] = useState<Record<string, any>>({});
  const [expandedExtensions, setExpandedExtensions] = useState<Set<string>>(new Set());
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loadingPropuestas, setLoadingPropuestas] = useState(false);
  const [planesPago, setPlanesPago] = useState<PlanPago[]>([]);
  const [loadingPlanesPago, setLoadingPlanesPago] = useState(false);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loadingActividades, setLoadingActividades] = useState(false);
  const [showCreateActividadModal, setShowCreateActividadModal] = useState(false);

  // Hook de extensiones dinámicas - para obtener el contador correcto
  const { extensionesContacto, recargarExtensionesContacto } = useExtensionesContacto(contactoId);

  // Configurar header con botón back y acciones
  useEffect(() => {
    setPageHeader({
      title: '',
      subtitle: '',
      backButton: {
        label: 'Contactos',
        onClick: () => navigate(`/crm/${tenantSlug}/contactos`),
      },
      actions: isEditing ? (
        <>
          <button className="btn-secondary btn-sm" onClick={handleCancel}>
            Cancelar
          </button>
          <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {Icons.save} {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </>
      ) : (
        <button className="btn-secondary btn-sm" onClick={() => { setActiveTab('info'); setIsEditing(true); }}>
          {Icons.edit} Editar
        </button>
      ),
    });
  }, [setPageHeader, navigate, tenantSlug, isEditing, saving]);

  // Cargar contacto
  const cargarContacto = useCallback(async () => {
    if (!tenantActual?.id || !contactoId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getContacto(tenantActual.id, contactoId);
      setContacto(data);
      setEditData({
        nombre: data.nombre,
        apellido: data.apellido || '',
        email: data.email || '',
        telefono: data.telefono || '',
        empresa: data.empresa || '',
        cargo: data.cargo || '',
        telefono_secundario: data.telefono_secundario || '',
        whatsapp: data.whatsapp || '',
        notas: data.notas || '',
      });
      // Expandir primera extensión por defecto
      if (data.tipos_contacto?.length > 0) {
        setExpandedExtensions(new Set([data.tipos_contacto[0]]));
      }
    } catch (err: any) {
      console.error('Error cargando contacto:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, contactoId]);

  useEffect(() => {
    cargarContacto();
  }, [cargarContacto]);

  // Cargar relaciones del contacto
  const cargarRelaciones = useCallback(async () => {
    if (!tenantActual?.id || !contactoId) return;

    try {
      setLoadingRelaciones(true);
      const data = await getRelacionesContacto(tenantActual.id, contactoId);
      setRelaciones(data);
    } catch (err: any) {
      console.error('Error cargando relaciones:', err);
    } finally {
      setLoadingRelaciones(false);
    }
  }, [tenantActual?.id, contactoId]);

  useEffect(() => {
    if (activeTab === 'relaciones') {
      cargarRelaciones();
    }
  }, [activeTab, cargarRelaciones]);

  // Cargar solicitudes del contacto
  const cargarSolicitudes = useCallback(async () => {
    if (!tenantActual?.id || !contactoId) return;

    try {
      setLoadingSolicitudes(true);
      const response = await getSolicitudes(tenantActual.id, { contacto_id: contactoId });
      setSolicitudes(response.data);
    } catch (err: any) {
      console.error('Error cargando solicitudes:', err);
    } finally {
      setLoadingSolicitudes(false);
    }
  }, [tenantActual?.id, contactoId]);

  useEffect(() => {
    if (activeTab === 'solicitudes') {
      cargarSolicitudes();
    }
  }, [activeTab, cargarSolicitudes]);

  // Cargar propuestas del contacto
  const cargarPropuestas = useCallback(async () => {
    if (!tenantActual?.id || !contactoId) return;

    try {
      setLoadingPropuestas(true);
      const response = await getPropuestas(tenantActual.id, { contacto_id: contactoId });
      setPropuestas(response.data);
    } catch (err: any) {
      console.error('Error cargando propuestas:', err);
    } finally {
      setLoadingPropuestas(false);
    }
  }, [tenantActual?.id, contactoId]);

  useEffect(() => {
    if (activeTab === 'propuestas') {
      cargarPropuestas();
    }
  }, [activeTab, cargarPropuestas]);

  // Cargar planes de pago del contacto
  const cargarPlanesPago = useCallback(async () => {
    if (!tenantActual?.id || !contactoId) return;

    try {
      setLoadingPlanesPago(true);
      const response = await getPlanesPago(tenantActual.id, { contacto_id: contactoId });
      setPlanesPago(response.data);
    } catch (err: any) {
      console.error('Error cargando planes de pago:', err);
    } finally {
      setLoadingPlanesPago(false);
    }
  }, [tenantActual?.id, contactoId]);

  useEffect(() => {
    if (activeTab === 'planes-pago') {
      cargarPlanesPago();
    }
  }, [activeTab, cargarPlanesPago]);

  // Cargar actividades del contacto
  const cargarActividades = useCallback(async () => {
    if (!tenantActual?.id || !contactoId) return;

    try {
      setLoadingActividades(true);
      const data = await getActividadesByContacto(tenantActual.id, contactoId, 50);
      setActividades(data);
    } catch (err: any) {
      console.error('Error cargando actividades:', err);
    } finally {
      setLoadingActividades(false);
    }
  }, [tenantActual?.id, contactoId]);

  useEffect(() => {
    if (activeTab === 'actividad') {
      cargarActividades();
    }
  }, [activeTab, cargarActividades]);

  // Crear nueva actividad (para el modal reutilizable)
  const handleGuardarActividad = async (data: ActividadFormData) => {
    if (!tenantActual?.id || !contactoId) return;

    await createActividad(tenantActual.id, {
      ...data,
      contacto_id: contactoId,
    });
    cargarActividades();
  };

  // Completar/descompletar actividad
  const handleToggleCompletarActividad = async (actividadId: string, completada: boolean) => {
    if (!tenantActual?.id) return;

    try {
      await completarActividad(tenantActual.id, actividadId, !completada);
      cargarActividades();
    } catch (err: any) {
      console.error('Error completando actividad:', err);
    }
  };

  // Eliminar actividad
  const handleDeleteActividad = async (actividadId: string) => {
    if (!tenantActual?.id) return;
    if (!confirm('¿Estás seguro de eliminar esta actividad?')) return;

    try {
      await deleteActividad(tenantActual.id, actividadId);
      cargarActividades();
    } catch (err: any) {
      console.error('Error eliminando actividad:', err);
    }
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!tenantActual?.id || !contacto) return;

    try {
      setSaving(true);
      const updated = await updateContacto(tenantActual.id, contacto.id, editData);
      setContacto(updated);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error al actualizar:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Cancelar edición
  const handleCancel = () => {
    if (contacto) {
      setEditData({
        nombre: contacto.nombre,
        apellido: contacto.apellido || '',
        email: contacto.email || '',
        telefono: contacto.telefono || '',
        empresa: contacto.empresa || '',
        cargo: contacto.cargo || '',
        telefono_secundario: contacto.telefono_secundario || '',
        whatsapp: contacto.whatsapp || '',
        notas: contacto.notas || '',
      });
    }
    setIsEditing(false);
  };

  // Toggle extensión colapsable
  const toggleExtension = (tipo: string) => {
    setExpandedExtensions(prev => {
      const next = new Set(prev);
      if (next.has(tipo)) {
        next.delete(tipo);
      } else {
        next.add(tipo);
      }
      return next;
    });
  };

  // Obtener iniciales
  const getIniciales = (c: Contacto) => {
    const nombre = c.nombre?.charAt(0) || '';
    const apellido = c.apellido?.charAt(0) || '';
    return (nombre + apellido).toUpperCase() || '?';
  };

  // Nombre completo
  const getNombreCompleto = (c: Contacto) => {
    return [c.nombre, c.apellido].filter(Boolean).join(' ');
  };

  if (loading) {
    return (
      <div className="page contacto-detalle">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando contacto...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error || !contacto) {
    return (
      <div className="page contacto-detalle">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error || 'Contacto no encontrado'}</p>
          <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/contactos`)}>
            Volver a contactos
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page contacto-detalle">
      {/* Header del contacto */}
      <div className="compact-header">
        <div className="header-contact">
          <div className="avatar-medium placeholder">
            {getIniciales(contacto)}
          </div>
          <div className="contact-info">
            <div className="contact-name-row">
              <h1>{getNombreCompleto(contacto)}</h1>
              {contacto.favorito && <span className="star-badge">{Icons.starFilled}</span>}
            </div>
            <div className="contact-meta">
              {contacto.cargo && <span>{contacto.cargo}</span>}
              {contacto.cargo && contacto.empresa && <span className="separator">•</span>}
              {contacto.empresa && <span>{Icons.building} {contacto.empresa}</span>}
            </div>
            <div className="contact-badges">
              {contacto.tipos_contacto?.map((tipo) => {
                const config = EXTENSIONES_CONTACTO[tipo as keyof typeof EXTENSIONES_CONTACTO];
                if (!config) return null;
                return (
                  <span key={tipo} className="badge" style={{ backgroundColor: config.bgColor, color: config.color }}>
                    {config.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabs integradas */}
        <div className="tabs-row">
          <button className={`tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
            Información
          </button>
          <button className={`tab ${activeTab === 'extensiones' ? 'active' : ''}`} onClick={() => setActiveTab('extensiones')}>
            Extensiones {extensionesContacto.length ? `(${extensionesContacto.length})` : ''}
          </button>
          <button className={`tab ${activeTab === 'relaciones' ? 'active' : ''}`} onClick={() => setActiveTab('relaciones')}>
            Relaciones {relaciones.length ? `(${relaciones.length})` : ''}
          </button>
          <button className={`tab ${activeTab === 'actividad' ? 'active' : ''}`} onClick={() => setActiveTab('actividad')}>
            Actividades {actividades.length ? `(${actividades.length})` : ''}
          </button>
          <button className={`tab ${activeTab === 'solicitudes' ? 'active' : ''}`} onClick={() => setActiveTab('solicitudes')}>
            Solicitudes {solicitudes.length ? `(${solicitudes.length})` : ''}
          </button>
          <button className={`tab ${activeTab === 'propuestas' ? 'active' : ''}`} onClick={() => setActiveTab('propuestas')}>
            Propuestas {propuestas.length ? `(${propuestas.length})` : ''}
          </button>
          <button className={`tab ${activeTab === 'planes-pago' ? 'active' : ''}`} onClick={() => setActiveTab('planes-pago')}>
            Planes de Pago {planesPago.length ? `(${planesPago.length})` : ''}
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="content-area">
        {/* Tab Información */}
        {activeTab === 'info' && (
          <div className="tab-panel">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-section">
                  <h3>Información personal</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input type="text" value={editData.nombre || ''} onChange={(e) => setEditData(prev => ({ ...prev, nombre: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label>Apellido</label>
                      <input type="text" value={editData.apellido || ''} onChange={(e) => setEditData(prev => ({ ...prev, apellido: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" value={editData.email || ''} onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input type="tel" value={editData.telefono || ''} onChange={(e) => setEditData(prev => ({ ...prev, telefono: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Teléfono secundario</label>
                      <input type="tel" value={editData.telefono_secundario || ''} onChange={(e) => setEditData(prev => ({ ...prev, telefono_secundario: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>WhatsApp</label>
                      <input type="tel" value={editData.whatsapp || ''} onChange={(e) => setEditData(prev => ({ ...prev, whatsapp: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="form-section">
                  <h3>Información laboral</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Empresa</label>
                      <input type="text" value={editData.empresa || ''} onChange={(e) => setEditData(prev => ({ ...prev, empresa: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Cargo</label>
                      <input type="text" value={editData.cargo || ''} onChange={(e) => setEditData(prev => ({ ...prev, cargo: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Origen</label>
                      <input type="text" value={editData.origen || ''} onChange={(e) => setEditData(prev => ({ ...prev, origen: e.target.value }))} placeholder="Ej: Facebook, Referido, Web..." />
                    </div>
                  </div>
                </div>
                <div className="form-section">
                  <h3>Notas</h3>
                  <textarea value={editData.notas || ''} onChange={(e) => setEditData(prev => ({ ...prev, notas: e.target.value }))} rows={3} placeholder="Notas adicionales..." />
                </div>
              </div>
            ) : (
              <div className="info-view-redesign">
                {/* Sección: Información de Contacto */}
                <div className="info-card">
                  <div className="info-card-header">
                    <span className="info-card-icon contact-icon">{Icons.user}</span>
                    <h3 className="info-card-title">Información de Contacto</h3>
                  </div>
                  <div className="info-card-body">
                    <div className="info-field">
                      <div className="info-field-icon">{Icons.mail}</div>
                      <div className="info-field-content">
                        <span className="info-field-label">Email</span>
                        {contacto.email ? (
                          <a href={`mailto:${contacto.email}`} className="info-field-value link">{contacto.email}</a>
                        ) : (
                          <span className="info-field-empty">No especificado</span>
                        )}
                      </div>
                    </div>
                    <div className="info-field">
                      <div className="info-field-icon">{Icons.phone}</div>
                      <div className="info-field-content">
                        <span className="info-field-label">Teléfono principal</span>
                        {contacto.telefono ? (
                          <a href={`tel:${contacto.telefono}`} className="info-field-value link">{contacto.telefono}</a>
                        ) : (
                          <span className="info-field-empty">No especificado</span>
                        )}
                      </div>
                    </div>
                    {contacto.telefono_secundario && (
                      <div className="info-field">
                        <div className="info-field-icon">{Icons.phone}</div>
                        <div className="info-field-content">
                          <span className="info-field-label">Teléfono secundario</span>
                          <a href={`tel:${contacto.telefono_secundario}`} className="info-field-value link">{contacto.telefono_secundario}</a>
                        </div>
                      </div>
                    )}
                    <div className="info-field">
                      <div className="info-field-icon whatsapp-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <div className="info-field-content">
                        <span className="info-field-label">WhatsApp</span>
                        {contacto.whatsapp ? (
                          <a href={`https://wa.me/${contacto.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="info-field-value link whatsapp-link">
                            {contacto.whatsapp}
                            <span className="external-icon">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                              </svg>
                            </span>
                          </a>
                        ) : (
                          <span className="info-field-empty">No especificado</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección: Información Laboral */}
                <div className="info-card">
                  <div className="info-card-header">
                    <span className="info-card-icon work-icon">{Icons.building}</span>
                    <h3 className="info-card-title">Información Laboral</h3>
                  </div>
                  <div className="info-card-body">
                    <div className="info-field">
                      <div className="info-field-icon">{Icons.building}</div>
                      <div className="info-field-content">
                        <span className="info-field-label">Empresa</span>
                        {contacto.empresa ? (
                          <span className="info-field-value">{contacto.empresa}</span>
                        ) : (
                          <span className="info-field-empty">No especificada</span>
                        )}
                      </div>
                    </div>
                    <div className="info-field">
                      <div className="info-field-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                        </svg>
                      </div>
                      <div className="info-field-content">
                        <span className="info-field-label">Cargo / Puesto</span>
                        {contacto.cargo ? (
                          <span className="info-field-value">{contacto.cargo}</span>
                        ) : (
                          <span className="info-field-empty">No especificado</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección: Origen y Seguimiento */}
                <div className="info-card">
                  <div className="info-card-header">
                    <span className="info-card-icon origin-icon">{Icons.link}</span>
                    <h3 className="info-card-title">Origen y Seguimiento</h3>
                  </div>
                  <div className="info-card-body">
                    <div className="info-field">
                      <div className="info-field-icon">{Icons.link}</div>
                      <div className="info-field-content">
                        <span className="info-field-label">Origen del contacto</span>
                        {contacto.origen ? (
                          <span className="info-field-value origin-badge">{contacto.origen}</span>
                        ) : (
                          <span className="info-field-empty">No especificado</span>
                        )}
                      </div>
                    </div>
                    <div className="info-dates-row">
                      <div className="info-date-item">
                        <span className="info-date-label">Creado</span>
                        <span className="info-date-value">{new Date(contacto.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="info-date-item">
                        <span className="info-date-label">Actualizado</span>
                        <span className="info-date-value">{new Date(contacto.updated_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección: Notas */}
                <div className="info-card notes-card">
                  <div className="info-card-header">
                    <span className="info-card-icon notes-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                    </span>
                    <h3 className="info-card-title">Notas</h3>
                  </div>
                  <div className="info-card-body">
                    {contacto.notas ? (
                      <p className="notes-content">{contacto.notas}</p>
                    ) : (
                      <p className="notes-empty">Sin notas adicionales para este contacto.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Extensiones - Usa el componente dinámico */}
        {activeTab === 'extensiones' && (
          <div className="tab-panel">
            <ExtensionesContactoPanel
              contactoId={contacto.id}
              onExtensionChange={() => {
                cargarContacto();
                recargarExtensionesContacto(contacto.id);
              }}
            />
          </div>
        )}

        {/* Tab Relaciones */}
        {activeTab === 'relaciones' && (
          <div className="tab-panel">
            <div className="section-header">
              <span>Contactos relacionados</span>
              <button className="btn-secondary btn-sm" onClick={() => setShowAddRelacionModal(true)}>
                {Icons.link} Agregar
              </button>
            </div>

            {loadingRelaciones ? (
              <div className="loading-inline"><div className="spinner-small"></div><span>Cargando...</span></div>
            ) : relaciones.length === 0 ? (
              <div className="empty-state">
                <p>No hay contactos relacionados.</p>
                <button className="btn-primary btn-sm" onClick={() => setShowAddRelacionModal(true)}>
                  {Icons.link} Agregar relación
                </button>
              </div>
            ) : (
              <div className="relaciones-list">
                {relaciones.map((rel) => {
                  const tipoConfig = TIPOS_RELACION[rel.tipo_relacion as keyof typeof TIPOS_RELACION] || { label: rel.tipo_relacion, color: '#64748b', icon: '🔗' };
                  const contactoRel = rel.contacto_relacionado;
                  return (
                    <div key={rel.id} className="relacion-item relacion-item-expanded">
                      <div className="relacion-avatar">
                        {contactoRel?.nombre?.charAt(0) || '?'}{contactoRel?.apellido?.charAt(0) || ''}
                      </div>
                      <div className="relacion-info">
                        <div className="relacion-header">
                          <span className="relacion-nombre">{[contactoRel?.nombre, contactoRel?.apellido].filter(Boolean).join(' ') || 'Sin nombre'}</span>
                          <span className="relacion-tipo-badge" style={{ backgroundColor: `${tipoConfig.color}20`, color: tipoConfig.color }}>{tipoConfig.icon} {tipoConfig.label}</span>
                        </div>
                        <div className="relacion-detalles">
                          {contactoRel?.email && (
                            <span className="relacion-detalle">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                              {contactoRel.email}
                            </span>
                          )}
                          {contactoRel?.telefono && (
                            <span className="relacion-detalle">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              {contactoRel.telefono}
                            </span>
                          )}
                          {contactoRel?.empresa && (
                            <span className="relacion-detalle">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                              {contactoRel.empresa}
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="btn-icon btn-delete" title="Eliminar" onClick={async () => {
                        if (!tenantActual?.id || !contacto) return;
                        if (!window.confirm('¿Eliminar esta relación?')) return;
                        try {
                          await deleteRelacionContacto(tenantActual.id, contacto.id, rel.id);
                          cargarRelaciones();
                        } catch (err: any) {
                          setError(err.message);
                        }
                      }}>
                        {Icons.x}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Actividad */}
        {activeTab === 'actividad' && (
          <div className="tab-panel">
            <div className="section-header">
              <span>Actividades del contacto</span>
              <button
                className="btn-primary btn-sm"
                onClick={() => setShowCreateActividadModal(true)}
              >
                {Icons.plus} Nueva Actividad
              </button>
            </div>
            {loadingActividades ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <span>Cargando actividades...</span>
              </div>
            ) : actividades.length === 0 ? (
              <div className="empty-state">
                <p>Este contacto no tiene actividades registradas.</p>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => setShowCreateActividadModal(true)}
                >
                  {Icons.plus} Crear primera actividad
                </button>
              </div>
            ) : (
              <div className="actividades-list">
                {actividades.map((actividad) => (
                  <div
                    key={actividad.id}
                    className={`actividad-card ${actividad.completada ? 'completada' : ''}`}
                  >
                    <div className="actividad-card-left">
                      <button
                        className={`actividad-check ${actividad.completada ? 'checked' : ''}`}
                        onClick={() => handleToggleCompletarActividad(actividad.id, actividad.completada)}
                        title={actividad.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
                      >
                        {actividad.completada ? Icons.check : null}
                      </button>
                    </div>
                    <div className="actividad-card-content">
                      <div className="actividad-card-header">
                        <span className={`badge badge-actividad badge-${actividad.tipo}`}>
                          {actividad.tipo}
                        </span>
                        <span className="actividad-titulo">{actividad.titulo}</span>
                        <span className="actividad-fecha">
                          {new Date(actividad.fecha_actividad).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {actividad.descripcion && (
                        <p className="actividad-descripcion">{actividad.descripcion}</p>
                      )}
                      {actividad.usuario_nombre && (
                        <span className="actividad-usuario">Por: {actividad.usuario_nombre}</span>
                      )}
                    </div>
                    <div className="actividad-card-actions">
                      <button
                        className="btn-icon btn-danger-ghost"
                        onClick={() => handleDeleteActividad(actividad.id)}
                        title="Eliminar"
                      >
                        {Icons.x}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Solicitudes */}
        {activeTab === 'solicitudes' && (
          <div className="tab-panel">
            <div className="section-header">
              <span>Solicitudes del contacto</span>
              <button
                className="btn-primary btn-sm"
                onClick={() => navigate(`/crm/${tenantSlug}/pipeline?crear=true&contacto_id=${contactoId}`)}
              >
                {Icons.plus} Nueva Solicitud
              </button>
            </div>
            {loadingSolicitudes ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <span>Cargando solicitudes...</span>
              </div>
            ) : solicitudes.length === 0 ? (
              <div className="empty-state">
                <p>Este contacto no tiene solicitudes registradas.</p>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => navigate(`/crm/${tenantSlug}/pipeline?crear=true&contacto_id=${contactoId}`)}
                >
                  {Icons.plus} Crear primera solicitud
                </button>
              </div>
            ) : (
              <div className="solicitudes-list">
                {solicitudes.map((solicitud) => (
                  <div
                    key={solicitud.id}
                    className="solicitud-card"
                    onClick={() => navigate(`/crm/${tenantSlug}/pipeline`)}
                  >
                    <div className="solicitud-card-header">
                      <span className="solicitud-titulo">{solicitud.titulo}</span>
                      <span className={`badge badge-${solicitud.etapa}`}>
                        {solicitud.etapa?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="solicitud-card-meta">
                      <span className="solicitud-tipo">{solicitud.tipo_solicitud}</span>
                      {solicitud.prioridad && (
                        <span className={`badge badge-priority-${solicitud.prioridad}`}>
                          {solicitud.prioridad}
                        </span>
                      )}
                      <span className="solicitud-fecha">
                        {new Date(solicitud.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {solicitud.descripcion && (
                      <p className="solicitud-notas">{solicitud.descripcion}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Propuestas */}
        {activeTab === 'propuestas' && (
          <div className="tab-panel">
            <div className="section-header">
              <span>Propuestas del contacto</span>
              <button
                className="btn-primary btn-sm"
                onClick={() => navigate(`/crm/${tenantSlug}/propuestas?crear=true&contacto_id=${contactoId}`)}
              >
                {Icons.plus} Nueva Propuesta
              </button>
            </div>
            {loadingPropuestas ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <span>Cargando propuestas...</span>
              </div>
            ) : propuestas.length === 0 ? (
              <div className="empty-state">
                <p>Este contacto no tiene propuestas registradas.</p>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => navigate(`/crm/${tenantSlug}/propuestas?crear=true&contacto_id=${contactoId}`)}
                >
                  {Icons.plus} Crear primera propuesta
                </button>
              </div>
            ) : (
              <div className="propuestas-list">
                {propuestas.map((propuesta) => (
                  <div
                    key={propuesta.id}
                    className="propuesta-card"
                    onClick={() => navigate(`/crm/${tenantSlug}/propuestas`)}
                  >
                    <div className="propuesta-card-header">
                      <span className="propuesta-titulo">{propuesta.titulo}</span>
                      <span className={`badge badge-propuesta-${propuesta.estado}`}>
                        {propuesta.estado}
                      </span>
                    </div>
                    <div className="propuesta-card-meta">
                      {propuesta.monto_total && (
                        <span className="propuesta-monto">
                          {propuesta.moneda} ${propuesta.monto_total.toLocaleString()}
                        </span>
                      )}
                      {propuesta.fecha_validez && (
                        <span className="propuesta-validez">
                          Válida hasta: {new Date(propuesta.fecha_validez).toLocaleDateString()}
                        </span>
                      )}
                      <span className="propuesta-fecha">
                        {new Date(propuesta.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {propuesta.descripcion && (
                      <p className="propuesta-descripcion">{propuesta.descripcion}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Planes de Pago */}
        {activeTab === 'planes-pago' && (
          <div className="tab-panel">
            <div className="section-header">
              <span>Planes de Pago del contacto</span>
              <button
                className="btn-primary btn-sm"
                onClick={() => navigate(`/crm/${tenantSlug}/planes-pago?crear=true&contacto_id=${contactoId}`)}
              >
                {Icons.plus} Nuevo Plan
              </button>
            </div>
            {loadingPlanesPago ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <span>Cargando planes de pago...</span>
              </div>
            ) : planesPago.length === 0 ? (
              <div className="empty-state">
                <p>Este contacto no tiene planes de pago registrados.</p>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => navigate(`/crm/${tenantSlug}/planes-pago?crear=true&contacto_id=${contactoId}`)}
                >
                  {Icons.plus} Crear primer plan de pago
                </button>
              </div>
            ) : (
              <div className="planes-pago-list">
                {planesPago.map((plan) => (
                  <div
                    key={plan.id}
                    className="plan-pago-card"
                    onClick={() => navigate(`/crm/${tenantSlug}/planes-pago/${plan.id}`)}
                  >
                    <div className="plan-pago-card-header">
                      <span className="plan-pago-titulo">{plan.titulo}</span>
                      <span className={`badge badge-plan-${plan.estado}`}>
                        {plan.estado}
                      </span>
                    </div>
                    <div className="plan-pago-card-meta">
                      {plan.precio_total && (
                        <span className="plan-pago-monto">
                          {plan.moneda || 'USD'} ${plan.precio_total.toLocaleString()}
                        </span>
                      )}
                      {plan.propiedad && (
                        <span className="plan-pago-propiedad">
                          {plan.propiedad.titulo || plan.propiedad.nombre}
                        </span>
                      )}
                      <span className="plan-pago-fecha">
                        {new Date(plan.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {plan.descripcion && (
                      <p className="plan-pago-descripcion">{plan.descripcion}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal agregar extensión */}
      {showAddExtensionModal && (
        <div className="modal-overlay" onClick={() => setShowAddExtensionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Agregar extensión</h3>
            <div className="modal-options">
              {Object.entries(EXTENSIONES_CONTACTO).map(([key, config]) => {
                const isActive = contacto.tipos_contacto?.includes(key);
                return (
                  <button
                    key={key}
                    className={`option-btn ${isActive ? 'active' : ''}`}
                    disabled={isActive || savingExtension}
                    onClick={async () => {
                      if (!tenantActual?.id || !contacto) return;
                      try {
                        setSavingExtension(true);
                        const nuevosTipos = [...(contacto.tipos_contacto || []), key];
                        const updated = await updateContacto(tenantActual.id, contacto.id, { tipos_contacto: nuevosTipos });
                        setContacto(updated);
                        setExpandedExtensions(prev => new Set(prev).add(key));
                        setShowAddExtensionModal(false);
                      } catch (err: any) {
                        setError(err.message);
                      } finally {
                        setSavingExtension(false);
                      }
                    }}
                  >
                    <div className="option-indicator" style={{ backgroundColor: config.color }} />
                    <div className="option-info">
                      <span className="option-label">{config.label}</span>
                      <span className="option-desc">{config.description}</span>
                    </div>
                    {isActive && <span className="option-check">{Icons.check}</span>}
                  </button>
                );
              })}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddExtensionModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar relación */}
      {showAddRelacionModal && (
        <div className="modal-overlay" onClick={() => setShowAddRelacionModal(false)}>
          <div className="modal-relacion" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <div className="modal-relacion-header">
              <h3>Agregar relación</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowAddRelacionModal(false)}>
                {Icons.x}
              </button>
            </div>

            <div className="modal-relacion-body">
              {/* Tipo de relación */}
              <div className="form-group">
                <label>Tipo de relación</label>
                <select
                  value={tipoRelacion}
                  onChange={(e) => setTipoRelacion(e.target.value)}
                  className="select-relacion"
                >
                  {Object.entries(TIPOS_RELACION).map(([key, config]) => (
                    <option key={key} value={key}>{config.icon} {config.label}</option>
                  ))}
                </select>
              </div>

              {/* Búsqueda de contacto */}
              <div className="form-group">
                <label>Buscar contacto</label>
                <input
                  type="text"
                  placeholder="Escribe nombre, email o teléfono..."
                  value={busquedaContacto}
                  autoFocus
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  onChange={async (e) => {
                    const valor = e.target.value;
                    setBusquedaContacto(valor);
                    if (valor.length >= 2 && tenantActual?.id) {
                      try {
                        setBuscandoContactos(true);
                        const resultado = await getContactos(tenantActual.id, { busqueda: valor, limit: 30 });
                        setContactosEncontrados(resultado.data.filter(c => c.id !== contacto?.id));
                      } catch (err) {
                        console.error('Error buscando contactos:', err);
                      } finally {
                        setBuscandoContactos(false);
                      }
                    } else {
                      setContactosEncontrados([]);
                    }
                  }}
                />
                {buscandoContactos && <span className="search-loading">Buscando...</span>}
              </div>

              {/* Resultados */}
              <div className="contactos-lista">
                {contactosEncontrados.length > 0 ? (
                  <>
                    <div className="lista-header">{contactosEncontrados.length} contacto(s) encontrado(s)</div>
                    {contactosEncontrados.map((c) => {
                      const tipoContacto = TIPOS_CONTACTO[c.tipo as keyof typeof TIPOS_CONTACTO];
                      return (
                        <button
                          type="button"
                          key={c.id}
                          className="contacto-opcion"
                          disabled={savingRelacion}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!tenantActual?.id || !contacto) return;
                            try {
                              setSavingRelacion(true);
                              await createRelacionContacto(tenantActual.id, contacto.id, { contacto_destino_id: c.id, tipo_relacion: tipoRelacion });
                              setShowAddRelacionModal(false);
                              setBusquedaContacto('');
                              setContactosEncontrados([]);
                              cargarRelaciones();
                            } catch (err: any) {
                              setError(err.message);
                            } finally {
                              setSavingRelacion(false);
                            }
                          }}
                        >
                          <div className="contacto-opcion-avatar">
                            {c.nombre?.charAt(0) || '?'}{c.apellido?.charAt(0) || ''}
                          </div>
                          <div className="contacto-opcion-info">
                            <div className="contacto-opcion-nombre">
                              {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                              <span className="contacto-opcion-tipo" style={{ color: tipoContacto?.color || '#64748b' }}>
                                {tipoContacto?.label || c.tipo}
                              </span>
                            </div>
                            <div className="contacto-opcion-meta">
                              {c.email && <span>{c.email}</span>}
                              {c.telefono && <span>{c.telefono}</span>}
                              {c.empresa && <span>{c.empresa}</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                ) : busquedaContacto.length >= 2 && !buscandoContactos ? (
                  <div className="lista-vacia">
                    <p>No se encontraron contactos</p>
                  </div>
                ) : (
                  <div className="lista-vacia">
                    <p>Escribe al menos 2 caracteres para buscar</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-relacion-footer">
              <button type="button" className="btn-secondary" onClick={() => { setShowAddRelacionModal(false); setBusquedaContacto(''); setContactosEncontrados([]); }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva actividad */}
      <ActividadModal
        isOpen={showCreateActividadModal}
        onClose={() => setShowCreateActividadModal(false)}
        onSave={handleGuardarActividad}
        defaultContactoId={contactoId}
        hideContactoPicker={true}
      />

      {/* Modal editar extensión */}
      {showEditExtensionModal && editingExtensionType && (
        <div className="modal-overlay" onClick={() => setShowEditExtensionModal(false)}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const config = EXTENSIONES_CONTACTO[editingExtensionType as keyof typeof EXTENSIONES_CONTACTO];
              if (!config) return null;
              return (
                <>
                  <div className="modal-header-ext">
                    <div className="modal-indicator" style={{ backgroundColor: config.color }} />
                    <div>
                      <h3>Editar {config.label}</h3>
                      <p className="modal-subtitle">{config.description}</p>
                    </div>
                  </div>
                  <div className="edit-ext-form">
                    {config.campos.map((campo) => (
                      <div key={campo.key} className="form-group">
                        <label>{campo.label}</label>
                        {campo.type === 'select' ? (
                          <select value={extensionData[campo.key] || ''} onChange={(e) => setExtensionData(prev => ({ ...prev, [campo.key]: e.target.value }))}>
                            <option value="">Seleccionar...</option>
                            {campo.options?.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                          </select>
                        ) : campo.type === 'number' ? (
                          <input type="number" value={extensionData[campo.key] || ''} onChange={(e) => setExtensionData(prev => ({ ...prev, [campo.key]: e.target.value ? Number(e.target.value) : '' }))} />
                        ) : campo.type === 'date' ? (
                          <DatePicker
                            value={extensionData[campo.key] || null}
                            onChange={(val) => setExtensionData(prev => ({ ...prev, [campo.key]: val || '' }))}
                            placeholder="Seleccionar fecha"
                          />
                        ) : (
                          <input type="text" value={extensionData[campo.key] || ''} onChange={(e) => setExtensionData(prev => ({ ...prev, [campo.key]: e.target.value }))} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => { setShowEditExtensionModal(false); setEditingExtensionType(null); setExtensionData({}); }}>Cancelar</button>
                    <button className="btn-primary" disabled={savingExtension} onClick={async () => {
                      if (!tenantActual?.id || !contacto) return;
                      try {
                        setSavingExtension(true);
                        const extensionKey = `extension_${editingExtensionType}`;
                        const nuevosDatosExtra = { ...(contacto.datos_extra || {}), [extensionKey]: extensionData };
                        const updated = await updateContacto(tenantActual.id, contacto.id, { datos_extra: nuevosDatosExtra });
                        setContacto(updated);
                        setShowEditExtensionModal(false);
                        setEditingExtensionType(null);
                        setExtensionData({});
                      } catch (err: any) {
                        setError(err.message);
                      } finally {
                        setSavingExtension(false);
                      }
                    }}>
                      {savingExtension ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .contacto-detalle {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f8fafc;
  }

  .loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 24px;
    text-align: center;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Header compacto */
  .compact-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }

  .header-contact {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
  }

  .avatar-medium {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .avatar-medium.placeholder {
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .contact-info {
    flex: 1;
    min-width: 0;
  }

  .contact-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .contact-name-row h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
  }

  .star-badge {
    color: #f59e0b;
  }

  .contact-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 0.875rem;
    margin-top: 2px;
  }

  .contact-meta svg {
    width: 14px;
    height: 14px;
  }

  .separator {
    color: #cbd5e1;
  }

  .contact-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .badge {
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  /* Tabs */
  .tabs-row {
    display: flex;
    padding: 0 20px;
    gap: 4px;
  }

  .tab {
    padding: 10px 16px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tab:hover {
    color: #0f172a;
  }

  .tab.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
  }

  /* Content */
  .content-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .tab-panel {
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    padding: 20px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    font-weight: 600;
    color: #0f172a;
  }

  /* Buttons */
  .btn-primary {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-primary:hover { background: #1d4ed8; }
  .btn-primary:disabled { background: #94a3b8; cursor: not-allowed; }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #f1f5f9;
    color: #64748b;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-secondary:hover { background: #e2e8f0; color: #0f172a; }

  .btn-sm { padding: 6px 12px; font-size: 0.8rem; }

  .btn-icon {
    padding: 6px;
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-icon:hover { background: #f1f5f9; color: #2563eb; }
  .btn-delete:hover { background: #fef2f2 !important; color: #dc2626 !important; }

  /* ========== INFO VIEW REDESIGN ========== */
  .info-view-redesign {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .info-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }

  .info-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  .info-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: linear-gradient(to right, #f8fafc, #ffffff);
    border-bottom: 1px solid #e2e8f0;
  }

  .info-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    color: white;
  }

  .info-card-icon.contact-icon {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  }

  .info-card-icon.work-icon {
    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  }

  .info-card-icon.origin-icon {
    background: linear-gradient(135deg, #10b981, #059669);
  }

  .info-card-icon.notes-icon {
    background: linear-gradient(135deg, #f59e0b, #d97706);
  }

  .info-card-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .info-card-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .info-field {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 12px 16px;
    background: #f8fafc;
    border-radius: 10px;
    transition: background 0.15s;
  }

  .info-field:hover {
    background: #f1f5f9;
  }

  .info-field-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: white;
    border-radius: 8px;
    color: #64748b;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .info-field-icon.whatsapp-icon {
    color: #25d366;
  }

  .info-field-content {
    flex: 1;
    min-width: 0;
  }

  .info-field-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 4px;
  }

  .info-field-value {
    font-size: 0.95rem;
    font-weight: 500;
    color: #0f172a;
    display: block;
    word-break: break-word;
  }

  .info-field-value.link {
    color: #2563eb;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .info-field-value.link:hover {
    color: #1d4ed8;
    text-decoration: underline;
  }

  .info-field-value.whatsapp-link {
    color: #128c7e;
  }

  .info-field-value.whatsapp-link:hover {
    color: #075e54;
  }

  .external-icon {
    opacity: 0.6;
    flex-shrink: 0;
  }

  .info-field-empty {
    font-size: 0.875rem;
    color: #94a3b8;
    font-style: italic;
  }

  .origin-badge {
    display: inline-block;
    padding: 4px 12px;
    background: linear-gradient(135deg, #dbeafe, #eff6ff);
    color: #1e40af;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .info-dates-row {
    display: flex;
    gap: 24px;
    padding: 14px 16px;
    background: #f1f5f9;
    border-radius: 10px;
    margin-top: 4px;
  }

  .info-date-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-date-label {
    font-size: 0.7rem;
    font-weight: 500;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .info-date-value {
    font-size: 0.85rem;
    font-weight: 500;
    color: #475569;
  }

  /* Notes card special styling */
  .notes-card .info-card-body {
    padding: 20px 24px;
  }

  .notes-content {
    margin: 0;
    font-size: 0.9rem;
    color: #374151;
    line-height: 1.7;
    white-space: pre-wrap;
    background: #fefce8;
    padding: 16px 20px;
    border-radius: 10px;
    border-left: 4px solid #fbbf24;
  }

  .notes-empty {
    margin: 0;
    font-size: 0.875rem;
    color: #94a3b8;
    font-style: italic;
    text-align: center;
    padding: 24px 20px;
    background: #f8fafc;
    border-radius: 10px;
  }

  /* ========== LEGACY INFO VIEW (keeping for compatibility) ========== */
  .info-grid-compact {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .info-item {
    display: flex;
    gap: 10px;
  }

  .info-icon {
    color: #94a3b8;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .info-label {
    font-size: 0.7rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .info-value {
    font-size: 0.875rem;
    color: #0f172a;
  }

  .notas-section {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
  }

  .notas-section h4 {
    margin: 0 0 8px 0;
    font-size: 0.8rem;
    color: #64748b;
    text-transform: uppercase;
  }

  .notas-section p {
    margin: 0;
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
  }

  .meta-info {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    gap: 24px;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  /* Edit Form */
  .edit-form { display: flex; flex-direction: column; gap: 24px; }

  .form-section h3 {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #0f172a;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-group label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #374151;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  .form-section textarea {
    width: 100%;
    resize: vertical;
    min-height: 80px;
  }

  /* Accordion */
  .accordion {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .accordion-item {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .accordion-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #f8fafc;
    border: none;
    width: 100%;
    cursor: pointer;
    text-align: left;
  }

  .accordion-header:hover { background: #f1f5f9; }

  .accordion-indicator {
    width: 4px;
    height: 32px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .accordion-title {
    flex: 1;
    min-width: 0;
  }

  .accordion-label {
    display: block;
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9rem;
  }

  .accordion-desc {
    display: block;
    font-size: 0.75rem;
    color: #64748b;
  }

  .btn-edit-ext {
    opacity: 0;
    transition: opacity 0.15s;
  }

  .accordion-header:hover .btn-edit-ext { opacity: 1; }

  .accordion-chevron {
    color: #94a3b8;
    transition: transform 0.2s;
  }

  .accordion-chevron.open { transform: rotate(180deg); }

  .accordion-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.25s ease-out;
  }

  .accordion-item.expanded .accordion-content {
    max-height: 300px;
  }

  .fields-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 16px;
    background: white;
  }

  .field-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .field-label {
    font-size: 0.7rem;
    color: #94a3b8;
    text-transform: uppercase;
  }

  .field-value {
    font-size: 0.875rem;
    color: #0f172a;
  }

  /* Relaciones */
  .relaciones-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .relacion-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.15s;
  }

  .relacion-item:hover { background: white; border-color: #cbd5e1; }

  .relacion-item-expanded {
    align-items: flex-start;
  }

  .relacion-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .relacion-info {
    flex: 1;
    min-width: 0;
  }

  .relacion-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }

  .relacion-nombre {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9rem;
  }

  .relacion-tipo-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .relacion-tipo {
    font-size: 0.75rem;
    font-weight: 500;
  }

  .relacion-detalles {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .relacion-detalle {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.8rem;
    color: #64748b;
  }

  .relacion-detalle svg {
    color: #94a3b8;
    flex-shrink: 0;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #64748b;
  }

  .empty-state p { margin: 0 0 16px 0; }

  .loading-inline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 30px;
    color: #64748b;
  }

  .spinner-small {
    width: 18px;
    height: 18px;
    border: 2px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
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
    border-radius: 12px;
    padding: 20px;
    max-width: 420px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
  }

  .modal-wide { max-width: 520px; }

  .modal-content h3 {
    margin: 0 0 16px 0;
    font-size: 1.1rem;
    color: #0f172a;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
  }

  .modal-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .option-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
  }

  .option-btn:hover:not(:disabled) { border-color: #2563eb; background: #f8fafc; }
  .option-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .option-btn.active { border-color: #2563eb; background: #eff6ff; }

  .option-indicator {
    width: 4px;
    height: 28px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .option-info { flex: 1; }
  .option-label { display: block; font-weight: 500; color: #0f172a; font-size: 0.875rem; }
  .option-desc { display: block; font-size: 0.75rem; color: #64748b; }
  .option-check { color: #2563eb; }

  /* Search */
  .search-status {
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 6px;
  }

  .search-results {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 10px;
    max-height: 200px;
    overflow-y: auto;
  }

  .search-result-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }

  .search-result-item:hover { background: #f8fafc; border-color: #2563eb; }

  .result-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .result-info { flex: 1; min-width: 0; }
  .result-name { display: block; font-weight: 500; color: #0f172a; font-size: 0.875rem; }
  .result-email { display: block; font-size: 0.75rem; color: #64748b; }

  .no-results {
    text-align: center;
    padding: 16px;
    color: #94a3b8;
    font-size: 0.875rem;
    border: 1px dashed #e2e8f0;
    border-radius: 6px;
    margin-top: 10px;
  }

  /* Modal Edit Extension */
  .modal-header-ext {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
  }

  .modal-indicator {
    width: 5px;
    height: 40px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .modal-header-ext h3 { margin: 0; }
  .modal-subtitle { margin: 4px 0 0; font-size: 0.8rem; color: #64748b; }

  .edit-ext-form {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  /* Modal Relación */
  .modal-relacion {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 560px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }

  .modal-relacion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
  }

  .modal-relacion-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #0f172a;
  }

  .modal-close-btn {
    background: none;
    border: none;
    padding: 6px;
    color: #64748b;
    cursor: pointer;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-close-btn:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  .modal-relacion-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .select-relacion {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    background: white;
    cursor: pointer;
  }

  .select-relacion:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .search-loading {
    display: block;
    margin-top: 6px;
    font-size: 0.8rem;
    color: #64748b;
  }

  /* Lista de contactos */
  .contactos-lista {
    margin-top: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    max-height: 320px;
    overflow-y: auto;
  }

  .lista-header {
    padding: 10px 14px;
    background: #f8fafc;
    font-size: 0.8rem;
    font-weight: 500;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
  }

  .lista-vacia {
    padding: 40px 20px;
    text-align: center;
    color: #94a3b8;
  }

  .lista-vacia p {
    margin: 0;
    font-size: 0.875rem;
  }

  .contacto-opcion {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    background: white;
    border: none;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .contacto-opcion:last-child {
    border-bottom: none;
  }

  .contacto-opcion:hover {
    background: #f8fafc;
  }

  .contacto-opcion:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .contacto-opcion-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .contacto-opcion-info {
    flex: 1;
    min-width: 0;
  }

  .contacto-opcion-nombre {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    color: #0f172a;
  }

  .contacto-opcion-tipo {
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .contacto-opcion-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }

  .contacto-opcion-meta span {
    font-size: 0.75rem;
    color: #64748b;
    background: #f1f5f9;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .modal-relacion-footer {
    padding: 16px 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
  }

  /* Actividades List */
  .actividades-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .actividad-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
    transition: all 0.15s ease;
  }

  .actividad-card.completada {
    opacity: 0.7;
    background: #f8fafc;
  }

  .actividad-card.completada .actividad-titulo {
    text-decoration: line-through;
    color: #94a3b8;
  }

  .actividad-card-left {
    flex-shrink: 0;
  }

  .actividad-check {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid #cbd5e1;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    color: white;
  }

  .actividad-check:hover {
    border-color: #2563eb;
  }

  .actividad-check.checked {
    background: #2563eb;
    border-color: #2563eb;
  }

  .actividad-card-content {
    flex: 1;
    min-width: 0;
  }

  .actividad-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }

  .actividad-titulo {
    font-weight: 600;
    font-size: 0.9rem;
    color: #0f172a;
  }

  .actividad-fecha {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-left: auto;
  }

  .actividad-descripcion {
    margin: 6px 0 0 0;
    font-size: 0.85rem;
    color: #64748b;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .actividad-usuario {
    font-size: 0.75rem;
    color: #94a3b8;
    display: block;
    margin-top: 4px;
  }

  .actividad-card-actions {
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .actividad-card:hover .actividad-card-actions {
    opacity: 1;
  }

  .btn-icon {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
  }

  .btn-danger-ghost {
    color: #ef4444;
  }

  .btn-danger-ghost:hover {
    background: #fee2e2;
  }

  .badge-actividad {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
    text-transform: capitalize;
  }

  .badge-nota { background: #f1f5f9; color: #475569; }
  .badge-llamada { background: #dbeafe; color: #1d4ed8; }
  .badge-email { background: #e0e7ff; color: #4338ca; }
  .badge-reunion { background: #f3e8ff; color: #7c3aed; }
  .badge-tarea { background: #fef3c7; color: #b45309; }
  .badge-visita { background: #dcfce7; color: #16a34a; }
  .badge-whatsapp { background: #dcfce7; color: #22c55e; }

  .modal-actividad {
    width: 100%;
    max-width: 500px;
  }

  /* Solicitudes List */
  .solicitudes-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .solicitud-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .solicitud-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .solicitud-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .solicitud-titulo {
    font-weight: 600;
    font-size: 0.95rem;
    color: #0f172a;
  }

  .solicitud-card-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .solicitud-tipo {
    font-size: 0.8rem;
    color: #64748b;
    text-transform: capitalize;
  }

  .solicitud-fecha {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .solicitud-notas {
    margin: 10px 0 0 0;
    font-size: 0.85rem;
    color: #64748b;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .badge-prospecto { background: #dbeafe; color: #1d4ed8; }
  .badge-contactado { background: #fef3c7; color: #b45309; }
  .badge-en_seguimiento { background: #e0e7ff; color: #4338ca; }
  .badge-propuesta { background: #f3e8ff; color: #7c3aed; }
  .badge-negociacion { background: #fce7f3; color: #be185d; }
  .badge-cerrado_ganado { background: #dcfce7; color: #16a34a; }
  .badge-cerrado_perdido { background: #fee2e2; color: #dc2626; }

  .badge-priority-alta { background: #fee2e2; color: #dc2626; }
  .badge-priority-media { background: #fef3c7; color: #b45309; }
  .badge-priority-baja { background: #dcfce7; color: #16a34a; }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    color: #64748b;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  /* Propuestas List */
  .propuestas-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .propuesta-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .propuesta-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .propuesta-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .propuesta-titulo {
    font-weight: 600;
    font-size: 0.95rem;
    color: #0f172a;
  }

  .propuesta-card-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .propuesta-monto {
    font-weight: 600;
    font-size: 0.9rem;
    color: #16a34a;
  }

  .propuesta-validez {
    font-size: 0.8rem;
    color: #64748b;
  }

  .propuesta-fecha {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .propuesta-descripcion {
    margin: 10px 0 0 0;
    font-size: 0.85rem;
    color: #64748b;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .badge-propuesta-borrador { background: #f1f5f9; color: #475569; }
  .badge-propuesta-enviada { background: #dbeafe; color: #1d4ed8; }
  .badge-propuesta-vista { background: #e0e7ff; color: #4338ca; }
  .badge-propuesta-aceptada { background: #dcfce7; color: #16a34a; }
  .badge-propuesta-rechazada { background: #fee2e2; color: #dc2626; }
  .badge-propuesta-expirada { background: #fef3c7; color: #b45309; }

  /* Planes de Pago List */
  .planes-pago-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .plan-pago-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .plan-pago-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .plan-pago-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .plan-pago-titulo {
    font-weight: 600;
    font-size: 0.95rem;
    color: #0f172a;
  }

  .plan-pago-card-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .plan-pago-monto {
    font-weight: 600;
    font-size: 0.9rem;
    color: #16a34a;
  }

  .plan-pago-propiedad {
    font-size: 0.8rem;
    color: #64748b;
    background: #f1f5f9;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .plan-pago-fecha {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .plan-pago-descripcion {
    margin: 10px 0 0 0;
    font-size: 0.85rem;
    color: #64748b;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .badge-plan-borrador { background: #f1f5f9; color: #475569; }
  .badge-plan-enviado { background: #dbeafe; color: #1d4ed8; }
  .badge-plan-visto { background: #e0e7ff; color: #4338ca; }
  .badge-plan-aceptado { background: #dcfce7; color: #16a34a; }
  .badge-plan-rechazado { background: #fee2e2; color: #dc2626; }

  @media (max-width: 768px) {
    .header-contact { flex-direction: column; text-align: center; }
    .contact-badges { justify-content: center; }
    .form-grid, .fields-grid, .edit-ext-form, .info-grid-compact { grid-template-columns: 1fr; }
    .tabs-row { overflow-x: auto; }
    .tab { white-space: nowrap; }
    .modal-relacion { max-width: 95%; }

    /* Responsive info cards */
    .info-card-header { padding: 14px 16px; }
    .info-card-body { padding: 16px; }
    .info-field { padding: 10px 12px; }
    .info-dates-row { flex-direction: column; gap: 12px; }
  }
`;
