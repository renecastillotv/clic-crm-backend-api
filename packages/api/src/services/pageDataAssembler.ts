/**
 * PageDataAssembler - Sistema Unificado de Datos
 *
 * Este módulo implementa el patrón de resolvers modulares donde:
 * 1. Cada recurso (asesores, testimonios, videos, etc.) tiene su propio resolver
 * 2. Los handlers orquestan las llamadas según el contexto (lista, single, categoría)
 * 3. El assembler proporciona una interfaz unificada para obtener datos
 *
 * Beneficios:
 * - UN SOLO sistema (sin duplicación de código)
 * - Resolvers modulares e independientes
 * - Formato compatible con edge functions de referencia (pa.clicinmobiliaria.com)
 * - Fácil de mantener y extender
 *
 * Formato de respuesta compatible con:
 * - homepage-handler.ts
 * - testimonials-handler.ts
 * - videos-handler.ts
 * - single-property-handler.ts
 */

// Importar SOLO los nuevos resolvers modulares (sin dynamicDataService)
import resolvers, {
  handleAsesores,
  handleTestimonios,
  handleVideos,
  handleArticulos,
  handlePropiedades,
} from './resolvers/index.js';

import type { BaseResolverParams } from './resolvers/base/types.js';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Contexto que recibe el assembler para resolver datos
 */
export interface AssemblerContext {
  tenantId: string;
  tipoPagina: string;
  slug?: string;
  id?: string;
  categoriaSlug?: string;
  idioma?: string;
  filters?: Record<string, any>;
  pagination?: { page?: number; limit?: number };
  queryParams?: Record<string, any>;
  includeRelated?: boolean;
  trackingString?: string;
}

/**
 * Resultado del assembler
 */
export interface AssembledPageData {
  /** Tipo de página */
  type?: string;
  pageType?: string;
  /** Datos principales */
  [key: string]: any;
  /** Metadata del ensamblaje */
  _meta?: {
    tipoPagina: string;
    resolvedAt: string;
    resolver: string;
  };
}

// ============================================================================
// TIPO DE RECURSO
// ============================================================================

export type ResourceType = 'asesores' | 'testimonios' | 'videos' | 'articulos' | 'propiedades';

// ============================================================================
// MAPEO DE TIPOS DE PÁGINA A HANDLERS
// ============================================================================

/**
 * Mapeo de códigos de página a recursos y parámetros
 */
interface PageMapping {
  resource: ResourceType;
  extractParams: (ctx: AssemblerContext) => any;
}

const PAGE_MAPPINGS: Record<string, PageMapping> = {
  // ========================================
  // VIDEOS
  // ========================================
  'videos': {
    resource: 'videos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'videos_listado': {
    resource: 'videos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'videos_categoria': {
    resource: 'videos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      categoriaSlug: ctx.categoriaSlug,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'categoria_videos': {
    resource: 'videos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      categoriaSlug: ctx.categoriaSlug,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'videos_single': {
    resource: 'videos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      slug: ctx.slug,
      includeRelated: ctx.includeRelated !== false,
    }),
  },
  'video_single': {
    resource: 'videos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      slug: ctx.slug,
      includeRelated: ctx.includeRelated !== false,
    }),
  },

  // ========================================
  // ARTÍCULOS
  // ========================================
  'articulos': {
    resource: 'articulos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'articulos_listado': {
    resource: 'articulos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'articulos_categoria': {
    resource: 'articulos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      categoriaSlug: ctx.categoriaSlug,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'categoria_articulos': {
    resource: 'articulos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      categoriaSlug: ctx.categoriaSlug,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'articulos_single': {
    resource: 'articulos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      slug: ctx.slug,
      includeRelated: ctx.includeRelated !== false,
    }),
  },
  'articulo_single': {
    resource: 'articulos',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      slug: ctx.slug,
      includeRelated: ctx.includeRelated !== false,
    }),
  },

  // ========================================
  // TESTIMONIOS
  // ========================================
  'testimonios': {
    resource: 'testimonios',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'testimonios_listado': {
    resource: 'testimonios',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'testimonios_categoria': {
    resource: 'testimonios',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      categoriaSlug: ctx.categoriaSlug,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'categoria_testimonios': {
    resource: 'testimonios',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      categoriaSlug: ctx.categoriaSlug,
      pagination: ctx.pagination || { limit: 12 },
    }),
  },
  'testimonios_single': {
    resource: 'testimonios',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      slug: ctx.slug,
      includeRelated: ctx.includeRelated !== false,
    }),
  },
  'testimonio_single': {
    resource: 'testimonios',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      slug: ctx.slug,
      includeRelated: ctx.includeRelated !== false,
    }),
  },

  // ========================================
  // ASESORES
  // ========================================
  'asesores': {
    resource: 'asesores',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      filters: ctx.filters,
      pagination: ctx.pagination || { limit: 20 },
    }),
  },
  'listado_asesores': {
    resource: 'asesores',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      filters: ctx.filters,
      pagination: ctx.pagination || { limit: 20 },
    }),
  },
  'equipo': {
    resource: 'asesores',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      filters: ctx.filters,
      pagination: ctx.pagination || { limit: 20 },
    }),
  },
  'asesor_single': {
    resource: 'asesores',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      slug: ctx.slug,
      includeRelated: ctx.includeRelated !== false,
    }),
  },

  // ========================================
  // PROPIEDADES
  // ========================================
  'propiedades': {
    resource: 'propiedades',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      filters: ctx.filters,
      pagination: ctx.pagination || { limit: 20 },
    }),
  },
  'propiedades_listado': {
    resource: 'propiedades',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      filters: ctx.filters,
      pagination: ctx.pagination || { limit: 20 },
    }),
  },
  'propiedades_single': {
    resource: 'propiedades',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      slug: ctx.slug,
      includeRelated: ctx.includeRelated !== false,
    }),
  },
  'propiedad_single': {
    resource: 'propiedades',
    extractParams: (ctx) => ({
      tenantId: ctx.tenantId,
      idioma: ctx.idioma,
      slug: ctx.slug,
      includeRelated: ctx.includeRelated !== false,
    }),
  },
};

// ============================================================================
// ASSEMBLER PRINCIPAL
// ============================================================================

/**
 * Ensambla datos para un tipo de página usando los resolvers modulares
 */
export async function assemblePageData(context: AssemblerContext): Promise<AssembledPageData> {
  const { tipoPagina, tenantId, idioma = 'es' } = context;

  console.log(`🍽️ [PageDataAssembler] Ensamblando datos para: ${tipoPagina}`);

  // Buscar mapeo directo
  let mapping = PAGE_MAPPINGS[tipoPagina];

  // Si es homepage, usar el handler especializado
  if (tipoPagina === 'homepage' || tipoPagina === 'home' || tipoPagina === 'inicio') {
    return handleHomepage({
      tenantId,
      idioma,
      trackingString: context.trackingString || '',
    });
  }

  if (!mapping) {
    console.warn(`⚠️ [PageDataAssembler] No hay mapeo para: ${tipoPagina}`);
    return {
      type: tipoPagina,
      pageType: tipoPagina,
      _meta: {
        tipoPagina,
        resolvedAt: new Date().toISOString(),
        resolver: 'none',
      },
    };
  }

  const params = mapping.extractParams(context);

  try {
    const result = await resolveResource(mapping.resource, params);

    console.log(`✅ [PageDataAssembler] Datos resueltos para: ${tipoPagina}`);

    return {
      ...result,
      _meta: {
        tipoPagina,
        resolvedAt: new Date().toISOString(),
        resolver: mapping.resource,
      },
    };
  } catch (error: any) {
    console.error(`❌ [PageDataAssembler] Error resolviendo ${tipoPagina}:`, error.message);
    return {
      type: `${tipoPagina}-error`,
      pageType: `${tipoPagina}-error`,
      error: error.message,
      _meta: {
        tipoPagina,
        resolvedAt: new Date().toISOString(),
        resolver: mapping.resource,
      },
    };
  }
}

/**
 * Ensambla datos usando el código de página directamente
 */
export async function assemblePageDataByCode(
  pageCode: string,
  context: Omit<AssemblerContext, 'tipoPagina'>
): Promise<AssembledPageData> {
  return assemblePageData({
    ...context,
    tipoPagina: pageCode,
  });
}

// ============================================================================
// RESOLVER PRINCIPAL DE RECURSOS
// ============================================================================

/**
 * Parámetros para resolver un recurso
 */
export interface ModularResolverParams extends BaseResolverParams {
  slug?: string;
  id?: string;
  categoriaSlug?: string;
  includeRelated?: boolean;
  trackingString?: string;
}

/**
 * Resuelve un recurso usando los resolvers modulares
 *
 * @example
 * // Lista de videos
 * const result = await resolveResource('videos', { tenantId: 'clic' });
 *
 * // Video single
 * const result = await resolveResource('videos', { tenantId: 'clic', slug: 'mi-video' });
 *
 * // Videos por categoría
 * const result = await resolveResource('videos', { tenantId: 'clic', categoriaSlug: 'tutoriales' });
 */
export async function resolveResource(
  type: ResourceType,
  params: ModularResolverParams
): Promise<any> {
  console.log(`🔧 [Resolver] ${type} ->`, {
    tenantId: params.tenantId,
    slug: params.slug,
    categoriaSlug: params.categoriaSlug,
  });

  switch (type) {
    case 'asesores':
      return handleAsesores(params);

    case 'testimonios':
      return handleTestimonios(params);

    case 'videos':
      return handleVideos(params);

    case 'articulos':
      return handleArticulos(params);

    case 'propiedades':
      return handlePropiedades(params);

    default:
      throw new Error(`Tipo de recurso no soportado: ${type}`);
  }
}

/**
 * Resuelve múltiples recursos en paralelo
 *
 * @example
 * const data = await resolveMultipleResources([
 *   { type: 'videos', key: 'videos', params: { tenantId: 'clic' } },
 *   { type: 'testimonios', key: 'testimonios', params: { tenantId: 'clic' } },
 *   { type: 'asesores', key: 'equipo', params: { tenantId: 'clic', filters: { destacado: true } } },
 * ]);
 */
export async function resolveMultipleResources(
  requests: Array<{ type: ResourceType; key: string; params: ModularResolverParams }>
): Promise<Record<string, any>> {
  console.log(`🔧 [Resolver] Resolviendo ${requests.length} recursos en paralelo`);

  const results = await Promise.allSettled(
    requests.map(({ type, params }) => resolveResource(type, params))
  );

  const output: Record<string, any> = {};

  results.forEach((result, index) => {
    const key = requests[index].key;
    if (result.status === 'fulfilled') {
      output[key] = result.value;
      console.log(`   ✅ ${key}: OK`);
    } else {
      console.error(`   ❌ ${key}: ${result.reason}`);
      output[key] = null;
    }
  });

  return output;
}

// ============================================================================
// HOMEPAGE HANDLER ESPECIALIZADO
// ============================================================================

/**
 * Handler especializado para homepage que obtiene todos los datos necesarios
 * Formato compatible con homepage-handler.ts de las edge functions
 */
export async function handleHomepage(params: ModularResolverParams): Promise<AssembledPageData> {
  const { tenantId, idioma = 'es', trackingString = '' } = params;

  console.log(`🏠 [Homepage] Ensamblando datos para homepage`);

  try {
    // Obtener todos los datos en paralelo
    const results = await resolveMultipleResources([
      {
        type: 'propiedades',
        key: 'propiedades',
        params: {
          tenantId,
          idioma,
          filters: { destacada: true },
          pagination: { limit: 12 },
        },
      },
      {
        type: 'videos',
        key: 'videos',
        params: {
          tenantId,
          idioma,
          pagination: { limit: 8 },
        },
      },
      {
        type: 'testimonios',
        key: 'testimonios',
        params: {
          tenantId,
          idioma,
          filters: { destacado: true },
          pagination: { limit: 6 },
        },
      },
      {
        type: 'asesores',
        key: 'asesores',
        params: {
          tenantId,
          idioma,
          filters: { destacado: true },
          pagination: { limit: 6 },
        },
      },
      {
        type: 'articulos',
        key: 'articulos',
        params: {
          tenantId,
          idioma,
          pagination: { limit: 8 },
        },
      },
    ]);

    // Procesar propiedades
    const featuredProperties = results.propiedades?.items || [];
    const recentProperties = results.propiedades?.items?.slice(0, 12) || [];

    // Procesar contenido
    const featuredVideos = results.videos?.featuredVideos || results.videos?.items || [];
    const featuredTestimonials = results.testimonios?.featuredTestimonios || results.testimonios?.items || [];
    const advisors = results.asesores?.items || [];
    const articles = results.articulos?.items || [];

    // Construir secciones (formato compatible con homepage-handler.ts)
    const sections = [];

    // Hero section
    sections.push({
      id: 'hero',
      type: 'hero',
      title: idioma === 'en'
        ? 'Find Your Dream Property'
        : idioma === 'fr'
          ? 'Trouvez Votre Propriété de Rêve'
          : 'Encuentra Tu Propiedad Soñada',
      subtitle: idioma === 'en'
        ? 'Discover luxury homes, investment opportunities, and vacation rentals'
        : idioma === 'fr'
          ? 'Découvrez maisons de luxe, opportunités d\'investissement et locations vacances'
          : 'Descubre casas de lujo, oportunidades de inversión y rentas vacacionales',
    });

    // Featured properties section
    if (featuredProperties.length > 0) {
      sections.push({
        id: 'featured-properties',
        type: 'property-carousel',
        title: idioma === 'en'
          ? 'Featured Properties'
          : idioma === 'fr'
            ? 'Propriétés Vedettes'
            : 'Propiedades Destacadas',
        properties: featuredProperties,
      });
    }

    // Testimonials section
    if (featuredTestimonials.length > 0) {
      sections.push({
        id: 'testimonials',
        type: 'testimonials',
        title: idioma === 'en'
          ? 'Client Testimonials'
          : idioma === 'fr'
            ? 'Témoignages Clients'
            : 'Testimonios de Clientes',
        testimonials: featuredTestimonials,
      });
    }

    // Advisors section
    if (advisors.length > 0) {
      sections.push({
        id: 'advisors',
        type: 'advisors',
        title: idioma === 'en'
          ? 'Our Expert Team'
          : idioma === 'fr'
            ? 'Notre Équipe d\'Experts'
            : 'Nuestro Equipo Experto',
        advisors,
      });
    }

    // Content section (videos + articles)
    if (featuredVideos.length > 0 || articles.length > 0) {
      sections.push({
        id: 'recent-content',
        type: 'content-mix',
        title: idioma === 'en'
          ? 'Latest Insights'
          : idioma === 'fr'
            ? 'Derniers Insights'
            : 'Últimas Novedades',
        videos: featuredVideos,
        articles,
      });
    }

    // Estadísticas
    const quickStats = {
      totalProperties: featuredProperties.length,
      totalVideos: featuredVideos.length,
      totalTestimonials: featuredTestimonials.length,
      totalAdvisors: advisors.length,
      totalArticles: articles.length,
    };

    // SEO
    const seo = {
      title: idioma === 'en'
        ? 'Real Estate | Luxury Properties & Investment'
        : idioma === 'fr'
          ? 'Immobilier | Propriétés Luxe & Investissement'
          : 'Bienes Raíces | Propiedades de Lujo e Inversión',
      description: idioma === 'en'
        ? 'Find luxury properties, investment opportunities, and vacation rentals.'
        : idioma === 'fr'
          ? 'Trouvez propriétés de luxe, opportunités d\'investissement et locations vacances.'
          : 'Encuentra propiedades de lujo, oportunidades de inversión y rentas vacacionales.',
      canonical_url: idioma === 'es' ? '/' : `/${idioma}/`,
    };

    return {
      type: 'homepage',
      pageType: 'homepage',
      contentType: 'homepage',
      seo,
      sections,
      quickStats,
      // Datos directos para componentes
      featuredProperties,
      recentProperties,
      featuredVideos,
      recentVideos: featuredVideos,
      featuredTestimonials,
      recentTestimonials: featuredTestimonials,
      advisors,
      articles,
      // Categorías
      videoCategories: results.videos?.categories || [],
      testimonialCategories: results.testimonios?.categorias || [],
      _meta: {
        tipoPagina: 'homepage',
        resolvedAt: new Date().toISOString(),
        resolver: 'homepage-composite',
      },
    };
  } catch (error: any) {
    console.error(`❌ [Homepage] Error:`, error.message);
    return {
      type: 'homepage-error',
      pageType: 'homepage-error',
      error: error.message,
      sections: [],
      quickStats: {},
      _meta: {
        tipoPagina: 'homepage',
        resolvedAt: new Date().toISOString(),
        resolver: 'homepage-composite',
      },
    };
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Verifica si existe un mapeo para un tipo de página
 */
export function hasRecipeForPage(tipoPagina: string): boolean {
  return tipoPagina in PAGE_MAPPINGS ||
    tipoPagina === 'homepage' ||
    tipoPagina === 'home' ||
    tipoPagina === 'inicio';
}

/**
 * Obtiene la lista de tipos de página soportados
 */
export function getSupportedPageTypes(): string[] {
  return [...Object.keys(PAGE_MAPPINGS), 'homepage', 'home', 'inicio'];
}

/**
 * Obtiene el nombre de la receta para un código de página (compatibilidad)
 */
export function getRecipeNameForPageCode(pageCode: string): string | null {
  if (pageCode in PAGE_MAPPINGS) return pageCode;
  if (['homepage', 'home', 'inicio'].includes(pageCode)) return 'homepage';
  return null;
}

/**
 * Obtiene información sobre el mapeo de una página
 */
export function getRecipeInfo(tipoPagina: string): {
  primaryType: string;
  secondaryTypes: string[];
} | null {
  const mapping = PAGE_MAPPINGS[tipoPagina];
  if (!mapping) {
    if (['homepage', 'home', 'inicio'].includes(tipoPagina)) {
      return {
        primaryType: 'homepage',
        secondaryTypes: ['propiedades', 'videos', 'testimonios', 'asesores', 'articulos'],
      };
    }
    return null;
  }

  return {
    primaryType: mapping.resource,
    secondaryTypes: [],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Acceso directo a los resolvers individuales
 */
export { resolvers };

/**
 * Re-export de handlers individuales
 */
export {
  handleAsesores,
  handleTestimonios,
  handleVideos,
  handleArticulos,
  handlePropiedades,
};
