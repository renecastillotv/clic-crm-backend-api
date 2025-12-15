import { query } from './src/utils/db.js';

async function findTenant() {
  console.log('\n=== BUSCANDO TENANT CORRECTO ===\n');

  // 1. Listar todos los tenants
  const tenants = await query(`SELECT id, slug, nombre FROM tenants ORDER BY nombre`);

  console.log('Tenants en la base de datos:');
  for (const t of tenants.rows) {
    console.log(`  - ${t.nombre} (${t.slug}): ${t.id}`);
  }

  // 2. Buscar tenant con slug 'clic'
  console.log('\n2. Buscando tenant con slug "clic"...');
  const clicTenant = await query(`SELECT * FROM tenants WHERE slug = 'clic'`);

  if (clicTenant.rows.length > 0) {
    console.log('✅ Tenant CLIC encontrado:');
    console.log(JSON.stringify(clicTenant.rows[0], null, 2));

    const tenantId = clicTenant.rows[0].id;

    // 3. Verificar páginas de este tenant
    console.log('\n3. Verificando páginas del tenant CLIC...');
    const paginas = await query(
      `SELECT pw.id, pw.titulo, pw.slug, tp.codigo as tipo
       FROM paginas_web pw
       JOIN tipos_pagina tp ON tp.id = pw.tipo_pagina_id
       WHERE pw.tenant_id = $1`,
      [tenantId]
    );

    console.log(`Total páginas: ${paginas.rows.length}`);
    if (paginas.rows.length > 0) {
      console.log(JSON.stringify(paginas.rows, null, 2));
    }

    // 4. Verificar componentes
    console.log('\n4. Verificando componentes del tenant CLIC...');
    const componentes = await query(
      `SELECT tipo, variante, scope, COUNT(*) as total
       FROM componentes_web
       WHERE tenant_id = $1
       GROUP BY tipo, variante, scope
       ORDER BY tipo, variante`,
      [tenantId]
    );

    console.log(`Total tipos de componentes: ${componentes.rows.length}`);
    if (componentes.rows.length > 0) {
      console.log(JSON.stringify(componentes.rows, null, 2));
    }
  } else {
    console.log('❌ No se encontró tenant con slug "clic"');
  }

  process.exit(0);
}

findTenant().catch(console.error);
