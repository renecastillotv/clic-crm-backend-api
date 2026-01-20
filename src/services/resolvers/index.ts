/**
 * Resolvers Index - Orquestador Central
 *
 * Este módulo es el punto de entrada principal para el sistema de resolvers modulares.
 * Sabe a quién llamar y orquesta las peticiones de datos.
 *
 * Uso:
 * ```typescript
 * import resolvers from './resolvers';
 *
 * // Obtener lista de asesores
 * const asesores = await resolvers.asesores.getAsesoresList({ tenantId: '...' });
 *
 * // Obtener asesor con todas sus relaciones
 * const result = await resolvers.asesores.handleAsesores({ tenantId: '...', slug: 'juan-perez' });
 *
 * // O usar el resolver universal
 * const data = await resolvers.resolve('asesores', { tenantId: '...', slug: 'juan-perez' });
 * ```
 */

// ============================================================================
// IMPORTS DE RESOLVERS
// ============================================================================

import asesoresResolver, {
  getAsesoresList,
  getAsesorSingle,
  getAsesorPropiedades,
  getAsesorTestimonios,
  getAsesorVideos,
  getAsesorArticulos,
  handleAsesores,
} from './asesores/asesoresResolver.js';

import testimoniosResolver, {
  getTestimoniosList,
  getTestimonioSingle,
  getTestimoniosCategorias,
  getTestimoniosPorCategoria,
  getTestimonioPropiedad,
  getTestimonioAsesor,
  getTestimoniosRelacionados,
  handleTestimonios,
} from './testimonios/testimoniosResolver.js';

import videosResolver, {
  getVideosList,
  getVideoSingle,
  getVideosCategorias,
  getVideosPorCategoria,
  getVideosRelacionados,
  handleVideos,
} from './videos/videosResolver.js';

import articulosResolver, {
  getArticulosList,
  getArticuloSingle,
  getArticulosCategorias,
  getArticulosPorCategoria,
  getArticulosRelacionados,
  getArticuloAutor,
  handleArticulos,
} from './articulos/articulosResolver.js';

import propiedadesResolver, {
  getPropiedadesList,
  getPropiedadSingle,
  getPropiedadesSimilares,
  getPropiedadAsesor,
  getPropiedadesDestacadas,
  getPropiedadesPorUbicacion,
  getPropiedadesCountByTipo,
  getPropiedadesCountByOperacion,
  handlePropiedades,
} from './propiedades/propiedadesResolver.js';

// Re-export types
export * from './base/types.js';

// ============================================================================
// TIPOS DEL ORQUESTADOR
// ============================================================================

export type ResolverType =
  | 'asesores'
  | 'testimonios'
  | 'videos'
  | 'articulos'
  | 'propiedades'
  | 'ubicaciones'
  | 'faqs'
  | 'categorias';

export interface ResolveParams {
  tenantId: string;
  idioma?: string;
  slug?: string;
  id?: string;
  categoriaSlug?: string;
  filters?: Record<string, any>;
  pagination?: { page?: number; limit?: number };
  includeRelated?: boolean;
}

// ============================================================================
// RESOLVER UNIVERSAL
// ============================================================================

/**
 * Resolver universal que direcciona al resolver correcto según el tipo
 */
export async function resolve(type: ResolverType, params: ResolveParams): Promise<any> {
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

    // TODO: Implementar estos resolvers
    case 'ubicaciones':
    case 'faqs':
    case 'categorias':
      console.warn(`Resolver ${type} no implementado aún`);
      return { items: [] };

    default:
      throw new Error(`Tipo de resolver no soportado: ${type}`);
  }
}

/**
 * Resuelve múltiples tipos de datos en paralelo
 * Útil para páginas que necesitan datos de varios recursos
 */
export async function resolveMultiple(
  requests: Array<{ type: ResolverType; key: string; params: ResolveParams }>
): Promise<Record<string, any>> {
  const results = await Promise.allSettled(
    requests.map(async ({ type, params }) => resolve(type, params))
  );

  const output: Record<string, any> = {};

  results.forEach((result, index) => {
    const key = requests[index].key;
    if (result.status === 'fulfilled') {
      output[key] = result.value;
    } else {
      console.error(`Error resolviendo ${key}:`, result.reason);
      output[key] = null;
    }
  });

  return output;
}

// ============================================================================
// EXPORTS ORGANIZADOS
// ============================================================================

/**
 * Objeto con todos los resolvers organizados por tipo
 */
const resolvers = {
  // Handlers principales (orquestan todo)
  resolve,
  resolveMultiple,

  // Asesores
  asesores: {
    getList: getAsesoresList,
    getSingle: getAsesorSingle,
    getPropiedades: getAsesorPropiedades,
    getTestimonios: getAsesorTestimonios,
    getVideos: getAsesorVideos,
    getArticulos: getAsesorArticulos,
    handle: handleAsesores,
    ...asesoresResolver,
  },

  // Testimonios
  testimonios: {
    getList: getTestimoniosList,
    getSingle: getTestimonioSingle,
    getCategorias: getTestimoniosCategorias,
    getPorCategoria: getTestimoniosPorCategoria,
    getPropiedad: getTestimonioPropiedad,
    getAsesor: getTestimonioAsesor,
    getRelacionados: getTestimoniosRelacionados,
    handle: handleTestimonios,
    ...testimoniosResolver,
  },

  // Videos
  videos: {
    getList: getVideosList,
    getSingle: getVideoSingle,
    getCategorias: getVideosCategorias,
    getPorCategoria: getVideosPorCategoria,
    getRelacionados: getVideosRelacionados,
    handle: handleVideos,
    ...videosResolver,
  },

  // Artículos
  articulos: {
    getList: getArticulosList,
    getSingle: getArticuloSingle,
    getCategorias: getArticulosCategorias,
    getPorCategoria: getArticulosPorCategoria,
    getRelacionados: getArticulosRelacionados,
    getAutor: getArticuloAutor,
    handle: handleArticulos,
    ...articulosResolver,
  },

  // Propiedades
  propiedades: {
    getList: getPropiedadesList,
    getSingle: getPropiedadSingle,
    getSimilares: getPropiedadesSimilares,
    getAsesor: getPropiedadAsesor,
    getDestacadas: getPropiedadesDestacadas,
    getPorUbicacion: getPropiedadesPorUbicacion,
    getCountByTipo: getPropiedadesCountByTipo,
    getCountByOperacion: getPropiedadesCountByOperacion,
    handle: handlePropiedades,
    ...propiedadesResolver,
  },
};

export default resolvers;

// ============================================================================
// EXPORTS INDIVIDUALES PARA IMPORTS DIRECTOS
// ============================================================================

// Asesores
export {
  getAsesoresList,
  getAsesorSingle,
  getAsesorPropiedades,
  getAsesorTestimonios,
  getAsesorVideos,
  getAsesorArticulos,
  handleAsesores,
};

// Testimonios
export {
  getTestimoniosList,
  getTestimonioSingle,
  getTestimoniosCategorias,
  getTestimoniosPorCategoria,
  getTestimonioPropiedad,
  getTestimonioAsesor,
  getTestimoniosRelacionados,
  handleTestimonios,
};

// Videos
export {
  getVideosList,
  getVideoSingle,
  getVideosCategorias,
  getVideosPorCategoria,
  getVideosRelacionados,
  handleVideos,
};

// Artículos
export {
  getArticulosList,
  getArticuloSingle,
  getArticulosCategorias,
  getArticulosPorCategoria,
  getArticulosRelacionados,
  getArticuloAutor,
  handleArticulos,
};

// Propiedades
export {
  getPropiedadesList,
  getPropiedadSingle,
  getPropiedadesSimilares,
  getPropiedadAsesor,
  getPropiedadesDestacadas,
  getPropiedadesPorUbicacion,
  getPropiedadesCountByTipo,
  getPropiedadesCountByOperacion,
  handlePropiedades,
};
