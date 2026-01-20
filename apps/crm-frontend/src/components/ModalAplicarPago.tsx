/**
 * ModalAplicarPago - Modal reutilizable para aplicar pagos a comisiones
 * 
 * Puede usarse tanto para comisiones que la empresa recibe como para comisiones que se pagan a terceros
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, CheckCircle, Percent, DollarSign, FileText, RefreshCw } from 'lucide-react';
import DatePicker from './DatePicker';

interface ModalAplicarPagoProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: {
    monto: number;
    tipoPago: 'parcial' | 'total';
    fechaPago: string;
    notas?: string;
    recibo?: File;
  }) => Promise<void>;
  montoAdeudado: number;
  montoPagado: number;
  moneda: string;
  comisionId?: string;
  loading?: boolean;
  titulo?: string;
  descripcion?: string;
}

export default function ModalAplicarPago({
  isOpen,
  onClose,
  onApply,
  montoAdeudado,
  montoPagado,
  moneda,
  loading = false,
  titulo = 'Aplicar Pago',
  descripcion
}: ModalAplicarPagoProps) {
  const [tipoPago, setTipoPago] = useState<'parcial' | 'total'>('parcial');
  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [recibo, setRecibo] = useState<File | null>(null);
  const [reciboPreview, setReciboPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setTipoPago('parcial');
      setMonto('');
      setFechaPago(new Date().toISOString().split('T')[0]);
      setNotas('');
      setRecibo(null);
      setReciboPreview(null);
    }
  }, [isOpen]);

  const montoPendiente = montoAdeudado - montoPagado;

  const formatCurrency = (amount: number) => {
    const symbols: Record<string, string> = {
      USD: '$',
      DOP: 'RD$',
      EUR: '€',
      MXN: '$'
    };
    const symbol = symbols[moneda] || '$';
    // Formato: 000,000.00 (punto para decimales, coma para miles)
    const formatted = parseFloat(amount.toString()).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol} ${formatted}`;
  };

  const handleTipoPagoChange = (tipo: 'parcial' | 'total') => {
    setTipoPago(tipo);
    if (tipo === 'total') {
      setMonto(montoPendiente.toFixed(2));
    } else {
      setMonto('');
    }
  };

  const handlePorcentajeClick = (porcentaje: number) => {
    const montoCalculado = (montoPendiente * porcentaje / 100).toFixed(2);
    setMonto(montoCalculado);
    setTipoPago('parcial');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRecibo(file);
      
      // Crear preview si es imagen
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReciboPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setReciboPreview(null);
      }
    }
  };

  const handleRemoveRecibo = () => {
    setRecibo(null);
    setReciboPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    const montoNum = parseFloat(monto) || 0;
    
    if (montoNum <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (montoNum > montoPendiente) {
      alert(`El monto no puede ser mayor al adeudado (${formatCurrency(montoPendiente)})`);
      return;
    }

    // Validar que la fecha no sea futura
    const fechaSeleccionada = fechaPago ? new Date(fechaPago.split('T')[0]) : new Date();
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999); // Fin del día de hoy
    
    if (fechaSeleccionada > hoy) {
      alert('La fecha de pago no puede ser futura. Por favor, selecciona una fecha válida.');
      return;
    }

    try {
      await onApply({
        monto: montoNum,
        tipoPago: tipoPago,
        fechaPago: fechaPago ? fechaPago.split('T')[0] : new Date().toISOString().split('T')[0],
        notas: notas || undefined,
        recibo: recibo || undefined
      });
      
      // Resetear formulario
      setTipoPago('parcial');
      setMonto('');
      setFechaPago(new Date().toISOString().split('T')[0]);
      setNotas('');
      setRecibo(null);
      setReciboPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // El error ya se maneja en el componente padre
      console.error('Error aplicando pago:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#1e293b',
                margin: 0
              }}>
                {titulo}
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                margin: '4px 0 0 0'
              }}>
                {descripcion || `Monto pendiente: ${formatCurrency(montoPendiente)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#1e293b';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Tipo de pago */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '12px'
            }}>
              Tipo de pago:
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleTipoPagoChange('parcial')}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: `2px solid ${tipoPago === 'parcial' ? '#667eea' : '#e2e8f0'}`,
                  background: tipoPago === 'parcial'
                    ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'
                    : 'white',
                  color: tipoPago === 'parcial' ? '#4338ca' : '#64748b',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Percent className="w-4 h-4" />
                Parcial
              </button>
              <button
                onClick={() => handleTipoPagoChange('total')}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: `2px solid ${tipoPago === 'total' ? '#10b981' : '#e2e8f0'}`,
                  background: tipoPago === 'total'
                    ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                    : 'white',
                  color: tipoPago === 'total' ? '#065f46' : '#64748b',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Total Adeudado
              </button>
            </div>
          </div>

          {/* Monto */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px'
            }}>
              Monto a aplicar:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="number"
                value={monto}
                onChange={(e) => {
                  setMonto(e.target.value);
                  setTipoPago('parcial');
                }}
                disabled={tipoPago === 'total' || loading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '2px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  transition: 'all 0.2s',
                  outline: 'none',
                  background: tipoPago === 'total' ? '#f1f5f9' : 'white'
                }}
                onFocus={(e) => {
                  if (tipoPago !== 'total') {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                min="0"
                max={montoPendiente}
                step="0.01"
                placeholder="0.00"
              />
              <span style={{
                fontSize: '0.875rem',
                color: '#64748b',
                whiteSpace: 'nowrap',
                fontWeight: 500
              }}>
                de {formatCurrency(montoPendiente)}
              </span>
            </div>
            
            {/* Botones rápidos de porcentaje (solo si es parcial) */}
            {tipoPago === 'parcial' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => handlePorcentajeClick(25)}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => handlePorcentajeClick(50)}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  50%
                </button>
              </div>
            )}
          </div>

          {/* Fecha de pago */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px'
            }}>
              Fecha de pago:
            </label>
            <DatePicker
              value={fechaPago}
              onChange={(value) => setFechaPago(value)}
              placeholder="Seleccionar fecha de pago"
              disabled={loading}
              showTime={false}
              clearable={true}
            />
          </div>

          {/* Adjuntar recibo */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px'
            }}>
              Adjuntar recibo (opcional):
            </label>
            {!recibo ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '24px',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  textAlign: 'center',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  background: '#f8fafc'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.background = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              >
                <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: '#64748b' }} />
                <p style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  margin: '4px 0 0 0'
                }}>
                  Haz clic para seleccionar un archivo
                </p>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  margin: '4px 0 0 0'
                }}>
                  PDF, imágenes (JPG, PNG, etc.)
                </p>
              </div>
            ) : (
              <div style={{
                padding: '16px',
                border: '2px solid #cbd5e1',
                borderRadius: '10px',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {reciboPreview ? (
                  <img
                    src={reciboPreview}
                    alt="Preview"
                    style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FileText className="w-6 h-6" style={{ color: '#64748b' }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    margin: 0
                  }}>
                    {recibo.name}
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    margin: '4px 0 0 0'
                  }}>
                    {(recibo.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveRecibo}
                  disabled={loading}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              style={{ display: 'none' }}
              disabled={loading}
            />
          </div>

          {/* Notas */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px'
            }}>
              Notas (opcional):
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '0.9375rem',
                color: '#1e293b',
                transition: 'all 0.2s',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '80px'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }}
              rows={3}
              placeholder="Detalles del pago, método utilizado, banco, número de referencia, etc."
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#475569',
              fontWeight: 500,
              fontSize: '0.9375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
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
            onClick={handleSubmit}
            disabled={loading || !monto || parseFloat(monto) <= 0}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: loading || !monto || parseFloat(monto) <= 0
                ? '#cbd5e1'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.9375rem',
              cursor: loading || !monto || parseFloat(monto) <= 0
                ? 'not-allowed'
                : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: loading || !monto || parseFloat(monto) <= 0
                ? 'none'
                : '0 4px 6px rgba(102, 126, 234, 0.25)'
            }}
            onMouseEnter={(e) => {
              if (!loading && monto && parseFloat(monto) > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.35)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && monto && parseFloat(monto) > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(102, 126, 234, 0.25)';
              }
            }}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {titulo}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

