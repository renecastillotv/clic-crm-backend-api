/**
 * Servicio de Tasas de Cambio
 * 
 * Gestiona las tasas de cambio de monedas para conversión a USD
 */

import { query } from '../utils/db.js';

export interface TasasCambio {
  [moneda: string]: number; // Ej: { DOP: 58.5, EUR: 0.92, MXN: 17.2 }
}

export interface TasasCambioConfig {
  tasas: TasasCambio;
  fecha_actualizacion?: string;
  actualizado_por?: string;
}

/**
 * Obtener tasas de cambio del tenant
 */
export async function getTasasCambio(tenantId: string): Promise<TasasCambio> {
  try {
    const sql = `
      SELECT configuracion
      FROM tenants
      WHERE id = $1
    `;
    
    const result = await query(sql, [tenantId]);
    
    if (result.rows.length === 0) {
      return getTasasCambioDefault();
    }
    
    const configuracion = result.rows[0].configuracion || {};
    const tasasConfig: TasasCambioConfig = configuracion.tasasCambio || {};
    
    // Si no hay tasas configuradas, retornar valores por defecto
    if (!tasasConfig.tasas || Object.keys(tasasConfig.tasas).length === 0) {
      return getTasasCambioDefault();
    }
    
    return tasasConfig.tasas;
  } catch (error: any) {
    console.error('Error al obtener tasas de cambio:', error);
    return getTasasCambioDefault();
  }
}

/**
 * Actualizar tasas de cambio del tenant
 */
export async function updateTasasCambio(
  tenantId: string,
  tasas: TasasCambio,
  actualizadoPor?: string
): Promise<TasasCambio> {
  try {
    // Obtener configuración actual
    const sqlGet = `
      SELECT configuracion
      FROM tenants
      WHERE id = $1
    `;
    
    const resultGet = await query(sqlGet, [tenantId]);
    
    if (resultGet.rows.length === 0) {
      throw new Error('Tenant no encontrado');
    }
    
    const configuracion = resultGet.rows[0].configuracion || {};
    const tasasConfig: TasasCambioConfig = {
      tasas,
      fecha_actualizacion: new Date().toISOString(),
      actualizado_por: actualizadoPor,
    };
    
    configuracion.tasasCambio = tasasConfig;
    
    // Actualizar configuración
    const sqlUpdate = `
      UPDATE tenants
      SET configuracion = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING configuracion
    `;
    
    const resultUpdate = await query(sqlUpdate, [JSON.stringify(configuracion), tenantId]);
    const updatedConfig = resultUpdate.rows[0].configuracion || {};
    const updatedTasasConfig: TasasCambioConfig = updatedConfig.tasasCambio || {};
    
    return updatedTasasConfig.tasas || tasas;
  } catch (error: any) {
    console.error('Error al actualizar tasas de cambio:', error);
    throw error;
  }
}

/**
 * Convertir un monto de una moneda a USD
 */
export async function convertirAUSD(
  tenantId: string,
  monto: number,
  moneda: string
): Promise<number> {
  // Si ya es USD, retornar el monto sin cambios
  if (moneda.toUpperCase() === 'USD') {
    return monto;
  }
  
  const tasas = await getTasasCambio(tenantId);
  const tasa = tasas[moneda.toUpperCase()];
  
  if (!tasa || tasa <= 0) {
    console.warn(`Tasa de cambio no encontrada para ${moneda}, retornando monto original`);
    return monto;
  }
  
  // Convertir a USD: monto / tasa
  return monto / tasa;
}

/**
 * Convertir un monto de USD a otra moneda
 */
export async function convertirDesdeUSD(
  tenantId: string,
  montoUSD: number,
  moneda: string
): Promise<number> {
  // Si es USD, retornar el monto sin cambios
  if (moneda.toUpperCase() === 'USD') {
    return montoUSD;
  }
  
  const tasas = await getTasasCambio(tenantId);
  const tasa = tasas[moneda.toUpperCase()];
  
  if (!tasa || tasa <= 0) {
    console.warn(`Tasa de cambio no encontrada para ${moneda}, retornando monto original`);
    return montoUSD;
  }
  
  // Convertir desde USD: monto * tasa
  return montoUSD * tasa;
}

/**
 * Obtener tasas de cambio por defecto
 */
function getTasasCambioDefault(): TasasCambio {
  return {
    DOP: 58.5,  // 1 USD = 58.5 DOP
    EUR: 0.92,  // 1 USD = 0.92 EUR
    MXN: 17.2,  // 1 USD = 17.2 MXN
    // Agregar más monedas según sea necesario
  };
}













