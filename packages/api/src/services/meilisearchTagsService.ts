/**
 * MEILISEARCH TAGS SERVICE
 *
 * Servicio para sincronizar tags_global con Meilisearch.
 * Permite búsquedas fuzzy de tags para el buscador de la web pública.
 *
 * Índice: tags_global
 * Host: http://5.161.98.140:7700
 */

import { query } from '../utils/db.js';

// Configuración de Meilisearch
const MEILI_HOST = process.env.MEILISEARCH_HOST || 'http://5.161.98.140:7700';
const MEILI_API_KEY = process.env.MEILISEARCH_API_KEY || 'meili-tags-clic-2026-super-secret-key';
const INDEX_NAME = 'tags_global';

// Interfaz del tag en la base de datos
interface TagGlobal {
  id: string;
  slug: string;
  tipo: string;
  valor: string;
  campo_query: string;
  operador: string;
  alias_idiomas: Record<string, string> | null;
  nombre_idiomas: Record<string, string> | null;
  tenant_id: string;
  orden: number;
  activo: boolean;
  pais: string | null;
  created_at: Date;
  updated_at: Date;
}

// Interfaz del documento en Meilisearch (optimizado para búsqueda)
interface MeiliTagDocument {
  id: string;
  slug: string;
  tipo: string;
  valor: string;
  campo_query: string;
  operador: string;
  tenant_id: string;
  orden: number;
  activo: boolean;
  pais: string | null;
  // Campos de búsqueda (todos los idiomas concatenados para mejor match)
  nombre_es: string;
  nombre_en: string;
  nombre_fr: string;
  nombre_pt: string;
  alias_es: string;
  alias_en: string;
  alias_fr: string;
  alias_pt: string;
  // Campo combinado para búsqueda general
  search_text: string;
  updated_at: number; // timestamp para ordenar por actualización
}

/**
 * Realiza una petición a Meilisearch
 */
async function meiliRequest(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${MEILI_HOST}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MEILI_API_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meilisearch error: ${response.status} - ${error}`);
  }

  // Algunas respuestas pueden estar vacías (204)
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Convierte un tag de la BD a documento de Meilisearch
 */
function tagToMeiliDocument(tag: TagGlobal): MeiliTagDocument {
  const nombres = tag.nombre_idiomas || {};
  const alias = tag.alias_idiomas || {};

  // Crear texto de búsqueda combinando todos los idiomas
  const allNames = Object.values(nombres).filter(Boolean);
  const allAlias = Object.values(alias).filter(Boolean);
  const searchText = [...allNames, ...allAlias, tag.slug, tag.valor].join(' ');

  return {
    id: tag.id,
    slug: tag.slug,
    tipo: tag.tipo,
    valor: tag.valor,
    campo_query: tag.campo_query,
    operador: tag.operador,
    tenant_id: tag.tenant_id,
    orden: tag.orden,
    activo: tag.activo,
    pais: tag.pais,
    nombre_es: nombres.es || tag.slug,
    nombre_en: nombres.en || '',
    nombre_fr: nombres.fr || '',
    nombre_pt: nombres.pt || '',
    alias_es: alias.es || tag.slug,
    alias_en: alias.en || '',
    alias_fr: alias.fr || '',
    alias_pt: alias.pt || '',
    search_text: searchText,
    updated_at: new Date(tag.updated_at).getTime(),
  };
}

/**
 * Configura el índice con los settings óptimos para búsqueda de tags
 */
export async function configureTagsIndex(): Promise<void> {
  console.log('🔧 Configurando índice de tags en Meilisearch...');

  // Crear índice si no existe
  try {
    await meiliRequest(`/indexes/${INDEX_NAME}`, {
      method: 'POST',
      body: JSON.stringify({
        uid: INDEX_NAME,
        primaryKey: 'id',
      }),
    });
    console.log('✅ Índice creado');
  } catch (err: any) {
    if (!err.message.includes('already exists')) {
      console.log('ℹ️  Índice ya existe o error:', err.message);
    }
  }

  // Configurar settings del índice
  const settings = {
    // Campos que se pueden buscar (en orden de prioridad)
    searchableAttributes: [
      'nombre_es',
      'nombre_en',
      'alias_es',
      'alias_en',
      'search_text',
      'slug',
      'valor',
      'nombre_fr',
      'nombre_pt',
      'alias_fr',
      'alias_pt',
    ],
    // Campos que se pueden filtrar
    filterableAttributes: [
      'tipo',
      'tenant_id',
      'activo',
      'pais',
      'campo_query',
    ],
    // Campos que se pueden ordenar
    sortableAttributes: [
      'orden',
      'updated_at',
      'tipo',
    ],
    // Campos que se devuelven en los resultados
    displayedAttributes: [
      'id',
      'slug',
      'tipo',
      'valor',
      'campo_query',
      'operador',
      'tenant_id',
      'orden',
      'activo',
      'pais',
      'nombre_es',
      'nombre_en',
      'nombre_fr',
      'nombre_pt',
      'alias_es',
      'alias_en',
    ],
    // Tolerancia a typos
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 3,
        twoTypos: 6,
      },
    },
    // Sinónimos comunes en español
    synonyms: {
      'apartamento': ['apto', 'depto', 'departamento', 'piso'],
      'casa': ['vivienda', 'residencia', 'hogar'],
      'alquiler': ['renta', 'arrendamiento', 'alquilar', 'rentar'],
      'venta': ['compra', 'comprar', 'adquirir'],
      'habitacion': ['cuarto', 'dormitorio', 'recamara', 'habitaciones'],
      'bano': ['baño', 'sanitario', 'wc'],
      'parqueo': ['parking', 'estacionamiento', 'garaje', 'cochera'],
      'piscina': ['alberca', 'pool'],
      'gimnasio': ['gym'],
      'penthouse': ['ph', 'atico'],
      'santo domingo': ['sd', 'capital'],
      'santiago': ['stgo'],
      'punta cana': ['bavaro', 'pc'],
    },
    // Ranking de resultados
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
    ],
  };

  await meiliRequest(`/indexes/${INDEX_NAME}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });

  console.log('✅ Settings del índice configurados');
}

/**
 * Sincroniza todos los tags activos con Meilisearch
 */
export async function syncAllTags(): Promise<{ added: number; errors: number }> {
  console.log('🔄 Sincronizando todos los tags con Meilisearch...');

  // Obtener todos los tags de la BD
  const result = await query(`
    SELECT * FROM tags_global
    WHERE activo = true
    ORDER BY tipo, orden
  `);

  const tags: TagGlobal[] = result.rows;
  console.log(`📊 Tags activos encontrados: ${tags.length}`);

  if (tags.length === 0) {
    console.log('⚠️  No hay tags activos para sincronizar');
    return { added: 0, errors: 0 };
  }

  // Convertir a documentos de Meilisearch
  const documents = tags.map(tagToMeiliDocument);

  // Agregar documentos en lotes de 1000
  const BATCH_SIZE = 1000;
  let added = 0;
  let errors = 0;

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    try {
      const taskInfo = await meiliRequest(`/indexes/${INDEX_NAME}/documents?primaryKey=id`, {
        method: 'POST',
        body: JSON.stringify(batch),
      });
      console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} documentos agregados (task: ${taskInfo.taskUid})`);
      added += batch.length;
    } catch (err: any) {
      console.error(`❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
      errors += batch.length;
    }
  }

  console.log(`✅ Sincronización completada: ${added} agregados, ${errors} errores`);
  return { added, errors };
}

/**
 * Sincroniza un tag específico (para usar en triggers/hooks)
 */
export async function syncTag(tagId: string): Promise<void> {
  const result = await query(`SELECT * FROM tags_global WHERE id = $1`, [tagId]);

  if (result.rows.length === 0) {
    // Tag eliminado, remover de Meilisearch
    await deleteTagFromIndex(tagId);
    return;
  }

  const tag: TagGlobal = result.rows[0];

  if (!tag.activo) {
    // Tag inactivo, remover de Meilisearch
    await deleteTagFromIndex(tagId);
    return;
  }

  // Actualizar en Meilisearch
  const document = tagToMeiliDocument(tag);
  await meiliRequest(`/indexes/${INDEX_NAME}/documents?primaryKey=id`, {
    method: 'POST',
    body: JSON.stringify([document]),
  });

  console.log(`✅ Tag sincronizado: ${tag.slug}`);
}

/**
 * Elimina un tag del índice
 */
export async function deleteTagFromIndex(tagId: string): Promise<void> {
  try {
    await meiliRequest(`/indexes/${INDEX_NAME}/documents/${tagId}`, {
      method: 'DELETE',
    });
    console.log(`🗑️  Tag eliminado del índice: ${tagId}`);
  } catch (err: any) {
    // Ignorar si no existe
    if (!err.message.includes('not found')) {
      throw err;
    }
  }
}

/**
 * Elimina todos los documentos del índice y vuelve a sincronizar
 */
export async function resetAndSyncTags(): Promise<{ added: number; errors: number }> {
  console.log('🔄 Reseteando índice de tags...');

  // Eliminar todos los documentos
  try {
    await meiliRequest(`/indexes/${INDEX_NAME}/documents`, {
      method: 'DELETE',
    });
    console.log('✅ Documentos eliminados');
  } catch (err: any) {
    console.log('ℹ️  No se pudieron eliminar documentos:', err.message);
  }

  // Esperar un poco para que Meilisearch procese
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Reconfigurar y sincronizar
  await configureTagsIndex();
  return await syncAllTags();
}

/**
 * Busca tags (útil para testing)
 */
export async function searchTags(
  searchQuery: string,
  options: {
    tenantId?: string;
    tipo?: string;
    limit?: number;
    lang?: string;
  } = {}
): Promise<any> {
  const { tenantId, tipo, limit = 20, lang = 'es' } = options;

  const filters: string[] = ['activo = true'];
  if (tenantId) filters.push(`tenant_id = "${tenantId}"`);
  if (tipo) filters.push(`tipo = "${tipo}"`);

  const body: any = {
    q: searchQuery,
    limit,
    filter: filters.join(' AND '),
    attributesToHighlight: ['nombre_es', 'nombre_en', 'alias_es', 'search_text'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>',
  };

  const result = await meiliRequest(`/indexes/${INDEX_NAME}/search`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return result;
}

/**
 * Obtiene estadísticas del índice
 */
export async function getIndexStats(): Promise<any> {
  try {
    const stats = await meiliRequest(`/indexes/${INDEX_NAME}/stats`);
    return stats;
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Inicialización completa: configura y sincroniza
 */
export async function initializeMeilisearchTags(): Promise<void> {
  console.log('🚀 Inicializando Meilisearch Tags...');
  console.log(`   Host: ${MEILI_HOST}`);
  console.log(`   Index: ${INDEX_NAME}`);

  await configureTagsIndex();
  const result = await syncAllTags();

  console.log('✅ Inicialización completada');
  console.log(`   Documentos: ${result.added}`);
  console.log(`   Errores: ${result.errors}`);
}
