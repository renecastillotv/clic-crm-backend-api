/**
 * Servicio para gestión de configuración de la plataforma
 */

import { query, getClient } from '../utils/db.js';

export interface PlatformConfig {
  clave: string;
  categoria: string;
  valor: string;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  descripcion: string | null;
  esSensible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateConfigData {
  valor: string;
}

/**
 * Obtiene todas las configuraciones agrupadas por categoría
 */
export async function getAllConfig(): Promise<Record<string, PlatformConfig[]>> {
  try {
    const sql = `
      SELECT 
        clave,
        categoria,
        valor,
        tipo,
        descripcion,
        es_sensible as "esSensible",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM platform_config
      ORDER BY categoria, clave ASC
    `;
    const result = await query(sql);
    
    // Agrupar por categoría
    const grouped: Record<string, PlatformConfig[]> = {};
    result.rows.forEach((config: PlatformConfig) => {
      if (!grouped[config.categoria]) {
        grouped[config.categoria] = [];
      }
      grouped[config.categoria].push(config);
    });
    
    return grouped;
  } catch (error: any) {
    console.error('Error al obtener configuraciones:', error);
    throw new Error(`Error al obtener configuraciones: ${error.message}`);
  }
}

/**
 * Obtiene una configuración por su clave
 */
export async function getConfigByKey(clave: string): Promise<PlatformConfig | null> {
  try {
    const sql = `
      SELECT 
        clave,
        categoria,
        valor,
        tipo,
        descripcion,
        es_sensible as "esSensible",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM platform_config
      WHERE clave = $1
    `;
    const result = await query(sql, [clave]);
    return result.rows[0] || null;
  } catch (error: any) {
    console.error('Error al obtener configuración:', error);
    throw new Error(`Error al obtener configuración: ${error.message}`);
  }
}

/**
 * Actualiza una configuración
 */
export async function updateConfig(clave: string, data: UpdateConfigData): Promise<PlatformConfig> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verificar que existe
    const exists = await client.query('SELECT clave FROM platform_config WHERE clave = $1', [clave]);
    if (exists.rows.length === 0) {
      throw new Error(`Configuración "${clave}" no encontrada`);
    }

    // Convertir valor según el tipo
    let valorFinal = data.valor;
    const config = await getConfigByKey(clave);
    if (config) {
      if (config.tipo === 'json' && data.valor) {
        // Validar que es JSON válido
        try {
          JSON.parse(data.valor);
        } catch {
          throw new Error(`El valor debe ser un JSON válido para la configuración "${clave}"`);
        }
      }
    }

    const sql = `
      UPDATE platform_config
      SET valor = $1, updated_at = NOW()
      WHERE clave = $2
      RETURNING 
        clave,
        categoria,
        valor,
        tipo,
        descripcion,
        es_sensible as "esSensible",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await client.query(sql, [valorFinal, clave]);
    
    await client.query('COMMIT');
    
    return result.rows[0];
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar configuración:', error);
    throw new Error(`Error al actualizar configuración: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Actualiza múltiples configuraciones a la vez
 */
export async function updateMultipleConfig(configs: Record<string, string>): Promise<PlatformConfig[]> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const updated: PlatformConfig[] = [];
    
    for (const [clave, valor] of Object.entries(configs)) {
      const config = await getConfigByKey(clave);
      if (!config) {
        console.warn(`Configuración "${clave}" no encontrada, saltando...`);
        continue;
      }

      // Validar tipo
      if (config.tipo === 'json' && valor) {
        try {
          JSON.parse(valor);
        } catch {
          throw new Error(`El valor debe ser un JSON válido para la configuración "${clave}"`);
        }
      }

      await client.query(
        'UPDATE platform_config SET valor = $1, updated_at = NOW() WHERE clave = $2',
        [valor, clave]
      );

      const updatedConfig = await getConfigByKey(clave);
      if (updatedConfig) {
        updated.push(updatedConfig);
      }
    }

    await client.query('COMMIT');
    return updated;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar configuraciones:', error);
    throw new Error(`Error al actualizar configuraciones: ${error.message}`);
  } finally {
    client.release();
  }
}

