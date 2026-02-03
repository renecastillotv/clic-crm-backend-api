/**
 * CrmLayout - Layout moderno para el CRM de cada tenant
 */

import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { Outlet, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext';
import { CatalogosProvider } from '../contexts/CatalogosContext';
import MiPerfil from '../components/MiPerfil';
import { getInfoNegocio, apiFetch, getTema, DEFAULT_CRM_COLORS } from '../services/api';
// Phosphor Icons - Premium duotone style
import {
  SquaresFour,
  House,
  Kanban,
  FileText,
  ListChecks,
  UsersThree,
  User,
  GearSix,
  File,
  Layout,
  Palette,
  SlidersHorizontal,
  CaretDown,
  CaretLeft,
  CaretRight,
  SidebarSimple,
  ArrowSquareOut,
  ShieldCheck,
  Target,
  Pulse,
  ArrowLeft,
  CurrencyDollar,
  ShoppingCart,
  Receipt,
  Wrench,
  Article,
  UserList,
  Lock,
  ChatCircle,
  WhatsappLogo,
  InstagramLogo,
  FacebookLogo,
  EnvelopeSimple,
  Broadcast,
  Globe,
  Files,
  SquareHalf,
  Export,
  CheckCircle,
  GraduationCap,
  BookOpenText,
  Books,
  Buildings,
  Tray,
  ListBullets,
  Info,
  GlobeSimple,
  Star,
  PuzzlePiece,
  ChartBar,
  UserCircle,
  SignOut,
  Package,
  PaintBrush,
  Megaphone,
  ShareNetwork,
  Envelope,
  ChartLine,
  GridFour,
  UserPlus,
  List,
  X,
} from '@phosphor-icons/react';

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

// Phosphor Icons - Premium duotone style icons
const Icons = {
  dashboard: <SquaresFour size={20} weight="duotone" />,
  propiedades: <House size={20} weight="duotone" />,
  pipeline: <Kanban size={20} weight="duotone" />,
  propuestas: <FileText size={20} weight="duotone" />,
  planesPago: <ListChecks size={20} weight="duotone" />,
  clientes: <UsersThree size={20} weight="duotone" />,
  equipo: <User size={20} weight="duotone" />,
  configuracion: <GearSix size={20} weight="duotone" />,
  paginas: <File size={18} weight="duotone" />,
  secciones: <Layout size={18} weight="duotone" />,
  tema: <Palette size={18} weight="duotone" />,
  general: <SlidersHorizontal size={18} weight="duotone" />,
  chevronDown: <CaretDown size={14} weight="bold" />,
  chevronLeft: <CaretLeft size={16} weight="bold" />,
  chevronRight: <CaretRight size={16} weight="bold" />,
  panelLeftClose: <SidebarSimple size={18} weight="duotone" />,
  panelLeftOpen: <SidebarSimple size={18} weight="duotone" />,
  external: <ArrowSquareOut size={16} weight="duotone" />,
  admin: <ShieldCheck size={18} weight="duotone" />,
  metas: <Target size={20} weight="duotone" />,
  actividades: <Pulse size={20} weight="duotone" />,
  back: <ArrowLeft size={16} weight="bold" />,
  finanzas: <CurrencyDollar size={20} weight="duotone" />,
  ventas: <ShoppingCart size={18} weight="duotone" />,
  facturas: <Receipt size={18} weight="duotone" />,
  finanzasConfig: <Wrench size={18} weight="duotone" />,
  contenido: <Article size={20} weight="duotone" />,
  usuarios: <UserList size={18} weight="duotone" />,
  roles: <Lock size={18} weight="duotone" />,
  mensajeria: <ChatCircle size={20} weight="duotone" />,
  whatsapp: <WhatsappLogo size={18} weight="duotone" />,
  instagram: <InstagramLogo size={18} weight="duotone" />,
  facebook: <FacebookLogo size={18} weight="duotone" />,
  email: <EnvelopeSimple size={18} weight="duotone" />,
  chatVivo: <Broadcast size={18} weight="duotone" />,
  clicConnect: <Globe size={20} weight="duotone" />,
  documentos: <Files size={20} weight="duotone" />,
  plantillas: <SquareHalf size={18} weight="duotone" />,
  generar: <Export size={18} weight="duotone" />,
  misDocumentos: <CheckCircle size={18} weight="duotone" />,
  university: <GraduationCap size={20} weight="duotone" />,
  miEntrenamiento: <BookOpenText size={20} weight="duotone" />,
  catalogos: <Books size={18} weight="duotone" />,
  oficinas: <Buildings size={18} weight="duotone" />,
  equipos: <UsersThree size={18} weight="duotone" />,
  fuentes: <Tray size={18} weight="duotone" />,
  fases: <ListBullets size={18} weight="duotone" />,
  infoNegocio: <Info size={18} weight="duotone" />,
  sitioWeb: <GlobeSimple size={18} weight="duotone" />,
  amenidades: <Star size={18} weight="duotone" />,
  extensiones: <PuzzlePiece size={18} weight="duotone" />,
  productividad: <ChartBar size={18} weight="duotone" />,
  userProfile: <UserCircle size={18} weight="duotone" />,
  logout: <SignOut size={18} weight="duotone" />,
  marketing: <Package size={20} weight="duotone" />,
  branding: <PaintBrush size={18} weight="duotone" />,
  campanas: <Megaphone size={18} weight="duotone" />,
  redesSociales: <ShareNetwork size={18} weight="duotone" />,
  emailMarketing: <Envelope size={18} weight="duotone" />,
  analytics: <ChartLine size={18} weight="duotone" />,
  centro: <GridFour size={18} weight="duotone" />,
  leads: <UserPlus size={18} weight="duotone" />,
  configuracionMkt: <GearSix size={18} weight="duotone" />,
  menu: <List size={24} weight="bold" />,
  close: <X size={24} weight="bold" />,
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

  // Estado para sidebar colapsado (desktop)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('crm-sidebar-collapsed');
    return saved === 'true';
  });

  // Estado para submenú flotante en hover (modo colapsado)
  const [hoveringMenu, setHoveringMenu] = useState<string | null>(null);
  const [hoverMenuPosition, setHoverMenuPosition] = useState<{ top: number; bottom?: number; invertY: boolean } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para calcular la posición del menú flotante
  const calculateMenuPosition = (rect: DOMRect, menuItemsCount: number) => {
    const estimatedMenuHeight = menuItemsCount * 42 + 60; // ~42px per item + header/padding
    const viewportHeight = window.innerHeight;
    const bottomSpace = viewportHeight - rect.bottom;

    // Si no hay suficiente espacio abajo, invertir
    if (bottomSpace < estimatedMenuHeight && rect.top > estimatedMenuHeight) {
      return { top: 0, bottom: viewportHeight - rect.bottom, invertY: true };
    }
    return { top: rect.top, invertY: false };
  };

  // Helpers para hover menu con delay para evitar parpadeo
  const openHoverMenu = (menuName: string, rect: DOMRect, itemsCount: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveringMenu(menuName);
    setHoverMenuPosition(calculateMenuPosition(rect, itemsCount));
  };

  const closeHoverMenuWithDelay = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveringMenu(null);
    }, 200); // 200ms delay antes de cerrar
  };

  const cancelCloseHoverMenu = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Handler para mantener el menú abierto mientras el mouse está sobre el nav-group
  const handleNavGroupMouseMove = (menuName: string, e: React.MouseEvent<HTMLDivElement>, itemsCount: number) => {
    if (sidebarCollapsed && hoveringMenu !== menuName) {
      cancelCloseHoverMenu();
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveringMenu(menuName);
      setHoverMenuPosition(calculateMenuPosition(rect, itemsCount));
    }
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Guardar preferencia de sidebar colapsado
  useEffect(() => {
    localStorage.setItem('crm-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Cerrar sidebar mobile y menú flotante al cambiar de ruta
  useEffect(() => {
    setSidebarMobileOpen(false);
    setHoveringMenu(null);
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

  // Cargar y aplicar colores del tema CRM
  useEffect(() => {
    const cargarColoresTema = async () => {
      if (!tenantActual?.id) return;
      try {
        const tema = await getTema(tenantActual.id);

        // Aplicar colores del sidebar (usando valores guardados o defaults)
        const colors = {
          sidebarBgStart: tema.sidebarBgStart || DEFAULT_CRM_COLORS.sidebarBgStart,
          sidebarBgEnd: tema.sidebarBgEnd || DEFAULT_CRM_COLORS.sidebarBgEnd,
          sidebarText: tema.sidebarText || DEFAULT_CRM_COLORS.sidebarText,
          sidebarTextActive: tema.sidebarTextActive || DEFAULT_CRM_COLORS.sidebarTextActive,
          sidebarHoverBg: tema.sidebarHoverBg || DEFAULT_CRM_COLORS.sidebarHoverBg,
          sidebarActiveBg: tema.sidebarActiveBg || DEFAULT_CRM_COLORS.sidebarActiveBg,
          sidebarIconColor: tema.sidebarIconColor || DEFAULT_CRM_COLORS.sidebarIconColor,
          sidebarIconActive: tema.sidebarIconActive || DEFAULT_CRM_COLORS.sidebarIconActive,
          sidebarIconCollapsed: tema.sidebarIconCollapsed || DEFAULT_CRM_COLORS.sidebarIconCollapsed,
          crmPrimary: tema.crmPrimary || DEFAULT_CRM_COLORS.crmPrimary,
        };

        // Inyectar un <style> dinámico para sobrescribir las variables CSS
        // Esto tiene mayor especificidad que los estilos inline en algunos navegadores
        const styleId = 'crm-dynamic-theme';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement;
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
          .crm-layout {
            --bg-sidebar: linear-gradient(180deg, ${colors.sidebarBgStart} 0%, ${colors.sidebarBgEnd} 100%) !important;
            --sidebar-text: ${colors.sidebarText} !important;
            --sidebar-text-active: ${colors.sidebarTextActive} !important;
            --sidebar-hover-text: ${colors.sidebarTextActive} !important;
            --sidebar-hover-bg: ${colors.sidebarHoverBg} !important;
            --sidebar-active-bg: ${colors.sidebarActiveBg} !important;
            --sidebar-icon-color: ${colors.sidebarIconColor} !important;
            --sidebar-icon-active: ${colors.sidebarIconActive} !important;
            --sidebar-icon-hover: ${colors.sidebarIconActive} !important;
            --sidebar-icon-collapsed: ${colors.sidebarIconCollapsed} !important;
            --primary: ${colors.crmPrimary} !important;
            --primary-light: ${colors.crmPrimary} !important;
          }

          /* Estilos directos para nav-item (menú principal) */
          .crm-layout .crm-sidebar .nav-item {
            color: ${colors.sidebarText} !important;
          }
          .crm-layout .crm-sidebar .nav-item .nav-icon,
          .crm-layout .crm-sidebar .nav-item .nav-chevron {
            color: ${colors.sidebarIconColor} !important;
          }
          .crm-layout .crm-sidebar .nav-item:hover {
            background: ${colors.sidebarHoverBg} !important;
            color: ${colors.sidebarTextActive} !important;
          }
          .crm-layout .crm-sidebar .nav-item:hover .nav-icon,
          .crm-layout .crm-sidebar .nav-item:hover .nav-chevron {
            color: ${colors.sidebarIconActive} !important;
          }
          .crm-layout .crm-sidebar .nav-item.active {
            background: transparent !important;
            color: ${colors.sidebarTextActive} !important;
          }
          .crm-layout .crm-sidebar .nav-item.active::after {
            background: ${colors.sidebarIconActive} !important;
          }
          .crm-layout .crm-sidebar .nav-item.active .nav-icon,
          .crm-layout .crm-sidebar .nav-item.active .nav-chevron {
            color: ${colors.sidebarIconActive} !important;
          }

          /* Estilos directos para nav-subitem (subsecciones) */
          .crm-layout .crm-sidebar .nav-subitem {
            color: ${colors.sidebarText} !important;
          }
          .crm-layout .crm-sidebar .nav-subitem:hover {
            background: ${colors.sidebarHoverBg} !important;
            color: ${colors.sidebarTextActive} !important;
          }
          .crm-layout .crm-sidebar .nav-subitem.active {
            background: ${colors.sidebarActiveBg} !important;
            color: ${colors.sidebarTextActive} !important;
          }

          /* Estilos para iconos en modo colapsado */
          .crm-layout .crm-sidebar.collapsed .nav-item .nav-icon {
            color: ${colors.sidebarIconColor} !important;
          }
          .crm-layout .crm-sidebar.collapsed .nav-item:hover .nav-icon {
            color: ${colors.sidebarIconActive} !important;
          }
          .crm-layout .crm-sidebar.collapsed .nav-item.active .nav-icon {
            color: ${colors.sidebarIconCollapsed} !important;
          }
        `;

      } catch (err) {
        console.error('Error cargando colores del tema:', err);
      }
    };
    cargarColoresTema();
  }, [tenantActual?.id]);

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
        <aside className={`crm-sidebar ${sidebarMobileOpen ? 'mobile-open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
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
              <div
                className="nav-group"
                onMouseEnter={(e) => {
                  if (sidebarCollapsed) {
                    openHoverMenu('crm', e.currentTarget.getBoundingClientRect(), visibleCrmItems.length);
                  }
                }}
                onMouseMove={(e) => handleNavGroupMouseMove('crm', e, visibleCrmItems.length)}
                onMouseLeave={closeHoverMenuWithDelay}
              >
              <button
                className={`nav-item nav-expandable ${isCrmActive ? 'active' : ''}`}
                onClick={() => {
                  if (!sidebarCollapsed) {
                    toggleSubmenu('crm');
                  }
                }}
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

              {/* Floating submenu for collapsed mode */}
              {sidebarCollapsed && hoveringMenu === 'crm' && hoverMenuPosition && (
                <div
                  className={`nav-floating-submenu ${hoverMenuPosition.invertY ? 'inverted' : ''}`}
                  style={hoverMenuPosition.invertY ? { bottom: hoverMenuPosition.bottom } : { top: hoverMenuPosition.top }}
                  onMouseEnter={cancelCloseHoverMenu}
                  onMouseLeave={closeHoverMenuWithDelay}
                >
                  <div className="floating-submenu-title">CRM</div>
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
              )}
              </div>
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
              <div
                className="nav-group"
                onMouseEnter={(e) => {
                  if (sidebarCollapsed) {
                    openHoverMenu('finanzas', e.currentTarget.getBoundingClientRect(), 5);
                  }
                }}
                onMouseMove={(e) => handleNavGroupMouseMove('finanzas', e, 5)}
                onMouseLeave={closeHoverMenuWithDelay}
              >
              <button
                className={`nav-item nav-expandable ${isFinanzasActive ? 'active' : ''}`}
                onClick={() => {
                  if (!sidebarCollapsed) {
                    toggleSubmenu('finanzas');
                  }
                }}
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

              {sidebarCollapsed && hoveringMenu === 'finanzas' && hoverMenuPosition && (
                <div
                  className={`nav-floating-submenu ${hoverMenuPosition.invertY ? 'inverted' : ''}`}
                  style={hoverMenuPosition.invertY ? { bottom: hoverMenuPosition.bottom } : { top: hoverMenuPosition.top }}
                  onMouseEnter={cancelCloseHoverMenu}
                  onMouseLeave={closeHoverMenuWithDelay}
                >
                  <div className="floating-submenu-title">Finanzas</div>
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
              )}
              </div>
              )}

              {/* Mensajería con submenú */}
              {tieneAcceso('mensajeria') && (
              <div
                className="nav-group"
                onMouseEnter={(e) => {
                  if (sidebarCollapsed) {
                    openHoverMenu('mensajeria', e.currentTarget.getBoundingClientRect(), 5);
                  }
                }}
                onMouseMove={(e) => handleNavGroupMouseMove('mensajeria', e, 5)}
                onMouseLeave={closeHoverMenuWithDelay}
              >
              <button
                className={`nav-item nav-expandable ${isMensajeriaActive ? 'active' : ''}`}
                onClick={() => {
                  if (!sidebarCollapsed) {
                    toggleSubmenu('mensajeria');
                  }
                }}
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

              {sidebarCollapsed && hoveringMenu === 'mensajeria' && hoverMenuPosition && (
                <div
                  className={`nav-floating-submenu ${hoverMenuPosition.invertY ? 'inverted' : ''}`}
                  style={hoverMenuPosition.invertY ? { bottom: hoverMenuPosition.bottom } : { top: hoverMenuPosition.top }}
                  onMouseEnter={cancelCloseHoverMenu}
                  onMouseLeave={closeHoverMenuWithDelay}
                >
                  <div className="floating-submenu-title">Mensajería</div>
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
              )}
              </div>
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
              <div
                className="nav-group"
                onMouseEnter={(e) => {
                  if (sidebarCollapsed) {
                    openHoverMenu('marketing', e.currentTarget.getBoundingClientRect(), 5);
                  }
                }}
                onMouseMove={(e) => handleNavGroupMouseMove('marketing', e, 5)}
                onMouseLeave={closeHoverMenuWithDelay}
              >
              <button
                className={`nav-item nav-expandable ${isMarketingActive ? 'active' : ''}`}
                onClick={() => {
                  if (!sidebarCollapsed) {
                    toggleSubmenu('marketing');
                  }
                }}
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

              {sidebarCollapsed && hoveringMenu === 'marketing' && hoverMenuPosition && (
                <div
                  className={`nav-floating-submenu ${hoverMenuPosition.invertY ? 'inverted' : ''}`}
                  style={hoverMenuPosition.invertY ? { bottom: hoverMenuPosition.bottom } : { top: hoverMenuPosition.top }}
                  onMouseEnter={cancelCloseHoverMenu}
                  onMouseLeave={closeHoverMenuWithDelay}
                >
                  <div className="floating-submenu-title">Marketing</div>
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
              )}
              </div>
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
              <div
                className="nav-group"
                onMouseEnter={(e) => {
                  if (sidebarCollapsed) {
                    openHoverMenu('documentos', e.currentTarget.getBoundingClientRect(), 5);
                  }
                }}
                onMouseMove={(e) => handleNavGroupMouseMove('documentos', e, 5)}
                onMouseLeave={closeHoverMenuWithDelay}
              >
              <button
                className={`nav-item nav-expandable ${isDocumentosActive ? 'active' : ''}`}
                onClick={() => {
                  if (!sidebarCollapsed) {
                    toggleSubmenu('documentos');
                  }
                }}
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

              {sidebarCollapsed && hoveringMenu === 'documentos' && hoverMenuPosition && (
                <div
                  className={`nav-floating-submenu ${hoverMenuPosition.invertY ? 'inverted' : ''}`}
                  style={hoverMenuPosition.invertY ? { bottom: hoverMenuPosition.bottom } : { top: hoverMenuPosition.top }}
                  onMouseEnter={cancelCloseHoverMenu}
                  onMouseLeave={closeHoverMenuWithDelay}
                >
                  <div className="floating-submenu-title">Documentos</div>
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
              )}
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
              <div
                className="nav-group"
                onMouseEnter={(e) => {
                  if (sidebarCollapsed) {
                    openHoverMenu('sistemaFases', e.currentTarget.getBoundingClientRect(), 5);
                  }
                }}
                onMouseMove={(e) => handleNavGroupMouseMove('sistemaFases', e, 5)}
                onMouseLeave={closeHoverMenuWithDelay}
              >
              <button
                className={`nav-item nav-expandable ${isSistemaFasesActive ? 'active' : ''}`}
                onClick={() => {
                  if (!sidebarCollapsed) {
                    toggleSubmenu('sistemaFases');
                  }
                }}
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

              {sidebarCollapsed && hoveringMenu === 'sistemaFases' && hoverMenuPosition && (
                <div
                  className={`nav-floating-submenu ${hoverMenuPosition.invertY ? 'inverted' : ''}`}
                  style={hoverMenuPosition.invertY ? { bottom: hoverMenuPosition.bottom } : { top: hoverMenuPosition.top }}
                  onMouseEnter={cancelCloseHoverMenu}
                  onMouseLeave={closeHoverMenuWithDelay}
                >
                  <div className="floating-submenu-title">Rendimiento</div>
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
              )}
              </div>
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
              <div
                className="nav-group"
                onMouseEnter={(e) => {
                  if (sidebarCollapsed) {
                    openHoverMenu('config', e.currentTarget.getBoundingClientRect(), 5);
                  }
                }}
                onMouseMove={(e) => handleNavGroupMouseMove('config', e, 5)}
                onMouseLeave={closeHoverMenuWithDelay}
              >
              <button
                className={`nav-item nav-expandable ${isConfigActive ? 'active' : ''}`}
                onClick={() => {
                  if (!sidebarCollapsed) {
                    toggleSubmenu('config');
                  }
                }}
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

              {sidebarCollapsed && hoveringMenu === 'config' && hoverMenuPosition && (
                <div
                  className={`nav-floating-submenu ${hoverMenuPosition.invertY ? 'inverted' : ''}`}
                  style={hoverMenuPosition.invertY ? { bottom: hoverMenuPosition.bottom } : { top: hoverMenuPosition.top }}
                  onMouseEnter={cancelCloseHoverMenu}
                  onMouseLeave={closeHoverMenuWithDelay}
                >
                  <div className="floating-submenu-title">Configuración</div>
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
              )}
              </div>
              )}
            </div>
            )}
          </nav>

          {/* Toggle button para colapsar/expandir sidebar */}
          <div className="sidebar-toggle-wrapper">
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {sidebarCollapsed ? Icons.panelLeftOpen : Icons.panelLeftClose}
            </button>
            <span className="toggle-indicator" />
          </div>
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
            --sidebar-collapsed-width: 68px;
            --header-height: 64px;
            --primary: #2563eb;
            --primary-light: #3b82f6;
            --primary-bg: #eff6ff;
            --bg-main: #f8fafc;
            --bg-sidebar: linear-gradient(180deg, #1E293B 0%, #0F172A 100%);
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
            /* Dark sidebar colors - vibrant & readable */
            --sidebar-text: #E2E8F0;
            --sidebar-text-muted: #94A3B8;
            --sidebar-text-active: #FFFFFF;
            --sidebar-border: rgba(255, 255, 255, 0.08);
            --sidebar-hover-bg: rgba(59, 130, 246, 0.18);
            --sidebar-hover-text: #FFFFFF;
            --sidebar-active-bg: rgba(59, 130, 246, 0.35);
            --sidebar-icon-color: #94A3B8;
            --sidebar-icon-hover: #60A5FA;
            --sidebar-icon-active: #60A5FA;
            --sidebar-icon-collapsed: #60A5FA;
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
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }

          /* ========== SIDEBAR (Dark Theme - Phase 5) ========== */
          .crm-sidebar {
            width: var(--sidebar-width);
            background: var(--bg-sidebar);
            border-right: 1px solid var(--sidebar-border);
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: var(--z-sidebar, 400);
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
          }

          /* Brand (Dark Theme) */
          .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 16px;
            border-bottom: 1px solid var(--sidebar-border);
          }

          .brand-logo {
            width: 34px;
            height: 34px;
            background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%);
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 1rem;
            flex-shrink: 0;
            overflow: hidden;
            box-shadow: 0 2px 8px var(--sidebar-hover-bg);
          }

          .brand-logo.has-image {
            background: transparent;
            box-shadow: none;
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
            color: var(--sidebar-text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .brand-type {
            font-size: 0.7rem;
            color: var(--sidebar-text-muted);
          }

          /* Navigation (Dark Theme) */
          .sidebar-nav {
            flex: 1;
            padding: 12px 10px;
            overflow-y: auto;
          }

          .nav-section {
            margin-bottom: 8px;
          }

          .nav-section-title {
            display: none;
          }

          .nav-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 12px;
            color: var(--sidebar-text);
            text-decoration: none;
            border-radius: var(--radius);
            margin-bottom: 2px;
            transition: all 0.2s ease;
            font-size: 0.8125rem;
            font-weight: 500;
            border: none;
            background: none;
            width: 100%;
            cursor: pointer;
            text-align: left;
          }

          .nav-item .nav-icon {
            color: var(--sidebar-icon-color);
            transition: color 0.2s ease, transform 0.2s ease;
          }

          .nav-item:hover {
            background: var(--sidebar-hover-bg);
            color: var(--sidebar-hover-text);
          }

          .nav-item:hover .nav-icon {
            color: var(--sidebar-icon-hover);
            transform: scale(1.1);
          }

          .nav-item.active {
            background: rgba(0, 0, 0, 0.15);
            color: var(--sidebar-text-active);
            font-weight: 600;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
            position: relative;
          }

          .nav-item.active::after {
            content: '';
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 60%;
            background: var(--sidebar-icon-active);
            border-radius: 3px 0 0 3px;
          }

          .nav-item.active .nav-icon {
            color: var(--sidebar-icon-active);
          }

          .nav-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 20px;
            height: 20px;
          }

          .nav-icon svg {
            width: 18px;
            height: 18px;
          }

          .nav-label {
            flex: 1;
          }

          .nav-expandable {
            justify-content: flex-start;
            font-family: inherit;
            font-size: inherit;
            font-weight: inherit;
          }

          /* Asegurar mismo peso visual para todos los nav-item */
          .nav-item,
          button.nav-item {
            font-weight: 500;
            font-size: 0.8125rem;
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
            transition: transform 0.2s ease, color 0.2s ease;
            display: flex;
            align-items: center;
            color: var(--sidebar-icon-color);
          }

          .nav-item:hover .nav-chevron {
            color: var(--sidebar-icon-hover);
          }

          .nav-item.active .nav-chevron {
            color: var(--sidebar-icon-active);
          }

          .nav-chevron.open {
            transform: rotate(180deg);
          }

          /* Submenu (Dark Theme) */
          .nav-submenu {
            margin-left: 10px;
            padding-left: 10px;
            border-left: 2px solid var(--sidebar-border);
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
            padding: 7px 10px;
            color: var(--sidebar-text);
            text-decoration: none;
            border-radius: var(--radius);
            margin-bottom: 2px;
            transition: all 0.2s ease;
            font-size: 0.8rem;
            font-weight: 500;
          }

          .nav-subitem:hover {
            background: var(--sidebar-hover-bg);
            color: var(--sidebar-hover-text);
          }

          .nav-subitem.active {
            background: var(--sidebar-active-bg);
            color: var(--sidebar-text-active);
            font-weight: 600;
          }

          .nav-subitem .nav-icon {
            color: var(--sidebar-icon-color);
            width: 16px;
            height: 16px;
            transition: color 0.2s ease;
          }

          .nav-subitem:hover .nav-icon {
            color: var(--sidebar-icon-hover);
          }

          .nav-subitem .nav-icon svg {
            width: 14px;
            height: 14px;
          }

          .nav-subitem.active .nav-icon {
            color: var(--sidebar-icon-active);
          }

          /* ========== SIDEBAR TOGGLE BUTTON ========== */
          .sidebar-toggle-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 10px 16px;
            margin-top: auto;
            border-top: 1px solid var(--sidebar-border);
            gap: 8px;
          }

          .sidebar-toggle-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.04);
            color: var(--sidebar-text-muted);
            cursor: pointer;
            transition: all 0.25s ease;
            flex-shrink: 0;
          }

          .sidebar-toggle-btn:hover {
            background: var(--sidebar-hover-bg);
            color: var(--sidebar-icon-active);
            border-color: var(--sidebar-hover-bg);
            transform: scale(1.05);
          }

          .sidebar-toggle-btn:active {
            transform: scale(0.95);
          }

          .toggle-indicator {
            display: none;
          }

          .crm-sidebar.collapsed .sidebar-toggle-wrapper {
            flex-direction: column;
            padding: 8px 4px 12px;
          }

          .crm-sidebar.collapsed .sidebar-toggle-btn {
            width: 34px;
            height: 34px;
          }

          .crm-sidebar.collapsed .toggle-indicator {
            width: 6px;
            height: 6px;
          }

          /* ========== SIDEBAR COLLAPSED MODE ========== */
          .crm-sidebar {
            transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .crm-sidebar.collapsed {
            width: var(--sidebar-collapsed-width, 68px);
            overflow-x: hidden;
          }

          .crm-sidebar.collapsed .brand-info,
          .crm-sidebar.collapsed .brand-type,
          .crm-sidebar.collapsed .nav-label,
          .crm-sidebar.collapsed .nav-chevron,
          .crm-sidebar.collapsed .nav-badge {
            display: none;
          }

          /* Section titles become subtle dividers in collapsed mode */
          .crm-sidebar.collapsed .nav-section-title {
            height: 1px;
            padding: 0;
            margin: 8px 6px;
            background: var(--sidebar-border);
            font-size: 0;
            overflow: hidden;
          }

          .crm-sidebar.collapsed .nav-section:first-child .nav-section-title {
            display: none;
          }

          .crm-sidebar.collapsed .sidebar-brand {
            justify-content: center;
            padding: 12px 4px;
          }

          .crm-sidebar.collapsed .sidebar-nav {
            padding: 8px 4px;
            overflow-x: hidden;
          }

          .crm-sidebar.collapsed .nav-section {
            margin-bottom: 4px;
          }

          .crm-sidebar.collapsed .nav-item {
            justify-content: center;
            padding: 10px 6px;
            border-radius: 8px;
            margin: 2px 4px;
            width: calc(100% - 8px);
            background: transparent !important;
            box-shadow: none !important;
          }

          .crm-sidebar.collapsed .nav-item .nav-icon {
            width: 24px;
            height: 24px;
            color: var(--sidebar-icon-color);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .crm-sidebar.collapsed .nav-item .nav-icon svg {
            width: 22px;
            height: 22px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Collapsed hover state - glow effect */
          .crm-sidebar.collapsed .nav-item:hover {
            background: var(--sidebar-hover-bg) !important;
          }

          .crm-sidebar.collapsed .nav-item:hover .nav-icon {
            color: var(--sidebar-icon-active);
          }

          .crm-sidebar.collapsed .nav-item:hover .nav-icon svg {
            width: 26px;
            height: 26px;
          }

          /* Collapsed active state - subtle recessed box */
          .crm-sidebar.collapsed .nav-item.active {
            background: rgba(0, 0, 0, 0.2) !important;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
            border-radius: 10px;
            position: relative;
          }

          .crm-sidebar.collapsed .nav-item.active::after {
            display: none;
          }

          .crm-sidebar.collapsed .nav-item.active .nav-icon {
            color: var(--sidebar-icon-collapsed, var(--sidebar-icon-active));
          }

          .crm-sidebar.collapsed .nav-item.active .nav-icon svg {
            width: 22px;
            height: 22px;
          }

          /* Collapsed active + hover state */
          .crm-sidebar.collapsed .nav-item.active:hover {
            background: rgba(0, 0, 0, 0.25) !important;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.35) !important;
          }

          .crm-sidebar.collapsed .nav-item.active:hover .nav-icon {
            color: var(--sidebar-text-active);
          }

          .crm-sidebar.collapsed .nav-item.active:hover .nav-icon svg {
            width: 24px;
            height: 24px;
          }

          .crm-sidebar.collapsed .nav-submenu {
            display: none;
          }

          /* Nav group wrapper with invisible bridge */
          .nav-group {
            position: relative;
          }

          /* Invisible bridge to connect icon with floating menu */
          .crm-sidebar.collapsed .nav-group::after {
            content: '';
            position: absolute;
            left: 100%;
            top: 0;
            width: 20px;
            height: 100%;
            background: transparent;
            pointer-events: none;
          }

          .crm-sidebar.collapsed .nav-group:hover::after {
            pointer-events: auto;
          }

          /* ========== FLOATING SUBMENU (Collapsed Mode) ========== */
          .nav-floating-submenu {
            position: fixed;
            left: calc(var(--sidebar-collapsed-width, 68px) + 8px);
            background: var(--bg-sidebar);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-lg);
            padding: 10px;
            min-width: 200px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
            z-index: calc(var(--z-sidebar) + 10);
            animation: floatingSubmenuIn 0.18s ease-out;
          }

          /* Invisible bridge from menu to icon */
          .nav-floating-submenu::before {
            content: '';
            position: absolute;
            right: 100%;
            top: 0;
            width: 20px;
            height: 100%;
            background: transparent;
          }

          @keyframes floatingSubmenuIn {
            from {
              opacity: 0;
              transform: translateX(-10px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .floating-submenu-title {
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--sidebar-icon-active);
            padding: 6px 12px 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            margin-bottom: 8px;
          }

          .nav-floating-submenu .nav-subitem {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            color: var(--sidebar-text);
            text-decoration: none;
            border-radius: var(--radius);
            margin-bottom: 2px;
            transition: all 0.15s ease;
            font-size: 0.8125rem;
            font-weight: 500;
          }

          .nav-floating-submenu .nav-subitem:hover {
            background: var(--sidebar-hover-bg);
            color: var(--sidebar-hover-text);
          }

          .nav-floating-submenu .nav-subitem.active {
            background: var(--sidebar-active-bg);
            color: var(--sidebar-text-active);
            font-weight: 600;
          }

          .nav-floating-submenu .nav-subitem .nav-icon {
            opacity: 0.8;
          }

          .nav-floating-submenu .nav-subitem.active .nav-icon {
            opacity: 1;
          }

          /* Inverted floating submenu (when near bottom of screen) */
          .nav-floating-submenu.inverted {
            animation: floatingSubmenuInUp 0.18s ease-out;
          }

          .nav-floating-submenu.inverted::before {
            top: auto;
            bottom: 0;
          }

          @keyframes floatingSubmenuInUp {
            from {
              opacity: 0;
              transform: translateX(-10px) translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateX(0) translateY(0);
            }
          }

          .nav-floating-submenu .nav-subitem .nav-label {
            display: block !important;
          }

          .nav-floating-submenu .nav-subitem .nav-badge {
            display: inline-flex !important;
          }

          /* Main content adjustment for collapsed sidebar */
          .crm-layout:has(.crm-sidebar.collapsed) .crm-main {
            margin-left: var(--sidebar-collapsed-width, 68px);
            max-width: calc(100vw - var(--sidebar-collapsed-width, 68px));
          }

          /* ========== MAIN AREA ========== */
          .crm-main {
            flex: 1;
            margin-left: var(--sidebar-width);
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            max-width: calc(100vw - var(--sidebar-width));
            overflow-x: hidden;
          }

          /* Header (Glassmorphism - Phase 5) */
          .crm-header {
            height: var(--header-height);
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 32px;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(226, 232, 240, 0.8);
            position: sticky;
            top: 0;
            z-index: var(--z-header, 300);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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

          /* ========== SIDEBAR CLOSE BUTTON (Mobile - Dark Theme) ========== */
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
            color: var(--sidebar-text-muted);
            cursor: pointer;
            transition: all 0.15s ease;
            margin-left: auto;
          }

          .sidebar-close-btn:hover {
            background: var(--sidebar-hover);
            color: var(--sidebar-text-active);
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

            /* Hide toggle button on mobile - use hamburger menu instead */
            .sidebar-toggle-btn {
              display: none;
            }

            /* Disable collapsed mode on mobile - always full width sidebar */
            .crm-sidebar.collapsed {
              width: var(--sidebar-width);
            }

            .crm-sidebar.collapsed .brand-info,
            .crm-sidebar.collapsed .brand-type,
            .crm-sidebar.collapsed .nav-label,
            .crm-sidebar.collapsed .nav-chevron,
            .crm-sidebar.collapsed .nav-badge {
              display: revert;
            }

            .crm-sidebar.collapsed .nav-section-title {
              height: auto;
              padding: 0 10px;
              margin: 0 0 6px 0;
              background: transparent;
              font-size: 0.625rem;
            }

            .crm-sidebar.collapsed .nav-section:first-child .nav-section-title {
              display: block;
            }

            .crm-sidebar.collapsed .sidebar-brand {
              justify-content: flex-start;
              padding: 14px 16px;
            }

            .crm-sidebar.collapsed .nav-section {
              margin-bottom: 16px;
            }

            .crm-sidebar.collapsed .nav-item {
              justify-content: flex-start;
              padding: 9px 12px;
              margin: 0 0 2px 0;
              width: 100%;
              border-radius: var(--radius);
            }

            .crm-sidebar.collapsed .nav-item .nav-icon {
              width: 20px;
              height: 20px;
            }

            .crm-sidebar.collapsed .nav-item .nav-icon svg {
              width: 18px;
              height: 18px;
            }

            .crm-sidebar.collapsed .nav-item:hover {
              background: var(--sidebar-hover-bg);
              transform: none;
            }

            .crm-sidebar.collapsed .nav-item.active {
              background: rgba(0, 0, 0, 0.15);
              box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
            }

            .crm-sidebar.collapsed .nav-submenu {
              display: block;
            }

            .crm-sidebar.collapsed .sidebar-nav {
              padding: 12px 10px;
            }

            /* Hide floating submenus on mobile */
            .nav-floating-submenu {
              display: none !important;
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
              max-width: 100vw;
              width: 100%;
            }

            /* Override :has selector for collapsed sidebar on mobile */
            .crm-layout:has(.crm-sidebar.collapsed) .crm-main {
              margin-left: 0;
              max-width: 100vw;
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
