/**
 * Ubicaciones Service
 * CRUD y utilidades para gestión de ubicaciones jerárquicas
 */

import { query } from '../utils/db.js';

// Tipos
export type TipoUbicacion = 'pais' | 'provincia' | 'ciudad' | 'sector' | 'zona';

export interface Ubicacion {
  id: string;
  parent_id: string | null;
  tipo: TipoUbicacion;
  nivel: number;
  nombre: string;
  slug: string;
  codigo?: string;
  tagline?: string;
  descripcion?: string;
  descripcion_corta?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  imagenes?: {
    hero?: { url: string; alt?: string; caption?: string };
    thumbnail?: { url: string; alt?: string };
    gallery?: { url: string; alt?: string; caption?: string; orden?: number }[];
    mapa?: { url: string; alt?: string };
  };
  lugares_cercanos?: {
    tipo: string;
    nombre: string;
    distancia?: string;
    rating?: number;
  }[];
  servicios?: string[];
  stats?: {
    propiedades_total?: number;
    propiedades_venta?: number;
    propiedades_alquiler?: number;
    precio_promedio_venta?: number;
    precio_promedio_alquiler?: number;
    precio_m2_promedio?: number;
    tendencia?: 'alza' | 'baja' | 'estable';
    demanda?: 'alta' | 'media' | 'baja';
    tiempo_promedio_venta?: number;
    updated_at?: string;
  };
  latitud?: number;
  longitud?: number;
  bounds?: { north: number; south: number; east: number; west: number };
  traducciones?: Record<string, {
    nombre?: string;
    tagline?: string;
    descripcion?: string;
    descripcion_corta?: string;
    meta_title?: string;
    meta_description?: string;
  }>;
  slug_traducciones?: Record<string, string>;
  destacado: boolean;
  mostrar_en_menu: boolean;
  mostrar_en_filtros: boolean;
  orden: number;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
  // Campos calculados
  children_count?: number;
  propiedades_count?: number;
  breadcrumb?: { id: string; nombre: string; slug: string; tipo: TipoUbicacion }[];
}

export interface CreateUbicacionData {
  parent_id?: string | null;
  tipo: TipoUbicacion;
  nombre: string;
  slug?: string;
  codigo?: string;
  tagline?: string;
  descripcion?: string;
  descripcion_corta?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  imagenes?: Ubicacion['imagenes'];
  lugares_cercanos?: Ubicacion['lugares_cercanos'];
  servicios?: string[];
  stats?: Ubicacion['stats'];
  latitud?: number;
  longitud?: number;
  bounds?: Ubicacion['bounds'];
  traducciones?: Ubicacion['traducciones'];
  slug_traducciones?: Record<string, string>;
  destacado?: boolean;
  mostrar_en_menu?: boolean;
  mostrar_en_filtros?: boolean;
  orden?: number;
}

// ============================================
// HELPERS
// ============================================

function getNivelPorTipo(tipo: TipoUbicacion): number {
  const niveles: Record<TipoUbicacion, number> = {
    pais: 1,
    provincia: 2,
    ciudad: 3,
    sector: 4,
    zona: 5,
  };
  return niveles[tipo];
}

function generarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

// ============================================
// CRUD
// ============================================

/**
 * Obtener todas las ubicaciones con filtros
 */
export async function getUbicaciones(filters: {
  tipo?: TipoUbicacion;
  parent_id?: string | null;
  activo?: boolean;
  destacado?: boolean;
  search?: string;
  includeChildren?: boolean;
} = {}): Promise<Ubicacion[]> {
  let sql = `
    SELECT u.*,
      (SELECT COUNT(*) FROM ubicaciones c WHERE c.parent_id = u.id AND c.activo = true) as children_count
    FROM ubicaciones u
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.tipo) {
    sql += ` AND u.tipo = $${paramIndex++}`;
    params.push(filters.tipo);
  }

  if (filters.parent_id !== undefined) {
    if (filters.parent_id === null) {
      sql += ` AND u.parent_id IS NULL`;
    } else {
      sql += ` AND u.parent_id = $${paramIndex++}`;
      params.push(filters.parent_id);
    }
  }

  if (filters.activo !== undefined) {
    sql += ` AND u.activo = $${paramIndex++}`;
    params.push(filters.activo);
  }

  if (filters.destacado !== undefined) {
    sql += ` AND u.destacado = $${paramIndex++}`;
    params.push(filters.destacado);
  }

  if (filters.search) {
    sql += ` AND (u.nombre ILIKE $${paramIndex} OR u.tagline ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  sql += ` ORDER BY u.nivel ASC, u.orden ASC, u.nombre ASC`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Obtener ubicación por ID con breadcrumb
 */
export async function getUbicacionById(id: string): Promise<Ubicacion | null> {
  const sql = `
    WITH RECURSIVE breadcrumb AS (
      SELECT id, nombre, slug, tipo, parent_id, 1 as depth
      FROM ubicaciones
      WHERE id = $1
      UNION ALL
      SELECT u.id, u.nombre, u.slug, u.tipo, u.parent_id, b.depth + 1
      FROM ubicaciones u
      INNER JOIN breadcrumb b ON u.id = b.parent_id
    )
    SELECT u.*,
      (SELECT COUNT(*) FROM ubicaciones c WHERE c.parent_id = u.id AND c.activo = true) as children_count,
      (SELECT json_agg(json_build_object('id', id, 'nombre', nombre, 'slug', slug, 'tipo', tipo) ORDER BY depth DESC)
       FROM breadcrumb WHERE id != $1) as breadcrumb
    FROM ubicaciones u
    WHERE u.id = $1
  `;

  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

/**
 * Obtener ubicación por slug (con path completo opcional)
 */
export async function getUbicacionBySlug(
  slug: string,
  parentSlug?: string
): Promise<Ubicacion | null> {
  let sql: string;
  let params: any[];

  if (parentSlug) {
    // Buscar por slug y slug del padre
    sql = `
      SELECT u.*
      FROM ubicaciones u
      LEFT JOIN ubicaciones p ON u.parent_id = p.id
      WHERE u.slug = $1 AND (p.slug = $2 OR (u.parent_id IS NULL AND $2 IS NULL))
      AND u.activo = true
    `;
    params = [slug, parentSlug];
  } else {
    sql = `SELECT * FROM ubicaciones WHERE slug = $1 AND activo = true`;
    params = [slug];
  }

  const result = await query(sql, params);

  if (result.rows[0]) {
    return getUbicacionById(result.rows[0].id);
  }
  return null;
}

/**
 * Obtener árbol de ubicaciones (para menús/navegación)
 */
export async function getArbolUbicaciones(options: {
  maxNivel?: number;
  soloDestacados?: boolean;
  soloMenu?: boolean;
} = {}): Promise<Ubicacion[]> {
  let sql = `
    WITH RECURSIVE arbol AS (
      SELECT *, 0 as depth
      FROM ubicaciones
      WHERE parent_id IS NULL AND activo = true
      ${options.soloDestacados ? 'AND destacado = true' : ''}
      ${options.soloMenu ? 'AND mostrar_en_menu = true' : ''}

      UNION ALL

      SELECT u.*, a.depth + 1
      FROM ubicaciones u
      INNER JOIN arbol a ON u.parent_id = a.id
      WHERE u.activo = true
      ${options.maxNivel ? `AND a.depth < ${options.maxNivel - 1}` : ''}
      ${options.soloDestacados ? 'AND u.destacado = true' : ''}
      ${options.soloMenu ? 'AND u.mostrar_en_menu = true' : ''}
    )
    SELECT *,
      (SELECT COUNT(*) FROM ubicaciones c WHERE c.parent_id = arbol.id AND c.activo = true) as children_count
    FROM arbol
    ORDER BY depth ASC, orden ASC, nombre ASC
  `;

  const result = await query(sql);
  return result.rows;
}

/**
 * Obtener hijos directos de una ubicación
 */
export async function getHijosUbicacion(parentId: string): Promise<Ubicacion[]> {
  const sql = `
    SELECT u.*,
      (SELECT COUNT(*) FROM ubicaciones c WHERE c.parent_id = u.id AND c.activo = true) as children_count
    FROM ubicaciones u
    WHERE u.parent_id = $1 AND u.activo = true
    ORDER BY u.orden ASC, u.nombre ASC
  `;

  const result = await query(sql, [parentId]);
  return result.rows;
}

/**
 * Crear ubicación
 */
export async function createUbicacion(data: CreateUbicacionData): Promise<Ubicacion> {
  const nivel = getNivelPorTipo(data.tipo);
  const slug = data.slug || generarSlug(data.nombre);

  // Verificar que el parent_id sea válido si se proporciona
  if (data.parent_id) {
    const parent = await query('SELECT tipo, nivel FROM ubicaciones WHERE id = $1', [data.parent_id]);
    if (!parent.rows[0]) {
      throw new Error('Parent no encontrado');
    }
    if (parent.rows[0].nivel >= nivel) {
      throw new Error(`No se puede crear ${data.tipo} dentro de ${parent.rows[0].tipo}`);
    }
  }

  // Verificar slug único dentro del mismo padre
  const existingSlug = await query(
    'SELECT id FROM ubicaciones WHERE slug = $1 AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL))',
    [slug, data.parent_id || null]
  );
  if (existingSlug.rows.length > 0) {
    throw new Error('Ya existe una ubicación con ese slug en el mismo nivel');
  }

  const sql = `
    INSERT INTO ubicaciones (
      parent_id, tipo, nivel, nombre, slug, codigo,
      tagline, descripcion, descripcion_corta,
      meta_title, meta_description, meta_keywords,
      imagenes, lugares_cercanos, servicios, stats,
      latitud, longitud, bounds,
      traducciones, slug_traducciones,
      destacado, mostrar_en_menu, mostrar_en_filtros, orden
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
    ) RETURNING *
  `;

  const result = await query(sql, [
    data.parent_id || null,
    data.tipo,
    nivel,
    data.nombre,
    slug,
    data.codigo || null,
    data.tagline || null,
    data.descripcion || null,
    data.descripcion_corta || null,
    data.meta_title || null,
    data.meta_description || null,
    data.meta_keywords ? JSON.stringify(data.meta_keywords) : null,
    data.imagenes ? JSON.stringify(data.imagenes) : null,
    data.lugares_cercanos ? JSON.stringify(data.lugares_cercanos) : null,
    data.servicios ? JSON.stringify(data.servicios) : null,
    data.stats ? JSON.stringify(data.stats) : null,
    data.latitud || null,
    data.longitud || null,
    data.bounds ? JSON.stringify(data.bounds) : null,
    data.traducciones ? JSON.stringify(data.traducciones) : null,
    data.slug_traducciones ? JSON.stringify(data.slug_traducciones) : null,
    data.destacado ?? false,
    data.mostrar_en_menu ?? true,
    data.mostrar_en_filtros ?? true,
    data.orden ?? 0,
  ]);

  return result.rows[0];
}

/**
 * Actualizar ubicación
 */
export async function updateUbicacion(
  id: string,
  data: Partial<CreateUbicacionData>
): Promise<Ubicacion | null> {
  const existing = await getUbicacionById(id);
  if (!existing) return null;

  // Construir query dinámico
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fields = [
    'nombre', 'slug', 'codigo', 'tagline', 'descripcion', 'descripcion_corta',
    'meta_title', 'meta_description', 'latitud', 'longitud',
    'destacado', 'mostrar_en_menu', 'mostrar_en_filtros', 'orden', 'activo'
  ];

  for (const field of fields) {
    if ((data as any)[field] !== undefined) {
      updates.push(`${field} = $${paramIndex++}`);
      params.push((data as any)[field]);
    }
  }

  // Campos JSONB
  const jsonFields = [
    'meta_keywords', 'imagenes', 'lugares_cercanos', 'servicios',
    'stats', 'bounds', 'traducciones', 'slug_traducciones'
  ];

  for (const field of jsonFields) {
    if ((data as any)[field] !== undefined) {
      updates.push(`${field} = $${paramIndex++}`);
      params.push(JSON.stringify((data as any)[field]));
    }
  }

  if (updates.length === 0) return existing;

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `UPDATE ubicaciones SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await query(sql, params);

  return result.rows[0];
}

/**
 * Eliminar ubicación (soft delete)
 */
export async function deleteUbicacion(id: string, hardDelete = false): Promise<boolean> {
  if (hardDelete) {
    const result = await query('DELETE FROM ubicaciones WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  const result = await query(
    'UPDATE ubicaciones SET activo = false, updated_at = NOW() WHERE id = $1',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Actualizar stats de una ubicación (para cron jobs)
 */
export async function updateUbicacionStats(ubicacionId: string): Promise<void> {
  // Calcular stats basados en propiedades
  const statsQuery = `
    SELECT
      COUNT(*) as propiedades_total,
      COUNT(*) FILTER (WHERE operacion = 'venta') as propiedades_venta,
      COUNT(*) FILTER (WHERE operacion = 'alquiler') as propiedades_alquiler,
      AVG(precio) FILTER (WHERE operacion = 'venta' AND precio > 0) as precio_promedio_venta,
      AVG(precio) FILTER (WHERE operacion = 'alquiler' AND precio > 0) as precio_promedio_alquiler,
      AVG(precio / NULLIF(m2_construccion, 0)) FILTER (WHERE precio > 0 AND m2_construccion > 0) as precio_m2_promedio
    FROM propiedades
    WHERE activo = true AND publicado = true
    AND (
      -- Buscar en todos los campos de ubicación
      EXISTS (
        WITH RECURSIVE ubicacion_tree AS (
          SELECT id FROM ubicaciones WHERE id = $1
          UNION ALL
          SELECT u.id FROM ubicaciones u
          INNER JOIN ubicacion_tree ut ON u.parent_id = ut.id
        )
        SELECT 1 FROM ubicacion_tree
        -- Aquí necesitarías vincular propiedades con ubicaciones
      )
    )
  `;

  // Por ahora, solo actualizar el timestamp
  await query(`
    UPDATE ubicaciones
    SET stats = COALESCE(stats, '{}'::jsonb) || '{"updated_at": "${new Date().toISOString()}"}'::jsonb,
        updated_at = NOW()
    WHERE id = $1
  `, [ubicacionId]);
}

/**
 * Buscar ubicaciones para autocompletado
 */
export async function searchUbicaciones(
  searchTerm: string,
  limit = 10
): Promise<Ubicacion[]> {
  const sql = `
    SELECT u.*,
      CASE
        WHEN u.nombre ILIKE $1 THEN 100
        WHEN u.nombre ILIKE $2 THEN 80
        WHEN u.tagline ILIKE $2 THEN 60
        ELSE 40
      END as relevance
    FROM ubicaciones u
    WHERE u.activo = true
    AND (
      u.nombre ILIKE $2
      OR u.tagline ILIKE $2
      OR u.descripcion_corta ILIKE $2
    )
    ORDER BY relevance DESC, u.nivel ASC, u.nombre ASC
    LIMIT $3
  `;

  const result = await query(sql, [searchTerm, `%${searchTerm}%`, limit]);
  return result.rows;
}

/**
 * Buscar ubicación en nuestra tabla que coincida con datos de Google
 * Intenta hacer match progresivo: sector > ciudad > provincia > pais
 * Retorna los IDs de cada nivel encontrado para poblar los dropdowns
 *
 * SISTEMA DE MATCHING ROBUSTO:
 * 1. Match exacto por nombre
 * 2. Match por alias (variaciones como "Ensanche Naco" -> "Naco")
 * 3. Match parcial/contenido (el nombre de Google contiene el nuestro o viceversa)
 * 4. Match fuzzy extrayendo palabras clave
 */
export interface UbicacionMatch {
  pais?: { id: string; nombre: string };
  provincia?: { id: string; nombre: string };
  ciudad?: { id: string; nombre: string };
  sector?: { id: string; nombre: string };
  matchLevel: 'sector' | 'ciudad' | 'provincia' | 'pais' | 'none';
  confidence: 'exact' | 'alias' | 'partial' | 'none';
}

// Normalizar strings para comparación (quitar tildes y caracteres especiales)
function normalizeForMatch(str?: string): string {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Extraer palabras significativas (quitar prefijos comunes como "Ensanche", "Ens.", etc.)
function extractKeywords(str: string): string[] {
  const stopWords = [
    'ensanche', 'ens', 'el', 'la', 'los', 'las', 'de', 'del',
    'san', 'santo', 'santa', 'barrio', 'sector', 'urbanizacion',
    'urb', 'residencial', 'res', 'colonia', 'col'
  ];

  const normalized = normalizeForMatch(str);
  const words = normalized.split(/\s+/);

  return words.filter(w => w.length > 2 && !stopWords.includes(w));
}

export async function matchUbicacionFromGoogle(googleData: {
  pais?: string;
  provincia?: string;
  ciudad?: string;
  sector?: string;
}): Promise<UbicacionMatch> {
  const result: UbicacionMatch = {
    matchLevel: 'none',
    confidence: 'none',
  };

  // Normalizar valores undefined a null para PostgreSQL (fix for $3 type error)
  const pais = googleData.pais || null;
  const provincia = googleData.provincia || null;
  const ciudad = googleData.ciudad || null;
  const sector = googleData.sector || null;

  // 1. Buscar país
  if (pais) {
    const normalizedPais = normalizeForMatch(pais);
    const paisQuery = await query(`
      SELECT id, nombre FROM ubicaciones
      WHERE tipo = 'pais' AND activo = true
      AND (
        -- Match exacto normalizado
        LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($1)
        OR LOWER(nombre) = LOWER($2)
        -- Match por alias
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(alias, '[]'::jsonb)) AS a
          WHERE LOWER(TRANSLATE(a, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($1)
             OR LOWER(a) = LOWER($2)
        )
        -- Match parcial
        OR LOWER(nombre) ILIKE $3
        OR codigo = $4
      )
      ORDER BY
        CASE
          WHEN LOWER(nombre) = LOWER($2) THEN 1
          WHEN LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($1) THEN 2
          ELSE 3
        END
      LIMIT 1
    `, [normalizedPais, pais, `%${normalizedPais}%`, pais.substring(0, 2).toUpperCase()]);

    if (paisQuery.rows[0]) {
      result.pais = { id: paisQuery.rows[0].id, nombre: paisQuery.rows[0].nombre };
      result.matchLevel = 'pais';
      result.confidence = 'exact';
    }
  }

  // 2. Buscar provincia dentro del país
  if (result.pais && provincia) {
    const normalizedProvincia = normalizeForMatch(provincia);
    const provinciaQuery = await query(`
      SELECT id, nombre FROM ubicaciones
      WHERE tipo = 'provincia' AND activo = true
      AND parent_id = $1
      AND (
        -- Match exacto
        LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2)
        OR LOWER(nombre) = LOWER($3)
        -- Match por alias
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(alias, '[]'::jsonb)) AS a
          WHERE LOWER(TRANSLATE(a, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2)
             OR LOWER(a) = LOWER($3)
        )
        -- Match parcial
        OR LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) ILIKE $4
      )
      ORDER BY
        CASE
          WHEN LOWER(nombre) = LOWER($3) THEN 1
          WHEN LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2) THEN 2
          ELSE 3
        END
      LIMIT 1
    `, [result.pais.id, normalizedProvincia, provincia, `%${normalizedProvincia}%`]);

    if (provinciaQuery.rows[0]) {
      result.provincia = { id: provinciaQuery.rows[0].id, nombre: provinciaQuery.rows[0].nombre };
      result.matchLevel = 'provincia';
    }
  }

  // 3. Buscar ciudad dentro de la provincia
  if (result.provincia && ciudad) {
    const normalizedCiudad = normalizeForMatch(ciudad);
    const ciudadQuery = await query(`
      SELECT id, nombre FROM ubicaciones
      WHERE tipo = 'ciudad' AND activo = true
      AND parent_id = $1
      AND (
        -- Match exacto
        LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2)
        OR LOWER(nombre) = LOWER($3)
        -- Match por alias exacto
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(alias, '[]'::jsonb)) AS a
          WHERE LOWER(TRANSLATE(a, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2)
             OR LOWER(a) = LOWER($3)
        )
        -- Match parcial (solo si no hay match exacto)
        OR LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) ILIKE $4
      )
      ORDER BY
        CASE
          -- Prioridad 1: Match exacto por nombre
          WHEN LOWER(nombre) = LOWER($3) THEN 1
          WHEN LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2) THEN 2
          -- Prioridad 2: Match exacto por alias
          WHEN EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(alias, '[]'::jsonb)) AS a
            WHERE LOWER(a) = LOWER($3)
          ) THEN 3
          WHEN EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(alias, '[]'::jsonb)) AS a
            WHERE LOWER(TRANSLATE(a, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2)
          ) THEN 4
          -- Prioridad 3: Match parcial (última opción)
          ELSE 10
        END
      LIMIT 1
    `, [result.provincia.id, normalizedCiudad, ciudad, `%${normalizedCiudad}%`]);

    if (ciudadQuery.rows[0]) {
      result.ciudad = { id: ciudadQuery.rows[0].id, nombre: ciudadQuery.rows[0].nombre };
      result.matchLevel = 'ciudad';
    }
  }

  // 4. Buscar sector dentro de la ciudad - ALGORITMO MEJORADO
  if (result.ciudad && sector) {
    const normalizedSector = normalizeForMatch(sector);
    const keywords = extractKeywords(sector);
    const mainKeyword = keywords[0] || normalizedSector;

    // Primero intentar match exacto o por alias
    let sectorQuery = await query(`
      SELECT id, nombre,
        CASE
          WHEN LOWER(nombre) = LOWER($3) THEN 1
          WHEN LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2) THEN 2
          WHEN EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(alias, '[]'::jsonb)) AS a
            WHERE LOWER(a) = LOWER($3)
               OR LOWER(TRANSLATE(a, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2)
          ) THEN 3
          ELSE 10
        END as match_score
      FROM ubicaciones
      WHERE tipo = 'sector' AND activo = true
      AND parent_id = $1
      AND (
        -- Match exacto normalizado
        LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2)
        OR LOWER(nombre) = LOWER($3)
        -- Match por alias exacto
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(alias, '[]'::jsonb)) AS a
          WHERE LOWER(TRANSLATE(a, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($2)
             OR LOWER(a) = LOWER($3)
        )
      )
      ORDER BY match_score
      LIMIT 1
    `, [result.ciudad.id, normalizedSector, sector]);

    if (sectorQuery.rows[0]) {
      result.sector = { id: sectorQuery.rows[0].id, nombre: sectorQuery.rows[0].nombre };
      result.matchLevel = 'sector';
      result.confidence = sectorQuery.rows[0].match_score <= 2 ? 'exact' : 'alias';
    } else {
      // Si no hay match exacto, buscar por palabra clave principal
      // Ejemplo: "Ensanche Naco" -> buscar "Naco"
      sectorQuery = await query(`
        SELECT id, nombre,
          CASE
            WHEN LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($3) THEN 1
            WHEN LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) ILIKE $4 THEN 2
            WHEN EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(COALESCE(alias, '[]'::jsonb)) AS a
              WHERE LOWER(TRANSLATE(a, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) ILIKE $4
            ) THEN 3
            ELSE 10
          END as match_score
        FROM ubicaciones
        WHERE tipo = 'sector' AND activo = true
        AND parent_id = $1
        AND (
          -- Match por keyword principal (ej: "naco" de "ensanche naco")
          LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = LOWER($3)
          OR LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) ILIKE $4
          -- Match en alias por keyword
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(alias, '[]'::jsonb)) AS a
            WHERE LOWER(TRANSLATE(a, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) ILIKE $4
          )
          -- El nombre de Google contiene nuestro nombre
          OR LOWER($2) LIKE '%' || LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) || '%'
          -- Nuestro nombre contiene el keyword
          OR LOWER(TRANSLATE(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) LIKE '%' || LOWER($3) || '%'
        )
        ORDER BY match_score, LENGTH(nombre)
        LIMIT 1
      `, [result.ciudad.id, normalizedSector, mainKeyword, `%${mainKeyword}%`]);

      if (sectorQuery.rows[0]) {
        result.sector = { id: sectorQuery.rows[0].id, nombre: sectorQuery.rows[0].nombre };
        result.matchLevel = 'sector';
        result.confidence = 'partial';
      } else {
        // No encontramos el sector, marcar como parcial
        result.confidence = 'partial';
      }
    }
  }

  return result;
}

/**
 * Obtener coordenadas del centro de una ubicación
 * Si tiene latitud/longitud propias las usa, sino calcula del bounds
 */
export async function getUbicacionCenter(ubicacionId: string): Promise<{ lat: number; lng: number } | null> {
  const ubicacion = await getUbicacionById(ubicacionId);

  if (!ubicacion) return null;

  // Si tiene coordenadas propias
  if (ubicacion.latitud && ubicacion.longitud) {
    return { lat: ubicacion.latitud, lng: ubicacion.longitud };
  }

  // Si tiene bounds, calcular centro
  if (ubicacion.bounds) {
    const { north, south, east, west } = ubicacion.bounds;
    return {
      lat: (north + south) / 2,
      lng: (east + west) / 2,
    };
  }

  // Coordenadas por defecto para República Dominicana si no hay datos
  return { lat: 18.4861, lng: -69.9312 };
}
