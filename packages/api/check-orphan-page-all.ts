import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);

async function check() {
  console.log('🔍 Verificando TODOS los componentes con scope=page...\n');

  const allPageComponents = await knex('componentes_web')
    .where('scope', 'page')
    .select('id', 'tenant_id', 'tipo', 'variante', 'pagina_id', 'tipo_pagina', 'nombre');

  console.log(`📊 Total componentes con scope=page: ${allPageComponents.length}\n`);

  const withPageId = allPageComponents.filter(c => c.pagina_id !== null);
  const withoutPageId = allPageComponents.filter(c => c.pagina_id === null);

  console.log(`✅ Con pagina_id: ${withPageId.length}`);
  if (withPageId.length > 0) {
    console.table(withPageId.map(c => ({
      id: c.id.substring(0, 8),
      tipo: c.tipo,
      variante: c.variante,
      tenant: c.tenant_id.substring(0, 8),
      pagina_id: c.pagina_id ? c.pagina_id.substring(0, 8) : 'NULL'
    })));
  }

  console.log(`\n❌ SIN pagina_id (huérfanos): ${withoutPageId.length}`);
  if (withoutPageId.length > 0) {
    console.table(withoutPageId.map(c => ({
      id: c.id.substring(0, 8),
      tipo: c.tipo,
      variante: c.variante,
      nombre: c.nombre || '(sin nombre)',
      tenant: c.tenant_id.substring(0, 8),
      pagina_id: c.pagina_id,
      tipo_pagina: c.tipo_pagina
    })));
  }

  await knex.destroy();
}

check().catch(console.error);
