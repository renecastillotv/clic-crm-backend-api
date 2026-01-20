/**
 * DESIGN TOKENS - Estándares visuales del CRM
 *
 * Este archivo define los tokens de diseño que DEBEN usarse en todo el CRM
 * para mantener consistencia visual.
 *
 * IMPORTANTE: Cuando crees o modifiques componentes, usa estos valores.
 */

// ============================================================================
// TAMAÑOS DE ICONOS (Lucide React)
// ============================================================================
export const ICON_SIZES = {
  /** 12px - Para badges pequeños, contadores en tags */
  xs: 12,
  /** 14px - Para botones compactos, iconos secundarios */
  sm: 14,
  /** 16px - ESTÁNDAR para botones, acciones de tabla, navegación */
  base: 16,
  /** 18px - Para botones destacados, headers */
  md: 18,
  /** 20px - Para botones de cerrar modal, iconos prominentes */
  lg: 20,
  /** 24px - Para empty states pequeños */
  xl: 24,
  /** 40px - Para empty states principales */
  '2xl': 40,
  /** 64px - Para empty states grandes */
  '3xl': 64,
} as const;

// Clases de Tailwind equivalentes
export const ICON_CLASSES = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  base: 'w-4 h-4',
  md: 'w-[18px] h-[18px]',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
  '2xl': 'w-10 h-10',
  '3xl': 'w-16 h-16',
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const RADIUS = {
  /** 4px - Tags, badges pequeños */
  xs: '4px',
  /** 6px - Inputs pequeños, chips */
  sm: '6px',
  /** 8px - ESTÁNDAR: Botones, action buttons, modals, inputs */
  base: '8px',
  /** 10px - Cards pequeñas, dropdowns */
  md: '10px',
  /** 12px - Cards principales, status cards, containers */
  lg: '12px',
  /** 16px - Cards grandes, secciones */
  xl: '16px',
  /** Circular */
  full: '9999px',
} as const;

// ============================================================================
// FONT SIZES
// ============================================================================
export const FONT_SIZES = {
  /** 11px - Hints, notas muy pequeñas */
  '2xs': '0.6875rem',
  /** 12px - Labels de tabla, badges, texto terciario */
  xs: '0.75rem',
  /** 13px - Texto secundario en tablas */
  sm: '0.8125rem',
  /** 14px - ESTÁNDAR: Texto principal, inputs, botones */
  base: '0.875rem',
  /** 15px - Texto destacado */
  md: '0.9375rem',
  /** 16px - Títulos de sección, nombres principales */
  lg: '1rem',
  /** 18px - Títulos de modal */
  xl: '1.125rem',
  /** 20px - Títulos de página (dentro del contenido) */
  '2xl': '1.25rem',
  /** 24px - Números en stats cards */
  '3xl': '1.5rem',
} as const;

// ============================================================================
// FONT WEIGHTS
// ============================================================================
export const FONT_WEIGHTS = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ============================================================================
// SPACING (Padding, Gap, Margin)
// ============================================================================
export const SPACING = {
  /** 2px */
  '0.5': '2px',
  /** 4px */
  '1': '4px',
  /** 6px */
  '1.5': '6px',
  /** 8px */
  '2': '8px',
  /** 10px */
  '2.5': '10px',
  /** 12px */
  '3': '12px',
  /** 14px */
  '3.5': '14px',
  /** 16px */
  '4': '16px',
  /** 20px */
  '5': '20px',
  /** 24px */
  '6': '24px',
  /** 32px */
  '8': '32px',
} as const;

// ============================================================================
// COLORES DEL TEMA
// ============================================================================
export const COLORS = {
  // Primarios
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  // Grises (texto y bordes)
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  // Estados
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
  },
} as const;

// ============================================================================
// ESTILOS DE COMPONENTES COMUNES (CSS-in-JS)
// ============================================================================

/** Botón de acción en tablas (editar, eliminar, etc.) */
export const ACTION_BUTTON_STYLE = {
  width: '32px',
  height: '32px',
  borderRadius: RADIUS.base, // 8px
  background: COLORS.gray[100],
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
} as const;

/** Status card (Borrador, Enviada, etc.) */
export const STATUS_CARD_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: SPACING['3'], // 12px
  padding: SPACING['4'], // 16px
  background: 'white',
  border: `1px solid ${COLORS.gray[200]}`,
  borderRadius: RADIUS.lg, // 12px
  cursor: 'pointer',
  transition: 'all 0.2s ease',
} as const;

/** Header de tabla */
export const TABLE_HEADER_STYLE = {
  fontSize: FONT_SIZES.xs, // 12px
  fontWeight: FONT_WEIGHTS.semibold,
  color: COLORS.gray[500],
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
} as const;

/** Celda de tabla */
export const TABLE_CELL_STYLE = {
  padding: '14px 16px',
  fontSize: FONT_SIZES.base, // 14px
  color: COLORS.gray[700],
} as const;

// ============================================================================
// GUÍA DE USO
// ============================================================================
/**
 * USO EN COMPONENTES:
 *
 * import { ICON_SIZES, RADIUS, FONT_SIZES, COLORS } from '../../styles/design-tokens';
 *
 * // Iconos de Lucide
 * <Pencil size={ICON_SIZES.base} />  // 16px - estándar para acciones
 * <Trash2 size={ICON_SIZES.base} />  // 16px - estándar para acciones
 * <X size={ICON_SIZES.lg} />         // 20px - para cerrar modales
 *
 * // En estilos inline o CSS-in-JS
 * style={{ borderRadius: RADIUS.base }}  // 8px
 * style={{ fontSize: FONT_SIZES.base }}  // 14px
 *
 * REGLAS:
 * 1. Iconos de acciones en tabla: SIEMPRE size={16} o ICON_SIZES.base
 * 2. Botones de cerrar modal: SIEMPRE size={20} o ICON_SIZES.lg
 * 3. Border radius de botones: SIEMPRE 8px (RADIUS.base)
 * 4. Border radius de cards: SIEMPRE 12px (RADIUS.lg)
 * 5. Font size en tablas: headers 12px, celdas 14px
 */
