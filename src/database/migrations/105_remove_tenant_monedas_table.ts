import { Knex } from 'knex';

/**
 * Elimina la tabla tenant_monedas y agrega campo JSON en tenants
 * Las monedas habilitadas se guardarán como:
 * monedas_habilitadas: [{ codigo: "USD", esDefault: true }, { codigo: "DOP" }]
 */
export async function up(knex: Knex): Promise<void> {
  // Eliminar la tabla tenant_monedas si existe
  await knex.schema.dropTableIfExists('tenant_monedas');

  // Agregar campo monedas_habilitadas a tenants
  const hasMonedas = await knex.schema.hasColumn('tenants', 'monedas_habilitadas');
  if (!hasMonedas) {
    await knex.schema.alterTable('tenants', (table) => {
      table.jsonb('monedas_habilitadas').nullable().comment('Array de monedas habilitadas: [{codigo, esDefault, orden}]');
    });
  }

  console.log('✅ Removed tenant_monedas table, added monedas_habilitadas to tenants');
}

export async function down(knex: Knex): Promise<void> {
  // Remover el campo
  const hasMonedas = await knex.schema.hasColumn('tenants', 'monedas_habilitadas');
  if (hasMonedas) {
    await knex.schema.alterTable('tenants', (table) => {
      table.dropColumn('monedas_habilitadas');
    });
  }

  // Recrear la tabla si es necesario
  const hasTable = await knex.schema.hasTable('tenant_monedas');
  if (!hasTable) {
    await knex.schema.createTable('tenant_monedas', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('moneda_codigo', 3).notNullable().references('codigo').inTable('cat_monedas').onDelete('CASCADE');
      table.boolean('es_default').defaultTo(false);
      table.integer('orden').defaultTo(0);
      table.boolean('activo').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'moneda_codigo']);
    });
  }
}
