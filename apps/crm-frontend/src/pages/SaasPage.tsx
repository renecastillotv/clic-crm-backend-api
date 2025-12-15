import { Link } from 'react-router-dom';
import './SaasPage.css';

export default function SaasPage() {
  return (
    <div className="saas-page">
      <div className="saas-hero">
        <h1>Plataforma SaaS para Inmobiliarias</h1>
        <p className="saas-subtitle">
          Gestión completa para tu negocio inmobiliario
        </p>
        <div className="saas-actions">
          <Link to="/login" className="btn-primary">
            Iniciar Sesión
          </Link>
          <Link to="/register" className="btn-secondary">
            Registrarse
          </Link>
        </div>
      </div>

      <div className="saas-features">
        <div className="feature-card">
          <div className="feature-icon">🏢</div>
          <h3>Gestión Completa</h3>
          <p>Administra propiedades, clientes y contratos desde un solo lugar</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">👥</div>
          <h3>Multi-tenant</h3>
          <p>Cada inmobiliaria tiene su propio espacio independiente</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🌍</div>
          <h3>Multi-país</h3>
          <p>Funciona en cualquier país con soporte multi-idioma</p>
        </div>
      </div>
    </div>
  );
}



