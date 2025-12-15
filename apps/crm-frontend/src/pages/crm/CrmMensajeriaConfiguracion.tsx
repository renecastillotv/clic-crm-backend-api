/**
 * CrmMensajeriaConfiguracion - Configuración de mensajería
 */

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';

export default function CrmMensajeriaConfiguracion() {
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Configuración de Mensajería',
      subtitle: `Ajustes de mensajería para ${tenantActual?.nombre || 'tu CRM'}`,
    });
  }, [setPageHeader, tenantActual?.nombre]);

  return (
    <div className="page">
      <div className="settings-grid">
        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h3>Configuración de Correo</h3>
          </div>
          <p className="card-desc">Configura servidores SMTP, plantillas y firmas de correo electrónico</p>
          <span className="card-status">Próximamente</span>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/>
              </svg>
            </div>
            <h3>Integración WhatsApp</h3>
          </div>
          <p className="card-desc">Conecta tu cuenta de WhatsApp Business API para enviar y recibir mensajes</p>
          <span className="card-status">Próximamente</span>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              </svg>
            </div>
            <h3>Integración Instagram</h3>
          </div>
          <p className="card-desc">Conecta tu cuenta de Instagram para gestionar mensajes directos y comentarios</p>
          <span className="card-status">Próximamente</span>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </div>
            <h3>Integración Facebook</h3>
          </div>
          <p className="card-desc">Conecta tu página de Facebook para gestionar mensajes y comentarios</p>
          <span className="card-status">Próximamente</span>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3>Chat en Vivo</h3>
          </div>
          <p className="card-desc">Configura el widget de chat en vivo para tu sitio web</p>
          <span className="card-status">Próximamente</span>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <h3>Configuración General</h3>
          </div>
          <p className="card-desc">Ajustes generales de notificaciones y preferencias de mensajería</p>
          <span className="card-status">Próximamente</span>
        </div>
      </div>

      <style>{`
        .page {
          width: 100%;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .settings-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          transition: all 0.2s;
        }

        .settings-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .card-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .card-desc {
          margin: 0 0 16px 0;
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .card-status {
          display: inline-block;
          padding: 4px 12px;
          background: #f1f5f9;
          color: #64748b;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}















