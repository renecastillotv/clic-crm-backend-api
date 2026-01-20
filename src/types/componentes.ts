/**
 * Tipos para el esquema estructurado de componentes
 * Separación clara entre static_data, dynamic_data, styles, toggles
 */

export interface StaticData {
  // Textos estáticos
  titulo?: string;
  subtitulo?: string;
  descripcion?: string;
  textoBoton?: string;
  textoCopyright?: string;
  
  // URLs e imágenes
  urlBoton?: string;
  imagenFondo?: string;
  logo?: string;
  
  // Información de contacto
  telefono?: string;
  email?: string;
  direccion?: string;
  
  // Otros datos estáticos
  [key: string]: any;
}

export interface DynamicDataConfig {
  // Endpoint de API para obtener datos dinámicos
  apiEndpoint?: string;
  
  // Parámetros de consulta
  queryParams?: Record<string, any>;
  
  // TTL de caché en segundos
  cache?: number;
  
  // Tipo de datos esperados
  // El resolver universal soporta estos tipos y los mapea internamente
  // LISTAS: properties, videos, articles/articulos, testimonials, faqs, agents/asesores, ubicaciones/locations/popular_locations
  // SINGLES: property_single, video_single, article_single/articulo_single, testimonial_single/testimonio_single, faq_single, agent_single/asesor_single
  // CATEGORÍAS: categorias_videos, categorias_articulos, categorias_testimonios
  // OTROS: stats/estadisticas, carrusel_propiedades/carrusel, texto_suelto/texto
  dataType?:
    // Listas
    | 'properties' | 'propiedades' | 'lista_propiedades'
    | 'videos' | 'lista_videos'
    | 'articles' | 'articulos' | 'lista_articulos' | 'blog'
    | 'testimonials' | 'lista_testimonios'
    | 'faqs' | 'lista_faqs'
    | 'agents' | 'asesores' | 'lista_asesores'
    | 'ubicaciones' | 'locations' | 'popular_locations'
    // Singles (requieren id en filters)
    | 'property_single' | 'propiedad_single'
    | 'video_single'
    | 'article_single' | 'articulo_single'
    | 'testimonial_single' | 'testimonio_single'
    | 'faq_single'
    | 'agent_single' | 'asesor_single'
    // Categorías (lista de categorías)
    | 'categorias_videos' | 'categorias_articulos' | 'categorias_testimonios'
    | 'videos_por_categoria' | 'articulos_por_categoria' | 'testimonios_por_categoria'
    // Contenido filtrado por categoría
    | 'categoria_videos' | 'categoria_articulos' | 'categoria_testimonios'
    // Otros
    | 'stats' | 'estadisticas' | 'carrusel_propiedades' | 'carrusel' | 'texto_suelto' | 'texto'
    | 'custom';
  
  // Configuración de paginación
  pagination?: {
    page?: number;
    limit?: number;
  };
  
  // Filtros adicionales
  filters?: Record<string, any>;
  
  // Datos resueltos (agregado por el backend después de resolver)
  resolved?: any[];
}

export interface ComponentStyles {
  // Colores personalizados (sobrescriben tema)
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
    [key: string]: string | undefined;
  };
  
  // Espaciado
  spacing?: {
    padding?: string;
    margin?: string;
    gap?: string;
    [key: string]: string | undefined;
  };
  
  // Tipografía
  fonts?: {
    family?: string;
    size?: string;
    weight?: string;
    [key: string]: string | undefined;
  };
  
  // Otros estilos
  [key: string]: any;
}

export interface ComponentToggles {
  // Toggles comunes
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
  
  // Otros toggles
  [key: string]: boolean | undefined;
}

/**
 * Esquema estructurado completo de datos de componente
 */
export interface ComponenteDataEstructurado {
  static_data: StaticData;
  dynamic_data?: DynamicDataConfig;
  styles?: ComponentStyles;
  toggles?: ComponentToggles;
}

/**
 * Datos resueltos de dynamic_data (se agregan después de resolver)
 */
export interface ComponenteDataResuelto extends ComponenteDataEstructurado {
  dynamic_data?: DynamicDataConfig & {
    resolved?: any[]; // Datos resueltos desde la API
  };
}


