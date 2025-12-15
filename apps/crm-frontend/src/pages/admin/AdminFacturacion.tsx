/**
 * AdminFacturacion - Gestión de Facturación y Pagos
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getBillingStats, getAllFacturas, getAllSuscripciones, BillingStats, Factura, Suscripcion } from '../../services/api';

export default function AdminFacturacion() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'facturas' | 'suscripciones'>('facturas');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const [statsData, facturasData, suscripcionesData] = await Promise.all([
        getBillingStats(token),
        getAllFacturas(token),
        getAllSuscripciones(token),
      ]);

      setStats(statsData);
      setFacturas(facturasData);
      setSuscripciones(suscripcionesData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos de facturación');
      console.error('Error cargando facturación:', err);
    } finally {
      setLoading(false);
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
      </div>

      {/* Content */}
      {activeTab === 'facturas' ? (
        <div className="content-section">
          {facturas.length === 0 ? (
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
                    <th>Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((factura) => (
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
                      <td>{factura.fechaPago ? formatDate(factura.fechaPago) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
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

      <style>{`
        .admin-facturacion {
          width: 100%;
        }

        .page-header {
          margin-bottom: 32px;
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
      `}</style>
    </div>
  );
}

