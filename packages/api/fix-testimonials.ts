import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);

async function fix() {
  console.log('🔧 Corrigiendo tipo "testimonials" a "testimonials_grid"...\n');

  const count = await knex('componentes_web')
    .where('tipo', 'testimonials')
    .update({
      tipo: 'testimonials_grid',
      updated_at: knex.fn.now()
    });

  console.log(`✅ ${count} componentes actualizados`);

  await knex.destroy();
}

fix().catch(console.error);
