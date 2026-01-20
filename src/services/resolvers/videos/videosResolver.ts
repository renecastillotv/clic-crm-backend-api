/**
 * Videos Resolver
 *
 * Resolver modular para videos.
 * Replica la estructura de datos de las edge functions de referencia
 * (videos-handler.ts de pa.clicinmobiliaria.com)
 *
 * Funciones disponibles:
 * - getVideosList: Lista de videos
 * - getVideoSingle: Video individual por ID o slug
 * - getVideosCategorias: Categorías de videos
 * - getVideosPorCategoria: Videos filtrados por categoría
 * - getVideosRelacionados: Videos similares
 * - handleVideos: Handler principal que orquesta todo
 */

import {
  query,
  parseArrayField,
  parseObjectField,
  calculateOffset,
  applyTranslations,
  logResolver,
  buildEntityUrl,
  normalizeLanguage,
  buildSlugSearchCondition,
} from '../base/utils.js';

import type {
  BaseResolverParams,
  SingleParams,
  Video,
  VideoConRelaciones,
  Categoria,
} from '../base/types.js';

// ============================================================================
// TIPOS ESPECÍFICOS
// ============================================================================

export interface VideosListParams extends BaseResolverParams {
  filters?: {
    publicado?: boolean;
    destacado?: boolean;
    categoria_id?: string;
    categoria_slug?: string;
    autor_id?: string;
    exclude_id?: string;
  };
}

export interface VideoSingleParams extends SingleParams {
  includeRelated?: boolean;
}

// ============================================================================
// QUERIES BASE
// ============================================================================

const BASE_SELECT = `
  v.id, v.slug, v.slug_traducciones, v.titulo, v.descripcion, v.video_url, v.video_id, v.thumbnail,
  v.duracion_segundos, v.categoria_id, v.autor_id, v.tags, v.traducciones,
  v.publicado, v.destacado, v.vistas, v.fecha_publicacion, v.orden,
  c.slug as categoria_slug,
  c.nombre as categoria_nombre,
  c.slug_traducciones as categoria_slug_traducciones
`;

const BASE_FROM = `
  FROM videos v
  LEFT JOIN categorias_contenido c ON v.categoria_id = c.id
`;

// ============================================================================
// FUNCIONES AUXILIARES - Procesamiento multilingüe compatible con edge functions
// ============================================================================

/**
 * Procesa contenido multilingüe de forma segura (compatible con edge functions)
 */
function processMultilingualContent(item: any, idioma: string): Record<string, any> {
  let processed: Record<string, any> = {};

  if (idioma === 'en' && item.traducciones?.en) {
    const contentEn = typeof item.traducciones.en === 'string'
      ? JSON.parse(item.traducciones.en)
      : item.traducciones.en;
    processed = { ...contentEn };
  } else if (idioma === 'fr' && item.traducciones?.fr) {
    const contentFr = typeof item.traducciones.fr === 'string'
      ? JSON.parse(item.traducciones.fr)
      : item.traducciones.fr;
    processed = { ...contentFr };
  }

  return processed;
}

/**
 * Obtiene el nombre de categoría según idioma
 */
function getCategoryDisplayName(categoria: any, idioma: string): string {
  if (!categoria) return 'General';

  const traducciones = parseObjectField(categoria.traducciones || categoria.slug_traducciones);

  if (idioma === 'en' && traducciones.en?.nombre) {
    return traducciones.en.nombre;
  }
  if (idioma === 'fr' && traducciones.fr?.nombre) {
    return traducciones.fr.nombre;
  }

  return categoria.nombre || categoria.categoria_nombre || 'General';
}

/**
 * Construye URL de video según idioma (compatible con edge functions)
 */
function buildVideoUrl(video: any, idioma: string, trackingString: string = ''): string | null {
  const slugTraducciones = parseObjectField(video.slug_traducciones);

  let slug = video.slug;
  if (idioma === 'en' && slugTraducciones.en) {
    slug = slugTraducciones.en;
  } else if (idioma === 'fr' && slugTraducciones.fr) {
    slug = slugTraducciones.fr;
  }

  if (!slug) return null;

  let url = slug;
  if (idioma !== 'es') {
    url = `${idioma}/${slug}`;
  }

  return `/${url}${trackingString}`;
}

/**
 * Mapea un row de la BD a un objeto Video normalizado
 * Formato compatible con edge functions de referencia
 */
function mapRowToVideo(row: any, idioma: string = 'es', trackingString: string = ''): Video {
  const traducciones = parseObjectField(row.traducciones);
  const categoriaSlugTraducciones = parseObjectField(row.categoria_slug_traducciones);

  // Procesar contenido multilingüe
  const multilingualContent = processMultilingualContent(row, idioma);

  // Título y descripción traducidos
  const titulo = multilingualContent.titulo || row.titulo || '';
  const descripcion = multilingualContent.descripcion || row.descripcion || '';

  // Construir URL traducida
  const url = buildVideoUrl(row, idioma, trackingString);

  // Nombre de categoría según idioma
  const categoryName = getCategoryDisplayName(
    { nombre: row.categoria_nombre, slug_traducciones: categoriaSlugTraducciones },
    idioma
  );

  // Slug de categoría según idioma
  let categoriaSlug = row.categoria_slug || 'general';
  if (idioma !== 'es' && categoriaSlugTraducciones[idioma]) {
    categoriaSlug = categoriaSlugTraducciones[idioma];
  }

  // Formato compatible con edge functions (videos-handler.ts)
  return {
    id: row.id,
    slug: row.slug,
    slug_traducciones: parseObjectField(row.slug_traducciones),
    // Campos display (formato edge functions)
    title: titulo,
    description: descripcion,
    // Campos originales
    titulo,
    descripcion,
    // Video data
    video_url: row.video_url,
    video_id: row.video_id,
    videoId: row.video_id,
    videoSlug: row.slug,
    thumbnail: row.thumbnail,
    duration: formatDuration(row.duracion_segundos),
    duracion_segundos: row.duracion_segundos,
    // Categoría
    categoria_id: row.categoria_id,
    categoria_slug: categoriaSlug,
    categoria_nombre: categoryName,
    category: categoryName,
    // Autor
    autor_id: row.autor_id,
    // Metadata
    tags: parseArrayField(row.tags),
    vistas: row.vistas || 0,
    views: row.vistas || 0,
    fecha_publicacion: row.fecha_publicacion,
    publishedAt: row.fecha_publicacion,
    publicado: row.publicado,
    destacado: row.destacado,
    featured: row.destacado || false,
    orden: row.orden,
    // URL
    url,
    traducciones,
  };
}

/**
 * Formatea duración de segundos a formato mm:ss o hh:mm:ss
 */
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || isNaN(seconds)) return '10:00';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene lista de videos
 */
export async function getVideosList(params: VideosListParams): Promise<Video[]> {
  const { tenantId, filters, pagination, idioma = 'es' } = params;
  const { limit, offset } = calculateOffset(pagination);
  const normalizedIdioma = normalizeLanguage(idioma);

  logResolver('🎥', 'VideosResolver', 'getVideosList', { tenantId, limit });

  try {
    let sql = `SELECT ${BASE_SELECT} ${BASE_FROM} WHERE v.tenant_id = $1`;
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    // Filtros
    if (filters?.publicado !== false) {
      sql += ' AND v.publicado = true';
    }

    if (filters?.destacado !== undefined) {
      sql += ` AND v.destacado = $${paramIndex++}`;
      queryParams.push(filters.destacado);
    }

    if (filters?.categoria_id) {
      sql += ` AND v.categoria_id = $${paramIndex++}`;
      queryParams.push(filters.categoria_id);
    }

    if (filters?.categoria_slug) {
      sql += ` AND c.slug = $${paramIndex++}`;
      queryParams.push(filters.categoria_slug);
    }

    if (filters?.autor_id) {
      sql += ` AND v.autor_id = $${paramIndex++}`;
      queryParams.push(filters.autor_id);
    }

    if (filters?.exclude_id) {
      sql += ` AND v.id != $${paramIndex++}`;
      queryParams.push(filters.exclude_id);
    }

    sql += ` ORDER BY v.orden ASC, v.fecha_publicacion DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);

    const videos = result.rows.map((row: any) => mapRowToVideo(row, normalizedIdioma));
    logResolver('✅', 'VideosResolver', `Lista resuelta: ${videos.length} videos`);

    return videos;
  } catch (error: any) {
    logResolver('❌', 'VideosResolver', `Error en getVideosList: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene un video por ID o slug
 */
export async function getVideoSingle(params: VideoSingleParams): Promise<Video | null> {
  const { tenantId, id, slug, filters, idioma = 'es' } = params;
  const searchValue = id || slug || filters?.slug || filters?.id;
  const normalizedIdioma = normalizeLanguage(idioma);

  if (!searchValue) {
    return null;
  }

  logResolver('🎥', 'VideosResolver', 'getVideoSingle', { tenantId, searchValue });

  try {
    const slugCondition = buildSlugSearchCondition('v.slug', '$1', normalizedIdioma);

    const sql = `
      SELECT ${BASE_SELECT}
      ${BASE_FROM}
      WHERE v.tenant_id = $2 AND v.publicado = true AND (v.id::text = $1 OR ${slugCondition})
      LIMIT 1
    `;

    const result = await query(sql, [searchValue, tenantId]);

    if (result.rows.length === 0) {
      logResolver('⚠️', 'VideosResolver', `Video no encontrado: ${searchValue}`);
      return null;
    }

    const video = mapRowToVideo(result.rows[0], normalizedIdioma);
    logResolver('✅', 'VideosResolver', `Video encontrado: ${video.titulo}`);

    return video;
  } catch (error: any) {
    logResolver('❌', 'VideosResolver', `Error en getVideoSingle: ${error.message}`);
    return null;
  }
}

/**
 * Obtiene categorías de videos
 */
export async function getVideosCategorias(params: BaseResolverParams): Promise<Categoria[]> {
  const { tenantId, idioma = 'es' } = params;
  const normalizedIdioma = normalizeLanguage(idioma);

  logResolver('📂', 'VideosResolver', 'getVideosCategorias', { tenantId });

  try {
    const sql = `
      SELECT
        c.id, c.nombre, c.slug, c.slug_traducciones, c.descripcion, c.icono, c.color, c.orden,
        c.traducciones, c.activa,
        COALESCE(counts.total, 0)::integer as total_items
      FROM categorias_contenido c
      LEFT JOIN (
        SELECT categoria_id, COUNT(*) as total
        FROM videos
        WHERE tenant_id = $1 AND publicado = true
        GROUP BY categoria_id
      ) counts ON counts.categoria_id = c.id
      WHERE c.tenant_id = $1 AND c.tipo = 'video' AND c.activa = true
      ORDER BY c.orden ASC, c.nombre ASC
    `;

    const result = await query(sql, [tenantId]);

    const categorias = result.rows.map((row: any) => {
      const rowTraducido = applyTranslations(row, 'categorias_contenido', normalizedIdioma);
      const slugTraducciones = parseObjectField(row.slug_traducciones);

      // Obtener slug según idioma
      let slug = row.slug;
      if (normalizedIdioma !== 'es' && slugTraducciones[normalizedIdioma]) {
        slug = slugTraducciones[normalizedIdioma];
      }

      return {
        ...row,
        name: rowTraducido.nombre,
        nombre: rowTraducido.nombre,
        descripcion: rowTraducido.descripcion,
        slug,
        slug_traducciones: slugTraducciones,
        tipo: 'video' as const,
        url: `/videos/${slug}`,
        videoCount: row.total_items || 0,
      };
    });

    logResolver('✅', 'VideosResolver', `Categorías resueltas: ${categorias.length}`);
    return categorias;
  } catch (error: any) {
    logResolver('❌', 'VideosResolver', `Error en getVideosCategorias: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene videos filtrados por categoría con info de la categoría
 */
export async function getVideosPorCategoria(
  params: VideosListParams & { categoriaSlug: string }
): Promise<{ categoria: Categoria | null; items: Video[] }> {
  const { tenantId, categoriaSlug, idioma = 'es', pagination } = params;
  const normalizedIdioma = normalizeLanguage(idioma);

  logResolver('📂', 'VideosResolver', 'getVideosPorCategoria', { tenantId, categoriaSlug });

  // 1. Obtener información de la categoría
  let categoria: Categoria | null = null;
  try {
    const slugCondition = buildSlugSearchCondition('slug', '$3', normalizedIdioma);

    const catResult = await query(
      `SELECT id, nombre, slug, slug_traducciones, descripcion, traducciones, icono, color, orden
       FROM categorias_contenido
       WHERE tenant_id = $1 AND tipo = $2 AND ${slugCondition} AND activa = true
       LIMIT 1`,
      [tenantId, 'video', categoriaSlug]
    );

    if (catResult.rows.length > 0) {
      const row = catResult.rows[0];
      const rowTraducido = applyTranslations(row, 'categorias_contenido', normalizedIdioma);
      categoria = {
        ...row,
        name: rowTraducido.nombre,
        nombre: rowTraducido.nombre,
        descripcion: rowTraducido.descripcion,
        slug_traducciones: parseObjectField(row.slug_traducciones),
        tipo: 'video' as const,
      };
    }
  } catch (error: any) {
    logResolver('⚠️', 'VideosResolver', `Error obteniendo categoría: ${error.message}`);
  }

  // 2. Obtener videos de la categoría
  const items = await getVideosList({
    ...params,
    filters: {
      ...params.filters,
      categoria_id: categoria?.id,
    },
  });

  return { categoria, items };
}

/**
 * Obtiene videos relacionados (misma categoría, excluyendo el actual)
 */
export async function getVideosRelacionados(
  params: BaseResolverParams & { videoId: string; categoriaId?: string }
): Promise<Video[]> {
  const { tenantId, videoId, categoriaId, idioma = 'es' } = params;

  logResolver('🔗', 'VideosResolver', 'getVideosRelacionados', { tenantId, videoId });

  return getVideosList({
    tenantId,
    idioma,
    filters: {
      categoria_id: categoriaId,
      exclude_id: videoId,
    },
    pagination: { limit: 6 },
  });
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

export interface HandleVideosParams extends BaseResolverParams {
  slug?: string;
  id?: string;
  categoriaSlug?: string;
  includeRelated?: boolean;
  trackingString?: string;
}

export interface HandleVideosResult {
  // Metadata de tipo de página (compatible con edge functions)
  type?: string;
  pageType?: string;
  // Para listado principal
  featuredVideos?: Video[];
  recentVideos?: Video[];
  items?: Video[];
  // Para categorías
  categorias?: Categoria[];
  categories?: Categoria[];
  categoria?: Categoria | null;
  category?: Categoria | null;
  // Para single
  video?: VideoConRelaciones | null;
  // Datos relacionados
  relacionados?: Video[];
  relatedVideos?: Video[];
  // SEO
  seo?: {
    title: string;
    description: string;
    h1?: string;
    h2?: string;
    canonical_url?: string;
    breadcrumbs?: Array<{ name: string; url: string }>;
  };
  // Stats
  stats?: {
    totalVideos: number;
    totalCategories: number;
    totalViews: number;
  };
}

/**
 * Handler principal que orquesta las llamadas según el contexto
 * Formato de respuesta compatible con edge functions de referencia
 *
 * - Si hay slug/id: devuelve single con relaciones
 * - Si hay categoriaSlug: devuelve videos de esa categoría
 * - Si no hay parámetros: devuelve lista general con categorías
 */
export async function handleVideos(params: HandleVideosParams): Promise<HandleVideosResult> {
  const { slug, id, categoriaSlug, filters, includeRelated = true, idioma = 'es' } = params;
  const searchValue = slug || id || filters?.slug || filters?.id;

  // Si hay un identificador de video, resolver single con relaciones
  if (searchValue) {
    const video = await getVideoSingle({
      ...params,
      slug: searchValue,
    });

    if (!video) {
      return {
        type: 'videos-single-404',
        pageType: 'videos-single-404',
        video: null,
      };
    }

    // Si se solicitan relaciones, obtenerlas
    if (includeRelated) {
      const relacionados = await getVideosRelacionados({
        tenantId: params.tenantId,
        videoId: video.id,
        categoriaId: video.categoria_id,
        idioma: params.idioma,
      });

      return {
        type: 'videos-single',
        pageType: 'videos-single',
        video: {
          ...video,
          relacionados,
        },
        relacionados,
        relatedVideos: relacionados,
        seo: {
          title: `${video.titulo} | Videos`,
          description: video.descripcion?.substring(0, 160) || '',
          h1: video.titulo,
          h2: video.categoria_nombre || 'Videos',
        },
      };
    }

    return {
      type: 'videos-single',
      pageType: 'videos-single',
      video,
    };
  }

  // Si hay categoriaSlug, devolver videos de esa categoría
  if (categoriaSlug) {
    const { categoria, items } = await getVideosPorCategoria({
      ...params,
      categoriaSlug,
    });

    return {
      type: 'videos-category',
      pageType: 'videos-category',
      categoria,
      category: categoria,
      items,
      seo: {
        title: `${categoria?.nombre || categoriaSlug} - Videos`,
        description: categoria?.descripcion || `Videos de ${categoria?.nombre || categoriaSlug}`,
        h1: `${categoria?.nombre || categoriaSlug} - Videos`,
      },
      stats: {
        totalVideos: items.length,
        totalCategories: 1,
        totalViews: items.reduce((sum, v) => sum + (v.vistas || 0), 0),
      },
    };
  }

  // Sin identificador, devolver lista general (formato edge functions)
  const [items, categorias] = await Promise.all([
    getVideosList({
      ...params,
      pagination: params.pagination || { limit: 12 },
    }),
    getVideosCategorias(params),
  ]);

  // Separar destacados y recientes (formato edge functions)
  const featuredVideos = items.filter(v => v.destacado).slice(0, 6);
  const recentVideos = items.slice(0, 12);

  return {
    type: 'videos-main',
    pageType: 'videos-main',
    items,
    featuredVideos,
    recentVideos,
    categorias,
    categories: categorias,
    seo: {
      title: idioma === 'en'
        ? 'Real Estate Videos & Property Tours'
        : idioma === 'fr'
          ? 'Vidéos Immobilières & Visites de Propriétés'
          : 'Videos Inmobiliarios y Tours de Propiedades',
      description: idioma === 'en'
        ? 'Watch exclusive real estate videos, property tours, and expert insights.'
        : idioma === 'fr'
          ? 'Regardez des vidéos immobilières exclusives, visites de propriétés et insights d\'experts.'
          : 'Mira videos inmobiliarios exclusivos, tours de propiedades e insights expertos.',
      h1: idioma === 'en'
        ? 'Real Estate Videos & Property Tours'
        : idioma === 'fr'
          ? 'Vidéos Immobilières & Visites de Propriétés'
          : 'Videos Inmobiliarios y Tours de Propiedades',
    },
    stats: {
      totalVideos: items.length,
      totalCategories: categorias.length,
      totalViews: items.reduce((sum, v) => sum + (v.vistas || 0), 0),
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getVideosList,
  getVideoSingle,
  getVideosCategorias,
  getVideosPorCategoria,
  getVideosRelacionados,
  handleVideos,
};
