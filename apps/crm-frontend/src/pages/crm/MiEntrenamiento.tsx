/**
 * Mi Entrenamiento - Dashboard de cursos disponibles para el usuario
 * Muestra cursos según acceso por rol, progreso y certificados
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  Play,
  CheckCircle2,
  Lock,
  Star,
  TrendingUp,
  ChevronRight,
  Download,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getMiEntrenamientoCursos,
  getMisCertificados,
  CursoDisponible,
  MiCertificado
} from '../../services/api';

type TabType = 'cursos' | 'certificados';

const MiEntrenamiento: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { isAuthenticated, isLoading: authLoading, tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Obtener el tenantId real del contexto (no de la URL)
  const tenantId = tenantActual?.id;

  const [activeTab, setActiveTab] = useState<TabType>('cursos');
  const [cursos, setCursos] = useState<CursoDisponible[]>([]);
  const [certificados, setCertificados] = useState<MiCertificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Configurar el header de la pagina
  useEffect(() => {
    setPageHeader({
      title: 'Mi Entrenamiento',
      subtitle: 'Cursos y certificaciones disponibles para ti'
    });
  }, [setPageHeader]);

  useEffect(() => {
    // Esperar a que termine la autenticación antes de cargar datos
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [tenantId, activeTab, authLoading, isAuthenticated]);

  const loadData = async () => {
    if (!tenantId) {
      console.log('[MiEntrenamiento] No tenantId, skipping load');
      return;
    }

    console.log('[MiEntrenamiento] Loading data...', { tenantId, activeTab });
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'cursos') {
        console.log('[MiEntrenamiento] Fetching cursos...');
        // Token se obtiene automáticamente en api.ts desde window.Clerk
        const data = await getMiEntrenamientoCursos(tenantId);
        console.log('[MiEntrenamiento] Cursos received:', data);
        setCursos(data || []);
      } else {
        console.log('[MiEntrenamiento] Fetching certificados...');
        const data = await getMisCertificados(tenantId);
        console.log('[MiEntrenamiento] Certificados received:', data);
        setCertificados(data || []);
      }
    } catch (err: any) {
      console.error('[MiEntrenamiento] Error cargando datos:', err);
      setError(err.message || 'Error cargando datos');
    } finally {
      console.log('[MiEntrenamiento] Loading finished');
      setLoading(false);
    }
  };

  const getNivelBadge = (nivel: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      principiante: { bg: '#dcfce7', text: '#166534', label: 'Principiante' },
      intermedio: { bg: '#fef3c7', text: '#92400e', label: 'Intermedio' },
      avanzado: { bg: '#fee2e2', text: '#991b1b', label: 'Avanzado' }
    };
    const style = styles[nivel] || styles.principiante;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.text
      }}>
        <Star size={12} />
        {style.label}
      </span>
    );
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const copyToClipboard = async (text: string, certId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(certId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
    }
  };

  const getVerificationUrl = (code: string) => {
    // URL base del sitio para verificar certificados
    return `${window.location.origin}/verificar/${code}`;
  };

  const renderCursoCard = (curso: CursoDisponible) => {
    const isCompleted = curso.progreso_porcentaje >= 100;
    const hasProgress = curso.progreso_porcentaje > 0;

    return (
      <div
        key={curso.id}
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)';
        }}
      >
        <Link
          to={`/crm/${tenantSlug}/mi-entrenamiento/curso/${curso.id}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          {/* Imagen del curso */}
          <div style={{
            height: '160px',
            background: curso.imagen_portada
              ? `url(${curso.imagen_portada}) center/cover`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative'
          }}>
            {/* Badge de certificado */}
            {curso.tiene_certificado && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: '#fbbf24',
                color: '#78350f',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Award size={14} />
                Certificado
              </div>
            )}

            {/* Badge de progreso */}
            {isCompleted && (
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                backgroundColor: '#22c55e',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <CheckCircle2 size={14} />
                Completado
              </div>
            )}

            {/* Overlay con icono play */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
            >
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Play size={24} fill="#667eea" color="#667eea" />
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              {getNivelBadge(curso.nivel)}
              {curso.secciones_accesibles < curso.total_secciones && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: '#fef3c7',
                  color: '#92400e'
                }}>
                  <Lock size={12} />
                  Parcial
                </span>
              )}
            </div>

            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '8px',
              lineHeight: 1.4
            }}>
              {curso.titulo}
            </h3>

            {curso.descripcion && (
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '16px',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {curso.descripcion}
              </p>
            )}

            {/* Stats */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '16px',
              fontSize: '0.8125rem',
              color: '#64748b'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <BookOpen size={14} />
                {curso.secciones_accesibles}/{curso.total_secciones} secciones
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} />
                {formatDuration(curso.duracion_estimada_minutos)}
              </span>
            </div>

            {/* Barra de progreso */}
            {hasProgress && (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <TrendingUp size={12} />
                    Progreso
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isCompleted ? '#22c55e' : '#667eea'
                  }}>
                    {curso.progreso_porcentaje}%
                  </span>
                </div>
                <div style={{
                  height: '8px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${curso.progreso_porcentaje}%`,
                    backgroundColor: isCompleted ? '#22c55e' : '#667eea',
                    borderRadius: '4px',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            )}

            {/* Call to action */}
            {!hasProgress && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                color: '#667eea',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}>
                Comenzar curso
                <ChevronRight size={18} />
              </div>
            )}
          </div>
        </Link>
      </div>
    );
  };

  const renderCertificadoCard = (cert: MiCertificado) => {
    const verificationUrl = getVerificationUrl(cert.codigo_verificacion);

    return (
      <div
        key={cert.id}
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header con gradiente */}
        <div style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* Icono/preview del certificado */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '16px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.3)'
          }}>
            {cert.imagen_template ? (
              <img
                src={cert.imagen_template}
                alt={cert.nombre_certificado}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '14px'
                }}
              />
            ) : (
              <Award size={40} color="#fff" />
            )}
          </div>

          {/* Titulo */}
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              marginBottom: '4px',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {cert.nombre_certificado}
            </h3>
            <p style={{
              fontSize: '0.9375rem',
              color: 'rgba(255,255,255,0.9)',
              margin: 0
            }}>
              {cert.nombre_curso}
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ padding: '24px' }}>
          {/* Info del certificado */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Fecha de emision */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '10px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#64748b',
                fontSize: '0.75rem',
                marginBottom: '4px'
              }}>
                <Calendar size={14} />
                Fecha de emision
              </div>
              <div style={{
                color: '#1e293b',
                fontSize: '0.9375rem',
                fontWeight: 600
              }}>
                {new Date(cert.fecha_emision).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>

            {/* Fecha de completado */}
            {cert.fecha_completado && (
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '10px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#64748b',
                  fontSize: '0.75rem',
                  marginBottom: '4px'
                }}>
                  <CheckCircle2 size={14} />
                  Curso completado
                </div>
                <div style={{
                  color: '#1e293b',
                  fontSize: '0.9375rem',
                  fontWeight: 600
                }}>
                  {new Date(cert.fecha_completado).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Codigo de verificacion */}
          <div style={{
            backgroundColor: '#f1f5f9',
            padding: '16px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{
                color: '#64748b',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <FileText size={14} />
                Codigo de verificacion
              </span>
              <button
                onClick={() => copyToClipboard(cert.codigo_verificacion, cert.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  backgroundColor: copiedCode === cert.id ? '#22c55e' : '#e2e8f0',
                  color: copiedCode === cert.id ? '#fff' : '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {copiedCode === cert.id ? (
                  <>
                    <Check size={12} />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#1e293b',
              letterSpacing: '2px'
            }}>
              {cert.codigo_verificacion}
            </div>
          </div>

          {/* URL de verificacion */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <div style={{
              color: '#64748b',
              fontSize: '0.75rem',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <ExternalLink size={14} />
              Link de verificacion
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <code style={{
                flex: 1,
                fontSize: '0.8125rem',
                color: '#667eea',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {verificationUrl}
              </code>
              <button
                onClick={() => copyToClipboard(verificationUrl, `url-${cert.id}`)}
                style={{
                  padding: '6px',
                  backgroundColor: copiedCode === `url-${cert.id}` ? '#22c55e' : 'transparent',
                  color: copiedCode === `url-${cert.id}` ? '#fff' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
              >
                {copiedCode === `url-${cert.id}` ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {cert.url_pdf && (
              <a
                href={cert.url_pdf}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  backgroundColor: '#667eea',
                  color: '#fff',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s'
                }}
              >
                <Download size={18} />
                Descargar PDF
              </a>
            )}
            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: cert.url_pdf ? 'none' : 1,
                padding: '12px 20px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '0.9375rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s'
              }}
            >
              <ExternalLink size={18} />
              Ver certificado
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '0'
      }}>
        <button
          onClick={() => setActiveTab('cursos')}
          style={{
            padding: '12px 24px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: activeTab === 'cursos' ? '#667eea' : '#64748b',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'cursos' ? '2px solid #667eea' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <BookOpen size={18} />
          Mis Cursos
          {cursos.length > 0 && (
            <span style={{
              backgroundColor: activeTab === 'cursos' ? '#667eea' : '#e2e8f0',
              color: activeTab === 'cursos' ? '#fff' : '#64748b',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.75rem'
            }}>
              {cursos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('certificados')}
          style={{
            padding: '12px 24px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: activeTab === 'certificados' ? '#667eea' : '#64748b',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'certificados' ? '2px solid #667eea' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Award size={18} />
          Mis Certificados
          {certificados.length > 0 && (
            <span style={{
              backgroundColor: activeTab === 'certificados' ? '#667eea' : '#e2e8f0',
              color: activeTab === 'certificados' ? '#fff' : '#64748b',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.75rem'
            }}>
              {certificados.length}
            </span>
          )}
        </button>
      </div>

      {/* Loading - mostrar mientras carga autenticación o datos */}
      {(authLoading || loading) && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '80px 0',
          color: '#64748b'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          padding: '16px 24px',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Contenido - Cursos */}
      {!authLoading && !loading && !error && activeTab === 'cursos' && (
        <>
          {cursos.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              backgroundColor: '#f8fafc',
              borderRadius: '16px'
            }}>
              <GraduationCap size={64} color="#cbd5e1" style={{ marginBottom: '16px' }} />
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '8px'
              }}>
                No tienes cursos disponibles
              </h3>
              <p style={{
                fontSize: '0.9375rem',
                color: '#94a3b8'
              }}>
                Los cursos disponibles para tu rol apareceran aqui
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px'
            }}>
              {cursos.map(renderCursoCard)}
            </div>
          )}
        </>
      )}

      {/* Contenido - Certificados */}
      {!authLoading && !loading && !error && activeTab === 'certificados' && (
        <>
          {certificados.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              backgroundColor: '#f8fafc',
              borderRadius: '16px'
            }}>
              <Award size={64} color="#cbd5e1" style={{ marginBottom: '16px' }} />
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '8px'
              }}>
                Aun no tienes certificados
              </h3>
              <p style={{
                fontSize: '0.9375rem',
                color: '#94a3b8'
              }}>
                Completa cursos para obtener tus certificados
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: '24px'
            }}>
              {certificados.map(renderCertificadoCard)}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MiEntrenamiento;
