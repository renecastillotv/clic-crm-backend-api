/**
 * PlatformLayout - Layout legado, redirige al nuevo AdminLayout
 * @deprecated Usar AdminLayout en su lugar
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface PlatformLayoutProps {
  children: ReactNode;
}

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  return <Navigate to="/admin" replace />;
}

