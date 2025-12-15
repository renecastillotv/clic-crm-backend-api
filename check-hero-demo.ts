import { query } from './src/utils/db.js';

async function check() {
  const result = await query(`
    SELECT
      c.id,
      c.tipo,
      c.variante,
      c.nombre,
      c.datos,
      c.scope,
      c.tipo_pagina
    FROM componentes_web c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE t.slug = 'demo'
      AND c.tipo = 'hero'
      AND (c.tipo_pagina = 'homepage' OR c.scope = 'tenant')
    ORDER BY c.orden
    LIMIT 3
  `);

  console.log('\n📊 Heroes en demo tenant:\n');
  result.rows.forEach((row: any) => {
    console.log(`\n🎯 Hero: ${row.nombre || row.id}`);
    console.log(`   Tipo: ${row.tipo} - ${row.variante}`);
    console.log(`   Scope: ${row.scope}`);
    console.log(`   Tipo Página: ${row.tipo_pagina || 'N/A'}`);

    const datos = typeof row.datos === 'string' ? JSON.parse(row.datos) : row.datos;
    console.log(`\n   📝 Datos:`);
    console.log(JSON.stringify(datos, null, 4));
  });

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
