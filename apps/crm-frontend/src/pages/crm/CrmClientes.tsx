/**
 * CrmClientes - Gestión de clientes/leads
 */

import { useEffect } from 'react';
import { usePageHeader } from '../../layouts/CrmLayout';

export default function CrmClientes() {
  const { setPageHeader } = usePageHeader();

  // Configurar header de la página
  useEffect(() => {
    setPageHeader({
      title: 'Clientes',
      subtitle: 'Gestiona tu base de clientes y leads',
      actions: (
        <button className="crm-btn crm-btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo Cliente
        </button>
      ),
    });
  }, [setPageHeader]);

  return (
    <div style={{ width: '100%' }}>
      <div className="crm-empty-state">
        <div className="crm-empty-state-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3 className="crm-empty-state-title">No hay clientes aún</h3>
        <p className="crm-empty-state-text">Agrega tu primer cliente o espera a que lleguen leads desde tu sitio web</p>
      </div>
    </div>
  );
}
