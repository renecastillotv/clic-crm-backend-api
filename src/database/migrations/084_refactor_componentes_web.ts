import { Knex } from 'knex';

/**
 * Migración 083: Refactorizar componentes_web
 *
 * Cambios:
 * 1. tipo (string) → componente_catalogo_id (UUID FK a catalogo_componentes.id)
 * 2. Eliminar campo: variante
 * 3. pagina_id ya es FK a paginas_web (no requiere cambios)
 * 4. Eliminar campos: predeterminado, scope, tipo_pagina, config_completa, default_data
 *
 * Nota: El campo 'nombre' se mantiene para identificar instancias específicas
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔧 Refactorizando tabla componentes_web...\n');

  // ========================================
  // PASO 1: Agregar nueva columna componente_catalogo_id
  // ========================================
  console.log('1️⃣ Agregando componente_catalogo_id...');

  const hasComponenteCatalogoId = await knex.schema.hasColumn('componentes_web', 'componente_catalogo_id');
  if (!hasComponenteCatalogoId) {
    await knex.schema.alterTable('componentes_web', (table) => {
      table.uuid('componente_catalogo_id').nullable();
    });
  }

  // ========================================
  // PASO 2: Migrar datos de tipo a componente_catalogo_id
  // ========================================
  console.log('2️⃣ Migrando datos de tipo → componente_catalogo_id...');

  // Obtener mapeo de tipo → id del catálogo
  const catalogoComponentes = await knex('catalogo_componentes').select('id', 'tipo');

  for (const componente of catalogoComponentes) {
    await knex('componentes_web')
      .where('tipo', componente.tipo)
      .update({ componente_catalogo_id: componente.id });
  }

  // Verificar que todos tengan un componente_catalogo_id
  const componentesSinId = await knex('componentes_web')
    .whereNull('componente_catalogo_id')
    .count('* as count')
    .first();

  if (componentesSinId && parseInt(componentesSinId.count as string) > 0) {
    console.log(`⚠️  ${componentesSinId.count} componentes sin componente_catalogo_id`);
    console.log('   Estos registros quedarán NULL y deberán ser revisados manualmente.');
  }

  // ========================================
  // PASO 3: Hacer componente_catalogo_id NOT NULL y agregar FK
  // ========================================
  console.log('3️⃣ Configurando componente_catalogo_id como FK...');

  await knex.raw(`ALTER TABLE componentes_web ALTER COLUMN componente_catalogo_id SET NOT NULL`);

  await knex.schema.alterTable('componentes_web', (table) => {
    table.foreign('componente_catalogo_id')
      .references('id')
      .inTable('catalogo_componentes')
      .onDelete('RESTRICT');
  });

  // Crear índice
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_componentes_web_catalogo ON componentes_web(componente_catalogo_id)`);

  console.log('✅ componente_catalogo_id configurado');

  // ========================================
  // PASO 4: Eliminar campos obsoletos
  // ========================================
  console.log('4️⃣ Eliminando campos obsoletos...');

  const camposAEliminar = ['variante', 'predeterminado', 'scope', 'tipo_pagina', 'config_completa', 'default_data', 'tipo'];

  for (const campo of camposAEliminar) {
    const exists = await knex.schema.hasColumn('componentes_web', campo);
    if (exists) {
      // Eliminar índices relacionados primero
      if (campo === 'predeterminado') {
        await knex.raw(`DROP INDEX IF EXISTS idx_componentes_web_predeterminado`);
      } else if (campo === 'scope') {
        await knex.raw(`DROP INDEX IF EXISTS idx_componentes_web_scope`);
      } else if (campo === 'tipo_pagina') {
        await knex.raw(`DROP INDEX IF EXISTS idx_componentes_web_tipo_pagina`);
      }

      await knex.schema.alterTable('componentes_web', (table) => {
        table.dropColumn(campo);
      });
      console.log(`   ✅ ${campo} eliminado`);
    }
  }

  console.log('\n✅ Refactorización completada\n');
  console.log('Estructura final de componentes_web:');
  console.log('  - id, tenant_id, componente_catalogo_id (FK)');
  console.log('  - nombre, datos, activo, orden');
  console.log('  - pagina_id (FK a paginas_web)');
  console.log('  - created_at, updated_at\n');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Revirtiendo refactorización de componentes_web...\n');

  // 1. Restaurar campo tipo
  console.log('1️⃣ Restaurando campo tipo...');
  await knex.schema.alterTable('componentes_web', (table) => {
    table.string('tipo', 50).nullable();
  });

  // Poblar tipo desde catalogo_componentes
  const componentesWeb = await knex('componentes_web as cw')
    .join('catalogo_componentes as cc', 'cw.componente_catalogo_id', 'cc.id')
    .select('cw.id as componente_id', 'cc.tipo');

  for (const comp of componentesWeb) {
    await knex('componentes_web')
      .where('id', comp.componente_id)
      .update({ tipo: comp.tipo });
  }

  await knex.raw(`ALTER TABLE componentes_web ALTER COLUMN tipo SET NOT NULL`);

  // 2. Restaurar otros campos
  console.log('2️⃣ Restaurando campos eliminados...');

  await knex.schema.alterTable('componentes_web', (table) => {
    table.string('variante', 50).nullable().defaultTo('default');
    table.boolean('predeterminado').defaultTo(false);
    table.string('scope', 20).defaultTo('tenant');
    table.string('tipo_pagina', 50).nullable();
    table.jsonb('config_completa').nullable();
    table.jsonb('default_data').nullable();
  });

  // 3. Eliminar FK y columna componente_catalogo_id
  console.log('3️⃣ Eliminando componente_catalogo_id...');

  await knex.raw(`DROP INDEX IF EXISTS idx_componentes_web_catalogo`);

  await knex.schema.alterTable('componentes_web', (table) => {
    table.dropForeign('componente_catalogo_id');
    table.dropColumn('componente_catalogo_id');
  });

  console.log('✅ Rollback completado');
}
