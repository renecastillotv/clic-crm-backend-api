/**
 * Tipos para componentes en Astro
 * Sincronizado con el sistema del CRM
 */

export type TipoComponente = 
  | 'hero'
  | 'footer'
  | 'property_list'
  | 'property_card'
  | 'property_detail'
  | 'property_carousel'
  | 'pagination'
  | 'header'
  | 'contact_form'
  | 'testimonials'
  | 'features'
  | 'cta'
  | 'blog_list'
  | 'blog_card'
  | 'search_bar'
  | 'filter_panel'
  | 'video_gallery'
  | 'related_articles'
  | 'popular_locations'
  | 'dynamic_faqs'
  | 'custom'; // Componentes personalizados a la medida

export type VarianteComponente = 'default' | 'variant1' | 'variant2' | 'variant3' | 'clic';

export interface TemaColores {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

import type { ComponenteDataEstructurado } from './componentesEstructurado';

export interface ComponenteConfigurado {
  id: string;
  tipo: TipoComponente;
  variante: VarianteComponente;
  datos: ComponenteDataEstructurado; // Formato estructurado obligatorio
  tema?: Partial<TemaColores>;
  orden: number;
  activo: boolean;
  // Para componentes custom
  nombreCustom?: string;
  codigoCustom?: string;
}

// Helpers para acceder a datos estructurados (formato estricto)
export function getStaticData(datos: ComponenteDataEstructurado): Record<string, any> {
  return datos.static_data;
}

export function getDynamicData(datos: ComponenteDataEstructurado) {
  return datos.dynamic_data;
}

export function getStyles(datos: ComponenteDataEstructurado): Record<string, any> {
  return datos.styles || {};
}

export function getToggles(datos: ComponenteDataEstructurado): Record<string, boolean> {
  return datos.toggles || {};
}

