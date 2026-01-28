/**
 * CrmDocumentosGenerados
 *
 * Lista de documentos generados por el usuario con opciones para:
 * - Ver documento PDF
 * - Enviar a firma electrónica (DocuSeal)
 * - Ver estado de firma
 * - Descargar documento firmado
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { apiFetch } from '../../services/api';
import {
  FileText,
  Send,
  Eye,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  User,
  Mail,
  ExternalLink,
} from 'lucide-react';

// ==================== INTERFACES ====================

interface DocumentoGenerado {
  id: string;
  nombre: string;
  estado: 'borrador' | 'pendiente_firma' | 'firmado' | 'rechazado' | 'expirado';
  url_documento?: string;
  docuseal_submission_id?: string;
  docuseal_signing_url?: string;
  docuseal_signers?: {
    email: string;
    nombre?: string;
    estado: string;
    firmado_at?: string;
    url?: string;
  }[];
  contacto_nombre?: string;
  propiedad_titulo?: string;
  plantilla_nombre?: string;
  created_at: string;
  updated_at: string;
}

interface Firmante {
  nombre: string;
  email: string;
  rol?: string;
}

// ==================== COMPONENT ====================

export default function CrmDocumentosGenerados() {
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  // State
  const [documentos, setDocumentos] = useState<DocumentoGenerado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal enviar firma
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<DocumentoGenerado | null>(null);
  const [firmantes, setFirmantes] = useState<Firmante[]>([{ nombre: '', email: '', rol: '' }]);
  const [enviandoFirma, setEnviandoFirma] = useState(false);
  const [mensajeEmail, setMensajeEmail] = useState({ asunto: '', cuerpo: '' });

  // Modal estado firma
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [estadoFirma, setEstadoFirma] = useState<any>(null);
  const [loadingEstado, setLoadingEstado] = useState(false);

  // ==================== DATA LOADING ====================

  const loadDocumentos = useCallback(async () => {
    if (!tenantActual?.id) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await apiFetch(
        `/tenants/${tenantActual.id}/documentos/generados?mis_documentos=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setDocumentos(data.documentos || data || []);
    } catch (err: any) {
      console.error('Error cargando documentos:', err);
      setError(err.message || 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken]);

  useEffect(() => {
    loadDocumentos();
  }, [loadDocumentos]);

  // ==================== PAGE HEADER ====================

  useEffect(() => {
    setPageHeader({
      title: 'Mis Documentos',
      subtitle: 'Documentos generados y estado de firmas',
      actions: (
        <button onClick={loadDocumentos} className="btn-secondary">
          <RefreshCw size={18} />
          Actualizar
        </button>
      ),
    });
  }, [setPageHeader, loadDocumentos]);

  // ==================== HANDLERS ====================

  const handleEnviarFirma = (doc: DocumentoGenerado) => {
    setDocumentoSeleccionado(doc);
    setFirmantes([{ nombre: '', email: '', rol: '' }]);
    setMensajeEmail({ asunto: '', cuerpo: '' });
    setShowFirmaModal(true);
  };

  const handleAgregarFirmante = () => {
    setFirmantes([...firmantes, { nombre: '', email: '', rol: '' }]);
  };

  const handleRemoverFirmante = (index: number) => {
    if (firmantes.length > 1) {
      setFirmantes(firmantes.filter((_, i) => i !== index));
    }
  };

  const handleFirmanteChange = (index: number, field: keyof Firmante, value: string) => {
    const updated = [...firmantes];
    updated[index] = { ...updated[index], [field]: value };
    setFirmantes(updated);
  };

  const handleSubmitFirma = async () => {
    if (!documentoSeleccionado || !tenantActual?.id) return;

    // Validar firmantes
    const firmantesValidos = firmantes.filter(f => f.nombre && f.email);
    if (firmantesValidos.length === 0) {
      alert('Agrega al menos un firmante con nombre y email');
      return;
    }

    setEnviandoFirma(true);

    try {
      const token = await getToken();
      await apiFetch(
        `/tenants/${tenantActual.id}/documentos/generados/${documentoSeleccionado.id}/enviar-firma`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firmantes: firmantesValidos,
            mensaje: mensajeEmail.asunto ? mensajeEmail : undefined,
            enviar_email: true,
          }),
        }
      );

      setShowFirmaModal(false);
      loadDocumentos();
      alert('Documento enviado a firma exitosamente');
    } catch (err: any) {
      console.error('Error enviando a firma:', err);
      alert(err.message || 'Error al enviar documento a firma');
    } finally {
      setEnviandoFirma(false);
    }
  };

  const handleVerEstado = async (doc: DocumentoGenerado) => {
    if (!tenantActual?.id) return;

    setDocumentoSeleccionado(doc);
    setLoadingEstado(true);
    setShowEstadoModal(true);

    try {
      const token = await getToken();
      const response = await apiFetch(
        `/tenants/${tenantActual.id}/documentos/generados/${doc.id}/estado-firma`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const estado = await response.json();
      setEstadoFirma(estado);
    } catch (err: any) {
      console.error('Error consultando estado:', err);
      setEstadoFirma({ error: err.message });
    } finally {
      setLoadingEstado(false);
    }
  };

  // ==================== HELPERS ====================

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'borrador':
        return { icon: FileText, color: '#6b7280', label: 'Borrador' };
      case 'pendiente_firma':
        return { icon: Clock, color: '#f59e0b', label: 'Pendiente Firma' };
      case 'firmado':
        return { icon: CheckCircle, color: '#10b981', label: 'Firmado' };
      case 'rechazado':
        return { icon: XCircle, color: '#ef4444', label: 'Rechazado' };
      case 'expirado':
        return { icon: AlertCircle, color: '#6b7280', label: 'Expirado' };
      default:
        return { icon: FileText, color: '#6b7280', label: estado };
    }
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw size={32} className="spin" style={{ color: '#6b7280' }} />
        <p style={{ marginTop: '16px', color: '#6b7280' }}>Cargando documentos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444' }} />
        <p style={{ marginTop: '16px', color: '#ef4444' }}>{error}</p>
        <button onClick={loadDocumentos} className="btn-primary" style={{ marginTop: '16px' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Lista de documentos */}
      {documentos.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
        }}>
          <FileText size={48} style={{ color: '#6b7280', marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>No tienes documentos generados</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Los documentos que generes aparecerán aquí
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {documentos.map((doc) => {
            const badge = getEstadoBadge(doc.estado);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={doc.id}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                        {doc.nombre}
                      </h3>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: `${badge.color}20`,
                          color: badge.color,
                        }}
                      >
                        <BadgeIcon size={14} />
                        {badge.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {doc.plantilla_nombre && (
                        <span>Plantilla: {doc.plantilla_nombre}</span>
                      )}
                      {doc.contacto_nombre && (
                        <span>Contacto: {doc.contacto_nombre}</span>
                      )}
                      <span>
                        Creado: {new Date(doc.created_at).toLocaleDateString('es-DO')}
                      </span>
                    </div>

                    {/* Mostrar firmantes si hay */}
                    {doc.docuseal_signers && doc.docuseal_signers.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {doc.docuseal_signers.map((signer, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              background: signer.estado === 'completed' ? '#10b98120' : '#f59e0b20',
                              color: signer.estado === 'completed' ? '#10b981' : '#f59e0b',
                            }}
                          >
                            <Mail size={12} />
                            {signer.email}
                            {signer.estado === 'completed' && <CheckCircle size={12} />}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {doc.url_documento && (
                      <a
                        href={doc.url_documento}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon"
                        title="Ver documento"
                      >
                        <Eye size={18} />
                      </a>
                    )}

                    {doc.estado === 'borrador' && (
                      <button
                        onClick={() => handleEnviarFirma(doc)}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Send size={16} />
                        Enviar a Firma
                      </button>
                    )}

                    {(doc.estado === 'pendiente_firma' || doc.estado === 'firmado') && (
                      <button
                        onClick={() => handleVerEstado(doc)}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={16} />
                        Ver Estado
                      </button>
                    )}

                    {doc.estado === 'firmado' && doc.docuseal_signing_url && (
                      <a
                        href={doc.docuseal_signing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-success"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={16} />
                        Descargar Firmado
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Enviar a Firma */}
      {showFirmaModal && documentoSeleccionado && (
        <div className="modal-overlay" onClick={() => setShowFirmaModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px' }}
          >
            <div className="modal-header">
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={24} />
                Enviar a Firma
              </h2>
              <button onClick={() => setShowFirmaModal(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                Documento: <strong>{documentoSeleccionado.nombre}</strong>
              </p>

              <h4 style={{ marginBottom: '12px' }}>Firmantes</h4>
              {firmantes.map((firmante, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto',
                    gap: '12px',
                    marginBottom: '12px',
                    alignItems: 'end',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={firmante.nombre}
                      onChange={(e) => handleFirmanteChange(index, 'nombre', e.target.value)}
                      placeholder="Juan Pérez"
                      className="input"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={firmante.email}
                      onChange={(e) => handleFirmanteChange(index, 'email', e.target.value)}
                      placeholder="juan@email.com"
                      className="input"
                    />
                  </div>
                  {firmantes.length > 1 && (
                    <button
                      onClick={() => handleRemoverFirmante(index)}
                      className="btn-icon"
                      style={{ marginBottom: '4px' }}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={handleAgregarFirmante}
                className="btn-secondary"
                style={{ marginBottom: '24px' }}
              >
                + Agregar Firmante
              </button>

              <h4 style={{ marginBottom: '12px' }}>Mensaje (opcional)</h4>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Asunto del email
                </label>
                <input
                  type="text"
                  value={mensajeEmail.asunto}
                  onChange={(e) => setMensajeEmail({ ...mensajeEmail, asunto: e.target.value })}
                  placeholder="Documento para firma"
                  className="input"
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Mensaje
                </label>
                <textarea
                  value={mensajeEmail.cuerpo}
                  onChange={(e) => setMensajeEmail({ ...mensajeEmail, cuerpo: e.target.value })}
                  placeholder="Por favor revise y firme el documento adjunto..."
                  className="input"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowFirmaModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleSubmitFirma}
                className="btn-primary"
                disabled={enviandoFirma}
              >
                {enviandoFirma ? 'Enviando...' : 'Enviar a Firma'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Estado de Firma */}
      {showEstadoModal && documentoSeleccionado && (
        <div className="modal-overlay" onClick={() => setShowEstadoModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="modal-header">
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={24} />
                Estado de Firma
              </h2>
              <button onClick={() => setShowEstadoModal(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              {loadingEstado ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw size={32} className="spin" />
                  <p>Consultando estado...</p>
                </div>
              ) : estadoFirma?.error ? (
                <div style={{ textAlign: 'center', color: '#ef4444' }}>
                  <AlertCircle size={32} />
                  <p>{estadoFirma.error}</p>
                </div>
              ) : estadoFirma ? (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <strong>Estado general:</strong>{' '}
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: estadoFirma.estado === 'firmado' ? '#10b98120' : '#f59e0b20',
                        color: estadoFirma.estado === 'firmado' ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {estadoFirma.estado}
                    </span>
                  </div>

                  <h4 style={{ marginBottom: '12px' }}>Firmantes</h4>
                  {estadoFirma.firmantes?.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: 'var(--bg-primary)',
                        borderRadius: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={16} />
                          <strong>{f.nombre}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {f.email}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            background: f.estado === 'completed' ? '#10b98120' : '#f59e0b20',
                            color: f.estado === 'completed' ? '#10b981' : '#f59e0b',
                          }}
                        >
                          {f.estado === 'completed' ? (
                            <>
                              <CheckCircle size={14} /> Firmado
                            </>
                          ) : (
                            <>
                              <Clock size={14} /> Pendiente
                            </>
                          )}
                        </span>
                        {f.firmado_at && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {new Date(f.firmado_at).toLocaleString('es-DO')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {estadoFirma.documento_firmado_url && (
                    <a
                      href={estadoFirma.documento_firmado_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-success"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        marginTop: '20px',
                      }}
                    >
                      <Download size={18} />
                      Descargar Documento Firmado
                      <ExternalLink size={14} />
                    </a>
                  )}
                </>
              ) : null}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowEstadoModal(false)} className="btn-secondary">
                Cerrar
              </button>
              <button
                onClick={() => handleVerEstado(documentoSeleccionado)}
                className="btn-primary"
                disabled={loadingEstado}
              >
                <RefreshCw size={16} />
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .btn-success {
          background: #10b981;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          text-decoration: none;
        }
        .btn-success:hover {
          background: #059669;
        }
      `}</style>
    </div>
  );
}
