import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);

async function fix() {
  console.log('🔍 Buscando componentes huérfanos (scope=page sin pagina_id)...\n');

  // Encontrar componentes con scope='page' pero sin pagina_id
  const orphans = await knex('componentes_web')
    .where('scope', 'page')
    .whereNull('pagina_id')
    .select('id', 'tenant_id', 'tipo', 'variante', 'nombre', 'created_at');

  if (orphans.length === 0) {
    console.log('✅ No se encontraron componentes huérfanos');
    await knex.destroy();
    return;
  }

  console.log(`⚠️  Encontrados ${orphans.length} componentes huérfanos:\n`);
  console.table(orphans.map(o => ({
    id: o.id.substring(0, 8),
    tipo: o.tipo,
    variante: o.variante,
    nombre: o.nombre || '(sin nombre)',
    tenant: o.tenant_id.substring(0, 8),
    created: o.created_at
  })));

  console.log('\n🗑️  Eliminando componentes huérfanos...');

  const deleted = await knex('componentes_web')
    .where('scope', 'page')
    .whereNull('pagina_id')
    .delete();

  console.log(`✅ ${deleted} componentes huérfanos eliminados`);

  await knex.destroy();
}

fix().catch(console.error);
