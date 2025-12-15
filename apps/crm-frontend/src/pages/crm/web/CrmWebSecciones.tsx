/**
 * CrmWebSecciones - Lista de secciones configurables del tenant
 *
 * Muestra el catálogo de componentes disponibles y permite navegar
 * a la página de configuración de cada uno.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageHeader } from '../../../layouts/CrmLayout';
import {
  getCatalogoComponentes,
  getSeccionesTenant,
  CatalogoComponente,
  SeccionConfig,
} from '../../../services/api';

// Agrupar secciones por categoría
const CATEGORIAS: Record<string, { nombre: string; descripcion: string; icono: string }> = {
  layout: { nombre: 'Estructura', descripcion: 'Header, Footer y elementos de navegación', icono: '🏗️' },
  content: { nombre: 'Contenido', descripcion: 'Hero, CTA, Features, Testimonios', icono: '📝' },
  display: { nombre: 'Listados', descripcion: 'Propiedades, Tarjetas, Detalles', icono: '🏠' },
  forms: { nombre: 'Formularios', descripcion: 'Contacto, Búsqueda, Filtros', icono: '📋' },
};

export default function CrmWebSecciones() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const [catalogo, setCatalogo] = useState<CatalogoComponente[]>([]);
  const [secciones, setSecciones] = useState<SeccionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Secciones Globales',
      subtitle: 'Configura los componentes globales que se comparten en todas las páginas de tu sitio web',
    });
  }, [setPageHeader]);

  // Cargar catálogo y secciones
  useEffect(() => {
    async function loadData() {
      if (!tenantActual?.id) return;

      try {
        setLoading(true);
        setError(null);

        const [catalogoData, seccionesData] = await Promise.all([
          getCatalogoComponentes(tenantActual.id),
          getSeccionesTenant(tenantActual.id),
        ]);

        setCatalogo(catalogoData);
        setSecciones(seccionesData);
      } catch (err: any) {
        console.error('Error cargando datos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tenantActual?.id]);

  // Obtener la sección configurada para un tipo de componente
  const getSeccionConfigurada = (tipo: string): SeccionConfig | undefined => {
    return secciones.find((s) => s.tipo === tipo);
  };

  // Navegar a la página de edición
  const handleEditar = (tipo: string) => {
    navigate(`/crm/${tenantSlug}/web/secciones/${tipo}`);
  };

  // Agrupar catálogo por categoría
  const catalogoPorCategoria = catalogo.reduce(
    (acc, comp) => {
      if (!acc[comp.categoria]) {
        acc[comp.categoria] = [];
      }
      acc[comp.categoria].push(comp);
      return acc;
    },
    {} as Record<string, CatalogoComponente[]>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando secciones...</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px;
            color: #64748b;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="secciones-page">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Secciones por categoría */}
      <div className="categorias-list">
        {Object.entries(CATEGORIAS).map(([key, cat]) => {
          const componentes = catalogoPorCategoria[key] || [];
          if (componentes.length === 0) return null;

          return (
            <div key={key} className="categoria-section">
              <div className="categoria-header">
                <span className="categoria-icon">{cat.icono}</span>
                <div>
                  <h2>{cat.nombre}</h2>
                  <p>{cat.descripcion}</p>
                </div>
              </div>

              <div className="componentes-grid">
                {componentes.map((comp) => {
                  const configurada = getSeccionConfigurada(comp.tipo);
                  return (
                    <div
                      key={comp.tipo}
                      className={`componente-card ${configurada ? 'configurado' : ''}`}
                      onClick={() => handleEditar(comp.tipo)}
                    >
                      <div className="card-icon">{comp.icono}</div>
                      <div className="card-content">
                        <h3>{comp.nombre}</h3>
                        <p className="card-desc">{comp.descripcion}</p>
                        {configurada ? (
                          <div className="config-info">
                            <span className="variante-tag">{configurada.variante}</span>
                            <span className="status-tag active">Configurado</span>
                          </div>
                        ) : (
                          <div className="config-info">
                            <span className="variante-tag default">default</span>
                            <span className="status-tag">Sin configurar</span>
                          </div>
                        )}
                        <div className="variantes-count">
                          {comp.variantes.length} variantes disponibles
                        </div>
                      </div>
                      <div className="card-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .secciones-page {
          width: 100%;
        }

        .error-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          color: #dc2626;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 1.25rem;
          cursor: pointer;
        }

        .categorias-list {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .categoria-section {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
        }

        .categoria-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .categoria-icon {
          font-size: 2rem;
        }

        .categoria-header h2 {
          margin: 0 0 4px 0;
          font-size: 1.25rem;
          color: #0f172a;
        }

        .categoria-header p {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        .componentes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
        }

        @media (max-width: 800px) {
          .componentes-grid {
            grid-template-columns: 1fr;
          }
        }

        .componente-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .componente-card:hover {
          border-color: #2563eb;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .componente-card.configurado {
          border-color: #bbf7d0;
          background: linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%);
        }

        .componente-card.configurado:hover {
          border-color: #22c55e;
        }

        .card-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
        }

        .card-content {
          flex: 1;
          min-width: 0;
        }

        .card-content h3 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          color: #0f172a;
        }

        .card-desc {
          margin: 0 0 12px 0;
          color: #64748b;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .config-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .variante-tag {
          padding: 4px 10px;
          background: #2563eb;
          color: white;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .variante-tag.default {
          background: #94a3b8;
        }

        .status-tag {
          padding: 4px 10px;
          background: #f1f5f9;
          color: #64748b;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .status-tag.active {
          background: #dcfce7;
          color: #16a34a;
        }

        .variantes-count {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .card-arrow {
          color: #94a3b8;
          transition: all 0.2s;
        }

        .componente-card:hover .card-arrow {
          transform: translateX(4px);
          color: #2563eb;
        }
      `}</style>
    </div>
  );
}
