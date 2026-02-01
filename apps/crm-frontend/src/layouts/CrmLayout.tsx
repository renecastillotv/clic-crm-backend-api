/**
 * CrmLayout - Layout moderno para el CRM de cada tenant
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Outlet, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext';
import { CatalogosProvider } from '../contexts/CatalogosContext';
import MiPerfil from '../components/MiPerfil';
import { getInfoNegocio, apiFetch } from '../services/api';

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
  planesPago: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="12" y2="14"/>
      <line x1="8" y1="18" x2="10" y2="18"/>
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  documentos: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  plantillas: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
  generar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18"/>
      <path d="M5 10l7-7 7 7"/>
      <path d="M20 21H4"/>
    </svg>
  ),
  misDocumentos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="M9 15l2 2 4-4"/>
    </svg>
  ),
  university: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  miEntrenamiento: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
      <circle cx="12" cy="10" r="3"/>
      <path d="m15.5 12.5-1 1"/>
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
  productividad: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  userProfile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  marketing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
      <polyline points="7.5 19.79 7.5 14.6 3 12"/>
      <polyline points="21 12 16.5 14.6 16.5 19.79"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  // Marketing sub-items icons
  branding: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5"/>
      <circle cx="6.5" cy="12" r="2.5"/>
      <circle cx="13.5" cy="17.5" r="2.5"/>
      <path d="M15.5 9c1.5 1 2.5 2.5 2.5 4.5 0 2-1 3.5-2.5 4.5"/>
    </svg>
  ),
  campanas: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 14v-3z"/>
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
    </svg>
  ),
  redesSociales: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/>
      <circle cx="6" cy="12" r="3"/>
      <circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  emailMarketing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  centro: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  leads: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  ),
  configuracionMkt: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  // Mobile menu icons
  menu: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  close: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

export default function CrmLayout() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { user, tenantActual, switchTenant, isPlatformAdmin, tieneAcceso, loadingModulos } = useAuth();
  const { signOut } = useClerk();
  const { getToken } = useClerkAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [crmOpen, setCrmOpen] = useState(false);
  const [finanzasOpen, setFinanzasOpen] = useState(false);
  const [mensajeriaOpen, setMensajeriaOpen] = useState(false);
  const [documentosOpen, setDocumentosOpen] = useState(false);
  const [sistemaFasesOpen, setSistemaFasesOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [pageHeader, setPageHeader] = useState<PageHeaderInfo | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [perfilModalOpen, setPerfilModalOpen] = useState(false);
  const [isotipoUrl, setIsotipoUrl] = useState<string | null>(null);
  const [unreadCorreo, setUnreadCorreo] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  // Estado para sidebar responsive
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Cerrar sidebar mobile al cambiar de ruta
  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [location.pathname]);

  // Sincronizar tenantActual con la URL cuando cambia el slug
  useEffect(() => {
    if (tenantSlug && user?.tenants) {
      const tenantFromUrl = user.tenants.find(t => t.slug === tenantSlug);
      if (tenantFromUrl && tenantActual?.slug !== tenantSlug) {
        switchTenant(tenantSlug);
      }
    }
  }, [tenantSlug, user?.tenants, tenantActual?.slug, switchTenant]);

  // Cargar isotipo del tenant
  useEffect(() => {
    const cargarIsotipo = async () => {
      if (!tenantActual?.id) return;
      try {
        const token = await getToken();
        const info = await getInfoNegocio(tenantActual.id, token);
        // El API puede devolver isotipo o isotipo_url dependiendo de cómo se guardó
        setIsotipoUrl((info as any).isotipo || info.isotipo_url || null);
      } catch (err) {
        console.error('Error cargando isotipo:', err);
      }
    };
    cargarIsotipo();
  }, [tenantActual?.id, getToken]);

  // Polling de unread counts para sidebar badges
  useEffect(() => {
    if (!tenantActual?.id || !user?.id) return;
    let cancelled = false;

    const fetchUnreadCounts = async () => {
      try {
        const token = await getToken();
        // Fetch email unread count
        const emailRes = await apiFetch(
          `/tenants/${tenantActual.id}/mensajeria-email/unread-count?usuario_id=${user.id}`,
          {},
          token
        );
        const emailData = await emailRes.json();
        if (!cancelled) setUnreadCorreo(emailData.unread || 0);
      } catch {
        // Silently fail - sidebar badges are non-critical
      }
      try {
        const token = await getToken();
        // Fetch chats unread count (conversations with canal != 'email')
        const chatsRes = await apiFetch(
          `/tenants/${tenantActual.id}/mensajeria/conversaciones?usuario_id=${user.id}&canal=whatsapp&estado=abierta&limit=1`,
          {},
          token
        );
        const chatsData = await chatsRes.json();
        // For now, use total from the paginated response as a proxy
        if (!cancelled) setUnreadChats(chatsData.total || 0);
      } catch {
        // Silently fail
      }
    };

    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 60000); // Poll every 60s
    return () => { cancelled = true; clearInterval(interval); };
  }, [tenantActual?.id, user?.id, getToken]);

  // Mapeo de rutas a módulo requerido para acceso
  const routeModuleMap: Record<string, string> = {
    'contactos': 'contactos',
    'pipeline': 'pipeline',
    'propuestas': 'propuestas',
    'actividades': 'actividades',
    'metas': 'metas',
    'propiedades': 'propiedades',
    'finanzas/ventas': 'finanzas-ventas',
    'finanzas/comisiones': 'finanzas-comisiones',
    'finanzas/facturas': 'finanzas-facturas',
    'finanzas/configuracion': 'finanzas-config',
    'sistema-fases/configuracion': 'sistema-fases-config',
    'sistema-fases': 'sistema-fases-dashboard',
    'productividad/configuracion': 'productividad-config',
    'productividad': 'productividad',
    'contenido': 'contenido',
    'mensajeria': 'mensajeria',
    'mensajeria/chats': 'mensajeria',
    'mensajeria/correo': 'mensajeria',
    'mensajeria/configuracion': 'mensajeria',
    'marketing': 'marketing',
    'marketing/creativos': 'marketing-branding',
    'marketing/creativos/artes': 'marketing-branding',
    'marketing/creativos/flyers': 'marketing-branding',
    'marketing/creativos/stories': 'marketing-branding',
    'marketing/creativos/plantillas': 'marketing-branding',
    'marketing/campanas': 'marketing-campanas',
    'marketing/redes-sociales': 'marketing-redes-sociales',
    'marketing/leads': 'marketing-leads',
    'marketing/analytics': 'marketing-analytics',
    'marketing/configuracion': 'marketing-config',
    // Backward compatibility
    'marketing/branding': 'marketing-branding',
    'marketing/email': 'marketing-campanas',
    'marketing/convertir-imagenes': 'marketing-branding',
    'marketing/flyers': 'marketing-branding',
    'marketing/stories': 'marketing-branding',
    'marketing/plantillas': 'marketing-branding',
    'marketing/configuracion-apis': 'marketing-config',
    'clic-connect': 'clic-connect',
    'university': 'university',
    'mi-entrenamiento': 'mi-entrenamiento',
    'usuarios': 'usuarios',
    'roles': 'usuarios',
    'configuracion': 'configuracion',
    'web/paginas': 'web-paginas',
    'web/secciones': 'web-paginas',
    'web/tema': 'web-tema',
  };

  // Determinar si el usuario tiene acceso a la ruta actual
  const getRequiredModule = (): string | null => {
    if (!tenantSlug) return null;
    const basePrefixLen = `/crm/${tenantSlug}/`.length;
    const relativePath = location.pathname.slice(basePrefixLen);
    if (!relativePath) return null;

    // Check from most specific to least specific
    const sortedRoutes = Object.keys(routeModuleMap).sort((a, b) => b.length - a.length);
    for (const route of sortedRoutes) {
      if (relativePath === route || relativePath.startsWith(route + '/')) {
        return routeModuleMap[route];
      }
    }
    return null;
  };

  const requiredModule = getRequiredModule();
  const routeAccessDenied = requiredModule ? !tieneAcceso(requiredModule) : false;

  // Abrir automáticamente los submenús según la ruta (y cerrar los demás)
  useEffect(() => {
    const isConfigRoute = location.pathname.includes('/web/') || location.pathname.includes('/configuracion');
    const isCrmRoute = location.pathname.includes('/contactos') ||
                       location.pathname.includes('/pipeline') ||
                       location.pathname.includes('/propuestas') ||
                       location.pathname.includes('/planes-pago') ||
                       location.pathname.includes('/actividades') ||
                       location.pathname.includes('/metas');
    const isFinanzasRoute = location.pathname.includes('/finanzas');
    const isMensajeriaRoute = location.pathname.includes('/mensajeria');
    const isSistemaFasesRoute = location.pathname.includes('/sistema-fases') || location.pathname.includes('/productividad');
    const isMarketingRoute = location.pathname.includes('/marketing');

    // Abrir solo el menú correspondiente a la ruta actual, cerrar los demás
    setCrmOpen(isCrmRoute);
    setFinanzasOpen(isFinanzasRoute);
    setMensajeriaOpen(isMensajeriaRoute);
    setSistemaFasesOpen(isSistemaFasesRoute);
    setMarketingOpen(isMarketingRoute);
    setConfigOpen(isConfigRoute);
  }, [location.pathname]);

  // Función para manejar el toggle de submenús (cierra los demás al abrir uno)
  const toggleSubmenu = (menu: 'crm' | 'finanzas' | 'mensajeria' | 'documentos' | 'sistemaFases' | 'marketing' | 'config') => {
    setCrmOpen(menu === 'crm' ? !crmOpen : false);
    setFinanzasOpen(menu === 'finanzas' ? !finanzasOpen : false);
    setMensajeriaOpen(menu === 'mensajeria' ? !mensajeriaOpen : false);
    setDocumentosOpen(menu === 'documentos' ? !documentosOpen : false);
    setSistemaFasesOpen(menu === 'sistemaFases' ? !sistemaFasesOpen : false);
    setMarketingOpen(menu === 'marketing' ? !marketingOpen : false);
    setConfigOpen(menu === 'config' ? !configOpen : false);
  };

  // Nota: NO limpiar pageHeader automáticamente aquí.
  // Cada página es responsable de configurar su propio header mediante setPageHeader().
  // Limpiar automáticamente causa race conditions donde el header se limpia DESPUÉS
  // de que la nueva página ya lo configuró.

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setUserMenuOpen(false);
    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [userMenuOpen]);

  const basePath = `/crm/${tenantSlug}`;

  // Sub-items de CRM
  const crmSubItems = [
    { id: 'contactos', path: 'contactos', label: 'Contactos', icon: Icons.clientes },
    { id: 'pipeline', path: 'pipeline', label: 'Pipeline', icon: Icons.pipeline },
    { id: 'propuestas', path: 'propuestas', label: 'Propuestas', icon: Icons.propuestas },
    { id: 'planes-pago', path: 'planes-pago', label: 'Planes de Pago', icon: Icons.planesPago },
    { id: 'actividades', path: 'actividades', label: 'Seguimiento', icon: Icons.actividades },
    { id: 'metas', path: 'metas', label: 'Metas', icon: Icons.metas },
  ];

  // Sub-items de Finanzas
  const finanzasSubItems = [
    { id: 'finanzas-ventas', path: 'finanzas/ventas', label: 'Ventas', icon: Icons.ventas },
    { id: 'finanzas-comisiones', path: 'finanzas/comisiones', label: 'Comisiones', icon: Icons.finanzas },
    { id: 'finanzas-facturas', path: 'finanzas/facturas', label: 'Mis Facturas', icon: Icons.facturas },
    { id: 'finanzas-config', path: 'finanzas/configuracion', label: 'Configuración', icon: Icons.finanzasConfig },
  ];

  // Sub-items de Sistema de Fases y Productividad
  const sistemaFasesSubItems = [
    { id: 'sistema-fases-dashboard', path: 'sistema-fases', label: 'Fases', icon: Icons.dashboard },
    { id: 'productividad', path: 'productividad', label: 'Productividad', icon: Icons.productividad },
    { id: 'sistema-fases-config', path: 'sistema-fases/configuracion', label: 'Config. Fases', icon: Icons.configuracion },
    { id: 'productividad-config', path: 'productividad/configuracion', label: 'Config. Productividad', icon: Icons.configuracion },
  ];

  // Sub-items de configuración (Páginas Web, Tema, General)
  const configSubItems = [
    { id: 'web-paginas', path: 'web/paginas', label: 'Páginas Web', icon: Icons.paginas },
    { id: 'web-tema', path: 'web/tema', label: 'Tema', icon: Icons.tema },
    { id: 'configuracion', path: 'configuracion', label: 'General', icon: Icons.general },
  ];

  // Sub-items de Mensajería
  const mensajeriaSubItems = [
    { id: 'mensajeria-chats', path: 'mensajeria/chats', label: 'Chats', icon: Icons.mensajeria },
    { id: 'mensajeria-correo', path: 'mensajeria/correo', label: 'Correo', icon: Icons.email },
    { id: 'mensajeria-config', path: 'mensajeria/configuracion', label: 'Configuración', icon: Icons.configuracion },
  ];

  // Sub-items de Documentos (simplificado a 2 secciones)
  const documentosSubItems = [
    { id: 'mis-documentos', path: 'documentos', label: 'Mis Documentos', icon: Icons.misDocumentos },
    { id: 'documentos-config', path: 'documentos/configuracion', label: 'Configuracion', icon: Icons.configuracion },
  ];

  // Sub-items de Marketing
  const marketingSubItems = [
    { id: 'marketing', path: 'marketing', label: 'Centro', icon: Icons.centro },
    { id: 'marketing-branding', path: 'marketing/creativos', label: 'Creativos', icon: Icons.branding },
    { id: 'marketing-campanas', path: 'marketing/campanas', label: 'Campanas', icon: Icons.campanas },
    { id: 'marketing-redes-sociales', path: 'marketing/redes-sociales', label: 'Redes Sociales', icon: Icons.redesSociales },
    { id: 'marketing-leads', path: 'marketing/leads', label: 'Leads', icon: Icons.leads },
    { id: 'marketing-analytics', path: 'marketing/analytics', label: 'Analytics', icon: Icons.analytics },
    { id: 'marketing-config', path: 'marketing/configuracion', label: 'Config', icon: Icons.configuracionMkt },
  ];

  // Filtrar items según permisos
  const visibleCrmItems = crmSubItems.filter(
    (item) => tieneAcceso(item.id)
  );

  const visibleFinanzasItems = finanzasSubItems.filter(
    (item) => tieneAcceso(item.id)
  );

  // DEBUG: Ver qué items de finanzas pasan el filtro
  console.log(`💰 [CrmLayout] visibleFinanzasItems: ${visibleFinanzasItems.map(i => i.id).join(', ')}`);

  const visibleSistemaFasesItems = sistemaFasesSubItems.filter(
    (item) => tieneAcceso(item.id)
  );

  const visibleConfigItems = configSubItems.filter(
    (item) => tieneAcceso(item.id)
  );

  const visibleMarketingItems = marketingSubItems.filter(
    (item) => tieneAcceso(item.id) || tieneAcceso('marketing')
  );

  const visibleDocumentosItems = documentosSubItems.filter(
    (item) => tieneAcceso(item.id) || tieneAcceso('documentos')
  );

  const hasVisibleFeatures = tieneAcceso('contenido') || tieneAcceso('clic-connect') ||
    tieneAcceso('university') || tieneAcceso('mi-entrenamiento') ||
    visibleSistemaFasesItems.length > 0;

  const isCrmActive = location.pathname.includes('/contactos') ||
                      location.pathname.includes('/pipeline') ||
                      location.pathname.includes('/propuestas') ||
                      location.pathname.includes('/planes-pago') ||
                      location.pathname.includes('/actividades') ||
                      location.pathname.includes('/metas');

  const isFinanzasActive = location.pathname.includes('/finanzas');

  const isMensajeriaActive = location.pathname.includes('/mensajeria');

  const isDocumentosActive = location.pathname.includes('/documentos');

  const isSistemaFasesActive = location.pathname.includes('/sistema-fases') || location.pathname.includes('/productividad');

  const isConfigActive = location.pathname.includes('/web/') ||
                         location.pathname.endsWith('/configuracion');

  const isMarketingActive = location.pathname.includes('/marketing');

  return (
    <CatalogosProvider>
    <PageContext.Provider value={{ setPageHeader }}>
      <div className="crm-layout">
        {/* Mobile Overlay */}
        {sidebarMobileOpen && (
          <div
            className="mobile-overlay"
            onClick={() => setSidebarMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`crm-sidebar ${sidebarMobileOpen ? 'mobile-open' : ''}`}>
          {/* Logo/Tenant */}
          <div className="sidebar-brand">
            <div className={`brand-logo ${isotipoUrl ? 'has-image' : ''}`}>
              {isotipoUrl ? (
                <img src={isotipoUrl} alt={tenantActual?.nombre || 'Logo'} />
              ) : (
                (tenantActual?.nombre || tenantSlug || 'T').charAt(0).toUpperCase()
              )}
            </div>
            <div className="brand-info">
              <span className="brand-name">{tenantActual?.nombre || tenantSlug}</span>
              <span className="brand-type">CRM Inmobiliario</span>
            </div>
            {/* Close button for mobile */}
            <button
              className="sidebar-close-btn"
              onClick={() => setSidebarMobileOpen(false)}
            >
              {Icons.close}
            </button>
          </div>

          {/* Navegación Principal */}
          <nav className="sidebar-nav">
            {/* ==================== PRINCIPAL ==================== */}
            <div className="nav-section">
              <span className="nav-section-title">Principal</span>

              {/* Dashboard */}
              <NavLink
                to={`${basePath}/`}
                end
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{Icons.dashboard}</span>
                <span className="nav-label">Dashboard</span>
              </NavLink>

              {/* CRM con submenú */}
              {visibleCrmItems.length === 1 ? (
                <NavLink
                  to={`${basePath}/${visibleCrmItems[0].path}`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.pipeline}</span>
                  <span className="nav-label">{visibleCrmItems[0].label}</span>
                </NavLink>
              ) : visibleCrmItems.length > 1 && (
              <>
              <button
                className={`nav-item nav-expandable ${isCrmActive ? 'active' : ''}`}
                onClick={() => toggleSubmenu('crm')}
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
              </>
              )}

              {/* Propiedades */}
              {tieneAcceso('propiedades') && (
                <NavLink
                  to={`${basePath}/propiedades`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.propiedades}</span>
                  <span className="nav-label">Propiedades</span>
                </NavLink>
              )}

              {/* Finanzas con submenú */}
              {visibleFinanzasItems.length === 1 ? (
                <NavLink
                  to={`${basePath}/${visibleFinanzasItems[0].path}`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.finanzas}</span>
                  <span className="nav-label">{visibleFinanzasItems[0].label}</span>
                </NavLink>
              ) : visibleFinanzasItems.length > 1 && (
              <>
              <button
                className={`nav-item nav-expandable ${isFinanzasActive ? 'active' : ''}`}
                onClick={() => toggleSubmenu('finanzas')}
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
              </>
              )}

              {/* Mensajería con submenú */}
              {tieneAcceso('mensajeria') && (
              <>
              <button
                className={`nav-item nav-expandable ${isMensajeriaActive ? 'active' : ''}`}
                onClick={() => toggleSubmenu('mensajeria')}
              >
                <span className="nav-icon">{Icons.mensajeria}</span>
                <span className="nav-label">Mensajería</span>
                {(unreadCorreo + unreadChats) > 0 && !mensajeriaOpen && (
                  <span className="nav-badge">{unreadCorreo + unreadChats}</span>
                )}
                <span className={`nav-chevron ${mensajeriaOpen ? 'open' : ''}`}>
                  {Icons.chevronDown}
                </span>
              </button>

              <div className={`nav-submenu ${mensajeriaOpen ? 'open' : ''}`}>
                {mensajeriaSubItems.map((item) => {
                  const badge = item.id === 'mensajeria-correo' ? unreadCorreo
                    : item.id === 'mensajeria-chats' ? unreadChats
                    : 0;
                  return (
                    <NavLink
                      key={item.id}
                      to={`${basePath}/${item.path}`}
                      className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                      {badge > 0 && <span className="nav-badge">{badge}</span>}
                    </NavLink>
                  );
                })}
              </div>
              </>
              )}

              {/* Marketing con submenú */}
              {visibleMarketingItems.length === 1 ? (
                <NavLink
                  to={`${basePath}/${visibleMarketingItems[0].path}`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.marketing}</span>
                  <span className="nav-label">{visibleMarketingItems[0].label}</span>
                </NavLink>
              ) : visibleMarketingItems.length > 1 && (
              <>
              <button
                className={`nav-item nav-expandable ${isMarketingActive ? 'active' : ''}`}
                onClick={() => toggleSubmenu('marketing')}
              >
                <span className="nav-icon">{Icons.marketing}</span>
                <span className="nav-label">Marketing</span>
                <span className={`nav-chevron ${marketingOpen ? 'open' : ''}`}>
                  {Icons.chevronDown}
                </span>
              </button>

              <div className={`nav-submenu ${marketingOpen ? 'open' : ''}`}>
                {visibleMarketingItems.map((item) => (
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
              </>
              )}
            </div>

            {/* ==================== FEATURES ==================== */}
            {hasVisibleFeatures && (
            <div className="nav-section">
              <span className="nav-section-title">Features</span>

              {/* Contenido */}
              {tieneAcceso('contenido') && (
                <NavLink
                  to={`${basePath}/contenido`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.contenido}</span>
                  <span className="nav-label">Contenido</span>
                </NavLink>
              )}

              {/* CLIC Connect */}
              {tieneAcceso('clic-connect') && (
                <NavLink
                  to={`${basePath}/clic-connect`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.clicConnect}</span>
                  <span className="nav-label">CLIC Connect</span>
                </NavLink>
              )}

              {/* University */}
              {tieneAcceso('university') && (
                <NavLink
                  to={`${basePath}/university`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.university}</span>
                  <span className="nav-label">University</span>
                </NavLink>
              )}

              {/* Mi Entrenamiento */}
              {tieneAcceso('mi-entrenamiento') && (
                <NavLink
                  to={`${basePath}/mi-entrenamiento`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.miEntrenamiento}</span>
                  <span className="nav-label">Mi Entrenamiento</span>
                </NavLink>
              )}

              {/* Documentos con submenú - siempre visible */}
              <button
                className={`nav-item nav-expandable ${isDocumentosActive ? 'active' : ''}`}
                onClick={() => toggleSubmenu('documentos')}
              >
                <span className="nav-icon">{Icons.documentos}</span>
                <span className="nav-label">Documentos</span>
                <span className={`nav-chevron ${documentosOpen ? 'open' : ''}`}>
                  {Icons.chevronDown}
                </span>
              </button>

              <div className={`nav-submenu ${documentosOpen ? 'open' : ''}`}>
                {documentosSubItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`${basePath}/${item.path}`}
                    end={item.path === 'documentos'}
                    className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>

              {/* Rendimiento (Fases + Productividad) */}
              {visibleSistemaFasesItems.length === 1 ? (
                <NavLink
                  to={`${basePath}/${visibleSistemaFasesItems[0].path}`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.fases}</span>
                  <span className="nav-label">{visibleSistemaFasesItems[0].label}</span>
                </NavLink>
              ) : visibleSistemaFasesItems.length > 1 && (
              <>
              <button
                className={`nav-item nav-expandable ${isSistemaFasesActive ? 'active' : ''}`}
                onClick={() => toggleSubmenu('sistemaFases')}
              >
                <span className="nav-icon">{Icons.fases}</span>
                <span className="nav-label">Rendimiento</span>
                <span className={`nav-chevron ${sistemaFasesOpen ? 'open' : ''}`}>
                  {Icons.chevronDown}
                </span>
              </button>

              <div className={`nav-submenu ${sistemaFasesOpen ? 'open' : ''}`}>
                {visibleSistemaFasesItems.map((item) => (
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
              </>
              )}
            </div>
            )}

            {/* ==================== AJUSTES ==================== */}
            {(tieneAcceso('usuarios') || visibleConfigItems.length > 0) && (
            <div className="nav-section">
              <span className="nav-section-title">Ajustes</span>

              {/* Usuarios */}
              {tieneAcceso('usuarios') && (
                <NavLink
                  to={`${basePath}/usuarios`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.usuarios}</span>
                  <span className="nav-label">Usuarios</span>
                </NavLink>
              )}

              {/* Configuración con submenú */}
              {visibleConfigItems.length === 1 ? (
                <NavLink
                  to={`${basePath}/${visibleConfigItems[0].path}`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{Icons.configuracion}</span>
                  <span className="nav-label">{visibleConfigItems[0].label}</span>
                </NavLink>
              ) : visibleConfigItems.length > 1 && (
              <>
              <button
                className={`nav-item nav-expandable ${isConfigActive ? 'active' : ''}`}
                onClick={() => toggleSubmenu('config')}
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
              </>
              )}
            </div>
            )}
          </nav>

        </aside>

        {/* Main Content */}
        <div className="crm-main">
          {/* Header */}
          <header className="crm-header">
            <div className="header-left">
              {/* Mobile menu button */}
              <button
                className="mobile-menu-btn"
                onClick={() => setSidebarMobileOpen(true)}
              >
                {Icons.menu}
              </button>
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

              {/* User Menu con dropdown personalizado */}
              <div className="user-menu-wrapper">
                <button
                  className="user-menu-trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen(!userMenuOpen);
                  }}
                >
                  <span className="user-name">{user?.nombre || user?.email?.split('@')[0]}</span>
                  <div className="user-avatar">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user?.nombre || 'Usuario'} />
                    ) : (
                      <span className="avatar-initials">
                        {(user?.nombre?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                      </span>
                    )}
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="dropdown-header">
                      <div className="dropdown-user-info">
                        <span className="dropdown-user-name">{user?.nombre} {user?.apellido}</span>
                        <span className="dropdown-user-email">{user?.email}</span>
                      </div>
                    </div>
                    <div className="dropdown-divider" />
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setPerfilModalOpen(true);
                        setUserMenuOpen(false);
                      }}
                    >
                      {Icons.userProfile}
                      <span>Mi Perfil</span>
                    </button>
                    <a
                      href={`http://localhost:4321/tenant/${tenantSlug}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dropdown-item"
                    >
                      {Icons.external}
                      <span>Ver sitio web</span>
                    </a>

                    {/* Selector de Tenant */}
                    {user?.tenants && user.tenants.length > 1 && (
                      <>
                        <div className="dropdown-divider" />
                        <div className="dropdown-tenant-section">
                          <span className="dropdown-section-label">Cambiar empresa</span>
                          <select
                            className="dropdown-tenant-select"
                            value={tenantSlug}
                            onChange={(e) => {
                              navigate(`/crm/${e.target.value}`);
                              setUserMenuOpen(false);
                            }}
                          >
                            {user.tenants.map((tenant) => (
                              <option key={tenant.id} value={tenant.slug}>
                                {tenant.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {/* Panel Admin */}
                    {isPlatformAdmin && (
                      <>
                        <div className="dropdown-divider" />
                        <button
                          className="dropdown-item dropdown-item-admin"
                          onClick={() => {
                            navigate('/admin');
                            setUserMenuOpen(false);
                          }}
                        >
                          {Icons.admin}
                          <span>Panel Admin</span>
                        </button>
                      </>
                    )}

                    <div className="dropdown-divider" />
                    <button
                      className="dropdown-item dropdown-item-danger"
                      onClick={() => {
                        signOut({ redirectUrl: '/login' });
                      }}
                    >
                      {Icons.logout}
                      <span>Cerrar sesion</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="crm-content">
            {loadingModulos ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', padding: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div className="loading-spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #e2e8f0',
                    borderTop: '3px solid #2563eb',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Cargando...</p>
                </div>
              </div>
            ) : routeAccessDenied ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', padding: '2rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '3rem 2rem', maxWidth: '400px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.5rem' }}>Acceso Denegado</h2>
                  <p style={{ color: '#6b7280', margin: 0 }}>No tienes permiso para acceder a esta sección.</p>
                  <button onClick={() => navigate(`/crm/${tenantSlug}`)} style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Volver al inicio
                  </button>
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>

        {/* Modal de Mi Perfil */}
        <MiPerfil isOpen={perfilModalOpen} onClose={() => setPerfilModalOpen(false)} />

        <style>{`
          /* ========== VARIABLES ========== */
          .crm-layout {
            --sidebar-width: 220px;
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
            /* Z-index hierarchy (from theme-clic.css) */
            --z-base: 0;
            --z-dropdown: 100;
            --z-sticky: 200;
            --z-header: 300;
            --z-sidebar: 400;
            --z-modal-backdrop: 500;
            --z-modal: 600;
            --z-popover: 700;
            --z-tooltip: 800;
            --z-toast: 900;
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
            z-index: var(--z-sidebar, 400);
          }

          /* Brand */
          .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 16px;
            border-bottom: 1px solid var(--border);
          }

          .brand-logo {
            width: 34px;
            height: 34px;
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 1rem;
            flex-shrink: 0;
            overflow: hidden;
          }

          .brand-logo.has-image {
            background: transparent;
          }

          .brand-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .brand-info {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .brand-name {
            font-weight: 600;
            font-size: 0.85rem;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .brand-type {
            font-size: 0.7rem;
            color: var(--text-muted);
          }

          /* Navigation */
          .sidebar-nav {
            flex: 1;
            padding: 12px 10px;
            overflow-y: auto;
          }

          .nav-section {
            margin-bottom: 16px;
          }

          .nav-section-title {
            display: block;
            font-size: 0.625rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            padding: 0 10px;
            margin-bottom: 6px;
          }

          .nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 7px 10px;
            color: var(--text-secondary);
            text-decoration: none;
            border-radius: var(--radius);
            margin-bottom: 1px;
            transition: all 0.15s ease;
            font-size: 0.8125rem;
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
            font-weight: 600;
          }

          .nav-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 18px;
            height: 18px;
          }

          .nav-icon svg {
            width: 16px;
            height: 16px;
          }

          .nav-label {
            flex: 1;
          }

          .nav-expandable {
            justify-content: flex-start;
          }

          .nav-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 9px;
            background: #ef4444;
            color: #fff;
            font-size: 0.65rem;
            font-weight: 700;
            line-height: 1;
            margin-left: auto;
          }

          .nav-subitem .nav-badge {
            min-width: 16px;
            height: 16px;
            font-size: 0.6rem;
            padding: 0 4px;
            border-radius: 8px;
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
            margin-left: 10px;
            padding-left: 10px;
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
            margin-top: 3px;
          }

          .nav-subitem {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            color: var(--text-secondary);
            text-decoration: none;
            border-radius: var(--radius);
            margin-bottom: 1px;
            transition: all 0.15s ease;
            font-size: 0.75rem;
            font-weight: 500;
          }

          .nav-subitem:hover {
            background: var(--border-light);
            color: var(--text-primary);
          }

          .nav-subitem.active {
            background: var(--primary-bg);
            color: var(--primary);
            font-weight: 600;
          }

          .nav-subitem .nav-icon {
            opacity: 0.7;
            width: 16px;
            height: 16px;
          }

          .nav-subitem .nav-icon svg {
            width: 14px;
            height: 14px;
          }

          .nav-subitem.active .nav-icon {
            opacity: 1;
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
            z-index: var(--z-header, 300);
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
            flex: 1;
            min-width: 0; /* Permite que se contraiga */
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
            gap: 10px;
            min-width: 0; /* Permite truncamiento */
            overflow: hidden;
          }

          .header-title {
            margin: 0;
            font-size: 1.1rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 600;
            color: var(--text-primary);
          }

          .header-subtitle {
            font-size: 0.8rem;
            color: var(--text-muted);
          }

          /* Header Stats */
          .header-stats {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-left: 20px;
            margin-right: 20px;
          }

          .header-stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .header-stat-icon {
            display: flex;
            align-items: center;
            color: var(--text-muted);
          }

          .header-stat-icon svg {
            width: 14px;
            height: 14px;
          }

          .header-stat-label {
            font-size: 0.7rem;
            font-weight: 500;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }

          .header-stat-value {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--primary);
          }

          .header-right {
            display: flex;
            align-items: center;
            gap: 10px;
            position: relative;
            z-index: var(--z-dropdown, 100);
            flex-shrink: 0; /* No comprimir los botones de acción */
          }

          .header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap; /* Permitir wrap si es necesario */
          }

          /* User Menu */
          .user-menu-wrapper {
            position: relative;
            z-index: var(--z-popover, 700);
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
            min-width: 220px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 10px rgba(0, 0, 0, 0.1);
            z-index: var(--z-popover, 700);
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

          .dropdown-item-danger {
            color: var(--error);
          }

          .dropdown-item-danger:hover {
            background: #fef2f2;
            color: var(--error);
          }

          .dropdown-header {
            padding: 12px 16px;
          }

          .dropdown-user-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .dropdown-user-name {
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--text-primary);
          }

          .dropdown-user-email {
            font-size: 0.8rem;
            color: var(--text-muted);
          }

          .dropdown-divider {
            height: 1px;
            background: var(--border);
            margin: 4px 0;
          }

          /* Dropdown Tenant Section */
          .dropdown-tenant-section {
            padding: 8px 16px 12px;
          }

          .dropdown-section-label {
            display: block;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 8px;
          }

          .dropdown-tenant-select {
            width: 100%;
            padding: 8px 10px;
            background: var(--bg-main);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 0.8rem;
            cursor: pointer;
          }

          .dropdown-tenant-select:focus {
            outline: none;
            border-color: var(--primary);
          }

          /* Admin dropdown item */
          .dropdown-item-admin {
            color: #dc2626;
          }

          .dropdown-item-admin:hover {
            background: #fef2f2;
            color: #dc2626;
          }

          /* User Avatar */
          .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
          }

          .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .avatar-initials {
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
          }

          button.dropdown-item {
            width: 100%;
            text-align: left;
            border: none;
            background: none;
            cursor: pointer;
          }

          /* Content */
          .crm-content {
            flex: 1;
            padding: 24px 32px;
            overflow-y: auto;
            position: relative;
            z-index: var(--z-base, 0);
            background: white;
          }

          /* ========== LOADING SPINNER ========== */
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* ========== MOBILE MENU BUTTON ========== */
          .mobile-menu-btn {
            display: none;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            padding: 0;
            background: none;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.15s ease;
            flex-shrink: 0;
          }

          .mobile-menu-btn:hover {
            background: var(--border-light);
            color: var(--text-primary);
          }

          /* ========== SIDEBAR CLOSE BUTTON (Mobile) ========== */
          .sidebar-close-btn {
            display: none;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            padding: 0;
            background: none;
            border: none;
            border-radius: var(--radius);
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.15s ease;
            margin-left: auto;
          }

          .sidebar-close-btn:hover {
            background: var(--border-light);
            color: var(--text-primary);
          }

          /* ========== MOBILE OVERLAY ========== */
          .mobile-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 350; /* Between header (300) and sidebar (400) */
            opacity: 1;
            transition: opacity 0.3s ease;
          }

          /* ========== RESPONSIVE - Tablet & Mobile ========== */
          @media (max-width: 1024px) {
            /* Show mobile menu button */
            .mobile-menu-btn {
              display: flex;
            }

            /* Show sidebar close button */
            .sidebar-close-btn {
              display: flex;
            }

            /* Sidebar slides in from left */
            .crm-sidebar {
              transform: translateX(-100%);
              transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              z-index: var(--z-sidebar, 400);
              box-shadow: none;
            }

            .crm-sidebar.mobile-open {
              transform: translateX(0);
              box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
            }

            /* Main content full width */
            .crm-main {
              margin-left: 0;
            }

            /* Show overlay when sidebar is open */
            .mobile-overlay {
              display: block;
              opacity: 1;
            }

            /* Adjust header padding */
            .crm-header {
              padding: 0 16px;
            }

            /* Hide header stats on tablet */
            .header-stats {
              display: none;
            }

            /* Content padding adjustment */
            .crm-content {
              padding: 16px;
            }

            /* Hide user name on small screens */
            .user-name {
              display: none;
            }

            .user-menu-trigger {
              padding: 6px 8px;
            }

            /* Botones del header más compactos en tablet */
            .header-actions button,
            .header-actions .btn-primary,
            .header-actions .btn-secondary,
            .header-actions .crm-btn {
              padding: 6px 12px;
              font-size: 0.8rem;
            }
          }

          /* ========== RESPONSIVE - Mobile Small ========== */
          @media (max-width: 640px) {
            /* Smaller header */
            .crm-header {
              padding: 0 12px;
              height: 56px;
            }

            /* Smaller content padding */
            .crm-content {
              padding: 12px;
            }

            /* Header left more compact */
            .header-left {
              gap: 8px;
              flex: 1;
              min-width: 0;
            }

            /* Stack header title section */
            .header-title-section {
              flex-direction: column;
              align-items: flex-start;
              gap: 2px;
              max-width: 140px;
            }

            .header-title {
              font-size: 0.9rem;
            }

            .header-subtitle {
              font-size: 0.65rem;
              display: none;
            }

            /* Header actions compactos */
            .header-actions {
              gap: 6px;
            }

            /* ===== BOTONES ICON-ONLY EN MÓVIL ===== */
            /* Los botones muestran solo el icono, ocultando el texto */
            .header-actions button,
            .header-actions .btn-primary,
            .header-actions .btn-secondary,
            .header-actions .crm-btn {
              /* Tamaño fijo cuadrado para solo icono */
              width: 36px;
              height: 36px;
              padding: 0;
              /* Ocultar texto pero mantener SVG */
              font-size: 0;
              line-height: 0;
              /* Centrar el icono */
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
            }

            /* El SVG dentro del botón mantiene su tamaño */
            .header-actions button svg,
            .header-actions .btn-primary svg,
            .header-actions .btn-secondary svg,
            .header-actions .crm-btn svg {
              width: 18px;
              height: 18px;
              flex-shrink: 0;
            }

            /* Back button smaller */
            .header-back-btn {
              padding: 4px 8px;
              font-size: 0.75rem;
            }

            .header-back-btn span {
              display: none;
            }

            /* Header right más compacto */
            .header-right {
              gap: 6px;
            }
          }
        `}</style>
      </div>
    </PageContext.Provider>
    </CatalogosProvider>
  );
}
