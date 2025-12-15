import axios from 'axios';

async function testHomepageHeader() {
  try {
    console.log('=== PROBANDO HOMEPAGE CON HEADER ===\n');

    const response = await axios.get('http://localhost:3001/api/web/clic', {
      params: {
        path: '/'
      }
    });

    console.log('Status:', response.status);
    console.log('Tipo de página:', response.data.page?.tipoPagina);
    console.log('Total componentes:', response.data.components?.length || 0);

    if (response.data.components && response.data.components.length > 0) {
      console.log('\n=== COMPONENTES EN LA HOMEPAGE ===\n');

      response.data.components.forEach((comp: any, index: number) => {
        console.log(`${index + 1}. ${comp.tipo} - ${comp.nombre || 'Sin nombre'}`);
        console.log(`   Orden: ${comp.orden}`);
        console.log(`   Activo: ${comp.activo}`);

        if (comp.tipo === 'header') {
          console.log('\n   📋 DATOS DEL HEADER:');
          console.log(JSON.stringify(comp.datos, null, 2));
        }
        console.log('');
      });
    } else {
      console.log('\n❌ No se encontraron componentes');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testHomepageHeader();
