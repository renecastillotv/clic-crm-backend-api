import { query } from './src/utils/db.js';

async function testComponentJunction() {
  const tenantId = '9763dd67-1b33-40b1-ae78-73e5bcafc2b7'; // Demo tenant

  console.log('\n=== Testing Component Junction Table ===\n');

  // Get homepage
  const paginaResult = await query(
    `SELECT id, titulo, slug FROM paginas_web WHERE tenant_id = $1 AND slug = '/'`,
    [tenantId]
  );

  if (paginaResult.rows.length === 0) {
    console.log('❌ No homepage found');
    return;
  }

  const pagina = paginaResult.rows[0];
  console.log(`✅ Found homepage: ${pagina.titulo} (ID: ${pagina.id})\n`);

  // Check direct components (pagina_id in componentes_web)
  const directComponents = await query(
    `SELECT id, tipo, variante, activo
     FROM componentes_web
     WHERE tenant_id = $1 AND pagina_id = $2`,
    [tenantId, pagina.id]
  );

  console.log(`📦 Direct components (pagina_id set): ${directComponents.rows.length}`);
  directComponents.rows.forEach((c: any) => {
    console.log(`   - ${c.tipo} (${c.variante}) - activo: ${c.activo}`);
  });
  console.log('');

  // Check junction table components
  const junctionComponents = await query(
    `SELECT pc.id, pc.orden, pc.activo as junction_activo,
            c.id as componente_id, c.tipo, c.variante, c.activo as componente_activo
     FROM paginas_componentes pc
     INNER JOIN componentes_web c ON c.id = pc.componente_id
     WHERE pc.pagina_id = $1`,
    [pagina.id]
  );

  console.log(`🔗 Junction table components: ${junctionComponents.rows.length}`);
  junctionComponents.rows.forEach((c: any) => {
    console.log(`   - ${c.tipo} (${c.variante}) - junction activo: ${c.junction_activo}, componente activo: ${c.componente_activo}`);
  });
  console.log('');

  // Simulate the CURRENT query (only checks pagina_id)
  const currentQuery = `
    SELECT id, tipo, variante, activo
    FROM componentes_web
    WHERE tenant_id = $1
      AND activo = true
      AND (
        pagina_id = $2::uuid
        OR (pagina_id IS NULL AND tipo != 'property_list')
      )
    ORDER BY orden ASC
  `;

  const currentResult = await query(currentQuery, [tenantId, pagina.id]);
  console.log(`🔍 CURRENT QUERY (only pagina_id): ${currentResult.rows.length} components`);
  currentResult.rows.forEach((c: any) => {
    console.log(`   - ${c.tipo} (${c.variante})`);
  });
  console.log('');

  // Simulate the FIXED query (includes junction table)
  const fixedQuery = `
    WITH direct_components AS (
      SELECT
        id, tipo, variante, datos, activo, orden, pagina_id
      FROM componentes_web
      WHERE tenant_id = $1
        AND activo = true
        AND pagina_id = $2::uuid
    ),
    junction_components AS (
      SELECT
        c.id, c.tipo, c.variante, c.datos, c.activo, pc.orden, c.pagina_id
      FROM paginas_componentes pc
      INNER JOIN componentes_web c ON c.id = pc.componente_id
      WHERE pc.pagina_id = $2::uuid
        AND pc.activo = true
        AND c.activo = true
    ),
    global_components AS (
      SELECT
        id, tipo, variante, datos, activo, orden, pagina_id
      FROM componentes_web
      WHERE tenant_id = $1
        AND activo = true
        AND pagina_id IS NULL
        AND tipo != 'property_list'
    )
    SELECT * FROM direct_components
    UNION
    SELECT * FROM junction_components
    UNION
    SELECT * FROM global_components
    ORDER BY orden ASC
  `;

  const fixedResult = await query(fixedQuery, [tenantId, pagina.id]);
  console.log(`✅ FIXED QUERY (includes junction): ${fixedResult.rows.length} components`);
  fixedResult.rows.forEach((c: any) => {
    console.log(`   - ${c.tipo} (${c.variante})`);
  });
}

testComponentJunction()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
