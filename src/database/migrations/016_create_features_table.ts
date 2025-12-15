import { Knex } from 'knex';

/**
 * Migración: Crear tabla de features
 * 
 * Los features controlan qué funcionalidades y módulos están disponibles
 * para cada tenant basándose en su plan.
 */
export async function up(knex: Knex): Promise<void> {
  // Crear tabla de features
  await knex.schema.createTable('features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().comment('Nombre del feature');
    table.text('description').nullable().comment('Descripción del feature');
    table.string('icon', 50).defaultTo('puzzle').comment('Icono del feature');
    table.string('category', 50).defaultTo('addon').comment('Categoría: integration, training, reporting, ai, addon');
    table.boolean('is_public').defaultTo(false).comment('Si es público (visible para todos los tenants)');
    table.boolean('is_premium').defaultTo(true).comment('Si es premium (requiere plan premium)');
    table.jsonb('available_in_plans').defaultTo('[]').comment('Array de planes donde está disponible: ["basic", "pro", "premium", "enterprise"]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('category', 'idx_features_category');
    table.index('is_public', 'idx_features_is_public');
    table.index('is_premium', 'idx_features_is_premium');
  });

  // Crear tabla de relación tenant-features (features habilitados manualmente)
  await knex.schema.createTable('tenants_features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('feature_id').notNullable().references('id').inTable('features').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['tenant_id', 'feature_id'], 'idx_tenants_features_unique');
    table.index('tenant_id', 'idx_tenants_features_tenant');
    table.index('feature_id', 'idx_tenants_features_feature');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tenants_features');
  await knex.schema.dropTableIfExists('features');
}

