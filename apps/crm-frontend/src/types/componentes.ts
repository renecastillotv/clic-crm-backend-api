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
  | 'about_founder'
  | 'location_discovery'
  | 'youtube_channel'
  | 'knowledge_center'
  | 'team_grid';

export type VarianteComponente = 'default' | 'variant1' | 'variant2' | 'variant3' | 'clic' | 'search' | 'simple' | 'split' | 'grid' | 'featured' | 'showcase' | 'compact';

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

export interface ComponenteInfo {
  codigo: TipoComponente;
  nombre: string;
  descripcion: string;
  categoria: 'layout' | 'content' | 'navigation' | 'forms' | 'display';
  icono: string;
  variantes: VarianteComponente[];
  campos: CampoComponente[];
  preview: string;
}

export interface CampoComponente {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'url' | 'image' | 'color' | 'select' | 'boolean';
  required: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  description?: string;
}

// Importar tipos estructurados
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
  pagination?: { page?: number; limit?: number };
  filters?: Record<string, any>;
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
}

export interface ComponenteConfigurado {
  id: string;
  tipo: TipoComponente;
  variante: VarianteComponente;
  datos: ComponenteDataEstructurado; // Formato estructurado obligatorio
  tema?: Partial<TemaColores>;
  orden: number;
  activo: boolean;
  predeterminado?: boolean;
  paginaId?: string;
}

// Helpers para acceder a datos estructurados (formato estricto)
export function getStaticData(datos: ComponenteDataEstructurado): StaticData {
  return datos.static_data;
}

export function getDynamicData(datos: ComponenteDataEstructurado): DynamicDataConfig | undefined {
  return datos.dynamic_data;
}

export function getStyles(datos: ComponenteDataEstructurado): ComponentStyles {
  return datos.styles || {};
}

export function getToggles(datos: ComponenteDataEstructurado): ComponentToggles {
  return datos.toggles || {};
}

export const COMPONENTES_DISPONIBLES: Record<TipoComponente, ComponenteInfo> = {
  hero: {
    codigo: 'hero',
    nombre: 'Hero Section',
    descripcion: 'Sección principal de la página con título, subtítulo y CTA',
    categoria: 'layout',
    icono: '🎯',
    variantes: ['default', 'variant1', 'variant2', 'variant3'],
    campos: [
      { key: 'titulo', label: 'Título Principal', type: 'text', required: true },
      { key: 'subtitulo', label: 'Subtítulo', type: 'textarea', required: false },
      { key: 'textoBoton', label: 'Texto del Botón', type: 'text', required: false },
      { key: 'urlBoton', label: 'URL del Botón', type: 'url', required: false },
      { key: 'imagenFondo', label: 'Imagen de Fondo', type: 'image', required: false },
    ],
    preview: 'hero-preview',
  },
  footer: {
    codigo: 'footer',
    nombre: 'Footer',
    descripcion: 'Pie de página con información de contacto y enlaces',
    categoria: 'layout',
    icono: '📄',
    variantes: ['default', 'variant1', 'variant2'],
    campos: [
      { key: 'textoCopyright', label: 'Texto de Copyright', type: 'text', required: true },
      { key: 'telefono', label: 'Teléfono', type: 'text', required: false },
      { key: 'email', label: 'Email', type: 'text', required: false },
      { key: 'direccion', label: 'Dirección', type: 'textarea', required: false },
    ],
    preview: 'footer-preview',
  },
  property_list: {
    codigo: 'property_list',
    nombre: 'Lista de Propiedades',
    descripcion: 'Componente para mostrar listado de propiedades',
    categoria: 'display',
    icono: '🏢',
    variantes: ['default', 'variant1', 'variant2'],
    campos: [
      { key: 'titulo', label: 'Título de la Sección', type: 'text', required: false },
      { key: 'itemsPorPagina', label: 'Items por Página', type: 'number', required: false, defaultValue: 12 },
      { key: 'mostrarFiltros', label: 'Mostrar Filtros', type: 'boolean', required: false, defaultValue: true },
    ],
    preview: 'property-list-preview',
  },
  property_card: {
    codigo: 'property_card',
    nombre: 'Tarjeta de Propiedad',
    descripcion: 'Tarjeta individual para mostrar una propiedad',
    categoria: 'display',
    icono: '🏘️',
    variantes: ['default', 'variant1', 'variant2', 'variant3'],
    campos: [
      { key: 'mostrarPrecio', label: 'Mostrar Precio', type: 'boolean', required: false, defaultValue: true },
      { key: 'mostrarUbicacion', label: 'Mostrar Ubicación', type: 'boolean', required: false, defaultValue: true },
      { key: 'mostrarCaracteristicas', label: 'Mostrar Características', type: 'boolean', required: false, defaultValue: true },
    ],
    preview: 'property-card-preview',
  },
  pagination: {
    codigo: 'pagination',
    nombre: 'Paginación',
    descripcion: 'Componente de paginación para listados',
    categoria: 'navigation',
    icono: '📑',
    variantes: ['default', 'variant1', 'variant2'],
    campos: [
      { key: 'itemsPorPagina', label: 'Items por Página', type: 'number', required: false, defaultValue: 12 },
      { key: 'mostrarTotal', label: 'Mostrar Total', type: 'boolean', required: false, defaultValue: true },
    ],
    preview: 'pagination-preview',
  },
  header: {
    codigo: 'header',
    nombre: 'Header/Navegación',
    descripcion: 'Encabezado con navegación principal',
    categoria: 'layout',
    icono: '📋',
    variantes: ['default', 'variant1', 'variant2'],
    campos: [
      { key: 'logo', label: 'URL del Logo', type: 'image', required: false },
      { key: 'mostrarBusqueda', label: 'Mostrar Búsqueda', type: 'boolean', required: false, defaultValue: true },
      { key: 'mostrarMenu', label: 'Mostrar Menú', type: 'boolean', required: false, defaultValue: true },
    ],
    preview: 'header-preview',
  },
  contact_form: {
    codigo: 'contact_form',
    nombre: 'Formulario de Contacto',
    descripcion: 'Formulario para que los visitantes se pongan en contacto',
    categoria: 'forms',
    icono: '📧',
    variantes: ['default', 'variant1', 'variant2'],
    campos: [
      { key: 'titulo', label: 'Título del Formulario', type: 'text', required: false },
      { key: 'mostrarTelefono', label: 'Mostrar Campo Teléfono', type: 'boolean', required: false, defaultValue: true },
      { key: 'mostrarMensaje', label: 'Mostrar Campo Mensaje', type: 'boolean', required: false, defaultValue: true },
    ],
    preview: 'contact-form-preview',
  },
  testimonials: {
    codigo: 'testimonials',
    nombre: 'Testimonios',
    descripcion: 'Sección de testimonios de clientes',
    categoria: 'content',
    icono: '💬',
    variantes: ['default', 'variant1', 'variant2', 'clic'],
    campos: [
      { key: 'titulo', label: 'Título de la Sección', type: 'text', required: false },
      { key: 'subtitulo', label: 'Subtítulo', type: 'textarea', required: false },
    ],
    preview: 'testimonials-preview',
  },
  features: {
    codigo: 'features',
    nombre: 'Características',
    descripcion: 'Sección de características o servicios',
    categoria: 'content',
    icono: '⭐',
    variantes: ['default', 'variant1', 'variant2'],
    campos: [
      { key: 'titulo', label: 'Título de la Sección', type: 'text', required: false },
      { key: 'subtitulo', label: 'Subtítulo', type: 'textarea', required: false },
    ],
    preview: 'features-preview',
  },
  cta: {
    codigo: 'cta',
    nombre: 'Call to Action',
    descripcion: 'Sección de llamada a la acción',
    categoria: 'content',
    icono: '🚀',
    variantes: ['default', 'variant1', 'variant2'],
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', required: true },
      { key: 'textoBoton', label: 'Texto del Botón', type: 'text', required: true },
      { key: 'urlBoton', label: 'URL del Botón', type: 'url', required: true },
    ],
    preview: 'cta-preview',
  },
  blog_list: {
    codigo: 'blog_list',
    nombre: 'Lista de Blog',
    descripcion: 'Componente para mostrar listado de artículos del blog',
    categoria: 'display',
    icono: '📝',
    variantes: ['default', 'variant1', 'variant2'],
    campos: [
      { key: 'titulo', label: 'Título de la Sección', type: 'text', required: false },
      { key: 'itemsPorPagina', label: 'Items por Página', type: 'number', required: false, defaultValue: 6 },
    ],
    preview: 'blog-list-preview',
  },
  blog_card: {
    codigo: 'blog_card',
    nombre: 'Tarjeta de Blog',
    descripcion: 'Tarjeta individual para mostrar un artículo del blog',
    categoria: 'display',
    icono: '📰',
    variantes: ['default', 'variant1', 'variant2'],
    campos: [
      { key: 'mostrarAutor', label: 'Mostrar Autor', type: 'boolean', required: false, defaultValue: true },
      { key: 'mostrarFecha', label: 'Mostrar Fecha', type: 'boolean', required: false, defaultValue: true },
      { key: 'mostrarResumen', label: 'Mostrar Resumen', type: 'boolean', required: false, defaultValue: true },
    ],
    preview: 'blog-card-preview',
  },
  search_bar: {
    codigo: 'search_bar',
    nombre: 'Barra de Búsqueda',
    descripcion: 'Barra de búsqueda para propiedades',
    categoria: 'forms',
    icono: '🔍',
    variantes: ['default', 'variant1', 'variant2'],
    campos: [
      { key: 'placeholder', label: 'Texto Placeholder', type: 'text', required: false, defaultValue: 'Buscar propiedades...' },
      { key: 'mostrarFiltros', label: 'Mostrar Filtros Avanzados', type: 'boolean', required: false, defaultValue: false },
    ],
    preview: 'search-bar-preview',
  },
  filter_panel: {
    codigo: 'filter_panel',
    nombre: 'Panel de Filtros',
    descripcion: 'Panel lateral con filtros para propiedades',
    categoria: 'forms',
    icono: '🔧',
    variantes: ['default', 'variant1'],
    campos: [
      { key: 'mostrarPrecio', label: 'Filtro de Precio', type: 'boolean', required: false, defaultValue: true },
      { key: 'mostrarTipo', label: 'Filtro de Tipo', type: 'boolean', required: false, defaultValue: true },
      { key: 'mostrarUbicacion', label: 'Filtro de Ubicación', type: 'boolean', required: false, defaultValue: true },
    ],
    preview: 'filter-panel-preview',
  },
  property_detail: {
    codigo: 'property_detail',
    nombre: 'Detalle de Propiedad',
    descripcion: 'Muestra los detalles completos de una propiedad individual',
    categoria: 'display',
    icono: '🏠',
    variantes: ['default'],
    campos: [
      { key: 'mostrarPrecio', label: 'Mostrar Precio', type: 'boolean', required: false, defaultValue: true },
      { key: 'mostrarUbicacion', label: 'Mostrar Ubicación', type: 'boolean', required: false, defaultValue: true },
      { key: 'mostrarCaracteristicas', label: 'Mostrar Características', type: 'boolean', required: false, defaultValue: true },
    ],
    preview: 'property-detail-preview',
  },
  property_carousel: {
    codigo: 'property_carousel',
    nombre: 'Carrusel de Propiedades',
    descripcion: 'Carrusel de propiedades destacadas con navegación',
    categoria: 'display',
    icono: '📸',
    variantes: ['clic'],
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', required: false },
      { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
      { key: 'theme', label: 'Tema', type: 'select', required: false, default: 'luxury', options: ['default', 'luxury', 'investment'] },
      { key: 'viewAllLink', label: 'URL Ver Todas', type: 'text', required: false },
    ],
    preview: 'property-carousel-preview',
  },
  video_gallery: {
    codigo: 'video_gallery',
    nombre: 'Galería de Videos',
    descripcion: 'Galería de videos con estadísticas y badges',
    categoria: 'content',
    icono: '🎬',
    variantes: ['clic'],
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', required: false },
      { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
      { key: 'layout', label: 'Layout', type: 'select', required: false, default: 'grid', options: ['grid', 'carousel', 'featured'] },
      { key: 'mostrarEstadisticas', label: 'Mostrar Estadísticas', type: 'boolean', default: true },
      { key: 'mostrarBadges', label: 'Mostrar Badges', type: 'boolean', default: true },
    ],
    preview: 'video-gallery-preview',
  },
  related_articles: {
    codigo: 'related_articles',
    nombre: 'Artículos Relacionados',
    descripcion: 'Listado de artículos relacionados con diseño avanzado',
    categoria: 'content',
    icono: '📚',
    variantes: ['clic'],
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', required: false },
      { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
      { key: 'layout', label: 'Layout', type: 'select', required: false, default: 'featured', options: ['grid', 'featured'] },
      { key: 'mostrarAutor', label: 'Mostrar Autor', type: 'boolean', default: true },
      { key: 'mostrarFecha', label: 'Mostrar Fecha', type: 'boolean', default: true },
    ],
    preview: 'related-articles-preview',
  },
  popular_locations: {
    codigo: 'popular_locations',
    nombre: 'Ubicaciones Populares',
    descripcion: 'Ubicaciones populares estilo valla publicitaria',
    categoria: 'display',
    icono: '🗺️',
    variantes: ['clic'],
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', required: false },
      { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
      { key: 'showType', label: 'Tipo de Visualización', type: 'select', required: false, default: 'mixed', options: ['cities', 'sectors', 'mixed'] },
      { key: 'showBadges', label: 'Mostrar Badges', type: 'boolean', default: true },
      { key: 'maxItems', label: 'Máximo de Items', type: 'number', default: 12 },
    ],
    preview: 'popular-locations-preview',
  },
  dynamic_faqs: {
    codigo: 'dynamic_faqs',
    nombre: 'FAQs Dinámicos',
    descripcion: 'Preguntas frecuentes dinámicas con contexto',
    categoria: 'content',
    icono: '💬',
    variantes: ['clic'],
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', required: false },
      { key: 'context', label: 'Contexto', type: 'text', required: false },
    ],
    preview: 'dynamic-faqs-preview',
  },
  about_founder: {
    codigo: 'about_founder',
    nombre: 'Sobre el Fundador',
    descripcion: 'Sección sobre el fundador con imagen, descripción y estadísticas',
    categoria: 'content',
    icono: '👤',
    variantes: ['split'],
    campos: [
      { key: 'titulo', label: 'Nombre', type: 'text', required: true },
      { key: 'subtitulo', label: 'Cargo/Posición', type: 'text', required: true },
      { key: 'descripcion', label: 'Descripción', type: 'textarea', required: true },
      { key: 'imagen', label: 'URL de la Imagen', type: 'image', required: true },
    ],
    preview: 'about-founder-preview',
  },
  location_discovery: {
    codigo: 'location_discovery',
    nombre: 'Descubre Ubicaciones',
    descripcion: 'Grid de ubicaciones destacadas con imágenes',
    categoria: 'content',
    icono: '📍',
    variantes: ['grid'],
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', required: false },
      { key: 'subtitulo', label: 'Subtítulo', type: 'textarea', required: false },
    ],
    preview: 'location-discovery-preview',
  },
  youtube_channel: {
    codigo: 'youtube_channel',
    nombre: 'Canal de YouTube',
    descripcion: 'Showcase del canal de YouTube con videos destacados',
    categoria: 'content',
    icono: '📺',
    variantes: ['showcase'],
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', required: false },
      { key: 'subtitulo', label: 'Subtítulo', type: 'textarea', required: false },
      { key: 'channelId', label: 'ID del Canal', type: 'text', required: false },
    ],
    preview: 'youtube-channel-preview',
  },
  knowledge_center: {
    codigo: 'knowledge_center',
    nombre: 'Centro de Conocimiento',
    descripcion: 'Grid de artículos y recursos educativos',
    categoria: 'content',
    icono: '📚',
    variantes: ['grid'],
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', required: false },
      { key: 'subtitulo', label: 'Subtítulo', type: 'textarea', required: false },
    ],
    preview: 'knowledge-center-preview',
  },
  team_grid: {
    codigo: 'team_grid',
    nombre: 'Equipo/Asesores',
    descripcion: 'Grid de miembros del equipo o asesores',
    categoria: 'content',
    icono: '👥',
    variantes: ['default', 'compact'],
    campos: [
      { key: 'titulo', label: 'Título', type: 'text', required: false },
      { key: 'subtitulo', label: 'Subtítulo', type: 'textarea', required: false },
    ],
    preview: 'team-grid-preview',
  },
};

