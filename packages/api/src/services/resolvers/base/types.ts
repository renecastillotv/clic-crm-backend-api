/**
 * Tipos base para el sistema de resolvers modulares
 *
 * Cada resolver puede exponer funciones para:
 * - Lista (getList)
 * - Single (getSingle)
 * - Relacionados (getRelated)
 * - Handler principal que orquesta todo (handle)
 */

// ============================================================================
// PARÁMETROS BASE
// ============================================================================

export interface BaseResolverParams {
  tenantId: string;
  idioma?: string;
  filters?: Record<string, any>;
  pagination?: PaginationParams;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SingleParams extends BaseResolverParams {
  id?: string;
  slug?: string;
}

// ============================================================================
// RESPUESTAS BASE
// ============================================================================

export interface ListResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

export interface SingleResponse<T> {
  item: T | null;
  related?: Record<string, any>;
}

export interface ResolverResult<T = any> {
  data: T;
  _meta?: {
    resolver: string;
    resolvedAt: string;
    cached?: boolean;
  };
}

// ============================================================================
// ENTIDADES BASE
// ============================================================================

export interface BaseEntity {
  id: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TranslatableEntity extends BaseEntity {
  traducciones?: Record<string, Record<string, string>>;
  slug_traducciones?: Record<string, string>;
}

export interface PublishableEntity extends TranslatableEntity {
  publicado?: boolean;
  destacado?: boolean;
  orden?: number;
}

// ============================================================================
// ASESORES
// ============================================================================

export interface Asesor extends PublishableEntity {
  slug: string;
  usuario_id: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  cargo: string;
  biografia?: string;
  email: string;
  telefono?: string;
  whatsapp?: string;
  foto_url?: string;
  video_presentacion_url?: string;
  especialidades?: string[];
  idiomas?: string[];
  zonas?: string[];
  tipos_propiedad?: string[];
  experiencia_anos?: number;
  rango?: string;
  fecha_inicio?: string;
  redes_sociales?: Record<string, string>;
  certificaciones?: string[];
  logros?: string[];
  stats?: AsesorStats;
  equipo?: {
    id: string;
    nombre: string;
    slug: string;
    zona?: string;
  };
  activo: boolean;
  visible_en_web: boolean;
  url: string;
}

export interface AsesorStats {
  propiedades_vendidas?: number;
  propiedades_activas?: number;
  volumen_ventas?: number;
  calificacion_promedio?: number;
  total_resenas?: number;
}

export interface AsesorConRelaciones extends Asesor {
  propiedades?: any[];
  testimonios?: any[];
  videos?: any[];
  articulos?: any[];
}

// ============================================================================
// TESTIMONIOS
// ============================================================================

export interface Testimonio extends PublishableEntity {
  slug: string;
  cliente_nombre: string;
  cliente_cargo?: string;
  cliente_empresa?: string;
  cliente_foto?: string;
  cliente_ubicacion?: string;
  titulo?: string;
  contenido: string;
  rating?: number;
  propiedad_id?: string;
  asesor_id?: string;
  categoria_id?: string;
  categoria_slug?: string;
  categoria_nombre?: string;
  verificado?: boolean;
  fuente?: string;
  fecha?: string;
  url: string;
}

export interface TestimonioConRelaciones extends Testimonio {
  propiedad?: any;
  asesor?: Asesor;
  relacionados?: Testimonio[];
}

// ============================================================================
// VIDEOS
// ============================================================================

export interface Video extends PublishableEntity {
  slug: string;
  titulo: string;
  descripcion?: string;
  video_url: string;
  video_id?: string;
  thumbnail?: string;
  duracion_segundos?: number;
  categoria_id?: string;
  categoria_slug?: string;
  categoria_nombre?: string;
  autor_id?: string;
  tags?: string[];
  vistas?: number;
  fecha_publicacion?: string;
  url?: string | null;
  // Campos adicionales para compatibilidad con edge functions
  title?: string;
  description?: string;
  videoId?: string;
  videoSlug?: string;
  duration?: string;
  category?: string;
  views?: number;
  publishedAt?: string;
  featured?: boolean;
}

export interface VideoConRelaciones extends Video {
  categoria?: Categoria;
  relacionados?: Video[];
}

// ============================================================================
// ARTÍCULOS
// ============================================================================

export interface Articulo extends PublishableEntity {
  slug: string;
  titulo: string;
  extracto?: string;
  contenido?: string;
  imagen_principal?: string;
  imagenes?: string[];
  autor_id?: string;
  autor_nombre?: string;
  autor_foto?: string;
  categoria_id?: string;
  categoria_slug?: string;
  categoria_nombre?: string;
  meta_titulo?: string;
  meta_descripcion?: string;
  tags?: string[];
  vistas?: number;
  fecha_publicacion?: string;
  url: string;
}

export interface ArticuloConRelaciones extends Articulo {
  categoria?: Categoria;
  autor?: Asesor;
  relacionados?: Articulo[];
}

// ============================================================================
// PROPIEDADES
// ============================================================================

export interface Propiedad extends PublishableEntity {
  slug: string;
  codigo?: string;
  titulo: string;
  descripcion?: string;
  descripcion_corta?: string;
  tipo: string;
  operacion: string;
  precio: number;
  precio_anterior?: number;
  moneda?: string;
  // Ubicación
  pais?: string;
  provincia?: string;
  ciudad?: string;
  sector?: string;
  direccion?: string;
  ubicacion?: string;
  latitud?: number;
  longitud?: number;
  // Características
  habitaciones?: number;
  banos?: number;
  medios_banos?: number;
  estacionamientos?: number;
  m2_construccion?: number;
  m2_terreno?: number;
  antiguedad?: number;
  pisos?: number;
  amenidades?: string[];
  caracteristicas?: Record<string, any>;
  // Imágenes
  imagen_principal?: string;
  imagenes?: string[];
  video_url?: string;
  tour_virtual_url?: string;
  // Estado
  estado_propiedad?: string;
  exclusiva?: boolean;
  // Relaciones
  agente_id?: string;
  perfil_asesor_id?: string;
  propietario_id?: string;
  url: string;
}

export interface PropiedadConRelaciones extends Propiedad {
  asesor?: Asesor;
  similares?: Propiedad[];
}

// ============================================================================
// CATEGORÍAS
// ============================================================================

export interface Categoria extends PublishableEntity {
  slug: string;
  nombre: string;
  descripcion?: string;
  tipo: 'video' | 'articulo' | 'testimonio' | 'faq';
  icono?: string;
  color?: string;
  total_items?: number;
}

// ============================================================================
// FAQs
// ============================================================================

export interface FAQ extends PublishableEntity {
  slug?: string;
  pregunta: string;
  respuesta: string;
  contexto?: string;
  categoria_id?: string;
  categoria_slug?: string;
  categoria_nombre?: string;
  vistas?: number;
}

// ============================================================================
// UBICACIONES
// ============================================================================

export interface Ubicacion extends BaseEntity {
  nombre: string;
  slug: string;
  tipo: 'pais' | 'provincia' | 'ciudad' | 'sector';
  parent_id?: string;
  codigo?: string;
  latitud?: number;
  longitud?: number;
  total_propiedades?: number;
  imagen_url?: string;
  descripcion?: string;
}
