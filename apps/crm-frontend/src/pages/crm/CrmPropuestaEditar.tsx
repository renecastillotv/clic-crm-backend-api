/**
 * CrmPropuestaEditar - Página para crear/editar propuestas con selector de propiedades
 *
 * Estructura con Tabs:
 * - Tab 1: Información de la propuesta (formulario)
 * - Tab 2: Selección de propiedades (grid visual con tarjetas grandes)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import DatePicker from '../../components/DatePicker';
import ContactPicker from '../../components/ContactPicker';
import {
  getPropuesta,
  createPropuesta,
  updatePropuesta,
  getPropiedadesCrm,
  getContactos,
  getSolicitudes,
  getOperacionesCatalogo,
  getCategoriasPropiedadesCatalogo,
  getTenantConfiguracion,
  Propuesta,
  PropuestaPropiedadResumen,
  Propiedad,
  PropiedadFiltros,
  Contacto,
  Solicitud,
  type Operacion,
  type CategoriaPropiedad,
} from '../../services/api';
import {
  Save,
  ArrowLeft,
  Search,
  Building2,
  Bed,
  Bath,
  Maximize,
  Check,
  X,
  Loader2,
  Eye,
  Link2,
  Copy,
  CheckCircle,
  Trash2,
  FileText,
  Home,
  Star,
  MapPin,
  Car,
  ClipboardList,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  ExternalLink,
  Globe,
  Plus,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Shield,
  Gift,
  Layers,
  Percent,
  Clock,
  Table2,
} from 'lucide-react';

// Estados de propuesta
const ESTADOS: Record<string, { label: string; color: string; bgColor: string }> = {
  borrador: { label: 'Borrador', color: '#64748b', bgColor: '#f1f5f9' },
  enviada: { label: 'Enviada', color: '#2563eb', bgColor: '#dbeafe' },
  vista: { label: 'Vista', color: '#7c3aed', bgColor: '#f3e8ff' },
  aceptada: { label: 'Aceptada', color: '#16a34a', bgColor: '#dcfce7' },
  rechazada: { label: 'Rechazada', color: '#dc2626', bgColor: '#fef2f2' },
  expirada: { label: 'Expirada', color: '#94a3b8', bgColor: '#f8fafc' },
};

// Estados de propiedad
const ESTADOS_PROPIEDAD: Record<string, { label: string; color: string; bgColor: string }> = {
  disponible: { label: 'Disponible', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)' },
  reservada: { label: 'Reservada', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)' },
  vendida: { label: 'Vendida', color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.12)' },
  rentada: { label: 'Rentada', color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.12)' },
  inactiva: { label: 'Inactiva', color: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.12)' },
};

type TabType = 'info' | 'propiedades' | 'seleccionadas';

export default function CrmPropuestaEditar() {
  const { tenantSlug, propuestaId } = useParams<{ tenantSlug: string; propuestaId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenantActual, user, isTenantAdmin } = useAuth();
  const { setPageHeader } = usePageHeader();

  const isNew = !propuestaId || propuestaId === 'nueva';

  // Tab activo
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Estado del formulario
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    precio_propuesto: '',
    moneda: 'USD',
    condiciones: '',
    notas_internas: '',
    contacto_id: '',
    solicitud_id: '',
    fecha_expiracion: '',
    estado: 'borrador',
  });

  // Estado de la propuesta (para edición)
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Dominio personalizado del tenant para URL pública
  const [dominioPersonalizado, setDominioPersonalizado] = useState<string | null>(null);

  // Panel lateral de preview de propiedad
  const [previewPropiedad, setPreviewPropiedad] = useState<Propiedad | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  // Modal de inventario interno
  const [showInventarioModal, setShowInventarioModal] = useState(false);
  const [inventarioPropiedad, setInventarioPropiedad] = useState<{ id: string; nombre: string; captador_id?: string } | null>(null);
  const [inventarioUnidades, setInventarioUnidades] = useState<any[]>([]);
  const [loadingInventario, setLoadingInventario] = useState(false);

  // Propiedades seleccionadas
  const [selectedPropiedades, setSelectedPropiedades] = useState<string[]>([]);
  const [propiedadesSeleccionadasData, setPropiedadesSeleccionadasData] = useState<PropuestaPropiedadResumen[]>([]);

  // Grid de propiedades disponibles
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [busquedaProps, setBusquedaProps] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [operacionFiltro, setOperacionFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('disponible');
  const [includeRedGlobal, setIncludeRedGlobal] = useState(false);
  const [totalProps, setTotalProps] = useState(0);
  const [pageProps, setPageProps] = useState(1);

  // Catálogos dinámicos
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<CategoriaPropiedad[]>([]);
  const [operacionesCatalogo, setOperacionesCatalogo] = useState<Operacion[]>([]);

  // Selectores de contacto/solicitud
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingContactos, setLoadingContactos] = useState(false);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: isNew ? 'Nueva Propuesta' : 'Editar Propuesta',
      subtitle: isNew ? 'Crea una nueva propuesta para un cliente' : `Editando: ${propuesta?.titulo || ''}`,
      actions: (
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate(`/crm/${tenantSlug}/propuestas`)}>
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.titulo.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ),
    });
  }, [setPageHeader, isNew, propuesta, form.titulo, saving, tenantSlug]);

  // Cargar propuesta existente
  useEffect(() => {
    if (!isNew && tenantActual?.id && propuestaId) {
      loadPropuesta();
    }
  }, [isNew, tenantActual?.id, propuestaId]);

  // Cargar propiedades disponibles
  useEffect(() => {
    if (tenantActual?.id) {
      loadPropiedades();
    }
  }, [tenantActual?.id, busquedaProps, tipoFiltro, operacionFiltro, estadoFiltro, includeRedGlobal, pageProps]);

  // Cargar contactos, solicitudes y catálogos
  useEffect(() => {
    if (tenantActual?.id) {
      loadContactos();
      loadSolicitudes();
      loadCatalogos();
    }
  }, [tenantActual?.id]);

  // Pre-cargar contacto desde query params
  useEffect(() => {
    const contactoIdParam = searchParams.get('contacto_id');
    if (contactoIdParam && isNew) {
      setForm(prev => ({ ...prev, contacto_id: contactoIdParam }));
    }
  }, [searchParams, isNew]);

  // Cargar dominio personalizado del tenant
  useEffect(() => {
    const loadTenantConfig = async () => {
      if (!tenantActual?.id) return;
      try {
        const config = await getTenantConfiguracion(tenantActual.id);
        console.log('🌐 Configuración tenant:', config);
        console.log('🌐 Dominio personalizado:', config.dominio_personalizado);
        setDominioPersonalizado(config.dominio_personalizado);
      } catch (err) {
        console.error('Error cargando configuración del tenant:', err);
      }
    };
    loadTenantConfig();
  }, [tenantActual?.id]);

  const loadCatalogos = async () => {
    if (!tenantActual?.id) return;
    try {
      const [cats, ops] = await Promise.all([
        getCategoriasPropiedadesCatalogo(tenantActual.id),
        getOperacionesCatalogo(tenantActual.id),
      ]);
      setCategoriasCatalogo(cats);
      setOperacionesCatalogo(ops);
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  const loadPropuesta = async () => {
    if (!tenantActual?.id || !propuestaId) return;

    try {
      setLoading(true);
      const data = await getPropuesta(tenantActual.id, propuestaId);
      setPropuesta(data);

      // Poblar formulario
      setForm({
        titulo: data.titulo || '',
        descripcion: data.descripcion || '',
        precio_propuesto: data.precio_propuesto?.toString() || '',
        moneda: data.moneda || 'USD',
        condiciones: data.condiciones || '',
        notas_internas: data.notas_internas || '',
        contacto_id: data.contacto_id || '',
        solicitud_id: data.solicitud_id || '',
        fecha_expiracion: data.fecha_expiracion?.slice(0, 10) || '',
        estado: data.estado || 'borrador',
      });

      // Poblar propiedades seleccionadas
      if (data.propiedades && data.propiedades.length > 0) {
        setSelectedPropiedades(data.propiedades.map(p => p.propiedad_id));
        setPropiedadesSeleccionadasData(data.propiedades);
      }
    } catch (err: any) {
      console.error('Error cargando propuesta:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPropiedades = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoadingProps(true);
      const filtros: PropiedadFiltros = {
        busqueda: busquedaProps || undefined,
        tipo: tipoFiltro || undefined,
        operacion: operacionFiltro || undefined,
        estado_propiedad: estadoFiltro || undefined,
        include_red_global: includeRedGlobal || undefined,
        page: pageProps,
        limit: 12,
      };

      const response = await getPropiedadesCrm(tenantActual.id, filtros);
      setPropiedades(response.data);
      setTotalProps(response.total);
    } catch (err: any) {
      console.error('Error cargando propiedades:', err);
    } finally {
      setLoadingProps(false);
    }
  }, [tenantActual?.id, busquedaProps, tipoFiltro, operacionFiltro, estadoFiltro, includeRedGlobal, pageProps]);

  const loadContactos = async () => {
    if (!tenantActual?.id) return;
    try {
      setLoadingContactos(true);
      const response = await getContactos(tenantActual.id, { limit: 100 });
      setContactos(response.data);
    } catch (err) {
      console.error('Error cargando contactos:', err);
    } finally {
      setLoadingContactos(false);
    }
  };

  const loadSolicitudes = async () => {
    if (!tenantActual?.id) return;
    try {
      const response = await getSolicitudes(tenantActual.id, { limit: 100 });
      setSolicitudes(response.data);
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
    }
  };

  // Auto-guardar propiedades inmediatamente
  // - Para propuestas nuevas: crea la propuesta como borrador
  // - Para propuestas existentes: actualiza las propiedades y vuelve a borrador
  const autoSavePropiedades = async (propiedadIds: string[]) => {
    if (!tenantActual?.id) return;
    if (propiedadIds.length === 0) return; // No guardar si no hay propiedades

    try {
      console.log('🔄 Auto-guardando propiedades:', propiedadIds);

      const data = {
        titulo: form.titulo || 'Propuesta sin título',
        descripcion: form.descripcion || undefined,
        precio_propuesto: form.precio_propuesto ? parseFloat(form.precio_propuesto) : undefined,
        moneda: form.moneda,
        condiciones: form.condiciones || undefined,
        notas_internas: form.notas_internas || undefined,
        contacto_id: form.contacto_id || undefined,
        solicitud_id: form.solicitud_id || undefined,
        fecha_expiracion: form.fecha_expiracion || undefined,
        estado: 'borrador',
        propiedad_ids: propiedadIds,
      };

      if (isNew) {
        // Crear nueva propuesta como borrador
        console.log('📝 Creando nueva propuesta como borrador...');
        const created = await createPropuesta(tenantActual.id, data);
        setPropuesta(created);
        setForm(prev => ({ ...prev, estado: 'borrador' }));
        // Navegar a la propuesta creada (sin recargar)
        navigate(`/crm/${tenantSlug}/propuestas/${created.id}`, { replace: true });
        console.log('✅ Propuesta creada como borrador:', created.id);
      } else if (propuestaId) {
        // Actualizar propuesta existente
        const updated = await updatePropuesta(tenantActual.id, propuestaId, data);
        setPropuesta(updated);
        setForm(prev => ({ ...prev, estado: 'borrador' }));
        console.log('✅ Propiedades actualizadas');
      }
    } catch (err: any) {
      console.error('❌ Error en auto-guardado:', err);
    }
  };

  // Toggle selección de propiedad
  const togglePropiedad = (propiedad: Propiedad) => {
    const propId = propiedad.id;
    let newSelectedIds: string[];

    if (selectedPropiedades.includes(propId)) {
      // Remover
      newSelectedIds = selectedPropiedades.filter(id => id !== propId);
      setSelectedPropiedades(newSelectedIds);
      setPropiedadesSeleccionadasData(prev => prev.filter(p => p.propiedad_id !== propId));
    } else {
      // Agregar
      newSelectedIds = [...selectedPropiedades, propId];
      setSelectedPropiedades(newSelectedIds);
      setPropiedadesSeleccionadasData(prev => [...prev, {
        id: '', // Se asignará en el backend
        propiedad_id: propId,
        titulo: propiedad.titulo,
        codigo: propiedad.codigo,
        precio: propiedad.precio,
        moneda: propiedad.moneda,
        imagen_principal: propiedad.imagen_principal,
        tipo: propiedad.tipo,
        operacion: propiedad.operacion,
        ciudad: propiedad.ciudad,
        habitaciones: propiedad.habitaciones,
        banos: propiedad.banos,
        m2_construccion: propiedad.m2_construccion,
        orden: prev.length,
      }]);
    }

    // Auto-guardar inmediatamente al modificar propiedades
    autoSavePropiedades(newSelectedIds);
  };

  // Remover propiedad de la selección
  const removePropiedad = (propiedadId: string) => {
    const newSelectedIds = selectedPropiedades.filter(id => id !== propiedadId);
    setSelectedPropiedades(newSelectedIds);
    setPropiedadesSeleccionadasData(prev => prev.filter(p => p.propiedad_id !== propiedadId));
    // Auto-guardar inmediatamente
    autoSavePropiedades(newSelectedIds);
  };

  // Guardar propuesta - Al guardar manualmente, si está en borrador cambia a "enviada"
  const handleSave = async () => {
    if (!tenantActual?.id || !form.titulo.trim()) return;

    try {
      setSaving(true);
      setError(null);

      // Si el estado actual es borrador y el usuario da clic en Guardar,
      // cambiar automáticamente a "enviada" (lista para compartir)
      const estadoFinal = form.estado === 'borrador' ? 'enviada' : form.estado;

      const data = {
        titulo: form.titulo,
        descripcion: form.descripcion || undefined,
        precio_propuesto: form.precio_propuesto ? parseFloat(form.precio_propuesto) : undefined,
        moneda: form.moneda,
        condiciones: form.condiciones || undefined,
        notas_internas: form.notas_internas || undefined,
        contacto_id: form.contacto_id || undefined,
        solicitud_id: form.solicitud_id || undefined,
        fecha_expiracion: form.fecha_expiracion || undefined,
        estado: estadoFinal,
        propiedad_ids: selectedPropiedades,
      };

      if (isNew) {
        // Para nuevas propuestas, crearlas directamente como "enviada"
        data.estado = 'enviada';
        const created = await createPropuesta(tenantActual.id, data);
        navigate(`/crm/${tenantSlug}/propuestas/${created.id}`);
      } else if (propuestaId) {
        const updated = await updatePropuesta(tenantActual.id, propuestaId, data);
        setPropuesta(updated);
        // Actualizar el formulario con el nuevo estado
        setForm(prev => ({ ...prev, estado: estadoFinal }));
      }
    } catch (err: any) {
      console.error('Error guardando propuesta:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Cargar inventario de unidades de una propiedad
  const loadInventario = async (propiedadId: string, propiedadNombre: string, captadorId?: string) => {
    if (!tenantActual?.id) return;

    try {
      setLoadingInventario(true);
      setInventarioPropiedad({ id: propiedadId, nombre: propiedadNombre, captador_id: captadorId });
      setShowInventarioModal(true);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API_URL}/tenants/${tenantActual.id}/propiedades/${propiedadId}/unidades`);

      if (!res.ok) {
        throw new Error('Error al cargar unidades');
      }

      const data = await res.json();
      setInventarioUnidades(data);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      setInventarioUnidades([]);
    } finally {
      setLoadingInventario(false);
    }
  };

  // Verificar si el usuario puede editar el inventario (admin del tenant o captador de la propiedad)
  const canEditInventario = (): boolean => {
    if (!user || !inventarioPropiedad) return false;
    // Es admin del tenant
    if (isTenantAdmin) return true;
    // Es el captador/creador de la propiedad
    if (inventarioPropiedad.captador_id && inventarioPropiedad.captador_id === user.id) return true;
    return false;
  };

  // Cambiar estado de una unidad
  const cambiarEstadoUnidad = async (unidadId: string, nuevoEstado: string) => {
    if (!tenantActual?.id || !inventarioPropiedad?.id) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res = await fetch(
        `${API_URL}/tenants/${tenantActual.id}/propiedades/${inventarioPropiedad.id}/unidades/${unidadId}/estado`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: nuevoEstado }),
        }
      );

      if (!res.ok) {
        throw new Error('Error al cambiar estado');
      }

      // Actualizar el estado localmente
      setInventarioUnidades(prev =>
        prev.map(u => u.id === unidadId ? { ...u, estado: nuevoEstado } : u)
      );
    } catch (err) {
      console.error('Error cambiando estado de unidad:', err);
    }
  };

  // Generar URL pública completa usando el dominio web público del tenant
  const getUrlPublicaCompleta = () => {
    if (!propuesta?.url_publica) return null;

    // Si tiene dominio personalizado, usar ese (puede venir con o sin https://)
    if (dominioPersonalizado) {
      // Limpiar el dominio: quitar protocolo y trailing slash
      let dominio = dominioPersonalizado
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
      return `https://${dominio}/propuestas/${propuesta.url_publica}`;
    }

    // Fallback: usar {tenantSlug}.clic.casa
    if (!tenantSlug) return null;
    return `https://${tenantSlug}.clic.casa/propuestas/${propuesta.url_publica}`;
  };

  // URL de preview (dominio personalizado + ?preview=true)
  const getUrlPreview = () => {
    const urlBase = getUrlPublicaCompleta();
    if (!urlBase) return null;
    return `${urlBase}?preview=true`;
  };

  // Abrir vista previa en nueva pestaña
  const handleOpenPreview = () => {
    const previewUrl = getUrlPreview();
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  // Copiar URL pública
  const handleCopyUrl = async () => {
    const urlCompleta = getUrlPublicaCompleta();
    if (!urlCompleta) return;
    try {
      await navigator.clipboard.writeText(urlCompleta);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Error al copiar URL:', err);
    }
  };

  // Formatear moneda
  const formatMoney = (value: number | undefined, moneda: string = 'USD') => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Obtener label de operación
  const getOperacionLabel = (slug: string) => {
    const op = operacionesCatalogo.find(o => o.slug === slug);
    return op?.nombre || slug;
  };

  // Obtener label de tipo
  const getTipoLabel = (slug: string) => {
    const cat = categoriasCatalogo.find(c => c.slug === slug);
    return cat?.nombre || slug;
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p>Cargando propuesta...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page propuesta-editar">
      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <FileText className="w-4 h-4" />
            Información
          </button>
          <button
            className={`tab ${activeTab === 'propiedades' ? 'active' : ''}`}
            onClick={() => setActiveTab('propiedades')}
          >
            <Home className="w-4 h-4" />
            Propiedades
          </button>
          <button
            className={`tab ${activeTab === 'seleccionadas' ? 'active' : ''}`}
            onClick={() => setActiveTab('seleccionadas')}
          >
            <ClipboardList className="w-4 h-4" />
            Seleccionadas
            {selectedPropiedades.length > 0 && (
              <span className="tab-badge">{selectedPropiedades.length}</span>
            )}
          </button>

          {/* Toggle Red Global */}
          <label className="red-global-toggle" title="Incluir propiedades de la Red Global CLIC">
            <input
              type="checkbox"
              checked={includeRedGlobal}
              onChange={(e) => setIncludeRedGlobal(e.target.checked)}
            />
            <span className="toggle-slider"></span>
            <Globe className="w-4 h-4" />
            <span className="toggle-label">Red Global</span>
          </label>
        </div>

        {/* Botón Vista Previa + Copiar enlace */}
        <div className="preview-actions">
          <button
            className="btn-preview"
            onClick={propuesta?.url_publica ? handleOpenPreview : () => setShowPreview(true)}
            disabled={!form.titulo.trim()}
            title={propuesta?.url_publica ? 'Ver en web pública (modo preview)' : 'Vista previa interna'}
          >
            {propuesta?.url_publica ? <ExternalLink className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Vista Previa
          </button>
          {propuesta?.url_publica && getUrlPublicaCompleta() && (
            <>
              <button
                className="btn-copy-link"
                onClick={handleCopyUrl}
                title={copiedUrl ? 'Enlace copiado' : 'Copiar enlace público'}
              >
                {copiedUrl ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              {propuesta.veces_vista !== undefined && propuesta.veces_vista > 0 && (
                <span className="views-badge-mini" title={`${propuesta.veces_vista} visitas`}>
                  <Eye className="w-3 h-3" /> {propuesta.veces_vista}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab Content: Información */}
      {activeTab === 'info' && (
        <div className="tab-content info-tab">
          <div className="form-grid">
            {/* Columna Principal */}
            <div className="form-main">
              <div className="form-card">
                <h3>Datos de la Propuesta</h3>

                <div className="form-group">
                  <label htmlFor="titulo">Título *</label>
                  <input
                    id="titulo"
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Ej: Propuesta Casa Residencial"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="descripcion">Mensaje de la Propuesta</label>
                  <textarea
                    id="descripcion"
                    value={form.descripcion}
                    onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Escribe el mensaje que verá el cliente después del título de la propuesta..."
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="condiciones">Términos y Condiciones</label>
                  <textarea
                    id="condiciones"
                    value={form.condiciones}
                    onChange={(e) => setForm(prev => ({ ...prev, condiciones: e.target.value }))}
                    placeholder="Términos, condiciones de pago, etc..."
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="notas_internas">Notas Internas</label>
                  <textarea
                    id="notas_internas"
                    value={form.notas_internas}
                    onChange={(e) => setForm(prev => ({ ...prev, notas_internas: e.target.value }))}
                    placeholder="Notas solo visibles internamente..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Columna Lateral */}
            <div className="form-sidebar">
              <div className="form-card">
                <h3>Cliente y Solicitud</h3>

                <div className="form-group">
                  <label>Contacto</label>
                  <ContactPicker
                    value={form.contacto_id || null}
                    onChange={(id) => setForm(prev => ({ ...prev, contacto_id: id || '' }))}
                    contacts={contactos}
                    loading={loadingContactos}
                    placeholder="Seleccionar contacto"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="solicitud_id">Solicitud (opcional)</label>
                  <select
                    id="solicitud_id"
                    value={form.solicitud_id}
                    onChange={(e) => {
                      const solicitudId = e.target.value;
                      const solicitud = solicitudes.find(s => s.id === solicitudId);
                      setForm(prev => ({
                        ...prev,
                        solicitud_id: solicitudId,
                        // Auto-llenar contacto si la solicitud tiene uno asociado
                        ...(solicitud?.contacto_id && !prev.contacto_id && { contacto_id: solicitud.contacto_id }),
                        // Auto-llenar precio con presupuesto máximo si no hay precio establecido
                        ...(solicitud?.presupuesto_max && !prev.precio_propuesto && { precio_propuesto: String(solicitud.presupuesto_max) }),
                      }));
                    }}
                  >
                    <option value="">Sin solicitud vinculada</option>
                    {solicitudes.map(s => (
                      <option key={s.id} value={s.id}>{s.titulo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-card">
                <h3>Precio y Estado</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="precio_propuesto">Precio Total</label>
                    <input
                      id="precio_propuesto"
                      type="number"
                      value={form.precio_propuesto}
                      onChange={(e) => setForm(prev => ({ ...prev, precio_propuesto: e.target.value }))}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="form-group small">
                    <label htmlFor="moneda">Moneda</label>
                    <select
                      id="moneda"
                      value={form.moneda}
                      onChange={(e) => setForm(prev => ({ ...prev, moneda: e.target.value }))}
                    >
                      <option value="USD">USD</option>
                      <option value="DOP">DOP</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="fecha_expiracion">Válida hasta</label>
                  <DatePicker
                    value={form.fecha_expiracion || null}
                    onChange={(val) => setForm(prev => ({ ...prev, fecha_expiracion: val || '' }))}
                    placeholder="Seleccionar fecha"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    value={form.estado}
                    onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value }))}
                  >
                    {Object.entries(ESTADOS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resumen de propiedades seleccionadas */}
              <div className="form-card selected-summary">
                <h3>
                  <Building2 className="w-4 h-4" />
                  Propiedades ({selectedPropiedades.length})
                </h3>
                {propiedadesSeleccionadasData.length === 0 ? (
                  <p className="empty-hint">
                    No hay propiedades seleccionadas.
                    <button className="link-btn" onClick={() => setActiveTab('propiedades')}>
                      Ir a seleccionar
                    </button>
                  </p>
                ) : (
                  <>
                    <div className="selected-mini-list">
                      {propiedadesSeleccionadasData.slice(0, 3).map((prop) => (
                        <div key={prop.propiedad_id} className="selected-mini-item">
                          <span className="mini-title">{prop.titulo}</span>
                          <span className="mini-price">{formatMoney(prop.precio, prop.moneda)}</span>
                        </div>
                      ))}
                      {propiedadesSeleccionadasData.length > 3 && (
                        <div className="more-count">
                          +{propiedadesSeleccionadasData.length - 3} más
                        </div>
                      )}
                    </div>
                    <button className="link-btn" onClick={() => setActiveTab('propiedades')}>
                      Ver todas las propiedades
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Propiedades */}
      {activeTab === 'propiedades' && (
        <div className="tab-content propiedades-tab-full">
          {/* Filtros integrados directamente */}
          <div className="props-filters-inline">
                <div className="search-box">
                  <Search className="search-icon w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar propiedades..."
                    value={busquedaProps}
                    onChange={(e) => {
                      setBusquedaProps(e.target.value);
                      setPageProps(1);
                    }}
                  />
                </div>
                <select
                  value={tipoFiltro}
                  onChange={(e) => {
                    setTipoFiltro(e.target.value);
                    setPageProps(1);
                  }}
                  className="filter-select"
                >
                  <option value="">Todos los tipos</option>
                  {categoriasCatalogo.map(cat => (
                    <option key={cat.id} value={cat.slug}>{cat.nombre}</option>
                  ))}
                </select>
                <select
                  value={operacionFiltro}
                  onChange={(e) => {
                    setOperacionFiltro(e.target.value);
                    setPageProps(1);
                  }}
                  className="filter-select"
                >
                  <option value="">Todas las operaciones</option>
                  {operacionesCatalogo.map(op => (
                    <option key={op.id} value={op.slug}>{op.nombre}</option>
                  ))}
                </select>
                <select
                  value={estadoFiltro}
                  onChange={(e) => {
                    setEstadoFiltro(e.target.value);
                    setPageProps(1);
                  }}
                  className="filter-select"
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(ESTADOS_PROPIEDAD).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
          </div>

          {/* Grid con scroll */}
          <div className="props-scroll-full">
            {loadingProps ? (
              <div className="loading-small">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : propiedades.length === 0 ? (
              <div className="empty-catalog">
                <Building2 className="w-12 h-12 text-gray-300" />
                <p>No se encontraron propiedades con los filtros aplicados</p>
              </div>
            ) : (
              <div className="props-grid">
                    {/* Ordenar: 1) Seleccionadas, 2) Destacadas, 3) Resto */}
                    {[...propiedades].sort((a, b) => {
                      const aSelected = selectedPropiedades.includes(a.id) ? 1 : 0;
                      const bSelected = selectedPropiedades.includes(b.id) ? 1 : 0;
                      if (aSelected !== bSelected) return bSelected - aSelected;

                      const aDestacada = a.destacada ? 1 : 0;
                      const bDestacada = b.destacada ? 1 : 0;
                      if (aDestacada !== bDestacada) return bDestacada - aDestacada;

                      return 0;
                    }).map((prop) => {
                      const isSelected = selectedPropiedades.includes(prop.id);
                      const estado = ESTADOS_PROPIEDAD[prop.estado_propiedad] || ESTADOS_PROPIEDAD.disponible;

                      return (
                        <div
                          key={prop.id}
                          className={`prop-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setPreviewPropiedad(prop)}
                        >
                          <div className="prop-image">
                            {prop.imagen_principal ? (
                              <img src={prop.imagen_principal} alt={prop.titulo} />
                            ) : (
                              <div className="prop-placeholder">
                                <Building2 className="w-10 h-10" />
                              </div>
                            )}
                            {/* Checkbox de selección */}
                            <label
                              className={`prop-checkbox ${isSelected ? 'checked' : ''}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePropiedad(prop)}
                              />
                              {isSelected && <Check className="w-3 h-3" />}
                            </label>
                            {/* Destacada - círculo con estrella */}
                            {prop.destacada && (
                              <span className="badge-destacada"><Star size={9} fill="currentColor" /></span>
                            )}
                            {/* Badge de operación */}
                            {prop.operacion && (
                              <div className="prop-operacion">
                                {getOperacionLabel(prop.operacion)}
                              </div>
                            )}
                          </div>
                          <div className="prop-body">
                            {/* Tipo y Captador */}
                            <div className="prop-type-row">
                              <span className="prop-type">
                                <Building2 size={12} />
                                {getTipoLabel(prop.tipo)}
                              </span>
                              {/* Captador info a la derecha */}
                              <div className="captador-inline">
                                {(prop as any).captador_avatar ? (
                                  <img src={(prop as any).captador_avatar} alt="" className="captador-avatar-sm" />
                                ) : (prop as any).captador_nombre ? (
                                  <div className="captador-initials-sm">
                                    {((prop as any).captador_nombre?.[0] || '').toUpperCase()}
                                    {((prop as any).captador_apellido?.[0] || '').toUpperCase()}
                                  </div>
                                ) : null}
                                {/* Nombre inmobiliaria solo para Red Global */}
                                {prop.red_global && prop.tenant_id !== tenantActual?.id && (
                                  <span className="inmobiliaria-name">{(prop as any).tenant_nombre || 'Red Global'}</span>
                                )}
                              </div>
                            </div>
                            {/* Título */}
                            <h4 className="prop-title">{prop.titulo}</h4>
                            {/* Códigos */}
                            <div className="prop-codes">
                              {(prop as any).codigo_publico && (
                                <span className="prop-code">#{(prop as any).codigo_publico}</span>
                              )}
                              {prop.codigo && (
                                <span className="prop-code ref">Ref: {prop.codigo}</span>
                              )}
                            </div>
                            {/* Precio */}
                            <div className="prop-price">
                              {formatMoney(prop.precio, prop.moneda)}
                            </div>
                            {/* Ubicación */}
                            <div className="prop-location">
                              <MapPin size={11} />
                              {[prop.sector, prop.ciudad].filter(Boolean).join(', ') || 'Sin ubicación'}
                            </div>
                            {/* Características */}
                            <div className="prop-features">
                              {prop.habitaciones != null && prop.habitaciones > 0 && (
                                <span><Bed size={13} /> {prop.habitaciones}</span>
                              )}
                              {prop.banos != null && prop.banos > 0 && (
                                <span><Bath size={13} /> {prop.banos}</span>
                              )}
                              {prop.estacionamientos != null && prop.estacionamientos > 0 && (
                                <span><Car size={13} /> {prop.estacionamientos}</span>
                              )}
                              {prop.m2_construccion != null && (
                                <span><Maximize size={13} /> {prop.m2_construccion.toLocaleString()}m²</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                })}
              </div>
            )}
          </div>

          {/* Paginación */}
          {totalProps > 12 && (
            <div className="pagination-inline">
              <button
                disabled={pageProps === 1}
                onClick={() => setPageProps(p => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span>Página {pageProps} de {Math.ceil(totalProps / 12)}</span>
              <button
                disabled={pageProps * 12 >= totalProps}
                onClick={() => setPageProps(p => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Seleccionadas */}
      {activeTab === 'seleccionadas' && (
        <div className="tab-content seleccionadas-tab">
          <div className="seleccionadas-header">
            <h2>
              <ClipboardList className="w-5 h-5" />
              Propiedades Seleccionadas
            </h2>
            <span className="seleccionadas-count">{selectedPropiedades.length} propiedades</span>
          </div>

          {propiedadesSeleccionadasData.length === 0 ? (
            <div className="empty-seleccionadas">
              <Building2 className="w-16 h-16" />
              <h3>No hay propiedades seleccionadas</h3>
              <p>Ve a la pestaña "Propiedades" para agregar propiedades a esta propuesta</p>
              <button className="btn-primary" onClick={() => setActiveTab('propiedades')}>
                <Home className="w-4 h-4" />
                Ir a Propiedades
              </button>
            </div>
          ) : (
            <div className="seleccionadas-grid">
              {propiedadesSeleccionadasData.map((prop, index) => {
                const estado = ESTADOS_PROPIEDAD[prop.estado_propiedad || 'disponible'] || ESTADOS_PROPIEDAD.disponible;

                return (
                  <div key={prop.propiedad_id} className="seleccionada-card">
                    <div className="seleccionada-number">{index + 1}</div>
                    <div className="seleccionada-image">
                      {prop.imagen_principal ? (
                        <img src={prop.imagen_principal} alt={prop.titulo} />
                      ) : (
                        <div className="seleccionada-placeholder">
                          <Building2 className="w-12 h-12" />
                        </div>
                      )}
                      {prop.operacion && (
                        <div className="seleccionada-operacion">
                          {getOperacionLabel(prop.operacion)}
                        </div>
                      )}
                    </div>
                    <div className="seleccionada-body">
                      <div className="seleccionada-tipo">
                        <Building2 className="w-3 h-3" />
                        {getTipoLabel(prop.tipo || '')}
                      </div>
                      <h3 className="seleccionada-titulo">{prop.titulo}</h3>
                      <div className="seleccionada-codes">
                        {prop.codigo && <span className="code">Ref: {prop.codigo}</span>}
                      </div>
                      <div className="seleccionada-precio">
                        {formatMoney(prop.precio, prop.moneda)}
                      </div>
                      {prop.ciudad && (
                        <div className="seleccionada-ubicacion">
                          <MapPin className="w-3.5 h-3.5" />
                          {prop.ciudad}
                        </div>
                      )}
                      <div className="seleccionada-features">
                        {prop.habitaciones !== undefined && prop.habitaciones > 0 && (
                          <span><Bed className="w-4 h-4" /> {prop.habitaciones} Hab.</span>
                        )}
                        {prop.banos !== undefined && prop.banos > 0 && (
                          <span><Bath className="w-4 h-4" /> {prop.banos} Baños</span>
                        )}
                        {prop.m2_construccion && (
                          <span><Maximize className="w-4 h-4" /> {prop.m2_construccion}m²</span>
                        )}
                      </div>
                    </div>
                    <div className="seleccionada-actions">
                      <button
                        className="btn-remove-selec"
                        onClick={() => removePropiedad(prop.propiedad_id)}
                        title="Quitar de la propuesta"
                      >
                        <Trash2 className="w-4 h-4" />
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Vista Previa */}
      {showPreview && (
        <div className="preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setShowPreview(false)}>
              <X className="w-5 h-5" />
            </button>

            <div className="preview-content">
              {/* Header con Logo */}
              <div className="preview-header">
                {tenantActual?.logo_url ? (
                  <img src={tenantActual.logo_url} alt={tenantActual.nombre} className="preview-logo" />
                ) : (
                  <div className="preview-logo-placeholder">
                    <Building2 className="w-10 h-10" />
                    <span>{tenantActual?.nombre || 'Inmobiliaria'}</span>
                  </div>
                )}
              </div>

              {/* Saludo personalizado */}
              <div className="preview-greeting">
                <h1>
                  Saludos, {
                    contactos.find(c => c.id === form.contacto_id)?.nombre ||
                    contactos.find(c => c.id === form.contacto_id)?.email ||
                    'Estimado Cliente'
                  }
                </h1>
                <p>
                  A continuación te presentamos una propuesta especialmente preparada para ti.
                </p>
              </div>

              {/* Información de la propuesta */}
              <div className="preview-proposal-info">
                <h2>{form.titulo || 'Propuesta sin título'}</h2>
                {form.descripcion && (
                  <p className="preview-description">{form.descripcion}</p>
                )}
                <div className="preview-meta">
                  {form.precio_propuesto && (
                    <div className="preview-meta-item">
                      <span className="label">Precio Total:</span>
                      <span className="value precio">{formatMoney(parseFloat(form.precio_propuesto), form.moneda)}</span>
                    </div>
                  )}
                  {form.fecha_expiracion && (
                    <div className="preview-meta-item">
                      <Calendar className="w-4 h-4" />
                      <span className="label">Válida hasta:</span>
                      <span className="value">{new Date(form.fecha_expiracion).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de propiedades */}
              <div className="preview-properties">
                <h3>Propiedades Incluidas ({propiedadesSeleccionadasData.length})</h3>
                <div className="preview-props-grid">
                  {propiedadesSeleccionadasData.map((prop) => (
                    <div key={prop.propiedad_id} className="preview-prop-card">
                      <div className="preview-prop-image">
                        {prop.imagen_principal ? (
                          <img src={prop.imagen_principal} alt={prop.titulo} />
                        ) : (
                          <div className="preview-prop-placeholder">
                            <Building2 className="w-8 h-8" />
                          </div>
                        )}
                        {prop.operacion && (
                          <div className="preview-prop-badge">
                            {getOperacionLabel(prop.operacion)}
                          </div>
                        )}
                      </div>
                      <div className="preview-prop-body">
                        <h4>{prop.titulo}</h4>
                        <div className="preview-prop-price">
                          {formatMoney(prop.precio, prop.moneda)}
                        </div>
                        {prop.ciudad && (
                          <div className="preview-prop-location">
                            <MapPin className="w-3 h-3" />
                            {prop.ciudad}
                          </div>
                        )}
                        <div className="preview-prop-features">
                          {prop.habitaciones !== undefined && prop.habitaciones > 0 && (
                            <span><Bed className="w-3 h-3" /> {prop.habitaciones}</span>
                          )}
                          {prop.banos !== undefined && prop.banos > 0 && (
                            <span><Bath className="w-3 h-3" /> {prop.banos}</span>
                          )}
                          {prop.m2_construccion && (
                            <span><Maximize className="w-3 h-3" /> {prop.m2_construccion}m²</span>
                          )}
                        </div>
                        <div className="preview-prop-actions">
                          <button className="preview-btn">
                            <Eye className="w-3.5 h-3.5" />
                            Ver Detalles
                          </button>
                          <button className="preview-btn secondary">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Consultar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Términos y condiciones */}
              {form.condiciones && (
                <div className="preview-conditions">
                  <h4>Términos y Condiciones</h4>
                  <p>{form.condiciones}</p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="preview-cta">
                <h4>¿Te interesa esta propuesta?</h4>
                <div className="preview-cta-buttons">
                  <button className="cta-btn primary">
                    <CheckCircle className="w-5 h-5" />
                    Aceptar Propuesta
                  </button>
                  <button className="cta-btn secondary">
                    <Phone className="w-5 h-5" />
                    Llamar Ahora
                  </button>
                  <button className="cta-btn whatsapp">
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </button>
                  <button className="cta-btn email">
                    <Mail className="w-5 h-5" />
                    Enviar Email
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="preview-footer">
                <p>Propuesta generada por {tenantActual?.nombre || 'Inmobiliaria'}</p>
                {propuesta?.url_publica && getUrlPublicaCompleta() && (
                  <a href={getUrlPublicaCompleta() || '#'} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Ver propuesta en línea
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel lateral de preview de propiedad */}
      {previewPropiedad && (() => {
        const prop = previewPropiedad as any;
        // Construir array de imágenes para el carrusel
        const allImages: string[] = [];
        if (prop.imagen_principal) allImages.push(prop.imagen_principal);
        if (prop.imagenes && Array.isArray(prop.imagenes)) {
          prop.imagenes.forEach((img: string) => {
            if (img && !allImages.includes(img)) allImages.push(img);
          });
        }
        const hasMultipleImages = allImages.length > 1;
        const currentImage = allImages[previewImageIndex] || prop.imagen_principal;

        // Determinar si es propiedad externa (red global de otro tenant)
        const isExternal = prop.red_global && prop.tenant_id !== tenantActual?.id;

        // Datos de contacto: preferir captador, sino datos del tenant
        const hasCaptador = prop.captador_nombre || prop.captador_avatar;
        const contactName = hasCaptador
          ? `${prop.captador_nombre || ''} ${prop.captador_apellido || ''}`.trim()
          : prop.tenant_nombre;
        const contactEmail = hasCaptador ? prop.captador_email : prop.tenant_email;
        const contactPhone = hasCaptador ? prop.captador_telefono : prop.tenant_telefono;

        return (
          <div className="preview-overlay" onClick={() => { setPreviewPropiedad(null); setPreviewImageIndex(0); }}>
            <div className="preview-panel" onClick={(e) => e.stopPropagation()}>
              <div className="preview-header">
                <h3>Detalles de la Propiedad</h3>
                <button className="btn-close" onClick={() => { setPreviewPropiedad(null); setPreviewImageIndex(0); }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="preview-content">
                {/* Carrusel de imágenes */}
                <div className="preview-image-carousel">
                  {currentImage ? (
                    <img src={currentImage} alt={prop.titulo} />
                  ) : (
                    <div className="preview-placeholder">
                      <Building2 className="w-16 h-16" />
                    </div>
                  )}

                  {/* Flechas de navegación */}
                  {hasMultipleImages && (
                    <>
                      <button
                        className="carousel-btn prev"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImageIndex(i => i === 0 ? allImages.length - 1 : i - 1);
                        }}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        className="carousel-btn next"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImageIndex(i => i === allImages.length - 1 ? 0 : i + 1);
                        }}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="carousel-dots">
                        {allImages.map((_, idx) => (
                          <button
                            key={idx}
                            className={`dot ${idx === previewImageIndex ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setPreviewImageIndex(idx); }}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Contador de imágenes */}
                  {hasMultipleImages && (
                    <div className="image-counter">
                      {previewImageIndex + 1} / {allImages.length}
                    </div>
                  )}
                </div>

                {/* Info principal */}
                <div className="preview-info">
                  <div className="preview-badges-row">
                    <div className="preview-operation">
                      {getOperacionLabel(prop.operacion)}
                    </div>
                    {prop.destacada && (
                      <div className="preview-badge-destacada">
                        <Star className="w-3.5 h-3.5" />
                        Destacada
                      </div>
                    )}
                    {prop.is_project && (
                      <div className="preview-badge-proyecto">
                        <Layers className="w-3.5 h-3.5" />
                        Proyecto
                      </div>
                    )}
                  </div>
                  <h2 className="preview-title">{prop.titulo}</h2>
                  {(prop.codigo || prop.codigo_publico) && (
                    <div className="preview-codes">
                      {prop.codigo_publico && (
                        <span className="code-badge">#{prop.codigo_publico}</span>
                      )}
                      {prop.codigo && (
                        <span className="code-ref">Ref: {prop.codigo}</span>
                      )}
                    </div>
                  )}
                  <div className="preview-price">
                    {formatMoney(prop.precio, prop.moneda)}
                  </div>
                  <div className="preview-location">
                    <MapPin className="w-4 h-4" />
                    {[prop.sector, prop.ciudad, prop.provincia]
                      .filter(Boolean)
                      .join(', ') || 'Sin ubicación'}
                  </div>
                </div>

                {/* Características */}
                <div className="preview-features">
                  <h4>Características</h4>
                  <div className="features-grid">
                    {prop.habitaciones !== undefined && prop.habitaciones > 0 && (
                      <div className="feature-item">
                        <Bed className="w-5 h-5" />
                        <span>{prop.habitaciones} Habitaciones</span>
                      </div>
                    )}
                    {prop.banos !== undefined && prop.banos > 0 && (
                      <div className="feature-item">
                        <Bath className="w-5 h-5" />
                        <span>{prop.banos} Baños</span>
                      </div>
                    )}
                    {prop.estacionamientos !== undefined && prop.estacionamientos > 0 && (
                      <div className="feature-item">
                        <Car className="w-5 h-5" />
                        <span>{prop.estacionamientos} Parqueos</span>
                      </div>
                    )}
                    {prop.m2_construccion !== undefined && prop.m2_construccion > 0 && (
                      <div className="feature-item">
                        <Maximize className="w-5 h-5" />
                        <span>{prop.m2_construccion} m² Const.</span>
                      </div>
                    )}
                    {prop.m2_terreno !== undefined && prop.m2_terreno > 0 && (
                      <div className="feature-item">
                        <Home className="w-5 h-5" />
                        <span>{prop.m2_terreno} m² Terreno</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amenidades */}
                {prop.amenidades && prop.amenidades.length > 0 && (
                  <div className="preview-amenidades">
                    <h4><Check className="w-4 h-4" /> Amenidades</h4>
                    <div className="amenidades-grid">
                      {prop.amenidades.map((amenidad: string, idx: number) => (
                        <span key={idx} className="amenidad-tag">
                          <Check className="w-3 h-3" /> {amenidad}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Descripción (renderizar HTML) */}
                {prop.descripcion && (
                  <div className="preview-description">
                    <h4>Descripción</h4>
                    <div
                      className="description-content"
                      dangerouslySetInnerHTML={{ __html: prop.descripcion }}
                    />
                  </div>
                )}

                {/* Info de Proyecto (si es proyecto) */}
                {prop.is_project && (
                  <div className="preview-proyecto-info">
                    {/* Tipologías */}
                    {prop.tipologias && prop.tipologias.length > 0 && (
                      <div className="proyecto-section">
                        <h4><Building2 className="w-4 h-4" /> Tipologías</h4>
                        <div className="tipologias-grid">
                          {prop.tipologias.map((tip: any, idx: number) => (
                            <div key={idx} className="tipologia-card">
                              <div className="tipologia-nombre">{tip.nombre}</div>
                              <div className="tipologia-detalles">
                                {tip.habitaciones && <span><Bed className="w-3.5 h-3.5" /> {tip.habitaciones}</span>}
                                {tip.banos && <span><Bath className="w-3.5 h-3.5" /> {tip.banos}</span>}
                                {tip.m2 && <span><Maximize className="w-3.5 h-3.5" /> {tip.m2} m²</span>}
                              </div>
                              {tip.precio && (
                                <div className="tipologia-precio">
                                  {formatMoney(tip.precio, prop.moneda)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Etapas de entrega */}
                    {prop.etapas && prop.etapas.length > 0 && (
                      <div className="proyecto-section">
                        <h4><Calendar className="w-4 h-4" /> Etapas de Entrega</h4>
                        <div className="etapas-list">
                          {prop.etapas.map((etapa: any, idx: number) => (
                            <div key={idx} className="etapa-item">
                              <span className="etapa-nombre">{etapa.nombre}</span>
                              {etapa.fecha_entrega && (
                                <span className="etapa-fecha">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(etapa.fecha_entrega).toLocaleDateString('es-ES', {
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Plan de Pago */}
                    {prop.planes_pago && (
                      <div className="proyecto-section">
                        <h4><DollarSign className="w-4 h-4" /> Plan de Pago</h4>
                        <div className="proyecto-detail">
                          {typeof prop.planes_pago === 'object' && !Array.isArray(prop.planes_pago) ? (
                            <div className="plan-pago-grid">
                              {/* Reserva - puede ser reserva o reserva_valor */}
                              {(prop.planes_pago.reserva || prop.planes_pago.reserva_valor) && (
                                <div className="plan-item">
                                  <span className="plan-label">Reserva</span>
                                  <span className="plan-value">
                                    {prop.planes_pago.reserva_valor
                                      ? formatMoney(Number(prop.planes_pago.reserva_valor), prop.moneda)
                                      : `${prop.planes_pago.reserva}%`}
                                  </span>
                                </div>
                              )}
                              {/* Separación */}
                              {prop.planes_pago.separacion && (
                                <div className="plan-item">
                                  <span className="plan-label">Separación</span>
                                  <span className="plan-value">{prop.planes_pago.separacion}%</span>
                                </div>
                              )}
                              {/* Inicial - puede ser inicial o inicial_construccion */}
                              {(prop.planes_pago.inicial || prop.planes_pago.inicial_construccion) && (
                                <div className="plan-item">
                                  <span className="plan-label">Inicial</span>
                                  <span className="plan-value">
                                    {prop.planes_pago.inicial || prop.planes_pago.inicial_construccion}%
                                  </span>
                                </div>
                              )}
                              {/* Contra Entrega */}
                              {prop.planes_pago.contra_entrega && (
                                <div className="plan-item">
                                  <span className="plan-label">Contra Entrega</span>
                                  <span className="plan-value">{prop.planes_pago.contra_entrega}%</span>
                                </div>
                              )}
                              {/* Cuotas (opcional) */}
                              {prop.planes_pago.cuotas && (
                                <div className="plan-item full-width">
                                  <span className="plan-label">Cuotas</span>
                                  <span className="plan-value">{prop.planes_pago.cuotas}</span>
                                </div>
                              )}
                              {/* Descripción (opcional) */}
                              {prop.planes_pago.descripcion && (
                                <p className="plan-descripcion">{prop.planes_pago.descripcion}</p>
                              )}
                            </div>
                          ) : Array.isArray(prop.planes_pago) ? (
                            <div className="plan-pago-grid">
                              {prop.planes_pago.map((plan: any, idx: number) => (
                                <div key={idx} className="plan-item">
                                  <span className="plan-label">{plan.concepto || plan.nombre || `Pago ${idx + 1}`}</span>
                                  <span className="plan-value">
                                    {plan.porcentaje ? `${plan.porcentaje}%` : ''}
                                    {plan.monto ? formatMoney(Number(plan.monto), prop.moneda) : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Garantías */}
                    {prop.garantias && prop.garantias.length > 0 && (
                      <div className="proyecto-section">
                        <h4><Shield className="w-4 h-4" /> Garantías</h4>
                        <ul className="proyecto-list">
                          {prop.garantias.map((g: string, idx: number) => (
                            <li key={idx}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Beneficios */}
                    {prop.beneficios && prop.beneficios.length > 0 && (
                      <div className="proyecto-section">
                        <h4><Gift className="w-4 h-4" /> Beneficios</h4>
                        <ul className="proyecto-list">
                          {prop.beneficios.map((b: string, idx: number) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Disponibilidad del Proyecto - Mostrar todos los tipos configurados */}
                {prop.disponibilidad_config && (() => {
                  const config = prop.disponibilidad_config;
                  const tieneEnlace = config.enlace_url && config.enlace_url.trim();
                  const tieneArchivo = config.archivo_url && config.archivo_url.trim();
                  const tieneInventario = config.tipo === 'inventario';

                  // Si no hay ninguna configuración, no mostrar nada
                  if (!tieneEnlace && !tieneArchivo && !tieneInventario) return null;

                  // Normalizar URL para enlaces externos
                  const normalizeUrl = (url: string): string => {
                    if (!url) return '';
                    const trimmed = url.trim();
                    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                      return trimmed;
                    }
                    return `https://${trimmed}`;
                  };

                  return (
                    <div className="preview-disponibilidad">
                      <h4><Table2 className="w-4 h-4" /> Disponibilidad</h4>
                      <div className="disponibilidad-content">
                        {/* Mostrar enlace externo si existe */}
                        {tieneEnlace && (
                          <a
                            href={normalizeUrl(config.enlace_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-disponibilidad enlace"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Ver disponibilidad online
                          </a>
                        )}
                        {/* Mostrar archivo si existe */}
                        {tieneArchivo && (
                          <a
                            href={config.archivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-disponibilidad archivo"
                          >
                            <FileText className="w-4 h-4" />
                            Ver archivo de disponibilidad
                          </a>
                        )}
                        {/* Mostrar inventario si está configurado como tipo principal */}
                        {tieneInventario && (
                          <button
                            type="button"
                            onClick={() => loadInventario(prop.id, prop.nombre, prop.captador_id)}
                            className="btn-disponibilidad inventario"
                          >
                            <Table2 className="w-4 h-4" />
                            Ver inventario de unidades
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Comisiones (importante para el asesor) */}
                {(prop.comision || prop.red_global_comision) && (
                  <div className="preview-comisiones">
                    <h4><Percent className="w-4 h-4" /> Información de Comisión</h4>
                    <div className="comisiones-grid">
                      {prop.comision && (
                        <div className="comision-item">
                          <span className="comision-label">Comisión del captador</span>
                          <span className="comision-value">{prop.comision}</span>
                        </div>
                      )}
                      {prop.red_global_comision && (
                        <div className="comision-item highlight">
                          <span className="comision-label">Comisión compartida (Red Global)</span>
                          <span className="comision-value">{prop.red_global_comision}%</span>
                        </div>
                      )}
                      {prop.comision_nota && (
                        <div className="comision-nota">
                          <span className="nota-label">Nota:</span> {prop.comision_nota}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Info del captador / Red Global */}
                {isExternal && (
                  <div className="preview-red-global">
                    <Globe className="w-4 h-4" />
                    <span>Propiedad de Red Global</span>
                    {prop.tenant_nombre && (
                      <span className="inmobiliaria-tag">{prop.tenant_nombre}</span>
                    )}
                  </div>
                )}

                {/* Contacto del Captador - siempre mostrar si hay captador */}
                {(prop.captador_nombre || prop.captador_id) && (
                  <div className="preview-contacto">
                    <h4>Captador</h4>
                    <div className="contacto-card">
                      <div className="contacto-avatar">
                        {prop.captador_avatar ? (
                          <img src={prop.captador_avatar} alt="" />
                        ) : (
                          <div className="contacto-initials">
                            {(prop.captador_nombre?.[0] || '').toUpperCase()}
                            {(prop.captador_apellido?.[0] || '').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="contacto-info">
                        <span className="contacto-name">
                          {`${prop.captador_nombre || ''} ${prop.captador_apellido || ''}`.trim() || 'Sin nombre'}
                        </span>
                        {prop.captador_email && (
                          <a href={`mailto:${prop.captador_email}`} className="contacto-link">
                            <Mail className="w-4 h-4" />
                            {prop.captador_email}
                          </a>
                        )}
                        {prop.captador_telefono && (
                          <a href={`tel:${prop.captador_telefono}`} className="contacto-link">
                            <Phone className="w-4 h-4" />
                            {prop.captador_telefono}
                          </a>
                        )}
                        {!prop.captador_email && !prop.captador_telefono && (
                          <span className="contacto-sin-datos">Sin datos de contacto registrados</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contacto de la Inmobiliaria (Red Global) - usar info_negocio.contacto */}
                {isExternal && (() => {
                  const infoNegocio = prop.tenant_info_negocio || {};
                  const contacto = infoNegocio.contacto || {};
                  const inmobiliariaEmail = contacto.email || prop.tenant_email;
                  const inmobiliariaTelefono = contacto.telefono || prop.tenant_telefono;
                  const inmobiliariaNombre = infoNegocio.nombreComercial || prop.tenant_nombre;

                  if (!inmobiliariaEmail && !inmobiliariaTelefono) return null;

                  return (
                    <div className="preview-contacto inmobiliaria">
                      <h4>Contacto Inmobiliaria</h4>
                      <div className="contacto-card">
                        <div className="contacto-info">
                          {inmobiliariaNombre && <span className="contacto-name">{inmobiliariaNombre}</span>}
                          {inmobiliariaEmail && (
                            <a href={`mailto:${inmobiliariaEmail}`} className="contacto-link">
                              <Mail className="w-4 h-4" />
                              {inmobiliariaEmail}
                            </a>
                          )}
                          {inmobiliariaTelefono && (
                            <a href={`tel:${inmobiliariaTelefono}`} className="contacto-link">
                              <Phone className="w-4 h-4" />
                              {inmobiliariaTelefono}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Fechas de publicación y actualización */}
                {(prop.created_at || prop.updated_at) && (
                  <div className="preview-fechas">
                    {prop.created_at && (
                      <div className="fecha-item">
                        <Calendar className="w-4 h-4" />
                        <span className="fecha-label">Publicada:</span>
                        <span className="fecha-value">
                          {new Date(prop.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    {prop.updated_at && (
                      <div className="fecha-item">
                        <Clock className="w-4 h-4" />
                        <span className="fecha-label">Actualizada:</span>
                        <span className="fecha-value">
                          {new Date(prop.updated_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="preview-actions">
                <button
                  className={`btn-add-propuesta ${selectedPropiedades.includes(prop.id) ? 'selected' : ''}`}
                  onClick={() => {
                    togglePropiedad(previewPropiedad);
                  }}
                >
                  {selectedPropiedades.includes(prop.id) ? (
                    <>
                      <Check className="w-5 h-5" />
                      Incluida en propuesta
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Agregar a propuesta
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Inventario de Unidades */}
      {showInventarioModal && (
        <div className="inventario-modal-overlay" onClick={() => setShowInventarioModal(false)}>
          <div className="inventario-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inventario-modal-header">
              <div className="inventario-modal-title">
                <Table2 className="w-5 h-5" />
                <div>
                  <h3>Inventario de Unidades</h3>
                  <p>{inventarioPropiedad?.nombre}</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowInventarioModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="inventario-modal-content">
              {loadingInventario ? (
                <div className="inventario-loading">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p>Cargando unidades...</p>
                </div>
              ) : inventarioUnidades.length === 0 ? (
                <div className="inventario-empty">
                  <Table2 className="w-12 h-12" />
                  <p>No hay unidades registradas en el inventario</p>
                </div>
              ) : (
                <>
                  <div className="inventario-stats">
                    <div className="stat-item disponible">
                      <span className="stat-value">{inventarioUnidades.filter(u => u.estado === 'disponible').length}</span>
                      <span className="stat-label">Disponibles</span>
                    </div>
                    <div className="stat-item reservada">
                      <span className="stat-value">{inventarioUnidades.filter(u => u.estado === 'reservada').length}</span>
                      <span className="stat-label">Reservadas</span>
                    </div>
                    <div className="stat-item vendida">
                      <span className="stat-value">{inventarioUnidades.filter(u => u.estado === 'vendida').length}</span>
                      <span className="stat-label">Vendidas</span>
                    </div>
                    <div className="stat-item total">
                      <span className="stat-value">{inventarioUnidades.length}</span>
                      <span className="stat-label">Total</span>
                    </div>
                  </div>

                  <div className="inventario-table-wrapper">
                    <table className="inventario-table">
                      <thead>
                        <tr>
                          <th>Codigo</th>
                          <th>Tipologia</th>
                          <th className="num-col">Hab</th>
                          <th className="num-col">Banos</th>
                          <th className="num-col">M2</th>
                          <th className="price-col">Precio</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventarioUnidades.map((unidad) => (
                          <tr key={unidad.id} className={`estado-${unidad.estado}`}>
                            <td className="codigo-col">{unidad.codigo}</td>
                            <td>{unidad.tipologia_nombre || '-'}</td>
                            <td className="num-col">{unidad.habitaciones ?? '-'}</td>
                            <td className="num-col">{unidad.banos ?? '-'}</td>
                            <td className="num-col">{unidad.m2 ? `${Number(unidad.m2).toLocaleString()}` : '-'}</td>
                            <td className="price-col">
                              {unidad.precio
                                ? `${unidad.moneda || 'USD'} ${Number(unidad.precio).toLocaleString()}`
                                : '-'}
                            </td>
                            <td>
                              {canEditInventario() ? (
                                <select
                                  className={`estado-select ${unidad.estado}`}
                                  value={unidad.estado}
                                  onChange={(e) => cambiarEstadoUnidad(unidad.id, e.target.value)}
                                >
                                  <option value="disponible">Disponible</option>
                                  <option value="reservada">Reservada</option>
                                  <option value="vendida">Vendida</option>
                                  <option value="bloqueada">Bloqueada</option>
                                </select>
                              ) : (
                                <span className={`estado-badge ${unidad.estado}`}>
                                  {unidad.estado === 'disponible' && 'Disponible'}
                                  {unidad.estado === 'reservada' && 'Reservada'}
                                  {unidad.estado === 'vendida' && 'Vendida'}
                                  {unidad.estado === 'bloqueada' && 'Bloqueada'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .propuesta-editar {
    padding-bottom: 40px;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #64748b;
    gap: 16px;
  }

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

  .header-actions {
    display: flex;
    gap: 12px;
  }

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

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #f1f5f9;
    color: #374151;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #e2e8f0;
  }

  /* Tabs Container */
  .tabs-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .tabs {
    display: flex;
    gap: 4px;
    background: #f1f5f9;
    padding: 4px;
    border-radius: 10px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: none;
    background: transparent;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab:hover {
    color: #0f172a;
  }

  .tab.active {
    background: white;
    color: #0f172a;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: #2563eb;
    color: white;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .red-global-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-left: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #64748b;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .red-global-toggle:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .red-global-toggle input[type="checkbox"] {
    display: none;
  }

  .red-global-toggle .toggle-slider {
    position: relative;
    width: 36px;
    height: 20px;
    background: #cbd5e1;
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  .red-global-toggle .toggle-slider::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .red-global-toggle input[type="checkbox"]:checked + .toggle-slider {
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  }

  .red-global-toggle input[type="checkbox"]:checked + .toggle-slider::after {
    transform: translateX(16px);
  }

  .red-global-toggle input[type="checkbox"]:checked ~ svg {
    color: #8b5cf6;
  }

  .red-global-toggle input[type="checkbox"]:checked ~ .toggle-label {
    color: #6366f1;
    font-weight: 600;
  }

  .red-global-toggle .toggle-label {
    transition: all 0.2s ease;
  }

  /* Preview actions - botón vista previa + copiar + vistas */
  .preview-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn-copy-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #64748b;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.15s;
  }

  .btn-copy-link:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #2563eb;
  }

  .btn-copy-link svg.text-green-500 {
    color: #22c55e;
  }

  .views-badge-mini {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: #f1f5f9;
    color: #64748b;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  /* Tab Content */
  .tab-content {
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Info Tab Layout */
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 24px;
    align-items: start;
  }

  .form-main {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-sidebar {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 24px;
  }

  .form-card h3 {
    margin: 0 0 20px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
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

  .form-row {
    display: flex;
    gap: 12px;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-row .form-group.small {
    flex: 0 0 100px;
  }

  /* Selected Summary Card */
  .selected-summary {
    background: #f8fafc;
  }

  .empty-hint {
    color: #64748b;
    font-size: 0.875rem;
    margin: 0;
    line-height: 1.5;
  }

  .link-btn {
    background: none;
    border: none;
    color: #2563eb;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0;
    margin-top: 8px;
    display: inline-block;
  }

  .link-btn:hover {
    text-decoration: underline;
  }

  .selected-mini-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .selected-mini-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: white;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .mini-title {
    font-size: 0.85rem;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  .mini-price {
    font-size: 0.8rem;
    color: #059669;
    font-weight: 500;
  }

  .more-count {
    font-size: 0.8rem;
    color: #64748b;
    text-align: center;
    padding: 4px;
  }

  /* Propiedades Tab - Full Width Layout */
  .propiedades-tab-full {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 200px);
    min-height: 500px;
  }

  .props-filters-inline {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px 0;
    margin-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
  }

  .props-scroll-full {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
  }

  .pagination-inline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 16px 0 8px;
    border-top: 1px solid #e2e8f0;
    margin-top: 12px;
  }

  .pagination-inline button {
    padding: 8px 16px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #475569;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .pagination-inline button:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .pagination-inline button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-inline span {
    color: #64748b;
    font-size: 0.875rem;
  }

  /* Selected Panel List */
  .selected-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .empty-text {
    color: #94a3b8;
    font-size: 0.875rem;
    text-align: center;
    padding: 40px 20px;
    line-height: 1.5;
  }

  .empty-catalog {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #94a3b8;
    gap: 12px;
  }

  .selected-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    margin-bottom: 8px;
  }

  .selected-item:last-child {
    margin-bottom: 0;
  }

  .selected-image {
    width: 56px;
    height: 42px;
    border-radius: 6px;
    overflow: hidden;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .selected-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .selected-info {
    flex: 1;
    min-width: 0;
  }

  .selected-title {
    display: block;
    font-weight: 500;
    color: #0f172a;
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .selected-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 2px;
  }

  .selected-meta .code {
    background: #e2e8f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
  }

  .btn-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .btn-remove:hover {
    background: #fef2f2;
    color: #dc2626;
  }

  /* Catalog Panel - Filtros */
  .props-filters {
    display: flex;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1;
    min-width: 200px;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  .search-box input {
    width: 100%;
    padding: 10px 14px 10px 38px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    background: white;
    transition: all 0.2s;
  }

  .search-box input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .filter-select {
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    background: white;
    min-width: 140px;
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: #2563eb;
  }

  .props-scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .loading-small {
    display: flex;
    justify-content: center;
    padding: 60px;
    color: #64748b;
  }

  /* Props Grid - Tarjetas compactas */
  .props-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;
  }

  .prop-card {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
  }

  .prop-card:hover {
    border-color: #94a3b8;
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  .prop-card.selected {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  }

  .prop-image {
    position: relative;
    height: 120px;
    background: #f1f5f9;
    overflow: hidden;
  }

  .prop-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .prop-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
  }

  .prop-operacion {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 3px 8px;
    background: #2563eb;
    color: white;
    border-radius: 12px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .prop-check {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    background: #2563eb;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
  }

  .prop-card.selected .prop-operacion {
    display: none;
  }

  .badge-destacada {
    position: absolute;
    bottom: 8px;
    left: 8px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .prop-body {
    padding: 10px 12px;
  }

  .prop-type-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .prop-type {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: #64748b;
    text-transform: capitalize;
  }

  /* Captador info inline en la fila de tipo */
  .captador-inline {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .captador-avatar-sm {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    border: 1.5px solid white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }

  .captador-initials-sm {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.55rem;
    font-weight: 600;
    color: #64748b;
    border: 1.5px solid white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }

  .captador-inline .inmobiliaria-name {
    font-size: 0.7rem;
    color: #6366f1;
    font-weight: 500;
    max-width: 100px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .prop-title {
    margin: 0 0 3px 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .prop-subtitle {
    margin: 0 0 6px 0;
    font-size: 0.75rem;
    color: #64748b;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .prop-codes {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  .prop-code {
    font-size: 0.75rem;
    color: #2563eb;
    background: #dbeafe;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 500;
  }

  .prop-code.ref {
    color: #64748b;
    background: #f1f5f9;
  }

  .prop-price {
    font-size: 1rem;
    font-weight: 700;
    color: #059669;
    margin-bottom: 6px;
  }

  .prop-location {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 8px;
  }

  .prop-features {
    display: flex;
    gap: 10px;
    padding-top: 8px;
    border-top: 1px solid #f1f5f9;
    flex-shrink: 0;
  }

  .prop-features span {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.75rem;
    color: #64748b;
  }

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
  }

  .pagination button {
    padding: 10px 20px;
    border: 1px solid #e2e8f0;
    background: white;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .pagination button:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #94a3b8;
  }

  .pagination button:disabled {
    color: #94a3b8;
    cursor: not-allowed;
  }

  .pagination span {
    font-size: 0.875rem;
    color: #64748b;
  }

  @media (max-width: 1400px) {
    .props-grid {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    }
  }

  @media (max-width: 1200px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
    .propiedades-tab-full {
      height: auto;
      min-height: 400px;
    }

    .props-filters-inline {
      flex-direction: column;
    }

    .filter-select {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .tabs-container {
      flex-direction: column;
      align-items: stretch;
    }

    .form-row {
      flex-direction: column;
    }

    .props-grid {
      grid-template-columns: 1fr;
    }

    .header-actions {
      flex-direction: column;
    }
  }

  /* Botón Vista Previa */
  .btn-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);
  }

  .btn-preview:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
  }

  .btn-preview:disabled {
    background: #94a3b8;
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }

  /* Tab Seleccionadas */
  .seleccionadas-tab {
    padding: 0;
  }

  .seleccionadas-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    margin-bottom: 24px;
  }

  .seleccionadas-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .seleccionadas-count {
    font-size: 0.9rem;
    color: #64748b;
    background: #f1f5f9;
    padding: 6px 14px;
    border-radius: 20px;
  }

  .empty-seleccionadas {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 40px;
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    color: #94a3b8;
    gap: 16px;
  }

  .empty-seleccionadas h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #64748b;
  }

  .empty-seleccionadas p {
    margin: 0;
    color: #94a3b8;
  }

  .seleccionadas-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .seleccionada-card {
    display: grid;
    grid-template-columns: 50px 200px 1fr auto;
    gap: 20px;
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 16px;
    align-items: center;
    transition: all 0.2s;
  }

  .seleccionada-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #cbd5e1;
  }

  .seleccionada-number {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
  }

  .seleccionada-image {
    position: relative;
    width: 180px;
    height: 120px;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .seleccionada-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .seleccionada-placeholder {
    width: 100%;
    height: 100%;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
  }

  .seleccionada-operacion {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 10px;
    background: #2563eb;
    color: white;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .seleccionada-body {
    flex: 1;
    min-width: 0;
  }

  .seleccionada-tipo {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 6px;
    text-transform: capitalize;
  }

  .seleccionada-titulo {
    margin: 0 0 6px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .seleccionada-codes {
    margin-bottom: 8px;
  }

  .seleccionada-codes .code {
    font-size: 0.75rem;
    color: #64748b;
    background: #f1f5f9;
    padding: 3px 8px;
    border-radius: 4px;
  }

  .seleccionada-precio {
    font-size: 1.25rem;
    font-weight: 700;
    color: #059669;
    margin-bottom: 8px;
  }

  .seleccionada-ubicacion {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 12px;
  }

  .seleccionada-features {
    display: flex;
    gap: 16px;
    font-size: 0.85rem;
    color: #64748b;
  }

  .seleccionada-features span {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .seleccionada-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .btn-remove-selec {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: 8px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-remove-selec:hover {
    background: #fee2e2;
    border-color: #f87171;
  }

  /* Modal Vista Previa */
  .preview-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  }

  .preview-modal {
    position: relative;
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: scale(0.95) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .preview-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    transition: all 0.15s;
    color: #64748b;
  }

  .preview-close:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  .preview-content {
    max-height: 90vh;
    overflow-y: auto;
    padding: 0;
  }

  .preview-header {
    padding: 40px 40px 30px;
    text-align: center;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid #e2e8f0;
  }

  .preview-logo {
    max-height: 60px;
    max-width: 200px;
    object-fit: contain;
  }

  .preview-logo-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #64748b;
  }

  .preview-logo-placeholder span {
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
  }

  .preview-greeting {
    padding: 30px 40px;
    text-align: center;
    background: white;
  }

  .preview-greeting h1 {
    margin: 0 0 12px 0;
    font-size: 1.75rem;
    font-weight: 600;
    color: #0f172a;
  }

  .preview-greeting p {
    margin: 0;
    font-size: 1rem;
    color: #64748b;
  }

  .preview-proposal-info {
    padding: 30px 40px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
  }

  .preview-proposal-info h2 {
    margin: 0 0 16px 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #0f172a;
    text-align: center;
  }

  .preview-description {
    margin: 0 0 20px 0;
    font-size: 1rem;
    color: #475569;
    text-align: center;
    line-height: 1.6;
  }

  .preview-meta {
    display: flex;
    justify-content: center;
    gap: 40px;
    flex-wrap: wrap;
  }

  .preview-meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
  }

  .preview-meta-item .label {
    color: #64748b;
  }

  .preview-meta-item .value {
    color: #0f172a;
    font-weight: 600;
  }

  .preview-meta-item .value.precio {
    font-size: 1.25rem;
    color: #059669;
  }

  .preview-properties {
    padding: 40px;
  }

  .preview-properties h3 {
    margin: 0 0 24px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
    text-align: center;
  }

  .preview-props-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .preview-prop-card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    transition: all 0.2s;
  }

  .preview-prop-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .preview-prop-image {
    position: relative;
    aspect-ratio: 16/10;
    background: #f1f5f9;
  }

  .preview-prop-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-prop-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
  }

  .preview-prop-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 4px 10px;
    background: #2563eb;
    color: white;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .preview-prop-body {
    padding: 16px;
  }

  .preview-prop-body h4 {
    margin: 0 0 8px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.3;
  }

  .preview-prop-price {
    font-size: 1.1rem;
    font-weight: 700;
    color: #059669;
    margin-bottom: 8px;
  }

  .preview-prop-location {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 10px;
  }

  .preview-prop-features {
    display: flex;
    gap: 12px;
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 14px;
    padding-bottom: 14px;
    border-bottom: 1px solid #f1f5f9;
  }

  .preview-prop-features span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .preview-prop-actions {
    display: flex;
    gap: 8px;
  }

  .preview-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .preview-btn:hover {
    background: #1d4ed8;
  }

  .preview-btn.secondary {
    background: #f1f5f9;
    color: #475569;
  }

  .preview-btn.secondary:hover {
    background: #e2e8f0;
  }

  .preview-conditions {
    padding: 30px 40px;
    background: #fffbeb;
    border-top: 1px solid #fef3c7;
    border-bottom: 1px solid #fef3c7;
  }

  .preview-conditions h4 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #92400e;
  }

  .preview-conditions p {
    margin: 0;
    font-size: 0.9rem;
    color: #78350f;
    line-height: 1.6;
  }

  .preview-cta {
    padding: 40px;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    text-align: center;
  }

  .preview-cta h4 {
    margin: 0 0 24px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
  }

  .preview-cta-buttons {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .cta-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 24px;
    border: none;
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cta-btn.primary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .cta-btn.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
  }

  .cta-btn.secondary {
    background: white;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .cta-btn.secondary:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .cta-btn.whatsapp {
    background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
  }

  .cta-btn.whatsapp:hover {
    transform: translateY(-2px);
  }

  .cta-btn.email {
    background: white;
    color: #2563eb;
    border: 1px solid #2563eb;
  }

  .cta-btn.email:hover {
    background: #eff6ff;
  }

  .preview-footer {
    padding: 24px 40px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    text-align: center;
  }

  .preview-footer p {
    margin: 0 0 12px 0;
    font-size: 0.85rem;
    color: #64748b;
  }

  .preview-footer a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #2563eb;
    font-size: 0.85rem;
    text-decoration: none;
  }

  .preview-footer a:hover {
    text-decoration: underline;
  }

  @media (max-width: 900px) {
    .seleccionada-card {
      grid-template-columns: 40px 1fr;
      gap: 16px;
    }

    .seleccionada-image {
      grid-column: 1 / -1;
      width: 100%;
      height: 180px;
    }

    .seleccionada-body {
      grid-column: 2;
    }

    .seleccionada-actions {
      grid-column: 1 / -1;
      flex-direction: row;
    }
  }

  @media (max-width: 768px) {
    .preview-modal {
      max-height: 100vh;
      border-radius: 0;
    }

    .preview-header,
    .preview-greeting,
    .preview-proposal-info,
    .preview-properties,
    .preview-conditions,
    .preview-cta,
    .preview-footer {
      padding: 24px 20px;
    }

    .preview-props-grid {
      grid-template-columns: 1fr;
    }

    .preview-cta-buttons {
      flex-direction: column;
    }

    .cta-btn {
      justify-content: center;
    }
  }

  /* ============================================
     CHECKBOX EN TARJETAS DE PROPIEDADES
     ============================================ */
  .prop-checkbox {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 18px;
    height: 18px;
    background: white;
    border: 1.5px solid #cbd5e1;
    border-radius: 3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    z-index: 10;
  }

  .prop-checkbox:hover {
    border-color: #2563eb;
  }

  .prop-checkbox input {
    display: none;
  }

  .prop-checkbox.checked {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .prop-card:hover .prop-checkbox {
    opacity: 1;
  }

  /* ============================================
     PANEL LATERAL DE PREVIEW DE PROPIEDAD
     ============================================ */
  .preview-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: flex-end;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .preview-panel {
    width: 560px;
    max-width: 100%;
    height: 100%;
    background: white;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .preview-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .btn-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: #64748b;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-close:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  .preview-content {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }

  /* Carrusel de imágenes */
  .preview-image-carousel {
    position: relative;
    width: 100%;
    aspect-ratio: 16/10;
    background: #f1f5f9;
    overflow: hidden;
  }

  .preview-image-carousel img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s ease;
  }

  .preview-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
  }

  .carousel-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 10;
  }

  .carousel-btn:hover {
    background: white;
    transform: translateY(-50%) scale(1.1);
  }

  .carousel-btn.prev { left: 12px; }
  .carousel-btn.next { right: 12px; }

  .carousel-btn svg {
    color: #374151;
  }

  .carousel-dots {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 10;
  }

  .carousel-dots .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .carousel-dots .dot.active {
    background: white;
    transform: scale(1.2);
  }

  .carousel-dots .dot:hover {
    background: white;
  }

  .image-counter {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    z-index: 10;
  }

  .preview-badges-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .preview-badge-destacada {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: #fbbf24;
    color: #78350f;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .preview-badge-proyecto {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: #8b5cf6;
    color: white;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .preview-info {
    padding: 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .preview-operation {
    display: inline-block;
    padding: 4px 12px;
    background: #2563eb;
    color: white;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
    margin-bottom: 12px;
  }

  .preview-title {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.3;
  }

  .preview-codes {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .preview-codes .code-badge {
    font-size: 0.8rem;
    color: #2563eb;
    background: #dbeafe;
    padding: 3px 10px;
    border-radius: 4px;
    font-weight: 500;
  }

  .preview-codes .code-ref {
    font-size: 0.8rem;
    color: #64748b;
    background: #f1f5f9;
    padding: 3px 10px;
    border-radius: 4px;
  }

  .preview-price {
    font-size: 1.5rem;
    font-weight: 700;
    color: #059669;
    margin-bottom: 8px;
  }

  .preview-location {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: #64748b;
  }

  .preview-features {
    padding: 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .preview-features h4,
  .preview-description h4,
  .preview-captador h4 {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: #f8fafc;
    border-radius: 8px;
    font-size: 0.85rem;
    color: #374151;
  }

  .feature-item svg {
    color: #64748b;
  }

  .preview-description {
    padding: 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .preview-description .description-content {
    font-size: 0.9rem;
    color: #4b5563;
    line-height: 1.6;
    max-height: 200px;
    overflow-y: auto;
  }

  .preview-description .description-content p {
    margin: 0 0 12px 0;
  }

  .preview-description .description-content p:last-child {
    margin-bottom: 0;
  }

  .preview-description .description-content ul,
  .preview-description .description-content ol {
    margin: 0 0 12px 0;
    padding-left: 20px;
  }

  .preview-description .description-content li {
    margin-bottom: 4px;
  }

  .preview-description .description-content strong,
  .preview-description .description-content b {
    font-weight: 600;
  }

  .preview-description .description-content a {
    color: #2563eb;
    text-decoration: none;
  }

  .preview-description .description-content a:hover {
    text-decoration: underline;
  }

  /* Estilos de Proyecto */
  .preview-proyecto-info {
    border-bottom: 1px solid #f1f5f9;
  }

  .proyecto-section {
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .proyecto-section:last-child {
    border-bottom: none;
  }

  .proyecto-section h4 {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .proyecto-section h4 svg {
    color: #8b5cf6;
  }

  .plan-pago-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .plan-item {
    background: #f8fafc;
    padding: 10px 12px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .plan-label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .plan-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #0f172a;
  }

  .plan-descripcion {
    grid-column: 1 / -1;
    margin: 8px 0 0 0;
    font-size: 0.85rem;
    color: #64748b;
    line-height: 1.5;
  }

  .proyecto-list {
    margin: 0;
    padding-left: 20px;
    list-style: disc;
  }

  .proyecto-list li {
    font-size: 0.85rem;
    color: #4b5563;
    margin-bottom: 6px;
    line-height: 1.4;
  }

  /* Estilos de Disponibilidad */
  .preview-disponibilidad {
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%);
  }

  .preview-disponibilidad h4 {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #2563eb;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .preview-disponibilidad h4 svg {
    color: #2563eb;
  }

  .disponibilidad-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .btn-disponibilidad {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .btn-disponibilidad.enlace {
    background: #2563eb;
    color: white;
    border: none;
  }

  .btn-disponibilidad.enlace:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  }

  .btn-disponibilidad.archivo {
    background: white;
    color: #2563eb;
    border: 1px solid #2563eb;
  }

  .btn-disponibilidad.archivo:hover {
    background: #eff6ff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
  }

  .inventario-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .inventario-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #dbeafe;
    color: #1e40af;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    width: fit-content;
  }

  .inventario-note {
    font-size: 0.8rem;
    color: #64748b;
    margin: 0;
    line-height: 1.4;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 6px;
  }

  .btn-disponibilidad.inventario {
    background: #059669;
    color: white;
    border: none;
  }

  .btn-disponibilidad.inventario:hover {
    background: #047857;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
  }

  /* Modal de Inventario */
  .inventario-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .inventario-modal {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 900px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: modalIn 0.2s ease-out;
  }

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .inventario-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
    background: linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%);
    border-radius: 16px 16px 0 0;
  }

  .inventario-modal-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .inventario-modal-title svg {
    color: #059669;
  }

  .inventario-modal-title h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #0f172a;
  }

  .inventario-modal-title p {
    margin: 2px 0 0 0;
    font-size: 0.875rem;
    color: #64748b;
  }

  .inventario-modal-header .close-btn {
    padding: 8px;
    border: none;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .inventario-modal-header .close-btn:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  .inventario-modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .inventario-loading,
  .inventario-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #64748b;
    gap: 12px;
  }

  .inventario-loading svg,
  .inventario-empty svg {
    color: #cbd5e1;
  }

  .inventario-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .inventario-stats .stat-item {
    padding: 16px;
    border-radius: 12px;
    text-align: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }

  .inventario-stats .stat-item.disponible {
    background: #ecfdf5;
    border-color: #a7f3d0;
  }

  .inventario-stats .stat-item.reservada {
    background: #fef3c7;
    border-color: #fcd34d;
  }

  .inventario-stats .stat-item.vendida {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .inventario-stats .stat-item.total {
    background: #dbeafe;
    border-color: #93c5fd;
  }

  .inventario-stats .stat-value {
    display: block;
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .inventario-stats .stat-item.disponible .stat-value { color: #059669; }
  .inventario-stats .stat-item.reservada .stat-value { color: #d97706; }
  .inventario-stats .stat-item.vendida .stat-value { color: #64748b; }
  .inventario-stats .stat-item.total .stat-value { color: #2563eb; }

  .inventario-stats .stat-label {
    font-size: 0.8rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .inventario-table-wrapper {
    overflow-x: auto;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }

  .inventario-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .inventario-table th {
    background: #f8fafc;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }

  .inventario-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }

  .inventario-table tr:last-child td {
    border-bottom: none;
  }

  .inventario-table tr:hover {
    background: #f8fafc;
  }

  .inventario-table .codigo-col {
    font-weight: 600;
    color: #0f172a;
  }

  .inventario-table .num-col {
    text-align: center;
    width: 60px;
  }

  .inventario-table .price-col {
    text-align: right;
    font-weight: 500;
    white-space: nowrap;
  }

  .inventario-table .estado-badge {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .inventario-table .estado-badge.disponible {
    background: #ecfdf5;
    color: #059669;
  }

  .inventario-table .estado-badge.reservada {
    background: #fef3c7;
    color: #d97706;
  }

  .inventario-table .estado-badge.vendida {
    background: #f1f5f9;
    color: #64748b;
  }

  .inventario-table .estado-badge.bloqueada {
    background: #fee2e2;
    color: #dc2626;
  }

  .inventario-table .estado-select {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid #e2e8f0;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .inventario-table .estado-select:hover {
    border-color: #cbd5e1;
  }

  .inventario-table .estado-select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  .inventario-table .estado-select.disponible {
    background: #ecfdf5;
    color: #059669;
    border-color: #a7f3d0;
  }

  .inventario-table .estado-select.reservada {
    background: #fef3c7;
    color: #d97706;
    border-color: #fcd34d;
  }

  .inventario-table .estado-select.vendida {
    background: #f1f5f9;
    color: #64748b;
    border-color: #cbd5e1;
  }

  .inventario-table .estado-select.bloqueada {
    background: #fee2e2;
    color: #dc2626;
    border-color: #fca5a5;
  }

  .inventario-table tr.estado-vendida {
    opacity: 0.6;
  }

  @media (max-width: 640px) {
    .inventario-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .inventario-modal {
      max-height: 90vh;
    }
  }

  /* Estilos de Comisiones */
  .preview-comisiones {
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%);
  }

  .preview-comisiones h4 {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #059669;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .preview-comisiones h4 svg {
    color: #059669;
  }

  .comisiones-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .comision-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .comision-item.highlight {
    background: #ecfdf5;
    border-color: #10b981;
  }

  .comision-label {
    font-size: 0.85rem;
    color: #4b5563;
  }

  .comision-value {
    font-size: 0.95rem;
    font-weight: 600;
    color: #059669;
  }

  .comision-nota {
    font-size: 0.8rem;
    color: #64748b;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 6px;
    line-height: 1.4;
  }

  .comision-nota .nota-label {
    font-weight: 600;
    color: #475569;
  }

  /* Estilos de Contacto */
  .preview-contacto {
    padding: 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .preview-contacto h4 {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .contacto-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 14px;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .contacto-avatar {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }

  .contacto-avatar img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }

  .contacto-initials {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 600;
    color: #64748b;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }

  .contacto-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .contacto-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
  }

  .contacto-link {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: #2563eb;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .contacto-link:hover {
    text-decoration: underline;
  }

  .contacto-link svg {
    color: #64748b;
    flex-shrink: 0;
  }

  .contacto-sin-datos {
    font-size: 0.8rem;
    color: #94a3b8;
    font-style: italic;
  }

  .preview-contacto.inmobiliaria {
    background: #f0f9ff;
  }

  .preview-contacto.inmobiliaria h4 {
    color: #0369a1;
  }

  /* Estilos de Amenidades */
  .preview-amenidades {
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .preview-amenidades h4 {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .preview-amenidades h4 svg {
    color: #10b981;
  }

  .amenidades-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .amenidad-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: #f0fdf4;
    color: #166534;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid #bbf7d0;
  }

  .amenidad-tag svg {
    color: #16a34a;
  }

  /* Estilos de Tipologías */
  .tipologias-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }

  .tipologia-card {
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .tipologia-nombre {
    font-weight: 600;
    font-size: 0.85rem;
    color: #0f172a;
    margin-bottom: 6px;
  }

  .tipologia-detalles {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 0.75rem;
    color: #64748b;
  }

  .tipologia-detalles span {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .tipologia-precio {
    margin-top: 8px;
    font-weight: 600;
    font-size: 0.85rem;
    color: #059669;
  }

  /* Estilos de Etapas */
  .etapas-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .etapa-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 6px;
    border-left: 3px solid #3b82f6;
  }

  .etapa-nombre {
    font-weight: 500;
    font-size: 0.85rem;
    color: #0f172a;
  }

  .etapa-fecha {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: #64748b;
  }

  /* Estilos de Fechas */
  .preview-fechas {
    padding: 16px 20px;
    background: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .fecha-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
  }

  .fecha-item svg {
    color: #94a3b8;
    flex-shrink: 0;
  }

  .fecha-label {
    color: #64748b;
  }

  .fecha-value {
    color: #374151;
    font-weight: 500;
  }

  /* Estilos adicionales de Plan de Pago */
  .plan-item.full-width {
    grid-column: 1 / -1;
  }

  .preview-red-global {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
    border-left: 3px solid #8b5cf6;
    font-size: 0.85rem;
    color: #6366f1;
    font-weight: 500;
  }

  .preview-red-global .inmobiliaria-tag {
    background: #8b5cf6;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    margin-left: auto;
  }

  .preview-captador {
    padding: 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .captador-detail {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .captador-avatar-lg {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }

  .captador-initials-lg {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }

  .captador-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: #0f172a;
  }

  .preview-actions {
    padding: 16px 20px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .btn-add-propuesta {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add-propuesta:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  .btn-add-propuesta.selected {
    background: #059669;
  }

  .btn-add-propuesta.selected:hover {
    background: #047857;
  }

  @media (max-width: 500px) {
    .preview-panel {
      width: 100%;
    }
  }
`;
