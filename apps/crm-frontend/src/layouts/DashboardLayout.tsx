/**
 * DashboardLayout - Layout legado, redirige al dashboard apropiado
 * @deprecated Usar AdminLayout o CrmLayout en su lugar
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <Navigate to="/dashboard" replace />;
}

