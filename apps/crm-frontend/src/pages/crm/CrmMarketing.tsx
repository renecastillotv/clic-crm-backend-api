/**
 * CrmMarketing - Centro de Marketing Inmobiliario
 *
 * Hub centralizado para todas las acciones de marketing:
 * - Branding y creativos
 * - Campañas publicitarias (Google Ads, Meta Ads)
 * - Redes sociales (Instagram, Facebook)
 * - Email marketing
 * - Analytics y métricas
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Image,
  Megaphone,
  Instagram,
  Facebook,
  Mail,
  BarChart3,
  Settings,
  Users,
  Target,
  Palette,
  FileImage,
  Send,
  Calendar,
  TrendingUp,
  Search,
  Link,
  Zap,
  Globe,
  Share2,
  PieChart,
  DollarSign,
  Eye,
  MousePointer,
  ChevronRight,
  Sparkles,
  Layout,
  Hash,
  Bell,
  CheckCircle,
  Clock,
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
      {/* Status badge */}
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

      {/* Icon */}
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

      {/* Title */}
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

      {/* Description */}
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

      {/* Action button */}
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

// Componente de sección
interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
}

const Section: React.FC<SectionProps> = ({ title, subtitle, children, icon, color = '#3b82f6' }) => (
  <div style={{ marginBottom: '40px' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
      }}
    >
      {icon && (
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1e293b',
            margin: 0,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{subtitle}</p>
        )}
      </div>
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
      }}
    >
      {children}
    </div>
  </div>
);

// Componente de stats rápidos
interface QuickStatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const QuickStat: React.FC<QuickStatProps> = ({ label, value, icon, color, trend, trendValue }) => (
  <div
    style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    }}
  >
    <div
      style={{
        width: '48px',
        height: '48px',
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
      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{value}</span>
        {trendValue && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: trend === 'up' ? '#16a34a' : trend === 'down' ? '#ef4444' : '#64748b',
            }}
          >
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendValue}
          </span>
        )}
      </div>
    </div>
  </div>
);

const CrmMarketing: React.FC = () => {
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'branding' | 'campaigns' | 'social' | 'email' | 'analytics'>('all');

  // Calcular base path basado en el tenant
  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  useEffect(() => {
    setPageHeader({
      title: 'Marketing Hub',
      subtitle: 'Centro de control de marketing inmobiliario',
    });
  }, [setPageHeader]);

  // Funciones para las acciones
  const handleAction = (action: string) => {
    console.log('Action:', action);

    // Navegación a configuración de APIs
    if (action === 'connect-apis') {
      navigate(`${basePath}/marketing/configuracion-apis`);
      return;
    }

    // Navegación a branding de empresa (usa la página existente de info del negocio)
    if (action === 'company-branding') {
      navigate(`${basePath}/configuracion/negocio`);
      return;
    }

    // Navegación a convertir imágenes
    if (action === 'convert-images') {
      navigate(`${basePath}/marketing/convertir-imagenes`);
      return;
    }

    // Navegación a generador de flyers
    if (action === 'flyer-generator') {
      navigate(`${basePath}/marketing/flyers`);
      return;
    }

    // Navegación a stories creator
    if (action === 'stories-creator') {
      navigate(`${basePath}/marketing/stories`);
      return;
    }

    // Navegación a banco de plantillas
    if (action === 'templates-bank') {
      navigate(`${basePath}/marketing/plantillas`);
      return;
    }

    // Aquí irán las navegaciones o modales para otras acciones
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header con stats rápidos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <QuickStat
          label="Leads este mes"
          value="0"
          icon={<Users size={22} />}
          color="#3b82f6"
          trend="neutral"
        />
        <QuickStat
          label="Gasto en Ads"
          value="$0"
          icon={<DollarSign size={22} />}
          color="#16a34a"
          trend="neutral"
        />
        <QuickStat
          label="Posts publicados"
          value="0"
          icon={<Share2 size={22} />}
          color="#8b5cf6"
          trend="neutral"
        />
        <QuickStat
          label="Emails enviados"
          value="0"
          icon={<Mail size={22} />}
          color="#f59e0b"
          trend="neutral"
        />
      </div>

      {/* Tabs de filtro */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '32px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'all', label: 'Todo', icon: <Layout size={16} /> },
          { id: 'branding', label: 'Branding', icon: <Palette size={16} /> },
          { id: 'campaigns', label: 'Campañas', icon: <Megaphone size={16} /> },
          { id: 'social', label: 'Redes Sociales', icon: <Share2 size={16} /> },
          { id: 'email', label: 'Email', icon: <Mail size={16} /> },
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === tab.id ? '#1e293b' : '#f1f5f9',
              color: activeTab === tab.id ? 'white' : '#64748b',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sección: Branding & Creativos */}
      {(activeTab === 'all' || activeTab === 'branding') && (
        <Section
          title="Branding & Creativos"
          subtitle="Crea contenido visual con tu marca"
          icon={<Palette size={20} />}
          color="#ec4899"
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
        </Section>
      )}

      {/* Sección: Campañas Publicitarias */}
      {(activeTab === 'all' || activeTab === 'campaigns') && (
        <Section
          title="Campañas Publicitarias"
          subtitle="Lanza y gestiona campañas de publicidad"
          icon={<Megaphone size={20} />}
          color="#3b82f6"
        >
          <ActionCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            }
            title="Google Ads"
            description="Crea campañas de búsqueda y display para atraer compradores calificados"
            color="#4285f4"
            status="needs_config"
            onClick={() => handleAction('google-ads')}
          />
          <ActionCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            }
            title="Meta Ads"
            description="Lanza campañas en Facebook e Instagram con audiencias segmentadas"
            color="#1877f2"
            status="needs_config"
            onClick={() => handleAction('meta-ads')}
          />
          <ActionCard
            icon={<Users size={24} />}
            title="Distribución de Leads"
            description="Asigna leads de campañas automáticamente a asesores por zona o fase"
            color="#0ea5e9"
            onClick={() => handleAction('lead-distribution')}
          />
          <ActionCard
            icon={<DollarSign size={24} />}
            title="Presupuesto & ROI"
            description="Controla el gasto en publicidad y mide el retorno de inversión por campaña"
            color="#14b8a6"
            onClick={() => handleAction('budget-roi')}
          />
        </Section>
      )}

      {/* Sección: Redes Sociales */}
      {(activeTab === 'all' || activeTab === 'social') && (
        <Section
          title="Redes Sociales"
          subtitle="Publica en las redes de la empresa y asesores"
          icon={<Share2 size={20} />}
          color="#e11d48"
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
        </Section>
      )}

      {/* Sección: Email Marketing */}
      {(activeTab === 'all' || activeTab === 'email') && (
        <Section
          title="Email Marketing"
          subtitle="Comunícate masivamente con tus contactos"
          icon={<Mail size={20} />}
          color="#f59e0b"
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
        </Section>
      )}

      {/* Sección: Analytics & SEO */}
      {(activeTab === 'all' || activeTab === 'analytics') && (
        <Section
          title="Analytics & SEO"
          subtitle="Mide el rendimiento de tu marketing"
          icon={<BarChart3 size={20} />}
          color="#6366f1"
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
        </Section>
      )}

      {/* Sección: Configuración */}
      <Section
        title="Configuración"
        subtitle="Conecta tus cuentas y configura el branding"
        icon={<Settings size={20} />}
        color="#64748b"
      >
        <ActionCard
          icon={<Link size={24} />}
          title="Conectar APIs"
          description="Vincula Google Ads, Meta Business, Instagram y proveedores de email"
          color="#64748b"
          onClick={() => handleAction('connect-apis')}
        />
        <ActionCard
          icon={<Palette size={24} />}
          title="Branding de Empresa"
          description="Configura logo, colores, fuentes y datos de contacto para los creativos"
          color="#475569"
          onClick={() => handleAction('company-branding')}
        />
        <ActionCard
          icon={<Users size={24} />}
          title="Cuentas de Asesores"
          description="Gestiona las redes sociales conectadas de cada asesor"
          color="#334155"
          onClick={() => handleAction('advisor-accounts')}
        />
        <ActionCard
          icon={<Target size={24} />}
          title="Audiencias Guardadas"
          description="Crea y guarda segmentos de audiencia reutilizables para campañas"
          color="#1e293b"
          onClick={() => handleAction('saved-audiences')}
        />
      </Section>

      {/* Nota informativa sobre APIs */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #93c5fd',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginTop: '24px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
          }}
        >
          <Bell size={24} />
        </div>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1e40af', margin: '0 0 8px 0' }}>
            Configuración requerida para algunas funciones
          </h4>
          <p style={{ fontSize: '13px', color: '#3b82f6', margin: 0, lineHeight: 1.6 }}>
            Para utilizar Google Ads, Meta Ads y publicación en redes sociales, necesitas conectar las APIs correspondientes.
            Ve a <strong>Configuración → Conectar APIs</strong> para vincular tus cuentas de Google Ads (API de Google),
            Meta Business Suite (Facebook/Instagram) y proveedores de email como SendGrid o Mailchimp.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrmMarketing;
