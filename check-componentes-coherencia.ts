import Knex from 'knex';
import knexConfig from './src/config/knexfile.js';

const knex = Knex(knexConfig.development);

async function checkCoherencia() {
  console.log('🔍 Analizando coherencia de componentes...\n');

  // 1. Ver todos los componentes del catálogo
  console.log('📚 COMPONENTES EN CATÁLOGO (componentes_catalogo):');
  const catalogo = await knex('componentes_catalogo')
    .select('codigo', 'nombre', 'categoria', 'variantes')
    .orderBy('codigo');

  console.table(catalogo.map(c => ({
    codigo: c.codigo,
    nombre: c.nombre,
    categoria: c.categoria,
    variantes: (typeof c.variantes === 'string' ? JSON.parse(c.variantes) : c.variantes).map((v: any) => v.codigo).join(', ')
  })));

  // 2. Ver todos los componentes instanciados
  console.log('\n📄 COMPONENTES INSTANCIADOS (componentes_web):');
  const instancias = await knex('componentes_web')
    .select('id', 'tipo', 'variante', 'scope', 'tenant_id', 'pagina_id')
    .orderBy('tipo');

  console.table(instancias.map(c => ({
    tipo: c.tipo,
    variante: c.variante,
    scope: c.scope,
    tenant: c.tenant_id?.substring(0, 8) + '...',
    pagina: c.pagina_id || 'global'
  })));

  // 3. Verificar si hay tipos en componentes_web que NO existen en catálogo
  console.log('\n⚠️  ANÁLISIS DE COHERENCIA:');
  const codigosCatalogo = catalogo.map(c => c.codigo);
  const tiposUsados = [...new Set(instancias.map(i => i.tipo))];

  const tiposSinCatalogo = tiposUsados.filter(t => !codigosCatalogo.includes(t));

  if (tiposSinCatalogo.length > 0) {
    console.log('\n❌ Tipos usados en componentes_web que NO están en catálogo:');
    console.log(tiposSinCatalogo);

    // Mostrar el mapeo necesario
    console.log('\n💡 Mapeo necesario (ya existe en componentesCatalogo.ts):');
    const mapeo: Record<string, string> = {
      'testimonials': 'testimonials_grid',
      'articles': 'article_grid',
      'team': 'team_grid',
      'properties': 'property_grid',
      'property_carousel': 'property_grid',
      'videos': 'video_gallery',
      'contact': 'contact_form',
      'search': 'search_box',
    };

    tiposSinCatalogo.forEach(tipo => {
      const mapeado = mapeo[tipo];
      if (mapeado) {
        console.log(`  "${tipo}" → "${mapeado}" ✅`);
      } else {
        console.log(`  "${tipo}" → ??? ❌ (falta agregar al mapeo)`);
      }
    });
  } else {
    console.log('✅ Todos los tipos usados existen en el catálogo');
  }

  // 4. Ver variantes usadas vs disponibles
  console.log('\n🎨 VARIANTES:');
  const variantesUsadas = [...new Set(instancias.map(i => i.variante))];
  console.log('Variantes usadas en componentes_web:', variantesUsadas);
  console.log('Variantes disponibles en catálogo: default, clic, y otras específicas por componente');

  await knex.destroy();
}

checkCoherencia().catch(console.error);
