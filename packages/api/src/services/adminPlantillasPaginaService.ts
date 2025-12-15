/**
 * Servicio para gestionar plantillas de página desde el panel admin
 * Las plantillas son variantes visuales de un tipo de página
 */

import { query } from '../utils/db.js';

export interface ComponentePlantilla {
  codigo: string;
  orden: number;
  configuracion?: Record<string, any>;
}

export interface PlantillaPagina {
  id: string;
  codigo: string;
  tipoPagina: string;
  tipoPaginaNombre?: string;
  nombre: string;
  descripcion: string | null;
  previewImage: string | null;
  categoria: string | null;
  componentes: ComponentePlantilla[];
  configuracionDefault: Record<string, any>;
  estilos: Record<string, any>;
  featureRequerido: string | null;
  visible: boolean;
  featured: boolean;
  esPremium: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
  // Estadísticas
  paginasUsando?: number;
}

export interface PlantillaPaginaCreate {
  codigo: string;
  tipoPagina: string;
  nombre: string;
  descripcion?: string;
  previewImage?: string;
  categoria?: string;
  componentes?: ComponentePlantilla[];
  configuracionDefault?: Record<string, any>;
  estilos?: Record<string, any>;
  featureRequerido?: string | null;
  visible?: boolean;
  featured?: boolean;
  esPremium?: boolean;
  orden?: number;
}

export interface PlantillaPaginaUpdate {
  nombre?: string;
  descripcion?: string;
  previewImage?: string;
  categoria?: string;
  componentes?: ComponentePlantilla[];
  configuracionDefault?: Record<string, any>;
  estilos?: Record<string, any>;
  featureRequerido?: string | null;
  visible?: boolean;
  featured?: boolean;
  esPremium?: boolean;
  orden?: number;
}

/**
 * Obtiene todas las plantillas con estadísticas de uso
 */
export async function getAllPlantillas(): Promise<PlantillaPagina[]> {
  const sql = `
    SELECT
      pp.*,
      tp.nombre as tipo_pagina_nombre,
      COALESCE(stats.paginas_usando, 0) as paginas_usando
    FROM plantillas_pagina pp
    LEFT JOIN tipos_pagina tp ON pp.tipo_pagina = tp.codigo
    LEFT JOIN (
      SELECT plantilla_id, COUNT(*) as paginas_usando
      FROM paginas_web
      WHERE plantilla_id IS NOT NULL AND activa = true
      GROUP BY plantilla_id
    ) stats ON pp.id = stats.plantilla_id
    ORDER BY pp.tipo_pagina, pp.orden, pp.nombre
  `;

  const result = await query(sql);
  return result.rows.map(mapPlantilla);
}

/**
 * Obtiene plantillas por tipo de página
 */
export async function getPlantillasByTipo(tipoPagina: string): Promise<PlantillaPagina[]> {
  const sql = `
    SELECT
      pp.*,
      tp.nombre as tipo_pagina_nombre,
      COALESCE(stats.paginas_usando, 0) as paginas_usando
    FROM plantillas_pagina pp
    LEFT JOIN tipos_pagina tp ON pp.tipo_pagina = tp.codigo
    LEFT JOIN (
      SELECT plantilla_id, COUNT(*) as paginas_usando
      FROM paginas_web
      WHERE plantilla_id IS NOT NULL AND activa = true
      GROUP BY plantilla_id
    ) stats ON pp.id = stats.plantilla_id
    WHERE pp.tipo_pagina = $1 AND pp.visible = true
    ORDER BY pp.orden, pp.nombre
  `;

  const result = await query(sql, [tipoPagina]);
  return result.rows.map(mapPlantilla);
}

/**
 * Obtiene una plantilla por ID
 */
export async function getPlantillaById(id: string): Promise<PlantillaPagina | null> {
  const sql = `
    SELECT
      pp.*,
      tp.nombre as tipo_pagina_nombre,
      COALESCE(stats.paginas_usando, 0) as paginas_usando
    FROM plantillas_pagina pp
    LEFT JOIN tipos_pagina tp ON pp.tipo_pagina = tp.codigo
    LEFT JOIN (
      SELECT plantilla_id, COUNT(*) as paginas_usando
      FROM paginas_web
      WHERE plantilla_id IS NOT NULL AND activa = true
      GROUP BY plantilla_id
    ) stats ON pp.id = stats.plantilla_id
    WHERE pp.id = $1
  `;

  const result = await query(sql, [id]);
  if (result.rows.length === 0) return null;
  return mapPlantilla(result.rows[0]);
}

/**
 * Obtiene una plantilla por código
 */
export async function getPlantillaByCodigo(codigo: string): Promise<PlantillaPagina | null> {
  const sql = `
    SELECT
      pp.*,
      tp.nombre as tipo_pagina_nombre,
      COALESCE(stats.paginas_usando, 0) as paginas_usando
    FROM plantillas_pagina pp
    LEFT JOIN tipos_pagina tp ON pp.tipo_pagina = tp.codigo
    LEFT JOIN (
      SELECT plantilla_id, COUNT(*) as paginas_usando
      FROM paginas_web
      WHERE plantilla_id IS NOT NULL AND activa = true
      GROUP BY plantilla_id
    ) stats ON pp.id = stats.plantilla_id
    WHERE pp.codigo = $1
  `;

  const result = await query(sql, [codigo]);
  if (result.rows.length === 0) return null;
  return mapPlantilla(result.rows[0]);
}

/**
 * Crea una nueva plantilla
 */
export async function createPlantilla(data: PlantillaPaginaCreate): Promise<PlantillaPagina> {
  // Verificar que no exista
  const existing = await getPlantillaByCodigo(data.codigo);
  if (existing) {
    throw new Error('Ya existe una plantilla con ese código');
  }

  // Verificar que el tipo de página existe
  const tipoResult = await query('SELECT codigo FROM tipos_pagina WHERE codigo = $1', [data.tipoPagina]);
  if (tipoResult.rows.length === 0) {
    throw new Error('El tipo de página especificado no existe');
  }

  const sql = `
    INSERT INTO plantillas_pagina (
      codigo,
      tipo_pagina,
      nombre,
      descripcion,
      preview_image,
      categoria,
      componentes,
      configuracion_default,
      estilos,
      feature_requerido,
      visible,
      featured,
      es_premium,
      orden,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
    )
    RETURNING id
  `;

  const values = [
    data.codigo,
    data.tipoPagina,
    data.nombre,
    data.descripcion || null,
    data.previewImage || null,
    data.categoria || null,
    JSON.stringify(data.componentes || []),
    JSON.stringify(data.configuracionDefault || {}),
    JSON.stringify(data.estilos || {}),
    data.featureRequerido || null,
    data.visible !== false,
    data.featured || false,
    data.esPremium || false,
    data.orden || 100,
  ];

  const result = await query(sql, values);
  return getPlantillaById(result.rows[0].id) as Promise<PlantillaPagina>;
}

/**
 * Actualiza una plantilla
 */
export async function updatePlantilla(id: string, data: PlantillaPaginaUpdate): Promise<PlantillaPagina> {
  const existing = await getPlantillaById(id);
  if (!existing) {
    throw new Error('Plantilla no encontrada');
  }

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
  if (data.previewImage !== undefined) {
    updates.push(`preview_image = $${paramIndex++}`);
    values.push(data.previewImage);
  }
  if (data.categoria !== undefined) {
    updates.push(`categoria = $${paramIndex++}`);
    values.push(data.categoria);
  }
  if (data.componentes !== undefined) {
    updates.push(`componentes = $${paramIndex++}`);
    values.push(JSON.stringify(data.componentes));
  }
  if (data.configuracionDefault !== undefined) {
    updates.push(`configuracion_default = $${paramIndex++}`);
    values.push(JSON.stringify(data.configuracionDefault));
  }
  if (data.estilos !== undefined) {
    updates.push(`estilos = $${paramIndex++}`);
    values.push(JSON.stringify(data.estilos));
  }
  if (data.featureRequerido !== undefined) {
    updates.push(`feature_requerido = $${paramIndex++}`);
    values.push(data.featureRequerido);
  }
  if (data.visible !== undefined) {
    updates.push(`visible = $${paramIndex++}`);
    values.push(data.visible);
  }
  if (data.featured !== undefined) {
    updates.push(`featured = $${paramIndex++}`);
    values.push(data.featured);
  }
  if (data.esPremium !== undefined) {
    updates.push(`es_premium = $${paramIndex++}`);
    values.push(data.esPremium);
  }
  if (data.orden !== undefined) {
    updates.push(`orden = $${paramIndex++}`);
    values.push(data.orden);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const sql = `
    UPDATE plantillas_pagina
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
  `;

  await query(sql, values);
  return getPlantillaById(id) as Promise<PlantillaPagina>;
}

/**
 * Elimina una plantilla
 */
export async function deletePlantilla(id: string): Promise<void> {
  const existing = await getPlantillaById(id);
  if (!existing) {
    throw new Error('Plantilla no encontrada');
  }

  // Verificar si hay páginas usando esta plantilla
  if (existing.paginasUsando && existing.paginasUsando > 0) {
    throw new Error(`No se puede eliminar: hay ${existing.paginasUsando} páginas usando esta plantilla`);
  }

  await query('DELETE FROM plantillas_pagina WHERE id = $1', [id]);
}

/**
 * Obtiene categorías disponibles
 */
export async function getCategorias(): Promise<string[]> {
  const result = await query(`
    SELECT DISTINCT categoria
    FROM plantillas_pagina
    WHERE categoria IS NOT NULL
    ORDER BY categoria
  `);
  return result.rows.map(r => r.categoria);
}

/**
 * Mapea un row de la BD a la interfaz PlantillaPagina
 */
function mapPlantilla(row: any): PlantillaPagina {
  return {
    id: row.id,
    codigo: row.codigo,
    tipoPagina: row.tipo_pagina,
    tipoPaginaNombre: row.tipo_pagina_nombre,
    nombre: row.nombre,
    descripcion: row.descripcion,
    previewImage: row.preview_image,
    categoria: row.categoria,
    componentes: parseJson(row.componentes) || [],
    configuracionDefault: parseJson(row.configuracion_default) || {},
    estilos: parseJson(row.estilos) || {},
    featureRequerido: row.feature_requerido,
    visible: row.visible ?? true,
    featured: row.featured ?? false,
    esPremium: row.es_premium ?? false,
    orden: row.orden || 100,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paginasUsando: parseInt(row.paginas_usando) || 0,
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
