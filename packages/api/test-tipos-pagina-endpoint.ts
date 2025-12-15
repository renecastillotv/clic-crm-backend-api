import axios from 'axios';

async function testEndpoint() {
  try {
    console.log('=== PROBANDO ENDPOINT /admin/tipos-pagina ===\n');

    const response = await axios.get('http://localhost:3001/api/admin/tipos-pagina');

    console.log('Status:', response.status);
    console.log('Total tipos devueltos:', response.data.tipos?.length || response.data.length);
    console.log('\nPrimeros 5 tipos:');
    const datos = response.data.tipos || response.data;
    console.table(datos.slice(0, 5));

    console.log('\nTodos los códigos:');
    datos.forEach((tipo: any) => {
      console.log(`- ${tipo.codigo} | ${tipo.nombre}`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testEndpoint();
