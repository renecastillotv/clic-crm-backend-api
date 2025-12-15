import { query } from './src/utils/db.js';

const TENANT_ID = '01935ed6-9fa3-7031-ba6a-2cc5fc62ce18';
const PAGINA_ID = 'fab59c27-8d21-4732-87a6-ac040b6a7c16';

async function check() {
  console.log('\n=== VERIFICANDO HOMEPAGE Y COMPONENTES ===\n');

  // 1. Verificar que la página existe
  console.log('1. Verificando página...');
  const pagina = await query(
    `SELECT pw.*, tp.codigo as tipo_codigo, tp.nombre as tipo_nombre
     FROM paginas_web pw
     JOIN tipos_pagina tp ON tp.id = pw.tipo_pagina_id
     WHERE pw.id = $1 AND pw.tenant_id = $2`,
    [PAGINA_ID, TENANT_ID]
  );

  if (pagina.rows.length === 0) {
    console.log('❌ Página NO encontrada con ese ID');

    // Buscar la homepage del tenant
    console.log('\n2. Buscando homepage del tenant...');
    const homepage = await query(
      `SELECT pw.*, tp.codigo as tipo_codigo
       FROM paginas_web pw
       JOIN tipos_pagina tp ON tp.id = pw.tipo_pagina_id
       WHERE pw.tenant_id = $1 AND tp.codigo = 'homepage'`,
      [TENANT_ID]
    );

    if (homepage.rows.length > 0) {
      console.log('✅ Homepage encontrada:');
      console.log(JSON.stringify(homepage.rows[0], null, 2));
    } else {
      console.log('❌ No hay homepage para este tenant');
    }
  } else {
    console.log('✅ Página encontrada:');
    console.log(JSON.stringify(pagina.rows[0], null, 2));
  }

  // 3. Verificar componentes asignados
  console.log('\n3. Verificando componentes asignados a la página...');
  const componentes = await query(
    `SELECT
      pc.id as relacion_id,
      pc.orden,
      pc.activo,
      c.tipo,
      c.variante,
      c.scope
     FROM paginas_componentes pc
     JOIN componentes_web c ON c.id = pc.componente_id
     WHERE pc.pagina_id = $1
     ORDER BY pc.orden`,
    [PAGINA_ID]
  );

  console.log(`Total componentes asignados: ${componentes.rows.length}`);
  if (componentes.rows.length > 0) {
    console.log(JSON.stringify(componentes.rows, null, 2));
  }

  // 4. Verificar componentes disponibles para el tenant
  console.log('\n4. Verificando componentes disponibles del tenant...');
  const disponibles = await query(
    `SELECT id, tipo, variante, scope
     FROM componentes_web
     WHERE tenant_id = $1
     ORDER BY tipo, variante`,
    [TENANT_ID]
  );

  console.log(`Total componentes disponibles: ${disponibles.rows.length}`);

  // Agrupar por tipo
  const porTipo: Record<string, any[]> = {};
  for (const comp of disponibles.rows) {
    if (!porTipo[comp.tipo]) {
      porTipo[comp.tipo] = [];
    }
    porTipo[comp.tipo].push(comp);
  }

  console.log('\nComponentes agrupados por tipo:');
  for (const [tipo, comps] of Object.entries(porTipo)) {
    console.log(`\n${tipo} (${comps.length} variantes):`);
    for (const comp of comps) {
      console.log(`  - ${comp.variante} (${comp.scope})`);
    }
  }

  process.exit(0);
}

check().catch(console.error);
