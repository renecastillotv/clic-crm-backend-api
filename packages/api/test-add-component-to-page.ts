import { query } from './src/utils/db.js';

async function testAddComponentToPage() {
  const tenantId = '9763dd67-1b33-40b1-ae78-73e5bcafc2b7'; // Demo tenant

  console.log('\n=== Test: Agregar Componente a Página ===\n');

  // 1. Obtener la homepage
  const paginaResult = await query(
    `SELECT id, titulo, slug FROM paginas_web WHERE tenant_id = $1 AND slug = '/'`,
    [tenantId]
  );

  if (paginaResult.rows.length === 0) {
    console.log('❌ No se encontró la homepage');
    return;
  }

  const pagina = paginaResult.rows[0];
  console.log(`✅ Homepage encontrada: ${pagina.titulo} (ID: ${pagina.id})\n`);

  // 2. Buscar un componente global para agregar (que no esté ya en la página)
  const componenteGlobalResult = await query(
    `SELECT id, tipo, variante, nombre
     FROM componentes_web
     WHERE tenant_id = $1
       AND pagina_id IS NULL
       AND activo = true
       AND tipo = 'testimonials_grid'
     LIMIT 1`,
    [tenantId]
  );

  if (componenteGlobalResult.rows.length === 0) {
    console.log('❌ No se encontró componente global para agregar');
    return;
  }

  const componente = componenteGlobalResult.rows[0];
  console.log(`📦 Componente a agregar: ${componente.tipo} (${componente.variante})`);
  console.log(`   ID: ${componente.id}`);
  console.log(`   Nombre: ${componente.nombre || 'Sin nombre'}\n`);

  // 3. Verificar si ya existe en la junction table
  const existingJunction = await query(
    `SELECT id FROM paginas_componentes
     WHERE pagina_id = $1 AND componente_id = $2`,
    [pagina.id, componente.id]
  );

  if (existingJunction.rows.length > 0) {
    console.log('⚠️  El componente ya está agregado a esta página. Eliminando primero...\n');
    await query(
      `DELETE FROM paginas_componentes WHERE pagina_id = $1 AND componente_id = $2`,
      [pagina.id, componente.id]
    );
  }

  // 4. ANTES: Consultar componentes de la página (sin el componente agregado)
  console.log('📊 ANTES de agregar el componente:\n');

  const beforeQuery = `
    WITH direct_components AS (
      SELECT
        c.id,
        c.tipo,
        c.variante,
        'direct' as source
      FROM componentes_web c
      WHERE c.tenant_id = $1
        AND c.activo = true
        AND c.pagina_id = $2::uuid
    ),
    junction_components AS (
      SELECT
        c.id,
        c.tipo,
        c.variante,
        'junction' as source
      FROM paginas_componentes pc
      INNER JOIN componentes_web c ON c.id = pc.componente_id
      WHERE pc.pagina_id = $2::uuid
        AND pc.activo = true
        AND c.activo = true
        AND c.tenant_id = $1
    ),
    global_components AS (
      SELECT
        c.id,
        c.tipo,
        c.variante,
        'global' as source
      FROM componentes_web c
      WHERE c.tenant_id = $1
        AND c.activo = true
        AND c.pagina_id IS NULL
        AND c.tipo != 'property_list'
    )
    SELECT * FROM direct_components
    UNION ALL
    SELECT * FROM junction_components
    UNION ALL
    SELECT * FROM global_components
    ORDER BY tipo, source
  `;

  const beforeResult = await query(beforeQuery, [tenantId, pagina.id]);

  const beforeDirect = beforeResult.rows.filter((r: any) => r.source === 'direct').length;
  const beforeJunction = beforeResult.rows.filter((r: any) => r.source === 'junction').length;
  const beforeGlobal = beforeResult.rows.filter((r: any) => r.source === 'global').length;

  console.log(`   Directos: ${beforeDirect}`);
  console.log(`   Junction: ${beforeJunction}`);
  console.log(`   Globales: ${beforeGlobal}`);
  console.log(`   TOTAL: ${beforeResult.rows.length}\n`);

  // 5. Agregar el componente a la página vía junction table
  console.log(`➕ Agregando componente a la página vía junction table...\n`);

  const insertResult = await query(
    `INSERT INTO paginas_componentes (pagina_id, componente_id, orden, activo)
     VALUES ($1, $2, 999, true)
     RETURNING id`,
    [pagina.id, componente.id]
  );

  console.log(`✅ Componente agregado! Junction ID: ${insertResult.rows[0].id}\n`);

  // 6. DESPUÉS: Consultar componentes de la página (con el componente agregado)
  console.log('📊 DESPUÉS de agregar el componente:\n');

  const afterResult = await query(beforeQuery, [tenantId, pagina.id]);

  const afterDirect = afterResult.rows.filter((r: any) => r.source === 'direct').length;
  const afterJunction = afterResult.rows.filter((r: any) => r.source === 'junction').length;
  const afterGlobal = afterResult.rows.filter((r: any) => r.source === 'global').length;

  console.log(`   Directos: ${afterDirect} (${afterDirect - beforeDirect >= 0 ? '+' : ''}${afterDirect - beforeDirect})`);
  console.log(`   Junction: ${afterJunction} (${afterJunction - beforeJunction >= 0 ? '+' : ''}${afterJunction - beforeJunction}) ⭐`);
  console.log(`   Globales: ${afterGlobal} (${afterGlobal - beforeGlobal >= 0 ? '+' : ''}${afterGlobal - beforeGlobal})`);
  console.log(`   TOTAL: ${afterResult.rows.length} (${afterResult.rows.length - beforeResult.rows.length >= 0 ? '+' : ''}${afterResult.rows.length - beforeResult.rows.length})\n`);

  // 7. Verificar que el componente agregado aparece en la lista
  const addedComponent = afterResult.rows.find((r: any) =>
    r.id === componente.id && r.source === 'junction'
  );

  if (addedComponent) {
    console.log('✅ ÉXITO: El componente agregado vía junction table APARECE en la consulta!\n');
  } else {
    console.log('❌ ERROR: El componente agregado NO aparece en la consulta\n');
  }

  // 8. Simular la consulta que usa la web pública (con ranking)
  console.log('🌐 Simulando consulta de la web pública (con ranking):\n');

  const webQuery = `
    WITH direct_components AS (
      SELECT
        c.id,
        c.tipo,
        c.variante,
        c.datos,
        c.activo,
        c.orden,
        c.pagina_id as "paginaId",
        c.predeterminado,
        c.created_at
      FROM componentes_web c
      WHERE c.tenant_id = $1
        AND c.activo = true
        AND c.pagina_id = $2::uuid
    ),
    junction_components AS (
      SELECT
        c.id,
        c.tipo,
        c.variante,
        c.datos,
        c.activo,
        pc.orden,
        c.pagina_id as "paginaId",
        c.predeterminado,
        c.created_at
      FROM paginas_componentes pc
      INNER JOIN componentes_web c ON c.id = pc.componente_id
      WHERE pc.pagina_id = $2::uuid
        AND pc.activo = true
        AND c.activo = true
        AND c.tenant_id = $1
    ),
    global_components AS (
      SELECT
        c.id,
        c.tipo,
        c.variante,
        c.datos,
        c.activo,
        c.orden,
        c.pagina_id as "paginaId",
        c.predeterminado,
        c.created_at
      FROM componentes_web c
      WHERE c.tenant_id = $1
        AND c.activo = true
        AND c.pagina_id IS NULL
        AND c.tipo != 'property_list'
    ),
    all_components AS (
      SELECT * FROM direct_components
      UNION
      SELECT * FROM junction_components
      UNION
      SELECT * FROM global_components
    ),
    ranked_components AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY tipo
          ORDER BY
            CASE WHEN "paginaId" IS NOT NULL THEN 0 ELSE 1 END,
            CASE WHEN predeterminado = true THEN 0 ELSE 1 END,
            orden ASC,
            created_at ASC
        ) as rn
      FROM all_components
    )
    SELECT
      id,
      tipo,
      variante,
      orden,
      "paginaId"
    FROM ranked_components
    WHERE rn = 1
    ORDER BY orden ASC
  `;

  const webResult = await query(webQuery, [tenantId, pagina.id]);

  console.log(`   Total componentes únicos (1 por tipo): ${webResult.rows.length}\n`);

  const webHasComponent = webResult.rows.find((r: any) => r.id === componente.id);

  if (webHasComponent) {
    console.log(`✅ El componente ${componente.tipo} APARECE en la web pública!`);
    console.log(`   Orden: ${webHasComponent.orden}`);
    console.log(`   Página ID: ${webHasComponent.paginaId || 'NULL (global)'}\n`);
  } else {
    console.log(`⚠️  El componente ${componente.tipo} NO aparece (probablemente porque ya hay otro del mismo tipo con mayor prioridad)\n`);
  }

  // 9. Limpiar - eliminar el componente de la junction table
  console.log('🧹 Limpiando: eliminando componente de la junction table...\n');
  await query(
    `DELETE FROM paginas_componentes WHERE pagina_id = $1 AND componente_id = $2`,
    [pagina.id, componente.id]
  );

  console.log('✅ Test completado y limpieza realizada\n');
}

testAddComponentToPage()
  .then(() => {
    console.log('✅ Test finalizado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
