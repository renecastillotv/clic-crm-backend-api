/**
 * CrmPlanPagoEditar - Editor de planes de pago
 *
 * Funcionalidades:
 * - Seleccionar propiedad/unidad y cliente
 * - Vincular a solicitud (opcional)
 * - Separación e inicial con valor fijo o porcentaje
 * - Desglose de cuotas con fechas
 * - Descarga de PDF
 * - Compartir enlace público
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
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
  Propiedad,
  PropiedadFiltros,
  Contacto,
  Solicitud,
} from '../../services/api';
import {
  Save,
  ArrowLeft,
  Loader2,
  Copy,
  CheckCircle,
  ExternalLink,
  Calendar,
  DollarSign,
  FileDown,
  Percent,
  Hash,
  FileText,
  Building2,
} from 'lucide-react';

type TipoValor = 'valor' | 'porcentaje';

interface FormState {
  titulo: string;
  propiedad_id: string;
  unidad_id: string;
  contacto_id: string;
  solicitud_id: string;
  precio_total: string;
  moneda: string;
  separacion_tipo: TipoValor;
  separacion_valor: string;
  inicial_tipo: TipoValor;
  inicial_valor: string;
  num_cuotas: string;
  fecha_inicio_cuotas: string;
  condiciones: string;
}

interface Cuota {
  numero: number;
  fecha: Date;
  monto: number;
}

export default function CrmPlanPagoEditar() {
  const { tenantSlug, planId } = useParams<{ tenantSlug: string; planId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const isNew = !planId || planId === 'nuevo';

  // Estado del formulario
  const [form, setForm] = useState<FormState>({
    titulo: '',
    propiedad_id: '',
    unidad_id: '',
    contacto_id: '',
    solicitud_id: '',
    precio_total: '',
    moneda: 'USD',
    separacion_tipo: 'valor',
    separacion_valor: '',
    inicial_tipo: 'valor',
    inicial_valor: '',
    num_cuotas: '12',
    fecha_inicio_cuotas: '',
    condiciones: '',
  });

  // Ref para el form actual (evita stale closures en header)
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // Estados
  const [plan, setPlan] = useState<PlanPago | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [dominioPersonalizado, setDominioPersonalizado] = useState<string | null>(null);

  // Datos para selectores
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loadingContactos, setLoadingContactos] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);

  // Calcular monto basado en tipo
  const calcularMonto = useCallback((tipo: TipoValor, valor: string, precioTotal: number): number => {
    const num = parseFloat(valor) || 0;
    if (tipo === 'porcentaje') {
      return (precioTotal * num) / 100;
    }
    return num;
  }, []);

  // Valores calculados
  const valores = useMemo(() => {
    const precio = parseFloat(form.precio_total) || 0;
    const separacion = calcularMonto(form.separacion_tipo, form.separacion_valor, precio);
    const inicial = calcularMonto(form.inicial_tipo, form.inicial_valor, precio);
    const numCuotas = parseInt(form.num_cuotas) || 12;
    const montoACuotas = Math.max(0, precio - separacion - inicial);
    const montoPorCuota = numCuotas > 0 ? montoACuotas / numCuotas : 0;

    return { precio, separacion, inicial, numCuotas, montoACuotas, montoPorCuota };
  }, [form.precio_total, form.separacion_tipo, form.separacion_valor, form.inicial_tipo, form.inicial_valor, form.num_cuotas, calcularMonto]);

  // Generar cuotas
  const cuotas = useMemo((): Cuota[] => {
    if (valores.precio === 0 || valores.numCuotas === 0 || valores.montoACuotas <= 0) return [];

    const fechaInicio = form.fecha_inicio_cuotas ? new Date(form.fecha_inicio_cuotas + 'T12:00:00') : new Date();
    const resultado: Cuota[] = [];

    for (let i = 0; i < valores.numCuotas; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setMonth(fecha.getMonth() + i);
      resultado.push({
        numero: i + 1,
        fecha,
        monto: valores.montoPorCuota,
      });
    }
    return resultado;
  }, [valores, form.fecha_inicio_cuotas]);

  // Guardar
  const handleSave = useCallback(async () => {
    const currentForm = formRef.current;
    if (!tenantActual?.id || !currentForm.precio_total) return;

    try {
      setSaving(true);
      setError(null);

      const precio = parseFloat(currentForm.precio_total) || 0;
      const separacionMonto = calcularMonto(currentForm.separacion_tipo, currentForm.separacion_valor, precio);
      const inicialMonto = calcularMonto(currentForm.inicial_tipo, currentForm.inicial_valor, precio);
      const numCuotasVal = parseInt(currentForm.num_cuotas) || 12;
      const montoACuotas = Math.max(0, precio - separacionMonto - inicialMonto);
      const montoPorCuota = numCuotasVal > 0 ? montoACuotas / numCuotasVal : 0;

      // Generar cuotas
      const fechaInicio = currentForm.fecha_inicio_cuotas ? new Date(currentForm.fecha_inicio_cuotas + 'T12:00:00') : new Date();
      const cuotasGeneradas = [];
      for (let i = 0; i < numCuotasVal; i++) {
        const fecha = new Date(fechaInicio);
        fecha.setMonth(fecha.getMonth() + i);
        cuotasGeneradas.push({
          numero: i + 1,
          fecha: fecha.toISOString(),
          monto: montoPorCuota,
        });
      }

      // Estructura plan_detalle compatible con backend
      const planDetalle = {
        separacion: {
          tipo: currentForm.separacion_tipo,
          valor: parseFloat(currentForm.separacion_valor) || 0,
        },
        inicial: {
          tipo: currentForm.inicial_tipo,
          valor: parseFloat(currentForm.inicial_valor) || 0,
        },
        num_cuotas: numCuotasVal,
        fecha_inicio_cuotas: currentForm.fecha_inicio_cuotas || null,
        valores_calculados: {
          separacion_monto: separacionMonto,
          inicial_monto: inicialMonto,
          cuota_monto: montoPorCuota,
          total_cuotas: montoACuotas,
        },
        cuotas_generadas: cuotasGeneradas,
      };

      const data = {
        titulo: currentForm.titulo || `Plan de Pago - ${new Date().toLocaleDateString('es-MX')}`,
        precio_total: precio,
        moneda: currentForm.moneda,
        propiedad_id: currentForm.propiedad_id || null,
        unidad_id: currentForm.unidad_id || null,
        contacto_id: currentForm.contacto_id || null,
        solicitud_id: currentForm.solicitud_id || null,
        condiciones: currentForm.condiciones || null,
        estado: 'borrador',
        plan_detalle: planDetalle,
      };

      console.log('💾 Guardando plan de pago:', data);

      if (isNew) {
        const created = await createPlanPago(tenantActual.id, data as any);
        navigate(`/crm/${tenantSlug}/planes-pago/${created.id}`, { replace: true });
      } else if (planId) {
        const updated = await updatePlanPago(tenantActual.id, planId, data as any);
        setPlan(updated);
      }
    } catch (err: any) {
      console.error('Error guardando plan:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [tenantActual?.id, planId, isNew, navigate, tenantSlug, calcularMonto]);

  // Descargar PDF
  const handleDownloadPdf = useCallback(async () => {
    if (!tenantActual?.id || !planId) return;

    try {
      setGeneratingPdf(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/tenants/${tenantActual.id}/planes-pago/${planId}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${await (window as any).Clerk?.session?.getToken()}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error generando PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plan-pago-${planId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error descargando PDF:', err);
      setError('Error al generar el PDF. Intenta de nuevo.');
    } finally {
      setGeneratingPdf(false);
    }
  }, [tenantActual?.id, planId]);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: isNew ? 'Nuevo Plan de Pago' : 'Editar Plan',
      subtitle: 'Genera un desglose de cuotas para el cliente',
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => navigate(`/crm/${tenantSlug}/planes-pago`)}>
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          {!isNew && plan?.url_publica && (
            <button className="btn-secondary" onClick={handleDownloadPdf} disabled={generatingPdf}>
              {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              PDF
            </button>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.precio_total}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ),
    });
  }, [setPageHeader, isNew, form.precio_total, saving, tenantSlug, plan?.url_publica, generatingPdf, handleSave, handleDownloadPdf, navigate]);

  // Cargar plan existente
  useEffect(() => {
    if (!isNew && tenantActual?.id && planId) {
      loadPlan();
    }
  }, [isNew, tenantActual?.id, planId]);

  // Cargar propiedades, contactos y solicitudes
  useEffect(() => {
    if (tenantActual?.id) {
      loadPropiedades();
      loadContactos();
      loadSolicitudes();
    }
  }, [tenantActual?.id]);

  // Pre-cargar desde query params
  useEffect(() => {
    if (isNew) {
      const contactoIdParam = searchParams.get('contacto_id');
      const propiedadIdParam = searchParams.get('propiedad_id');
      const solicitudIdParam = searchParams.get('solicitud_id');

      if (contactoIdParam || propiedadIdParam || solicitudIdParam) {
        setForm(prev => ({
          ...prev,
          contacto_id: contactoIdParam || prev.contacto_id,
          propiedad_id: propiedadIdParam || prev.propiedad_id,
          solicitud_id: solicitudIdParam || prev.solicitud_id,
        }));
      }
    }
  }, [searchParams, isNew]);

  // Cargar dominio personalizado
  useEffect(() => {
    const loadTenantConfig = async () => {
      if (!tenantActual?.id) return;
      try {
        const config = await getTenantConfiguracion(tenantActual.id);
        setDominioPersonalizado(config.dominio_personalizado);
      } catch (err) {
        console.error('Error cargando configuración:', err);
      }
    };
    loadTenantConfig();
  }, [tenantActual?.id]);

  // Fecha por defecto: día 5 del próximo mes
  useEffect(() => {
    if (isNew && !form.fecha_inicio_cuotas) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(5);
      setForm(prev => ({
        ...prev,
        fecha_inicio_cuotas: nextMonth.toISOString().split('T')[0],
      }));
    }
  }, [isNew]);

  const loadPlan = async () => {
    if (!tenantActual?.id || !planId) return;
    try {
      setLoading(true);
      const data = await getPlanPago(tenantActual.id, planId);
      setPlan(data);

      const detalle = data.plan_detalle || {};
      console.log('📥 Cargando plan:', { data, detalle });

      // Extraer separación (soporta ambos formatos)
      let separacion_tipo: TipoValor = 'valor';
      let separacion_valor = '';
      if (detalle.separacion) {
        if (typeof detalle.separacion === 'object') {
          separacion_tipo = detalle.separacion.tipo || 'valor';
          separacion_valor = String(detalle.separacion.valor || '');
        } else {
          separacion_valor = String(detalle.separacion);
        }
      }

      // Extraer inicial (soporta ambos formatos)
      let inicial_tipo: TipoValor = 'valor';
      let inicial_valor = '';
      if (detalle.inicial) {
        if (typeof detalle.inicial === 'object') {
          inicial_tipo = detalle.inicial.tipo || 'valor';
          inicial_valor = String(detalle.inicial.valor || '');
        } else {
          inicial_valor = String(detalle.inicial);
        }
      }

      // Extraer num_cuotas
      let num_cuotas = '12';
      if (detalle.num_cuotas) {
        num_cuotas = String(detalle.num_cuotas);
      } else if (typeof detalle.inicial === 'object' && detalle.inicial.cuotas) {
        num_cuotas = String(detalle.inicial.cuotas);
      }

      setForm({
        titulo: data.titulo || '',
        propiedad_id: data.propiedad_id || '',
        unidad_id: data.unidad_id || '',
        contacto_id: data.contacto_id || '',
        solicitud_id: data.solicitud_id || '',
        precio_total: data.precio_total?.toString() || '',
        moneda: data.moneda || 'USD',
        separacion_tipo,
        separacion_valor,
        inicial_tipo,
        inicial_valor,
        num_cuotas,
        fecha_inicio_cuotas: detalle.fecha_inicio_cuotas || '',
        condiciones: data.condiciones || '',
      });
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
      const filtros: PropiedadFiltros = { limit: 100 };
      const response = await getPropiedadesCrm(tenantActual.id, filtros);
      setPropiedades(response.data);
    } catch (err: any) {
      console.error('Error cargando propiedades:', err);
    } finally {
      setLoadingProps(false);
    }
  }, [tenantActual?.id]);

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
      setLoadingSolicitudes(true);
      const response = await getSolicitudes(tenantActual.id, { limit: 100 });
      setSolicitudes(response.data || []);
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Handler para selección de propiedad
  const handlePropiedadChange = (propiedadId: string | null, propiedad?: any) => {
    setForm(prev => ({
      ...prev,
      propiedad_id: propiedadId || '',
      unidad_id: '', // Reset unidad when property changes
    }));
    if (propiedad) {
      setForm(prev => ({
        ...prev,
        precio_total: propiedad.precio?.toString() || prev.precio_total,
        moneda: propiedad.moneda || 'USD',
        titulo: propiedad.titulo ? `Plan - ${propiedad.titulo}` : prev.titulo,
      }));
    }
  };

  // URL pública
  const getUrlPublicaCompleta = () => {
    if (!plan?.url_publica) return null;
    if (dominioPersonalizado) {
      return `https://${dominioPersonalizado.replace(/^https?:\/\//, '').replace(/\/$/, '')}/plan-pago/${plan.url_publica}`;
    }
    return `https://${tenantSlug}.clic.casa/plan-pago/${plan.url_publica}`;
  };

  const handleCopyUrl = async () => {
    const url = getUrlPublicaCompleta();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  // Formatear moneda
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: form.moneda || 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Formatear fecha
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', color: '#64748b' }}>
          <Loader2 className="w-10 h-10 animate-spin" />
          <p>Cargando...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="editor-layout">
        {/* Panel izquierdo: Formulario */}
        <div className="form-panel">
          <div className="form-section">
            <div className="form-row">
              <label>Propiedad</label>
              <PropertyPicker
                value={form.propiedad_id}
                onChange={handlePropiedadChange}
                properties={propiedades}
                loading={loadingProps}
                placeholder="Seleccionar propiedad"
              />
            </div>

            <div className="form-row">
              <label>Cliente</label>
              <ContactPicker
                value={form.contacto_id}
                onChange={(id) => setForm(prev => ({ ...prev, contacto_id: id || '' }))}
                contacts={contactos}
                loading={loadingContactos}
                placeholder="Seleccionar cliente"
              />
            </div>

            {/* Vincular a solicitud (opcional) */}
            <div className="form-row">
              <label>
                <FileText size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Solicitud (opcional)
              </label>
              <select
                value={form.solicitud_id}
                onChange={(e) => setForm(prev => ({ ...prev, solicitud_id: e.target.value }))}
                className="form-select"
              >
                <option value="">Sin vincular a solicitud</option>
                {solicitudes.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.titulo || `Solicitud #${s.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label>Precio Total</label>
              <div className="input-money">
                <select
                  value={form.moneda}
                  onChange={(e) => setForm(prev => ({ ...prev, moneda: e.target.value }))}
                >
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                </select>
                <input
                  type="number"
                  value={form.precio_total}
                  onChange={(e) => setForm(prev => ({ ...prev, precio_total: e.target.value }))}
                  placeholder="150,000"
                />
              </div>
            </div>

            {/* Separación con toggle valor/porcentaje */}
            <div className="form-row">
              <label>Separación</label>
              <div className="input-with-toggle">
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${form.separacion_tipo === 'valor' ? 'active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, separacion_tipo: 'valor' }))}
                    title="Valor fijo"
                  >
                    <Hash size={14} />
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${form.separacion_tipo === 'porcentaje' ? 'active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, separacion_tipo: 'porcentaje' }))}
                    title="Porcentaje"
                  >
                    <Percent size={14} />
                  </button>
                </div>
                <input
                  type="number"
                  value={form.separacion_valor}
                  onChange={(e) => setForm(prev => ({ ...prev, separacion_valor: e.target.value }))}
                  placeholder={form.separacion_tipo === 'porcentaje' ? '5' : '5000'}
                />
                {form.separacion_tipo === 'porcentaje' && form.separacion_valor && (
                  <span className="calculated-value">= {formatMoney(valores.separacion)}</span>
                )}
              </div>
            </div>

            {/* Inicial con toggle valor/porcentaje */}
            <div className="form-row">
              <label>Inicial</label>
              <div className="input-with-toggle">
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${form.inicial_tipo === 'valor' ? 'active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, inicial_tipo: 'valor' }))}
                    title="Valor fijo"
                  >
                    <Hash size={14} />
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${form.inicial_tipo === 'porcentaje' ? 'active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, inicial_tipo: 'porcentaje' }))}
                    title="Porcentaje"
                  >
                    <Percent size={14} />
                  </button>
                </div>
                <input
                  type="number"
                  value={form.inicial_valor}
                  onChange={(e) => setForm(prev => ({ ...prev, inicial_valor: e.target.value }))}
                  placeholder={form.inicial_tipo === 'porcentaje' ? '20' : '20000'}
                />
                {form.inicial_tipo === 'porcentaje' && form.inicial_valor && (
                  <span className="calculated-value">= {formatMoney(valores.inicial)}</span>
                )}
              </div>
            </div>

            <div className="form-row-inline">
              <div className="form-field">
                <label># Cuotas</label>
                <input
                  type="number"
                  value={form.num_cuotas}
                  onChange={(e) => setForm(prev => ({ ...prev, num_cuotas: e.target.value }))}
                  min="1"
                  max="120"
                />
              </div>
              <div className="form-field">
                <label>Fecha 1ra Cuota</label>
                <input
                  type="date"
                  value={form.fecha_inicio_cuotas}
                  onChange={(e) => setForm(prev => ({ ...prev, fecha_inicio_cuotas: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-row">
              <label>Condiciones (opcional)</label>
              <textarea
                value={form.condiciones}
                onChange={(e) => setForm(prev => ({ ...prev, condiciones: e.target.value }))}
                placeholder="Términos y condiciones del plan..."
                rows={2}
              />
            </div>
          </div>

          {/* URL pública si ya existe */}
          {plan?.url_publica && (
            <div className="url-card">
              <div className="url-info">
                <ExternalLink size={16} />
                <span className="url-text">{getUrlPublicaCompleta()}</span>
              </div>
              <div className="url-actions">
                <button onClick={handleCopyUrl} className="btn-small">
                  {copiedUrl ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copiedUrl ? 'Copiado' : 'Copiar'}
                </button>
                <a href={getUrlPublicaCompleta() || '#'} target="_blank" rel="noopener noreferrer" className="btn-small primary">
                  Abrir
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Panel derecho: Vista previa */}
        <div className="preview-panel">
          <h3>
            <Calendar size={18} />
            Desglose de Pagos
          </h3>

          {/* Resumen */}
          <div className="summary-cards">
            <div className="summary-item">
              <span className="label">Separación</span>
              <span className="value">{formatMoney(valores.separacion)}</span>
              {form.separacion_tipo === 'porcentaje' && form.separacion_valor && (
                <span className="percent-note">{form.separacion_valor}%</span>
              )}
            </div>
            <div className="summary-item">
              <span className="label">Inicial</span>
              <span className="value">{formatMoney(valores.inicial)}</span>
              {form.inicial_tipo === 'porcentaje' && form.inicial_valor && (
                <span className="percent-note">{form.inicial_valor}%</span>
              )}
            </div>
            <div className="summary-item highlight">
              <span className="label">Precio Total</span>
              <span className="value">{formatMoney(valores.precio)}</span>
            </div>
          </div>

          {/* Tabla de cuotas */}
          {cuotas.length > 0 ? (
            <div className="cuotas-table">
              <div className="cuotas-header">
                <span>#</span>
                <span>Fecha</span>
                <span>Monto</span>
              </div>
              <div className="cuotas-list">
                {cuotas.map((cuota) => (
                  <div key={cuota.numero} className="cuota-row">
                    <span className="cuota-num">{cuota.numero}</span>
                    <span className="cuota-fecha">{formatDate(cuota.fecha)}</span>
                    <span className="cuota-monto">{formatMoney(cuota.monto)}</span>
                  </div>
                ))}
              </div>
              <div className="cuotas-footer">
                <span>Total en Cuotas:</span>
                <span>{formatMoney(valores.montoACuotas)}</span>
              </div>
            </div>
          ) : (
            <div className="empty-cuotas">
              <DollarSign size={32} />
              <p>Ingresa el precio y número de cuotas para ver el desglose</p>
            </div>
          )}

          {/* Total general */}
          {valores.precio > 0 && (
            <div className="total-row">
              <span>TOTAL A PAGAR</span>
              <span>{formatMoney(valores.separacion + valores.inicial + valores.montoACuotas)}</span>
            </div>
          )}
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    width: 100%;
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
  }

  .editor-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .form-panel {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-row label,
  .form-field label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #374151;
  }

  .form-row-inline {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-field input,
  .form-row input,
  .form-row textarea,
  .form-select {
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: border-color 0.2s;
    background: white;
  }

  .form-field input:focus,
  .form-row input:focus,
  .form-row textarea:focus,
  .form-select:focus {
    outline: none;
    border-color: #2563eb;
  }

  .input-money {
    display: flex;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .input-money select {
    border: none;
    border-right: 1px solid #e2e8f0;
    padding: 10px;
    background: #f8fafc;
    font-size: 0.85rem;
  }

  .input-money input {
    flex: 1;
    border: none;
    padding: 10px 12px;
    font-size: 0.9rem;
  }

  .input-money input:focus {
    outline: none;
  }

  /* Input con toggle valor/porcentaje */
  .input-with-toggle {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }

  .input-with-toggle input {
    flex: 1;
    border: none;
    padding: 10px 12px;
    font-size: 0.9rem;
    min-width: 0;
  }

  .input-with-toggle input:focus {
    outline: none;
  }

  .toggle-group {
    display: flex;
    border-right: 1px solid #e2e8f0;
    background: #f8fafc;
    flex-shrink: 0;
  }

  .toggle-btn {
    padding: 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: #94a3b8;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-btn:first-child {
    border-right: 1px solid #e2e8f0;
  }

  .toggle-btn:hover {
    color: #64748b;
  }

  .toggle-btn.active {
    background: #2563eb;
    color: white;
  }

  .calculated-value {
    padding-right: 12px;
    font-size: 0.8rem;
    color: #059669;
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .url-card {
    margin-top: 20px;
    padding: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .url-info {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #64748b;
  }

  .url-text {
    font-size: 0.75rem;
    word-break: break-all;
  }

  .url-actions {
    display: flex;
    gap: 8px;
  }

  .btn-small {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: white;
    font-size: 0.75rem;
    cursor: pointer;
    color: #475569;
    text-decoration: none;
  }

  .btn-small:hover {
    background: #f1f5f9;
  }

  .btn-small.primary {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .btn-small.primary:hover {
    background: #1d4ed8;
  }

  /* Preview Panel */
  .preview-panel {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .preview-panel h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .summary-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .summary-item {
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .summary-item .label {
    font-size: 0.7rem;
    color: #64748b;
    text-transform: uppercase;
  }

  .summary-item .value {
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .summary-item .percent-note {
    font-size: 0.7rem;
    color: #059669;
  }

  .summary-item.highlight {
    background: #dbeafe;
  }

  .summary-item.highlight .value {
    color: #1d4ed8;
  }

  /* Cuotas Table */
  .cuotas-table {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .cuotas-header {
    display: grid;
    grid-template-columns: 40px 1fr 100px;
    padding: 10px 12px;
    background: #f8fafc;
    font-size: 0.7rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    border-bottom: 1px solid #e2e8f0;
  }

  .cuotas-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .cuota-row {
    display: grid;
    grid-template-columns: 40px 1fr 100px;
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.85rem;
  }

  .cuota-row:last-child {
    border-bottom: none;
  }

  .cuota-num {
    color: #94a3b8;
    font-weight: 500;
  }

  .cuota-fecha {
    color: #374151;
  }

  .cuota-monto {
    color: #059669;
    font-weight: 600;
    text-align: right;
  }

  .cuotas-footer {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
  }

  .empty-cuotas {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #94a3b8;
    text-align: center;
  }

  .empty-cuotas p {
    margin: 12px 0 0;
    font-size: 0.85rem;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    padding: 16px;
    background: linear-gradient(135deg, #1e40af, #1d4ed8);
    border-radius: 8px;
    color: white;
    font-size: 1rem;
    font-weight: 700;
  }

  /* Buttons */
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
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e2e8f0;
  }

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 900px) {
    .editor-layout {
      grid-template-columns: 1fr;
    }

    .summary-cards {
      grid-template-columns: 1fr;
    }
  }
`;
