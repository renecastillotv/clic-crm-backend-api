/**
 * CrmClicConnectSolicitudes - Gestión de solicitudes para unirse a CLIC Connect
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  JoinRequest,
} from '../../services/api';

// Iconos SVG como funciones que retornan JSX
const Icons = {
  loader: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
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
  eye: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  check: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (props?: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: JoinRequest | null;
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string, notes: string) => void;
  processing: boolean;
}

function RequestModal({ isOpen, onClose, request, onApprove, onReject, processing }: RequestModalProps) {
  const [reviewNotes, setReviewNotes] = useState('');

  if (!isOpen || !request) return null;

  const handleApprove = () => {
    onApprove(request.id, reviewNotes);
    setReviewNotes('');
  };

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      alert('Por favor agregue notas de rechazo');
      return;
    }
    onReject(request.id, reviewNotes);
    setReviewNotes('');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          background: 'white',
          zIndex: 1
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>Detalles de Solicitud</h2>
        </div>

        <div style={{ padding: '24px', flex: 1, overflow: 'auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>Información Personal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Nombre</label>
                <p style={{ fontWeight: '600', margin: 0 }}>{request.nombre} {request.apellido || ''}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Email</label>
                <p style={{ fontWeight: '600', margin: 0 }}>{request.email}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Teléfono</label>
                <p style={{ fontWeight: '600', margin: 0 }}>{request.telefono || '-'}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Fecha de Solicitud</label>
                <p style={{ fontWeight: '600', margin: 0 }}>
                  {new Date(request.createdAt).toLocaleDateString('es-DO', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>Experiencia Profesional</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Años de Experiencia</label>
                <p style={{ fontWeight: '600', margin: 0 }}>{request.anosExperiencia || 'No especificado'}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Especialización</label>
                <p style={{ fontWeight: '600', margin: 0 }}>{request.especializacion || 'No especificado'}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.875rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Agencia Actual</label>
                <p style={{ fontWeight: '600', margin: 0 }}>{request.agenciaActual || 'No especificado'}</p>
              </div>
            </div>
          </div>

          {request.motivacion && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>Motivación</h3>
              <p style={{
                color: '#0F172A',
                whiteSpace: 'pre-wrap',
                background: '#F8FAFC',
                padding: '16px',
                borderRadius: '8px',
                margin: 0
              }}>{request.motivacion}</p>
            </div>
          )}

          {request.referidor && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>Referido por</h3>
              <p style={{ fontWeight: '600', margin: '0 0 4px 0' }}>
                {request.referidor.nombre || request.referidor.apellido
                  ? `${request.referidor.nombre || ''} ${request.referidor.apellido || ''}`.trim()
                  : request.referidor.email}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>{request.referidor.email}</p>
            </div>
          )}

          {request.estado === 'pending' ? (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>Notas de Revisión</h3>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  minHeight: '100px',
                  fontFamily: 'inherit'
                }}
                placeholder="Agregar notas (opcional para aprobar, requerido para rechazar)"
              />
            </div>
          ) : request.notasRevision && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>Notas de Revisión</h3>
              <p style={{
                color: '#0F172A',
                whiteSpace: 'pre-wrap',
                background: '#F8FAFC',
                padding: '16px',
                borderRadius: '8px',
                margin: '0 0 8px 0'
              }}>{request.notasRevision}</p>
              {request.revisor && (
                <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                  Revisado por: {request.revisor.nombre || request.revisor.apellido
                    ? `${request.revisor.nombre || ''} ${request.revisor.apellido || ''}`.trim()
                    : request.revisor.email}
                  {' el '}
                  {new Date(request.revisadoAt!).toLocaleDateString('es-DO', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{
          padding: '24px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          gap: '8px',
          position: 'sticky',
          bottom: 0,
          background: 'white'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 24px',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              background: 'white',
              color: '#475569',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
          {request.estado === 'pending' && (
            <>
              <button
                onClick={handleReject}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: '#DC2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Icons.x />
                Rechazar
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Icons.check />
                Aprobar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CrmClicConnectSolicitudes() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!tenantActual?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const data = await getJoinRequests(tenantActual.id, undefined, token);
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar solicitudes');
      console.error('Error cargando solicitudes:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    setPageHeader({
      title: 'Solicitudes CLIC Connect',
      subtitle: 'Gestiona las solicitudes para unirse a CLIC Connect',
      actions: (
        <button
          onClick={() => navigate(`/crm/${tenantSlug}/clic-connect`)}
          className="btn-secondary"
        >
          Volver
        </button>
      ),
    });
  }, [setPageHeader, tenantSlug, navigate]);

  const handleApprove = async (id: string, notes: string) => {
    if (!tenantActual?.id) return;
    
    setProcessing(true);
    setError(null);
    try {
      const token = await getToken();
      await approveJoinRequest(tenantActual.id, id, notes, token || undefined);
      setShowModal(false);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Error al aprobar solicitud');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string, notes: string) => {
    if (!tenantActual?.id) return;
    
    setProcessing(true);
    setError(null);
    try {
      const token = await getToken();
      await rejectJoinRequest(tenantActual.id, id, notes, token || undefined);
      setShowModal(false);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Error al rechazar solicitud');
    } finally {
      setProcessing(false);
    }
  };

  const pendingRequests = requests.filter(r => r.estado === 'pending');
  const processedRequests = requests.filter(r => r.estado !== 'pending');

  if (loading) {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <Icons.loader style={{ animation: 'spin 1s linear infinite', width: '32px', height: '32px', margin: '0 auto 16px' }} />
        <p>Cargando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <RequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        request={selectedRequest}
        onApprove={handleApprove}
        onReject={handleReject}
        processing={processing}
      />

      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#FEE2E2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#DC2626',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '8px' }}>Pendientes</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#F97316' }}>{pendingRequests.length}</div>
        </div>
        <div style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '8px' }}>Aprobadas</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10B981' }}>
            {requests.filter(r => r.estado === 'approved').length}
          </div>
        </div>
        <div style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '8px' }}>Rechazadas</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#DC2626' }}>
            {requests.filter(r => r.estado === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Pendientes */}
      <div style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
            Solicitudes Pendientes ({pendingRequests.length})
          </h2>
        </div>
        {pendingRequests.length === 0 ? (
          <div style={{ padding: '64px 32px', textAlign: 'center', color: '#64748B' }}>
            No hay solicitudes pendientes
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <tr>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Solicitante</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Experiencia</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Especialización</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Referido por</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Fecha</th>
                <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0F172A', marginBottom: '4px' }}>
                        {request.nombre} {request.apellido || ''}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>{request.email}</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {request.anosExperiencia ? `${request.anosExperiencia} años` : '-'}
                  </td>
                  <td style={{ padding: '16px' }}>{request.especializacion || '-'}</td>
                  <td style={{ padding: '16px' }}>
                    {request.referidor ? (
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                          {request.referidor.nombre || request.referidor.apellido
                            ? `${request.referidor.nombre || ''} ${request.referidor.apellido || ''}`.trim()
                            : request.referidor.email}
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {new Date(request.createdAt).toLocaleDateString('es-DO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowModal(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#2563EB',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Icons.eye />
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Procesadas */}
      {processedRequests.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0' }}>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
              Solicitudes Procesadas ({processedRequests.length})
            </h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <tr>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Solicitante</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Estado</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Revisado por</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Fecha de Revisión</th>
                <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {processedRequests.map((request) => (
                <tr key={request.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0F172A', marginBottom: '4px' }}>
                        {request.nombre} {request.apellido || ''}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>{request.email}</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: request.estado === 'approved' ? '#D1FAE5' : '#FEE2E2',
                      color: request.estado === 'approved' ? '#059669' : '#DC2626'
                    }}>
                      {request.estado === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {request.revisor ? (
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                          {request.revisor.nombre || request.revisor.apellido
                            ? `${request.revisor.nombre || ''} ${request.revisor.apellido || ''}`.trim()
                            : request.revisor.email}
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {request.revisadoAt ? (
                      new Date(request.revisadoAt).toLocaleDateString('es-DO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    ) : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowModal(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#2563EB',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Icons.eye />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .btn-secondary {
          padding: 12px 24px;
          background: white;
          color: #475569;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-secondary:hover {
          background: #F8FAFC;
        }
      `}</style>
    </div>
  );
}













