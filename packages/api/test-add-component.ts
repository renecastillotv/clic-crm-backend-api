/**
 * Test script para probar agregar un componente a una página
 */

const API_URL = 'http://localhost:3001';
const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';
const PAGINA_ID = 'fab59c27-8d21-4732-87a6-ac040b6a7c16';

// Este es un ID real de un componente existente (hero-clic)
// Lo sacaremos de la lista de componentes disponibles
const COMPONENTE_ID = '9490f4e2-c72e-43c9-98de-85692d697432'; // hero-clic

async function test() {
  console.log('\n📝 Test: Agregar componente a página\n');
  console.log(`Tenant: ${TENANT_ID}`);
  console.log(`Página: ${PAGINA_ID}`);
  console.log(`Componente: ${COMPONENTE_ID}\n`);

  try {
    const url = `${API_URL}/api/tenants/${TENANT_ID}/paginas/${PAGINA_ID}/componentes`;

    console.log(`🔗 URL: ${url}`);
    console.log(`📦 Body:`, JSON.stringify({
      componente_id: COMPONENTE_ID
    }, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        componente_id: COMPONENTE_ID
      })
    });

    console.log(`\n📊 Status: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log(`📄 Response (text):`, text);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

test();
