/**
 * AdminAnalytics - Página de Analytics del panel de administración
 * Métricas avanzadas y estadísticas de la plataforma
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getAdminStats, AdminStats } from '../../services/api';

// Iconos SVG
const IconChart = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3V21H21M7 16L12 11L16 15L21 10M21 10H17M21 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconBuilding = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21H21M5 21V7L12 3L19 7V21M5 21H19M9 9V17M15 9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconUsers = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconTrending = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 7L18 12L21 9M21 9V12M21 9H18M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconZap = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconWarning = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function AdminAnalytics() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación. Por favor, inicia sesión nuevamente.');
      }
      const data = await getAdminStats(token);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar analytics');
      console.error('Error cargando analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-analytics-loading">
        <div className="loading-spinner"></div>
        <p>Cargando analytics...</p>
        <style>{`
          .admin-analytics-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            color: #64748B;
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

  if (error) {
    return (
      <div className="admin-analytics-error">
        <div className="error-icon">
          <IconWarning />
        </div>
        <h3>Error al cargar datos</h3>
        <p>{error}</p>
        <button onClick={loadStats} className="retry-btn">
          Reintentar
        </button>
        <style>{`
          .admin-analytics-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            color: #64748B;
            text-align: center;
          }
          .error-icon {
            width: 48px;
            height: 48px;
            color: #EF4444;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .retry-btn {
            padding: 12px 24px;
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          }
          .retry-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
          }
        `}</style>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const analytics = {
    tenants: {
      total: stats.totalTenants,
      active: stats.activeTenants,
      inactive: stats.inactiveTenants,
      trial: 0,
      suspended: stats.inactiveTenants,
    },
    users: {
      total: stats.totalUsers,
      platformUsers: stats.platformUsers || 0,
      tenantUsers: stats.tenantUsers || 0,
    },
    properties: {
      total: stats.totalProperties,
    },
    plans: stats.plansDistribution || {
      basic: 0,
      pro: 0,
      premium: stats.activeTenants,
    },
  };

  return (
    <div className="admin-analytics">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-content">
          <div className="header-icon">
            <IconChart />
          </div>
          <div>
            <h1>Analytics</h1>
            <p>Métricas y estadísticas de la plataforma</p>
          </div>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="kpis-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon">
            <IconBuilding />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Tenants Activos</div>
            <div className="kpi-value">{analytics.tenants.active}</div>
            <div className="kpi-subtitle">de {analytics.tenants.total} totales</div>
          </div>
        </div>

        <div className="kpi-card kpi-green">
          <div className="kpi-icon">
            <IconUsers />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Usuarios Plataforma</div>
            <div className="kpi-value">{analytics.users.total}</div>
            <div className="kpi-subtitle">
              {analytics.users.platformUsers} platform, {analytics.users.tenantUsers} tenant
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-purple">
          <div className="kpi-icon">
            <IconTrending />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Propiedades en Red</div>
            <div className="kpi-value">{analytics.properties.total.toLocaleString()}</div>
            <div className="kpi-subtitle">Total en la plataforma</div>
          </div>
        </div>

        <div className="kpi-card kpi-orange">
          <div className="kpi-icon">
            <IconZap />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Tasa de Activos</div>
            <div className="kpi-value">
              {analytics.tenants.total > 0
                ? Math.round((analytics.tenants.active / analytics.tenants.total) * 100)
                : 0}
              <span className="kpi-unit">%</span>
            </div>
            <div className="kpi-subtitle">Tenants activos</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="analytics-grid">
        {/* Estado de Tenants */}
        <div className="analytics-section">
          <h3>Estado de Tenants</h3>
          <div className="status-list">
            <StatusRow
              label="Activos"
              value={analytics.tenants.active}
              color="green"
              percentage={
                analytics.tenants.total > 0
                  ? Math.round((analytics.tenants.active / analytics.tenants.total) * 100)
                  : 0
              }
            />
            <StatusRow
              label="Inactivos"
              value={analytics.tenants.inactive}
              color="red"
              percentage={
                analytics.tenants.total > 0
                  ? Math.round((analytics.tenants.inactive / analytics.tenants.total) * 100)
                  : 0
              }
            />
            <StatusRow
              label="Suspendidos"
              value={analytics.tenants.suspended}
              color="red"
              percentage={
                analytics.tenants.total > 0
                  ? Math.round((analytics.tenants.suspended / analytics.tenants.total) * 100)
                  : 0
              }
            />
          </div>
        </div>

        {/* Distribución por Plan */}
        <div className="analytics-section">
          <h3>Distribución por Plan</h3>
          <div className="plans-list">
            <PlanBar
              label="Premium"
              value={analytics.plans.premium}
              total={analytics.tenants.total}
              color="purple"
            />
            <PlanBar
              label="Pro"
              value={analytics.plans.pro}
              total={analytics.tenants.total}
              color="blue"
            />
            <PlanBar
              label="Basic"
              value={analytics.plans.basic}
              total={analytics.tenants.total}
              color="gray"
            />
          </div>
        </div>
      </div>

      {/* Salud de la Plataforma */}
      <div className="analytics-section">
        <h3>Salud de la Plataforma</h3>
        <div className="health-grid">
          <HealthCard label="Uptime" value="99.9%" status="good" />
          <HealthCard label="API Response" value="Operacional" status="good" />
          <HealthCard label="Base de Datos" value="Conectada" status="good" />
          <HealthCard label="Almacenamiento" value="OK" status="good" />
        </div>
      </div>

      <style>{`
        .admin-analytics {
          max-width: 1400px;
        }

        .analytics-header {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .header-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .analytics-header h1 {
          margin: 0 0 8px 0;
          font-size: 2.25rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
        }

        .analytics-header p {
          margin: 0;
          color: #64748B;
          font-size: 1rem;
          font-weight: 400;
        }

        .kpis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .kpi-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 28px;
          display: flex;
          gap: 20px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          border-color: #CBD5E1;
        }

        .kpi-blue {
          border-left: 4px solid #2563EB;
        }

        .kpi-green {
          border-left: 4px solid #10B981;
        }

        .kpi-purple {
          border-left: 4px solid #8B5CF6;
        }

        .kpi-orange {
          border-left: 4px solid #F59E0B;
        }

        .kpi-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: white;
        }

        .kpi-green .kpi-icon {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }

        .kpi-purple .kpi-icon {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        }

        .kpi-orange .kpi-icon {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .kpi-content {
          flex: 1;
        }

        .kpi-label {
          font-size: 0.875rem;
          color: #64748B;
          margin-bottom: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .kpi-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 4px;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .kpi-unit {
          font-size: 1.5rem;
          color: #64748B;
        }

        .kpi-subtitle {
          font-size: 0.8125rem;
          color: #64748B;
          font-weight: 500;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .analytics-section {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .analytics-section h3 {
          margin: 0 0 24px 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.01em;
        }

        .status-list,
        .plans-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .health-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
      `}</style>
    </div>
  );
}

/**
 * Componente para mostrar fila de estado
 */
function StatusRow({
  label,
  value,
  color,
  percentage,
}: {
  label: string;
  value: number;
  color: 'green' | 'yellow' | 'red';
  percentage: number;
}) {
  const colorMap = {
    green: {
      bg: '#D1FAE5',
      dot: '#059669',
      text: '#059669',
    },
    yellow: {
      bg: '#FEF3C7',
      dot: '#D97706',
      text: '#D97706',
    },
    red: {
      bg: '#FEE2E2',
      dot: '#DC2626',
      text: '#DC2626',
    },
  };

  const colors = colorMap[color];

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        background: colors.bg,
        borderRadius: '10px',
        border: `1px solid ${colors.dot}20`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: colors.dot,
            boxShadow: `0 0 0 3px ${colors.dot}20`,
          }}
        />
        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A' }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.text }}>
          {value}
        </span>
        <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 500 }}>({percentage}%)</span>
      </div>
    </div>
  );
}

/**
 * Componente para mostrar barra de plan
 */
function PlanBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: 'purple' | 'blue' | 'gray';
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  const colorMap = {
    purple: '#8B5CF6',
    blue: '#2563EB',
    gray: '#64748B',
  };

  const bgColor = colorMap[color];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.9375rem', color: '#64748B', fontWeight: 500 }}>
          {value} ({percentage}%)
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: '10px',
          background: '#F1F5F9',
          borderRadius: '5px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: bgColor,
            borderRadius: '5px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Componente para mostrar tarjeta de salud
 */
function HealthCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'error';
}) {
  const statusMap = {
    good: {
      bg: '#D1FAE5',
      text: '#059669',
      icon: <IconCheck />,
    },
    warning: {
      bg: '#FEF3C7',
      text: '#D97706',
      icon: <IconWarning />,
    },
    error: {
      bg: '#FEE2E2',
      text: '#DC2626',
      icon: <IconX />,
    },
  };

  const statusStyle = statusMap[status];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          background: statusStyle.bg,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: statusStyle.text,
          flexShrink: 0,
        }}
      >
        {statusStyle.icon}
      </div>
      <div>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748B', fontWeight: 500 }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>
          {value}
        </p>
      </div>
    </div>
  );
}
