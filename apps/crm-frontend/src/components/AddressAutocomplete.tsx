import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

interface GeocodedAddress {
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
}

interface AddressAutocompleteProps {
  onSelect: (address: GeocodedAddress) => void;
  placeholder?: string;
  countryRestriction?: string;
  disabled?: boolean;
  className?: string;
  initialValue?: string;
}

// VITE_API_URL ya incluye /api, así que usamos la base sin /api
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';

export default function AddressAutocomplete({
  onSelect,
  placeholder = 'Buscar direccion...',
  countryRestriction = 'do',
  disabled = false,
  className = '',
  initialValue = '',
}: AddressAutocompleteProps) {
  // Siempre inicia vacío - es solo un "lanzador" para buscar direcciones
  const [input, setInput] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handler cuando el usuario escribe
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Generar session token al montar
  useEffect(() => {
    const generateToken = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/geocoding/session-token`);
        const data = await response.json();
        setSessionToken(data.sessionToken);
      } catch (error) {
        // Fallback: generar token local
        setSessionToken(`${Date.now()}-${Math.random().toString(36).substring(2, 15)}`);
      }
    };
    generateToken();
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const container = dropdownRef.current?.parentElement;

      // Verificar si el click fue fuera del contenedor completo
      if (container && !container.contains(target)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    // Usar 'click' en lugar de 'mousedown' para mejor UX
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, []);

  // Cerrar dropdown cuando el input pierde el foco (con delay para permitir clicks)
  const handleBlur = useCallback(() => {
    // Delay para permitir que el click en la lista se procese primero
    setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 200);
  }, []);

  // Buscar predicciones con debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!input || input.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/geocoding/autocomplete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input,
            sessionToken,
            countryRestriction,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const preds = data.predictions || [];
          setPredictions(preds);
          setShowDropdown(preds.length > 0);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [input, sessionToken, countryRestriction]);

  // Obtener detalles del lugar seleccionado
  const handleSelectPlace = async (prediction: PlacePrediction) => {
    setLoading(true);
    setShowDropdown(false);
    setInput(prediction.description);

    try {
      const response = await fetch(`${API_BASE}/api/geocoding/place-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: prediction.place_id,
          sessionToken,
        }),
      });

      if (response.ok) {
        const details: GeocodedAddress = await response.json();
        onSelect(details);

        // Generar nuevo session token para la siguiente sesion
        const tokenResponse = await fetch(`${API_BASE}/api/geocoding/session-token`);
        const tokenData = await tokenResponse.json();
        setSessionToken(tokenData.sessionToken);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar navegacion con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelectPlace(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Limpiar input
  const handleClear = () => {
    setInput('');
    setPredictions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`address-autocomplete-container ${className}`}>
      <style>{`
        .address-autocomplete-container {
          position: relative;
          width: 100%;
        }

        .address-autocomplete-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .address-autocomplete-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
          width: 16px;
          height: 16px;
        }

        .address-autocomplete-input {
          width: 100%;
          padding: 10px 40px 10px 36px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #1f2937;
          background: white;
          transition: border-color 0.15s;
        }

        .address-autocomplete-input:focus {
          outline: none;
          border-color: var(--premium-primary, #059669);
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        .address-autocomplete-input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .address-autocomplete-input::placeholder {
          color: #94a3b8;
        }

        .address-autocomplete-actions {
          position: absolute;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .address-autocomplete-clear {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0;
        }

        .address-autocomplete-clear:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .address-autocomplete-loading {
          color: var(--premium-primary, #059669);
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .address-autocomplete-dropdown {
          position: absolute;
          top: calc(100% + 2px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          max-height: 280px;
          overflow-y: auto;
        }

        .address-prediction-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
        }

        .address-prediction-item:last-child {
          border-bottom: none;
        }

        .address-prediction-item:hover,
        .address-prediction-item.selected {
          background: #f8fafc;
        }

        .address-prediction-icon {
          width: 28px;
          height: 28px;
          background: #f1f5f9;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #64748b;
        }

        .address-prediction-item:hover .address-prediction-icon,
        .address-prediction-item.selected .address-prediction-icon {
          background: #ecfdf5;
          color: var(--premium-primary, #059669);
        }

        .address-prediction-content {
          flex: 1;
          min-width: 0;
        }

        .address-prediction-main {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1f2937;
        }

        .address-prediction-secondary {
          font-size: 0.75rem;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .address-autocomplete-empty {
          padding: 12px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
        }
      `}</style>

      <div className="address-autocomplete-input-wrapper">
        <MapPin className="address-autocomplete-icon" size={16} />
        <input
          ref={inputRef}
          type="text"
          className="address-autocomplete-input"
          value={input}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        <div className="address-autocomplete-actions">
          {loading && <Loader2 className="address-autocomplete-loading" size={18} />}
          {input && !loading && (
            <button
              type="button"
              className="address-autocomplete-clear"
              onClick={handleClear}
              tabIndex={-1}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {showDropdown && (
        <div ref={dropdownRef} className="address-autocomplete-dropdown">
          {predictions.length > 0 ? (
            predictions.map((prediction, index) => (
              <div
                key={prediction.place_id}
                className={`address-prediction-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelectPlace(prediction)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="address-prediction-icon">
                  <MapPin size={18} />
                </div>
                <div className="address-prediction-content">
                  <div className="address-prediction-main">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </div>
                  {prediction.structured_formatting?.secondary_text && (
                    <div className="address-prediction-secondary">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="address-autocomplete-empty">
              No se encontraron resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}
