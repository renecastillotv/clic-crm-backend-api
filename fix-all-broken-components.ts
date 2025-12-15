import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);
const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';

async function fix() {
  console.log('🔧 Corrigiendo TODOS los componentes con tipo_pagina=NULL...\n');

  // Buscar TODOS los componentes que tienen:
  // - scope='page_type'
  // - tipo_pagina=NULL
  // Estos deberían tener tipo_pagina='homepage' o lo que corresponda
  const brokenComponents = await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .where('scope', 'page_type')
    .whereNull('tipo_pagina')
    .select('id', 'tipo', 'variante', 'nombre', 'created_at');

  console.log(`📦 Encontrados ${brokenComponents.length} componentes con tipo_pagina=NULL:\n`);

  if (brokenComponents.length === 0) {
    console.log('✅ No hay componentes para corregir');
    await knex.destroy();
    return;
  }

  console.table(brokenComponents.map(c => ({
    id: c.id.substring(0, 8),
    tipo: c.tipo,
    variante: c.variante,
    created_at: new Date(c.created_at).toLocaleString('es-MX')
  })));

  console.log('\n🔧 Corrigiendo a tipo_pagina="homepage"...\n');

  // Actualizar todos a homepage (asumiendo que todos son para homepage)
  await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .where('scope', 'page_type')
    .whereNull('tipo_pagina')
    .update({
      tipo_pagina: 'homepage',
      updated_at: knex.fn.now()
    });

  console.log(`✅ Corregidos ${brokenComponents.length} componentes`);
  console.log('   Todos ahora tienen tipo_pagina="homepage"');

  await knex.destroy();
}

fix().catch(console.error);
