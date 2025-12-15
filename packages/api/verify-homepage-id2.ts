import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);
const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';

async function verify() {
  console.log('🔍 Verificando ID de la homepage...\n');

  // Buscar homepage en paginas_web
  const homepage = await knex('paginas_web')
    .where('tenant_id', TENANT_ID)
    .where('tipo_pagina', 'homepage')
    .first();

  if (!homepage) {
    console.log('❌ No se encontró homepage en paginas_web');
    await knex.destroy();
    return;
  }

  console.log('✅ Homepage encontrada en paginas_web:');
  console.log(`   ID: ${homepage.id}`);
  console.log(`   Tipo Página: ${homepage.tipo_pagina}`);
  console.log(`   Título: ${homepage.titulo}\n`);

  // Buscar componentes con scope='page' para esta página
  const componentesPage = await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .where('scope', 'page')
    .where('pagina_id', homepage.id)
    .where('activo', true)
    .select('id', 'tipo', 'variante', 'nombre', 'orden', 'pagina_id');

  console.log(`📦 Componentes con scope='page' para homepage ID="${homepage.id.substring(0, 8)}" (${componentesPage.length}):`);
  if (componentesPage.length > 0) {
    console.table(componentesPage.map(c => ({
      id: c.id.substring(0, 8),
      tipo: c.tipo,
      variante: c.variante,
      nombre: c.nombre || '(sin nombre)',
      orden: c.orden,
      pagina_id: c.pagina_id.substring(0, 8)
    })));
  } else {
    console.log('   (ninguno)\n');
  }

  // Ahora buscar el componente team_grid que creaste
  console.log('\n🔍 Buscando componente team_grid con pagina_id="fab59c27-8d21-4732-87a6-ac040b6a7c16"...');
  const teamGrid = await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .where('tipo', 'team_grid')
    .where('scope', 'page')
    .first();

  if (teamGrid) {
    console.log('\n✅ Componente team_grid encontrado:');
    console.log(`   ID: ${teamGrid.id}`);
    console.log(`   Tipo: ${teamGrid.tipo}`);
    console.log(`   Variante: ${teamGrid.variante}`);
    console.log(`   Scope: ${teamGrid.scope}`);
    console.log(`   Pagina ID: ${teamGrid.pagina_id}`);
    console.log(`   Activo: ${teamGrid.activo}`);
    console.log('\n❓ ¿Coincide con el ID de homepage?');
    console.log(`   Homepage ID:   ${homepage.id}`);
    console.log(`   Component ID:  ${teamGrid.pagina_id}`);
    console.log(`   Coinciden: ${homepage.id === teamGrid.pagina_id ? '✅ SÍ' : '❌ NO'}`);
  } else {
    console.log('❌ No se encontró componente team_grid');
  }

  await knex.destroy();
}

verify().catch(console.error);
