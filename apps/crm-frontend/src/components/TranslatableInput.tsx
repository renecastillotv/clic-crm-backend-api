/**
 * TranslatableInput - Input con soporte para traducciones a múltiples idiomas
 */

import { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, Check } from 'lucide-react';

// Idiomas soportados
export const IDIOMAS_SOPORTADOS = [
  { codigo: 'es', nombre: 'Español', bandera: '🇪🇸' },
  { codigo: 'en', nombre: 'English', bandera: '🇺🇸' },
  { codigo: 'pt', nombre: 'Português', bandera: '🇧🇷' },
  { codigo: 'fr', nombre: 'Français', bandera: '🇫🇷' },
  { codigo: 'de', nombre: 'Deutsch', bandera: '🇩🇪' },
  { codigo: 'it', nombre: 'Italiano', bandera: '🇮🇹' },
  { codigo: 'zh', nombre: '中文', bandera: '🇨🇳' },
  { codigo: 'ru', nombre: 'Русский', bandera: '🇷🇺' },
];

export interface Traducciones {
  [idioma: string]: string | null;
}

interface TranslatableInputProps {
  label: string;
  value: string | null;
  traducciones?: Traducciones;
  onChange: (value: string | null) => void;
  onTraduccionesChange?: (traducciones: Traducciones) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  hint?: string;
  idiomasHabilitados?: string[]; // Si no se pasa, se muestran todos
}

export default function TranslatableInput({
  label,
  value,
  traducciones = {},
  onChange,
  onTraduccionesChange,
  placeholder,
  multiline = false,
  rows = 3,
  required = false,
  hint,
  idiomasHabilitados,
}: TranslatableInputProps) {
  const [showTraducciones, setShowTraducciones] = useState(false);

  const idiomasDisponibles = idiomasHabilitados
    ? IDIOMAS_SOPORTADOS.filter(i => idiomasHabilitados.includes(i.codigo))
    : IDIOMAS_SOPORTADOS;

  // Contar traducciones completadas (excluyendo español que es el valor principal)
  const traduccionesCompletadas = idiomasDisponibles
    .filter(i => i.codigo !== 'es')
    .filter(i => traducciones[i.codigo])
    .length;

  const totalTraducciones = idiomasDisponibles.filter(i => i.codigo !== 'es').length;

  const handleTraduccionChange = (idioma: string, valor: string | null) => {
    if (onTraduccionesChange) {
      onTraduccionesChange({
        ...traducciones,
        [idioma]: valor || null,
      });
    }
  };

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="translatable-input">
      <div className="input-header">
        <label className="input-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
        {onTraduccionesChange && totalTraducciones > 0 && (
          <button
            type="button"
            className={`btn-traducciones ${showTraducciones ? 'active' : ''}`}
            onClick={() => setShowTraducciones(!showTraducciones)}
          >
            <Globe size={14} />
            <span>
              {traduccionesCompletadas}/{totalTraducciones}
            </span>
            {showTraducciones ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Campo principal (español) */}
      <div className="main-input-wrapper">
        <span className="idioma-badge">🇪🇸 ES</span>
        <InputComponent
          className="main-input"
          value={value || ''}
          onChange={(e: any) => onChange(e.target.value || null)}
          placeholder={placeholder}
          rows={multiline ? rows : undefined}
        />
      </div>

      {hint && <span className="input-hint">{hint}</span>}

      {/* Panel de traducciones */}
      {showTraducciones && onTraduccionesChange && (
        <div className="traducciones-panel">
          <div className="traducciones-header">
            <Globe size={16} />
            <span>Traducciones</span>
          </div>
          <div className="traducciones-list">
            {idiomasDisponibles
              .filter(idioma => idioma.codigo !== 'es')
              .map(idioma => (
                <div key={idioma.codigo} className="traduccion-item">
                  <div className="traduccion-label">
                    <span className="bandera">{idioma.bandera}</span>
                    <span className="idioma-nombre">{idioma.nombre}</span>
                    {traducciones[idioma.codigo] && (
                      <Check size={14} className="check-icon" />
                    )}
                  </div>
                  <InputComponent
                    className="traduccion-input"
                    value={traducciones[idioma.codigo] || ''}
                    onChange={(e: any) => handleTraduccionChange(idioma.codigo, e.target.value || null)}
                    placeholder={`${placeholder || label} en ${idioma.nombre}`}
                    rows={multiline ? rows : undefined}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      <style>{`
        .translatable-input {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .input-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .required {
          color: #ef4444;
          margin-left: 2px;
        }

        .btn-traducciones {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-traducciones:hover {
          background: #e2e8f0;
          color: #475569;
        }

        .btn-traducciones.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .main-input-wrapper {
          position: relative;
          display: flex;
          align-items: flex-start;
        }

        .idioma-badge {
          position: absolute;
          left: 10px;
          top: 10px;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #64748b;
          z-index: 1;
        }

        .main-input {
          width: 100%;
          padding: 10px 12px 10px 60px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .main-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        textarea.main-input {
          resize: vertical;
          min-height: 80px;
        }

        .input-hint {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        /* Panel de traducciones */
        .traducciones-panel {
          margin-top: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }

        .traducciones-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
        }

        .traducciones-list {
          display: flex;
          flex-direction: column;
        }

        .traduccion-item {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .traduccion-item:last-child {
          border-bottom: none;
        }

        .traduccion-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .bandera {
          font-size: 1rem;
        }

        .idioma-nombre {
          font-size: 0.8rem;
          font-weight: 500;
          color: #475569;
        }

        .check-icon {
          color: #22c55e;
        }

        .traduccion-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.85rem;
          background: white;
          transition: all 0.2s;
          font-family: inherit;
        }

        .traduccion-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        textarea.traduccion-input {
          resize: vertical;
          min-height: 60px;
        }
      `}</style>
    </div>
  );
}
