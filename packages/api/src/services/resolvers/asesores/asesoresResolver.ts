/**
 * Asesores Resolver
 *
 * Resolver modular para asesores/agentes inmobiliarios.
 * Expone funciones independientes que pueden ser llamadas por separado
 * o combinadas a través del handler principal.
 *
 * Funciones disponibles:
 * - getAsesoresList: Lista de asesores
 * - getAsesorSingle: Asesor individual por ID o slug
 * - getAsesorPropiedades: Propiedades del asesor
 * - getAsesorTestimonios: Testimonios del asesor
 * - getAsesorVideos: Videos del asesor
 * - getAsesorArticulos: Artículos del asesor
 * - handleAsesores: Handler principal que orquesta todo
 */

import {
  query,
  parseArrayField,
  parseObjectField,
  calculateOffset,
  logResolver,
  buildEntityUrl,
} from '../base/utils.js';

import type {
  BaseResolverParams,
  SingleParams,
  Asesor,
  AsesorConRelaciones,
  AsesorStats,
} from '../base/types.js';

// ============================================================================
// TIPOS ESPECÍFICOS
// ============================================================================

export interface AsesoresListParams extends BaseResolverParams {
  filters?: {
    activo?: boolean;
    destacado?: boolean;
    equipo_id?: string;
    rango?: string;
    visible_en_web?: boolean;
  };
}

export interface AsesorSingleParams extends SingleParams {
  includeRelated?: boolean;
}

// ============================================================================
// QUERIES BASE
// ============================================================================

const BASE_SELECT = `
  pa.id,
  pa.slug,
  pa.titulo_profesional as cargo,
  pa.biografia,
  pa.foto_url,
  pa.video_presentacion_url,
  pa.especialidades,
  pa.idiomas,
  pa.zonas,
  pa.tipos_propiedad,
  pa.experiencia_anos,
  pa.rango,
  pa.fecha_inicio,
  pa.split_comision,
  pa.meta_mensual,
  pa.stats,
  pa.redes_sociales,
  pa.whatsapp,
  pa.telefono_directo,
  pa.certificaciones,
  pa.logros,
  pa.activo,
  pa.destacado,
  pa.visible_en_web,
  pa.orden,
  pa.traducciones,
  pa.metadata,
  -- Datos del usuario
  u.id as usuario_id,
  u.nombre,
  u.apellido,
  u.email,
  u.telefono,
  u.avatar_url,
  -- Datos del equipo
  e.id as equipo_id,
  e.nombre as equipo_nombre,
  e.slug as equipo_slug,
  e.zona_principal as equipo_zona
`;

const BASE_FROM = `
  FROM perfiles_asesor pa
  INNER JOIN usuarios u ON pa.usuario_id = u.id
  LEFT JOIN equipos e ON pa.equipo_id = e.id
`;

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Mapea un row de la BD a un objeto Asesor normalizado
 */
function mapRowToAsesor(row: any): Asesor {
  const stats = parseObjectField(row.stats) as AsesorStats;
  const propiedadesActivas = row.propiedades_activas_count || stats.propiedades_activas || 0;

  return {
    id: row.id,
    slug: row.slug,
    url: buildEntityUrl('/asesores', row.slug),
    usuario_id: row.usuario_id,
    nombre: row.nombre,
    apellido: row.apellido,
    nombre_completo: `${row.nombre} ${row.apellido}`.trim(),
    cargo: row.cargo || 'Asesor Inmobiliario',
    biografia: row.biografia,
    email: row.email,
    telefono: row.telefono_directo || row.telefono,
    whatsapp: row.whatsapp,
    foto_url: row.foto_url || row.avatar_url,
    video_presentacion_url: row.video_presentacion_url,
    redes_sociales: parseObjectField(row.redes_sociales),
    especialidades: parseArrayField(row.especialidades),
    idiomas: parseArrayField(row.idiomas),
    zonas: parseArrayField(row.zonas),
    tipos_propiedad: parseArrayField(row.tipos_propiedad),
    experiencia_anos: row.experiencia_anos,
    rango: row.rango,
    fecha_inicio: row.fecha_inicio,
    certificaciones: parseArrayField(row.certificaciones),
    logros: parseArrayField(row.logros),
    stats: {
      ...stats,
      propiedades_activas: propiedadesActivas,
    },
    equipo: row.equipo_id
      ? {
          id: row.equipo_id,
          nombre: row.equipo_nombre,
          slug: row.equipo_slug,
          zona: row.equipo_zona,
        }
      : undefined,
    activo: row.activo,
    destacado: row.destacado,
    visible_en_web: row.visible_en_web,
    orden: row.orden,
    traducciones: parseObjectField(row.traducciones),
  };
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene lista de asesores
 */
export async function getAsesoresList(params: AsesoresListParams): Promise<Asesor[]> {
  const { tenantId, filters, pagination } = params;
  const { limit, offset } = calculateOffset(pagination);

  logResolver('👥', 'AsesoresResolver', 'getAsesoresList', { tenantId, limit });

  try {
    let sql = `
      SELECT ${BASE_SELECT},
        -- Conteo real de propiedades activas
        COALESCE(prop_count.total, 0)::integer as propiedades_activas_count
      ${BASE_FROM}
      LEFT JOIN (
        SELECT
          COALESCE(perfil_asesor_id, agente_id) as asesor_ref,
          COUNT(*) as total
        FROM propiedades
        WHERE tenant_id = $1 AND activo = true
        GROUP BY COALESCE(perfil_asesor_id, agente_id)
      ) prop_count ON prop_count.asesor_ref = pa.id OR prop_count.asesor_ref = u.id
      WHERE pa.tenant_id = $1
    `;

    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    // Filtros
    if (filters?.activo !== false) {
      sql += ' AND pa.activo = true AND pa.visible_en_web = true AND u.activo = true';
    }

    if (filters?.destacado !== undefined) {
      sql += ` AND pa.destacado = $${paramIndex++}`;
      queryParams.push(filters.destacado);
    }

    if (filters?.equipo_id) {
      sql += ` AND pa.equipo_id = $${paramIndex++}`;
      queryParams.push(filters.equipo_id);
    }

    if (filters?.rango) {
      sql += ` AND pa.rango = $${paramIndex++}`;
      queryParams.push(filters.rango);
    }

    sql += ` ORDER BY pa.destacado DESC, pa.orden ASC, u.nombre ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);

    const asesores = result.rows.map(mapRowToAsesor);
    logResolver('✅', 'AsesoresResolver', `Lista resuelta: ${asesores.length} asesores`);

    return asesores;
  } catch (error: any) {
    logResolver('❌', 'AsesoresResolver', `Error en getAsesoresList: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene un asesor por ID o slug
 */
export async function getAsesorSingle(params: AsesorSingleParams): Promise<Asesor | null> {
  const { tenantId, id, slug, filters } = params;
  const searchValue = id || slug || filters?.slug || filters?.id;

  if (!searchValue) {
    return null;
  }

  logResolver('👤', 'AsesoresResolver', 'getAsesorSingle', { tenantId, searchValue });

  try {
    // Determinar si buscar por UUID o slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchValue);
    const searchField = isUUID ? 'pa.id' : 'pa.slug';

    const sql = `
      SELECT ${BASE_SELECT},
        e.descripcion as equipo_descripcion,
        -- Conteo real de propiedades activas
        COALESCE(prop_count.total, 0)::integer as propiedades_activas_count
      ${BASE_FROM}
      LEFT JOIN (
        SELECT
          COALESCE(perfil_asesor_id, agente_id) as asesor_ref,
          COUNT(*) as total
        FROM propiedades
        WHERE tenant_id = $2 AND activo = true
        GROUP BY COALESCE(perfil_asesor_id, agente_id)
      ) prop_count ON prop_count.asesor_ref = pa.id OR prop_count.asesor_ref = u.id
      WHERE pa.tenant_id = $2 AND ${searchField}::text = $1 AND pa.activo = true AND u.activo = true
      LIMIT 1
    `;

    const result = await query(sql, [searchValue, tenantId]);

    if (result.rows.length === 0) {
      logResolver('⚠️', 'AsesoresResolver', `Asesor no encontrado: ${searchValue}`);
      return null;
    }

    const asesor = mapRowToAsesor(result.rows[0]);
    logResolver('✅', 'AsesoresResolver', `Asesor encontrado: ${asesor.nombre_completo}`);

    return asesor;
  } catch (error: any) {
    logResolver('❌', 'AsesoresResolver', `Error en getAsesorSingle: ${error.message}`);
    return null;
  }
}

/**
 * Obtiene propiedades del asesor
 */
export async function getAsesorPropiedades(
  params: BaseResolverParams & { asesorId: string; usuarioId?: string }
): Promise<any[]> {
  const { tenantId, asesorId, usuarioId, pagination } = params;
  const { limit, offset } = calculateOffset(pagination);

  logResolver('🏠', 'AsesoresResolver', 'getAsesorPropiedades', { tenantId, asesorId });

  try {
    const sql = `
      SELECT
        id, slug, titulo, descripcion_corta, tipo, operacion, precio, moneda,
        ciudad, sector, habitaciones, banos, m2_construccion, m2_terreno,
        imagen_principal, imagenes, destacada, exclusiva, estado_propiedad
      FROM propiedades
      WHERE tenant_id = $1
        AND activo = true
        AND (perfil_asesor_id = $2 OR agente_id = $2 ${usuarioId ? `OR agente_id = $4` : ''})
      ORDER BY destacada DESC, created_at DESC
      LIMIT $3 OFFSET ${usuarioId ? '$5' : '$4'}
    `;

    const queryParams = usuarioId
      ? [tenantId, asesorId, limit, usuarioId, offset]
      : [tenantId, asesorId, limit, offset];

    const result = await query(sql, queryParams);

    const propiedades = result.rows.map((row: any) => ({
      ...row,
      imagenes: parseArrayField(row.imagenes),
      url: buildEntityUrl('/propiedades', row.slug),
    }));

    logResolver('✅', 'AsesoresResolver', `Propiedades del asesor: ${propiedades.length}`);
    return propiedades;
  } catch (error: any) {
    logResolver('❌', 'AsesoresResolver', `Error en getAsesorPropiedades: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene testimonios del asesor
 */
export async function getAsesorTestimonios(
  params: BaseResolverParams & { asesorId: string }
): Promise<any[]> {
  const { tenantId, asesorId, pagination } = params;
  const { limit, offset } = calculateOffset(pagination);

  logResolver('💬', 'AsesoresResolver', 'getAsesorTestimonios', { tenantId, asesorId });

  try {
    const sql = `
      SELECT
        t.id, t.slug, t.cliente_nombre, t.cliente_cargo, t.cliente_empresa,
        t.cliente_foto, t.titulo, t.contenido, t.rating, t.verificado, t.fecha,
        c.slug as categoria_slug, c.nombre as categoria_nombre
      FROM testimonios t
      LEFT JOIN categorias_contenido c ON t.categoria_id = c.id
      WHERE t.tenant_id = $1 AND t.asesor_id = $2 AND t.publicado = true
      ORDER BY t.destacado DESC, t.fecha DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await query(sql, [tenantId, asesorId, limit, offset]);

    const testimonios = result.rows.map((row: any) => ({
      ...row,
      url: buildEntityUrl('/testimonios', row.slug, undefined, row.categoria_slug),
    }));

    logResolver('✅', 'AsesoresResolver', `Testimonios del asesor: ${testimonios.length}`);
    return testimonios;
  } catch (error: any) {
    logResolver('❌', 'AsesoresResolver', `Error en getAsesorTestimonios: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene videos del asesor (por autor_id)
 */
export async function getAsesorVideos(
  params: BaseResolverParams & { autorId: string }
): Promise<any[]> {
  const { tenantId, autorId, pagination } = params;
  const { limit, offset } = calculateOffset(pagination);

  logResolver('🎥', 'AsesoresResolver', 'getAsesorVideos', { tenantId, autorId });

  try {
    const sql = `
      SELECT
        v.id, v.slug, v.titulo, v.descripcion, v.video_url, v.thumbnail,
        v.duracion_segundos, v.vistas, v.fecha_publicacion,
        c.slug as categoria_slug, c.nombre as categoria_nombre
      FROM videos v
      LEFT JOIN categorias_contenido c ON v.categoria_id = c.id
      WHERE v.tenant_id = $1 AND v.autor_id = $2 AND v.publicado = true
      ORDER BY v.destacado DESC, v.fecha_publicacion DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await query(sql, [tenantId, autorId, limit, offset]);

    const videos = result.rows.map((row: any) => ({
      ...row,
      url: buildEntityUrl('/videos', row.slug, undefined, row.categoria_slug),
    }));

    logResolver('✅', 'AsesoresResolver', `Videos del asesor: ${videos.length}`);
    return videos;
  } catch (error: any) {
    logResolver('❌', 'AsesoresResolver', `Error en getAsesorVideos: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene artículos del asesor (por autor_id)
 */
export async function getAsesorArticulos(
  params: BaseResolverParams & { autorId: string }
): Promise<any[]> {
  const { tenantId, autorId, pagination } = params;
  const { limit, offset } = calculateOffset(pagination);

  logResolver('📝', 'AsesoresResolver', 'getAsesorArticulos', { tenantId, autorId });

  try {
    const sql = `
      SELECT
        a.id, a.slug, a.titulo, a.extracto, a.imagen_principal,
        a.autor_nombre, a.autor_foto, a.vistas, a.fecha_publicacion,
        c.slug as categoria_slug, c.nombre as categoria_nombre
      FROM articulos a
      LEFT JOIN categorias_contenido c ON a.categoria_id = c.id
      WHERE a.tenant_id = $1 AND a.autor_id = $2 AND a.publicado = true
      ORDER BY a.destacado DESC, a.fecha_publicacion DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await query(sql, [tenantId, autorId, limit, offset]);

    const articulos = result.rows.map((row: any) => ({
      ...row,
      url: buildEntityUrl('/articulos', row.slug, undefined, row.categoria_slug),
    }));

    logResolver('✅', 'AsesoresResolver', `Artículos del asesor: ${articulos.length}`);
    return articulos;
  } catch (error: any) {
    logResolver('❌', 'AsesoresResolver', `Error en getAsesorArticulos: ${error.message}`);
    return [];
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

export interface HandleAsesoresParams extends BaseResolverParams {
  slug?: string;
  id?: string;
  includeRelated?: boolean;
}

export interface HandleAsesoresResult {
  // Para listado
  items?: Asesor[];
  // Para single
  asesor?: AsesorConRelaciones | null;
  // Datos relacionados (para single)
  propiedades?: any[];
  testimonios?: any[];
  videos?: any[];
  articulos?: any[];
}

/**
 * Handler principal que orquesta las llamadas según el contexto
 *
 * - Si hay slug/id: devuelve single con relaciones
 * - Si no hay slug/id: devuelve lista
 */
export async function handleAsesores(params: HandleAsesoresParams): Promise<HandleAsesoresResult> {
  const { slug, id, filters, includeRelated = true } = params;
  const searchValue = slug || id || filters?.slug || filters?.id;

  // Si hay un identificador, resolver single con relaciones
  if (searchValue) {
    const asesor = await getAsesorSingle({
      ...params,
      slug: searchValue,
    });

    if (!asesor) {
      return { asesor: null };
    }

    // Si se solicitan relaciones, obtenerlas en paralelo
    if (includeRelated) {
      const [propiedades, testimonios, videos, articulos] = await Promise.all([
        getAsesorPropiedades({
          tenantId: params.tenantId,
          asesorId: asesor.id,
          usuarioId: asesor.usuario_id,
          pagination: { limit: 6 },
        }),
        getAsesorTestimonios({
          tenantId: params.tenantId,
          asesorId: asesor.id,
          pagination: { limit: 4 },
        }),
        getAsesorVideos({
          tenantId: params.tenantId,
          autorId: asesor.usuario_id,
          pagination: { limit: 4 },
        }),
        getAsesorArticulos({
          tenantId: params.tenantId,
          autorId: asesor.usuario_id,
          pagination: { limit: 4 },
        }),
      ]);

      return {
        asesor: {
          ...asesor,
          propiedades,
          testimonios,
          videos,
          articulos,
        },
        propiedades,
        testimonios,
        videos,
        articulos,
      };
    }

    return { asesor };
  }

  // Sin identificador, devolver lista
  const items = await getAsesoresList(params as AsesoresListParams);
  return { items };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getAsesoresList,
  getAsesorSingle,
  getAsesorPropiedades,
  getAsesorTestimonios,
  getAsesorVideos,
  getAsesorArticulos,
  handleAsesores,
};
