/**
 * CrmFinanzasVentaComisiones - Módulo de comisiones en detalle de venta
 * 
 * Muestra y gestiona las comisiones asociadas a una venta específica
 * Similar a DealCommissions.js del proyecto antiguo
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  DollarSign, Percent, CreditCard, CheckCircle, Clock, Loader2, AlertCircle, RefreshCw, FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getComisiones,
  updateComision,
  createComision,
  Comision,
  getPagosByVenta,
  createPagoComision,
  PagoComision,
} from '../../services/api';
import ModalAplicarPago from '../../components/ModalAplicarPago';
import ModalHistorialPagos from '../../components/ModalHistorialPagos';
import DatePicker from '../../components/DatePicker';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

interface CrmFinanzasVentaComisionesProps {
  ventaId: string;
  venta: {
    id: string;
    valor_cierre: number;
    moneda: string;
    porcentaje_comision?: number | null;
    monto_comision?: number | null;
  };
  onUpdate?: (venta: any) => void;
}

const CrmFinanzasVentaComisiones: React.FC<CrmFinanzasVentaComisionesProps> = ({
  ventaId,
  venta,
  onUpdate,
}) => {
  const { tenantActual, user } = useAuth();
  const { getToken } = useClerkAuth();
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [pagos, setPagos] = useState<PagoComision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingComision, setEditingComision] = useState<Comision | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAplicarPagoModal, setShowAplicarPagoModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  // Estados para el modal de edición (no para el formulario principal)
  const [montoPagado, setMontoPagado] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [estadoPago, setEstadoPago] = useState('pendiente');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (ventaId && tenantActual?.id) {
      loadComisiones();
      loadPagos();
    }
  }, [ventaId, tenantActual?.id]);

  const loadComisiones = async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getComisiones(tenantActual.id, { ventaId });
      setComisiones(data);
    } catch (err: any) {
      console.error('Error cargando comisiones:', err);
      setError(err.message || 'Error al cargar comisiones');
    } finally {
      setLoading(false);
    }
  };

  const loadPagos = async () => {
    if (!tenantActual?.id || !ventaId) return;

    try {
      const data = await getPagosByVenta(tenantActual.id, ventaId);
      setPagos(data);
    } catch (err: any) {
      console.error('Error cargando pagos:', err);
      // No mostramos error aquí, solo log
    }
  };

  const openEditModal = (comision: Comision) => {
    setEditingComision(comision);
    // Formatear monto pagado con 2 decimales
    const montoPagadoFormateado = comision.monto_pagado 
      ? comision.monto_pagado.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0.00';
    setMontoPagado(montoPagadoFormateado);
    // Si hay fecha_pago, convertirla al formato YYYY-MM-DD para DatePicker
    if (comision.fecha_pago) {
      const fecha = new Date(comision.fecha_pago);
      setFechaPago(fecha.toISOString().split('T')[0]);
    } else {
      setFechaPago('');
    }
    setEstadoPago(comision.estado || 'pendiente');
    setNotas(comision.notas || '');
  };

  const closeEditModal = () => {
    setEditingComision(null);
    setMontoPagado('');
    setFechaPago('');
    setEstadoPago('pendiente');
    setNotas('');
  };

  const handleUpdatePago = async () => {
    if (!tenantActual?.id || !editingComision) return;

    try {
      setSaving(true);

      // Remover comas y convertir a número (formato 000,000.00)
      const montoPagadoSinComas = montoPagado.replace(/,/g, '');
      const montoPagadoNum = parseFloat(montoPagadoSinComas) || 0;
      const montoTotal = editingComision.monto || 0;
      
      // Validar que no exceda el monto total
      if (montoPagadoNum > montoTotal) {
        alert(`El monto pagado no puede exceder el monto total de ${editingComision.moneda} ${montoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        setSaving(false);
        return;
      }
      
      // Determinar estado basado en monto pagado
      let nuevoEstado = estadoPago;
      if (montoPagadoNum === 0) {
        nuevoEstado = 'pendiente';
      } else if (montoPagadoNum >= montoTotal) {
        nuevoEstado = 'pagado';
      } else if (montoPagadoNum > 0) {
        nuevoEstado = 'parcial';
      }

      await updateComision(tenantActual.id, editingComision.id, {
        monto_pagado: montoPagadoNum,
        fecha_pago: fechaPago || null,
        estado: nuevoEstado,
        notas: notas || null,
      });

      closeEditModal();
      await loadComisiones();
      await loadPagos();
      
      // Notificar al componente padre si es necesario
      if (onUpdate) {
        onUpdate(venta);
      }
      
      alert('Pago actualizado exitosamente');
    } catch (err: any) {
      console.error('Error actualizando pago:', err);
      alert(err.message || 'Error al actualizar pago');
    } finally {
      setSaving(false);
    }
  };

  const handleAplicarPago = async (data: {
    monto: number;
    tipoPago: 'parcial' | 'total';
    fechaPago: string;
    notas?: string;
    recibo?: File;
  }) => {
    if (!tenantActual?.id) {
      throw new Error('No se pudo identificar el tenant');
    }

    try {
      setSaving(true);
      
      // Recargar comisiones para asegurar que tenemos todas (vendedor y owner)
      await loadComisiones();
      
      // Obtener todas las comisiones de esta venta
      let comisionesVenta = comisiones.filter(c => c.venta_id === ventaId);
      
      // Si no hay comisiones, las comisiones deberían haberse creado automáticamente al crear/actualizar la venta
      // Si aún no existen, esperar un momento y recargar
      if (comisionesVenta.length === 0) {
        // Las comisiones se crean automáticamente en el backend, recargar
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadComisiones();
        comisionesVenta = comisiones.filter(c => c.venta_id === ventaId);
      }
      
      if (comisionesVenta.length === 0) {
        throw new Error('No se encontraron comisiones para esta venta. Las comisiones se crean automáticamente al crear o actualizar una venta.');
      }
      
      const montoAplicar = Number(data.monto);
      
      // Crear una fechaRegistro única para este pago (se usará en todas las comisiones para agrupar)
      const fechaRegistroPago = new Date().toISOString();
      const fechaPago = data.fechaPago || new Date().toISOString().split('T')[0];
      
      // Subir recibo si existe (solo una vez, se compartirá entre todas las comisiones)
      let reciboUrl: string | null = null;
      if (data.recibo && comisionesVenta.length > 0) {
        const formData = new FormData();
        formData.append('file', data.recibo);
        
        const token = await getToken();
        // Subir recibo usando la primera comisión como referencia
        const uploadResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/upload/comisiones/${tenantActual.id}/${comisionesVenta[0].id}/recibo`,
          {
            method: 'POST',
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Error al subir recibo');
        }

        const uploadData = await uploadResponse.json();
        reciboUrl = uploadData.url || uploadData.file?.url;
      }
      
      // Distribuir el pago entre las comisiones según el split (usar snapshot si existe)
      const distribucion: Record<string, number> = {};
      
      for (const comision of comisionesVenta) {
        const split = comision.datos_extra?.split;
        
        // Usar snapshot del split si existe, si no usar el split actual
        let porcentajeSplit = 50; // Default
        if (split === 'vendedor') {
          porcentajeSplit = comision.split_porcentaje_vendedor ?? 70;
        } else if (split === 'owner') {
          porcentajeSplit = comision.split_porcentaje_owner ?? 30;
        }
        
        // Calcular el monto proporcional del pago para esta comisión
        const montoProporcional = Number((montoAplicar * porcentajeSplit / 100).toFixed(2));
        distribucion[comision.id] = montoProporcional;
        
        // Crear un pago específico para esta comisión
        await createPagoComision(tenantActual.id, {
          venta_id: ventaId,
          comision_id: comision.id,
          monto: montoProporcional,
          moneda: venta.moneda,
          tipo_pago: data.tipoPago,
          fecha_pago: fechaPago,
          notas: data.notas || null,
          recibo_url: reciboUrl || null,
          registrado_por_id: user?.id || null,
          distribucion: {
            split: split,
            porcentajeSplit: porcentajeSplit,
            fecha_registro: fechaRegistroPago, // Para agrupar pagos del mismo momento
          },
        });
      }
      
      // Recargar pagos para calcular montos actualizados
      await loadPagos();
      const pagosActualizados = await getPagosByVenta(tenantActual.id, ventaId);
      
      // Actualizar cada comisión con el monto pagado calculado desde los pagos
      for (const comision of comisionesVenta) {
        const pagosDeEstaComision = pagosActualizados.filter(p => p.comision_id === comision.id);
        const nuevoMontoPagado = pagosDeEstaComision.reduce((sum, p) => sum + p.monto, 0);
        
        // Convertir a número, manejando el caso donde pueden venir como strings desde la BD
        const montoTotal = typeof comision.monto === 'string' 
          ? parseFloat(comision.monto) || 0 
          : (comision.monto || 0);
        
        // Determinar estado basado en monto pagado
        let nuevoEstado = 'parcial';
        if (nuevoMontoPagado >= montoTotal) {
          nuevoEstado = 'pagado';
        } else if (nuevoMontoPagado === 0) {
          nuevoEstado = 'pendiente';
        }
        
        // Actualizar la comisión con el nuevo monto pagado
        await updateComision(tenantActual.id, comision.id, {
          monto_pagado: nuevoMontoPagado,
          fecha_pago: nuevoEstado === 'pagado' ? fechaPago : null,
          estado: nuevoEstado,
          notas: data.notas || comision.notas || null,
        });
      }
      
      // Recargar comisiones y pagos
      await loadComisiones();
      await loadPagos();
      
      // Notificar al componente padre
      if (onUpdate) {
        onUpdate(venta);
      }
    } catch (err: any) {
      console.error('Error aplicando pago:', err);
      const errorMessage = err.message || 'Error desconocido al aplicar el pago';
      console.error('Detalles del error:', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const symbols: Record<string, string> = {
      USD: '$',
      DOP: 'RD$',
      EUR: '€',
    };
    const symbol = symbols[currency] || currency;
    // Formato: 000,000.00 (punto para decimales, coma para miles)
    const formatted = parseFloat(amount.toString()).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol} ${formatted}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pagado': return 'bg-green-100 text-green-800';
      case 'parcial': return 'bg-yellow-100 text-yellow-800';
      case 'pendiente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pagado': return 'Pagado Completo';
      case 'parcial': return 'Pago Parcial';
      case 'pendiente': return 'Pendiente';
      default: return 'Sin Estado';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pagado': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'parcial': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'pendiente': return <Clock className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  // Calcular totales de comisiones
  // IMPORTANTE: Convertir monto y monto_pagado a números ya que pueden venir como strings desde la BD
  const totalComisiones = comisiones.reduce((sum, c) => {
    const monto = typeof c.monto === 'string' ? parseFloat(c.monto) : (c.monto || 0);
    return sum + (isNaN(monto) ? 0 : monto);
  }, 0);
  
  const totalPagado = comisiones.reduce((sum, c) => {
    const montoPagado = typeof c.monto_pagado === 'string' ? parseFloat(c.monto_pagado) : (c.monto_pagado || 0);
    return sum + (isNaN(montoPagado) ? 0 : montoPagado);
  }, 0);
  
  const totalPendiente = totalComisiones - totalPagado;
  const paymentProgress = totalComisiones > 0 ? (totalPagado / totalComisiones) * 100 : 0;

  // Si no hay comisiones, usar datos de la venta directamente
  const comisionPrincipal = comisiones.length > 0 
    ? comisiones[0] 
    : {
        id: '',
        monto: venta.monto_comision || 0,
        moneda: venta.moneda,
        porcentaje: venta.porcentaje_comision || 0,
        monto_pagado: 0,
        estado: 'pendiente',
        fecha_pago: null,
        notas: null,
      };

  // Calcular totales sumando todas las comisiones
  // IMPORTANTE: Convertir monto y monto_pagado a números ya que pueden venir como strings desde la BD
  const comisionTotal = comisiones.reduce((sum, c) => {
    const monto = typeof c.monto === 'string' ? parseFloat(c.monto) : (c.monto || 0);
    return sum + (isNaN(monto) ? 0 : monto);
  }, 0);
  
  const comisionPagada = comisiones.reduce((sum, c) => {
    const montoPagado = typeof c.monto_pagado === 'string' ? parseFloat(c.monto_pagado) : (c.monto_pagado || 0);
    return sum + (isNaN(montoPagado) ? 0 : montoPagado);
  }, 0);
  
  const comisionPendiente = Math.max(0, comisionTotal - comisionPagada);
  const comisionProgress = comisionTotal > 0 ? (comisionPagada / comisionTotal) * 100 : 0;

  // Consolidar historial de pagos desde la nueva tabla pagos_comisiones
  // Agrupa pagos por fecha_registro para mostrar el monto total (no los proporcionales)
  const consolidarHistorialPagos = () => {
    const pagosAgrupados = new Map<string, any>();

    // Agrupar pagos por fecha_registro (pagos del mismo momento se agrupan)
    pagos.forEach((pago) => {
      // Usar fecha_registro como clave de agrupación (pagos del mismo momento)
      const fechaRegistro = new Date(pago.fecha_registro).toISOString();
      const fechaPago = pago.fecha_pago ? new Date(pago.fecha_pago).toISOString().split('T')[0] : '';
      const clave = `${fechaPago}_${pago.tipo_pago}_${fechaRegistro}`;
      
      if (pagosAgrupados.has(clave)) {
        // Si ya existe, sumar el monto proporcional para obtener el monto total del pago
        const pagoExistente = pagosAgrupados.get(clave);
        pagoExistente.monto = Number((Number(pagoExistente.monto) + Number(pago.monto)).toFixed(2));
        
        // Si alguna comisión tiene recibo, mantenerlo
        if (pago.recibo_url && !pagoExistente.reciboUrl) {
          pagoExistente.reciboUrl = pago.recibo_url;
        }
        // Si alguna comisión tiene notas, mantenerlas (combinar si ambas tienen)
        if (pago.notas) {
          if (pagoExistente.notas && pago.notas !== pagoExistente.notas) {
            pagoExistente.notas = `${pagoExistente.notas} | ${pago.notas}`;
          } else if (!pagoExistente.notas) {
            pagoExistente.notas = pago.notas;
          }
        }
      } else {
        // Crear nuevo registro
        pagosAgrupados.set(clave, {
          fecha: fechaPago,
          monto: Number(pago.monto),
          tipoPago: pago.tipo_pago,
          notas: pago.notas || null,
          reciboUrl: pago.recibo_url || null,
          fechaRegistro: fechaRegistro,
        });
      }
    });

    const historialConsolidado = Array.from(pagosAgrupados.values()).sort((a, b) => {
      const fechaA = new Date(a.fechaRegistro || a.fecha).getTime();
      const fechaB = new Date(b.fechaRegistro || b.fecha).getTime();
      return fechaB - fechaA;
    });

    return historialConsolidado;
  };

  const historialConsolidado = consolidarHistorialPagos();

  if (loading && comisiones.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-orange-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Cargando comisiones...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header mejorado */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '2px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: comisionPrincipal.estado === 'pagado' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : comisionPrincipal.estado === 'parcial'
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              {getStatusIcon(comisionPrincipal.estado)}
            </div>
            <div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 700, 
                color: '#1e293b',
                margin: 0,
                marginBottom: '4px'
              }}>
                Gestión de Comisiones
              </h3>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#64748b',
                margin: 0
              }}>
                Estado actual del pago de comisión
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {historialConsolidado.length > 0 && (
              <button
                onClick={() => setShowHistorialModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }}
              >
                <FileText className="w-4 h-4" />
                Ver Historial
              </button>
            )}
            <button
              onClick={() => setShowAplicarPagoModal(true)}
              disabled={comisionPendiente <= 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: comisionPendiente <= 0
                  ? '#cbd5e1'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9375rem',
                cursor: comisionPendiente <= 0
                  ? 'not-allowed'
                  : 'pointer',
                transition: 'all 0.2s',
                boxShadow: comisionPendiente <= 0
                  ? 'none'
                  : '0 4px 6px rgba(102, 126, 234, 0.25)'
              }}
              onMouseEnter={(e) => {
                if (comisionPendiente > 0) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (comisionPendiente > 0) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(102, 126, 234, 0.25)';
                }
              }}
            >
              <CreditCard className="w-4 h-4" />
              Aplicar Pago
            </button>
          </div>
        </div>

        {/* Resumen financiero mejorado - Una sola fila */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Valor del Cierre - Fila 1, Columna 1 */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #93c5fd',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <p style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: '#1e40af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Valor del Cierre
                </p>
                <p style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 700, 
                  color: '#1e3a8a',
                  marginBottom: '4px'
                }}>
                  {formatCurrency(venta.valor_cierre, venta.moneda)}
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#2563eb',
                  marginTop: '4px'
                }}>
                  Base para cálculo de comisión
                </p>
              </div>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
              }}>
                <DollarSign className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
            border: '1px solid #fed7aa',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <p style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: '#9a3412',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Comisión Total ({comisionPrincipal.porcentaje || 0}%)
                </p>
                <p style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 700, 
                  color: '#7c2d12',
                  marginBottom: '4px'
                }}>
                  {formatCurrency(comisionTotal, comisionPrincipal.moneda)}
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#c2410c',
                  marginTop: '4px'
                }}>
                  Monto total a cobrar
                </p>
              </div>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 6px rgba(249, 115, 22, 0.3)'
              }}>
                <Percent className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #a7f3d0',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <p style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: '#065f46',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Monto Pagado
                </p>
                <p style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 700, 
                  color: '#047857',
                  marginBottom: '4px'
                }}>
                  {formatCurrency(comisionPagada, comisionPrincipal.moneda)}
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#059669',
                  marginTop: '4px'
                }}>
                  {comisionPrincipal.moneda} • Total recibido
                </p>
              </div>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)'
              }}>
                <CreditCard className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* Monto Pendiente */}
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <p style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: '#991b1b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Monto Pendiente
                </p>
                <p style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 700, 
                  color: '#dc2626',
                  marginBottom: '4px'
                }}>
                  {formatCurrency(comisionPendiente, comisionPrincipal.moneda)}
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#ef4444',
                  marginTop: '4px'
                }}>
                  {comisionPrincipal.moneda} • Por cobrar
                </p>
              </div>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 6px rgba(239, 68, 68, 0.3)'
              }}>
                <Clock className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        {/* Barra de progreso de pago */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <span style={{ 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              color: '#475569'
            }}>
              Progreso de Pago
            </span>
            <span style={{ 
              fontSize: '0.875rem', 
              fontWeight: 700, 
              color: '#1e293b',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {Math.round(comisionProgress)}%
            </span>
          </div>
          <div style={{
            width: '100%',
            background: '#e2e8f0',
            borderRadius: '12px',
            height: '16px',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <div
              style={{
                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                height: '16px',
                borderRadius: '12px',
                transition: 'width 0.5s ease-out',
                width: `${comisionProgress}%`,
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
              }}
            />
          </div>
        </div>

        {/* Información adicional */}
        {comisionPrincipal.fecha_pago && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Fecha de último pago:</p>
                <p className="text-sm text-gray-600">
                  {new Date(comisionPrincipal.fecha_pago).toLocaleDateString('es-DO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              {comisionPrincipal.notas && (
                <div className="max-w-xs">
                  <p className="text-xs text-gray-500">Notas:</p>
                  <p className="text-xs text-gray-600 truncate" title={comisionPrincipal.notas}>
                    {comisionPrincipal.notas}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Resumen de comisiones históricas */}
      {comisiones.length > 1 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '20px',
          marginTop: '24px'
        }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: '16px'
          }}>
            Todas las Comisiones de esta Venta
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {comisiones.map((comision) => (
              <div 
                key={comision.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '4px'
                  }}>
                    {comision.usuario?.nombre} {comision.usuario?.apellido}
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#64748b'
                  }}>
                    {formatCurrency(comision.monto, comision.moneda)} {' • '} {comision.porcentaje || 0}%
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontWeight: 500,
                    background: comision.estado === 'pagado' ? '#dcfce7' : comision.estado === 'parcial' ? '#fef3c7' : '#fee2e2',
                    color: comision.estado === 'pagado' ? '#166534' : comision.estado === 'parcial' ? '#92400e' : '#991b1b'
                  }}>
                    {getStatusText(comision.estado)}
                  </span>
                  <button
                    onClick={() => openEditModal(comision)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      color: '#475569',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
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
                    title="Editar"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {editingComision && ReactDOM.createPortal(
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={closeEditModal}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f1f5f9'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CreditCard style={{ width: '20px', height: '20px', color: 'white' }} />
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  margin: 0
                }}>
                  Actualizar Pago de Comisión
                </h3>
              </div>
              <button
                onClick={closeEditModal}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                  e.currentTarget.style.color = '#475569';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Monto Total */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '8px'
                }}>
                  Monto Total
                </label>
                <input
                  type="text"
                  value={`${editingComision.moneda} ${editingComision.monto.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#64748b',
                    fontSize: '0.9375rem',
                    fontWeight: 600
                  }}
                />
              </div>

              {/* Monto Pagado */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '8px'
                }}>
                  Monto Pagado
                </label>
                <input
                  type="text"
                  value={montoPagado}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Permitir solo números y un punto decimal
                    value = value.replace(/[^0-9.]/g, '');
                    // Asegurar solo un punto decimal
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    // Limitar a 2 decimales
                    if (parts.length === 2 && parts[1].length > 2) {
                      value = parts[0] + '.' + parts[1].substring(0, 2);
                    }
                    // Validar que no exceda el monto total
                    const numValue = parseFloat(value) || 0;
                    if (numValue <= editingComision.monto || value === '' || value === '.') {
                      setMontoPagado(value);
                    }
                  }}
                  onBlur={(e) => {
                    // Formatear al perder el foco
                    const numValue = parseFloat(e.target.value) || 0;
                    if (numValue > 0) {
                      const formatted = numValue.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      setMontoPagado(formatted);
                    } else {
                      setMontoPagado('0.00');
                    }
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#1e293b',
                    fontSize: '0.9375rem',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    // Al enfocar, mostrar solo el número sin formato para facilitar edición
                    const numValue = parseFloat(montoPagado.replace(/,/g, '')) || 0;
                    if (numValue > 0) {
                      setMontoPagado(numValue.toString());
                    }
                    e.currentTarget.style.borderColor = '#f59e0b';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)';
                  }}
                />
                <p style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginTop: '6px',
                  marginBottom: 0
                }}>
                  Máximo: {editingComision.moneda} {editingComision.monto.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* Notas */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '8px'
                }}>
                  Notas
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={4}
                  placeholder="Detalles del pago..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#1e293b',
                    fontSize: '0.9375rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#f59e0b';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '2px solid #f1f5f9'
            }}>
              <button
                onClick={closeEditModal}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '2px solid #e2e8f0',
                  background: 'white',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePago}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: saving 
                    ? '#cbd5e1' 
                    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: saving ? 'none' : '0 4px 6px -1px rgba(245, 158, 11, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(245, 158, 11, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(245, 158, 11, 0.3)';
                  }
                }}
              >
                {saving ? (
                  <>
                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Aplicar Pago */}
      {comisionPendiente > 0 && (
        <ModalAplicarPago
          isOpen={showAplicarPagoModal}
          onClose={() => setShowAplicarPagoModal(false)}
          onApply={async (data) => {
            try {
              await handleAplicarPago(data);
              setShowAplicarPagoModal(false);
              alert('Pago aplicado exitosamente');
            } catch (err: any) {
              alert(err.message || 'Error al aplicar el pago');
              throw err;
            }
          }}
          montoAdeudado={comisionTotal}
          montoPagado={comisionPagada}
          moneda={comisionPrincipal.moneda}
          comisionId={comisiones[0]?.id}
          loading={saving}
        />
      )}

      {/* Modal Historial de Pagos */}
      {historialConsolidado.length > 0 && (
        <ModalHistorialPagos
          isOpen={showHistorialModal}
          onClose={() => setShowHistorialModal(false)}
          historial={historialConsolidado}
          moneda={comisionPrincipal?.moneda || venta.moneda}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

export default CrmFinanzasVentaComisiones;

