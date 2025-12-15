/**
 * Servicio para gestionar Features de la plataforma
 */

import { query, getClient } from '../utils/db.js';

export interface Feature {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  isPublic: boolean;
  isPremium: boolean;
  availableInPlans: string[];
  enabledCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureData {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  isPublic?: boolean;
  isPremium?: boolean;
  availableInPlans?: string[];
}

export interface UpdateFeatureData {
  name?: string;
  description?: string;
  icon?: string;
  category?: string;
  isPublic?: boolean;
  isPremium?: boolean;
  availableInPlans?: string[];
}

/**
 * Obtiene todos los features con el conteo de tenants que los tienen habilitados
 */
export async function getAllFeatures(): Promise<Feature[]> {
  try {
    const sql = `
      SELECT 
        f.id,
        f.name,
        f.description,
        f.icon,
        f.category,
        f.is_public as "isPublic",
        f.is_premium as "isPremium",
        f.available_in_plans as "availableInPlans",
        f.created_at as "createdAt",
        f.updated_at as "updatedAt",
        COALESCE(COUNT(tf.id), 0) as "enabledCount"
      FROM features f
      LEFT JOIN tenants_features tf ON f.id = tf.feature_id
      GROUP BY f.id
      ORDER BY f.name ASC
    `;
    const result = await query(sql);
    return result.rows;
  } catch (error: any) {
    console.error('Error al obtener features:', error);
    throw new Error(`Error al obtener features: ${error.message}`);
  }
}

/**
 * Obtiene un feature por ID
 */
export async function getFeatureById(featureId: string): Promise<Feature | null> {
  try {
    const sql = `
      SELECT 
        f.id,
        f.name,
        f.description,
        f.icon,
        f.category,
        f.is_public as "isPublic",
        f.is_premium as "isPremium",
        f.available_in_plans as "availableInPlans",
        f.created_at as "createdAt",
        f.updated_at as "updatedAt",
        COALESCE(COUNT(tf.id), 0) as "enabledCount"
      FROM features f
      LEFT JOIN tenants_features tf ON f.id = tf.feature_id
      WHERE f.id = $1
      GROUP BY f.id
    `;
    const result = await query(sql, [featureId]);
    return result.rows[0] || null;
  } catch (error: any) {
    console.error('Error al obtener feature:', error);
    throw new Error(`Error al obtener feature: ${error.message}`);
  }
}

/**
 * Crea un nuevo feature
 */
export async function createFeature(data: CreateFeatureData): Promise<Feature> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const sql = `
      INSERT INTO features (
        name, description, icon, category,
        is_public, is_premium, available_in_plans
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING 
        id, name, description, icon, category,
        is_public as "isPublic",
        is_premium as "isPremium",
        available_in_plans as "availableInPlans",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      data.name,
      data.description || null,
      data.icon || 'puzzle',
      data.category || 'addon',
      data.isPublic !== undefined ? data.isPublic : false,
      data.isPremium !== undefined ? data.isPremium : true,
      JSON.stringify(data.availableInPlans || []),
    ];

    const result = await client.query(sql, values);
    const feature = result.rows[0];
    
    // Agregar enabledCount como 0 para el nuevo feature
    feature.enabledCount = 0;

    await client.query('COMMIT');
    return feature;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al crear feature:', error);
    throw new Error(`Error al crear feature: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Actualiza un feature existente
 */
export async function updateFeature(featureId: string, data: UpdateFeatureData): Promise<Feature> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(data.icon);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(data.isPublic);
    }
    if (data.isPremium !== undefined) {
      updates.push(`is_premium = $${paramIndex++}`);
      values.push(data.isPremium);
    }
    if (data.availableInPlans !== undefined) {
      updates.push(`available_in_plans = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(data.availableInPlans));
    }

    if (updates.length === 0) {
      // No hay cambios, retornar el feature actual
      const existing = await getFeatureById(featureId);
      if (!existing) {
        throw new Error('Feature no encontrado');
      }
      return existing;
    }

    updates.push(`updated_at = NOW()`);
    values.push(featureId);

    const sql = `
      UPDATE features
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, name, description, icon, category,
        is_public as "isPublic",
        is_premium as "isPremium",
        available_in_plans as "availableInPlans",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await client.query(sql, values);
    const feature = result.rows[0];

    // Obtener enabledCount
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM tenants_features WHERE feature_id = $1',
      [featureId]
    );
    feature.enabledCount = parseInt(countResult.rows[0].count, 10);

    await client.query('COMMIT');
    return feature;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar feature:', error);
    throw new Error(`Error al actualizar feature: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Elimina un feature
 */
export async function deleteFeature(featureId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verificar si existe
    const exists = await client.query('SELECT id FROM features WHERE id = $1', [featureId]);
    if (exists.rows.length === 0) {
      throw new Error('Feature no encontrado');
    }

    // Eliminar relaciones primero (CASCADE debería hacerlo automáticamente, pero por seguridad)
    await client.query('DELETE FROM tenants_features WHERE feature_id = $1', [featureId]);

    // Eliminar feature
    await client.query('DELETE FROM features WHERE id = $1', [featureId]);

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar feature:', error);
    throw new Error(`Error al eliminar feature: ${error.message}`);
  } finally {
    client.release();
  }
}

