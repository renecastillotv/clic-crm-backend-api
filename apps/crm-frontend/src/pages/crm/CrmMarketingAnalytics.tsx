/**
 * CrmMarketingAnalytics - Analytics & SEO
 *
 * Dashboard with real Google Search Console data:
 * - KPIs: Clicks, Impressions, CTR, Average Position
 * - Top Search Queries
 * - Top Pages
 * - Quick links to Campaigns and Configuration
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import {
  BarChart3,
  Search,
  MousePointer,
  Eye,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Settings,
  ChevronRight,
  Globe,
  FileText,
  Megaphone,
} from 'lucide-react';

// ==================== TYPES ====================

interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCStatus {
  connected: boolean;
  siteUrl?: string;
  loading: boolean;
}

type DateRangePreset = '7d' | '28d' | '90d';

// ==================== HELPERS ====================

const formatNumber = (val: number) =>
  new Intl.NumberFormat('es-MX').format(Math.round(val));

const formatCTR = (val: number) =>
  `${(val * 100).toFixed(1)}%`;

const formatPosition = (val: number) =>
  val.toFixed(1);

function getDateRange(preset: DateRangePreset): { startDate: string; endDate: string } {
  const end = new Date();
  // GSC data has a 2-3 day delay
  end.setDate(end.getDate() - 3);
  const start = new Date(end);
  if (preset === '7d') start.setDate(end.getDate() - 7);
  else if (preset === '28d') start.setDate(end.getDate() - 28);
  else if (preset === '90d') start.setDate(end.getDate() - 90);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// ==================== COMPONENT ====================

const CrmMarketingAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  const [gscStatus, setGscStatus] = useState<GSCStatus>({ connected: false, loading: true });
  const [dateRange, setDateRange] = useState<DateRangePreset>('28d');
  const [topQueries, setTopQueries] = useState<GSCRow[]>([]);
  const [topPages, setTopPages] = useState<GSCRow[]>([]);
  const [totals, setTotals] = useState({ clicks: 0, impressions: 0, ctr: 0, position: 0 });
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    setPageHeader({
      title: 'Analytics & SEO',
      subtitle: 'Mide el rendimiento de tu marketing',
    });
  }, [setPageHeader]);

  // Check GSC connection
  useEffect(() => {
    if (!tenantActual?.id) return;
    const check = async () => {
      try {
        const res = await apiFetch(`/tenants/${tenantActual.id}/api-credentials`);
        const data = await res.json();
        setGscStatus({
          connected: !!(data.googleSearchConsoleConnected && data.googleSearchConsoleSiteUrl && data.googleSearchConsoleSiteUrl !== 'PENDING'),
          siteUrl: data.googleSearchConsoleSiteUrl,
          loading: false,
        });
      } catch {
        setGscStatus({ connected: false, loading: false });
      }
    };
    check();
  }, [tenantActual?.id]);

  // Load GSC data
  const loadGSCData = useCallback(async () => {
    if (!tenantActual?.id || !gscStatus.connected) return;
    setDataLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const params = `startDate=${startDate}&endDate=${endDate}`;

      const [queriesRes, pagesRes] = await Promise.all([
        apiFetch(`/tenants/${tenantActual.id}/api-credentials/google-search-console/performance?${params}&dimension=query&limit=10`),
        apiFetch(`/tenants/${tenantActual.id}/api-credentials/google-search-console/performance?${params}&dimension=page&limit=10`),
      ]);

      const queriesData = await queriesRes.json();
      const pagesData = await pagesRes.json();

      const queries: GSCRow[] = queriesData.rows || [];
      const pages: GSCRow[] = pagesData.rows || [];

      setTopQueries(queries);
      setTopPages(pages);

      // Calculate totals from queries (they represent all data)
      const t = queries.reduce(
        (acc, r) => ({
          clicks: acc.clicks + r.clicks,
          impressions: acc.impressions + r.impressions,
          ctr: 0,
          position: 0,
        }),
        { clicks: 0, impressions: 0, ctr: 0, position: 0 }
      );
      if (t.impressions > 0) t.ctr = t.clicks / t.impressions;
      if (queries.length > 0) t.position = queries.reduce((s, r) => s + r.position, 0) / queries.length;
      setTotals(t);
    } catch (err) {
      console.error('[Analytics] Error loading GSC data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [tenantActual?.id, gscStatus.connected, dateRange]);

  useEffect(() => {
    loadGSCData();
  }, [loadGSCData]);

  // ==================== RENDER: KPI CARD ====================
  const renderKPI = (label: string, value: string, icon: React.ReactNode, color: string) => (
    <div
      style={{
        background: 'white',
        borderRadius: '14px',
        padding: '20px',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{value}</div>
    </div>
  );

  // ==================== RENDER: DATA TABLE ====================
  const renderTable = (
    title: string,
    icon: React.ReactNode,
    rows: GSCRow[],
    keyLabel: string
  ) => (
    <div
      style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        {icon}
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h3>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          Sin datos para este periodo
        </div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '10px 20px', color: '#64748b', fontWeight: 600 }}>{keyLabel}</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', color: '#64748b', fontWeight: 600 }}>Clicks</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', color: '#64748b', fontWeight: 600 }}>Impresiones</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', color: '#64748b', fontWeight: 600 }}>CTR</th>
                <th style={{ textAlign: 'right', padding: '10px 20px', color: '#64748b', fontWeight: 600 }}>Posicion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const key = row.keys[0] || '';
                const displayKey = keyLabel === 'Pagina' && key.startsWith('http')
                  ? key.replace(/^https?:\/\/[^/]+/, '')
                  : key;
                return (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td
                      style={{
                        padding: '12px 20px',
                        color: '#1e293b',
                        fontWeight: 500,
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={key}
                    >
                      {displayKey}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#1e293b', fontWeight: 600 }}>
                      {formatNumber(row.clicks)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#64748b' }}>
                      {formatNumber(row.impressions)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#64748b' }}>
                      {formatCTR(row.ctr)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 20px', color: '#64748b' }}>
                      {formatPosition(row.position)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ==================== RENDER: NOT CONNECTED ====================
  if (gscStatus.loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!gscStatus.connected) {
    return (
      <div style={{ padding: '24px', maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#6366f115',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1',
            }}
          >
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Analytics & SEO</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
              Mide el rendimiento de todas tus acciones de marketing
            </p>
          </div>
        </div>

        {/* Connect CTA */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #86efac',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: '#16a34a15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
              margin: '0 auto 20px',
            }}
          >
            <Search size={32} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>
            Conecta Google Search Console
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Monitorea como aparecen tus propiedades en Google. Ve cuantos clicks recibes, que buscan tus compradores potenciales y en que posicion apareces.
          </p>
          <button
            onClick={() => navigate(`${basePath}/marketing/configuracion`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Settings size={18} />
            Conectar en Configuracion
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
          <div
            onClick={() => navigate(`${basePath}/marketing/campanas`)}
            style={{
              background: 'white',
              borderRadius: '14px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Megaphone size={22} color="#6366f1" />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '10px 0 4px 0' }}>Dashboard de Campanas</h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Ver metricas de Google Ads y Meta Ads</p>
          </div>
          <div
            onClick={() => navigate(`${basePath}/marketing/configuracion`)}
            style={{
              background: 'white',
              borderRadius: '14px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Settings size={22} color="#6366f1" />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '10px 0 4px 0' }}>Configuracion de APIs</h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Conectar Google, Meta, Email</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER: CONNECTED DASHBOARD ====================
  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header with date range selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#16a34a15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
            }}
          >
            <Search size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Google Search Console
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              {gscStatus.siteUrl}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', borderRadius: '10px', padding: '4px', border: '1px solid #e2e8f0' }}>
          {([['7d', '7 dias'], ['28d', '28 dias'], ['90d', '90 dias']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              style={{
                padding: '8px 16px',
                borderRadius: '7px',
                border: 'none',
                background: dateRange === key ? 'white' : 'transparent',
                color: dateRange === key ? '#1e293b' : '#64748b',
                fontSize: '12px',
                fontWeight: dateRange === key ? 600 : 500,
                cursor: 'pointer',
                boxShadow: dateRange === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {dataLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <Loader2 size={24} color="#16a34a" style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* KPIs */}
      {!dataLoading && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            {renderKPI('Clicks', formatNumber(totals.clicks), <MousePointer size={18} />, '#3b82f6')}
            {renderKPI('Impresiones', formatNumber(totals.impressions), <Eye size={18} />, '#8b5cf6')}
            {renderKPI('CTR Promedio', formatCTR(totals.ctr), <ArrowUpRight size={18} />, '#16a34a')}
            {renderKPI('Posicion Promedio', formatPosition(totals.position), <TrendingUp size={18} />, '#f59e0b')}
          </div>

          {/* Tables */}
          <div style={{ display: 'grid', gap: '20px' }}>
            {renderTable('Top Consultas de Busqueda', <Search size={18} color="#16a34a" />, topQueries, 'Consulta')}
            {renderTable('Top Paginas', <Globe size={18} color="#3b82f6" />, topPages, 'Pagina')}
          </div>
        </>
      )}

      {/* Quick nav */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate(`${basePath}/marketing/campanas`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            color: '#64748b',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Megaphone size={16} /> Ver Campanas
        </button>
        <button
          onClick={() => navigate(`${basePath}/marketing/configuracion`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            color: '#64748b',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Settings size={16} /> Configuracion
        </button>
      </div>
    </div>
  );
};

export default CrmMarketingAnalytics;
