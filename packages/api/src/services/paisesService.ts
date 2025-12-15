/**
 * Servicio para gestionar países
 */

import { query } from '../utils/db.js';

export interface Pais {
  codigo: string;
  nombre: string;
  nombreEn: string | null;
  moneda: string | null;
  zonaHoraria: string | null;
}

/**
 * Obtiene todos los países disponibles
 */
export async function getAllPaises(): Promise<Pais[]> {
  try {
    const sql = `
      SELECT 
        codigo,
        nombre,
        nombre_en as "nombreEn",
        moneda,
        zona_horaria as "zonaHoraria"
      FROM paises
      ORDER BY nombre ASC
    `;

    const result = await query(sql, []);
    return result.rows.map((row: any) => ({
      codigo: row.codigo,
      nombre: row.nombre,
      nombreEn: row.nombreEn || null,
      moneda: row.moneda || null,
      zonaHoraria: row.zonaHoraria || null,
    }));
  } catch (error: any) {
    console.error('Error al obtener países:', error);
    throw new Error(`Error al obtener países: ${error.message}`);
  }
}

