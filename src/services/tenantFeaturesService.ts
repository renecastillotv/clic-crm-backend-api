/**
 * Servicio para verificar features de tenants
 */

import { query } from '../utils/db.js';

/**
 * Verifica si un tenant tiene un feature habilitado
 * 
 * Verifica:
 * 1. Si el feature está habilitado manualmente para el tenant (tenants_features)
 * 2. Si el plan del tenant incluye el feature (available_in_plans)
 * 
 * @param tenantId - ID del tenant
 * @param featureName - Nombre del feature a verificar
 * @returns true si el tenant tiene acceso al feature
 */
export async function tenantHasFeature(
  tenantId: string,
  featureName: string
): Promise<boolean> {
  try {
    const sql = `
      SELECT 
        CASE 
          WHEN tf.id IS NOT NULL THEN true
          WHEN t.plan = ANY(
            SELECT jsonb_array_elements_text(f.available_in_plans)
            FROM features f
            WHERE f.name = $2
          ) THEN true
          ELSE false
        END as has_feature
      FROM tenants t
      LEFT JOIN features f ON f.name = $2
      LEFT JOIN tenants_features tf ON tf.tenant_id = t.id AND tf.feature_id = f.id
      WHERE t.id = $1
    `;

    const result = await query(sql, [tenantId, featureName]);

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].has_feature === true;
  } catch (error: any) {
    console.error('Error al verificar feature del tenant:', error);
    // En caso de error, retornar false (no tiene acceso)
    return false;
  }
}

/**
 * Obtiene todos los features habilitados para un tenant
 * 
 * @param tenantId - ID del tenant
 * @returns Array de nombres de features habilitados
 */
export async function getTenantFeatures(tenantId: string): Promise<string[]> {
  try {
    const sql = `
      SELECT DISTINCT
        f.name
      FROM features f
      INNER JOIN tenants_features tf ON tf.feature_id = f.id
      WHERE tf.tenant_id = $1
      
      UNION
      
      SELECT DISTINCT
        f.name
      FROM features f
      INNER JOIN tenants t ON t.plan = ANY(
        SELECT jsonb_array_elements_text(f.available_in_plans)::text
      )
      WHERE t.id = $1
        AND f.name IS NOT NULL
    `;

    const result = await query(sql, [tenantId]);

    return result.rows.map((row: any) => row.name);
  } catch (error: any) {
    console.error('Error al obtener features del tenant:', error);
    return [];
  }
}

