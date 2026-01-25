/**
 * CrmFinanzasVentas - Gestión de ventas (deals)
 *
 * Módulo para gestionar ventas con:
 * - Vista de tabla
 * - Stats por estado en header
 * - Modal para crear/editar ventas
 * - Filtros por estado, usuario, tipo de operación
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import DatePicker from '../../components/DatePicker';
import DateRangeFilter, { DateRangePreset } from '../../components/DateRangeFilter';
import ContactPicker from '../../components/ContactPicker';
import UserPicker from '../../components/UserPicker';
import PropertyPicker from '../../components/PropertyPicker';
import SolicitudPicker from '../../components/SolicitudPicker';
import PropiedadesSolicitudModal, { PropiedadOpcion } from '../../components/PropiedadesSolicitudModal';
import ModalAplicarPago from '../../components/ModalAplicarPago';
import '../../components/Modal.css';
import {
  getVentas,
  createVenta,
  updateVenta,
  deleteVenta,
  getEstadosVenta,
  getPropiedadesCrm,
  getContactos,
  getUsuariosTenant,
  getTasasCambio,
  convertirAUSD,
  getComisiones,
  createComision,
  updateComision,
  getUnidadesProyecto,
  getSolicitudes,
  getPropuestas,
  Venta,
  VentaFiltros,
  EstadoVenta,
  Propiedad,
  Contacto,
  UsuarioTenant,
  TasasCambio,
  Comision,
  UnidadProyecto,
  Solicitud,
} from '../../services/api';
import { exportVentasToCSV, exportVentasToExcel } from '../../utils/exportUtils';
import {
  DollarSign,
  Plus,
  Search,
  Calendar,
  User,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Loader2,
  X,
  Edit,
  Trash2,
  Filter,
  Home,
  Download,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function CrmFinanzasVentas() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenantActual, user, tieneAcceso, isPlatformAdmin } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();

  // Solo admin (finanzas-config) o platform admin pueden ver filtros de agentes
  const esAdmin = isPlatformAdmin || tieneAcceso('finanzas-config');

  // Estado
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [usuarioFiltro, setUsuarioFiltro] = useState<string>('');
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null);
  const [estadosVenta, setEstadosVenta] = useState<EstadoVenta[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioTenant[]>([]);

  // Filtros avanzados
  const [dateRange, setDateRange] = useState<{ preset?: DateRangePreset; start?: string; end?: string }>({});
  const [showDateModal, setShowDateModal] = useState(false);
  const [showAgentsModal, setShowAgentsModal] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [tipoOperacionFiltro, setTipoOperacionFiltro] = useState<string>('');
  const [ciudadFiltro, setCiudadFiltro] = useState<string>('');
  const [sectorFiltro, setSectorFiltro] = useState<string>('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [esPropiedadExternaFiltro, setEsPropiedadExternaFiltro] = useState<string>('');
  const [showMyVentas, setShowMyVentas] = useState(false);
  const [showParticipatedVentas, setShowParticipatedVentas] = useState(false);
  const [tasasCambio, setTasasCambio] = useState<TasasCambio>({});
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAplicarPagoModal, setShowAplicarPagoModal] = useState(false);
  const [ventaParaPago, setVentaParaPago] = useState<Venta | null>(null);
  const [comisionData, setComisionData] = useState<{ montoTotal: number; montoPagado: number } | null>(null);
  const [loadingComision, setLoadingComision] = useState(false);

  // Estado para unidades de proyecto
  const [unidadesProyecto, setUnidadesProyecto] = useState<UnidadProyecto[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);

  // Estado para solicitudes
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);

  // Estado para modal de selección de propiedad desde solicitud
  const [showPropiedadesSolicitudModal, setShowPropiedadesSolicitudModal] = useState(false);
  const [propiedadesOpcionesSolicitud, setPropiedadesOpcionesSolicitud] = useState<PropiedadOpcion[]>([]);
  const [solicitudSeleccionadaTitulo, setSolicitudSeleccionadaTitulo] = useState('');

  // Form state
  const [nuevaVenta, setNuevaVenta] = useState({
    nombre_negocio: '',
    descripcion: '',
    propiedad_id: '',
    unidad_id: '',
    contacto_id: '',
    usuario_cerrador_id: user?.id || '',
    captador_id: '',
    estado_venta_id: '',
    valor_cierre: '',
    moneda: 'USD',
    porcentaje_comision: '',
    fecha_cierre: new Date().toISOString().split('T')[0],
    vendedor_externo_tipo: '',
    vendedor_externo_id: '',
    vendedor_externo_nombre: '',
    vendedor_externo_contacto: '',
    referidor_nombre: '',
    referidor_id: '',
    notas: '',
    solicitud_id: '',
  });

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Stats calculados (con conversión a USD)
  const completadas = ventas.filter(v => v.completada).length;
  const pendientes = ventas.filter(v => !v.completada && !v.cancelada).length;
  const totalMonto = ventas.reduce((sum, v) => {
    const valor = typeof v.valor_cierre === 'number' ? v.valor_cierre : parseFloat(v.valor_cierre) || 0;
    const moneda = v.moneda || 'USD';
    const valorUSD = convertirAUSD(valor, moneda, tasasCambio);
    return sum + valorUSD;
  }, 0);
  const totalComisiones = ventas.reduce((sum, v) => {
    const comision = typeof v.monto_comision === 'number' ? v.monto_comision : parseFloat(v.monto_comision || '0') || 0;
    const moneda = v.moneda || 'USD';
    const comisionUSD = convertirAUSD(comision, moneda, tasasCambio);
    return sum + comisionUSD;
  }, 0);
  const tasaExito = ventas.length > 0 ? ((completadas / ventas.length) * 100).toFixed(1) : '0';

  // Funciones de exportación
  const handleExportCSV = () => {
    setExporting(true);
    try {
      exportVentasToCSV(ventas);
    } catch (error) {
      console.error('Error al exportar a CSV:', error);
      setError('Error al exportar datos');
    } finally {
      setExporting(false);
      setShowExportDropdown(false);
    }
  };

  const handleExportExcel = () => {
    setExporting(true);
    try {
      exportVentasToExcel(ventas);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      setError('Error al exportar datos');
    } finally {
      setExporting(false);
      setShowExportDropdown(false);
    }
  };

  // Configurar header de la página - simplificado
  useEffect(() => {
    setPageHeader({
      title: 'Ventas',
      subtitle: 'El corazón de tu negocio',
      actions: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' }}>
          <div style={{ position: 'relative' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={exporting || ventas.length === 0}
              style={{ whiteSpace: 'nowrap' }}
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Exportar
                </>
              )}
            </button>
            {showExportDropdown && !exporting && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '8px',
                width: '200px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
                zIndex: 50
              }}>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  className="hover:bg-gray-50"
                  onClick={handleExportCSV}
                >
                  <FileText className="w-4 h-4 text-gray-500" />
                  Exportar a CSV
                </button>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  className="hover:bg-gray-50"
                  onClick={handleExportExcel}
                >
                  <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                  Exportar a Excel
                </button>
              </div>
            )}
          </div>
          <button 
            className="btn-primary" 
            onClick={() => openModal()}
            style={{ whiteSpace: 'nowrap' }}
          >
          <Plus className="w-4 h-4" />
          Nueva Venta
        </button>
        </div>
      ),
    });
  }, [setPageHeader, exporting, showExportDropdown, ventas.length]);

  // Cargar datos iniciales
  useEffect(() => {
    if (tenantActual?.id) {
      console.log('🔍 Cargando datos iniciales para tenant:', tenantActual.id);
      cargarEstadosVenta();
      cargarPropiedades();
      cargarContactos();
      cargarUsuarios();
      cargarTasasCambio();
    } else {
      console.warn('⚠️ No hay tenantActual disponible');
    }
  }, [tenantActual?.id]);

  // Abrir modal de edición si hay parámetro en la URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && ventas.length > 0 && !showCreateModal) {
      const ventaToEdit = ventas.find(v => v.id === editId);
      if (ventaToEdit) {
        // Usar setTimeout para asegurar que openModal esté disponible
        setTimeout(() => {
          openModal(ventaToEdit);
          // Limpiar el parámetro de la URL
          setSearchParams({});
        }, 100);
      }
    }
  }, [searchParams, ventas, showCreateModal, setSearchParams]);

  const cargarTasasCambio = async () => {
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

  // Cargar ventas
  const cargarVentas = useCallback(async () => {
    if (!tenantActual?.id) {
      console.warn('⚠️ No se puede cargar ventas: tenantActual.id no disponible');
      setError('No se pudo identificar la organización. Por favor, recarga la página.');
      setLoading(false);
      return;
    }

    try {
      console.log('📥 Cargando ventas para tenant:', tenantActual.id);
      setLoading(true);
      setError(null);

      const filtros: VentaFiltros = {
        estadoVentaId: estadoFiltro || undefined,
        usuarioId: (showMyVentas || showParticipatedVentas) && user?.id ? user.id : undefined,
        usuarioIds: (!showMyVentas && !showParticipatedVentas && usuariosSeleccionados.length > 0) ? usuariosSeleccionados : undefined,
        soloMisVentas: showMyVentas && user?.id ? true : undefined,
        soloParticipadas: showParticipatedVentas && user?.id ? true : undefined,
        tipoOperacion: tipoOperacionFiltro || undefined,
        ciudad: ciudadFiltro || undefined,
        sector: sectorFiltro || undefined,
        categoria: categoriaFiltro || undefined,
        esPropiedadExterna: esPropiedadExternaFiltro === 'internal' ? false : esPropiedadExternaFiltro === 'external' ? true : undefined,
        fechaDesde: dateRange.start || undefined,
        fechaHasta: dateRange.end || undefined,
      };

      console.log('📥 Filtros aplicados:', filtros);
      const token = await getToken();
      const data = await getVentas(tenantActual.id, filtros, token);
      console.log('✅ Ventas cargadas:', data.length);
      setVentas(data);
      
      // Si no hay ventas pero hay filtros aplicados, mostrar mensaje informativo
      if (data.length === 0 && (estadoFiltro || usuarioFiltro || dateRange.start || dateRange.end || tipoOperacionFiltro || ciudadFiltro || sectorFiltro || categoriaFiltro || esPropiedadExternaFiltro || showMyVentas || showParticipatedVentas)) {
        // No es un error, solo información
        console.log('ℹ️ No se encontraron ventas con los filtros aplicados');
      }
    } catch (err: any) {
      console.error('❌ Error cargando ventas:', err);
      
      // Mensajes de error más específicos
      let errorMessage = 'Error desconocido al cargar ventas';
      if (err.message) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
        } else if (err.message.includes('401') || err.message.includes('403')) {
          errorMessage = 'No tienes permisos para ver estas ventas.';
        } else if (err.message.includes('404')) {
          errorMessage = 'No se encontró la información solicitada.';
        } else if (err.message.includes('500')) {
          errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    tenantActual?.id, 
    estadoFiltro, 
    usuariosSeleccionados, 
    user?.id,
    dateRange,
    tipoOperacionFiltro,
    ciudadFiltro,
    sectorFiltro,
    categoriaFiltro,
    esPropiedadExternaFiltro,
    showMyVentas,
    showParticipatedVentas,
  ]);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  // Cerrar dropdown de exportación al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.relative')) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showExportDropdown]);

  const cargarEstadosVenta = async () => {
    if (!tenantActual?.id) return;
    try {
      console.log('📥 Cargando estados de venta para tenant:', tenantActual.id);
      const data = await getEstadosVenta(tenantActual.id);
      console.log('✅ Estados cargados:', data.length);
      setEstadosVenta(data);
    } catch (err: any) {
      console.error('❌ Error cargando estados:', err);
      setError(err.message || 'Error al cargar estados de venta');
    }
  };

  const cargarPropiedades = async () => {
    if (!tenantActual?.id) return;
    try {
      const response = await getPropiedadesCrm(tenantActual.id, { limit: 1000 });
      setPropiedades(response.data);
    } catch (err) {
      console.error('Error cargando propiedades:', err);
    }
  };

  const cargarContactos = async () => {
    if (!tenantActual?.id) return;
    try {
      const response = await getContactos(tenantActual.id, { limit: 1000 });
      setContactos(response.data);
    } catch (err) {
      console.error('Error cargando contactos:', err);
    }
  };

  const cargarUsuarios = async () => {
    if (!tenantActual?.id) return;
    try {
      const token = await getToken();
      const data = await getUsuariosTenant(tenantActual.id, token);
      setUsuarios(data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  };

  const cargarSolicitudes = async (solicitudIdActual?: string) => {
    if (!tenantActual?.id) return;
    setLoadingSolicitudes(true);
    try {
      const response = await getSolicitudes(tenantActual.id, { todos: true });
      // Filtrar solicitudes activas (excluir cerradas/descartadas)
      // PERO mantener la solicitud actualmente vinculada aunque esté cerrada
      const etapasInactivas = ['ganado', 'perdido', 'descartado', 'cerrado_perdido', 'cerrado_ganado'];
      const solicitudesActivas = response.data.filter(
        (s: Solicitud) => !etapasInactivas.includes(s.etapa) || s.id === solicitudIdActual
      );
      setSolicitudes(solicitudesActivas);
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Handler para cuando se selecciona una solicitud - auto-rellena campos
  const handleSolicitudChange = async (_solicitudId: string | null, solicitud?: any) => {
    if (!solicitud) {
      // Si se limpia la solicitud, solo limpiar el ID
      setNuevaVenta(prev => ({ ...prev, solicitud_id: '' }));
      return;
    }

    // Guardar el título para el modal
    setSolicitudSeleccionadaTitulo(solicitud.titulo || '');

    // Auto-rellenar campos básicos desde la solicitud (sin propiedad aún)
    const updates: any = {
      solicitud_id: solicitud.id,
    };

    // Nombre del negocio desde título de solicitud
    if (!nuevaVenta.nombre_negocio && solicitud.titulo) {
      updates.nombre_negocio = solicitud.titulo;
    }

    // Cliente desde contacto de la solicitud
    if (!nuevaVenta.contacto_id && solicitud.contacto_id) {
      updates.contacto_id = solicitud.contacto_id;
    }

    // Asesor cerrador desde el asignado de la solicitud
    if (!nuevaVenta.usuario_cerrador_id && solicitud.asignado_id) {
      updates.usuario_cerrador_id = solicitud.asignado_id;
    }

    // Valor de cierre desde valor estimado
    if (!nuevaVenta.valor_cierre && solicitud.valor_estimado) {
      updates.valor_cierre = solicitud.valor_estimado.toString();
    }

    setNuevaVenta(prev => ({ ...prev, ...updates }));

    // Obtener propiedades vinculadas a esta solicitud
    if (!tenantActual?.id) return;

    try {
      console.log('🔍 Solicitud seleccionada:', {
        id: solicitud.id,
        titulo: solicitud.titulo,
        propiedades_count: solicitud.propiedades_count,
        propiedades_preview: solicitud.propiedades_preview,
      });

      // 1. Recopilar propiedades de diferentes fuentes
      const propiedadesOpciones: PropiedadOpcion[] = [];

      // a) Propiedades directas de la solicitud (propiedades_preview)
      if (solicitud.propiedades_preview && solicitud.propiedades_preview.length > 0) {
        for (const propPreview of solicitud.propiedades_preview) {
          // Buscar la propiedad completa en el listado
          const propiedadCompleta = propiedades.find(p => p.id === propPreview.id);
          if (propiedadCompleta) {
            propiedadesOpciones.push({
              id: propiedadCompleta.id,
              titulo: propiedadCompleta.titulo,
              codigo: propiedadCompleta.codigo,
              precio: propiedadCompleta.precio,
              moneda: propiedadCompleta.moneda || 'USD',
              imagen_principal: propiedadCompleta.imagen_principal,
              tipo: propiedadCompleta.tipo,
              operacion: propiedadCompleta.operacion,
              ciudad: propiedadCompleta.ciudad,
              origen: 'directa',
            });
          } else if (propPreview.id) {
            // Si no está en el listado, usar los datos del preview
            propiedadesOpciones.push({
              id: propPreview.id,
              titulo: propPreview.titulo || 'Propiedad',
              codigo: propPreview.codigo,
              precio: propPreview.precio,
              moneda: propPreview.moneda || 'USD',
              imagen_principal: propPreview.imagen_principal,
              tipo: propPreview.tipo,
              operacion: propPreview.operacion,
              ciudad: propPreview.ciudad,
              origen: 'directa',
            });
          }
        }
      }

      // b) Propiedades de propuestas vinculadas a esta solicitud
      const propuestasResponse = await getPropuestas(tenantActual.id, { solicitud_id: solicitud.id });

      for (const propuesta of propuestasResponse.data) {
        if (propuesta.propiedades && propuesta.propiedades.length > 0) {
          for (const prop of propuesta.propiedades) {
            // Evitar duplicados
            if (!propiedadesOpciones.find(p => p.id === prop.propiedad_id)) {
              propiedadesOpciones.push({
                id: prop.propiedad_id,
                titulo: prop.titulo,
                codigo: prop.codigo,
                precio: prop.precio_especial || prop.precio,
                moneda: prop.moneda || 'USD',
                imagen_principal: prop.imagen_principal,
                tipo: prop.tipo,
                operacion: prop.operacion,
                ciudad: prop.ciudad,
                origen: 'propuesta',
                propuesta_titulo: propuesta.titulo,
              });
            }
          }
        }
      }

      console.log('📋 Propiedades encontradas:', propiedadesOpciones.length, propiedadesOpciones);

      // 2. Decidir qué hacer según la cantidad de propiedades
      if (propiedadesOpciones.length === 0) {
        // No hay propiedades vinculadas, el usuario deberá seleccionar manualmente
        console.log('⚠️ No hay propiedades vinculadas, selección manual requerida');
        return;
      } else if (propiedadesOpciones.length === 1) {
        // Solo hay una propiedad, auto-seleccionar
        seleccionarPropiedadParaCierre(propiedadesOpciones[0].id);
      } else {
        // Hay múltiples propiedades, mostrar modal para que elija
        setPropiedadesOpcionesSolicitud(propiedadesOpciones);
        setShowPropiedadesSolicitudModal(true);
      }
    } catch (err) {
      console.error('Error obteniendo propiedades de la solicitud:', err);
    }
  };

  // Función auxiliar para seleccionar una propiedad del cierre
  const seleccionarPropiedadParaCierre = (propiedadId: string) => {
    setNuevaVenta(prev => ({ ...prev, propiedad_id: propiedadId }));
    cargarUnidadesPropiedad(propiedadId);

    // Cargar captador de la propiedad (usa agente_id como captador)
    const propiedadCompleta = propiedades.find(p => p.id === propiedadId);
    if (propiedadCompleta?.agente_id) {
      setNuevaVenta(prev => ({ ...prev, captador_id: propiedadCompleta.agente_id || '' }));
    }

    // Cerrar modal si estaba abierto
    setShowPropiedadesSolicitudModal(false);
  };

  // Handler cuando el usuario elige una propiedad del modal
  const handleSeleccionarPropiedadDelModal = (propiedadId: string) => {
    seleccionarPropiedadParaCierre(propiedadId);
  };

  // Handler cuando el usuario quiere elegir manualmente (cierra el modal)
  const handleElegirPropiedadManualmente = () => {
    setShowPropiedadesSolicitudModal(false);
    // El usuario usará el PropertyPicker normal del formulario
  };

  const openModal = async (venta?: Venta) => {
    // Limpiar unidades al abrir modal
    setUnidadesProyecto([]);

    // Cargar solicitudes disponibles (pasar solicitud_id si se está editando para incluirla aunque esté cerrada)
    cargarSolicitudes(venta?.solicitud_id || undefined);

    if (venta) {
      setEditingVenta(venta);
      setNuevaVenta({
        nombre_negocio: venta.nombre_negocio || '',
        descripcion: venta.descripcion || '',
        propiedad_id: venta.propiedad_id || '',
        unidad_id: venta.unidad_id || '',
        contacto_id: venta.contacto_id || '',
        usuario_cerrador_id: venta.usuario_cerrador_id || user?.id || '',
        captador_id: venta.captador_id || '',
        estado_venta_id: venta.estado_venta_id || '',
        valor_cierre: venta.valor_cierre?.toString() || '',
        moneda: venta.moneda || 'USD',
        porcentaje_comision: venta.porcentaje_comision?.toString() || '',
        fecha_cierre: venta.fecha_cierre ? new Date(venta.fecha_cierre).toISOString().split('T')[0] : '',
        vendedor_externo_tipo: venta.vendedor_externo_tipo || '',
        vendedor_externo_id: venta.vendedor_externo_id || '',
        vendedor_externo_nombre: venta.vendedor_externo_nombre || '',
        vendedor_externo_contacto: venta.vendedor_externo_contacto || '',
        referidor_nombre: venta.referidor_nombre || '',
        referidor_id: venta.referidor_contacto_id || '',
        notas: venta.notas || '',
        solicitud_id: venta.solicitud_id || '',
      });

      // Si hay propiedad, cargar sus unidades
      if (venta.propiedad_id && tenantActual?.id) {
        cargarUnidadesPropiedad(venta.propiedad_id);
      }
    } else {
      // Obtener el primer estado (menor orden) para preseleccionar
      const primerEstado = estadosVenta.length > 0 ? estadosVenta[0].id : '';

      setEditingVenta(null);
      setNuevaVenta({
        nombre_negocio: '',
        descripcion: '',
        propiedad_id: '',
        unidad_id: '',
        contacto_id: '',
        usuario_cerrador_id: user?.id || '',
        captador_id: '',
        estado_venta_id: primerEstado,
        valor_cierre: '',
        moneda: 'USD',
        porcentaje_comision: '',
        fecha_cierre: new Date().toISOString().split('T')[0],
        vendedor_externo_tipo: '',
        vendedor_externo_id: '',
        vendedor_externo_nombre: '',
        vendedor_externo_contacto: '',
        referidor_nombre: '',
        referidor_id: '',
        notas: '',
        solicitud_id: '',
      });
    }
    setShowCreateModal(true);
  };

  // Función para cargar unidades de una propiedad
  const cargarUnidadesPropiedad = async (propiedadId: string) => {
    if (!tenantActual?.id || !propiedadId) {
      setUnidadesProyecto([]);
      return;
    }

    try {
      setLoadingUnidades(true);
      const token = await getToken();
      const unidades = await getUnidadesProyecto(tenantActual.id, propiedadId, token);
      setUnidadesProyecto(unidades);
    } catch (err) {
      console.error('Error cargando unidades:', err);
      setUnidadesProyecto([]);
    } finally {
      setLoadingUnidades(false);
    }
  };

  // Función para manejar cambio de propiedad y auto-rellenar datos
  const handlePropiedadChange = async (propiedadId: string | null, propiedadObj?: Propiedad) => {
    // Si no hay ID, limpiar todo
    if (!propiedadId) {
      setNuevaVenta(prev => ({
        ...prev,
        propiedad_id: '',
        unidad_id: '',
      }));
      setUnidadesProyecto([]);
      return;
    }

    // Usar el objeto pasado o buscarlo en la lista
    const propiedad = propiedadObj || propiedades.find(p => p.id === propiedadId);

    // Actualizar propiedad_id y limpiar unidad_id
    const updates: any = {
      propiedad_id: propiedadId,
      unidad_id: '',
    };

    // Auto-rellenar datos de la propiedad
    if (propiedad) {
      // Valor de cierre = precio de la propiedad
      if (propiedad.precio) {
        updates.valor_cierre = propiedad.precio.toString();
      }

      // Moneda de la propiedad
      if (propiedad.moneda) {
        updates.moneda = propiedad.moneda;
      }

      // Porcentaje de comisión de la propiedad
      if (propiedad.comision) {
        const comisionValue = typeof propiedad.comision === 'string'
          ? parseFloat(propiedad.comision)
          : propiedad.comision;
        if (!isNaN(comisionValue)) {
          updates.porcentaje_comision = comisionValue.toString();
        }
      }

      // Captador = agente de la propiedad
      if (propiedad.agente_id) {
        updates.captador_id = propiedad.agente_id;
      }

      // Si el título de la propiedad es útil, usarlo como nombre del negocio
      if (!nuevaVenta.nombre_negocio && propiedad.titulo) {
        updates.nombre_negocio = `Venta - ${propiedad.titulo}`;
      }
    }

    setNuevaVenta(prev => ({ ...prev, ...updates }));

    // Cargar unidades del proyecto
    await cargarUnidadesPropiedad(propiedadId);
  };

  // Función para manejar selección de unidad y actualizar precio
  const handleUnidadChange = (unidadId: string) => {
    const unidad = unidadesProyecto.find(u => u.id === unidadId);

    const updates: any = {
      unidad_id: unidadId,
    };

    // Si la unidad tiene precio, actualizar valor de cierre
    if (unidad?.precio) {
      updates.valor_cierre = unidad.precio.toString();
      if (unidad.moneda) {
        updates.moneda = unidad.moneda;
      }
    }

    setNuevaVenta(prev => ({ ...prev, ...updates }));
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingVenta(null);
    setUnidadesProyecto([]);
  };

  const handleSave = async () => {
    if (!tenantActual?.id) {
      setError('No se pudo identificar la organización. Por favor, recarga la página.');
      return;
    }

    // Validaciones
    const valorCierre = parseFloat(nuevaVenta.valor_cierre);
    if (isNaN(valorCierre) || valorCierre <= 0) {
      setError('El valor de cierre debe ser un número mayor a 0');
      return;
    }

    if (nuevaVenta.porcentaje_comision) {
      const porcentaje = parseFloat(nuevaVenta.porcentaje_comision);
      if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
        setError('El porcentaje de comisión debe estar entre 0 y 100');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const data: any = {
        nombre_negocio: nuevaVenta.nombre_negocio || null,
        descripcion: nuevaVenta.descripcion || null,
        propiedad_id: nuevaVenta.propiedad_id || null,
        unidad_id: nuevaVenta.unidad_id || null,
        contacto_id: nuevaVenta.contacto_id || null,
        usuario_cerrador_id: nuevaVenta.usuario_cerrador_id || null,
        captador_id: nuevaVenta.captador_id || null,
        estado_venta_id: nuevaVenta.estado_venta_id || null,
        valor_cierre: valorCierre,
        moneda: nuevaVenta.moneda,
        porcentaje_comision: nuevaVenta.porcentaje_comision ? parseFloat(nuevaVenta.porcentaje_comision) : null,
        fecha_cierre: nuevaVenta.fecha_cierre || null,
        vendedor_externo_tipo: nuevaVenta.vendedor_externo_tipo || null,
        vendedor_externo_id: nuevaVenta.vendedor_externo_id || null,
        vendedor_externo_nombre: nuevaVenta.vendedor_externo_nombre || null,
        vendedor_externo_contacto: nuevaVenta.vendedor_externo_contacto || null,
        referidor_nombre: nuevaVenta.referidor_nombre || null,
        referidor_contacto_id: nuevaVenta.referidor_id || null,
        notas: nuevaVenta.notas || null,
        solicitud_id: nuevaVenta.solicitud_id || null,
      };

      if (editingVenta) {
        await updateVenta(tenantActual.id, editingVenta.id, data);
      } else {
        await createVenta(tenantActual.id, data);
      }

      closeModal();
      cargarVentas();
    } catch (err: any) {
      console.error('Error guardando venta:', err);
      const errorMessage = err.message || 'Error desconocido al guardar la venta';
      setError(errorMessage);
      
      // Mostrar error en el modal también
      setTimeout(() => {
        alert(`Error: ${errorMessage}`);
      }, 100);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ventaId: string) => {
    if (!tenantActual?.id) {
      setError('No se pudo identificar la organización. Por favor, recarga la página.');
      return;
    }
    
    if (!confirm('¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setError(null);
      await deleteVenta(tenantActual.id, ventaId);
      cargarVentas();
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error eliminando venta:', err);
      const errorMessage = err.message || 'Error desconocido al eliminar la venta';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    }
  };

  // Obtener valores únicos para filtros desde propiedades
  const ciudadesUnicas = [...new Set(propiedades.map(p => p.ciudad).filter(Boolean))].sort();
  const sectoresUnicos = [...new Set(propiedades.map(p => p.sector).filter(Boolean))].sort();
  const categoriasUnicas = [...new Set(propiedades.map(p => p.tipo).filter(Boolean))].sort();
  const tiposOperacionUnicos = ['venta', 'renta', 'traspaso'];

  const ventasFiltradas = ventas.filter(v => {
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      return (
        v.numero_venta?.toString().includes(searchLower) ||
        v.nombre_negocio?.toLowerCase().includes(searchLower) ||
        v.propiedad?.titulo?.toLowerCase().includes(searchLower) ||
        v.contacto?.nombre?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Paginación
  const totalPages = Math.ceil(ventasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVentas = ventasFiltradas.slice(startIndex, startIndex + itemsPerPage);

  // Reset página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, estadoFiltro, usuarioFiltro, dateRange, tipoOperacionFiltro, ciudadFiltro, sectorFiltro, categoriaFiltro, esPropiedadExternaFiltro, showMyVentas, showParticipatedVentas]);

  const propiedadSeleccionada = propiedades.find(p => p.id === nuevaVenta.propiedad_id);
  const contactoSeleccionado = contactos.find(c => c.id === nuevaVenta.contacto_id);
  const usuarioSeleccionado = usuarios.find(u => u.id === nuevaVenta.usuario_cerrador_id);

  // Debug: Verificar estado del componente
  useEffect(() => {
    console.log('🔍 Estado del componente CrmFinanzasVentas:', {
      tenantActual: tenantActual?.id,
      loading,
      ventasCount: ventas.length,
      estadosCount: estadosVenta.length,
      error,
    });
  }, [tenantActual?.id, loading, ventas.length, estadosVenta.length, error]);

  return (
    <div className="page">
      {/* Sección de Estadísticas - Elegante y separada */}
      <div style={{
        marginBottom: '1.25rem',
        padding: '1rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(102, 126, 234, 0.15)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.75rem'
        }}>
          {/* Total Cierres */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '10px',
            padding: '0.75rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Total Cierres
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginTop: '0.125rem' }}>
                  {ventas.length.toLocaleString('es-DO')}
                </div>
              </div>
            </div>
          </div>

          {/* Valor Total */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '10px',
            padding: '0.75rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}>
                <DollarSign className="w-4 h-4" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Valor Total
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginTop: '0.125rem', wordBreak: 'break-word' }}>
                  ${totalMonto.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>USD</div>
              </div>
            </div>
          </div>

          {/* Comisiones */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '10px',
            padding: '0.75rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}>
                <DollarSign className="w-4 h-4" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Comisiones
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginTop: '0.125rem', wordBreak: 'break-word' }}>
                  ${totalComisiones.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>USD</div>
              </div>
            </div>
          </div>

          {/* Completados */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '10px',
            padding: '0.75rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}>
                <CheckCircle className="w-4 h-4" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Completados
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginTop: '0.125rem' }}>
                  {completadas.toLocaleString('es-DO')}
                </div>
              </div>
            </div>
          </div>

          {/* Tasa de Éxito */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '10px',
            padding: '0.75rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Tasa Éxito
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginTop: '0.125rem' }}>
                  {tasaExito.toLocaleString('es-DO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'nowrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 16px',
          flex: '0 1 400px',
          minWidth: '300px',
          transition: 'all 0.2s',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#667eea';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
        }}
        >
          <Search style={{ width: '18px', height: '18px', color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.9375rem',
              color: '#1e293b',
              width: '100%',
              flex: 1
            }}
          />
        </div>

        {/* Botón de Agentes - solo visible para admin */}
        {esAdmin && (
          <button
            onClick={() => setShowAgentsModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 24px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: (usuariosSeleccionados.length > 0 || showMyVentas || showParticipatedVentas)
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'white',
              color: (usuariosSeleccionados.length > 0 || showMyVentas || showParticipatedVentas)
                ? 'white'
                : '#475569',
              fontWeight: 600,
              fontSize: '0.9375rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: (usuariosSeleccionados.length > 0 || showMyVentas || showParticipatedVentas)
                ? '0 4px 6px rgba(102, 126, 234, 0.25)'
                : '0 1px 3px rgba(0, 0, 0, 0.05)',
              flex: '0 0 auto',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (!(usuariosSeleccionados.length > 0 || showMyVentas || showParticipatedVentas)) {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!(usuariosSeleccionados.length > 0 || showMyVentas || showParticipatedVentas)) {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
              }
            }}
          >
            <User style={{ width: '18px', height: '18px' }} />
            <span>Agentes</span>
            {(usuariosSeleccionados.length > 0 || showMyVentas || showParticipatedVentas) && (
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'white',
                marginLeft: '4px'
              }}></span>
            )}
          </button>
        )}

        <button
          onClick={() => setShowDateModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 24px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            background: (dateRange.start || dateRange.end)
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'white',
            color: (dateRange.start || dateRange.end)
              ? 'white'
              : '#475569',
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: (dateRange.start || dateRange.end)
              ? '0 4px 6px rgba(102, 126, 234, 0.25)'
              : '0 1px 3px rgba(0, 0, 0, 0.05)',
            flex: '0 0 auto',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (!(dateRange.start || dateRange.end)) {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!(dateRange.start || dateRange.end)) {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }
          }}
        >
          <Calendar style={{ width: '18px', height: '18px' }} />
          <span>Fechas</span>
          {(dateRange.start || dateRange.end) && (
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'white',
              marginLeft: '4px'
            }}></span>
          )}
        </button>

        <button
          onClick={() => setShowAdvancedModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 24px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            background: (estadoFiltro || tipoOperacionFiltro || ciudadFiltro || sectorFiltro || categoriaFiltro || esPropiedadExternaFiltro)
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'white',
            color: (estadoFiltro || tipoOperacionFiltro || ciudadFiltro || sectorFiltro || categoriaFiltro || esPropiedadExternaFiltro)
              ? 'white'
              : '#475569',
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: (estadoFiltro || tipoOperacionFiltro || ciudadFiltro || sectorFiltro || categoriaFiltro || esPropiedadExternaFiltro)
              ? '0 4px 6px rgba(102, 126, 234, 0.25)'
              : '0 1px 3px rgba(0, 0, 0, 0.05)',
            flex: '0 0 auto',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (!(estadoFiltro || tipoOperacionFiltro || ciudadFiltro || sectorFiltro || categoriaFiltro || esPropiedadExternaFiltro)) {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!(estadoFiltro || tipoOperacionFiltro || ciudadFiltro || sectorFiltro || categoriaFiltro || esPropiedadExternaFiltro)) {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }
          }}
        >
          <Filter style={{ width: '18px', height: '18px' }} />
          <span>Más Filtros</span>
          {(estadoFiltro || tipoOperacionFiltro || ciudadFiltro || sectorFiltro || categoriaFiltro || esPropiedadExternaFiltro) && (
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'white',
              marginLeft: '4px'
            }}></span>
          )}
        </button>

        {(estadoFiltro || usuariosSeleccionados.length > 0 || dateRange.start || dateRange.end || tipoOperacionFiltro || ciudadFiltro || sectorFiltro || categoriaFiltro || esPropiedadExternaFiltro || showMyVentas || showParticipatedVentas) && (
          <button
            onClick={() => {
              setEstadoFiltro('');
              setUsuariosSeleccionados([]);
              setDateRange({});
              setTipoOperacionFiltro('');
              setCiudadFiltro('');
              setSectorFiltro('');
              setCategoriaFiltro('');
              setEsPropiedadExternaFiltro('');
              setShowMyVentas(false);
              setShowParticipatedVentas(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '0.9375rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              flex: '0 0 auto',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.borderColor = '#fecaca';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(220, 38, 38, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Tabla de ventas */}
      {loading ? (
        <div className="loading-state">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p>Cargando ventas...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <XCircle className="w-6 h-6" />
          <p>{error}</p>
        </div>
      ) : ventasFiltradas.length === 0 ? (
        <div className="empty-state">
          <DollarSign className="w-12 h-12" />
          <h3>
            {ventas.length === 0 
              ? 'No hay ventas' 
              : 'No se encontraron ventas con los filtros aplicados'}
          </h3>
          <p>
            {ventas.length === 0
              ? 'Crea tu primera venta para comenzar'
              : 'Intenta ajustar los filtros o crear una nueva venta'}
          </p>
          {ventas.length === 0 ? (
          <button className="btn-primary" onClick={() => openModal()}>
            <Plus className="w-4 h-4" />
            Nueva Venta
          </button>
          ) : (
            <button 
              className="btn-secondary" 
              onClick={() => {
                setEstadoFiltro('');
                setUsuarioFiltro('');
                setDateRange({});
                setTipoOperacionFiltro('');
                setCiudadFiltro('');
                setSectorFiltro('');
                setCategoriaFiltro('');
                setEsPropiedadExternaFiltro('');
                setShowMyVentas(false);
                setShowParticipatedVentas(false);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '80px', minWidth: '80px' }}>Número</th>
                <th style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}>Imagen</th>
                <th>Propiedad</th>
                <th>Cliente</th>
                <th>Asesor</th>
                <th style={{ width: '180px', minWidth: '180px' }}>Valor</th>
                <th style={{ width: '180px', minWidth: '180px' }}>Comisión</th>
                <th style={{ width: '130px', minWidth: '130px' }}>Fecha Cierre</th>
                <th style={{ width: '110px', minWidth: '110px' }}>Estado</th>
                <th style={{ width: '100px', minWidth: '100px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVentas.map(venta => (
                <tr 
                  key={venta.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={(e) => {
                    // Solo navegar si el clic no fue en un botón o en la celda de acciones
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button') || target.closest('[role="button"]');
                    if (!isButton) {
                      navigate(`/crm/${tenantSlug}/finanzas/ventas/${venta.id}`);
                    }
                  }}
                >
                  <td style={{ padding: '12px 8px' }}>
                    <div className="flex items-center">
                      <span 
                        className="font-bold text-orange-600 text-lg"
                        style={{ 
                          fontFamily: 'monospace',
                          letterSpacing: '0.5px'
                        }}
                      >
                        #{venta.numero_venta || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td style={{ width: '80px', minWidth: '80px', maxWidth: '80px', padding: '8px' }}>
                    <div className="flex items-center justify-center" style={{ width: '72px', height: '72px' }}>
                      {venta.propiedad_imagen ? (
                        <img
                          src={venta.propiedad_imagen}
                          alt={venta.propiedad_nombre || 'Propiedad'}
                          className="rounded-lg shadow-sm border border-gray-200"
                          style={{
                            width: '72px',
                            height: '72px',
                            objectFit: 'cover',
                            maxWidth: '72px',
                            maxHeight: '72px',
                            minWidth: '72px',
                            minHeight: '72px',
                            display: 'block',
                            flexShrink: 0
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          width: '72px',
                          height: '72px',
                          maxWidth: '72px',
                          maxHeight: '72px',
                          minWidth: '72px',
                          minHeight: '72px',
                          display: venta.propiedad_imagen ? 'none' : 'flex',
                          flexShrink: 0,
                          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                          borderRadius: '10px',
                          border: '2px dashed #bae6fd',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          background: 'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
                        }}></div>
                        <Home style={{ width: '32px', height: '32px', color: '#3b82f6', position: 'relative', zIndex: 1 }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {venta.propiedad_nombre ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 truncate max-w-xs" title={venta.propiedad_nombre}>
                          {venta.propiedad_nombre}
                        </span>
                      </div>
                    ) : venta.nombre_propiedad_externa ? (
                      <span className="text-gray-600 italic font-medium" title={venta.nombre_propiedad_externa}>
                        {venta.nombre_propiedad_externa}
                      </span>
                    ) : (
                      <span className="text-gray-400">Sin propiedad</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {venta.contacto_nombre ? (
                      <div>
                        <div className="font-semibold text-gray-900">{venta.contacto_nombre} {venta.contacto_apellido || ''}</div>
                        {venta.contacto_email && (
                          <div className="text-xs text-gray-500 mt-0.5">{venta.contacto_email}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Sin cliente</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {venta.usuario_cerrador_nombre ? (
                      <div>
                        <div className="font-semibold text-gray-900">
                          {venta.usuario_cerrador_nombre} {venta.usuario_cerrador_apellido || ''}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', width: '180px', minWidth: '180px' }}>
                    {(() => {
                      const valor = typeof venta.valor_cierre === 'number' ? venta.valor_cierre : parseFloat(venta.valor_cierre || '0') || 0;
                      const moneda = venta.moneda || 'USD';
                      const valorUSD = convertirAUSD(valor, moneda, tasasCambio);
                      const mostrarOriginal = moneda !== 'USD';
                      return (
                        <div style={{ minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: 700, 
                            fontSize: '0.9375rem',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexWrap: 'wrap'
                          }}>
                            <DollarSign style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                            {mostrarOriginal ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                <span style={{ whiteSpace: 'nowrap' }}>{moneda} {valor.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400, whiteSpace: 'nowrap' }}>≈ USD {valorUSD.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                            ) : (
                              <span style={{ whiteSpace: 'nowrap' }}>USD {valor.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '12px 8px', width: '180px', minWidth: '180px' }}>
                    {venta.monto_comision ? (() => {
                      const comision = typeof venta.monto_comision === 'number' ? venta.monto_comision : parseFloat(venta.monto_comision || '0') || 0;
                      const moneda = venta.moneda || 'USD';
                      const comisionUSD = convertirAUSD(comision, moneda, tasasCambio);
                      const mostrarOriginal = moneda !== 'USD';
                      return (
                      <div style={{ minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: 700, 
                            fontSize: '0.9375rem',
                            color: '#d97706',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexWrap: 'wrap'
                          }}>
                            <DollarSign style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                            {mostrarOriginal ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                <span style={{ whiteSpace: 'nowrap' }}>{moneda} {comision.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400, whiteSpace: 'nowrap' }}>≈ USD {comisionUSD.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            ) : (
                              <span style={{ whiteSpace: 'nowrap' }}>USD {comision.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            )}
                        </div>
                        {venta.porcentaje_comision && (
                            <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap' }}>
                              {venta.porcentaje_comision}%
                            </div>
                        )}
                      </div>
                      );
                    })() : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {venta.fecha_cierre ? (
                      <div style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                        {new Date(venta.fecha_cierre).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {venta.completada ? (
                      <span className="badge badge-success font-medium">Completada</span>
                    ) : venta.cancelada ? (
                      <span className="badge badge-error font-medium">Cancelada</span>
                    ) : (
                      <span className="badge badge-warning font-medium">Pendiente</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: 'white',
                          color: '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(venta);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fff7ed';
                          e.currentTarget.style.borderColor = '#fb923c';
                          e.currentTarget.style.color = '#ea580c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.color = '#475569';
                        }}
                        title="Editar"
                      >
                        <Edit style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: 'white',
                          color: '#dc2626',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(venta.id);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                          e.currentTarget.style.borderColor = '#fca5a5';
                          e.currentTarget.style.color = '#b91c1c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.color = '#dc2626';
                        }}
                        title="Eliminar"
                      >
                        <Trash2 style={{ width: '16px', height: '16px' }} />
                      </button>
                      {venta.monto_comision && (
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(102, 126, 234, 0.2)'
                          }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setVentaParaPago(venta);
                            setLoadingComision(true);
                            setComisionData(null);
                            
                            // Cargar datos de comisión
                            if (tenantActual?.id) {
                              try {
                                const comisiones = await getComisiones(tenantActual.id, { ventaId: venta.id });
                                if (comisiones.length > 0) {
                                  const comision = comisiones[0];
                                  setComisionData({
                                    montoTotal: Number(comision.monto || 0),
                                    montoPagado: Number(comision.monto_pagado || 0)
                                  });
                                } else {
                                  const montoComision = typeof venta.monto_comision === 'number' 
                                    ? venta.monto_comision 
                                    : parseFloat(venta.monto_comision || '0') || 0;
                                  setComisionData({
                                    montoTotal: montoComision,
                                    montoPagado: 0
                                  });
                                }
                              } catch (error) {
                                console.error('Error cargando comisión:', error);
                                const montoComision = typeof venta.monto_comision === 'number' 
                                  ? venta.monto_comision 
                                  : parseFloat(venta.monto_comision || '0') || 0;
                                setComisionData({
                                  montoTotal: montoComision,
                                  montoPagado: 0
                                });
                              } finally {
                                setLoadingComision(false);
                              }
                            }
                            
                            setShowAplicarPagoModal(true);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.2)';
                          }}
                          title="Aplicar Pago"
                        >
                          <CreditCard style={{ width: '16px', height: '16px' }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#475569',
                  fontWeight: 500
                }}>
                  Mostrando <span style={{ fontWeight: 600, color: '#1e293b' }}>{startIndex + 1}</span> - <span style={{ fontWeight: 600, color: '#1e293b' }}>{Math.min(startIndex + itemsPerPage, ventasFiltradas.length)}</span> de <span style={{ fontWeight: 600, color: '#1e293b' }}>{ventasFiltradas.length}</span> ventas
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: currentPage === 1 ? '#f1f5f9' : 'white',
                      color: currentPage === 1 ? '#94a3b8' : '#475569',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: currentPage === 1 ? 0.6 : 1
                    }}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    onMouseEnter={(e) => {
                      if (currentPage !== 1) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== 1) {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    <ChevronLeft style={{ width: '18px', height: '18px' }} />
                    <span>Anterior</span>
                  </button>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (currentPage <= 4) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = currentPage - 3 + i;
                      }
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          style={{
                            minWidth: '36px',
                            height: '36px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            border: isActive ? 'none' : '1px solid #e2e8f0',
                            background: isActive 
                              ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                              : 'white',
                            color: isActive ? 'white' : '#475569',
                            fontWeight: isActive ? 600 : 500,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isActive ? '0 2px 4px rgba(249, 115, 22, 0.2)' : 'none'
                          }}
                          onClick={() => setCurrentPage(pageNum)}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = '#f8fafc';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: currentPage === totalPages ? '#f1f5f9' : 'white',
                      color: currentPage === totalPages ? '#94a3b8' : '#475569',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: currentPage === totalPages ? 0.6 : 1
                    }}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    onMouseEnter={(e) => {
                      if (currentPage !== totalPages) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== totalPages) {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    <span>Siguiente</span>
                    <ChevronRight style={{ width: '18px', height: '18px' }} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal crear/editar */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingVenta ? 'Editar Venta' : 'Nueva Venta'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* SECCIÓN 1: INFORMACIÓN DEL NEGOCIO */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '16px',
                  paddingBottom: '8px',
                  borderBottom: '2px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Home size={16} style={{ color: '#64748b' }} />
                  Información del Negocio
                </h4>
                <div className="form-grid">
                  {/* Selector de Solicitud - auto-rellena campos relacionados */}
                  <div className="form-group full-width">
                    <label>
                      Vincular desde Solicitud
                      {loadingSolicitudes && <Loader2 className="w-3 h-3 animate-spin inline ml-2" />}
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>
                        (opcional - auto-rellena cliente, propiedad y asesor)
                      </span>
                    </label>
                    <SolicitudPicker
                      value={nuevaVenta.solicitud_id || null}
                      onChange={handleSolicitudChange}
                      solicitudes={solicitudes}
                      loading={loadingSolicitudes}
                      placeholder="Seleccionar solicitud para auto-rellenar..."
                      clearable
                    />
                  </div>

                  <div className="form-group">
                    <label>Nombre del Negocio</label>
                    <input
                      type="text"
                      value={nuevaVenta.nombre_negocio}
                      onChange={(e) => setNuevaVenta({ ...nuevaVenta, nombre_negocio: e.target.value })}
                      placeholder="Nombre identificador de la venta"
                    />
                  </div>

                  <div className="form-group">
                    <label>Cliente</label>
                    <ContactPicker
                      value={nuevaVenta.contacto_id}
                      onChange={(contactoId) => setNuevaVenta({ ...nuevaVenta, contacto_id: contactoId || '' })}
                      placeholder="Seleccionar cliente..."
                      contacts={contactos}
                      loading={loading}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Propiedad</label>
                    <PropertyPicker
                      value={nuevaVenta.propiedad_id || null}
                      onChange={(propiedadId) => {
                        const propiedadOriginal = propiedadId ? propiedades.find(p => p.id === propiedadId) : undefined;
                        handlePropiedadChange(propiedadId, propiedadOriginal);
                      }}
                      properties={propiedades.map(p => ({
                        id: p.id,
                        titulo: p.titulo,
                        codigo: p.codigo,
                        tipo: p.tipo || '',
                        operacion: p.operacion || '',
                        precio: p.precio,
                        moneda: p.moneda || 'USD',
                        ciudad: p.ciudad,
                        colonia: p.colonia,
                        estado_propiedad: p.estado_propiedad,
                        imagen_principal: p.imagen_principal,
                        recamaras: p.recamaras,
                        banos: p.banos,
                        m2_construccion: p.m2_construccion,
                      }))}
                      loading={loading}
                      placeholder="Seleccionar propiedad..."
                      clearable
                    />
                  </div>

                  {/* Selector de unidad - Solo visible si la propiedad tiene unidades */}
                  {unidadesProyecto.length > 0 && (
                    <div className="form-group full-width">
                      <label>
                        Unidad del Proyecto
                        {loadingUnidades && <Loader2 className="w-3 h-3 animate-spin inline ml-2" />}
                      </label>
                      <select
                        value={nuevaVenta.unidad_id}
                        onChange={(e) => handleUnidadChange(e.target.value)}
                      >
                        <option value="">Seleccionar unidad...</option>
                        {unidadesProyecto
                          .filter(u => u.estado === 'disponible' || u.id === nuevaVenta.unidad_id)
                          .map(unidad => (
                            <option key={unidad.id} value={unidad.id}>
                              {unidad.codigo}
                              {unidad.tipologia_nombre ? ` - ${unidad.tipologia_nombre}` : ''}
                              {unidad.m2 ? ` - ${unidad.m2}m²` : ''}
                              {unidad.precio ? ` - ${unidad.moneda || 'USD'} ${unidad.precio.toLocaleString()}` : ''}
                              {unidad.estado !== 'disponible' ? ` (${unidad.estado})` : ''}
                            </option>
                          ))}
                      </select>
                      <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                        {unidadesProyecto.filter(u => u.estado === 'disponible').length} unidades disponibles de {unidadesProyecto.length} total
                      </small>
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 2: DATOS DEL CIERRE */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '16px',
                  paddingBottom: '8px',
                  borderBottom: '2px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <DollarSign size={16} style={{ color: '#64748b' }} />
                  Datos del Cierre
                </h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Estado</label>
                    <select
                      value={nuevaVenta.estado_venta_id}
                      onChange={(e) => setNuevaVenta({ ...nuevaVenta, estado_venta_id: e.target.value })}
                    >
                      <option value="">Seleccionar estado...</option>
                      {estadosVenta.map(estado => (
                        <option key={estado.id} value={estado.id}>{estado.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Fecha de Cierre</label>
                    <DatePicker
                      value={nuevaVenta.fecha_cierre}
                      onChange={(date) => setNuevaVenta({ ...nuevaVenta, fecha_cierre: date || '' })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Valor de Cierre</label>
                    <div className="input-group">
                      <select
                        value={nuevaVenta.moneda}
                        onChange={(e) => setNuevaVenta({ ...nuevaVenta, moneda: e.target.value })}
                        className="input-currency"
                      >
                        <option value="USD">USD</option>
                        <option value="DOP">DOP</option>
                        <option value="EUR">EUR</option>
                      </select>
                      <input
                        type="number"
                        value={nuevaVenta.valor_cierre}
                        onChange={(e) => setNuevaVenta({ ...nuevaVenta, valor_cierre: e.target.value })}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Porcentaje de Comisión</label>
                    <div className="input-group">
                      <input
                        type="number"
                        value={nuevaVenta.porcentaje_comision}
                        onChange={(e) => setNuevaVenta({ ...nuevaVenta, porcentaje_comision: e.target.value })}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: PARTICIPANTES DE LA COMISIÓN */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '16px',
                  paddingBottom: '8px',
                  borderBottom: '2px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <User size={16} style={{ color: '#64748b' }} />
                  Participantes de la Comisión
                </h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Asesor Vendedor (Cerrador)</label>
                    <UserPicker
                      value={nuevaVenta.usuario_cerrador_id}
                      onChange={(usuarioId) => setNuevaVenta({ ...nuevaVenta, usuario_cerrador_id: usuarioId || '' })}
                      placeholder="Seleccionar asesor vendedor..."
                      users={usuarios}
                      loading={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Asesor Captador</label>
                    <UserPicker
                      value={nuevaVenta.captador_id}
                      onChange={(usuarioId) => setNuevaVenta({ ...nuevaVenta, captador_id: usuarioId || '' })}
                      placeholder="Seleccionar asesor captador..."
                      users={usuarios}
                      loading={loading}
                    />
                    <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                      Se auto-rellena al seleccionar propiedad
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Referidor (Opcional)</label>
                    <ContactPicker
                      value={nuevaVenta.referidor_id}
                      onChange={(contactoId, contacto) => {
                        setNuevaVenta({
                          ...nuevaVenta,
                          referidor_id: contactoId || '',
                          referidor_nombre: contacto ? `${contacto.nombre || ''} ${contacto.apellido || ''}`.trim() : ''
                        });
                      }}
                      placeholder="Seleccionar referidor..."
                      contacts={contactos}
                      loading={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Nombre Referidor (si no es contacto)</label>
                    <input
                      type="text"
                      value={nuevaVenta.referidor_nombre}
                      onChange={(e) => setNuevaVenta({ ...nuevaVenta, referidor_nombre: e.target.value })}
                      placeholder="Escribir nombre manualmente"
                    />
                  </div>

                  <div className="form-group">
                    <label>Asesor Externo (Opcional)</label>
                    <select
                      value={nuevaVenta.vendedor_externo_tipo}
                      onChange={(e) => setNuevaVenta({
                        ...nuevaVenta,
                        vendedor_externo_tipo: e.target.value,
                        vendedor_externo_id: '',
                        vendedor_externo_nombre: '',
                        vendedor_externo_contacto: ''
                      })}
                    >
                      <option value="">Ninguno</option>
                      <option value="inmobiliaria">Otra Inmobiliaria</option>
                      <option value="asesor_independiente">Asesor Independiente</option>
                    </select>
                  </div>

                  {nuevaVenta.vendedor_externo_tipo && (
                    <>
                      <div className="form-group">
                        <label>Contacto del Asesor Externo</label>
                        <ContactPicker
                          value={nuevaVenta.vendedor_externo_id}
                          onChange={(contactoId, contacto) => {
                            setNuevaVenta({
                              ...nuevaVenta,
                              vendedor_externo_id: contactoId || '',
                              vendedor_externo_nombre: contacto ? `${contacto.nombre || ''} ${contacto.apellido || ''}`.trim() : nuevaVenta.vendedor_externo_nombre,
                              vendedor_externo_contacto: contacto?.telefono || contacto?.email || nuevaVenta.vendedor_externo_contacto
                            });
                          }}
                          placeholder="Seleccionar contacto..."
                          contacts={contactos}
                          loading={loading}
                        />
                      </div>

                      <div className="form-group">
                        <label>Nombre (si no es contacto)</label>
                        <input
                          type="text"
                          value={nuevaVenta.vendedor_externo_nombre}
                          onChange={(e) => setNuevaVenta({ ...nuevaVenta, vendedor_externo_nombre: e.target.value })}
                          placeholder="Nombre de la inmobiliaria o asesor"
                        />
                      </div>

                      <div className="form-group full-width">
                        <label>Datos de Contacto del Asesor Externo</label>
                        <input
                          type="text"
                          value={nuevaVenta.vendedor_externo_contacto}
                          onChange={(e) => setNuevaVenta({ ...nuevaVenta, vendedor_externo_contacto: e.target.value })}
                          placeholder="Email o teléfono"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SECCIÓN 4: NOTAS */}
              <div>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '16px',
                  paddingBottom: '8px',
                  borderBottom: '2px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <FileText size={16} style={{ color: '#64748b' }} />
                  Notas y Descripción
                </h4>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Descripción</label>
                    <textarea
                      value={nuevaVenta.descripcion}
                      onChange={(e) => setNuevaVenta({ ...nuevaVenta, descripcion: e.target.value })}
                      placeholder="Descripción de la venta..."
                      rows={2}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Notas Internas</label>
                    <textarea
                      value={nuevaVenta.notas}
                      onChange={(e) => setNuevaVenta({ ...nuevaVenta, notas: e.target.value })}
                      placeholder="Notas internas..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirmar Eliminación</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aplicar Pago */}
      {showAplicarPagoModal && ventaParaPago && (() => {

        const handleAplicarPago = async (data: {
          monto: number;
          tipoPago: 'parcial' | 'total';
          fechaPago: string;
          notas?: string;
          recibo?: File;
        }) => {
          if (!tenantActual?.id || !ventaParaPago) return;

          try {
            // Obtener o crear comisión
            let comisiones = await getComisiones(tenantActual.id, { ventaId: ventaParaPago.id });
            let comision = comisiones.length > 0 ? comisiones[0] : null;

            if (!comision) {
              const usuarioId = ventaParaPago.usuario_cerrador_id || ventaParaPago.asesor_id || user?.id;
              if (!usuarioId) {
                throw new Error('No se pudo determinar el usuario de la comisión');
              }

              const montoComision = typeof ventaParaPago.monto_comision === 'number' 
                ? ventaParaPago.monto_comision 
                : parseFloat(ventaParaPago.monto_comision || '0') || 0;

              comision = await createComision(tenantActual.id, {
                venta_id: ventaParaPago.id,
                usuario_id: usuarioId,
                monto: montoComision,
                moneda: ventaParaPago.moneda || 'USD',
                porcentaje: ventaParaPago.porcentaje_comision || 0,
                estado: 'pendiente',
                monto_pagado: 0,
                tipo: 'general',
              });
            }

            const montoTotal = Number(comision.monto || 0);
            const montoPagadoActual = Number(comision.monto_pagado || 0);
            const montoAplicar = Number(data.monto);
            const nuevoMontoPagado = Number((montoPagadoActual + montoAplicar).toFixed(2));

            let nuevoEstado = 'parcial';
            if (nuevoMontoPagado >= montoTotal) {
              nuevoEstado = 'pagado';
            } else if (nuevoMontoPagado === 0) {
              nuevoEstado = 'pendiente';
            }

            // Subir recibo si existe
            let reciboUrl: string | null = null;
            if (data.recibo) {
              const formData = new FormData();
              formData.append('file', data.recibo);
              formData.append('folder', `comisiones/${comision.venta_id}/recibos`);

              const token = await getToken();
              // Usar endpoint de upload del tenant
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

              if (uploadResponse.ok) {
                const uploadData = await uploadResponse.json();
                reciboUrl = uploadData.url;
              }
            }

            // Actualizar comisión
            const datosExtra = comision.datos_extra || {};
            if (!datosExtra.historialPagos) {
              datosExtra.historialPagos = [];
            }

            datosExtra.historialPagos.push({
              fecha: data.fechaPago || new Date().toISOString().split('T')[0],
              monto: data.monto,
              tipoPago: data.tipoPago,
              notas: data.notas || null,
              reciboUrl: reciboUrl || null,
              fechaRegistro: new Date().toISOString()
            });

            await updateComision(tenantActual.id, comision.venta_id, comision.id, {
              monto_pagado: nuevoMontoPagado,
              fecha_pago: data.fechaPago || new Date().toISOString().split('T')[0],
              estado: nuevoEstado,
              notas: data.notas || comision.notas || null,
              datos_extra: Object.keys(datosExtra).length > 0 ? datosExtra : undefined,
            });

            // Recargar ventas
            await cargarVentas();
            
            setShowAplicarPagoModal(false);
            setVentaParaPago(null);
          } catch (error: any) {
            console.error('Error aplicando pago:', error);
            alert(error.message || 'Error al aplicar el pago');
          }
        };

        if (loadingComision || !comisionData) {
          return (
            <div className="modal-overlay" onClick={() => {
              setShowAplicarPagoModal(false);
              setVentaParaPago(null);
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ margin: '0 auto', color: '#667eea' }} />
                  <p style={{ marginTop: '16px', color: '#64748b' }}>Cargando información de comisión...</p>
                </div>
              </div>
            </div>
          );
        }

        const montoAdeudado = comisionData.montoTotal - comisionData.montoPagado;

        return (
          <ModalAplicarPago
            isOpen={showAplicarPagoModal}
            onClose={() => {
              setShowAplicarPagoModal(false);
              setVentaParaPago(null);
              setComisionData(null);
            }}
            onApply={handleAplicarPago}
            montoAdeudado={montoAdeudado}
            montoPagado={comisionData.montoPagado}
            moneda={ventaParaPago.moneda || 'USD'}
          />
        );
      })()}

      {/* Modal de Filtros de Fecha */}
      {showDateModal && (
        <div className="modal-overlay" onClick={() => setShowDateModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '900px', 
              width: '95%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              onClose={() => setShowDateModal(false)}
            />
          </div>
        </div>
      )}

      {/* Modal de Filtros de Agentes - solo visible para admin */}
      {esAdmin && showAgentsModal && (
        <div className="modal-overlay" onClick={() => setShowAgentsModal(false)}>
          <div className="modal-content modal-medium" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Filtros de Agentes</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowAgentsModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Opciones rápidas */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: 600, 
                    color: '#475569',
                    marginBottom: '12px'
                  }}>
                    Opciones Rápidas
                  </label>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                    border: '1px solid #fed7aa',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={showMyVentas}
                        onChange={(e) => setShowMyVentas(e.target.checked)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#f97316'
                        }}
                      />
                      <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#9a3412' }}>
                        Mis Ventas
                      </span>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={showParticipatedVentas}
                        onChange={(e) => setShowParticipatedVentas(e.target.checked)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#f97316'
                        }}
                      />
                      <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#9a3412' }}>
                        Ventas donde participo
                      </span>
                    </label>
                  </div>
                </div>

                {/* Agente específico - Checkboxes */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: 600, 
                    color: '#475569',
                    marginBottom: '12px'
                  }}>
                    Agentes Específicos
                  </label>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {usuarios.length === 0 ? (
                      <p style={{ 
                        color: '#94a3b8', 
                        fontSize: '0.875rem', 
                        textAlign: 'center',
                        padding: '20px'
                      }}>
                        No hay agentes disponibles
                      </p>
                    ) : (
                      usuarios.map(usuario => (
                        <label 
                          key={usuario.id}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            cursor: 'pointer',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            transition: 'background 0.2s',
                            background: usuariosSeleccionados.includes(usuario.id) 
                              ? 'rgba(59, 130, 246, 0.1)' 
                              : 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (!usuariosSeleccionados.includes(usuario.id)) {
                              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!usuariosSeleccionados.includes(usuario.id)) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={usuariosSeleccionados.includes(usuario.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUsuariosSeleccionados([...usuariosSeleccionados, usuario.id]);
                              } else {
                                setUsuariosSeleccionados(usuariosSeleccionados.filter(id => id !== usuario.id));
                              }
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#3b82f6',
                              flexShrink: 0
                            }}
                          />
                          <span style={{ 
                            fontSize: '0.9375rem', 
                            fontWeight: usuariosSeleccionados.includes(usuario.id) ? 600 : 500,
                            color: usuariosSeleccionados.includes(usuario.id) ? '#1e40af' : '#475569',
                            flex: 1
                          }}>
                            {usuario.nombre} {usuario.apellido}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {usuariosSeleccionados.length > 0 && (
                    <div style={{ 
                      marginTop: '12px',
                      padding: '8px 12px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      color: '#1e40af'
                    }}>
                      {usuariosSeleccionados.length} agente{usuariosSeleccionados.length !== 1 ? 's' : ''} seleccionado{usuariosSeleccionados.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setUsuariosSeleccionados([]);
                  setShowMyVentas(false);
                  setShowParticipatedVentas(false);
                }}
              >
                Limpiar
              </button>
              <button 
                className="btn-primary" 
                onClick={() => setShowAgentsModal(false)}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Filtros Avanzados */}
      {showAdvancedModal && (
        <div className="modal-overlay" onClick={() => setShowAdvancedModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '100%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Más Filtros</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowAdvancedModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                {/* Columna 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#475569',
                      marginBottom: '8px'
                    }}>
                      Estado
                    </label>
                    <select
                      value={estadoFiltro}
                      onChange={(e) => setEstadoFiltro(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '0.9375rem',
                        color: '#1e293b',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#f97316';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">Todos los estados</option>
                      {estadosVenta.map(estado => (
                        <option key={estado.id} value={estado.id}>{estado.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#475569',
                      marginBottom: '8px'
                    }}>
                      Tipo de Operación
                    </label>
                    <select
                      value={tipoOperacionFiltro}
                      onChange={(e) => setTipoOperacionFiltro(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '0.9375rem',
                        color: '#1e293b',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#f97316';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">Todos</option>
                      {tiposOperacionUnicos.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#475569',
                      marginBottom: '8px'
                    }}>
                      Ciudad
                    </label>
                    <select
                      value={ciudadFiltro}
                      onChange={(e) => setCiudadFiltro(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '0.9375rem',
                        color: '#1e293b',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#f97316';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">Todas las ciudades</option>
                      {ciudadesUnicas.map(ciudad => (
                        <option key={ciudad} value={ciudad}>{ciudad}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#475569',
                      marginBottom: '8px'
                    }}>
                      Sector
                    </label>
                    <select
                      value={sectorFiltro}
                      onChange={(e) => setSectorFiltro(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '0.9375rem',
                        color: '#1e293b',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#f97316';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">Todos los sectores</option>
                      {sectoresUnicos.map(sector => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#475569',
                      marginBottom: '8px'
                    }}>
                      Categoría
                    </label>
                    <select
                      value={categoriaFiltro}
                      onChange={(e) => setCategoriaFiltro(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '0.9375rem',
                        color: '#1e293b',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#f97316';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">Todas las categorías</option>
                      {categoriasUnicas.map(categoria => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Columna 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: '#475569',
                      marginBottom: '12px'
                    }}>
                      Tipo de Propiedad
                    </label>
                    <div style={{
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      border: '1px solid #bae6fd',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '10px',
                        borderRadius: '8px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <input
                          type="radio"
                          name="propiedadExterna"
                          value="internal"
                          checked={esPropiedadExternaFiltro === 'internal'}
                          onChange={(e) => setEsPropiedadExternaFiltro(e.target.value)}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#0ea5e9'
                          }}
                        />
                        <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#0c4a6e' }}>
                          Interna
                        </span>
                      </label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '10px',
                        borderRadius: '8px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <input
                          type="radio"
                          name="propiedadExterna"
                          value="external"
                          checked={esPropiedadExternaFiltro === 'external'}
                          onChange={(e) => setEsPropiedadExternaFiltro(e.target.value)}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#0ea5e9'
                          }}
                        />
                        <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#0c4a6e' }}>
                          Externa
                        </span>
                      </label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '10px',
                        borderRadius: '8px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <input
                          type="radio"
                          name="propiedadExterna"
                          value=""
                          checked={esPropiedadExternaFiltro === ''}
                          onChange={(e) => setEsPropiedadExternaFiltro(e.target.value)}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#0ea5e9'
                          }}
                        />
                        <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#0c4a6e' }}>
                          Todas
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setEstadoFiltro('');
                  setTipoOperacionFiltro('');
                  setCiudadFiltro('');
                  setSectorFiltro('');
                  setCategoriaFiltro('');
                  setEsPropiedadExternaFiltro('');
                }}
              >
                Limpiar
              </button>
              <button 
                className="btn-primary" 
                onClick={() => setShowAdvancedModal(false)}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page {
          width: 100%;
        }

        .filters-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-box input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
        }

        .search-box svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          min-width: 180px;
        }

        .filter-button {
          display: inline-flex;
          align-items: center;
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          background: white;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-button:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .filter-button.active {
          background: #fff7ed;
          border-color: #fb923c;
          color: #ea580c;
        }

        .filter-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          margin-left: 4px;
          background: #ea580c;
          color: white;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 600;
        }

        .filter-button-clear {
          display: inline-flex;
          align-items: center;
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          background: white;
          color: #dc2626;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-button-clear:hover {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table thead {
          background: #f8fafc;
        }

        .data-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: #64748b;
          border-bottom: 2px solid #e2e8f0;
        }

        .data-table td {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .data-table tbody tr:hover {
          background: #f8fafc;
          transition: background-color 0.2s;
        }

        .data-table tbody tr {
          transition: background-color 0.2s;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .badge-success {
          background: #dcfce7;
          color: #16a34a;
        }

        .badge-error {
          background: #fef2f2;
          color: #dc2626;
        }

        .badge-warning {
          background: #fef3c7;
          color: #d97706;
        }

        .btn-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          background: white;
          border-radius: 12px;
          text-align: center;
        }

        .empty-state svg {
          color: #94a3b8;
          margin-bottom: 16px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .input-group {
          display: flex;
          gap: 8px;
        }

        .input-currency {
          width: 80px;
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }

        .input-suffix {
          display: flex;
          align-items: center;
          padding: 0 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: none;
          border-radius: 0 6px 6px 0;
          color: #64748b;
        }
      `}</style>

      {/* Modal para seleccionar propiedad cuando la solicitud tiene múltiples */}
      <PropiedadesSolicitudModal
        isOpen={showPropiedadesSolicitudModal}
        onClose={() => setShowPropiedadesSolicitudModal(false)}
        onSelect={handleSeleccionarPropiedadDelModal}
        onSelectManual={handleElegirPropiedadManualmente}
        propiedades={propiedadesOpcionesSolicitud}
        solicitudTitulo={solicitudSeleccionadaTitulo}
      />
    </div>
  );
}
