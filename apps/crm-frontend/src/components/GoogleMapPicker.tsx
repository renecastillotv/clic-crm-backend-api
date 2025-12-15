/**
 * GoogleMapPicker - Mapa interactivo con marker draggable
 * Permite seleccionar ubicación haciendo clic o arrastrando el marker
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';

interface GoogleMapPickerProps {
  lat?: number;
  lng?: number;
  zoom?: number;
  onLocationChange: (lat: number, lng: number) => void;
  disabled?: boolean;
  height?: string;
  showCrosshair?: boolean;
  showMarkerOnInit?: boolean; // Si mostrar marcador cuando no hay coordenadas
}

// Default coordinates: Santo Domingo (centro general, no punto específico)
const DEFAULT_LAT = 18.4861;
const DEFAULT_LNG = -69.9312;
const DEFAULT_ZOOM = 12; // Zoom más alejado para ver más área
const SELECTED_ZOOM = 16; // Zoom cuando hay ubicación seleccionada

// Google Maps types
declare global {
  interface Window {
    google: any;
    initGoogleMapsCallback?: () => void;
  }
}

// Type definitions for Google Maps
interface GoogleMapsLatLng {
  lat(): number;
  lng(): number;
}

interface GoogleMapsMapMouseEvent {
  latLng?: GoogleMapsLatLng;
}

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  if (window.google?.maps) {
    return Promise.resolve();
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';

    // Get API key from backend
    fetch(`${API_BASE}/api/geocoding/maps-config`)
      .then(res => res.json())
      .then(data => {
        if (!data.apiKey) {
          reject(new Error('Google Maps API key not configured'));
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps'));

        document.head.appendChild(script);
      })
      .catch(reject);
  });

  return googleMapsPromise;
}

export default function GoogleMapPicker({
  lat,
  lng,
  zoom,
  onLocationChange,
  disabled = false,
  height = '300px',
  showCrosshair = true,
  showMarkerOnInit = false,
}: GoogleMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMarker, setHasMarker] = useState(false);

  // Si hay coordenadas válidas, usarlas; si no, usar default
  const hasCoordinates = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
  const currentLat = hasCoordinates ? lat : DEFAULT_LAT;
  const currentLng = hasCoordinates ? lng : DEFAULT_LNG;
  const currentZoom = zoom || (hasCoordinates ? SELECTED_ZOOM : DEFAULT_ZOOM);

  // Initialize map
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript();

        if (!mounted || !mapRef.current) return;

        const position = { lat: currentLat, lng: currentLng };

        // Create map
        const map = new window.google.maps.Map(mapRef.current, {
          center: position,
          zoom: currentZoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        mapInstanceRef.current = map;

        // Solo crear marker si hay coordenadas o si showMarkerOnInit es true
        if (hasCoordinates || showMarkerOnInit) {
          const marker = new window.google.maps.Marker({
            position,
            map,
            draggable: !disabled,
            animation: window.google.maps.Animation.DROP,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#059669',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
          });

          markerRef.current = marker;
          setHasMarker(true);

          // Marker drag event
          marker.addListener('dragend', () => {
            const pos = marker.getPosition();
            if (pos) {
              onLocationChange(pos.lat(), pos.lng());
            }
          });
        }

        // Map click event - siempre activo para crear/mover marker
        map.addListener('click', (e: GoogleMapsMapMouseEvent) => {
          if (disabled || !e.latLng) return;

          const newLat = e.latLng.lat();
          const newLng = e.latLng.lng();

          // Si no hay marker, crearlo
          if (!markerRef.current) {
            const marker = new window.google.maps.Marker({
              position: e.latLng,
              map,
              draggable: !disabled,
              animation: window.google.maps.Animation.DROP,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#059669',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
            });

            markerRef.current = marker;
            setHasMarker(true);

            marker.addListener('dragend', () => {
              const pos = marker.getPosition();
              if (pos) {
                onLocationChange(pos.lat(), pos.lng());
              }
            });
          } else {
            markerRef.current.setPosition(e.latLng);
          }

          onLocationChange(newLat, newLng);
        });

        setLoading(false);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error loading map');
          setLoading(false);
        }
      }
    };

    initMap();

    return () => {
      mounted = false;
    };
  }, []);

  // Update marker position when props change (or create marker if needed)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Solo procesar si tenemos coordenadas válidas desde props
    if (!hasCoordinates) return;

    const newPosition = { lat: currentLat, lng: currentLng };

    // Si hay marker, actualizarlo
    if (markerRef.current) {
      markerRef.current.setPosition(newPosition);
      mapInstanceRef.current.panTo(newPosition);
    } else {
      // Crear marker si no existe
      const marker = new window.google.maps.Marker({
        position: newPosition,
        map: mapInstanceRef.current,
        draggable: !disabled,
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#059669',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      });

      markerRef.current = marker;
      setHasMarker(true);

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          onLocationChange(pos.lat(), pos.lng());
        }
      });

      mapInstanceRef.current.panTo(newPosition);
      mapInstanceRef.current.setZoom(SELECTED_ZOOM);
    }
  }, [lat, lng, hasCoordinates]);

  // Update zoom when prop changes
  useEffect(() => {
    if (mapInstanceRef.current && zoom) {
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [zoom]);

  // Center on current location
  const centerOnCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada en este navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationChange(latitude, longitude);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat: latitude, lng: longitude });
          mapInstanceRef.current.setZoom(17);
        }
      },
      (err) => {
        console.error('Error getting location:', err);
        alert('No se pudo obtener tu ubicación actual');
      },
      { enableHighAccuracy: true }
    );
  }, [onLocationChange]);

  if (error) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          color: '#64748b',
          fontSize: '0.875rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <MapPin size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="google-map-picker" style={{ position: 'relative' }}>
      <style>{`
        .google-map-picker .map-container {
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .google-map-picker .map-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          color: #64748b;
        }

        .google-map-picker .map-controls {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .google-map-picker .map-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: none;
          background: white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #374151;
          transition: all 0.15s;
        }

        .google-map-picker .map-btn:hover {
          background: #f8fafc;
          color: #059669;
        }

        .google-map-picker .map-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .google-map-picker .map-hint {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          pointer-events: none;
          z-index: 10;
        }

        .google-map-picker .crosshair {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 5;
          color: #059669;
          opacity: 0.3;
        }

        @keyframes mapPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .google-map-picker .loading-spinner {
          animation: mapPulse 1.5s infinite;
        }
      `}</style>

      <div
        ref={mapRef}
        className="map-container"
        style={{ height, ...(loading ? { display: 'none' } : {}) }}
      />

      {loading && (
        <div className="map-container map-loading" style={{ height }}>
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={32} className="loading-spinner" style={{ marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Cargando mapa...</p>
          </div>
        </div>
      )}

      {!loading && !disabled && (
        <>
          <div className="map-controls">
            <button
              type="button"
              className="map-btn"
              onClick={centerOnCurrentLocation}
              title="Usar mi ubicación actual"
            >
              <Crosshair size={20} />
            </button>
          </div>

          <div className="map-hint">
            Haz clic en el mapa o arrastra el marcador
          </div>
        </>
      )}

      {showCrosshair && !loading && (
        <div className="crosshair">
          <Crosshair size={48} strokeWidth={1} />
        </div>
      )}
    </div>
  );
}
