/**
 * CrmPropiedadDetalle - Página de detalle de propiedad con sistema de tabs
 * 
 * Tabs disponibles:
 * - General: Información básica, imágenes, descripción, características
 * - Datos del Proyecto: Solo si is_project = true
 * - Contenido: Contenido adicional, descripciones extendidas
 * - SEO: Configuración SEO
 * - Gestión: Portales, reportes, comentarios
 * - Documentos: Documentos adjuntos
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getPropiedadCrm,
  updatePropiedadCrm,
  Propiedad,
} from '../../services/api';

// Componentes de tabs (se crearán después)
import PropiedadGeneral from './propiedades/PropiedadGeneral';
import PropiedadProyecto from './propiedades/PropiedadProyecto';
import PropiedadContenido from './propiedades/PropiedadContenido';
import PropiedadSEO from './propiedades/PropiedadSEO';
import PropiedadGestion from './propiedades/PropiedadGestion';
import PropiedadDocumentos from './propiedades/PropiedadDocumentos';

// Iconos SVG
const Icons = {
  arrowLeft: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  home: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  building: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21h18"/>
      <path d="M5 21V7l8-4v18"/>
      <path d="M19 21V11l-6-4"/>
      <line x1="9" y1="9" x2="9" y2="9"/>
      <line x1="9" y1="12" x2="9" y2="12"/>
      <line x1="9" y1="15" x2="9" y2="15"/>
      <line x1="9" y1="18" x2="9" y2="18"/>
    </svg>
  ),
  bookOpen: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  target: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  barChart: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  fileText: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  loader: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  ),
};

type TabId = 'general' | 'proyecto' | 'contenido' | 'seo' | 'gestion' | 'documentos';

interface Tab {
  id: TabId;
  name: string;
  icon: React.ComponentType<any>;
}

export default function CrmPropiedadDetalle() {
  const { tenantSlug, propiedadId } = useParams<{ tenantSlug: string; propiedadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [hasChanges, setHasChanges] = useState(false);

  // Obtener tenant actual
  const tenantActual = user?.tenants?.find(t => t.slug === tenantSlug);

  // Cargar propiedad
  useEffect(() => {
    if (tenantActual?.id && propiedadId) {
      cargarPropiedad();
    }
  }, [tenantActual?.id, propiedadId]);

  // Configurar header
  useEffect(() => {
    if (propiedad) {
      setPageHeader({
        title: propiedad.titulo || 'Propiedad',
        subtitle: `Código: ${propiedad.codigo || 'N/A'}`,
        backButton: {
          label: 'Volver a Propiedades',
          onClick: () => navigate(`/crm/${tenantSlug}/propiedades`),
        },
      });
    }
  }, [propiedad, setPageHeader, tenantSlug, navigate]);

  const cargarPropiedad = async () => {
    if (!tenantActual?.id || !propiedadId) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const data = await getPropiedadCrm(tenantActual.id, propiedadId, token);
      setPropiedad(data);
    } catch (err: any) {
      console.error('Error cargando propiedad:', err);
      setError(err.message || 'Error al cargar la propiedad');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyUpdate = async (updatedData: Partial<Propiedad>) => {
    if (!tenantActual?.id || !propiedadId || !propiedad) return;

    try {
      const token = await getToken();
      const updated = await updatePropiedadCrm(tenantActual.id, propiedadId, updatedData, token);
      setPropiedad(updated);
      setHasChanges(true);
      
      // Si se convierte a proyecto y no está en el tab proyecto, cambiar automáticamente
      if (updatedData.is_project && !propiedad.is_project && activeTab === 'general') {
        setActiveTab('proyecto');
      }
      
      // Si se quita el proyecto y está en el tab proyecto, volver a general
      if (updatedData.is_project === false && propiedad.is_project && activeTab === 'proyecto') {
        setActiveTab('general');
      }
    } catch (err: any) {
      console.error('Error actualizando propiedad:', err);
      setError(err.message || 'Error al actualizar la propiedad');
    }
  };

  // Toggle para convertir propiedad en proyecto
  const toggleProjectStatus = async () => {
    if (!propiedad) return;
    
    try {
      await handlePropertyUpdate({ is_project: !propiedad.is_project });
    } catch (err: any) {
      console.error('Error al cambiar estado de proyecto:', err);
    }
  };

  // Configurar tabs dinámicos
  const getTabs = (): Tab[] => {
    const baseTabs: Tab[] = [
      { id: 'general', name: 'General', icon: Icons.home },
      { id: 'contenido', name: 'Contenido', icon: Icons.bookOpen },
      { id: 'seo', name: 'SEO', icon: Icons.target },
      { id: 'gestion', name: 'Gestión', icon: Icons.barChart },
      { id: 'documentos', name: 'Documentos', icon: Icons.fileText },
    ];

    // Agregar tab de proyecto solo si la propiedad es un proyecto
    if (propiedad?.is_project) {
      baseTabs.splice(1, 0, { id: 'proyecto', name: 'Datos del Proyecto', icon: Icons.building });
    }

    return baseTabs;
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <Icons.loader className="spinner" />
          <p>Cargando propiedad...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error-container">
          <div className="error-content">
            <strong>⚠️ Error:</strong>
            <span>{error}</span>
          </div>
          <button className="btn-primary" onClick={cargarPropiedad}>
            Reintentar
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (!propiedad) {
    return (
      <div className="page">
        <div className="empty-state">
          <Icons.home className="empty-icon" />
          <h3>Propiedad no encontrada</h3>
          <p>La propiedad que buscas no existe o no tienes permisos para verla.</p>
          <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/propiedades`)}>
            Volver a Propiedades
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  const tabs = getTabs();

  return (
    <div className="page">
      <div className="propiedad-detail-container">
        {/* Header con información principal */}
        <div className="propiedad-header">
          <div className="propiedad-header-main">
            <div className="propiedad-header-info">
              <div className="propiedad-code">#{propiedad.codigo || 'N/A'}</div>
              <h1 className="propiedad-title">{propiedad.titulo}</h1>
              {propiedad.direccion && (
                <div className="propiedad-location">{propiedad.direccion}</div>
              )}
              <div className="propiedad-badges">
                <span className={`badge badge-${propiedad.estado_propiedad}`}>
                  {propiedad.estado_propiedad}
                </span>
                <span className="badge badge-type">{propiedad.tipo}</span>
                <button
                  type="button"
                  className={`badge badge-project-toggle ${propiedad.is_project ? 'active' : ''}`}
                  onClick={toggleProjectStatus}
                  title={propiedad.is_project ? 'Convertir a propiedad regular' : 'Convertir a proyecto'}
                >
                  <Icons.building width={14} height={14} />
                  {propiedad.is_project ? 'PROYECTO' : 'CONVERTIR A PROYECTO'}
                </button>
              </div>
            </div>
            <div className="propiedad-header-price">
              {propiedad.precio && (
                <div className="price-main">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: propiedad.moneda || 'USD',
                    minimumFractionDigits: 0,
                  }).format(propiedad.precio)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="tabs-container">
          <div className="tabs-header">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <IconComponent />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'general' && (
              <PropiedadGeneral
                propiedad={propiedad}
                onUpdate={handlePropertyUpdate}
                onRefresh={cargarPropiedad}
              />
            )}

            {activeTab === 'proyecto' && propiedad.is_project && (
              <PropiedadProyecto
                propiedadId={propiedadId!}
                propiedad={propiedad}
                onUpdate={handlePropertyUpdate}
              />
            )}

            {activeTab === 'contenido' && (
              <PropiedadContenido
                propiedadId={propiedadId!}
                propiedad={propiedad}
                onUpdate={handlePropertyUpdate}
              />
            )}

            {activeTab === 'seo' && (
              <PropiedadSEO
                propiedadId={propiedadId!}
                propiedad={propiedad}
                onUpdate={handlePropertyUpdate}
              />
            )}

            {activeTab === 'gestion' && (
              <PropiedadGestion
                propiedadId={propiedadId!}
                propiedad={propiedad}
                onUpdate={handlePropertyUpdate}
              />
            )}

            {activeTab === 'documentos' && (
              <PropiedadDocumentos
                propiedadId={propiedadId!}
                propiedad={propiedad}
                onUpdate={handlePropertyUpdate}
              />
            )}
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .loading-container,
  .error-container,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    gap: 16px;
  }

  .error-container {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 16px;
    margin: 24px;
  }

  .error-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: center;
    color: #dc2626;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .empty-state {
    background: white;
    border: 2px dashed #e2e8f0;
    border-radius: 16px;
    text-align: center;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    color: #94a3b8;
    margin-bottom: 16px;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
  }

  .empty-state p {
    margin: 0 0 24px 0;
    color: #64748b;
    max-width: 360px;
  }

  .propiedad-detail-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f8fafc;
  }

  .propiedad-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 24px 32px;
  }

  .propiedad-header-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
  }

  .propiedad-header-info {
    flex: 1;
  }

  .propiedad-code {
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
    margin-bottom: 4px;
  }

  .propiedad-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px 0;
  }

  .propiedad-location {
    font-size: 0.9rem;
    color: #64748b;
    margin-bottom: 16px;
  }

  .propiedad-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .badge-disponible {
    background: #dcfce7;
    color: #16a34a;
  }

  .badge-reservada {
    background: #fef3c7;
    color: #f59e0b;
  }

  .badge-vendida,
  .badge-rentada {
    background: #f1f5f9;
    color: #64748b;
  }

  .badge-inactiva {
    background: #f8fafc;
    color: #94a3b8;
  }

  .badge-type {
    background: #e0e7ff;
    color: #6366f1;
  }

  .badge-project {
    background: #1e293b;
    color: white;
  }

  .badge-project-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .badge-project-toggle:hover {
    background: #e2e8f0;
    border-color: #94a3b8;
  }

  .badge-project-toggle.active {
    background: #1e293b;
    color: white;
    border-color: #1e293b;
  }

  .propiedad-header-price {
    text-align: right;
  }

  .price-main {
    font-size: 1.5rem;
    font-weight: 700;
    color: #2563eb;
  }

  .tabs-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .tabs-header {
    display: flex;
    background: white;
    border-bottom: 2px solid #f1f5f9;
    padding: 0 32px;
    overflow-x: auto;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 24px;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    color: #64748b;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab-button:hover {
    background: #f8fafc;
    color: #475569;
  }

  .tab-button.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
    background: white;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 32px;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }
`;

