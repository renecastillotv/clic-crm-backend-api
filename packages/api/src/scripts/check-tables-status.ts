import { pool, closePool } from '../config/database.js';

async function checkTablesStatus() {
  console.log('='.repeat(60));
  console.log('VERIFICACIÓN DE ESTADO DE TABLAS');
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    // Helper function para verificar si tabla existe
    async function tableExists(tableName: string): Promise<boolean> {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [tableName]);
      return result.rows[0].exists;
    }

    // 1. catalogo_componentes
    console.log('\n📦 CATALOGO_COMPONENTES');
    console.log('-'.repeat(40));

    const catalogoExists = await tableExists('catalogo_componentes');
    console.log(`Tabla existe: ${catalogoExists}`);

    if (catalogoExists) {
      const catalogoCount = await client.query('SELECT COUNT(*) as total FROM catalogo_componentes');
      console.log(`Total registros: ${catalogoCount.rows[0].total}`);

      const catalogoColumns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'catalogo_componentes'
        ORDER BY ordinal_position
      `);
      console.log('\nColumnas:');
      for (const col of catalogoColumns.rows) {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      }

      // Muestra algunos registros
      const catalogoSample = await client.query(`
        SELECT id, tipo, nombre, variantes, active
        FROM catalogo_componentes
        LIMIT 15
      `);
      console.log('\nMuestra de datos:');
      for (const row of catalogoSample.rows) {
        console.log(`  ${row.tipo} | ${row.nombre} | variantes: ${row.variantes} | active: ${row.active}`);
      }

      // Contar variantes por tipo
      const tiposAgrupados = await client.query(`
        SELECT tipo, COUNT(*) as cantidad
        FROM catalogo_componentes
        GROUP BY tipo
        ORDER BY cantidad DESC
      `);
      console.log('\nComponentes agrupados por tipo:');
      for (const t of tiposAgrupados.rows) {
        console.log(`  ${t.tipo}: ${t.cantidad} variante(s)`);
      }
    }

    // 2. tipos_pagina
    console.log('\n\n📄 TIPOS_PAGINA');
    console.log('-'.repeat(40));

    const tiposPaginaExists = await tableExists('tipos_pagina');
    console.log(`Tabla existe: ${tiposPaginaExists}`);

    if (tiposPaginaExists) {
      const tiposCount = await client.query('SELECT COUNT(*) as total FROM tipos_pagina');
      console.log(`Total registros: ${tiposCount.rows[0].total}`);

      const tiposPaginaColumns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'tipos_pagina'
        ORDER BY ordinal_position
      `);
      console.log('\nColumnas:');
      for (const col of tiposPaginaColumns.rows) {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      }

      const tiposPaginaSample = await client.query(`
        SELECT id, codigo, nombre, ruta_patron, visible
        FROM tipos_pagina
        LIMIT 30
      `);
      console.log('\nTodos los tipos de página:');
      for (const row of tiposPaginaSample.rows) {
        console.log(`  ${row.codigo} | ${row.nombre} | ruta: ${row.ruta_patron} | visible: ${row.visible}`);
      }
    }

    // 3. plantillas_pagina
    console.log('\n\n📋 PLANTILLAS_PAGINA');
    console.log('-'.repeat(40));

    const plantillasExists = await tableExists('plantillas_pagina');
    console.log(`Tabla existe: ${plantillasExists}`);

    if (plantillasExists) {
      const plantillasCount = await client.query('SELECT COUNT(*) as total FROM plantillas_pagina');
      console.log(`Total registros: ${plantillasCount.rows[0].total}`);

      const plantillasColumns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'plantillas_pagina'
        ORDER BY ordinal_position
      `);
      console.log('\nColumnas:');
      for (const col of plantillasColumns.rows) {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      }

      const plantillasSample = await client.query(`
        SELECT id, codigo, tipo_pagina, nombre, componentes, visible
        FROM plantillas_pagina
        LIMIT 10
      `);
      console.log('\nMuestra de plantillas:');
      for (const row of plantillasSample.rows) {
        const comps = typeof row.componentes === 'string' ? JSON.parse(row.componentes) : row.componentes;
        console.log(`  ${row.codigo} (${row.tipo_pagina})`);
        console.log(`    Componentes: ${JSON.stringify(comps)}`);
      }
    }

    // 4. componentes_web
    console.log('\n\n🔗 COMPONENTES_WEB');
    console.log('-'.repeat(40));

    const componentesWebExists = await tableExists('componentes_web');
    console.log(`Tabla existe: ${componentesWebExists}`);

    if (componentesWebExists) {
      const componentesWebCount = await client.query('SELECT COUNT(*) as total FROM componentes_web');
      console.log(`Total registros: ${componentesWebCount.rows[0].total}`);

      const componentesWebColumns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'componentes_web'
        ORDER BY ordinal_position
      `);
      console.log('\nColumnas:');
      for (const col of componentesWebColumns.rows) {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      }

      if (Number(componentesWebCount.rows[0].total) > 0) {
        const componentesWebSample = await client.query('SELECT * FROM componentes_web LIMIT 5');
        console.log('\nMuestra de datos:');
        for (const row of componentesWebSample.rows) {
          console.log(`  ${JSON.stringify(row, null, 2)}`);
        }
      }
    }

    // 5. tenants_rutas_config_custom
    console.log('\n\n🛣️  TENANTS_RUTAS_CONFIG_CUSTOM');
    console.log('-'.repeat(40));

    const rutasCustomExists = await tableExists('tenants_rutas_config_custom');
    console.log(`Tabla existe: ${rutasCustomExists}`);

    if (rutasCustomExists) {
      const rutasCount = await client.query('SELECT COUNT(*) as total FROM tenants_rutas_config_custom');
      console.log(`Total registros: ${rutasCount.rows[0].total}`);
    }

    // 6. Verificar tenants existentes
    console.log('\n\n👥 TENANTS EXISTENTES');
    console.log('-'.repeat(40));

    const tenants = await client.query(`
      SELECT id, nombre, slug, activo
      FROM tenants
      LIMIT 10
    `);
    console.log(`Total tenants consultados: ${tenants.rows.length}`);
    for (const t of tenants.rows) {
      console.log(`  ${t.slug} | ${t.nombre} | activo: ${t.activo}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('VERIFICACIÓN COMPLETADA');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await closePool();
  }
}

checkTablesStatus();
