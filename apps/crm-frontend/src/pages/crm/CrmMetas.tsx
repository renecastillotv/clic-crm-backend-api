/**
 * CrmMetas - Sistema de metas y gamificación
 *
 * Módulo para gestionar metas personales y de equipo con:
 * - Vista diferenciada para usuario común y admin del tenant
 * - Dashboard de progreso visual con gamificación
 * - Sistema de premios y reconocimientos
 * - Barras de progreso animadas
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import DatePicker from '../../components/DatePicker';
import {
  getMetas,
  createMeta,
  updateMeta,
  deleteMeta,
  actualizarProgresoMeta,
  getMetasResumen,
  getUsuariosTenant,
  Meta,
  MetaFiltros,
  MetasResumen,
  UsuarioTenant,
} from '../../services/api';
import {
  Target,
  Trophy,
  TrendingUp,
  Flame,
  Star,
  Award,
  Users,
  User,
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  Calendar,
  Gift,
  Zap,
  Crown,
  Medal,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  Loader2,
  X,
  Sparkles,
  Building2,
  RefreshCw,
} from 'lucide-react';

// Tipos de meta
const TIPOS_META: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  ventas: { label: 'Ventas', icon: TrendingUp, color: '#16a34a', bgColor: '#dcfce7' },
  contactos: { label: 'Contactos', icon: Users, color: '#2563eb', bgColor: '#dbeafe' },
  actividades: { label: 'Actividades', icon: Zap, color: '#7c3aed', bgColor: '#f3e8ff' },
  cierres: { label: 'Cierres', icon: Target, color: '#f59e0b', bgColor: '#fef3c7' },
  propuestas: { label: 'Propuestas', icon: BarChart3, color: '#ec4899', bgColor: '#fce7f3' },
  propiedades: { label: 'Propiedades', icon: Award, color: '#06b6d4', bgColor: '#cffafe' },
};

// Estados de meta
const ESTADOS_META: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  activa: { label: 'En Progreso', color: '#2563eb', bgColor: '#dbeafe', icon: Flame },
  completada: { label: 'Completada', color: '#16a34a', bgColor: '#dcfce7', icon: Trophy },
  fallida: { label: 'No alcanzada', color: '#dc2626', bgColor: '#fef2f2', icon: XCircle },
  cancelada: { label: 'Cancelada', color: '#64748b', bgColor: '#f1f5f9', icon: X },
};

// Periodos
const PERIODOS: Record<string, { label: string; short: string }> = {
  diario: { label: 'Diario', short: 'Hoy' },
  semanal: { label: 'Semanal', short: 'Esta semana' },
  mensual: { label: 'Mensual', short: 'Este mes' },
  trimestral: { label: 'Trimestral', short: 'Este trimestre' },
  anual: { label: 'Anual', short: 'Este año' },
  personalizado: { label: 'Personalizado', short: 'Personalizado' },
};

// Niveles de logro para gamificación
const getNivelLogro = (porcentaje: number): { nivel: string; color: string; emoji: string } => {
  if (porcentaje >= 100) return { nivel: 'Completado', color: '#16a34a', emoji: '🏆' };
  if (porcentaje >= 75) return { nivel: 'Casi lo logras', color: '#f59e0b', emoji: '🔥' };
  if (porcentaje >= 50) return { nivel: 'A mitad de camino', color: '#3b82f6', emoji: '💪' };
  if (porcentaje >= 25) return { nivel: 'Buen inicio', color: '#8b5cf6', emoji: '🚀' };
  return { nivel: 'Recién empezando', color: '#94a3b8', emoji: '🌱' };
};

export default function CrmMetas() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual, user, isTenantAdmin } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Estado
  const [metas, setMetas] = useState<Meta[]>([]);
  const [misMetas, setMisMetas] = useState<Meta[]>([]);
  const [metasAsesores, setMetasAsesores] = useState<Meta[]>([]);
  const [metasEmpresa, setMetasEmpresa] = useState<Meta[]>([]);
  const [resumen, setResumen] = useState<MetasResumen | null>(null);
  const [miResumen, setMiResumen] = useState<MetasResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistaActiva, setVistaActiva] = useState<'mis-metas' | 'asesores' | 'empresa'>('mis-metas');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showProgresoModal, setShowProgresoModal] = useState<Meta | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [nuevoProgreso, setNuevoProgreso] = useState('');
  const [notaProgreso, setNotaProgreso] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioTenant[]>([]);

  // Formulario
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    tipo_meta: 'ventas',
    metrica: 'cantidad',
    valor_objetivo: '',
    periodo: 'mensual',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: '',
    tipo_recompensa: '',
    descripcion_recompensa: '',
    monto_recompensa: '',
    origen: 'personal' as 'personal' | 'asignada' | 'empresa',
    usuario_id: '', // Para asignar a un usuario específico
  });

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Metas y Desempeño',
      subtitle: isTenantAdmin ? 'Gestiona las metas de tu equipo' : 'Alcanza tus objetivos y gana recompensas',
      actions: (
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus className="w-4 h-4" />
          Nueva Meta
        </button>
      ),
    });
  }, [setPageHeader, isTenantAdmin]);

  // Cargar metas y resumen
  const cargarDatos = useCallback(async () => {
    if (!tenantActual?.id || !user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar mis metas (asignadas a mí o creadas por mí)
      const misFiltros: MetaFiltros = {
        usuario_id: user.id,
        estado: estadoFiltro || undefined,
        tipo_meta: tipoFiltro || undefined,
        limit: 50,
      };

      const [misMetasResponse, miResumenResponse] = await Promise.all([
        getMetas(tenantActual.id, misFiltros),
        getMetasResumen(tenantActual.id, user.id),
      ]);

      setMisMetas(misMetasResponse.data);
      setMiResumen(miResumenResponse);

      // Si es admin, cargar metas de asesores (asignadas), metas empresa, y lista de usuarios
      if (isTenantAdmin) {
        // Cargar todas las metas sin filtro de usuario
        const todosFiltros: MetaFiltros = {
          estado: estadoFiltro || undefined,
          tipo_meta: tipoFiltro || undefined,
          limit: 100,
        };

        // Cargar específicamente las metas de empresa
        const empresaFiltros: MetaFiltros = {
          origen: 'empresa',
          estado: estadoFiltro || undefined,
          tipo_meta: tipoFiltro || undefined,
          limit: 100,
        };

        const [todasResponse, empresaResponse, resumenTotalResponse, usuariosResponse] = await Promise.all([
          getMetas(tenantActual.id, todosFiltros),
          getMetas(tenantActual.id, empresaFiltros),
          getMetasResumen(tenantActual.id),
          getUsuariosTenant(tenantActual.id),
        ]);

        // Separar metas por tipo:
        // - Asesores: metas asignadas a OTROS usuarios (no a mí) + metas personales de otros usuarios
        const asesores = todasResponse.data.filter(m =>
          // Metas asignadas a otros usuarios (no a mí)
          (m.origen === 'asignada' && m.usuario_id && m.usuario_id !== user.id) ||
          // Metas personales de otros usuarios
          (m.origen === 'personal' && m.usuario_id && m.usuario_id !== user.id)
        );

        // - Empresa: metas globales (origen='empresa')
        // Usamos la query específica para garantizar que solo traemos empresa
        const empresa = empresaResponse.data;

        setMetasAsesores(asesores);
        setMetasEmpresa(empresa);
        setResumen(resumenTotalResponse);
        setUsuarios(usuariosResponse.filter(u => u.activo));
      }

      setMetas(misMetasResponse.data);
    } catch (err: any) {
      console.error('Error cargando metas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, user?.id, isTenantAdmin, estadoFiltro, tipoFiltro]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Abrir modal
  const openModal = (meta?: Meta) => {
    if (meta) {
      setEditingMeta(meta);
      setForm({
        titulo: meta.titulo,
        descripcion: meta.descripcion || '',
        tipo_meta: meta.tipo_meta,
        metrica: meta.metrica,
        valor_objetivo: meta.valor_objetivo.toString(),
        periodo: meta.periodo,
        fecha_inicio: meta.fecha_inicio.slice(0, 10),
        fecha_fin: meta.fecha_fin.slice(0, 10),
        tipo_recompensa: meta.tipo_recompensa || '',
        descripcion_recompensa: meta.descripcion_recompensa || '',
        monto_recompensa: meta.monto_recompensa?.toString() || '',
        origen: meta.origen || 'personal',
        usuario_id: meta.usuario_id || '',
      });
    } else {
      setEditingMeta(null);
      const hoy = new Date();
      const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      setForm({
        titulo: '',
        descripcion: '',
        tipo_meta: 'ventas',
        metrica: 'cantidad',
        valor_objetivo: '',
        periodo: 'mensual',
        fecha_inicio: hoy.toISOString().slice(0, 10),
        fecha_fin: finMes.toISOString().slice(0, 10),
        tipo_recompensa: '',
        descripcion_recompensa: '',
        monto_recompensa: '',
        origen: 'personal',
        usuario_id: user?.id || '',
      });
    }
    setShowModal(true);
  };

  // Guardar meta
  const handleSave = async () => {
    if (!tenantActual?.id || !form.titulo.trim() || !form.valor_objetivo) return;

    // Validar que si es asignada, tenga usuario seleccionado
    if (form.origen === 'asignada' && !form.usuario_id) {
      setError('Debes seleccionar un usuario para asignar la meta');
      return;
    }

    try {
      setSaving(true);

      // Determinar origen y usuario_id según la selección
      // IMPORTANTE: Respetar el origen seleccionado por el admin
      let origen: 'personal' | 'asignada' | 'empresa' = form.origen;
      let usuarioId: string | null = null;

      switch (form.origen) {
        case 'empresa':
          // Meta de empresa: sin usuario específico
          origen = 'empresa';
          usuarioId = null;
          break;
        case 'asignada':
          // Meta asignada a un usuario específico
          origen = 'asignada';
          usuarioId = form.usuario_id || null;
          break;
        case 'personal':
        default:
          // Meta personal: para el usuario actual
          origen = 'personal';
          usuarioId = user?.id || null;
          break;
      }

      const data = {
        titulo: form.titulo,
        descripcion: form.descripcion || undefined,
        tipo_meta: form.tipo_meta,
        metrica: form.metrica,
        valor_objetivo: parseFloat(form.valor_objetivo),
        periodo: form.periodo,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        origen: origen,
        usuario_id: usuarioId,
        creado_por_id: user?.id,
        tipo_recompensa: form.tipo_recompensa || undefined,
        descripcion_recompensa: form.descripcion_recompensa || undefined,
        monto_recompensa: form.monto_recompensa ? parseFloat(form.monto_recompensa) : undefined,
      };

      console.log('[CrmMetas] Guardando meta con datos:', data); // DEBUG

      if (editingMeta) {
        await updateMeta(tenantActual.id, editingMeta.id, data);
      } else {
        await createMeta(tenantActual.id, data);
      }
      setShowModal(false);
      setEditingMeta(null);
      cargarDatos();
    } catch (err: any) {
      console.error('Error al guardar meta:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Actualizar progreso
  const handleActualizarProgreso = async () => {
    if (!tenantActual?.id || !showProgresoModal || !nuevoProgreso) return;

    try {
      setSaving(true);
      const valorAnterior = showProgresoModal.valor_actual;
      const nuevoValorNum = parseFloat(nuevoProgreso);

      await actualizarProgresoMeta(
        tenantActual.id,
        showProgresoModal.id,
        nuevoValorNum,
        notaProgreso || undefined
      );

      // Si completó la meta, mostrar celebración
      if (nuevoValorNum >= showProgresoModal.valor_objetivo && valorAnterior < showProgresoModal.valor_objetivo) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }

      setShowProgresoModal(null);
      setNuevoProgreso('');
      setNotaProgreso('');
      cargarDatos();
    } catch (err: any) {
      console.error('Error al actualizar progreso:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar meta
  const handleDelete = async (metaId: string) => {
    if (!tenantActual?.id) return;

    try {
      await deleteMeta(tenantActual.id, metaId);
      setDeleteConfirm(null);
      cargarDatos();
    } catch (err: any) {
      console.error('Error al eliminar meta:', err);
      setError(err.message);
    }
  };

  // Formatear valores
  const formatValor = (valor: number, metrica: string) => {
    if (metrica === 'monto') {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(valor);
    }
    if (metrica === 'porcentaje') {
      return `${valor}%`;
    }
    return valor.toLocaleString();
  };

  // Calcular días restantes
  const getDiasRestantes = (fechaFin: string) => {
    const hoy = new Date();
    const fin = new Date(fechaFin);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Datos a mostrar según la vista
  const metasAMostrar =
    vistaActiva === 'mis-metas' ? misMetas :
    vistaActiva === 'asesores' ? metasAsesores :
    metasEmpresa;
  const resumenAMostrar = vistaActiva === 'mis-metas' ? miResumen : resumen;

  if (loading && metas.length === 0) {
    return (
      <div className="page">
        <div className="loading-container">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p>Cargando tus metas...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Celebración de meta completada */}
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-content">
            <Trophy className="celebration-icon" />
            <h2>¡Felicidades!</h2>
            <p>Has completado tu meta</p>
            <Sparkles className="sparkle sparkle-1" />
            <Sparkles className="sparkle sparkle-2" />
            <Sparkles className="sparkle sparkle-3" />
          </div>
        </div>
      )}

      {/* Tabs de navegación para admin */}
      {isTenantAdmin && (
        <div className="tabs-container">
          <button
            className={`tab ${vistaActiva === 'mis-metas' ? 'active' : ''}`}
            onClick={() => setVistaActiva('mis-metas')}
          >
            <User className="w-4 h-4" />
            Mis Metas
            {misMetas.filter(m => m.estado === 'activa').length > 0 && (
              <span className="tab-badge">{misMetas.filter(m => m.estado === 'activa').length}</span>
            )}
          </button>
          <button
            className={`tab ${vistaActiva === 'asesores' ? 'active' : ''}`}
            onClick={() => setVistaActiva('asesores')}
          >
            <Users className="w-4 h-4" />
            Asesores
            {metasAsesores.filter(m => m.estado === 'activa').length > 0 && (
              <span className="tab-badge">{metasAsesores.filter(m => m.estado === 'activa').length}</span>
            )}
          </button>
          <button
            className={`tab ${vistaActiva === 'empresa' ? 'active' : ''}`}
            onClick={() => setVistaActiva('empresa')}
          >
            <Building2 className="w-4 h-4" />
            Empresa
            {metasEmpresa.filter(m => m.estado === 'activa').length > 0 && (
              <span className="tab-badge empresa">{metasEmpresa.filter(m => m.estado === 'activa').length}</span>
            )}
          </button>
        </div>
      )}

      {/* Dashboard de estadísticas */}
      <div className="stats-dashboard">
        <div className="stat-hero">
          <div className="stat-hero-icon">
            <Target className="w-12 h-12" />
          </div>
          <div className="stat-hero-content">
            <div className="stat-hero-value">{resumenAMostrar?.progresoPromedio || 0}%</div>
            <div className="stat-hero-label">Progreso Promedio</div>
            <div className="stat-hero-bar">
              <div
                className="stat-hero-bar-fill"
                style={{ width: `${resumenAMostrar?.progresoPromedio || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card stat-active">
            <div className="stat-icon">
              <Flame className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{resumenAMostrar?.activas || 0}</div>
              <div className="stat-label">Activas</div>
            </div>
          </div>

          <div className="stat-card stat-completed">
            <div className="stat-icon">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{resumenAMostrar?.completadas || 0}</div>
              <div className="stat-label">Completadas</div>
            </div>
          </div>

          <div className="stat-card stat-success">
            <div className="stat-icon">
              <Star className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{resumenAMostrar?.porcentajeExito || 0}%</div>
              <div className="stat-label">Tasa de Éxito</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS_META).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS_META).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lista de metas */}
      {metasAMostrar.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Target className="w-16 h-16" />
          </div>
          <h3>
            {vistaActiva === 'mis-metas' ? 'No hay metas personales' :
             vistaActiva === 'asesores' ? 'No hay metas asignadas a asesores' :
             'No hay metas de empresa'}
          </h3>
          <p>
            {estadoFiltro || tipoFiltro
              ? 'No se encontraron metas con los filtros aplicados'
              : vistaActiva === 'mis-metas'
                ? 'Crea tu primera meta personal para comenzar a trackear tu progreso'
                : vistaActiva === 'asesores'
                  ? 'Asigna metas a tus asesores para motivarlos a alcanzar sus objetivos'
                  : 'Crea metas de empresa para trackear objetivos globales del equipo'
            }
          </p>
          <button className="btn-primary" onClick={() => openModal()}>
            <Plus className="w-4 h-4" />
            {vistaActiva === 'empresa' ? 'Crear Meta de Empresa' : 'Crear Meta'}
          </button>
        </div>
      ) : (
        <div className="metas-grid">
          {metasAMostrar.map((meta) => {
            const tipo = TIPOS_META[meta.tipo_meta] || TIPOS_META.ventas;
            const estado = ESTADOS_META[meta.estado] || ESTADOS_META.activa;
            const porcentaje = meta.porcentaje_avance || 0;
            const diasRestantes = getDiasRestantes(meta.fecha_fin);
            const completada = meta.estado === 'completada';
            const vencida = diasRestantes < 0 && meta.estado === 'activa';
            const TipoIcon = tipo.icon;

            // Calcular ángulo para el círculo de progreso
            const circumference = 2 * Math.PI * 54;
            const strokeDashoffset = circumference - (Math.min(porcentaje, 100) / 100) * circumference;

            return (
              <div
                key={meta.id}
                className={`meta-card-v2 ${completada ? 'completed' : ''} ${vencida ? 'overdue' : ''} ${meta.origen === 'asignada' ? 'asignada-card' : ''} ${meta.origen === 'empresa' ? 'empresa-card' : ''}`}
              >
                {/* Header con gradiente según tipo */}
                <div className="meta-card-header" style={{ background: `linear-gradient(135deg, ${tipo.color}15 0%, ${tipo.color}08 100%)` }}>
                  <div className="meta-card-header-content">
                    <div className="meta-tipo-badge" style={{ background: tipo.color }}>
                      <TipoIcon className="w-4 h-4" />
                    </div>
                    <div className="meta-header-info">
                      <span className="meta-tipo-label">{tipo.label}</span>
                      <h3 className="meta-titulo-v2">{meta.titulo}</h3>
                    </div>
                  </div>

                  {/* Badge de origen */}
                  <div className={`meta-origen-badge ${meta.origen}`}>
                    {meta.origen === 'personal' ? (
                      <User className="w-3 h-3" />
                    ) : meta.origen === 'empresa' ? (
                      <Building2 className="w-3 h-3" />
                    ) : (
                      <Crown className="w-3 h-3" />
                    )}
                    <span>
                      {meta.origen === 'personal' ? 'Personal' :
                       meta.origen === 'empresa' ? 'Empresa' :
                       // Para metas asignadas, mostrar "Administrativa" si no soy admin
                       !isTenantAdmin ? 'Administrativa' : 'Asignada'}
                    </span>
                  </div>

                  {/* Mostrar usuario asignado para admin en tab asesores */}
                  {isTenantAdmin && vistaActiva === 'asesores' && meta.usuario_nombre && (
                    <div className="meta-usuario-badge">
                      <User className="w-3 h-3" />
                      <span>{meta.usuario_nombre} {meta.usuario_apellido}</span>
                    </div>
                  )}
                </div>

                {/* Cuerpo con círculo de progreso */}
                <div className="meta-card-body">
                  {/* Círculo de progreso */}
                  <div className="progress-circle-container">
                    <svg className="progress-circle" viewBox="0 0 120 120">
                      {/* Fondo del círculo */}
                      <circle
                        className="progress-circle-bg"
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        strokeWidth="8"
                      />
                      {/* Progreso */}
                      <circle
                        className="progress-circle-fill"
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        strokeWidth="8"
                        strokeLinecap="round"
                        style={{
                          stroke: completada ? '#10b981' : tipo.color,
                          strokeDasharray: circumference,
                          strokeDashoffset: strokeDashoffset,
                        }}
                      />
                    </svg>
                    <div className="progress-circle-content">
                      <span className="progress-value" style={{ color: completada ? '#10b981' : tipo.color }}>
                        {Math.round(porcentaje)}%
                      </span>
                      {completada ? (
                        <Trophy className="w-4 h-4" style={{ color: '#10b981' }} />
                      ) : (
                        <span className="progress-label">completado</span>
                      )}
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="meta-metrics">
                    <div className="metric-item">
                      <span className="metric-value">{formatValor(meta.valor_actual, meta.metrica)}</span>
                      <span className="metric-label">actual</span>
                    </div>
                    <div className="metric-divider"></div>
                    <div className="metric-item">
                      <span className="metric-value">{formatValor(meta.valor_objetivo, meta.metrica)}</span>
                      <span className="metric-label">objetivo</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="meta-card-footer">
                  <div className="meta-footer-info">
                    {/* Auto badge si aplica */}
                    {(meta as any).progreso_automatico && (
                      <span className="auto-sync-badge">
                        <RefreshCw className="w-3 h-3" />
                        Sincronizado
                      </span>
                    )}

                    {/* Badge de recompensa */}
                    {meta.tipo_recompensa && (
                      <span className="reward-badge" title={meta.descripcion_recompensa || meta.tipo_recompensa}>
                        <Gift className="w-3 h-3" />
                        {meta.tipo_recompensa === 'bono' ? '💰' :
                         meta.tipo_recompensa === 'dia_libre' ? '🏖️' :
                         meta.tipo_recompensa === 'cena' ? '🍽️' :
                         meta.tipo_recompensa === 'viaje' ? '✈️' :
                         meta.tipo_recompensa === 'regalo' ? '🎁' : '⭐'}
                        {meta.monto_recompensa && meta.monto_recompensa > 0 && (
                          <span className="reward-amount">${meta.monto_recompensa.toLocaleString()}</span>
                        )}
                      </span>
                    )}

                    {/* Tiempo restante */}
                    {meta.estado === 'activa' && (
                      <span className={`time-badge ${diasRestantes <= 7 ? 'urgent' : diasRestantes <= 14 ? 'warning' : ''}`}>
                        <Clock className="w-3 h-3" />
                        {diasRestantes > 0 ? `${diasRestantes} días` : 'Vencida'}
                      </span>
                    )}

                    {completada && (
                      <span className="completed-badge">
                        <CheckCircle2 className="w-3 h-3" />
                        Completada
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="meta-actions-v2">
                    {meta.estado === 'activa' && !(meta as any).progreso_automatico && (
                      <button
                        className="action-btn-v2 primary"
                        onClick={() => {
                          setShowProgresoModal(meta);
                          setNuevoProgreso(meta.valor_actual.toString());
                        }}
                        title="Actualizar progreso"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                    )}
                    {(isTenantAdmin || meta.origen === 'personal') && (
                      <>
                        <button
                          className="action-btn-v2"
                          onClick={() => openModal(meta)}
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          className="action-btn-v2 danger"
                          onClick={() => setDeleteConfirm(meta.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="modal-content modal-small">
            <div className="modal-icon warning">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3>¿Eliminar meta?</h3>
            <p>Esta acción no se puede deshacer. El progreso y el historial se perderán.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de actualizar progreso */}
      {showProgresoModal && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowProgresoModal(null); }}>
          <div className="modal-content">
            <div className="modal-header-custom">
              <div className="modal-header-icon" style={{ backgroundColor: TIPOS_META[showProgresoModal.tipo_meta]?.bgColor }}>
                <TrendingUp className="w-6 h-6" style={{ color: TIPOS_META[showProgresoModal.tipo_meta]?.color }} />
              </div>
              <div>
                <h3>Actualizar Progreso</h3>
                <p className="modal-subtitle">{showProgresoModal.titulo}</p>
              </div>
            </div>

            <div className="progreso-preview">
              <div className="progreso-preview-values">
                <span className="preview-current">{formatValor(showProgresoModal.valor_actual, showProgresoModal.metrica)}</span>
                <ChevronRight className="w-4 h-4" />
                <span className="preview-new">{nuevoProgreso ? formatValor(parseFloat(nuevoProgreso), showProgresoModal.metrica) : '?'}</span>
                <span className="preview-objetivo">/ {formatValor(showProgresoModal.valor_objetivo, showProgresoModal.metrica)}</span>
              </div>
              {nuevoProgreso && parseFloat(nuevoProgreso) >= showProgresoModal.valor_objetivo && (
                <div className="completion-alert">
                  <Trophy className="w-4 h-4" />
                  ¡Completarás esta meta!
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Nuevo valor</label>
              <input
                type="number"
                value={nuevoProgreso}
                onChange={(e) => setNuevoProgreso(e.target.value)}
                placeholder="Ingresa el nuevo valor"
                min="0"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Nota (opcional)</label>
              <textarea
                value={notaProgreso}
                onChange={(e) => setNotaProgreso(e.target.value)}
                placeholder="Ej: Cerré 2 ventas hoy..."
                rows={2}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowProgresoModal(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleActualizarProgreso}
                disabled={saving || !nuevoProgreso}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content modal-form">
            <div className="modal-header-custom">
              <div className="modal-header-icon">
                <Target className="w-6 h-6" />
              </div>
              <h3>{editingMeta ? 'Editar Meta' : 'Nueva Meta'}</h3>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ej: Cerrar 10 ventas este mes"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo de meta *</label>
                  <select
                    value={form.tipo_meta}
                    onChange={(e) => setForm(prev => ({ ...prev, tipo_meta: e.target.value }))}
                  >
                    {Object.entries(TIPOS_META).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Métrica *</label>
                  <select
                    value={form.metrica}
                    onChange={(e) => setForm(prev => ({ ...prev, metrica: e.target.value }))}
                  >
                    <option value="cantidad">Cantidad</option>
                    <option value="monto">Monto ($)</option>
                    <option value="porcentaje">Porcentaje (%)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Objetivo *</label>
                  <input
                    type="number"
                    value={form.valor_objetivo}
                    onChange={(e) => setForm(prev => ({ ...prev, valor_objetivo: e.target.value }))}
                    placeholder="Ej: 10"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Periodo *</label>
                  <select
                    value={form.periodo}
                    onChange={(e) => setForm(prev => ({ ...prev, periodo: e.target.value }))}
                  >
                    {Object.entries(PERIODOS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fecha inicio *</label>
                  <DatePicker
                    value={form.fecha_inicio || null}
                    onChange={(val) => setForm(prev => ({ ...prev, fecha_inicio: val || '' }))}
                    placeholder="Seleccionar fecha"
                  />
                </div>
                <div className="form-group">
                  <label>Fecha fin *</label>
                  <DatePicker
                    value={form.fecha_fin || null}
                    onChange={(val) => setForm(prev => ({ ...prev, fecha_fin: val || '' }))}
                    placeholder="Seleccionar fecha"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe tu meta..."
                  rows={2}
                />
              </div>

              {/* Selector de tipo de asignación (solo para admin) */}
              {isTenantAdmin && (
                <div className="form-section asignacion-section">
                  <div className="form-section-header">
                    <Users className="w-4 h-4" />
                    <h4>Asignación de meta</h4>
                  </div>

                  <div className="origen-selector">
                    <label
                      className={`origen-option ${form.origen === 'personal' ? 'selected' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, origen: 'personal', usuario_id: user?.id || '' }))}
                    >
                      <User className="w-5 h-5" />
                      <div>
                        <strong>Personal</strong>
                        <span>Meta para mí mismo</span>
                      </div>
                    </label>
                    <label
                      className={`origen-option ${form.origen === 'asignada' ? 'selected' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, origen: 'asignada', usuario_id: '' }))}
                    >
                      <Crown className="w-5 h-5" />
                      <div>
                        <strong>Asignar a usuario</strong>
                        <span>Para un miembro del equipo</span>
                      </div>
                    </label>
                    <label
                      className={`origen-option ${form.origen === 'empresa' ? 'selected' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, origen: 'empresa', usuario_id: '' }))}
                    >
                      <Building2 className="w-5 h-5" />
                      <div>
                        <strong>Empresa</strong>
                        <span>Meta global del equipo</span>
                      </div>
                    </label>
                  </div>

                  {/* Selector de usuario cuando es meta asignada */}
                  {form.origen === 'asignada' && (
                    <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                      <label>Seleccionar usuario *</label>
                      <select
                        value={form.usuario_id}
                        onChange={(e) => setForm(prev => ({ ...prev, usuario_id: e.target.value }))}
                        required
                      >
                        <option value="">-- Selecciona un usuario --</option>
                        {usuarios.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre} {u.apellido}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.origen === 'empresa' && (
                    <div className="empresa-note">
                      <Building2 className="w-4 h-4" />
                      Esta meta será visible para todo el equipo y el progreso se calculará sumando las contribuciones de todos los usuarios.
                    </div>
                  )}
                </div>
              )}

              {/* Sección de recompensa mejorada */}
              <div className="form-section recompensa-section">
                <div className="form-section-header">
                  <Gift className="w-4 h-4" />
                  <h4>Recompensa (opcional)</h4>
                </div>

                {/* Tipos de recompensa predefinidos */}
                <div className="recompensa-tipos">
                  {[
                    { tipo: '', label: 'Sin recompensa', icon: '❌' },
                    { tipo: 'bono', label: 'Bono', icon: '💰' },
                    { tipo: 'dia_libre', label: 'Día Libre', icon: '🏖️' },
                    { tipo: 'cena', label: 'Cena', icon: '🍽️' },
                    { tipo: 'viaje', label: 'Viaje', icon: '✈️' },
                    { tipo: 'regalo', label: 'Regalo', icon: '🎁' },
                    { tipo: 'otro', label: 'Otro', icon: '⭐' },
                  ].map(r => (
                    <button
                      type="button"
                      key={r.tipo}
                      className={`recompensa-tipo-btn ${form.tipo_recompensa === r.tipo ? 'selected' : ''}`}
                      onClick={() => setForm(prev => ({
                        ...prev,
                        tipo_recompensa: r.tipo,
                        monto_recompensa: r.tipo === '' ? '' : prev.monto_recompensa
                      }))}
                    >
                      <span className="recompensa-emoji">{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>

                {/* Campos adicionales si hay recompensa */}
                {form.tipo_recompensa && (
                  <div className="recompensa-detalles">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Descripción de la recompensa</label>
                        <input
                          type="text"
                          value={form.descripcion_recompensa}
                          onChange={(e) => setForm(prev => ({ ...prev, descripcion_recompensa: e.target.value }))}
                          placeholder={
                            form.tipo_recompensa === 'bono' ? 'Ej: Bono de productividad' :
                            form.tipo_recompensa === 'dia_libre' ? 'Ej: Viernes libre' :
                            form.tipo_recompensa === 'cena' ? 'Ej: Cena en restaurante premium' :
                            form.tipo_recompensa === 'viaje' ? 'Ej: Viaje a Punta Cana' :
                            form.tipo_recompensa === 'regalo' ? 'Ej: iPhone 15' :
                            'Describe la recompensa...'
                          }
                        />
                      </div>
                      {(form.tipo_recompensa === 'bono' || form.tipo_recompensa === 'regalo' || form.tipo_recompensa === 'viaje') && (
                        <div className="form-group" style={{ maxWidth: '140px' }}>
                          <label>Valor estimado ($)</label>
                          <input
                            type="number"
                            value={form.monto_recompensa}
                            onChange={(e) => setForm(prev => ({ ...prev, monto_recompensa: e.target.value }))}
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving || !form.titulo.trim() || !form.valor_objetivo || !form.fecha_fin}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saving ? 'Guardando...' : (editingMeta ? 'Guardar Cambios' : 'Crear Meta')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .page {
    width: 100%;
  }

  /* Loading */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px;
    color: #64748b;
    gap: 16px;
  }

  /* Celebration */
  .celebration-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: fadeIn 0.3s ease-out;
  }

  .celebration-content {
    background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
    padding: 48px 64px;
    border-radius: 24px;
    text-align: center;
    position: relative;
    animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .celebration-icon {
    width: 80px;
    height: 80px;
    color: #f59e0b;
    margin-bottom: 16px;
    animation: bounce 0.6s ease infinite;
  }

  .celebration-content h2 {
    margin: 0 0 8px 0;
    font-size: 2rem;
    color: #78350f;
  }

  .celebration-content p {
    margin: 0;
    font-size: 1.1rem;
    color: #92400e;
  }

  .sparkle {
    position: absolute;
    color: #f59e0b;
    animation: sparkle 1s ease infinite;
  }

  .sparkle-1 { top: 10px; left: 20px; animation-delay: 0s; }
  .sparkle-2 { top: 20px; right: 30px; animation-delay: 0.3s; }
  .sparkle-3 { bottom: 30px; left: 40px; animation-delay: 0.6s; }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes popIn {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @keyframes sparkle {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
    50% { transform: scale(1.2) rotate(180deg); opacity: 0.5; }
  }

  /* Tabs */
  .tabs-container {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    background: #f1f5f9;
    padding: 4px;
    border-radius: 12px;
    width: fit-content;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: none;
    background: transparent;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab:hover {
    color: #0f172a;
  }

  .tab.active {
    background: white;
    color: #0f172a;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: #6366f1;
    color: white;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 600;
    margin-left: 4px;
  }

  .tab-badge.empresa {
    background: #f59e0b;
  }

  /* Stats Dashboard */
  .stats-dashboard {
    display: flex;
    gap: 20px;
    margin-bottom: 24px;
  }

  .stat-hero {
    display: flex;
    align-items: center;
    gap: 20px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    padding: 24px 32px;
    border-radius: 16px;
    flex: 1;
    max-width: 400px;
  }

  .stat-hero-icon {
    width: 72px;
    height: 72px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .stat-hero-content {
    flex: 1;
  }

  .stat-hero-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: white;
    line-height: 1;
  }

  .stat-hero-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 12px;
  }

  .stat-hero-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    overflow: hidden;
  }

  .stat-hero-bar-fill {
    height: 100%;
    background: white;
    border-radius: 4px;
    transition: width 0.5s ease-out;
  }

  .stats-grid {
    display: flex;
    gap: 12px;
    flex: 1;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: white;
    padding: 14px 18px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    flex: 1;
    transition: all 0.2s;
  }

  .stat-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transform: translateY(-2px);
  }

  .stat-icon {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
  }

  .stat-icon svg {
    width: 18px;
    height: 18px;
  }

  .stat-active .stat-icon {
    background: #fef3c7;
    color: #f59e0b;
  }

  .stat-completed .stat-icon {
    background: #dcfce7;
    color: #16a34a;
  }

  .stat-success .stat-icon {
    background: #dbeafe;
    color: #2563eb;
  }

  .stat-value {
    font-size: 1.4rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 2px;
  }

  /* Filters */
  .filters-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .filter-select {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.8rem;
    background: white;
    cursor: pointer;
    min-width: 150px;
  }

  .filter-select:focus {
    outline: none;
    border-color: #6366f1;
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    color: #dc2626;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 4px;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    background: white;
    border: 2px dashed #e2e8f0;
    border-radius: 16px;
    text-align: center;
  }

  .empty-icon {
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border-radius: 50%;
    color: #94a3b8;
    margin-bottom: 24px;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
  }

  .empty-state p {
    margin: 0 0 24px 0;
    color: #64748b;
    font-size: 0.95rem;
    max-width: 360px;
  }

  /* Metas Grid - New Premium Design */
  .metas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  /* Premium Card Design V2 */
  .meta-card-v2 {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(0, 0, 0, 0.04);
  }

  .meta-card-v2:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  }

  .meta-card-v2.completed {
    border: 2px solid #10b981;
  }

  .meta-card-v2.overdue {
    border: 2px solid #ef4444;
  }

  /* Card Header */
  .meta-card-header {
    padding: 20px 20px 16px;
    position: relative;
  }

  .meta-card-header-content {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  .meta-tipo-badge {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .meta-tipo-badge svg {
    width: 22px;
    height: 22px;
  }

  .meta-header-info {
    flex: 1;
    min-width: 0;
  }

  .meta-tipo-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    display: block;
    margin-bottom: 4px;
  }

  .meta-titulo-v2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Origen Badge */
  .meta-origen-badge {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .meta-origen-badge.personal {
    background: #dcfce7;
    color: #166534;
  }

  .meta-origen-badge.asignada {
    background: #dbeafe;
    color: #1e40af;
  }

  .meta-origen-badge.empresa {
    background: #fef3c7;
    color: #92400e;
  }

  .meta-origen-badge svg {
    width: 10px;
    height: 10px;
  }

  /* Badge de usuario asignado */
  .meta-usuario-badge {
    position: absolute;
    top: 44px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 20px;
    font-size: 0.6rem;
    font-weight: 600;
  }

  .meta-usuario-badge svg {
    width: 10px;
    height: 10px;
  }

  /* Estilo diferenciado para metas asignadas (administrativas) */
  .meta-card-v2.asignada-card {
    border-left: 4px solid #8b5cf6;
  }

  .meta-card-v2.asignada-card .meta-card-header {
    background: linear-gradient(135deg, #8b5cf615 0%, #6366f108 100%) !important;
  }

  /* Estilo para metas de empresa */
  .meta-card-v2.empresa-card {
    border-left: 4px solid #f59e0b;
  }

  .meta-card-v2.empresa-card .meta-card-header {
    background: linear-gradient(135deg, #f59e0b15 0%, #fbbf2408 100%) !important;
  }

  /* Card Body */
  .meta-card-body {
    padding: 0 20px 20px;
    display: flex;
    align-items: center;
    gap: 24px;
  }

  /* Progress Circle */
  .progress-circle-container {
    position: relative;
    width: 120px;
    height: 120px;
    flex-shrink: 0;
  }

  .progress-circle {
    transform: rotate(-90deg);
    width: 100%;
    height: 100%;
  }

  .progress-circle-bg {
    stroke: #f1f5f9;
  }

  .progress-circle-fill {
    transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .progress-circle-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .progress-value {
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1;
  }

  .progress-label {
    font-size: 0.6rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Metrics */
  .meta-metrics {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .metric-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .metric-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1;
  }

  .metric-label {
    font-size: 0.7rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .metric-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, transparent, #e2e8f0, transparent);
  }

  /* Card Footer */
  .meta-card-footer {
    padding: 16px 20px;
    background: #f8fafc;
    border-top: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .meta-footer-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .auto-sync-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    color: #3b82f6;
    border-radius: 20px;
    font-size: 0.65rem;
    font-weight: 600;
  }

  .auto-sync-badge svg {
    width: 10px;
    height: 10px;
    animation: spin 3s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .time-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: #f1f5f9;
    color: #64748b;
    border-radius: 20px;
    font-size: 0.65rem;
    font-weight: 600;
  }

  .time-badge svg {
    width: 10px;
    height: 10px;
  }

  .time-badge.warning {
    background: #fef3c7;
    color: #d97706;
  }

  .time-badge.urgent {
    background: #fee2e2;
    color: #dc2626;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .completed-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%);
    color: #059669;
    border-radius: 20px;
    font-size: 0.65rem;
    font-weight: 600;
  }

  .completed-badge svg {
    width: 10px;
    height: 10px;
  }

  .reward-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
    border-radius: 20px;
    font-size: 0.65rem;
    font-weight: 600;
    cursor: help;
  }

  .reward-badge svg {
    width: 10px;
    height: 10px;
  }

  .reward-amount {
    font-weight: 700;
    color: #166534;
  }

  /* Actions V2 */
  .meta-actions-v2 {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .action-btn-v2 {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: none;
    background: white;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .action-btn-v2:hover {
    background: #f1f5f9;
    color: #0f172a;
    transform: scale(1.05);
  }

  .action-btn-v2.primary {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
  }

  .action-btn-v2.primary:hover {
    transform: scale(1.08);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }

  .action-btn-v2.danger:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  .action-btn-v2 svg {
    width: 16px;
    height: 16px;
  }

  /* Periodo (legacy - kept for modal) */
  .meta-periodo {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    color: #94a3b8;
    margin-bottom: 10px;
  }

  /* Acciones */
  .meta-actions {
    display: flex;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid #f1f5f9;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px 10px;
    border: none;
    background: #f8fafc;
    border-radius: 6px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .action-btn svg {
    width: 14px;
    height: 14px;
  }

  .action-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .action-btn.danger:hover {
    background: #fef2f2;
    color: #dc2626;
  }

  .action-btn.progress-btn {
    flex: 1;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
  }

  .action-btn.progress-btn:hover {
    filter: brightness(1.1);
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: white;
    border-radius: 20px;
    padding: 28px;
    max-width: 440px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .modal-small {
    max-width: 360px;
    text-align: center;
  }

  .modal-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-icon.warning {
    background: #fef2f2;
    color: #dc2626;
  }

  .modal-header-custom {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .modal-header-icon {
    width: 48px;
    height: 48px;
    background: #f1f5f9;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6366f1;
  }

  .modal-header-custom h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #0f172a;
  }

  .modal-subtitle {
    margin: 4px 0 0 0;
    color: #64748b;
    font-size: 0.9rem;
  }

  .modal-content > h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    color: #0f172a;
  }

  .modal-content > p {
    margin: 0 0 24px 0;
    color: #64748b;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  /* Progreso Preview */
  .progreso-preview {
    background: #f8fafc;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .progreso-preview-values {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }

  .preview-current {
    font-size: 1.1rem;
    color: #64748b;
    text-decoration: line-through;
  }

  .preview-new {
    font-size: 1.5rem;
    font-weight: 700;
    color: #6366f1;
  }

  .preview-objetivo {
    font-size: 1rem;
    color: #94a3b8;
  }

  .completion-alert {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  .modal-form {
    max-width: 540px;
  }

  .form-row {
    display: flex;
    gap: 16px;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-section {
    margin-top: 20px;
    padding: 16px;
    background: #fef3c7;
    border-radius: 12px;
  }

  .form-section.asignacion-section {
    background: #f1f5f9;
  }

  .form-section.asignacion-section .form-section-header {
    color: #475569;
  }

  .form-section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    color: #92400e;
  }

  .form-section-header h4 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .form-section .form-group input,
  .form-section .form-group select {
    background: white;
  }

  /* Origen selector */
  .origen-selector {
    display: flex;
    gap: 8px;
  }

  .origen-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 8px;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .origen-option:hover {
    border-color: #94a3b8;
  }

  .origen-option.selected {
    border-color: #6366f1;
    background: #eef2ff;
  }

  .origen-option svg {
    color: #64748b;
  }

  .origen-option.selected svg {
    color: #6366f1;
  }

  .origen-option div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .origen-option strong {
    font-size: 0.8rem;
    color: #0f172a;
  }

  .origen-option span {
    font-size: 0.65rem;
    color: #64748b;
  }

  .empresa-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 12px;
    padding: 10px;
    background: #fef3c7;
    border-radius: 8px;
    font-size: 0.75rem;
    color: #92400e;
    line-height: 1.4;
  }

  .empresa-note svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* Recompensa section */
  .recompensa-section {
    background: #f0fdf4 !important;
  }

  .recompensa-section .form-section-header {
    color: #166534 !important;
  }

  .recompensa-tipos {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .recompensa-tipo-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.8rem;
    font-weight: 500;
    color: #64748b;
  }

  .recompensa-tipo-btn:hover {
    border-color: #16a34a;
    color: #0f172a;
  }

  .recompensa-tipo-btn.selected {
    border-color: #16a34a;
    background: #dcfce7;
    color: #166534;
  }

  .recompensa-emoji {
    font-size: 1rem;
  }

  .recompensa-detalles {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #bbf7d0;
  }

  .recompensa-detalles .form-group input {
    background: white;
  }

  .btn-cancel {
    padding: 12px 24px;
    background: #f1f5f9;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
  }

  .btn-danger {
    padding: 12px 24px;
    background: #dc2626;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 900px) {
    .stats-dashboard {
      flex-direction: column;
    }

    .stat-hero {
      max-width: none;
    }
  }

  @media (max-width: 600px) {
    .metas-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      flex-direction: column;
    }

    .form-row {
      flex-direction: column;
      gap: 0;
    }

    .tabs-container {
      width: 100%;
    }

    .tab {
      flex: 1;
      justify-content: center;
    }
  }
`;
