/**
 * CrmContenidoPermisosConfiguracion - Configuración de permisos de contenido
 *
 * Permite a los administradores controlar qué tipos de contenido pueden crear los usuarios.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import { ArrowLeft, FileText, Video, MessageSquare, HelpCircle, BarChart, Tag, Link2, Check, X, Loader2 } from 'lucide-react';

interface PermisosContenido {
  articulos: boolean;
  videos: boolean;
  testimonios: boolean;
  faqs: boolean;
  seo_stats: boolean;
  categorias: boolean;
  relaciones: boolean;
}

const TIPOS_CONTENIDO = [
  { key: 'articulos', label: 'Artículos', descripcion: 'Crear y editar artículos del blog', icon: FileText },
  { key: 'videos', label: 'Videos', descripcion: 'Agregar y gestionar videos', icon: Video },
  { key: 'testimonios', label: 'Testimonios', descripcion: 'Agregar testimonios de clientes', icon: MessageSquare },
  { key: 'faqs', label: 'FAQs', descripcion: 'Crear preguntas frecuentes', icon: HelpCircle },
  { key: 'seo_stats', label: 'SEO Stats', descripcion: 'Gestionar estadísticas SEO por ubicación', icon: BarChart },
  { key: 'categorias', label: 'Categorías', descripcion: 'Crear y editar categorías de contenido', icon: Tag },
  { key: 'relaciones', label: 'Relaciones', descripcion: 'Vincular contenido con propiedades', icon: Link2 },
];

export default function CrmContenidoPermisosConfiguracion() {
  const navigate = useNavigate();
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  const [permisos, setPermisos] = useState<PermisosContenido>({
    articulos: true,
    videos: true,
    testimonios: true,
    faqs: true,
    seo_stats: true,
    categorias: false, // Por defecto solo admin
    relaciones: false, // Por defecto solo admin
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPageHeader({
      title: 'Permisos de Contenido',
      subtitle: 'Controla qué tipos de contenido pueden crear los usuarios',
    });
  }, [setPageHeader]);

  useEffect(() => {
    loadPermisos();
  }, [tenantActual?.id]);

  const loadPermisos = async () => {
    if (!tenantActual?.id) return;
    setLoading(true);
    try {
      // TODO: Implementar API para obtener permisos de contenido del tenant
      // Por ahora usar valores por defecto
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular carga
    } catch (error) {
      console.error('Error cargando permisos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof PermisosContenido) => {
    setPermisos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!tenantActual?.id) return;
    setSaving(true);
    try {
      // TODO: Implementar API para guardar permisos de contenido del tenant
      await new Promise(resolve => setTimeout(resolve, 800)); // Simular guardado
      setHasChanges(false);
      alert('Permisos guardados exitosamente');
    } catch (error) {
      console.error('Error guardando permisos:', error);
      alert('Error al guardar los permisos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <style>{`
        .page {
          width: 100%;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #64748b;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 20px;
        }

        .back-button:hover {
          border-color: #cbd5e1;
          color: #334155;
        }

        .permisos-container {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .permisos-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .permisos-header h2 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .permisos-header p {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }

        .permisos-list {
          padding: 8px 0;
        }

        .permiso-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s;
        }

        .permiso-item:last-child {
          border-bottom: none;
        }

        .permiso-item:hover {
          background: #f8fafc;
        }

        .permiso-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .permiso-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .permiso-icon.enabled {
          background: #dbeafe;
          color: #2563eb;
        }

        .permiso-details h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 2px 0;
        }

        .permiso-details p {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }

        .toggle-switch {
          position: relative;
          width: 48px;
          height: 26px;
          background: #e2e8f0;
          border-radius: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .toggle-switch.enabled {
          background: #2563eb;
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          width: 22px;
          height: 22px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        .toggle-switch.enabled::after {
          transform: translateX(22px);
        }

        .permisos-footer {
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .permisos-footer .info {
          font-size: 0.8rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loading-state {
          padding: 60px 24px;
          text-align: center;
          color: #64748b;
        }

        .loading-state svg {
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .info-banner {
          padding: 16px 20px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 10px;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .info-banner svg {
          color: #d97706;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .info-banner p {
          font-size: 0.875rem;
          color: #92400e;
          margin: 0;
          line-height: 1.5;
        }
      `}</style>

      <button className="back-button" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />
        Volver a Configuración
      </button>

      <div className="info-banner">
        <HelpCircle size={20} />
        <p>
          <strong>Nota:</strong> Estos permisos aplican a usuarios con rol de asesor o colaborador.
          Los administradores siempre tienen acceso completo a todas las funciones de contenido.
        </p>
      </div>

      <div className="permisos-container">
        <div className="permisos-header">
          <h2>Tipos de Contenido</h2>
          <p>Activa o desactiva los tipos de contenido que los usuarios pueden crear</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <Loader2 size={32} />
            <p>Cargando configuración...</p>
          </div>
        ) : (
          <>
            <div className="permisos-list">
              {TIPOS_CONTENIDO.map(tipo => {
                const IconComponent = tipo.icon;
                const enabled = permisos[tipo.key as keyof PermisosContenido];

                return (
                  <div key={tipo.key} className="permiso-item">
                    <div className="permiso-info">
                      <div className={`permiso-icon ${enabled ? 'enabled' : ''}`}>
                        <IconComponent size={20} />
                      </div>
                      <div className="permiso-details">
                        <h4>{tipo.label}</h4>
                        <p>{tipo.descripcion}</p>
                      </div>
                    </div>
                    <div
                      className={`toggle-switch ${enabled ? 'enabled' : ''}`}
                      onClick={() => handleToggle(tipo.key as keyof PermisosContenido)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="permisos-footer">
              <div className="info">
                {hasChanges ? (
                  <>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                    Hay cambios sin guardar
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Configuración actualizada
                  </>
                )}
              </div>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
