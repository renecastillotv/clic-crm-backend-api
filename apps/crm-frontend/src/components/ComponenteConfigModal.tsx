/**
 * ComponenteConfigModal - Modal para configurar componentes
 * Compatible con nueva arquitectura (migraciones 073-077)
 * Implementa merge pattern: default_data + config_override
 */

import { useState } from 'react';
import { X, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import './ComponenteConfigModal.css';

// ============================================================
// TYPES
// ============================================================

interface ComponenteAsignado {
  relacion_id: string;
  tipo: string;
  variante: string;
  orden: number;
  activo: boolean;
  default_data: Record<string, any>;
  config_override: Record<string, any>;
  datos_finales: Record<string, any>;
}

interface ComponenteConfigModalProps {
  componente: ComponenteAsignado;
  onClose: () => void;
  onGuardar: (relacionId: string, configOverride: Record<string, any>) => Promise<void>;
  onCambiarVariante?: (relacionId: string, nuevaVariante: string) => Promise<void>;
  variantesDisponibles?: Array<{ variante: string; scope: string }>;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ComponenteConfigModal({
  componente,
  onClose,
  onGuardar,
  onCambiarVariante,
  variantesDisponibles = [],
}: ComponenteConfigModalProps) {
  const [configOverride, setConfigOverride] = useState<Record<string, any>>(
    componente.config_override || {}
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(componente.variante);
  const [mostrarCambioVariante, setMostrarCambioVariante] = useState(false);

  // Obtener todas las claves del default_data
  const campos = Object.keys(componente.default_data || {});

  const handleCampoChange = (campo: string, valor: any) => {
    setConfigOverride((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const resetearCampo = (campo: string) => {
    setConfigOverride((prev) => {
      const newConfig = { ...prev };
      delete newConfig[campo];
      return newConfig;
    });
  };

  const handleGuardar = async () => {
    setSaving(true);
    setError(null);

    try {
      await onGuardar(componente.relacion_id, configOverride);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarVariante = async () => {
    if (!onCambiarVariante || varianteSeleccionada === componente.variante) return;

    setSaving(true);
    setError(null);

    try {
      await onCambiarVariante(componente.relacion_id, varianteSeleccionada);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar variante');
    } finally {
      setSaving(false);
    }
  };

  const getValorActual = (campo: string) => {
    // Si hay override, usar ese valor, si no, usar default
    return campo in configOverride
      ? configOverride[campo]
      : componente.default_data[campo];
  };

  const esCampoModificado = (campo: string) => {
    return campo in configOverride;
  };

  const renderCampo = (campo: string, valorDefault: any) => {
    const valorActual = getValorActual(campo);
    const esModificado = esCampoModificado(campo);
    const tipoDato = typeof valorDefault;

    return (
      <div key={campo} className="config-modal-field">
        <div className="config-modal-field-header">
          <label className="config-modal-field-label">
            {campo}
            {esModificado && (
              <span className="config-modal-field-modified">
                (Modificado)
              </span>
            )}
          </label>
          {esModificado && (
            <button
              onClick={() => resetearCampo(campo)}
              className="config-modal-reset-btn"
            >
              <RefreshCw style={{ width: '12px', height: '12px' }} />
              Resetear
            </button>
          )}
        </div>

        {tipoDato === 'boolean' ? (
          <div className="config-modal-checkbox-container">
            <input
              type="checkbox"
              checked={valorActual}
              onChange={(e) => handleCampoChange(campo, e.target.checked)}
              className="config-modal-checkbox"
            />
            <span className="config-modal-checkbox-label">
              {valorActual ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        ) : tipoDato === 'number' ? (
          <input
            type="number"
            value={valorActual}
            onChange={(e) => handleCampoChange(campo, parseFloat(e.target.value))}
            className={`config-modal-input ${esModificado ? 'modified' : ''}`}
          />
        ) : tipoDato === 'object' && Array.isArray(valorDefault) ? (
          <textarea
            value={JSON.stringify(valorActual, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleCampoChange(campo, parsed);
              } catch {
                // Ignorar errores de parsing mientras se escribe
              }
            }}
            rows={4}
            className={`config-modal-textarea ${esModificado ? 'modified' : ''}`}
          />
        ) : tipoDato === 'object' ? (
          <textarea
            value={JSON.stringify(valorActual, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleCampoChange(campo, parsed);
              } catch {
                // Ignorar errores de parsing mientras se escribe
              }
            }}
            rows={6}
            className={`config-modal-textarea ${esModificado ? 'modified' : ''}`}
          />
        ) : (
          <input
            type="text"
            value={valorActual}
            onChange={(e) => handleCampoChange(campo, e.target.value)}
            className={`config-modal-input ${esModificado ? 'modified' : ''}`}
          />
        )}

        {!esModificado && (
          <p className="config-modal-field-hint">
            Valor por defecto: {JSON.stringify(valorDefault)}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="config-modal-overlay">
      <div className="config-modal">
        {/* Header */}
        <div className="config-modal-header">
          <div>
            <h3 className="config-modal-title">
              Configurar Componente
            </h3>
            <div className="config-modal-subtitle">
              <span className="config-modal-subtitle-text">{componente.tipo}</span>
              <span className="config-modal-badge">
                {componente.variante}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="config-modal-close-btn"
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Content */}
        <div className="config-modal-content">
          {error && (
            <div className="config-modal-error">
              <AlertCircle className="config-modal-error-icon" style={{ width: '20px', height: '20px' }} />
              <div>
                <p className="config-modal-error-title">Error</p>
                <p className="config-modal-error-message">{error}</p>
              </div>
            </div>
          )}

          {/* Cambio de variante */}
          {variantesDisponibles.length > 1 && onCambiarVariante && (
            <div className="config-modal-variante">
              <button
                onClick={() => setMostrarCambioVariante(!mostrarCambioVariante)}
                className="config-modal-variante-toggle"
              >
                <div>
                  <h4 className="config-modal-variante-title">
                    Cambiar Variante
                  </h4>
                  <p className="config-modal-variante-subtitle">
                    Los datos compatibles se preservarán automáticamente
                  </p>
                </div>
                <RefreshCw
                  className={`config-modal-variante-icon ${mostrarCambioVariante ? 'rotated' : ''}`}
                  style={{ width: '16px', height: '16px' }}
                />
              </button>

              {mostrarCambioVariante && (
                <div className="config-modal-variante-list">
                  {variantesDisponibles.map((v) => (
                    <button
                      key={v.variante}
                      onClick={() => setVarianteSeleccionada(v.variante)}
                      className={`config-modal-variante-option ${varianteSeleccionada === v.variante ? 'selected' : ''}`}
                    >
                      <div className="config-modal-variante-option-name">
                        {v.variante}
                      </div>
                      <div className="config-modal-variante-option-scope">
                        Scope: {v.scope}
                      </div>
                    </button>
                  ))}
                  {varianteSeleccionada !== componente.variante && (
                    <button
                      onClick={handleCambiarVariante}
                      disabled={saving}
                      className="config-modal-variante-change-btn"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="config-modal-spinner" style={{ width: '16px', height: '16px' }} />
                          Cambiando variante...
                        </>
                      ) : (
                        <>
                          <RefreshCw style={{ width: '16px', height: '16px' }} />
                          Cambiar a {varianteSeleccionada}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Información sobre merge pattern */}
          <div className="config-modal-info">
            <h4 className="config-modal-info-title">
              Cómo funciona la configuración
            </h4>
            <ul className="config-modal-info-list">
              <li>• Los campos muestran valores por defecto del componente</li>
              <li>• Al modificar un campo, se guarda en config_override</li>
              <li>• Puedes resetear campos a sus valores por defecto</li>
              <li>• Los campos modificados se destacan en azul</li>
            </ul>
          </div>

          {/* Formulario de campos */}
          {campos.length === 0 ? (
            <p className="config-modal-empty-state">
              Este componente no tiene campos configurables
            </p>
          ) : (
            campos.map((campo) =>
              renderCampo(campo, componente.default_data[campo])
            )
          )}

          {/* Vista JSON (para debug) */}
          <details className="config-modal-debug">
            <summary>
              Ver datos en formato JSON
            </summary>
            <div className="config-modal-debug-content">
              <div>
                <p className="config-modal-debug-section-title">
                  default_data (valores por defecto):
                </p>
                <pre className="config-modal-debug-pre">
                  {JSON.stringify(componente.default_data, null, 2)}
                </pre>
              </div>
              <div>
                <p className="config-modal-debug-section-title">
                  config_override (tus modificaciones):
                </p>
                <pre className="config-modal-debug-pre blue">
                  {JSON.stringify(configOverride, null, 2)}
                </pre>
              </div>
              <div>
                <p className="config-modal-debug-section-title">
                  datos_finales (resultado del merge):
                </p>
                <pre className="config-modal-debug-pre green">
                  {JSON.stringify(
                    { ...componente.default_data, ...configOverride },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="config-modal-footer">
          <button
            onClick={() => setConfigOverride({})}
            className="config-modal-reset-all-btn"
          >
            Resetear todo
          </button>
          <div className="config-modal-footer-actions">
            <button
              onClick={onClose}
              className="config-modal-btn config-modal-btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={saving}
              className="config-modal-btn config-modal-btn-primary"
            >
              {saving ? (
                <>
                  <Loader2 className="config-modal-spinner" style={{ width: '16px', height: '16px' }} />
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
