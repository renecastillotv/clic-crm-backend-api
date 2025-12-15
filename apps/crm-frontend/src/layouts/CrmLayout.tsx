/**
 * CrmLayout - Layout moderno para el CRM de cada tenant
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Outlet, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext';

// ========== PAGE HEADER CONTEXT ==========
interface PageHeaderStat {
  label: string;
  value: string | number;
  icon?: ReactNode;
}

interface PageHeaderInfo {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  stats?: PageHeaderStat[];
  backButton?: {
    label: string;
    onClick: () => void;
  };
}

interface PageContextType {
  setPageHeader: (info: PageHeaderInfo | null) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export function usePageHeader() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageHeader must be used within CrmLayout');
  }
  return context;
}

// Iconos SVG minimalistas
const Icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  propiedades: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  pipeline: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
    </svg>
  ),
  propuestas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  clientes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  equipo: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  configuracion: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  paginas: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  secciones: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
  tema: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5"/>
      <circle cx="6.5" cy="12" r="2.5"/>
      <circle cx="13.5" cy="17.5" r="2.5"/>
      <line x1="15.5" y1="8" x2="19" y2="12"/>
      <line x1="8.5" y1="14" x2="15.5" y2="8"/>
      <line x1="6.5" y1="12" x2="13.5" y2="17.5"/>
    </svg>
  ),
  general: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14"/>
      <line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/>
      <line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/>
      <line x1="9" y1="8" x2="15" y2="8"/>
      <line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  ),
  chevronDown: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  external: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  admin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  metas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  actividades: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  finanzas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  ventas: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  ),
  facturas: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  finanzasConfig: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4"/>
    </svg>
  ),
  contenido: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  usuarios: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  roles: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  mensajeria: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  whatsapp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  instagram: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  ),
  facebook: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  ),
  email: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  chatVivo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="4"/>
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/>
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/>
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>
    </svg>
  ),
  clicConnect: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  catalogos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  oficinas: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
      <path d="M9 22v-4h6v4"/>
      <line x1="8" y1="6" x2="8" y2="6"/>
      <line x1="16" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="8" y2="10"/>
      <line x1="16" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="8" y2="14"/>
      <line x1="16" y1="14" x2="16" y2="14"/>
    </svg>
  ),
  equipos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  fuentes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
  fases: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  infoNegocio: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  sitioWeb: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  amenidades: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  extensiones: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
};

export default function CrmLayout() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { user, tenantActual, switchTenant, isPlatformAdmin, tieneAcceso } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [crmOpen, setCrmOpen] = useState(false);
  const [finanzasOpen, setFinanzasOpen] = useState(false);
  const [mensajeriaOpen, setMensajeriaOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [pageHeader, setPageHeader] = useState<PageHeaderInfo | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Sincronizar tenantActual con la URL cuando cambia el slug
  useEffect(() => {
    if (tenantSlug && user?.tenants) {
      const tenantFromUrl = user.tenants.find(t => t.slug === tenantSlug);
      if (tenantFromUrl && tenantActual?.slug !== tenantSlug) {
        switchTenant(tenantSlug);
      }
    }
  }, [tenantSlug, user?.tenants, tenantActual?.slug, switchTenant]);

  // Abrir automáticamente los submenús según la ruta
  useEffect(() => {
    const isConfigRoute = location.pathname.includes('/web/') || location.pathname.includes('/configuracion');
    const isCrmRoute = location.pathname.includes('/contactos') ||
                       location.pathname.includes('/pipeline') ||
                       location.pathname.includes('/propuestas') ||
                       location.pathname.includes('/actividades') ||
                       location.pathname.includes('/metas');
    const isFinanzasRoute = location.pathname.includes('/finanzas');
    const isMensajeriaRoute = location.pathname.includes('/mensajeria');
    if (isConfigRoute) {
      setConfigOpen(true);
    }
    if (isCrmRoute) {
      setCrmOpen(true);
    }
    if (isFinanzasRoute) {
      setFinanzasOpen(true);
    }
    if (isMensajeriaRoute) {
      setMensajeriaOpen(true);
    }
  }, [location.pathname]);

  // Limpiar pageHeader cuando cambia la ruta
  useEffect(() => {
    setPageHeader(null);
  }, [location.pathname]);

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setUserMenuOpen(false);
    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [userMenuOpen]);

  const basePath = `/crm/${tenantSlug}`;

  // Items del menú principal (sin submenú)
  const mainMenuItems = [
    { id: 'dashboard', path: '', label: 'Dashboard', icon: Icons.dashboard, end: true },
    { id: 'propiedades', path: 'propiedades', label: 'Propiedades', icon: Icons.propiedades },
    { id: 'contenido', path: 'contenido', label: 'Contenido', icon: Icons.contenido },
    { id: 'clic-connect', path: 'clic-connect', label: 'CLIC Connect', icon: Icons.clicConnect },
  ];

  // Sub-items de CRM
  const crmSubItems = [
    { id: 'contactos', path: 'contactos', label: 'Contactos', icon: Icons.clientes },
    { id: 'pipeline', path: 'pipeline', label: 'Pipeline', icon: Icons.pipeline },
    { id: 'propuestas', path: 'propuestas', label: 'Propuestas', icon: Icons.propuestas },
    { id: 'actividades', path: 'actividades', label: 'Seguimiento', icon: Icons.actividades },
    { id: 'metas', path: 'metas', label: 'Metas', icon: Icons.metas },
  ];

  // Sub-items de Finanzas
  const finanzasSubItems = [
    { id: 'finanzas-ventas', path: 'finanzas/ventas', label: 'Ventas', icon: Icons.ventas },
    { id: 'finanzas-facturas', path: 'finanzas/facturas', label: 'Mis Facturas', icon: Icons.facturas },
    { id: 'finanzas-config', path: 'finanzas/configuracion', label: 'Configuración', icon: Icons.finanzasConfig },
  ];

  // Sub-items de Mensajería
  const mensajeriaSubItems = [
    { id: 'mensajeria-whatsapp', path: 'mensajeria/whatsapp', label: 'WhatsApp', icon: Icons.whatsapp },
    { id: 'mensajeria-instagram', path: 'mensajeria/instagram', label: 'Instagram', icon: Icons.instagram },
    { id: 'mensajeria-facebook', path: 'mensajeria/facebook', label: 'Facebook', icon: Icons.facebook },
    { id: 'mensajeria-correo', path: 'mensajeria/correo', label: 'Correo', icon: Icons.email },
    { id: 'mensajeria-chat', path: 'mensajeria/chat-vivo', label: 'Chat Vivo', icon: Icons.chatVivo },
    { id: 'mensajeria-config', path: 'mensajeria/configuracion', label: 'Configuración', icon: Icons.configuracion },
  ];

  // Sub-items de configuración
  const configSubItems = [
    { id: 'web-paginas', path: 'web/paginas', label: 'Páginas Web', icon: Icons.paginas },
    { id: 'web-secciones', path: 'web/secciones', label: 'Secciones Globales', icon: Icons.secciones },
    { id: 'web-tema', path: 'web/tema', label: 'Tema', icon: Icons.tema },
    { id: 'usuarios', path: 'usuarios', label: 'Usuarios', icon: Icons.usuarios },
    { id: 'roles', path: 'roles', label: 'Roles', icon: Icons.roles },
    { id: 'catalogos', path: 'catalogos', label: 'Catálogos', icon: Icons.catalogos },
    { id: 'oficinas', path: 'oficinas', label: 'Oficinas', icon: Icons.oficinas },
    { id: 'equipos', path: 'equipos', label: 'Equipos', icon: Icons.equipos },
    { id: 'info-negocio', path: 'info-negocio', label: 'Info Negocio', icon: Icons.infoNegocio },
    { id: 'configuracion', path: 'configuracion', label: 'General', icon: Icons.general },
  ];

  // Filtrar items según permisos
  const visibleMainItems = mainMenuItems.filter(
    (item) => item.id === 'dashboard' || tieneAcceso(item.id)
  );

  const visibleCrmItems = crmSubItems.filter(
    (item) => tieneAcceso(item.id)
  );

  const visibleConfigItems = configSubItems.filter(
    (item) => tieneAcceso(item.id) || item.id === 'configuracion'
  );

  const visibleFinanzasItems = finanzasSubItems.filter(
    (item) => tieneAcceso(item.id) || tieneAcceso('finanzas')
  );

  const visibleMensajeriaItems = mensajeriaSubItems.filter(
    (item) => tieneAcceso(item.id) || tieneAcceso('mensajeria')
  );

  const isCrmActive = location.pathname.includes('/contactos') ||
                      location.pathname.includes('/pipeline') ||
                      location.pathname.includes('/propuestas') ||
                      location.pathname.includes('/actividades') ||
                      location.pathname.includes('/metas');

  const isFinanzasActive = location.pathname.includes('/finanzas');

  const isMensajeriaActive = location.pathname.includes('/mensajeria');

  const isConfigActive = location.pathname.includes('/web/') ||
                         location.pathname.includes('/usuarios') ||
                         location.pathname.includes('/roles') ||
                         location.pathname.includes('/catalogos') ||
                         location.pathname.includes('/oficinas') ||
                         location.pathname.includes('/equipos') ||
                         location.pathname.includes('/info-negocio') ||
                         location.pathname.endsWith('/configuracion');

  return (
    <PageContext.Provider value={{ setPageHeader }}>
      <div className="crm-layout">
        {/* Sidebar */}
        <aside className="crm-sidebar">
          {/* Logo/Tenant */}
          <div className="sidebar-brand">
            <div className="brand-logo">
              {(tenantActual?.nombre || tenantSlug || 'T').charAt(0).toUpperCase()}
            </div>
            <div className="brand-info">
              <span className="brand-name">{tenantActual?.nombre || tenantSlug}</span>
              <span className="brand-type">CRM Inmobiliario</span>
            </div>
          </div>

          {/* Navegación Principal */}
          <nav className="sidebar-nav">
            <div className="nav-section">
              <span className="nav-section-title">Principal</span>
              {visibleMainItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={`${basePath}/${item.path}`}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}

              {/* CRM con submenú */}
              <button
                className={`nav-item nav-expandable ${isCrmActive ? 'active' : ''}`}
                onClick={() => setCrmOpen(!crmOpen)}
              >
                <span className="nav-icon">{Icons.pipeline}</span>
                <span className="nav-label">CRM</span>
                <span className={`nav-chevron ${crmOpen ? 'open' : ''}`}>
                  {Icons.chevronDown}
                </span>
              </button>

              <div className={`nav-submenu ${crmOpen ? 'open' : ''}`}>
                {visibleCrmItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`${basePath}/${item.path}`}
                    className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>

              {/* Finanzas con submenú */}
              <button
                className={`nav-item nav-expandable ${isFinanzasActive ? 'active' : ''}`}
                onClick={() => setFinanzasOpen(!finanzasOpen)}
              >
                <span className="nav-icon">{Icons.finanzas}</span>
                <span className="nav-label">Finanzas</span>
                <span className={`nav-chevron ${finanzasOpen ? 'open' : ''}`}>
                  {Icons.chevronDown}
                </span>
              </button>

              <div className={`nav-submenu ${finanzasOpen ? 'open' : ''}`}>
                {visibleFinanzasItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`${basePath}/${item.path}`}
                    className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>

              {/* Mensajería con submenú */}
              <button
                className={`nav-item nav-expandable ${isMensajeriaActive ? 'active' : ''}`}
                onClick={() => setMensajeriaOpen(!mensajeriaOpen)}
              >
                <span className="nav-icon">{Icons.mensajeria}</span>
                <span className="nav-label">Mensajería</span>
                <span className={`nav-chevron ${mensajeriaOpen ? 'open' : ''}`}>
                  {Icons.chevronDown}
                </span>
              </button>

              <div className={`nav-submenu ${mensajeriaOpen ? 'open' : ''}`}>
                {visibleMensajeriaItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`${basePath}/${item.path}`}
                    className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Configuración con submenú */}
            <div className="nav-section">
              <span className="nav-section-title">Ajustes</span>
              <button
                className={`nav-item nav-expandable ${isConfigActive ? 'active' : ''}`}
                onClick={() => setConfigOpen(!configOpen)}
              >
                <span className="nav-icon">{Icons.configuracion}</span>
                <span className="nav-label">Configuración</span>
                <span className={`nav-chevron ${configOpen ? 'open' : ''}`}>
                  {Icons.chevronDown}
                </span>
              </button>

              <div className={`nav-submenu ${configOpen ? 'open' : ''}`}>
                {visibleConfigItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`${basePath}/${item.path}`}
                    className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>

          {/* Footer del Sidebar */}
          <div className="sidebar-footer">
            {/* Switch a Admin */}
            {isPlatformAdmin && (
              <button className="admin-btn" onClick={() => navigate('/admin')}>
                {Icons.admin}
                <span>Panel Admin</span>
              </button>
            )}

            {/* Selector de Tenants */}
            {user?.tenants && user.tenants.length > 1 && (
              <div className="tenant-selector">
                <select
                  value={tenantSlug}
                  onChange={(e) => navigate(`/crm/${e.target.value}`)}
                >
                  {user.tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.slug}>
                      {tenant.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="crm-main">
          {/* Header */}
          <header className="crm-header">
            <div className="header-left">
              {pageHeader?.backButton && (
                <button className="header-back-btn" onClick={pageHeader.backButton.onClick}>
                  {Icons.back}
                  <span>{pageHeader.backButton.label}</span>
                </button>
              )}
              {pageHeader && pageHeader.title && (
                <div className="header-title-section">
                  <h1 className="header-title">{pageHeader.title}</h1>
                  {pageHeader.subtitle && (
                    <span className="header-subtitle">{pageHeader.subtitle}</span>
                  )}
                </div>
              )}
            </div>
            {/* Stats en el centro del header */}
            {pageHeader?.stats && pageHeader.stats.length > 0 && (
              <div className="header-stats">
                {pageHeader.stats.map((stat, index) => (
                  <div key={index} className="header-stat-item">
                    {stat.icon && <span className="header-stat-icon">{stat.icon}</span>}
                    <span className="header-stat-label">{stat.label}</span>
                    <span className="header-stat-value">{stat.value}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="header-right">
              {/* Acciones de la página */}
              {pageHeader?.actions && (
                <div className="header-actions">
                  {pageHeader.actions}
                </div>
              )}

              {/* User Menu con dropdown */}
              <div className="user-menu-wrapper">
                <button
                  className="user-menu-trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen(!userMenuOpen);
                  }}
                >
                  <span className="user-name">{user?.nombre || user?.email?.split('@')[0]}</span>
                  <UserButton afterSignOutUrl="/login" />
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`http://localhost:4321/tenant/${tenantSlug}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dropdown-item"
                    >
                      {Icons.external}
                      <span>Ver sitio web</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="crm-content">
            <Outlet />
          </main>
        </div>

        <style>{`
          /* ========== VARIABLES ========== */
          .crm-layout {
            --sidebar-width: 260px;
            --header-height: 64px;
            --primary: #2563eb;
            --primary-light: #3b82f6;
            --primary-bg: #eff6ff;
            --bg-main: #f8fafc;
            --bg-sidebar: #ffffff;
            --bg-card: #ffffff;
            --text-primary: #0f172a;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --border: #e2e8f0;
            --border-light: #f1f5f9;
            --success: #22c55e;
            --warning: #f59e0b;
            --error: #ef4444;
            --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
            --shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --radius: 8px;
            --radius-lg: 12px;
          }

          /* ========== LAYOUT BASE ========== */
          .crm-layout {
            display: flex;
            min-height: 100vh;
            background: var(--bg-main);
            color: var(--text-primary);
          }

          /* ========== SIDEBAR ========== */
          .crm-sidebar {
            width: var(--sidebar-width);
            background: var(--bg-sidebar);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 100;
          }

          /* Brand */
          .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 20px;
            border-bottom: 1px solid var(--border);
          }

          .brand-logo {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 1.125rem;
          }

          .brand-info {
            display: flex;
            flex-direction: column;
          }

          .brand-name {
            font-weight: 600;
            font-size: 0.95rem;
            color: var(--text-primary);
          }

          .brand-type {
            font-size: 0.75rem;
            color: var(--text-muted);
          }

          /* Navigation */
          .sidebar-nav {
            flex: 1;
            padding: 16px 12px;
            overflow-y: auto;
          }

          .nav-section {
            margin-bottom: 24px;
          }

          .nav-section-title {
            display: block;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            padding: 0 12px;
            margin-bottom: 8px;
          }

          .nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            color: var(--text-secondary);
            text-decoration: none;
            border-radius: var(--radius);
            margin-bottom: 2px;
            transition: all 0.15s ease;
            font-size: 0.9rem;
            font-weight: 500;
            border: none;
            background: none;
            width: 100%;
            cursor: pointer;
            text-align: left;
          }

          .nav-item:hover {
            background: var(--border-light);
            color: var(--text-primary);
          }

          .nav-item.active {
            background: var(--primary-bg);
            color: var(--primary);
          }

          .nav-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .nav-label {
            flex: 1;
          }

          .nav-expandable {
            justify-content: flex-start;
          }

          .nav-chevron {
            margin-left: auto;
            transition: transform 0.2s ease;
            display: flex;
            align-items: center;
          }

          .nav-chevron.open {
            transform: rotate(180deg);
          }

          /* Submenu */
          .nav-submenu {
            margin-left: 12px;
            padding-left: 12px;
            border-left: 2px solid var(--border);
            overflow: hidden;
            max-height: 0;
            opacity: 0;
            transition: max-height 0.25s ease-out, opacity 0.2s ease-out, margin-top 0.25s ease-out;
            margin-top: 0;
          }

          .nav-submenu.open {
            max-height: 300px;
            opacity: 1;
            margin-top: 4px;
          }

          .nav-subitem {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            color: var(--text-secondary);
            text-decoration: none;
            border-radius: var(--radius);
            margin-bottom: 2px;
            transition: all 0.15s ease;
            font-size: 0.85rem;
            font-weight: 500;
          }

          .nav-subitem:hover {
            background: var(--border-light);
            color: var(--text-primary);
          }

          .nav-subitem.active {
            background: var(--primary-bg);
            color: var(--primary);
          }

          .nav-subitem .nav-icon {
            opacity: 0.7;
          }

          .nav-subitem.active .nav-icon {
            opacity: 1;
          }

          /* Sidebar Footer */
          .sidebar-footer {
            padding: 16px;
            border-top: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .admin-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
            border-radius: var(--radius);
            cursor: pointer;
            font-weight: 500;
            font-size: 0.85rem;
            transition: all 0.15s ease;
          }

          .admin-btn:hover {
            background: #fee2e2;
          }

          .tenant-selector select {
            width: 100%;
            padding: 10px 12px;
            background: var(--bg-main);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            color: var(--text-primary);
            font-size: 0.85rem;
            cursor: pointer;
          }

          .tenant-selector select:focus {
            outline: none;
            border-color: var(--primary);
          }

          /* ========== MAIN AREA ========== */
          .crm-main {
            flex: 1;
            margin-left: var(--sidebar-width);
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }

          /* Header */
          .crm-header {
            height: var(--header-height);
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 32px;
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            position: sticky;
            top: 0;
            z-index: 50;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
            flex: 1;
          }

          .header-back-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: none;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            color: var(--text-secondary);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .header-back-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
            border-color: var(--border-strong);
          }

          .header-back-btn svg {
            flex-shrink: 0;
          }

          .header-title-section {
            display: flex;
            align-items: baseline;
            gap: 12px;
          }

          .header-title {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
          }

          .header-subtitle {
            font-size: 0.875rem;
            color: var(--text-muted);
          }

          /* Header Stats */
          .header-stats {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-left: 32px;
            margin-right: 48px;
          }

          .header-stat-item {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .header-stat-icon {
            display: flex;
            align-items: center;
            color: var(--text-muted);
          }

          .header-stat-icon svg {
            width: 16px;
            height: 16px;
          }

          .header-stat-label {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }

          .header-stat-value {
            font-size: 1.125rem;
            font-weight: 700;
            color: var(--primary);
          }

          .header-right {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          /* User Menu */
          .user-menu-wrapper {
            position: relative;
          }

          .user-menu-trigger {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 6px 12px;
            background: none;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .user-menu-trigger:hover {
            background: var(--border-light);
          }

          .user-name {
            font-size: 0.9rem;
            color: var(--text-secondary);
            font-weight: 500;
          }

          .user-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            min-width: 180px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: var(--shadow-md);
            overflow: hidden;
            z-index: 100;
          }

          .dropdown-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            transition: all 0.15s ease;
          }

          .dropdown-item:hover {
            background: var(--border-light);
            color: var(--text-primary);
          }

          /* Content */
          .crm-content {
            flex: 1;
            padding: 24px 32px;
            overflow-y: auto;
          }

          /* ========== RESPONSIVE ========== */
          @media (max-width: 1024px) {
            .crm-sidebar {
              transform: translateX(-100%);
              transition: transform 0.3s ease;
            }

            .crm-main {
              margin-left: 0;
            }
          }
        `}</style>
      </div>
    </PageContext.Provider>
  );
}
