/**
 * CrmUniversityCertificadosEmitidos - Gestión de certificados emitidos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getCertificadosEmitidos,
  emitirCertificadoManual,
  getUniversityCertificados,
  getUniversityCursos,
  CertificadoEmitido,
  UniversityCertificado,
  UniversityCurso,
} from '../../services/api';
import { Award, ArrowLeft, Plus, FileText, ExternalLink, X, Copy, Check, Download, CheckCircle, Search, Calendar, Filter } from 'lucide-react';
import DateRangeFilter, { DateRangePreset } from '../../components/DateRangeFilter';

export default function CrmUniversityCertificadosEmitidos() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const [emitidos, setEmitidos] = useState<CertificadoEmitido[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Estados para filtros
  const [searchText, setSearchText] = useState('');
  const [cursoFilter, setCursoFilter] = useState('');
  const [dateRange, setDateRange] = useState<{ preset?: DateRangePreset; start?: string; end?: string }>({});
  const [showDateModal, setShowDateModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const result = await getCertificadosEmitidos(tenantActual.id, { limit: 100 }, token);
      setEmitidos(result.certificados);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || 'Error al cargar certificados emitidos');
      console.error('Error cargando certificados emitidos:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageHeader({
      title: 'Certificados Emitidos',
      subtitle: `${total} certificados otorgados a estudiantes`,
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate(`/crm/${tenantSlug}/university`)}
            className="btn-secondary"
          >
            <ArrowLeft size={18} />
            Volver a University
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary"
          >
            <Plus size={18} />
            Emitir Certificado
          </button>
        </div>
      ),
    });
  }, [setPageHeader, tenantSlug, navigate, total]);

  const handleCopyCode = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiedCode(codigo);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getVerificationUrl = (codigo: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/verificar/${codigo}`;
  };

  const handleEmitSuccess = () => {
    setModalOpen(false);
    loadData();
  };

  // Filtrar certificados
  const filteredEmitidos = useMemo(() => {
    return emitidos.filter((cert) => {
      // Filtro por texto (nombre o curso)
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchesNombre = (cert.nombre_usuario || '').toLowerCase().includes(search);
        const matchesCurso = (cert.nombre_curso || '').toLowerCase().includes(search);
        const matchesEmail = (cert.email_usuario || '').toLowerCase().includes(search);
        if (!matchesNombre && !matchesCurso && !matchesEmail) return false;
      }

      // Filtro por curso
      if (cursoFilter) {
        if (cert.nombre_curso !== cursoFilter) return false;
      }

      // Filtro por fecha (usando fecha local del certificado)
      if (dateRange.start || dateRange.end) {
        const certDate = new Date(cert.fecha_emision);
        // Obtener solo la fecha local del certificado (sin hora)
        const certDateStr = certDate.toLocaleDateString('en-CA'); // formato YYYY-MM-DD

        if (dateRange.start && certDateStr < dateRange.start) {
          return false;
        }

        if (dateRange.end && certDateStr > dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }, [emitidos, searchText, cursoFilter, dateRange]);

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSearchText('');
    setCursoFilter('');
    setDateRange({});
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = searchText || cursoFilter || dateRange.start || dateRange.end;

  // Obtener cursos unicos de los certificados emitidos
  const uniqueCursos = useMemo(() => {
    const cursosSet = new Set(emitidos.map(e => e.nombre_curso).filter(Boolean));
    return Array.from(cursosSet).sort();
  }, [emitidos]);

  // Formatear label del rango de fechas
  const getDateRangeLabel = () => {
    if (!dateRange.start && !dateRange.end) return 'Fecha';
    if (dateRange.preset && dateRange.preset !== 'custom') {
      const presetLabels: Record<string, string> = {
        today: 'Hoy',
        yesterday: 'Ayer',
        last_week: 'Semana pasada',
        this_month: 'Este mes',
        last_month: 'Mes pasado',
        last_quarter: 'Trimestre pasado',
        last_semester: 'Semestre pasado',
        this_year: 'Este año',
        last_year: 'Año pasado',
      };
      return presetLabels[dateRange.preset] || 'Personalizado';
    }
    if (dateRange.start && dateRange.end) {
      return `${new Date(dateRange.start).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${new Date(dateRange.end).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
    }
    return 'Fecha';
  };

  if (loading && emitidos.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando certificados emitidos...</p>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="emitidos-page">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {/* Barra de filtros */}
      {emitidos.length > 0 && (
        <div className="filters-bar">
          <div className="filter-group">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Buscar por nombre, email o curso..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && (
                <button className="clear-input" onClick={() => setSearchText('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              className="filter-select"
              value={cursoFilter}
              onChange={(e) => setCursoFilter(e.target.value)}
            >
              <option value="">Todos los cursos</option>
              {uniqueCursos.map((curso) => (
                <option key={curso} value={curso}>{curso}</option>
              ))}
            </select>

            <button
              className={`filter-date-btn ${dateRange.start || dateRange.end ? 'active' : ''}`}
              onClick={() => setShowDateModal(true)}
            >
              <Calendar size={16} />
              {getDateRangeLabel()}
            </button>
          </div>

          <div className="filter-actions">
            {hasActiveFilters && (
              <button className="btn-clear-filters" onClick={clearFilters}>
                <X size={14} />
                Limpiar filtros
              </button>
            )}
            <span className="results-count">
              {filteredEmitidos.length} de {emitidos.length} certificados
            </span>
          </div>
        </div>
      )}

      {emitidos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Award size={48} /></div>
          <h3>No hay certificados emitidos</h3>
          <p>Cuando los estudiantes completen cursos o emitas certificados manualmente, apareceran aqui</p>
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={18} />
            Emitir Certificado Manual
          </button>
        </div>
      ) : filteredEmitidos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><Filter size={48} /></div>
          <h3>No hay resultados</h3>
          <p>No se encontraron certificados que coincidan con los filtros aplicados</p>
          <button className="btn-secondary" onClick={clearFilters}>
            <X size={18} />
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="emitidos-list">
          <div className="list-header">
            <div className="col-estudiante">Estudiante</div>
            <div className="col-curso">Curso</div>
            <div className="col-certificado">Certificado</div>
            <div className="col-codigo">Código de Verificación</div>
            <div className="col-fecha">Fecha</div>
            <div className="col-acciones">Acciones</div>
          </div>
          {filteredEmitidos.map((cert) => (
            <div key={cert.id} className="list-row">
              <div className="col-estudiante">
                <div className="estudiante-info">
                  <span className="estudiante-nombre">{cert.nombre_usuario || 'Sin nombre'}</span>
                  <span className="estudiante-email">{cert.email_usuario}</span>
                </div>
              </div>
              <div className="col-curso">{cert.nombre_curso}</div>
              <div className="col-certificado">{cert.nombre_certificado}</div>
              <div className="col-codigo">
                <div className="codigo-container">
                  <code className="codigo">{cert.codigo_verificacion}</code>
                  <button
                    className="btn-copy"
                    onClick={() => handleCopyCode(cert.codigo_verificacion)}
                    title="Copiar código"
                  >
                    {copiedCode === cert.codigo_verificacion ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
              <div className="col-fecha">
                {new Date(cert.fecha_emision).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
              <div className="col-acciones">
                <button
                  className="btn-icon"
                  onClick={() => window.open(getVerificationUrl(cert.codigo_verificacion), '_blank')}
                  title="Ver certificado"
                >
                  <ExternalLink size={16} />
                </button>
                {cert.url_pdf && (
                  <button
                    className="btn-icon"
                    onClick={() => window.open(cert.url_pdf, '_blank')}
                    title="Descargar PDF"
                  >
                    <FileText size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de filtro de fechas */}
      {showDateModal && (
        <div className="modal-overlay" onClick={() => setShowDateModal(false)}>
          <div className="modal-content date-modal" onClick={(e) => e.stopPropagation()}>
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              onClose={() => setShowDateModal(false)}
            />
          </div>
        </div>
      )}

      {modalOpen && (
        <EmitirCertificadoModal
          tenantId={tenantActual?.id || ''}
          getToken={getToken}
          onClose={() => setModalOpen(false)}
          onSuccess={handleEmitSuccess}
        />
      )}

      <style>{styles}</style>
    </div>
  );
}

// Interfaz para el resultado de emisión
interface EmisionResult {
  codigo_verificacion: string;
  nombre_estudiante: string;
  nombre_curso: string;
  nombre_certificado: string;
}

// Modal para emitir certificado manualmente
function EmitirCertificadoModal({
  tenantId,
  getToken,
  onClose,
  onSuccess,
}: {
  tenantId: string;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [cursos, setCursos] = useState<UniversityCurso[]>([]);
  const [certificados, setCertificados] = useState<UniversityCertificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emisionResult, setEmisionResult] = useState<EmisionResult | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [form, setForm] = useState({
    curso_id: '',
    certificado_id: '',
    email: '',
    nombre: '',
  });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const token = await getToken();
      const [cursosRes, certsRes] = await Promise.all([
        getUniversityCursos(tenantId, token),
        getUniversityCertificados(tenantId, token),
      ]);
      // getUniversityCursos retorna directamente un array
      setCursos(cursosRes || []);
      setCertificados((certsRes || []).filter((c: UniversityCertificado) => c.activo));
    } catch (err) {
      console.error('Error cargando opciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.curso_id || !form.certificado_id || !form.email || !form.nombre) {
      alert('Todos los campos son requeridos');
      return;
    }

    if (!form.email.includes('@')) {
      alert('Email inválido');
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const result = await emitirCertificadoManual(tenantId, form, token);

      // Buscar nombres para mostrar en resultado
      const cursoSeleccionado = cursos.find(c => c.id === form.curso_id);
      const certSeleccionado = certificados.find(c => c.id === form.certificado_id);

      setEmisionResult({
        codigo_verificacion: result.codigo_verificacion,
        nombre_estudiante: form.nombre,
        nombre_curso: cursoSeleccionado?.titulo || 'Curso',
        nombre_certificado: certSeleccionado?.nombre || 'Certificado',
      });
    } catch (err: any) {
      alert('Error al emitir certificado: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getVerificationUrl = (codigo: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/verificar/${codigo}`;
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(type);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleOpenCertificate = () => {
    if (emisionResult) {
      window.open(getVerificationUrl(emisionResult.codigo_verificacion), '_blank');
    }
  };

  const handleFinish = () => {
    onSuccess();
  };

  // Vista de éxito después de emitir
  if (emisionResult) {
    const verificationUrl = getVerificationUrl(emisionResult.codigo_verificacion);

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-success" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header success-header">
            <div className="success-icon">
              <CheckCircle size={32} />
            </div>
            <h2>Certificado Emitido</h2>
            <button className="modal-close" onClick={handleFinish}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body">
            <div className="success-details">
              <div className="detail-row">
                <span className="detail-label">Estudiante:</span>
                <span className="detail-value">{emisionResult.nombre_estudiante}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Curso:</span>
                <span className="detail-value">{emisionResult.nombre_curso}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Certificado:</span>
                <span className="detail-value">{emisionResult.nombre_certificado}</span>
              </div>
            </div>

            <div className="result-section">
              <label>Codigo de Verificacion</label>
              <div className="copy-field">
                <code className="code-display">{emisionResult.codigo_verificacion}</code>
                <button
                  className="btn-copy-field"
                  onClick={() => handleCopy(emisionResult.codigo_verificacion, 'codigo')}
                >
                  {copiedItem === 'codigo' ? <Check size={16} /> : <Copy size={16} />}
                  {copiedItem === 'codigo' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="result-section">
              <label>Enlace de Verificacion</label>
              <div className="copy-field">
                <input
                  type="text"
                  value={verificationUrl}
                  readOnly
                  className="url-display"
                />
                <button
                  className="btn-copy-field"
                  onClick={() => handleCopy(verificationUrl, 'url')}
                >
                  {copiedItem === 'url' ? <Check size={16} /> : <Copy size={16} />}
                  {copiedItem === 'url' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn-action" onClick={handleOpenCertificate}>
                <ExternalLink size={18} />
                Ver Certificado
              </button>
              <button
                className="btn-action btn-action-primary"
                onClick={() => window.open(verificationUrl + '?download=pdf', '_blank')}
              >
                <Download size={18} />
                Descargar PDF
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => {
              setEmisionResult(null);
              setForm({ curso_id: '', certificado_id: '', email: '', nombre: '' });
            }}>
              Emitir Otro
            </button>
            <button className="btn-primary" onClick={handleFinish}>
              Finalizar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Emitir Certificado</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Cargando...</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Curso *</label>
                <select
                  value={form.curso_id}
                  onChange={(e) => setForm({ ...form, curso_id: e.target.value })}
                >
                  <option value="">Seleccionar curso</option>
                  {(cursos || []).map((curso) => (
                    <option key={curso.id} value={curso.id}>
                      {curso.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Certificado *</label>
                <select
                  value={form.certificado_id}
                  onChange={(e) => setForm({ ...form, certificado_id: e.target.value })}
                >
                  <option value="">Seleccionar certificado</option>
                  {(certificados || []).map((cert) => (
                    <option key={cert.id} value={cert.id}>
                      {cert.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Nombre del estudiante *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Juan Perez"
                />
              </div>

              <div className="form-group">
                <label>Email del estudiante *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="estudiante@ejemplo.com"
                />
              </div>

              <div className="info-box">
                <Award size={20} />
                <div>
                  <strong>Emision manual</strong>
                  <p>
                    Al emitir este certificado, se generara un codigo de verificacion unico
                    que el estudiante podra usar para validar su certificado en linea.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || loading}>
            {saving ? 'Emitiendo...' : 'Emitir Certificado'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = `
  .emitidos-page {
    padding: 0;
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
    margin-bottom: 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-banner {
    background: #fef2f2;
    color: #dc2626;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
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

  /* Estilos de filtros */
  .filters-bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .filter-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    color: #94a3b8;
    pointer-events: none;
  }

  .search-input {
    width: 280px;
    padding: 10px 36px 10px 40px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: all 0.15s;
  }

  .search-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .search-input::placeholder {
    color: #94a3b8;
  }

  .clear-input {
    position: absolute;
    right: 10px;
    width: 20px;
    height: 20px;
    border: none;
    background: #e2e8f0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #64748b;
    transition: all 0.15s;
  }

  .clear-input:hover {
    background: #cbd5e1;
    color: #374151;
  }

  .filter-select {
    padding: 10px 32px 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    background: white;
    cursor: pointer;
    min-width: 160px;
    transition: all 0.15s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
  }

  .filter-select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .filter-date-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    background: white;
    cursor: pointer;
    color: #374151;
    transition: all 0.15s;
  }

  .filter-date-btn:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  .filter-date-btn.active {
    border-color: #2563eb;
    background: #eff6ff;
    color: #2563eb;
  }

  .filter-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .btn-clear-filters {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: none;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-clear-filters:hover {
    background: #fecaca;
  }

  .results-count {
    font-size: 0.8rem;
    color: #64748b;
    white-space: nowrap;
  }

  .date-modal {
    max-width: 800px;
    width: 95%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .date-modal .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .date-modal .modal-body {
    padding: 20px;
  }

  .date-modal .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid #e2e8f0;
  }

  .empty-state {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 64px 24px;
    text-align: center;
  }

  .empty-icon {
    width: 80px;
    height: 80px;
    background: #fef3c7;
    color: #d97706;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    color: #0f172a;
    font-size: 1.25rem;
  }

  .empty-state p {
    margin: 0 0 24px 0;
    color: #64748b;
  }

  .emitidos-list {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
  }

  .list-header {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1fr 100px;
    gap: 16px;
    padding: 14px 20px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.05em;
  }

  .list-row {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1fr 100px;
    gap: 16px;
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    align-items: center;
    font-size: 0.875rem;
    color: #374151;
  }

  .list-row:last-child {
    border-bottom: none;
  }

  .list-row:hover {
    background: #f8fafc;
  }

  .estudiante-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .estudiante-nombre {
    font-weight: 500;
    color: #0f172a;
  }

  .estudiante-email {
    font-size: 0.75rem;
    color: #64748b;
  }

  .codigo-container {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .codigo {
    font-family: monospace;
    font-size: 0.75rem;
    background: #f1f5f9;
    padding: 4px 8px;
    border-radius: 4px;
    color: #0f172a;
  }

  .btn-copy {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .btn-copy:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .col-acciones {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

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

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: border-color 0.15s;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #2563eb;
  }

  .info-box {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: #fef3c7;
    border-radius: 8px;
    color: #92400e;
  }

  .info-box svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .info-box strong {
    display: block;
    margin-bottom: 4px;
  }

  .info-box p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  @media (max-width: 1024px) {
    .list-header,
    .list-row {
      grid-template-columns: 1.5fr 1fr 1fr 120px;
    }

    .col-curso,
    .col-fecha {
      display: none;
    }
  }

  @media (max-width: 640px) {
    .list-header {
      display: none;
    }

    .list-row {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .col-acciones {
      justify-content: flex-start;
    }
  }

  /* Success modal styles */
  .modal-success {
    max-width: 580px;
  }

  .success-header {
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px 20px 16px;
    position: relative;
  }

  .success-header .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
  }

  .success-icon {
    width: 64px;
    height: 64px;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .success-header h2 {
    color: #16a34a;
  }

  .success-details {
    background: #f8fafc;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    color: #64748b;
    font-size: 0.875rem;
  }

  .detail-value {
    font-weight: 500;
    color: #0f172a;
    font-size: 0.875rem;
  }

  .result-section {
    margin-bottom: 16px;
  }

  .result-section label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .copy-field {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .code-display {
    flex: 1;
    font-family: monospace;
    font-size: 1.1rem;
    padding: 12px 16px;
    background: #f1f5f9;
    border-radius: 8px;
    color: #0f172a;
    font-weight: 600;
    letter-spacing: 0.1em;
  }

  .url-display {
    flex: 1;
    padding: 12px 16px;
    background: #f1f5f9;
    border: none;
    border-radius: 8px;
    font-size: 0.8rem;
    color: #475569;
  }

  .btn-copy-field {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 16px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .btn-copy-field:hover {
    background: #f1f5f9;
    border-color: #2563eb;
    color: #2563eb;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }

  .btn-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-action:hover {
    background: #f1f5f9;
    border-color: #2563eb;
    color: #2563eb;
  }

  .btn-action-primary {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .btn-action-primary:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
    color: white;
  }
`;
