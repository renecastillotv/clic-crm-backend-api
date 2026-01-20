/**
 * CustomVideoPlayer - Reproductor personalizado con controles propios
 * Oculta completamente UI de Vimeo y proporciona controles nativos
 * Soporta Vimeo (controles personalizados) y YouTube (iframe normal)
 *
 * Características:
 * - Oculta branding del proveedor (Vimeo)
 * - Timeline personalizado
 * - Permite retroceder libremente
 * - Solo permite adelantar hasta donde se ha visto (maxWatchedTime)
 * - Tracking de progreso integrado
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Player from '@vimeo/player';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  SkipForward
} from 'lucide-react';

interface CustomVideoPlayerProps {
  videoUrl: string;
  videoId?: string;
  proveedor: 'vimeo' | 'youtube' | string;
  initialProgress?: number; // Segundos vistos previamente
  onProgress?: (seconds: number, percentage: number) => void;
  onComplete?: () => void;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  videoUrl,
  videoId,
  proveedor,
  initialProgress = 0,
  onProgress,
  onComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vimeoPlayerRef = useRef<Player | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref para mantener el máximo progreso real (no se pierde entre re-renders)
  const maxProgressRef = useRef<number>(initialProgress);
  // Refs para evitar problemas de closure en el event handler de timeupdate
  const isDraggingRef = useRef<boolean>(false);
  const durationRef = useRef<number>(0);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // maxWatchedTime mantiene el punto MAS LEJANO que el usuario ha visto
  const [maxWatchedTime, setMaxWatchedTime] = useState(initialProgress);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  // Flag para evitar que timeupdate sobrescriba el progreso inicial
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false);

  // Mantener refs actualizadas con los valores más recientes
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detectar proveedor
  const isVimeo = proveedor === 'vimeo' || videoUrl.includes('vimeo.com');
  const isYouTube = proveedor === 'youtube' || videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');

  // Extraer ID del video
  const extractVimeoId = (url: string): string | null => {
    const regex = /vimeo\.com\/(?:video\/)?(\d+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const extractYouTubeId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const getVimeoVideoId = (): string | null => {
    if (videoId) return videoId;
    return extractVimeoId(videoUrl);
  };

  const getYouTubeVideoId = (): string | null => {
    if (videoId) return videoId;
    return extractYouTubeId(videoUrl);
  };

  // Inicializar Vimeo Player
  useEffect(() => {
    if (!isVimeo) return;

    const vimeoId = getVimeoVideoId();
    if (!vimeoId || !containerRef.current) return;

    // Crear iframe con controles ocultos pero tracking funcional
    const iframe = document.createElement('iframe');
    // NO usar background=1 porque interfiere con el tracking de tiempo
    // Usamos controls=0 para ocultar controles nativos de Vimeo
    iframe.src = `https://player.vimeo.com/video/${vimeoId}?autopause=0&transparent=0&dnt=1&controls=0&title=0&byline=0&portrait=0`;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');

    // Limpiar container y agregar iframe
    const videoContainer = containerRef.current.querySelector('.video-container');
    if (videoContainer) {
      videoContainer.innerHTML = '';
      videoContainer.appendChild(iframe);
    }

    // Inicializar Vimeo Player API
    const player = new Player(iframe);
    vimeoPlayerRef.current = player;

    player.ready().then(() => {
      // Obtener duracion
      player.getDuration().then(dur => {
        setDuration(dur);
      });

      // Restaurar progreso previo - usar el máximo entre initialProgress y maxProgressRef
      const targetTime = Math.max(initialProgress, maxProgressRef.current);
      if (targetTime > 0) {
        player.setCurrentTime(targetTime).then(() => {
          setCurrentTime(targetTime);
          setMaxWatchedTime(targetTime);
          maxProgressRef.current = Math.max(maxProgressRef.current, targetTime);
          setHasRestoredPosition(true);
          setIsLoading(false);
        }).catch(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }

      // Establecer volumen
      player.setVolume(volume);
    });

    // Event listeners
    player.on('play', () => setIsPlaying(true));
    player.on('pause', () => setIsPlaying(false));
    player.on('ended', () => {
      setIsPlaying(false);
      // Al terminar el video, asegurar que el progreso sea 100%
      const finalDuration = durationRef.current;
      if (finalDuration > 0) {
        maxProgressRef.current = finalDuration;
        setMaxWatchedTime(finalDuration);
        setCurrentTime(finalDuration);
        // Enviar progreso al 100% antes de llamar onComplete
        onProgressRef.current?.(finalDuration, 100);
      }
      onCompleteRef.current?.();
    });

    player.on('timeupdate', (data: { seconds: number; percent: number; duration: number }) => {
      // Usar refs para evitar problemas de closure
      if (!isDraggingRef.current) {
        const newSeconds = data.seconds;

        setCurrentTime(newSeconds);

        // IMPORTANTE: Actualizar maxWatchedTime solo si avanzamos MAS ALLA del maximo anterior
        // Esto permite adelantar hasta cualquier punto que ya hayamos visto
        setMaxWatchedTime(prev => {
          const newMax = Math.max(prev, newSeconds);
          // También actualizar la ref para que no se pierda
          maxProgressRef.current = Math.max(maxProgressRef.current, newMax);
          return newMax;
        });

        // Callback de progreso - usar siempre el máximo real
        const realProgress = Math.max(newSeconds, maxProgressRef.current);
        const currentDuration = durationRef.current || data.duration;
        const realPercent = currentDuration > 0 ? (realProgress / currentDuration) * 100 : data.percent * 100;

        onProgressRef.current?.(realProgress, realPercent);
      }
    });

    // Cleanup
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      player.destroy();
    };
  }, [videoUrl, videoId, isVimeo]);

  // Resetear estados cuando cambia el video (URL diferente)
  useEffect(() => {
    // Solo resetear si es un video diferente (URL cambió)
    setCurrentTime(initialProgress);
    setMaxWatchedTime(initialProgress);
    maxProgressRef.current = initialProgress;
    setIsPlaying(false);
    setIsLoading(true);
    setHasRestoredPosition(false);
  }, [videoUrl, videoId]);

  // Actualizar maxWatchedTime y ref cuando cambia initialProgress (solo si es mayor)
  useEffect(() => {
    const newMax = Math.max(maxProgressRef.current, initialProgress);
    maxProgressRef.current = newMax;
    setMaxWatchedTime(prev => Math.max(prev, newMax));
  }, [initialProgress]);

  // Restaurar posición en Vimeo cuando initialProgress cambia y el player está listo
  useEffect(() => {
    if (vimeoPlayerRef.current && initialProgress > 0 && !isLoading && !hasRestoredPosition) {
      const targetTime = Math.max(initialProgress, maxProgressRef.current);
      vimeoPlayerRef.current.setCurrentTime(targetTime).then(() => {
        setCurrentTime(targetTime);
        setHasRestoredPosition(true);
      }).catch(() => {
        // Ignorar error si el player no está listo
      });
    }
  }, [initialProgress, isLoading, hasRestoredPosition]);

  // Auto-hide controls
  const resetHideControlsTimer = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    setShowControls(true);

    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetHideControlsTimer();
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetHideControlsTimer]);

  // Controles Vimeo
  const togglePlay = async () => {
    if (!vimeoPlayerRef.current) return;

    if (isPlaying) {
      await vimeoPlayerRef.current.pause();
    } else {
      await vimeoPlayerRef.current.play();
    }
  };

  const toggleMute = async () => {
    if (!vimeoPlayerRef.current) return;

    if (isMuted) {
      await vimeoPlayerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      await vimeoPlayerRef.current.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);

    if (vimeoPlayerRef.current) {
      await vimeoPlayerRef.current.setVolume(newVolume);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Detectar cambios de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Seek en timeline - permite ir a cualquier punto hasta maxWatchedTime
  const handleTimelineClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!vimeoPlayerRef.current || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration;

    // Permitir seek hasta maxWatchedTime (el punto mas lejano que hemos visto)
    const allowedTime = Math.min(seekTime, maxWatchedTime);

    await vimeoPlayerRef.current.setCurrentTime(allowedTime);
    setCurrentTime(allowedTime);
  };

  const handleTimelineDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration;

    // Permitir drag hasta maxWatchedTime
    const allowedTime = Math.min(seekTime, maxWatchedTime);

    setCurrentTime(allowedTime);
  };

  const handleMouseUp = async () => {
    if (isDragging && vimeoPlayerRef.current) {
      // Asegurar que no excedemos maxWatchedTime
      const allowedTime = Math.min(currentTime, maxWatchedTime);
      await vimeoPlayerRef.current.setCurrentTime(allowedTime);
    }
    setIsDragging(false);
  };

  // Retroceder 10 segundos - siempre permitido
  const rewind10 = async () => {
    if (!vimeoPlayerRef.current) return;
    const newTime = Math.max(0, currentTime - 10);
    await vimeoPlayerRef.current.setCurrentTime(newTime);
    setCurrentTime(newTime);
  };

  // Adelantar 10 segundos - solo hasta maxWatchedTime
  const forward10 = async () => {
    if (!vimeoPlayerRef.current) return;
    const newTime = Math.min(maxWatchedTime, currentTime + 10);
    await vimeoPlayerRef.current.setCurrentTime(newTime);
    setCurrentTime(newTime);
  };

  // Formatear tiempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular porcentajes para timeline
  const currentPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const watchedPercentage = duration > 0 ? (maxWatchedTime / duration) * 100 : 0;

  // Para YouTube - mostrar iframe normal con controles de YouTube
  if (isYouTube) {
    const ytId = getYouTubeVideoId();
    if (!ytId) {
      return (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          Video de YouTube no encontrado
        </div>
      );
    }

    return (
      <div style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
        />
      </div>
    );
  }

  // Para proveedores no soportados, mostrar iframe normal
  if (!isVimeo && !isYouTube) {
    return (
      <div style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
        <iframe
          src={videoUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
        />
      </div>
    );
  }

  // Reproductor personalizado para Vimeo
  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideControlsTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onMouseUp={handleMouseUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        overflow: 'hidden',
        cursor: showControls ? 'default' : 'none'
      }}
    >
      {/* Video container */}
      <div
        className="video-container"
        onClick={togglePlay}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto'
        }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 10
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255,255,255,0.2)',
            borderTop: '4px solid #fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}

      {/* Play/Pause central overlay */}
      {!isPlaying && !isLoading && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
            cursor: 'pointer',
            zIndex: 5
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(102, 126, 234, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
          }}>
            <Play size={36} color="#fff" style={{ marginLeft: '4px' }} />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          padding: '40px 16px 16px',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s',
          zIndex: 20,
          pointerEvents: showControls ? 'auto' : 'none'
        }}
      >
        {/* Timeline */}
        <div
          onClick={handleTimelineClick}
          onMouseDown={() => setIsDragging(true)}
          onMouseMove={handleTimelineDrag}
          style={{
            position: 'relative',
            height: '6px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            cursor: 'pointer',
            marginBottom: '12px'
          }}
        >
          {/* Zona vista (clickeable - hasta donde podemos navegar) */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${watchedPercentage}%`,
            backgroundColor: 'rgba(102, 126, 234, 0.4)',
            borderRadius: '3px'
          }} />

          {/* Progreso actual */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${currentPercentage}%`,
            backgroundColor: '#667eea',
            borderRadius: '3px',
            transition: isDragging ? 'none' : 'width 0.1s'
          }} />

          {/* Handle */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: `${currentPercentage}%`,
            transform: 'translate(-50%, -50%)',
            width: '14px',
            height: '14px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            transition: isDragging ? 'none' : 'left 0.1s'
          }} />

          {/* Indicador de limite (donde no puede avanzar mas alla) */}
          {maxWatchedTime < duration && (
            <div style={{
              position: 'absolute',
              top: '-8px',
              left: `${watchedPercentage}%`,
              transform: 'translateX(-50%)',
              width: '2px',
              height: '22px',
              backgroundColor: 'rgba(255,255,255,0.5)'
            }} />
          )}
        </div>

        {/* Control buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Left controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Rewind 10s */}
            <button
              onClick={rewind10}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.9
              }}
              title="Retroceder 10s"
            >
              <RotateCcw size={20} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            {/* Forward 10s - habilitado si currentTime < maxWatchedTime */}
            <button
              onClick={forward10}
              disabled={currentTime >= maxWatchedTime}
              style={{
                background: 'none',
                border: 'none',
                color: currentTime >= maxWatchedTime ? 'rgba(255,255,255,0.3)' : '#fff',
                cursor: currentTime >= maxWatchedTime ? 'not-allowed' : 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: currentTime >= maxWatchedTime ? 0.5 : 0.9
              }}
              title={currentTime >= maxWatchedTime ? 'Solo puedes adelantar hasta donde has visto' : 'Adelantar 10s'}
            >
              <SkipForward size={20} />
            </button>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={toggleMute}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  width: '70px',
                  height: '4px',
                  cursor: 'pointer',
                  accentColor: '#667eea'
                }}
              />
            </div>

            {/* Time display */}
            <span style={{
              color: '#fff',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              marginLeft: '8px'
            }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CustomVideoPlayer;
