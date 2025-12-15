import { pool } from './src/config/database';

async function checkTables() {
  const client = await pool.connect();

  try {
    // 1. Ver estructura de catalogo_componentes
    console.log('=== CATALOGO_COMPONENTES ===\n');

    const catalogoColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'catalogo_componentes'
      ORDER BY ordinal_position
    `);

    console.log('Columnas:');
    console.table(catalogoColumns.rows);

    // Ver componentes disponibles
    const componentes = await client.query(`
      SELECT id, tipo, nombre, descripcion
      FROM catalogo_componentes
      ORDER BY tipo
    `);

    console.log('\nComponentes disponibles:');
    console.table(componentes.rows);

    // 2. Ver estructura de componentes_web
    console.log('\n\n=== COMPONENTES_WEB ===\n');

    const compWebColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'componentes_web'
      ORDER BY ordinal_position
    `);

    console.log('Columnas:');
    console.table(compWebColumns.rows);

    // 3. Obtener el ID de la homepage de CLIC
    console.log('\n\n=== HOMEPAGE CLIC ===\n');

    const homepage = await client.query(`
      SELECT p.id, p.titulo, p.slug, p.tipo_pagina_id, tp.codigo as tipo_codigo
      FROM paginas p
      JOIN tipos_pagina tp ON p.tipo_pagina_id = tp.id
      JOIN tenants t ON p.tenant_id = t.id
      WHERE t.slug = 'clic' AND tp.codigo = 'homepage'
      LIMIT 1
    `);

    if (homepage.rows.length > 0) {
      console.log('Homepage encontrada:');
      console.table(homepage.rows);

      // Ver componentes actuales de la homepage
      const compActuales = await client.query(`
        SELECT
          cw.id,
          cw.orden,
          cc.tipo,
          cc.nombre,
          cw.datos
        FROM componentes_web cw
        JOIN catalogo_componentes cc ON cw.catalogo_componente_id = cc.id
        WHERE cw.pagina_id = $1
        ORDER BY cw.orden
      `, [homepage.rows[0].id]);

      console.log('\nComponentes actuales de la homepage:');
      console.table(compActuales.rows);
    } else {
      console.log('❌ Homepage no encontrada');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
