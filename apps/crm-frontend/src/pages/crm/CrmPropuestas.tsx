/**
 * CrmPropuestas - Gestión de propuestas comerciales
 *
 * Módulo para crear y gestionar propuestas a clientes con:
 * - Vista de tabla como CRM de referencia
 * - Stats por estado en header
 * - Cards de conteo por estado
 * - Iconos Lucide React
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getPropuestas,
  deletePropuesta,
  Propuesta,
  PropuestaFiltros,
} from '../../services/api';
import {
  FileText,
  Plus,
  Search,
  Clock,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Trash2,
  X,
  Building2,
  Loader2,
  TrendingUp,
  Pencil,
} from 'lucide-react';

// Estados de propuesta con iconos
const ESTADOS: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  borrador: { label: 'Borrador', color: '#64748b', bgColor: '#f1f5f9', icon: Clock },
  enviada: { label: 'Enviada', color: '#2563eb', bgColor: '#dbeafe', icon: Send },
  vista: { label: 'Vista', color: '#7c3aed', bgColor: '#f3e8ff', icon: Eye },
  aceptada: { label: 'Aceptada', color: '#16a34a', bgColor: '#dcfce7', icon: CheckCircle },
  rechazada: { label: 'Rechazada', color: '#dc2626', bgColor: '#fef2f2', icon: XCircle },
  expirada: { label: 'Expirada', color: '#94a3b8', bgColor: '#f8fafc', icon: AlertCircle },
};

export default function CrmPropuestas() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Estado
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Stats calculados
  const countByStatus = Object.keys(ESTADOS).reduce((acc, status) => {
    acc[status] = propuestas.filter(p => p.estado === status).length;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = (countByStatus.borrador || 0) + (countByStatus.enviada || 0);
  const wonCount = countByStatus.aceptada || 0;
  const totalCount = propuestas.length;

  // Configurar header de la página con stats
  useEffect(() => {
    setPageHeader({
      title: 'Propuestas',
      subtitle: 'Gestiona y envía propuestas de propiedades',
      stats: [
        { label: 'Activas', value: activeCount, icon: <Clock className="w-4 h-4" /> },
        { label: 'Ganadas', value: wonCount, icon: <CheckCircle className="w-4 h-4" /> },
        { label: 'Este Mes', value: totalCount, icon: <TrendingUp className="w-4 h-4" /> },
      ],
      actions: (
        <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/propuestas/nueva`)}>
          <Plus className="w-4 h-4" />
          Nueva Propuesta
        </button>
      ),
    });
  }, [setPageHeader, activeCount, wonCount, totalCount, navigate, tenantSlug]);

  // Cargar propuestas
  const cargarPropuestas = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);

      const filtros: PropuestaFiltros = {
        busqueda: busqueda || undefined,
        estado: estadoFiltro || undefined,
      };

      const response = await getPropuestas(tenantActual.id, filtros);
      setPropuestas(response.data);
    } catch (err: any) {
      console.error('Error cargando propuestas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, busqueda, estadoFiltro]);

  useEffect(() => {
    cargarPropuestas();
  }, [cargarPropuestas]);

  // Abrir edición si viene con query params
  useEffect(() => {
    const crear = searchParams.get('crear');
    const contactoId = searchParams.get('contacto_id');

    if (crear === 'true') {
      const url = contactoId
        ? `/crm/${tenantSlug}/propuestas/nueva?contacto_id=${contactoId}`
        : `/crm/${tenantSlug}/propuestas/nueva`;
      navigate(url);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, navigate, tenantSlug]);

  // Eliminar propuesta
  const handleDelete = async (propuestaId: string) => {
    if (!tenantActual?.id) return;

    try {
      await deletePropuesta(tenantActual.id, propuestaId);
      setPropuestas(prev => prev.filter(p => p.id !== propuestaId));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error al eliminar propuesta:', err);
      setError(err.message);
    }
  };

  // Copiar URL al portapapeles
  // Generar URL pública completa
  const getUrlPublicaCompleta = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/tenant/${tenantSlug}/propuestas/${token}`;
  };

  const handleCopyUrl = async (token: string, propuestaId: string) => {
    try {
      const urlCompleta = getUrlPublicaCompleta(token);
      await navigator.clipboard.writeText(urlCompleta);
      setCopiedUrl(propuestaId);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Error al copiar URL:', err);
    }
  };

  // Formatear moneda
  const formatMoney = (value: number | null, moneda: string = 'USD') => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Nombre del contacto
  const getContactoNombre = (p: Propuesta) => {
    return [p.contacto_nombre, p.contacto_apellido].filter(Boolean).join(' ') || 'Sin contacto';
  };

  // Propuestas filtradas
  const propuestasFiltradas = propuestas.filter(p => {
    if (!busqueda) return true;
    const search = busqueda.toLowerCase();
    return (
      p.titulo.toLowerCase().includes(search) ||
      p.contacto_nombre?.toLowerCase().includes(search) ||
      p.contacto_apellido?.toLowerCase().includes(search) ||
      p.solicitud_titulo?.toLowerCase().includes(search)
    );
  });

  if (loading && propuestas.length === 0) {
    return (
      <div className="page">
        <div className="loading-container">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p>Cargando propuestas...</p>
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
          <Search className="search-icon w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar propuestas..."
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
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
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
                <Icon className="w-5 h-5" />
              </div>
              <div className="status-card-info">
                <span className="status-card-count">{count}</span>
                <span className="status-card-label">{config.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla de propuestas */}
      {propuestasFiltradas.length === 0 ? (
        <div className="empty-state">
          <FileText className="w-16 h-16 text-gray-300" />
          <h3>No hay propuestas</h3>
          <p>
            {busqueda || estadoFiltro
              ? 'No se encontraron propuestas con los filtros aplicados'
              : 'Crea tu primera propuesta para comenzar'}
          </p>
          {!busqueda && !estadoFiltro && (
            <button className="btn-primary" onClick={() => navigate(`/crm/${tenantSlug}/propuestas/nueva`)}>
              <Plus className="w-4 h-4" />
              Nueva Propuesta
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="propuestas-table">
            <thead>
              <tr>
                <th>Propuesta</th>
                <th>Cliente</th>
                <th>Solicitud</th>
                <th>Propiedades</th>
                <th>Vistas</th>
                <th>Estado</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {propuestasFiltradas.map((propuesta) => {
                const estado = ESTADOS[propuesta.estado] || ESTADOS.borrador;
                const StatusIcon = estado.icon;

                return (
                  <tr key={propuesta.id} onClick={() => navigate(`/crm/${tenantSlug}/propuestas/${propuesta.id}`)}>
                    <td>
                      <div className="propuesta-info">
                        <span className="propuesta-titulo">{propuesta.titulo}</span>
                        {propuesta.precio_propuesto && (
                          <span className="propuesta-monto">
                            {formatMoney(propuesta.precio_propuesto, propuesta.moneda)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="cliente-info">
                        <div className="cliente-avatar">
                          {propuesta.contacto_nombre?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="cliente-nombre">{getContactoNombre(propuesta)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="solicitud-text">
                        {propuesta.solicitud_titulo || '-'}
                      </span>
                    </td>
                    <td>
                      {(propuesta.propiedades_count ?? propuesta.propiedades?.length ?? 0) > 0 ? (
                        <span className="badge badge-blue">
                          <Building2 className="w-3 h-3" />
                          {propuesta.propiedades_count ?? propuesta.propiedades?.length ?? 0}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-purple">
                        <Eye className="w-3 h-3" />
                        {propuesta.veces_vista || 0}
                      </span>
                    </td>
                    <td>
                      <span
                        className="estado-badge"
                        style={{ backgroundColor: estado.bgColor, color: estado.color }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {estado.label}
                      </span>
                    </td>
                    <td>
                      <span className="fecha-text">{formatDate(propuesta.created_at)}</span>
                    </td>
                    <td>
                      <div className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="action-btn"
                          onClick={() => navigate(`/crm/${tenantSlug}/propuestas/${propuesta.id}`)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {propuesta.url_publica && (
                          <>
                            <button
                              className="action-btn"
                              onClick={() => handleCopyUrl(propuesta.url_publica!, propuesta.id)}
                              title="Copiar enlace"
                            >
                              {copiedUrl === propuesta.id ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <a
                              href={getUrlPublicaCompleta(propuesta.url_publica!)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="action-btn"
                              title="Ver propuesta pública"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </>
                        )}
                        <button
                          className="action-btn danger"
                          onClick={() => setDeleteConfirm(propuesta.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
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
              <h3>Eliminar propuesta</h3>
              <button className="modal-close-btn" onClick={() => setDeleteConfirm(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="modal-text">
              ¿Estás seguro de que deseas eliminar esta propuesta? Esta acción no se puede deshacer.
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
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1;
    min-width: 280px;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  .search-box input {
    width: 100%;
    padding: 12px 16px 12px 44px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    background: white;
    transition: all 0.2s;
  }

  .search-box input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .filter-select {
    padding: 10px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    background: white;
    cursor: pointer;
    min-width: 180px;
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    color: #dc2626;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 4px;
  }

  /* Status Stats */
  .status-stats {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .status-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .status-card:hover {
    border-color: #94a3b8;
  }

  .status-card.active {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .status-card-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-card-info {
    display: flex;
    flex-direction: column;
  }

  .status-card-count {
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1;
  }

  .status-card-label {
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 2px;
  }

  /* Table Container */
  .table-container {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .propuestas-table {
    width: 100%;
    border-collapse: collapse;
  }

  .propuestas-table th {
    text-align: left;
    padding: 14px 16px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .propuestas-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .propuestas-table tr {
    cursor: pointer;
    transition: background 0.15s;
  }

  .propuestas-table tbody tr:hover {
    background: #f8fafc;
  }

  /* Table cells */
  .propuesta-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .propuesta-titulo {
    font-weight: 500;
    color: #0f172a;
  }

  .propuesta-monto {
    font-size: 0.8rem;
    color: #059669;
    font-weight: 500;
  }

  .cliente-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .cliente-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f59e0b, #f97316);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .cliente-nombre {
    font-size: 0.9rem;
    color: #0f172a;
  }

  .solicitud-text {
    font-size: 0.85rem;
    color: #64748b;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-blue {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .badge-purple {
    background: #f3e8ff;
    color: #7c3aed;
  }

  .text-muted {
    color: #94a3b8;
  }

  .estado-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .fecha-text {
    font-size: 0.85rem;
    color: #64748b;
  }

  .actions-cell {
    display: flex;
    gap: 6px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: #f1f5f9;
    border-radius: 8px;
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

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    background: white;
    border: 1px dashed #e2e8f0;
    border-radius: 12px;
    text-align: center;
  }

  .empty-state h3 {
    margin: 16px 0 8px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .empty-state p {
    margin: 0 0 20px 0;
    color: #64748b;
    font-size: 0.9rem;
    max-width: 300px;
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
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: #0f172a;
  }

  .modal-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: #f1f5f9;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
  }

  .modal-close-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .modal-text {
    margin: 0 0 24px 0;
    color: #64748b;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn-cancel {
    padding: 10px 20px;
    background: #f1f5f9;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
  }

  .btn-danger {
    padding: 10px 20px;
    background: #dc2626;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
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

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  /* Form Modal */
  .modal-form {
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .form-row {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
  }

  .form-row .form-group {
    flex: 1;
    margin-bottom: 0;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: all 0.2s;
    background: white;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: #94a3b8;
  }

  /* Contacto Selector */
  .contacto-selector {
    position: relative;
  }

  .contacto-selector input {
    width: 100%;
    padding: 10px 14px;
    padding-right: 36px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .contacto-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
    max-height: 200px;
    overflow-y: auto;
    margin-top: 4px;
  }

  .dropdown-item {
    padding: 10px 14px;
    cursor: pointer;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .dropdown-item:hover {
    background: #f8fafc;
  }

  .dropdown-name {
    display: block;
    font-weight: 500;
    color: #0f172a;
  }

  .dropdown-email {
    display: block;
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 2px;
  }

  .dropdown-loading,
  .dropdown-empty {
    padding: 12px 14px;
    color: #64748b;
    font-size: 0.875rem;
    text-align: center;
  }

  .clear-selection {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    border: none;
    background: #e2e8f0;
    border-radius: 50%;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-selection:hover {
    background: #cbd5e1;
    color: #0f172a;
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

    .table-container {
      overflow-x: auto;
    }

    .propuestas-table {
      min-width: 800px;
    }
  }
`;
