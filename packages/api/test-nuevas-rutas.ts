import { resolveRoute } from './src/services/routeResolver';

/**
 * Script para probar las nuevas rutas agregadas
 */

async function testNuevasRutas() {
  console.log('=== PROBANDO NUEVAS RUTAS ===\n');

  const tenantId = 'e19efafe-9dce-4ab9-9ab4-f45f9ac0bb9e'; // tenant CLIC

  const rutasPrueba = [
    { ruta: '/favoritos', descripcion: 'Listado de favoritos' },
    { ruta: '/favoritos/abc123', descripcion: 'Favoritos con token' },
    { ruta: '/propuestas', descripcion: 'Listado de propuestas' },
    { ruta: '/propuestas/xyz789', descripcion: 'Propuesta con token' },
    { ruta: '/ubicaciones', descripcion: 'Listado de ubicaciones' },
    { ruta: '/tipos-de-propiedades', descripcion: 'Listado de tipos de propiedades' },
    { ruta: '/listados-de-propiedades/mejores-apartamentos', descripcion: 'Listado curado específico' },
  ];

  for (const { ruta, descripcion } of rutasPrueba) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`PROBANDO: ${ruta}`);
    console.log(`Descripción: ${descripcion}`);
    console.log('='.repeat(80));

    try {
      const resultado = await resolveRoute(tenantId, ruta);

      if (resultado) {
        console.log('✅ RUTA RESUELTA EXITOSAMENTE');
        console.log(`   Tipo de página: ${resultado.page.tipoPagina}`);
        console.log(`   Título: ${resultado.page.titulo}`);
        console.log(`   Slug: ${resultado.page.slug}`);
        console.log(`   Idioma: ${resultado.idioma}`);
        console.log(`   Componentes: ${resultado.components?.length || 0}`);

        // Verificar si tiene componente debug
        const tieneDebug = resultado.components?.some((c: any) => c.tipo === 'debug');
        console.log(`   ¿Tiene componente debug?: ${tieneDebug ? '✅ SÍ' : '❌ NO'}`);

        if (tieneDebug) {
          const componenteDebug = resultado.components?.find((c: any) => c.tipo === 'debug');
          console.log('\n   📋 COMPONENTE DEBUG:');
          console.log(`      Title: ${componenteDebug?.datos?.title}`);
          console.log(`      Subtitle: ${componenteDebug?.datos?.subtitle}`);
          console.log('\n      Details:');
          Object.entries(componenteDebug?.datos?.details || {}).forEach(([key, value]) => {
            console.log(`        - ${key}: ${value}`);
          });
        }
      } else {
        console.log('❌ LA RUTA NO PUDO SER RESUELTA');
      }
    } catch (error: any) {
      console.error('❌ ERROR AL RESOLVER RUTA:', error.message);
    }
  }

  console.log('\n\n=== PRUEBA COMPLETADA ===');
  process.exit(0);
}

testNuevasRutas();
