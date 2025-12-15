import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);
const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';

async function test() {
  console.log('🧪 Probando creación de componente...\n');

  // Buscar homepage
  const homepage = await knex('paginas_web')
    .where('tenant_id', TENANT_ID)
    .where('tipo_pagina', 'homepage')
    .first();

  if (!homepage) {
    console.log('❌ No se encontró homepage');
    await knex.destroy();
    return;
  }

  console.log(`✅ Homepage encontrada: ${homepage.id}\n`);

  // Simular lo que el CRM debería hacer: POST al endpoint correcto
  console.log('📝 El CRM debería hacer POST a:');
  console.log(`   /api/tenants/${TENANT_ID}/componentes\n`);

  console.log('📦 Con el body:');
  const body = {
    tipo: 'hero',
    variante: 'clic',
    nombre: 'Hero Principal',
    scope: 'page_type',  // Automático: no es header/footer y homepage no es custom
    tipo_pagina: 'homepage',  // El tipo de página donde está
    pagina_id: null,  // NULL porque homepage es página de sistema
    datos: {
      titulo: 'Bienvenidos',
      subtitulo: 'Tu inmobiliaria de confianza'
    },
    orden: 1,
    activo: true
  };

  console.log(JSON.stringify(body, null, 2));

  console.log('\n💡 REGLAS SIMPLES:');
  console.log('   1. Si tipo = "header" o "footer" → scope="tenant", tipo_pagina=NULL, pagina_id=NULL');
  console.log('   2. Si página es CUSTOM → scope="page", tipo_pagina="custom", pagina_id=UUID');
  console.log('   3. Si página es SISTEMA → scope="page_type", tipo_pagina=CODIGO, pagina_id=NULL');

  await knex.destroy();
}

test().catch(console.error);
