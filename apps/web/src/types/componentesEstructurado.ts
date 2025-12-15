/**
 * Tipos para el esquema estructurado de componentes (sincronizado con API)
 */

export interface StaticData {
  titulo?: string;
  subtitulo?: string;
  descripcion?: string;
  textoBoton?: string;
  textoCopyright?: string;
  urlBoton?: string;
  imagenFondo?: string;
  logo?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  placeholder?: string;
  itemsPorPagina?: number;
  [key: string]: any;
}

export interface DynamicDataConfig {
  apiEndpoint?: string;
  queryParams?: Record<string, any>;
  cache?: number;
  // Tipo de datos esperados
  // El resolver universal soporta estos tipos y los mapea internamente
  // LISTAS: properties, videos, articles/articulos, testimonials, faqs, agents/asesores, ubicaciones/locations/popular_locations
  // SINGLES: property_single, video_single, article_single/articulo_single, testimonial_single/testimonio_single, faq_single, agent_single/asesor_single
  // CATEGORÍAS: categorias_videos, categorias_articulos, categorias_testimonios
  // OTROS: stats/estadisticas, carrusel_propiedades/carrusel, texto_suelto/texto
  dataType?: 
    // Listas
    | 'properties' | 'videos' | 'articles' | 'articulos' | 'testimonials' | 'faqs' | 'agents' | 'asesores'
    | 'ubicaciones' | 'locations' | 'popular_locations'
    // Singles (requieren id en filters)
    | 'property_single' | 'video_single' | 'article_single' | 'articulo_single' 
    | 'testimonial_single' | 'testimonio_single' | 'faq_single' | 'agent_single' | 'asesor_single'
    // Categorías
    | 'categorias_videos' | 'categorias_articulos' | 'categorias_testimonios'
    // Otros
    | 'stats' | 'estadisticas' | 'carrusel_propiedades' | 'carrusel' | 'texto_suelto' | 'texto'
    | 'custom';
  pagination?: {
    page?: number;
    limit?: number;
  };
  filters?: Record<string, any>;
  // Datos resueltos (agregado por el backend después de resolver)
  resolved?: any[];
}

export interface ComponentStyles {
  colors?: Record<string, string>;
  spacing?: Record<string, string>;
  fonts?: Record<string, string>;
  [key: string]: any;
}

export interface ComponentToggles {
  mostrarPrecio?: boolean;
  mostrarFiltros?: boolean;
  mostrarMenu?: boolean;
  mostrarBusqueda?: boolean;
  mostrarTelefono?: boolean;
  mostrarEmail?: boolean;
  mostrarMensaje?: boolean;
  mostrarAutor?: boolean;
  mostrarFecha?: boolean;
  mostrarResumen?: boolean;
  mostrarCaracteristicas?: boolean;
  mostrarUbicacion?: boolean;
  mostrarTotal?: boolean;
  [key: string]: boolean | undefined;
}

export interface ComponenteDataEstructurado {
  static_data: StaticData;
  dynamic_data?: DynamicDataConfig;
  styles?: ComponentStyles;
  toggles?: ComponentToggles;
  // Campos adicionales que pueden ser inyectados por el routeResolver
  video?: any; // Video individual (para video_detail)
  propiedad?: any; // Propiedad individual (para property_detail)
  [key: string]: any; // Permitir campos adicionales
}


