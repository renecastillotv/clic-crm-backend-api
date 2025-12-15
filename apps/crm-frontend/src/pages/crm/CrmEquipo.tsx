/**
 * CrmEquipo - Gestión del equipo/agentes
 */

import { useEffect } from 'react';
import { usePageHeader } from '../../layouts/CrmLayout';

export default function CrmEquipo() {
  const { setPageHeader } = usePageHeader();

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Equipo',
      subtitle: 'Gestiona los agentes y miembros de tu equipo',
      actions: (
        <button className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Invitar Miembro
        </button>
      ),
    });
  }, [setPageHeader]);

  return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
        </div>
        <h3>No hay miembros en el equipo</h3>
        <p>Invita a agentes y colaboradores para trabajar juntos en el CRM</p>
      </div>

      <style>{`
        .page {
          width: 100%;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          background: white;
          border: 1px dashed #e2e8f0;
          border-radius: 12px;
          text-align: center;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border-radius: 50%;
          color: #94a3b8;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .empty-state p {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
          max-width: 300px;
        }
      `}</style>
    </div>
  );
}
