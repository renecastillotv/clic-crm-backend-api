import { getComponenteCatalogoByCodigo } from './src/services/componentesCatalogoService.js';

async function check() {
  const hero = await getComponenteCatalogoByCodigo('hero');

  if (hero) {
    console.log('\n📋 Hero component schema from catalog:\n');
    console.log(JSON.stringify(hero.schema_config, null, 2));
    console.log('\n✅ Available variants:', hero.variantes.map((v: any) => v.codigo).join(', '));
  } else {
    console.log('\n⚠️ Hero component not found in catalog!');
  }

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
