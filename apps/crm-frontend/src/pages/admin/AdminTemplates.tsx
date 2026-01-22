/**
 * AdminTemplates - Gestión de Templates de Rol
 * Permite crear, editar y gestionar templates que definen los permisos base
 * que un tenant admin puede asignar a sus roles personalizados.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  toggleTemplateStatus,
  deleteTemplate,
  RolTemplate,
} from '../../services/api';

export default function AdminTemplates() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<RolTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RolTemplate | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token de autenticación');
      const data = await getAllTemplates(token);
      setTemplates(data);
      setLoadingError(null);
    } catch (err: any) {
      setLoadingError(err.message || 'Error al cargar templates');
      console.error('Error cargando templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: RolTemplate) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleToggle = async (template: RolTemplate) => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token de autenticación');
      await toggleTemplateStatus(template.id, !template.esActivo, token);
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
      console.error('Error toggling template:', err);
    }
  };

  const handleDelete = async (template: RolTemplate) => {
    if (!confirm(`¿Eliminar el template "${template.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token de autenticación');
      await deleteTemplate(template.id, token);
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar template');
      console.error('Error eliminando template:', err);
    }
  };

  const handleConfigPermisos = (template: RolTemplate) => {
    navigate(`/admin/templates/${template.id}/permisos`);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingTemplate(null);
  };

  const handleSaved = () => {
    handleCloseModal();
    loadTemplates();
  };

  const activeTemplates = showInactive ? templates : templates.filter(t => t.esActivo);

  const stats = {
    total: templates.length,
    active: templates.filter(t => t.esActivo).length,
    totalRoles: templates.reduce((sum, t) => sum + (t.totalRoles || 0), 0),
    totalTenants: templates.reduce((sum, t) => sum + (t.totalTenants || 0), 0),
  };

  if (loading) {
    return (
      <div className="admin-templates-loading">
        <div className="loading-spinner"></div>
        <p>Cargando templates...</p>
        <style>{`
          .admin-templates-loading {
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

  if (loadingError) {
    return (
      <div className="admin-templates-error">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3>Error al cargar datos</h3>
        <p>{loadingError}</p>
        <button onClick={loadTemplates} className="retry-btn">Reintentar</button>
        <style>{`
          .admin-templates-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            text-align: center;
          }
          .error-icon { color: #EF4444; }
          .retry-btn {
            padding: 10px 24px;
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .retry-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-templates">
      <div className="page-header">
        <div>
          <h1>Templates de Rol</h1>
          <p className="page-subtitle">
            Define los permisos base que los tenant admins pueden asignar a sus roles personalizados
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingTemplate(null);
            setShowCreateModal(true);
          }}
        >
          <span className="btn-icon">+</span>
          Nuevo Template
        </button>
      </div>

      {error && (
        <div className="action-error-banner">
          <div className="error-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64547 18.3024 1.55311 18.6453 1.552 19C1.55089 19.3547 1.64105 19.6983 1.81377 19.9999C1.98649 20.3015 2.23616 20.5498 2.53752 20.7183C2.83887 20.8868 3.18067 20.9693 3.53 20.96H20.47C20.8193 20.9693 21.1611 20.8868 21.4625 20.7183C21.7638 20.5498 22.0135 20.3015 22.1862 19.9999C22.359 19.6983 22.4491 19.3547 22.448 19C22.4469 18.6453 22.3545 18.3024 22.18 18L13.71 3.86C13.5319 3.56609 13.2808 3.32312 12.9813 3.15447C12.6818 2.98582 12.3437 2.89726 12 2.89726C11.6563 2.89726 11.3182 2.98582 11.0187 3.15447C10.7192 3.32312 10.4681 3.56609 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="error-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Filtro */}
      <div className="filters-section">
        <label className="toggle-filter">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          <span className="toggle-label">Mostrar inactivos</span>
        </label>
        <div className="filter-stats">
          <span className="filter-stat">
            Mostrando: <strong>{activeTemplates.length}</strong> de {templates.length} templates
          </span>
        </div>
      </div>

      {/* Estadisticas */}
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 13C4 12.4477 4.44772 12 5 12H19C19.5523 12 20 12.4477 20 13V15C20 15.5523 19.5523 16 19 16H5C4.44772 16 4 15.5523 4 15V13Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 21L4 19M20 21V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Templates</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Activos</div>
            <div className="stat-value">{stats.active}</div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Roles Usando</div>
            <div className="stat-value">{stats.totalRoles}</div>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M3 21H21M5 21V7L12 3L19 7V21M5 21H19M9 9V17M15 9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Tenants</div>
            <div className="stat-value">{stats.totalTenants}</div>
          </div>
        </div>
      </div>

      {/* Grid de Templates */}
      {activeTemplates.length === 0 ? (
        <div className="empty-state">
          <p>No hay templates definidos</p>
          <p className="empty-hint">Crea un template para definir los permisos base de un tipo de rol</p>
        </div>
      ) : (
        <div className="templates-grid">
          {activeTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onConfigPermisos={handleConfigPermisos}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={handleCloseModal}
          onSaved={handleSaved}
          getToken={getToken}
        />
      )}

      <style>{`
        .admin-templates {
          max-width: 1600px;
        }

        .action-error-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-left: 4px solid #DC2626;
          padding: 16px 20px;
          margin-bottom: 24px;
          border-radius: 10px;
          color: #DC2626;
        }

        .action-error-banner .error-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .action-error-banner .error-close {
          background: none;
          border: none;
          color: #DC2626;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .action-error-banner .error-close:hover {
          background: rgba(220, 38, 38, 0.1);
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 2.25rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          margin: 0;
          color: #64748B;
          font-size: 0.9375rem;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9375rem;
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          gap: 16px;
          align-items: center;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
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

        .stat-card.stat-purple .stat-icon {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        }

        .stat-card.stat-orange .stat-icon {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .stat-card.stat-green .stat-icon {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #64748B;
          margin-bottom: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #0F172A;
        }

        .filters-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding: 16px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
        }

        .toggle-filter {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #334155;
        }

        .toggle-filter input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .filter-stats {
          display: flex;
          gap: 20px;
        }

        .filter-stat {
          color: #64748B;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .filter-stat strong {
          color: #0F172A;
          font-weight: 700;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }

        .empty-state {
          padding: 60px 40px;
          text-align: center;
          background: #FFFFFF;
          border: 2px dashed #CBD5E1;
          border-radius: 12px;
          color: #64748B;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9375rem;
        }

        .empty-hint {
          margin-top: 8px !important;
          font-size: 0.8125rem !important;
          color: #94A3B8 !important;
        }
      `}</style>
    </div>
  );
}

/**
 * Tarjeta de Template
 */
function TemplateCard({
  template,
  onEdit,
  onToggle,
  onDelete,
  onConfigPermisos,
}: {
  template: RolTemplate;
  onEdit: (t: RolTemplate) => void;
  onToggle: (t: RolTemplate) => void;
  onDelete: (t: RolTemplate) => void;
  onConfigPermisos: (t: RolTemplate) => void;
}) {
  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    operacional: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
    gerencial: { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' },
    marketing: { bg: '#FCE7F3', text: '#9D174D', border: '#FBCFE8' },
    administrativo: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    basico: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  };

  const catStyle = categoryColors[template.categoria] || categoryColors.operacional;

  return (
    <div className={`template-card ${!template.esActivo ? 'template-inactive' : ''}`}>
      <div className="template-card-header">
        <div className="template-card-info">
          <h3 className="template-name">{template.nombre}</h3>
          <span className="template-code">{template.codigo}</span>
        </div>
        <div className="template-header-right">
          <span className="template-category" style={{ background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}>
            {template.categoria}
          </span>
          <span className={`template-status ${template.esActivo ? 'active' : 'inactive'}`}>
            {template.esActivo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {template.descripcion && (
        <p className="template-description">{template.descripcion}</p>
      )}

      <div className="template-stats-row">
        <div className="template-stat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{template.totalRoles || 0} roles</span>
        </div>
        <div className="template-stat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 21H21M5 21V7L12 3L19 7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{template.totalTenants || 0} tenants</span>
        </div>
        {!template.visibleParaTenants && (
          <span className="template-badge badge-hidden">Oculto</span>
        )}
      </div>

      <div className="template-card-footer">
        <span className="template-date">
          {new Date(template.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <div className="template-actions">
          <button className="template-action-btn" onClick={() => onConfigPermisos(template)} title="Configurar Permisos">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10M12 3L13.9101 4.87147L16.5 4.20577L17.2184 6.78155L19.7942 7.5L19.1285 10.0899L21 12L19.1285 13.9101L19.7942 16.5L17.2184 17.2184L16.5 19.7942L13.9101 19.1285L12 21L10.0899 19.1285L7.5 19.7942L6.78155 17.2184L4.20577 16.5L4.87147 13.9101L3 12L4.87147 10.0899L4.20577 7.5L6.78155 6.78155L7.5 4.20577L10.0899 4.87147L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="template-action-btn" onClick={() => onEdit(template)} title="Editar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="template-action-btn" onClick={() => onToggle(template)} title={template.esActivo ? 'Desactivar' : 'Activar'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              {template.esActivo ? (
                <path d="M18.36 6.64C19.6184 7.89879 20.4753 9.50244 20.8223 11.2482C21.1693 12.9939 20.9909 14.8034 20.3096 16.4478C19.6284 18.0921 18.4748 19.4976 16.9948 20.4864C15.5148 21.4752 13.7749 22.0029 11.995 22.0029C10.2151 22.0029 8.47515 21.4752 6.99517 20.4864C5.51519 19.4976 4.36164 18.0921 3.68036 16.4478C2.99909 14.8034 2.82069 12.9939 3.16772 11.2482C3.51475 9.50244 4.37162 7.89879 5.63 6.64M12 2V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
          <button
            className="template-action-btn template-action-btn-danger"
            onClick={() => onDelete(template)}
            title="Eliminar"
            disabled={(template.totalRoles || 0) > 0}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .template-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #CBD5E1;
        }

        .template-inactive {
          opacity: 0.6;
        }

        .template-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 12px;
        }

        .template-card-info {
          flex: 1;
          min-width: 0;
        }

        .template-name {
          margin: 0 0 4px 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #0F172A;
        }

        .template-code {
          font-size: 0.8125rem;
          color: #64748B;
          font-family: 'Courier New', monospace;
          background: #F8FAFC;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .template-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }

        .template-category {
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .template-status {
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .template-status.active {
          background: #D1FAE5;
          color: #059669;
        }

        .template-status.inactive {
          background: #FEE2E2;
          color: #DC2626;
        }

        .template-description {
          margin: 0 0 14px 0;
          font-size: 0.875rem;
          color: #64748B;
          line-height: 1.5;
        }

        .template-stats-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          padding: 10px 14px;
          background: #F8FAFC;
          border-radius: 8px;
        }

        .template-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8125rem;
          color: #475569;
          font-weight: 500;
        }

        .template-stat svg {
          color: #94A3B8;
        }

        .template-badge {
          margin-left: auto;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.6875rem;
          font-weight: 600;
        }

        .badge-hidden {
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FDE68A;
        }

        .template-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 14px;
          border-top: 1px solid #E2E8F0;
        }

        .template-date {
          font-size: 0.8125rem;
          color: #64748B;
        }

        .template-actions {
          display: flex;
          gap: 6px;
        }

        .template-action-btn {
          width: 32px;
          height: 32px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: #475569;
          padding: 0;
        }

        .template-action-btn:hover:not(:disabled) {
          background: #F1F5F9;
          border-color: #CBD5E1;
          color: #2563EB;
        }

        .template-action-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .template-action-btn-danger:hover:not(:disabled) {
          background: #FEE2E2;
          border-color: #FECACA;
          color: #B91C1C;
        }
      `}</style>
    </div>
  );
}

/**
 * Modal para crear/editar templates
 */
function TemplateModal({
  template,
  onClose,
  onSaved,
  getToken,
}: {
  template: RolTemplate | null;
  onClose: () => void;
  onSaved: () => void;
  getToken: () => Promise<string | null>;
}) {
  const [formData, setFormData] = useState({
    codigo: template?.codigo || '',
    nombre: template?.nombre || '',
    descripcion: template?.descripcion || '',
    categoria: template?.categoria || 'operacional',
    icono: template?.icono || '',
    color: template?.color || '',
    visibleParaTenants: template?.visibleParaTenants ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No se pudo obtener el token de autenticación');

      if (template) {
        const { codigo, ...updateData } = formData;
        await updateTemplate(template.id, updateData, token);
      } else {
        if (!formData.nombre || !formData.codigo) {
          throw new Error('El nombre y código son requeridos');
        }
        await createTemplate(formData, token);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar template');
      console.error('Error guardando template:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{template ? 'Editar Template' : 'Crear Nuevo Template'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nombre <span className="required">*</span></label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Asesor Inmobiliario"
              required
            />
          </div>

          <div className="form-group">
            <label>Código <span className="required">*</span></label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="Ej: asesor_inmobiliario"
              required
              disabled={!!template}
            />
            <p className="form-hint">Identificador único. No se puede cambiar después de crear.</p>
          </div>

          <div className="form-group">
            <label>Categoría</label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            >
              <option value="operacional">Operacional</option>
              <option value="gerencial">Gerencial</option>
              <option value="marketing">Marketing</option>
              <option value="administrativo">Administrativo</option>
              <option value="basico">Básico</option>
            </select>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Describe el propósito de este template..."
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Icono</label>
              <input
                type="text"
                value={formData.icono}
                onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                placeholder="Ej: briefcase"
              />
            </div>
            <div className="form-group">
              <label>Color</label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="Ej: #2563EB"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.visibleParaTenants}
                onChange={(e) => setFormData({ ...formData, visibleParaTenants: e.target.checked })}
              />
              <span>Visible para Tenant Admins</span>
            </label>
            <p className="form-hint">Si está desmarcado, los tenant admins no podrán crear roles basados en este template</p>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary-modal" disabled={saving || !formData.nombre || !formData.codigo}>
              {saving ? 'Guardando...' : template ? 'Guardar Cambios' : 'Crear Template'}
            </button>
          </div>
        </form>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .modal-content {
            background: #FFFFFF;
            border-radius: 16px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 1px solid #E2E8F0;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: #0F172A;
          }

          .modal-close {
            background: none;
            border: none;
            cursor: pointer;
            color: #64748B;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s;
          }

          .modal-close:hover {
            background: #F1F5F9;
            color: #0F172A;
          }

          .error-message {
            background: #FEE2E2;
            border: 1px solid #FECACA;
            color: #DC2626;
            padding: 16px;
            margin: 24px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
          }

          .modal-form {
            padding: 24px;
          }

          .form-group {
            margin-bottom: 20px;
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
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            width: 100%;
            padding: 12px 16px;
            background: #FFFFFF;
            border: 1px solid #CBD5E1;
            border-radius: 10px;
            color: #0F172A;
            font-size: 0.9375rem;
            transition: all 0.2s;
            box-sizing: border-box;
          }

          .form-group input:disabled {
            background: #F8FAFC;
            opacity: 0.7;
            cursor: not-allowed;
          }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: #2563EB;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }

          .form-hint {
            margin-top: 6px;
            font-size: 0.75rem;
            color: #64748B;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            font-weight: 500;
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
            gap: 12px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #E2E8F0;
          }

          .btn-secondary {
            padding: 12px 24px;
            background: #FFFFFF;
            color: #475569;
            border: 1px solid #CBD5E1;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #F8FAFC;
            border-color: #94A3B8;
          }

          .btn-secondary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-primary-modal {
            padding: 12px 24px;
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-primary-modal:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          }

          .btn-primary-modal:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}
