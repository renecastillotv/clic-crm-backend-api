/**
 * ClicLandingPage - Landing premium para CLIC Inmobiliaria
 *
 * Enfoque: Rene Castillo como figura central, YouTube presence,
 * puerta de entrada para asesores e independientes
 */

import { Link } from 'react-router-dom';
import {
  Play,
  Users,
  Award,
  TrendingUp,
  Youtube,
  Instagram,
  Star,
  ArrowRight,
  CheckCircle,
  Building2,
  Tv,
  Trophy,
} from 'lucide-react';
import './ClicLandingPage.css';

const STATS = [
  { value: '200K+', label: 'Suscriptores YouTube', icon: Youtube },
  { value: '600K+', label: 'Seguidores Instagram', icon: Instagram },
  { value: '18+', label: 'Anos en Television', icon: Tv },
  { value: '500+', label: 'Resenas 5 estrellas', icon: Star },
];

const BENEFITS = [
  {
    icon: Trophy,
    title: 'Marca reconocida',
    description: 'Trabaja bajo el respaldo de la inmobiliaria con mayor presencia mediatica en Republica Dominicana.',
  },
  {
    icon: TrendingUp,
    title: 'Leads constantes',
    description: 'Recibe prospectos calificados de nuestros canales digitales con mas de 800K seguidores.',
  },
  {
    icon: Award,
    title: 'Capacitacion continua',
    description: 'Acceso a CLIC University con cursos de ventas, marketing inmobiliario y certificaciones.',
  },
  {
    icon: Users,
    title: 'Comunidad de asesores',
    description: 'Forma parte de un equipo de profesionales con las mejores practicas del mercado.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Maria Rodriguez',
    role: 'Asesora CLIC',
    text: 'Desde que me uni a CLIC, mis ventas se triplicaron. El respaldo de la marca y los leads que generan son invaluables.',
    rating: 5,
  },
  {
    name: 'Carlos Mejia',
    role: 'Asesor Independiente',
    text: 'La plataforma tecnologica de CLIC me permite gestionar mis clientes de forma profesional. Altamente recomendado.',
    rating: 5,
  },
];

export default function ClicLandingPage() {
  return (
    <div className="clic-landing">
      {/* Header */}
      <header className="clic-header">
        <div className="clic-header-content">
          <Link to="/clic" className="clic-logo">
            <img
              src="https://clic-web-frontend.vercel.app/images/logo-transparente.png"
              alt="CLIC Inmobiliaria"
              className="clic-logo-img"
            />
          </Link>
          <nav className="clic-nav">
            <a href="#beneficios" className="clic-nav-link">Beneficios</a>
            <a href="#testimonios" className="clic-nav-link">Testimonios</a>
            <Link to="/clic/login" className="clic-nav-link">Iniciar Sesion</Link>
            <Link to="/clic/registro" className="clic-btn-primary clic-btn-sm">
              Unirme al equipo
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="clic-hero">
        <div className="clic-hero-content">
          <div className="clic-hero-text">
            <div className="clic-hero-badge">
              <Award size={16} />
              Miembro AEI - Certificados
            </div>
            <h1 className="clic-hero-title">
              Unete a la inmobiliaria
              <span className="clic-hero-highlight"> #1 en YouTube</span>
              de Republica Dominicana
            </h1>
            <p className="clic-hero-subtitle">
              Con mas de 200,000 suscriptores y tours a casas de celebridades,
              CLIC Inmobiliaria es la plataforma que impulsa tu carrera como asesor inmobiliario.
            </p>
            <div className="clic-hero-actions">
              <Link to="/clic/registro" className="clic-btn-primary clic-btn-lg">
                Quiero ser asesor CLIC
                <ArrowRight size={18} />
              </Link>
              <Link to="/clic/login" className="clic-btn-secondary clic-btn-lg">
                Ya tengo cuenta
              </Link>
            </div>
            <div className="clic-hero-trust">
              <div className="clic-hero-rating">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#f04e00" color="#f04e00" />
                ))}
                <span>4.9/5</span>
              </div>
              <span className="clic-hero-reviews">Basado en 500+ resenas</span>
            </div>
          </div>
          <div className="clic-hero-media">
            <div className="clic-hero-video-card">
              <div className="clic-hero-video-thumbnail">
                <img
                  src="https://clic-web-frontend.vercel.app/images/rene-castillo.png"
                  alt="Rene Castillo - Fundador CLIC"
                  onError={(e) => {
                    e.currentTarget.src = 'https://clic-web-frontend.vercel.app/images/logo-transparente.png';
                  }}
                />
                <div className="clic-hero-play-btn">
                  <Play size={32} fill="#fff" />
                </div>
              </div>
              <div className="clic-hero-founder-info">
                <h3>Rene Castillo</h3>
                <p>Presentador TV & Fundador</p>
                <p className="clic-hero-founder-exp">18 anos en television • 6 anos en inmobiliaria</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="clic-stats">
        <div className="clic-stats-content">
          {STATS.map((stat, index) => (
            <div key={index} className="clic-stat-item">
              <stat.icon size={28} className="clic-stat-icon" />
              <div className="clic-stat-value">{stat.value}</div>
              <div className="clic-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="beneficios" className="clic-benefits">
        <div className="clic-benefits-content">
          <div className="clic-section-header">
            <h2 className="clic-section-title">¿Por que unirte a CLIC?</h2>
            <p className="clic-section-subtitle">
              Beneficios exclusivos para asesores que quieren llevar su carrera al siguiente nivel
            </p>
          </div>
          <div className="clic-benefits-grid">
            {BENEFITS.map((benefit, index) => (
              <div key={index} className="clic-benefit-card">
                <div className="clic-benefit-icon">
                  <benefit.icon size={24} />
                </div>
                <h3 className="clic-benefit-title">{benefit.title}</h3>
                <p className="clic-benefit-description">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* YouTube Section */}
      <section className="clic-youtube">
        <div className="clic-youtube-content">
          <div className="clic-youtube-info">
            <div className="clic-youtube-badge">
              <Youtube size={20} />
              Canal de YouTube
            </div>
            <h2 className="clic-youtube-title">
              El canal inmobiliario mas visto del Caribe
            </h2>
            <p className="clic-youtube-description">
              Tours exclusivos a propiedades de lujo, entrevistas con celebridades,
              consejos de inversion y analisis del mercado inmobiliario dominicano.
            </p>
            <ul className="clic-youtube-features">
              <li><CheckCircle size={18} /> Tours a casas de celebridades</li>
              <li><CheckCircle size={18} /> Educacion financiera inmobiliaria</li>
              <li><CheckCircle size={18} /> Analisis de mercado semanal</li>
              <li><CheckCircle size={18} /> Entrevistas con expertos</li>
            </ul>
            <a
              href="https://youtube.com/@clicinmobiliaria"
              target="_blank"
              rel="noopener noreferrer"
              className="clic-btn-youtube"
            >
              <Youtube size={20} />
              Ver canal de YouTube
            </a>
          </div>
          <div className="clic-youtube-visual">
            <div className="clic-youtube-stats-card">
              <div className="clic-youtube-stat-big">200K+</div>
              <div className="clic-youtube-stat-label">Suscriptores</div>
              <div className="clic-youtube-growth">+15% este mes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonios" className="clic-testimonials">
        <div className="clic-testimonials-content">
          <div className="clic-section-header">
            <h2 className="clic-section-title">Lo que dicen nuestros asesores</h2>
          </div>
          <div className="clic-testimonials-grid">
            {TESTIMONIALS.map((testimonial, index) => (
              <div key={index} className="clic-testimonial-card">
                <div className="clic-testimonial-rating">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="#f04e00" color="#f04e00" />
                  ))}
                </div>
                <p className="clic-testimonial-text">"{testimonial.text}"</p>
                <div className="clic-testimonial-author">
                  <div className="clic-testimonial-avatar">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="clic-testimonial-name">{testimonial.name}</div>
                    <div className="clic-testimonial-role">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="clic-cta">
        <div className="clic-cta-content">
          <h2 className="clic-cta-title">
            ¿Listo para impulsar tu carrera inmobiliaria?
          </h2>
          <p className="clic-cta-subtitle">
            Unete al equipo CLIC y aprovecha nuestra presencia mediatica,
            tecnologia y capacitacion para cerrar mas ventas.
          </p>
          <div className="clic-cta-actions">
            <Link to="/clic/registro" className="clic-btn-accent clic-btn-lg">
              Solicitar ser asesor
              <ArrowRight size={18} />
            </Link>
            <Link to="/clic/login" className="clic-btn-outline clic-btn-lg">
              Iniciar sesion
            </Link>
          </div>
          <p className="clic-cta-note">
            Sin cuotas de entrada • Comisiones competitivas • Soporte continuo
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="clic-footer">
        <div className="clic-footer-content">
          <div className="clic-footer-brand">
            <img
              src="https://clic-web-frontend.vercel.app/images/logo-transparente.png"
              alt="CLIC Inmobiliaria"
              className="clic-footer-logo"
            />
            <p className="clic-footer-tagline">
              El inmueble que buscas a un CLIC de distancia
            </p>
            <div className="clic-footer-social">
              <a href="https://youtube.com/@clicinmobiliaria" target="_blank" rel="noopener noreferrer">
                <Youtube size={20} />
              </a>
              <a href="https://instagram.com/clicinmobiliaria" target="_blank" rel="noopener noreferrer">
                <Instagram size={20} />
              </a>
            </div>
          </div>
          <div className="clic-footer-links">
            <div className="clic-footer-column">
              <h4>Acceso</h4>
              <Link to="/clic/login">Iniciar sesion</Link>
              <Link to="/clic/registro">Unirme al equipo</Link>
            </div>
            <div className="clic-footer-column">
              <h4>Contacto</h4>
              <a href="tel:8295148080">829 514 8080</a>
              <a href="mailto:contacto@clic.do">contacto@clic.do</a>
            </div>
          </div>
          <div className="clic-footer-legal">
            <p>© 2026 CLIC DOM SRL. Todos los derechos reservados.</p>
            <p>Miembro de la Asociacion de Empresas Inmobiliarias (AEI)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
