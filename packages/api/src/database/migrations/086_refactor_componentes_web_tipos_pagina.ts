import { Knex } from 'knex';

/**
 * Migración 086: Refactorizar componentes_web para usar tipos_pagina
 *
 * Cambios:
 * 1. Eliminar columnas obsoletas: tipo, variante, scope, predeterminado, tipo_pagina, pagina_id
 * 2. Agregar componente_catalogo_id (FK a catalogo_componentes)
 * 3. Agregar tipo_pagina_id (FK a tipos_pagina) - para páginas estándar
 * 4. Agregar tenant_rutas_config_custom_id (FK a tenants_rutas_config_custom) - para páginas custom
 * 5. Limpiar todos los datos existentes de componentes_web
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔧 Refactorizando tabla componentes_web para usar tipos_pagina...\n');

  // 1. Eliminar columnas obsoletas si existen
  console.log('🗑️  Eliminando columnas obsoletas...');

  const existingColumns = await knex.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'componentes_web'
      AND column_name IN (
        'tipo', 'variante', 'scope', 'predeterminado',
        'tipo_pagina', 'config_completa', 'default_data',
        'pagina_id', 'es_activo'
      )
  `);

  for (const col of existingColumns.rows) {
    await knex.schema.alterTable('componentes_web', (table) => {
      table.dropColumn(col.column_name);
    });
    console.log(`  ✅ Columna ${col.column_name} eliminada`);
  }

  // 2. Limpiar todos los datos existentes
  console.log('\n🗑️  Limpiando datos existentes de componentes_web...');
  await knex('componentes_web').delete();
  console.log('  ✅ Datos limpiados (tabla vacía)');

  // 3. Agregar columna componente_catalogo_id
  console.log('\n➕ Agregando componente_catalogo_id...');

  const hasCatalogoId = await knex.schema.hasColumn('componentes_web', 'componente_catalogo_id');
  if (!hasCatalogoId) {
    await knex.schema.alterTable('componentes_web', (table) => {
      table.uuid('componente_catalogo_id')
        .notNullable()
        .references('id')
        .inTable('catalogo_componentes')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    });
    console.log('  ✅ componente_catalogo_id agregado');

    // Crear índice
    await knex.raw(`
      CREATE INDEX idx_componentes_web_catalogo
      ON componentes_web(componente_catalogo_id)
    `);
    console.log('  ✅ Índice en componente_catalogo_id creado');
  }

  // 4. Agregar columna tipo_pagina_id (para páginas estándar)
  console.log('\n➕ Agregando tipo_pagina_id...');

  const hasTipoPaginaId = await knex.schema.hasColumn('componentes_web', 'tipo_pagina_id');
  if (!hasTipoPaginaId) {
    await knex.schema.alterTable('componentes_web', (table) => {
      table.uuid('tipo_pagina_id')
        .nullable()
        .references('id')
        .inTable('tipos_pagina')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    });
    console.log('  ✅ tipo_pagina_id agregado');

    // Crear índice
    await knex.raw(`
      CREATE INDEX idx_componentes_web_tipo_pagina
      ON componentes_web(tipo_pagina_id)
    `);
    console.log('  ✅ Índice en tipo_pagina_id creado');
  }

  // 5. Agregar columna tenant_rutas_config_custom_id (para páginas custom)
  console.log('\n➕ Agregando tenant_rutas_config_custom_id...');

  const hasRutasCustomId = await knex.schema.hasColumn('componentes_web', 'tenant_rutas_config_custom_id');
  if (!hasRutasCustomId) {
    await knex.schema.alterTable('componentes_web', (table) => {
      table.uuid('tenant_rutas_config_custom_id')
        .nullable()
        .references('id')
        .inTable('tenants_rutas_config_custom')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    });
    console.log('  ✅ tenant_rutas_config_custom_id agregado');

    // Crear índice
    await knex.raw(`
      CREATE INDEX idx_componentes_web_rutas_custom
      ON componentes_web(tenant_rutas_config_custom_id)
    `);
    console.log('  ✅ Índice en tenant_rutas_config_custom_id creado');
  }

  // 6. Agregar constraint CHECK para asegurar que al menos uno esté definido
  console.log('\n➕ Agregando constraint CHECK...');

  await knex.raw(`
    ALTER TABLE componentes_web
    ADD CONSTRAINT chk_componentes_web_tipo_or_custom
    CHECK (
      (tipo_pagina_id IS NOT NULL AND tenant_rutas_config_custom_id IS NULL) OR
      (tipo_pagina_id IS NULL AND tenant_rutas_config_custom_id IS NOT NULL)
    )
  `);
  console.log('  ✅ Constraint CHECK agregado (tipo_pagina_id XOR tenant_rutas_config_custom_id)');

  console.log('\n✅ Migración 086 completada');
  console.log('   Nueva estructura:');
  console.log('   • componente_catalogo_id → catalogo_componentes.id');
  console.log('   • tipo_pagina_id → tipos_pagina.id (para páginas estándar)');
  console.log('   • tenant_rutas_config_custom_id → tenants_rutas_config_custom.id (para custom)');
  console.log('   • Solo UNO de tipo_pagina_id o tenant_rutas_config_custom_id debe estar definido\n');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Revirtiendo refactor de componentes_web...\n');

  // 1. Eliminar constraint CHECK
  await knex.raw(`
    ALTER TABLE componentes_web
    DROP CONSTRAINT IF EXISTS chk_componentes_web_tipo_or_custom
  `);
  console.log('  ✅ Constraint CHECK eliminado');

  // 2. Eliminar índices
  await knex.raw(`DROP INDEX IF EXISTS idx_componentes_web_catalogo`);
  await knex.raw(`DROP INDEX IF EXISTS idx_componentes_web_tipo_pagina`);
  await knex.raw(`DROP INDEX IF EXISTS idx_componentes_web_rutas_custom`);
  console.log('  ✅ Índices eliminados');

  // 3. Eliminar FKs
  await knex.schema.alterTable('componentes_web', (table) => {
    table.dropForeign(['componente_catalogo_id']);
    table.dropForeign(['tipo_pagina_id']);
    table.dropForeign(['tenant_rutas_config_custom_id']);
  });
  console.log('  ✅ FKs eliminadas');

  // 4. Eliminar columnas
  await knex.schema.alterTable('componentes_web', (table) => {
    table.dropColumn('componente_catalogo_id');
    table.dropColumn('tipo_pagina_id');
    table.dropColumn('tenant_rutas_config_custom_id');
  });
  console.log('  ✅ Columnas eliminadas');

  // 5. Restaurar columnas antiguas
  await knex.schema.alterTable('componentes_web', (table) => {
    table.string('tipo');
    table.string('variante');
  });
  console.log('  ✅ Columnas antiguas restauradas');

  console.log('\n✅ Rollback completado\n');
}
