import { Knex } from 'knex';

/**
 * Migración 114: Refactorizar tabla seo_stats para soporte de múltiples asociaciones
 *
 * Cambios:
 * - Eliminar: tipo_asociacion, asociacion_id, asociacion_nombre, idioma
 * - Agregar: operaciones (TEXT[]), tipo_propiedad_ids (UUID[]), ubicacion_ids (UUID[])
 * - Mantener: categoria_id (para segmentación de audiencia)
 */
export async function up(knex: Knex): Promise<void> {
  // Agregar nuevas columnas de arrays
  await knex.schema.alterTable('seo_stats', (table) => {
    // Arrays para matching flexible
    table.specificType('operaciones', 'TEXT[]').defaultTo('{}');
    table.specificType('tipo_propiedad_ids', 'UUID[]').defaultTo('{}');
    table.specificType('ubicacion_ids', 'UUID[]').defaultTo('{}');
  });

  console.log('✓ Columnas de arrays agregadas');

  // Eliminar columnas obsoletas
  await knex.schema.alterTable('seo_stats', (table) => {
    table.dropColumn('tipo_asociacion');
    table.dropColumn('asociacion_id');
    table.dropColumn('asociacion_nombre');
    table.dropColumn('idioma');
  });

  console.log('✓ Columnas obsoletas eliminadas');

  // Crear índices GIN para búsqueda eficiente en arrays
  await knex.raw(`CREATE INDEX idx_seo_stats_operaciones ON seo_stats USING GIN (operaciones)`);
  await knex.raw(`CREATE INDEX idx_seo_stats_tipo_propiedad_ids ON seo_stats USING GIN (tipo_propiedad_ids)`);
  await knex.raw(`CREATE INDEX idx_seo_stats_ubicacion_ids ON seo_stats USING GIN (ubicacion_ids)`);

  console.log('✓ Índices GIN creados');

  // Eliminar índices obsoletos
  await knex.raw(`DROP INDEX IF EXISTS idx_seo_stats_tipo`);
  await knex.raw(`DROP INDEX IF EXISTS idx_seo_stats_asociacion`);
  await knex.raw(`DROP INDEX IF EXISTS idx_seo_stats_idioma`);
  await knex.raw(`DROP INDEX IF EXISTS idx_seo_stats_unique_asociacion`);

  console.log('✅ Migración 114: seo_stats refactorizada correctamente');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar índices GIN
  await knex.raw(`DROP INDEX IF EXISTS idx_seo_stats_operaciones`);
  await knex.raw(`DROP INDEX IF EXISTS idx_seo_stats_tipo_propiedad_ids`);
  await knex.raw(`DROP INDEX IF EXISTS idx_seo_stats_ubicacion_ids`);

  // Restaurar columnas originales
  await knex.schema.alterTable('seo_stats', (table) => {
    table.string('tipo_asociacion', 50).defaultTo('ubicacion');
    table.string('asociacion_id', 255);
    table.string('asociacion_nombre', 255);
    table.string('idioma', 10).defaultTo('es');
  });

  // Eliminar nuevas columnas
  await knex.schema.alterTable('seo_stats', (table) => {
    table.dropColumn('operaciones');
    table.dropColumn('tipo_propiedad_ids');
    table.dropColumn('ubicacion_ids');
  });

  // Recrear índices originales
  await knex.raw(`CREATE INDEX idx_seo_stats_tipo ON seo_stats (tipo_asociacion)`);
  await knex.raw(`CREATE INDEX idx_seo_stats_asociacion ON seo_stats (asociacion_id)`);
  await knex.raw(`CREATE INDEX idx_seo_stats_idioma ON seo_stats (idioma)`);

  console.log('✅ Migración 114: Rollback completado');
}
