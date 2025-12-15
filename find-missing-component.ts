import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);
const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';

async function find() {
  console.log('🔍 Buscando todos los componentes del tenant...\n');

  // Buscar TODOS los componentes del tenant ordenados por fecha de creación
  const componentes = await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .select('id', 'tipo', 'variante', 'nombre', 'scope', 'tipo_pagina', 'pagina_id', 'activo', 'orden', 'created_at')
    .orderBy('created_at', 'desc')
    .limit(10);

  console.log(`📦 Últimos 10 componentes del tenant (ordenados por fecha, más reciente primero):\n`);

  if (componentes.length === 0) {
    console.log('   (ninguno)\n');
  } else {
    console.table(componentes.map(c => ({
      id: c.id.substring(0, 8),
      tipo: c.tipo,
      variante: c.variante,
      nombre: c.nombre || '(sin nombre)',
      scope: c.scope,
      tipo_pagina: c.tipo_pagina || 'NULL',
      pagina_id: c.pagina_id ? c.pagina_id.substring(0, 8) : 'NULL',
      activo: c.activo,
      orden: c.orden,
      created_at: new Date(c.created_at).toLocaleString('es-MX')
    })));
  }

  await knex.destroy();
}

find().catch(console.error);
