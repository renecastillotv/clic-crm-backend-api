/**
 * AdminFacturacion - Gestión de Facturación y Pagos
 *
 * Incluye:
 * - Vista de facturas con filtros
 * - Detalle de factura con desglose
 * - Generación de facturas
 * - Cambio de estado
 * - Registro de pagos
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  getBillingStats,
  getAllFacturas,
  getAllSuscripciones,
  BillingStats,
  Factura,
  Suscripcion,
  getFacturaDetallada,
  FacturaDetallada,
  cambiarEstadoFactura,
  registrarPago,
  getResumenFacturacion,
  ResumenFacturacion,
  getAllTenants,
  TenantAdmin,
  generarFactura,
} from '../../services/api';

export default function AdminFacturacion() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [tenants, setTenants] = useState<TenantAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'facturas' | 'suscripciones' | 'resumen'>('facturas');

  // Filters
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterTenant, setFilterTenant] = useState<string>('');

  // Modals
  const [selectedFactura, setSelectedFactura] = useState<FacturaDetallada | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  // Generate invoice form
  const [generateTenantId, setGenerateTenantId] = useState('');
  const [generateNotas, setGenerateNotas] = useState('');

  // Status change
  const [newStatus, setNewStatus] = useState('');

  // Resumen
  const [resumen, setResumen] = useState<ResumenFacturacion | null>(null);
  const [resumenMes, setResumenMes] = useState(new Date().getMonth() + 1);
  const [resumenAnio, setResumenAnio] = useState(new Date().getFullYear());

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'resumen') {
      loadResumen();
    }
  }, [activeTab, resumenMes, resumenAnio]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const [statsData, facturasData, suscripcionesData, tenantsData] = await Promise.all([
        getBillingStats(token),
        getAllFacturas(token),
        getAllSuscripciones(token),
        getAllTenants(token),
      ]);

      setStats(statsData);
      setFacturas(facturasData);
      setSuscripciones(suscripcionesData);
      setTenants(tenantsData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos de facturación');
      console.error('Error cargando facturación:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadResumen = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const data = await getResumenFacturacion({ mes: resumenMes, anio: resumenAnio }, token);
      setResumen(data);
    } catch (err: any) {
      console.error('Error cargando resumen:', err);
    }
  };

  const handleViewDetail = async (factura: Factura) => {
    try {
      const token = await getToken();
      if (!token) return;

      const detail = await getFacturaDetallada(factura.id, token);
      setSelectedFactura(detail);
      setShowDetailModal(true);
    } catch (err: any) {
      console.error('Error cargando detalle:', err);
    }
  };

  const handleChangeStatus = async () => {
    if (!selectedFactura || !newStatus) return;

    try {
      setActionLoading(true);
      const token = await getToken();
      if (!token) return;

      await cambiarEstadoFactura(selectedFactura.id, newStatus, {}, token);
      setShowStatusModal(false);
      setShowDetailModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Error cambiando estado:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedFactura || !paymentAmount) return;

    try {
      setActionLoading(true);
      const token = await getToken();
      if (!token) return;

      await registrarPago(selectedFactura.tenantId, {
        monto: parseFloat(paymentAmount),
        factura_id: selectedFactura.id,
        metodo_pago: paymentMethod || undefined,
        referencia_pago: paymentReference || undefined,
      }, token);

      setShowPaymentModal(false);
      setShowDetailModal(false);
      setPaymentAmount('');
      setPaymentMethod('');
      setPaymentReference('');
      await loadData();
    } catch (err: any) {
      console.error('Error registrando pago:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!generateTenantId) return;

    try {
      setActionLoading(true);
      const token = await getToken();
      if (!token) return;

      await generarFactura(generateTenantId, {
        notas: generateNotas || undefined,
      }, token);

      setShowGenerateModal(false);
      setGenerateTenantId('');
      setGenerateNotas('');
      await loadData();
    } catch (err: any) {
      console.error('Error generando factura:', err);
      alert(err.message || 'Error al generar factura');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case 'pagada':
      case 'activa':
        return 'badge-success';
      case 'pendiente':
        return 'badge-warning';
      case 'vencida':
      case 'suspendida':
        return 'badge-danger';
      case 'cancelada':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const filteredFacturas = facturas.filter((f) => {
    if (filterEstado && f.estado !== filterEstado) return false;
    if (filterTenant && f.tenantId !== filterTenant) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="admin-facturacion-loading">
        <div className="loading-spinner"></div>
        <p>Cargando datos de facturación...</p>
        <style>{`
          .admin-facturacion-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #E2E8F0;
            border-top-color: #2563EB;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-facturacion">
      <div className="page-header">
        <div>
          <h1>Facturación</h1>
          <p className="page-subtitle">
            Gestiona facturas, pagos y suscripciones de la plataforma
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowGenerateModal(true)}>
          + Generar Factura
        </button>
      </div>

      {error && (
        <div className="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card stat-blue">
            <div className="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalRecaudado > 0 ? formatCurrency(stats.totalRecaudado) : '$0'}</div>
              <div className="stat-label">Total Recaudado</div>
            </div>
          </div>
          <div className="stat-card stat-orange">
            <div className="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 6V12L16 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalPendiente > 0 ? formatCurrency(stats.totalPendiente) : '$0'}</div>
              <div className="stat-label">Total Pendiente</div>
            </div>
          </div>
          <div className="stat-card stat-green">
            <div className="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.facturasPagadas}</div>
              <div className="stat-label">Facturas Pagadas</div>
            </div>
          </div>
          <div className="stat-card stat-red">
            <div className="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.facturasPendientes + stats.facturasVencidas}</div>
              <div className="stat-label">Facturas Pendientes</div>
            </div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="7" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 11H21M7 7V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V7" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.suscripcionesActivas}</div>
              <div className="stat-label">Suscripciones Activas</div>
            </div>
          </div>
          <div className="stat-card stat-yellow">
            <div className="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.proximosVencimientos}</div>
              <div className="stat-label">Próximos Vencimientos</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'facturas' ? 'active' : ''}`}
          onClick={() => setActiveTab('facturas')}
        >
          Facturas ({facturas.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'suscripciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('suscripciones')}
        >
          Suscripciones ({suscripciones.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'resumen' ? 'active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          Resumen Mensual
        </button>
      </div>

      {/* Content */}
      {activeTab === 'facturas' && (
        <div className="content-section">
          {/* Filters */}
          <div className="filters-row">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagada">Pagada</option>
              <option value="vencida">Vencida</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <select
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          {filteredFacturas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>No hay facturas registradas</h3>
              <p>Las facturas aparecerán aquí cuando se generen</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Tenant</th>
                    <th>Plan</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Emisión</th>
                    <th>Vencimiento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFacturas.map((factura) => (
                    <tr key={factura.id}>
                      <td className="font-mono">{factura.numeroFactura}</td>
                      <td>{factura.tenantNombre || 'N/A'}</td>
                      <td><span className="plan-badge">{factura.plan}</span></td>
                      <td className="font-bold">{formatCurrency(factura.monto, factura.moneda)}</td>
                      <td>
                        <span className={`status-badge ${getEstadoBadgeClass(factura.estado)}`}>
                          {factura.estado}
                        </span>
                      </td>
                      <td>{formatDate(factura.fechaEmision)}</td>
                      <td>{formatDate(factura.fechaVencimiento)}</td>
                      <td>
                        <button
                          className="btn-action"
                          onClick={() => handleViewDetail(factura)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'suscripciones' && (
        <div className="content-section">
          {suscripciones.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 4V10H7M23 20V14H17M17 14L21 10M17 14L13 10M7 10L3 6M7 10L11 6M21 10C21 13.866 17.866 17 14 17H11M3 14C3 10.134 6.134 7 10 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>No hay suscripciones registradas</h3>
              <p>Las suscripciones aparecerán aquí</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Plan</th>
                    <th>Estado</th>
                    <th>Monto Mensual</th>
                    <th>Inicio</th>
                    <th>Próximo Cobro</th>
                  </tr>
                </thead>
                <tbody>
                  {suscripciones.map((suscripcion) => (
                    <tr key={suscripcion.id}>
                      <td>{suscripcion.tenantNombre || 'N/A'}</td>
                      <td><span className="plan-badge">{suscripcion.plan}</span></td>
                      <td>
                        <span className={`status-badge ${getEstadoBadgeClass(suscripcion.estado)}`}>
                          {suscripcion.estado}
                        </span>
                      </td>
                      <td className="font-bold">{formatCurrency(suscripcion.montoMensual)}</td>
                      <td>{formatDate(suscripcion.fechaInicio)}</td>
                      <td>{suscripcion.proximoCobro ? formatDate(suscripcion.proximoCobro) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'resumen' && (
        <div className="content-section">
          <div className="resumen-filters">
            <select
              value={resumenMes}
              onChange={(e) => setResumenMes(parseInt(e.target.value))}
              className="filter-select"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i + 1}>
                  {new Date(2000, i, 1).toLocaleDateString('es-ES', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={resumenAnio}
              onChange={(e) => setResumenAnio(parseInt(e.target.value))}
              className="filter-select"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {resumen && (
            <div className="resumen-content">
              <div className="resumen-totals">
                <div className="resumen-card">
                  <div className="resumen-label">Total Facturado</div>
                  <div className="resumen-value">{formatCurrency(resumen.total_facturado)}</div>
                </div>
                <div className="resumen-card success">
                  <div className="resumen-label">Total Cobrado</div>
                  <div className="resumen-value">{formatCurrency(resumen.total_cobrado)}</div>
                </div>
                <div className="resumen-card warning">
                  <div className="resumen-label">Total Pendiente</div>
                  <div className="resumen-value">{formatCurrency(resumen.total_pendiente)}</div>
                </div>
                <div className="resumen-card danger">
                  <div className="resumen-label">Total Vencido</div>
                  <div className="resumen-value">{formatCurrency(resumen.total_vencido)}</div>
                </div>
              </div>

              <div className="resumen-details">
                <div className="resumen-section">
                  <h3>Por Estado</h3>
                  <div className="resumen-list">
                    {resumen.por_estado.map((item) => (
                      <div key={item.estado} className="resumen-list-item">
                        <span className={`status-badge ${getEstadoBadgeClass(item.estado)}`}>
                          {item.estado}
                        </span>
                        <span>{item.cantidad} facturas</span>
                        <span className="font-bold">{formatCurrency(item.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="resumen-section">
                  <h3>Por Membresía</h3>
                  <div className="resumen-list">
                    {resumen.por_membresia.map((item) => (
                      <div key={item.tipo} className="resumen-list-item">
                        <span className="plan-badge">{item.tipo}</span>
                        <span>{item.cantidad} facturas</span>
                        <span className="font-bold">{formatCurrency(item.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedFactura && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Factura {selectedFactura.numeroFactura}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="invoice-header">
                <div className="invoice-info">
                  <p><strong>Tenant:</strong> {selectedFactura.tenantNombre}</p>
                  <p><strong>Plan:</strong> {selectedFactura.tipo_membresia_nombre || selectedFactura.plan}</p>
                  <p><strong>Estado:</strong> <span className={`status-badge ${getEstadoBadgeClass(selectedFactura.estado)}`}>{selectedFactura.estado}</span></p>
                </div>
                <div className="invoice-dates">
                  <p><strong>Emisión:</strong> {formatDate(selectedFactura.fechaEmision)}</p>
                  <p><strong>Vencimiento:</strong> {formatDate(selectedFactura.fechaVencimiento)}</p>
                  {selectedFactura.fechaPago && (
                    <p><strong>Pago:</strong> {formatDate(selectedFactura.fechaPago)}</p>
                  )}
                </div>
              </div>

              <div className="invoice-breakdown">
                <h3>Desglose</h3>
                <div className="breakdown-table">
                  <div className="breakdown-row">
                    <span>Costo Base</span>
                    <span>{formatCurrency(selectedFactura.costo_base, selectedFactura.moneda)}</span>
                  </div>

                  {selectedFactura.cantidad_usuarios_extra > 0 && (
                    <div className="breakdown-row">
                      <span>Usuarios Extra ({selectedFactura.cantidad_usuarios_extra})</span>
                      <span>{formatCurrency(selectedFactura.costo_usuarios_extra, selectedFactura.moneda)}</span>
                    </div>
                  )}

                  {selectedFactura.cantidad_propiedades_extra > 0 && (
                    <div className="breakdown-row">
                      <span>Propiedades Extra ({selectedFactura.cantidad_propiedades_extra})</span>
                      <span>{formatCurrency(selectedFactura.costo_propiedades_extra, selectedFactura.moneda)}</span>
                    </div>
                  )}

                  {selectedFactura.costo_features > 0 && (
                    <div className="breakdown-row">
                      <span>Features Adicionales</span>
                      <span>{formatCurrency(selectedFactura.costo_features, selectedFactura.moneda)}</span>
                    </div>
                  )}

                  <div className="breakdown-row subtotal">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedFactura.subtotal, selectedFactura.moneda)}</span>
                  </div>

                  {selectedFactura.descuento > 0 && (
                    <div className="breakdown-row discount">
                      <span>Descuento {selectedFactura.descripcion_descuento && `(${selectedFactura.descripcion_descuento})`}</span>
                      <span>-{formatCurrency(selectedFactura.descuento, selectedFactura.moneda)}</span>
                    </div>
                  )}

                  <div className="breakdown-row total">
                    <span>Total</span>
                    <span>{formatCurrency(selectedFactura.monto, selectedFactura.moneda)}</span>
                  </div>
                </div>
              </div>

              {selectedFactura.notas && (
                <div className="invoice-notes">
                  <h3>Notas</h3>
                  <p>{selectedFactura.notas}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selectedFactura.estado !== 'pagada' && selectedFactura.estado !== 'cancelada' && (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowStatusModal(true)}
                  >
                    Cambiar Estado
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setPaymentAmount(selectedFactura.monto.toString());
                      setShowPaymentModal(true);
                    }}
                  >
                    Registrar Pago
                  </button>
                </>
              )}
              <button className="btn-neutral" onClick={() => setShowDetailModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedFactura && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Pago</h2>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Monto</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Referencia</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Número de transacción, etc."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-neutral" onClick={() => setShowPaymentModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleRegisterPayment}
                disabled={actionLoading || !paymentAmount}
              >
                {actionLoading ? 'Procesando...' : 'Registrar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedFactura && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cambiar Estado</h2>
              <button className="modal-close" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nuevo Estado</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="pagada">Pagada</option>
                  <option value="vencida">Vencida</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-neutral" onClick={() => setShowStatusModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleChangeStatus}
                disabled={actionLoading || !newStatus}
              >
                {actionLoading ? 'Procesando...' : 'Cambiar Estado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Generar Factura</h2>
              <button className="modal-close" onClick={() => setShowGenerateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tenant</label>
                <select
                  value={generateTenantId}
                  onChange={(e) => setGenerateTenantId(e.target.value)}
                >
                  <option value="">Seleccionar tenant...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notas (opcional)</label>
                <textarea
                  value={generateNotas}
                  onChange={(e) => setGenerateNotas(e.target.value)}
                  placeholder="Notas adicionales para la factura..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-neutral" onClick={() => setShowGenerateModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleGenerateInvoice}
                disabled={actionLoading || !generateTenantId}
              >
                {actionLoading ? 'Generando...' : 'Generar Factura'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-facturacion {
          width: 100%;
        }

        .page-header {
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 8px 0;
          font-size: 2.25rem;
        }

        .page-subtitle {
          color: #64748B;
          font-size: 0.9375rem;
          margin: 0;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #F1F5F9;
          color: #334155;
          border: 1px solid #E2E8F0;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #E2E8F0;
        }

        .btn-neutral {
          background: transparent;
          color: #64748B;
          border: 1px solid #E2E8F0;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .btn-neutral:hover {
          background: #F8FAFC;
        }

        .btn-action {
          background: #EFF6FF;
          color: #2563EB;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.8125rem;
          transition: all 0.2s;
        }

        .btn-action:hover {
          background: #DBEAFE;
        }

        .error-message {
          padding: 16px;
          background: #FEE2E2;
          border: 1px solid #FECACA;
          border-radius: 12px;
          color: #DC2626;
          font-weight: 500;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          padding: 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          border-color: #CBD5E1;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          font-size: 2rem;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 14px;
          color: white;
          flex-shrink: 0;
        }

        .stat-card.stat-orange .stat-icon {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .stat-card.stat-green .stat-icon {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }

        .stat-card.stat-red .stat-icon {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
        }

        .stat-card.stat-purple .stat-icon {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        }

        .stat-card.stat-yellow .stat-icon {
          background: linear-gradient(135deg, #EAB308 0%, #CA8A04 100%);
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #0F172A;
          line-height: 1;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #64748B;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tabs-container {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 1px solid #E2E8F0;
        }

        .tab-button {
          padding: 12px 24px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #64748B;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-button:hover {
          color: #2563EB;
          background: #F8FAFC;
        }

        .tab-button.active {
          color: #2563EB;
          border-bottom-color: #2563EB;
        }

        .content-section {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          padding: 24px;
        }

        .filters-row {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .filter-select {
          padding: 10px 16px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          background: white;
          font-size: 0.875rem;
          color: #334155;
          min-width: 180px;
        }

        .table-container {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table thead {
          background: #F8FAFC;
        }

        .data-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #64748B;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        .data-table td {
          padding: 16px;
          border-top: 1px solid #E2E8F0;
          color: #0F172A;
          font-size: 0.9375rem;
        }

        .data-table tbody tr:hover {
          background: #F8FAFC;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .badge-success {
          background: #D1FAE5;
          color: #059669;
        }

        .badge-warning {
          background: #FEF3C7;
          color: #D97706;
        }

        .badge-danger {
          background: #FEE2E2;
          color: #DC2626;
        }

        .badge-neutral {
          background: #F1F5F9;
          color: #64748B;
        }

        .plan-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #EFF6FF;
          color: #2563EB;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .font-mono {
          font-family: 'Courier New', monospace;
        }

        .font-bold {
          font-weight: 700;
        }

        .empty-state {
          text-align: center;
          padding: 64px 32px;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          color: #0F172A;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          color: #64748B;
          font-size: 0.9375rem;
          margin: 0;
        }

        /* Modal Styles */
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
          padding: 24px;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-large {
          max-width: 700px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #E2E8F0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0F172A;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #64748B;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #E2E8F0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #334155;
          margin-bottom: 8px;
          font-size: 0.875rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 0.9375rem;
          color: #0F172A;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        /* Invoice Detail Styles */
        .invoice-header {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .invoice-info p,
        .invoice-dates p {
          margin: 8px 0;
          color: #334155;
        }

        .invoice-breakdown h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 16px 0;
        }

        .breakdown-table {
          background: #F8FAFC;
          border-radius: 12px;
          padding: 16px;
        }

        .breakdown-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #E2E8F0;
        }

        .breakdown-row:last-child {
          border-bottom: none;
        }

        .breakdown-row.subtotal {
          font-weight: 600;
          padding-top: 12px;
        }

        .breakdown-row.discount {
          color: #059669;
        }

        .breakdown-row.total {
          font-size: 1.125rem;
          font-weight: 700;
          color: #0F172A;
          border-top: 2px solid #E2E8F0;
          padding-top: 12px;
          margin-top: 8px;
        }

        .invoice-notes {
          margin-top: 24px;
          padding: 16px;
          background: #FEF3C7;
          border-radius: 12px;
        }

        .invoice-notes h3 {
          font-size: 0.875rem;
          font-weight: 700;
          color: #92400E;
          margin: 0 0 8px 0;
        }

        .invoice-notes p {
          color: #92400E;
          margin: 0;
        }

        /* Resumen Styles */
        .resumen-filters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .resumen-totals {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .resumen-card {
          background: #F8FAFC;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }

        .resumen-card.success {
          background: #D1FAE5;
        }

        .resumen-card.warning {
          background: #FEF3C7;
        }

        .resumen-card.danger {
          background: #FEE2E2;
        }

        .resumen-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #64748B;
          margin-bottom: 8px;
        }

        .resumen-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0F172A;
        }

        .resumen-card.success .resumen-label { color: #059669; }
        .resumen-card.warning .resumen-label { color: #D97706; }
        .resumen-card.danger .resumen-label { color: #DC2626; }

        .resumen-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .resumen-section h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 16px 0;
        }

        .resumen-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .resumen-list-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: #F8FAFC;
          border-radius: 8px;
        }

        .resumen-list-item span:nth-child(2) {
          flex: 1;
          color: #64748B;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .invoice-header {
            grid-template-columns: 1fr;
          }

          .resumen-totals {
            grid-template-columns: repeat(2, 1fr);
          }

          .resumen-details {
            grid-template-columns: 1fr;
          }

          .filters-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
