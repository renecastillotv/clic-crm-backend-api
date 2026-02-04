/**
 * DenllaPricingPage - Página de precios de la plataforma
 * Estilo B2B enterprise, infraestructura silenciosa
 */

import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
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

const PLANS = [
  {
    name: 'Starter',
    description: 'Para equipos pequeños que inician',
    price: '$49',
    period: '/mes',
    features: [
      'Hasta 3 usuarios',
      '100 propiedades',
      'CRM básico',
      'Sitio web incluido',
      'Soporte por email',
    ],
    cta: 'Comenzar gratis',
    highlighted: false,
  },
  {
    name: 'Professional',
    description: 'Para inmobiliarias en crecimiento',
    price: '$149',
    period: '/mes',
    features: [
      'Hasta 10 usuarios',
      'Propiedades ilimitadas',
      'CRM completo + Pipeline',
      'Sitio web personalizable',
      'Automatizaciones',
      'Analíticas avanzadas',
      'Soporte prioritario',
    ],
    cta: 'Comenzar prueba',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'Para grandes operaciones',
    price: 'Personalizado',
    period: '',
    features: [
      'Usuarios ilimitados',
      'Propiedades ilimitadas',
      'Multi-sucursal',
      'API completa',
      'Integraciones custom',
      'SLA garantizado',
      'Account manager dedicado',
    ],
    cta: 'Contactar ventas',
    highlighted: false,
  },
];

export default function DenllaPricingPage() {
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
            <Link to="/caracteristicas" className="denlla-nav-link">Caracteristicas</Link>
            <Link to="/precios" className="denlla-nav-link" style={{ color: '#FFFFFF' }}>Precios</Link>
            <Link to="/login" className="denlla-nav-link">Iniciar Sesion</Link>
            <Link to="/signup" className="denlla-btn-primary denlla-btn-sm">
              Comenzar Gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="denlla-pricing-hero">
        <div className="denlla-pricing-hero-content">
          <h1 className="denlla-pricing-title">
            Planes simples, sin sorpresas
          </h1>
          <p className="denlla-pricing-subtitle">
            Elige el plan que mejor se adapte a tu equipo. Cambia o cancela cuando quieras.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="denlla-pricing-section">
        <div className="denlla-pricing-grid">
          {PLANS.map((plan, index) => (
            <div
              key={index}
              className={`denlla-pricing-card ${plan.highlighted ? 'denlla-pricing-card-highlighted' : ''}`}
            >
              {plan.highlighted && (
                <div className="denlla-pricing-badge">Mas popular</div>
              )}
              <div className="denlla-pricing-card-header">
                <h3 className="denlla-pricing-plan-name">{plan.name}</h3>
                <p className="denlla-pricing-plan-description">{plan.description}</p>
              </div>
              <div className="denlla-pricing-price">
                <span className="denlla-pricing-amount">{plan.price}</span>
                <span className="denlla-pricing-period">{plan.period}</span>
              </div>
              <ul className="denlla-pricing-features">
                {plan.features.map((feature, i) => (
                  <li key={i} className="denlla-pricing-feature">
                    <Check size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`denlla-pricing-cta ${plan.highlighted ? 'denlla-btn-primary' : 'denlla-btn-secondary'}`}
              >
                {plan.cta}
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="denlla-pricing-faq">
        <div className="denlla-pricing-faq-content">
          <h2 className="denlla-section-title" style={{ color: '#FFFFFF' }}>Preguntas frecuentes</h2>
          <div className="denlla-faq-grid">
            <div className="denlla-faq-item">
              <h4>¿Puedo cambiar de plan?</h4>
              <p>Si, puedes cambiar de plan en cualquier momento. Los cambios se reflejan inmediatamente.</p>
            </div>
            <div className="denlla-faq-item">
              <h4>¿Hay periodo de prueba?</h4>
              <p>Todos los planes incluyen 14 dias de prueba gratis sin tarjeta de credito.</p>
            </div>
            <div className="denlla-faq-item">
              <h4>¿Que pasa con mis datos si cancelo?</h4>
              <p>Tus datos se mantienen por 30 dias despues de cancelar. Puedes exportarlos en cualquier momento.</p>
            </div>
            <div className="denlla-faq-item">
              <h4>¿Ofrecen descuentos anuales?</h4>
              <p>Si, al pagar anualmente obtienes 2 meses gratis en cualquier plan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="denlla-cta">
        <div className="denlla-cta-content">
          <h2 className="denlla-cta-title">¿Listo para empezar?</h2>
          <p className="denlla-cta-subtitle">
            Prueba Denlla gratis durante 14 dias. Sin compromiso.
          </p>
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
