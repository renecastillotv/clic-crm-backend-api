import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);
const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';

async function debug() {
  console.log('🔍 Debugeando componentes de homepage...\n');

  // 1. Buscar la homepage
  const homepage = await knex('paginas_web')
    .where('tenant_id', TENANT_ID)
    .where('tipo_pagina', 'homepage')
    .first();

  if (!homepage) {
    console.log('❌ No se encontró homepage');
    await knex.destroy();
    return;
  }

  console.log('✅ Homepage encontrada:');
  console.log(`   ID: ${homepage.id}`);
  console.log(`   Tipo: ${homepage.tipo_pagina}`);
  console.log(`   Título: ${homepage.titulo}\n`);

  // 2. Buscar TODOS los componentes para homepage (scope='page_type' y tipo_pagina='homepage')
  const componentesPageType = await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .where('scope', 'page_type')
    .where('tipo_pagina', 'homepage')
    .where('activo', true)
    .select('id', 'tipo', 'variante', 'nombre', 'orden', 'scope', 'tipo_pagina', 'pagina_id', 'activo')
    .orderBy('orden');

  console.log(`📦 Componentes con scope='page_type' y tipo_pagina='homepage' (${componentesPageType.length}):`);
  if (componentesPageType.length > 0) {
    console.table(componentesPageType.map(c => ({
      id: c.id.substring(0, 8),
      tipo: c.tipo,
      variante: c.variante,
      nombre: c.nombre || '(sin nombre)',
      orden: c.orden,
      scope: c.scope,
      tipo_pagina: c.tipo_pagina,
      pagina_id: c.pagina_id ? c.pagina_id.substring(0, 8) : 'NULL',
      activo: c.activo
    })));
  } else {
    console.log('   (ninguno)\n');
  }

  // 3. Buscar componentes con scope='page' para homepage (NO DEBERÍA HABER)
  const componentesPage = await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .where('scope', 'page')
    .where('pagina_id', homepage.id)
    .where('activo', true)
    .select('id', 'tipo', 'variante', 'nombre', 'orden', 'scope', 'tipo_pagina', 'pagina_id');

  console.log(`\n📦 Componentes con scope='page' para homepage UUID (${componentesPage.length}):`);
  if (componentesPage.length > 0) {
    console.table(componentesPage.map(c => ({
      id: c.id.substring(0, 8),
      tipo: c.tipo,
      variante: c.variante,
      nombre: c.nombre || '(sin nombre)',
      orden: c.orden,
      scope: c.scope,
      tipo_pagina: c.tipo_pagina,
      pagina_id: c.pagina_id.substring(0, 8)
    })));
  } else {
    console.log('   ✅ (ninguno - correcto, homepage es página de sistema)\n');
  }

  // 4. Buscar componentes tenant (header, footer)
  const componentesTenant = await knex('componentes_web')
    .where('tenant_id', TENANT_ID)
    .where('scope', 'tenant')
    .where('activo', true)
    .select('id', 'tipo', 'variante', 'nombre', 'orden');

  console.log(`\n📦 Componentes globales (scope='tenant') (${componentesTenant.length}):`);
  if (componentesTenant.length > 0) {
    console.table(componentesTenant.map(c => ({
      id: c.id.substring(0, 8),
      tipo: c.tipo,
      variante: c.variante,
      nombre: c.nombre || '(sin nombre)',
      orden: c.orden
    })));
  }

  await knex.destroy();
}

debug().catch(console.error);
