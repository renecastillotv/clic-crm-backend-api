/**
 * CrmUniversity - Gestión de cursos, secciones, videos y certificados
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getUniversityCursos,
  getUniversityStats,
  createUniversityCurso,
  deleteUniversityCurso,
  UniversityCurso,
  UniversityStats,
} from '../../services/api';
import { Plus, Edit2, Trash2, Video, BookOpen, Award, Users, Clock, Layers, Send } from 'lucide-react';

export default function CrmUniversity() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const [cursos, setCursos] = useState<UniversityCurso[]>([]);
  const [stats, setStats] = useState<UniversityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      const [cursosData, statsData] = await Promise.all([
        getUniversityCursos(
          tenantActual.id,
          token,
          filtroEstado !== 'todos' ? { estado: filtroEstado } : undefined
        ),
        getUniversityStats(tenantActual.id, token),
      ]);

      setCursos(cursosData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos de University');
      console.error('Error cargando University:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken, filtroEstado]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageHeader({
      title: 'University',
      subtitle: 'Gestiona cursos, videos y certificados para tu equipo',
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/university/certificados-emitidos`)}
            className="btn-secondary"
          >
            <Send size={18} />
            Emitir Certificado
          </button>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/university/certificados`)}
            className="btn-secondary"
          >
            <Award size={18} />
            Plantillas
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary"
          >
            <Plus size={18} />
            Nuevo Curso
          </button>
        </div>
      ),
    });
  }, [setPageHeader, tenantSlug, navigate]);

  const handleDeleteCurso = async (curso: UniversityCurso) => {
    if (!tenantActual?.id) return;
    if (!confirm(`¿Eliminar el curso "${curso.titulo}"? Esta accion no se puede deshacer.`)) return;

    try {
      const token = await getToken();
      await deleteUniversityCurso(tenantActual.id, curso.id, token);
      loadData();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const formatDuracion = (minutos: number) => {
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'publicado':
        return <span className="badge badge-success">Publicado</span>;
      case 'borrador':
        return <span className="badge badge-warning">Borrador</span>;
      case 'archivado':
        return <span className="badge badge-muted">Archivado</span>;
      default:
        return <span className="badge">{estado}</span>;
    }
  };

  if (loading && cursos.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando University...</p>
      </div>
    );
  }

  return (
    <div className="university-page">
      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><BookOpen size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_cursos}</span>
              <span className="stat-label">Cursos</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Video size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_videos}</span>
              <span className="stat-label">Videos</span>
            </div>
          </div>
          <div
            className="stat-card stat-card-clickable"
            onClick={() => navigate(`/crm/${tenantSlug}/university/certificados-emitidos`)}
          >
            <div className="stat-icon"><Award size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_certificados}</span>
              <span className="stat-label">Certificados Emitidos</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Users size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_inscripciones}</span>
              <span className="stat-label">Inscripciones</span>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filtroEstado === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('todos')}
          >
            Todos
          </button>
          <button
            className={`filter-tab ${filtroEstado === 'publicado' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('publicado')}
          >
            Publicados
          </button>
          <button
            className={`filter-tab ${filtroEstado === 'borrador' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('borrador')}
          >
            Borradores
          </button>
          <button
            className={`filter-tab ${filtroEstado === 'archivado' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('archivado')}
          >
            Archivados
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {/* Lista de Cursos */}
      {cursos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><BookOpen size={32} /></div>
          <h3>No hay cursos</h3>
          <p>Crea tu primer curso para comenzar a capacitar a tu equipo</p>
          <button
            className="btn-primary"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={18} />
            Crear Curso
          </button>
        </div>
      ) : (
        <div className="cursos-grid">
          {cursos.map((curso) => (
            <div key={curso.id} className="curso-card">
              <div className="curso-header">
                {curso.imagen_portada ? (
                  <img src={curso.imagen_portada} alt={curso.titulo} className="curso-image" />
                ) : (
                  <div className="curso-image-placeholder"><BookOpen size={48} /></div>
                )}
                <div className="curso-badges">
                  {getEstadoBadge(curso.estado)}
                  {curso.es_pago && <span className="badge badge-premium">Premium</span>}
                </div>
              </div>
              <div className="curso-body">
                <h3 className="curso-titulo">{curso.titulo}</h3>
                {curso.descripcion && (
                  <p className="curso-descripcion">{curso.descripcion}</p>
                )}
                <div className="curso-meta">
                  <span className="meta-item">
                    <Layers size={14} />
                    {curso.total_secciones || 0} secciones
                  </span>
                  <span className="meta-item">
                    <Video size={14} />
                    {curso.total_videos || 0} videos
                  </span>
                  <span className="meta-item">
                    <Clock size={14} />
                    {formatDuracion(curso.duracion_estimada_minutos)}
                  </span>
                </div>
                <div className="curso-nivel">
                  <span className={`nivel-badge nivel-${curso.nivel}`}>
                    {curso.nivel.charAt(0).toUpperCase() + curso.nivel.slice(1)}
                  </span>
                </div>
              </div>
              <div className="curso-footer">
                <button
                  className="btn-icon"
                  onClick={() => navigate(`/crm/${tenantSlug}/university/cursos/${curso.id}`)}
                  title="Editar curso"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="btn-icon-danger"
                  onClick={() => handleDeleteCurso(curso)}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Crear Curso */}
      {modalOpen && (
        <CursoModal
          tenantId={tenantActual?.id || ''}
          onClose={() => {
            setModalOpen(false);
          }}
          onCreated={(cursoId: string) => {
            setModalOpen(false);
            // Navegar a la página de edición del nuevo curso
            navigate(`/crm/${tenantSlug}/university/cursos/${cursoId}`);
          }}
        />
      )}

      <style>{`
        .university-page {
          padding: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          background: #eff6ff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #64748b;
        }

        .stat-card-clickable {
          cursor: pointer;
          transition: all 0.15s;
        }

        .stat-card-clickable:hover {
          border-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        }

        .filters-bar {
          margin-bottom: 24px;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          background: white;
          padding: 4px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          width: fit-content;
        }

        .filter-tab {
          padding: 8px 16px;
          border: none;
          background: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }

        .filter-tab:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .filter-tab.active {
          background: #2563eb;
          color: white;
        }

        .cursos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .curso-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .curso-card:hover {
          border-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        }

        .curso-header {
          position: relative;
          height: 160px;
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        }

        .curso-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .curso-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          opacity: 0.5;
        }

        .curso-image-placeholder svg {
          width: 48px;
          height: 48px;
        }

        .curso-badges {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          gap: 6px;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .badge-success {
          background: #dcfce7;
          color: #16a34a;
        }

        .badge-warning {
          background: #fef3c7;
          color: #d97706;
        }

        .badge-muted {
          background: #f1f5f9;
          color: #64748b;
        }

        .badge-premium {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .curso-body {
          padding: 16px;
        }

        .curso-titulo {
          margin: 0 0 8px 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #0f172a;
        }

        .curso-descripcion {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          color: #64748b;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .curso-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8125rem;
          color: #64748b;
        }

        .meta-item svg {
          opacity: 0.7;
        }

        .curso-nivel {
          margin-top: 12px;
        }

        .nivel-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .nivel-principiante {
          background: #dcfce7;
          color: #16a34a;
        }

        .nivel-intermedio {
          background: #fef3c7;
          color: #d97706;
        }

        .nivel-avanzado {
          background: #fee2e2;
          color: #dc2626;
        }

        .curso-footer {
          padding: 12px 16px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          border: none;
          background: #f1f5f9;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-icon:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .btn-icon-danger {
          width: 32px;
          height: 32px;
          border: none;
          background: #fee2e2;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #dc2626;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-icon-danger:hover {
          background: #fecaca;
          color: #b91c1c;
        }

        .empty-state {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 64px 32px;
          text-align: center;
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          background: #eff6ff;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: #2563eb;
        }

        .empty-icon svg {
          width: 32px;
          height: 32px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          color: #0f172a;
        }

        .empty-state p {
          margin: 0 0 24px 0;
          color: #64748b;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: white;
          color: #0f172a;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-secondary:hover {
          background: #f1f5f9;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px;
          color: #64748b;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-banner {
          background: #fee2e2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .cursos-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// Modal Component - Solo para crear cursos nuevos
interface CursoModalProps {
  tenantId: string;
  onClose: () => void;
  onCreated: (cursoId: string) => void;
}

function CursoModal({ tenantId, onClose, onCreated }: CursoModalProps) {
  const { getToken } = useClerkAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    nivel: 'principiante' as string,
    duracion_estimada_minutos: 0,
    estado: 'borrador' as 'borrador' | 'publicado' | 'archivado',
    es_pago: false,
    precio: undefined as number | undefined,
    moneda: 'USD',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      alert('El titulo es requerido');
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const newCurso = await createUniversityCurso(tenantId, form, token);
      onCreated(newCurso.id);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo Curso</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Titulo *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Nombre del curso"
              required
            />
          </div>

          <div className="form-group">
            <label>Descripcion</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Describe el contenido del curso"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nivel</label>
              <select
                value={form.nivel}
                onChange={(e) => setForm({ ...form, nivel: e.target.value })}
              >
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>

            <div className="form-group">
              <label>Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as any })}
              >
                <option value="borrador">Borrador</option>
                <option value="publicado">Publicado</option>
                <option value="archivado">Archivado</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duracion Estimada (minutos)</label>
              <input
                type="number"
                value={form.duracion_estimada_minutos}
                onChange={(e) => setForm({ ...form, duracion_estimada_minutos: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.es_pago}
                  onChange={(e) => setForm({ ...form, es_pago: e.target.checked })}
                />
                Curso de Pago
              </label>
            </div>
          </div>

          {form.es_pago && (
            <div className="form-row">
              <div className="form-group">
                <label>Precio</label>
                <input
                  type="number"
                  value={form.precio || ''}
                  onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) || undefined })}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Moneda</label>
                <select
                  value={form.moneda}
                  onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MXN">MXN</option>
                  <option value="DOP">DOP</option>
                </select>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Curso'}
            </button>
          </div>
        </form>

        <style>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 540px;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #e2e8f0;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.25rem;
            color: #0f172a;
          }

          .modal-close {
            width: 32px;
            height: 32px;
            border: none;
            background: #f1f5f9;
            border-radius: 6px;
            font-size: 1.25rem;
            color: #64748b;
            cursor: pointer;
          }

          .modal-close:hover {
            background: #e2e8f0;
          }

          form {
            padding: 24px;
          }

          .form-group {
            margin-bottom: 16px;
          }

          .form-group label {
            display: block;
            margin-bottom: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
          }

          .form-group input[type="text"],
          .form-group input[type="number"],
          .form-group textarea,
          .form-group select {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.875rem;
            transition: border-color 0.15s;
          }

          .form-group input:focus,
          .form-group textarea:focus,
          .form-group select:focus {
            outline: none;
            border-color: #2563eb;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .checkbox-label {
            display: flex !important;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            margin-top: 24px;
          }

          .checkbox-label input[type="checkbox"] {
            width: 18px;
            height: 18px;
          }

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            margin-top: 8px;
          }
        `}</style>
      </div>
    </div>
  );
}
