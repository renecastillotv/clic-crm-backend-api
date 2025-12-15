import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add columns for distribution networks and portals
  const hasRedGlobal = await knex.schema.hasColumn('propiedades', 'red_global');
  const hasRedAfiliados = await knex.schema.hasColumn('propiedades', 'red_afiliados');
  const hasConnect = await knex.schema.hasColumn('propiedades', 'connect');
  const hasPortales = await knex.schema.hasColumn('propiedades', 'portales');

  await knex.schema.alterTable('propiedades', (table) => {
    if (!hasRedGlobal) {
      table.boolean('red_global').defaultTo(false);
    }
    if (!hasRedAfiliados) {
      table.boolean('red_afiliados').defaultTo(false);
    }
    if (!hasConnect) {
      table.boolean('connect').defaultTo(false);
    }
    if (!hasPortales) {
      table.jsonb('portales').defaultTo('{}');
    }
  });

  console.log('✅ Added red_global, red_afiliados, connect, portales columns to propiedades');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('propiedades', (table) => {
    table.dropColumn('red_global');
    table.dropColumn('red_afiliados');
    table.dropColumn('connect');
    table.dropColumn('portales');
  });
}
