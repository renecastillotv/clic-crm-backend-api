/**
 * AdminFeatures - Gestión de Features & Addons de la plataforma
 * Controla qué funcionalidades están disponibles para cada tenant/plan
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getAllFeatures, createFeature, updateFeature, Feature } from '../../services/api';

// Iconos SVG profesionales
const IconPuzzle = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCheck = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSparkles = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.09 8.26L20 9.27L15 14.14L16.18 21.02L12 17.77L7.82 21.02L9 14.14L4 9.27L9.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 3L5.5 5L7 5.5L5.5 6L5 8L4.5 6L3 5.5L4.5 5L5 3Z" fill="currentColor"/>
    <path d="M19 3L19.5 5L21 5.5L19.5 6L19 8L18.5 6L17 5.5L18.5 5L19 3Z" fill="currentColor"/>
  </svg>
);

const IconBuilding = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21H21M5 21V7L12 3L19 7V21M5 21H19M9 9V17M15 9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconLink = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.4791 3.53087C19.5521 2.60383 18.298 2.07799 16.987 2.0666C15.676 2.0552 14.413 2.55918 13.47 3.47L11.75 5.18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 11C13.5705 10.4259 13.0226 9.95087 12.3934 9.60707C11.7643 9.26327 11.0685 9.05886 10.3533 9.00766C9.63821 8.95645 8.92038 9.05972 8.24863 9.31026C7.57688 9.5608 6.96691 9.95303 6.46 10.46L3.46 13.46C2.54918 14.403 2.04519 15.6661 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.44791 21.3962 5.70198 21.922 7.01296 21.9334C8.32394 21.9448 9.58705 21.4408 10.53 20.53L12.24 18.82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconEdit = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.50023C18.8978 2.10243 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.10243 21.5 2.50023C21.8978 2.89804 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.10243 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconInfo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function AdminFeatures() {
  const { getToken } = useAuth();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const data = await getAllFeatures(token);
      setFeatures(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar features');
      console.error('Error cargando features:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (feature: Feature) => {
    setEditingFeature(feature);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingFeature(null);
  };

  const handleSaved = () => {
    handleCloseModal();
    loadFeatures();
  };

  const stats = {
    total: features.length,
    public: features.filter((f) => f.isPublic).length,
    premium: features.filter((f) => f.isPremium).length,
    enabled: features.reduce((acc, f) => acc + (f.enabledCount || 0), 0),
  };

  const iconMap: Record<string, React.ReactNode> = {
    link: <IconLink />,
    'graduation-cap': (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 10V6C22 5.46957 21.7893 4.96086 21.4142 4.58579C21.0391 4.21071 20.5304 4 20 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V10M22 10L12 15L2 10M22 10V18C22 18.5304 21.7893 19.0391 21.4142 19.4142C21.0391 19.7893 20.5304 20 20 20H4C3.46957 20 2.96086 19.7893 2.58579 19.4142C2.21071 19.0391 2 18.5304 2 18V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    'chart-bar': (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3V21H21M7 16L12 11L16 15L21 10M21 10H17M21 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    sparkles: <IconSparkles />,
    puzzle: <IconPuzzle />,
    building: <IconBuilding />,
  };

  const categoryLabels: Record<string, string> = {
    integration: 'Integraciones',
    training: 'Capacitación',
    reporting: 'Reportes',
    ai: 'Inteligencia Artificial',
    addon: 'Addon',
  };

  if (loading) {
    return (
      <div className="admin-features-loading">
        <div className="loading-spinner"></div>
        <p>Cargando features...</p>
        <style>{`
          .admin-features-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            color: #64748B;
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
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-features">
      <div className="page-header">
        <div>
          <h1>Features & Addons</h1>
          <p className="page-subtitle">
            Gestiona los módulos y funcionalidades de la plataforma
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <span className="btn-icon">+</span>
          Nuevo Feature
        </button>
      </div>

      {error && (
        <div className="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-icon">
            <IconPuzzle />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Features</div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon">
            <IconCheck />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.public}</div>
            <div className="stat-label">Públicos</div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-icon">
            <IconSparkles />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.premium}</div>
            <div className="stat-label">Premium</div>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-icon">
            <IconBuilding />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.enabled}</div>
            <div className="stat-label">Habilitaciones</div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <div className="info-icon">
          <IconInfo />
        </div>
        <div className="info-content">
          <p className="info-title">Sistema de Features</p>
          <p className="info-text">
            Los features controlan qué funcionalidades y roles están disponibles para cada tenant.
            Un feature <strong>no público</strong> solo es visible para tenants que lo tienen
            explícitamente habilitado o cuyo plan lo incluye.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      {features.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <IconPuzzle />
          </div>
          <h3>No hay features registrados</h3>
          <p>Crea tu primer feature para comenzar</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            Crear Feature
          </button>
        </div>
      ) : (
        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.id} className="feature-card">
              <div className="feature-card-header">
                <div className="feature-header-left">
                  <div className="feature-icon">
                    {iconMap[feature.icon] || <IconPuzzle />}
                  </div>
                  <div>
                    <h3 className="feature-name">{feature.name}</h3>
                    <span className="feature-category">
                      {categoryLabels[feature.category] || feature.category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(feature)}
                  className="feature-edit-btn"
                  title="Editar"
                >
                  <IconEdit />
                </button>
              </div>

              <p className="feature-description">{feature.description}</p>

              <div className="feature-details">
                <div className="feature-detail-row">
                  <span className="feature-detail-label">Visibilidad:</span>
                  <span className={`feature-detail-value ${feature.isPublic ? 'value-green' : 'value-orange'}`}>
                    {feature.isPublic ? '✓ Público' : '✗ Privado'}
                  </span>
                </div>
                <div className="feature-detail-row">
                  <span className="feature-detail-label">Tipo:</span>
                  <span className={`feature-detail-value ${feature.isPremium ? 'value-purple' : ''}`}>
                    {feature.isPremium ? 'Premium' : 'Básico'}
                  </span>
                </div>
                {feature.availableInPlans && feature.availableInPlans.length > 0 && (
                  <div className="feature-detail-row">
                    <span className="feature-detail-label">Planes:</span>
                    <div className="feature-plans">
                      {feature.availableInPlans.map((plan) => (
                        <span key={plan} className="plan-badge">
                          {plan}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="feature-detail-row feature-detail-row-border">
                  <span className="feature-detail-label">Tenants activos:</span>
                  <span className="feature-detail-value feature-detail-value-bold">
                    {feature.enabledCount || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingFeature) && (
        <FeatureModal
          feature={editingFeature}
          onClose={handleCloseModal}
          onSaved={handleSaved}
        />
      )}

      <style>{`
        .admin-features {
          width: 100%;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 2.25rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          color: #64748B;
          font-size: 1rem;
          margin: 0;
          font-weight: 400;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
        }

        .btn-icon {
          font-size: 1.25rem;
        }

        .error-message {
          padding: 16px 20px;
          background: #FEE2E2;
          border: 1px solid #FECACA;
          border-radius: 12px;
          color: #DC2626;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
        }

        .error-message svg {
          flex-shrink: 0;
          color: #EF4444;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.2s;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: #CBD5E1;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          flex-shrink: 0;
          color: white;
        }

        .stat-blue .stat-icon {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
        }

        .stat-green .stat-icon {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }

        .stat-purple .stat-icon {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        }

        .stat-orange .stat-icon {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #0F172A;
          line-height: 1;
          margin-bottom: 8px;
          letter-spacing: -0.03em;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #64748B;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-box {
          background: #EFF6FF;
          border: 1px solid #DBEAFE;
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 32px;
          display: flex;
          gap: 16px;
        }

        .info-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563EB;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .info-content {
          flex: 1;
        }

        .info-title {
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 8px 0;
          font-size: 1rem;
        }

        .info-text {
          color: #475569;
          font-size: 0.9375rem;
          line-height: 1.6;
          margin: 0;
        }

        .info-text strong {
          color: #0F172A;
          font-weight: 700;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 24px;
        }

        .feature-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.2s;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .feature-card:hover {
          transform: translateY(-2px);
          border-color: #CBD5E1;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .feature-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .feature-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .feature-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 12px;
          color: white;
          flex-shrink: 0;
        }

        .feature-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 8px 0;
        }

        .feature-category {
          display: inline-block;
          padding: 4px 12px;
          background: #EFF6FF;
          color: #2563EB;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .feature-edit-btn {
          padding: 8px;
          background: transparent;
          border: none;
          color: #64748B;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feature-edit-btn:hover {
          background: #F1F5F9;
          color: #2563EB;
        }

        .feature-description {
          color: #475569;
          font-size: 0.9375rem;
          line-height: 1.6;
          margin: 0 0 20px 0;
        }

        .feature-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .feature-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .feature-detail-row-border {
          padding-top: 12px;
          border-top: 1px solid #E2E8F0;
        }

        .feature-detail-label {
          color: #64748B;
          font-weight: 500;
        }

        .feature-detail-value {
          color: #0F172A;
          font-weight: 600;
        }

        .feature-detail-value-bold {
          font-weight: 700;
          font-size: 1rem;
        }

        .value-green {
          color: #059669;
        }

        .value-orange {
          color: #D97706;
        }

        .value-purple {
          color: #7C3AED;
          font-weight: 700;
        }

        .feature-plans {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .plan-badge {
          padding: 4px 12px;
          background: #EFF6FF;
          color: #2563EB;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .empty-state {
          text-align: center;
          padding: 64px 32px;
          background: #FFFFFF;
          border: 2px dashed #CBD5E1;
          border-radius: 16px;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CBD5E1;
        }

        .empty-state h3 {
          color: #0F172A;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          color: #64748B;
          margin: 0 0 24px 0;
          font-size: 0.9375rem;
        }
      `}</style>
    </div>
  );
}

/**
 * Modal para crear/editar features
 */
function FeatureModal({
  feature,
  onClose,
  onSaved,
}: {
  feature: Feature | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { getToken } = useAuth();
  const [formData, setFormData] = useState({
    name: feature?.name || '',
    description: feature?.description || '',
    icon: feature?.icon || 'puzzle',
    category: feature?.category || 'addon',
    isPublic: feature?.isPublic || false,
    isPremium: feature?.isPremium || true,
    availableInPlans: feature?.availableInPlans || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plans = ['basic', 'pro', 'premium', 'enterprise'];
  const icons = [
    { id: 'link', label: 'Link', icon: '🔗' },
    { id: 'graduation-cap', label: 'Graduation', icon: '🎓' },
    { id: 'chart-bar', label: 'Chart', icon: '📊' },
    { id: 'sparkles', label: 'Sparkles', icon: '✨' },
    { id: 'puzzle', label: 'Puzzle', icon: '🧩' },
    { id: 'building', label: 'Building', icon: '🏢' },
  ];
  const categories = [
    { id: 'integration', label: 'Integraciones' },
    { id: 'training', label: 'Capacitación' },
    { id: 'reporting', label: 'Reportes' },
    { id: 'ai', label: 'Inteligencia Artificial' },
    { id: 'addon', label: 'Addon General' },
  ];

  const togglePlan = (plan: string) => {
    setFormData({
      ...formData,
      availableInPlans: formData.availableInPlans.includes(plan)
        ? formData.availableInPlans.filter((p) => p !== plan)
        : [...formData.availableInPlans, plan],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      if (feature) {
        await updateFeature(feature.id, formData, token);
      } else {
        await createFeature(formData, token);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar feature');
      console.error('Error guardando feature:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="feature-modal-overlay" onClick={onClose}>
      <div className="feature-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="feature-modal-title">
          {feature ? 'Editar Feature' : 'Crear Nuevo Feature'}
        </h2>

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="feature-modal-form">
          <div className="form-group">
            <label>Nombre *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: CONNECT"
              required
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Icono</label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              >
                {icons.map((icon) => (
                  <option key={icon.id} value={icon.id}>
                    {icon.icon} {icon.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row-checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />
              <span>Público</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isPremium}
                onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
              />
              <span>Premium</span>
            </label>
          </div>

          <div className="form-group">
            <label>Disponible en planes</label>
            <div className="plans-selector">
              {plans.map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => togglePlan(plan)}
                  className={`plan-selector-btn ${formData.availableInPlans.includes(plan) ? 'selected' : ''}`}
                >
                  {plan}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Guardando...' : feature ? 'Guardar' : 'Crear Feature'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .feature-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .feature-modal-content {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 32px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .feature-modal-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 24px 0;
          letter-spacing: -0.01em;
        }

        .feature-modal-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0F172A;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          padding: 12px 16px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          color: #0F172A;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-row-checkboxes {
          display: flex;
          gap: 24px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .checkbox-label span {
          color: #0F172A;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .plans-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .plan-selector-btn {
          padding: 8px 16px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          color: #475569;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .plan-selector-btn:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }

        .plan-selector-btn.selected {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-color: #2563EB;
          color: white;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          padding-top: 8px;
        }

        .btn-secondary {
          flex: 1;
          padding: 12px 24px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #475569;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
