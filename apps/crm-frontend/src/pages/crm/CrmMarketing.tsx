/**
 * CrmMarketing - Centro de Marketing
 *
 * Dashboard principal con:
 * - KPIs de marketing
 * - Estado de conexiones (Google Ads, Meta, Email)
 * - Acciones rapidas
 * - Actividad reciente (placeholder)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import { QuickStat } from '../../components/marketing/MarketingActionCard';
import {
  Users,
  DollarSign,
  Share2,
  Mail,
  Image,
  Megaphone,
  BarChart3,
  Settings,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  Palette,
  GitBranch,
} from 'lucide-react';

interface ProviderConnection {
  googleAds: boolean;
  meta: boolean;
  email: boolean;
  loading: boolean;
}

const CrmMarketing: React.FC = () => {
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  const [connections, setConnections] = useState<ProviderConnection>({
    googleAds: false,
    meta: false,
    email: false,
    loading: true,
  });

  useEffect(() => {
    setPageHeader({
      title: 'Centro de Marketing',
      subtitle: 'Panel de control de marketing inmobiliario',
    });
  }, [setPageHeader]);

  // Check provider connections
  useEffect(() => {
    if (!tenantActual?.id) return;
    const check = async () => {
      try {
        const res = await apiFetch(`/tenants/${tenantActual.id}/api-credentials`);
        const data = await res.json();
        setConnections({
          googleAds: !!data.googleAdsConnected,
          meta: !!data.metaAdsConnected,
          email: !!data.emailConnected,
          loading: false,
        });
      } catch (err) {
        console.error('[Marketing Centro] Error checking connections:', err);
        setConnections({ googleAds: false, meta: false, email: false, loading: false });
      }
    };
    check();
  }, [tenantActual?.id]);

  const connectedCount = [connections.googleAds, connections.meta, connections.email].filter(Boolean).length;

  // Quick actions
  const quickActions = [
    {
      icon: <Image size={22} />,
      label: 'Crear Arte',
      color: '#ec4899',
      path: `${basePath}/marketing/creativos/artes`,
    },
    {
      icon: <Megaphone size={22} />,
      label: 'Ver Campanas',
      color: '#3b82f6',
      path: `${basePath}/marketing/campanas`,
    },
    {
      icon: <Share2 size={22} />,
      label: 'Redes Sociales',
      color: '#e11d48',
      path: `${basePath}/marketing/redes-sociales`,
    },
    {
      icon: <BarChart3 size={22} />,
      label: 'Analytics',
      color: '#6366f1',
      path: `${basePath}/marketing/analytics`,
    },
    {
      icon: <GitBranch size={22} />,
      label: 'Leads',
      color: '#0ea5e9',
      path: `${basePath}/marketing/leads`,
    },
    {
      icon: <Settings size={22} />,
      label: 'Configuracion',
      color: '#64748b',
      path: `${basePath}/marketing/configuracion`,
    },
  ];

  // Provider connection cards
  const providers = [
    {
      name: 'Google Ads',
      connected: connections.googleAds,
      color: '#4285f4',
      description: 'Campanas de busqueda, display y video',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      ),
    },
    {
      name: 'Meta Ads',
      connected: connections.meta,
      color: '#1877f2',
      description: 'Facebook Ads e Instagram Ads',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.93 3.78-3.93 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z" />
        </svg>
      ),
    },
    {
      name: 'Email Marketing',
      connected: connections.email,
      color: '#f59e0b',
      description: 'Mailchimp, SendGrid, SMTP',
      icon: <Mail size={24} />,
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* KPI Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <QuickStat
          label="Leads este mes"
          value="0"
          icon={<Users size={22} />}
          color="#3b82f6"
          trend="neutral"
        />
        <QuickStat
          label="Gasto en Ads"
          value="$0"
          icon={<DollarSign size={22} />}
          color="#16a34a"
          trend="neutral"
        />
        <QuickStat
          label="Posts publicados"
          value="0"
          icon={<Share2 size={22} />}
          color="#8b5cf6"
          trend="neutral"
        />
        <QuickStat
          label="Emails enviados"
          value="0"
          icon={<Mail size={22} />}
          color="#f59e0b"
          trend="neutral"
        />
      </div>

      {/* Estado de Conexiones */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#64748b15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
            }}
          >
            <Settings size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Estado de Conexiones
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              {connections.loading
                ? 'Verificando...'
                : `${connectedCount} de 3 plataformas conectadas`}
            </p>
          </div>
        </div>

        {connections.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 size={24} color="#64748b" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {providers.map((p) => (
              <div
                key={p.name}
                style={{
                  background: 'white',
                  borderRadius: '14px',
                  border: `1px solid ${p.connected ? `${p.color}30` : '#e2e8f0'}`,
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => navigate(`${basePath}/marketing/configuracion`)}
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
                    background: `${p.color}12`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: p.color,
                    flexShrink: 0,
                  }}
                >
                  {p.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    {p.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    {p.description}
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: p.connected ? '#dcfce7' : '#fef3c7',
                    color: p.connected ? '#16a34a' : '#92400e',
                    fontSize: '11px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {p.connected ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {p.connected ? 'Conectado' : 'Pendiente'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones Rapidas */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#3b82f615',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
            }}
          >
            <Palette size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Acciones Rapidas
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Accede directamente a las herramientas de marketing
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: '14px',
          }}
        >
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '24px 16px',
                background: 'white',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = action.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${action.color}12`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: action.color,
                }}
              >
                {action.icon}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Actividad Reciente */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#8b5cf615',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b5cf6',
            }}
          >
            <BarChart3 size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Actividad Reciente
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Ultimas acciones de marketing
            </p>
          </div>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#94a3b8',
            }}
          >
            <BarChart3 size={24} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
            Sin actividad reciente
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            Cuando publiques en redes, lances campanas o envies emails, la actividad aparecera aqui.
          </p>
          <button
            onClick={() => navigate(`${basePath}/marketing/creativos`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              background: '#1e293b',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '20px',
              transition: 'all 0.2s',
            }}
          >
            Comenzar a crear
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CrmMarketing;
