import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);

async function test() {
  const TENANT_ID = 'd43e30b1-f21b-415d-bc25-1b3bc4a4f41b';

  console.log('🔍 Buscando página homepage...\n');

  const homepage = await knex('paginas_tenant')
    .where('tenant_id', TENANT_ID)
    .where('identificador', 'homepage')
    .first();

  if (!homepage) {
    console.log('❌ No se encontró homepage');
    await knex.destroy();
    return;
  }

  console.log('✅ Homepage encontrada:');
  console.log(`   ID: ${homepage.id}`);
  console.log(`   Identificador: ${homepage.identificador}`);
  console.log(`   Tipo: ${homepage.tipo_pagina}\n`);

  // Ahora simular lo que el CRM haría
  console.log('📞 Simulando GET /api/tenants/:tenantId/paginas/homepage/componentes\n');

  // El CRM envía homepage (identificador) no el UUID
  console.log(`   El CRM consulta componentes para identificador: "homepage"`);
  console.log(`   Pero getSeccionesResueltas() recibe paginaId: "${homepage.id}"`);
  console.log(`   Y tipo_pagina: "${homepage.tipo_pagina}"\n`);

  // Verificar componentes con scope='page' para esta página
  const componentesPage = await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .where('scope', 'page')
    .where('pagina_id', homepage.id)
    .where('activo', true)
    .select('id', 'tipo', 'variante', 'nombre', 'orden', 'pagina_id');

  console.log(`✅ Componentes con scope='page' para homepage (${componentesPage.length}):`);
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

  await knex.destroy();
}

test().catch(console.error);
