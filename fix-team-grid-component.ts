import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);
const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';

async function fix() {
  console.log('🔧 Corrigiendo componente team_grid incorrecto...\n');

  // Buscar el componente team_grid con scope='page'
  const teamGrid = await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .where('tipo', 'team_grid')
    .where('scope', 'page')
    .first();

  if (!teamGrid) {
    console.log('❌ No se encontró componente team_grid con scope="page"');
    await knex.destroy();
    return;
  }

  console.log('📦 Componente team_grid encontrado:');
  console.log(`   ID: ${teamGrid.id}`);
  console.log(`   Scope actual: ${teamGrid.scope}`);
  console.log(`   Tipo Página actual: ${teamGrid.tipo_pagina}`);
  console.log(`   Página ID actual: ${teamGrid.pagina_id}\n`);

  // Corregir a scope='page_type', tipo_pagina='homepage', pagina_id=null
  await knex('componentes_web')
    .where('id', teamGrid.id)
    .update({
      scope: 'page_type',
      tipo_pagina: 'homepage',
      pagina_id: null,
      updated_at: knex.fn.now()
    });

  console.log('✅ Componente corregido:');
  console.log(`   Scope nuevo: page_type`);
  console.log(`   Tipo Página nuevo: homepage`);
  console.log(`   Página ID nuevo: NULL`);

  await knex.destroy();
}

fix().catch(console.error);
