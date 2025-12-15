import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);
const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';

async function verify() {
  console.log('🔍 Verificando ID de la homepage...\\n');

  // Buscar homepage en paginas_tenant
  const homepage = await knex('paginas_tenant')
    .where('tenant_id', TENANT_ID)
    .where('identificador', 'homepage')
    .first();

  if (!homepage) {
    console.log('❌ No se encontró homepage en paginas_tenant');
    await knex.destroy();
    return;
  }

  console.log('✅ Homepage encontrada en paginas_tenant:');
  console.log(`   ID: ${homepage.id}`);
  console.log(`   Identificador: ${homepage.identificador}`);
  console.log(`   Tipo Página: ${homepage.tipo_pagina}\\n`);

  // Buscar componentes con scope='page' para esta página
  const componentesPage = await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .where('scope', 'page')
    .where('pagina_id', homepage.id)
    .where('activo', true)
    .select('id', 'tipo', 'variante', 'nombre', 'orden', 'pagina_id');

  console.log(`📦 Componentes con scope='page' para homepage (${componentesPage.length}):`);
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
    console.log('   (ninguno)\\n');
  }

  await knex.destroy();
}

verify().catch(console.error);
