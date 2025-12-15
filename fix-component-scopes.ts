import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);

async function fix() {
  console.log('🔧 Limpiando componentes con scope incorrecto...\n');

  // 1. Todos los componentes que tienen pagina_id pero NO son custom pages
  //    deben cambiar a scope='page_type' y limpiar pagina_id
  const componentesConPaginaId = await knex('componentes_web')
    .where('scope', 'page')
    .whereNotNull('pagina_id')
    .select('id', 'tipo', 'tipo_pagina', 'pagina_id', 'variante');

  console.log(`📦 Encontrados ${componentesConPaginaId.length} componentes con scope='page'\n`);

  for (const comp of componentesConPaginaId) {
    // Verificar si la página es custom
    const pagina = await knex('paginas_web')
      .where('id', comp.pagina_id)
      .first();

    if (pagina && pagina.tipo_pagina === 'custom') {
      console.log(`✅ ${comp.tipo} - Página custom, mantener scope='page'`);
      continue;
    }

    // Si la página NO es custom (es homepage, single_property, etc.)
    // cambiar a scope='page_type' y limpiar pagina_id
    await knex('componentes_web')
      .where('id', comp.id)
      .update({
        scope: 'page_type',
        pagina_id: null,
        updated_at: knex.fn.now()
      });

    console.log(`🔧 ${comp.tipo} (${comp.variante}) - Cambiado a scope='page_type', pagina_id limpiado`);
  }

  console.log('\n✅ Limpieza completada');
  await knex.destroy();
}

fix().catch(console.error);
