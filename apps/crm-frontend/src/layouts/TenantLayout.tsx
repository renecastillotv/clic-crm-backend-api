/**
 * TenantLayout - Layout legado, redirige al nuevo CrmLayout
 * @deprecated Usar CrmLayout en su lugar
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface TenantLayoutProps {
  children: ReactNode;
}

export default function TenantLayout({ children }: TenantLayoutProps) {
  const { user } = useAuth();

  // Redirigir al nuevo CRM layout
  if (user?.tenants && user.tenants.length > 0) {
    return <Navigate to={`/crm/${user.tenants[0].slug}`} replace />;
  }

  return <Navigate to="/login" replace />;
}
