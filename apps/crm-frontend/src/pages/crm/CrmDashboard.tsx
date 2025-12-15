/**
 * CrmDashboard - Dashboard del CRM del tenant
 *
 * Vista principal con KPIs, métricas del pipeline, metas activas y actividades recientes
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getContactos,
  getSolicitudes,
  getPropiedadesStats,
  getMetasResumen,
  getActividades,
  getMetas,
  type Actividad,
  type Meta,
  type PropiedadesStats,
  type MetasResumen,
} from '../../services/api';

// Iconos SVG
const Icons = {
  propiedades: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  contactos: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  pipeline: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
    </svg>
  ),
  metas: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  trendUp: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
};

interface DashboardStats {
  propiedades: PropiedadesStats;
  contactos: { total: number; nuevosEsteMes: number };
  solicitudes: { total: number; abiertas: number; cerradasMes: number };
  metas: MetasResumen;
}

interface PipelineEtapa {
  etapa: string;
  nombre: string;
  color: string;
  cantidad: number;
}

export default function CrmDashboard() {
  const { tenantActual } = useAuth();
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const { setPageHeader } = usePageHeader();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineEtapa[]>([]);
  const [metasActivas, setMetasActivas] = useState<Meta[]>([]);
  const [actividadesRecientes, setActividadesRecientes] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Dashboard',
      subtitle: `Bienvenido de nuevo a ${tenantActual?.nombre || 'tu CRM'}`,
    });
  }, [setPageHeader, tenantActual?.nombre]);

  // Cargar datos del dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!tenantActual?.id) return;

      try {
        setLoading(true);

        // Cargar datos en paralelo
        const [
          propiedadesStats,
          contactosRes,
          solicitudesRes,
          metasResumen,
          actividadesRes,
          metasRes,
        ] = await Promise.all([
          getPropiedadesStats(tenantActual.id).catch(() => ({
            total: 0,
            disponibles: 0,
            reservadas: 0,
            vendidas: 0,
            porTipo: {},
            porOperacion: {},
          })),
          getContactos(tenantActual.id, { limit: 1 }).catch(() => ({ total: 0, data: [] })),
          getSolicitudes(tenantActual.id, { limit: 100 }).catch(() => ({ total: 0, data: [] })),
          getMetasResumen(tenantActual.id).catch(() => ({
            activas: 0,
            completadas: 0,
            fallidas: 0,
            porcentajeExito: 0,
            progresoPromedio: 0,
          })),
          getActividades(tenantActual.id, { limit: 5 }).catch(() => ({ data: [] })),
          getMetas(tenantActual.id, { estado: 'activa', limit: 3 }).catch(() => ({ data: [] })),
        ]);

        // Calcular estadísticas del pipeline
        const etapas: Record<string, number> = {};
        (solicitudesRes.data || []).forEach((sol: any) => {
          const etapa = sol.etapa || 'nuevo';
          etapas[etapa] = (etapas[etapa] || 0) + 1;
        });

        const etapasConfig: PipelineEtapa[] = [
          { etapa: 'nuevo', nombre: 'Nuevo', color: '#94a3b8', cantidad: etapas['nuevo'] || 0 },
          { etapa: 'contactado', nombre: 'Contactado', color: '#3b82f6', cantidad: etapas['contactado'] || 0 },
          { etapa: 'calificado', nombre: 'Calificado', color: '#8b5cf6', cantidad: etapas['calificado'] || 0 },
          { etapa: 'visita', nombre: 'Visita', color: '#f59e0b', cantidad: etapas['visita'] || 0 },
          { etapa: 'negociacion', nombre: 'Negociación', color: '#06b6d4', cantidad: etapas['negociacion'] || 0 },
          { etapa: 'cierre', nombre: 'Cierre', color: '#22c55e', cantidad: etapas['cierre'] || 0 },
        ];

        // Contar solicitudes abiertas (no cerradas o perdidas)
        const abiertas = (solicitudesRes.data || []).filter(
          (s: any) => !['cierre', 'perdido', 'cerrado'].includes(s.etapa)
        ).length;

        setStats({
          propiedades: propiedadesStats,
          contactos: {
            total: contactosRes.total || 0,
            nuevosEsteMes: 0, // TODO: agregar filtro por fecha
          },
          solicitudes: {
            total: solicitudesRes.total || 0,
            abiertas,
            cerradasMes: etapas['cierre'] || 0,
          },
          metas: metasResumen,
        });

        setPipelineData(etapasConfig);
        setMetasActivas(metasRes.data || []);
        setActividadesRecientes(actividadesRes.data || []);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [tenantActual?.id]);

  const basePath = `/crm/${tenantSlug}`;

  // Formatear fecha relativa
  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  // Calcular días restantes
  const getDiasRestantes = (fechaFin: string) => {
    const fin = new Date(fechaFin);
    const hoy = new Date();
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Total del pipeline para porcentajes
  const pipelineTotal = pipelineData.reduce((sum, e) => sum + e.cantidad, 0);

  return (
    <div className="dashboard">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => navigate(`${basePath}/propiedades`)}>
          <div className="kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            {Icons.propiedades}
          </div>
          <div className="kpi-content">
            <span className="kpi-value">
              {loading ? '-' : stats?.propiedades.total || 0}
            </span>
            <span className="kpi-label">Propiedades</span>
          </div>
          <div className="kpi-meta">
            <span className="kpi-badge success">
              {loading ? '...' : `${stats?.propiedades.disponibles || 0} disponibles`}
            </span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => navigate(`${basePath}/contactos`)}>
          <div className="kpi-icon" style={{ background: '#f0fdf4', color: '#059669' }}>
            {Icons.contactos}
          </div>
          <div className="kpi-content">
            <span className="kpi-value">
              {loading ? '-' : stats?.contactos.total || 0}
            </span>
            <span className="kpi-label">Contactos</span>
          </div>
          <div className="kpi-meta">
            <span className="kpi-badge">Total</span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => navigate(`${basePath}/pipeline`)}>
          <div className="kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            {Icons.pipeline}
          </div>
          <div className="kpi-content">
            <span className="kpi-value">
              {loading ? '-' : stats?.solicitudes.abiertas || 0}
            </span>
            <span className="kpi-label">Pipeline Abierto</span>
          </div>
          <div className="kpi-meta">
            <span className="kpi-badge warning">
              {loading ? '...' : `${stats?.solicitudes.cerradasMes || 0} cierres`}
            </span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => navigate(`${basePath}/metas`)}>
          <div className="kpi-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
            {Icons.metas}
          </div>
          <div className="kpi-content">
            <span className="kpi-value">
              {loading ? '-' : `${stats?.metas.progresoPromedio || 0}%`}
            </span>
            <span className="kpi-label">Progreso Metas</span>
          </div>
          <div className="kpi-meta">
            <span className="kpi-badge purple">
              {loading ? '...' : `${stats?.metas.activas || 0} activas`}
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline Visual */}
      <div className="section">
        <div className="section-header">
          <h2>Pipeline de Ventas</h2>
          <button className="section-action" onClick={() => navigate(`${basePath}/pipeline`)}>
            Ver todo {Icons.arrow}
          </button>
        </div>
        <div className="pipeline-container">
          {pipelineData.map((etapa) => (
            <div key={etapa.etapa} className="pipeline-stage">
              <div className="pipeline-bar-container">
                <div
                  className="pipeline-bar"
                  style={{
                    height: pipelineTotal > 0 ? `${(etapa.cantidad / pipelineTotal) * 100}%` : '0%',
                    background: etapa.color,
                    minHeight: etapa.cantidad > 0 ? '20px' : '0',
                  }}
                />
              </div>
              <div className="pipeline-value">{etapa.cantidad}</div>
              <div className="pipeline-label">{etapa.nombre}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de Metas y Actividades */}
      <div className="two-columns">
        {/* Metas Activas */}
        <div className="section">
          <div className="section-header">
            <h2>Metas Activas</h2>
            <button className="section-action" onClick={() => navigate(`${basePath}/metas`)}>
              Ver todo {Icons.arrow}
            </button>
          </div>
          <div className="metas-list">
            {loading ? (
              <div className="empty-state small">Cargando...</div>
            ) : metasActivas.length === 0 ? (
              <div className="empty-state small">
                <p>No hay metas activas</p>
                <button onClick={() => navigate(`${basePath}/metas`)}>Crear meta</button>
              </div>
            ) : (
              metasActivas.map((meta) => {
                const porcentaje = meta.valor_objetivo > 0
                  ? Math.round((meta.valor_actual / meta.valor_objetivo) * 100)
                  : 0;
                const diasRestantes = getDiasRestantes(meta.fecha_fin);

                return (
                  <div key={meta.id} className="meta-card">
                    <div className="meta-header">
                      <span className="meta-title">{meta.titulo}</span>
                      {meta.tipo_recompensa && (
                        <span className="meta-reward" title={meta.descripcion_recompensa}>
                          {Icons.star}
                        </span>
                      )}
                    </div>
                    <div className="meta-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(porcentaje, 100)}%`,
                            background: porcentaje >= 100 ? '#22c55e' : '#2563eb',
                          }}
                        />
                      </div>
                      <span className="progress-text">{porcentaje}%</span>
                    </div>
                    <div className="meta-footer">
                      <span className="meta-values">
                        {meta.valor_actual} / {meta.valor_objetivo}
                      </span>
                      <span className={`meta-days ${diasRestantes < 7 ? 'urgent' : ''}`}>
                        {diasRestantes > 0 ? `${diasRestantes} días` : 'Vencida'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Actividades Recientes */}
        <div className="section">
          <div className="section-header">
            <h2>Actividades Recientes</h2>
            <button className="section-action" onClick={() => navigate(`${basePath}/actividades`)}>
              Ver todo {Icons.arrow}
            </button>
          </div>
          <div className="actividades-list">
            {loading ? (
              <div className="empty-state small">Cargando...</div>
            ) : actividadesRecientes.length === 0 ? (
              <div className="empty-state small">
                <p>No hay actividades recientes</p>
                <span>Las actividades de tu equipo aparecerán aquí</span>
              </div>
            ) : (
              actividadesRecientes.map((actividad) => (
                <div
                  key={actividad.id}
                  className={`actividad-item ${actividad.completada ? 'completada' : ''}`}
                >
                  <div className={`actividad-tipo tipo-${actividad.tipo}`}>
                    {actividad.tipo === 'llamada' && '📞'}
                    {actividad.tipo === 'reunion' && '📅'}
                    {actividad.tipo === 'email' && '✉️'}
                    {actividad.tipo === 'visita' && '🏠'}
                    {actividad.tipo === 'tarea' && '✓'}
                    {actividad.tipo === 'nota' && '📝'}
                    {actividad.tipo === 'seguimiento' && '🔄'}
                  </div>
                  <div className="actividad-content">
                    <span className="actividad-titulo">{actividad.titulo}</span>
                    <span className="actividad-meta">
                      {actividad.contacto_nombre && (
                        <span className="actividad-contacto">
                          {actividad.contacto_nombre} {actividad.contacto_apellido}
                        </span>
                      )}
                      <span className="actividad-fecha">
                        {formatRelativeDate(actividad.fecha_programada || actividad.created_at)}
                      </span>
                    </span>
                  </div>
                  {actividad.completada && (
                    <span className="actividad-check">{Icons.check}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Resumen de Rendimiento */}
      {stats && !loading && (
        <div className="section">
          <div className="section-header">
            <h2>Resumen de Rendimiento</h2>
          </div>
          <div className="stats-summary">
            <div className="summary-item">
              <span className="summary-label">Tasa de Éxito en Metas</span>
              <div className="summary-bar-container">
                <div
                  className="summary-bar"
                  style={{
                    width: `${stats.metas.porcentajeExito}%`,
                    background: stats.metas.porcentajeExito >= 70 ? '#22c55e' : stats.metas.porcentajeExito >= 40 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <span className="summary-value">{stats.metas.porcentajeExito}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Propiedades Vendidas/Rentadas</span>
              <div className="summary-bar-container">
                <div
                  className="summary-bar"
                  style={{
                    width: stats.propiedades.total > 0
                      ? `${(stats.propiedades.vendidas / stats.propiedades.total) * 100}%`
                      : '0%',
                    background: '#7c3aed',
                  }}
                />
              </div>
              <span className="summary-value">
                {stats.propiedades.vendidas} de {stats.propiedades.total}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Metas Completadas</span>
              <div className="summary-bar-container">
                <div
                  className="summary-bar"
                  style={{
                    width: (stats.metas.completadas + stats.metas.activas) > 0
                      ? `${(stats.metas.completadas / (stats.metas.completadas + stats.metas.activas + stats.metas.fallidas)) * 100}%`
                      : '0%',
                    background: '#2563eb',
                  }}
                />
              </div>
              <span className="summary-value">{stats.metas.completadas}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dashboard {
          width: 100%;
        }

        /* KPI Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .kpi-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .kpi-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }

        .kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .kpi-content {
          display: flex;
          flex-direction: column;
        }

        .kpi-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1;
        }

        .kpi-label {
          font-size: 0.875rem;
          color: #64748b;
          margin-top: 4px;
        }

        .kpi-meta {
          position: absolute;
          top: 12px;
          right: 12px;
        }

        .kpi-badge {
          padding: 4px 10px;
          background: #f1f5f9;
          border-radius: 20px;
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }

        .kpi-badge.success {
          background: #dcfce7;
          color: #16a34a;
        }

        .kpi-badge.warning {
          background: #fef3c7;
          color: #d97706;
        }

        .kpi-badge.purple {
          background: #f3e8ff;
          color: #7c3aed;
        }

        /* Sections */
        .section {
          margin-bottom: 32px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 24px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #0f172a;
        }

        .section-action {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: none;
          border: none;
          color: #2563eb;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .section-action:hover {
          color: #1d4ed8;
        }

        .section-action svg {
          transition: transform 0.2s ease;
        }

        .section-action:hover svg {
          transform: translateX(4px);
        }

        /* Pipeline Visual */
        .pipeline-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          height: 180px;
          padding: 20px 0;
          gap: 12px;
        }

        .pipeline-stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .pipeline-bar-container {
          width: 100%;
          height: 120px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .pipeline-bar {
          width: 80%;
          max-width: 60px;
          border-radius: 6px 6px 0 0;
          transition: height 0.5s ease;
        }

        .pipeline-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
        }

        .pipeline-label {
          font-size: 0.75rem;
          color: #64748b;
          text-align: center;
        }

        /* Two Columns */
        .two-columns {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 24px;
        }

        .two-columns .section {
          margin-bottom: 0;
        }

        /* Metas List */
        .metas-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .meta-card {
          padding: 16px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .meta-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .meta-title {
          font-weight: 600;
          color: #0f172a;
          font-size: 0.95rem;
        }

        .meta-reward {
          color: #f59e0b;
          display: flex;
          align-items: center;
        }

        .meta-progress {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .progress-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          min-width: 40px;
          text-align: right;
        }

        .meta-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .meta-values {
          font-size: 0.8rem;
          color: #64748b;
        }

        .meta-days {
          font-size: 0.75rem;
          padding: 2px 8px;
          background: #f1f5f9;
          border-radius: 10px;
          color: #64748b;
        }

        .meta-days.urgent {
          background: #fef2f2;
          color: #dc2626;
        }

        /* Actividades List */
        .actividades-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .actividad-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .actividad-item.completada {
          opacity: 0.7;
        }

        .actividad-tipo {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
          background: #eff6ff;
        }

        .actividad-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .actividad-titulo {
          font-weight: 500;
          color: #0f172a;
          font-size: 0.9rem;
        }

        .actividad-meta {
          display: flex;
          gap: 8px;
          font-size: 0.8rem;
          color: #64748b;
        }

        .actividad-contacto {
          color: #2563eb;
        }

        .actividad-check {
          color: #22c55e;
        }

        /* Stats Summary */
        .stats-summary {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .summary-label {
          width: 200px;
          font-size: 0.875rem;
          color: #64748b;
          flex-shrink: 0;
        }

        .summary-bar-container {
          flex: 1;
          height: 10px;
          background: #f1f5f9;
          border-radius: 5px;
          overflow: hidden;
        }

        .summary-bar {
          height: 100%;
          border-radius: 5px;
          transition: width 0.5s ease;
        }

        .summary-value {
          min-width: 80px;
          text-align: right;
          font-weight: 600;
          color: #0f172a;
          font-size: 0.9rem;
        }

        /* Empty State */
        .empty-state {
          padding: 48px 24px;
          text-align: center;
        }

        .empty-state.small {
          padding: 32px 16px;
        }

        .empty-state p {
          margin: 0 0 8px 0;
          color: #64748b;
          font-weight: 500;
        }

        .empty-state span {
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .empty-state button {
          margin-top: 12px;
          padding: 8px 16px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .empty-state button:hover {
          background: #1d4ed8;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .two-columns {
            grid-template-columns: 1fr;
          }

          .pipeline-container {
            height: 140px;
          }

          .summary-item {
            flex-wrap: wrap;
          }

          .summary-label {
            width: 100%;
            margin-bottom: 4px;
          }
        }
      `}</style>
    </div>
  );
}
