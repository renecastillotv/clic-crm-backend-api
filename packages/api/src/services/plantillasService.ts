/**
 * Servicio de plantillas de página para tenants
 *
 * Proporciona funciones para obtener plantillas disponibles
 * filtradas por features y permisos del tenant
 */

import { query } from '../utils/db.js';

export interface PlantillaPagina {
  id: string;
  codigo: string;
  tipoPagina: string;
  nombre: string;
  descripcion: string | null;
  previewImage: string | null;
  categoria: string | null;
  componentes: any[];
  configuracionDefault: Record<string, any>;
  estilos: Record<string, any>;
  featureRequerido: string | null;
  visible: boolean;
  featured: boolean;
  esPremium: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

export interface TipoPaginaInfo {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  color: string | null;
  rutaPatron: string | null;
  nivel: number;
  esPlantilla: boolean;
  protegida: boolean;
  cantidadPlantillas: number;
}

interface PlantillasFilter {
  tipoPagina?: string;
  categoria?: string;
}

/**
 * Obtiene las plantillas disponibles para un tenant
 * Filtra por:
 * - Plantillas visibles
 * - Plantillas sin feature requerido O con feature que el tenant tiene habilitado
 * - Plantillas no premium O (premium y tenant tiene acceso)
 */
export async function getPlantillasDisponiblesParaTenant(
  tenantId: string,
  filters: PlantillasFilter = {}
): Promise<PlantillaPagina[]> {
  // Obtener los features del tenant
  const featuresResult = await query(
    `SELECT feature_id FROM tenants_features WHERE tenant_id = $1`,
    [tenantId]
  );
  const tenantFeatureIds = featuresResult.rows.map((r: any) => r.feature_id);

  // Construir query base
  let sql = `
    SELECT
      p.id,
      p.codigo,
      p.tipo_pagina as "tipoPagina",
      p.nombre,
      p.descripcion,
      p.preview_image as "previewImage",
      p.categoria,
      p.componentes,
      p.configuracion_default as "configuracionDefault",
      p.estilos,
      p.feature_requerido as "featureRequerido",
      p.visible,
      p.featured,
      p.es_premium as "esPremium",
      p.orden,
      p.created_at as "createdAt",
      p.updated_at as "updatedAt"
    FROM plantillas_pagina p
    WHERE p.visible = true
  `;

  const params: any[] = [];
  let paramIndex = 1;

  // Filtrar por feature requerido
  if (tenantFeatureIds.length > 0) {
    sql += ` AND (p.feature_requerido IS NULL OR p.feature_requerido = ANY($${paramIndex}))`;
    params.push(tenantFeatureIds);
    paramIndex++;
  } else {
    sql += ` AND p.feature_requerido IS NULL`;
  }

  // Filtrar por tipo de página
  if (filters.tipoPagina) {
    sql += ` AND p.tipo_pagina = $${paramIndex}`;
    params.push(filters.tipoPagina);
    paramIndex++;
  }

  // Filtrar por categoría
  if (filters.categoria) {
    sql += ` AND p.categoria = $${paramIndex}`;
    params.push(filters.categoria);
    paramIndex++;
  }

  // TODO: Filtrar premium cuando se implemente sistema de planes
  // Por ahora, mostrar todas las plantillas (premium se maneja en UI)

  sql += ` ORDER BY p.featured DESC, p.orden ASC, p.nombre ASC`;

  const result = await query(sql, params);

  return result.rows.map((row: any) => ({
    ...row,
    componentes: typeof row.componentes === 'string' ? JSON.parse(row.componentes) : row.componentes || [],
    configuracionDefault: typeof row.configuracionDefault === 'string' ? JSON.parse(row.configuracionDefault) : row.configuracionDefault || {},
    estilos: typeof row.estilos === 'string' ? JSON.parse(row.estilos) : row.estilos || {},
  }));
}

/**
 * Obtiene una plantilla específica para un tenant
 * Verifica que el tenant tenga acceso a la plantilla
 */
export async function getPlantillaParaTenant(
  tenantId: string,
  plantillaId: string
): Promise<PlantillaPagina | null> {
  // Obtener los features del tenant
  const featuresResult = await query(
    `SELECT feature_id FROM tenants_features WHERE tenant_id = $1`,
    [tenantId]
  );
  const tenantFeatureIds = featuresResult.rows.map((r: any) => r.feature_id);

  let sql = `
    SELECT
      p.id,
      p.codigo,
      p.tipo_pagina as "tipoPagina",
      p.nombre,
      p.descripcion,
      p.preview_image as "previewImage",
      p.categoria,
      p.componentes,
      p.configuracion_default as "configuracionDefault",
      p.estilos,
      p.feature_requerido as "featureRequerido",
      p.visible,
      p.featured,
      p.es_premium as "esPremium",
      p.orden,
      p.created_at as "createdAt",
      p.updated_at as "updatedAt"
    FROM plantillas_pagina p
    WHERE p.id = $1
      AND p.visible = true
  `;

  const params: any[] = [plantillaId];

  // Filtrar por feature requerido
  if (tenantFeatureIds.length > 0) {
    sql += ` AND (p.feature_requerido IS NULL OR p.feature_requerido = ANY($2))`;
    params.push(tenantFeatureIds);
  } else {
    sql += ` AND p.feature_requerido IS NULL`;
  }

  const result = await query(sql, params);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    componentes: typeof row.componentes === 'string' ? JSON.parse(row.componentes) : row.componentes || [],
    configuracionDefault: typeof row.configuracionDefault === 'string' ? JSON.parse(row.configuracionDefault) : row.configuracionDefault || {},
    estilos: typeof row.estilos === 'string' ? JSON.parse(row.estilos) : row.estilos || {},
  };
}

/**
 * Obtiene los tipos de página disponibles para un tenant
 * Con conteo de plantillas disponibles
 */
export async function getTiposPaginaDisponiblesParaTenant(
  tenantId: string
): Promise<TipoPaginaInfo[]> {
  // Obtener los features del tenant
  const featuresResult = await query(
    `SELECT feature_id FROM tenants_features WHERE tenant_id = $1`,
    [tenantId]
  );
  const tenantFeatureIds = featuresResult.rows.map((r: any) => r.feature_id);

  // Obtener tipos de página con conteo de plantillas
  let sql = `
    SELECT
      tp.codigo,
      tp.nombre,
      tp.descripcion,
      tp.ruta_patron as "rutaPatron",
      tp.nivel,
      tp.es_plantilla as "esPlantilla",
      tp.protegida,
      COALESCE(plantillas_count.count, 0) as "cantidadPlantillas"
    FROM tipos_pagina tp
    LEFT JOIN (
      SELECT
        tipo_pagina,
        COUNT(*) as count
      FROM plantillas_pagina p
      WHERE p.visible = true
  `;

  const params: any[] = [];

  // Filtrar plantillas por features
  if (tenantFeatureIds.length > 0) {
    sql += ` AND (p.feature_requerido IS NULL OR p.feature_requerido = ANY($1))`;
    params.push(tenantFeatureIds);
  } else {
    sql += ` AND p.feature_requerido IS NULL`;
  }

  sql += `
      GROUP BY tipo_pagina
    ) plantillas_count ON tp.codigo = plantillas_count.tipo_pagina
    WHERE tp.visible = true
  `;

  // Filtrar tipos por features
  if (tenantFeatureIds.length > 0) {
    sql += ` AND (tp.feature_requerido IS NULL OR tp.feature_requerido = ANY($${params.length > 0 ? 1 : params.push(tenantFeatureIds)}))`;
  } else {
    sql += ` AND tp.feature_requerido IS NULL`;
  }

  sql += ` ORDER BY tp.orden ASC, tp.nombre ASC`;

  const result = await query(sql, params);

  return result.rows.map((row: any) => ({
    ...row,
    cantidadPlantillas: parseInt(row.cantidadPlantillas) || 0,
  }));
}
