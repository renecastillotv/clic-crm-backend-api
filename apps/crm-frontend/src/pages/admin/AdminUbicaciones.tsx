/**
 * AdminUbicaciones - Herramienta de debug para Google Maps
 * Permite hacer clic en el mapa y ver lo que Google devuelve
 * para ayudar a registrar alias y nuevos sectores
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Copy, Check, RefreshCw, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';

// Coordenadas de Santo Domingo
const SANTO_DOMINGO = { lat: 18.4861, lng: -69.9312 };
const DEFAULT_ZOOM = 14;

interface GeocodingResult {
  formatted_address: string;
  place_id: string;
  lat: number;
  lng: number;
  pais?: string;
  pais_code?: string;
  provincia?: string;
  ciudad?: string;
  sector?: string;
  zona?: string;
  direccion?: string;
  codigo_postal?: string;
  types: string[];
  // Raw response para debug
  raw?: any;
}

export default function AdminUbicaciones() {
  const [result, setResult] = useState<GeocodingResult | null>(null);
  const [rawJson, setRawJson] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [clickedPosition, setClickedPosition] = useState<{ lat: number; lng: number } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
      await google.maps.importLibrary('marker');

      const map = new Map(mapRef.current!, {
        center: SANTO_DOMINGO,
        zoom: DEFAULT_ZOOM,
        mapId: 'ubicaciones-debug-map',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;

      // Click handler
      map.addListener('click', async (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();
        if (lat && lng) {
          setClickedPosition({ lat, lng });
          await reverseGeocode(lat, lng);
          updateMarker(lat, lng);
        }
      });
    };

    initMap();
  }, []);

  // Actualizar o crear marker
  const updateMarker = useCallback(async (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;

    if (markerRef.current) {
      markerRef.current.position = { lat, lng };
    } else {
      const marker = new AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: { lat, lng },
        title: 'Ubicacion seleccionada',
      });
      markerRef.current = marker;
    }

    mapInstanceRef.current.panTo({ lat, lng });
  }, []);

  // Reverse geocode
  const reverseGeocode = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/geocoding/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setRawJson(JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        setRawJson(`Error: ${response.status}\n${errorText}`);
        setResult(null);
      }
    } catch (error) {
      setRawJson(`Error de conexion: ${error}`);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Buscar direccion
  const handleSearch = async () => {
    if (!searchInput.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/geocoding/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: searchInput }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setRawJson(JSON.stringify(data, null, 2));

        if (data.lat && data.lng) {
          setClickedPosition({ lat: data.lat, lng: data.lng });
          updateMarker(data.lat, data.lng);
          mapInstanceRef.current?.setZoom(17);
        }
      } else {
        const errorText = await response.text();
        setRawJson(`Error: ${response.status}\n${errorText}`);
        setResult(null);
      }
    } catch (error) {
      setRawJson(`Error de conexion: ${error}`);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Copiar al portapapeles
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copiando:', error);
    }
  };

  // Limpiar
  const handleClear = () => {
    setResult(null);
    setRawJson('');
    setClickedPosition(null);
    setSearchInput('');
    if (markerRef.current) {
      markerRef.current.map = null;
      markerRef.current = null;
    }
    mapInstanceRef.current?.setCenter(SANTO_DOMINGO);
    mapInstanceRef.current?.setZoom(DEFAULT_ZOOM);
  };

  return (
    <div className="admin-ubicaciones">
      <div className="ubicaciones-header">
        <div>
          <h1>Ubicaciones - Debug Tool</h1>
          <p className="subtitle">
            Haz clic en el mapa para ver lo que Google devuelve.
            Usa esta informacion para registrar alias o nuevos sectores.
          </p>
        </div>
        <button className="clear-btn" onClick={handleClear}>
          <RefreshCw size={16} />
          Limpiar
        </button>
      </div>

      {/* Buscador */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar direccion... (ej: Calle 50, Evaristo Morales)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            className="search-btn"
            onClick={handleSearch}
            disabled={loading || !searchInput.trim()}
          >
            Buscar
          </button>
        </div>
      </div>

      <div className="ubicaciones-content">
        {/* Mapa */}
        <div className="map-section">
          <div ref={mapRef} className="map-container" />
          {clickedPosition && (
            <div className="coordinates-badge">
              <MapPin size={14} />
              {clickedPosition.lat.toFixed(6)}, {clickedPosition.lng.toFixed(6)}
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="results-section">
          {/* Resumen de datos parseados */}
          {result && (
            <div className="parsed-data">
              <h3>Datos Parseados</h3>
              <div className="data-grid">
                <div className="data-item">
                  <label>Direccion formateada</label>
                  <span>{result.formatted_address || '-'}</span>
                </div>
                <div className="data-item">
                  <label>Pais</label>
                  <span>{result.pais || '-'} ({result.pais_code || '-'})</span>
                </div>
                <div className="data-item">
                  <label>Provincia</label>
                  <span>{result.provincia || '-'}</span>
                </div>
                <div className="data-item">
                  <label>Ciudad</label>
                  <span>{result.ciudad || '-'}</span>
                </div>
                <div className="data-item highlight">
                  <label>Sector (sublocality)</label>
                  <span>{result.sector || 'NO DETECTADO'}</span>
                </div>
                <div className="data-item">
                  <label>Zona</label>
                  <span>{result.zona || '-'}</span>
                </div>
                <div className="data-item">
                  <label>Direccion</label>
                  <span>{result.direccion || '-'}</span>
                </div>
                <div className="data-item">
                  <label>Codigo Postal</label>
                  <span>{result.codigo_postal || '-'}</span>
                </div>
                <div className="data-item">
                  <label>Types</label>
                  <span className="types-list">{result.types?.join(', ') || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* JSON Raw */}
          <div className="json-section">
            <div className="json-header">
              <h3>Respuesta Raw (JSON)</h3>
              <button
                className="copy-btn"
                onClick={handleCopy}
                disabled={!rawJson}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <textarea
              className="json-textarea"
              value={rawJson}
              readOnly
              placeholder={loading ? 'Cargando...' : 'Haz clic en el mapa para ver los resultados aqui...'}
            />
          </div>
        </div>
      </div>

      <style>{`
        .admin-ubicaciones {
          max-width: 1600px;
        }

        .ubicaciones-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .ubicaciones-header h1 {
          margin: 0 0 8px 0;
          font-size: 2rem;
          font-weight: 700;
          color: #0F172A;
        }

        .ubicaciones-header .subtitle {
          margin: 0;
          color: #64748B;
          font-size: 0.9rem;
        }

        .clear-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          color: #64748B;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: #E2E8F0;
          color: #475569;
        }

        .search-section {
          margin-bottom: 20px;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 4px 4px 16px;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .search-icon {
          color: #94A3B8;
          flex-shrink: 0;
        }

        .search-input-wrapper input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.95rem;
          color: #1F2937;
          padding: 12px 0;
        }

        .search-input-wrapper input::placeholder {
          color: #94A3B8;
        }

        .search-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .search-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ubicaciones-content {
          display: grid;
          grid-template-columns: 1fr 500px;
          gap: 24px;
        }

        .map-section {
          position: relative;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .map-container {
          width: 100%;
          height: 600px;
        }

        .coordinates-badge {
          position: absolute;
          bottom: 16px;
          left: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          font-size: 0.85rem;
          font-family: monospace;
          color: #374151;
        }

        .coordinates-badge svg {
          color: #2563EB;
        }

        .results-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .parsed-data {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .parsed-data h3 {
          margin: 0 0 16px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #0F172A;
        }

        .data-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .data-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px 12px;
          background: #F8FAFC;
          border-radius: 8px;
        }

        .data-item.highlight {
          background: #FEF3C7;
          border: 1px solid #FCD34D;
        }

        .data-item.highlight span {
          color: #92400E;
          font-weight: 600;
        }

        .data-item label {
          font-size: 0.75rem;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 500;
        }

        .data-item span {
          font-size: 0.9rem;
          color: #1F2937;
        }

        .types-list {
          font-size: 0.8rem !important;
          color: #64748B !important;
        }

        .json-section {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .json-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .json-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #0F172A;
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          color: #64748B;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover:not(:disabled) {
          background: #E2E8F0;
          color: #475569;
        }

        .copy-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .json-textarea {
          flex: 1;
          min-height: 200px;
          padding: 14px;
          background: #1E293B;
          border: none;
          border-radius: 10px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.8rem;
          color: #A5F3FC;
          resize: none;
          line-height: 1.5;
        }

        .json-textarea::placeholder {
          color: #64748B;
        }

        @media (max-width: 1200px) {
          .ubicaciones-content {
            grid-template-columns: 1fr;
          }

          .map-container {
            height: 450px;
          }
        }
      `}</style>
    </div>
  );
}
