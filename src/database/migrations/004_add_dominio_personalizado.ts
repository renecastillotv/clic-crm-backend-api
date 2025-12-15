import { Knex } from 'knex';

/**
 * Migración: Agregar campo dominio_personalizado a tenants
 * 
 * Permite que cada tenant tenga un dominio personalizado
 * Ejemplo: inmobiliariadeltenant.com
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenants', (table) => {
    table.string('dominio_personalizado', 255)
      .nullable()
      .unique()
      .comment('Dominio personalizado del tenant (ej: inmobiliariadeltenant.com)');
    
    table.index('dominio_personalizado', 'idx_tenants_dominio_personalizado');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenants', (table) => {
    table.dropIndex('idx_tenants_dominio_personalizado');
    table.dropColumn('dominio_personalizado');
  });
}


