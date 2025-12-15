/**
 * PlatformDashboard - Dashboard legado, redirige al nuevo AdminDashboard
 * @deprecated Usar AdminDashboard en su lugar
 */

import { Navigate } from 'react-router-dom';

export default function PlatformDashboard() {
  return <Navigate to="/admin" replace />;
}

