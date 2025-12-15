/**
 * CrmMensajeriaWhatsapp - Gestión de WhatsApp
 */

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';

export default function CrmMensajeriaWhatsapp() {
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'WhatsApp',
      subtitle: 'Gestiona tus conversaciones y mensajes de WhatsApp',
    });
  }, [setPageHeader]);

  return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/>
            <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>
          </svg>
        </div>
        <h3>WhatsApp</h3>
        <p>Próximamente podrás gestionar tus conversaciones y mensajes de WhatsApp aquí</p>
      </div>

      <style>{`
        .page {
          width: 100%;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          background: white;
          border: 2px dashed #e2e8f0;
          border-radius: 16px;
          text-align: center;
        }

        .empty-icon {
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border-radius: 50%;
          color: #94a3b8;
          margin-bottom: 24px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
        }

        .empty-state p {
          margin: 0;
          color: #64748b;
          font-size: 0.95rem;
          max-width: 360px;
        }
      `}</style>
    </div>
  );
}















