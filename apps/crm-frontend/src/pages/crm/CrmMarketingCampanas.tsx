/**
 * CrmMarketingCampanas - Multi-Provider Campaign Dashboard
 *
 * Unified campaign management with tabs:
 * - Resumen: Overview of all providers
 * - Google Ads: Google Ads campaign dashboard
 * - Meta Ads: Meta/Facebook Ads (placeholder)
 * - Email: Email campaigns (placeholder)
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
  Mail,
  CheckCircle,
  XCircle,
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

interface MetaAdsCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  reach?: number;
  conversions?: number;
}

type DateRangePreset = '7d' | '30d' | '90d';
type CampaignTab = 'resumen' | 'google' | 'meta' | 'email';

interface ProviderStatus {
  googleAds: boolean;
  meta: boolean;
  email: boolean;
  loading: boolean;
}

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
  SEARCH: 'Busqueda',
  DISPLAY: 'Display',
  VIDEO: 'Video',
  SHOPPING: 'Shopping',
  PERFORMANCE_MAX: 'Performance Max',
  DISCOVERY: 'Discovery',
  SMART: 'Smart',
  UNKNOWN: 'Otro',
};

const META_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Activa', color: '#16a34a', bg: '#dcfce7' },
  PAUSED: { label: 'Pausada', color: '#d97706', bg: '#fef3c7' },
  DELETED: { label: 'Eliminada', color: '#dc2626', bg: '#fee2e2' },
  ARCHIVED: { label: 'Archivada', color: '#64748b', bg: '#f1f5f9' },
};

const META_OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_TRAFFIC: 'Trafico',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Ventas',
  OUTCOME_ENGAGEMENT: 'Interaccion',
  OUTCOME_AWARENESS: 'Reconocimiento',
  OUTCOME_APP_PROMOTION: 'App',
  LINK_CLICKS: 'Clicks',
  LEAD_GENERATION: 'Leads',
  CONVERSIONS: 'Conversiones',
  BRAND_AWARENESS: 'Reconocimiento',
  REACH: 'Alcance',
  POST_ENGAGEMENT: 'Interaccion',
  VIDEO_VIEWS: 'Video',
  MESSAGES: 'Mensajes',
};

const TABS: { id: CampaignTab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen', label: 'Resumen', icon: <Megaphone size={16} /> },
  {
    id: 'google',
    label: 'Google Ads',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    id: 'meta',
    label: 'Meta Ads',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.93 3.78-3.93 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z" />
      </svg>
    ),
  },
  { id: 'email', label: 'Email', icon: <Mail size={16} /> },
];

// ==================== COMPONENT ====================

const CrmMarketingCampanas: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  const [activeTab, setActiveTab] = useState<CampaignTab>('resumen');
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    googleAds: false,
    meta: false,
    email: false,
    loading: true,
  });
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaAdsCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');

  useEffect(() => {
    setPageHeader({
      title: 'Campanas',
      subtitle: 'Gestiona todas tus campanas publicitarias',
    });
  }, [setPageHeader]);

  // Check all provider connections
  useEffect(() => {
    if (!tenantActual?.id) return;
    const checkProviders = async () => {
      try {
        const res = await apiFetch(`/tenants/${tenantActual.id}/api-credentials`);
        const data = await res.json();
        setProviderStatus({
          googleAds: !!data.googleAdsConnected,
          meta: !!data.metaAdsConnected,
          email: !!data.emailConnected,
          loading: false,
        });
      } catch (err) {
        console.error('[Campanas] Error checking provider status:', err);
        setProviderStatus({ googleAds: false, meta: false, email: false, loading: false });
      }
    };
    checkProviders();
  }, [tenantActual?.id]);

  // Load Google Ads campaigns when on google tab or resumen
  const loadCampaigns = useCallback(async () => {
    if (!tenantActual?.id || !providerStatus.googleAds) return;
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
  }, [tenantActual?.id, providerStatus.googleAds, dateRange]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Load Meta Ads campaigns
  const loadMetaCampaigns = useCallback(async () => {
    if (!tenantActual?.id || !providerStatus.meta) return;
    setMetaLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const res = await apiFetch(
        `/tenants/${tenantActual.id}/api-credentials/meta-ads/campaigns?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      setMetaCampaigns(data);
    } catch {
      setMetaCampaigns([]);
    } finally {
      setMetaLoading(false);
    }
  }, [tenantActual?.id, providerStatus.meta, dateRange]);

  useEffect(() => {
    loadMetaCampaigns();
  }, [loadMetaCampaigns]);

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

  // ==================== RENDER: TAB BAR ====================
  const renderTabBar = () => (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        background: '#f8fafc',
        padding: '6px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              background: isActive ? 'white' : 'transparent',
              color: isActive ? '#1e293b' : '#64748b',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  // ==================== RENDER: PROVIDER STATUS CARD ====================
  const renderProviderCard = (
    name: string,
    icon: React.ReactNode,
    connected: boolean,
    color: string,
    description: string,
    onConfigure: () => void,
    onView?: () => void
  ) => (
    <div
      style={{
        background: 'white',
        borderRadius: '16px',
        border: `1px solid ${connected ? `${color}40` : '#e2e8f0'}`,
        padding: '24px',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: `${color}12`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
            }}
          >
            {icon}
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{name}</h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>{description}</p>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: connected ? '#dcfce7' : '#f1f5f9',
            color: connected ? '#16a34a' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {connected ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {connected ? 'Conectado' : 'No conectado'}
        </div>
      </div>

      <button
        onClick={connected && onView ? onView : onConfigure}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 16px',
          background: connected
            ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
            : '#f1f5f9',
          color: connected ? 'white' : '#64748b',
          border: 'none',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        {connected ? (
          <>Ver Campanas <ChevronRight size={16} /></>
        ) : (
          <><Settings size={16} /> Configurar</>
        )}
      </button>
    </div>
  );

  // ==================== RENDER: RESUMEN TAB ====================
  const renderResumen = () => {
    if (providerStatus.loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={28} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      );
    }

    return (
      <div>
        {/* Provider status cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {renderProviderCard(
            'Google Ads',
            TABS[1].icon,
            providerStatus.googleAds,
            '#4285f4',
            'Campanas de busqueda, display y video',
            () => navigate(`${basePath}/marketing/configuracion`),
            () => setActiveTab('google')
          )}
          {renderProviderCard(
            'Meta Ads',
            TABS[2].icon,
            providerStatus.meta,
            '#1877f2',
            'Facebook Ads e Instagram Ads',
            () => navigate(`${basePath}/marketing/configuracion`),
            () => setActiveTab('meta')
          )}
          {renderProviderCard(
            'Email Marketing',
            <Mail size={22} />,
            providerStatus.email,
            '#f59e0b',
            'Campanas de email masivo',
            () => navigate(`${basePath}/marketing/configuracion`),
            () => setActiveTab('email')
          )}
        </div>

        {/* Aggregated KPIs if Google Ads is connected */}
        {providerStatus.googleAds && campaigns.length > 0 && (
          <>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
              Metricas Agregadas (Google Ads)
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              {[
                { label: 'Impresiones', value: formatNumber(totals.impressions), icon: <Eye size={20} />, color: '#3b82f6' },
                { label: 'Clicks', value: formatNumber(totals.clicks), icon: <MousePointer size={20} />, color: '#22c55e' },
                { label: 'Costo Total', value: formatCurrency(totals.cost), icon: <DollarSign size={20} />, color: '#f59e0b' },
                { label: 'Conversiones', value: formatNumber(totals.conversions), icon: <Target size={20} />, color: '#8b5cf6' },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
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
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginBottom: '2px' }}>
                      {kpi.label}
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                      {loading ? '—' : kpi.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* No providers connected */}
        {!providerStatus.googleAds && !providerStatus.meta && !providerStatus.email && (
          <div
            style={{
              background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
              border: '1px solid #a5b4fc',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
            }}
          >
            <AlertCircle size={22} color="#4f46e5" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#3730a3', margin: '0 0 6px 0' }}>
                Conecta al menos una plataforma
              </h4>
              <p style={{ fontSize: '13px', color: '#4f46e5', margin: 0, lineHeight: 1.5 }}>
                Para ver tus campanas, conecta Google Ads, Meta Ads o tu proveedor de email
                en la seccion de{' '}
                <strong
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate(`${basePath}/marketing/configuracion`)}
                >
                  Configuracion
                </strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDER: GOOGLE ADS TAB ====================
  const renderGoogleAds = () => {
    if (providerStatus.loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      );
    }

    if (!providerStatus.googleAds) {
      return (
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
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Conecta Google Ads
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '28px' }}>
            Para ver tus campanas, metricas y rendimiento necesitas conectar tu cuenta de Google Ads.
          </p>
          <button
            onClick={() => navigate(`${basePath}/marketing/configuracion`)}
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
      );
    }

    // ── Connected Google Ads Dashboard ──
    return (
      <div>
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
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#4285f415',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4285f4',
              }}
            >
              {TABS[1].icon}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Google Ads
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Rendimiento de campanas publicitarias
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {([
              { key: '7d', label: '7 dias' },
              { key: '30d', label: '30 dias' },
              { key: '90d', label: '90 dias' },
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
              No se encontraron campanas
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              No hay campanas activas en los ultimos {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} dias.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, marginBottom: '-4px' }}>
              {campaigns.length} campana{campaigns.length !== 1 ? 's' : ''} encontrada{campaigns.length !== 1 ? 's' : ''}
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
            Las metricas se obtienen directamente de tu cuenta de Google Ads.
            Para crear o editar campanas, usa el{' '}
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
      </div>
    );
  };

  // ==================== RENDER: META ADS TAB ====================
  const renderMetaAds = () => {
    if (providerStatus.loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 size={32} color="#1877f2" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      );
    }

    if (!providerStatus.meta) {
      return (
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
              background: '#1877f215',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              color: '#1877f2',
            }}
          >
            {TABS[2].icon}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Conecta Meta Ads
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '28px' }}>
            Para gestionar tus campanas de Facebook e Instagram Ads, conecta tu cuenta de Meta Business.
          </p>
          <button
            onClick={() => navigate(`${basePath}/marketing/configuracion`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #1877f2 0%, #1565c0 100%)',
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
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(24, 119, 242, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Settings size={18} />
            Configurar Meta Ads
            <ChevronRight size={16} />
          </button>
        </div>
      );
    }

    // Compute Meta totals
    const metaTotals = metaCampaigns.reduce(
      (acc, c) => ({
        spend: acc.spend + (c.spend || 0),
        impressions: acc.impressions + (c.impressions || 0),
        clicks: acc.clicks + (c.clicks || 0),
        reach: acc.reach + (c.reach || 0),
        conversions: acc.conversions + (c.conversions || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, reach: 0, conversions: 0 }
    );

    return (
      <div>
        {/* Header row */}
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
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#1877f215',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1877f2',
              }}
            >
              {TABS[2].icon}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Meta Ads
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Rendimiento de campanas en Facebook e Instagram
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {([
              { key: '7d', label: '7 dias' },
              { key: '30d', label: '30 dias' },
              { key: '90d', label: '90 dias' },
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

        {/* KPI Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          {[
            { label: 'Gasto Total', value: formatCurrency(metaTotals.spend), icon: <DollarSign size={22} />, color: '#f59e0b' },
            { label: 'Impresiones', value: formatNumber(metaTotals.impressions), icon: <Eye size={22} />, color: '#3b82f6' },
            { label: 'Clicks', value: formatNumber(metaTotals.clicks), icon: <MousePointer size={22} />, color: '#22c55e' },
            { label: 'Alcance', value: formatNumber(metaTotals.reach), icon: <Target size={22} />, color: '#8b5cf6' },
            { label: 'Conversiones', value: formatNumber(metaTotals.conversions), icon: <Target size={22} />, color: '#ef4444' },
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
                  {metaLoading ? '—' : kpi.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Campaign List */}
        {metaLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 size={28} color="#1877f2" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : metaCampaigns.length === 0 ? (
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
              No se encontraron campanas
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              No hay campanas en los ultimos {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} dias.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, marginBottom: '-4px' }}>
              {metaCampaigns.length} campana{metaCampaigns.length !== 1 ? 's' : ''} encontrada{metaCampaigns.length !== 1 ? 's' : ''}
            </div>
            {metaCampaigns.map((campaign) => {
              const statusInfo = META_STATUS_LABELS[campaign.status] || META_STATUS_LABELS.ACTIVE;
              const objectiveLabel = META_OBJECTIVE_LABELS[campaign.objective] || campaign.objective;
              return (
                <div
                  key={campaign.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '20px 24px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#1877f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
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
                        {objectiveLabel}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {[
                      { label: 'Gasto', value: campaign.spend != null ? formatCurrency(campaign.spend) : '—' },
                      { label: 'Impresiones', value: campaign.impressions != null ? formatNumber(campaign.impressions) : '—' },
                      { label: 'Clicks', value: campaign.clicks != null ? formatNumber(campaign.clicks) : '—' },
                      { label: 'CTR', value: campaign.ctr != null ? `${campaign.ctr.toFixed(2)}%` : '—' },
                      { label: 'Alcance', value: campaign.reach != null ? formatNumber(campaign.reach) : '—' },
                      { label: 'Conversiones', value: campaign.conversions != null ? formatNumber(campaign.conversions) : '—' },
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
            Las metricas se obtienen directamente de tu cuenta de Meta Ads.
            Para crear o editar campanas, usa el{' '}
            <a
              href="https://business.facebook.com/adsmanager"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'underline' }}
            >
              Administrador de Anuncios de Meta
            </a>.
          </p>
        </div>
      </div>
    );
  };

  // ==================== RENDER: PLACEHOLDER TAB ====================
  const renderPlaceholderTab = (
    name: string,
    icon: React.ReactNode,
    color: string,
    connected: boolean,
    description: string
  ) => (
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
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          color: color,
        }}
      >
        {icon}
      </div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
        {connected ? `Campanas ${name}` : `Conecta ${name}`}
      </h2>
      <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '28px' }}>
        {connected
          ? `Tu cuenta de ${name} esta conectada. La visualizacion de campanas estara disponible proximamente.`
          : description}
      </p>
      <button
        onClick={() => navigate(`${basePath}/marketing/configuracion`)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 28px',
          background: connected
            ? '#f1f5f9'
            : `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          color: connected ? '#64748b' : 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 8px 24px ${color}40`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Settings size={18} />
        {connected ? 'Ver Configuracion' : `Configurar ${name}`}
        <ChevronRight size={16} />
      </button>
    </div>
  );

  // ==================== MAIN RENDER ====================
  return (
    <div style={{ padding: '24px' }}>
      {renderTabBar()}

      {activeTab === 'resumen' && renderResumen()}
      {activeTab === 'google' && renderGoogleAds()}
      {activeTab === 'meta' && renderMetaAds()}
      {activeTab === 'email' &&
        renderPlaceholderTab(
          'Email Marketing',
          <Mail size={36} />,
          '#f59e0b',
          providerStatus.email,
          'Para enviar campanas de email masivo, configura tu proveedor de email (Mailchimp, SendGrid, etc.).'
        )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CrmMarketingCampanas;
