export type TipoPagina =
  | 'homepage'
  | 'listados_propiedades'
  | 'single_property'
  | 'blog'
  | 'articulo_single'
  | 'articulo_categoria'
  | 'contacto'
  | 'landing_page'
  | 'landing_proyecto'
  | 'landing_subpagina'
  | 'politicas_privacidad'
  | 'terminos_condiciones'
  | 'videos'
  | 'video_category'
  | 'video_single'
  | 'listado_asesores'
  | 'asesor_single'
  | 'testimonios'
  | 'testimonio_single'
  | 'testimonio_categoria'
  | 'custom';

export interface TipoPaginaInfo {
  codigo: TipoPagina;
  nombre: string;
  descripcion: string;
  esEstandar: boolean;
  requiereSlug: boolean;
  icono: string;
  color: string;
  // Nuevos campos del catálogo
  rutaPatron?: string;
  rutaPadre?: TipoPagina;
  nivel: number;
  esPlantilla: boolean;
  protegida: boolean;
  featureRequerido?: string;
  fuenteDatos?: string;
}

export interface PaginaWeb {
  id: string;
  tenantId: string;
  tipoPagina: TipoPagina;
  variante?: string;
  titulo: string;
  slug: string;
  descripcion?: string;
  contenido: Record<string, any>;
  meta: Record<string, any>;
  publica: boolean;
  activa: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

export const TIPOS_PAGINA: Record<TipoPagina, TipoPaginaInfo> = {
  // === PÁGINAS PROTEGIDAS (NIVEL 0) ===
  homepage: {
    codigo: 'homepage',
    nombre: 'Homepage',
    descripcion: 'Página principal del sitio web',
    esEstandar: true,
    requiereSlug: false,
    icono: '🏠',
    color: '#667eea',
    rutaPatron: '/',
    nivel: 0,
    esPlantilla: false,
    protegida: true,
  },
  listados_propiedades: {
    codigo: 'listados_propiedades',
    nombre: 'Listados de Propiedades',
    descripcion: 'Página que muestra el listado de todas las propiedades',
    esEstandar: true,
    requiereSlug: true,
    icono: '🏢',
    color: '#48bb78',
    rutaPatron: '/propiedades',
    nivel: 0,
    esPlantilla: false,
    protegida: true,
    fuenteDatos: 'propiedades',
  },
  single_property: {
    codigo: 'single_property',
    nombre: 'Propiedad Individual',
    descripcion: 'Plantilla dinámica para mostrar una propiedad específica',
    esEstandar: true,
    requiereSlug: false,
    icono: '🏘️',
    color: '#ed8936',
    rutaPatron: '/propiedades/:id',
    rutaPadre: 'listados_propiedades',
    nivel: 1,
    esPlantilla: true,
    protegida: true,
    fuenteDatos: 'propiedades',
  },
  contacto: {
    codigo: 'contacto',
    nombre: 'Contacto',
    descripcion: 'Página de contacto',
    esEstandar: true,
    requiereSlug: true,
    icono: '📧',
    color: '#4299e1',
    rutaPatron: '/contacto',
    nivel: 0,
    esPlantilla: false,
    protegida: true,
  },
  listado_asesores: {
    codigo: 'listado_asesores',
    nombre: 'Listado de Asesores',
    descripcion: 'Página que muestra el listado de todos los asesores',
    esEstandar: true,
    requiereSlug: true,
    icono: '👥',
    color: '#38a169',
    rutaPatron: '/asesores',
    nivel: 0,
    esPlantilla: false,
    protegida: true,
    fuenteDatos: 'mock_asesores',
  },
  asesor_single: {
    codigo: 'asesor_single',
    nombre: 'Asesor Individual',
    descripcion: 'Plantilla dinámica para mostrar cualquier asesor',
    esEstandar: true,
    requiereSlug: false,
    icono: '👤',
    color: '#2f855a',
    rutaPatron: '/asesores/:slug',
    rutaPadre: 'listado_asesores',
    nivel: 1,
    esPlantilla: true,
    protegida: true,
    fuenteDatos: 'mock_asesores',
  },

  // === BLOG ===
  blog: {
    codigo: 'blog',
    nombre: 'Blog',
    descripcion: 'Página de blog con listado de artículos',
    esEstandar: true,
    requiereSlug: true,
    icono: '📝',
    color: '#9f7aea',
    rutaPatron: '/blog',
    nivel: 0,
    esPlantilla: false,
    protegida: false,
    fuenteDatos: 'mock_articulos',
  },
  articulo_single: {
    codigo: 'articulo_single',
    nombre: 'Artículo Individual',
    descripcion: 'Plantilla para mostrar un artículo específico',
    esEstandar: true,
    requiereSlug: false,
    icono: '📄',
    color: '#805ad5',
    rutaPatron: '/blog/:slug',
    rutaPadre: 'blog',
    nivel: 1,
    esPlantilla: true,
    protegida: false,
    fuenteDatos: 'mock_articulos',
  },
  articulo_categoria: {
    codigo: 'articulo_categoria',
    nombre: 'Artículo por Categoría',
    descripcion: 'Plantilla para artículo con categoría (requiere feature)',
    esEstandar: true,
    requiereSlug: false,
    icono: '📂',
    color: '#6b46c1',
    rutaPatron: '/blog/:categoria/:slug',
    rutaPadre: 'blog',
    nivel: 2,
    esPlantilla: true,
    protegida: false,
    featureRequerido: 'rutas_profundas',
    fuenteDatos: 'mock_articulos',
  },

  // === VIDEOS ===
  videos: {
    codigo: 'videos',
    nombre: 'Videos',
    descripcion: 'Página principal de videos',
    esEstandar: true,
    requiereSlug: true,
    icono: '🎬',
    color: '#e53e3e',
    rutaPatron: '/videos',
    nivel: 0,
    esPlantilla: false,
    protegida: false,
    fuenteDatos: 'mock_videos',
  },
  video_single: {
    codigo: 'video_single',
    nombre: 'Video Individual',
    descripcion: 'Plantilla para mostrar un video específico',
    esEstandar: true,
    requiereSlug: false,
    icono: '▶️',
    color: '#c53030',
    rutaPatron: '/videos/:slug',
    rutaPadre: 'videos',
    nivel: 1,
    esPlantilla: true,
    protegida: false,
    fuenteDatos: 'mock_videos',
  },
  video_category: {
    codigo: 'video_category',
    nombre: 'Video por Categoría',
    descripcion: 'Plantilla para video con categoría (requiere feature)',
    esEstandar: true,
    requiereSlug: false,
    icono: '🎥',
    color: '#9b2c2c',
    rutaPatron: '/videos/:categoria/:slug',
    rutaPadre: 'videos',
    nivel: 2,
    esPlantilla: true,
    protegida: false,
    featureRequerido: 'rutas_profundas',
    fuenteDatos: 'mock_videos',
  },

  // === TESTIMONIOS ===
  testimonios: {
    codigo: 'testimonios',
    nombre: 'Testimonios',
    descripcion: 'Página de testimonios',
    esEstandar: true,
    requiereSlug: true,
    icono: '💬',
    color: '#319795',
    rutaPatron: '/testimonios',
    nivel: 0,
    esPlantilla: false,
    protegida: false,
    fuenteDatos: 'mock_testimonios',
  },
  testimonio_single: {
    codigo: 'testimonio_single',
    nombre: 'Testimonio Individual',
    descripcion: 'Plantilla para mostrar un testimonio específico',
    esEstandar: true,
    requiereSlug: false,
    icono: '💭',
    color: '#2c7a7b',
    rutaPatron: '/testimonios/:slug',
    rutaPadre: 'testimonios',
    nivel: 1,
    esPlantilla: true,
    protegida: false,
    fuenteDatos: 'mock_testimonios',
  },
  testimonio_categoria: {
    codigo: 'testimonio_categoria',
    nombre: 'Testimonio por Categoría',
    descripcion: 'Plantilla para testimonio con categoría (requiere feature)',
    esEstandar: true,
    requiereSlug: false,
    icono: '📁',
    color: '#234e52',
    rutaPatron: '/testimonios/:categoria/:slug',
    rutaPadre: 'testimonios',
    nivel: 2,
    esPlantilla: true,
    protegida: false,
    featureRequerido: 'rutas_profundas',
    fuenteDatos: 'mock_testimonios',
  },

  // === LANDING PAGES / PROYECTOS ===
  landing_page: {
    codigo: 'landing_page',
    nombre: 'Proyectos',
    descripcion: 'Página principal de proyectos/landing pages',
    esEstandar: true,
    requiereSlug: true,
    icono: '🚀',
    color: '#f56565',
    rutaPatron: '/proyectos',
    nivel: 0,
    esPlantilla: false,
    protegida: false,
  },
  landing_proyecto: {
    codigo: 'landing_proyecto',
    nombre: 'Proyecto Individual',
    descripcion: 'Plantilla para un proyecto específico',
    esEstandar: true,
    requiereSlug: false,
    icono: '📌',
    color: '#e53e3e',
    rutaPatron: '/proyectos/:slug',
    rutaPadre: 'landing_page',
    nivel: 1,
    esPlantilla: true,
    protegida: false,
  },
  landing_subpagina: {
    codigo: 'landing_subpagina',
    nombre: 'Subpágina de Proyecto',
    descripcion: 'Subpágina dentro de un proyecto (requiere feature)',
    esEstandar: true,
    requiereSlug: false,
    icono: '📎',
    color: '#c53030',
    rutaPatron: '/proyectos/:proyecto/:slug',
    rutaPadre: 'landing_proyecto',
    nivel: 2,
    esPlantilla: true,
    protegida: false,
    featureRequerido: 'rutas_profundas',
  },

  // === OTRAS PÁGINAS ===
  politicas_privacidad: {
    codigo: 'politicas_privacidad',
    nombre: 'Políticas de Privacidad',
    descripcion: 'Página de políticas de privacidad',
    esEstandar: true,
    requiereSlug: true,
    icono: '🔒',
    color: '#718096',
    rutaPatron: '/politicas-privacidad',
    nivel: 0,
    esPlantilla: false,
    protegida: false,
  },
  terminos_condiciones: {
    codigo: 'terminos_condiciones',
    nombre: 'Términos y Condiciones',
    descripcion: 'Página de términos y condiciones',
    esEstandar: true,
    requiereSlug: true,
    icono: '📄',
    color: '#4a5568',
    rutaPatron: '/terminos-condiciones',
    nivel: 0,
    esPlantilla: false,
    protegida: false,
  },
  custom: {
    codigo: 'custom',
    nombre: 'Página Personalizada',
    descripcion: 'Página personalizada creada por el usuario',
    esEstandar: false,
    requiereSlug: true,
    icono: '✨',
    color: '#805ad5',
    nivel: 0,
    esPlantilla: false,
    protegida: false,
  },
};

// Helpers para filtrar tipos de página
export const getTiposNivel0 = () =>
  Object.values(TIPOS_PAGINA).filter(t => t.nivel === 0 && !t.esPlantilla);

export const getTiposPlantilla = () =>
  Object.values(TIPOS_PAGINA).filter(t => t.esPlantilla);

export const getTiposProtegidos = () =>
  Object.values(TIPOS_PAGINA).filter(t => t.protegida);

export const getTiposSinFeature = () =>
  Object.values(TIPOS_PAGINA).filter(t => !t.featureRequerido);

export const getTiposConFeature = (feature: string) =>
  Object.values(TIPOS_PAGINA).filter(t => t.featureRequerido === feature);
