import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);

async function check() {
  console.log('🔍 Revisando variantes de video_gallery...\n');

  const catalogo = await knex('componentes_catalogo')
    .where('codigo', 'video_gallery')
    .first();

  if (!catalogo) {
    console.log('❌ No se encontró video_gallery en catálogo');
    return;
  }

  const variantes = typeof catalogo.variantes === 'string'
    ? JSON.parse(catalogo.variantes)
    : catalogo.variantes;

  console.log('📚 Variantes disponibles en catálogo:');
  console.table(variantes.map((v: any) => ({
    codigo: v.codigo || v.id,
    nombre: v.nombre
  })));

  await knex.destroy();
}

check().catch(console.error);
