/**
 * Script de pruebas para validar el PageDataAssembler
 *
 * Ejecutar con: npx tsx src/scripts/test-assembler.ts
 *
 * Este script prueba el assembler completo para cada tipo de página:
 * 1. Verifica que se resuelvan los datos primarios
 * 2. Verifica que se resuelvan los datos secundarios
 * 3. Muestra la estructura de datos resultante
 */

import {
  assemblePageData,
  assemblePageDataByCode,
  hasRecipeForPage,
  getSupportedPageTypes,
  getRecipeInfo,
  AssemblerContext,
} from '../services/pageDataAssembler.js';
import { query } from '../utils/db.js';

// Tenant de prueba - se resolverá al UUID real
const TEST_TENANT_SLUG = 'clic';
let TEST_TENANT_ID = '';

async function resolveTenantId(): Promise<string> {
  const result = await query(
    'SELECT id FROM tenants WHERE slug = $1 OR id::text = $1 LIMIT 1',
    [TEST_TENANT_SLUG]
  );
  if (result.rows.length === 0) {
    throw new Error(`Tenant no encontrado: ${TEST_TENANT_SLUG}`);
  }
  return result.rows[0].id;
}

// Helper para ejecutar query con manejo de errores
async function safeQuery(text: string, params: any[]): Promise<any[]> {
  try {
    const result = await query(text, params);
    return result.rows;
  } catch (error) {
    console.log(`   ⚠️ Query falló: ${text.substring(0, 50)}...`);
    return [];
  }
}

// Obtener datos reales para usar en las pruebas
async function getRealTestData(): Promise<{
  videoSlug: string | null;
  articuloSlug: string | null;
  testimonioSlug: string | null;
  asesorSlug: string | null;
  propiedadSlug: string | null;
  categoriaVideoSlug: string | null;
}> {
  // Queries sin columna 'activo' - usar nombres reales de tablas
  const [videos, articulos, testimonios, asesores, propiedades] = await Promise.all([
    safeQuery('SELECT slug FROM videos WHERE tenant_id = $1 LIMIT 1', [TEST_TENANT_ID]),
    safeQuery('SELECT slug FROM articulos WHERE tenant_id = $1 LIMIT 1', [TEST_TENANT_ID]),
    safeQuery('SELECT slug FROM testimonios WHERE tenant_id = $1 LIMIT 1', [TEST_TENANT_ID]),
    safeQuery('SELECT slug FROM perfiles_asesor WHERE tenant_id = $1 LIMIT 1', [TEST_TENANT_ID]),
    safeQuery('SELECT slug FROM propiedades WHERE tenant_id = $1 LIMIT 1', [TEST_TENANT_ID]),
  ]);

  // Intentar obtener categorías de videos si existe la tabla
  let categoriaVideoSlug: string | null = null;
  const categoriasVideo = await safeQuery(
    'SELECT slug FROM categorias_videos WHERE tenant_id = $1 LIMIT 1',
    [TEST_TENANT_ID]
  );
  if (categoriasVideo.length === 0) {
    // Intentar con videos_categorias
    const videosCats = await safeQuery(
      'SELECT slug FROM videos_categorias WHERE tenant_id = $1 LIMIT 1',
      [TEST_TENANT_ID]
    );
    categoriaVideoSlug = videosCats[0]?.slug || null;
  } else {
    categoriaVideoSlug = categoriasVideo[0]?.slug || null;
  }

  return {
    videoSlug: videos[0]?.slug || null,
    articuloSlug: articulos[0]?.slug || null,
    testimonioSlug: testimonios[0]?.slug || null,
    asesorSlug: asesores[0]?.slug || null,
    propiedadSlug: propiedades[0]?.slug || null,
    categoriaVideoSlug,
  };
}

interface TestResult {
  tipoPagina: string;
  status: 'OK' | 'ERROR' | 'EMPTY' | 'NO_DATA';
  primaryType: string;
  primaryStatus: 'OK' | 'EMPTY' | 'NULL';
  secondaryResults: { key: string; status: 'OK' | 'EMPTY' | 'NULL' }[];
  error?: string;
  dataKeys?: string[];
}

const results: TestResult[] = [];

async function testAssembler(
  name: string,
  context: Omit<AssemblerContext, 'tenantId'>
): Promise<void> {
  console.log(`\n🍽️ Probando: ${name}`);
  console.log(`   Tipo: ${context.tipoPagina}`);
  if (context.slug) console.log(`   Slug: ${context.slug}`);
  if (context.categoriaSlug) console.log(`   Categoría: ${context.categoriaSlug}`);

  const recipeInfo = getRecipeInfo(context.tipoPagina);
  if (recipeInfo) {
    console.log(`   Receta - Primary: ${recipeInfo.primaryType}`);
    console.log(`   Receta - Secondary: ${recipeInfo.secondaryTypes.join(', ') || 'ninguno'}`);
  }

  try {
    const fullContext: AssemblerContext = {
      tenantId: TEST_TENANT_ID,
      idioma: 'es',
      ...context,
    };

    const startTime = Date.now();
    const result = await assemblePageData(fullContext);
    const duration = Date.now() - startTime;

    console.log(`   ⏱️ Duración: ${duration}ms`);

    // Evaluar resultado primario
    const primaryStatus = result.primary === null
      ? 'NULL'
      : (Array.isArray(result.primary) && result.primary.length === 0)
        ? 'EMPTY'
        : 'OK';

    console.log(`   📦 Primary: ${primaryStatus}`);
    if (primaryStatus === 'OK' && result.primary) {
      if (Array.isArray(result.primary)) {
        console.log(`      → Array con ${result.primary.length} elementos`);
        if (result.primary.length > 0) {
          console.log(`      → Campos: ${Object.keys(result.primary[0]).slice(0, 8).join(', ')}`);
        }
      } else {
        console.log(`      → Objeto con campos: ${Object.keys(result.primary).slice(0, 8).join(', ')}`);
      }
    }

    // Evaluar resultados secundarios
    const secondaryResults: { key: string; status: 'OK' | 'EMPTY' | 'NULL' }[] = [];
    const dataKeys = Object.keys(result).filter(k => k !== 'primary' && k !== '_meta');

    for (const key of dataKeys) {
      const value = result[key];
      const status = value === null || value === undefined
        ? 'NULL'
        : (Array.isArray(value) && value.length === 0)
          ? 'EMPTY'
          : 'OK';

      secondaryResults.push({ key, status });

      if (status === 'OK') {
        if (Array.isArray(value)) {
          console.log(`   📦 ${key}: Array con ${value.length} elementos`);
        } else {
          console.log(`   📦 ${key}: Objeto`);
        }
      } else {
        console.log(`   📦 ${key}: ${status}`);
      }
    }

    // Determinar status general
    const hasData = primaryStatus === 'OK' || secondaryResults.some(s => s.status === 'OK');
    const overallStatus = hasData ? 'OK' : primaryStatus === 'NULL' ? 'NO_DATA' : 'EMPTY';

    console.log(`   ✅ Status general: ${overallStatus}`);

    results.push({
      tipoPagina: name,
      status: overallStatus,
      primaryType: recipeInfo?.primaryType || 'unknown',
      primaryStatus,
      secondaryResults,
      dataKeys,
    });
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({
      tipoPagina: name,
      status: 'ERROR',
      primaryType: recipeInfo?.primaryType || 'unknown',
      primaryStatus: 'NULL',
      secondaryResults: [],
      error: error.message,
    });
  }
}

async function runTests(): Promise<void> {
  // Resolver el UUID del tenant
  console.log(`\n🔍 Buscando tenant por slug: ${TEST_TENANT_SLUG}...`);
  TEST_TENANT_ID = await resolveTenantId();
  console.log(`✅ Tenant encontrado: ${TEST_TENANT_ID}\n`);

  // Obtener datos reales para las pruebas single
  console.log('🔍 Obteniendo datos reales para pruebas...');
  const testData = await getRealTestData();
  console.log(`   Video: ${testData.videoSlug || 'N/A'}`);
  console.log(`   Artículo: ${testData.articuloSlug || 'N/A'}`);
  console.log(`   Testimonio: ${testData.testimonioSlug || 'N/A'}`);
  console.log(`   Asesor: ${testData.asesorSlug || 'N/A'}`);
  console.log(`   Propiedad: ${testData.propiedadSlug || 'N/A'}`);
  console.log(`   Categoría Video: ${testData.categoriaVideoSlug || 'N/A'}`);

  console.log('\n' + '═'.repeat(70));
  console.log('🍽️ PRUEBAS DEL PAGE DATA ASSEMBLER');
  console.log(`   Tenant: ${TEST_TENANT_ID} (${TEST_TENANT_SLUG})`);
  console.log('═'.repeat(70));

  // Mostrar tipos de página soportados
  const supportedTypes = getSupportedPageTypes();
  console.log(`\n📋 Tipos de página soportados: ${supportedTypes.length}`);
  console.log(`   ${supportedTypes.join(', ')}`);

  // ============================================
  // HOMEPAGE
  // ============================================
  await testAssembler('Homepage', { tipoPagina: 'homepage' });

  // ============================================
  // VIDEOS
  // ============================================
  await testAssembler('Videos - Listado', { tipoPagina: 'videos_listado' });
  await testAssembler('Videos - Categorías', { tipoPagina: 'videos_categoria' });

  if (testData.categoriaVideoSlug) {
    await testAssembler('Videos - Por Categoría', {
      tipoPagina: 'categoria_videos',
      categoriaSlug: testData.categoriaVideoSlug,
    });
  }

  if (testData.videoSlug) {
    await testAssembler('Video - Single', {
      tipoPagina: 'videos_single',
      slug: testData.videoSlug,
    });
  }

  // ============================================
  // ARTÍCULOS
  // ============================================
  await testAssembler('Artículos - Listado', { tipoPagina: 'articulos_listado' });

  if (testData.articuloSlug) {
    await testAssembler('Artículo - Single', {
      tipoPagina: 'articulos_single',
      slug: testData.articuloSlug,
    });
  }

  // ============================================
  // TESTIMONIOS
  // ============================================
  await testAssembler('Testimonios - Listado', { tipoPagina: 'testimonios_listado' });

  if (testData.testimonioSlug) {
    await testAssembler('Testimonio - Single', {
      tipoPagina: 'testimonios_single',
      slug: testData.testimonioSlug,
    });
  }

  // ============================================
  // ASESORES
  // ============================================
  await testAssembler('Asesores - Listado', { tipoPagina: 'listado_asesores' });

  if (testData.asesorSlug) {
    await testAssembler('Asesor - Single', {
      tipoPagina: 'asesor_single',
      slug: testData.asesorSlug,
    });
  }

  // ============================================
  // PROPIEDADES
  // ============================================
  await testAssembler('Propiedades - Listado', { tipoPagina: 'propiedades_listado' });

  if (testData.propiedadSlug) {
    await testAssembler('Propiedad - Single', {
      tipoPagina: 'propiedades_single',
      slug: testData.propiedadSlug,
    });
  }

  // ============================================
  // FAQs
  // ============================================
  await testAssembler('FAQs - Listado', { tipoPagina: 'faqs_listado' });

  // ============================================
  // PÁGINAS ESPECIALES
  // ============================================
  await testAssembler('Contacto', { tipoPagina: 'contacto' });
  await testAssembler('Nosotros', { tipoPagina: 'nosotros' });

  // ============================================
  // PRUEBA assemblePageDataByCode
  // ============================================
  console.log('\n' + '═'.repeat(70));
  console.log('🔄 PRUEBA DE assemblePageDataByCode');
  console.log('═'.repeat(70));

  console.log('\n🧪 Probando con código "home" → debe mapear a "homepage"');
  try {
    const homeData = await assemblePageDataByCode('home', {
      tenantId: TEST_TENANT_ID,
      idioma: 'es',
    });
    console.log(`   ✅ Mapeó correctamente. Primary: ${homeData.primary ? 'OK' : 'NULL'}`);
    console.log(`   📋 Claves obtenidas: ${Object.keys(homeData).filter(k => k !== '_meta').join(', ')}`);
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n🧪 Probando con código "video" → debe mapear a "videos_single"');
  if (testData.videoSlug) {
    try {
      const videoData = await assemblePageDataByCode('video', {
        tenantId: TEST_TENANT_ID,
        slug: testData.videoSlug,
        idioma: 'es',
      });
      console.log(`   ✅ Mapeó correctamente. Primary: ${videoData.primary ? 'OK' : 'NULL'}`);
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  } else {
    console.log('   ⏭️ Saltado (no hay video de prueba)');
  }

  // ============================================
  // RESUMEN
  // ============================================
  console.log('\n' + '═'.repeat(70));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('═'.repeat(70));

  const okCount = results.filter(r => r.status === 'OK').length;
  const emptyCount = results.filter(r => r.status === 'EMPTY' || r.status === 'NO_DATA').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;

  console.log(`\n   ✅ OK: ${okCount}`);
  console.log(`   ⚠️ EMPTY/NO_DATA: ${emptyCount}`);
  console.log(`   ❌ ERROR: ${errorCount}`);
  console.log(`   📝 TOTAL: ${results.length}`);

  // Mostrar errores
  if (errorCount > 0) {
    console.log('\n❌ ERRORES:');
    results
      .filter(r => r.status === 'ERROR')
      .forEach(r => {
        console.log(`   - ${r.tipoPagina}: ${r.error}`);
      });
  }

  // Mostrar vacíos
  if (emptyCount > 0) {
    console.log('\n⚠️ RESULTADOS VACÍOS (puede ser normal si no hay datos):');
    results
      .filter(r => r.status === 'EMPTY' || r.status === 'NO_DATA')
      .forEach(r => {
        console.log(`   - ${r.tipoPagina}`);
      });
  }

  // Tabla de resumen detallado
  console.log('\n📋 DETALLE POR TIPO DE PÁGINA:');
  console.log('─'.repeat(70));

  for (const r of results) {
    const statusEmoji = r.status === 'OK' ? '✅' : r.status === 'ERROR' ? '❌' : '⚠️';
    const secondaryInfo = r.secondaryResults.length > 0
      ? ` | Secondary: ${r.secondaryResults.map(s => `${s.key}:${s.status}`).join(', ')}`
      : '';
    console.log(`   ${statusEmoji} ${r.tipoPagina}`);
    console.log(`      Primary (${r.primaryType}): ${r.primaryStatus}${secondaryInfo}`);
  }

  console.log('\n' + '═'.repeat(70));
}

// Ejecutar
runTests()
  .then(() => {
    console.log('\n✅ Pruebas del Assembler completadas');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando pruebas:', error);
    process.exit(1);
  });
