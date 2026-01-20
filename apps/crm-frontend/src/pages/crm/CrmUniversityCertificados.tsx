/**
 * CrmUniversityCertificados - Lista de certificados con navegación a página de edición
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getUniversityCertificados,
  deleteUniversityCertificado,
  UniversityCertificado,
} from '../../services/api';
import { Plus, Edit2, Trash2, Award, ArrowLeft, FileText } from 'lucide-react';

export default function CrmUniversityCertificados() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const [certificados, setCertificados] = useState<UniversityCertificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!tenantActual?.id) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const data = await getUniversityCertificados(tenantActual.id, token);
      setCertificados(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar certificados');
      console.error('Error cargando certificados:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantActual?.id, getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageHeader({
      title: 'Certificados',
      subtitle: 'Gestiona los certificados que se emiten a los estudiantes',
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
            onClick={() => navigate(`/crm/${tenantSlug}/university/certificados/nuevo`)}
            className="btn-primary"
          >
            <Plus size={18} />
            Nuevo Certificado
          </button>
        </div>
      ),
    });
  }, [setPageHeader, tenantSlug, navigate]);

  const handleDelete = async (certificado: UniversityCertificado) => {
    if (!tenantActual?.id) return;
    if (!confirm(`¿Eliminar el certificado "${certificado.nombre}"? Esta accion no se puede deshacer.`)) return;

    try {
      const token = await getToken();
      await deleteUniversityCertificado(tenantActual.id, certificado.id, token);
      loadData();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  if (loading && certificados.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando certificados...</p>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="certificados-page">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {certificados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Award size={48} /></div>
          <h3>No hay certificados</h3>
          <p>Crea tu primer certificado para otorgar a los estudiantes que completen tus cursos</p>
          <button
            className="btn-primary"
            onClick={() => navigate(`/crm/${tenantSlug}/university/certificados/nuevo`)}
          >
            <Plus size={18} />
            Crear Certificado
          </button>
        </div>
      ) : (
        <div className="certificados-grid">
          {certificados.map((cert) => (
            <div key={cert.id} className="certificado-card">
              <div className="certificado-header">
                {cert.imagen_template ? (
                  <img src={cert.imagen_template} alt={cert.nombre} className="certificado-image" />
                ) : (
                  <div className="certificado-image-placeholder">
                    <Award size={48} />
                  </div>
                )}
                <div className="certificado-status">
                  {cert.activo ? (
                    <span className="badge badge-success">Activo</span>
                  ) : (
                    <span className="badge badge-muted">Inactivo</span>
                  )}
                </div>
              </div>
              <div className="certificado-body">
                <h3 className="certificado-nombre">{cert.nombre}</h3>
                {cert.descripcion && (
                  <p className="certificado-descripcion">{cert.descripcion}</p>
                )}
                <div className="certificado-meta">
                  <span className="meta-item">
                    <FileText size={14} />
                    Plantilla {cert.imagen_template ? 'configurada' : 'por defecto'}
                  </span>
                </div>
              </div>
              <div className="certificado-footer">
                <button
                  className="btn-icon"
                  onClick={() => navigate(`/crm/${tenantSlug}/university/certificados/${cert.id}`)}
                  title="Editar certificado"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="btn-icon-danger"
                  onClick={() => handleDelete(cert)}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .certificados-page {
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

  .certificados-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .certificado-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s;
  }

  .certificado-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .certificado-header {
    position: relative;
    height: 140px;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
  }

  .certificado-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .certificado-image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d97706;
  }

  .certificado-status {
    position: absolute;
    top: 12px;
    right: 12px;
  }

  .certificado-body {
    padding: 16px;
  }

  .certificado-nombre {
    margin: 0 0 8px 0;
    font-size: 1.125rem;
    color: #0f172a;
  }

  .certificado-descripcion {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .certificado-meta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: #64748b;
  }

  .certificado-footer {
    padding: 12px 16px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .badge {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-success {
    background: #dcfce7;
    color: #16a34a;
  }

  .badge-muted {
    background: #f1f5f9;
    color: #64748b;
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

  @media (max-width: 768px) {
    .certificados-grid {
      grid-template-columns: 1fr;
    }
  }
`;
