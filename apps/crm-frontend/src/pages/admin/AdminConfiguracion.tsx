/**
 * AdminConfiguracion - Gestión de Configuración de la Plataforma
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getAllConfig, updateMultipleConfig, PlatformConfig } from '../../services/api';

type Categoria = 'general' | 'seguridad' | 'integraciones' | 'notificaciones';

export default function AdminConfiguracion() {
  const { getToken } = useAuth();
  const [config, setConfig] = useState<Record<string, PlatformConfig[]>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Categoria>('general');

  const categorias: { key: Categoria; label: string; icon: React.ReactNode }[] = [
    { 
      key: 'general', 
      label: 'General', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9867C9.5799 19.7154 9.31074 19.5053 9 19.38C8.69838 19.2469 8.36381 19.2072 8.03941 19.266C7.71502 19.3248 7.41568 19.4795 7.18 19.71L7.12 19.77C6.93425 19.956 6.71368 20.1035 6.47088 20.2041C6.22808 20.3048 5.96783 20.3566 5.705 20.3566C5.44217 20.3566 5.18192 20.3048 4.93912 20.2041C4.69632 20.1035 4.47575 19.956 4.29 19.77C4.10405 19.5843 3.95653 19.3637 3.85588 19.1209C3.75523 18.8781 3.70343 18.6178 3.70343 18.355C3.70343 18.0922 3.75523 17.8319 3.85588 17.5891C3.95653 17.3463 4.10405 17.1257 4.29 16.94L4.35 16.88C4.58054 16.6443 4.73519 16.345 4.794 16.0206C4.85282 15.6962 4.81312 15.3616 4.68 15.06C4.55324 14.7642 4.34276 14.512 4.07447 14.3343C3.80618 14.1566 3.49179 14.0613 3.17 14.06H3C2.46957 14.06 1.96086 13.8493 1.58579 13.4742C1.21071 13.0991 1 12.5904 1 12.06C1 11.5296 1.21071 11.0209 1.58579 10.6458C1.96086 10.2707 2.46957 10.06 3 10.06H3.09C3.42099 10.0523 3.742 9.94512 4.0133 9.75251C4.28459 9.5599 4.49472 9.29074 4.62 8.98C4.75312 8.67838 4.79282 8.34381 4.734 8.01941C4.67519 7.69502 4.52054 7.39568 4.29 7.16L4.23 7.1C4.04405 6.91425 3.89653 6.69368 3.79588 6.45088C3.69523 6.20808 3.64343 5.94783 3.64343 5.685C3.64343 5.42217 3.69523 5.16192 3.79588 4.91912C3.89653 4.67632 4.04405 4.45575 4.23 4.27C4.41575 4.08405 4.63632 3.93653 4.87912 3.83588C5.12192 3.73523 5.38217 3.68343 5.645 3.68343C5.90783 3.68343 6.16808 3.73523 6.41088 3.83588C6.65368 3.93653 6.87425 4.08405 7.06 4.27L7.12 4.33C7.35568 4.56054 7.65502 4.71519 7.97941 4.774C8.30381 4.83282 8.63838 4.79312 8.94 4.66H9C9.29577 4.53324 9.54802 4.32276 9.72569 4.05447C9.90337 3.78618 9.99872 3.47179 10 3.15V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      key: 'seguridad', 
      label: 'Seguridad', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      key: 'integraciones', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.4791 3.53087C19.5521 2.60383 18.298 2.07799 16.987 2.0666C15.676 2.0552 14.413 2.55918 13.47 3.47L11.75 5.18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 11C13.5705 10.4259 13.0226 9.95087 12.3934 9.60707C11.7643 9.26327 11.0685 9.05886 10.3533 9.00766C9.63821 8.95645 8.92038 9.05972 8.24863 9.31026C7.57688 9.5608 6.96691 9.95303 6.46 10.46L3.46 13.46C2.54918 14.403 2.04519 15.6661 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.44791 21.3962 5.70198 21.922 7.01296 21.9334C8.32394 21.9448 9.58705 21.4408 10.53 20.53L12.24 18.82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ), 
      label: 'Integraciones' 
    },
    { 
      key: 'notificaciones', 
      label: 'Notificaciones', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
  ];

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const data = await getAllConfig(token);
      setConfig(data);

      // Inicializar formData con los valores actuales
      const initialFormData: Record<string, string> = {};
      Object.values(data).flat().forEach((cfg) => {
        initialFormData[cfg.clave] = cfg.valor || '';
      });
      setFormData(initialFormData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar configuraciones');
      console.error('Error cargando configuraciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (clave: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [clave]: String(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      // Filtrar solo las configuraciones de la categoría activa que han cambiado
      const categoriaConfigs = config[activeCategory] || [];
      const configsToUpdate: Record<string, string> = {};
      
      categoriaConfigs.forEach((cfg) => {
        const currentValue = formData[cfg.clave];
        if (currentValue !== undefined && currentValue !== cfg.valor) {
          configsToUpdate[cfg.clave] = currentValue;
        }
      });

      if (Object.keys(configsToUpdate).length === 0) {
        setError('No hay cambios para guardar');
        setSaving(false);
        return;
      }

      await updateMultipleConfig(configsToUpdate, token);
      await loadConfig(); // Recargar para obtener valores actualizados
      
      // Mostrar mensaje de éxito
      alert('Configuraciones guardadas exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuraciones');
      console.error('Error guardando configuraciones:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderConfigField = (cfg: PlatformConfig) => {
    const value = formData[cfg.clave] || cfg.valor || '';

    if (cfg.tipo === 'boolean') {
      return (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => handleChange(cfg.clave, e.target.checked)}
          />
          <span>{cfg.descripcion || cfg.clave}</span>
        </label>
      );
    }

    if (cfg.tipo === 'number') {
      return (
        <div className="form-group">
          <label>{cfg.descripcion || cfg.clave}</label>
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(cfg.clave, e.target.value)}
            placeholder={cfg.descripcion || cfg.clave}
          />
        </div>
      );
    }

    if (cfg.tipo === 'json') {
      return (
        <div className="form-group">
          <label>{cfg.descripcion || cfg.clave}</label>
          <textarea
            value={value}
            onChange={(e) => handleChange(cfg.clave, e.target.value)}
            rows={4}
            placeholder='{"key": "value"}'
            className="font-mono"
          />
          <p className="form-hint">Formato JSON válido</p>
        </div>
      );
    }

    // String (default) - si es sensible, usar password input
    const isSensitive = cfg.esSensible && value.length > 0;
    return (
      <div className="form-group">
        <label>
          {cfg.descripcion || cfg.clave}
          {cfg.esSensible && <span className="sensitive-badge">🔒 Sensible</span>}
        </label>
        <input
          type={isSensitive ? 'password' : 'text'}
          value={isSensitive ? '••••••••' : value}
          onChange={(e) => {
            if (!isSensitive) {
              handleChange(cfg.clave, e.target.value);
            }
          }}
          onFocus={(e) => {
            if (isSensitive) {
              e.target.type = 'text';
              e.target.value = value;
            }
          }}
          onBlur={(e) => {
            if (cfg.esSensible && value.length > 0) {
              e.target.type = 'password';
              e.target.value = '••••••••';
            }
          }}
          placeholder={cfg.descripcion || cfg.clave}
          disabled={isSensitive && value.length === 0}
        />
        {cfg.esSensible && value.length === 0 && (
          <p className="form-hint">Establece un valor para habilitar la edición</p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="admin-config-loading">
        <div className="loading-spinner"></div>
        <p>Cargando configuraciones...</p>
        <style>{`
          .admin-config-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
          border: 4px solid #E2E8F0;
          border-top-color: #2563EB;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const categoriaConfigs = config[activeCategory] || [];

  return (
    <div className="admin-configuracion">
      <div className="page-header">
        <div>
          <h1>Configuración</h1>
          <p className="page-subtitle">
            Gestiona la configuración global de la plataforma
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}

      <div className="config-layout">
        {/* Categorías Sidebar */}
        <div className="config-sidebar">
          {categorias.map((categoria) => (
            <button
              key={categoria.key}
              className={`category-button ${activeCategory === categoria.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(categoria.key)}
            >
              <span className="category-icon">{categoria.icon}</span>
              <span className="category-label">{categoria.label}</span>
            </button>
          ))}
        </div>

        {/* Formulario */}
        <div className="config-content">
          <form onSubmit={handleSubmit}>
            <div className="config-section">
              <h2 className="section-title">
                <span className="section-icon">{categorias.find((c) => c.key === activeCategory)?.icon}</span>
                {categorias.find((c) => c.key === activeCategory)?.label}
              </h2>
              <p className="section-description">
                {activeCategory === 'general' && 'Configuración general de la plataforma'}
                {activeCategory === 'seguridad' && 'Configuración de seguridad y autenticación'}
                {activeCategory === 'integraciones' && 'Configuración de integraciones externas (SMTP, pagos, etc.)'}
                {activeCategory === 'notificaciones' && 'Configuración de notificaciones y comunicaciones'}
              </p>

              {categoriaConfigs.length === 0 ? (
                <div className="empty-state">
                  <p>No hay configuraciones en esta categoría</p>
                </div>
              ) : (
                <div className="config-fields">
                  {categoriaConfigs.map((cfg) => (
                    <div key={cfg.clave} className="config-field">
                      {renderConfigField(cfg)}
                    </div>
                  ))}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={loadConfig}
                  disabled={saving}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .admin-configuracion {
          width: 100%;
        }

        .page-header {
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 8px 0;
          font-size: 2.25rem;
        }

        .page-subtitle {
          color: #64748B;
          font-size: 0.9375rem;
          margin: 0;
        }

        .error-message {
          padding: 16px;
          background: #FEE2E2;
          border: 1px solid #FECACA;
          border-radius: 12px;
          color: #DC2626;
          font-weight: 500;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .config-layout {
          display: flex;
          gap: 24px;
        }

        .config-sidebar {
          width: 240px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .category-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .category-button:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
          transform: translateX(2px);
        }

        .category-button.active {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-color: #2563EB;
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .category-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .category-button.active .category-icon {
          color: white;
        }

        .config-content {
          flex: 1;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          padding: 32px;
        }

        .config-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          letter-spacing: -0.01em;
        }
        
        .section-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563EB;
        }

        .section-description {
          color: #64748B;
          font-size: 0.9375rem;
          margin: 8px 0 0 0;
          line-height: 1.6;
        }

        .config-fields {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .config-field {
          width: 100%;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0F172A;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sensitive-badge {
          padding: 4px 10px;
          background: #FEF3C7;
          color: #D97706;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .form-group input,
        .form-group textarea {
          padding: 12px 16px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          color: #0F172A;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-group input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
          font-family: 'Courier New', monospace;
        }

        .form-hint {
          margin-top: 4px;
          font-size: 0.75rem;
          color: #64748B;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 12px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .checkbox-label:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }

        .checkbox-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .checkbox-label span {
          color: #0F172A;
          font-size: 0.9375rem;
          flex: 1;
          font-weight: 500;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          padding-top: 24px;
          border-top: 1px solid #E2E8F0;
        }

        .btn-primary {
          padding: 12px 24px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          padding: 12px 24px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #475569;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state {
          padding: 48px;
          text-align: center;
          color: #64748B;
          font-size: 0.9375rem;
        }

        .font-mono {
          font-family: 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
}

