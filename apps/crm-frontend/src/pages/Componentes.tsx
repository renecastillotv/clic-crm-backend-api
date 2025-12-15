/**
 * Componentes.tsx - Componente legado, redirige al nuevo CrmWebComponentes
 * @deprecated Usar CrmWebComponentes en su lugar
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Componentes() {
  const { user } = useAuth();
  const firstTenant = user?.tenants?.[0];

  if (firstTenant) {
    return <Navigate to={`/crm/${firstTenant.slug}/web/componentes`} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
