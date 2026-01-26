/**
 * CrmMarketingCampanas - Google Ads Campaign Dashboard
 *
 * Dashboard de campañas publicitarias de Google Ads:
 * - KPIs resumen (impresiones, clicks, costo, conversiones)
 * - Selector de rango de fechas
 * - Lista de campañas con métricas
 * - Navegación a detalle por campaña
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import {
  Eye,
  MousePointer,
  DollarSign,
  Target,
  Megaphone,
  ChevronRight,
  Loader2,
  AlertCircle,
  Settings,
} from 'lucide-react';

// ==================== TYPES ====================

interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  biddingStrategy: string;
  budget: number;
  budgetCurrency: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  avgCpc: number;
  startDate?: string;
  endDate?: string;
}

type DateRangePreset = '7d' | '30d' | '90d';
type ConnectionStatus = 'loading' | 'not_connected' | 'connected' | 'error';

// ==================== HELPERS ====================

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

const formatNumber = (val: number) =>
  new Intl.NumberFormat('es-MX').format(val);

const formatPercent = (val: number) =>
  `${(val * 100).toFixed(2)}%`;

function getDateRange(preset: DateRangePreset): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (preset === '7d') start.setDate(end.getDate() - 7);
  else if (preset === '30d') start.setDate(end.getDate() - 30);
  else if (preset === '90d') start.setDate(end.getDate() - 90);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ENABLED: { label: 'Activa', color: '#16a34a', bg: '#dcfce7' },
  PAUSED: { label: 'Pausada', color: '#d97706', bg: '#fef3c7' },
  REMOVED: { label: 'Eliminada', color: '#dc2626', bg: '#fee2e2' },
};

const TYPE_LABELS: Record<string, string> = {
  SEARCH: 'Búsqueda',
  DISPLAY: 'Display',
  VIDEO: 'Video',
  SHOPPING: 'Shopping',
  PERFORMANCE_MAX: 'Performance Max',
  DISCOVERY: 'Discovery',
  SMART: 'Smart',
  UNKNOWN: 'Otro',
};

// ==================== COMPONENT ====================

const CrmMarketingCampanas: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('loading');
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');

  useEffect(() => {
    setPageHeader({
      title: 'Campañas Google Ads',
      subtitle: 'Rendimiento de tus campañas publicitarias',
    });
  }, [setPageHeader]);

  // Check connection status on mount
  useEffect(() => {
    if (!tenantActual?.id) return;
    const checkConnection = async () => {
      try {
        const res = await apiFetch(`/tenants/${tenantActual.id}/api-credentials`);
        if (!res.ok) {
          setConnectionStatus('not_connected');
          return;
        }
        const data = await res.json();
        if (data.googleAdsConnected && data.googleAdsCustomerId && data.googleAdsCustomerId !== 'PENDING') {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('not_connected');
        }
      } catch {
        setConnectionStatus('error');
      }
    };
    checkConnection();
  }, [tenantActual?.id]);

  // Load campaigns when connected and date range changes
  const loadCampaigns = useCallback(async () => {
    if (!tenantActual?.id || connectionStatus !== 'connected') return;
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/api-credentials/google-ads/campaigns?startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      } else {
        setCampaigns([]);
      }
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, connectionStatus, dateRange]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Compute totals
  const totals = campaigns.reduce(
    (acc, c) => ({
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      cost: acc.cost + c.cost,
      conversions: acc.conversions + c.conversions,
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0 }
  );

  // ==================== RENDER: LOADING STATE ====================
  if (connectionStatus === 'loading') {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ==================== RENDER: NOT CONNECTED ====================
  if (connectionStatus === 'not_connected' || connectionStatus === 'error') {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '60px 40px',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '40px auto',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #4285f420 0%, #4285f410 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              color: '#4285f4',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Conecta Google Ads
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '28px' }}>
            Para ver tus campañas, métricas y rendimiento necesitas conectar tu cuenta de Google Ads.
            Vincula tu cuenta en la configuración de APIs.
          </p>

          <button
            onClick={() => navigate(`${basePath}/marketing/configuracion-apis`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #4285f4 0%, #3b78e7 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(66, 133, 244, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Settings size={18} />
            Configurar Google Ads
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ==================== RENDER: CONNECTED DASHBOARD ====================
  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header row: title + date range picker */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#4285f415',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4285f4',
            }}
          >
            <Megaphone size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Campañas Google Ads
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
              Rendimiento de tus campañas publicitarias
            </p>
          </div>
        </div>

        {/* Date range picker */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {([
            { key: '7d', label: '7 días' },
            { key: '30d', label: '30 días' },
            { key: '90d', label: '90 días' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDateRange(opt.key)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: dateRange === opt.key ? '#1e293b' : '#f1f5f9',
                color: dateRange === opt.key ? 'white' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {[
          { label: 'Impresiones', value: formatNumber(totals.impressions), icon: <Eye size={22} />, color: '#3b82f6' },
          { label: 'Clicks', value: formatNumber(totals.clicks), icon: <MousePointer size={22} />, color: '#22c55e' },
          { label: 'Costo Total', value: formatCurrency(totals.cost), icon: <DollarSign size={22} />, color: '#f59e0b' },
          { label: 'Conversiones', value: formatNumber(totals.conversions), icon: <Target size={22} />, color: '#8b5cf6' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: 'white',
              borderRadius: '14px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `${kpi.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: kpi.color,
                flexShrink: 0,
              }}
            >
              {kpi.icon}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginBottom: '4px' }}>
                {kpi.label}
              </div>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b' }}>
                {loading ? '—' : kpi.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign List */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={28} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : campaigns.length === 0 ? (
        /* Empty state */
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '60px 40px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#94a3b8',
            }}
          >
            <Megaphone size={28} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            No se encontraron campañas
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            No hay campañas activas en los últimos {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} días.
            Prueba con un rango diferente o crea una campaña en Google Ads.
          </p>
        </div>
      ) : (
        /* Campaign cards */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, marginBottom: '-4px' }}>
            {campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''} encontrada{campaigns.length !== 1 ? 's' : ''}
          </div>
          {campaigns.map((campaign) => {
            const statusInfo = STATUS_LABELS[campaign.status] || STATUS_LABELS.ENABLED;
            const typeLabel = TYPE_LABELS[campaign.type] || campaign.type;

            return (
              <div
                key={campaign.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '20px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() =>
                  navigate(`${basePath}/marketing/campanas/${campaign.id}`, {
                    state: { campaign },
                  })
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#4285f4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {/* Campaign header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      {campaign.name}
                    </h3>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: statusInfo.color,
                        background: statusInfo.bg,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#64748b',
                        background: '#f1f5f9',
                      }}
                    >
                      {typeLabel}
                    </span>
                  </div>
                  <ChevronRight size={20} color="#94a3b8" />
                </div>

                {/* Metrics row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {[
                    { label: 'Impresiones', value: formatNumber(campaign.impressions) },
                    { label: 'Clicks', value: formatNumber(campaign.clicks) },
                    { label: 'CTR', value: formatPercent(campaign.ctr) },
                    { label: 'Costo', value: formatCurrency(campaign.cost) },
                    { label: 'Conversiones', value: formatNumber(campaign.conversions) },
                    { label: 'CPC Prom.', value: formatCurrency(campaign.avgCpc) },
                  ].map((m) => (
                    <div key={m.label}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginBottom: '4px' }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #93c5fd',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          marginTop: '28px',
        }}
      >
        <AlertCircle size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '13px', color: '#3b82f6', margin: 0, lineHeight: 1.6 }}>
          Las métricas se obtienen directamente de tu cuenta de Google Ads.
          Para crear o editar campañas, usa el{' '}
          <a
            href="https://ads.google.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'underline' }}
          >
            panel de Google Ads
          </a>.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CrmMarketingCampanas;
