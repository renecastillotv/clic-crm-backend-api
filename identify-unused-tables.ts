import { query } from './src/utils/db.js';

async function identifyUnusedTables() {
  console.log('\n=== Identificando tablas no usadas ===\n');

  // Listar todas las tablas
  const allTables = await query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  console.log('📋 Todas las tablas en la base de datos:');
  allTables.rows.forEach((t: any) => {
    console.log(`   - ${t.tablename}`);
  });

  console.log('\n🔍 Analizando uso...\n');

  // Tablas relacionadas con el nuevo sistema de páginas (MANTENER)
  const corePageTables = [
    'tipos_pagina',           // ✅ Catálogo oficial de tipos
    'paginas_web',            // ✅ Instancias de páginas
    'componentes_web',        // ✅ Catálogo + configuraciones
    'paginas_componentes',    // ✅ Junction table
    'catalogo_componentes',   // ✅ Catálogo de tipos de componentes
  ];

  // Tablas relacionadas con tenants y temas (MANTENER)
  const tenantTables = [
    'tenants',
    'temas_tenant',
    'tenants_rutas_config',
  ];

  // Tablas de datos dinámicos (MANTENER)
  const dataTables = [
    'propiedades',
    'asesores',
    'articulos',
    'videos',
    'testimonios',
    'proyectos',
    'tags_propiedades',
  ];

  // Tablas de sistema (MANTENER)
  const systemTables = [
    'knex_migrations',
    'knex_migrations_lock',
  ];

  // Tablas antiguas que probablemente no se usen
  const possiblyUnused = [
    'plantillas_pagina',           // ❓ ¿Se usa o fue reemplazado por tipos_pagina?
    'paginas_variantes',           // ❓ ¿Se usa todavía?
    'secciones_tenant',            // ❓ ¿Reemplazado por componentes_web?
    'componentes_predeterminados', // ❓ ¿Reemplazado por scope='page_type'?
  ];

  console.log('✅ TABLAS CORE (mantener):');
  for (const table of corePageTables) {
    const exists = allTables.rows.find((t: any) => t.tablename === table);
    if (exists) {
      const count = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   - ${table}: ${count.rows[0].count} registros`);
    }
  }

  console.log('\n✅ TABLAS DE TENANTS (mantener):');
  for (const table of tenantTables) {
    const exists = allTables.rows.find((t: any) => t.tablename === table);
    if (exists) {
      const count = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   - ${table}: ${count.rows[0].count} registros`);
    }
  }

  console.log('\n✅ TABLAS DE DATOS (mantener):');
  for (const table of dataTables) {
    const exists = allTables.rows.find((t: any) => t.tablename === table);
    if (exists) {
      const count = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   - ${table}: ${count.rows[0].count} registros`);
    }
  }

  console.log('\n❓ TABLAS POSIBLEMENTE NO USADAS (revisar):');
  for (const table of possiblyUnused) {
    const exists = allTables.rows.find((t: any) => t.tablename === table);
    if (exists) {
      const count = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   - ${table}: ${count.rows[0].count} registros`);
    }
  }

  // Verificar si plantillas_pagina se usa en el código
  console.log('\n🔍 Verificando uso de plantillas_pagina en routeResolver...');
  const plantillasUsed = await query(`SELECT COUNT(*) as count FROM plantillas_pagina`);
  console.log(`   Registros: ${plantillasUsed.rows[0].count}`);

  // Verificar secciones_tenant
  const seccionesExists = allTables.rows.find((t: any) => t.tablename === 'secciones_tenant');
  if (seccionesExists) {
    const seccionesCount = await query(`SELECT COUNT(*) as count FROM secciones_tenant`);
    console.log(`\n❓ secciones_tenant: ${seccionesCount.rows[0].count} registros`);
  }

  console.log('\n💡 Recomendación:');
  console.log('   Si plantillas_pagina no se usa en routeResolver, se puede eliminar');
  console.log('   Si secciones_tenant existe y no se usa, se puede eliminar');
  console.log('   Si paginas_variantes no se usa, se puede eliminar');
}

identifyUnusedTables()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
