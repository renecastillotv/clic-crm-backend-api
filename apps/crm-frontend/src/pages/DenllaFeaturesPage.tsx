/**
 * DenllaFeaturesPage - Página de características de la plataforma
 * Estilo B2B enterprise, infraestructura silenciosa
 */

import { Link } from 'react-router-dom';
import {
  Building2,
  Globe,
  BarChart3,
  Users,
  Shield,
  Zap,
  FileText,
  MessageSquare,
  Wallet,
  Target,
  Calendar,
  ArrowRight,
  Check,
} from 'lucide-react';
import './DenllaLandingPage.css';

// Denlla Isotipo Component
function DenllaIsotipo({ size = 32, color = '#6B7F4A' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 5h28c8 0 14 6 14 14v8c0 5-4 9-9 9h-6c-5 0-9 4-9 9v5h-4c-8 0-14-6-14-14V5z"/>
      <path d="M95 5v28c0 8-6 14-14 14h-8c-5 0-9-4-9-9v-6c0-5-4-9-9-9h-5v-4c0-8 6-14 14-14h31z"/>
      <path d="M95 95H67c-8 0-14-6-14-14v-8c0-5 4-9 9-9h6c5 0 9-4 9-9v-5h4c8 0 14 6 14 14v31z"/>
      <path d="M5 95V67c0-8 6-14 14-14h8c5 0 9 4 9 9v6c0 5 4 9 9 9h5v4c0 8-6 14-14 14H5z"/>
    </svg>
  );
}

const FEATURE_CATEGORIES = [
  {
    title: 'CRM Inmobiliario',
    description: 'Gestiona todo el ciclo de venta desde un solo lugar',
    icon: Building2,
    features: [
      'Pipeline visual de ventas',
      'Gestion de contactos y leads',
      'Seguimiento de actividades',
      'Historial completo de interacciones',
      'Asignacion automatica de leads',
      'Etiquetas y segmentacion',
    ],
  },
  {
    title: 'Sitio Web Profesional',
    description: 'Tu presencia online lista en minutos',
    icon: Globe,
    features: [
      'Diseño responsive optimizado',
      'SEO integrado',
      'Dominio personalizado',
      'Editor visual sin codigo',
      'Formularios de contacto',
      'Integracion con redes sociales',
    ],
  },
  {
    title: 'Analiticas y Reportes',
    description: 'Toma decisiones basadas en datos',
    icon: BarChart3,
    features: [
      'Dashboard en tiempo real',
      'Metricas de conversion',
      'Rendimiento por asesor',
      'Reportes automatizados',
      'Exportacion a Excel/PDF',
      'KPIs personalizables',
    ],
  },
  {
    title: 'Gestion de Equipos',
    description: 'Coordina y mide a tu equipo de asesores',
    icon: Users,
    features: [
      'Roles y permisos granulares',
      'Comisiones automaticas',
      'Metas por equipo e individual',
      'Distribucion de leads',
      'Supervision en tiempo real',
      'Reportes de productividad',
    ],
  },
  {
    title: 'Documentos',
    description: 'Genera y gestiona documentos profesionales',
    icon: FileText,
    features: [
      'Plantillas personalizables',
      'Generacion automatica',
      'Firma electronica',
      'Almacenamiento en la nube',
      'Versionado de documentos',
      'Compartir con clientes',
    ],
  },
  {
    title: 'Comunicacion',
    description: 'Mantente conectado con tus clientes',
    icon: MessageSquare,
    features: [
      'Chat integrado',
      'Email marketing',
      'Notificaciones automaticas',
      'WhatsApp Business API',
      'Historial de conversaciones',
      'Plantillas de mensajes',
    ],
  },
  {
    title: 'Finanzas',
    description: 'Control total de tus operaciones financieras',
    icon: Wallet,
    features: [
      'Facturacion integrada',
      'Control de comisiones',
      'Planes de pago',
      'Reportes financieros',
      'Integracion contable',
      'Multi-moneda',
    ],
  },
  {
    title: 'Marketing',
    description: 'Herramientas para atraer mas clientes',
    icon: Target,
    features: [
      'Campañas de email',
      'Generador de flyers',
      'Publicacion en portales',
      'Landing pages',
      'Analytics de campañas',
      'A/B testing',
    ],
  },
];

const INTEGRATIONS = [
  'WhatsApp Business',
  'Google Analytics',
  'Facebook Ads',
  'Mailchimp',
  'Zapier',
  'Google Calendar',
];

export default function DenllaFeaturesPage() {
  return (
    <div className="denlla-landing">
      {/* Header */}
      <header className="denlla-header">
        <div className="denlla-header-content">
          <Link to="/" className="denlla-logo">
            <DenllaIsotipo size={28} color="#FFFFFF" />
            <span className="denlla-logo-text">Denlla</span>
          </Link>
          <nav className="denlla-nav">
            <Link to="/caracteristicas" className="denlla-nav-link" style={{ color: '#FFFFFF' }}>Caracteristicas</Link>
            <Link to="/precios" className="denlla-nav-link">Precios</Link>
            <Link to="/login" className="denlla-nav-link">Iniciar Sesion</Link>
            <Link to="/signup" className="denlla-btn-primary denlla-btn-sm">
              Comenzar Gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="denlla-features-hero">
        <div className="denlla-features-hero-content">
          <h1 className="denlla-features-title">
            Todo lo que necesitas para
            <br />
            gestionar tu inmobiliaria
          </h1>
          <p className="denlla-features-subtitle">
            Una plataforma completa con las herramientas que tu equipo necesita
            <br />
            para vender mas y trabajar mejor.
          </p>
          <Link to="/signup" className="denlla-btn-primary denlla-btn-lg">
            Probar gratis 14 dias
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="denlla-features-categories">
        {FEATURE_CATEGORIES.map((category, index) => (
          <div
            key={index}
            className={`denlla-feature-category ${index % 2 === 1 ? 'denlla-feature-category-alt' : ''}`}
          >
            <div className="denlla-feature-category-content">
              <div className="denlla-feature-category-info">
                <div className="denlla-feature-category-icon">
                  <category.icon size={32} />
                </div>
                <h2 className="denlla-feature-category-title">{category.title}</h2>
                <p className="denlla-feature-category-description">{category.description}</p>
              </div>
              <ul className="denlla-feature-category-list">
                {category.features.map((feature, i) => (
                  <li key={i} className="denlla-feature-category-item">
                    <Check size={18} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>

      {/* Integrations */}
      <section className="denlla-integrations">
        <div className="denlla-integrations-content">
          <h2 className="denlla-section-title">Integraciones</h2>
          <p className="denlla-section-subtitle">
            Conecta con las herramientas que ya usas
          </p>
          <div className="denlla-integrations-grid">
            {INTEGRATIONS.map((integration, index) => (
              <div key={index} className="denlla-integration-item">
                {integration}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="denlla-cta">
        <div className="denlla-cta-content">
          <h2 className="denlla-cta-title">Empieza hoy. Sin compromiso.</h2>
          <p className="denlla-cta-subtitle">
            Prueba Denlla gratis durante 14 dias. Sin tarjeta de credito requerida.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="denlla-btn-accent denlla-btn-lg">
              Crear cuenta gratis
              <ArrowRight size={18} />
            </Link>
            <Link to="/precios" className="denlla-btn-secondary denlla-btn-lg">
              Ver precios
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="denlla-footer">
        <div className="denlla-footer-content">
          <div className="denlla-footer-brand">
            <div className="denlla-footer-logo">
              <DenllaIsotipo size={24} color="#FFFFFF" />
              <span className="denlla-logo-text">Denlla</span>
            </div>
            <p className="denlla-footer-tagline">
              Infraestructura para inmobiliarias modernas.
            </p>
          </div>
          <div className="denlla-footer-links">
            <Link to="/caracteristicas" className="denlla-footer-link">Caracteristicas</Link>
            <Link to="/precios" className="denlla-footer-link">Precios</Link>
            <a href="mailto:soporte@denlla.com" className="denlla-footer-link">Contacto</a>
          </div>
          <div className="denlla-footer-legal">
            <p>© 2026 Denlla. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
