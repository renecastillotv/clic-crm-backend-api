/**
 * ModalHistorialPagos - Modal para mostrar el historial de pagos de una comisión
 */

import React from 'react';
import { X, FileText, Download, Calendar, DollarSign, FileCheck } from 'lucide-react';

interface PagoHistorial {
  fecha: string;
  monto: number;
  tipoPago: 'parcial' | 'total';
  notas?: string | null;
  reciboUrl?: string | null;
  fechaRegistro: string;
}

interface ModalHistorialPagosProps {
  isOpen: boolean;
  onClose: () => void;
  historial: PagoHistorial[];
  moneda: string;
  formatCurrency: (amount: number, currency: string) => string;
}

export default function ModalHistorialPagos({
  isOpen,
  onClose,
  historial,
  moneda,
  formatCurrency
}: ModalHistorialPagosProps) {
  if (!isOpen) return null;

  // Ordenar historial por fecha (más reciente primero)
  const historialOrdenado = [...historial].sort((a, b) => {
    const fechaA = new Date(a.fecha).getTime();
    const fechaB = new Date(b.fecha).getTime();
    return fechaB - fechaA;
  });

  // Calcular total pagado sumando todos los montos del historial
  const totalPagado = historial.reduce((sum, pago) => {
    const monto = typeof pago.monto === 'number' ? pago.monto : parseFloat(pago.monto || '0') || 0;
    return sum + monto;
  }, 0);
  
  // Log para depuración
  console.log('📊 ModalHistorialPagos:', {
    cantidadPagos: historial.length,
    totalPagado,
    historial: historial
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 'min(800px, 95vw)', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="modal-title">Historial de Pagos</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
                {historial.length} {historial.length === 1 ? 'pago registrado' : 'pagos registrados'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
          {/* Resumen */}
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '4px' }}>Total Pagado</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                  {formatCurrency(totalPagado, moneda)}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Lista de pagos */}
          {historialOrdenado.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <FileText className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
              <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>No hay pagos registrados</p>
              <p style={{ fontSize: '0.875rem' }}>Los pagos aplicados aparecerán aquí</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historialOrdenado.map((pago, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Calendar className="w-4 h-4" style={{ color: '#64748b' }} />
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {new Date(pago.fecha).toLocaleDateString('es-DO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: pago.tipoPago === 'total' 
                            ? '#dcfce7' 
                            : '#fef3c7',
                          color: pago.tipoPago === 'total'
                            ? '#166534'
                            : '#92400e'
                        }}>
                          {pago.tipoPago === 'total' ? 'Total' : 'Parcial'}
                        </span>
                      </div>
                      <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                        {formatCurrency(pago.monto, moneda)}
                      </p>
                    </div>
                    {pago.reciboUrl && (
                      <a
                        href={pago.reciboUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          color: '#475569',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#e2e8f0';
                          e.currentTarget.style.color = '#334155';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.color = '#475569';
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Ver Recibo
                      </a>
                    )}
                  </div>
                  
                  {pago.notas && (
                    <div style={{
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      marginTop: '12px',
                      borderLeft: '3px solid #667eea'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0 }}>
                        <strong>Notas:</strong> {pago.notas}
                      </p>
                    </div>
                  )}

                  {!pago.reciboUrl && (
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                      Sin recibo adjunto
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-primary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

