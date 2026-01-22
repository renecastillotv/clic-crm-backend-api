/**
 * Servicio de Administración de Tags Globales
 *
 * CRUD completo para la tabla tags_global
 * Administra TODOS los tags de la tabla (sin filtrar por tenant_id)
 */

import { query } from '../utils/db.js';

// Interfaz para tag global
export interface TagGlobal {
  id: string;
  slug: string;
  tipo: string;
  valor: string | null;
  campo_query: string | null;
  operador: string;
  alias_idiomas: Record<string, string>;
  nombre_idiomas: Record<string, string>;
  tenant_id: string | null;
  pais: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// Interfaz para crear tag
export interface CreateTagGlobalData {
  slug: string;
  tipo: string;
  valor?: string | null;
  campo_query?: string | null;
  operador?: string;
  alias_idiomas?: Record<string, string>;
  nombre_idiomas?: Record<string, string>;
  pais?: string;
  orden?: number;
  activo?: boolean;
}

// Interfaz para actualizar tag
export interface UpdateTagGlobalData {
  slug?: string;
  tipo?: string;
  valor?: string | null;
  campo_query?: string | null;
  operador?: string;
  alias_idiomas?: Record<string, string>;
  nombre_idiomas?: Record<string, string>;
  pais?: string;
  orden?: number;
  activo?: boolean;
}

// Interfaz para filtros
export interface TagGlobalFilters {
  tipo?: string;
  pais?: string;
  activo?: boolean;
  search?: string;
}

// Interfaz para estadísticas
export interface TagGlobalStats {
  total: number;
  activos: number;
  inactivos: number;
  por_tipo: Record<string, number>;
  por_pais: Record<string, number>;
}

/**
 * Obtiene todos los tags de la tabla tags_global
 */
export async function getTagsGlobal(filters?: TagGlobalFilters): Promise<TagGlobal[]> {
  let sql = `
    SELECT *
    FROM tags_global
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.tipo) {
    sql += ` AND tipo = $${paramIndex++}`;
    params.push(filters.tipo);
  }

  if (filters?.pais) {
    sql += ` AND pais = $${paramIndex++}`;
    params.push(filters.pais);
  }

  if (filters?.activo !== undefined) {
    sql += ` AND activo = $${paramIndex++}`;
    params.push(filters.activo);
  }

  if (filters?.search) {
    sql += ` AND (
      slug ILIKE $${paramIndex} OR
      valor ILIKE $${paramIndex} OR
      nombre_idiomas::text ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  sql += ' ORDER BY tipo ASC, orden ASC, slug ASC';

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Obtiene un tag por ID
 */
export async function getTagGlobalById(id: string): Promise<TagGlobal | null> {
  const result = await query(
    'SELECT * FROM tags_global WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Crea un nuevo tag
 */
export async function createTagGlobal(data: CreateTagGlobalData): Promise<TagGlobal> {
  // Verificar que el slug no exista
  const existing = await query(
    'SELECT id FROM tags_global WHERE slug = $1',
    [data.slug]
  );

  if (existing.rows.length > 0) {
    throw new Error(`Ya existe un tag con el slug "${data.slug}"`);
  }

  const result = await query(
    `INSERT INTO tags_global (
      slug, tipo, valor, campo_query, operador,
      alias_idiomas, nombre_idiomas, pais, orden, activo,
      tenant_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL)
    RETURNING *`,
    [
      data.slug,
      data.tipo,
      data.valor || null,
      data.campo_query || null,
      data.operador || '=',
      JSON.stringify(data.alias_idiomas || {}),
      JSON.stringify(data.nombre_idiomas || {}),
      data.pais || 'DO',
      data.orden ?? 0,
      data.activo ?? true,
    ]
  );

  return result.rows[0];
}

/**
 * Actualiza un tag global
 */
export async function updateTagGlobal(id: string, data: UpdateTagGlobalData): Promise<TagGlobal> {
  // Verificar que existe
  const existing = await getTagGlobalById(id);
  if (!existing) {
    throw new Error('Tag no encontrado');
  }

  // Si cambia el slug, verificar que no exista otro con ese slug
  if (data.slug && data.slug !== existing.slug) {
    const duplicate = await query(
      'SELECT id FROM tags_global WHERE slug = $1 AND id != $2',
      [data.slug, id]
    );
    if (duplicate.rows.length > 0) {
      throw new Error(`Ya existe un tag con el slug "${data.slug}"`);
    }
  }

  // Construir query de actualización dinámica
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (data.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}`);
    params.push(data.slug);
  }
  if (data.tipo !== undefined) {
    updates.push(`tipo = $${paramIndex++}`);
    params.push(data.tipo);
  }
  if (data.valor !== undefined) {
    updates.push(`valor = $${paramIndex++}`);
    params.push(data.valor);
  }
  if (data.campo_query !== undefined) {
    updates.push(`campo_query = $${paramIndex++}`);
    params.push(data.campo_query);
  }
  if (data.operador !== undefined) {
    updates.push(`operador = $${paramIndex++}`);
    params.push(data.operador);
  }
  if (data.alias_idiomas !== undefined) {
    updates.push(`alias_idiomas = $${paramIndex++}`);
    params.push(JSON.stringify(data.alias_idiomas));
  }
  if (data.nombre_idiomas !== undefined) {
    updates.push(`nombre_idiomas = $${paramIndex++}`);
    params.push(JSON.stringify(data.nombre_idiomas));
  }
  if (data.pais !== undefined) {
    updates.push(`pais = $${paramIndex++}`);
    params.push(data.pais);
  }
  if (data.orden !== undefined) {
    updates.push(`orden = $${paramIndex++}`);
    params.push(data.orden);
  }
  if (data.activo !== undefined) {
    updates.push(`activo = $${paramIndex++}`);
    params.push(data.activo);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const result = await query(
    `UPDATE tags_global SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  return result.rows[0];
}

/**
 * Elimina un tag global (soft delete - marca como inactivo)
 */
export async function deleteTagGlobal(id: string, hardDelete: boolean = false): Promise<void> {
  const existing = await getTagGlobalById(id);
  if (!existing) {
    throw new Error('Tag no encontrado');
  }

  if (hardDelete) {
    await query('DELETE FROM tags_global WHERE id = $1', [id]);
  } else {
    await query(
      'UPDATE tags_global SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }
}

/**
 * Activa o desactiva un tag global
 */
export async function toggleTagGlobalStatus(id: string, activo: boolean): Promise<TagGlobal> {
  return updateTagGlobal(id, { activo });
}

/**
 * Obtiene estadísticas de tags
 */
export async function getTagsGlobalStats(): Promise<TagGlobalStats> {
  // Total y activos/inactivos
  const countResult = await query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE activo = true) as activos,
      COUNT(*) FILTER (WHERE activo = false) as inactivos
    FROM tags_global
  `);

  // Por tipo
  const tipoResult = await query(`
    SELECT tipo, COUNT(*) as count
    FROM tags_global
    GROUP BY tipo
    ORDER BY tipo
  `);

  // Por país
  const paisResult = await query(`
    SELECT pais, COUNT(*) as count
    FROM tags_global
    GROUP BY pais
    ORDER BY pais
  `);

  const stats = countResult.rows[0];

  return {
    total: parseInt(stats.total) || 0,
    activos: parseInt(stats.activos) || 0,
    inactivos: parseInt(stats.inactivos) || 0,
    por_tipo: tipoResult.rows.reduce((acc: Record<string, number>, row: any) => {
      acc[row.tipo] = parseInt(row.count);
      return acc;
    }, {}),
    por_pais: paisResult.rows.reduce((acc: Record<string, number>, row: any) => {
      acc[row.pais || 'null'] = parseInt(row.count);
      return acc;
    }, {}),
  };
}

/**
 * Obtiene los tipos de tags existentes
 */
export async function getTagTipos(): Promise<string[]> {
  const result = await query(`
    SELECT DISTINCT tipo
    FROM tags_global
    WHERE tipo IS NOT NULL
    ORDER BY tipo
  `);
  return result.rows.map((row: any) => row.tipo);
}

/**
 * Reordena tags de un tipo específico
 */
export async function reorderTags(tipo: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await query(
      'UPDATE tags_global SET orden = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tipo = $3',
      [i, orderedIds[i], tipo]
    );
  }
}
