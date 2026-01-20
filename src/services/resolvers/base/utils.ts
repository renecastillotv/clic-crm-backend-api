/**
 * Utilidades comunes para los resolvers
 *
 * Funciones de ayuda para parseo de JSON, construcción de queries,
 * normalización de datos y manejo de traducciones.
 */

import { query } from '../../../utils/db.js';
import {
  resolveTranslatedObject,
  resolveTranslatedArray,
  getTranslatableFields,
  normalizeLanguage,
  buildSlugSearchCondition,
} from '../../../utils/translations.js';

import type { BaseResolverParams, PaginationParams } from './types.js';

// ============================================================================
// PARSEO DE JSON
// ============================================================================

/**
 * Parsea un campo JSON de forma segura
 */
export function parseJsonField<T = any>(value: any, defaultValue: T): T {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return value as T;
}

/**
 * Parsea un campo de array de forma segura
 */
export function parseArrayField(value: any): any[] {
  return parseJsonField(value, []);
}

/**
 * Parsea un campo de objeto de forma segura
 */
export function parseObjectField(value: any): Record<string, any> {
  return parseJsonField(value, {});
}

// ============================================================================
// PAGINACIÓN
// ============================================================================

/**
 * Calcula offset para paginación
 */
export function calculateOffset(pagination?: PaginationParams): { limit: number; offset: number } {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;
  return { limit, offset };
}

/**
 * Agrega cláusulas de paginación a una query
 */
export function addPaginationToQuery(
  sql: string,
  params: any[],
  pagination?: PaginationParams
): { sql: string; params: any[] } {
  const { limit, offset } = calculateOffset(pagination);
  const paramIndex = params.length + 1;

  return {
    sql: `${sql} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params: [...params, limit, offset],
  };
}

// ============================================================================
// TRADUCCIONES
// ============================================================================

/**
 * Aplica traducciones a un objeto
 */
export function applyTranslations<T extends Record<string, any>>(
  row: T,
  table: string,
  idioma: string
): T {
  const normalizedIdioma = normalizeLanguage(idioma);
  const camposTraducibles = getTranslatableFields(table);

  // Parsear traducciones si es string
  const traducciones = parseObjectField(row.traducciones);

  return resolveTranslatedObject(
    { ...row, traducciones },
    camposTraducibles,
    normalizedIdioma
  ) as T;
}

/**
 * Aplica traducciones a un array de objetos
 */
export function applyTranslationsToArray<T extends Record<string, any>>(
  rows: T[],
  table: string,
  idioma: string
): T[] {
  return rows.map((row) => applyTranslations(row, table, idioma));
}

/**
 * Construye condición de búsqueda por slug con soporte de traducciones
 */
export { buildSlugSearchCondition, normalizeLanguage };

// ============================================================================
// CONSTRUCCIÓN DE QUERIES
// ============================================================================

export interface FilterConfig {
  field: string;
  column?: string; // Si es diferente del field
  operator?: '=' | '!=' | 'IN' | 'LIKE' | 'ILIKE' | '>' | '<' | '>=' | '<=';
  transform?: (value: any) => any;
}

/**
 * Construye cláusulas WHERE dinámicamente basado en filtros
 */
export function buildWhereClause(
  filters: Record<string, any> | undefined,
  config: FilterConfig[],
  startParamIndex: number = 1
): { clause: string; params: any[]; nextParamIndex: number } {
  if (!filters) {
    return { clause: '', params: [], nextParamIndex: startParamIndex };
  }

  const clauses: string[] = [];
  const params: any[] = [];
  let paramIndex = startParamIndex;

  for (const cfg of config) {
    const value = filters[cfg.field];
    if (value === undefined) continue;

    const column = cfg.column || cfg.field;
    const operator = cfg.operator || '=';
    const transformedValue = cfg.transform ? cfg.transform(value) : value;

    if (operator === 'IN' && Array.isArray(transformedValue)) {
      const placeholders = transformedValue.map((_, i) => `$${paramIndex + i}`).join(', ');
      clauses.push(`${column} IN (${placeholders})`);
      params.push(...transformedValue);
      paramIndex += transformedValue.length;
    } else {
      clauses.push(`${column} ${operator} $${paramIndex}`);
      params.push(transformedValue);
      paramIndex++;
    }
  }

  return {
    clause: clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : '',
    params,
    nextParamIndex: paramIndex,
  };
}

// ============================================================================
// NORMALIZACIÓN DE DATOS
// ============================================================================

/**
 * Construye una URL relativa para una entidad
 */
export function buildEntityUrl(
  basePath: string,
  slug: string,
  idioma?: string,
  categoriaSlug?: string
): string {
  let path = basePath;

  if (categoriaSlug) {
    path = `${path}/${categoriaSlug}`;
  }

  path = `${path}/${slug}`;

  // Agregar prefijo de idioma si no es español
  if (idioma && idioma !== 'es') {
    path = `/${idioma}${path}`;
  }

  return path;
}

/**
 * Normaliza campos de ubicación en una string compuesta
 */
export function buildUbicacionString(...parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join(', ');
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log de resolver con formato consistente
 */
export function logResolver(
  emoji: string,
  resolver: string,
  action: string,
  details?: Record<string, any>
): void {
  const detailsStr = details
    ? Object.entries(details)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
    : '';
  console.log(`${emoji} [${resolver}] ${action}${detailsStr ? ` (${detailsStr})` : ''}`);
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { query };
