import { query } from './src/utils/db.js';

async function testRefactoredArchitecture() {
  const tenantId = '9763dd67-1b33-40b1-ae78-73e5bcafc2b7'; // Demo tenant

  console.log('\n=== Test Nueva Arquitectura ===\n');

  // 1. Verificar que todas las páginas tienen tipo_pagina_id
  console.log('1. Verificando tipo_pagina_id en paginas_web...');
  const paginasSinTipo = await query(`
    SELECT COUNT(*) as count
    FROM paginas_web
    WHERE tipo_pagina_id IS NULL
  `);
  console.log(`   Páginas sin tipo_pagina_id: ${paginasSinTipo.rows[0].count}`);

  // 2. Ver una página de ejemplo con su tipo_pagina
  console.log('\n2. Ejemplo de página con relación FK...');
  const paginaEjemplo = await query(`
    SELECT
      pw.id,
      pw.titulo,
      pw.slug,
      pw.tipo_pagina as tipo_string_deprecated,
      pw.tipo_pagina_id,
      pw.inherit_from_type,
      tp.codigo as tipo_codigo,
      tp.nombre as tipo_nombre
    FROM paginas_web pw
    LEFT JOIN tipos_pagina tp ON tp.id = pw.tipo_pagina_id
    WHERE pw.tenant_id = $1
      AND pw.activa = true
    LIMIT 5
  `, [tenantId]);

  paginaEjemplo.rows.forEach((p: any) => {
    console.log(`   - ${p.titulo} (${p.slug})`);
    console.log(`     tipo_pagina (deprecated): ${p.tipo_string_deprecated}`);
    console.log(`     tipo_pagina_id: ${p.tipo_pagina_id}`);
    console.log(`     tipo FK → ${p.tipo_codigo} (${p.tipo_nombre})`);
    console.log(`     inherit_from_type: ${p.inherit_from_type}`);
    console.log('');
  });

  // 3. Verificar componentes con default_data
  console.log('\n3. Componentes con default_data...');
  const componentesConDefault = await query(`
    SELECT tipo, variante, default_data IS NOT NULL as has_default
    FROM componentes_web
    WHERE tenant_id = $1
      AND default_data IS NOT NULL
    LIMIT 5
  `, [tenantId]);

  if (componentesConDefault.rows.length > 0) {
    componentesConDefault.rows.forEach((c: any) => {
      console.log(`   - ${c.tipo} (${c.variante}) - has_default: ${c.has_default}`);
    });
  } else {
    console.log('   (Ningún componente tiene default_data aún)');
  }

  // 4. Verificar paginas_componentes con config_override
  console.log('\n4. Relaciones en paginas_componentes con config_override...');
  const relacionesConOverride = await query(`
    SELECT
      pc.id,
      pc.orden,
      pc.activo,
      pc.config_override IS NOT NULL as has_override,
      c.tipo,
      c.variante
    FROM paginas_componentes pc
    INNER JOIN componentes_web c ON c.id = pc.componente_id
    WHERE pc.config_override IS NOT NULL
    LIMIT 5
  `);

  if (relacionesConOverride.rows.length > 0) {
    relacionesConOverride.rows.forEach((r: any) => {
      console.log(`   - ${r.tipo} (${r.variante}) - orden: ${r.orden}, has_override: ${r.has_override}`);
    });
  } else {
    console.log('   (Ninguna relación tiene config_override aún)');
  }

  // 5. Test del resolver: homepage
  console.log('\n5. Test resolver homepage...');
  const { resolveRoute } = await import('./src/services/routeResolver.js');

  try {
    const homepage = await resolveRoute(tenantId, '/');
    console.log(`   ✅ Homepage resuelto:`);
    console.log(`      - Título: ${homepage?.page.titulo}`);
    console.log(`      - Tipo: ${homepage?.page.tipoPagina}`);
    console.log(`      - Componentes: ${homepage?.components.length || 0}`);
    homepage?.components.slice(0, 5).forEach((c: any) => {
      console.log(`        * ${c.tipo} (${c.variante})`);
    });
  } catch (error: any) {
    console.error(`   ❌ Error resolviendo homepage:`, error.message);
  }

  // 6. Integridad referencial - intentar eliminar un tipo de página usado
  console.log('\n6. Test integridad referencial...');
  const tipoPaginaUsado = await query(`
    SELECT tp.id, tp.codigo, COUNT(pw.id) as paginas_usando
    FROM tipos_pagina tp
    INNER JOIN paginas_web pw ON pw.tipo_pagina_id = tp.id
    GROUP BY tp.id, tp.codigo
    HAVING COUNT(pw.id) > 0
    LIMIT 1
  `);

  if (tipoPaginaUsado.rows.length > 0) {
    const tipo = tipoPaginaUsado.rows[0];
    console.log(`   Tipo de página: ${tipo.codigo} (${tipo.paginas_usando} páginas usándolo)`);

    try {
      await query('DELETE FROM tipos_pagina WHERE id = $1', [tipo.id]);
      console.log(`   ❌ ERROR: Se pudo eliminar el tipo (no debería)`);
    } catch (error: any) {
      console.log(`   ✅ Integridad referencial funcionando: ${error.message.substring(0, 100)}...`);
    }
  }

  console.log('\n✅ Test completado');
}

testRefactoredArchitecture()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
