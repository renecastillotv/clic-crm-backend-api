/**
 * TenantLoginPage - Página de inicio de sesión con branding del tenant
 */

import { useEffect, useState } from 'react';
import { SignIn } from '@clerk/clerk-react';
import { useParams, useNavigate, Link } from 'react-router-dom';

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
  } | null;
}

export default function TenantLoginPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#ffffff',
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        padding: '20px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* Logo o nombre del tenant */}
        <div style={{ marginBottom: '30px' }}>
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
                color: '#fff',
                fontSize: '2rem',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              {displayName}
            </h1>
          )}
          {tenantInfo?.infoNegocio?.slogan && (
            <p style={{ color: '#94a3b8', marginTop: '10px', fontSize: '1rem' }}>
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
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              },
              headerTitle: {
                color: '#f1f5f9',
              },
              headerSubtitle: {
                color: '#94a3b8',
              },
              formFieldLabel: {
                color: '#cbd5e1',
              },
              formFieldInput: {
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                color: '#f1f5f9',
              },
              formButtonPrimary: {
                backgroundColor: '#3b82f6',
                '&:hover': {
                  backgroundColor: '#2563eb',
                },
              },
              footerActionLink: {
                color: '#3b82f6',
              },
              dividerLine: {
                backgroundColor: '#334155',
              },
              dividerText: {
                color: '#64748b',
              },
              socialButtonsBlockButton: {
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                color: '#f1f5f9',
                '&:hover': {
                  backgroundColor: '#334155',
                },
              },
            },
          }}
          routing="path"
          path={`/${tenantSlug}/login`}
          signUpUrl={`/${tenantSlug}/registro`}
          afterSignInUrl={`/crm/${tenantSlug}`}
        />

        {/* Link para solicitar acceso */}
        <div style={{ marginTop: '24px' }}>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '8px' }}>
            ¿No tienes cuenta en {displayName}?
          </p>
          <Link
            to={`/${tenantSlug}/registro`}
            style={{
              color: '#3b82f6',
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
            to={`/${tenantSlug}`}
            style={{
              color: '#64748b',
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
