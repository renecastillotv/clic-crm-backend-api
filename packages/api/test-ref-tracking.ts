import { pool } from './src/config/database';

/**
 * Script para probar el sistema de tracking con ref
 */

async function testRefTracking() {
  console.log('=== PROBANDO SISTEMA DE REF TRACKING ===\n');

  try {
    // 1. Simular lo que haría la API cuando recibe ?ref=1234
    const testUrl = '/tenant/clic/en/articles?ref=1234';
    console.log(`1. URL DE PRUEBA: ${testUrl}\n`);

    // 2. Simular la llamada a la API
    console.log('2. PROBANDO EL ENDPOINT:');
    console.log('='.repeat(60));

    const response = await fetch(`http://localhost:3001/api/resolver/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: 'd43e30b1-61d0-46e5-a760-7595f78dd184', // CLIC tenant
        pathname: testUrl
      })
    });

    const data = await response.json();

    console.log('Status:', response.status);
    console.log('\nRespuesta:');
    console.log(JSON.stringify(data, null, 2));

    // 3. Verificar si el tracking está en la respuesta
    console.log('\n3. VERIFICACIÓN:');
    console.log('='.repeat(60));

    if (data.tracking) {
      console.log('✅ Tracking encontrado en respuesta:', data.tracking);
    } else {
      console.log('❌ NO se encontró tracking en respuesta');
    }

    if (data.queryParams) {
      console.log('✅ Query params encontrados:', data.queryParams);
    }

    // 4. Buscar el componente debug-info en las secciones
    console.log('\n4. BUSCANDO COMPONENTE DEBUG-INFO:');
    console.log('='.repeat(60));

    let debugComponentFound = false;
    if (data.secciones) {
      for (const seccion of data.secciones) {
        if (seccion.componentes) {
          for (const comp of seccion.componentes) {
            if (comp.tipo === 'debug-info') {
              debugComponentFound = true;
              console.log('✅ Componente debug-info encontrado');
              console.log('Configuración:', JSON.stringify(comp.configuracion, null, 2));

              const config = comp.configuracion;
              if (config && config.details) {
                console.log('\n📊 Detalles del debug:');
                console.log(`  - ref: ${config.details.ref}`);
                console.log(`  - referidorEncontrado: ${config.details.referidorEncontrado}`);
                console.log(`  - referidorNombre: ${config.details.referidorNombre}`);
                console.log(`  - referidorTipo: ${config.details.referidorTipo}`);
              }
            }
          }
        }
      }
    }

    if (!debugComponentFound) {
      console.log('❌ NO se encontró componente debug-info en las secciones');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRefTracking();
