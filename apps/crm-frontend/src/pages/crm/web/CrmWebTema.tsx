/**
 * CrmWebTema - Configuración del tema visual del sitio web
 *
 * Permite personalizar los colores del sitio web del tenant.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageHeader } from '../../../layouts/CrmLayout';
import { getTema, updateTema, TemaColores } from '../../../services/api';

const COLOR_LABELS: Record<keyof TemaColores, { label: string; description: string }> = {
  primary: { label: 'Color Primario', description: 'Color principal de la marca (botones, enlaces)' },
  secondary: { label: 'Color Secundario', description: 'Color complementario' },
  accent: { label: 'Acento', description: 'Color para destacar elementos especiales' },
  background: { label: 'Fondo', description: 'Color de fondo principal del sitio' },
  text: { label: 'Texto', description: 'Color del texto principal' },
  textSecondary: { label: 'Texto Secundario', description: 'Color del texto secundario' },
  border: { label: 'Bordes', description: 'Color de los bordes y divisores' },
  success: { label: 'Éxito', description: 'Color para mensajes de éxito' },
  warning: { label: 'Advertencia', description: 'Color para alertas y advertencias' },
  error: { label: 'Error', description: 'Color para mensajes de error' },
};

const DEFAULT_TEMA: TemaColores = {
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#f59e0b',
  background: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
};

export default function CrmWebTema() {
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const [tema, setTema] = useState<TemaColores>(DEFAULT_TEMA);
  const [originalTema, setOriginalTema] = useState<TemaColores>(DEFAULT_TEMA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar tema
  useEffect(() => {
    if (!tenantActual?.id) return;

    async function loadTema() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTema(tenantActual!.id);
        setTema(data);
        setOriginalTema(data);
      } catch (err: any) {
        console.error('Error cargando tema:', err);
        // Si no existe, usar valores por defecto
        setTema(DEFAULT_TEMA);
        setOriginalTema(DEFAULT_TEMA);
      } finally {
        setLoading(false);
      }
    }

    loadTema();
  }, [tenantActual?.id]);

  // Detectar cambios
  useEffect(() => {
    const changed = Object.keys(tema).some(
      (key) => tema[key as keyof TemaColores] !== originalTema[key as keyof TemaColores]
    );
    setHasChanges(changed);
  }, [tema, originalTema]);

  // Configurar header de la página con acciones dinámicas
  useEffect(() => {
    setPageHeader({
      title: 'Tema del Sitio',
      subtitle: 'Personaliza los colores de tu sitio web',
      actions: (
        <div className="header-actions">
          {hasChanges && (
            <button className="btn-secondary" onClick={handleReset}>
              Descartar cambios
            </button>
          )}
          <button className="btn-secondary" onClick={handleResetDefaults}>
            Valores por defecto
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      ),
    });
  }, [setPageHeader, hasChanges, saving]);

  // Actualizar color
  const handleColorChange = (key: keyof TemaColores, value: string) => {
    setTema({ ...tema, [key]: value });
    setSuccess(false);
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!tenantActual?.id) return;

    try {
      setSaving(true);
      setError(null);
      const updated = await updateTema(tenantActual.id, tema);
      setTema(updated);
      setOriginalTema(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error guardando tema:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Resetear a valores originales
  const handleReset = () => {
    setTema(originalTema);
    setSuccess(false);
  };

  // Resetear a valores por defecto
  const handleResetDefaults = () => {
    setTema(DEFAULT_TEMA);
    setSuccess(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando tema...</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px;
            color: #64748b;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="web-tema">
      {/* Mensajes */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="success-banner">
          <span>Tema guardado correctamente</span>
        </div>
      )}

      <div className="tema-layout">
        {/* Editor de colores */}
        <div className="color-editor">
          <h2>Colores</h2>

          <div className="color-grid">
            {(Object.keys(COLOR_LABELS) as Array<keyof TemaColores>).map((key) => (
              <div key={key} className="color-item">
                <div className="color-info">
                  <label htmlFor={key}>{COLOR_LABELS[key].label}</label>
                  <span className="color-description">{COLOR_LABELS[key].description}</span>
                </div>
                <div className="color-input-group">
                  <input
                    type="color"
                    id={key}
                    value={tema[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={tema[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="color-text"
                    placeholder="#000000"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="preview-section">
          <h2>Vista Previa</h2>

          <div
            className="preview-card"
            style={{
              backgroundColor: tema.background,
              color: tema.text,
              borderColor: tema.border,
            }}
          >
            <div className="preview-header" style={{ borderColor: tema.border }}>
              <span style={{ color: tema.primary, fontWeight: 'bold' }}>
                Mi Inmobiliaria
              </span>
              <nav className="preview-nav">
                <a href="#" style={{ color: tema.text }}>Inicio</a>
                <a href="#" style={{ color: tema.text }}>Propiedades</a>
                <a href="#" style={{ color: tema.primary }}>Contacto</a>
              </nav>
            </div>

            <div className="preview-hero" style={{ backgroundColor: tema.primary }}>
              <h3 style={{ color: '#ffffff' }}>Encuentra tu hogar ideal</h3>
              <button
                style={{
                  backgroundColor: tema.accent,
                  color: '#ffffff',
                }}
              >
                Ver Propiedades
              </button>
            </div>

            <div className="preview-content">
              <h4 style={{ color: tema.text }}>Propiedades Destacadas</h4>
              <p style={{ color: tema.textSecondary }}>
                Descubre las mejores opciones del mercado inmobiliario.
              </p>

              <div className="preview-cards">
                <div
                  className="preview-property"
                  style={{ borderColor: tema.border }}
                >
                  <div
                    className="preview-img"
                    style={{ backgroundColor: tema.secondary }}
                  ></div>
                  <div className="preview-details">
                    <span style={{ color: tema.text, fontWeight: '500' }}>
                      Casa en Zona Norte
                    </span>
                    <span style={{ color: tema.primary, fontWeight: 'bold' }}>
                      $250,000
                    </span>
                  </div>
                </div>

                <div
                  className="preview-property"
                  style={{ borderColor: tema.border }}
                >
                  <div
                    className="preview-img"
                    style={{ backgroundColor: tema.secondary }}
                  ></div>
                  <div className="preview-details">
                    <span style={{ color: tema.text, fontWeight: '500' }}>
                      Apartamento Centro
                    </span>
                    <span style={{ color: tema.primary, fontWeight: 'bold' }}>
                      $180,000
                    </span>
                  </div>
                </div>
              </div>

              <div className="preview-alerts">
                <div className="preview-alert" style={{ backgroundColor: `${tema.success}20`, color: tema.success }}>
                  Operación exitosa
                </div>
                <div className="preview-alert" style={{ backgroundColor: `${tema.warning}20`, color: tema.warning }}>
                  Advertencia
                </div>
                <div className="preview-alert" style={{ backgroundColor: `${tema.error}20`, color: tema.error }}>
                  Error encontrado
                </div>
              </div>
            </div>

            <div
              className="preview-footer"
              style={{
                backgroundColor: tema.secondary,
                color: '#ffffff',
              }}
            >
              <span>© 2024 Mi Inmobiliaria</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .web-tema {
          width: 100%;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn-primary {
          background: #2563eb;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }

        .btn-primary:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .error-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          color: #dc2626;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 1.25rem;
          cursor: pointer;
        }

        .success-banner {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          color: #16a34a;
        }

        .tema-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 32px;
        }

        @media (max-width: 1024px) {
          .tema-layout {
            grid-template-columns: 1fr;
          }
        }

        .color-editor {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
        }

        .color-editor h2 {
          margin: 0 0 24px 0;
          font-size: 1.25rem;
          color: #0f172a;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .color-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .color-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .color-info label {
          font-weight: 500;
          color: #0f172a;
        }

        .color-description {
          font-size: 0.75rem;
          color: #64748b;
        }

        .color-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-picker {
          width: 44px;
          height: 44px;
          padding: 0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: none;
        }

        .color-picker::-webkit-color-swatch-wrapper {
          padding: 0;
        }

        .color-picker::-webkit-color-swatch {
          border-radius: 8px;
          border: 2px solid #e2e8f0;
        }

        .color-text {
          width: 90px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #0f172a;
          font-family: monospace;
          font-size: 0.875rem;
        }

        .color-text:focus {
          outline: none;
          border-color: #2563eb;
        }

        .preview-section {
          position: sticky;
          top: 24px;
        }

        .preview-section h2 {
          margin: 0 0 16px 0;
          font-size: 1.25rem;
          color: #0f172a;
        }

        .preview-card {
          border-radius: 12px;
          border: 1px solid;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid;
        }

        .preview-nav {
          display: flex;
          gap: 16px;
        }

        .preview-nav a {
          text-decoration: none;
          font-size: 0.875rem;
        }

        .preview-hero {
          padding: 40px 20px;
          text-align: center;
        }

        .preview-hero h3 {
          margin: 0 0 16px 0;
          font-size: 1.25rem;
        }

        .preview-hero button {
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .preview-content {
          padding: 24px 20px;
        }

        .preview-content h4 {
          margin: 0 0 8px 0;
        }

        .preview-content p {
          margin: 0 0 20px 0;
          font-size: 0.875rem;
        }

        .preview-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .preview-property {
          border: 1px solid;
          border-radius: 8px;
          overflow: hidden;
        }

        .preview-img {
          height: 60px;
        }

        .preview-details {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.75rem;
        }

        .preview-alerts {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preview-alert {
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .preview-footer {
          padding: 16px 20px;
          text-align: center;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
