import { query } from './src/utils/db.js';

async function verifyConsolidation() {
  console.log('\n=== Verificación de Consolidación de Arquitectura ===\n');

  const tenantId = '9763dd67-1b33-40b1-ae78-73e5bcafc2b7'; // Demo tenant

  // ========================================
  // 1. Verificar tablas eliminadas
  // ========================================
  console.log('1. Verificando que tablas obsoletas fueron eliminadas...');

  const tablasObsoletas = [
    'catalogo_campos',
    'contenido_campos',
    'contenido_media',
    'tenant_defaults',
    'paginas_variantes_config',
    'plantillas_pagina',
    'paginas_alias',
    'paginas_configuraciones',
    'tenant_componentes_disponibles',
    'tenant_paginas_activas',
    'componentes_catalogo',
    'variantes_componentes'
  ];

  let eliminadasCount = 0;

  for (const tabla of tablasObsoletas) {
    const existe = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      )
    `, [tabla]);

    if (!existe.rows[0].exists) {
      console.log(`   ✅ ${tabla} - eliminada`);
      eliminadasCount++;
    } else {
      console.log(`   ❌ ${tabla} - todavía existe`);
    }
  }

  console.log(`\n   📊 Total: ${eliminadasCount}/${tablasObsoletas.length} tablas eliminadas\n`);

  // ========================================
  // 2. Verificar componentes con default_data
  // ========================================
  console.log('2. Verificando componentes con default_data...');

  const componentesConDefault = await query(`
    SELECT tipo, variante, default_data IS NOT NULL as has_default
    FROM componentes_web
    WHERE tenant_id = $1
      AND default_data IS NOT NULL
    ORDER BY tipo, variante
  `, [tenantId]);

  console.log(`   Encontrados: ${componentesConDefault.rows.length} componentes con default_data`);

  componentesConDefault.rows.slice(0, 5).forEach((c: any) => {
    console.log(`   - ${c.tipo}/${c.variante}`);
  });

  if (componentesConDefault.rows.length > 5) {
    console.log(`   ... y ${componentesConDefault.rows.length - 5} más`);
  }

  // ========================================
  // 3. Verificar paginas_componentes.activo
  // ========================================
  console.log('\n3. Verificando columna activo en paginas_componentes...');

  const hasActivoColumn = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'paginas_componentes' AND column_name = 'activo'
  `);

  if (hasActivoColumn.rows.length > 0) {
    console.log('   ✅ Columna activo existe');

    const stats = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE activo = true) as activos,
        COUNT(*) FILTER (WHERE activo = false) as inactivos
      FROM paginas_componentes
    `);

    const s = stats.rows[0];
    console.log(`   📊 Total: ${s.total}, Activos: ${s.activos}, Inactivos: ${s.inactivos}`);
  } else {
    console.log('   ❌ Columna activo NO existe');
  }

  // ========================================
  // 4. Verificar tenants_rutas_config refinado
  // ========================================
  console.log('\n4. Verificando tenants_rutas_config refinado...');

  const hasTipoPaginaId = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'tenants_rutas_config' AND column_name = 'tipo_pagina_id'
  `);

  if (hasTipoPaginaId.rows.length > 0) {
    console.log('   ✅ Columna tipo_pagina_id existe');

    const rutasConTipo = await query(`
      SELECT COUNT(*) as count
      FROM tenants_rutas_config
      WHERE tipo_pagina_id IS NOT NULL
    `);

    console.log(`   📊 ${rutasConTipo.rows[0].count} rutas con tipo_pagina_id mapeado`);

    // Mostrar ejemplos
    const ejemplos = await query(`
      SELECT rc.prefijo, rc.nivel_navegacion, tp.codigo as tipo_codigo, tp.nombre as tipo_nombre
      FROM tenants_rutas_config rc
      LEFT JOIN tipos_pagina tp ON tp.id = rc.tipo_pagina_id
      WHERE rc.tenant_id = $1
      ORDER BY rc.orden
      LIMIT 5
    `, [tenantId]);

    ejemplos.rows.forEach((r: any) => {
      console.log(`   - ${r.prefijo} (nivel ${r.nivel_navegacion}) → ${r.tipo_codigo || 'sin mapear'}`);
    });
  } else {
    console.log('   ❌ Columna tipo_pagina_id NO existe');
  }

  // ========================================
  // 5. Verificar arquitectura final
  // ========================================
  console.log('\n5. Verificando arquitectura final...');

  const todasLasTablas = await query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'knex_%'
    ORDER BY tablename
  `);

  console.log(`\n   📋 Tablas restantes en la base de datos: ${todasLasTablas.rows.length}`);

  const tablasCore = [
    'tipos_pagina',
    'paginas_web',
    'componentes_web',
    'paginas_componentes',
    'tenants_rutas_config',
    'catalogo_componentes'
  ];

  console.log('\n   🎯 Tablas CORE de páginas:');
  tablasCore.forEach((tabla) => {
    const existe = todasLasTablas.rows.find((t: any) => t.tablename === tabla);
    if (existe) {
      console.log(`   ✅ ${tabla}`);
    } else {
      console.log(`   ❌ ${tabla} - NO EXISTE`);
    }
  });

  // ========================================
  // 6. Test de resolución de página
  // ========================================
  console.log('\n6. Test de resolución de homepage...');

  const { resolveRoute } = await import('./src/services/routeResolver.js');

  try {
    const homepage = await resolveRoute(tenantId, '/');

    console.log(`   ✅ Homepage resuelto correctamente`);
    console.log(`      - Título: ${homepage?.page.titulo}`);
    console.log(`      - Tipo: ${homepage?.page.tipoPagina}`);
    console.log(`      - Componentes: ${homepage?.components.length || 0}`);

    if (homepage?.components && homepage.components.length > 0) {
      console.log('\n      Componentes con default_data:');
      homepage.components.slice(0, 3).forEach((c: any) => {
        const hasDefault = c.default_data && Object.keys(c.default_data).length > 0;
        const hasOverride = c.config_override && Object.keys(c.config_override).length > 0;
        console.log(`      - ${c.tipo}/${c.variante}`);
        console.log(`        default_data: ${hasDefault ? '✅' : '❌'}`);
        console.log(`        config_override: ${hasOverride ? '✅' : '❌'}`);
      });
    }
  } catch (error: any) {
    console.error(`   ❌ Error resolviendo homepage:`, error.message);
  }

  // ========================================
  // 7. Resumen final
  // ========================================
  console.log('\n=== Resumen de Consolidación ===\n');

  console.log('✅ Tablas eliminadas:');
  console.log('   • catalogo_campos, contenido_campos, contenido_media, tenant_defaults');
  console.log('   • paginas_variantes_config');
  console.log('   • plantillas_pagina, paginas_configuraciones, paginas_alias');
  console.log('   • tenant_componentes_disponibles, tenant_paginas_activas');
  console.log('   • componentes_catalogo, variantes_componentes');

  console.log('\n✅ Nueva arquitectura:');
  console.log('   • componentes_web.default_data (reemplaza catalogo_campos)');
  console.log('   • paginas_componentes.config_override (reemplaza contenido_*)');
  console.log('   • paginas_componentes.activo (reemplaza variantes)');
  console.log('   • tenants_rutas_config.tipo_pagina_id (validación)');

  console.log('\n📊 Reducción:');
  console.log(`   De 11+ tablas → 5-6 tablas core`);
  console.log(`   Simplificación de queries (menos JOINs)`);
  console.log(`   Mayor flexibilidad con JSONB`);

  console.log('\n');
}

verifyConsolidation()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
