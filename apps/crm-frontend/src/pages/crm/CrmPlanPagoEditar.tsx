/**
 * CrmPlanPagoEditar - Página para crear/editar planes de pago
 *
 * Estructura con Tabs:
 * - Tab 1: Información (propiedad, contacto, título)
 * - Tab 2: Plan de Pago (desglose de pagos con cálculos)
 * - Tab 3: Vista Previa
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import DatePicker from '../../components/DatePicker';
import ContactPicker from '../../components/ContactPicker';
import PropertyPicker from '../../components/PropertyPicker';
import {
  getPlanPago,
  createPlanPago,
  updatePlanPago,
  getPropiedadesCrm,
  getContactos,
  getSolicitudes,
  getTenantConfiguracion,
  PlanPago,
  PlanDetalle,
  Propiedad,
  PropiedadFiltros,
  Contacto,
  Solicitud,
} from '../../services/api';
import {
  Save,
  ArrowLeft,
  Loader2,
  Eye,
  Copy,
  CheckCircle,
  ExternalLink,
  Clock,
  Home,
  CreditCard,
  Landmark,
  Banknote,
  Info,
  DollarSign,
  Calculator,
} from 'lucide-react';

// Estados de plan de pago
const ESTADOS: Record<string, { label: string; color: string; bgColor: string }> = {
  borrador: { label: 'Borrador', color: '#64748b', bgColor: '#f1f5f9' },
  enviado: { label: 'Enviado', color: '#2563eb', bgColor: '#dbeafe' },
  visto: { label: 'Visto', color: '#7c3aed', bgColor: '#f3e8ff' },
  aceptado: { label: 'Aceptado', color: '#16a34a', bgColor: '#dcfce7' },
  rechazado: { label: 'Rechazado', color: '#dc2626', bgColor: '#fef2f2' },
};

type TabType = 'info' | 'plan' | 'preview';

export default function CrmPlanPagoEditar() {
  const { tenantSlug, planId } = useParams<{ tenantSlug: string; planId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const isNew = !planId || planId === 'nuevo';

  // Tab activo
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Estado del formulario
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    precio_total: '',
    moneda: 'USD',
    condiciones: '',
    notas_internas: '',
    contacto_id: '',
    solicitud_id: '',
    propiedad_id: '',
    fecha_expiracion: '',
    estado: 'borrador',
  });

  // Plan de pago detalle
  const [planDetalle, setPlanDetalle] = useState<PlanDetalle>({
    reserva: { tipo: 'porcentaje', valor: 0 },
    separacion: { tipo: 'porcentaje', valor: 0 },
    inicial: { tipo: 'porcentaje', valor: 0, cuotas: 1 },
    contra_entrega: { tipo: 'porcentaje', valor: 0 },
    financiamiento: { tipo: 'bancario', porcentaje: 0 },
  });

  // Estado del plan (para edición)
  const [plan, setPlan] = useState<PlanPago | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Dominio personalizado del tenant para URL pública
  const [dominioPersonalizado, setDominioPersonalizado] = useState<string | null>(null);

  // Datos para selectores
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loadingContactos, setLoadingContactos] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: isNew ? 'Nuevo Plan de Pago' : 'Editar Plan de Pago',
      subtitle: isNew ? 'Crea un nuevo plan de pago para un cliente' : `Editando: ${plan?.titulo || ''}`,
      actions: (
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate(`/crm/${tenantSlug}/planes-pago`)}>
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
  }, [setPageHeader, isNew, plan, form.titulo, saving, tenantSlug]);

  // Cargar plan existente
  useEffect(() => {
    if (!isNew && tenantActual?.id && planId) {
      loadPlan();
    }
  }, [isNew, tenantActual?.id, planId]);

  // Cargar propiedades
  useEffect(() => {
    if (tenantActual?.id) {
      loadPropiedades();
    }
  }, [tenantActual?.id]);

  // Cargar contactos y solicitudes
  useEffect(() => {
    if (tenantActual?.id) {
      loadContactos();
      loadSolicitudes();
    }
  }, [tenantActual?.id]);

  // Pre-cargar desde query params
  useEffect(() => {
    const contactoIdParam = searchParams.get('contacto_id');
    const propiedadIdParam = searchParams.get('propiedad_id');
    if (contactoIdParam && isNew) {
      setForm(prev => ({ ...prev, contacto_id: contactoIdParam }));
    }
    if (propiedadIdParam && isNew) {
      setForm(prev => ({ ...prev, propiedad_id: propiedadIdParam }));
    }
  }, [searchParams, isNew]);

  // Cargar dominio personalizado del tenant
  useEffect(() => {
    const loadTenantConfig = async () => {
      if (!tenantActual?.id) return;
      try {
        const config = await getTenantConfiguracion(tenantActual.id);
        setDominioPersonalizado(config.dominio_personalizado);
      } catch (err) {
        console.error('Error cargando configuración del tenant:', err);
      }
    };
    loadTenantConfig();
  }, [tenantActual?.id]);

  const loadPlan = async () => {
    if (!tenantActual?.id || !planId) return;

    try {
      setLoading(true);
      const data = await getPlanPago(tenantActual.id, planId);
      setPlan(data);

      // Poblar formulario
      setForm({
        titulo: data.titulo || '',
        descripcion: data.descripcion || '',
        precio_total: data.precio_total?.toString() || '',
        moneda: data.moneda || 'USD',
        condiciones: data.condiciones || '',
        notas_internas: data.notas_internas || '',
        contacto_id: data.contacto_id || '',
        solicitud_id: data.solicitud_id || '',
        propiedad_id: data.propiedad_id || '',
        fecha_expiracion: data.fecha_expiracion?.slice(0, 10) || '',
        estado: data.estado || 'borrador',
      });

      // Poblar plan detalle
      if (data.plan_detalle) {
        setPlanDetalle(data.plan_detalle);
      }
    } catch (err: any) {
      console.error('Error cargando plan:', err);
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
        estado_propiedad: 'disponible',
        limit: 100,
      };

      const response = await getPropiedadesCrm(tenantActual.id, filtros);
      setPropiedades(response.data);
    } catch (err: any) {
      console.error('Error cargando propiedades:', err);
    } finally {
      setLoadingProps(false);
    }
  }, [tenantActual?.id, form.propiedad_id]);

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
      const response = await getSolicitudes(tenantActual.id);
      setSolicitudes(response.data);
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
    }
  };

  // Handler para selección de propiedad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePropiedadChange = (propiedadId: string | null, propiedad?: any) => {
    setForm(prev => ({ ...prev, propiedad_id: propiedadId || '' }));

    if (propiedad) {
      // Auto-poblar precio y título si están vacíos
      if (!form.precio_total && propiedad.precio) {
        setForm(prev => ({
          ...prev,
          precio_total: propiedad.precio?.toString() || '',
          moneda: propiedad.moneda || 'USD',
        }));
      }
      if (!form.titulo) {
        setForm(prev => ({
          ...prev,
          titulo: `Plan de Pago - ${propiedad.titulo}`,
        }));
      }
    }
  };

  // Guardar plan
  const handleSave = async () => {
    if (!tenantActual?.id || !form.titulo.trim()) return;

    try {
      setSaving(true);
      setError(null);

      // Si el estado actual es borrador y el usuario da clic en Guardar,
      // cambiar automáticamente a "enviado" (lista para compartir)
      const estadoFinal = form.estado === 'borrador' ? 'enviado' : form.estado;

      const data = {
        titulo: form.titulo,
        descripcion: form.descripcion || undefined,
        precio_total: form.precio_total ? parseFloat(form.precio_total) : undefined,
        moneda: form.moneda,
        plan_detalle: planDetalle,
        condiciones: form.condiciones || undefined,
        notas_internas: form.notas_internas || undefined,
        contacto_id: form.contacto_id || undefined,
        solicitud_id: form.solicitud_id || undefined,
        propiedad_id: form.propiedad_id || undefined,
        fecha_expiracion: form.fecha_expiracion || undefined,
        estado: estadoFinal,
      };

      if (isNew) {
        const created = await createPlanPago(tenantActual.id, data as any);
        navigate(`/crm/${tenantSlug}/planes-pago/${created.id}`);
      } else if (planId) {
        const updated = await updatePlanPago(tenantActual.id, planId, data as any);
        setPlan(updated);
        setForm(prev => ({ ...prev, estado: estadoFinal }));
      }
    } catch (err: any) {
      console.error('Error guardando plan:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Generar URL pública completa
  const getUrlPublicaCompleta = () => {
    if (!plan?.url_publica) return null;

    if (dominioPersonalizado) {
      let dominio = dominioPersonalizado
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
      return `https://${dominio}/plan-pago/${plan.url_publica}`;
    }

    if (!tenantSlug) return null;
    return `https://${tenantSlug}.clic.casa/plan-pago/${plan.url_publica}`;
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

  // Calcular valores del plan
  const valoresCalculados = useMemo(() => {
    const precioTotal = parseFloat(form.precio_total) || 0;
    if (precioTotal === 0) return null;

    const calcularMonto = (item: { tipo: 'porcentaje' | 'valor'; valor: number } | undefined): number => {
      if (!item) return 0;
      return item.tipo === 'porcentaje'
        ? (precioTotal * item.valor) / 100
        : item.valor;
    };

    const reserva = calcularMonto(planDetalle.reserva);
    const separacion = calcularMonto(planDetalle.separacion);
    const inicial = calcularMonto(planDetalle.inicial);
    const contraEntrega = calcularMonto(planDetalle.contra_entrega);
    const financiamiento = planDetalle.financiamiento
      ? (precioTotal * planDetalle.financiamiento.porcentaje) / 100
      : 0;

    const total = reserva + separacion + inicial + contraEntrega + financiamiento;
    const porcentajeTotal = precioTotal > 0 ? (total / precioTotal) * 100 : 0;

    return {
      reserva,
      separacion,
      inicial,
      contraEntrega,
      financiamiento,
      total,
      porcentajeTotal,
      diferencia: precioTotal - total,
    };
  }, [form.precio_total, planDetalle]);

  // Formatear moneda
  const formatMoney = (value: number | undefined, moneda: string = 'USD') => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Actualizar plan detalle
  const updatePlanItem = (key: keyof PlanDetalle, field: string, value: any) => {
    setPlanDetalle(prev => {
      if (key === 'financiamiento') {
        return {
          ...prev,
          financiamiento: {
            ...prev.financiamiento,
            tipo: prev.financiamiento?.tipo || 'bancario',
            porcentaje: prev.financiamiento?.porcentaje || 0,
            [field]: value,
          },
        };
      }
      return {
        ...prev,
        [key]: {
          ...(prev[key] as any),
          [field]: value,
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p>Cargando plan de pago...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <Info size={16} />
          Información
        </button>
        <button
          className={`tab ${activeTab === 'plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('plan')}
        >
          <Calculator size={16} />
          Plan de Pago
        </button>
        <button
          className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={16} />
          Vista Previa
        </button>
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="tab-content">
          <div className="form-section">
            <h3 className="section-title">Datos del Plan</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Título del Plan *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ej: Plan de Pago - Casa en Zona Norte"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Propiedad</label>
                <PropertyPicker
                  value={form.propiedad_id}
                  onChange={handlePropiedadChange}
                  properties={propiedades}
                  loading={loadingProps}
                  placeholder="Seleccionar propiedad"
                />
              </div>
            </div>

            <div className="form-row two-cols">
              <div className="form-group">
                <label>Precio Total</label>
                <div className="input-with-addon">
                  <select
                    value={form.moneda}
                    onChange={(e) => setForm(prev => ({ ...prev, moneda: e.target.value }))}
                    className="addon-select"
                  >
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                  </select>
                  <input
                    type="number"
                    value={form.precio_total}
                    onChange={(e) => setForm(prev => ({ ...prev, precio_total: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Fecha de Expiración</label>
                <DatePicker
                  value={form.fecha_expiracion}
                  onChange={(date) => setForm(prev => ({ ...prev, fecha_expiracion: date || '' }))}
                  placeholder="Sin fecha límite"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción opcional del plan de pago..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Cliente</h3>

            <div className="form-row two-cols">
              <div className="form-group">
                <label>Contacto</label>
                <ContactPicker
                  value={form.contacto_id}
                  onChange={(contactoId) => setForm(prev => ({ ...prev, contacto_id: contactoId || '' }))}
                  contacts={contactos}
                  loading={loadingContactos}
                  placeholder="Seleccionar contacto"
                />
              </div>
              <div className="form-group">
                <label>Solicitud (opcional)</label>
                <select
                  value={form.solicitud_id}
                  onChange={(e) => setForm(prev => ({ ...prev, solicitud_id: e.target.value }))}
                >
                  <option value="">Sin vincular a solicitud</option>
                  {solicitudes.map(sol => (
                    <option key={sol.id} value={sol.id}>
                      {sol.titulo || `Solicitud #${sol.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Condiciones y Notas</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Condiciones (visible para el cliente)</label>
                <textarea
                  value={form.condiciones}
                  onChange={(e) => setForm(prev => ({ ...prev, condiciones: e.target.value }))}
                  placeholder="Términos y condiciones del plan de pago..."
                  rows={4}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Notas Internas (solo visible para ti)</label>
                <textarea
                  value={form.notas_internas}
                  onChange={(e) => setForm(prev => ({ ...prev, notas_internas: e.target.value }))}
                  placeholder="Notas privadas sobre este plan..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Plan de Pago */}
      {activeTab === 'plan' && (
        <div className="tab-content">
          {!form.precio_total ? (
            <div className="empty-plan">
              <DollarSign size={48} />
              <h3>Configura el precio primero</h3>
              <p>Ingresa el precio total en la pestaña "Información" para configurar el plan de pago.</p>
              <button className="btn-primary" onClick={() => setActiveTab('info')}>
                Ir a Información
              </button>
            </div>
          ) : (
            <>
              <div className="plan-header">
                <div className="plan-total">
                  <span className="label">Precio Total</span>
                  <span className="value">{formatMoney(parseFloat(form.precio_total), form.moneda)}</span>
                </div>
                {valoresCalculados && (
                  <div className={`plan-progress ${valoresCalculados.porcentajeTotal > 100 ? 'over' : valoresCalculados.porcentajeTotal === 100 ? 'complete' : ''}`}>
                    <span className="label">Cubierto</span>
                    <span className="value">{valoresCalculados.porcentajeTotal.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              <div className="plan-items">
                {/* Reserva */}
                <div className="plan-item">
                  <div className="plan-item-header">
                    <div className="plan-item-icon reserva">
                      <CreditCard size={18} />
                    </div>
                    <div className="plan-item-title">
                      <h4>Reserva</h4>
                      <p>Monto para apartar la propiedad</p>
                    </div>
                    <div className="plan-item-amount">
                      {formatMoney(valoresCalculados?.reserva || 0, form.moneda)}
                    </div>
                  </div>
                  <div className="plan-item-inputs">
                    <div className="input-group">
                      <select
                        value={planDetalle.reserva?.tipo || 'porcentaje'}
                        onChange={(e) => updatePlanItem('reserva', 'tipo', e.target.value)}
                      >
                        <option value="porcentaje">Porcentaje</option>
                        <option value="valor">Monto Fijo</option>
                      </select>
                      <input
                        type="number"
                        value={planDetalle.reserva?.valor || 0}
                        onChange={(e) => updatePlanItem('reserva', 'valor', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                      <span className="input-suffix">
                        {planDetalle.reserva?.tipo === 'porcentaje' ? '%' : form.moneda}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Separación */}
                <div className="plan-item">
                  <div className="plan-item-header">
                    <div className="plan-item-icon separacion">
                      <Banknote size={18} />
                    </div>
                    <div className="plan-item-title">
                      <h4>Separación</h4>
                      <p>Pago para formalizar la separación</p>
                    </div>
                    <div className="plan-item-amount">
                      {formatMoney(valoresCalculados?.separacion || 0, form.moneda)}
                    </div>
                  </div>
                  <div className="plan-item-inputs">
                    <div className="input-group">
                      <select
                        value={planDetalle.separacion?.tipo || 'porcentaje'}
                        onChange={(e) => updatePlanItem('separacion', 'tipo', e.target.value)}
                      >
                        <option value="porcentaje">Porcentaje</option>
                        <option value="valor">Monto Fijo</option>
                      </select>
                      <input
                        type="number"
                        value={planDetalle.separacion?.valor || 0}
                        onChange={(e) => updatePlanItem('separacion', 'valor', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                      <span className="input-suffix">
                        {planDetalle.separacion?.tipo === 'porcentaje' ? '%' : form.moneda}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inicial */}
                <div className="plan-item">
                  <div className="plan-item-header">
                    <div className="plan-item-icon inicial">
                      <DollarSign size={18} />
                    </div>
                    <div className="plan-item-title">
                      <h4>Inicial</h4>
                      <p>Enganche o pago inicial</p>
                    </div>
                    <div className="plan-item-amount">
                      {formatMoney(valoresCalculados?.inicial || 0, form.moneda)}
                    </div>
                  </div>
                  <div className="plan-item-inputs">
                    <div className="input-group">
                      <select
                        value={planDetalle.inicial?.tipo || 'porcentaje'}
                        onChange={(e) => updatePlanItem('inicial', 'tipo', e.target.value)}
                      >
                        <option value="porcentaje">Porcentaje</option>
                        <option value="valor">Monto Fijo</option>
                      </select>
                      <input
                        type="number"
                        value={planDetalle.inicial?.valor || 0}
                        onChange={(e) => updatePlanItem('inicial', 'valor', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                      <span className="input-suffix">
                        {planDetalle.inicial?.tipo === 'porcentaje' ? '%' : form.moneda}
                      </span>
                    </div>
                    <div className="input-group small">
                      <label>Cuotas:</label>
                      <input
                        type="number"
                        value={planDetalle.inicial?.cuotas || 1}
                        onChange={(e) => updatePlanItem('inicial', 'cuotas', parseInt(e.target.value) || 1)}
                        min="1"
                        max="24"
                      />
                    </div>
                  </div>
                  {planDetalle.inicial && planDetalle.inicial.cuotas && planDetalle.inicial.cuotas > 1 && valoresCalculados && (
                    <div className="plan-item-note">
                      {planDetalle.inicial.cuotas} cuotas de {formatMoney(valoresCalculados.inicial / planDetalle.inicial.cuotas, form.moneda)}
                    </div>
                  )}
                </div>

                {/* Contra Entrega */}
                <div className="plan-item">
                  <div className="plan-item-header">
                    <div className="plan-item-icon contra-entrega">
                      <Home size={18} />
                    </div>
                    <div className="plan-item-title">
                      <h4>Contra Entrega</h4>
                      <p>Pago al momento de la entrega</p>
                    </div>
                    <div className="plan-item-amount">
                      {formatMoney(valoresCalculados?.contraEntrega || 0, form.moneda)}
                    </div>
                  </div>
                  <div className="plan-item-inputs">
                    <div className="input-group">
                      <select
                        value={planDetalle.contra_entrega?.tipo || 'porcentaje'}
                        onChange={(e) => updatePlanItem('contra_entrega', 'tipo', e.target.value)}
                      >
                        <option value="porcentaje">Porcentaje</option>
                        <option value="valor">Monto Fijo</option>
                      </select>
                      <input
                        type="number"
                        value={planDetalle.contra_entrega?.valor || 0}
                        onChange={(e) => updatePlanItem('contra_entrega', 'valor', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                      <span className="input-suffix">
                        {planDetalle.contra_entrega?.tipo === 'porcentaje' ? '%' : form.moneda}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financiamiento */}
                <div className="plan-item">
                  <div className="plan-item-header">
                    <div className="plan-item-icon financiamiento">
                      <Landmark size={18} />
                    </div>
                    <div className="plan-item-title">
                      <h4>Financiamiento</h4>
                      <p>Crédito bancario o desarrollador</p>
                    </div>
                    <div className="plan-item-amount">
                      {formatMoney(valoresCalculados?.financiamiento || 0, form.moneda)}
                    </div>
                  </div>
                  <div className="plan-item-inputs">
                    <div className="input-group">
                      <select
                        value={planDetalle.financiamiento?.tipo || 'bancario'}
                        onChange={(e) => updatePlanItem('financiamiento', 'tipo', e.target.value)}
                      >
                        <option value="bancario">Crédito Bancario</option>
                        <option value="desarrollador">Financiamiento Desarrollador</option>
                        <option value="otro">Otro</option>
                      </select>
                      <input
                        type="number"
                        value={planDetalle.financiamiento?.porcentaje || 0}
                        onChange={(e) => updatePlanItem('financiamiento', 'porcentaje', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                      <span className="input-suffix">%</span>
                    </div>
                    <div className="input-group small">
                      <label>Plazo (meses):</label>
                      <input
                        type="number"
                        value={planDetalle.financiamiento?.plazo_meses || ''}
                        onChange={(e) => updatePlanItem('financiamiento', 'plazo_meses', parseInt(e.target.value) || undefined)}
                        placeholder="240"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {valoresCalculados && (
                <div className="plan-summary">
                  <div className="summary-row">
                    <span>Reserva</span>
                    <span>{formatMoney(valoresCalculados.reserva, form.moneda)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Separación</span>
                    <span>{formatMoney(valoresCalculados.separacion, form.moneda)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Inicial</span>
                    <span>{formatMoney(valoresCalculados.inicial, form.moneda)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Contra Entrega</span>
                    <span>{formatMoney(valoresCalculados.contraEntrega, form.moneda)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Financiamiento</span>
                    <span>{formatMoney(valoresCalculados.financiamiento, form.moneda)}</span>
                  </div>
                  <div className="summary-divider" />
                  <div className={`summary-row total ${valoresCalculados.porcentajeTotal > 100 ? 'error' : valoresCalculados.porcentajeTotal === 100 ? 'success' : ''}`}>
                    <span>Total Cubierto</span>
                    <span>{formatMoney(valoresCalculados.total, form.moneda)} ({valoresCalculados.porcentajeTotal.toFixed(1)}%)</span>
                  </div>
                  {valoresCalculados.diferencia !== 0 && (
                    <div className={`summary-row difference ${valoresCalculados.diferencia < 0 ? 'error' : 'warning'}`}>
                      <span>{valoresCalculados.diferencia > 0 ? 'Faltante' : 'Excedente'}</span>
                      <span>{formatMoney(Math.abs(valoresCalculados.diferencia), form.moneda)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Preview */}
      {activeTab === 'preview' && (
        <div className="tab-content">
          {!plan?.url_publica ? (
            <div className="empty-preview">
              <Eye size={48} />
              <h3>Guarda el plan para ver la vista previa</h3>
              <p>Una vez guardado, se generará un enlace público que podrás compartir con tu cliente.</p>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !form.titulo.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Ahora
              </button>
            </div>
          ) : (
            <div className="preview-content">
              <div className="preview-url-card">
                <div className="url-icon">
                  <ExternalLink size={24} />
                </div>
                <div className="url-info">
                  <h4>Enlace Público</h4>
                  <p className="url-text">{getUrlPublicaCompleta()}</p>
                </div>
                <div className="url-actions">
                  <button className="btn-secondary" onClick={handleCopyUrl}>
                    {copiedUrl ? <CheckCircle size={16} /> : <Copy size={16} />}
                    {copiedUrl ? 'Copiado' : 'Copiar'}
                  </button>
                  <a
                    href={getUrlPublicaCompleta() || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <ExternalLink size={16} />
                    Abrir
                  </a>
                </div>
              </div>

              <div className="preview-stats">
                <div className="stat-item">
                  <Eye size={20} />
                  <div className="stat-info">
                    <span className="stat-value">{plan.veces_vista || 0}</span>
                    <span className="stat-label">Vistas</span>
                  </div>
                </div>
                <div className="stat-item">
                  <Clock size={20} />
                  <div className="stat-info">
                    <span className="stat-value">
                      {plan.fecha_vista
                        ? new Date(plan.fecha_vista).toLocaleDateString('es-MX')
                        : 'Nunca'}
                    </span>
                    <span className="stat-label">Última Vista</span>
                  </div>
                </div>
              </div>

              <div className="preview-estado">
                <span
                  className="estado-badge"
                  style={{
                    backgroundColor: ESTADOS[plan.estado]?.bgColor || '#f1f5f9',
                    color: ESTADOS[plan.estado]?.color || '#64748b',
                  }}
                >
                  {ESTADOS[plan.estado]?.label || plan.estado}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    width: 100%;
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
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 16px;
    color: #dc2626;
    font-size: 0.85rem;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 4px;
    background: #f1f5f9;
    padding: 4px;
    border-radius: 10px;
    margin-bottom: 20px;
  }

  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    border: none;
    background: transparent;
    border-radius: 8px;
    font-size: 0.85rem;
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

  /* Tab Content */
  .tab-content {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
  }

  /* Form Sections */
  .form-section {
    margin-bottom: 32px;
  }

  .form-section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
  }

  .form-row {
    margin-bottom: 16px;
  }

  .form-row:last-child {
    margin-bottom: 0;
  }

  .form-row.two-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #374151;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.85rem;
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .input-with-addon {
    display: flex;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .input-with-addon .addon-select {
    border: none;
    border-right: 1px solid #e2e8f0;
    border-radius: 0;
    padding: 10px 12px;
    background: #f8fafc;
    font-size: 0.85rem;
    min-width: 80px;
  }

  .input-with-addon input {
    flex: 1;
    border: none;
    border-radius: 0;
    padding: 10px 14px;
  }

  /* Plan de Pago Tab */
  .empty-plan,
  .empty-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 24px;
    text-align: center;
    color: #94a3b8;
  }

  .empty-plan h3,
  .empty-preview h3 {
    margin: 16px 0 8px;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .empty-plan p,
  .empty-preview p {
    margin: 0 0 20px;
    color: #64748b;
    max-width: 320px;
  }

  .plan-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: #f8fafc;
    border-radius: 12px;
    margin-bottom: 24px;
  }

  .plan-total,
  .plan-progress {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .plan-total .label,
  .plan-progress .label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .plan-total .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
  }

  .plan-progress .value {
    font-size: 1.25rem;
    font-weight: 600;
    color: #64748b;
  }

  .plan-progress.complete .value {
    color: #16a34a;
  }

  .plan-progress.over .value {
    color: #dc2626;
  }

  /* Plan Items */
  .plan-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  .plan-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
  }

  .plan-item-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .plan-item-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .plan-item-icon.reserva { background: linear-gradient(135deg, #f59e0b, #d97706); }
  .plan-item-icon.separacion { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
  .plan-item-icon.inicial { background: linear-gradient(135deg, #10b981, #059669); }
  .plan-item-icon.contra-entrega { background: linear-gradient(135deg, #3b82f6, #2563eb); }
  .plan-item-icon.financiamiento { background: linear-gradient(135deg, #64748b, #475569); }

  .plan-item-title {
    flex: 1;
  }

  .plan-item-title h4 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
  }

  .plan-item-title p {
    margin: 2px 0 0;
    font-size: 0.75rem;
    color: #64748b;
  }

  .plan-item-amount {
    font-size: 1.1rem;
    font-weight: 700;
    color: #059669;
  }

  .plan-item-inputs {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .input-group {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    flex: 1;
    min-width: 200px;
  }

  .input-group.small {
    min-width: auto;
    flex: 0;
  }

  .input-group select {
    border: none;
    border-right: 1px solid #e2e8f0;
    padding: 8px 12px;
    background: #f8fafc;
    font-size: 0.8rem;
    min-width: 110px;
  }

  .input-group input {
    flex: 1;
    border: none;
    padding: 8px 12px;
    font-size: 0.85rem;
    min-width: 80px;
  }

  .input-group input:focus {
    outline: none;
  }

  .input-group label {
    padding: 8px 12px;
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
    font-size: 0.75rem;
    color: #64748b;
    white-space: nowrap;
  }

  .input-suffix {
    padding: 8px 12px;
    background: #f8fafc;
    border-left: 1px solid #e2e8f0;
    font-size: 0.8rem;
    color: #64748b;
  }

  .plan-item-note {
    margin-top: 8px;
    padding: 8px 12px;
    background: #dbeafe;
    border-radius: 6px;
    font-size: 0.8rem;
    color: #1d4ed8;
  }

  /* Plan Summary */
  .plan-summary {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 0.85rem;
    color: #64748b;
  }

  .summary-row span:last-child {
    font-weight: 500;
    color: #0f172a;
  }

  .summary-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 8px 0;
  }

  .summary-row.total {
    font-size: 0.95rem;
    font-weight: 600;
  }

  .summary-row.total span:last-child {
    font-weight: 700;
  }

  .summary-row.success span:last-child {
    color: #16a34a;
  }

  .summary-row.error span:last-child {
    color: #dc2626;
  }

  .summary-row.difference {
    font-size: 0.8rem;
  }

  .summary-row.warning span:last-child {
    color: #f59e0b;
  }

  /* Preview Tab */
  .preview-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .preview-url-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }

  .url-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .url-info {
    flex: 1;
  }

  .url-info h4 {
    margin: 0 0 4px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #0f172a;
  }

  .url-text {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
    word-break: break-all;
  }

  .url-actions {
    display: flex;
    gap: 8px;
  }

  .preview-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }

  .stat-item svg {
    color: #64748b;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #64748b;
  }

  .preview-estado {
    text-align: center;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
  }

  .estado-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  /* Buttons */
  .header-actions {
    display: flex;
    gap: 8px;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    text-decoration: none;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #f1f5f9;
    color: #475569;
    border: none;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
  }

  .btn-secondary:hover {
    background: #e2e8f0;
  }

  @media (max-width: 768px) {
    .form-row.two-cols {
      grid-template-columns: 1fr;
    }

    .plan-item-inputs {
      flex-direction: column;
    }

    .input-group {
      min-width: 100%;
    }

    .preview-url-card {
      flex-direction: column;
      text-align: center;
    }

    .url-actions {
      width: 100%;
      justify-content: center;
    }

    .preview-stats {
      grid-template-columns: 1fr;
    }
  }
`;
