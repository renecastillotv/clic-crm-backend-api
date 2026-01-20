/**
 * Script para sincronizar tags_global con Meilisearch
 *
 * Uso:
 *   node sync-tags-meilisearch.mjs          # Sincronización incremental
 *   node sync-tags-meilisearch.mjs --reset  # Resetear y sincronizar todo
 *   node sync-tags-meilisearch.mjs --search "apartamento"  # Probar búsqueda
 *   node sync-tags-meilisearch.mjs --stats  # Ver estadísticas
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const MEILI_HOST = process.env.MEILISEARCH_HOST || 'http://5.161.98.140:7700';
const MEILI_API_KEY = process.env.MEILISEARCH_API_KEY || 'meili-tags-clic-2026-super-secret-key';
const INDEX_NAME = 'tags_global';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

// Función para hacer peticiones a Meilisearch
async function meiliRequest(path, options = {}) {
  const url = `${MEILI_HOST}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MEILI_API_KEY}`,
      ...options.headers,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Meilisearch error: ${response.status} - ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

// Convertir tag a documento de Meilisearch
function tagToDocument(tag) {
  const nombres = tag.nombre_idiomas || {};
  const alias = tag.alias_idiomas || {};

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

// Configurar el índice
async function configureIndex() {
  console.log('🔧 Configurando índice...');

  // Crear índice
  try {
    await meiliRequest(`/indexes/${INDEX_NAME}`, {
      method: 'POST',
      body: JSON.stringify({ uid: INDEX_NAME, primaryKey: 'id' }),
    });
    console.log('✅ Índice creado');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.log('ℹ️  Índice ya existe');
    }
  }

  // Configurar settings
  const settings = {
    searchableAttributes: [
      'nombre_es', 'nombre_en', 'alias_es', 'alias_en',
      'search_text', 'slug', 'valor',
      'nombre_fr', 'nombre_pt', 'alias_fr', 'alias_pt',
    ],
    filterableAttributes: ['tipo', 'tenant_id', 'activo', 'pais', 'campo_query'],
    sortableAttributes: ['orden', 'updated_at', 'tipo'],
    displayedAttributes: [
      'id', 'slug', 'tipo', 'valor', 'campo_query', 'operador',
      'tenant_id', 'orden', 'activo', 'pais',
      'nombre_es', 'nombre_en', 'nombre_fr', 'nombre_pt',
      'alias_es', 'alias_en',
    ],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 3, twoTypos: 6 },
    },
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
  };

  await meiliRequest(`/indexes/${INDEX_NAME}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });

  console.log('✅ Settings configurados');
}

// Sincronizar todos los tags
async function syncAll() {
  console.log('🔄 Sincronizando tags...');

  const result = await pool.query(`
    SELECT * FROM tags_global
    WHERE activo = true
    ORDER BY tipo, orden
  `);

  console.log(`📊 Tags activos: ${result.rows.length}`);

  if (result.rows.length === 0) {
    console.log('⚠️  No hay tags para sincronizar');
    return;
  }

  const documents = result.rows.map(tagToDocument);

  // Agregar en lotes
  const BATCH_SIZE = 500;
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const taskInfo = await meiliRequest(`/indexes/${INDEX_NAME}/documents?primaryKey=id`, {
      method: 'POST',
      body: JSON.stringify(batch),
    });
    console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} docs (task: ${taskInfo.taskUid})`);
  }

  console.log('✅ Sincronización completada');
}

// Resetear índice
async function resetIndex() {
  console.log('🗑️  Eliminando documentos existentes...');
  try {
    await meiliRequest(`/indexes/${INDEX_NAME}/documents`, { method: 'DELETE' });
    console.log('✅ Documentos eliminados');
  } catch (err) {
    console.log('ℹ️  No se pudieron eliminar:', err.message);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Buscar tags
async function searchTags(query) {
  console.log(`🔍 Buscando: "${query}"`);

  const result = await meiliRequest(`/indexes/${INDEX_NAME}/search`, {
    method: 'POST',
    body: JSON.stringify({
      q: query,
      limit: 10,
      filter: 'activo = true',
      attributesToHighlight: ['nombre_es', 'alias_es', 'search_text'],
      highlightPreTag: '\x1b[33m',  // Yellow
      highlightPostTag: '\x1b[0m',   // Reset
    }),
  });

  console.log(`\n📊 Resultados: ${result.hits.length} de ${result.estimatedTotalHits}`);
  console.log(`⏱️  Tiempo: ${result.processingTimeMs}ms\n`);

  result.hits.forEach((hit, i) => {
    const highlight = hit._formatted || {};
    console.log(`${i + 1}. [${hit.tipo}] ${highlight.nombre_es || hit.nombre_es}`);
    console.log(`   Slug: ${hit.slug} | Valor: ${hit.valor}`);
    console.log(`   Query: ${hit.campo_query} ${hit.operador} "${hit.valor}"`);
    console.log('');
  });
}

// Ver estadísticas
async function showStats() {
  const stats = await meiliRequest(`/indexes/${INDEX_NAME}/stats`);
  const tasks = await meiliRequest('/tasks?limit=5');

  console.log('\n📊 ESTADÍSTICAS DEL ÍNDICE');
  console.log('═'.repeat(40));
  console.log(`Documentos: ${stats.numberOfDocuments}`);
  console.log(`Indexando: ${stats.isIndexing}`);

  console.log('\n📋 ÚLTIMAS TAREAS');
  console.log('─'.repeat(40));
  tasks.results.forEach(task => {
    const status = task.status === 'succeeded' ? '✅' : task.status === 'failed' ? '❌' : '⏳';
    console.log(`${status} ${task.type} (${task.uid}) - ${task.status}`);
  });
}

// Main
async function main() {
  const args = process.argv.slice(2);

  try {
    console.log('═'.repeat(50));
    console.log('  MEILISEARCH TAGS SYNC');
    console.log('═'.repeat(50));
    console.log(`Host: ${MEILI_HOST}`);
    console.log(`Index: ${INDEX_NAME}`);
    console.log('');

    // Verificar conexión a Meilisearch
    const health = await meiliRequest('/health');
    console.log(`✅ Meilisearch: ${health.status}\n`);

    if (args.includes('--stats')) {
      await showStats();
    } else if (args.includes('--search')) {
      const searchIndex = args.indexOf('--search');
      const query = args[searchIndex + 1] || 'apartamento';
      await searchTags(query);
    } else if (args.includes('--reset')) {
      await resetIndex();
      await configureIndex();
      await syncAll();
    } else {
      await configureIndex();
      await syncAll();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
