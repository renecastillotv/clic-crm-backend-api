/**
 * Validador de Componentes
 * 
 * Valida la estructura y tipos de datos de los componentes antes de guardarlos.
 */

import { VALID_DYNAMIC_DATA_TYPES, normalizeDynamicDataType } from './pageTypeMapping.js';
import { query } from './db.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida la estructura de datos de un componente
 */
export async function validateComponentData(
  tipo: string,
  variante: string,
  datos: any
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar que datos sea un objeto
  if (!datos || typeof datos !== 'object') {
    errors.push('Los datos del componente deben ser un objeto');
    return { valid: false, errors, warnings };
  }

  // Validar estructura básica
  if (!datos.static_data && !datos.dynamic_data && !datos.toggles && !datos.styles) {
    warnings.push('El componente no tiene static_data, dynamic_data, toggles ni styles definidos');
  }

  // Validar dynamic_data si existe
  if (datos.dynamic_data) {
    const dynamicValidation = validateDynamicData(datos.dynamic_data);
    errors.push(...dynamicValidation.errors);
    warnings.push(...dynamicValidation.warnings);
  }

  // Validar que static_data sea un objeto si existe
  if (datos.static_data && typeof datos.static_data !== 'object') {
    errors.push('static_data debe ser un objeto');
  }

  // Validar que toggles sea un objeto si existe
  if (datos.toggles && typeof datos.toggles !== 'object') {
    errors.push('toggles debe ser un objeto');
  }

  // Validar que styles sea un objeto si existe
  if (datos.styles && typeof datos.styles !== 'object') {
    errors.push('styles debe ser un objeto');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida la configuración de dynamic_data
 */
function validateDynamicData(dynamicData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Si hay apiEndpoint, debe ser una URL válida
  if (dynamicData.apiEndpoint) {
    try {
      const url = new URL(dynamicData.apiEndpoint);
      if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
        errors.push('apiEndpoint debe ser HTTPS o localhost');
      }
    } catch (error) {
      errors.push('apiEndpoint no es una URL válida');
    }
  }

  // Si hay dataType, debe ser válido
  if (dynamicData.dataType) {
    if (!VALID_DYNAMIC_DATA_TYPES.has(dynamicData.dataType)) {
      errors.push(`dataType "${dynamicData.dataType}" no es válido. Tipos válidos: ${Array.from(VALID_DYNAMIC_DATA_TYPES).join(', ')}`);
    }
  }

  // Si no hay apiEndpoint ni dataType, es un error
  if (!dynamicData.apiEndpoint && !dynamicData.dataType) {
    errors.push('dynamic_data debe tener apiEndpoint o dataType');
  }

  // Validar paginación si existe
  if (dynamicData.pagination) {
    if (typeof dynamicData.pagination.page !== 'number' || dynamicData.pagination.page < 1) {
      errors.push('pagination.page debe ser un número mayor a 0');
    }
    if (typeof dynamicData.pagination.limit !== 'number' || dynamicData.pagination.limit < 1) {
      errors.push('pagination.limit debe ser un número mayor a 0');
    }
  }

  // Validar filters si existe
  if (dynamicData.filters && typeof dynamicData.filters !== 'object') {
    errors.push('filters debe ser un objeto');
  }

  // Validar queryParams si existe
  if (dynamicData.queryParams && typeof dynamicData.queryParams !== 'object') {
    errors.push('queryParams debe ser un objeto');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida que un tipo de página exista en la base de datos
 */
export async function validatePageType(tipoPagina: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT codigo FROM tipos_pagina WHERE codigo = $1',
      [tipoPagina]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error validando tipo de página:', error);
    return false;
  }
}

/**
 * Valida que un componente tenga la estructura correcta antes de guardarlo
 */
export async function validateComponentBeforeSave(
  tipo: string,
  variante: string,
  datos: any,
  tipoPagina?: string | null
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar datos del componente
  const dataValidation = await validateComponentData(tipo, variante, datos);
  errors.push(...dataValidation.errors);
  warnings.push(...dataValidation.warnings);

  // Validar tipo de página si se proporciona
  if (tipoPagina) {
    const isValidPageType = await validatePageType(tipoPagina);
    if (!isValidPageType) {
      errors.push(`Tipo de página "${tipoPagina}" no existe en la base de datos`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}












