/**
 * CrmMarketingEmail - Email Marketing
 *
 * Página para gestionar email marketing:
 * - Enviar Emails Masivos
 * - Templates de Email
 * - Secuencias Automáticas
 * - Métricas de Email
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail,
  Send,
  FileImage,
  Zap,
  BarChart3,
  ChevronRight,
  AlertCircle,
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

const CrmMarketingEmail: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  useEffect(() => {
    setPageHeader({
      title: 'Email Marketing',
      subtitle: 'Comunícate masivamente con tus contactos',
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
            background: '#f59e0b15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
          }}
        >
          <Mail size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Email Marketing
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
            Crea campañas de email y comunícate con tus contactos
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
          icon={<Send size={24} />}
          title="Enviar Emails Masivos"
          description="Envía correos a listas segmentadas (compradores, vendedores, inversionistas)"
          color="#f59e0b"
          onClick={() => handleAction('send-bulk-email')}
        />
        <ActionCard
          icon={<FileImage size={24} />}
          title="Templates de Email"
          description="Diseños predefinidos para newsletters, promociones y seguimiento"
          color="#f97316"
          onClick={() => handleAction('email-templates')}
        />
        <ActionCard
          icon={<Zap size={24} />}
          title="Secuencias Automáticas"
          description="Configura drip campaigns para nutrir leads fríos automáticamente"
          color="#eab308"
          status="coming_soon"
        />
        <ActionCard
          icon={<BarChart3 size={24} />}
          title="Métricas de Email"
          description="Analiza tasas de apertura, clics y rebotes de tus campañas"
          color="#84cc16"
          onClick={() => handleAction('email-metrics')}
        />
      </div>

      {/* Nota informativa */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
          border: '1px solid #fde047',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginTop: '32px',
        }}
      >
        <Mail size={24} color="#ca8a04" />
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#854d0e', margin: '0 0 6px 0' }}>
            Proveedor de email
          </h4>
          <p style={{ fontSize: '13px', color: '#a16207', margin: 0, lineHeight: 1.5 }}>
            Para enviar emails masivos necesitas conectar un proveedor como SendGrid, Mailchimp o Amazon SES.
            Ve a <strong style={{ cursor: 'pointer' }} onClick={() => handleAction('connect-apis')}>Configuración de APIs</strong> para configurar tu proveedor de email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrmMarketingEmail;
