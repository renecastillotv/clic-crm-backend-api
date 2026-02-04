/**
 * TenantSignupPage - Formulario de solicitud de acceso al tenant
 * Estilo Denlla B2B Enterprise con soporte para colores del tenant
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './TenantSignupPage.css';

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

interface FormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  motivacion: string;
}

export default function TenantSignupPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const [tenantInfo, setTenantInfo] = useState<TenantPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    motivacion: '',
  });

  useEffect(() => {
    async function fetchTenantInfo() {
      if (!tenantSlug) {
        navigate('/');
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/public/tenants/${tenantSlug}`);

        if (!response.ok) {
          navigate('/');
          return;
        }

        const data = await response.json();
        setTenantInfo(data);
      } catch (err) {
        console.error('Error fetching tenant info:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    }

    fetchTenantInfo();
  }, [tenantSlug, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.email.trim()) {
      setError('Por favor completa los campos requeridos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor ingresa un email valido');
      return;
    }

    try {
      setSubmitting(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/public/tenants/${tenantSlug}/registro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al enviar la solicitud');
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting join request:', err);
      setError(err.message || 'Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = tenantInfo?.infoNegocio?.nombre || tenantInfo?.tenant.nombre || 'Empresa';
  const logoUrl = tenantInfo?.infoNegocio?.logo_url || tenantInfo?.infoNegocio?.isotipo_url;

  // Premium tenant color overrides
  const PREMIUM_TENANT_COLORS: Record<string, { accent: string; hover: string }> = {
    'clic': { accent: '#f04e00', hover: '#d94500' },
    'ubikala': { accent: '#5C6B3C', hover: '#4A5730' },
  };

  const premiumColors = tenantSlug ? PREMIUM_TENANT_COLORS[tenantSlug] : null;
  const accentColor = premiumColors?.accent || tenantInfo?.infoNegocio?.color_primario || '#2563EB';
  const accentColorHover = premiumColors?.hover || accentColor;

  // Dynamic styles for tenant customization
  const customStyles = {
    '--tenant-accent': accentColor,
    '--tenant-accent-hover': accentColorHover,
  } as React.CSSProperties;

  if (loading) {
    return (
      <div className="tenant-signup" style={customStyles}>
        <div className="tenant-signup-content">
          <div className="tenant-signup-loading">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de exito
  if (submitted) {
    return (
      <div className="tenant-signup" style={customStyles}>
        <div className="tenant-signup-content">
          <div className="tenant-signup-card">
            <div className="success-icon">✓</div>
            <h2>Solicitud enviada</h2>
            <p className="success-message">
              Tu solicitud para unirte a <strong>{displayName}</strong> ha sido enviada exitosamente.
            </p>
            <p className="success-detail">
              El administrador revisara tu solicitud y te contactara pronto.
            </p>
            <Link to={`/${tenantSlug}`} className="tenant-signup-btn tenant-signup-btn-primary">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-signup" style={customStyles}>
      <div className="tenant-signup-content">
        {/* Header con logo */}
        <div className="tenant-signup-header">
          {logoUrl ? (
            <img src={logoUrl} alt={displayName} className="tenant-signup-logo" />
          ) : (
            <h1 className="tenant-signup-name">{displayName}</h1>
          )}
        </div>

        {/* Formulario */}
        <div className="tenant-signup-card">
          <h2>Solicitar acceso</h2>
          <p className="tenant-signup-subtitle">
            Completa el formulario para solicitar acceso a {displayName}
          </p>

          {error && (
            <div className="tenant-signup-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="tenant-signup-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="apellido">Apellido *</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  placeholder="Tu apellido"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Correo electronico *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefono">Telefono</label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="+1 809 000 0000"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="motivacion">Mensaje (opcional)</label>
              <textarea
                id="motivacion"
                name="motivacion"
                value={formData.motivacion}
                onChange={handleChange}
                placeholder="¿Por que te gustaria unirte?"
                rows={3}
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              className="tenant-signup-btn tenant-signup-btn-primary tenant-signup-btn-full"
              disabled={submitting}
            >
              {submitting ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </form>

          <div className="tenant-signup-footer">
            <p>
              ¿Ya tienes cuenta?{' '}
              <Link to={`/${tenantSlug}/login`}>Iniciar sesion</Link>
            </p>
          </div>
        </div>

        {/* Link volver */}
        <div className="tenant-signup-back">
          <Link to={`/${tenantSlug}`}>← Volver a {displayName}</Link>
        </div>
      </div>
    </div>
  );
}
