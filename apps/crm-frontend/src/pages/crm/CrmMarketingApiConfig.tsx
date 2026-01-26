/**
 * CrmMarketingApiConfig - Configuración de APIs de Marketing
 *
 * Página para conectar y gestionar las integraciones de APIs externas:
 * - Google (Search Console, Ads)
 * - Meta (Facebook, Instagram, Ads)
 * - Email (Mailchimp, SendGrid, SMTP)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import {
  ArrowLeft,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield,
  Mail,
  Instagram,
  Facebook,
  Search,
  Megaphone,
  ChevronRight,
  Loader2,
  Info,
  User,
  Building,
  X,
} from 'lucide-react';

// Interfaz para las credenciales del tenant
interface TenantApiCredentials {
  id: string;
  tenantId: string;
  googleSearchConsoleConnected: boolean;
  googleSearchConsoleSiteUrl?: string;
  googleAdsConnected: boolean;
  googleAdsCustomerId?: string;
  metaConnected: boolean;
  metaPageId?: string;
  metaPageName?: string;
  metaInstagramBusinessAccountId?: string;
  metaInstagramUsername?: string;
  metaAdsConnected: boolean;
  metaAdAccountId?: string;
  emailProvider: 'mailchimp' | 'sendgrid' | 'mailjet' | 'ses' | 'smtp' | 'none';
  emailConnected: boolean;
  emailSenderName?: string;
  emailSenderEmail?: string;
}

// Componente de tarjeta de integración
interface IntegrationCardProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  connected: boolean;
  connectionInfo?: string;
  color: string;
  onConnect: () => void;
  onDisconnect: () => void;
  loading?: boolean;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  icon,
  name,
  description,
  connected,
  connectionInfo,
  color,
  onConnect,
  onDisconnect,
  loading,
}) => (
  <div
    style={{
      background: 'white',
      borderRadius: '16px',
      border: connected ? `2px solid ${color}` : '1px solid #e2e8f0',
      overflow: 'hidden',
    }}
  >
    {/* Header */}
    <div
      style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: connected ? `${color}15` : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: connected ? color : '#94a3b8',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
          {name}
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
          {description}
        </p>
      </div>
      {/* Status badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          background: connected ? '#dcfce7' : '#f1f5f9',
          color: connected ? '#16a34a' : '#64748b',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        {connected ? <CheckCircle size={14} /> : <XCircle size={14} />}
        {connected ? 'Conectado' : 'No conectado'}
      </div>
    </div>

    {/* Connection info */}
    {connected && connectionInfo && (
      <div
        style={{
          padding: '12px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Info size={14} color="#64748b" />
        <span style={{ fontSize: '13px', color: '#64748b' }}>{connectionInfo}</span>
      </div>
    )}

    {/* Actions */}
    <div
      style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '13px' }}>Procesando...</span>
        </div>
      ) : connected ? (
        <>
          <button
            onClick={onDisconnect}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#fef2f2',
              color: '#ef4444',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <XCircle size={16} />
            Desconectar
          </button>
          <button
            onClick={onConnect}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#f1f5f9',
              color: '#64748b',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            Reconectar
          </button>
        </>
      ) : (
        <button
          onClick={onConnect}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <LinkIcon size={16} />
          Conectar
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  </div>
);

// Sección de integraciones
interface SectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, subtitle, icon, color, children }) => (
  <div style={{ marginBottom: '40px' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}
      >
        {icon}
      </div>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          {title}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{subtitle}</p>
      </div>
    </div>
    <div style={{ display: 'grid', gap: '16px' }}>{children}</div>
  </div>
);

// Google Ads account interface
interface GoogleAdsAccount {
  customerId: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  manager: boolean;
}

// Google Search Console site interface
interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel: string;
}

const CrmMarketingApiConfig: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual, user } = useAuth();
  const [credentials, setCredentials] = useState<TenantApiCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Google Ads account selector state
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<GoogleAdsAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // Google Search Console site selector state
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [availableSites, setAvailableSites] = useState<SearchConsoleSite[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);

  // Meta Ads ad account selector state
  const [showAdAccountSelector, setShowAdAccountSelector] = useState(false);
  const [availableAdAccounts, setAvailableAdAccounts] = useState<{ id: string; accountId: string; name: string; accountStatus: number; currency: string; businessName?: string }[]>([]);
  const [adAccountsLoading, setAdAccountsLoading] = useState(false);

  // Meta Social page selector state
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [availablePages, setAvailablePages] = useState<{ id: string; name: string; category?: string; instagramBusinessAccount?: { id: string; username: string } }[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);

  useEffect(() => {
    setPageHeader({
      title: 'Configuración de APIs',
      subtitle: 'Conecta tus cuentas de Google, Meta y email marketing',
    });
  }, [setPageHeader]);

  // Cargar credenciales del tenant
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!tenantActual?.id) return;

      try {
        const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials`);
        const data = await response.json();
        setCredentials(data);
      } catch (error) {
        console.error('Error fetching API credentials:', error);
        setCredentials(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [tenantActual?.id]);

  // Listen for OAuth postMessage from popup (Google Ads + GSC + Meta Ads + Meta Social)
  const handleOAuthMessage = useCallback(async (event: MessageEvent) => {
    const type = event.data?.type;
    if (type !== 'GOOGLE_ADS_OAUTH_RESULT' && type !== 'GSC_OAUTH_RESULT' && type !== 'META_ADS_OAUTH_RESULT' && type !== 'META_SOCIAL_OAUTH_RESULT') return;

    // Clean up popup resources
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    popupRef.current = null;

    if (type === 'GOOGLE_ADS_OAUTH_RESULT') {
      if (event.data.success) {
        setAccountsLoading(true);
        setActionLoading(null);
        try {
          const accountsResponse = await apiFetch(
            `/tenants/${tenantActual?.id}/api-credentials/google-ads/accounts`
          );
          const accounts: GoogleAdsAccount[] = await accountsResponse.json();
          if (accounts.length === 1 && !accounts[0].manager) {
            await handleSelectAccount(accounts[0].customerId);
          } else if (accounts.length > 0) {
            setAvailableAccounts(accounts);
            setShowAccountSelector(true);
          } else {
            alert('No se encontraron cuentas de Google Ads accesibles.');
          }
        } catch (error) {
          console.error('Error fetching accounts:', error);
          alert('OAuth exitoso, pero hubo un error al obtener las cuentas. Intenta de nuevo.');
        } finally {
          setAccountsLoading(false);
        }
      } else {
        setActionLoading(null);
        alert(event.data.message || 'Error en la autorización de Google Ads');
      }
    }

    if (type === 'GSC_OAUTH_RESULT') {
      if (event.data.success) {
        setSitesLoading(true);
        setActionLoading(null);
        try {
          const sitesResponse = await apiFetch(
            `/tenants/${tenantActual?.id}/api-credentials/google-search-console/sites`
          );
          const sites: SearchConsoleSite[] = await sitesResponse.json();
          if (sites.length === 1) {
            await handleSelectSite(sites[0].siteUrl);
          } else if (sites.length > 0) {
            setAvailableSites(sites);
            setShowSiteSelector(true);
          } else {
            alert('No se encontraron sitios verificados en Search Console.');
          }
        } catch (error) {
          console.error('Error fetching sites:', error);
          alert('OAuth exitoso, pero hubo un error al obtener los sitios. Intenta de nuevo.');
        } finally {
          setSitesLoading(false);
        }
      } else {
        setActionLoading(null);
        alert(event.data.message || 'Error en la autorización de Search Console');
      }
    }

    if (type === 'META_ADS_OAUTH_RESULT') {
      if (event.data.success) {
        setAdAccountsLoading(true);
        setActionLoading(null);
        try {
          const accountsResponse = await apiFetch(
            `/tenants/${tenantActual?.id}/api-credentials/meta-ads/ad-accounts`
          );
          const accounts = await accountsResponse.json();
          if (accounts.length === 1) {
            await handleSelectAdAccount(accounts[0].id, accounts[0].businessName);
          } else if (accounts.length > 0) {
            setAvailableAdAccounts(accounts);
            setShowAdAccountSelector(true);
          } else {
            alert('No se encontraron cuentas publicitarias de Meta.');
          }
        } catch (error) {
          console.error('Error fetching ad accounts:', error);
          alert('OAuth exitoso, pero hubo un error al obtener las cuentas. Intenta de nuevo.');
        } finally {
          setAdAccountsLoading(false);
        }
      } else {
        setActionLoading(null);
        alert(event.data.message || 'Error en la autorización de Meta Ads');
      }
    }

    if (type === 'META_SOCIAL_OAUTH_RESULT') {
      if (event.data.success) {
        setPagesLoading(true);
        setActionLoading(null);
        try {
          const pagesResponse = await apiFetch(
            `/tenants/${tenantActual?.id}/api-credentials/meta/pages`
          );
          const pages = await pagesResponse.json();
          if (pages.length === 1) {
            await handleSelectPage(pages[0].id);
          } else if (pages.length > 0) {
            setAvailablePages(pages);
            setShowPageSelector(true);
          } else {
            alert('No se encontraron páginas de Facebook. Asegúrate de que tu cuenta administra al menos una página.');
          }
        } catch (error) {
          console.error('Error fetching pages:', error);
          alert('OAuth exitoso, pero hubo un error al obtener las páginas. Intenta de nuevo.');
        } finally {
          setPagesLoading(false);
        }
      } else {
        setActionLoading(null);
        alert(event.data.message || 'Error en la autorización de Meta');
      }
    }
  }, [tenantActual?.id]);

  useEffect(() => {
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [handleOAuthMessage]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Handlers de conexión
  const handleConnectGoogleSearchConsole = async () => {
    if (!tenantActual?.id) return;

    setActionLoading('google-search-console');

    try {
      const userId = user?.id || 'unknown';
      const authResponse = await apiFetch(
        `/tenants/${tenantActual.id}/api-credentials/google-search-console/auth-url?connectedBy=${userId}`
      );
      const { authUrl } = await authResponse.json();

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'gsc-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      );

      if (!popup) {
        alert('No se pudo abrir la ventana de autorización. Verifica que los popups no estén bloqueados.');
        setActionLoading(null);
        return;
      }

      popupRef.current = popup;

      pollTimerRef.current = window.setInterval(() => {
        if (popup.closed) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          popupRef.current = null;
          setActionLoading(null);
        }
      }, 500);
    } catch (error) {
      console.error('Error starting GSC OAuth:', error);
      alert('Error al iniciar el flujo de autorización');
      setActionLoading(null);
    }
  };

  const handleSelectSite = async (siteUrl: string) => {
    if (!tenantActual?.id) return;

    setSitesLoading(true);
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/google-search-console/site-url`, {
        method: 'PUT',
        body: JSON.stringify({ siteUrl }),
      });

      const refreshResponse = await apiFetch(`/tenants/${tenantActual.id}/api-credentials`);
      const refreshedData = await refreshResponse.json();
      setCredentials(refreshedData);
      setShowSiteSelector(false);
      setAvailableSites([]);
    } catch (error) {
      console.error('Error selecting site:', error);
      alert('Error al seleccionar el sitio');
    } finally {
      setSitesLoading(false);
    }
  };

  const handleDisconnectGoogleSearchConsole = async () => {
    if (!tenantActual?.id) return;
    if (!confirm('¿Estás seguro de desconectar Google Search Console?')) return;

    setActionLoading('google-search-console');
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/google-search-console`, { method: 'DELETE' });
      setCredentials(prev => prev ? { ...prev, googleSearchConsoleConnected: false, googleSearchConsoleSiteUrl: undefined } : null);
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Error al desconectar Google Search Console');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectGoogleAds = async () => {
    if (!tenantActual?.id) return;

    setActionLoading('google-ads');

    try {
      // 1. Get auth URL from backend
      const userId = user?.id || 'unknown';
      const authResponse = await apiFetch(
        `/tenants/${tenantActual.id}/api-credentials/google-ads/auth-url?connectedBy=${userId}`
      );
      const { authUrl } = await authResponse.json();

      // 2. Open popup centered on screen
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'google-ads-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      );

      if (!popup) {
        alert('No se pudo abrir la ventana de autorización. Verifica que los popups no estén bloqueados.');
        setActionLoading(null);
        return;
      }

      popupRef.current = popup;

      // 3. Poll to detect if popup was closed manually (without completing OAuth)
      pollTimerRef.current = window.setInterval(() => {
        if (popup.closed) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          popupRef.current = null;
          setActionLoading(null);
        }
      }, 500);
    } catch (error) {
      console.error('Error starting OAuth:', error);
      alert('Error al iniciar el flujo de autorización');
      setActionLoading(null);
    }
  };

  const handleSelectAccount = async (customerId: string) => {
    if (!tenantActual?.id) return;

    setAccountsLoading(true);
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/google-ads/customer-id`, {
        method: 'PUT',
        body: JSON.stringify({ customerId }),
      });

      // Refresh credentials
      const refreshResponse = await apiFetch(`/tenants/${tenantActual.id}/api-credentials`);
      const refreshedData = await refreshResponse.json();
      setCredentials(refreshedData);
      setShowAccountSelector(false);
      setAvailableAccounts([]);
    } catch (error) {
      console.error('Error selecting account:', error);
      alert('Error al seleccionar la cuenta');
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleDisconnectGoogleAds = async () => {
    if (!tenantActual?.id) return;
    if (!confirm('¿Estás seguro de desconectar Google Ads?')) return;

    setActionLoading('google-ads');
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/google-ads`, { method: 'DELETE' });
      setCredentials(prev => prev ? { ...prev, googleAdsConnected: false, googleAdsCustomerId: undefined } : null);
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Error al desconectar Google Ads');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectMeta = async () => {
    if (!tenantActual?.id) return;

    setActionLoading('meta');

    try {
      const userId = user?.id || 'unknown';
      const authResponse = await apiFetch(
        `/tenants/${tenantActual.id}/api-credentials/meta/auth-url?connectedBy=${userId}`
      );
      const { authUrl } = await authResponse.json();

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'meta-social-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      );

      if (!popup) {
        alert('No se pudo abrir la ventana de autorización. Verifica que los popups no estén bloqueados.');
        setActionLoading(null);
        return;
      }

      popupRef.current = popup;

      pollTimerRef.current = window.setInterval(() => {
        if (popup.closed) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          popupRef.current = null;
          setActionLoading(null);
        }
      }, 500);
    } catch (error) {
      console.error('Error starting Meta Social OAuth:', error);
      alert('Error al iniciar el flujo de autorización');
      setActionLoading(null);
    }
  };

  const handleSelectPage = async (pageId: string) => {
    if (!tenantActual?.id) return;

    setPagesLoading(true);
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/page`, {
        method: 'PUT',
        body: JSON.stringify({ pageId }),
      });

      const refreshResponse = await apiFetch(`/tenants/${tenantActual.id}/api-credentials`);
      const refreshedData = await refreshResponse.json();
      setCredentials(refreshedData);
      setShowPageSelector(false);
      setAvailablePages([]);
    } catch (error) {
      console.error('Error selecting page:', error);
      alert('Error al seleccionar la página');
    } finally {
      setPagesLoading(false);
    }
  };

  const handleDisconnectMeta = async () => {
    if (!tenantActual?.id) return;
    if (!confirm('¿Estás seguro de desconectar Meta (Facebook/Instagram)?')) return;

    setActionLoading('meta');
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta`, { method: 'DELETE' });
      setCredentials(prev => prev ? {
        ...prev,
        metaConnected: false,
        metaPageId: undefined,
        metaPageName: undefined,
        metaInstagramBusinessAccountId: undefined,
        metaInstagramUsername: undefined,
      } : null);
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Error al desconectar Meta');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectMetaAds = async () => {
    if (!tenantActual?.id) return;

    setActionLoading('meta-ads');

    try {
      const userId = user?.id || 'unknown';
      const authResponse = await apiFetch(
        `/tenants/${tenantActual.id}/api-credentials/meta-ads/auth-url?connectedBy=${userId}`
      );
      const { authUrl } = await authResponse.json();

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'meta-ads-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      );

      if (!popup) {
        alert('No se pudo abrir la ventana de autorización. Verifica que los popups no estén bloqueados.');
        setActionLoading(null);
        return;
      }

      popupRef.current = popup;

      pollTimerRef.current = window.setInterval(() => {
        if (popup.closed) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          popupRef.current = null;
          setActionLoading(null);
        }
      }, 500);
    } catch (error) {
      console.error('Error starting Meta Ads OAuth:', error);
      alert('Error al iniciar el flujo de autorización');
      setActionLoading(null);
    }
  };

  const handleSelectAdAccount = async (adAccountId: string, businessName?: string) => {
    if (!tenantActual?.id) return;

    setAdAccountsLoading(true);
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta-ads/ad-account`, {
        method: 'PUT',
        body: JSON.stringify({ adAccountId, businessId: businessName || null }),
      });

      const refreshResponse = await apiFetch(`/tenants/${tenantActual.id}/api-credentials`);
      const refreshedData = await refreshResponse.json();
      setCredentials(refreshedData);
      setShowAdAccountSelector(false);
      setAvailableAdAccounts([]);
    } catch (error) {
      console.error('Error selecting ad account:', error);
      alert('Error al seleccionar la cuenta publicitaria');
    } finally {
      setAdAccountsLoading(false);
    }
  };

  const handleDisconnectMetaAds = async () => {
    if (!tenantActual?.id) return;
    if (!confirm('¿Estás seguro de desconectar Meta Ads?')) return;

    setActionLoading('meta-ads');
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta-ads`, { method: 'DELETE' });
      setCredentials(prev => prev ? { ...prev, metaAdsConnected: false, metaAdAccountId: undefined } : null);
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Error al desconectar Meta Ads');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectEmail = () => {
    setActionLoading('email');
    alert('La configuración de email se implementará próximamente.\n\nProveedores soportados:\n- Mailchimp\n- SendGrid\n- Mailjet\n- Amazon SES\n- SMTP personalizado');
    setActionLoading(null);
  };

  const handleDisconnectEmail = async () => {
    if (!tenantActual?.id) return;
    if (!confirm('¿Estás seguro de desconectar el proveedor de email?')) return;

    setActionLoading('email');
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/email`, { method: 'DELETE' });
      setCredentials(prev => prev ? {
        ...prev,
        emailConnected: false,
        emailProvider: 'none',
        emailSenderName: undefined,
        emailSenderEmail: undefined,
      } : null);
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Error al desconectar email');
    } finally {
      setActionLoading(null);
    }
  };

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(`${basePath}/marketing`)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: '#f1f5f9',
          border: 'none',
          borderRadius: '8px',
          color: '#64748b',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          marginBottom: '24px',
        }}
      >
        <ArrowLeft size={16} />
        Volver al Marketing Hub
      </button>

      {/* Security notice */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #93c5fd',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <Shield size={24} color="#3b82f6" />
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af', margin: '0 0 6px 0' }}>
            Tus credenciales están seguras
          </h4>
          <p style={{ fontSize: '13px', color: '#3b82f6', margin: 0, lineHeight: 1.5 }}>
            Todas las claves y tokens se almacenan encriptados. Solo tu empresa tiene acceso a sus propias integraciones.
            Nunca compartimos tus credenciales ni las usamos para otros fines.
          </p>
        </div>
      </div>

      {/* Google Section */}
      <Section
        title="Google"
        subtitle="Search Console y Google Ads"
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        }
        color="#4285f4"
      >
        <IntegrationCard
          icon={<Search size={24} />}
          name="Google Search Console"
          description="Monitorea la indexación y posicionamiento de tus páginas de propiedades en Google"
          connected={credentials?.googleSearchConsoleConnected || false}
          connectionInfo={
            credentials?.googleSearchConsoleSiteUrl
              ? credentials.googleSearchConsoleSiteUrl === 'PENDING'
                ? 'Conectado - Selecciona un sitio'
                : `Sitio: ${credentials.googleSearchConsoleSiteUrl}`
              : undefined
          }
          color="#16a34a"
          onConnect={handleConnectGoogleSearchConsole}
          onDisconnect={handleDisconnectGoogleSearchConsole}
          loading={actionLoading === 'google-search-console'}
        />
        <IntegrationCard
          icon={<Megaphone size={24} />}
          name="Google Ads"
          description="Crea y gestiona campañas de búsqueda y display para atraer compradores"
          connected={credentials?.googleAdsConnected || false}
          connectionInfo={
            credentials?.googleAdsCustomerId
              ? credentials.googleAdsCustomerId === 'PENDING'
                ? 'Conectado - Selecciona una cuenta'
                : `ID Cliente: ${credentials.googleAdsCustomerId}`
              : undefined
          }
          color="#4285f4"
          onConnect={handleConnectGoogleAds}
          onDisconnect={handleDisconnectGoogleAds}
          loading={actionLoading === 'google-ads'}
        />
      </Section>

      {/* Meta Section */}
      <Section
        title="Meta"
        subtitle="Facebook, Instagram y Meta Ads"
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        }
        color="#1877f2"
      >
        <IntegrationCard
          icon={
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Facebook size={20} />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>/</span>
              <Instagram size={20} />
            </div>
          }
          name="Facebook & Instagram"
          description="Publica posts y stories en las páginas de tu empresa y perfiles de asesores"
          connected={credentials?.metaConnected || false}
          connectionInfo={
            credentials?.metaPageName
              ? `Página: ${credentials.metaPageName}${credentials.metaInstagramUsername ? ` | IG: @${credentials.metaInstagramUsername}` : ''}`
              : undefined
          }
          color="#e11d48"
          onConnect={handleConnectMeta}
          onDisconnect={handleDisconnectMeta}
          loading={actionLoading === 'meta'}
        />
        <IntegrationCard
          icon={<Megaphone size={24} />}
          name="Meta Ads"
          description="Lanza campañas publicitarias en Facebook e Instagram con audiencias segmentadas"
          connected={credentials?.metaAdsConnected || false}
          connectionInfo={
            credentials?.metaAdAccountId
              ? credentials.metaAdAccountId === 'PENDING'
                ? 'Conectado - Selecciona una cuenta publicitaria'
                : `Cuenta: ${credentials.metaAdAccountId}`
              : undefined
          }
          color="#1877f2"
          onConnect={handleConnectMetaAds}
          onDisconnect={handleDisconnectMetaAds}
          loading={actionLoading === 'meta-ads'}
        />
      </Section>

      {/* Email Section */}
      <Section
        title="Email Marketing"
        subtitle="Envío masivo de correos"
        icon={<Mail size={22} />}
        color="#f59e0b"
      >
        <IntegrationCard
          icon={<Mail size={24} />}
          name={credentials?.emailProvider && credentials.emailProvider !== 'none'
            ? credentials.emailProvider.charAt(0).toUpperCase() + credentials.emailProvider.slice(1)
            : 'Email Provider'
          }
          description="Conecta Mailchimp, SendGrid, Mailjet, Amazon SES o configura SMTP personalizado"
          connected={credentials?.emailConnected || false}
          connectionInfo={
            credentials?.emailSenderEmail
              ? `Remitente: ${credentials.emailSenderName} <${credentials.emailSenderEmail}>`
              : undefined
          }
          color="#f59e0b"
          onConnect={handleConnectEmail}
          onDisconnect={handleDisconnectEmail}
          loading={actionLoading === 'email'}
        />
      </Section>

      {/* Multi-tenant info */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
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
            <Building size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>
              Arquitectura Multi-Tenant
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
              Cada inmobiliaria tiene sus propias credenciales de API completamente aisladas.
              Esto significa que puedes conectar las cuentas de <strong>tu empresa</strong> sin afectar a otras inmobiliarias de la plataforma.
              Tus límites de cuota de Google y Meta son exclusivos de tu cuenta.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginTop: '20px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#8b5cf615',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b5cf6',
            }}
          >
            <User size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>
              Cuentas de Asesores
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
              Además de las cuentas de la empresa, cada asesor puede conectar sus propias redes sociales personales
              para publicar contenido desde su perfil individual.{' '}
              <button
                onClick={() => navigate(`${basePath}/marketing`)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '13px',
                }}
              >
                Gestionar cuentas de asesores
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Google Ads Account Selector Modal */}
      {showAccountSelector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowAccountSelector(false);
            setAvailableAccounts([]);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '520px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  Selecciona una cuenta
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Elige la cuenta de Google Ads que deseas conectar
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAccountSelector(false);
                  setAvailableAccounts([]);
                }}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {accountsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availableAccounts.map((account) => (
                  <button
                    key={account.customerId}
                    onClick={() => handleSelectAccount(account.customerId)}
                    disabled={accountsLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      background: '#f8fafc',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#4285f4';
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: account.manager ? '#fef3c720' : '#4285f420',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: account.manager ? '#92400e' : '#4285f4',
                        flexShrink: 0,
                      }}
                    >
                      {account.manager ? <Building size={20} /> : <Megaphone size={20} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        {account.descriptiveName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        ID: {account.customerId}
                        {account.manager && (
                          <span
                            style={{
                              marginLeft: '8px',
                              padding: '2px 6px',
                              background: '#fef3c7',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#92400e',
                            }}
                          >
                            Manager
                          </span>
                        )}
                        <span style={{ marginLeft: '8px' }}>{account.currencyCode}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#94a3b8" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accounts loading overlay (while fetching accounts after OAuth) */}
      {accountsLoading && !showAccountSelector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px 48px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            }}
          >
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#4285f4' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
              Obteniendo cuentas de Google Ads...
            </span>
          </div>
        </div>
      )}

      {/* Google Search Console Site Selector Modal */}
      {showSiteSelector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowSiteSelector(false);
            setAvailableSites([]);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '520px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  Selecciona un sitio
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Elige el sitio que deseas monitorear en Search Console
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSiteSelector(false);
                  setAvailableSites([]);
                }}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {sitesLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#16a34a' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availableSites.map((site) => (
                  <button
                    key={site.siteUrl}
                    onClick={() => handleSelectSite(site.siteUrl)}
                    disabled={sitesLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      background: '#f8fafc',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#16a34a';
                      e.currentTarget.style.background = '#f0fdf4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#16a34a20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#16a34a',
                        flexShrink: 0,
                      }}
                    >
                      <Search size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', wordBreak: 'break-all' }}>
                        {site.siteUrl}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Permiso: {site.permissionLevel}
                      </div>
                    </div>
                    <ChevronRight size={16} color="#94a3b8" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sites loading overlay (while fetching sites after OAuth) */}
      {sitesLoading && !showSiteSelector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px 48px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            }}
          >
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#16a34a' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
              Obteniendo sitios de Search Console...
            </span>
          </div>
        </div>
      )}

      {/* Meta Ads Ad Account Selector Modal */}
      {showAdAccountSelector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowAdAccountSelector(false);
            setAvailableAdAccounts([]);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '520px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  Selecciona una cuenta publicitaria
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Elige la cuenta de Meta Ads que deseas conectar
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAdAccountSelector(false);
                  setAvailableAdAccounts([]);
                }}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {adAccountsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#1877f2' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availableAdAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleSelectAdAccount(account.id, account.businessName)}
                    disabled={adAccountsLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      background: '#f8fafc',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1877f2';
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#1877f220',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1877f2',
                        flexShrink: 0,
                      }}
                    >
                      <Megaphone size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        {account.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        ID: {account.accountId}
                        {account.businessName && (
                          <span style={{ marginLeft: '8px' }}>{account.businessName}</span>
                        )}
                        <span style={{ marginLeft: '8px' }}>{account.currency}</span>
                        {account.accountStatus !== 1 && (
                          <span
                            style={{
                              marginLeft: '8px',
                              padding: '2px 6px',
                              background: '#fef3c7',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#92400e',
                            }}
                          >
                            Inactiva
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} color="#94a3b8" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meta Social Page Selector Modal */}
      {showPageSelector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowPageSelector(false);
            setAvailablePages([]);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '520px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  Selecciona una página
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Elige la página de Facebook para publicar contenido
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPageSelector(false);
                  setAvailablePages([]);
                }}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {pagesLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#e11d48' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availablePages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => handleSelectPage(page.id)}
                    disabled={pagesLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      background: '#f8fafc',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#e11d48';
                      e.currentTarget.style.background = '#fef2f2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#1877f220',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1877f2',
                        flexShrink: 0,
                      }}
                    >
                      <Facebook size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        {page.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {page.category || 'Página'}
                        {page.instagramBusinessAccount && (
                          <span style={{ marginLeft: '8px' }}>
                            <Instagram size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                            @{page.instagramBusinessAccount.username}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} color="#94a3b8" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pages loading overlay (while fetching pages after OAuth) */}
      {pagesLoading && !showPageSelector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px 48px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            }}
          >
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#e11d48' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
              Obteniendo páginas de Facebook...
            </span>
          </div>
        </div>
      )}

      {/* Ad accounts loading overlay (while fetching accounts after OAuth) */}
      {adAccountsLoading && !showAdAccountSelector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px 48px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            }}
          >
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#1877f2' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
              Obteniendo cuentas publicitarias de Meta...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrmMarketingApiConfig;
