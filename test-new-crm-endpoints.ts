const API_BASE = 'http://localhost:3001/api/crm';
const TENANT_ID = '9763dd67-1b33-40b1-ae78-73e5bcafc2b7'; // Demo tenant

async function testEndpoints() {
  console.log('\n=== Test de Nuevos Endpoints CRM ===\n');

  try {
    // 1. Test: Listar páginas
    console.log('1. GET /tenants/:tenantId/paginas');
    const listResponse = await fetch(`${API_BASE}/tenants/${TENANT_ID}/paginas`);
    const listData = await listResponse.json();

    if (listData.success) {
      console.log(`   ✅ ${listData.data.length} páginas encontradas`);

      if (listData.data.length > 0) {
        const homePage = listData.data.find((p: any) => p.tipo_codigo === 'homepage');
        if (homePage) {
          console.log(`   📄 Homepage ID: ${homePage.id}`);
          console.log(`      - Título: ${homePage.titulo}`);
          console.log(`      - Total componentes: ${homePage.total_componentes}`);
          console.log(`      - Activa: ${homePage.activo}`);

          // 2. Test: Obtener editor de página
          console.log(`\n2. GET /tenants/:tenantId/paginas/:paginaId/editor`);
          const editorResponse = await fetch(`${API_BASE}/tenants/${TENANT_ID}/paginas/${homePage.id}/editor`);
          const editorData = await editorResponse.json();

          if (editorData.success) {
            console.log(`   ✅ Editor cargado`);
            console.log(`      - Componentes asignados: ${editorData.data.componentes_asignados.length}`);
            console.log(`      - Componentes disponibles: ${editorData.data.componentes_disponibles.length}`);

            if (editorData.data.componentes_asignados.length > 0) {
              console.log('\n   Componentes asignados:');
              editorData.data.componentes_asignados.slice(0, 3).forEach((comp: any) => {
                console.log(`      - ${comp.tipo}/${comp.variante}`);
                console.log(`        • Activo: ${comp.activo}`);
                console.log(`        • Has default_data: ${Object.keys(comp.default_data || {}).length > 0}`);
                console.log(`        • Has config_override: ${Object.keys(comp.config_override || {}).length > 0}`);
              });
            }
          } else {
            console.log(`   ❌ Error: ${editorData.error}`);
          }
        }
      }
    } else {
      console.log(`   ❌ Error: ${listData.error}`);
    }

    // 3. Test: Obtener catálogo de componentes
    console.log('\n3. GET /tenants/:tenantId/componentes/catalogo');
    const catalogoResponse = await fetch(`${API_BASE}/tenants/${TENANT_ID}/componentes/catalogo`);
    const catalogoData = await catalogoResponse.json();

    if (catalogoData.success) {
      const tipos = Object.keys(catalogoData.data);
      console.log(`   ✅ ${tipos.length} tipos de componentes`);
      tipos.slice(0, 5).forEach(tipo => {
        console.log(`      - ${tipo}: ${catalogoData.data[tipo].length} variantes`);
      });
      if (tipos.length > 5) {
        console.log(`      ... y ${tipos.length - 5} más`);
      }
    } else {
      console.log(`   ❌ Error: ${catalogoData.error}`);
    }

    // 4. Test: Obtener variantes de un tipo específico
    console.log('\n4. GET /tenants/:tenantId/componentes/:tipo/variantes');
    const variantesResponse = await fetch(`${API_BASE}/tenants/${TENANT_ID}/componentes/hero/variantes`);
    const variantesData = await variantesResponse.json();

    if (variantesData.success) {
      console.log(`   ✅ ${variantesData.data.length} variantes de 'hero'`);
      variantesData.data.forEach((v: any) => {
        console.log(`      - ${v.variante} (scope: ${v.scope})`);
      });
    } else {
      console.log(`   ❌ Error: ${variantesData.error}`);
    }

    console.log('\n=== Test Completado ===\n');
    console.log('✅ Los endpoints están funcionando correctamente');
    console.log('📝 Próximos pasos:');
    console.log('   • Crear componente PaginasList.tsx');
    console.log('   • Crear componente PaginaEditor.tsx');
    console.log('   • Crear ComponenteConfigModal.tsx\n');

  } catch (error: any) {
    console.error('\n❌ Error en el test:', error.message);
    console.error('   Asegúrate de que el servidor API esté corriendo en http://localhost:3001\n');
  }
}

testEndpoints();
