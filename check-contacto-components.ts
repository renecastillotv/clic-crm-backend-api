import { query } from './src/utils/db.js';

async function check() {
  // Obtener componentes de la página contacto
  const result = await query(`
    SELECT
      c.id,
      c.tipo,
      c.variante,
      c.nombre,
      c.activo,
      c.orden,
      c.scope,
      c.tipo_pagina,
      c.datos
    FROM componentes_web c
    JOIN paginas_web p ON p.tenant_id = c.tenant_id
    WHERE p.tipo_pagina = 'contacto'
      AND c.tenant_id = p.tenant_id
      AND ((c.scope = 'page_type' AND c.tipo_pagina = 'contacto')
           OR (c.scope = 'tenant' AND c.tipo IN ('header', 'footer')))
      AND c.activo = true
    ORDER BY
      c.tipo = 'header' DESC,
      c.orden ASC,
      c.tipo = 'footer' ASC
  `);

  console.log(`Total componentes activos para contacto: ${result.rows.length}\n`);

  result.rows.forEach((c: any, i: number) => {
    console.log(`${i+1}. ${c.tipo}-${c.variante} - ${c.nombre} (scope: ${c.scope}, orden: ${c.orden})`);

    // Ver el contenido
    const datos = typeof c.datos === 'string' ? JSON.parse(c.datos) : c.datos;
    if (datos.static_data) {
      console.log(`   Título: ${datos.static_data.title || datos.static_data.heading || 'N/A'}`);
      console.log(`   Subtítulo: ${datos.static_data.subtitle || datos.static_data.subheading || 'N/A'}`);
    } else {
      console.log('   (sin static_data)');
    }
    console.log('');
  });

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
