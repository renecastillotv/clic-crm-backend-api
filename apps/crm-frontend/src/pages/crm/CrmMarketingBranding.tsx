/**
 * CrmMarketingBranding - Branding & Creativos
 *
 * Hub de herramientas creativas para generar material publicitario:
 * - Convertir Imágenes (aplicar branding a fotos de propiedades)
 * - Generador de Flyers (crear flyers profesionales con templates)
 * - Stories Creator (stories verticales para Instagram/Facebook)
 * - Banco de Plantillas (guardar y reutilizar diseños)
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Image,
  FileImage,
  Sparkles,
  Layout,
  ChevronRight,
  AlertCircle,
  Palette,
} from 'lucide-react';

// Interfaz para las tarjetas de acción
interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  status?: 'active' | 'coming_soon' | 'needs_config';
  onClick?: () => void;
}

// Componente de tarjeta de acción
const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  title,
  description,
  color,
  status = 'active',
  onClick,
}) => {
  const isDisabled = status === 'coming_soon';

  return (
    <div
      onClick={!isDisabled ? onClick : undefined}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        cursor: isDisabled ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        opacity: isDisabled ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
          e.currentTarget.style.borderColor = color;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      {status === 'coming_soon' && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '4px 10px',
            background: '#f1f5f9',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748b',
          }}
        >
          Próximamente
        </div>
      )}
      {status === 'needs_config' && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '4px 10px',
            background: '#fef3c7',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <AlertCircle size={12} />
          Configurar
        </div>
      )}

      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          color: color,
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#1e293b',
          marginBottom: '8px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '13px',
          color: '#64748b',
          lineHeight: 1.5,
          marginBottom: '16px',
        }}
      >
        {description}
      </p>

      {!isDisabled && (
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {status === 'needs_config' ? 'Configurar' : 'Abrir'}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
};

const CrmMarketingBranding: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  useEffect(() => {
    setPageHeader({
      title: 'Branding & Creativos',
      subtitle: 'Crea contenido visual profesional con tu marca',
    });
  }, [setPageHeader]);

  const handleAction = (action: string) => {
    console.log('Action:', action);

    if (action === 'convert-images') {
      navigate(`${basePath}/marketing/convertir-imagenes`);
      return;
    }
    if (action === 'flyer-generator') {
      navigate(`${basePath}/marketing/flyers`);
      return;
    }
    if (action === 'stories-creator') {
      navigate(`${basePath}/marketing/stories`);
      return;
    }
    if (action === 'templates-bank') {
      navigate(`${basePath}/marketing/plantillas`);
      return;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Título de sección */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#ec489915',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ec4899',
          }}
        >
          <Palette size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Branding & Creativos
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
            Genera material publicitario profesional con el branding de tu empresa
          </p>
        </div>
      </div>

      {/* Grid de acciones */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        <ActionCard
          icon={<Image size={24} />}
          title="Convertir Imágenes"
          description="Sube fotos de propiedades y aplica el branding de tu empresa (logo, colores, contacto)"
          color="#ec4899"
          onClick={() => handleAction('convert-images')}
        />
        <ActionCard
          icon={<FileImage size={24} />}
          title="Generador de Flyers"
          description="Crea flyers profesionales para tus propiedades con templates prediseñados"
          color="#f43f5e"
          onClick={() => handleAction('flyer-generator')}
        />
        <ActionCard
          icon={<Sparkles size={24} />}
          title="Stories Creator"
          description="Genera stories verticales optimizados para Instagram y Facebook"
          color="#d946ef"
          onClick={() => handleAction('stories-creator')}
        />
        <ActionCard
          icon={<Layout size={24} />}
          title="Banco de Plantillas"
          description="Guarda y reutiliza tus diseños favoritos para futuras campañas"
          color="#a855f7"
          onClick={() => handleAction('templates-bank')}
        />
      </div>

      {/* Nota informativa */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
          border: '1px solid #f9a8d4',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginTop: '32px',
        }}
      >
        <Palette size={24} color="#db2777" />
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#9d174d', margin: '0 0 6px 0' }}>
            Tu branding se aplica automáticamente
          </h4>
          <p style={{ fontSize: '13px', color: '#be185d', margin: 0, lineHeight: 1.5 }}>
            El sistema usa el logo, colores y datos de contacto configurados en{' '}
            <strong
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate(`${basePath}/configuracion/negocio`)}
            >
              Información del Negocio
            </strong>{' '}
            para generar todos los creativos. Asegúrate de tener tu branding actualizado.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrmMarketingBranding;
