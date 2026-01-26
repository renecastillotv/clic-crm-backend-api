/**
 * CrmMarketingAnalytics - Analytics & SEO
 *
 * Página para métricas y analytics:
 * - Dashboard de Métricas
 * - ROI por Campaña
 * - Google Search Console
 * - Reporte Mensual
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Search,
  FileImage,
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

const CrmMarketingAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  useEffect(() => {
    setPageHeader({
      title: 'Analytics & SEO',
      subtitle: 'Mide el rendimiento de tu marketing',
    });
  }, [setPageHeader]);

  const handleAction = (action: string) => {
    if (action === 'connect-apis') {
      navigate(`${basePath}/marketing/configuracion`);
      return;
    }
    if (action === 'metrics-dashboard' || action === 'campaign-roi') {
      navigate(`${basePath}/marketing/campanas`);
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
            background: '#6366f115',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1',
          }}
        >
          <BarChart3 size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Analytics & SEO
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
            Mide el rendimiento de todas tus acciones de marketing
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
          icon={<PieChart size={24} />}
          title="Dashboard de Métricas"
          description="Vista unificada del rendimiento en todas las plataformas"
          color="#6366f1"
          onClick={() => handleAction('metrics-dashboard')}
        />
        <ActionCard
          icon={<TrendingUp size={24} />}
          title="ROI por Campaña"
          description="Analiza cuánto invertiste vs cuántas ventas generó cada campaña"
          color="#8b5cf6"
          onClick={() => handleAction('campaign-roi')}
        />
        <ActionCard
          icon={<Search size={24} />}
          title="Google Search Console"
          description="Monitorea la indexación y posicionamiento de tus páginas de propiedades"
          color="#16a34a"
          status="needs_config"
          onClick={() => handleAction('search-console')}
        />
        <ActionCard
          icon={<FileImage size={24} />}
          title="Reporte Mensual"
          description="Genera un PDF con el resumen completo de marketing del mes"
          color="#0ea5e9"
          onClick={() => handleAction('monthly-report')}
        />
      </div>

      {/* Nota informativa */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
          border: '1px solid #a5b4fc',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginTop: '32px',
        }}
      >
        <BarChart3 size={24} color="#4f46e5" />
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#3730a3', margin: '0 0 6px 0' }}>
            Integra tus herramientas de analytics
          </h4>
          <p style={{ fontSize: '13px', color: '#4f46e5', margin: 0, lineHeight: 1.5 }}>
            Para obtener métricas completas, conecta Google Analytics, Google Search Console y las APIs de tus plataformas de publicidad.
            Ve a <strong style={{ cursor: 'pointer' }} onClick={() => handleAction('connect-apis')}>Configuración de APIs</strong> para configurar las integraciones.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrmMarketingAnalytics;
