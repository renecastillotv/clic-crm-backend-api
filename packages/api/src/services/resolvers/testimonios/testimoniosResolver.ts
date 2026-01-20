/**
 * Testimonios Resolver
 *
 * Resolver modular para testimonios de clientes.
 * Expone funciones independientes que pueden ser llamadas por separado
 * o combinadas a través del handler principal.
 *
 * Funciones disponibles:
 * - getTestimoniosList: Lista de testimonios
 * - getTestimonioSingle: Testimonio individual por ID o slug
 * - getTestimoniosCategorias: Categorías de testimonios
 * - getTestimoniosPorCategoria: Testimonios filtrados por categoría
 * - getTestimonioPropiedad: Propiedad relacionada al testimonio
 * - getTestimonioAsesor: Asesor relacionado al testimonio
 * - getTestimoniosRelacionados: Testimonios similares
 * - handleTestimonios: Handler principal que orquesta todo
 */

import {
  query,
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
  Testimonio,
  TestimonioConRelaciones,
  Categoria,
} from '../base/types.js';

// ============================================================================
// TIPOS ESPECÍFICOS
// ============================================================================

export interface TestimoniosListParams extends BaseResolverParams {
  filters?: {
    publicado?: boolean;
    destacado?: boolean;
    categoria_id?: string;
    categoria_slug?: string;
    asesor_id?: string;
    exclude_id?: string;
    verificado?: boolean;
  };
}

export interface TestimonioSingleParams extends SingleParams {
  includeRelated?: boolean;
}

// ============================================================================
// QUERIES BASE
// ============================================================================

const BASE_SELECT = `
  t.id, t.slug, t.slug_traducciones, t.cliente_nombre, t.cliente_cargo, t.cliente_empresa,
  t.cliente_foto, t.cliente_ubicacion, t.titulo, t.contenido,
  t.rating, t.propiedad_id, t.asesor_id, t.categoria_id, t.traducciones,
  t.publicado, t.destacado, t.verificado, t.fuente, t.fecha,
  c.id as categoria_id_full,
  c.slug as categoria_slug,
  c.nombre as categoria_nombre,
  c.slug_traducciones as categoria_slug_traducciones
`;

const BASE_FROM = `
  FROM testimonios t
  LEFT JOIN categorias_contenido c ON t.categoria_id = c.id
`;

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Mapea un row de la BD a un objeto Testimonio normalizado
 */
function mapRowToTestimonio(row: any, idioma: string = 'es'): Testimonio {
  const traducciones = parseObjectField(row.traducciones);
  const categoriaSlugTraducciones = parseObjectField(row.categoria_slug_traducciones);

  // Aplicar traducciones al contenido
  const rowTraducido = applyTranslations({ ...row, traducciones }, 'testimonios', idioma);

  // Construir URL traducida
  let categoriaSlug = row.categoria_slug || 'general';
  if (idioma !== 'es' && categoriaSlugTraducciones[idioma]) {
    categoriaSlug = categoriaSlugTraducciones[idioma];
  }

  return {
    id: row.id,
    slug: row.slug,
    slug_traducciones: parseObjectField(row.slug_traducciones),
    url: buildEntityUrl('/testimonios', row.slug, idioma !== 'es' ? idioma : undefined, categoriaSlug),
    cliente_nombre: row.cliente_nombre,
    cliente_cargo: row.cliente_cargo,
    cliente_empresa: row.cliente_empresa,
    cliente_foto: row.cliente_foto,
    cliente_ubicacion: row.cliente_ubicacion,
    titulo: rowTraducido.titulo,
    contenido: rowTraducido.contenido,
    rating: row.rating,
    propiedad_id: row.propiedad_id,
    asesor_id: row.asesor_id,
    categoria_id: row.categoria_id,
    categoria_slug: row.categoria_slug,
    categoria_nombre: row.categoria_nombre,
    verificado: row.verificado,
    fuente: row.fuente,
    fecha: row.fecha,
    publicado: row.publicado,
    destacado: row.destacado,
    traducciones,
  };
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene lista de testimonios
 */
export async function getTestimoniosList(params: TestimoniosListParams): Promise<Testimonio[]> {
  const { tenantId, filters, pagination, idioma = 'es' } = params;
  const { limit, offset } = calculateOffset(pagination);
  const normalizedIdioma = normalizeLanguage(idioma);

  logResolver('💬', 'TestimoniosResolver', 'getTestimoniosList', { tenantId, limit });

  try {
    let sql = `SELECT ${BASE_SELECT} ${BASE_FROM} WHERE t.tenant_id = $1`;
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    // Filtros
    if (filters?.publicado !== false) {
      sql += ' AND t.publicado = true';
    }

    if (filters?.destacado !== undefined) {
      sql += ` AND t.destacado = $${paramIndex++}`;
      queryParams.push(filters.destacado);
    }

    if (filters?.categoria_id) {
      sql += ` AND t.categoria_id = $${paramIndex++}`;
      queryParams.push(filters.categoria_id);
    }

    if (filters?.categoria_slug) {
      sql += ` AND c.slug = $${paramIndex++}`;
      queryParams.push(filters.categoria_slug);
    }

    if (filters?.asesor_id) {
      sql += ` AND t.asesor_id = $${paramIndex++}`;
      queryParams.push(filters.asesor_id);
    }

    if (filters?.exclude_id) {
      sql += ` AND t.id != $${paramIndex++}`;
      queryParams.push(filters.exclude_id);
    }

    if (filters?.verificado !== undefined) {
      sql += ` AND t.verificado = $${paramIndex++}`;
      queryParams.push(filters.verificado);
    }

    sql += ` ORDER BY t.destacado DESC, t.fecha DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);

    const testimonios = result.rows.map((row: any) => mapRowToTestimonio(row, normalizedIdioma));
    logResolver('✅', 'TestimoniosResolver', `Lista resuelta: ${testimonios.length} testimonios`);

    return testimonios;
  } catch (error: any) {
    logResolver('❌', 'TestimoniosResolver', `Error en getTestimoniosList: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene un testimonio por ID o slug
 */
export async function getTestimonioSingle(params: TestimonioSingleParams): Promise<Testimonio | null> {
  const { tenantId, id, slug, filters, idioma = 'es' } = params;
  const searchValue = id || slug || filters?.slug || filters?.id;
  const normalizedIdioma = normalizeLanguage(idioma);

  if (!searchValue) {
    return null;
  }

  logResolver('💬', 'TestimoniosResolver', 'getTestimonioSingle', { tenantId, searchValue });

  try {
    const slugCondition = buildSlugSearchCondition('t.slug', '$1', normalizedIdioma);

    const sql = `
      SELECT ${BASE_SELECT}
      ${BASE_FROM}
      WHERE t.tenant_id = $2 AND t.publicado = true AND (t.id::text = $1 OR ${slugCondition})
      LIMIT 1
    `;

    const result = await query(sql, [searchValue, tenantId]);

    if (result.rows.length === 0) {
      logResolver('⚠️', 'TestimoniosResolver', `Testimonio no encontrado: ${searchValue}`);
      return null;
    }

    const testimonio = mapRowToTestimonio(result.rows[0], normalizedIdioma);
    logResolver('✅', 'TestimoniosResolver', `Testimonio encontrado: ${testimonio.cliente_nombre}`);

    return testimonio;
  } catch (error: any) {
    logResolver('❌', 'TestimoniosResolver', `Error en getTestimonioSingle: ${error.message}`);
    return null;
  }
}

/**
 * Obtiene categorías de testimonios
 */
export async function getTestimoniosCategorias(params: BaseResolverParams): Promise<Categoria[]> {
  const { tenantId, idioma = 'es' } = params;
  const normalizedIdioma = normalizeLanguage(idioma);

  logResolver('📂', 'TestimoniosResolver', 'getTestimoniosCategorias', { tenantId });

  try {
    const sql = `
      SELECT
        c.id, c.nombre, c.slug, c.slug_traducciones, c.descripcion, c.icono, c.color, c.orden,
        c.traducciones, c.activa,
        COALESCE(counts.total, 0)::integer as total_items
      FROM categorias_contenido c
      LEFT JOIN (
        SELECT categoria_id, COUNT(*) as total
        FROM testimonios
        WHERE tenant_id = $1 AND publicado = true
        GROUP BY categoria_id
      ) counts ON counts.categoria_id = c.id
      WHERE c.tenant_id = $1 AND c.tipo = 'testimonio' AND c.activa = true
      ORDER BY c.orden ASC, c.nombre ASC
    `;

    const result = await query(sql, [tenantId]);

    const categorias = result.rows.map((row: any) => {
      const rowTraducido = applyTranslations(row, 'categorias_contenido', normalizedIdioma);
      return {
        ...row,
        nombre: rowTraducido.nombre,
        descripcion: rowTraducido.descripcion,
        slug_traducciones: parseObjectField(row.slug_traducciones),
        tipo: 'testimonio' as const,
      };
    });

    logResolver('✅', 'TestimoniosResolver', `Categorías resueltas: ${categorias.length}`);
    return categorias;
  } catch (error: any) {
    logResolver('❌', 'TestimoniosResolver', `Error en getTestimoniosCategorias: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene testimonios filtrados por categoría con info de la categoría
 */
export async function getTestimoniosPorCategoria(
  params: TestimoniosListParams & { categoriaSlug: string }
): Promise<{ categoria: Categoria | null; items: Testimonio[] }> {
  const { tenantId, categoriaSlug, idioma = 'es', pagination } = params;
  const normalizedIdioma = normalizeLanguage(idioma);

  logResolver('📂', 'TestimoniosResolver', 'getTestimoniosPorCategoria', { tenantId, categoriaSlug });

  // 1. Obtener información de la categoría
  let categoria: Categoria | null = null;
  try {
    const slugCondition = buildSlugSearchCondition('slug', '$3', normalizedIdioma);

    const catResult = await query(
      `SELECT id, nombre, slug, slug_traducciones, descripcion, traducciones, icono, color, orden
       FROM categorias_contenido
       WHERE tenant_id = $1 AND tipo = $2 AND ${slugCondition} AND activa = true
       LIMIT 1`,
      [tenantId, 'testimonio', categoriaSlug]
    );

    if (catResult.rows.length > 0) {
      const row = catResult.rows[0];
      const rowTraducido = applyTranslations(row, 'categorias_contenido', normalizedIdioma);
      categoria = {
        ...row,
        nombre: rowTraducido.nombre,
        descripcion: rowTraducido.descripcion,
        slug_traducciones: parseObjectField(row.slug_traducciones),
        tipo: 'testimonio' as const,
      };
    }
  } catch (error: any) {
    logResolver('⚠️', 'TestimoniosResolver', `Error obteniendo categoría: ${error.message}`);
  }

  // 2. Obtener testimonios de la categoría
  const items = await getTestimoniosList({
    ...params,
    filters: {
      ...params.filters,
      categoria_id: categoria?.id,
    },
  });

  return { categoria, items };
}

/**
 * Obtiene la propiedad relacionada al testimonio
 */
export async function getTestimonioPropiedad(
  params: BaseResolverParams & { propiedadId: string }
): Promise<any | null> {
  const { tenantId, propiedadId } = params;

  if (!propiedadId) return null;

  logResolver('🏠', 'TestimoniosResolver', 'getTestimonioPropiedad', { tenantId, propiedadId });

  try {
    const sql = `
      SELECT
        id, slug, titulo, descripcion_corta, tipo, operacion, precio, moneda,
        ciudad, sector, imagen_principal, imagenes
      FROM propiedades
      WHERE tenant_id = $1 AND id = $2 AND activo = true
      LIMIT 1
    `;

    const result = await query(sql, [tenantId, propiedadId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      url: buildEntityUrl('/propiedades', row.slug),
    };
  } catch (error: any) {
    logResolver('❌', 'TestimoniosResolver', `Error en getTestimonioPropiedad: ${error.message}`);
    return null;
  }
}

/**
 * Obtiene el asesor relacionado al testimonio
 */
export async function getTestimonioAsesor(
  params: BaseResolverParams & { asesorId: string }
): Promise<any | null> {
  const { tenantId, asesorId } = params;

  if (!asesorId) return null;

  logResolver('👤', 'TestimoniosResolver', 'getTestimonioAsesor', { tenantId, asesorId });

  try {
    const sql = `
      SELECT
        pa.id, pa.slug, pa.titulo_profesional as cargo, pa.foto_url,
        pa.experiencia_anos, pa.rango,
        u.nombre, u.apellido, u.email, u.telefono
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      WHERE pa.tenant_id = $1 AND pa.id = $2 AND pa.activo = true
      LIMIT 1
    `;

    const result = await query(sql, [tenantId, asesorId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      nombre_completo: `${row.nombre} ${row.apellido}`.trim(),
      url: buildEntityUrl('/asesores', row.slug),
    };
  } catch (error: any) {
    logResolver('❌', 'TestimoniosResolver', `Error en getTestimonioAsesor: ${error.message}`);
    return null;
  }
}

/**
 * Obtiene testimonios relacionados (misma categoría, excluyendo el actual)
 */
export async function getTestimoniosRelacionados(
  params: BaseResolverParams & { testimonioId: string; categoriaId?: string }
): Promise<Testimonio[]> {
  const { tenantId, testimonioId, categoriaId, idioma = 'es' } = params;

  logResolver('🔗', 'TestimoniosResolver', 'getTestimoniosRelacionados', { tenantId, testimonioId });

  return getTestimoniosList({
    tenantId,
    idioma,
    filters: {
      categoria_id: categoriaId,
      exclude_id: testimonioId,
    },
    pagination: { limit: 3 },
  });
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

export interface HandleTestimoniosParams extends BaseResolverParams {
  slug?: string;
  id?: string;
  categoriaSlug?: string;
  includeRelated?: boolean;
}

export interface HandleTestimoniosResult {
  // Metadata de tipo de página
  type?: string;
  pageType?: string;
  // Para listado
  items?: Testimonio[];
  featuredTestimonios?: Testimonio[];
  // Para categorías
  categorias?: Categoria[];
  categories?: Categoria[];
  categoria?: Categoria | null;
  category?: Categoria | null;
  // Para single
  testimonio?: TestimonioConRelaciones | null;
  // Datos relacionados
  propiedad?: any;
  property?: any;
  asesor?: any;
  advisor?: any;
  relacionados?: Testimonio[];
  relatedTestimonials?: Testimonio[];
  // SEO
  seo?: {
    title: string;
    description: string;
    h1?: string;
    h2?: string;
    canonical_url?: string;
  };
  // Stats
  stats?: {
    totalTestimonials: number;
    totalCategories: number;
    averageRating: number;
  };
}

/**
 * Handler principal que orquesta las llamadas según el contexto
 * Formato de respuesta compatible con edge functions de referencia
 *
 * - Si hay slug/id: devuelve single con relaciones
 * - Si hay categoriaSlug: devuelve testimonios de esa categoría
 * - Si no hay parámetros: devuelve lista general con categorías
 */
export async function handleTestimonios(params: HandleTestimoniosParams): Promise<HandleTestimoniosResult> {
  const { slug, id, categoriaSlug, filters, includeRelated = true, idioma = 'es' } = params;
  const searchValue = slug || id || filters?.slug || filters?.id;

  // Si hay un identificador de testimonio, resolver single con relaciones
  if (searchValue) {
    const testimonio = await getTestimonioSingle({
      ...params,
      slug: searchValue,
    });

    if (!testimonio) {
      return {
        type: 'testimonios-single-404',
        pageType: 'testimonios-single-404',
        testimonio: null,
      };
    }

    // Si se solicitan relaciones, obtenerlas en paralelo
    if (includeRelated) {
      const [propiedad, asesor, relacionados] = await Promise.all([
        testimonio.propiedad_id
          ? getTestimonioPropiedad({
              tenantId: params.tenantId,
              propiedadId: testimonio.propiedad_id,
            })
          : Promise.resolve(null),
        testimonio.asesor_id
          ? getTestimonioAsesor({
              tenantId: params.tenantId,
              asesorId: testimonio.asesor_id,
            })
          : Promise.resolve(null),
        getTestimoniosRelacionados({
          tenantId: params.tenantId,
          testimonioId: testimonio.id,
          categoriaId: testimonio.categoria_id,
          idioma: params.idioma,
        }),
      ]);

      return {
        type: 'testimonios-single',
        pageType: 'testimonios-single',
        testimonio: {
          ...testimonio,
          propiedad,
          asesor,
          relacionados,
        },
        propiedad,
        property: propiedad,
        asesor,
        advisor: asesor,
        relacionados,
        relatedTestimonials: relacionados,
        seo: {
          title: `${testimonio.cliente_nombre} - Testimonio`,
          description: testimonio.contenido?.substring(0, 160) || '',
          h1: testimonio.titulo || `Testimonio de ${testimonio.cliente_nombre}`,
          h2: testimonio.categoria_nombre || 'Testimonios',
        },
      };
    }

    return {
      type: 'testimonios-single',
      pageType: 'testimonios-single',
      testimonio,
    };
  }

  // Si hay categoriaSlug, devolver testimonios de esa categoría
  if (categoriaSlug) {
    const { categoria, items } = await getTestimoniosPorCategoria({
      ...params,
      categoriaSlug,
    });

    // Calcular rating promedio
    const avgRating = items.length > 0
      ? items.reduce((sum, t) => sum + (t.rating || 5), 0) / items.length
      : 5;

    return {
      type: 'testimonios-category',
      pageType: 'testimonios-category',
      categoria,
      category: categoria,
      items,
      seo: {
        title: `${categoria?.nombre || categoriaSlug} - Testimonios`,
        description: categoria?.descripcion || `Testimonios de ${categoria?.nombre || categoriaSlug}`,
        h1: `${categoria?.nombre || categoriaSlug} - Testimonios`,
      },
      stats: {
        totalTestimonials: items.length,
        totalCategories: 1,
        averageRating: Math.round(avgRating * 10) / 10,
      },
    };
  }

  // Sin identificador, devolver lista general (formato edge functions)
  const [items, categorias] = await Promise.all([
    getTestimoniosList({
      ...params,
      pagination: params.pagination || { limit: 12 },
    }),
    getTestimoniosCategorias(params),
  ]);

  // Separar destacados
  const featuredTestimonios = items.filter(t => t.destacado).slice(0, 6);

  // Calcular rating promedio
  const avgRating = items.length > 0
    ? items.reduce((sum, t) => sum + (t.rating || 5), 0) / items.length
    : 5;

  return {
    type: 'testimonios-main',
    pageType: 'testimonios-main',
    items,
    featuredTestimonios,
    categorias,
    categories: categorias,
    seo: {
      title: idioma === 'en'
        ? 'Client Testimonials & Success Stories'
        : idioma === 'fr'
          ? 'Témoignages Clients & Histoires de Succès'
          : 'Testimonios de Clientes e Historias de Éxito',
      description: idioma === 'en'
        ? 'Read real testimonials from satisfied clients about their real estate experience.'
        : idioma === 'fr'
          ? 'Lisez les vrais témoignages de clients satisfaits sur leur expérience immobilière.'
          : 'Lee testimonios reales de clientes satisfechos sobre su experiencia inmobiliaria.',
      h1: idioma === 'en'
        ? 'Client Testimonials & Success Stories'
        : idioma === 'fr'
          ? 'Témoignages Clients & Histoires de Succès'
          : 'Testimonios de Clientes e Historias de Éxito',
    },
    stats: {
      totalTestimonials: items.length,
      totalCategories: categorias.length,
      averageRating: Math.round(avgRating * 10) / 10,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getTestimoniosList,
  getTestimonioSingle,
  getTestimoniosCategorias,
  getTestimoniosPorCategoria,
  getTestimonioPropiedad,
  getTestimonioAsesor,
  getTestimoniosRelacionados,
  handleTestimonios,
};
