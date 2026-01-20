import { Knex } from 'knex';

/**
 * Migración 045 - Agregar visibilidad y feature requerido a roles
 *
 * Permite que los roles de tenant puedan:
 * - Ser visibles o no visibles
 * - Requerir un feature específico para ser visibles
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('roles', (table) => {
    table.boolean('visible').defaultTo(true).comment('Si el rol es visible para los tenants');
    table.string('feature_requerido', 100).nullable().comment('Código del feature requerido (name de features) para que el rol sea visible');
    
    table.index('visible', 'idx_roles_visible');
    table.index('feature_requerido', 'idx_roles_feature_requerido');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('roles', (table) => {
    table.dropIndex('feature_requerido', 'idx_roles_feature_requerido');
    table.dropIndex('visible', 'idx_roles_visible');
    table.dropColumn('feature_requerido');
    table.dropColumn('visible');
  });
}














