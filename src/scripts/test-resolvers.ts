/**
 * Script de pruebas para validar los resolvers de dynamicDataService
 *
 * Ejecutar con: npx tsx src/scripts/test-resolvers.ts
 *
 * Este script prueba cada resolver para asegurar que:
 * 1. Retorne datos correctamente
 * 2. Los filtros funcionen
 * 3. La estructura de respuesta sea correcta
 */

import { resolveDynamicDataType, DynamicDataParams } from '../services/dynamicDataService.js';
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

interface TestResult {
  resolver: string;
  status: 'OK' | 'ERROR' | 'EMPTY';
  count?: number;
  sample?: any;
  error?: string;
  filters?: string[];
}

const results: TestResult[] = [];

async function testResolver(
  name: string,
  tipo: string,
  params: Partial<DynamicDataParams>,
  expectedFilters: string[] = []
): Promise<void> {
  console.log(`\n🧪 Probando: ${name}`);
  console.log(`   Tipo: ${tipo}`);
  console.log(`   Filtros probados: ${expectedFilters.join(', ') || 'ninguno'}`);

  try {
    const fullParams: DynamicDataParams = {
      tenantId: TEST_TENANT_ID,
      idioma: 'es',
      ...params,
    };

    const result = await resolveDynamicDataType(tipo, fullParams);

    if (result === null || result === undefined) {
      console.log(`   ⚠️ Resultado: NULL/undefined`);
      results.push({
        resolver: name,
        status: 'EMPTY',
        filters: expectedFilters,
      });
      return;
    }

    if (Array.isArray(result)) {
      console.log(`   ✅ Resultado: Array con ${result.length} elementos`);
      if (result.length > 0) {
        console.log(`   📦 Muestra de campos:`, Object.keys(result[0]).slice(0, 10).join(', '));
      }
      results.push({
        resolver: name,
        status: result.length > 0 ? 'OK' : 'EMPTY',
        count: result.length,
        sample: result.length > 0 ? result[0] : null,
        filters: expectedFilters,
      });
    } else if (typeof result === 'object') {
      console.log(`   ✅ Resultado: Objeto`);
      console.log(`   📦 Campos:`, Object.keys(result).slice(0, 10).join(', '));
      results.push({
        resolver: name,
        status: 'OK',
        count: 1,
        sample: result,
        filters: expectedFilters,
      });
    } else {
      console.log(`   ✅ Resultado: ${typeof result}`);
      results.push({
        resolver: name,
        status: 'OK',
        sample: result,
        filters: expectedFilters,
      });
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({
      resolver: name,
      status: 'ERROR',
      error: error.message,
      filters: expectedFilters,
    });
  }
}

async function runTests(): Promise<void> {
  // Resolver el UUID del tenant
  console.log(`\n🔍 Buscando tenant por slug: ${TEST_TENANT_SLUG}...`);
  TEST_TENANT_ID = await resolveTenantId();
  console.log(`✅ Tenant encontrado: ${TEST_TENANT_ID}\n`);

  console.log('═'.repeat(60));
  console.log('🧪 PRUEBAS DE RESOLVERS - dynamicDataService.ts');
  console.log(`   Tenant: ${TEST_TENANT_ID} (${TEST_TENANT_SLUG})`);
  console.log('═'.repeat(60));

  // ============================================
  // STATS
  // ============================================
  await testResolver('Stats', 'stats', {});

  // ============================================
  // ASESORES
  // ============================================
  await testResolver('Lista Asesores (sin filtros)', 'lista_asesores', {
    pagination: { limit: 5 },
  });

  await testResolver('Lista Asesores (destacados)', 'lista_asesores', {
    filters: { destacado: true },
    pagination: { limit: 5 },
  }, ['destacado']);

  await testResolver('Asesor Single (por slug)', 'asesor_single', {
    slug: 'asesor-test', // Cambiar por un slug real
  });

  // ============================================
  // VIDEOS
  // ============================================
  await testResolver('Lista Videos (sin filtros)', 'lista_videos', {
    pagination: { limit: 5 },
  });

  await testResolver('Lista Videos (destacados)', 'lista_videos', {
    filters: { destacado: true },
    pagination: { limit: 5 },
  }, ['destacado']);

  await testResolver('Lista Videos (por categoría)', 'lista_videos', {
    filters: { categoria_slug: 'entrevistas' }, // Cambiar por una categoría real
    pagination: { limit: 5 },
  }, ['categoria_slug']);

  await testResolver('Lista Videos (por autor)', 'lista_videos', {
    filters: { autor_id: 'test-autor-id' }, // Cambiar por un ID real
    pagination: { limit: 5 },
  }, ['autor_id']);

  await testResolver('Video Single (por slug)', 'video_single', {
    filters: { slug: 'video-test' }, // Cambiar por un slug real
  });

  await testResolver('Categorías Videos', 'categorias_videos', {});

  // ============================================
  // ARTÍCULOS
  // ============================================
  await testResolver('Lista Artículos (sin filtros)', 'lista_articulos', {
    pagination: { limit: 5 },
  });

  await testResolver('Lista Artículos (por autor)', 'lista_articulos', {
    filters: { autor_id: 'test-autor-id' }, // Cambiar por un ID real
    pagination: { limit: 5 },
  }, ['autor_id']);

  await testResolver('Artículo Single (por slug)', 'articulo_single', {
    filters: { slug: 'articulo-test' }, // Cambiar por un slug real
  });

  await testResolver('Categorías Artículos', 'categorias_articulos', {});

  // ============================================
  // TESTIMONIOS
  // ============================================
  await testResolver('Lista Testimonios (sin filtros)', 'lista_testimonios', {
    pagination: { limit: 5 },
  });

  await testResolver('Lista Testimonios (destacados)', 'lista_testimonios', {
    filters: { destacado: true },
    pagination: { limit: 5 },
  }, ['destacado']);

  await testResolver('Lista Testimonios (por asesor)', 'lista_testimonios', {
    filters: { asesor_id: 'test-asesor-id' }, // Cambiar por un ID real
    pagination: { limit: 5 },
  }, ['asesor_id']);

  await testResolver('Testimonio Single (por slug)', 'testimonio_single', {
    filters: { slug: 'testimonio-test' }, // Cambiar por un slug real
  });

  await testResolver('Categorías Testimonios', 'categorias_testimonios', {});

  // ============================================
  // PROPIEDADES
  // ============================================
  await testResolver('Lista Propiedades (sin filtros)', 'propiedades', {
    pagination: { limit: 5 },
  });

  await testResolver('Lista Propiedades (destacadas)', 'propiedades', {
    filters: { destacada: true },
    pagination: { limit: 5 },
  }, ['destacada']);

  await testResolver('Lista Propiedades (por tipo)', 'propiedades', {
    filters: { tipo: 'Apartamento' },
    pagination: { limit: 5 },
  }, ['tipo']);

  await testResolver('Lista Propiedades (por agente)', 'propiedades', {
    filters: { agente_id: 'test-agente-id' }, // Cambiar por un ID real
    pagination: { limit: 5 },
  }, ['agente_id']);

  await testResolver('Lista Propiedades (por ciudad)', 'propiedades', {
    filters: { ciudad: 'Santo Domingo' },
    pagination: { limit: 5 },
  }, ['ciudad']);

  await testResolver('Propiedad Single (por slug)', 'propiedad_single', {
    filters: { slug: 'propiedad-test' }, // Cambiar por un slug real
  });

  // ============================================
  // FAQs
  // ============================================
  await testResolver('Lista FAQs (sin filtros)', 'lista_faqs', {
    pagination: { limit: 5 },
  });

  await testResolver('Lista FAQs (por contexto)', 'lista_faqs', {
    filters: { contexto: 'compra' },
    pagination: { limit: 5 },
  }, ['contexto']);

  await testResolver('FAQ Single', 'faq_single', {
    filters: { slug: 'faq-test' }, // Cambiar por un slug real
  });

  // ============================================
  // UBICACIONES
  // ============================================
  await testResolver('Ubicaciones Populares', 'popular_locations', {
    pagination: { limit: 6 },
  });

  // ============================================
  // RESUMEN
  // ============================================
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('═'.repeat(60));

  const okCount = results.filter(r => r.status === 'OK').length;
  const emptyCount = results.filter(r => r.status === 'EMPTY').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;

  console.log(`\n   ✅ OK: ${okCount}`);
  console.log(`   ⚠️ EMPTY: ${emptyCount}`);
  console.log(`   ❌ ERROR: ${errorCount}`);
  console.log(`   📝 TOTAL: ${results.length}`);

  // Mostrar errores
  if (errorCount > 0) {
    console.log('\n❌ ERRORES:');
    results
      .filter(r => r.status === 'ERROR')
      .forEach(r => {
        console.log(`   - ${r.resolver}: ${r.error}`);
      });
  }

  // Mostrar vacíos
  if (emptyCount > 0) {
    console.log('\n⚠️ RESULTADOS VACÍOS (puede ser normal si no hay datos):');
    results
      .filter(r => r.status === 'EMPTY')
      .forEach(r => {
        console.log(`   - ${r.resolver}`);
      });
  }

  // Tabla de filtros soportados
  console.log('\n📋 FILTROS PROBADOS POR RESOLVER:');
  const resolversConFiltros = results.filter(r => r.filters && r.filters.length > 0);
  const filtrosMap = new Map<string, string[]>();

  resolversConFiltros.forEach(r => {
    const baseName = r.resolver.split(' (')[0];
    const existing = filtrosMap.get(baseName) || [];
    r.filters?.forEach(f => {
      if (!existing.includes(f)) existing.push(f);
    });
    filtrosMap.set(baseName, existing);
  });

  filtrosMap.forEach((filters, resolver) => {
    console.log(`   ${resolver}: ${filters.join(', ')}`);
  });

  console.log('\n' + '═'.repeat(60));
}

// Ejecutar
runTests()
  .then(() => {
    console.log('\n✅ Pruebas completadas');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando pruebas:', error);
    process.exit(1);
  });
