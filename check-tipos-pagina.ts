import { pool } from './src/config/database';

async function checkTiposPagina() {
  console.log('=== Verificando tipos_pagina y componentes ===\n');
  const client = await pool.connect();
  try {
    const allTipos = await client.query(`SELECT id, codigo, nombre FROM tipos_pagina ORDER BY codigo`);
    console.log(`Total tipos_pagina: ${allTipos.rows.length}\n`);
    for (const tipo of allTipos.rows) {
      console.log(`  - ${tipo.codigo} | nombre: ${tipo.nombre}`);
    }

    console.log('\n\n=== Buscando testimonios y asesores ===');
    const targetTipos = await client.query(`SELECT id, codigo, nombre FROM tipos_pagina WHERE codigo ILIKE '%testimonio%' OR codigo ILIKE '%asesor%' ORDER BY codigo`);
    if (targetTipos.rows.length > 0) {
      console.log(`Encontrados ${targetTipos.rows.length}:`);
      for (const tipo of targetTipos.rows) { console.log(`  - ${tipo.codigo}`); }
    } else {
      console.log('NO se encontraron');
    }

    console.log('\n\n=== Componentes por tipo de pagina ===');
    const componentesPorTipo = await client.query(`SELECT tp.codigo, COUNT(c.id) as cantidad FROM tipos_pagina tp LEFT JOIN componentes_web c ON c.tipo_pagina_id = tp.id GROUP BY tp.id, tp.codigo HAVING COUNT(c.id) > 0 ORDER BY cantidad DESC`);
    if (componentesPorTipo.rows.length > 0) {
      console.log(`${componentesPorTipo.rows.length} tipos con componentes:`);
      for (const row of componentesPorTipo.rows) { console.log(`  - ${row.codigo}: ${row.cantidad}`); }
    } else {
      console.log('NO hay componentes');
    }

    console.log('\n\n=== Rutas configuradas (tenant clic) ===');
    const rutasConfig = await client.query(`SELECT trc.prefijo, tp.codigo as tipo_dir FROM tenants_rutas_config trc JOIN tenants t ON t.id = trc.tenant_id LEFT JOIN tipos_pagina tp ON tp.id = trc.tipo_directorio_id WHERE t.slug = 'clic' ORDER BY trc.prefijo`);
    if (rutasConfig.rows.length > 0) {
      for (const ruta of rutasConfig.rows) { console.log(`  - /${ruta.prefijo} -> ${ruta.tipo_dir || 'NULL'}`); }
    } else {
      console.log('NO hay rutas');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}
checkTiposPagina();
