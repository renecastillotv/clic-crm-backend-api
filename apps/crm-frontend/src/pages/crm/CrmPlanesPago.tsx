/**
 * CrmPlanesPago - Gestión de planes de pago
 *
 * Módulo para crear y gestionar planes de pago a clientes con:
 * - Vista de grid de tarjetas y lista (toggle)
 * - Stats por estado en header
 * - Cards de conteo por estado
 * - Iconos Lucide React
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getPlanesPago,
  deletePlanPago,
  getTenantConfiguracion,
  PlanPago,
  PlanPagoFiltros,
} from '../../services/api';
import {
  Calculator,
  Plus,
  Search,
  Clock,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Trash2,
  X,
  Building2,
  Loader2,
  TrendingUp,
  Pencil,
  Calendar,
  LayoutGrid,
  List,
} from 'lucide-react';

// Estados de plan de pago con iconos
const ESTADOS: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  borrador: { label: 'Borrador', color: '#64748b', bgColor: '#f1f5f9', icon: Clock },
  enviado: { label: 'Enviado', color: '#2563eb', bgColor: '#dbeafe', icon: Send },
  visto: { label: 'Visto', color: '#7c3aed', bgColor: '#f3e8ff', icon: Eye },
  aceptado: { label: 'Aceptado', color: '#16a34a', bgColor: '#dcfce7', icon: CheckCircle },
  rechazado: { label: 'Rechazado', color: '#dc2626', bgColor: '#fef2f2', icon: XCircle },
};

export default function CrmPlanesPago() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Estado
  const [planes, setPlanes] = useState<PlanPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [dominioPersonalizado, setDominioPersonalizado] = useState<string | null>(null);
  const [vista, setVista] = useState<'grid' | 'list'>('grid');

  // Stats calculados
  const countByStatus = Object.keys(ESTADOS).reduce((acc, status) => {
    acc[status] = planes.filter(p => p.estado === status).length;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = (countByStatus.borrador || 0) + (countByStatus.enviado || 0);
  const wonCount = countByStatus.aceptado || 0;
  const totalCount = planes.length;

  // Configurar header de la página con stats
  useEffect(() => {
    setPageHeader({
      title: 'Planes de Pago',
      subtitle: 'Gestiona y envía planes de pago a clientes',
      stats: [
        { label: 'Activos', value: activeCount, icon: <Clock className="w-4 h-4" /> },
        { label: 'Aceptados', value: wonCount, icon: <CheckCircle className="w-4 h-4" /> },
        { label: 'Total', value: totalCount, icon: <TrendingUp className="w-4 h-4" /> },
      ],
      actions: (
        <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/planes-pago/nuevo`)}>
          <Plus className="w-4 h-4" />
          Nuevo Plan
        </button>
      ),
    });
  }, [setPageHeader, activeCount, wonCount, totalCount, navigate, tenantSlug]);

  // Cargar planes de pago
  const cargarPlanes = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);

      const filtros: PlanPagoFiltros = {
        busqueda: busqueda || undefined,
        estado: estadoFiltro || undefined,
      };

      const response = await getPlanesPago(tenantActual.id, filtros);
      setPlanes(response.data);
    } catch (err: any) {
      console.error('Error cargando planes de pago:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, busqueda, estadoFiltro]);

  useEffect(() => {
    cargarPlanes();
  }, [cargarPlanes]);

  // Cargar dominio personalizado del tenant
  useEffect(() => {
    const loadTenantConfig = async () => {
      if (!tenantActual?.id) return;
      try {
        const config = await getTenantConfiguracion(tenantActual.id);
        setDominioPersonalizado(config.dominio_personalizado);
      } catch (err) {
        console.error('Error cargando configuración del tenant:', err);
      }
    };
    loadTenantConfig();
  }, [tenantActual?.id]);

  // Abrir edición si viene con query params
  useEffect(() => {
    const crear = searchParams.get('crear');
    const contactoId = searchParams.get('contacto_id');
    const propiedadId = searchParams.get('propiedad_id');

    if (crear === 'true') {
      let url = `/crm/${tenantSlug}/planes-pago/nuevo`;
      const params = new URLSearchParams();
      if (contactoId) params.append('contacto_id', contactoId);
      if (propiedadId) params.append('propiedad_id', propiedadId);
      if (params.toString()) url += `?${params.toString()}`;
      navigate(url);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, navigate, tenantSlug]);

  // Eliminar plan
  const handleDelete = async (planId: string) => {
    if (!tenantActual?.id) return;

    try {
      await deletePlanPago(tenantActual.id, planId);
      setPlanes(prev => prev.filter(p => p.id !== planId));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error al eliminar plan de pago:', err);
      setError(err.message);
    }
  };

  // Generar URL pública completa usando el dominio personalizado si existe
  const getUrlPublicaCompleta = (token: string) => {
    if (dominioPersonalizado) {
      return `https://${dominioPersonalizado}/plan-pago/${token}`;
    }
    return `https://${tenantSlug}.clic.casa/plan-pago/${token}`;
  };

  const handleCopyUrl = async (token: string, planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const urlCompleta = getUrlPublicaCompleta(token);
      await navigator.clipboard.writeText(urlCompleta);
      setCopiedUrl(planId);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Error al copiar URL:', err);
    }
  };

  // Formatear moneda
  const formatMoney = (value: number | null | undefined, moneda: string = 'USD') => {
    if (!value) return null;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Formatear fecha corta
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Formatear fecha completa
  const formatDateFull = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Nombre del contacto
  const getContactoNombre = (p: PlanPago) => {
    if (p.contacto?.nombre || p.contacto?.apellido) {
      return [p.contacto.nombre, p.contacto.apellido].filter(Boolean).join(' ');
    }
    return null;
  };

  // Iniciales del contacto
  const getContactoIniciales = (p: PlanPago) => {
    const nombre = p.contacto?.nombre?.[0] || '';
    const apellido = p.contacto?.apellido?.[0] || '';
    return (nombre + apellido).toUpperCase() || '?';
  };

  // Nombre de la propiedad
  const getPropiedadNombre = (p: PlanPago) => {
    if (p.unidad?.nombre) {
      return `${p.propiedad?.titulo || 'Proyecto'} - ${p.unidad.nombre}`;
    }
    return p.propiedad?.titulo || null;
  };

  // Planes filtrados
  const planesFiltrados = planes.filter(p => {
    if (!busqueda) return true;
    const search = busqueda.toLowerCase();
    const contactoNombre = getContactoNombre(p) || '';
    const propiedadNombre = getPropiedadNombre(p) || '';
    return (
      p.titulo.toLowerCase().includes(search) ||
      contactoNombre.toLowerCase().includes(search) ||
      propiedadNombre.toLowerCase().includes(search)
    );
  });

  if (loading && planes.length === 0) {
    return (
      <div className="page">
        <div className="loading-container">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p>Cargando planes de pago...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Buscar planes..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        {/* Toggle vista */}
        <div className="view-toggle">
          <button
            className={`toggle-btn ${vista === 'grid' ? 'active' : ''}`}
            onClick={() => setVista('grid')}
            title="Vista de tarjetas"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`toggle-btn ${vista === 'list' ? 'active' : ''}`}
            onClick={() => setVista('list')}
            title="Vista de lista"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats por estado */}
      <div className="status-stats">
        {Object.entries(ESTADOS).map(([status, config]) => {
          const count = countByStatus[status] || 0;
          const Icon = config.icon;
          return (
            <div
              key={status}
              className={`status-card ${estadoFiltro === status ? 'active' : ''}`}
              onClick={() => setEstadoFiltro(estadoFiltro === status ? '' : status)}
            >
              <div className="status-card-icon" style={{ backgroundColor: config.bgColor, color: config.color }}>
                <Icon size={16} />
              </div>
              <div className="status-card-info">
                <span className="status-card-count">{count}</span>
                <span className="status-card-label">{config.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contenido según vista */}
      {planesFiltrados.length === 0 ? (
        <div className="empty-state">
          <Calculator size={48} />
          <h3>No hay planes de pago</h3>
          <p>
            {busqueda || estadoFiltro
              ? 'No se encontraron planes con los filtros aplicados'
              : 'Crea tu primer plan de pago para comenzar'}
          </p>
          {!busqueda && !estadoFiltro && (
            <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/planes-pago/nuevo`)}>
              <Plus size={16} />
              Nuevo Plan
            </button>
          )}
        </div>
      ) : vista === 'grid' ? (
        /* Vista Grid */
        <div className="planes-grid">
          {planesFiltrados.map((plan) => {
            const estado = ESTADOS[plan.estado] || ESTADOS.borrador;
            const StatusIcon = estado.icon;
            const precio = formatMoney(plan.precio_total, plan.moneda);
            const contactoNombre = getContactoNombre(plan);
            const propiedadNombre = getPropiedadNombre(plan);

            return (
              <div
                key={plan.id}
                className="plan-card"
                onClick={() => navigate(`/crm/${tenantSlug}/planes-pago/${plan.id}`)}
              >
                {/* Header con estado */}
                <div className="card-header">
                  <span
                    className="estado-badge"
                    style={{ backgroundColor: estado.bgColor, color: estado.color }}
                  >
                    <StatusIcon size={10} />
                    {estado.label}
                  </span>
                  {plan.veces_vista > 0 && (
                    <span className="vistas-badge">
                      <Eye size={10} />
                      {plan.veces_vista}
                    </span>
                  )}
                </div>

                {/* Título y precio */}
                <div className="card-title-row">
                  <h3 className="card-title">{plan.titulo}</h3>
                  {precio && <span className="card-price">{precio}</span>}
                </div>

                {/* Propiedad */}
                {propiedadNombre && (
                  <div className="card-propiedad">
                    <Building2 size={12} />
                    <span>{propiedadNombre}</span>
                  </div>
                )}

                {/* Cliente */}
                <div className="card-cliente">
                  <div className={`cliente-avatar ${!contactoNombre ? 'no-contact' : ''}`}>
                    {getContactoIniciales(plan)}
                  </div>
                  <span className={`cliente-nombre ${!contactoNombre ? 'no-contact' : ''}`}>
                    {contactoNombre || 'Sin contacto'}
                  </span>
                </div>

                {/* Info row: fecha */}
                <div className="card-info-row">
                  <div className="info-item">
                    <Calendar size={11} />
                    <span>{formatDate(plan.created_at)}</span>
                  </div>
                  {plan.fecha_expiracion && (
                    <div className="info-item">
                      <Clock size={11} />
                      <span>Exp: {formatDate(plan.fecha_expiracion)}</span>
                    </div>
                  )}
                </div>

                {/* Footer con acciones */}
                <div className="card-footer" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="action-btn"
                    onClick={() => navigate(`/crm/${tenantSlug}/planes-pago/${plan.id}`)}
                    title="Editar"
                  >
                    <Pencil size={12} />
                  </button>
                  {plan.url_publica && (
                    <>
                      <button
                        className="action-btn"
                        onClick={(e) => handleCopyUrl(plan.url_publica!, plan.id, e)}
                        title="Copiar enlace"
                      >
                        {copiedUrl === plan.id ? (
                          <CheckCircle size={12} className="text-green" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      <a
                        href={getUrlPublicaCompleta(plan.url_publica!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-btn"
                        title="Ver plan público"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={12} />
                      </a>
                    </>
                  )}
                  <button
                    className="action-btn danger"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(plan.id); }}
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista Lista */
        <div className="table-container">
          <table className="planes-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Propiedad</th>
                <th>Cliente</th>
                <th>Precio</th>
                <th>Vistas</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planesFiltrados.map((plan) => {
                const estado = ESTADOS[plan.estado] || ESTADOS.borrador;
                const StatusIcon = estado.icon;
                const contactoNombre = getContactoNombre(plan);
                const propiedadNombre = getPropiedadNombre(plan);

                return (
                  <tr key={plan.id} onClick={() => navigate(`/crm/${tenantSlug}/planes-pago/${plan.id}`)}>
                    <td>
                      <div className="plan-info">
                        <span className="plan-titulo">{plan.titulo}</span>
                      </div>
                    </td>
                    <td>
                      {propiedadNombre ? (
                        <div className="propiedad-info">
                          <Building2 size={12} />
                          <span>{propiedadNombre}</span>
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="cliente-info">
                        <div className={`cliente-avatar ${!contactoNombre ? 'no-contact' : ''}`}>
                          {getContactoIniciales(plan)}
                        </div>
                        <span className={`cliente-nombre ${!contactoNombre ? 'no-contact' : ''}`}>
                          {contactoNombre || 'Sin contacto'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {plan.precio_total ? (
                        <span className="precio-text">
                          {formatMoney(plan.precio_total, plan.moneda)}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-purple">
                        <Eye size={11} />
                        {plan.veces_vista || 0}
                      </span>
                    </td>
                    <td>
                      <span
                        className="estado-badge"
                        style={{ backgroundColor: estado.bgColor, color: estado.color }}
                      >
                        <StatusIcon size={10} />
                        {estado.label}
                      </span>
                    </td>
                    <td>
                      <span className="fecha-text">{formatDateFull(plan.created_at)}</span>
                    </td>
                    <td>
                      <div className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="action-btn"
                          onClick={() => navigate(`/crm/${tenantSlug}/planes-pago/${plan.id}`)}
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        {plan.url_publica && (
                          <>
                            <button
                              className="action-btn"
                              onClick={(e) => handleCopyUrl(plan.url_publica!, plan.id, e)}
                              title="Copiar enlace"
                            >
                              {copiedUrl === plan.id ? (
                                <CheckCircle size={12} className="text-green" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                            <a
                              href={getUrlPublicaCompleta(plan.url_publica!)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="action-btn"
                              title="Ver plan público"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={12} />
                            </a>
                          </>
                        )}
                        <button
                          className="action-btn danger"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(plan.id); }}
                          title="Eliminar"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Eliminar plan de pago</h3>
              <button className="modal-close-btn" onClick={() => setDeleteConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal-text">
              ¿Estás seguro de que deseas eliminar este plan de pago? Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    width: 100%;
  }

  /* Loading */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #64748b;
    gap: 16px;
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    align-items: center;
  }

  .search-box {
    flex: 1;
    min-width: 240px;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  .search-box input {
    width: 100%;
    padding: 10px 14px 10px 38px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.85rem;
    background: white;
    transition: all 0.2s;
  }

  .search-box input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  .filter-select {
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.85rem;
    background: white;
    cursor: pointer;
    min-width: 160px;
  }

  /* View Toggle */
  .view-toggle {
    display: flex;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border: none;
    background: white;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .toggle-btn:first-child {
    border-right: 1px solid #e2e8f0;
  }

  .toggle-btn:hover {
    background: #f8fafc;
    color: #0f172a;
  }

  .toggle-btn.active {
    background: #2563eb;
    color: white;
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 16px;
    color: #dc2626;
    font-size: 0.85rem;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 4px;
    display: flex;
  }

  /* Status Stats */
  .status-stats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }

  .status-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .status-card:hover {
    border-color: #94a3b8;
  }

  .status-card.active {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  }

  .status-card-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .status-card-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .status-card-count {
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1;
  }

  .status-card-label {
    font-size: 0.65rem;
    color: #64748b;
    margin-top: 2px;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  /* Grid de planes */
  .planes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  /* Card de plan */
  .plan-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .plan-card:hover {
    border-color: #94a3b8;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .estado-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .vistas-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
    background: #f3e8ff;
    color: #7c3aed;
  }

  .card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  .card-title {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.3;
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-price {
    font-size: 0.8rem;
    font-weight: 600;
    color: #059669;
    white-space: nowrap;
  }

  .card-propiedad {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: #64748b;
  }

  .card-propiedad span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-cliente {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cliente-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f59e0b, #f97316);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .cliente-avatar.no-contact {
    background: #e2e8f0;
    color: #94a3b8;
  }

  .cliente-nombre {
    font-size: 0.8rem;
    color: #374151;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cliente-nombre.no-contact {
    color: #94a3b8;
    font-style: italic;
  }

  .card-info-row {
    display: flex;
    gap: 12px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.7rem;
    color: #64748b;
  }

  .card-footer {
    display: flex;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid #f1f5f9;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    background: #f1f5f9;
    border-radius: 5px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
    text-decoration: none;
  }

  .action-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .action-btn.danger:hover {
    background: #fef2f2;
    color: #dc2626;
  }

  .text-green {
    color: #16a34a;
  }

  /* Table View */
  .table-container {
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .planes-table {
    width: 100%;
    border-collapse: collapse;
  }

  .planes-table th {
    text-align: left;
    padding: 10px 14px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .planes-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .planes-table tr {
    cursor: pointer;
    transition: background 0.15s;
  }

  .planes-table tbody tr:hover {
    background: #f8fafc;
  }

  .plan-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .plan-titulo {
    font-weight: 500;
    color: #0f172a;
    font-size: 0.85rem;
  }

  .propiedad-info {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 0.8rem;
  }

  .cliente-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .precio-text {
    font-size: 0.8rem;
    font-weight: 600;
    color: #059669;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px;
    border-radius: 5px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .badge-purple {
    background: #f3e8ff;
    color: #7c3aed;
  }

  .text-muted {
    color: #94a3b8;
    font-size: 0.8rem;
  }

  .fecha-text {
    font-size: 0.8rem;
    color: #64748b;
    white-space: nowrap;
  }

  .actions-cell {
    display: flex;
    gap: 4px;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    background: white;
    border: 1px dashed #e2e8f0;
    border-radius: 10px;
    text-align: center;
    color: #cbd5e1;
  }

  .empty-state h3 {
    margin: 12px 0 6px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .empty-state p {
    margin: 0 0 16px 0;
    color: #64748b;
    font-size: 0.85rem;
    max-width: 280px;
  }

  /* Modal */
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
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    padding: 20px;
    max-width: 380px;
    width: 90%;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #0f172a;
  }

  .modal-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: #f1f5f9;
    border-radius: 6px;
    color: #64748b;
    cursor: pointer;
  }

  .modal-close-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .modal-text {
    margin: 0 0 20px 0;
    color: #64748b;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .btn-cancel {
    padding: 8px 16px;
    background: #f1f5f9;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
  }

  .btn-danger {
    padding: 8px 16px;
    background: #dc2626;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }

  /* Primary button */
  .btn-primary {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  @media (max-width: 1200px) {
    .status-stats {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 768px) {
    .status-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .planes-grid {
      grid-template-columns: 1fr;
    }

    .table-container {
      overflow-x: auto;
    }

    .planes-table {
      min-width: 800px;
    }
  }
`;
