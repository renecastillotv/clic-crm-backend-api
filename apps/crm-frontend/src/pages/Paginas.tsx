/**
 * Paginas.tsx - Componente legado, redirige al nuevo CrmWebPaginas
 * @deprecated Usar CrmWebPaginas en su lugar
 */

import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Paginas() {
  const { user } = useAuth();
  const firstTenant = user?.tenants?.[0];

  if (firstTenant) {
    return <Navigate to={`/crm/${firstTenant.slug}/web/paginas`} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
