/**
 * CrmPlanPagoEditar - Editor simple y ágil de planes de pago
 *
 * Para generar rápidamente un desglose de cuotas para un cliente.
 * Input: propiedad, cliente, separación, inicial, # cuotas, fecha inicio
 * Output: Tabla de cuotas con fechas y montos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  getTenantConfiguracion,
  PlanPago,
  Propiedad,
  PropiedadFiltros,
  Contacto,
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
} from 'lucide-react';

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

  // Estado del formulario - simplificado
  const [form, setForm] = useState({
    titulo: '',
    propiedad_id: '',
    contacto_id: '',
    precio_total: '',
    moneda: 'USD',
    separacion: '',
    inicial: '',
    num_cuotas: '12',
    fecha_inicio_cuotas: '',
    notas: '',
  });

  // Estado
  const [plan, setPlan] = useState<PlanPago | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [dominioPersonalizado, setDominioPersonalizado] = useState<string | null>(null);

  // Datos para selectores
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loadingContactos, setLoadingContactos] = useState(false);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: isNew ? 'Nuevo Plan de Pago' : 'Editar Plan',
      subtitle: 'Genera un desglose de cuotas rápidamente',
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => navigate(`/crm/${tenantSlug}/planes-pago`)}>
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.precio_total}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ),
    });
  }, [setPageHeader, isNew, form.precio_total, saving, tenantSlug]);

  // Cargar plan existente
  useEffect(() => {
    if (!isNew && tenantActual?.id && planId) {
      loadPlan();
    }
  }, [isNew, tenantActual?.id, planId]);

  // Cargar propiedades y contactos
  useEffect(() => {
    if (tenantActual?.id) {
      loadPropiedades();
      loadContactos();
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

  // Fecha por defecto: hoy + 1 mes, día 5
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

      // Extraer datos del plan_detalle (support both old nested and new flat structure)
      const detalle = data.plan_detalle || {};
      setForm({
        titulo: data.titulo || '',
        propiedad_id: data.propiedad_id || '',
        contacto_id: data.contacto_id || '',
        precio_total: data.precio_total?.toString() || '',
        moneda: data.moneda || 'USD',
        // Support both old {tipo, valor} structure and new flat values
        separacion: (detalle.separacion?.valor ?? detalle.separacion ?? '').toString(),
        inicial: (detalle.inicial?.valor ?? detalle.inicial ?? '').toString(),
        num_cuotas: (detalle.inicial?.cuotas ?? detalle.num_cuotas ?? 12).toString(),
        fecha_inicio_cuotas: detalle.fecha_inicio_cuotas || '',
        notas: data.condiciones || '',
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

  // Handler para selección de propiedad
  const handlePropiedadChange = (propiedadId: string | null, propiedad?: any) => {
    setForm(prev => ({ ...prev, propiedad_id: propiedadId || '' }));
    if (propiedad) {
      // Auto-poblar precio y título
      setForm(prev => ({
        ...prev,
        precio_total: propiedad.precio?.toString() || prev.precio_total,
        moneda: propiedad.moneda || 'USD',
        titulo: propiedad.titulo ? `Plan - ${propiedad.titulo}` : prev.titulo,
      }));
    }
  };

  // Calcular cuotas
  const cuotas = useMemo((): Cuota[] => {
    const precio = parseFloat(form.precio_total) || 0;
    const separacion = parseFloat(form.separacion) || 0;
    const inicial = parseFloat(form.inicial) || 0;
    const numCuotas = parseInt(form.num_cuotas) || 12;

    if (precio === 0 || numCuotas === 0) return [];

    const montoACuotas = precio - separacion - inicial;
    if (montoACuotas <= 0) return [];

    const montoPorCuota = montoACuotas / numCuotas;
    const fechaInicio = form.fecha_inicio_cuotas ? new Date(form.fecha_inicio_cuotas + 'T12:00:00') : new Date();

    const resultado: Cuota[] = [];
    for (let i = 0; i < numCuotas; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setMonth(fecha.getMonth() + i);
      resultado.push({
        numero: i + 1,
        fecha,
        monto: montoPorCuota,
      });
    }
    return resultado;
  }, [form.precio_total, form.separacion, form.inicial, form.num_cuotas, form.fecha_inicio_cuotas]);

  // Guardar plan
  const handleSave = async () => {
    if (!tenantActual?.id || !form.precio_total) return;

    try {
      setSaving(true);
      setError(null);

      // Use null instead of undefined so backend updates the field
      const data = {
        titulo: form.titulo || `Plan de Pago - ${new Date().toLocaleDateString('es-MX')}`,
        precio_total: parseFloat(form.precio_total),
        moneda: form.moneda,
        propiedad_id: form.propiedad_id || null,
        contacto_id: form.contacto_id || null,
        condiciones: form.notas || null,
        estado: 'borrador',
        plan_detalle: {
          separacion: parseFloat(form.separacion) || 0,
          inicial: parseFloat(form.inicial) || 0,
          num_cuotas: parseInt(form.num_cuotas) || 12,
          fecha_inicio_cuotas: form.fecha_inicio_cuotas || null,
          cuotas_generadas: cuotas.map(c => ({
            numero: c.numero,
            fecha: c.fecha.toISOString(),
            monto: c.monto,
          })),
        },
      };

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

  // Resumen de totales
  const resumen = useMemo(() => {
    const precio = parseFloat(form.precio_total) || 0;
    const separacion = parseFloat(form.separacion) || 0;
    const inicial = parseFloat(form.inicial) || 0;
    const totalCuotas = cuotas.reduce((sum, c) => sum + c.monto, 0);
    return { precio, separacion, inicial, totalCuotas, total: separacion + inicial + totalCuotas };
  }, [form.precio_total, form.separacion, form.inicial, cuotas]);

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

            <div className="form-row-inline">
              <div className="form-field">
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
            </div>

            <div className="form-row-inline">
              <div className="form-field">
                <label>Separación</label>
                <input
                  type="number"
                  value={form.separacion}
                  onChange={(e) => setForm(prev => ({ ...prev, separacion: e.target.value }))}
                  placeholder="5,000"
                />
              </div>
              <div className="form-field">
                <label>Inicial</label>
                <input
                  type="number"
                  value={form.inicial}
                  onChange={(e) => setForm(prev => ({ ...prev, inicial: e.target.value }))}
                  placeholder="20,000"
                />
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
              <label>Notas (opcional)</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Condiciones adicionales..."
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

        {/* Panel derecho: Vista previa de cuotas */}
        <div className="preview-panel">
          <h3>
            <Calendar size={18} />
            Desglose de Pagos
          </h3>

          {/* Resumen arriba */}
          <div className="summary-cards">
            <div className="summary-item">
              <span className="label">Separación</span>
              <span className="value">{formatMoney(resumen.separacion)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Inicial</span>
              <span className="value">{formatMoney(resumen.inicial)}</span>
            </div>
            <div className="summary-item highlight">
              <span className="label">Precio Total</span>
              <span className="value">{formatMoney(resumen.precio)}</span>
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
                <span>{formatMoney(resumen.totalCuotas)}</span>
              </div>
            </div>
          ) : (
            <div className="empty-cuotas">
              <DollarSign size={32} />
              <p>Ingresa el precio y número de cuotas para ver el desglose</p>
            </div>
          )}

          {/* Total general */}
          {resumen.total > 0 && (
            <div className="total-row">
              <span>TOTAL A PAGAR</span>
              <span>{formatMoney(resumen.total)}</span>
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

  .form-row label {
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

  .form-field label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #374151;
  }

  .form-field input,
  .form-row input,
  .form-row textarea {
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: border-color 0.2s;
  }

  .form-field input:focus,
  .form-row input:focus,
  .form-row textarea:focus {
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

  .btn-secondary:hover {
    background: #e2e8f0;
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
