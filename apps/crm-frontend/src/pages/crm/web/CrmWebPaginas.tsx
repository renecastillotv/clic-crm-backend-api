/**
 * CrmWebPaginas - Gestión de páginas web del tenant
 *
 * Sistema de tabs para separar:
 * - Páginas Estándar: Todas las páginas definidas en tipos_pagina (sistema)
 * - Páginas Personalizadas: Páginas custom creadas por el usuario
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageHeader } from '../../../layouts/CrmLayout';
import { getPaginas } from '../../../services/api';
import { PaginaWeb } from '../../../types/paginas';

// Interfaz extendida para incluir cantidadComponentes del endpoint
interface PaginaWebExtendida extends PaginaWeb {
  cantidadComponentes?: number;
}

export default function CrmWebPaginas() {
  const { tenantActual } = useAuth();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();

  const [paginas, setPaginas] = useState<PaginaWebExtendida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: 'Páginas Web',
      subtitle: 'Gestiona los componentes de cada tipo de página del sistema',
    });
  }, [setPageHeader]);

  // Cargar páginas
  useEffect(() => {
    if (!tenantActual?.id) return;

    async function loadPaginas() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPaginas(tenantActual!.id);
        setPaginas(data);
      } catch (err: any) {
        console.error('Error cargando páginas:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPaginas();
  }, [tenantActual?.id]);

  // Organizar páginas (tipos_pagina) por jerarquía usando los datos del endpoint /paginas
  const paginasJerarquicas = useMemo(() => {
    if (!paginas.length) return [];

    // Crear un mapa de códigos a páginas
    const mapaCodeToPagina: Record<string, any> = {};
    paginas.forEach(pagina => {
      mapaCodeToPagina[pagina.tipoPagina] = {
        ...pagina,
        hijos: []
      };
    });

    // Construir jerarquía
    const raices: any[] = [];

    paginas.forEach(pagina => {
      const paginaConHijos = mapaCodeToPagina[pagina.tipoPagina];

      if (pagina.orden === 0) {
        raices.push(paginaConHijos);
      } else {
        // Buscar padre basándose en el patrón de código
        // Por ejemplo: "videos-categoria" tiene padre "videos"
        const codigoPadre = pagina.tipoPagina.split('-')[0];
        const padre = mapaCodeToPagina[codigoPadre];
        if (padre && padre.tipoPagina !== pagina.tipoPagina) {
          padre.hijos.push(paginaConHijos);
        } else {
          // Si no tiene padre, es raíz
          raices.push(paginaConHijos);
        }
      }
    });

    return raices;
  }, [paginas]);

  const toggleGroup = (paginaId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(paginaId)) {
        next.delete(paginaId);
      } else {
        next.add(paginaId);
      }
      return next;
    });
  };

  // Renderizar fila de página (tipos_pagina del sistema)
  const renderPaginaTipoRow = (pagina: any, nivel: number = 0) => {
    const tieneHijos = pagina.hijos && pagina.hijos.length > 0;
    const isExpanded = expandedGroups.has(pagina.tipoPagina);
    const cantidadComponentes = pagina.cantidadComponentes || 0;

    return (
      <div key={pagina.id} className="pagina-group">
        <div
          className={`pagina-row tipo-row nivel-${nivel} ${tieneHijos ? 'tiene-hijos' : ''}`}
          onClick={() => tieneHijos ? toggleGroup(pagina.tipoPagina) : navigate(`/crm/${tenantActual?.slug}/web/paginas/${pagina.id}`)}
        >
          <div className="col-expand">
            {tieneHijos && (
              <button
                className={`btn-expand ${isExpanded ? 'expanded' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroup(pagina.tipoPagina);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )}
          </div>

          <div className="col-nombre">
            <div className="pagina-nombre-group">
              <span className="pagina-nombre">{pagina.titulo}</span>
              <span className="pagina-tipo">{pagina.tipoPagina}</span>
            </div>
          </div>

          <div className="col-url">
            <span className="pagina-url">
              {pagina.slug || '/'}
            </span>
          </div>

          <div className="col-componentes">
            <span className={`badge ${cantidadComponentes > 0 ? 'badge-success' : 'badge-gray'}`}>
              {cantidadComponentes} componente{cantidadComponentes !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="col-estado">
            <div className="status-badges">
              {pagina.activa && (
                <span className="badge badge-success">Visible</span>
              )}
              {pagina.publica && (
                <span className="badge badge-info">Público</span>
              )}
              {!pagina.activa && (
                <span className="badge badge-gray">Oculto</span>
              )}
              {!pagina.publica && (
                <span className="badge badge-warning">Privado</span>
              )}
            </div>
          </div>

          <div className="col-acciones">
            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/crm/${tenantActual?.slug}/web/paginas/${pagina.id}`);
              }}
              title="Editar componentes"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </div>

        {tieneHijos && isExpanded && (
          <div className="pagina-hijos">
            {pagina.hijos.map((hijo: any) => renderPaginaTipoRow(hijo, nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"/>
        <p>Cargando páginas...</p>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="paginas-container">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Contenido - Lista de tipos de página del sistema */}
      <div className="tab-content">
        {paginas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <h3>No hay tipos de página registrados</h3>
            <p>Los tipos de página del sistema aparecerán aquí</p>
          </div>
        ) : (
          <div className="paginas-table">
            <div className="table-header">
              <div className="col-expand"/>
              <div className="col-nombre">Nombre</div>
              <div className="col-url">Ruta</div>
              <div className="col-componentes">Componentes</div>
              <div className="col-estado">Estado</div>
              <div className="col-acciones"/>
            </div>
            <div className="table-body">
              {paginasJerarquicas.map(pagina => renderPaginaTipoRow(pagina))}
            </div>
          </div>
        )}
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .paginas-container {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Feature Banner */
  .feature-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 24px 28px;
    border-radius: 16px;
    margin-bottom: 24px;
    color: white;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
  }

  .feature-content {
    display: flex;
    gap: 20px;
    align-items: center;
    flex: 1;
  }

  .feature-icon {
    width: 56px;
    height: 56px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
  }

  .feature-text h3 {
    margin: 0 0 6px 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .feature-text p {
    margin: 0;
    font-size: 0.9375rem;
    opacity: 0.95;
    line-height: 1.5;
  }

  .feature-stats {
    display: flex;
    gap: 24px;
    align-items: center;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
  }

  .stat-label {
    font-size: 0.75rem;
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-divider {
    width: 1px;
    height: 40px;
    background: rgba(255, 255, 255, 0.3);
  }

  /* Tabs */
  .tabs-container {
    display: flex;
    gap: 8px;
    background: white;
    padding: 6px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    margin-bottom: 20px;
  }

  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 20px;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9375rem;
    color: #64748b;
    transition: all 0.2s;
  }

  .tab:hover {
    background: #f8fafc;
    color: #0f172a;
  }

  .tab.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .tab svg {
    flex-shrink: 0;
  }

  .tab-badge {
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .tab:not(.active) .tab-badge {
    background: #e2e8f0;
    color: #64748b;
  }

  .tab-badge-custom {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
  }

  .tab:not(.active) .tab-badge-custom {
    background: #fef3c7;
    color: #d97706;
  }

  /* Tab Content */
  .tab-content {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Loading */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 20px;
  }

  .mini-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e2e8f0;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 14px 18px;
    border-radius: 10px;
    margin-bottom: 20px;
    color: #dc2626;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0 8px;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 80px 40px;
    background: white;
    border-radius: 16px;
    border: 2px dashed #e2e8f0;
  }

  .empty-state-custom {
    border-color: #fbbf24;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  }

  .empty-icon {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    border-radius: 50%;
    color: #94a3b8;
    margin: 0 auto 24px;
  }

  .empty-state-custom .empty-icon {
    background: #fef3c7;
    color: #f59e0b;
  }

  .empty-state h3 {
    margin: 0 0 12px 0;
    color: #0f172a;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .empty-state p {
    color: #64748b;
    margin: 0 0 28px 0;
    font-size: 0.9375rem;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  /* Tabla */
  .paginas-table {
    background: white;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .table-header {
    display: flex;
    align-items: center;
    background: linear-gradient(to bottom, #fafbfc, #f8fafc);
    border-bottom: 1px solid #e2e8f0;
    padding: 14px 20px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pagina-group {
    border-bottom: 1px solid #f1f5f9;
  }

  .pagina-group:last-child {
    border-bottom: none;
  }

  .pagina-row {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pagina-row:hover {
    background: linear-gradient(to right, #fafbfc, #f8fafc);
  }

  .pagina-row.nivel-1 {
    padding-left: 60px;
    background: #fafbfc;
  }

  .pagina-row.nivel-2 {
    padding-left: 100px;
    background: #f5f7f9;
  }

  .pagina-hijos {
    border-top: 1px solid #f1f5f9;
  }

  /* Columnas */
  .col-expand { width: 40px; flex-shrink: 0; }
  .col-nombre { flex: 2; min-width: 200px; }
  .col-url { flex: 1.5; min-width: 160px; }
  .col-fecha { width: 110px; flex-shrink: 0; }
  .col-nivel { width: 100px; flex-shrink: 0; }
  .col-componentes { width: 130px; flex-shrink: 0; }
  .col-estado { width: 180px; flex-shrink: 0; }
  .col-acciones { width: 60px; flex-shrink: 0; display: flex; justify-content: flex-end; }

  .btn-expand {
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    color: #64748b;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-expand:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .btn-expand.expanded {
    transform: rotate(90deg);
  }

  .pagina-nombre-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pagina-nombre {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
  }

  .pagina-tipo {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .pagina-url {
    font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace;
    font-size: 0.8125rem;
    color: #6366f1;
    background: #eef2ff;
    padding: 5px 10px;
    border-radius: 6px;
    font-weight: 500;
  }

  .pagina-fecha {
    font-size: 0.8125rem;
    color: #64748b;
  }

  .btn-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: opacity 0.15s;
  }

  .btn-toggle:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .btn-toggle.updating {
    opacity: 0.5;
  }

  .toggle-track {
    width: 40px;
    height: 22px;
    background: #cbd5e1;
    border-radius: 11px;
    position: relative;
    transition: background 0.2s;
  }

  .btn-toggle.activa .toggle-track {
    background: #22c55e;
  }

  .toggle-thumb {
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .btn-toggle.activa .toggle-thumb {
    transform: translateX(18px);
  }

  .toggle-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
  }

  .btn-toggle.activa .toggle-label {
    color: #22c55e;
  }

  /* Badges de estado */
  .status-badges {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .badge-success {
    background: #d1fae5;
    color: #065f46;
  }

  .badge-info {
    background: #dbeafe;
    color: #1e40af;
  }

  .badge-warning {
    background: #fef3c7;
    color: #92400e;
  }

  .badge-gray {
    background: #f1f5f9;
    color: #64748b;
  }

  .btn-icon {
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    color: #64748b;
    border-radius: 8px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-icon:hover {
    background: #eef2ff;
    color: #6366f1;
  }

  .table-row {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.2s;
  }

  .table-row:hover {
    background: #fafbfc;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .btn-editar {
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    color: #64748b;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .btn-editar:hover {
    background: #eef2ff;
    color: #6366f1;
  }

  /* Botones */
  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9375rem;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    color: #475569;
    border: 2px solid #e2e8f0;
    padding: 10px 22px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9375rem;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .btn-header-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9375rem;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .btn-header-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal {
    background: white;
    border-radius: 20px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .modal-large {
    max-width: 900px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 28px 32px 20px;
    border-bottom: 1px solid #e2e8f0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #0f172a;
    font-weight: 700;
  }

  .modal-subtitle {
    margin: 6px 0 0 0;
    font-size: 0.9375rem;
    color: #64748b;
  }

  .modal-close {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.75rem;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .modal-close:hover {
    color: #0f172a;
    background: #f1f5f9;
  }

  .modal-body {
    padding: 28px 32px;
  }

  .modal-footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 32px 28px;
    border-top: 1px solid #e2e8f0;
  }

  /* Formulario */
  .form-section {
    margin-bottom: 28px;
  }

  .form-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
  }

  .form-help {
    margin: 0 0 16px 0;
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.5;
  }

  .form-row {
    display: flex;
    gap: 16px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .flex-1 {
    flex: 1;
  }

  .form-input {
    width: 100%;
    padding: 12px 16px;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    color: #0f172a;
    font-size: 0.9375rem;
    transition: all 0.2s;
  }

  .form-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }

  .input-with-prefix {
    display: flex;
    align-items: center;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    transition: all 0.2s;
  }

  .input-with-prefix:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }

  .input-prefix {
    padding: 12px 0 12px 16px;
    color: #64748b;
    font-size: 0.9375rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .input-with-prefix .form-input {
    border: none;
    padding-left: 4px;
    flex: 1;
  }

  .input-with-prefix .form-input:focus {
    box-shadow: none;
  }

  /* Grid de tipos */
  .tipo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .tipo-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    position: relative;
  }

  .tipo-card:hover {
    border-color: #cbd5e1;
    background: #fafbfc;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .tipo-card.selected {
    border-color: #6366f1;
    background: #eef2ff;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
  }

  .tipo-card:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .tipo-card-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.375rem;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .tipo-card-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .tipo-card-name {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
  }

  .tipo-card-desc {
    font-size: 0.8125rem;
    color: #64748b;
    line-height: 1.4;
  }

  .tipo-card-badge {
    display: inline-block;
    margin-top: 6px;
    padding: 3px 10px;
    background: #dbeafe;
    color: #1d4ed8;
    font-size: 0.6875rem;
    font-weight: 600;
    border-radius: 10px;
  }

  .tipo-card-loading {
    position: absolute;
    top: 12px;
    right: 12px;
  }

  /* Grid de plantillas */
  .plantilla-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }

  .plantilla-card {
    display: flex;
    flex-direction: column;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 14px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .plantilla-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 8px 16px rgba(0,0,0,0.12);
    transform: translateY(-4px);
  }

  .plantilla-card.selected {
    border-color: #6366f1;
  }

  .plantilla-card.premium {
    border-color: #f59e0b;
  }

  .plantilla-preview {
    height: 140px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .plantilla-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .plantilla-blank {
    color: #cbd5e1;
  }

  .plantilla-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 700;
    color: rgba(0,0,0,0.1);
  }

  .plantilla-featured-badge, .plantilla-premium-badge {
    position: absolute;
    top: 10px;
    padding: 4px 10px;
    font-size: 0.625rem;
    font-weight: 700;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .plantilla-featured-badge {
    left: 10px;
    background: #6366f1;
    color: white;
  }

  .plantilla-premium-badge {
    right: 10px;
    background: #f59e0b;
    color: white;
  }

  .plantilla-info {
    padding: 14px;
  }

  .plantilla-name {
    display: block;
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
    margin-bottom: 4px;
  }

  .plantilla-desc {
    font-size: 0.8125rem;
    color: #64748b;
    line-height: 1.4;
  }

  .plantilla-check {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 28px;
    height: 28px;
    background: #6366f1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    z-index: 1;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
  }

  /* Resumen de selección */
  .selection-summary {
    display: flex;
    gap: 28px;
    padding: 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
    border-radius: 12px;
    margin-bottom: 28px;
    border: 1px solid #e2e8f0;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .summary-label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .summary-value {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9375rem;
  }

  .summary-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9375rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 1024px) {
    .feature-banner {
      flex-direction: column;
      gap: 20px;
    }

    .feature-stats {
      width: 100%;
      justify-content: center;
    }
  }

  @media (max-width: 768px) {
    .tipo-grid {
      grid-template-columns: 1fr;
    }

    .plantilla-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .form-row {
      flex-direction: column;
    }

    .selection-summary {
      flex-direction: column;
      gap: 16px;
    }

    .tabs-container {
      flex-direction: column;
    }

    .tab {
      justify-content: flex-start;
    }
  }
`;
