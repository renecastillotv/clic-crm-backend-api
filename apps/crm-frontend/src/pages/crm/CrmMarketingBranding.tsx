/**
 * CrmMarketingBranding - Configuración de Branding de Empresa
 *
 * Página para gestionar la identidad visual de la empresa:
 * - Logos e identidad visual
 * - Colores de marca
 * - Información de contacto para creativos
 * - Redes sociales
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  getTema,
  updateTema,
  getInfoNegocio,
  patchInfoNegocio,
  type TemaColores,
  type InfoNegocio,
} from '../../services/api';
import SingleImageUploader from '../../components/SingleImageUploader';
import {
  ArrowLeft,
  Save,
  Loader2,
  Image,
  Palette,
  Phone,
  Share2,
  CheckCircle,
  AlertCircle,
  Eye,
  Building2,
} from 'lucide-react';

// Componente de sección
interface SectionProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, subtitle, icon, color, children }) => (
  <div
    style={{
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      marginBottom: '24px',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
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
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>{subtitle}</p>
        )}
      </div>
    </div>
    <div style={{ padding: '24px' }}>{children}</div>
  </div>
);

// Componente de campo de formulario
interface FormFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({ label, hint, children, required }) => (
  <div style={{ marginBottom: '20px' }}>
    <label
      style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: 600,
        color: '#374151',
        marginBottom: '6px',
      }}
    >
      {label}
      {required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
    </label>
    {children}
    {hint && (
      <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{hint}</p>
    )}
  </div>
);

// Componente de input de texto
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

const TextInput: React.FC<TextInputProps> = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#1e293b',
      outline: 'none',
      transition: 'border-color 0.2s',
    }}
    onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
    onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
  />
);

// Componente de color picker
interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '8px',
        border: '2px solid #e2e8f0',
        cursor: 'pointer',
        padding: '2px',
      }}
    />
    <div style={{ flex: 1 }}>
      <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '90px',
            padding: '4px 8px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
          }}
        />
      </div>
    </div>
  </div>
);

const CrmMarketingBranding: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();

  // Estados
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Datos del tema (colores)
  const [colores, setColores] = useState<TemaColores>({
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#8b5cf6',
    background: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#ef4444',
  });

  // Datos del negocio
  const [infoNegocio, setInfoNegocio] = useState<Partial<InfoNegocio>>({
    nombre: '',
    slogan: null,
    logo_url: null,
    isotipo_url: null,
    favicon_url: null,
    telefono_principal: null,
    whatsapp: null,
    email_principal: null,
    direccion: null,
    facebook_url: null,
    instagram_url: null,
    linkedin_url: null,
    tiktok_url: null,
    youtube_url: null,
  });

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  useEffect(() => {
    setPageHeader({
      title: 'Branding de Empresa',
      subtitle: 'Configura la identidad visual de tu empresa para los creativos',
    });
  }, [setPageHeader]);

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      if (!tenantActual?.id) return;

      setLoading(true);
      try {
        const token = await getToken();

        // Cargar tema y info en paralelo
        const [temaData, infoData] = await Promise.all([
          getTema(tenantActual.id).catch(() => null),
          getInfoNegocio(tenantActual.id, token).catch(() => null),
        ]);

        if (temaData) {
          setColores(temaData);
        }

        if (infoData) {
          setInfoNegocio(infoData);
        }
      } catch (error) {
        console.error('Error loading branding data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenantActual?.id, getToken]);

  // Marcar cambios
  const markChanged = () => {
    setHasChanges(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Actualizar color
  const updateColor = (key: keyof TemaColores, value: string) => {
    setColores((prev) => ({ ...prev, [key]: value }));
    markChanged();
  };

  // Actualizar info
  const updateInfo = (key: keyof InfoNegocio, value: string | null) => {
    setInfoNegocio((prev) => ({ ...prev, [key]: value }));
    markChanged();
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!tenantActual?.id) return;

    setSaving(true);
    setSaveError(null);

    try {
      const token = await getToken();

      // Guardar colores y info en paralelo
      await Promise.all([
        updateTema(tenantActual.id, colores),
        patchInfoNegocio(tenantActual.id, infoNegocio, token),
      ]);

      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving branding:', error);
      setSaveError(error.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      {/* Header con botones */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
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
          }}
        >
          <ArrowLeft size={16} />
          Volver al Marketing Hub
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '13px' }}>
              <CheckCircle size={16} />
              Guardado exitosamente
            </div>
          )}
          {saveError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '13px' }}>
              <AlertCircle size={16} />
              {saveError}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: hasChanges ? '#3b82f6' : '#94a3b8',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: hasChanges ? 'pointer' : 'default',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Sección: Logos e Identidad Visual */}
      <Section
        title="Logos e Identidad Visual"
        subtitle="Sube los logos y elementos visuales de tu empresa"
        icon={<Image size={22} />}
        color="#ec4899"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          <div>
            <FormField label="Logo Principal" hint="Versión a color para fondos claros">
              <SingleImageUploader
                value={infoNegocio.logo_url || null}
                onChange={(url) => updateInfo('logo_url', url)}
                tenantId={tenantActual?.id || ''}
                folder="branding"
                maxWidth={300}
                maxHeight={150}
              />
            </FormField>
          </div>

          <div>
            <FormField label="Isotipo / Icono" hint="Versión compacta del logo">
              <SingleImageUploader
                value={infoNegocio.isotipo_url || null}
                onChange={(url) => updateInfo('isotipo_url', url)}
                tenantId={tenantActual?.id || ''}
                folder="branding"
                maxWidth={150}
                maxHeight={150}
                aspectRatio="1/1"
              />
            </FormField>
          </div>

          <div>
            <FormField label="Favicon" hint="Icono para la pestaña del navegador (32x32px)">
              <SingleImageUploader
                value={infoNegocio.favicon_url || null}
                onChange={(url) => updateInfo('favicon_url', url)}
                tenantId={tenantActual?.id || ''}
                folder="branding"
                maxWidth={64}
                maxHeight={64}
                aspectRatio="1/1"
              />
            </FormField>
          </div>
        </div>
      </Section>

      {/* Sección: Colores de Marca */}
      <Section
        title="Colores de Marca"
        subtitle="Define los colores que se usarán en tus creativos"
        icon={<Palette size={22} />}
        color="#8b5cf6"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>
              Colores Principales
            </h4>
            <ColorPicker label="Color Primario" value={colores.primary} onChange={(v) => updateColor('primary', v)} />
            <ColorPicker label="Color Secundario" value={colores.secondary} onChange={(v) => updateColor('secondary', v)} />
            <ColorPicker label="Color de Acento" value={colores.accent} onChange={(v) => updateColor('accent', v)} />
          </div>

          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>
              Colores de Texto
            </h4>
            <ColorPicker label="Texto Principal" value={colores.text} onChange={(v) => updateColor('text', v)} />
            <ColorPicker label="Texto Secundario" value={colores.textSecondary} onChange={(v) => updateColor('textSecondary', v)} />
            <ColorPicker label="Fondo" value={colores.background} onChange={(v) => updateColor('background', v)} />
          </div>

          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>
              Colores de Estado
            </h4>
            <ColorPicker label="Éxito" value={colores.success} onChange={(v) => updateColor('success', v)} />
            <ColorPicker label="Advertencia" value={colores.warning} onChange={(v) => updateColor('warning', v)} />
            <ColorPicker label="Error" value={colores.error} onChange={(v) => updateColor('error', v)} />
          </div>
        </div>

        {/* Preview de colores */}
        <div
          style={{
            marginTop: '24px',
            padding: '20px',
            borderRadius: '12px',
            background: colores.background,
            border: `1px solid ${colores.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Eye size={16} color={colores.textSecondary} />
            <span style={{ fontSize: '12px', color: colores.textSecondary, fontWeight: 500 }}>Vista previa</span>
          </div>
          <h3 style={{ color: colores.text, fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            {infoNegocio.nombre || 'Nombre de tu Empresa'}
          </h3>
          <p style={{ color: colores.textSecondary, fontSize: '14px', marginBottom: '16px' }}>
            {infoNegocio.slogan || 'Tu slogan aquí'}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ padding: '8px 16px', background: colores.primary, color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>
              Botón Primario
            </button>
            <button style={{ padding: '8px 16px', background: colores.secondary, color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>
              Botón Secundario
            </button>
            <button style={{ padding: '8px 16px', background: colores.accent, color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>
              Botón Acento
            </button>
          </div>
        </div>
      </Section>

      {/* Sección: Información para Creativos */}
      <Section
        title="Información para Creativos"
        subtitle="Datos que aparecerán en flyers, posts y otros materiales"
        icon={<Building2 size={22} />}
        color="#3b82f6"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div>
            <FormField label="Nombre Comercial" required>
              <TextInput
                value={infoNegocio.nombre || ''}
                onChange={(v) => updateInfo('nombre', v)}
                placeholder="Ej: CLIC Inmobiliaria"
              />
            </FormField>

            <FormField label="Slogan" hint="Frase corta que identifica a tu empresa">
              <TextInput
                value={infoNegocio.slogan || ''}
                onChange={(v) => updateInfo('slogan', v || null)}
                placeholder="Ej: Tu hogar, nuestra misión"
              />
            </FormField>
          </div>

          <div>
            <FormField label="Teléfono Principal" hint="Número que aparecerá en los creativos">
              <TextInput
                value={infoNegocio.telefono_principal || ''}
                onChange={(v) => updateInfo('telefono_principal', v || null)}
                placeholder="Ej: +1 809 555 1234"
                type="tel"
              />
            </FormField>

            <FormField label="WhatsApp" hint="Número con código de país">
              <TextInput
                value={infoNegocio.whatsapp || ''}
                onChange={(v) => updateInfo('whatsapp', v || null)}
                placeholder="Ej: +18095551234"
                type="tel"
              />
            </FormField>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '16px' }}>
          <FormField label="Email de Contacto">
            <TextInput
              value={infoNegocio.email_principal || ''}
              onChange={(v) => updateInfo('email_principal', v || null)}
              placeholder="Ej: info@tuempresa.com"
              type="email"
            />
          </FormField>

          <FormField label="Dirección" hint="Dirección física para mostrar en materiales">
            <TextInput
              value={infoNegocio.direccion || ''}
              onChange={(v) => updateInfo('direccion', v || null)}
              placeholder="Ej: Av. Principal #123, Ciudad"
            />
          </FormField>
        </div>
      </Section>

      {/* Sección: Redes Sociales */}
      <Section
        title="Redes Sociales"
        subtitle="Links a tus perfiles para incluir en materiales de marketing"
        icon={<Share2 size={22} />}
        color="#e11d48"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <FormField label="Instagram" hint="URL completa o @usuario">
            <TextInput
              value={infoNegocio.instagram_url || ''}
              onChange={(v) => updateInfo('instagram_url', v || null)}
              placeholder="Ej: https://instagram.com/tuempresa"
            />
          </FormField>

          <FormField label="Facebook" hint="URL de tu página de Facebook">
            <TextInput
              value={infoNegocio.facebook_url || ''}
              onChange={(v) => updateInfo('facebook_url', v || null)}
              placeholder="Ej: https://facebook.com/tuempresa"
            />
          </FormField>

          <FormField label="LinkedIn" hint="URL de tu perfil de empresa">
            <TextInput
              value={infoNegocio.linkedin_url || ''}
              onChange={(v) => updateInfo('linkedin_url', v || null)}
              placeholder="Ej: https://linkedin.com/company/tuempresa"
            />
          </FormField>

          <FormField label="TikTok" hint="URL de tu perfil">
            <TextInput
              value={infoNegocio.tiktok_url || ''}
              onChange={(v) => updateInfo('tiktok_url', v || null)}
              placeholder="Ej: https://tiktok.com/@tuempresa"
            />
          </FormField>

          <FormField label="YouTube" hint="URL de tu canal">
            <TextInput
              value={infoNegocio.youtube_url || ''}
              onChange={(v) => updateInfo('youtube_url', v || null)}
              placeholder="Ej: https://youtube.com/@tuempresa"
            />
          </FormField>
        </div>
      </Section>

      {/* Nota informativa */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #86efac',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
        }}
      >
        <CheckCircle size={24} color="#16a34a" />
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#166534', margin: '0 0 6px 0' }}>
            Estos datos se usarán automáticamente
          </h4>
          <p style={{ fontSize: '13px', color: '#15803d', margin: 0, lineHeight: 1.5 }}>
            Al generar flyers, stories, posts y otros creativos, el sistema usará automáticamente tu logo, colores y datos de contacto.
            Así mantienes una imagen consistente en todo tu marketing.
          </p>
        </div>
      </div>

      {/* CSS para animación de spin */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CrmMarketingBranding;
