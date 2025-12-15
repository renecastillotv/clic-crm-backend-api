/**
 * ConfigurarPagina.tsx - Componente legado, redirige al nuevo CrmWebPaginaEditar
 * @deprecated Usar CrmWebPaginaEditar en su lugar
 */

import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ConfigurarPagina() {
  const { paginaId } = useParams<{ paginaId: string }>();
  const { user } = useAuth();
  const firstTenant = user?.tenants?.[0];

  if (firstTenant && paginaId) {
    return <Navigate to={`/crm/${firstTenant.slug}/web/paginas/${paginaId}`} replace />;
  }

  if (firstTenant) {
    return <Navigate to={`/crm/${firstTenant.slug}/web/paginas`} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
