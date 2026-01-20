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
  Meta,
  MetaFiltros,
  MetasResumen,
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
  const [metasEquipo, setMetasEquipo] = useState<Meta[]>([]);
  const [resumen, setResumen] = useState<MetasResumen | null>(null);
  const [miResumen, setMiResumen] = useState<MetasResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistaActiva, setVistaActiva] = useState<'mis-metas' | 'equipo'>('mis-metas');
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

      // Si es admin, cargar también las metas del equipo
      if (isTenantAdmin) {
        const equipoFiltros: MetaFiltros = {
          estado: estadoFiltro || undefined,
          tipo_meta: tipoFiltro || undefined,
          limit: 100,
        };

        const [equipoResponse, resumenTotalResponse] = await Promise.all([
          getMetas(tenantActual.id, equipoFiltros),
          getMetasResumen(tenantActual.id),
        ]);

        setMetasEquipo(equipoResponse.data);
        setResumen(resumenTotalResponse);
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
        usuario_id: user?.id || '',
      });
    }
    setShowModal(true);
  };

  // Guardar meta
  const handleSave = async () => {
    if (!tenantActual?.id || !form.titulo.trim() || !form.valor_objetivo) return;

    try {
      setSaving(true);
      const data = {
        titulo: form.titulo,
        descripcion: form.descripcion || undefined,
        tipo_meta: form.tipo_meta,
        metrica: form.metrica,
        valor_objetivo: parseFloat(form.valor_objetivo),
        periodo: form.periodo,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        origen: form.usuario_id === user?.id ? 'personal' : 'asignada' as const,
        usuario_id: form.usuario_id || user?.id,
        creado_por_id: user?.id,
        tipo_recompensa: form.tipo_recompensa || undefined,
        descripcion_recompensa: form.descripcion_recompensa || undefined,
        monto_recompensa: form.monto_recompensa ? parseFloat(form.monto_recompensa) : undefined,
      };

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
  const metasAMostrar = vistaActiva === 'mis-metas' ? misMetas : metasEquipo;
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
          </button>
          <button
            className={`tab ${vistaActiva === 'equipo' ? 'active' : ''}`}
            onClick={() => setVistaActiva('equipo')}
          >
            <Users className="w-4 h-4" />
            Metas del Equipo
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
          <h3>No hay metas {vistaActiva === 'mis-metas' ? 'personales' : 'del equipo'}</h3>
          <p>
            {estadoFiltro || tipoFiltro
              ? 'No se encontraron metas con los filtros aplicados'
              : vistaActiva === 'mis-metas'
                ? 'Crea tu primera meta personal para comenzar a trackear tu progreso'
                : 'Asigna metas a tu equipo para motivarlos a alcanzar sus objetivos'
            }
          </p>
          <button className="btn-primary" onClick={() => openModal()}>
            <Plus className="w-4 h-4" />
            Crear Primera Meta
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
            const nivelLogro = getNivelLogro(porcentaje);
            const TipoIcon = tipo.icon;
            const EstadoIcon = estado.icon;

            return (
              <div
                key={meta.id}
                className={`meta-card ${completada ? 'completed' : ''} ${vencida ? 'overdue' : ''}`}
              >
                {/* Badge de completado */}
                {completada && (
                  <div className="completion-badge">
                    <Trophy className="w-5 h-5" />
                  </div>
                )}

                <div className="meta-header">
                  <div className="meta-tipo" style={{ backgroundColor: tipo.bgColor, color: tipo.color }}>
                    <TipoIcon className="w-4 h-4" />
                    <span>{tipo.label}</span>
                  </div>
                  <div className="meta-estado" style={{ backgroundColor: estado.bgColor, color: estado.color }}>
                    <EstadoIcon className="w-3 h-3" />
                    <span>{estado.label}</span>
                  </div>
                </div>

                <h3 className="meta-titulo">{meta.titulo}</h3>

                {meta.descripcion && (
                  <p className="meta-descripcion">{meta.descripcion}</p>
                )}

                {/* Usuario asignado (solo en vista equipo) */}
                {vistaActiva === 'equipo' && meta.usuario_nombre && (
                  <div className="meta-usuario">
                    <User className="w-4 h-4" />
                    <span>{meta.usuario_nombre} {meta.usuario_apellido || ''}</span>
                    {meta.origen === 'asignada' && (
                      <span className="badge-asignada">Asignada</span>
                    )}
                  </div>
                )}

                {/* Progreso visual */}
                <div className="meta-progreso">
                  <div className="progreso-header">
                    <span className="progreso-emoji">{nivelLogro.emoji}</span>
                    <span className="progreso-actual" style={{ color: nivelLogro.color }}>
                      {formatValor(meta.valor_actual, meta.metrica)}
                    </span>
                    <span className="progreso-separator">/</span>
                    <span className="progreso-objetivo">
                      {formatValor(meta.valor_objetivo, meta.metrica)}
                    </span>
                  </div>

                  <div className="progreso-bar-container">
                    <div className="progreso-bar">
                      <div
                        className="progreso-fill"
                        style={{
                          width: `${Math.min(porcentaje, 100)}%`,
                          backgroundColor: completada ? '#16a34a' : tipo.color,
                        }}
                      />
                      {porcentaje > 0 && porcentaje < 100 && (
                        <div
                          className="progreso-marker"
                          style={{ left: `${Math.min(porcentaje, 100)}%` }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="progreso-footer">
                    <span className="progreso-porcentaje" style={{ color: nivelLogro.color }}>
                      {porcentaje}% completado
                    </span>
                    {meta.estado === 'activa' && (
                      <span className={`progreso-dias ${diasRestantes <= 7 ? 'urgent' : ''}`}>
                        <Clock className="w-3 h-3" />
                        {diasRestantes > 0 ? `${diasRestantes} días` : 'Vencida'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Recompensa */}
                {meta.tipo_recompensa && (
                  <div className="meta-recompensa">
                    <Gift className="w-4 h-4" />
                    <div className="recompensa-content">
                      <span className="recompensa-tipo">{meta.tipo_recompensa}</span>
                      {meta.monto_recompensa && (
                        <span className="recompensa-monto">
                          ${meta.monto_recompensa.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Periodo */}
                <div className="meta-periodo">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {PERIODOS[meta.periodo]?.short || meta.periodo} •
                    Hasta {new Date(meta.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {/* Acciones */}
                <div className="meta-actions">
                  {meta.estado === 'activa' && (
                    <button
                      className="action-btn progress-btn"
                      onClick={() => {
                        setShowProgresoModal(meta);
                        setNuevoProgreso(meta.valor_actual.toString());
                      }}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Actualizar
                    </button>
                  )}
                  <button
                    className="action-btn"
                    onClick={() => openModal(meta)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    className="action-btn danger"
                    onClick={() => setDeleteConfirm(meta.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
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
        <div className="modal-overlay" onClick={() => setShowProgresoModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()}>
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

              {/* Sección de recompensa */}
              <div className="form-section">
                <div className="form-section-header">
                  <Gift className="w-4 h-4" />
                  <h4>Recompensa (opcional)</h4>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de recompensa</label>
                    <input
                      type="text"
                      value={form.tipo_recompensa}
                      onChange={(e) => setForm(prev => ({ ...prev, tipo_recompensa: e.target.value }))}
                      placeholder="Ej: Bono, Día libre, Reconocimiento"
                    />
                  </div>
                  <div className="form-group">
                    <label>Monto ($)</label>
                    <input
                      type="number"
                      value={form.monto_recompensa}
                      onChange={(e) => setForm(prev => ({ ...prev, monto_recompensa: e.target.value }))}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
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

  /* Metas Grid */
  .metas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }

  .meta-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .meta-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  .meta-card.completed {
    border-color: #86efac;
    background: linear-gradient(135deg, #f0fdf4 0%, #fff 30%);
  }

  .meta-card.overdue {
    border-color: #fca5a5;
    background: linear-gradient(135deg, #fef2f2 0%, #fff 30%);
  }

  .completion-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f59e0b;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    font-size: 0.9rem;
  }

  .meta-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    gap: 8px;
  }

  .meta-tipo {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .meta-tipo svg {
    width: 12px;
    height: 12px;
  }

  .meta-estado {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px;
    border-radius: 5px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .meta-estado svg {
    width: 10px;
    height: 10px;
  }

  .meta-titulo {
    margin: 0 0 6px 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
    padding-right: 32px;
  }

  .meta-descripcion {
    margin: 0 0 10px 0;
    font-size: 0.8rem;
    color: #64748b;
    line-height: 1.4;
  }

  .meta-usuario {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 10px;
    padding: 6px 10px;
    background: #f8fafc;
    border-radius: 6px;
  }

  .badge-asignada {
    margin-left: auto;
    padding: 2px 6px;
    background: #dbeafe;
    color: #2563eb;
    border-radius: 3px;
    font-size: 0.65rem;
    font-weight: 600;
  }

  /* Progreso */
  .meta-progreso {
    margin-bottom: 10px;
  }

  .progreso-header {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 6px;
  }

  .progreso-emoji {
    font-size: 1rem;
  }

  .progreso-actual {
    font-size: 1.2rem;
    font-weight: 700;
  }

  .progreso-separator {
    color: #cbd5e1;
  }

  .progreso-objetivo {
    font-size: 0.85rem;
    color: #64748b;
  }

  .progreso-bar-container {
    position: relative;
  }

  .progreso-bar {
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }

  .progreso-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease-out;
    position: relative;
  }

  .progreso-marker {
    position: absolute;
    top: -3px;
    width: 3px;
    height: 14px;
    background: white;
    border: 1.5px solid currentColor;
    border-radius: 2px;
    transform: translateX(-50%);
  }

  .progreso-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
  }

  .progreso-porcentaje {
    font-weight: 600;
    font-size: 0.75rem;
  }

  .progreso-dias {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.7rem;
    color: #64748b;
  }

  .progreso-dias svg {
    width: 12px;
    height: 12px;
  }

  .progreso-dias.urgent {
    color: #dc2626;
    font-weight: 600;
  }

  /* Recompensa */
  .meta-recompensa {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
    border-radius: 8px;
    margin-bottom: 10px;
    color: #92400e;
  }

  .recompensa-content {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .recompensa-tipo {
    font-weight: 600;
    font-size: 0.75rem;
  }

  .recompensa-monto {
    font-weight: 700;
    font-size: 0.85rem;
    color: #16a34a;
  }

  /* Periodo */
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

  .form-section .form-group input {
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
