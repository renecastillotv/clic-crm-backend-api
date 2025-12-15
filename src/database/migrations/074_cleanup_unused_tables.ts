import { Knex } from 'knex';

/**
 * Migración 074 - Limpieza de tablas no usadas
 *
 * Elimina tablas que ya no se usan después de la refactorización de arquitectura
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🧹 Limpiando tablas no usadas...');

  // Primero eliminar FKs que dependen de plantillas_pagina
  console.log('🔗 Eliminando foreign keys...');

  const hasPaginasWeb = await knex.schema.hasTable('paginas_web');
  if (hasPaginasWeb) {
    const hasPlantillaFk = await knex.schema.hasColumn('paginas_web', 'plantilla_id');
    if (hasPlantillaFk) {
      await knex.schema.alterTable('paginas_web', (table) => {
        table.dropForeign(['plantilla_id']);
        table.dropColumn('plantilla_id');
      });
      console.log('   ✅ Eliminado plantilla_id de paginas_web');
    }
  }

  const hasPaginasConfig = await knex.schema.hasTable('paginas_configuraciones');
  if (hasPaginasConfig) {
    const hasPlantillaFk = await knex.schema.hasColumn('paginas_configuraciones', 'plantilla_id');
    if (hasPlantillaFk) {
      await knex.schema.alterTable('paginas_configuraciones', (table) => {
        table.dropForeign(['plantilla_id']);
      });
      console.log('   ✅ Eliminado FK de paginas_configuraciones');
    }
  }

  // Eliminar FK de configuracion_activa_id en paginas_web
  if (hasPaginasWeb) {
    const hasConfigActivaFk = await knex.schema.hasColumn('paginas_web', 'configuracion_activa_id');
    if (hasConfigActivaFk) {
      await knex.schema.alterTable('paginas_web', (table) => {
        table.dropForeign(['configuracion_activa_id']);
        table.dropColumn('configuracion_activa_id');
      });
      console.log('   ✅ Eliminado configuracion_activa_id de paginas_web');
    }
  }

  // Ahora eliminar las tablas
  console.log('\n🗑️  Eliminando tablas...');

  const tablesToDrop = [
    'plantillas_pagina',              // Reemplazado por tipos_pagina
    'paginas_alias',                  // No se usa en código
    'paginas_configuraciones',        // No se usa en código
    'tenant_componentes_disponibles', // No se usa en código
    'tenant_defaults',                // No se usa en código
    'tenant_paginas_activas',         // No se usa en código
    'componentes_catalogo',           // Duplicado de catalogo_componentes
    'variantes_componentes',          // No se usa en código
  ];

  let droppedCount = 0;

  for (const tableName of tablesToDrop) {
    const exists = await knex.schema.hasTable(tableName);
    if (exists) {
      await knex.schema.dropTableIfExists(tableName);
      console.log(`   ✅ Eliminada: ${tableName}`);
      droppedCount++;
    } else {
      console.log(`   ⏭️  Ya no existe: ${tableName}`);
    }
  }

  console.log(`\n✅ Limpieza completada: ${droppedCount} tablas eliminadas`);
}

export async function down(knex: Knex): Promise<void> {
  console.log('⚠️  Esta migración no se puede revertir automáticamente');
  console.log('   Las tablas eliminadas tendrían que ser recreadas manualmente');
}
