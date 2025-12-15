/**
 * CrmSitioWeb - Gestión de páginas del sitio web
 * Refactorizado para usar nueva arquitectura (migraciones 073-077)
 * Compatible con endpoints /api/tenants/*
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch, getAllTiposPagina } from '../../services/api';
import {
  Home,
  FileText,
  Users,
  Building2,
  Video,
  MessageSquare,
  Wrench,
  Plus,
  Edit,
  Eye,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import './CrmSitioWeb.css';

// ============================================================
// TYPES
// ============================================================

interface Pagina {
  id: string;
  slug: string;
  titulo: string;
  tipo_pagina_id: string;
  tipo_codigo: string;
  tipo_nombre: string;
  total_componentes: number;
}

interface TipoPaginaEstandar {
  id: string;
  codigo: string;
  nombre: string;
  ruta_patron: string;
  nivel: number;
  visible: boolean;
  publico: boolean;
  descripcion?: string;
}

type TabView = 'estandar' | 'personalizadas';

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CrmSitioWeb() {
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tiposPaginaEstandar, setTiposPaginaEstandar] = useState<TipoPaginaEstandar[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('estandar');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPageHeader({
      title: 'Páginas del Sitio',
      subtitle: 'Gestiona el contenido de cada página de tu sitio web',
      actions: (
        <button
          onClick={() => navigate(`/crm/${tenantActual?.slug}/web/nueva-pagina`)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          Nueva Página
        </button>
      ),
    });
  }, [setPageHeader, navigate, tenantActual]);

  const cargarPaginas = useCallback(async () => {
    if (!tenantActual?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Cargar solo páginas custom desde tenant_rutas_config_custom
      const url = `/tenants/${tenantActual.id}/rutas-custom`;
      const response = await apiFetch(url);
      const data = await response.json();

      // Manejar ambos formatos: { success, data } o array directamente
      let paginasData = [];
      if (Array.isArray(data)) {
        paginasData = data;
      } else if (data.success) {
        paginasData = data.data || [];
      } else {
        setError(data.error || 'Error al cargar páginas');
        return;
      }

      // Transformar datos de tenant_rutas_config_custom a formato esperado
      const paginasTransformadas = paginasData.map((ruta: any) => ({
        id: ruta.id,
        slug: ruta.ruta_personalizada || ruta.slug,
        titulo: ruta.meta_titulo || ruta.titulo || ruta.ruta_personalizada,
        tipo_pagina_id: ruta.tipo_pagina_id,
        tipo_codigo: 'custom',
        tipo_nombre: 'Personalizada',
        total_componentes: 0, // TODO: Contar componentes si es necesario
      }));

      setPaginas(paginasTransformadas);
    } catch (err: any) {
      setError(err.message || 'Error al cargar páginas');
    } finally {
      setLoading(false);
    }
  }, [tenantActual]);

  useEffect(() => {
    if (tenantActual?.id) {
      cargarPaginas();
    }
  }, [tenantActual, cargarPaginas]);

  // Cargar tipos de página estándar
  useEffect(() => {
    async function loadTiposPaginaEstandar() {
      try {
        setLoadingTipos(true);
        const tipos = await getAllTiposPagina();
        setTiposPaginaEstandar(tipos);
      } catch (err) {
        console.error('Error cargando tipos de página estándar:', err);
      } finally {
        setLoadingTipos(false);
      }
    }
    loadTiposPaginaEstandar();
  }, []);

  const abrirEditor = (paginaId: string) => {
    navigate(`/crm/${tenantActual?.slug}/web/paginas/${paginaId}/editor`);
  };

  const getIconoPorTipo = (tipoCodigo: string) => {
    const iconMap: Record<string, JSX.Element> = {
      homepage: <Home size={20} />,
      propiedades: <Building2 size={20} />,
      asesores: <Users size={20} />,
      articulos: <FileText size={20} />,
      videos: <Video size={20} />,
      testimonios: <MessageSquare size={20} />,
      servicios: <Wrench size={20} />,
    };
    return iconMap[tipoCodigo] || <FileText size={20} />;
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };


  // Organizar tipos de página en jerarquía padre-hijo
  const tiposOrganizados = useMemo(() => {
    const grupos: Record<string, { parent: TipoPaginaEstandar; children: TipoPaginaEstandar[] }> = {};
    const standalone: TipoPaginaEstandar[] = [];

    tiposPaginaEstandar.forEach((tipo) => {
      // Detectar si es hijo buscando patrones como "_single", "_categoria", "_listado"
      const parentMatch = tipo.codigo.match(/^(.+?)_(single|categoria|listado|detalle)$/);

      if (parentMatch) {
        const parentKey = parentMatch[1];
        if (!grupos[parentKey]) {
          grupos[parentKey] = { parent: tipo, children: [] };
        }
        grupos[parentKey].children.push(tipo);
      } else {
        // Podría ser padre o standalone
        const hasChildren = tiposPaginaEstandar.some((t) =>
          t.codigo.startsWith(tipo.codigo + '_')
        );

        if (hasChildren) {
          if (!grupos[tipo.codigo]) {
            grupos[tipo.codigo] = { parent: tipo, children: [] };
          } else {
            grupos[tipo.codigo].parent = tipo;
          }
        } else {
          standalone.push(tipo);
        }
      }
    });

    return { grupos, standalone };
  }, [tiposPaginaEstandar]);

  // Agrupar páginas por tipo
  const paginasAgrupadas = paginas.reduce((acc, pagina) => {
    const tipo = pagina.tipo_codigo;
    if (!acc[tipo]) {
      acc[tipo] = {
        nombre: pagina.tipo_nombre,
        paginas: [],
      };
    }
    acc[tipo].paginas.push(pagina);
    return acc;
  }, {} as Record<string, { nombre: string; paginas: Pagina[] }>);

  if (loading) {
    return (
      <div className="sitio-web-loading">
        <Loader2 className="sitio-web-loading-icon" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="sitio-web-error">
        <p>{error}</p>
        <button onClick={cargarPaginas} className="sitio-web-error-button">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="sitio-web-container">
      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'estandar' ? 'active' : ''}`}
            onClick={() => setActiveTab('estandar')}
          >
            <span>Páginas Estándar</span>
            <span className="tab-badge">{tiposPaginaEstandar.length}</span>
          </button>
          <button
            className={`tab ${activeTab === 'personalizadas' ? 'active' : ''}`}
            onClick={() => setActiveTab('personalizadas')}
          >
            <span>Páginas Personalizadas</span>
            <span className="tab-badge tab-badge-custom">{paginas.filter(p => p.tipo_codigo === 'custom').length}</span>
          </button>
        </div>
      </div>

      {/* TAB: Páginas Estándar */}
      {activeTab === 'estandar' && (
        <div className="tab-content">
          {loadingTipos ? (
            <div className="sitio-web-loading">
              <Loader2 className="sitio-web-loading-icon" />
            </div>
          ) : tiposPaginaEstandar.length > 0 ? (
            <div className="paginas-table">
              <div className="table-header">
                <div className="col-nombre">Nombre</div>
                <div className="col-url">Ruta Patrón</div>
                <div className="col-nivel">Nivel</div>
                <div className="col-estado">Estado</div>
                <div className="col-acciones">Acciones</div>
              </div>
              <div className="table-body">
                {/* Renderizar grupos con jerarquía */}
                {Object.entries(tiposOrganizados.grupos).map(([groupKey, grupo]) => {
                  const isExpanded = expandedGroups.has(groupKey);
                  return (
                    <div key={groupKey}>
                      {/* Fila padre */}
                      <div
                        className="table-row table-row-parent"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/crm/${tenantActual?.slug}/${grupo.parent.codigo}`)}
                      >
                        <div className="col-nombre" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(groupKey);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <strong>{grupo.parent.nombre}</strong>
                        </div>
                        <div className="col-url"><code>{grupo.parent.ruta_patron || '/'}</code></div>
                        <div className="col-nivel"><span className="badge">Nivel {grupo.parent.nivel}</span></div>
                        <div className="col-estado">
                          <div className="status-badges">
                            {grupo.parent.visible && <span className="badge badge-success">Visible</span>}
                            {grupo.parent.publico && <span className="badge badge-info">Público</span>}
                            {!grupo.parent.visible && <span className="badge badge-gray">Oculto</span>}
                            {!grupo.parent.publico && <span className="badge badge-warning">Privado</span>}
                          </div>
                        </div>
                        <div className="col-acciones">
                          <button
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/crm/${tenantActual?.slug}/${grupo.parent.codigo}`);
                            }}
                            title="Editar página"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Filas hijas (colapsables) */}
                      {isExpanded && grupo.children.map((hijo) => (
                        <div
                          key={hijo.id || hijo.codigo}
                          className="table-row table-row-child"
                          style={{ paddingLeft: '40px', cursor: 'pointer' }}
                          onClick={() => navigate(`/crm/${tenantActual?.slug}/${hijo.codigo}`)}
                        >
                          <div className="col-nombre" style={{ paddingLeft: '32px' }}>
                            <strong>{hijo.nombre}</strong>
                          </div>
                          <div className="col-url"><code>{hijo.ruta_patron || '/'}</code></div>
                          <div className="col-nivel"><span className="badge">Nivel {hijo.nivel}</span></div>
                          <div className="col-estado">
                            <div className="status-badges">
                              {hijo.visible && <span className="badge badge-success">Visible</span>}
                              {hijo.publico && <span className="badge badge-info">Público</span>}
                              {!hijo.visible && <span className="badge badge-gray">Oculto</span>}
                              {!hijo.publico && <span className="badge badge-warning">Privado</span>}
                            </div>
                          </div>
                          <div className="col-acciones">
                            <button
                              className="btn-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/crm/${tenantActual?.slug}/${hijo.codigo}`);
                              }}
                              title="Editar página"
                            >
                              <Edit size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Renderizar tipos standalone (sin hijos) */}
                {tiposOrganizados.standalone.map((tipo) => (
                  <div
                    key={tipo.id || tipo.codigo}
                    className="table-row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/crm/${tenantActual?.slug}/${tipo.codigo}`)}
                  >
                    <div className="col-nombre"><strong>{tipo.nombre}</strong></div>
                    <div className="col-url"><code>{tipo.ruta_patron || '/'}</code></div>
                    <div className="col-nivel"><span className="badge">Nivel {tipo.nivel}</span></div>
                    <div className="col-estado">
                      <div className="status-badges">
                        {tipo.visible && <span className="badge badge-success">Visible</span>}
                        {tipo.publico && <span className="badge badge-info">Público</span>}
                        {!tipo.visible && <span className="badge badge-gray">Oculto</span>}
                        {!tipo.publico && <span className="badge badge-warning">Privado</span>}
                      </div>
                    </div>
                    <div className="col-acciones">
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/crm/${tenantActual?.slug}/${tipo.codigo}`);
                        }}
                        title="Editar página"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="sitio-web-empty">
              <div className="sitio-web-empty-icon">
                <FileText size={48} />
              </div>
              <h3>No hay tipos de página disponibles</h3>
            </div>
          )}
        </div>
      )}

      {/* TAB: Páginas Personalizadas */}
      {activeTab === 'personalizadas' && (
        <div className="tab-content">
          {paginas.length > 0 ? (
            <div className="sitio-web-grupos">
              {Object.entries(paginasAgrupadas).map(([tipoCodigo, grupo]) => (
                <div key={tipoCodigo} className="sitio-web-grupo">
                  {/* Header del grupo */}
                  <div className="sitio-web-grupo-header">
                    <div className="sitio-web-grupo-header-icon">
                      {getIconoPorTipo(tipoCodigo)}
                    </div>
                    <div className="sitio-web-grupo-header-info">
                      <h3>{grupo.nombre}</h3>
                      <p>
                        {grupo.paginas.length} página{grupo.paginas.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Páginas del grupo */}
                  <div className="sitio-web-grupo-paginas">
                    {grupo.paginas.map((pagina) => (
                      <div key={pagina.id} className="sitio-web-pagina">
                        <div className="sitio-web-pagina-info">
                          <div className="sitio-web-pagina-titulo-row">
                            <h4 className="sitio-web-pagina-titulo">{pagina.titulo}</h4>
                            {pagina.tipo_codigo === 'custom' && (
                              <span className="sitio-web-pagina-badge">Personalizada</span>
                            )}
                          </div>
                          <div className="sitio-web-pagina-meta">
                            <span>/{pagina.slug}</span>
                            <span>•</span>
                            <span>{pagina.total_componentes} componentes</span>
                          </div>
                        </div>

                        <div className="sitio-web-pagina-actions">
                          <button
                            onClick={() => window.open(`/${pagina.slug}`, '_blank')}
                            className="sitio-web-icon-button"
                            title="Ver página"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => abrirEditor(pagina.id)}
                            className="sitio-web-edit-button"
                          >
                            <Edit size={16} />
                            Editar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sitio-web-empty">
              <div className="sitio-web-empty-icon">
                <FileText size={48} />
              </div>
              <h3>No hay páginas disponibles</h3>
              <p>Crea tu primera página personalizada para comenzar</p>
              <button
                onClick={() => navigate('/crm/sitio-web/nueva-pagina')}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={16} />
                Nueva Página
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
