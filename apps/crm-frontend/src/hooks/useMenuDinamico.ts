/**
 * HOOK PARA MENÚ DINÁMICO
 *
 * Genera la estructura del menú basándose en los permisos del usuario.
 * Solo muestra módulos a los que el usuario tiene acceso.
 *
 * Uso:
 * const { menuItems, isLoading } = useMenuDinamico();
 */

import { useMemo } from 'react';
import { usePermisos, ModuloNombre } from '../contexts/PermisosContext';
import {
  Users,
  FileText,
  Building2,
  Calendar,
  FileSpreadsheet,
  Target,
  BarChart3,
  Settings,
  UsersRound,
  MapPin,
  Home,
  type LucideIcon,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  modulo?: ModuloNombre;
  badge?: number;
  children?: MenuItem[];
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

// Definición completa del menú con todos los módulos
const MENU_COMPLETO: MenuSection[] = [
  {
    id: 'principal',
    title: '',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/crm',
        icon: Home,
        // Dashboard siempre visible
      },
    ],
  },
  {
    id: 'crm',
    title: 'CRM',
    items: [
      {
        id: 'contactos',
        label: 'Contactos',
        path: '/crm/contactos',
        icon: Users,
        modulo: 'contactos',
      },
      {
        id: 'solicitudes',
        label: 'Solicitudes',
        path: '/crm/solicitudes',
        icon: FileText,
        modulo: 'solicitudes',
      },
      {
        id: 'propiedades',
        label: 'Propiedades',
        path: '/crm/propiedades',
        icon: Building2,
        modulo: 'propiedades',
      },
      {
        id: 'actividades',
        label: 'Actividades',
        path: '/crm/actividades',
        icon: Calendar,
        modulo: 'actividades',
      },
      {
        id: 'propuestas',
        label: 'Propuestas',
        path: '/crm/propuestas',
        icon: FileSpreadsheet,
        modulo: 'propuestas',
      },
    ],
  },
  {
    id: 'gestion',
    title: 'Gestión',
    items: [
      {
        id: 'metas',
        label: 'Metas',
        path: '/crm/metas',
        icon: Target,
        modulo: 'metas',
      },
      {
        id: 'reportes',
        label: 'Reportes',
        path: '/crm/reportes',
        icon: BarChart3,
        modulo: 'reportes',
      },
    ],
  },
  {
    id: 'organizacion',
    title: 'Organización',
    items: [
      {
        id: 'equipos',
        label: 'Equipos',
        path: '/crm/equipos',
        icon: UsersRound,
        modulo: 'equipos',
      },
      {
        id: 'oficinas',
        label: 'Oficinas',
        path: '/crm/oficinas',
        icon: MapPin,
        modulo: 'oficinas',
      },
    ],
  },
  {
    id: 'administracion',
    title: 'Administración',
    items: [
      {
        id: 'usuarios',
        label: 'Usuarios',
        path: '/crm/usuarios',
        icon: Users,
        modulo: 'usuarios',
      },
      {
        id: 'configuracion',
        label: 'Configuración',
        path: '/crm/configuracion',
        icon: Settings,
        modulo: 'configuracion',
      },
    ],
  },
];

export function useMenuDinamico() {
  const { modulosAccesibles, isSuperAdmin, isAdmin } = usePermisos();

  const menuSections = useMemo<MenuSection[]>(() => {
    // Super admin ve todo
    if (isSuperAdmin) {
      return MENU_COMPLETO;
    }

    // Filtrar secciones y items según permisos
    return MENU_COMPLETO.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Items sin módulo específico siempre visibles (ej: Dashboard)
        if (!item.modulo) return true;

        // Verificar si tiene acceso al módulo
        return modulosAccesibles.includes(item.modulo);
      }),
    })).filter(section => section.items.length > 0); // Eliminar secciones vacías
  }, [modulosAccesibles, isSuperAdmin]);

  // Obtener items planos (para búsqueda, etc.)
  const allMenuItems = useMemo<MenuItem[]>(() => {
    return menuSections.flatMap(section => section.items);
  }, [menuSections]);

  return {
    menuSections,
    allMenuItems,
    isSuperAdmin,
    isAdmin,
  };
}

/**
 * Hook para obtener el item de menú actual basado en la ruta
 */
export function useCurrentMenuItem(currentPath: string) {
  const { allMenuItems } = useMenuDinamico();

  return useMemo(() => {
    // Buscar coincidencia exacta primero
    let item = allMenuItems.find(item => item.path === currentPath);

    // Si no hay coincidencia exacta, buscar prefijo
    if (!item) {
      item = allMenuItems.find(item =>
        currentPath.startsWith(item.path) && item.path !== '/crm'
      );
    }

    return item;
  }, [allMenuItems, currentPath]);
}

export default useMenuDinamico;
