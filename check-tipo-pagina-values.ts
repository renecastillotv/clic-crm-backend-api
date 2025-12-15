import { query } from './src/utils/db.js';

async function checkTipoPaginaValues() {
  console.log('\n=== Valores en tipos_pagina ===');
  const tipos = await query('SELECT id, codigo, nombre FROM tipos_pagina ORDER BY codigo');
  tipos.rows.forEach((t: any) => {
    console.log(`${t.codigo} → ${t.nombre} (id: ${t.id})`);
  });

  console.log('\n=== Valores únicos en paginas_web.tipo_pagina ===');
  const paginaTipos = await query(`
    SELECT DISTINCT tipo_pagina, COUNT(*) as count
    FROM paginas_web
    GROUP BY tipo_pagina
    ORDER BY tipo_pagina
  `);
  paginaTipos.rows.forEach((t: any) => {
    console.log(`${t.tipo_pagina} → ${t.count} páginas`);
  });

  console.log('\n=== Verificando mapeo ===');
  const tiposMap = new Map(tipos.rows.map((t: any) => [t.codigo, t.id]));

  for (const pt of paginaTipos.rows) {
    const matched = tiposMap.has(pt.tipo_pagina);
    console.log(`${pt.tipo_pagina}: ${matched ? '✅ match' : '❌ NO MATCH'}`);
  }
}

checkTipoPaginaValues()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
