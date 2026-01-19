/**
 * Servicio de Sincronización de Tags
 *
 * Sincroniza automáticamente las relaciones entre propiedades y tags
 * en la tabla relacion_tags, basándose en los datos de cada propiedad
 * y las reglas definidas en tags_global.
 */

import { query } from '../utils/db.js';

// Pesos por tipo de tag para scoring/relevancia
const PESOS_POR_TIPO: Record<string, number> = {
  'ubicacion': 1.50,      // sector, ciudad, provincia
  'tipo_propiedad': 1.30, // apartamento, casa, penthouse
  'operacion': 1.20,      // comprar, alquilar
  'filtro': 1.00,         // precio, habitaciones, área
  'amenidad': 0.80,       // piscina, gym, jacuzzi
  'caracteristica': 0.70, // cerca-playa, vista-al-mar
  'lista': 0.50,          // custom lists
  'contenido': 0.30       // para artículos/videos
};

// Interfaz para tag del catálogo
interface TagGlobal {
  id: string;
  tenant_id: string | null;
  slug: string;
  tipo: string;
  valor: string | null;
  campo_query: string | null;
  operador: string;
  nombre_idiomas: Record<string, string>;
  activo: boolean;
  pais: string | null;
}

// Interfaz para propiedad (campos relevantes)
interface PropiedadParaTags {
  id: string;
  tenant_id: string;
  tipo: string | null;
  operacion: string | null;
  precio_venta: number | null;
  precio_alquiler: number | null;
  habitaciones: number | null;
  banos: number | null;
  estacionamientos: number | null;
  m2_construccion: number | null;
  m2_terreno: number | null;
  sector: string | null;
  ciudad: string | null;
  provincia: string | null;
  amenidades: string[] | null;
  caracteristicas: Record<string, any> | null;
}

// Resultado de sincronización individual
interface SyncResult {
  propiedad_id: string;
  tags_asignados: number;
  tags: string[];
}

// Resultado de sincronización masiva
interface SyncAllResult {
  propiedades_procesadas: number;
  total_relaciones_creadas: number;
  promedio_tags_por_propiedad: number;
  errores: number;
  detalles_errores?: { propiedad_id: string; error: string }[];
}

/**
 * Normaliza texto para comparación (sin acentos, lowercase)
 */
function normalizeText(text: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Evalúa si un tag aplica a una propiedad según su operador
 */
function evaluarTag(tag: TagGlobal, propiedad: PropiedadParaTags): boolean {
  if (!tag.campo_query || !tag.operador) {
    return false;
  }

  const campo = tag.campo_query;
  const valor = tag.valor;
  const operador = tag.operador.toUpperCase();

  // Obtener el valor del campo de la propiedad
  let valorPropiedad: any = (propiedad as any)[campo];

  // Si el campo no existe en la propiedad, no aplica
  if (valorPropiedad === undefined || valorPropiedad === null) {
    return false;
  }

  try {
    switch (operador) {
      case '=':
        // Comparación exacta (case-insensitive para strings)
        if (typeof valorPropiedad === 'string' && typeof valor === 'string') {
          return normalizeText(valorPropiedad) === normalizeText(valor);
        }
        return valorPropiedad == valor;

      case 'ILIKE':
        // Comparación case-insensitive con wildcards
        if (typeof valorPropiedad !== 'string' || !valor) return false;
        const normalizedProp = normalizeText(valorPropiedad);
        const normalizedValor = normalizeText(valor).replace(/%/g, '');
        return normalizedProp.includes(normalizedValor) || normalizedValor.includes(normalizedProp);

      case '>=':
        // Mayor o igual (para números)
        const numValorGe = parseFloat(valor || '0');
        const numPropGe = parseFloat(valorPropiedad);
        return !isNaN(numPropGe) && !isNaN(numValorGe) && numPropGe >= numValorGe;

      case '<=':
        // Menor o igual (para números)
        const numValorLe = parseFloat(valor || '0');
        const numPropLe = parseFloat(valorPropiedad);
        return !isNaN(numPropLe) && !isNaN(numValorLe) && numPropLe <= numValorLe;

      case 'BETWEEN':
        // Rango: valor tiene formato "min-max"
        if (!valor) return false;
        const [minStr, maxStr] = valor.split('-');
        const min = parseFloat(minStr);
        const max = parseFloat(maxStr);
        const numPropBetween = parseFloat(valorPropiedad);
        return !isNaN(numPropBetween) && !isNaN(min) && !isNaN(max) &&
               numPropBetween >= min && numPropBetween <= max;

      case '@>':
        // Contiene (para arrays JSONB como amenidades)
        if (!Array.isArray(valorPropiedad) || !valor) return false;
        // Normalizar para comparación
        const normalizedArray = valorPropiedad.map(v =>
          typeof v === 'string' ? normalizeText(v) : v
        );
        return normalizedArray.includes(normalizeText(valor));

      case 'IN':
        // El valor de la propiedad está en una lista
        if (!valor) return false;
        const listaValores = valor.split(',').map(v => normalizeText(v.trim()));
        return listaValores.includes(normalizeText(String(valorPropiedad)));

      default:
        console.warn(`Operador no soportado: ${operador}`);
        return false;
    }
  } catch (error) {
    console.error(`Error evaluando tag ${tag.slug} para propiedad ${propiedad.id}:`, error);
    return false;
  }
}

/**
 * Obtiene el peso para un tipo de tag
 */
function getPesoParaTipo(tipo: string): number {
  return PESOS_POR_TIPO[tipo] || 1.00;
}

/**
 * Sincroniza los tags de una propiedad específica
 */
export async function syncTagsForProperty(
  propiedadId: string,
  tenantId: string
): Promise<SyncResult> {
  // 1. Obtener datos de la propiedad
  const propResult = await query(
    `SELECT
      id, tenant_id, tipo, operacion,
      precio_venta, precio_alquiler,
      habitaciones, banos, estacionamientos,
      m2_construccion, m2_terreno,
      sector, ciudad, provincia,
      amenidades, caracteristicas
    FROM propiedades
    WHERE id = $1 AND tenant_id = $2`,
    [propiedadId, tenantId]
  );

  if (propResult.rows.length === 0) {
    throw new Error(`Propiedad ${propiedadId} no encontrada en tenant ${tenantId}`);
  }

  const propiedad: PropiedadParaTags = propResult.rows[0];

  // 2. Obtener todos los tags activos con campo_query definido
  // Incluye tags globales (tenant_id IS NULL) y específicos del tenant
  const tagsResult = await query(
    `SELECT id, tenant_id, slug, tipo, valor, campo_query, operador, nombre_idiomas, activo, pais
    FROM tags_global
    WHERE activo = true
      AND campo_query IS NOT NULL
      AND (tenant_id IS NULL OR tenant_id = $1)
    ORDER BY tipo, slug`,
    [tenantId]
  );

  const tags: TagGlobal[] = tagsResult.rows;

  // 3. Evaluar cada tag contra la propiedad
  const tagsQueAplican: { tag_id: string; slug: string; tipo: string; peso: number }[] = [];

  for (const tag of tags) {
    if (evaluarTag(tag, propiedad)) {
      tagsQueAplican.push({
        tag_id: tag.id,
        slug: tag.slug,
        tipo: tag.tipo,
        peso: getPesoParaTipo(tag.tipo)
      });
    }
  }

  // 4. Eliminar relaciones existentes (solo automáticas, no manuales si se implementa ese flag)
  await query(
    `DELETE FROM relacion_tags
    WHERE tenant_id = $1
      AND tipo_entidad = 'propiedad'
      AND entidad_id = $2`,
    [tenantId, propiedadId]
  );

  // 5. Insertar nuevas relaciones
  if (tagsQueAplican.length > 0) {
    const valores = tagsQueAplican.map((t, idx) => {
      const offset = idx * 5;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
    }).join(', ');

    const params: any[] = [];
    tagsQueAplican.forEach((t, idx) => {
      params.push(tenantId, 'propiedad', propiedadId, t.tag_id, t.peso);
    });

    await query(
      `INSERT INTO relacion_tags (tenant_id, tipo_entidad, entidad_id, tag_id, peso)
      VALUES ${valores}
      ON CONFLICT (tenant_id, tipo_entidad, entidad_id, tag_id) DO UPDATE SET
        peso = EXCLUDED.peso,
        created_at = NOW()`,
      params
    );
  }

  return {
    propiedad_id: propiedadId,
    tags_asignados: tagsQueAplican.length,
    tags: tagsQueAplican.map(t => t.slug)
  };
}

/**
 * Sincroniza tags de todas las propiedades de un tenant
 */
export async function syncAllPropertiesTags(
  tenantId: string,
  options?: {
    batchSize?: number;
    soloActivas?: boolean;
  }
): Promise<SyncAllResult> {
  const batchSize = options?.batchSize || 50;
  const soloActivas = options?.soloActivas !== false; // Por defecto solo activas

  // Obtener todas las propiedades del tenant
  let propiedadesQuery = `
    SELECT id FROM propiedades
    WHERE tenant_id = $1
  `;
  if (soloActivas) {
    propiedadesQuery += ` AND activo = true`;
  }
  propiedadesQuery += ` ORDER BY created_at DESC`;

  const propiedadesResult = await query(propiedadesQuery, [tenantId]);
  const propiedades = propiedadesResult.rows;

  let totalRelacionesCreadas = 0;
  let errores = 0;
  const detallesErrores: { propiedad_id: string; error: string }[] = [];

  // Procesar en lotes
  for (let i = 0; i < propiedades.length; i += batchSize) {
    const batch = propiedades.slice(i, i + batchSize);

    // Procesar cada propiedad del lote en paralelo
    const resultados = await Promise.allSettled(
      batch.map(p => syncTagsForProperty(p.id, tenantId))
    );

    for (let j = 0; j < resultados.length; j++) {
      const resultado = resultados[j];
      if (resultado.status === 'fulfilled') {
        totalRelacionesCreadas += resultado.value.tags_asignados;
      } else {
        errores++;
        detallesErrores.push({
          propiedad_id: batch[j].id,
          error: resultado.reason?.message || 'Error desconocido'
        });
      }
    }
  }

  const propiedadesProcesadas = propiedades.length - errores;

  return {
    propiedades_procesadas: propiedadesProcesadas,
    total_relaciones_creadas: totalRelacionesCreadas,
    promedio_tags_por_propiedad: propiedadesProcesadas > 0
      ? Math.round((totalRelacionesCreadas / propiedadesProcesadas) * 10) / 10
      : 0,
    errores,
    detalles_errores: detallesErrores.length > 0 ? detallesErrores : undefined
  };
}

/**
 * Obtiene los tags asignados a una propiedad
 */
export async function getTagsForProperty(
  propiedadId: string,
  tenantId: string
): Promise<{ id: string; slug: string; tipo: string; nombre_idiomas: Record<string, string>; peso: number }[]> {
  const result = await query(
    `SELECT
      tg.id, tg.slug, tg.tipo, tg.nombre_idiomas,
      rt.peso
    FROM relacion_tags rt
    INNER JOIN tags_global tg ON tg.id = rt.tag_id
    WHERE rt.tenant_id = $1
      AND rt.tipo_entidad = 'propiedad'
      AND rt.entidad_id = $2
    ORDER BY rt.peso DESC, tg.tipo, tg.slug`,
    [tenantId, propiedadId]
  );

  return result.rows;
}

/**
 * Busca propiedades que coincidan con un conjunto de tags
 */
export async function findPropertiesByTags(
  tenantId: string,
  tagSlugs: string[],
  options?: {
    limit?: number;
    offset?: number;
    minScore?: number;
  }
): Promise<{ id: string; titulo: string; score: number }[]> {
  if (tagSlugs.length === 0) {
    return [];
  }

  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  const minScore = options?.minScore || 0;

  // Calcular score sumando pesos de los tags que coinciden
  const result = await query(
    `WITH property_scores AS (
      SELECT
        rt.entidad_id as propiedad_id,
        SUM(rt.peso) as score,
        COUNT(*) as tags_matched
      FROM relacion_tags rt
      INNER JOIN tags_global tg ON tg.id = rt.tag_id
      WHERE rt.tenant_id = $1
        AND rt.tipo_entidad = 'propiedad'
        AND tg.slug = ANY($2)
      GROUP BY rt.entidad_id
      HAVING SUM(rt.peso) >= $3
    )
    SELECT
      p.id, p.titulo, ps.score
    FROM property_scores ps
    INNER JOIN propiedades p ON p.id = ps.propiedad_id
    WHERE p.activo = true
    ORDER BY ps.score DESC, p.created_at DESC
    LIMIT $4 OFFSET $5`,
    [tenantId, tagSlugs, minScore, limit, offset]
  );

  return result.rows;
}

/**
 * Obtiene estadísticas de tags para un tenant
 */
export async function getTagsStats(tenantId: string): Promise<{
  total_tags: number;
  total_relaciones: number;
  tags_por_tipo: Record<string, number>;
  propiedades_con_tags: number;
  promedio_tags_por_propiedad: number;
}> {
  const [tagsCount, relacionesCount, tagsPorTipo, propiedadesConTags] = await Promise.all([
    query(
      `SELECT COUNT(*) as count FROM tags_global
       WHERE activo = true AND (tenant_id IS NULL OR tenant_id = $1)`,
      [tenantId]
    ),
    query(
      `SELECT COUNT(*) as count FROM relacion_tags
       WHERE tenant_id = $1 AND tipo_entidad = 'propiedad'`,
      [tenantId]
    ),
    query(
      `SELECT tg.tipo, COUNT(*) as count
       FROM relacion_tags rt
       INNER JOIN tags_global tg ON tg.id = rt.tag_id
       WHERE rt.tenant_id = $1 AND rt.tipo_entidad = 'propiedad'
       GROUP BY tg.tipo`,
      [tenantId]
    ),
    query(
      `SELECT COUNT(DISTINCT entidad_id) as count FROM relacion_tags
       WHERE tenant_id = $1 AND tipo_entidad = 'propiedad'`,
      [tenantId]
    )
  ]);

  const totalRelaciones = parseInt(relacionesCount.rows[0]?.count || '0');
  const propConTags = parseInt(propiedadesConTags.rows[0]?.count || '0');

  return {
    total_tags: parseInt(tagsCount.rows[0]?.count || '0'),
    total_relaciones: totalRelaciones,
    tags_por_tipo: tagsPorTipo.rows.reduce((acc, row) => {
      acc[row.tipo] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>),
    propiedades_con_tags: propConTags,
    promedio_tags_por_propiedad: propConTags > 0
      ? Math.round((totalRelaciones / propConTags) * 10) / 10
      : 0
  };
}
