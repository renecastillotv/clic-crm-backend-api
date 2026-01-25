/**
 * CrmFinanzasVentaComisiones - Módulo de comisiones en detalle de venta
 *
 * Sistema avanzado de distribución de comisiones:
 * - Trae automáticamente todos los participantes con sus splits por defecto
 * - Permite editar porcentajes en línea
 * - Valida que el total no supere 100%
 * - Permite agregar/quitar participantes
 * - Guarda distribución personalizada (snapshot)
 * - Histórico de pagos separado
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Percent, Loader2, AlertCircle,
  RefreshCw, Trash2, Save, X, Users, History, ArrowDownCircle, ArrowUpCircle,
  Eye, Download, FileCheck, FileX
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getComisiones,
  updateComision,
  Comision,
  getPagosByVenta,
  createPagoComision,
  PagoComision,
  recalcularComisionesVenta,
} from '../../services/api';
import ModalAplicarPago from '../../components/ModalAplicarPago';
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
// Interfaz para edición local de distribución
interface DistribucionLocal {
  id: string;
  tipo: string;
  nombre: string;
  porcentaje: number;
  monto: number;
  esNuevo?: boolean;
  comisionOriginal?: Comision;
}
const CrmFinanzasVentaComisiones: React.FC<CrmFinanzasVentaComisionesProps> = ({
  ventaId,
  venta,
}) => {
  const { tenantActual, user, tieneAcceso, isPlatformAdmin } = useAuth();
  const { getToken } = useClerkAuth();

  // Solo admin (finanzas-config) o platform admin pueden aplicar pagos/cobros
  const esAdmin = isPlatformAdmin || tieneAcceso('finanzas-config');
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [pagos, setPagos] = useState<PagoComision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  // Estados para modo edición de distribución
  const [modoEdicion, setModoEdicion] = useState(false);
  const [distribucionLocal, setDistribucionLocal] = useState<DistribucionLocal[]>([]);
  // Estados para modales
  const [showAplicarPagoModal, setShowAplicarPagoModal] = useState(false);
  const [comisionParaPago, setComisionParaPago] = useState<Comision | null>(null);
  const [modalTipo, setModalTipo] = useState<'cobro' | 'pago'>('pago'); // cobro=entrada, pago=salida
  // Tab activo: 'distribucion' | 'historial'
  const [tabActivo, setTabActivo] = useState<'distribucion' | 'historial'>('distribucion');
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
      // Sincronizar distribución local
      sincronizarDistribucionLocal(data);
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
    }
  };
  // Sincronizar comisiones del servidor con estado local editable
  const sincronizarDistribucionLocal = (comisionesData: Comision[]) => {
    const distribucion: DistribucionLocal[] = comisionesData.map(c => {
      const tipo = c.tipo_participante || c.datos_extra?.split || 'vendedor';
      const esEmpresa = tipo === 'owner' || tipo === 'empresa';
      const porcentaje = esEmpresa
        ? (c.split_porcentaje_owner || c.datos_extra?.porcentajeSplit || 0)
        : (c.datos_extra?.porcentajeSplit || 0);
      let nombre = c.nombre_display || '';
      if (!nombre) {
        if (esEmpresa) {
          nombre = c.tenant_nombre || tenantActual?.nombre || 'Empresa';
        } else if (c.datos_extra?.esExterno && c.datos_extra?.nombreExterno) {
          nombre = c.datos_extra.nombreExterno;
        } else {
          nombre = `${c.usuario?.nombre || ''} ${c.usuario?.apellido || ''}`.trim();
        }
      }
      return {
        id: c.id,
        tipo,
        nombre: nombre || 'Sin nombre',
        porcentaje: Number(porcentaje),
        monto: Number(c.monto) || 0,
        comisionOriginal: c,
      };
    });
    setDistribucionLocal(distribucion);
  };
  // Calcular totales
  const montoComisionTotal = Number(venta.monto_comision) || 0;
  const porcentajeComision = Number(venta.porcentaje_comision) || 0;
  const porcentajeTotal = distribucionLocal.reduce((sum, d) => sum + d.porcentaje, 0);
  const totalPagadoAParticipantes = comisiones.reduce((sum, c) => sum + (Number(c.monto_pagado) || 0), 0);
  // Total cobrado del cliente (suma de todos los cobros registrados)
  const totalCobradoDelCliente = pagos
    .filter((p: any) => p.tipo_movimiento === 'cobro' || !p.tipo_movimiento) // Por ahora asumimos los pagos existentes son cobros
    .reduce((sum, p: any) => sum + (Number(p.monto) || 0), 0);
  const totalPendienteCobrar = montoComisionTotal - totalCobradoDelCliente;
  const totalPendientePagar = totalCobradoDelCliente - totalPagadoAParticipantes;
  // Manejar cambio de porcentaje
  const handlePorcentajeChange = (id: string, nuevoPorcentaje: number) => {
    setDistribucionLocal(prev => prev.map(d => {
      if (d.id === id) {
        const porcentajeValidado = Math.max(0, Math.min(100, nuevoPorcentaje));
        const nuevoMonto = (montoComisionTotal * porcentajeValidado) / 100;
        return { ...d, porcentaje: porcentajeValidado, monto: nuevoMonto };
      }
      return d;
    }));
  };
  // Eliminar participante de la distribución
  const handleEliminarParticipante = (id: string) => {
    setDistribucionLocal(prev => prev.filter(d => d.id !== id));
  };
  // Guardar distribución modificada
  const handleGuardarDistribucion = async () => {
    if (!tenantActual?.id) return;
    // Validar que el total no supere 100%
    if (porcentajeTotal > 100) {
      alert('El total de porcentajes no puede superar 100%');
      return;
    }
    try {
      setSaving(true);
      // Actualizar cada comisión con el nuevo porcentaje y monto
      for (const dist of distribucionLocal) {
        if (dist.comisionOriginal && !dist.esNuevo) {
          await updateComision(tenantActual.id, ventaId, dist.id, {
            monto: dist.monto,
            porcentaje: (Number(venta.porcentaje_comision) || 0) * dist.porcentaje / 100,
            datos_extra: {
              ...dist.comisionOriginal.datos_extra,
              porcentajeSplit: dist.porcentaje,
              distribucionPersonalizada: true,
              fechaPersonalizacion: new Date().toISOString(),
            },
          });
        }
      }
      await loadComisiones();
      setModoEdicion(false);
    } catch (err: any) {
      console.error('Error guardando distribución:', err);
      alert('Error al guardar la distribución: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };
  // Cancelar edición
  const handleCancelarEdicion = () => {
    sincronizarDistribucionLocal(comisiones);
    setModoEdicion(false);
  };
  // Recalcular comisiones desde splits por defecto
  const handleRecalcularComisiones = async () => {
    if (!tenantActual?.id || !ventaId) return;
    if (!window.confirm('¿Recalcular comisiones? Esto sobrescribirá la distribución actual con los splits por defecto de cada participante.')) {
      return;
    }
    try {
      setRecalculando(true);
      setError(null);
      await recalcularComisionesVenta(tenantActual.id, ventaId);
      await loadComisiones();
    } catch (err: any) {
      console.error('Error recalculando comisiones:', err);
      setError('Error al recalcular: ' + (err.message || 'Error desconocido'));
    } finally {
      setRecalculando(false);
    }
  };
  // Abrir modal de pago para una comisión específica
  const handleAbrirPago = (comision: Comision, tipo: 'cobro' | 'pago' = 'pago') => {
    setComisionParaPago(comision);
    setModalTipo(tipo);
    setShowAplicarPagoModal(true);
  };
  // Abrir modal de cobro general (entrada de dinero a la empresa)
  const handleAbrirCobroGeneral = () => {
    // Para cobro general, usamos la primera comisión de empresa/owner como referencia
    const comisionEmpresa = comisiones.find(c =>
      c.tipo_participante === 'owner' || c.tipo_participante === 'empresa' ||
      c.datos_extra?.split === 'owner' || c.datos_extra?.split === 'empresa'
    );
    if (comisionEmpresa) {
      setComisionParaPago(comisionEmpresa);
      setModalTipo('cobro');
      setShowAplicarPagoModal(true);
    } else if (comisiones.length > 0) {
      // Si no hay comisión de empresa, usar cualquiera como referencia
      setComisionParaPago(comisiones[0]);
      setModalTipo('cobro');
      setShowAplicarPagoModal(true);
    }
  };
  // Aplicar pago o cobro
  const handleAplicarPago = async (data: {
    monto: number;
    tipoPago: 'parcial' | 'total';
    fechaPago: string;
    notas?: string;
    recibo?: File;
  }) => {
    if (!tenantActual?.id || !comisionParaPago) {
      throw new Error('No se pudo identificar el tenant o la comisión');
    }
    try {
      setSaving(true);
      let reciboUrl: string | null = null;
      if (data.recibo) {
        const formData = new FormData();
        formData.append('file', data.recibo);
        formData.append('folder', `comisiones/${ventaId}/recibos`);
        const token = await getToken();
        const uploadResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/upload/file`,
          {
            method: 'POST',
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData,
          }
        );
        if (!uploadResponse.ok) {
          throw new Error('Error al subir recibo');
        }
        const uploadData = await uploadResponse.json();
        reciboUrl = uploadData.url;
      }
      // Crear pago con tipo de movimiento
      await createPagoComision(tenantActual.id, ventaId, {
        comision_id: comisionParaPago.id,
        monto: data.monto,
        moneda: venta.moneda,
        tipo_pago: data.tipoPago,
        fecha_pago: data.fechaPago,
        notas: data.notas || null,
        recibo_url: reciboUrl,
        registrado_por_id: user?.id || null,
        tipo_movimiento: modalTipo, // 'cobro' (entrada) o 'pago' (salida)
      });
      // Solo actualizar monto_pagado de la comisión si es un PAGO (salida a participante)
      if (modalTipo === 'pago') {
        const nuevoMontoPagado = (Number(comisionParaPago.monto_pagado) || 0) + data.monto;
        const montoTotal = Number(comisionParaPago.monto) || 0;
        let nuevoEstado = 'parcial';
        if (nuevoMontoPagado >= montoTotal) {
          nuevoEstado = 'pagado';
        } else if (nuevoMontoPagado === 0) {
          nuevoEstado = 'pendiente';
        }
        await updateComision(tenantActual.id, ventaId, comisionParaPago.id, {
          monto_pagado: nuevoMontoPagado,
          fecha_pago: nuevoEstado === 'pagado' ? data.fechaPago : null,
          estado: nuevoEstado,
        });
      }
      await loadComisiones();
      await loadPagos();
      setShowAplicarPagoModal(false);
      setComisionParaPago(null);
    } catch (err: any) {
      console.error('Error aplicando pago:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const symbols: Record<string, string> = { USD: '$', DOP: 'RD$', EUR: '€' };
    const symbol = symbols[currency] || currency;
    const formatted = parseFloat(amount.toString()).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol} ${formatted}`;
  };
  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      vendedor: 'Vendedor',
      captador: 'Captador',
      referidor: 'Referidor',
      vendedor_externo: 'Asesor Externo',
      mentor: 'Mentor',
      lider: 'Líder',
      empresa: 'Empresa',
      owner: 'Empresa',
    };
    return labels[tipo] || tipo;
  };
  const getTipoColor = (tipo: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      vendedor: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
      captador: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      referidor: { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
      vendedor_externo: { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
      mentor: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      lider: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
      empresa: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
      owner: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
    };
    return colors[tipo] || colors.vendedor;
  };
  // Consolidar historial separando cobros y pagos
  const consolidarHistorialPagos = useCallback(() => {
    const cobros: any[] = [];
    const pagosSalida: any[] = [];
    pagos.forEach((pago: any) => {
      const fechaRegistro = pago.fecha_registro
        ? new Date(pago.fecha_registro).toISOString()
        : new Date().toISOString();
      const fechaPago = pago.fecha_pago
        ? new Date(pago.fecha_pago).toISOString().split('T')[0]
        : '';
      const item = {
        id: pago.id,
        fecha: fechaPago,
        monto: Number(pago.monto),
        tipoPago: pago.tipo_pago || 'parcial',
        tipoMovimiento: pago.tipo_movimiento || 'cobro', // Por defecto asumimos cobro para registros viejos
        notas: pago.notas || null,
        reciboUrl: pago.recibo_url || null,
        fechaRegistro: fechaRegistro,
        participante: pago.participante_nombre || null,
      };
      // Separar por tipo de movimiento
      if (pago.tipo_movimiento === 'pago') {
        pagosSalida.push(item);
      } else {
        cobros.push(item);
      }
    });
    // Ordenar por fecha más reciente primero
    const sortByDate = (a: any, b: any) =>
      new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime();
    return {
      cobros: cobros.sort(sortByDate),
      pagos: pagosSalida.sort(sortByDate),
      todos: [...cobros, ...pagosSalida].sort(sortByDate)
    };
  }, [pagos]);
  const historial = consolidarHistorialPagos();
  // Función para descargar archivo desde URL externa
  const handleDescargarRecibo = async (url: string, nombreArchivo?: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      // Extraer nombre del archivo de la URL o usar uno por defecto
      const fileName = nombreArchivo || url.split('/').pop() || 'recibo';
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Limpiar el blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error descargando archivo:', error);
      // Fallback: abrir en nueva pestaña si falla la descarga
      window.open(url, '_blank');
    }
  };
  if (loading && comisiones.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
      </div>
    );
  }
  return (
    <div style={{ padding: '24px' }}>
      {/* Header con resumen - 4 tarjetas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {/* Monto de Cierre con % de comisión */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #93c5fd',
          borderRadius: '12px',
          padding: '14px',
          position: 'relative'
        }}>
          {/* Badge de porcentaje */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.6875rem',
            fontWeight: 700
          }}>
            {porcentajeComision}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#1e40af', marginBottom: '2px' }}>
                Monto de Cierre
              </p>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e3a8a' }}>
                {formatCurrency(venta.valor_cierre, venta.moneda)}
              </p>
            </div>
          </div>
        </div>
        {/* Comisión Total a Cobrar */}
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: '1px solid #6ee7b7',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#065f46', marginBottom: '2px' }}>
                Comisión Total
              </p>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#047857' }}>
                {formatCurrency(montoComisionTotal, venta.moneda)}
              </p>
            </div>
          </div>
        </div>
        {/* Cobrado (entrada de dinero del cliente) - clickeable solo para admin */}
        <div style={{
          background: totalPendienteCobrar > 0
            ? 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)'
            : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: `1px solid ${totalPendienteCobrar > 0 ? '#fde047' : '#86efac'}`,
          borderRadius: '12px',
          padding: '14px',
          cursor: (esAdmin && totalPendienteCobrar > 0) ? 'pointer' : 'default',
          transition: 'transform 0.15s, box-shadow 0.15s'
        }}
          onClick={(esAdmin && totalPendienteCobrar > 0) ? handleAbrirCobroGeneral : undefined}
          onMouseOver={(e) => {
            if (esAdmin && totalPendienteCobrar > 0) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: totalPendienteCobrar > 0
                ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <ArrowDownCircle className="w-4 h-4" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: totalPendienteCobrar > 0 ? '#854d0e' : '#166534',
                marginBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {totalPendienteCobrar > 0 ? 'Por Cobrar' : 'Cobrado'}
                {esAdmin && totalPendienteCobrar > 0 && (
                  <span style={{ fontSize: '0.625rem', opacity: 0.8 }}>• Click para registrar</span>
                )}
              </p>
              <p style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: totalPendienteCobrar > 0 ? '#a16207' : '#15803d'
              }}>
                {formatCurrency(totalPendienteCobrar > 0 ? totalPendienteCobrar : totalCobradoDelCliente, venta.moneda)}
              </p>
              {totalCobradoDelCliente > 0 && totalPendienteCobrar > 0 && (
                <p style={{ fontSize: '0.625rem', color: '#78716c' }}>
                  Cobrado: {formatCurrency(totalCobradoDelCliente, venta.moneda)}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Por Pagar a Participantes (salida de dinero) */}
        <div style={{
          background: totalPendientePagar > 0
            ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
            : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: `1px solid ${totalPendientePagar > 0 ? '#fca5a5' : '#86efac'}`,
          borderRadius: '12px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: totalPendientePagar > 0
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <ArrowUpCircle className="w-4 h-4" />
            </div>
            <div>
              <p style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: totalPendientePagar > 0 ? '#991b1b' : '#166534',
                marginBottom: '2px'
              }}>
                {totalPendientePagar > 0 ? 'Por Pagar' : 'Todo Pagado'}
              </p>
              <p style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: totalPendientePagar > 0 ? '#dc2626' : '#15803d'
              }}>
                {formatCurrency(totalPendientePagar > 0 ? totalPendientePagar : totalPagadoAParticipantes, venta.moneda)}
              </p>
              {totalPagadoAParticipantes > 0 && totalPendientePagar > 0 && (
                <p style={{ fontSize: '0.625rem', color: '#78716c' }}>
                  Pagado: {formatCurrency(totalPagadoAParticipantes, venta.moneda)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '12px'
      }}>
        <button
          onClick={() => setTabActivo('distribucion')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: tabActivo === 'distribucion'
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'transparent',
            color: tabActivo === 'distribucion' ? 'white' : '#64748b',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Users className="w-4 h-4" />
          Distribución
        </button>
        <button
          onClick={() => setTabActivo('historial')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: tabActivo === 'historial'
              ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
              : 'transparent',
            color: tabActivo === 'historial' ? 'white' : '#64748b',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <History className="w-4 h-4" />
          Histórico
          {historial.todos.length > 0 && (
            <span style={{
              background: tabActivo === 'historial' ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.75rem'
            }}>
              {historial.todos.length}
            </span>
          )}
        </button>
      </div>
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#991b1b'
        }}>
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {/* Tab: Distribución */}
      {tabActivo === 'distribucion' && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {/* Header de distribución */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                Distribución de Comisión
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {modoEdicion ? 'Editando distribución - los cambios no se guardan automáticamente' : 'Click en Editar para modificar porcentajes'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {modoEdicion ? (
                <>
                  <button
                    onClick={handleCancelarEdicion}
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      color: '#64748b',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      cursor: 'pointer'
                    }}
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarDistribucion}
                    disabled={saving || porcentajeTotal > 100}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: porcentajeTotal > 100
                        ? '#94a3b8'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      cursor: porcentajeTotal > 100 ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1
                    }}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleRecalcularComisiones}
                    disabled={recalculando}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      color: '#64748b',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      opacity: recalculando ? 0.7 : 1
                    }}
                  >
                    <RefreshCw className={`w-4 h-4 ${recalculando ? 'animate-spin' : ''}`} />
                    {recalculando ? 'Recalculando...' : 'Recalcular'}
                  </button>
                  <button
                    onClick={() => setModoEdicion(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Percent className="w-4 h-4" />
                    Editar
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Lista de participantes */}
          <div style={{ padding: '16px 20px' }}>
            {distribucionLocal.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#64748b'
              }}>
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p style={{ marginBottom: '8px' }}>No hay participantes en la distribución</p>
                <button
                  onClick={handleRecalcularComisiones}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Generar distribución automática
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Header de columnas - solo visible en modo normal */}
                {!modoEdicion && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 110px 80px 55px 60px 60px',
                    gap: '8px',
                    padding: '0 16px 8px',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Participante</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Monto</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Pagado</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Pend.</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>%</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Estado</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}></span>
                  </div>
                )}
                {distribucionLocal.map((dist) => {
                  const color = getTipoColor(dist.tipo);
                  const comisionOriginal = dist.comisionOriginal;
                  const montoPagado = Number(comisionOriginal?.monto_pagado) || 0;
                  const montoPendiente = dist.monto - montoPagado;
                  return (
                    <div
                      key={dist.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: modoEdicion ? '1fr auto' : '1fr 100px 110px 80px 55px 60px 60px',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        background: modoEdicion ? '#fefce8' : 'white',
                        borderRadius: '8px',
                        border: modoEdicion ? '2px dashed #fbbf24' : '1px solid #e2e8f0',
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* Columna 1: Badge + Nombre */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{
                          fontSize: '0.5625rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          background: color.bg,
                          color: color.text,
                          border: `1px solid ${color.border}`,
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          {getTipoLabel(dist.tipo)}
                        </span>
                        <span style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {dist.nombre}
                        </span>
                      </div>
                      {!modoEdicion && (
                        <>
                          {/* Columna 2: Monto */}
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 700,
                              color: '#0f172a'
                            }}>
                              {formatCurrency(dist.monto, venta.moneda)}
                            </span>
                          </div>
                          {/* Columna 3: Pagado */}
                          <div style={{ textAlign: 'center' }}>
                            {montoPagado > 0 ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: montoPendiente <= 0 ? '#059669' : '#0284c7',
                                background: montoPendiente <= 0 ? '#ecfdf5' : '#f0f9ff',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                border: `1px solid ${montoPendiente <= 0 ? '#a7f3d0' : '#bae6fd'}`
                              }}>
                                {montoPendiente <= 0 && <span>✓</span>}
                                {formatCurrency(montoPagado, venta.moneda)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>—</span>
                            )}
                          </div>
                          {/* Columna 4: Pendiente */}
                          <div style={{ textAlign: 'right' }}>
                            {montoPendiente > 0 && montoPagado > 0 ? (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#dc2626'
                              }}>
                                -{formatCurrency(montoPendiente, venta.moneda)}
                              </span>
                            ) : montoPendiente > 0 ? (
                              <span style={{ fontSize: '0.625rem', color: '#f59e0b', fontWeight: 500 }}>
                                Pend.
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>—</span>
                            )}
                          </div>
                          {/* Columna 5: Porcentaje */}
                          <div style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#475569',
                              background: '#f1f5f9',
                              padding: '3px 8px',
                              borderRadius: '5px'
                            }}>
                              {dist.porcentaje}%
                            </span>
                          </div>
                          {/* Columna 6: Estado */}
                          <div style={{ textAlign: 'center' }}>
                            {comisionOriginal && (
                              <span style={{
                                fontSize: '0.625rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                background: comisionOriginal.estado === 'pagado'
                                  ? '#dcfce7'
                                  : comisionOriginal.estado === 'parcial'
                                    ? '#fef3c7'
                                    : '#fef2f2',
                                color: comisionOriginal.estado === 'pagado'
                                  ? '#166534'
                                  : comisionOriginal.estado === 'parcial'
                                    ? '#92400e'
                                    : '#991b1b'
                              }}>
                                {comisionOriginal.estado === 'pagado' ? '✓ Pagado' :
                                  comisionOriginal.estado === 'parcial' ? 'Parcial' : 'Pend.'}
                              </span>
                            )}
                          </div>
                          {/* Columna 7: Acción - solo visible para admin */}
                          <div style={{ textAlign: 'center' }}>
                            {esAdmin && comisionOriginal && montoPendiente > 0 ? (
                              <button
                                onClick={() => handleAbrirPago(comisionOriginal)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '5px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: 'white',
                                  fontWeight: 600,
                                  fontSize: '0.625rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Pagar
                              </button>
                            ) : null}
                          </div>
                        </>
                      )}
                      {/* Modo edición: Input de porcentaje */}
                      {modoEdicion && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            value={dist.porcentaje}
                            onChange={(e) => handlePorcentajeChange(dist.id, parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.5"
                            style={{
                              width: '70px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '2px solid #fbbf24',
                              background: 'white',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              textAlign: 'right',
                              outline: 'none'
                            }}
                          />
                          <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>%</span>
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            minWidth: '90px',
                            textAlign: 'right'
                          }}>
                            = {formatCurrency(dist.monto, venta.moneda)}
                          </span>
                          <button
                            onClick={() => handleEliminarParticipante(dist.id)}
                            style={{
                              padding: '5px',
                              borderRadius: '5px',
                              border: 'none',
                              background: '#fee2e2',
                              color: '#dc2626',
                              cursor: 'pointer'
                            }}
                            title="Eliminar participante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Footer con total */}
          {distribucionLocal.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              background: porcentajeTotal > 100 ? '#fef2f2' : '#f0fdf4',
              borderTop: `2px solid ${porcentajeTotal > 100 ? '#fca5a5' : '#86efac'}`
            }}>
              <div>
                <p style={{
                  fontSize: '0.75rem',
                  color: porcentajeTotal > 100 ? '#991b1b' : '#166534',
                  marginBottom: '2px'
                }}>
                  {porcentajeTotal > 100
                    ? '⚠️ El total excede 100%'
                    : porcentajeTotal < 100
                      ? `Disponible: ${(100 - porcentajeTotal).toFixed(1)}%`
                      : '✓ Distribución completa'}
                </p>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Total Distribuido</p>
                  <p style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: porcentajeTotal > 100 ? '#dc2626' : '#1e293b'
                  }}>
                    {porcentajeTotal.toFixed(1)}%
                  </p>
                </div>
                <div style={{
                  width: '2px',
                  height: '40px',
                  background: '#e2e8f0'
                }} />
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Monto Total</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
                    {formatCurrency(distribucionLocal.reduce((sum, d) => sum + d.monto, 0), venta.moneda)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Tab: Histórico de Cobros y Pagos */}
      {tabActivo === 'historial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sección de Cobros (Entradas) */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              borderBottom: '1px solid #6ee7b7',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ArrowDownCircle className="w-5 h-5" style={{ color: '#059669' }} />
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#065f46' }}>
                  Cobros (Entradas)
                </h4>
                <span style={{
                  background: '#059669',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {historial.cobros.length}
                </span>
              </div>
              {esAdmin && totalPendienteCobrar > 0 && (
                <button
                  onClick={handleAbrirCobroGeneral}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowDownCircle className="w-3 h-3" />
                  Registrar Cobro
                </button>
              )}
            </div>
            {historial.cobros.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: '#64748b'
              }}>
                <ArrowDownCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p style={{ fontSize: '0.875rem' }}>No hay cobros registrados</p>
                {totalPendienteCobrar > 0 && (
                  <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    Pendiente por cobrar: {formatCurrency(totalPendienteCobrar, venta.moneda)}
                  </p>
                )}
              </div>
            ) : (
              <div style={{ padding: '12px 16px' }}>
                {historial.cobros.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: idx % 2 === 0 ? '#f0fdf4' : 'white',
                      borderRadius: '8px',
                      marginBottom: '6px',
                      border: '1px solid #dcfce7'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <ArrowDownCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#065f46' }}>
                          +{formatCurrency(item.monto, venta.moneda)}
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {item.fecha ? new Date(item.fecha).toLocaleDateString('es-DO', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          }) : 'Sin fecha'}
                          {item.notas && ` • ${item.notas}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.reciboUrl ? (
                        <>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#dcfce7',
                            color: '#166534',
                            fontSize: '0.625rem',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <FileCheck className="w-2.5 h-2.5" />
                            Adjunto
                          </span>
                          <a
                            href={item.reciboUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #86efac',
                              background: 'white',
                              color: '#166534',
                              fontSize: '0.6875rem',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                            title="Ver recibo"
                          >
                            <Eye className="w-3 h-3" />
                            Ver
                          </a>
                          <button
                            onClick={() => handleDescargarRecibo(item.reciboUrl, `recibo-cobro-${item.id}.${item.reciboUrl.split(".").pop()}`)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #86efac',
                              background: '#f0fdf4',
                              color: '#166534',
                              fontSize: '0.6875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                            title="Descargar recibo"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          color: '#94a3b8',
                          fontSize: '0.625rem',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <FileX className="w-2.5 h-2.5" />
                          Sin adjunto
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Sección de Pagos (Salidas a participantes) */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              borderBottom: '1px solid #fca5a5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ArrowUpCircle className="w-5 h-5" style={{ color: '#dc2626' }} />
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#991b1b' }}>
                  Pagos a Participantes (Salidas)
                </h4>
                <span style={{
                  background: '#dc2626',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {historial.pagos.length}
                </span>
              </div>
            </div>
            {historial.pagos.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: '#64748b'
              }}>
                <ArrowUpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p style={{ fontSize: '0.875rem' }}>No hay pagos registrados</p>
                <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  Los pagos a participantes se registran desde la pestaña Distribución
                </p>
              </div>
            ) : (
              <div style={{ padding: '12px 16px' }}>
                {historial.pagos.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: idx % 2 === 0 ? '#fef2f2' : 'white',
                      borderRadius: '8px',
                      marginBottom: '6px',
                      border: '1px solid #fecaca'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <ArrowUpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#991b1b' }}>
                          -{formatCurrency(item.monto, venta.moneda)}
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {item.fecha ? new Date(item.fecha).toLocaleDateString('es-DO', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          }) : 'Sin fecha'}
                          {item.participante && ` • ${item.participante}`}
                          {item.notas && ` • ${item.notas}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.reciboUrl ? (
                        <>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            fontSize: '0.625rem',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <FileCheck className="w-2.5 h-2.5" />
                            Adjunto
                          </span>
                          <a
                            href={item.reciboUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fca5a5',
                              background: 'white',
                              color: '#991b1b',
                              fontSize: '0.6875rem',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                            title="Ver recibo"
                          >
                            <Eye className="w-3 h-3" />
                            Ver
                          </a>
                          <button
                            onClick={() => handleDescargarRecibo(item.reciboUrl, `recibo-pago-${item.id}.${item.reciboUrl.split(".").pop()}`)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fca5a5',
                              background: '#fef2f2',
                              color: '#991b1b',
                              fontSize: '0.6875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                            title="Descargar recibo"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          color: '#94a3b8',
                          fontSize: '0.625rem',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <FileX className="w-2.5 h-2.5" />
                          Sin adjunto
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal Aplicar Pago/Cobro */}
      {showAplicarPagoModal && comisionParaPago && (
        <ModalAplicarPago
          isOpen={showAplicarPagoModal}
          onClose={() => {
            setShowAplicarPagoModal(false);
            setComisionParaPago(null);
          }}
          onApply={async (data) => {
            try {
              await handleAplicarPago(data);
            } catch (err: any) {
              alert(err.message || 'Error al aplicar el pago');
              throw err;
            }
          }}
          montoAdeudado={modalTipo === 'cobro' ? totalPendienteCobrar : (Number(comisionParaPago.monto) || 0)}
          montoPagado={modalTipo === 'cobro' ? totalCobradoDelCliente : (Number(comisionParaPago.monto_pagado) || 0)}
          moneda={venta.moneda}
          comisionId={comisionParaPago.id}
          loading={saving}
          titulo={modalTipo === 'cobro' ? 'Registrar Cobro' : 'Registrar Pago'}
          descripcion={modalTipo === 'cobro'
            ? 'Registra el dinero recibido del cliente por concepto de comisión'
            : 'Registra el pago realizado al participante'}
        />
      )}
    </div>
  );
};
export default CrmFinanzasVentaComisiones;
