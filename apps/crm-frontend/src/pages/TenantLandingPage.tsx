import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import './TenantLandingPage.css';

// Slugs reservados que no son tenants
const RESERVED_SLUGS = ['login', 'signup', 'register', 'admin', 'crm', 'dashboard', 'verificar', 'api'];

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
    descripcion?: string;
    logo_url?: string;
    isotipo_url?: string;
    telefono_principal?: string;
    whatsapp?: string;
    email_principal?: string;
    facebook_url?: string;
    instagram_url?: string;
  } | null;
}

export default function TenantLandingPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const [tenantInfo, setTenantInfo] = useState<TenantPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenantInfo() {
      if (!tenantSlug) {
        navigate('/');
        return;
      }

      // Verificar si es un slug reservado
      if (RESERVED_SLUGS.includes(tenantSlug.toLowerCase())) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/public/tenants/${tenantSlug}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('not_found');
          } else {
            setError('error');
          }
          return;
        }

        const data = await response.json();
        setTenantInfo(data);
      } catch (err) {
        console.error('Error fetching tenant info:', err);
        setError('error');
      } finally {
        setLoading(false);
      }
    }

    fetchTenantInfo();
  }, [tenantSlug, navigate]);

  if (loading) {
    return (
      <div className="tenant-landing">
        <div className="tenant-landing-content">
          <div className="tenant-loading">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className="tenant-landing tenant-landing-error">
        <div className="tenant-landing-content">
          <div className="tenant-error-icon">🏢</div>
          <h1>Empresa no encontrada</h1>
          <p>No encontramos una empresa con ese identificador.</p>
          <Link to="/" className="tenant-btn tenant-btn-primary">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (error || !tenantInfo) {
    return (
      <div className="tenant-landing tenant-landing-error">
        <div className="tenant-landing-content">
          <div className="tenant-error-icon">⚠️</div>
          <h1>Error</h1>
          <p>Ocurrió un error al cargar la información.</p>
          <Link to="/" className="tenant-btn tenant-btn-primary">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  const { tenant, infoNegocio } = tenantInfo;
  const displayName = infoNegocio?.nombre || tenant.nombre;
  const logoUrl = infoNegocio?.logo_url || infoNegocio?.isotipo_url;

  return (
    <div className="tenant-landing">
      <div className="tenant-landing-content">
        {logoUrl && (
          <div className="tenant-logo-container">
            <img
              src={logoUrl}
              alt={displayName}
              className="tenant-logo"
            />
          </div>
        )}

        <h1 className="tenant-name">{displayName}</h1>

        {infoNegocio?.slogan && (
          <p className="tenant-slogan">{infoNegocio.slogan}</p>
        )}

        <div className="tenant-actions">
          <Link
            to={`/${tenantSlug}/login`}
            className="tenant-btn tenant-btn-primary"
          >
            Iniciar Sesión
          </Link>
          <Link
            to={`/${tenantSlug}/registro`}
            className="tenant-btn tenant-btn-secondary"
          >
            Solicitar Acceso
          </Link>
        </div>

        {/* Info de contacto opcional */}
        {(infoNegocio?.telefono_principal || infoNegocio?.email_principal) && (
          <div className="tenant-contact">
            {infoNegocio?.telefono_principal && (
              <a href={`tel:${infoNegocio.telefono_principal}`} className="tenant-contact-item">
                {infoNegocio.telefono_principal}
              </a>
            )}
            {infoNegocio?.email_principal && (
              <a href={`mailto:${infoNegocio.email_principal}`} className="tenant-contact-item">
                {infoNegocio.email_principal}
              </a>
            )}
          </div>
        )}

        {/* Redes sociales */}
        {(infoNegocio?.facebook_url || infoNegocio?.instagram_url || infoNegocio?.whatsapp) && (
          <div className="tenant-social">
            {infoNegocio?.whatsapp && (
              <a
                href={`https://wa.me/${infoNegocio.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tenant-social-link"
                title="WhatsApp"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            )}
            {infoNegocio?.facebook_url && (
              <a
                href={infoNegocio.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="tenant-social-link"
                title="Facebook"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            )}
            {infoNegocio?.instagram_url && (
              <a
                href={infoNegocio.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="tenant-social-link"
                title="Instagram"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
