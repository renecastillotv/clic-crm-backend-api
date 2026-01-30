/**
 * CrmFinanzasComisiones - Listado optimizado de comisiones
 *
 * Módulo para visualizar todas las comisiones con filtros por:
 * - Usuario (Mis comisiones, Todo el equipo, Empresa, Usuario específico)
 * - Rol (Vendedor, Captador, Referidor, Empresa, Asesor externo)
 * - Estado (Pagado, Parcial, Pendiente)
 *
 * Usa endpoint optimizado que trae todo en una sola query
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getComisionesAgregadas,
  getComisionesResumen,
  getUsuariosTenant,
  createPagoComision,
  ComisionCompleta,
  ComisionesResumen,
  ComisionesFiltros,
  UsuarioTenant,
} from '../../services/api';
import ModalAplicarPago from '../../components/ModalAplicarPago';
import {
  DollarSign,
  Search,
  Users,
  Building2,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  UserCheck,
  Share2,
  Building,
  ExternalLink,
  X,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';

// Tipos de filtros de usuario
type FiltroUsuarioTipo = 'mis_comisiones' | 'todo_equipo' | 'empresa' | 'usuario_especifico';

// Roles disponibles
const ROLES_DISPONIBLES = [
  { value: '', label: 'Todos los roles', icon: Users },
  { value: 'vendedor', label: 'Vendedor', icon: Briefcase },
  { value: 'captador', label: 'Captador', icon: UserCheck },
  { value: 'referidor', label: 'Referidor', icon: Share2 },
  { value: 'owner', label: 'Empresa', icon: Building },
  { value: 'vendedor_externo', label: 'Asesor Externo', icon: ExternalLink },
];

export default function CrmFinanzasComisiones() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { tenantActual, user, tieneAcceso, isPlatformAdmin } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  // Solo admin (finanzas-config) o platform admin pueden ver filtros de equipo y aplicar pagos
  const esAdmin = isPlatformAdmin || tieneAcceso('finanzas-config');

  // Estado principal
  const [comisiones, setComisiones] = useState<ComisionCompleta[]>([]);
  const [resumen, setResumen] = useState<ComisionesResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioTenant[]>([]);

  // Filtros - usuarios normales solo ven sus comisiones, admin ve todo el equipo por defecto
  const [busqueda, setBusqueda] = useState('');
  const [filtroUsuarioTipo, setFiltroUsuarioTipo] = useState<FiltroUsuarioTipo>('mis_comisiones');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('');
  const [filtroRol, setFiltroRol] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 30;

  // Modal de pago
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [comisionSeleccionada, setComisionSeleccionada] = useState<ComisionCompleta | null>(null);
  const [loadingPago, setLoadingPago] = useState(false);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: 'Comisiones',
      subtitle: 'Seguimiento de comisiones por ventas',
      actions: null,
    });
  }, [setPageHeader]);

  // Construir filtros para API
  const buildFiltros = useCallback((): ComisionesFiltros => {
    const filtros: ComisionesFiltros = {
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
    };

    // Filtro de usuario
    if (filtroUsuarioTipo === 'mis_comisiones' && user?.id) {
      filtros.usuario_id = user.id;
      filtros.include_empresa = false;
    } else if (filtroUsuarioTipo === 'empresa') {
      filtros.rol = 'owner';
    } else if (filtroUsuarioTipo === 'usuario_especifico' && usuarioSeleccionado) {
      filtros.usuario_id = usuarioSeleccionado;
      filtros.include_empresa = false;
    }

    // Filtro de rol (solo si no está forzado por filtroUsuarioTipo)
    if (filtroRol && filtroUsuarioTipo !== 'empresa') {
      filtros.rol = filtroRol as any;
    }

    // Filtro de estado
    if (filtroEstado) {
      filtros.estado = filtroEstado as any;
    }

    return filtros;
  }, [filtroUsuarioTipo, user?.id, usuarioSeleccionado, filtroRol, filtroEstado, currentPage, itemsPerPage]);

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const filtros = buildFiltros();

      // Cargar comisiones y resumen en paralelo (usuarios se cargan por separado)
      const [comisionesData, resumenData] = await Promise.all([
        getComisionesAgregadas(tenantActual.id, filtros, token),
        getComisionesResumen(tenantActual.id, {
          usuario_id: filtros.usuario_id,
          rol: filtros.rol,
          estado: filtros.estado,
          include_empresa: filtros.include_empresa,
        }, token),
      ]);

      setComisiones(comisionesData.comisiones);
      setTotalItems(comisionesData.pagination.total);
      setResumen(resumenData);
    } catch (err: any) {
      console.error('Error cargando comisiones:', err);
      setError(err.message || 'Error al cargar las comisiones');
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken, buildFiltros]);


  // Cargar usuarios solo una vez al montar (separado para evitar loop infinito)
  useEffect(() => {
    const cargarUsuarios = async () => {
      if (!tenantActual?.id) return;
      try {
        const token = await getToken();
        const usuariosData = await getUsuariosTenant(tenantActual.id, token);
        if (Array.isArray(usuariosData) && usuariosData.length > 0) {
          setUsuarios(usuariosData);
        }
      } catch (err) {
        console.error('Error cargando usuarios:', err);
      }
    };
    cargarUsuarios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantActual?.id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Resetear página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroUsuarioTipo, usuarioSeleccionado, filtroRol, filtroEstado]);

  // Filtrar por búsqueda local (después de cargar)
  const comisionesFiltradas = useMemo(() => {
    if (!busqueda) return comisiones;

    const searchLower = busqueda.toLowerCase();
    return comisiones.filter(c => {
      const nombreVenta = c.venta?.nombre?.toLowerCase() || '';
      const nombreUsuario = c.nombre_display?.toLowerCase() || '';
      return nombreVenta.includes(searchLower) || nombreUsuario.includes(searchLower);
    });
  }, [comisiones, busqueda]);

  // Paginación
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const symbols: Record<string, string> = {
      USD: '$',
      DOP: 'RD$',
      EUR: '€',
    };
    const symbol = symbols[currency] || currency;
    const formatted = parseFloat(amount.toString()).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol} ${formatted}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pagado':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            background: '#dcfce7',
            color: '#166534',
          }}>
            <CheckCircle size={14} />
            Pagado
          </span>
        );
      case 'parcial':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            background: '#fef3c7',
            color: '#92400e',
          }}>
            <Clock size={14} />
            Parcial
          </span>
        );
      case 'pendiente':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            background: '#fee2e2',
            color: '#991b1b',
          }}>
            <Clock size={14} />
            Pendiente
          </span>
        );
    }
  };

  const getRolBadge = (rol: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      vendedor: { bg: '#dbeafe', text: '#1e40af', label: 'Vendedor' },
      captador: { bg: '#fef3c7', text: '#92400e', label: 'Captador' },
      referidor: { bg: '#f3e8ff', text: '#7c3aed', label: 'Referidor' },
      owner: { bg: '#f1f5f9', text: '#475569', label: 'Empresa' },
      empresa: { bg: '#f1f5f9', text: '#475569', label: 'Empresa' },
      vendedor_externo: { bg: '#ecfdf5', text: '#065f46', label: 'Asesor Ext.' },
    };
    const c = config[rol] || { bg: '#f1f5f9', text: '#475569', label: rol };

    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        background: c.bg,
        color: c.text,
        textTransform: 'uppercase',
      }}>
        {c.label}
      </span>
    );
  };

  // Verificar si hay filtros activos
  const hayFiltrosActivos = filtroUsuarioTipo !== 'todo_equipo' || filtroRol || filtroEstado;

  const limpiarFiltros = () => {
    setFiltroUsuarioTipo('todo_equipo');
    setUsuarioSeleccionado('');
    setFiltroRol('');
    setFiltroEstado('');
    setBusqueda('');
  };

  // Abrir modal de pago para una comisión
  const abrirModalPago = (comision: ComisionCompleta) => {
    setComisionSeleccionada(comision);
    setModalPagoAbierto(true);
  };

  // Verificar si se puede pagar una comisión
  // Solo se puede pagar si la venta tiene cobros registrados (estado_cobro !== 'pendiente')
  const puedePagar = (comision: ComisionCompleta) => {
    // No mostrar botón si ya está pagada o si es de empresa
    if (comision.estado === 'pagado' || comision.es_empresa) return false;

    // Verificar que haya monto habilitado (proporcional a lo cobrado)
    const montoDisponible = (comision.monto_habilitado || 0) - (comision.monto_pagado || 0);
    if (montoDisponible <= 0) return false;

    return true;
  };

  // Verificar si la venta tiene cobros
  // Verifica múltiples indicadores: estado_cobro, monto_cobrado, monto_habilitado
  const tieneCobroRegistrado = (comision: ComisionCompleta) => {
    // Verificar estado_cobro de la venta
    if (comision.venta?.estado_cobro && comision.venta.estado_cobro !== 'pendiente') {
      return true;
    }
    // Verificar si hay monto cobrado en la venta
    if (comision.venta?.monto_cobrado && comision.venta.monto_cobrado > 0) {
      return true;
    }
    // Verificar si hay monto habilitado en la comisión (indica que hay cobros)
    if (comision.monto_habilitado && comision.monto_habilitado > 0) {
      return true;
    }
    return false;
  };

  // Manejar aplicación de pago
  const handleAplicarPago = async (data: {
    monto: number;
    tipoPago: 'parcial' | 'total';
    fechaPago: string;
    notas?: string;
    recibo?: File;
  }) => {
    if (!comisionSeleccionada || !tenantActual?.id) return;

    try {
      setLoadingPago(true);
      const token = await getToken();

      await createPagoComision(
        tenantActual.id,
        comisionSeleccionada.venta_id,
        {
          comision_id: comisionSeleccionada.id,
          monto: data.monto,
          moneda: comisionSeleccionada.moneda,
          tipo_pago: data.tipoPago,
          fecha_pago: data.fechaPago,
          notas: data.notas,
          tipo_movimiento: 'pago', // Es un pago a participante
        },
        token
      );

      // Cerrar modal y recargar datos
      setModalPagoAbierto(false);
      setComisionSeleccionada(null);
      await cargarDatos();
    } catch (err: any) {
      console.error('Error aplicando pago:', err);
      alert(err.message || 'Error al aplicar el pago');
    } finally {
      setLoadingPago(false);
    }
  };

  if (loading && comisiones.length === 0) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#667eea' }} />
          <p style={{ marginTop: '16px', color: '#64748b' }}>Cargando comisiones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <AlertCircle size={24} color="#dc2626" />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#991b1b' }}>Error</h3>
            <p style={{ margin: '4px 0 0', color: '#dc2626' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Stats Cards - Diferentes para admin vs usuario regular */}
      {esAdmin ? (
        /* Vista Admin: 5 tarjetas con info completa de flujo de dinero */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}>
          {/* 1. Total Proyectado (lo que se espera recibir en total) */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <DollarSign size={20} />
              <div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Total Proyectado</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {formatCurrency(resumen?.montos.total_proyectado || 0)}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                  {resumen?.estados.total || 0} comisiones
                </div>
              </div>
            </div>
          </div>

          {/* 2. Cobrado del Cliente (dinero que ya entró) */}
          <div style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={20} />
              <div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Cobrado Cliente</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {formatCurrency(resumen?.montos.total_cobrado || 0)}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                  Dinero recibido
                </div>
              </div>
            </div>
          </div>

          {/* 3. Habilitado para Pagar (proporcional a lo cobrado) */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={20} />
              <div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Habilitado</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {formatCurrency(resumen?.montos.total_habilitado || 0)}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                  Disponible para pagar
                </div>
              </div>
            </div>
          </div>

          {/* 4. Pagado a Participantes (dinero que ya salió) */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} />
              <div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Pagado</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {formatCurrency(resumen?.montos.total_pagado || 0)}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                  {resumen?.estados.pagadas || 0} completas
                </div>
              </div>
            </div>
          </div>

          {/* 5. Pendiente por Pagar (habilitado - pagado) */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} />
              <div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Pendiente Pagar</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {formatCurrency(resumen?.montos.pendiente_cobro || 0)}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                  {resumen?.estados.parciales || 0} parciales / {resumen?.estados.pendientes || 0} pend.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vista Usuario: 4 tarjetas con info personal de comisiones */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}>
          {/* 1. Mi Comisión Generada (total de mis comisiones) */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '20px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DollarSign size={24} />
              <div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Mi Comisión Generada</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>
                  {formatCurrency(resumen?.montos.total_proyectado || 0)}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                  {resumen?.estados.total || 0} participaciones en ventas
                </div>
              </div>
            </div>
          </div>

          {/* 2. Mi Comisión Cobrada (lo que ya me pagaron) */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '12px',
            padding: '20px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={24} />
              <div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Mi Comisión Cobrada</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>
                  {formatCurrency(resumen?.montos.total_pagado || 0)}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                  {resumen?.estados.pagadas || 0} comisiones completas
                </div>
              </div>
            </div>
          </div>

          {/* 3. Mi Comisión Por Cobrar (lo que me falta recibir) */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '12px',
            padding: '20px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={24} />
              <div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Mi Comisión Por Cobrar</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>
                  {formatCurrency((resumen?.montos.total_proyectado || 0) - (resumen?.montos.total_pagado || 0))}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                  {(resumen?.estados.pendientes || 0) + (resumen?.estados.parciales || 0)} pendientes de pago
                </div>
              </div>
            </div>
          </div>

          {/* 4. Proyectado a Cobrar (basado en fechas de entrega de proyectos) */}
          <div style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            borderRadius: '12px',
            padding: '20px',
            color: 'white',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <TrendingUp size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Proyectado a Cobrar</div>
                {/* Desglose por período */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', opacity: 0.85 }}>Próx. Trimestre:</span>
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>
                      {formatCurrency(resumen?.proyecciones?.proximo_trimestre || 0)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', opacity: 0.85 }}>Resto del Año:</span>
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>
                      {formatCurrency(resumen?.proyecciones?.resto_año || 0)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', opacity: 0.85 }}>Próximo Año:</span>
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>
                      {formatCurrency(resumen?.proyecciones?.proximo_año || 0)}
                    </span>
                  </div>
                </div>
                <div style={{
                  fontSize: '10px',
                  opacity: 0.7,
                  marginTop: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.2)',
                  paddingTop: '6px'
                }}>
                  Basado en fechas de entrega +45 días
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Búsqueda */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar por venta o participante..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Filtro de usuario - solo visible para admin */}
          {esAdmin && (
            <select
              value={filtroUsuarioTipo}
              onChange={(e) => {
                setFiltroUsuarioTipo(e.target.value as FiltroUsuarioTipo);
                if (e.target.value !== 'usuario_especifico') {
                  setUsuarioSeleccionado('');
                }
              }}
              style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
                cursor: 'pointer',
                minWidth: '160px',
              }}
            >
              <option value="todo_equipo">Todo el equipo</option>
              <option value="mis_comisiones">Mis comisiones</option>
              <option value="empresa">Comisiones empresa</option>
              <option value="usuario_especifico">Usuario específico</option>
            </select>
          )}

          {/* Selector de usuario específico - solo visible para admin */}
          {esAdmin && filtroUsuarioTipo === 'usuario_especifico' && (
            <select
              value={usuarioSeleccionado}
              onChange={(e) => setUsuarioSeleccionado(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
                cursor: 'pointer',
                minWidth: '180px',
              }}
            >
              <option value="">Seleccionar usuario</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido}
                </option>
              ))}
            </select>
          )}

          {/* Filtro de rol */}
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            disabled={filtroUsuarioTipo === 'empresa'}
            style={{
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
              cursor: filtroUsuarioTipo === 'empresa' ? 'not-allowed' : 'pointer',
              opacity: filtroUsuarioTipo === 'empresa' ? 0.5 : 1,
              minWidth: '140px',
            }}
          >
            {ROLES_DISPONIBLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          {/* Filtro de estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
              cursor: 'pointer',
              minWidth: '140px',
            }}
          >
            <option value="">Todos los estados</option>
            <option value="pagado">Pagado</option>
            <option value="parcial">Parcial</option>
            <option value="pendiente">Pendiente</option>
          </select>

          {/* Botón limpiar filtros */}
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 12px',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
              Limpiar
            </button>
          )}
        </div>

        {/* Resumen por rol */}
        {resumen && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '12px', color: '#64748b', marginRight: '8px' }}>Por rol:</span>
            {resumen.roles.vendedor > 0 && (
              <span style={{ fontSize: '12px', color: '#1e40af', background: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                Vendedor: {resumen.roles.vendedor}
              </span>
            )}
            {resumen.roles.captador > 0 && (
              <span style={{ fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                Captador: {resumen.roles.captador}
              </span>
            )}
            {resumen.roles.referidor > 0 && (
              <span style={{ fontSize: '12px', color: '#7c3aed', background: '#f3e8ff', padding: '2px 8px', borderRadius: '4px' }}>
                Referidor: {resumen.roles.referidor}
              </span>
            )}
            {resumen.roles.empresa > 0 && (
              <span style={{ fontSize: '12px', color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                Empresa: {resumen.roles.empresa}
              </span>
            )}
            {resumen.roles.externo > 0 && (
              <span style={{ fontSize: '12px', color: '#065f46', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                Externo: {resumen.roles.externo}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabla de comisiones */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}>
        {comisionesFiltradas.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <DollarSign size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
              No hay comisiones
            </h3>
            <p style={{ margin: 0, color: '#64748b' }}>
              {hayFiltrosActivos
                ? 'No se encontraron comisiones con los filtros seleccionados.'
                : 'Las comisiones se generan automáticamente cuando se crean ventas.'}
            </p>
            {hayFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#667eea',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Venta</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Participante</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Rol</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Monto</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Pagado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Pendiente</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {comisionesFiltradas.map((comision) => (
                    <tr
                      key={comision.id}
                      style={{ borderBottom: '1px solid #e2e8f0' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {comision.venta?.nombre || 'Sin nombre'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {comision.venta?.fecha ? new Date(comision.venta.fecha).toLocaleDateString('es-DO', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          }) : '-'}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: comision.es_empresa ? '#475569' : '#667eea',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}>
                            {comision.es_empresa ? (
                              <Building2 size={16} />
                            ) : (
                              (comision.nombre_display?.[0] || 'U').toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: '#1e293b' }}>
                              {comision.nombre_display || 'Sin asignar'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {comision.porcentaje_split || comision.porcentaje || 0}% del total
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {getRolBadge(comision.rol)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                        {formatCurrency(comision.monto, comision.moneda)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                        {formatCurrency(comision.monto_pagado, comision.moneda)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: comision.pendiente > 0 ? '#dc2626' : '#16a34a' }}>
                        {formatCurrency(comision.pendiente, comision.moneda)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {getStatusBadge(comision.estado)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => navigate(`/crm/${tenantSlug}/finanzas/ventas/${comision.venta_id}`)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              background: 'white',
                              color: '#475569',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
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
                            <Eye size={14} />
                            Ver Venta
                          </button>

                          {/* Botón de pago - solo para admin y si hay cobros y la comisión no está pagada */}
                          {esAdmin && puedePagar(comision) && tieneCobroRegistrado(comision) && (
                            <button
                              onClick={() => abrirModalPago(comision)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                border: '1px solid #10b981',
                                borderRadius: '6px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              <CreditCard size={14} />
                              Pagar
                            </button>
                          )}

                          {/* Indicador si no hay cobros pero tiene pendiente - solo para admin */}
                          {esAdmin && puedePagar(comision) && !tieneCobroRegistrado(comision) && (
                            <span
                              title="La inmobiliaria debe registrar cobros de la venta para habilitar el pago"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: '#fef3c7',
                                color: '#92400e',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'help',
                              }}
                            >
                              <AlertTriangle size={14} />
                              Sin cobros
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderTop: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: 'white',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: 'white',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Siguiente
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de aplicar pago */}
      {comisionSeleccionada && (
        <ModalAplicarPago
          isOpen={modalPagoAbierto}
          onClose={() => {
            setModalPagoAbierto(false);
            setComisionSeleccionada(null);
          }}
          onApply={handleAplicarPago}
          montoAdeudado={comisionSeleccionada.monto_habilitado || comisionSeleccionada.monto}
          montoPagado={comisionSeleccionada.monto_pagado || 0}
          moneda={comisionSeleccionada.moneda}
          comisionId={comisionSeleccionada.id}
          loading={loadingPago}
          titulo="Registrar Pago"
          descripcion={`Pago a ${comisionSeleccionada.nombre_display} - ${comisionSeleccionada.venta?.nombre || 'Venta'}`}
        />
      )}
    </div>
  );
}
