/**
 * Artículos Resolver
 *
 * Resolver modular para artículos/blog.
 * Expone funciones independientes que pueden ser llamadas por separado
 * o combinadas a través del handler principal.
 *
 * Funciones disponibles:
 * - getArticulosList: Lista de artículos
 * - getArticuloSingle: Artículo individual por ID o slug
 * - getArticulosCategorias: Categorías de artículos
 * - getArticulosPorCategoria: Artículos filtrados por categoría
 * - getArticulosRelacionados: Artículos similares
 * - getArticuloAutor: Autor del artículo
 * - handleArticulos: Handler principal que orquesta todo
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
  Articulo,
  ArticuloConRelaciones,
  Categoria,
  Asesor,
} from '../base/types.js';

// ============================================================================
// TIPOS ESPECÍFICOS
// ============================================================================

export interface ArticulosListParams extends BaseResolverParams {
  filters?: {
    publicado?: boolean;
    destacado?: boolean;
    categoria_id?: string;
    categoria_slug?: string;
    autor_id?: string;
    exclude_id?: string;
  };
}

export interface ArticuloSingleParams extends SingleParams {
  includeRelated?: boolean;
}

// ============================================================================
// QUERIES BASE
// ============================================================================

const BASE_SELECT = `
  a.id, a.slug, a.slug_traducciones, a.titulo, a.extracto, a.contenido, a.imagen_principal, a.imagenes,
  a.autor_id, a.autor_nombre, a.autor_foto, a.categoria_id,
  a.meta_titulo, a.meta_descripcion, a.tags, a.traducciones,
  a.publicado, a.destacado, a.vistas, a.fecha_publicacion,
  c.slug as categoria_slug,
  c.nombre as categoria_nombre,
  c.slug_traducciones as categoria_slug_traducciones
`;

const BASE_FROM = `
  FROM articulos a
  LEFT JOIN categorias_contenido c ON a.categoria_id = c.id
`;

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Mapea un row de la BD a un objeto Articulo normalizado
 */
function mapRowToArticulo(row: any, idioma: string = 'es'): Articulo {
  const traducciones = parseObjectField(row.traducciones);
  const categoriaSlugTraducciones = parseObjectField(row.categoria_slug_traducciones);

  // Aplicar traducciones al contenido
  const rowTraducido = applyTranslations({ ...row, traducciones }, 'articulos', idioma);

  // Construir URL traducida
  let categoriaSlug = row.categoria_slug || 'general';
  if (idioma !== 'es' && categoriaSlugTraducciones[idioma]) {
    categoriaSlug = categoriaSlugTraducciones[idioma];
  }

  return {
    id: row.id,
    slug: row.slug,
    slug_traducciones: parseObjectField(row.slug_traducciones),
    url: buildEntityUrl('/articulos', row.slug, idioma !== 'es' ? idioma : undefined, categoriaSlug),
    titulo: rowTraducido.titulo,
    extracto: rowTraducido.extracto,
    contenido: rowTraducido.contenido,
    imagen_principal: row.imagen_principal,
    imagenes: parseArrayField(row.imagenes),
    autor_id: row.autor_id,
    autor_nombre: row.autor_nombre,
    autor_foto: row.autor_foto,
    categoria_id: row.categoria_id,
    categoria_slug: row.categoria_slug,
    categoria_nombre: row.categoria_nombre,
    meta_titulo: row.meta_titulo,
    meta_descripcion: row.meta_descripcion,
    tags: parseArrayField(row.tags),
    vistas: row.vistas || 0,
    fecha_publicacion: row.fecha_publicacion,
    publicado: row.publicado,
    destacado: row.destacado,
    traducciones,
  };
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene lista de artículos
 */
export async function getArticulosList(params: ArticulosListParams): Promise<Articulo[]> {
  const { tenantId, filters, pagination, idioma = 'es' } = params;
  const { limit, offset } = calculateOffset(pagination);
  const normalizedIdioma = normalizeLanguage(idioma);

  logResolver('📝', 'ArticulosResolver', 'getArticulosList', { tenantId, limit });

  try {
    let sql = `SELECT ${BASE_SELECT} ${BASE_FROM} WHERE a.tenant_id = $1`;
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    // Filtros
    if (filters?.publicado !== false) {
      sql += ' AND a.publicado = true';
    }

    if (filters?.destacado !== undefined) {
      sql += ` AND a.destacado = $${paramIndex++}`;
      queryParams.push(filters.destacado);
    }

    if (filters?.categoria_id) {
      sql += ` AND a.categoria_id = $${paramIndex++}`;
      queryParams.push(filters.categoria_id);
    }

    if (filters?.categoria_slug) {
      sql += ` AND c.slug = $${paramIndex++}`;
      queryParams.push(filters.categoria_slug);
    }

    if (filters?.autor_id) {
      sql += ` AND a.autor_id = $${paramIndex++}`;
      queryParams.push(filters.autor_id);
    }

    if (filters?.exclude_id) {
      sql += ` AND a.id != $${paramIndex++}`;
      queryParams.push(filters.exclude_id);
    }

    sql += ` ORDER BY a.fecha_publicacion DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);

    const articulos = result.rows.map((row: any) => mapRowToArticulo(row, normalizedIdioma));
    logResolver('✅', 'ArticulosResolver', `Lista resuelta: ${articulos.length} artículos`);

    return articulos;
  } catch (error: any) {
    logResolver('❌', 'ArticulosResolver', `Error en getArticulosList: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene un artículo por ID o slug
 */
export async function getArticuloSingle(params: ArticuloSingleParams): Promise<Articulo | null> {
  const { tenantId, id, slug, filters, idioma = 'es' } = params;
  const searchValue = id || slug || filters?.slug || filters?.id;
  const normalizedIdioma = normalizeLanguage(idioma);

  if (!searchValue) {
    return null;
  }

  logResolver('📝', 'ArticulosResolver', 'getArticuloSingle', { tenantId, searchValue });

  try {
    const slugCondition = buildSlugSearchCondition('a.slug', '$1', normalizedIdioma);

    const sql = `
      SELECT ${BASE_SELECT}
      ${BASE_FROM}
      WHERE a.tenant_id = $2 AND a.publicado = true AND (a.id::text = $1 OR ${slugCondition})
      LIMIT 1
    `;

    const result = await query(sql, [searchValue, tenantId]);

    if (result.rows.length === 0) {
      logResolver('⚠️', 'ArticulosResolver', `Artículo no encontrado: ${searchValue}`);
      return null;
    }

    const articulo = mapRowToArticulo(result.rows[0], normalizedIdioma);
    logResolver('✅', 'ArticulosResolver', `Artículo encontrado: ${articulo.titulo}`);

    return articulo;
  } catch (error: any) {
    logResolver('❌', 'ArticulosResolver', `Error en getArticuloSingle: ${error.message}`);
    return null;
  }
}

/**
 * Obtiene categorías de artículos
 */
export async function getArticulosCategorias(params: BaseResolverParams): Promise<Categoria[]> {
  const { tenantId, idioma = 'es' } = params;
  const normalizedIdioma = normalizeLanguage(idioma);

  logResolver('📂', 'ArticulosResolver', 'getArticulosCategorias', { tenantId });

  try {
    const sql = `
      SELECT
        c.id, c.nombre, c.slug, c.slug_traducciones, c.descripcion, c.icono, c.color, c.orden,
        c.traducciones, c.activa,
        COALESCE(counts.total, 0)::integer as total_items
      FROM categorias_contenido c
      LEFT JOIN (
        SELECT categoria_id, COUNT(*) as total
        FROM articulos
        WHERE tenant_id = $1 AND publicado = true
        GROUP BY categoria_id
      ) counts ON counts.categoria_id = c.id
      WHERE c.tenant_id = $1 AND c.tipo = 'articulo' AND c.activa = true
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
        tipo: 'articulo' as const,
      };
    });

    logResolver('✅', 'ArticulosResolver', `Categorías resueltas: ${categorias.length}`);
    return categorias;
  } catch (error: any) {
    logResolver('❌', 'ArticulosResolver', `Error en getArticulosCategorias: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene artículos filtrados por categoría con info de la categoría
 */
export async function getArticulosPorCategoria(
  params: ArticulosListParams & { categoriaSlug: string }
): Promise<{ categoria: Categoria | null; items: Articulo[] }> {
  const { tenantId, categoriaSlug, idioma = 'es', pagination } = params;
  const normalizedIdioma = normalizeLanguage(idioma);

  logResolver('📂', 'ArticulosResolver', 'getArticulosPorCategoria', { tenantId, categoriaSlug });

  // 1. Obtener información de la categoría
  let categoria: Categoria | null = null;
  try {
    const slugCondition = buildSlugSearchCondition('slug', '$3', normalizedIdioma);

    const catResult = await query(
      `SELECT id, nombre, slug, slug_traducciones, descripcion, traducciones, icono, color, orden
       FROM categorias_contenido
       WHERE tenant_id = $1 AND tipo = $2 AND ${slugCondition} AND activa = true
       LIMIT 1`,
      [tenantId, 'articulo', categoriaSlug]
    );

    if (catResult.rows.length > 0) {
      const row = catResult.rows[0];
      const rowTraducido = applyTranslations(row, 'categorias_contenido', normalizedIdioma);
      categoria = {
        ...row,
        nombre: rowTraducido.nombre,
        descripcion: rowTraducido.descripcion,
        slug_traducciones: parseObjectField(row.slug_traducciones),
        tipo: 'articulo' as const,
      };
    }
  } catch (error: any) {
    logResolver('⚠️', 'ArticulosResolver', `Error obteniendo categoría: ${error.message}`);
  }

  // 2. Obtener artículos de la categoría
  const items = await getArticulosList({
    ...params,
    filters: {
      ...params.filters,
      categoria_id: categoria?.id,
    },
  });

  return { categoria, items };
}

/**
 * Obtiene artículos relacionados (misma categoría, excluyendo el actual)
 */
export async function getArticulosRelacionados(
  params: BaseResolverParams & { articuloId: string; categoriaId?: string }
): Promise<Articulo[]> {
  const { tenantId, articuloId, categoriaId, idioma = 'es' } = params;

  logResolver('🔗', 'ArticulosResolver', 'getArticulosRelacionados', { tenantId, articuloId });

  return getArticulosList({
    tenantId,
    idioma,
    filters: {
      categoria_id: categoriaId,
      exclude_id: articuloId,
    },
    pagination: { limit: 3 },
  });
}

/**
 * Obtiene el autor del artículo (si es un asesor)
 */
export async function getArticuloAutor(
  params: BaseResolverParams & { autorId: string }
): Promise<Partial<Asesor> | null> {
  const { tenantId, autorId } = params;

  if (!autorId) return null;

  logResolver('👤', 'ArticulosResolver', 'getArticuloAutor', { tenantId, autorId });

  try {
    // Primero intentar buscar en perfiles_asesor
    const sql = `
      SELECT
        pa.id, pa.slug, pa.titulo_profesional as cargo, pa.foto_url, pa.biografia,
        u.nombre, u.apellido, u.email
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      WHERE pa.tenant_id = $1 AND (pa.id = $2 OR pa.usuario_id = $2) AND pa.activo = true
      LIMIT 1
    `;

    const result = await query(sql, [tenantId, autorId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      apellido: row.apellido,
      nombre_completo: `${row.nombre} ${row.apellido}`.trim(),
      cargo: row.cargo,
      foto_url: row.foto_url,
      biografia: row.biografia,
      email: row.email,
      url: buildEntityUrl('/asesores', row.slug),
    };
  } catch (error: any) {
    logResolver('❌', 'ArticulosResolver', `Error en getArticuloAutor: ${error.message}`);
    return null;
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

export interface HandleArticulosParams extends BaseResolverParams {
  slug?: string;
  id?: string;
  categoriaSlug?: string;
  includeRelated?: boolean;
}

export interface HandleArticulosResult {
  // Para listado
  items?: Articulo[];
  // Para categorías
  categorias?: Categoria[];
  categoria?: Categoria | null;
  // Para single
  articulo?: ArticuloConRelaciones | null;
  // Datos relacionados
  autor?: Partial<Asesor> | null;
  relacionados?: Articulo[];
}

/**
 * Handler principal que orquesta las llamadas según el contexto
 *
 * - Si hay slug/id: devuelve single con relaciones
 * - Si hay categoriaSlug: devuelve artículos de esa categoría
 * - Si no hay parámetros: devuelve lista general
 */
export async function handleArticulos(params: HandleArticulosParams): Promise<HandleArticulosResult> {
  const { slug, id, categoriaSlug, filters, includeRelated = true } = params;
  const searchValue = slug || id || filters?.slug || filters?.id;

  // Si hay un identificador de artículo, resolver single con relaciones
  if (searchValue) {
    const articulo = await getArticuloSingle({
      ...params,
      slug: searchValue,
    });

    if (!articulo) {
      return { articulo: null };
    }

    // Si se solicitan relaciones, obtenerlas en paralelo
    if (includeRelated) {
      const [autor, relacionados] = await Promise.all([
        articulo.autor_id
          ? getArticuloAutor({
              tenantId: params.tenantId,
              autorId: articulo.autor_id,
            })
          : Promise.resolve(null),
        getArticulosRelacionados({
          tenantId: params.tenantId,
          articuloId: articulo.id,
          categoriaId: articulo.categoria_id,
          idioma: params.idioma,
        }),
      ]);

      return {
        articulo: {
          ...articulo,
          autor: autor as Asesor,
          relacionados,
        },
        autor,
        relacionados,
      };
    }

    return { articulo };
  }

  // Si hay categoriaSlug, devolver artículos de esa categoría
  if (categoriaSlug) {
    const { categoria, items } = await getArticulosPorCategoria({
      ...params,
      categoriaSlug,
    });

    return {
      categoria,
      items,
    };
  }

  // Sin identificador, devolver lista general
  const items = await getArticulosList(params as ArticulosListParams);
  const categorias = await getArticulosCategorias(params);

  return { items, categorias };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getArticulosList,
  getArticuloSingle,
  getArticulosCategorias,
  getArticulosPorCategoria,
  getArticulosRelacionados,
  getArticuloAutor,
  handleArticulos,
};
