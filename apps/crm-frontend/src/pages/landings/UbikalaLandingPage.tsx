/**
 * UbikalaLandingPage - Premium landing page for Ubikala
 * Portal inmobiliario para inmobiliarias, asesores y propietarios
 * Paleta: Verde oliva, Arena, Terracota, Marfil, Gris calido
 *
 * Supports both path-based routing (/ubikala) and custom domain (ubikala.com)
 */

import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Home,
  Search,
  TrendingUp,
  Shield,
  Globe,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  MapPin,
  Camera,
  Share2,
} from 'lucide-react';
import { getTenantFromHost } from '../../utils/tenantFromHost';
import './UbikalaLandingPage.css';

// Host-aware paths - use root paths on custom domains
const tenantConfig = getTenantFromHost();
const basePath = tenantConfig.isCustomDomain ? '' : '/ubikala';

const USER_TYPES = [
  {
    title: 'Inmobiliarias',
    description: 'Gestiona tu cartera de propiedades y equipo de asesores desde un solo lugar.',
    icon: Building2,
    features: ['Dashboard centralizado', 'Gestion de asesores', 'Reportes y metricas'],
  },
  {
    title: 'Asesores',
    description: 'Publica tus propiedades y conecta con compradores calificados.',
    icon: Users,
    features: ['Perfil profesional', 'Leads verificados', 'Herramientas de cierre'],
  },
  {
    title: 'Propietarios',
    description: 'Vende o alquila tu propiedad con la exposicion que merece.',
    icon: Home,
    features: ['Publicacion gratuita', 'Visibilidad maxima', 'Contacto directo'],
  },
];

const FEATURES = [
  {
    title: 'Alcance Nacional',
    description: 'Tu propiedad visible en todo el territorio, sin limites geograficos.',
    icon: Globe,
  },
  {
    title: 'SEO Optimizado',
    description: 'Tus listados aparecen en los primeros resultados de busqueda.',
    icon: Search,
  },
  {
    title: 'Analiticas Detalladas',
    description: 'Conoce cuantas personas ven e interactuan con tus publicaciones.',
    icon: BarChart3,
  },
  {
    title: 'Fotos Profesionales',
    description: 'Herramientas para mostrar tus propiedades de la mejor manera.',
    icon: Camera,
  },
  {
    title: 'Compartir Facil',
    description: 'Comparte en redes sociales y WhatsApp con un solo clic.',
    icon: Share2,
  },
  {
    title: 'Verificacion',
    description: 'Sistema de verificacion para generar confianza con los compradores.',
    icon: Shield,
  },
];

const STATS = [
  { value: '10K+', label: 'Propiedades activas' },
  { value: '500+', label: 'Agencias registradas' },
  { value: '2K+', label: 'Asesores certificados' },
  { value: '50K+', label: 'Busquedas mensuales' },
];

const TESTIMONIALS = [
  {
    quote: 'Ubikala me permitio triplicar mis publicaciones y alcanzar clientes que nunca hubiera encontrado por mi cuenta.',
    author: 'Maria Rodriguez',
    role: 'Asesora Independiente',
  },
  {
    quote: 'La plataforma es intuitiva y el soporte es excelente. Nuestros asesores la adoptaron rapidamente.',
    author: 'Carlos Mendez',
    role: 'Director, Inmobiliaria Premium',
  },
  {
    quote: 'Vendi mi apartamento en tiempo record gracias a la exposicion que Ubikala me dio.',
    author: 'Ana Lucia Torres',
    role: 'Propietaria',
  },
];

export default function UbikalaLandingPage() {
  return (
    <div className="ubikala-landing">
      {/* Header */}
      <header className="ubikala-header">
        <div className="ubikala-header-content">
          <Link to={basePath || '/'} className="ubikala-logo">
            <span className="ubikala-logo-text">Ubikala</span>
          </Link>
          <nav className="ubikala-nav">
            <a href="#usuarios" className="ubikala-nav-link">Para quien</a>
            <a href="#caracteristicas" className="ubikala-nav-link">Caracteristicas</a>
            <Link to={`${basePath}/login`} className="ubikala-nav-link">Iniciar Sesion</Link>
            <Link to={`${basePath}/registro`} className="ubikala-btn ubikala-btn-primary">
              Publicar gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="ubikala-hero">
        <div className="ubikala-hero-content">
          <div className="ubikala-hero-badge">
            <Sparkles size={14} />
            El portal inmobiliario que conecta
          </div>
          <h1 className="ubikala-hero-title">
            Tu propiedad,
            <br />
            <span className="ubikala-text-accent">donde debe estar.</span>
          </h1>
          <p className="ubikala-hero-subtitle">
            Ubikala es el portal donde inmobiliarias, asesores y propietarios
            <br />
            publican y encuentran las mejores oportunidades del mercado.
          </p>
          <div className="ubikala-hero-actions">
            <Link to={`${basePath}/registro`} className="ubikala-btn ubikala-btn-primary ubikala-btn-lg">
              Publicar mi propiedad
              <ArrowRight size={18} />
            </Link>
            <a href="#usuarios" className="ubikala-btn ubikala-btn-secondary ubikala-btn-lg">
              Conocer mas
            </a>
          </div>
          <div className="ubikala-hero-trust">
            <MapPin size={16} />
            <span>Cobertura en todo el territorio nacional</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="ubikala-stats">
        <div className="ubikala-stats-grid">
          {STATS.map((stat, index) => (
            <div key={index} className="ubikala-stat">
              <div className="ubikala-stat-value">{stat.value}</div>
              <div className="ubikala-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* User Types */}
      <section id="usuarios" className="ubikala-users">
        <div className="ubikala-users-content">
          <div className="ubikala-section-header">
            <h2 className="ubikala-section-title">Una plataforma para todos</h2>
            <p className="ubikala-section-subtitle">
              Ya seas inmobiliaria, asesor o propietario, Ubikala tiene lo que necesitas.
            </p>
          </div>
          <div className="ubikala-users-grid">
            {USER_TYPES.map((type, index) => (
              <div key={index} className="ubikala-user-card">
                <div className="ubikala-user-icon">
                  <type.icon size={28} />
                </div>
                <h3 className="ubikala-user-title">{type.title}</h3>
                <p className="ubikala-user-description">{type.description}</p>
                <ul className="ubikala-user-features">
                  {type.features.map((feature, i) => (
                    <li key={i}>
                      <CheckCircle2 size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to={`${basePath}/registro`} className="ubikala-btn ubikala-btn-outline">
                  Comenzar ahora
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="caracteristicas" className="ubikala-features">
        <div className="ubikala-features-content">
          <div className="ubikala-section-header">
            <h2 className="ubikala-section-title">Todo lo que necesitas</h2>
            <p className="ubikala-section-subtitle">
              Herramientas disenadas para maximizar la visibilidad de tus propiedades.
            </p>
          </div>
          <div className="ubikala-features-grid">
            {FEATURES.map((feature, index) => (
              <div key={index} className="ubikala-feature-card">
                <div className="ubikala-feature-icon">
                  <feature.icon size={24} />
                </div>
                <h3 className="ubikala-feature-title">{feature.title}</h3>
                <p className="ubikala-feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="ubikala-testimonials">
        <div className="ubikala-testimonials-content">
          <div className="ubikala-section-header">
            <h2 className="ubikala-section-title">Lo que dicen de nosotros</h2>
          </div>
          <div className="ubikala-testimonials-grid">
            {TESTIMONIALS.map((testimonial, index) => (
              <div key={index} className="ubikala-testimonial-card">
                <p className="ubikala-testimonial-quote">"{testimonial.quote}"</p>
                <div className="ubikala-testimonial-author">
                  <div className="ubikala-testimonial-avatar">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="ubikala-testimonial-name">{testimonial.author}</div>
                    <div className="ubikala-testimonial-role">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ubikala-cta">
        <div className="ubikala-cta-content">
          <h2 className="ubikala-cta-title">Empieza a publicar hoy</h2>
          <p className="ubikala-cta-subtitle">
            Crea tu cuenta gratis y comienza a mostrar tus propiedades al mundo.
          </p>
          <div className="ubikala-cta-actions">
            <Link to={`${basePath}/registro`} className="ubikala-btn ubikala-btn-accent ubikala-btn-lg">
              Crear cuenta gratis
              <ArrowRight size={18} />
            </Link>
            <Link to={`${basePath}/login`} className="ubikala-btn ubikala-btn-ghost ubikala-btn-lg">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ubikala-footer">
        <div className="ubikala-footer-content">
          <div className="ubikala-footer-brand">
            <span className="ubikala-logo-text">Ubikala</span>
            <p className="ubikala-footer-tagline">
              El portal inmobiliario que conecta.
            </p>
          </div>
          <div className="ubikala-footer-links">
            <a href="#usuarios" className="ubikala-footer-link">Para quien</a>
            <a href="#caracteristicas" className="ubikala-footer-link">Caracteristicas</a>
            <a href="mailto:soporte@ubikala.com" className="ubikala-footer-link">Contacto</a>
          </div>
          <div className="ubikala-footer-legal">
            <p>&copy; 2026 Ubikala. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
