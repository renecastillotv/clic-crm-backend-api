/**
 * CrmMarketingRedesSociales - Gestión de Redes Sociales
 *
 * Página para publicar en las redes de la empresa y asesores:
 * - Publicar en Instagram
 * - Publicar en Facebook
 * - Programar Posts
 * - Banco de Hashtags
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft,
  Instagram,
  Facebook,
  Calendar,
  Hash,
  ChevronRight,
  AlertCircle,
  Share2,
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

const CrmMarketingRedesSociales: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  useEffect(() => {
    setPageHeader({
      title: 'Redes Sociales',
      subtitle: 'Publica en las redes de la empresa y asesores',
    });
  }, [setPageHeader]);

  const handleAction = (action: string) => {
    console.log('Action:', action);

    if (action === 'connect-apis') {
      navigate(`${basePath}/marketing/configuracion-apis`);
      return;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header con botón de volver */}
      <div style={{ marginBottom: '24px' }}>
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
      </div>

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
            background: '#e11d4815',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e11d48',
          }}
        >
          <Share2 size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Redes Sociales
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
            Publica y programa contenido en Instagram y Facebook
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
          icon={<Instagram size={24} />}
          title="Publicar en Instagram"
          description="Publica posts directamente en la cuenta de la empresa o de asesores conectados"
          color="#e11d48"
          status="needs_config"
          onClick={() => handleAction('post-instagram')}
        />
        <ActionCard
          icon={<Facebook size={24} />}
          title="Publicar en Facebook"
          description="Comparte contenido en la página de la empresa o perfiles de asesores"
          color="#1877f2"
          status="needs_config"
          onClick={() => handleAction('post-facebook')}
        />
        <ActionCard
          icon={<Calendar size={24} />}
          title="Programar Posts"
          description="Planifica tu contenido con un calendario visual semanal y mensual"
          color="#f59e0b"
          onClick={() => handleAction('schedule-posts')}
        />
        <ActionCard
          icon={<Hash size={24} />}
          title="Banco de Hashtags"
          description="Guarda conjuntos de hashtags por zona, tipo de propiedad o campaña"
          color="#8b5cf6"
          onClick={() => handleAction('hashtags-bank')}
        />
      </div>

      {/* Nota informativa */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '1px solid #fca5a5',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginTop: '32px',
        }}
      >
        <AlertCircle size={24} color="#dc2626" />
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', margin: '0 0 6px 0' }}>
            Conexión de cuentas requerida
          </h4>
          <p style={{ fontSize: '13px', color: '#dc2626', margin: 0, lineHeight: 1.5 }}>
            Para publicar en Instagram y Facebook necesitas conectar Meta Business Suite.
            Ve a <strong style={{ cursor: 'pointer' }} onClick={() => handleAction('connect-apis')}>Configuración de APIs</strong> para vincular tus cuentas de redes sociales.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrmMarketingRedesSociales;
