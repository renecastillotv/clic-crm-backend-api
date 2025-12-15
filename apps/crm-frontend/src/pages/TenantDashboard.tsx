/**
 * TenantDashboard - Dashboard legado, redirige al nuevo CrmDashboard
 * @deprecated Usar CrmDashboard en su lugar
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function TenantDashboard() {
  const { user } = useAuth();

  if (user?.tenants && user.tenants.length > 0) {
    return <Navigate to={`/crm/${user.tenants[0].slug}`} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

