/**
 * AdminTenantOnboarding - Wizard de onboarding para crear nuevo tenant
 * Flujo multi-paso:
 * 1. Información básica del tenant
 * 2. Usuario administrador
 * 3. Plan
 * 4. Dominio/Subdominio
 * 5. Resumen y lanzamiento
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { getAllPaises, Pais, createTenantWithAdmin } from '../../services/api';

interface OnboardingData {
  // Paso 1: Información básica
  nombre: string;
  slug: string;
  codigoPais: string;
  idiomaDefault: string;

  // Paso 2: Usuario admin
  adminEmail: string;
  adminPassword: string;
  adminConfirmPassword: string;
  adminNombre: string;
  adminApellido: string;

  // Paso 3: Plan
  plan: 'basic' | 'pro' | 'premium';

  // Paso 4: Dominio
  dominioPersonalizado: string;
  usarSubdominio: boolean;
}

const STEPS = [
  { id: 1, name: 'Información Básica', icon: '🏢' },
  { id: 2, name: 'Usuario Administrador', icon: '👤' },
  { id: 3, name: 'Plan', icon: '💎' },
  { id: 4, name: 'Dominio', icon: '🌐' },
  { id: 5, name: 'Resumen', icon: '✅' },
];

export default function AdminTenantOnboarding() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loadingPaises, setLoadingPaises] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTenant, setCreatedTenant] = useState<any>(null);

  const [formData, setFormData] = useState<OnboardingData>({
    nombre: '',
    slug: '',
    codigoPais: '',
    idiomaDefault: 'es',
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: '',
    adminNombre: '',
    adminApellido: '',
    plan: 'basic',
    dominioPersonalizado: '',
    usarSubdominio: true,
  });

  useEffect(() => {
    loadPaises();
  }, []);

  const loadPaises = async () => {
    try {
      setLoadingPaises(true);
      const token = await getToken();
      if (!token) {
        setError('No se pudo obtener el token de autenticación. Por favor, inicia sesión nuevamente.');
        return;
      }
      const data = await getAllPaises(token);
      setPaises(data);
    } catch (err: any) {
      setError('Error al cargar países');
      console.error('Error cargando países:', err);
    } finally {
      setLoadingPaises(false);
    }
  };

  const handleNameChange = (nombre: string) => {
    const slug = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setFormData({ ...formData, nombre, slug });
  };

  const validateStep = (step: number): boolean => {
    setError(null);

    switch (step) {
      case 1:
        if (!formData.nombre.trim()) {
          setError('El nombre de la inmobiliaria es requerido');
          return false;
        }
        if (!formData.slug.trim()) {
          setError('El slug es requerido');
          return false;
        }
        if (!/^[a-z0-9-]+$/.test(formData.slug)) {
          setError('El slug solo puede contener letras minúsculas, números y guiones');
          return false;
        }
        return true;

      case 2:
        if (!formData.adminEmail.trim()) {
          setError('El email del administrador es requerido');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
          setError('El email no es válido');
          return false;
        }
        if (!formData.adminPassword) {
          setError('La contraseña es requerida');
          return false;
        }
        if (formData.adminPassword.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres');
          return false;
        }
        if (formData.adminPassword !== formData.adminConfirmPassword) {
          setError('Las contraseñas no coinciden');
          return false;
        }
        if (!formData.adminNombre.trim()) {
          setError('El nombre del administrador es requerido');
          return false;
        }
        if (!formData.adminApellido.trim()) {
          setError('El apellido del administrador es requerido');
          return false;
        }
        return true;

      case 3:
        if (!formData.plan) {
          setError('Debes seleccionar un plan');
          return false;
        }
        return true;

      case 4:
        if (!formData.usarSubdominio && !formData.dominioPersonalizado.trim()) {
          setError('Debes proporcionar un dominio personalizado o usar subdominio');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError('No se pudo obtener el token de autenticación. Por favor, inicia sesión nuevamente.');
        return;
      }
      const result = await createTenantWithAdmin({
        nombre: formData.nombre,
        slug: formData.slug,
        codigoPais: formData.codigoPais || undefined,
        idiomaDefault: formData.idiomaDefault,
        plan: formData.plan,
        dominioPersonalizado: formData.usarSubdominio ? null : formData.dominioPersonalizado,
        adminUser: {
          email: formData.adminEmail,
          password: formData.adminPassword,
          nombre: formData.adminNombre,
          apellido: formData.adminApellido,
        },
      }, token);

      setCreatedTenant(result);
      setCurrentStep(5);
    } catch (err: any) {
      setError(err.message || 'Error al crear tenant');
      console.error('Error al crear tenant:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    navigate('/admin/tenants');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="onboarding-step-content">
            <h2 className="step-title">Información Básica</h2>
            <p className="step-description">
              Proporciona la información básica de la inmobiliaria
            </p>

            <div className="form-group">
              <label>
                Nombre de la Inmobiliaria <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: CLIC Inmobiliaria"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Slug (URL) <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="ejemplo: clic-inmobiliaria"
                required
              />
              <p className="form-hint">
                URL: {formData.slug || 'mi-inmobiliaria'}.dominiosaas.com
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>País</label>
                {loadingPaises ? (
                  <select disabled>
                    <option>Cargando países...</option>
                  </select>
                ) : (
                  <select
                    value={formData.codigoPais}
                    onChange={(e) => setFormData({ ...formData, codigoPais: e.target.value })}
                  >
                    <option value="">Sin asignar</option>
                    {paises.map((pais) => (
                      <option key={pais.codigo} value={pais.codigo}>
                        {pais.nombre} ({pais.codigo})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Idioma por Defecto</label>
                <select
                  value={formData.idiomaDefault}
                  onChange={(e) => setFormData({ ...formData, idiomaDefault: e.target.value })}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="onboarding-step-content">
            <h2 className="step-title">Usuario Administrador</h2>
            <p className="step-description">
              Crea la cuenta del administrador principal para este tenant
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Nombre <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.adminNombre}
                  onChange={(e) => setFormData({ ...formData, adminNombre: e.target.value })}
                  placeholder="Nombre"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Apellido <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.adminApellido}
                  onChange={(e) => setFormData({ ...formData, adminApellido: e.target.value })}
                  placeholder="Apellido"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@ejemplo.com"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Contraseña <span className="required">*</span>
                </label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Confirmar Contraseña <span className="required">*</span>
                </label>
                <input
                  type="password"
                  value={formData.adminConfirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, adminConfirmPassword: e.target.value })
                  }
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="onboarding-step-content">
            <h2 className="step-title">Selecciona un Plan</h2>
            <p className="step-description">Elige el plan que mejor se adapte a las necesidades</p>

            <div className="plans-grid">
              <div
                className={`plan-card ${formData.plan === 'basic' ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, plan: 'basic' })}
              >
                <div className="plan-icon">⭐</div>
                <h3>Basic</h3>
                <p className="plan-price">$29/mes</p>
                <ul className="plan-features">
                  <li>Hasta 50 propiedades</li>
                  <li>10 usuarios</li>
                  <li>Soporte por email</li>
                </ul>
              </div>

              <div
                className={`plan-card ${formData.plan === 'pro' ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, plan: 'pro' })}
              >
                <div className="plan-icon">🚀</div>
                <h3>Pro</h3>
                <p className="plan-price">$79/mes</p>
                <ul className="plan-features">
                  <li>Propiedades ilimitadas</li>
                  <li>Usuarios ilimitados</li>
                  <li>Dominio personalizado</li>
                  <li>Soporte prioritario</li>
                </ul>
              </div>

              <div
                className={`plan-card ${formData.plan === 'premium' ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, plan: 'premium' })}
              >
                <div className="plan-icon">👑</div>
                <h3>Premium</h3>
                <p className="plan-price">$149/mes</p>
                <ul className="plan-features">
                  <li>Todo lo de Pro</li>
                  <li>API personalizada</li>
                  <li>Integraciones avanzadas</li>
                  <li>Gerente de cuenta dedicado</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="onboarding-step-content">
            <h2 className="step-title">Configuración de Dominio</h2>
            <p className="step-description">
              Configura cómo accederán tus clientes a la plataforma
            </p>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.usarSubdominio}
                  onChange={(e) =>
                    setFormData({ ...formData, usarSubdominio: e.target.checked })
                  }
                />
                <span>Usar subdominio (recomendado)</span>
              </label>
              <p className="form-hint">
                {formData.usarSubdominio
                  ? `Tu sitio estará en: ${formData.slug || 'mi-inmobiliaria'}.dominiosaas.com`
                  : 'Configura un dominio personalizado más adelante desde el panel de configuración'}
              </p>
            </div>

            {!formData.usarSubdominio && (
              <div className="form-group">
                <label>Dominio Personalizado</label>
                <input
                  type="text"
                  value={formData.dominioPersonalizado}
                  onChange={(e) =>
                    setFormData({ ...formData, dominioPersonalizado: e.target.value })
                  }
                  placeholder="ejemplo.com"
                />
                <p className="form-hint">
                  Nota: Debes configurar el DNS de tu dominio para apuntar a nuestros servidores
                </p>
              </div>
            )}
          </div>
        );

      case 5:
        if (createdTenant) {
          return (
            <div className="onboarding-step-content success-step">
              <div className="success-icon">✅</div>
              <h2 className="step-title">¡Tenant Creado Exitosamente!</h2>
              <p className="step-description">
                El tenant y el usuario administrador han sido creados correctamente
              </p>

              <div className="summary-card">
                <h3>Resumen</h3>
                <div className="summary-item">
                  <span className="summary-label">Tenant:</span>
                  <span className="summary-value">{createdTenant.tenant.nombre}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Slug:</span>
                  <span className="summary-value">/{createdTenant.tenant.slug}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Plan:</span>
                  <span className="summary-value capitalize">
                    {createdTenant.tenant.plan}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Admin Email:</span>
                  <span className="summary-value">{createdTenant.adminUser.email}</span>
                </div>
              </div>

              <div className="actions-row">
                <button onClick={handleFinish} className="btn-primary">
                  Ver Lista de Tenants
                </button>
              </div>
            </div>
          );
        }
        return <div>Procesando...</div>;

      default:
        return null;
    }
  };

  return (
    <div className="admin-onboarding">
      <div className="onboarding-container">
        {/* Progress Steps */}
        <div className="steps-indicator">
          {STEPS.map((step, index) => (
            <div key={step.id} className="step-item">
              <div
                className={`step-number ${
                  currentStep === step.id
                    ? 'active'
                    : currentStep > step.id
                    ? 'completed'
                    : ''
                }`}
              >
                {currentStep > step.id ? '✓' : step.icon}
              </div>
              <div className="step-name">{step.name}</div>
              {index < STEPS.length - 1 && (
                <div
                  className={`step-line ${currentStep > step.id ? 'completed' : ''}`}
                ></div>
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="step-wrapper">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {renderStepContent()}

          {/* Navigation Buttons */}
          {currentStep < 5 && (
            <div className="step-navigation">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="btn-secondary"
              >
                Anterior
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Guardando...' : currentStep === 4 ? 'Crear Tenant' : 'Siguiente'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .admin-onboarding {
          width: 100%;
          min-height: calc(100vh - 120px);
          padding: 0;
          margin: 0;
        }

        .onboarding-container {
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 32px;
        }

        .steps-indicator {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          position: relative;
          padding: 0 24px;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
          max-width: 200px;
        }

        .step-number {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          background: rgba(139, 92, 246, 0.1);
          border: 2px solid rgba(139, 92, 246, 0.3);
          color: #a78bfa;
          transition: all 0.3s;
        }

        .step-number.active {
          background: linear-gradient(135deg, #8b5cf6 0%, #6b46c1 100%);
          border-color: #8b5cf6;
          color: white;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
        }

        .step-number.completed {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: #10b981;
          color: white;
        }

        .step-name {
          margin-top: 12px;
          font-size: 0.875rem;
          color: #a78bfa;
          text-align: center;
        }

        .step-line {
          position: absolute;
          top: 28px;
          left: 60%;
          right: -40%;
          height: 2px;
          background: rgba(139, 92, 246, 0.2);
          z-index: -1;
        }

        .step-line.completed {
          background: linear-gradient(90deg, #10b981, #8b5cf6);
        }

        .step-wrapper {
          min-height: 500px;
          background: rgba(30, 30, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 16px;
          padding: 40px;
        }

        .onboarding-step-content {
          animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .step-title {
          font-size: 2rem;
          font-weight: bold;
          color: #f3e8ff;
          margin-bottom: 8px;
        }

        .step-description {
          color: #a78bfa;
          margin-bottom: 32px;
          font-size: 1.1rem;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #f3e8ff;
          margin-bottom: 8px;
        }

        .required {
          color: #ef4444;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px 16px;
          background: rgba(30, 30, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          color: #f3e8ff;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .form-hint {
          margin-top: 6px;
          font-size: 0.75rem;
          color: #a78bfa;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: auto;
          cursor: pointer;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 24px;
        }

        .plan-card {
          padding: 32px;
          background: rgba(30, 30, 46, 0.6);
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-radius: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
        }

        .plan-card:hover {
          border-color: #8b5cf6;
          transform: translateY(-4px);
        }

        .plan-card.selected {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
        }

        .plan-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }

        .plan-card h3 {
          font-size: 1.5rem;
          color: #f3e8ff;
          margin-bottom: 8px;
        }

        .plan-price {
          font-size: 1.75rem;
          font-weight: bold;
          color: #8b5cf6;
          margin-bottom: 24px;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          text-align: left;
          color: #a78bfa;
        }

        .plan-features li {
          padding: 8px 0;
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
        }

        .plan-features li:last-child {
          border-bottom: none;
        }

        .step-navigation {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding-top: 32px;
          border-top: 1px solid rgba(139, 92, 246, 0.2);
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 32px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6 0%, #6b46c1 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(139, 92, 246, 0.2);
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .success-step {
          text-align: center;
        }

        .success-icon {
          font-size: 5rem;
          margin-bottom: 24px;
        }

        .summary-card {
          background: rgba(30, 30, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 16px;
          padding: 32px;
          margin: 32px 0;
          text-align: left;
        }

        .summary-card h3 {
          color: #f3e8ff;
          margin-bottom: 24px;
          font-size: 1.5rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-label {
          color: #a78bfa;
          font-weight: 500;
        }

        .summary-value {
          color: #f3e8ff;
          font-weight: 600;
        }

        .capitalize {
          text-transform: capitalize;
        }

        .actions-row {
          margin-top: 32px;
        }
      `}</style>
    </div>
  );
}

