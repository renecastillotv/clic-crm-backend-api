import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add commission observation field to propiedades
  const hasRedGlobalComision = await knex.schema.hasColumn('propiedades', 'red_global_comision');

  if (!hasRedGlobalComision) {
    await knex.schema.alterTable('propiedades', (table) => {
      table.text('red_global_comision').nullable();
    });
  }

  // Add default commission texts to tenants table
  const hasRedGlobalComisionDefault = await knex.schema.hasColumn('tenants', 'red_global_comision_default');
  const hasConnectComisionDefault = await knex.schema.hasColumn('tenants', 'connect_comision_default');

  if (!hasRedGlobalComisionDefault || !hasConnectComisionDefault) {
    await knex.schema.alterTable('tenants', (table) => {
      if (!hasRedGlobalComisionDefault) {
        table.text('red_global_comision_default').nullable();
      }
      if (!hasConnectComisionDefault) {
        table.text('connect_comision_default').nullable();
      }
    });
  }

  console.log('✅ Added red_global_comision to propiedades and commission defaults to tenants');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('propiedades', (table) => {
    table.dropColumn('red_global_comision');
  });

  await knex.schema.alterTable('tenants', (table) => {
    table.dropColumn('red_global_comision_default');
    table.dropColumn('connect_comision_default');
  });
}
