import { pool } from './src/config/database';

async function checkComponentesData() {
  const client = await pool.connect();

  try {
    const TENANT_CLIC_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';
    const TIPO_HOMEPAGE_ID = '209ff476-3e07-472c-8d89-04c0966ae4ce';

    console.log('=== COMPONENTES DE LA HOMEPAGE CON DATOS ===\n');

    const result = await client.query(`
      SELECT
        cw.id,
        cw.nombre,
        cw.orden,
        cc.tipo as componente_tipo,
        cc.nombre as componente_nombre,
        cw.datos
      FROM componentes_web cw
      JOIN catalogo_componentes cc ON cw.componente_catalogo_id = cc.id
      WHERE cw.tipo_pagina_id = $1 AND cw.tenant_id = $2
      ORDER BY cw.orden
    `, [TIPO_HOMEPAGE_ID, TENANT_CLIC_ID]);

    result.rows.forEach((row, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`${index + 1}. ${row.nombre} (${row.componente_tipo})`);
      console.log(`   Orden: ${row.orden}`);
      console.log(`${'='.repeat(80)}`);
      console.log('\n📋 DATOS (JSON):');
      console.log(JSON.stringify(row.datos, null, 2));
    });

    console.log('\n\n✅ Total componentes:', result.rows.length);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkComponentesData();
