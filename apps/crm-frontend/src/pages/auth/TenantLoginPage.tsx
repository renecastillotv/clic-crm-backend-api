/**
 * TenantLoginPage - Página de inicio de sesión con branding del tenant
 * Estilo Denlla B2B Enterprise con soporte para personalización
 *
 * Supports both URL-based routing (/:tenantSlug/login) and
 * host-based routing (custom domains like crm.clicinmobiliaria.com/login)
 */

import { useEffect, useState } from 'react';
import { SignIn } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTenantSlug } from '../../components/HostBasedRoutes';
import { getTenantFromHost } from '../../utils/tenantFromHost';

interface TenantPublicInfo {
  tenant: {
    id: string;
    slug: string;
    nombre: string;
    activo: boolean;
  };
  infoNegocio: {
    nombre?: string;
    slogan?: string;
    logo_url?: string;
    isotipo_url?: string;
    color_primario?: string;
  } | null;
}

export default function TenantLoginPage() {
  // Get tenantSlug from URL params, context, or host detection
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const isCustomDomain = getTenantFromHost().isCustomDomain;
  const [tenantInfo, setTenantInfo] = useState<TenantPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTenantInfo() {
      if (!tenantSlug) {
        navigate('/login');
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/public/tenants/${tenantSlug}`);

        if (!response.ok) {
          navigate('/login');
          return;
        }

        const data = await response.json();
        setTenantInfo(data);
      } catch (err) {
        console.error('Error fetching tenant info:', err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    }

    fetchTenantInfo();
  }, [tenantSlug, navigate]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F1115',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid #2A2E34',
            borderTopColor: '#2563EB',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const displayName = tenantInfo?.infoNegocio?.nombre || tenantInfo?.tenant.nombre || 'Empresa';
  const logoUrl = tenantInfo?.infoNegocio?.logo_url || tenantInfo?.infoNegocio?.isotipo_url;

  // Premium tenant color overrides
  const PREMIUM_TENANT_COLORS: Record<string, { accent: string; hover: string }> = {
    'clic': { accent: '#f04e00', hover: '#d94500' },
    'ubikala': { accent: '#5C6B3C', hover: '#4A5730' },
  };

  const premiumColors = tenantSlug ? PREMIUM_TENANT_COLORS[tenantSlug] : null;
  const accentColor = premiumColors?.accent || tenantInfo?.infoNegocio?.color_primario || '#2563EB';
  const accentColorHover = premiumColors?.hover || (accentColor === '#2563EB' ? '#1D4ED8' : accentColor);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F1115',
        padding: '20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* Logo o nombre del tenant */}
        <div style={{ marginBottom: '32px' }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayName}
              style={{
                maxWidth: 180,
                maxHeight: 100,
                objectFit: 'contain',
                marginBottom: 16,
              }}
            />
          ) : (
            <h1
              style={{
                color: '#FFFFFF',
                fontSize: '1.75rem',
                fontWeight: 600,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              {displayName}
            </h1>
          )}
          {tenantInfo?.infoNegocio?.slogan && (
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '8px', fontSize: '0.9375rem' }}>
              {tenantInfo.infoNegocio.slogan}
            </p>
          )}
        </div>

        {/* Clerk SignIn */}
        <SignIn
          appearance={{
            elements: {
              rootBox: {
                margin: '0 auto',
              },
              card: {
                backgroundColor: '#1A1D21',
                border: '1px solid #2A2E34',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              },
              headerTitle: {
                color: '#FFFFFF',
                fontWeight: 600,
              },
              headerSubtitle: {
                color: 'rgba(255, 255, 255, 0.5)',
              },
              formFieldLabel: {
                color: 'rgba(255, 255, 255, 0.7)',
              },
              formFieldInput: {
                backgroundColor: '#121417',
                borderColor: '#3A3F45',
                color: '#FFFFFF',
                '&:focus': {
                  borderColor: accentColor,
                  boxShadow: `0 0 0 3px ${accentColor}33`,
                },
              },
              formButtonPrimary: {
                backgroundColor: accentColor,
                '&:hover': {
                  backgroundColor: accentColorHover,
                },
              },
              footerActionLink: {
                color: accentColor,
                '&:hover': {
                  color: accentColorHover,
                },
              },
              dividerLine: {
                backgroundColor: '#2A2E34',
              },
              dividerText: {
                color: 'rgba(255, 255, 255, 0.4)',
              },
              socialButtonsBlockButton: {
                backgroundColor: '#121417',
                borderColor: '#3A3F45',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: '#2A2E34',
                  borderColor: '#4A5057',
                },
              },
              identityPreviewEditButton: {
                color: accentColor,
              },
              formFieldInputShowPasswordButton: {
                color: 'rgba(255, 255, 255, 0.5)',
              },
              otpCodeFieldInput: {
                backgroundColor: '#121417',
                borderColor: '#3A3F45',
                color: '#FFFFFF',
              },
              alert: {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: '#EF4444',
              },
              alertText: {
                color: '#FCA5A5',
              },
            },
          }}
          routing="path"
          path={isCustomDomain ? '/login' : `/${tenantSlug}/login`}
          signUpUrl={isCustomDomain ? '/registro' : `/${tenantSlug}/registro`}
          afterSignInUrl={`/crm/${tenantSlug}`}
        />

        {/* Link para solicitar acceso */}
        <div style={{ marginTop: '24px' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.875rem', marginBottom: '8px' }}>
            ¿No tienes cuenta en {displayName}?
          </p>
          <Link
            to={isCustomDomain ? '/registro' : `/${tenantSlug}/registro`}
            style={{
              color: accentColor,
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Solicitar acceso
          </Link>
        </div>

        {/* Link volver a landing */}
        <div style={{ marginTop: '16px' }}>
          <Link
            to={isCustomDomain ? '/' : `/${tenantSlug}`}
            style={{
              color: 'rgba(255, 255, 255, 0.4)',
              textDecoration: 'none',
              fontSize: '0.8125rem',
            }}
          >
            ← Volver
          </Link>
        </div>
      </div>
    </div>
  );
}
