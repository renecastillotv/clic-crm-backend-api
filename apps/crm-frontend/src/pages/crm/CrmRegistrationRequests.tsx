/**
 * CrmRegistrationRequests - Página para gestionar solicitudes de registro
 *
 * Muestra todas las solicitudes de registro del tenant con filtros por estado y tipo.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Eye, Check, X, Trash2, User, Mail, Phone, Calendar, FileText, Filter } from 'lucide-react';
import { usePageHeader } from '../../contexts/PageHeaderContext';
import Modal from '../../components/Modal';
import './CrmRegistrationRequests.css';

interface RegistrationRequest {
  id: string;
  tenant_id: string;
  tipo_solicitud: string;
  estado: 'pendiente' | 'visto' | 'aprobado' | 'rechazado';
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  datos_formulario: Record<string, any>;
  accion_tomada?: string;
  notas_admin?: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  counts: Record<string, number>;
  total: number;
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  visto: 'Visto',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'status-pending',
  visto: 'status-viewed',
  aprobado: 'status-approved',
  rechazado: 'status-rejected',
};

const TIPO_LABELS: Record<string, string> = {
  usuario: 'Usuario',
  asesor: 'Asesor',
  independiente: 'Independiente',
  propietario: 'Propietario',
};

export default function CrmRegistrationRequests() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { getToken } = useAuth();
  const { setPageHeader } = usePageHeader();

  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterTipo, setFilterTipo] = useState<string>('');

  // Modal de detalle
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Modal de acción
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject';
    request: RegistrationRequest;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionType, setActionType] = useState('crear_usuario');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setPageHeader({
      title: 'Solicitudes de Registro',
      subtitle: 'Gestiona las solicitudes de acceso al sistema',
    });
  }, [setPageHeader]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      // Construir query params
      const params = new URLSearchParams();
      if (filterEstado) params.append('estado', filterEstado);
      if (filterTipo) params.append('tipo_solicitud', filterTipo);

      const response = await fetch(
        `${apiUrl}/tenants/${tenantSlug}/registration-requests?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar solicitudes');

      const data = await response.json();
      setRequests(data.requests);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(
        `${apiUrl}/tenants/${tenantSlug}/registration-requests/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar estadísticas');

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [tenantSlug, filterEstado, filterTipo]);

  const handleApprove = async () => {
    if (!actionModal) return;

    try {
      setProcessing(true);
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(
        `${apiUrl}/tenants/${tenantSlug}/registration-requests/${actionModal.request.id}/approve`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accion_tomada: actionType,
            notas_admin: actionNotes,
          }),
        }
      );

      if (!response.ok) throw new Error('Error al aprobar solicitud');

      setActionModal(null);
      setActionNotes('');
      fetchRequests();
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!actionModal) return;

    try {
      setProcessing(true);
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(
        `${apiUrl}/tenants/${tenantSlug}/registration-requests/${actionModal.request.id}/reject`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notas_admin: actionNotes,
          }),
        }
      );

      if (!response.ok) throw new Error('Error al rechazar solicitud');

      setActionModal(null);
      setActionNotes('');
      fetchRequests();
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (request: RegistrationRequest) => {
    if (!confirm('¿Estás seguro de eliminar esta solicitud?')) return;

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(
        `${apiUrl}/tenants/${tenantSlug}/registration-requests/${request.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al eliminar solicitud');

      fetchRequests();
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && requests.length === 0) {
    return (
      <div className="registration-requests-loading">
        <div className="spinner"></div>
        <p>Cargando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="registration-requests-page">
      {/* Stats Cards */}
      {stats && (
        <div className="stats-cards">
          <div
            className={`stat-card ${filterEstado === '' ? 'active' : ''}`}
            onClick={() => setFilterEstado('')}
          >
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div
            className={`stat-card pending ${filterEstado === 'pendiente' ? 'active' : ''}`}
            onClick={() => setFilterEstado('pendiente')}
          >
            <div className="stat-value">{stats.counts.pendiente || 0}</div>
            <div className="stat-label">Pendientes</div>
          </div>
          <div
            className={`stat-card viewed ${filterEstado === 'visto' ? 'active' : ''}`}
            onClick={() => setFilterEstado('visto')}
          >
            <div className="stat-value">{stats.counts.visto || 0}</div>
            <div className="stat-label">Vistos</div>
          </div>
          <div
            className={`stat-card approved ${filterEstado === 'aprobado' ? 'active' : ''}`}
            onClick={() => setFilterEstado('aprobado')}
          >
            <div className="stat-value">{stats.counts.aprobado || 0}</div>
            <div className="stat-label">Aprobados</div>
          </div>
          <div
            className={`stat-card rejected ${filterEstado === 'rechazado' ? 'active' : ''}`}
            onClick={() => setFilterEstado('rechazado')}
          >
            <div className="stat-value">{stats.counts.rechazado || 0}</div>
            <div className="stat-label">Rechazados</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <Filter size={16} />
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="usuario">Usuario</option>
            <option value="asesor">Asesor</option>
            <option value="independiente">Independiente</option>
            <option value="propietario">Propietario</option>
          </select>
        </div>
        {(filterEstado || filterTipo) && (
          <button
            className="clear-filters"
            onClick={() => {
              setFilterEstado('');
              setFilterTipo('');
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Requests List */}
      {error ? (
        <div className="error-message">{error}</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No hay solicitudes</h3>
          <p>No se encontraron solicitudes con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <div className="request-info">
                  <h3 className="request-name">
                    <User size={16} />
                    {request.nombre} {request.apellido}
                  </h3>
                  <div className="request-meta">
                    <span className="request-email">
                      <Mail size={14} />
                      {request.email}
                    </span>
                    {request.telefono && (
                      <span className="request-phone">
                        <Phone size={14} />
                        {request.telefono}
                      </span>
                    )}
                  </div>
                </div>
                <div className="request-badges">
                  <span className={`badge badge-tipo`}>
                    {TIPO_LABELS[request.tipo_solicitud] || request.tipo_solicitud}
                  </span>
                  <span className={`badge ${ESTADO_COLORS[request.estado]}`}>
                    {ESTADO_LABELS[request.estado]}
                  </span>
                </div>
              </div>

              <div className="request-date">
                <Calendar size={14} />
                {formatDate(request.created_at)}
              </div>

              {request.datos_formulario && Object.keys(request.datos_formulario).length > 0 && (
                <div className="request-extra">
                  {request.datos_formulario.motivacion && (
                    <p className="motivacion">"{request.datos_formulario.motivacion}"</p>
                  )}
                </div>
              )}

              <div className="request-actions">
                <button
                  className="btn-icon"
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowDetailModal(true);
                  }}
                  title="Ver detalles"
                >
                  <Eye size={16} />
                </button>
                {request.estado === 'pendiente' || request.estado === 'visto' ? (
                  <>
                    <button
                      className="btn-icon btn-approve"
                      onClick={() => {
                        setActionModal({ type: 'approve', request });
                        setActionNotes('');
                      }}
                      title="Aprobar"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      className="btn-icon btn-reject"
                      onClick={() => {
                        setActionModal({ type: 'reject', request });
                        setActionNotes('');
                      }}
                      title="Rechazar"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : null}
                <button
                  className="btn-icon btn-delete"
                  onClick={() => handleDelete(request)}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Detalle de Solicitud"
          size="medium"
        >
          <div className="request-detail">
            <div className="detail-section">
              <h4>Información del Solicitante</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Nombre</label>
                  <span>{selectedRequest.nombre} {selectedRequest.apellido}</span>
                </div>
                <div className="detail-item">
                  <label>Email</label>
                  <span>{selectedRequest.email}</span>
                </div>
                {selectedRequest.telefono && (
                  <div className="detail-item">
                    <label>Teléfono</label>
                    <span>{selectedRequest.telefono}</span>
                  </div>
                )}
                <div className="detail-item">
                  <label>Tipo de Solicitud</label>
                  <span>{TIPO_LABELS[selectedRequest.tipo_solicitud] || selectedRequest.tipo_solicitud}</span>
                </div>
                <div className="detail-item">
                  <label>Estado</label>
                  <span className={`badge ${ESTADO_COLORS[selectedRequest.estado]}`}>
                    {ESTADO_LABELS[selectedRequest.estado]}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Fecha de Solicitud</label>
                  <span>{formatDate(selectedRequest.created_at)}</span>
                </div>
              </div>
            </div>

            {selectedRequest.datos_formulario && Object.keys(selectedRequest.datos_formulario).length > 0 && (
              <div className="detail-section">
                <h4>Datos Adicionales</h4>
                <div className="detail-grid">
                  {Object.entries(selectedRequest.datos_formulario).map(([key, value]) => (
                    <div key={key} className="detail-item full-width">
                      <label>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</label>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRequest.notas_admin && (
              <div className="detail-section">
                <h4>Notas del Administrador</h4>
                <p>{selectedRequest.notas_admin}</p>
              </div>
            )}

            {selectedRequest.accion_tomada && (
              <div className="detail-section">
                <h4>Acción Tomada</h4>
                <p>{selectedRequest.accion_tomada}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Action Modal */}
      {actionModal && (
        <Modal
          isOpen={!!actionModal}
          onClose={() => setActionModal(null)}
          title={actionModal.type === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
          size="small"
        >
          <div className="action-modal-content">
            <p>
              {actionModal.type === 'approve'
                ? `¿Aprobar la solicitud de ${actionModal.request.nombre} ${actionModal.request.apellido}?`
                : `¿Rechazar la solicitud de ${actionModal.request.nombre} ${actionModal.request.apellido}?`}
            </p>

            {actionModal.type === 'approve' && (
              <div className="form-group">
                <label>Acción a tomar</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                >
                  <option value="crear_usuario">Crear como usuario normal</option>
                  <option value="enviar_a_connect">Enviar a CLIC Connect</option>
                  <option value="contactar">Solo contactar</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Notas (opcional)</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Agrega notas sobre esta decisión..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setActionModal(null)}
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                className={actionModal.type === 'approve' ? 'btn-primary' : 'btn-danger'}
                onClick={actionModal.type === 'approve' ? handleApprove : handleReject}
                disabled={processing}
              >
                {processing
                  ? 'Procesando...'
                  : actionModal.type === 'approve'
                  ? 'Aprobar'
                  : 'Rechazar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
