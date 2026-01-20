/**
 * Propiedades Resolver
 *
 * Resolver modular para propiedades inmobiliarias.
 * Expone funciones independientes que pueden ser llamadas por separado
 * o combinadas a través del handler principal.
 *
 * Funciones disponibles:
 * - getPropiedadesList: Lista de propiedades con filtros
 * - getPropiedadSingle: Propiedad individual por ID o slug
 * - getPropiedadesSimilares: Propiedades similares
 * - getPropiedadAsesor: Asesor de la propiedad
 * - getPropiedadesDestacadas: Propiedades destacadas
 * - getPropiedadesPorUbicacion: Propiedades filtradas por ubicación
 * - handlePropiedades: Handler principal que orquesta todo
 */

import {
  query,
  parseArrayField,
  parseObjectField,
  calculateOffset,
  applyTranslations,
  logResolver,
  buildEntityUrl,
  buildUbicacionString,
  normalizeLanguage,
} from '../base/utils.js';

import type {
  BaseResolverParams,
  SingleParams,
  Propiedad,
  PropiedadConRelaciones,
  Asesor,
} from '../base/types.js';

// ============================================================================
// TIPOS ESPECÍFICOS
// ============================================================================

export interface PropiedadesListParams extends BaseResolverParams {
  filters?: {
    activo?: boolean;
    destacada?: boolean;
    exclusiva?: boolean;
    tipo?: string;
    operacion?: string;
    ciudad?: string;
    sector?: string;
    provincia?: string;
    agente_id?: string;
    perfil_asesor_id?: string;
    precio_min?: number;
    precio_max?: number;
    habitaciones_min?: number;
    banos_min?: number;
    m2_min?: number;
    exclude_id?: string;
  };
}

export interface PropiedadSingleParams extends SingleParams {
  includeRelated?: boolean;
}

// ============================================================================
// QUERIES BASE
// ============================================================================

const BASE_SELECT = `
  p.id, p.slug, p.codigo, p.titulo, p.descripcion, p.descripcion_corta,
  p.tipo, p.operacion, p.precio, p.precio_anterior, p.moneda,
  p.pais, p.provincia, p.ciudad, p.sector, p.direccion,
  p.latitud, p.longitud, p.mostrar_ubicacion_exacta,
  p.habitaciones, p.banos, p.medios_banos, p.estacionamientos,
  p.m2_construccion, p.m2_terreno, p.antiguedad, p.pisos,
  p.amenidades, p.caracteristicas,
  p.imagen_principal, p.imagenes, p.video_url, p.tour_virtual_url,
  p.estado_propiedad, p.destacada, p.exclusiva,
  p.agente_id, p.perfil_asesor_id, p.propietario_id,
  p.notas, p.traducciones,
  p.created_at, p.updated_at
`;

const BASE_FROM = `FROM propiedades p`;

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Mapea un row de la BD a un objeto Propiedad normalizado
 */
function mapRowToPropiedad(row: any, idioma: string = 'es'): Propiedad {
  const traducciones = parseObjectField(row.traducciones);

  // Aplicar traducciones
  const rowTraducido = applyTranslations({ ...row, traducciones }, 'propiedades', idioma);

  // Parsear imágenes
  let imagenesArray = parseArrayField(row.imagenes);

  // Construir ubicación compuesta
  const ubicacion = buildUbicacionString(row.sector, row.ciudad, row.provincia);

  return {
    id: row.id,
    slug: row.slug,
    url: buildEntityUrl('/propiedades', row.slug),
    codigo: row.codigo,
    titulo: rowTraducido.titulo,
    descripcion: rowTraducido.descripcion,
    descripcion_corta: rowTraducido.descripcion_corta,
    tipo: row.tipo,
    operacion: row.operacion,
    precio: row.precio,
    precio_anterior: row.precio_anterior,
    moneda: row.moneda || 'USD',
    // Ubicación
    pais: row.pais,
    provincia: row.provincia,
    ciudad: row.ciudad,
    sector: row.sector,
    direccion: row.direccion,
    ubicacion: ubicacion || row.direccion,
    latitud: row.latitud,
    longitud: row.longitud,
    // Características
    habitaciones: row.habitaciones,
    banos: row.banos,
    medios_banos: row.medios_banos,
    estacionamientos: row.estacionamientos,
    m2_construccion: row.m2_construccion,
    m2_terreno: row.m2_terreno,
    antiguedad: row.antiguedad,
    pisos: row.pisos,
    amenidades: parseArrayField(row.amenidades),
    caracteristicas: parseObjectField(row.caracteristicas),
    // Imágenes
    imagen_principal: row.imagen_principal || (imagenesArray.length > 0 ? imagenesArray[0] : null),
    imagenes: imagenesArray,
    video_url: row.video_url,
    tour_virtual_url: row.tour_virtual_url,
    // Estado
    estado_propiedad: row.estado_propiedad,
    destacado: row.destacada,
    exclusiva: row.exclusiva,
    // Relaciones
    agente_id: row.agente_id,
    perfil_asesor_id: row.perfil_asesor_id,
    propietario_id: row.propietario_id,
    // Metadata
    traducciones,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene lista de propiedades con filtros avanzados
 */
export async function getPropiedadesList(params: PropiedadesListParams): Promise<Propiedad[]> {
  const { tenantId, filters, pagination, idioma = 'es' } = params;
  const { limit, offset } = calculateOffset(pagination);
  const normalizedIdioma = normalizeLanguage(idioma);

  logResolver('🏠', 'PropiedadesResolver', 'getPropiedadesList', { tenantId, limit });

  try {
    let sql = `SELECT ${BASE_SELECT} ${BASE_FROM} WHERE p.tenant_id = $1`;
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    // Filtro base de activo
    if (filters?.activo !== false) {
      sql += ' AND p.activo = true';
    }

    // Filtros de características
    if (filters?.destacada) {
      sql += ' AND p.destacada = true';
    }

    if (filters?.exclusiva) {
      sql += ' AND p.exclusiva = true';
    }

    if (filters?.tipo) {
      sql += ` AND p.tipo = $${paramIndex++}`;
      queryParams.push(filters.tipo);
    }

    if (filters?.operacion) {
      sql += ` AND p.operacion = $${paramIndex++}`;
      queryParams.push(filters.operacion);
    }

    // Filtros de ubicación
    if (filters?.ciudad) {
      sql += ` AND p.ciudad = $${paramIndex++}`;
      queryParams.push(filters.ciudad);
    }

    if (filters?.sector) {
      sql += ` AND p.sector = $${paramIndex++}`;
      queryParams.push(filters.sector);
    }

    if (filters?.provincia) {
      sql += ` AND p.provincia = $${paramIndex++}`;
      queryParams.push(filters.provincia);
    }

    // Filtros de agente/asesor
    if (filters?.agente_id) {
      sql += ` AND (p.agente_id = $${paramIndex} OR p.perfil_asesor_id = $${paramIndex})`;
      paramIndex++;
      queryParams.push(filters.agente_id);
    }

    if (filters?.perfil_asesor_id) {
      sql += ` AND p.perfil_asesor_id = $${paramIndex++}`;
      queryParams.push(filters.perfil_asesor_id);
    }

    // Filtros de precio
    if (filters?.precio_min) {
      sql += ` AND p.precio >= $${paramIndex++}`;
      queryParams.push(filters.precio_min);
    }

    if (filters?.precio_max) {
      sql += ` AND p.precio <= $${paramIndex++}`;
      queryParams.push(filters.precio_max);
    }

    // Filtros de características físicas
    if (filters?.habitaciones_min) {
      sql += ` AND p.habitaciones >= $${paramIndex++}`;
      queryParams.push(filters.habitaciones_min);
    }

    if (filters?.banos_min) {
      sql += ` AND p.banos >= $${paramIndex++}`;
      queryParams.push(filters.banos_min);
    }

    if (filters?.m2_min) {
      sql += ` AND (p.m2_construccion >= $${paramIndex} OR p.m2_terreno >= $${paramIndex})`;
      paramIndex++;
      queryParams.push(filters.m2_min);
    }

    // Excluir una propiedad específica
    if (filters?.exclude_id) {
      sql += ` AND p.id != $${paramIndex++}`;
      queryParams.push(filters.exclude_id);
    }

    sql += ` ORDER BY p.destacada DESC, p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(sql, queryParams);

    const propiedades = result.rows.map((row: any) => mapRowToPropiedad(row, normalizedIdioma));
    logResolver('✅', 'PropiedadesResolver', `Lista resuelta: ${propiedades.length} propiedades`);

    return propiedades;
  } catch (error: any) {
    logResolver('❌', 'PropiedadesResolver', `Error en getPropiedadesList: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene una propiedad por ID o slug
 */
export async function getPropiedadSingle(params: PropiedadSingleParams): Promise<Propiedad | null> {
  const { tenantId, id, slug, filters, idioma = 'es' } = params;
  const searchValue = id || slug || filters?.slug || filters?.id;
  const normalizedIdioma = normalizeLanguage(idioma);

  if (!searchValue) {
    return null;
  }

  logResolver('🏠', 'PropiedadesResolver', 'getPropiedadSingle', { tenantId, searchValue });

  try {
    const sql = `
      SELECT ${BASE_SELECT}
      ${BASE_FROM}
      WHERE p.tenant_id = $2 AND p.activo = true AND (p.id::text = $1 OR p.slug = $1)
      LIMIT 1
    `;

    const result = await query(sql, [searchValue, tenantId]);

    if (result.rows.length === 0) {
      logResolver('⚠️', 'PropiedadesResolver', `Propiedad no encontrada: ${searchValue}`);
      return null;
    }

    const propiedad = mapRowToPropiedad(result.rows[0], normalizedIdioma);
    logResolver('✅', 'PropiedadesResolver', `Propiedad encontrada: ${propiedad.titulo}`);

    return propiedad;
  } catch (error: any) {
    logResolver('❌', 'PropiedadesResolver', `Error en getPropiedadSingle: ${error.message}`);
    return null;
  }
}

/**
 * Obtiene propiedades similares (mismo tipo y ciudad)
 */
export async function getPropiedadesSimilares(
  params: BaseResolverParams & { propiedadId: string; tipo?: string; ciudad?: string }
): Promise<Propiedad[]> {
  const { tenantId, propiedadId, tipo, ciudad, idioma = 'es' } = params;

  logResolver('🔗', 'PropiedadesResolver', 'getPropiedadesSimilares', { tenantId, propiedadId });

  return getPropiedadesList({
    tenantId,
    idioma,
    filters: {
      tipo,
      ciudad,
      exclude_id: propiedadId,
    },
    pagination: { limit: 4 },
  });
}

/**
 * Obtiene el asesor de la propiedad
 */
export async function getPropiedadAsesor(
  params: BaseResolverParams & { agenteId?: string; perfilAsesorId?: string }
): Promise<Partial<Asesor> | null> {
  const { tenantId, agenteId, perfilAsesorId } = params;

  const searchId = perfilAsesorId || agenteId;
  if (!searchId) return null;

  logResolver('👤', 'PropiedadesResolver', 'getPropiedadAsesor', { tenantId, searchId });

  try {
    const sql = `
      SELECT
        pa.id, pa.slug, pa.titulo_profesional as cargo, pa.foto_url, pa.biografia,
        pa.whatsapp, pa.telefono_directo, pa.experiencia_anos, pa.rango,
        pa.redes_sociales, pa.especialidades,
        u.nombre, u.apellido, u.email, u.telefono
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      WHERE pa.tenant_id = $1 AND (pa.id = $2 OR pa.usuario_id = $2) AND pa.activo = true
      LIMIT 1
    `;

    const result = await query(sql, [tenantId, searchId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      apellido: row.apellido,
      nombre_completo: `${row.nombre} ${row.apellido}`.trim(),
      cargo: row.cargo || 'Asesor Inmobiliario',
      foto_url: row.foto_url,
      biografia: row.biografia,
      email: row.email,
      telefono: row.telefono_directo || row.telefono,
      whatsapp: row.whatsapp,
      experiencia_anos: row.experiencia_anos,
      rango: row.rango,
      especialidades: parseArrayField(row.especialidades),
      redes_sociales: parseObjectField(row.redes_sociales),
      url: buildEntityUrl('/asesores', row.slug),
    };
  } catch (error: any) {
    logResolver('❌', 'PropiedadesResolver', `Error en getPropiedadAsesor: ${error.message}`);
    return null;
  }
}

/**
 * Obtiene propiedades destacadas
 */
export async function getPropiedadesDestacadas(params: BaseResolverParams): Promise<Propiedad[]> {
  logResolver('⭐', 'PropiedadesResolver', 'getPropiedadesDestacadas', { tenantId: params.tenantId });

  return getPropiedadesList({
    ...params,
    filters: { destacada: true },
    pagination: params.pagination || { limit: 8 },
  });
}

/**
 * Obtiene propiedades por ubicación (ciudad/sector)
 */
export async function getPropiedadesPorUbicacion(
  params: PropiedadesListParams & { ciudad?: string; sector?: string }
): Promise<{ ubicacion: { ciudad?: string; sector?: string }; items: Propiedad[] }> {
  const { ciudad, sector } = params;

  logResolver('📍', 'PropiedadesResolver', 'getPropiedadesPorUbicacion', {
    tenantId: params.tenantId,
    ciudad,
    sector,
  });

  const items = await getPropiedadesList({
    ...params,
    filters: {
      ...params.filters,
      ciudad,
      sector,
    },
  });

  return {
    ubicacion: { ciudad, sector },
    items,
  };
}

/**
 * Obtiene conteo de propiedades por tipo
 */
export async function getPropiedadesCountByTipo(
  params: BaseResolverParams
): Promise<{ tipo: string; count: number }[]> {
  const { tenantId } = params;

  logResolver('📊', 'PropiedadesResolver', 'getPropiedadesCountByTipo', { tenantId });

  try {
    const sql = `
      SELECT tipo, COUNT(*)::integer as count
      FROM propiedades
      WHERE tenant_id = $1 AND activo = true
      GROUP BY tipo
      ORDER BY count DESC
    `;

    const result = await query(sql, [tenantId]);
    return result.rows;
  } catch (error: any) {
    logResolver('❌', 'PropiedadesResolver', `Error en getPropiedadesCountByTipo: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene conteo de propiedades por operación
 */
export async function getPropiedadesCountByOperacion(
  params: BaseResolverParams
): Promise<{ operacion: string; count: number }[]> {
  const { tenantId } = params;

  logResolver('📊', 'PropiedadesResolver', 'getPropiedadesCountByOperacion', { tenantId });

  try {
    const sql = `
      SELECT operacion, COUNT(*)::integer as count
      FROM propiedades
      WHERE tenant_id = $1 AND activo = true
      GROUP BY operacion
      ORDER BY count DESC
    `;

    const result = await query(sql, [tenantId]);
    return result.rows;
  } catch (error: any) {
    logResolver('❌', 'PropiedadesResolver', `Error en getPropiedadesCountByOperacion: ${error.message}`);
    return [];
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

export interface HandlePropiedadesParams extends PropiedadesListParams {
  slug?: string;
  id?: string;
  includeRelated?: boolean;
}

export interface HandlePropiedadesResult {
  // Para listado
  items?: Propiedad[];
  // Para single
  propiedad?: PropiedadConRelaciones | null;
  // Datos relacionados
  asesor?: Partial<Asesor> | null;
  similares?: Propiedad[];
  // Stats
  countByTipo?: { tipo: string; count: number }[];
  countByOperacion?: { operacion: string; count: number }[];
}

/**
 * Handler principal que orquesta las llamadas según el contexto
 *
 * - Si hay slug/id: devuelve single con relaciones
 * - Si no hay parámetros: devuelve lista general
 */
export async function handlePropiedades(params: HandlePropiedadesParams): Promise<HandlePropiedadesResult> {
  const { slug, id, includeRelated = true } = params;
  const searchValue = slug || id;

  // Si hay un identificador de propiedad, resolver single con relaciones
  if (searchValue) {
    const propiedad = await getPropiedadSingle({
      ...params,
      slug: searchValue,
    });

    if (!propiedad) {
      return { propiedad: null };
    }

    // Si se solicitan relaciones, obtenerlas en paralelo
    if (includeRelated) {
      const [asesor, similares] = await Promise.all([
        getPropiedadAsesor({
          tenantId: params.tenantId,
          agenteId: propiedad.agente_id,
          perfilAsesorId: propiedad.perfil_asesor_id,
        }),
        getPropiedadesSimilares({
          tenantId: params.tenantId,
          propiedadId: propiedad.id,
          tipo: propiedad.tipo,
          ciudad: propiedad.ciudad,
          idioma: params.idioma,
        }),
      ]);

      return {
        propiedad: {
          ...propiedad,
          asesor: asesor as Asesor,
          similares,
        },
        asesor,
        similares,
      };
    }

    return { propiedad };
  }

  // Sin identificador, devolver lista general con stats
  const [items, countByTipo, countByOperacion] = await Promise.all([
    getPropiedadesList(params),
    getPropiedadesCountByTipo(params),
    getPropiedadesCountByOperacion(params),
  ]);

  return { items, countByTipo, countByOperacion };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
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
