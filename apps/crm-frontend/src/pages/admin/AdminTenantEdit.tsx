/**
 * AdminTenantEdit - Página completa para editar un tenant existente
 * Similar al onboarding pero para edición
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { getTenantById, updateTenant, getAllPaises, Pais, TenantAdmin, UpdateTenantData, getTenantFeatures, enableFeatureForTenant, disableFeatureForTenant, FeatureWithTenantStatus } from '../../services/api';

export default function AdminTenantEdit() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    codigoPais: '',
    idiomaDefault: 'es',
    plan: 'basic' as 'basic' | 'pro' | 'premium',
    dominioPersonalizado: '',
    usarSubdominio: true,
    activo: true,
  });
  const [paises, setPaises] = useState<Pais[]>([]);
  const [features, setFeatures] = useState<FeatureWithTenantStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPaises, setLoadingPaises] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadTenant();
      loadPaises();
      loadFeatures();
    }
  }, [tenantId]);

  const loadTenant = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const tenant = await getTenantById(tenantId, token);
      setFormData({
        nombre: tenant.nombre || '',
        slug: tenant.slug || '',
        codigoPais: tenant.codigoPais || '',
        idiomaDefault: tenant.idiomaDefault || 'es',
        plan: (tenant.plan as 'basic' | 'pro' | 'premium') || 'basic',
        dominioPersonalizado: tenant.dominioPersonalizado || '',
        usarSubdominio: !tenant.dominioPersonalizado,
        activo: tenant.activo !== undefined ? tenant.activo : true,
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar tenant');
      console.error('Error cargando tenant:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPaises = async () => {
    try {
      setLoadingPaises(true);
      const token = await getToken();
      if (!token) {
        setError('No se pudo obtener el token de autenticación');
        return;
      }
      const data = await getAllPaises(token);
      setPaises(data);
    } catch (err: any) {
      console.error('Error cargando países:', err);
    } finally {
      setLoadingPaises(false);
    }
  };

  const loadFeatures = async () => {
    if (!tenantId) return;
    try {
      setLoadingFeatures(true);
      const token = await getToken();
      if (!token) {
        setError('No se pudo obtener el token de autenticación');
        return;
      }
      const data = await getTenantFeatures(tenantId, token);
      setFeatures(data);
    } catch (err: any) {
      console.error('Error cargando features:', err);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const handleToggleFeature = async (featureId: string, currentlyEnabled: boolean) => {
    if (!tenantId) return;
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      if (currentlyEnabled) {
        await disableFeatureForTenant(tenantId, featureId, token);
      } else {
        await enableFeatureForTenant(tenantId, featureId, token);
      }

      // Recargar features
      await loadFeatures();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar feature');
      console.error('Error actualizando feature:', err);
    }
  };

  // El slug no se puede cambiar después de crear el tenant

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const updateData: UpdateTenantData = {
        nombre: formData.nombre,
        // slug NO se actualiza - es inmutable después de crear
        idiomaDefault: formData.idiomaDefault,
        codigoPais: formData.codigoPais || undefined,
        plan: formData.plan,
        dominioPersonalizado: formData.usarSubdominio ? null : formData.dominioPersonalizado,
        activo: formData.activo,
      };

      await updateTenant(tenantId, updateData, token);
      navigate('/admin/tenants');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar tenant');
      console.error('Error al actualizar tenant:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-tenant-edit-loading">
        <div className="loading-spinner"></div>
        <p>Cargando tenant...</p>
      </div>
    );
  }

  return (
    <div className="admin-tenant-edit">
      <div className="edit-container">
        <div className="edit-header">
          <button
            onClick={() => navigate('/admin/tenants')}
            className="back-button"
          >
            ← Volver a Tenants
          </button>
          <div>
            <h1>Editar Tenant</h1>
            <p className="page-subtitle">
              Modifica la información del tenant
            </p>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64547 18.3024 1.55311 18.6453 1.552 19C1.55089 19.3547 1.64105 19.6983 1.81377 19.9999C1.98649 20.3015 2.23616 20.5498 2.53752 20.7183C2.83887 20.8868 3.18067 20.9693 3.53 20.96H20.47C20.8193 20.9693 21.1611 20.8868 21.4625 20.7183C21.7638 20.5498 22.0135 20.3015 22.1862 19.9999C22.359 19.6983 22.4491 19.3547 22.448 19C22.4469 18.6453 22.3545 18.3024 22.18 18L13.71 3.86C13.5319 3.56609 13.2808 3.32312 12.9813 3.15447C12.6818 2.98582 12.3437 2.89726 12 2.89726C11.6563 2.89726 11.3182 2.98582 11.0187 3.15447C10.7192 3.32312 10.4681 3.56609 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-section">
            <h2 className="section-title">Información Básica</h2>

            <div className="form-group">
              <label>
                Nombre de la Inmobiliaria <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: CLIC Inmobiliaria"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Slug (URL) <span className="form-hint">(No editable)</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                readOnly
                disabled
                className="input-readonly"
              />
              <p className="form-hint">
                El slug no se puede modificar después de crear el tenant. URL: {formData.slug || 'mi-inmobiliaria'}.dominiosaas.com
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

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                />
                <span>Tenant activo</span>
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2 className="section-title">Plan y Dominio</h2>

            <div className="form-group">
              <label>
                Plan de Suscripción <span className="required">*</span>
              </label>
              <div className="plans-grid">
                {(['basic', 'pro', 'premium'] as const).map((plan) => (
                  <div
                    key={plan}
                    className={`plan-card ${formData.plan === plan ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, plan })}
                  >
                    <div className="plan-icon">
                      {plan === 'basic' && (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {plan === 'pro' && (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {plan === 'premium' && (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 17H4C3.46957 17 2.96086 16.7893 2.58579 16.4142C2.21071 16.0391 2 15.5304 2 15V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H20C20.5304 3 21.0391 3.21071 21.4142 3.58579C21.7893 3.96086 22 4.46957 22 5V15C22 15.5304 21.7893 16.0391 21.4142 16.4142C21.0391 16.7893 20.5304 17 20 17H19M5 17L8.5 13.5M5 17L8.5 20.5M19 17L15.5 13.5M19 17L15.5 20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="plan-name">{plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.usarSubdominio}
                  onChange={(e) => setFormData({ ...formData, usarSubdominio: e.target.checked })}
                />
                <span>Usar subdominio por defecto ({formData.slug}.dominiosaas.com)</span>
              </label>
            </div>

            {!formData.usarSubdominio && (
              <div className="form-group">
                <label>
                  Dominio Personalizado
                </label>
                <input
                  type="text"
                  value={formData.dominioPersonalizado}
                  onChange={(e) => setFormData({ ...formData, dominioPersonalizado: e.target.value })}
                  placeholder="ejemplo.com"
                />
                <p className="form-hint">
                  Debes configurar el DNS del dominio para apuntar a nuestra plataforma
                </p>
              </div>
            )}
          </div>

          {/* Features Section */}
          <div className="form-section">
            <h2 className="section-title">Features Habilitados</h2>
            <p className="section-description">
              Gestiona qué features están habilitados para este tenant. Los features del plan se habilitan automáticamente.
            </p>

            {loadingFeatures ? (
              <div className="features-loading">
                <div className="loading-spinner-small"></div>
                <span>Cargando features...</span>
              </div>
            ) : features.length === 0 ? (
              <div className="features-empty">
                <p>No hay features disponibles</p>
              </div>
            ) : (
              <div className="features-grid">
                {features.map((feature) => {
                  const iconMap: Record<string, string> = {
                    link: '🔗',
                    'graduation-cap': '🎓',
                    'chart-bar': '📊',
                    sparkles: '✨',
                    puzzle: '🧩',
                    building: '🏢',
                  };

                  const isFromPlan = feature.availableInPlans.includes(formData.plan);
                  const canToggle = !isFromPlan; // No se puede deshabilitar si viene del plan

                  return (
                    <div key={feature.id} className={`feature-item ${feature.enabled ? 'enabled' : ''} ${isFromPlan ? 'from-plan' : ''}`}>
                      <div className="feature-item-header">
                        <div className="feature-item-icon">
                          {iconMap[feature.icon] || '🧩'}
                        </div>
                        <div className="feature-item-info">
                          <h4 className="feature-item-name">{feature.name}</h4>
                          <p className="feature-item-description">{feature.description}</p>
                        </div>
                        <label className="feature-toggle">
                          <input
                            type="checkbox"
                            checked={feature.enabled}
                            onChange={() => handleToggleFeature(feature.id, feature.enabled)}
                            disabled={isFromPlan || saving}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="feature-item-footer">
                        {isFromPlan && (
                          <span className="feature-badge feature-badge-plan">
                            ✓ Incluido en plan {formData.plan}
                          </span>
                        )}
                        {feature.isPremium && (
                          <span className="feature-badge feature-badge-premium">Premium</span>
                        )}
                        {!feature.isPublic && (
                          <span className="feature-badge feature-badge-private">Privado</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/admin/tenants')}
              className="btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !formData.nombre.trim() || !formData.slug.trim()}
              className="btn-primary"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .admin-tenant-edit {
          width: 100%;
          min-height: calc(100vh - 120px);
          padding: 0;
        }

        .admin-tenant-edit-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: #1E293B;
          gap: 16px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #E2E8F0;
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .edit-container {
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 32px;
        }

        .edit-header {
          margin-bottom: 32px;
        }

        .back-button {
          background: none;
          border: none;
          color: #2563EB;
          cursor: pointer;
          padding: 8px 0;
          margin-bottom: 16px;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s;
          font-weight: 500;
        }

        .back-button:hover {
          color: #1D4ED8;
          text-decoration: underline;
        }

        .edit-header h1 {
          font-size: 2.25rem;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          color: #64748B;
          font-size: 0.9375rem;
        }

        .error-message {
          background: #FEE2E2;
          border: 1px solid #FECACA;
          color: #DC2626;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
        }

        .edit-form {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          padding: 40px;
        }

        .form-section {
          margin-bottom: 40px;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0F172A;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #E2E8F0;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 8px;
        }

        .required {
          color: #DC2626;
          margin-left: 2px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px 16px;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          color: #0F172A;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .form-group input::placeholder {
          color: #94A3B8;
        }

        .form-group select {
          cursor: pointer;
        }

        .input-readonly {
          background: #F8FAFC !important;
          opacity: 0.7;
          cursor: not-allowed;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-hint {
          margin-top: 6px;
          font-size: 0.75rem;
          color: #64748B;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-weight: 500;
          color: #334155;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          padding-top: 32px;
          border-top: 1px solid #E2E8F0;
          margin-top: 32px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 32px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #FFFFFF;
          color: #475569;
          border: 1px solid #CBD5E1;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #F8FAFC;
          border-color: #94A3B8;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 16px;
        }

        .plan-card {
          padding: 24px;
          background: #FFFFFF;
          border: 2px solid #E2E8F0;
          border-radius: 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .plan-card:hover {
          border-color: #CBD5E1;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .plan-card.selected {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border-color: #2563EB;
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.2);
        }

        .plan-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563EB;
        }

        .plan-card.selected .plan-icon {
          color: #1D4ED8;
        }

        .plan-name {
          font-weight: 600;
          color: #0F172A;
          text-transform: capitalize;
        }

        .section-description {
          color: #64748B;
          font-size: 0.875rem;
          margin: -8px 0 20px 0;
          line-height: 1.6;
        }

        .features-loading {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px;
          color: #64748B;
        }

        .loading-spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid #E2E8F0;
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .features-empty {
          padding: 24px;
          text-align: center;
          color: #64748B;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .feature-item {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
        }

        .feature-item.enabled {
          border-color: #10B981;
          background: #F0FDF4;
        }

        .feature-item.from-plan {
          border-color: #2563EB;
          background: #EFF6FF;
        }

        .feature-item-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .feature-item-icon {
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .feature-item-info {
          flex: 1;
          min-width: 0;
        }

        .feature-item-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0F172A;
          margin: 0 0 4px 0;
        }

        .feature-item-description {
          font-size: 0.8125rem;
          color: #64748B;
          margin: 0;
          line-height: 1.4;
        }

        .feature-toggle {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .feature-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #CBD5E1;
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        .feature-toggle input:checked + .toggle-slider {
          background-color: #2563EB;
        }

        .feature-toggle input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        .feature-toggle input:disabled + .toggle-slider {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .feature-item-footer {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #E2E8F0;
        }

        .feature-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .feature-badge-plan {
          background: #DBEAFE;
          color: #1E40AF;
        }

        .feature-badge-premium {
          background: #F3E8FF;
          color: #6B21A8;
        }

        .feature-badge-private {
          background: #FEF3C7;
          color: #92400E;
        }
      `}</style>
    </div>
  );
}

