/**
 * Servicio para gestionar tipos de página desde el panel admin
 */

import { query } from '../utils/db.js';

export interface TipoPagina {
  codigo: string;
  nombre: string;
  descripcion: string;
  esEstandar: boolean;
  requiereSlug: boolean;
  configuracion: Record<string, any>;
  rutaPatron: string | null;
  rutaPadre: string | null;
  nivel: number;
  fuenteDatos: string | null;
  featureRequerido: string | null;
  esPlantilla: boolean;
  protegida: boolean;
  parametros: any[];
  aliasRutas: Record<string, string>;
  componentesRequeridos: string[];
  visible: boolean;
  featured: boolean;
  publico: boolean;
  ordenCatalogo: number;
  createdAt: string;
  updatedAt: string;
  // Estadísticas
  tenantsUsando?: number;
}

export interface TipoPaginaUpdate {
  nombre?: string;
  descripcion?: string;
  visible?: boolean;
  featured?: boolean;
  publico?: boolean;
  ordenCatalogo?: number;
  aliasRutas?: Record<string, string>;
  featureRequerido?: string | null;
  rutaPatron?: string;
  rutaPadre?: string | null;
  nivel?: number;
  esPlantilla?: boolean;
}

export interface TipoPaginaCreate {
  codigo: string;
  nombre: string;
  descripcion?: string;
  rutaPatron?: string;
  rutaPadre?: string | null;
  nivel?: number;
  esPlantilla?: boolean;
  visible?: boolean;
  featured?: boolean;
  featureRequerido?: string | null;
  ordenCatalogo?: number;
}

/**
 * Obtiene todos los tipos de página con estadísticas de uso
 */
export async function getAllTiposPagina(): Promise<TipoPagina[]> {
  const sql = `
    SELECT
      tp.*,
      COALESCE(stats.tenants_usando, 0) as tenants_usando
    FROM tipos_pagina tp
    LEFT JOIN (
      SELECT tipo_pagina_id, COUNT(DISTINCT tenant_id) as tenants_usando
      FROM componentes_web
      WHERE activo = true
      GROUP BY tipo_pagina_id
    ) stats ON tp.id = stats.tipo_pagina_id
    ORDER BY COALESCE(tp.orden_catalogo, 100), tp.nivel, tp.codigo
  `;

  const result = await query(sql);
  return result.rows.map(mapTipoPagina);
}

/**
 * Obtiene un tipo de página por su código
 */
export async function getTipoPaginaById(codigo: string): Promise<TipoPagina | null> {
  const sql = `
    SELECT
      tp.*,
      COALESCE(stats.tenants_usando, 0) as tenants_usando
    FROM tipos_pagina tp
    LEFT JOIN (
      SELECT tipo_pagina_id, COUNT(DISTINCT tenant_id) as tenants_usando
      FROM componentes_web
      WHERE activo = true
      GROUP BY tipo_pagina_id
    ) stats ON tp.id = stats.tipo_pagina_id
    WHERE tp.codigo = $1
  `;

  const result = await query(sql, [codigo]);
  if (result.rows.length === 0) return null;
  return mapTipoPagina(result.rows[0]);
}

/**
 * Crea un nuevo tipo de página
 */
export async function createTipoPagina(data: TipoPaginaCreate): Promise<TipoPagina> {
  // Verificar que no exista
  const existing = await getTipoPaginaById(data.codigo);
  if (existing) {
    throw new Error('Ya existe un tipo de página con ese código');
  }

  const sql = `
    INSERT INTO tipos_pagina (
      codigo,
      nombre,
      descripcion,
      ruta_patron,
      ruta_padre,
      nivel,
      es_plantilla,
      visible,
      featured,
      feature_requerido,
      orden_catalogo,
      es_estandar,
      requiere_slug,
      protegida,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, true, false, NOW(), NOW()
    )
    RETURNING *
  `;

  const values = [
    data.codigo,
    data.nombre,
    data.descripcion || null,
    data.rutaPatron || null,
    data.rutaPadre || null,
    data.nivel || 0,
    data.esPlantilla || false,
    data.visible !== false,
    data.featured || false,
    data.featureRequerido || null,
    data.ordenCatalogo || 100,
  ];

  await query(sql, values);
  return getTipoPaginaById(data.codigo) as Promise<TipoPagina>;
}

/**
 * Actualiza un tipo de página
 */
export async function updateTipoPagina(codigo: string, data: TipoPaginaUpdate): Promise<TipoPagina> {
  // Verificar que existe
  const existing = await getTipoPaginaById(codigo);
  if (!existing) {
    throw new Error('Tipo de página no encontrado');
  }

  // Construir los campos a actualizar
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.nombre !== undefined) {
    updates.push(`nombre = $${paramIndex++}`);
    values.push(data.nombre);
  }
  if (data.descripcion !== undefined) {
    updates.push(`descripcion = $${paramIndex++}`);
    values.push(data.descripcion);
  }
  if (data.visible !== undefined) {
    updates.push(`visible = $${paramIndex++}`);
    values.push(data.visible);
  }
  if (data.featured !== undefined) {
    updates.push(`featured = $${paramIndex++}`);
    values.push(data.featured);
  }
  if (data.publico !== undefined) {
    updates.push(`publico = $${paramIndex++}`);
    values.push(data.publico);
  }
  if (data.ordenCatalogo !== undefined) {
    updates.push(`orden_catalogo = $${paramIndex++}`);
    values.push(data.ordenCatalogo);
  }
  if (data.aliasRutas !== undefined) {
    updates.push(`alias_rutas = $${paramIndex++}`);
    values.push(JSON.stringify(data.aliasRutas));
  }
  // Nuevo: featureRequerido puede ser null para quitar la restricción
  if (data.featureRequerido !== undefined) {
    updates.push(`feature_requerido = $${paramIndex++}`);
    values.push(data.featureRequerido);
  }
  if (data.rutaPatron !== undefined) {
    updates.push(`ruta_patron = $${paramIndex++}`);
    values.push(data.rutaPatron);
  }
  if (data.rutaPadre !== undefined) {
    updates.push(`ruta_padre = $${paramIndex++}`);
    values.push(data.rutaPadre);
  }
  if (data.nivel !== undefined) {
    updates.push(`nivel = $${paramIndex++}`);
    values.push(data.nivel);
  }
  if (data.esPlantilla !== undefined) {
    updates.push(`es_plantilla = $${paramIndex++}`);
    values.push(data.esPlantilla);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = NOW()`);
  values.push(codigo);

  const sql = `
    UPDATE tipos_pagina
    SET ${updates.join(', ')}
    WHERE codigo = $${paramIndex}
    RETURNING *
  `;

  await query(sql, values);
  return getTipoPaginaById(codigo) as Promise<TipoPagina>;
}

/**
 * Mapea un row de la BD a la interfaz TipoPagina
 */
function mapTipoPagina(row: any): TipoPagina {
  return {
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    esEstandar: row.es_estandar,
    requiereSlug: row.requiere_slug,
    configuracion: parseJson(row.configuracion),
    rutaPatron: row.ruta_patron,
    rutaPadre: row.ruta_padre,
    nivel: row.nivel || 0,
    fuenteDatos: row.fuente_datos,
    featureRequerido: row.feature_requerido,
    esPlantilla: row.es_plantilla || false,
    protegida: row.protegida || false,
    parametros: parseJson(row.parametros) || [],
    aliasRutas: parseJson(row.alias_rutas) || {},
    componentesRequeridos: parseJson(row.componentes_requeridos) || [],
    visible: row.visible ?? true,
    featured: row.featured ?? false,
    publico: row.publico ?? true,
    ordenCatalogo: row.orden_catalogo || 100,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tenantsUsando: parseInt(row.tenants_usando) || 0,
  };
}

function parseJson(value: any): any {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
