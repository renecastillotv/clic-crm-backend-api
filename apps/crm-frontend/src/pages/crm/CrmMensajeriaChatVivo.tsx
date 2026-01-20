/**
 * CrmMensajeriaChatVivo - Gestión de chat en vivo
 */

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '../../layouts/CrmLayout';

export default function CrmMensajeriaChatVivo() {
  const { tenantActual } = useAuth();
  const { setPageHeader } = usePageHeader();

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Chat en Vivo',
      subtitle: 'Gestiona las conversaciones de chat en vivo de tu sitio web',
    });
  }, [setPageHeader]);

  return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="9" y1="10" x2="15" y2="10"/>
            <line x1="12" y1="7" x2="12" y2="13"/>
          </svg>
        </div>
        <h3>Chat en Vivo</h3>
        <p>Próximamente podrás gestionar las conversaciones de chat en vivo aquí</p>
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
















