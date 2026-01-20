import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  try {
    // Ver columnas de catalogo_componentes
    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'catalogo_componentes' ORDER BY ordinal_position`);
    console.log('Columnas de catalogo_componentes:');
    cols.rows.forEach(r => console.log('  -', r.column_name));

    // Ver componentes del tenant con tipo_pagina_id
    const tenantId = 'd43e30b1-61d0-46e5-a760-7595f78dd184';
    const comps = await pool.query(`
      SELECT c.id, c.tipo_pagina_id, cc.tipo, c.activo, c.orden, tp.codigo as tipo_pagina_codigo
      FROM componentes_web c
      LEFT JOIN catalogo_componentes cc ON c.componente_catalogo_id = cc.id
      LEFT JOIN tipos_pagina tp ON c.tipo_pagina_id = tp.id
      WHERE c.tenant_id = $1 AND c.tipo_pagina_id IS NOT NULL
      LIMIT 15
    `, [tenantId]);
    console.log('\nComponentes con tipo_pagina_id:');
    comps.rows.forEach(r => console.log('  -', 'tipo:', r.tipo, 'pagina:', r.tipo_pagina_codigo, 'orden:', r.orden, 'activo:', r.activo));

    // Ver tipos_pagina disponibles
    const tipos = await pool.query(`SELECT id, codigo, nombre FROM tipos_pagina WHERE codigo = 'homepage'`);
    console.log('\nHomepage:');
    tipos.rows.forEach(r => console.log('  -', r.codigo, '- ID completo:', r.id));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
