import { Knex } from 'knex';

/**
 * Migración: Agregar campo plan a tenants
 */
export async function up(knex: Knex): Promise<void> {
  // Verificar si la columna ya existe
  const hasPlan = await knex.schema.hasColumn('tenants', 'plan');
  
  if (!hasPlan) {
    await knex.schema.alterTable('tenants', (table) => {
      table.string('plan', 50)
        .defaultTo('basic')
        .comment('Plan del tenant: basic, pro, premium, enterprise');
      
      table.index('plan', 'idx_tenants_plan');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenants', (table) => {
    table.dropIndex('plan', 'idx_tenants_plan');
    table.dropColumn('plan');
  });
}

