/**
 * CrmUniversityCursoEditar - Editor completo de curso con secciones, videos y certificados
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getUniversityCurso,
  updateUniversityCurso,
  getUniversitySecciones,
  createUniversitySeccion,
  updateUniversitySeccion,
  deleteUniversitySeccion,
  getUniversityVideos,
  createUniversityVideo,
  updateUniversityVideo,
  deleteUniversityVideo,
  getUniversityCertificados,
  asignarCertificadoACurso,
  removerCertificadoDeCurso,
  getAccesoRolesCurso,
  setAccesoRolCurso,
  removeAccesoRolCurso,
  getRolesTenant,
  UniversityCurso,
  UniversitySeccion,
  UniversityVideo,
  UniversityCertificado,
  AccesoRolCurso,
  RolTenant,
} from '../../services/api';

// Iconos SVG
const Icons = {
  save: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  back: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  video: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  folder: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  certificate: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="7"/>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  chevronDown: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  grip: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
      <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
    </svg>
  ),
  play: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  lock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  unlock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </svg>
  ),
  x: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

export default function CrmUniversityCursoEditar() {
  const { tenantSlug, cursoId } = useParams<{ tenantSlug: string; cursoId: string }>();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const [curso, setCurso] = useState<UniversityCurso | null>(null);
  const [secciones, setSecciones] = useState<(UniversitySeccion & { videos?: UniversityVideo[] })[]>([]);
  const [certificados, setCertificados] = useState<UniversityCertificado[]>([]);
  const [certificadosAsignados, setCertificadosAsignados] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<RolTenant[]>([]);
  const [accesoRoles, setAccesoRoles] = useState<AccesoRolCurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'contenido' | 'certificados' | 'acceso'>('contenido');
  const [expandedSecciones, setExpandedSecciones] = useState<Set<string>>(new Set());

  // Modals
  const [seccionModal, setSeccionModal] = useState<{ open: boolean; seccion?: UniversitySeccion }>({ open: false });
  const [videoModal, setVideoModal] = useState<{ open: boolean; seccionId?: string; video?: UniversityVideo }>({ open: false });

  // Form state para curso
  const [cursoForm, setCursoForm] = useState({
    titulo: '',
    descripcion: '',
    nivel: 'principiante' as 'principiante' | 'intermedio' | 'avanzado',
    duracion_estimada_minutos: 0,
    estado: 'borrador' as 'borrador' | 'publicado' | 'archivado',
    es_pago: false,
    precio: undefined as number | undefined,
    moneda: 'USD',
  });

  const loadData = useCallback(async () => {
    if (!tenantActual?.id || !cursoId) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      // Cargar curso con detalle
      const cursoData = await getUniversityCurso(tenantActual.id, cursoId, token, true);
      setCurso(cursoData);
      setCursoForm({
        titulo: cursoData.titulo,
        descripcion: cursoData.descripcion || '',
        nivel: cursoData.nivel as 'principiante' | 'intermedio' | 'avanzado',
        duracion_estimada_minutos: cursoData.duracion_estimada_minutos,
        estado: cursoData.estado,
        es_pago: cursoData.es_pago,
        precio: cursoData.precio,
        moneda: cursoData.moneda || 'USD',
      });

      // Cargar secciones
      const seccionesData = await getUniversitySecciones(tenantActual.id, cursoId, token);

      // Cargar videos para cada sección
      const seccionesConVideos = await Promise.all(
        seccionesData.map(async (seccion: UniversitySeccion) => {
          const videos = await getUniversityVideos(tenantActual.id, seccion.id, token);
          return { ...seccion, videos };
        })
      );
      setSecciones(seccionesConVideos);

      // Expandir todas las secciones por defecto
      setExpandedSecciones(new Set(seccionesConVideos.map((s: UniversitySeccion) => s.id)));

      // Cargar certificados disponibles
      const certsData = await getUniversityCertificados(tenantActual.id, token);
      setCertificados(certsData);

      // Inicializar certificados ya asignados al curso
      if (cursoData.certificados && Array.isArray(cursoData.certificados)) {
        setCertificadosAsignados(new Set(cursoData.certificados.map((c: UniversityCertificado) => c.id)));
      }

      // Cargar roles disponibles
      const rolesData = await getRolesTenant(tenantActual.id, token);
      setRoles(rolesData);

      // Cargar acceso por roles
      const accesoData = await getAccesoRolesCurso(tenantActual.id, cursoId, token);
      setAccesoRoles(accesoData);

    } catch (err: any) {
      setError(err.message || 'Error al cargar el curso');
      console.error('Error cargando curso:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, cursoId, getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageHeader({
      title: curso?.titulo || 'Editar Curso',
      subtitle: 'Gestiona secciones, videos y certificados',
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/university`)}
            className="btn-secondary"
          >
            {Icons.back}
            Volver
          </button>
          <button
            onClick={handleSaveCurso}
            className="btn-primary"
            disabled={saving}
          >
            {Icons.save}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ),
    });
  }, [setPageHeader, tenantSlug, navigate, curso, saving]);

  const handleSaveCurso = async () => {
    if (!tenantActual?.id || !cursoId) return;

    try {
      setSaving(true);
      const token = await getToken();

      // Si la duración es 0, usar la duración real calculada de los videos
      const dataToSave = {
        ...cursoForm,
        duracion_estimada_minutos: cursoForm.duracion_estimada_minutos || getDuracionRealMinutos()
      };

      await updateUniversityCurso(tenantActual.id, cursoId, dataToSave, token);

      // Actualizar el form local si se auto-completó la duración
      if (!cursoForm.duracion_estimada_minutos && dataToSave.duracion_estimada_minutos > 0) {
        setCursoForm(prev => ({ ...prev, duracion_estimada_minutos: dataToSave.duracion_estimada_minutos }));
      }

      alert('Curso guardado exitosamente');
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSeccion = (seccionId: string) => {
    setExpandedSecciones(prev => {
      const next = new Set(prev);
      if (next.has(seccionId)) {
        next.delete(seccionId);
      } else {
        next.add(seccionId);
      }
      return next;
    });
  };

  const handleCreateSeccion = async (data: Partial<UniversitySeccion>) => {
    if (!tenantActual?.id || !cursoId) return;

    try {
      const token = await getToken();
      await createUniversitySeccion(tenantActual.id, cursoId, data, token);
      setSeccionModal({ open: false });
      loadData();
    } catch (err: any) {
      alert('Error al crear sección: ' + err.message);
    }
  };

  const handleUpdateSeccion = async (seccionId: string, data: Partial<UniversitySeccion>) => {
    if (!tenantActual?.id) return;

    try {
      const token = await getToken();
      await updateUniversitySeccion(tenantActual.id, seccionId, data, token);
      setSeccionModal({ open: false });
      loadData();
    } catch (err: any) {
      alert('Error al actualizar sección: ' + err.message);
    }
  };

  const handleDeleteSeccion = async (seccionId: string, titulo: string) => {
    if (!tenantActual?.id) return;
    if (!confirm(`¿Eliminar la sección "${titulo}" y todos sus videos?`)) return;

    try {
      const token = await getToken();
      await deleteUniversitySeccion(tenantActual.id, seccionId, token);
      loadData();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleCreateVideo = async (seccionId: string, data: Partial<UniversityVideo>) => {
    if (!tenantActual?.id) return;

    try {
      const token = await getToken();
      await createUniversityVideo(tenantActual.id, seccionId, data, token);
      setVideoModal({ open: false });
      loadData();
    } catch (err: any) {
      alert('Error al crear video: ' + err.message);
    }
  };

  const handleUpdateVideo = async (videoId: string, data: Partial<UniversityVideo>) => {
    if (!tenantActual?.id) return;

    try {
      const token = await getToken();
      await updateUniversityVideo(tenantActual.id, videoId, data, token);
      setVideoModal({ open: false });
      loadData();
    } catch (err: any) {
      alert('Error al actualizar video: ' + err.message);
    }
  };

  const handleDeleteVideo = async (videoId: string, titulo: string) => {
    if (!tenantActual?.id) return;
    if (!confirm(`¿Eliminar el video "${titulo}"?`)) return;

    try {
      const token = await getToken();
      await deleteUniversityVideo(tenantActual.id, videoId, token);
      loadData();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleToggleCertificado = async (certificadoId: string) => {
    if (!tenantActual?.id || !cursoId) return;

    const isAsignado = certificadosAsignados.has(certificadoId);

    try {
      const token = await getToken();
      if (isAsignado) {
        await removerCertificadoDeCurso(tenantActual.id, cursoId, certificadoId, token);
        setCertificadosAsignados(prev => {
          const next = new Set(prev);
          next.delete(certificadoId);
          return next;
        });
      } else {
        await asignarCertificadoACurso(tenantActual.id, cursoId, certificadoId, 100, false, token);
        setCertificadosAsignados(prev => new Set(prev).add(certificadoId));
      }
    } catch (err: any) {
      alert('Error al ' + (isAsignado ? 'desasignar' : 'asignar') + ' certificado: ' + err.message);
    }
  };

  const handleToggleAccesoRol = async (rolId: string, tieneAcceso: boolean) => {
    if (!tenantActual?.id || !cursoId) return;

    try {
      const token = await getToken();
      if (tieneAcceso) {
        // Remover acceso
        await removeAccesoRolCurso(tenantActual.id, cursoId, rolId, token);
        setAccesoRoles(prev => prev.filter(a => a.rol_id !== rolId));
      } else {
        // Agregar acceso (completo por defecto)
        await setAccesoRolCurso(tenantActual.id, cursoId, { rol_id: rolId, seccion_limite_id: null }, token);
        const rol = roles.find(r => r.id === rolId);
        setAccesoRoles(prev => [...prev, {
          id: crypto.randomUUID(),
          curso_id: cursoId,
          rol_id: rolId,
          seccion_limite_id: null,
          rol_nombre: rol?.nombre || '',
          seccion_limite_titulo: null,
        }]);
      }
    } catch (err: any) {
      alert('Error al cambiar acceso: ' + err.message);
    }
  };

  const handleChangeSeccionLimite = async (rolId: string, seccionLimiteId: string | null) => {
    if (!tenantActual?.id || !cursoId) return;

    try {
      const token = await getToken();
      await setAccesoRolCurso(tenantActual.id, cursoId, { rol_id: rolId, seccion_limite_id: seccionLimiteId }, token);

      const seccion = seccionLimiteId ? secciones.find(s => s.id === seccionLimiteId) : null;
      setAccesoRoles(prev => prev.map(a =>
        a.rol_id === rolId
          ? { ...a, seccion_limite_id: seccionLimiteId, seccion_limite_titulo: seccion?.titulo || null }
          : a
      ));
    } catch (err: any) {
      alert('Error al cambiar límite: ' + err.message);
    }
  };

  const formatDuracion = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalVideos = () => secciones.reduce((acc, s) => acc + (s.videos?.length || 0), 0);

  // Obtener total de segundos de todos los videos
  const getTotalSegundos = () => secciones.reduce((acc, s) =>
    acc + (s.videos?.reduce((vacc, v) => vacc + (v.duracion_segundos || 0), 0) || 0), 0
  );

  // Obtener duración formateada para mostrar
  const getTotalDuracion = () => {
    const totalSecs = getTotalSegundos();
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Obtener duración real en minutos (redondeando hacia arriba)
  const getDuracionRealMinutos = () => Math.ceil(getTotalSegundos() / 60);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando curso...</p>
        <style>{styles}</style>
      </div>
    );
  }

  if (error || !curso) {
    return (
      <div className="error-container">
        <p>{error || 'Curso no encontrado'}</p>
        <button onClick={() => navigate(`/crm/${tenantSlug}/university`)} className="btn-primary">
          Volver a University
        </button>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="curso-editor">
      {/* Tabs */}
      <div className="editor-tabs">
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          Información General
        </button>
        <button
          className={`tab ${activeTab === 'contenido' ? 'active' : ''}`}
          onClick={() => setActiveTab('contenido')}
        >
          Contenido ({secciones.length} secciones, {getTotalVideos()} videos)
        </button>
        <button
          className={`tab ${activeTab === 'certificados' ? 'active' : ''}`}
          onClick={() => setActiveTab('certificados')}
        >
          Certificados
        </button>
        <button
          className={`tab ${activeTab === 'acceso' ? 'active' : ''}`}
          onClick={() => setActiveTab('acceso')}
        >
          Acceso por Rol
        </button>
      </div>

      {/* Tab: General */}
      {activeTab === 'general' && (
        <div className="tab-content">
          <div className="form-card">
            <div className="form-group">
              <label>Título del Curso *</label>
              <input
                type="text"
                value={cursoForm.titulo}
                onChange={(e) => setCursoForm({ ...cursoForm, titulo: e.target.value })}
                placeholder="Nombre del curso"
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={cursoForm.descripcion}
                onChange={(e) => setCursoForm({ ...cursoForm, descripcion: e.target.value })}
                placeholder="Describe el contenido y objetivos del curso"
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nivel</label>
                <select
                  value={cursoForm.nivel}
                  onChange={(e) => setCursoForm({ ...cursoForm, nivel: e.target.value as any })}
                >
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>

              <div className="form-group">
                <label>Estado</label>
                <select
                  value={cursoForm.estado}
                  onChange={(e) => setCursoForm({ ...cursoForm, estado: e.target.value as any })}
                >
                  <option value="borrador">Borrador</option>
                  <option value="publicado">Publicado</option>
                  <option value="archivado">Archivado</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Duración Estimada (minutos)</label>
                <input
                  type="number"
                  value={cursoForm.duracion_estimada_minutos}
                  onChange={(e) => setCursoForm({ ...cursoForm, duracion_estimada_minutos: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <span className="form-hint">Duración real: {getTotalDuracion()}</span>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cursoForm.es_pago}
                    onChange={(e) => setCursoForm({ ...cursoForm, es_pago: e.target.checked })}
                  />
                  Curso de Pago (Premium)
                </label>
              </div>
            </div>

            {cursoForm.es_pago && (
              <div className="form-row">
                <div className="form-group">
                  <label>Precio</label>
                  <input
                    type="number"
                    value={cursoForm.precio || ''}
                    onChange={(e) => setCursoForm({ ...cursoForm, precio: parseFloat(e.target.value) || undefined })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Moneda</label>
                  <select
                    value={cursoForm.moneda}
                    onChange={(e) => setCursoForm({ ...cursoForm, moneda: e.target.value })}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="MXN">MXN</option>
                    <option value="DOP">DOP</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Contenido */}
      {activeTab === 'contenido' && (
        <div className="tab-content">
          <div className="content-header">
            <div className="content-stats">
              <span>{secciones.length} secciones</span>
              <span>{getTotalVideos()} videos</span>
              <span>{getTotalDuracion()} duración total</span>
            </div>
            <button
              className="btn-primary"
              onClick={() => setSeccionModal({ open: true })}
            >
              {Icons.plus}
              Nueva Sección
            </button>
          </div>

          {secciones.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{Icons.folder}</div>
              <h3>Sin secciones</h3>
              <p>Agrega secciones para organizar el contenido del curso</p>
              <button
                className="btn-primary"
                onClick={() => setSeccionModal({ open: true })}
              >
                {Icons.plus}
                Crear Primera Sección
              </button>
            </div>
          ) : (
            <div className="secciones-list">
              {secciones.map((seccion, index) => (
                <div key={seccion.id} className="seccion-item">
                  <div
                    className="seccion-header"
                    onClick={() => toggleSeccion(seccion.id)}
                  >
                    <div className="seccion-drag">{Icons.grip}</div>
                    <span className="seccion-chevron">
                      {expandedSecciones.has(seccion.id) ? Icons.chevronDown : Icons.chevronRight}
                    </span>
                    <span className="seccion-number">{index + 1}</span>
                    <div className="seccion-info">
                      <span className="seccion-titulo">{seccion.titulo}</span>
                      <span className="seccion-meta">
                        {seccion.videos?.length || 0} videos
                        {seccion.es_pago_adicional && <span className="badge-premium">Premium</span>}
                      </span>
                    </div>
                    <div className="seccion-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon-sm"
                        onClick={() => setVideoModal({ open: true, seccionId: seccion.id })}
                        title="Agregar video"
                      >
                        {Icons.plus}
                      </button>
                      <button
                        className="btn-icon-sm"
                        onClick={() => setSeccionModal({ open: true, seccion })}
                        title="Editar sección"
                      >
                        {Icons.edit}
                      </button>
                      <button
                        className="btn-icon-sm-danger"
                        onClick={() => handleDeleteSeccion(seccion.id, seccion.titulo)}
                        title="Eliminar sección"
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  </div>

                  {expandedSecciones.has(seccion.id) && (
                    <div className="seccion-content">
                      {seccion.videos && seccion.videos.length > 0 ? (
                        <div className="videos-list">
                          {seccion.videos.map((video) => (
                            <div key={video.id} className="video-item">
                              <div className="video-drag">{Icons.grip}</div>
                              <div className="video-icon">
                                {video.es_preview ? Icons.play : Icons.video}
                              </div>
                              <div className="video-info">
                                <span className="video-titulo">{video.titulo}</span>
                                <div className="video-meta">
                                  <span>{Icons.clock} {formatDuracion(video.duracion_segundos)}</span>
                                  <span>{video.proveedor}</span>
                                  {video.es_preview && <span className="badge-preview">Preview</span>}
                                  {video.es_pago_adicional && <span className="badge-premium">Premium</span>}
                                </div>
                              </div>
                              <div className="video-actions">
                                <button
                                  className="btn-icon-sm"
                                  onClick={() => setVideoModal({ open: true, seccionId: seccion.id, video })}
                                  title="Editar video"
                                >
                                  {Icons.edit}
                                </button>
                                <button
                                  className="btn-icon-sm-danger"
                                  onClick={() => handleDeleteVideo(video.id, video.titulo)}
                                  title="Eliminar video"
                                >
                                  {Icons.trash}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="videos-empty">
                          <p>Sin videos en esta sección</p>
                          <button
                            className="btn-text"
                            onClick={() => setVideoModal({ open: true, seccionId: seccion.id })}
                          >
                            {Icons.plus} Agregar primer video
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Certificados */}
      {activeTab === 'certificados' && (
        <div className="tab-content">
          <div className="certificates-info">
            <div className="info-icon">{Icons.certificate}</div>
            <h3>Certificados del Curso</h3>
            <p>Los certificados se emiten automáticamente cuando un estudiante completa el curso según los requisitos establecidos.</p>
          </div>

          {certificados.length === 0 ? (
            <div className="empty-state">
              <p>No hay certificados configurados para este tenant.</p>
              <p className="text-muted">Crea certificados desde la sección de Certificados de University.</p>
            </div>
          ) : (
            <div className="certificates-grid">
              {certificados.map((cert) => {
                const isAsignado = certificadosAsignados.has(cert.id);
                return (
                  <div key={cert.id} className={`certificate-card ${isAsignado ? 'assigned' : ''}`}>
                    <div className="cert-icon">{Icons.certificate}</div>
                    <div className="cert-info">
                      <h4>{cert.nombre}</h4>
                      {cert.descripcion && <p>{cert.descripcion}</p>}
                    </div>
                    <label className="cert-toggle">
                      <input
                        type="checkbox"
                        checked={isAsignado}
                        onChange={() => handleToggleCertificado(cert.id)}
                      />
                      <span>{isAsignado ? 'Asignado a este curso' : 'Asociar a este curso'}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Acceso por Rol */}
      {activeTab === 'acceso' && (
        <div className="tab-content">
          <div className="acceso-info">
            <div className="info-icon">{Icons.users}</div>
            <h3>Control de Acceso por Rol</h3>
            <p>Define qué roles pueden ver este curso y hasta qué sección tienen acceso. Los roles sin marcar no podrán ver el curso en "Mi Entrenamiento".</p>
          </div>

          {roles.length === 0 ? (
            <div className="empty-state">
              <p>No hay roles configurados para este tenant.</p>
              <p className="text-muted">Crea roles desde la sección de Configuración.</p>
            </div>
          ) : (
            <div className="acceso-table">
              <div className="acceso-header">
                <span className="col-check">Acceso</span>
                <span className="col-rol">Rol</span>
                <span className="col-limite">Límite de Secciones</span>
              </div>
              {roles.map((rol) => {
                const acceso = accesoRoles.find(a => a.rol_id === rol.id);
                const tieneAcceso = !!acceso;
                return (
                  <div key={rol.id} className={`acceso-row ${tieneAcceso ? 'has-access' : ''}`}>
                    <div className="col-check">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={tieneAcceso}
                          onChange={() => handleToggleAccesoRol(rol.id, tieneAcceso)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    <div className="col-rol">
                      <span className="rol-nombre">{rol.nombre}</span>
                      {rol.descripcion && <span className="rol-desc">{rol.descripcion}</span>}
                    </div>
                    <div className="col-limite">
                      {tieneAcceso ? (
                        <select
                          value={acceso.seccion_limite_id || ''}
                          onChange={(e) => handleChangeSeccionLimite(rol.id, e.target.value || null)}
                        >
                          <option value="">Acceso Completo</option>
                          {secciones.map((seccion, idx) => (
                            <option key={seccion.id} value={seccion.id}>
                              Hasta: {idx + 1}. {seccion.titulo}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="no-access">{Icons.lock} Sin acceso</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="acceso-legend">
            <div className="legend-item">
              <span className="legend-icon full">{Icons.unlock}</span>
              <span>Acceso Completo: Ve todas las secciones del curso</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon partial">{Icons.lock}</span>
              <span>Acceso Parcial: Ve hasta la sección indicada (inclusive)</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sección */}
      {seccionModal.open && (
        <SeccionModal
          seccion={seccionModal.seccion}
          onClose={() => setSeccionModal({ open: false })}
          onSave={(data) => {
            if (seccionModal.seccion) {
              handleUpdateSeccion(seccionModal.seccion.id, data);
            } else {
              handleCreateSeccion(data);
            }
          }}
        />
      )}

      {/* Modal: Video */}
      {videoModal.open && videoModal.seccionId && (
        <VideoModal
          video={videoModal.video}
          onClose={() => setVideoModal({ open: false })}
          onSave={(data) => {
            if (videoModal.video) {
              handleUpdateVideo(videoModal.video.id, data);
            } else if (videoModal.seccionId) {
              handleCreateVideo(videoModal.seccionId, data);
            }
          }}
        />
      )}

      <style>{styles}</style>
    </div>
  );
}

// Modal: Sección
function SeccionModal({
  seccion,
  onClose,
  onSave,
}: {
  seccion?: UniversitySeccion;
  onClose: () => void;
  onSave: (data: Partial<UniversitySeccion>) => void;
}) {
  const [form, setForm] = useState({
    titulo: seccion?.titulo || '',
    descripcion: seccion?.descripcion || '',
    es_pago_adicional: seccion?.es_pago_adicional || false,
    precio_seccion: seccion?.precio_seccion || undefined,
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{seccion ? 'Editar Sección' : 'Nueva Sección'}</h2>
          <button className="modal-close" onClick={onClose}>{Icons.x}</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Título de la Sección *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej: Introducción, Módulo 1, etc."
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Descripción (opcional)</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Describe el contenido de esta sección"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.es_pago_adicional}
                onChange={(e) => setForm({ ...form, es_pago_adicional: e.target.checked })}
              />
              Contenido Premium (pago adicional)
            </label>
          </div>

          {form.es_pago_adicional && (
            <div className="form-group">
              <label>Precio de la sección</label>
              <input
                type="number"
                value={form.precio_seccion || ''}
                onChange={(e) => setForm({ ...form, precio_seccion: parseFloat(e.target.value) || undefined })}
                min="0"
                step="0.01"
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => {
              if (!form.titulo.trim()) {
                alert('El título es requerido');
                return;
              }
              onSave(form);
            }}
          >
            {seccion ? 'Guardar Cambios' : 'Crear Sección'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal: Video
function VideoModal({
  video,
  onClose,
  onSave,
}: {
  video?: UniversityVideo;
  onClose: () => void;
  onSave: (data: Partial<UniversityVideo>) => void;
}) {
  // Convertir segundos a horas/minutos/segundos
  const initialSeconds = video?.duracion_segundos || 0;
  const initialHours = Math.floor(initialSeconds / 3600);
  const initialMinutes = Math.floor((initialSeconds % 3600) / 60);
  const initialSecs = initialSeconds % 60;

  const [form, setForm] = useState({
    titulo: video?.titulo || '',
    descripcion: video?.descripcion || '',
    url_video: video?.url_video || '',
    proveedor: video?.proveedor || 'youtube' as 'youtube' | 'vimeo' | 'cloudflare' | 'custom',
    es_preview: video?.es_preview || false,
    es_pago_adicional: video?.es_pago_adicional || false,
    precio_video: video?.precio_video || undefined,
  });

  // Estado separado para duración
  const [duracion, setDuracion] = useState({
    horas: initialHours,
    minutos: initialMinutes,
    segundos: initialSecs,
  });

  // Auto-detectar proveedor por URL
  useEffect(() => {
    const url = form.url_video.toLowerCase();
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      setForm(f => ({ ...f, proveedor: 'youtube' }));
    } else if (url.includes('vimeo.com')) {
      setForm(f => ({ ...f, proveedor: 'vimeo' }));
    } else if (url.includes('cloudflare')) {
      setForm(f => ({ ...f, proveedor: 'cloudflare' }));
    }
  }, [form.url_video]);

  // Calcular total de segundos
  const totalSegundos = (duracion.horas * 3600) + (duracion.minutos * 60) + duracion.segundos;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{video ? 'Editar Video' : 'Nuevo Video'}</h2>
          <button className="modal-close" onClick={onClose}>{Icons.x}</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Título del Video *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej: Lección 1 - Introducción"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>URL del Video *</label>
            <input
              type="url"
              value={form.url_video}
              onChange={(e) => setForm({ ...form, url_video: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Proveedor</label>
              <select
                value={form.proveedor}
                onChange={(e) => setForm({ ...form, proveedor: e.target.value as any })}
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="cloudflare">Cloudflare Stream</option>
                <option value="custom">Otro (Custom)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Duración</label>
              <div className="duracion-inputs">
                <div className="duracion-field">
                  <input
                    type="number"
                    value={duracion.horas}
                    onChange={(e) => setDuracion({ ...duracion, horas: Math.max(0, parseInt(e.target.value) || 0) })}
                    min="0"
                    max="99"
                  />
                  <span>h</span>
                </div>
                <div className="duracion-field">
                  <input
                    type="number"
                    value={duracion.minutos}
                    onChange={(e) => setDuracion({ ...duracion, minutos: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                    min="0"
                    max="59"
                  />
                  <span>m</span>
                </div>
                <div className="duracion-field">
                  <input
                    type="number"
                    value={duracion.segundos}
                    onChange={(e) => setDuracion({ ...duracion, segundos: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                    min="0"
                    max="59"
                  />
                  <span>s</span>
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Descripción (opcional)</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Describe el contenido del video"
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.es_preview}
                  onChange={(e) => setForm({ ...form, es_preview: e.target.checked })}
                />
                Video de Preview (visible sin pagar)
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.es_pago_adicional}
                  onChange={(e) => setForm({ ...form, es_pago_adicional: e.target.checked })}
                />
                Requiere pago adicional
              </label>
            </div>
          </div>

          {form.es_pago_adicional && (
            <div className="form-group">
              <label>Precio del video</label>
              <input
                type="number"
                value={form.precio_video || ''}
                onChange={(e) => setForm({ ...form, precio_video: parseFloat(e.target.value) || undefined })}
                min="0"
                step="0.01"
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => {
              if (!form.titulo.trim()) {
                alert('El título es requerido');
                return;
              }
              if (!form.url_video.trim()) {
                alert('La URL del video es requerida');
                return;
              }
              onSave({
                ...form,
                duracion_segundos: totalSegundos,
              });
            }}
          >
            {video ? 'Guardar Cambios' : 'Agregar Video'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = `
  .curso-editor {
    padding: 0;
  }

  .editor-tabs {
    display: flex;
    gap: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 4px;
    margin-bottom: 24px;
    width: fit-content;
  }

  .tab {
    padding: 10px 20px;
    border: none;
    background: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tab:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  .tab.active {
    background: #2563eb;
    color: white;
  }

  .tab-content {
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .form-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
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
  .form-group input[type="url"],
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

  .form-hint {
    display: block;
    margin-top: 4px;
    font-size: 0.75rem;
    color: #64748b;
  }

  .duracion-inputs {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .duracion-field {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .duracion-field input {
    width: 60px;
    text-align: center;
  }

  .duracion-field span {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    margin-top: 8px;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }

  /* Contenido */
  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .content-stats {
    display: flex;
    gap: 16px;
    color: #64748b;
    font-size: 0.875rem;
  }

  .content-stats span {
    background: #f1f5f9;
    padding: 4px 12px;
    border-radius: 20px;
  }

  .secciones-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .seccion-item {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
  }

  .seccion-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .seccion-header:hover {
    background: #f8fafc;
  }

  .seccion-drag {
    color: #cbd5e1;
    cursor: grab;
  }

  .seccion-chevron {
    color: #64748b;
    transition: transform 0.2s;
  }

  .seccion-number {
    width: 24px;
    height: 24px;
    background: #eff6ff;
    color: #2563eb;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .seccion-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .seccion-titulo {
    font-weight: 500;
    color: #0f172a;
  }

  .seccion-meta {
    font-size: 0.75rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .seccion-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .seccion-header:hover .seccion-actions {
    opacity: 1;
  }

  .seccion-content {
    border-top: 1px solid #e2e8f0;
    padding: 12px 16px 12px 56px;
    background: #f8fafc;
  }

  .videos-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .video-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.15s;
  }

  .video-item:hover {
    border-color: #2563eb;
  }

  .video-drag {
    color: #cbd5e1;
    cursor: grab;
  }

  .video-icon {
    width: 32px;
    height: 32px;
    background: #eff6ff;
    color: #2563eb;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .video-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .video-titulo {
    font-size: 0.875rem;
    font-weight: 500;
    color: #0f172a;
  }

  .video-meta {
    font-size: 0.75rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .video-meta span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .video-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .videos-empty {
    text-align: center;
    padding: 20px;
    color: #64748b;
  }

  .btn-icon-sm {
    width: 28px;
    height: 28px;
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

  .btn-icon-sm:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .btn-icon-sm-danger {
    width: 28px;
    height: 28px;
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

  .btn-icon-sm-danger:hover {
    background: #fecaca;
    color: #b91c1c;
  }

  .btn-text {
    background: none;
    border: none;
    color: #2563eb;
    font-size: 0.875rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .btn-text:hover {
    text-decoration: underline;
  }

  .badge-premium {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge-preview {
    background: #dcfce7;
    color: #16a34a;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  /* Certificados */
  .certificates-info {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    margin-bottom: 24px;
  }

  .certificates-info .info-icon {
    width: 48px;
    height: 48px;
    background: #eff6ff;
    color: #2563eb;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
  }

  .certificates-info h3 {
    margin: 0 0 8px 0;
    color: #0f172a;
  }

  .certificates-info p {
    margin: 0;
    color: #64748b;
    font-size: 0.875rem;
  }

  .certificates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .certificate-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .cert-icon {
    width: 40px;
    height: 40px;
    background: #fef3c7;
    color: #d97706;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cert-info h4 {
    margin: 0;
    font-size: 1rem;
    color: #0f172a;
  }

  .cert-info p {
    margin: 4px 0 0 0;
    font-size: 0.8125rem;
    color: #64748b;
  }

  .cert-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    font-size: 0.875rem;
    cursor: pointer;
  }

  /* Empty & Loading */
  .empty-state {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 48px 24px;
    text-align: center;
  }

  .empty-icon {
    width: 56px;
    height: 56px;
    background: #f1f5f9;
    color: #64748b;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    color: #0f172a;
  }

  .empty-state p {
    margin: 0 0 20px 0;
    color: #64748b;
  }

  .loading-container,
  .error-container {
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
    margin-bottom: 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Buttons */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
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

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    background: white;
    color: #374151;
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

  /* Modal */
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

  .modal-content.modal-sm {
    max-width: 420px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.125rem;
    color: #0f172a;
  }

  .modal-close {
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
  }

  .modal-close:hover {
    background: #e2e8f0;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid #e2e8f0;
  }

  /* Acceso por Rol */
  .acceso-info {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    margin-bottom: 24px;
  }

  .acceso-info .info-icon {
    width: 48px;
    height: 48px;
    background: #eff6ff;
    color: #2563eb;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
  }

  .acceso-info h3 {
    margin: 0 0 8px 0;
    color: #0f172a;
  }

  .acceso-info p {
    margin: 0;
    color: #64748b;
    font-size: 0.875rem;
  }

  .acceso-table {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
  }

  .acceso-header {
    display: grid;
    grid-template-columns: 80px 1fr 200px;
    gap: 16px;
    padding: 12px 20px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .acceso-row {
    display: grid;
    grid-template-columns: 80px 1fr 200px;
    gap: 16px;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    align-items: center;
    transition: background 0.15s;
  }

  .acceso-row:last-child {
    border-bottom: none;
  }

  .acceso-row:hover {
    background: #f8fafc;
  }

  .acceso-row.has-access {
    background: #f0fdf4;
  }

  .acceso-row.has-access:hover {
    background: #dcfce7;
  }

  .col-rol {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rol-nombre {
    font-weight: 500;
    color: #0f172a;
  }

  .rol-desc {
    font-size: 0.75rem;
    color: #64748b;
  }

  .col-limite select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.875rem;
    background: white;
  }

  .col-limite select:focus {
    outline: none;
    border-color: #2563eb;
  }

  .no-access {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #94a3b8;
    font-size: 0.875rem;
  }

  /* Toggle Switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    inset: 0;
    background: #e2e8f0;
    border-radius: 24px;
    transition: 0.2s;
  }

  .toggle-slider::before {
    content: "";
    position: absolute;
    width: 18px;
    height: 18px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .toggle-switch input:checked + .toggle-slider {
    background: #22c55e;
  }

  .toggle-switch input:checked + .toggle-slider::before {
    transform: translateX(20px);
  }

  /* Legend */
  .acceso-legend {
    display: flex;
    gap: 24px;
    margin-top: 16px;
    padding: 12px 16px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8125rem;
    color: #64748b;
  }

  .legend-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }

  .legend-icon.full {
    background: #dcfce7;
    color: #16a34a;
  }

  .legend-icon.partial {
    background: #fef3c7;
    color: #d97706;
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }

    .editor-tabs {
      width: 100%;
      overflow-x: auto;
    }

    .tab {
      white-space: nowrap;
    }

    .acceso-header,
    .acceso-row {
      grid-template-columns: 60px 1fr;
    }

    .col-limite {
      grid-column: span 2;
      margin-top: 8px;
    }

    .acceso-legend {
      flex-direction: column;
      gap: 8px;
    }
  }
`;
