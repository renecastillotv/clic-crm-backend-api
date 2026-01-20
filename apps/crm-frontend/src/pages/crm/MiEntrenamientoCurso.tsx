/**
 * MiEntrenamientoCurso - Reproductor de cursos con tracking de progreso
 * Layout 2 columnas: sidebar con secciones/videos | reproductor
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Lock,
  Play,
  CheckCircle2,
  Award,
  Clock,
  BookOpen,
  AlertCircle,
  Download,
  ExternalLink,
  SkipBack,
  SkipForward,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  getMiEntrenamientoCurso,
  registrarProgresoVideo,
  CursoConAcceso,
  VideoConProgreso
} from '../../services/api';
import CustomVideoPlayer from '../../components/CustomVideoPlayer';

const MiEntrenamientoCurso: React.FC = () => {
  const { tenantSlug, cursoId } = useParams<{ tenantSlug: string; cursoId: string }>();
  const { tenantActual } = useAuth();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();

  // Obtener el tenantId real del contexto (no de la URL)
  const tenantId = tenantActual?.id;

  const [curso, setCurso] = useState<CursoConAcceso | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentVideo, setCurrentVideo] = useState<VideoConProgreso | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [certificateModal, setCertificateModal] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Tracking de progreso
  const lastProgressRef = useRef<{ videoId: string; seconds: number; percentage: number } | null>(null);
  const trackingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadCurso();
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [tenantId, cursoId]);

  // Configurar header con titulo del curso y boton volver
  useEffect(() => {
    if (curso) {
      setPageHeader({
        title: curso.titulo,
        subtitle: 'Mi Entrenamiento',
        backButton: {
          label: 'Volver a Mi Entrenamiento',
          onClick: () => navigate(`/crm/${tenantSlug}/mi-entrenamiento`)
        }
      });
    } else {
      setPageHeader({
        title: 'Cargando curso...',
        subtitle: 'Mi Entrenamiento',
        backButton: {
          label: 'Volver a Mi Entrenamiento',
          onClick: () => navigate(`/crm/${tenantSlug}/mi-entrenamiento`)
        }
      });
    }
  }, [curso, setPageHeader, navigate, tenantSlug]);

  const loadCurso = async () => {
    if (!tenantId || !cursoId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getMiEntrenamientoCurso(tenantId, cursoId);
      setCurso(data);

      // Expandir secciones que tienen acceso
      const accessibleSections = new Set<string>();
      data.secciones.forEach(s => {
        if (s.tiene_acceso) accessibleSections.add(s.id);
      });
      setExpandedSections(accessibleSections);

      // Seleccionar primer video no completado o el primero disponible
      let firstVideo: VideoConProgreso | null = null;
      for (const seccion of data.secciones) {
        if (seccion.tiene_acceso && seccion.videos.length > 0) {
          const uncompletedVideo = seccion.videos.find(v => !v.completado);
          if (uncompletedVideo) {
            firstVideo = uncompletedVideo;
            break;
          } else if (!firstVideo) {
            firstVideo = seccion.videos[0];
          }
        }
      }
      if (firstVideo) {
        setCurrentVideo(firstVideo);
      }
    } catch (err: any) {
      console.error('Error cargando curso:', err);
      setError(err.message || 'Error cargando curso');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const selectVideo = (video: VideoConProgreso) => {
    // Enviar ultimo progreso del video anterior
    sendProgress();
    setCurrentVideo(video);
    lastProgressRef.current = null;
  };

  // Obtener todos los videos accesibles en orden plano
  const getAllAccessibleVideos = useCallback((): VideoConProgreso[] => {
    if (!curso) return [];
    const videos: VideoConProgreso[] = [];
    curso.secciones.forEach(seccion => {
      if (seccion.tiene_acceso) {
        videos.push(...seccion.videos);
      }
    });
    return videos;
  }, [curso]);

  // Navegar al video anterior
  const goToPreviousVideo = useCallback(() => {
    if (!currentVideo) return;
    const videos = getAllAccessibleVideos();
    const currentIndex = videos.findIndex(v => v.id === currentVideo.id);
    if (currentIndex > 0) {
      selectVideo(videos[currentIndex - 1]);
    }
  }, [currentVideo, getAllAccessibleVideos]);

  // Navegar al video siguiente
  const goToNextVideo = useCallback(() => {
    if (!currentVideo) return;
    const videos = getAllAccessibleVideos();
    const currentIndex = videos.findIndex(v => v.id === currentVideo.id);
    if (currentIndex < videos.length - 1) {
      selectVideo(videos[currentIndex + 1]);
    }
  }, [currentVideo, getAllAccessibleVideos]);

  // Verificar posicion actual en lista de videos
  const getVideoNavigationInfo = useCallback(() => {
    if (!currentVideo) return { hasPrev: false, hasNext: false, current: 0, total: 0 };
    const videos = getAllAccessibleVideos();
    const currentIndex = videos.findIndex(v => v.id === currentVideo.id);
    return {
      hasPrev: currentIndex > 0,
      hasNext: currentIndex < videos.length - 1,
      current: currentIndex + 1,
      total: videos.length
    };
  }, [currentVideo, getAllAccessibleVideos]);

  const sendProgress = useCallback(async () => {
    if (!curso?.inscripcion_id || !lastProgressRef.current) return;

    try {
      const result = await registrarProgresoVideo(
        tenantId!,
        {
          inscripcion_id: curso.inscripcion_id,
          video_id: lastProgressRef.current.videoId,
          segundos_vistos: lastProgressRef.current.seconds,
          porcentaje_completado: lastProgressRef.current.percentage
        }
      );

      // Si se emitio un certificado, mostrar modal
      if (result.certificado_emitido) {
        setCertificateModal(result.certificado_emitido);
      }

      // Actualizar progreso local
      if (curso) {
        setCurso(prev => prev ? {
          ...prev,
          progreso_porcentaje: result.progreso_curso
        } : null);
      }
    } catch (err) {
      console.error('Error enviando progreso:', err);
    }
  }, [curso, tenantId]);

  const handleVideoProgress = useCallback((seconds: number, percentage: number) => {
    if (!currentVideo) return;

    lastProgressRef.current = {
      videoId: currentVideo.id,
      seconds,
      percentage
    };

    // Actualizar progreso local del video
    if (curso) {
      setCurso(prev => {
        if (!prev) return null;
        return {
          ...prev,
          secciones: prev.secciones.map(s => ({
            ...s,
            videos: s.videos.map(v =>
              v.id === currentVideo.id
                ? {
                    ...v,
                    segundos_vistos: Math.max(v.segundos_vistos, seconds),
                    porcentaje_completado: Math.max(v.porcentaje_completado, percentage),
                    completado: v.completado || percentage >= 90
                  }
                : v
            )
          }))
        };
      });
    }
  }, [currentVideo, curso]);

  // Iniciar tracking cuando cambia el video
  useEffect(() => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
    }

    if (currentVideo) {
      // Enviar progreso cada 30 segundos
      trackingIntervalRef.current = setInterval(() => {
        sendProgress();
      }, 30000);
    }

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [currentVideo, sendProgress]);

  // Enviar progreso al cerrar la pagina o al desmontar el componente
  useEffect(() => {
    const handleBeforeUnload = () => {
      sendProgress();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup: enviar progreso cuando el componente se desmonta (navegación SPA)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Enviar progreso pendiente al desmontar
      if (lastProgressRef.current) {
        console.log('[MiEntrenamientoCurso] Component unmounting, sending final progress:', lastProgressRef.current);
        sendProgress();
      }
    };
  }, [sendProgress]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc'
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
    );
  }

  if (error || !curso) {
    return (
      <div className="page-container">
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          padding: '24px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle size={24} />
          <div>
            <h3 style={{ margin: 0, marginBottom: '4px' }}>Error</h3>
            <p style={{ margin: 0 }}>{error || 'No se pudo cargar el curso'}</p>
          </div>
        </div>
        <Link
          to={`/crm/${tenantSlug}/mi-entrenamiento`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            color: '#667eea',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={18} />
          Volver a Mi Entrenamiento
        </Link>
      </div>
    );
  }

  const navInfo = getVideoNavigationInfo();

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 60px)',
      backgroundColor: '#0f172a',
      position: 'relative'
    }}>
      {/* Boton toggle sidebar en movil */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="sidebar-toggle-btn"
        style={{
          position: 'fixed',
          top: '70px',
          left: sidebarOpen ? '340px' : '10px',
          zIndex: 1001,
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: '#667eea',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'left 0.3s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay para cerrar sidebar en movil */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}

      {/* Sidebar */}
      <div
        className="course-sidebar"
        style={{
          width: '360px',
          backgroundColor: '#1e293b',
          borderRight: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1000,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease'
        }}
      >
        {/* Header del sidebar - solo barra de progreso */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #334155'
        }}>
          {/* Barra de progreso */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#94a3b8',
              marginBottom: '4px'
            }}>
              <span>Progreso del curso</span>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>
                {curso.progreso_porcentaje}%
              </span>
            </div>
            <div style={{
              height: '6px',
              backgroundColor: '#334155',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${curso.progreso_porcentaje}%`,
                backgroundColor: '#22c55e',
                borderRadius: '3px',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        </div>

        {/* Lista de secciones */}
        <div style={{
          flex: 1,
          overflowY: 'auto'
        }}>
          {curso.secciones.map((seccion, sectionIndex) => (
            <div key={seccion.id}>
              {/* Cabecera de seccion */}
              <button
                onClick={() => seccion.tiene_acceso && toggleSection(seccion.id)}
                disabled={!seccion.tiene_acceso}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: seccion.tiene_acceso ? '#1e293b' : '#0f172a',
                  border: 'none',
                  borderBottom: '1px solid #334155',
                  cursor: seccion.tiene_acceso ? 'pointer' : 'not-allowed',
                  opacity: seccion.tiene_acceso ? 1 : 0.6,
                  textAlign: 'left'
                }}
              >
                {seccion.tiene_acceso ? (
                  expandedSections.has(seccion.id)
                    ? <ChevronDown size={16} color="#94a3b8" />
                    : <ChevronRight size={16} color="#94a3b8" />
                ) : (
                  <Lock size={16} color="#64748b" />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: '#f1f5f9',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {sectionIndex + 1}. {seccion.titulo}
                  </div>
                  <div style={{
                    color: '#64748b',
                    fontSize: '0.75rem'
                  }}>
                    {seccion.total_videos} videos
                  </div>
                </div>
              </button>

              {/* Videos de la seccion */}
              {seccion.tiene_acceso && expandedSections.has(seccion.id) && (
                <div style={{ backgroundColor: '#0f172a' }}>
                  {seccion.videos.map((video, videoIndex) => (
                    <button
                      key={video.id}
                      onClick={() => selectVideo(video)}
                      style={{
                        width: '100%',
                        padding: '12px 16px 12px 44px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backgroundColor: currentVideo?.id === video.id ? '#334155' : 'transparent',
                        border: 'none',
                        borderLeft: currentVideo?.id === video.id ? '3px solid #667eea' : '3px solid transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.2s'
                      }}
                    >
                      {/* Estado del video */}
                      {video.completado ? (
                        <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0 }} />
                      ) : (
                        <Play size={18} color="#94a3b8" style={{ flexShrink: 0 }} />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: currentVideo?.id === video.id ? '#f1f5f9' : '#cbd5e1',
                          fontSize: '0.8125rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {videoIndex + 1}. {video.titulo}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '2px'
                        }}>
                          <span style={{
                            color: '#64748b',
                            fontSize: '0.6875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={10} />
                            {formatDuration(video.duracion_segundos)}
                          </span>
                          {video.porcentaje_completado > 0 && !video.completado && (
                            <span style={{
                              color: '#667eea',
                              fontSize: '0.6875rem'
                            }}>
                              {Math.round(video.porcentaje_completado)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Certificados obtenidos */}
        {curso.certificados_obtenidos.length > 0 && (
          <div style={{
            padding: '16px',
            borderTop: '1px solid #334155',
            backgroundColor: '#1e293b'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <Award size={18} color="#fbbf24" />
              <span style={{ color: '#fbbf24', fontSize: '0.875rem', fontWeight: 600 }}>
                Certificados Obtenidos
              </span>
            </div>
            {curso.certificados_obtenidos.map(cert => (
              <div
                key={cert.id}
                style={{
                  backgroundColor: '#334155',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginTop: '8px'
                }}
              >
                <div style={{ color: '#f1f5f9', fontSize: '0.8125rem', fontWeight: 500 }}>
                  {cert.nombre}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.6875rem', marginTop: '2px' }}>
                  Codigo: {cert.codigo_verificacion}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Area del reproductor */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {currentVideo ? (
          <>
            {/* Reproductor personalizado */}
            <div style={{
              flex: 1,
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CustomVideoPlayer
                videoUrl={currentVideo.url_video || ''}
                videoId={currentVideo.video_id}
                proveedor={currentVideo.proveedor || 'vimeo'}
                initialProgress={currentVideo.segundos_vistos || 0}
                onProgress={handleVideoProgress}
                onComplete={() => {
                  // Marcar video como completado localmente
                  if (curso && currentVideo) {
                    // Asegurar que lastProgressRef tenga 100% antes de enviar
                    lastProgressRef.current = {
                      videoId: currentVideo.id,
                      seconds: currentVideo.duracion || lastProgressRef.current?.seconds || 0,
                      percentage: 100
                    };

                    setCurso(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        secciones: prev.secciones.map(s => ({
                          ...s,
                          videos: s.videos.map(v =>
                            v.id === currentVideo.id
                              ? { ...v, completado: true, porcentaje_completado: 100 }
                              : v
                          )
                        }))
                      };
                    });
                  }
                  // Enviar progreso final inmediatamente
                  sendProgress();
                }}
              />
            </div>

            {/* Info del video con controles */}
            <div style={{
              padding: '20px 24px',
              backgroundColor: '#1e293b',
              borderTop: '1px solid #334155'
            }}>
              {/* Controles de navegacion */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: '1px solid #334155'
              }}>
                {/* Navegacion izquierda */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={goToPreviousVideo}
                    disabled={!navInfo.hasPrev}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: navInfo.hasPrev ? '#334155' : '#1e293b',
                      color: navInfo.hasPrev ? '#f1f5f9' : '#64748b',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: navInfo.hasPrev ? 'pointer' : 'not-allowed',
                      fontSize: '0.8125rem',
                      fontWeight: 500
                    }}
                  >
                    <SkipBack size={16} />
                    Anterior
                  </button>
                  <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                    {navInfo.current} / {navInfo.total}
                  </span>
                  <button
                    onClick={goToNextVideo}
                    disabled={!navInfo.hasNext}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: navInfo.hasNext ? '#334155' : '#1e293b',
                      color: navInfo.hasNext ? '#f1f5f9' : '#64748b',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: navInfo.hasNext ? 'pointer' : 'not-allowed',
                      fontSize: '0.8125rem',
                      fontWeight: 500
                    }}
                  >
                    Siguiente
                    <SkipForward size={16} />
                  </button>
                </div>

                {/* Indicador de estado (solo lectura - el progreso se registra automaticamente) */}
                {currentVideo.completado && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      backgroundColor: '#22c55e',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}
                  >
                    <CheckCircle2 size={18} />
                    Completado
                  </div>
                )}
              </div>

              <h3 style={{
                color: '#f1f5f9',
                fontSize: '1.125rem',
                fontWeight: 700,
                margin: 0,
                marginBottom: '8px'
              }}>
                {currentVideo.titulo}
              </h3>
              {currentVideo.descripcion && (
                <p style={{
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  margin: 0,
                  lineHeight: 1.6
                }}>
                  {currentVideo.descripcion}
                </p>
              )}

              {/* Recursos adjuntos */}
              {currentVideo.recursos_adjuntos && currentVideo.recursos_adjuntos.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{
                    color: '#cbd5e1',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    margin: 0,
                    marginBottom: '8px'
                  }}>
                    Recursos del video
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {currentVideo.recursos_adjuntos.map((recurso: any, idx: number) => (
                      <a
                        key={idx}
                        href={recurso.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          backgroundColor: '#334155',
                          color: '#f1f5f9',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '0.8125rem'
                        }}
                      >
                        {recurso.tipo === 'download' ? <Download size={14} /> : <ExternalLink size={14} />}
                        {recurso.nombre || 'Recurso'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b'
          }}>
            <BookOpen size={64} style={{ marginBottom: '16px' }} />
            <p style={{ fontSize: '1rem' }}>Selecciona un video para comenzar</p>
          </div>
        )}
      </div>

      {/* Modal de certificado */}
      {certificateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '40px',
            borderRadius: '16px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <Award size={40} color="#fff" />
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#1e293b',
              margin: 0,
              marginBottom: '8px'
            }}>
              Felicitaciones!
            </h2>
            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: 0,
              marginBottom: '16px'
            }}>
              Has obtenido el certificado:
            </p>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
              marginBottom: '24px'
            }}>
              {certificateModal.nombre_certificado}
            </p>
            <button
              onClick={() => setCertificateModal(null)}
              style={{
                padding: '12px 32px',
                backgroundColor: '#667eea',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Desktop: ocultar boton toggle, sidebar siempre visible */
        @media (min-width: 769px) {
          .sidebar-toggle-btn {
            display: none !important;
          }
          .course-sidebar {
            transform: translateX(0) !important;
          }
        }

        /* Mobile: sidebar ocultable, mostrar overlay */
        @media (max-width: 768px) {
          .course-sidebar {
            position: fixed !important;
            left: 0;
            top: 60px;
            height: calc(100vh - 60px) !important;
            z-index: 1000 !important;
          }
          .sidebar-overlay {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MiEntrenamientoCurso;
