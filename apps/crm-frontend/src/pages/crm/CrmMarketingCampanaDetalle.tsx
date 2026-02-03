/**
 * CrmMarketingCampanaDetalle - Detalle de Campaña Google Ads
 *
 * Página de detalle con:
 * - KPIs de la campaña (impresiones, clicks, CTR, costo, conversiones, CPC)
 * - Gráfico de barras diario (CSS puro, sin librería)
 * - Selector de métrica para el gráfico
 * - Selector de rango de fechas
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import {
  Eye,
  MousePointer,
  DollarSign,
  Target,
  TrendingUp,
  BarChart3,
  Loader2,
  AlertCircle,
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

interface CampaignDailyStat {
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
}

type DateRangePreset = '7d' | '30d' | '90d';
type ChartMetric = 'impressions' | 'clicks' | 'cost' | 'conversions';

// ==================== HELPERS ====================

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

const formatNumber = (val: number) =>
  new Intl.NumberFormat('es-MX').format(val);

const formatPercent = (val: number) =>
  `${(val * 100).toFixed(2)}%`;

const formatCompact = (val: number) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(val % 1 === 0 ? 0 : 1);
};

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

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${parseInt(day)} ${MONTHS_ES[parseInt(month) - 1]}`;
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

const METRIC_CONFIG: Record<ChartMetric, { label: string; color: string; format: (v: number) => string }> = {
  impressions: { label: 'Impresiones', color: '#3b82f6', format: formatCompact },
  clicks: { label: 'Clicks', color: '#22c55e', format: formatCompact },
  cost: { label: 'Costo', color: '#f59e0b', format: (v) => `$${formatCompact(v)}` },
  conversions: { label: 'Conversiones', color: '#8b5cf6', format: formatCompact },
};

// ==================== COMPONENT ====================

const CrmMarketingCampanaDetalle: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { campaignId } = useParams<{ campaignId: string }>();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  // Campaign info from router state or fetched
  const campaignFromState = (location.state as any)?.campaign as GoogleAdsCampaign | undefined;
  const [campaign, setCampaign] = useState<GoogleAdsCampaign | null>(campaignFromState || null);
  const [dailyStats, setDailyStats] = useState<CampaignDailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('impressions');

  // Set page header
  useEffect(() => {
    setPageHeader({
      title: campaign?.name || 'Detalle de Campaña',
      subtitle: 'Rendimiento diario de la campaña',
      backButton: {
        label: 'Campañas',
        onClick: () => navigate(`${basePath}/marketing/campanas`),
      },
    });
  }, [setPageHeader, campaign?.name, basePath, navigate]);

  // If we don't have campaign data from state, fetch all campaigns and find ours
  useEffect(() => {
    if (campaign || !tenantActual?.id || !campaignId) return;
    const fetchCampaign = async () => {
      try {
        const { startDate, endDate } = getDateRange(dateRange);
        const res = await apiFetch(
          `/tenants/${tenantActual.id}/api-credentials/google-ads/campaigns?startDate=${startDate}&endDate=${endDate}`
        );
        if (res.ok) {
          const campaigns: GoogleAdsCampaign[] = await res.json();
          const found = campaigns.find((c) => c.id === campaignId);
          if (found) setCampaign(found);
        }
      } catch {
        // ignore
      }
    };
    fetchCampaign();
  }, [campaign, tenantActual?.id, campaignId, dateRange]);

  // Load daily stats
  const loadStats = useCallback(async () => {
    if (!tenantActual?.id || !campaignId) return;
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/api-credentials/google-ads/campaigns/${campaignId}/stats?startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setDailyStats(data);
      } else {
        setDailyStats([]);
      }
    } catch {
      setDailyStats([]);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, campaignId, dateRange]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Compute chart max value
  const maxValue = dailyStats.reduce((max, d) => Math.max(max, d[selectedMetric]), 0);

  // Compute stat totals from daily data
  const statTotals = dailyStats.reduce(
    (acc, d) => ({
      impressions: acc.impressions + d.impressions,
      clicks: acc.clicks + d.clicks,
      cost: acc.cost + d.cost,
      conversions: acc.conversions + d.conversions,
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0 }
  );
  const computedCtr = statTotals.impressions > 0 ? statTotals.clicks / statTotals.impressions : 0;
  const computedCpc = statTotals.clicks > 0 ? statTotals.cost / statTotals.clicks : 0;

  const statusInfo = campaign ? (STATUS_LABELS[campaign.status] || STATUS_LABELS.ENABLED) : null;
  const typeLabel = campaign ? (TYPE_LABELS[campaign.type] || campaign.type) : '';

  return (
    <div style={{ padding: '24px' }}>
      {/* Campaign info header */}
      {campaign && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
            flexWrap: 'wrap',
          }}
        >
          {statusInfo && (
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                color: statusInfo.color,
                background: statusInfo.bg,
              }}
            >
              {statusInfo.label}
            </span>
          )}
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#64748b',
              background: '#f1f5f9',
            }}
          >
            {typeLabel}
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            ID: {campaignId}
          </span>
        </div>
      )}

      {/* Date range picker */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: '24px',
        }}
      >
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

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
        }}
      >
        {[
          { label: 'Impresiones', value: formatNumber(statTotals.impressions), icon: <Eye size={20} />, color: '#3b82f6' },
          { label: 'Clicks', value: formatNumber(statTotals.clicks), icon: <MousePointer size={20} />, color: '#22c55e' },
          { label: 'CTR', value: formatPercent(computedCtr), icon: <TrendingUp size={20} />, color: '#0ea5e9' },
          { label: 'Costo', value: formatCurrency(statTotals.cost), icon: <DollarSign size={20} />, color: '#f59e0b' },
          { label: 'Conversiones', value: formatNumber(statTotals.conversions), icon: <Target size={20} />, color: '#8b5cf6' },
          { label: 'CPC Prom.', value: formatCurrency(computedCpc), icon: <BarChart3 size={20} />, color: '#ec4899' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: 'white',
              borderRadius: '14px',
              padding: '18px',
              border: '1px solid #e2e8f0',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${kpi.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: kpi.color,
                }}
              >
                {kpi.icon}
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                {kpi.label}
              </span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
              {loading ? '—' : kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Daily Performance Chart */}
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
        }}
      >
        {/* Chart header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Rendimiento Diario
          </h3>
          {/* Metric selector */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(Object.entries(METRIC_CONFIG) as [ChartMetric, typeof METRIC_CONFIG[ChartMetric]][]).map(
              ([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: selectedMetric === key ? `2px solid ${config.color}` : '1px solid #e2e8f0',
                    background: selectedMetric === key ? `${config.color}10` : 'white',
                    color: selectedMetric === key ? config.color : '#64748b',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {config.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Chart body */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 size={28} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : dailyStats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <BarChart3 size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              No hay datos de rendimiento para este periodo
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '3px',
              height: '240px',
              padding: '0 0 44px 0',
              overflowX: dailyStats.length > 31 ? 'auto' : 'hidden',
              position: 'relative',
            }}
          >
            {dailyStats.map((day) => {
              const value = day[selectedMetric];
              const heightPct = maxValue > 0 ? (value / maxValue) * 100 : 0;
              const config = METRIC_CONFIG[selectedMetric];

              return (
                <div
                  key={day.date}
                  style={{
                    flex: dailyStats.length <= 14 ? 1 : 'none',
                    width: dailyStats.length > 14 ? `${Math.max(24, 600 / dailyStats.length)}px` : undefined,
                    minWidth: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    position: 'relative',
                  }}
                >
                  {/* Value label on top */}
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#64748b',
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      opacity: value > 0 ? 1 : 0.3,
                    }}
                  >
                    {value > 0 ? config.format(value) : '0'}
                  </div>

                  {/* Bar container */}
                  <div
                    style={{
                      flex: 1,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '70%',
                        minWidth: '10px',
                        maxWidth: '32px',
                        height: `${Math.max(heightPct, value > 0 ? 3 : 0)}%`,
                        background: `linear-gradient(180deg, ${config.color} 0%, ${config.color}bb 100%)`,
                        borderRadius: '4px 4px 0 0',
                        transition: 'all 0.4s ease',
                      }}
                    />
                  </div>

                  {/* Date label */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-40px',
                      fontSize: '9px',
                      color: '#94a3b8',
                      whiteSpace: 'nowrap',
                      transform: dailyStats.length > 14 ? 'rotate(-45deg)' : 'none',
                      transformOrigin: 'top center',
                    }}
                  >
                    {formatShortDate(day.date)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          Los datos se obtienen directamente de tu cuenta de Google Ads y pueden tardar hasta 24 horas
          en reflejar los últimos cambios.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CrmMarketingCampanaDetalle;
