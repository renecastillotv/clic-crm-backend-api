/**
 * DenllaLandingPage - Landing principal de la plataforma
 *
 * Estilo B2B enterprise, infraestructura silenciosa
 * Inspiración: Airbnb, Stripe, Linear
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Globe,
  BarChart3,
  Users,
  Shield,
  Zap,
  ArrowRight,
  Check,
} from 'lucide-react';
import './DenllaLandingPage.css';

interface PlatformStats {
  tenants: number;
  users: number;
  properties: number;
}

const FEATURES = [
  {
    icon: Building2,
    title: 'CRM Inmobiliario',
    description: 'Gestiona contactos, propiedades y ventas desde un solo lugar. Pipeline visual y seguimiento automatizado.',
  },
  {
    icon: Globe,
    title: 'Sitio Web Personalizable',
    description: 'Tu página web profesional lista en minutos. Diseño responsive, SEO optimizado y dominio propio.',
  },
  {
    icon: BarChart3,
    title: 'Analíticas y Reportes',
    description: 'Dashboards en tiempo real. Métricas de rendimiento, conversión y productividad de tu equipo.',
  },
  {
    icon: Users,
    title: 'Gestión de Equipos',
    description: 'Roles y permisos granulares. Asigna leads, mide comisiones y coordina tu equipo de asesores.',
  },
  {
    icon: Shield,
    title: 'Seguridad Enterprise',
    description: 'Datos encriptados, backups automáticos y cumplimiento de normativas de privacidad.',
  },
  {
    icon: Zap,
    title: 'Automatizaciones',
    description: 'Workflows automáticos para seguimiento, notificaciones y tareas repetitivas.',
  },
];

const BENEFITS = [
  'Sin contratos a largo plazo',
  'Soporte dedicado incluido',
  'Migración de datos gratuita',
  'Actualizaciones continuas',
];

export default function DenllaLandingPage() {
  const [stats, setStats] = useState<PlatformStats>({ tenants: 50, users: 200, properties: 500 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/public/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching platform stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="denlla-landing">
      {/* Header */}
      <header className="denlla-header">
        <div className="denlla-header-content">
          <Link to="/" className="denlla-logo">
            <span className="denlla-logo-text">Denlla</span>
          </Link>
          <nav className="denlla-nav">
            <Link to="/caracteristicas" className="denlla-nav-link">Caracteristicas</Link>
            <Link to="/precios" className="denlla-nav-link">Precios</Link>
            <Link to="/login" className="denlla-nav-link">Iniciar Sesion</Link>
            <Link to="/signup" className="denlla-btn-primary denlla-btn-sm">
              Comenzar Gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="denlla-hero">
        <div className="denlla-hero-content">
          <h1 className="denlla-hero-title">
            La infraestructura que tu
            <br />
            inmobiliaria necesita.
          </h1>
          <p className="denlla-hero-subtitle">
            CRM, sitio web, analíticas y automatizaciones en una sola plataforma.
            <br />
            Diseñado para equipos inmobiliarios que buscan escalar.
          </p>
          <div className="denlla-hero-actions">
            <Link to="/signup" className="denlla-btn-primary denlla-btn-lg">
              Solicitar Demo
              <ArrowRight size={18} />
            </Link>
            <a href="#features" className="denlla-btn-secondary denlla-btn-lg">
              Ver características
            </a>
          </div>
          <p className="denlla-hero-note">
            Sin tarjeta de crédito · Configuración en 5 minutos
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="denlla-features">
        <div className="denlla-features-content">
          <div className="denlla-section-header">
            <h2 className="denlla-section-title">Todo lo que necesitas</h2>
            <p className="denlla-section-subtitle">
              Una plataforma completa para administrar tu negocio inmobiliario
            </p>
          </div>
          <div className="denlla-features-grid">
            {FEATURES.map((feature, index) => (
              <div key={index} className="denlla-feature-card">
                <div className="denlla-feature-icon">
                  <feature.icon size={24} />
                </div>
                <h3 className="denlla-feature-title">{feature.title}</h3>
                <p className="denlla-feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="denlla-proof">
        <div className="denlla-proof-content">
          <div className="denlla-proof-stats">
            <div className="denlla-proof-stat-item">
              <p className="denlla-proof-stat">+{stats.tenants}</p>
              <p className="denlla-proof-label">inmobiliarias</p>
            </div>
            <div className="denlla-proof-stat-item">
              <p className="denlla-proof-stat">+{stats.users}</p>
              <p className="denlla-proof-label">usuarios activos</p>
            </div>
            <div className="denlla-proof-stat-item">
              <p className="denlla-proof-stat">+{stats.properties}</p>
              <p className="denlla-proof-label">propiedades</p>
            </div>
          </div>
          <p className="denlla-proof-text">
            Inmobiliarias en Latinoamérica confían en Denlla
            <br />
            para gestionar sus operaciones diarias.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="denlla-cta">
        <div className="denlla-cta-content">
          <h2 className="denlla-cta-title">Empieza hoy. Sin compromiso.</h2>
          <p className="denlla-cta-subtitle">
            Prueba Denlla gratis durante 14 días. Sin tarjeta de crédito requerida.
          </p>
          <ul className="denlla-cta-benefits">
            {BENEFITS.map((benefit, index) => (
              <li key={index} className="denlla-cta-benefit">
                <Check size={16} />
                {benefit}
              </li>
            ))}
          </ul>
          <Link to="/signup" className="denlla-btn-accent denlla-btn-lg">
            Crear cuenta gratis
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="denlla-footer">
        <div className="denlla-footer-content">
          <div className="denlla-footer-brand">
            <span className="denlla-logo-text">Denlla</span>
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
