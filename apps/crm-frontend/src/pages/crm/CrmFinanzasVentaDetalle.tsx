import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Download, Building, DollarSign, Calendar,
  User, Users, CheckCircle, Clock, AlertCircle, Percent,
  Eye, Ban, AlertTriangle, Home,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { getVenta, updateVenta, cancelarVenta, getTasasCambio, convertirAUSD, Venta, TasasCambio } from '../../services/api';
import CrmFinanzasVentaExpediente from './CrmFinanzasVentaExpediente';
import CrmFinanzasVentaComisiones from './CrmFinanzasVentaComisiones';

export default function CrmFinanzasVentaDetalle() {
  const { tenantSlug, ventaId } = useParams<{ tenantSlug: string; ventaId: string }>();
  const navigate = useNavigate();
  const { tenantActual, user, tieneAcceso, isPlatformAdmin } = useAuth();
  const { setPageHeader } = usePageHeader();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [razonCancelacion, setRazonCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [tasasCambio, setTasasCambio] = useState<TasasCambio>({});

  // Solo admin (finanzas-config) o platform admin pueden anular cualquier venta
  const esAdmin = isPlatformAdmin || tieneAcceso('finanzas-config');
  // El usuario puede anular si es admin O si es el creador de la venta
  const puedeAnular = esAdmin || (venta?.usuario_cerrador_id === user?.id);
  // El usuario puede editar si NO está anulada Y (es admin O es el cerrador de la venta)
  const puedeEditar = !venta?.cancelada && (esAdmin || venta?.usuario_cerrador_id === user?.id);

  useEffect(() => {
    if (ventaId && tenantActual?.id) {
      loadVenta();
      loadTasasCambio();
    } else if (!tenantActual?.id) {
      setError('No se pudo identificar el tenant');
      setLoading(false);
    } else if (!ventaId) {
      setError('No se proporcionó el ID de la venta');
      setLoading(false);
    }
  }, [ventaId, tenantActual?.id]);

  // Configurar el header cuando se carga la venta
  useEffect(() => {
    if (venta) {
      setPageHeader({
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.8125rem',
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
              flexShrink: 0
            }}>
              #{venta.numero_venta || 'N/A'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span>{venta.nombre_negocio || 'Sin nombre de negocio'}</span>
              {venta.cancelada && (
                <span style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '8px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ANULADA
                </span>
              )}
            </div>
          </div>
        ),
        subtitle: venta.descripcion || `Cierre: ${venta.fecha_cierre ? new Date(venta.fecha_cierre).toLocaleDateString('es-DO') : 'Sin fecha'}`,
        backButton: {
          label: 'Volver',
          onClick: () => navigate(-1),
        },
        actions: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Botón Editar - solo si puede editar */}
            {puedeEditar && (
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#475569',
                  fontWeight: 500,
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => {
                  // Navegar a la página de listados y abrir el modal de edición
                  navigate(`/crm/${tenantSlug}/finanzas/ventas?edit=${ventaId}`);
                }}
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
            )}
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#475569',
                fontWeight: 500,
                fontSize: '0.9375rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            {/* Botón Anular - solo admin o creador de la venta */}
            {!venta.cancelada && puedeAnular && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setError(null);
                  setRazonCancelacion('');
                  setShowCancelModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#b91c1c';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(220, 38, 38, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
                }}
              >
                <Ban className="w-4 h-4" />
                Anular
              </button>
            )}
          </div>
        ),
      });
    } else {
      setPageHeader(null);
    }

    return () => {
      setPageHeader(null);
    };
  }, [venta, setPageHeader, navigate]);

  const loadTasasCambio = async () => {
    if (!tenantActual?.id) return;
    try {
      const tasas = await getTasasCambio(tenantActual.id);
      setTasasCambio(tasas);
    } catch (err) {
      console.error('Error cargando tasas de cambio:', err);
      // Usar valores por defecto si falla
      setTasasCambio({ DOP: 58.5, EUR: 0.92, MXN: 17.2 });
    }
  };

  const loadVenta = async () => {
    if (!tenantActual?.id || !ventaId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getVenta(tenantActual.id, ventaId);
      setVenta(data);
    } catch (err: any) {
      console.error('Error al cargar venta:', err);
      setError(err.message || 'Error al cargar los detalles de la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelVenta = async () => {
    if (!tenantActual?.id || !ventaId) return;
    if (!razonCancelacion.trim()) {
      setError('Debe proporcionar una razón para la cancelación');
      return;
    }

    try {
      setCancelando(true);
      setError(null);
      const resultado = await cancelarVenta(tenantActual.id, ventaId, razonCancelacion.trim());
      console.log(`✅ Venta anulada. ${resultado.comisiones_anuladas} comisiones anuladas.`);
      await loadVenta();
      setShowCancelModal(false);
      setRazonCancelacion('');
    } catch (error: any) {
      console.error('Error anulando venta:', error);
      // Mostrar mensaje de error específico del backend
      const errorMessage = error.message || 'Error al anular la venta';
      setError(errorMessage);
    } finally {
      setCancelando(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined, currency: string = 'USD') => {
    if (!amount) return 'N/A';
    let symbol = '';
    if (currency === 'USD') symbol = '$';
    else if (currency === 'DOP') symbol = 'RD$';
    else if (currency === 'EUR') symbol = '€';
    else symbol = currency || '';
    return `${symbol} ${parseFloat(amount.toString()).toLocaleString()}`;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'No definida';
    return new Date(date).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #f3f4f6',
            borderTop: '3px solid #ea580c',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#4b5563' }}>Cargando detalles de la venta...</p>
        </div>
      </div>
    );
  }

  if (error || !venta) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle style={{ width: '48px', height: '48px', color: '#f87171', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>{error || 'No se encontró la venta'}</p>
          <button 
            onClick={() => navigate(-1)} 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: 'white',
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  // Calcular valores en USD con conversión
  const valorOriginal = typeof venta.valor_cierre === 'number' ? venta.valor_cierre : parseFloat(venta.valor_cierre || '0') || 0;
  const moneda = venta.moneda || 'USD';
  const valueUSD = convertirAUSD(valorOriginal, moneda, tasasCambio);
  
  const comisionOriginal = typeof venta.monto_comision === 'number' ? venta.monto_comision : parseFloat(venta.monto_comision || '0') || 0;
  const commissionUSD = convertirAUSD(comisionOriginal, moneda, tasasCambio);

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 64px)', 
      background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)',
      width: '100%',
      padding: 0
    }}>
      <div style={{ 
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        padding: '24px 32px'
      }}>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          width: '100%',
          height: '100%',
          minHeight: 'calc(100vh - 200px)'
        }}>
          {/* Columna principal - Ocupa todo el ancho */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px',
            minHeight: '100%',
            width: '100%'
          }}>
            {/* MÓDULO DE COMISIONES */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              flex: '1 1 auto',
              minHeight: 0
            }}>
              <CrmFinanzasVentaComisiones 
                ventaId={ventaId!} 
                venta={venta}
                onUpdate={(updatedVenta) => {
                  setVenta({ ...venta, ...updatedVenta });
                }}
              />
            </div>

            {/* Propiedad y Cliente - Una sola fila compacta */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginBottom: '24px'
            }}>
              {/* Propiedad */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                padding: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <p style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    margin: 0
                  }}>
                    Propiedad
                  </p>
                  {venta.propiedad_id && (
                    <button
                      onClick={() => navigate(`/crm/${tenantSlug}/propiedades/${venta.propiedad_id}`)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: 'white',
                        color: '#475569',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <Eye className="w-3 h-3" />
                      Ver
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {(venta.propiedad?.imagen_principal || venta.propiedad_imagen) ? (
                    <img
                      src={venta.propiedad?.imagen_principal || venta.propiedad_imagen || ''}
                      alt="Propiedad"
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        border: '2px solid #e2e8f0',
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Building className="w-7 h-7" style={{ color: '#94a3b8' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      marginBottom: '4px',
                      lineHeight: '1.3',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {venta.propiedad?.titulo || venta.propiedad_nombre || venta.nombre_propiedad_externa || 'Propiedad Externa'}
                    </p>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      marginBottom: '6px'
                    }}>
                      Código: {venta.propiedad?.codigo || venta.propiedad_codigo || venta.codigo_propiedad_externa || 'N/A'}
                    </p>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      background: venta.es_propiedad_externa ? '#fef3c7' : '#dcfce7',
                      color: venta.es_propiedad_externa ? '#92400e' : '#166534'
                    }}>
                      {venta.es_propiedad_externa ? 'Externa' : 'Interna'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cliente */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                padding: '20px'
              }}>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '16px'
                }}>
                  Cliente / Comprador
                </p>
                {(venta.contacto || venta.contacto_nombre) ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      <Users className="w-7 h-7" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        marginBottom: '4px'
                      }}>
                        {venta.contacto?.nombre || venta.contacto_nombre || ''} {venta.contacto?.apellido || venta.contacto_apellido || ''}
                      </p>
                      {(venta.contacto?.email || venta.contacto_email) && (
                        <p style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          marginBottom: '4px'
                        }}>
                          {venta.contacto?.email || venta.contacto_email}
                        </p>
                      )}
                      {(venta.contacto?.telefono || venta.contacto_telefono) && (
                        <p style={{
                          fontSize: '0.75rem',
                          color: '#64748b'
                        }}>
                          {venta.contacto?.telefono || venta.contacto_telefono}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Users className="w-7 h-7" style={{ color: '#94a3b8' }} />
                    </div>
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '0.875rem',
                      fontStyle: 'italic'
                    }}>
                      Cliente no especificado
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* MÓDULO DE EXPEDIENTE */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              padding: '24px',
              flex: '1 1 auto',
              minHeight: 0
            }}>
              <CrmFinanzasVentaExpediente ventaId={ventaId!} venta={venta} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de cancelación - Renderizado fuera del contenedor principal */}
      {showCancelModal && typeof document !== 'undefined' && createPortal(
        <div
          className="modal-overlay"
          onClick={() => {
            if (!cancelando) {
              setShowCancelModal(false);
              setError(null);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle className="w-6 h-6" style={{ color: '#ef4444' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  Anular Venta
                </h3>
              </div>
            </div>
            <div className="modal-body" style={{ marginBottom: '24px' }}>
              <p style={{ color: '#64748b', fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '16px' }}>
                ¿Estás seguro de que deseas anular esta venta? Esta acción anulará todas las comisiones asociadas.
              </p>

              {/* Mensaje de error si existe */}
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <AlertCircle className="w-5 h-5" style={{ color: '#dc2626', flexShrink: 0, marginTop: '1px' }} />
                  <span style={{ color: '#991b1b', fontSize: '0.875rem' }}>{error}</span>
                </div>
              )}

              {/* Campo de razón de cancelación */}
              <div style={{ marginTop: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Razón de la cancelación <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={razonCancelacion}
                  onChange={(e) => setRazonCancelacion(e.target.value)}
                  placeholder="Indique el motivo por el cual se anula esta venta..."
                  disabled={cancelando}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowCancelModal(false);
                  setError(null);
                }}
                disabled={cancelando}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#475569',
                  fontWeight: 500,
                  cursor: cancelando ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: cancelando ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!cancelando) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={handleCancelVenta}
                disabled={cancelando || !razonCancelacion.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: (cancelando || !razonCancelacion.trim()) ? '#f87171' : '#dc2626',
                  color: 'white',
                  fontWeight: 600,
                  cursor: (cancelando || !razonCancelacion.trim()) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: (cancelando || !razonCancelacion.trim()) ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!cancelando && razonCancelacion.trim()) {
                    e.currentTarget.style.background = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cancelando && razonCancelacion.trim()) {
                    e.currentTarget.style.background = '#dc2626';
                  }
                }}
              >
                {cancelando ? (
                  <>
                    <span className="animate-spin" style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Anulando...
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    Sí, Anular
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

