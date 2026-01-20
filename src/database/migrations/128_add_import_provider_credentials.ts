import { Knex } from 'knex';

/**
 * Migración 128 - Agregar campos para proveedores de importación de propiedades
 *
 * Agrega campos para almacenar las API Keys de:
 * - Alterestate
 * - EasyBroker
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenant_api_credentials', (table) => {
    // Alterestate
    table.text('alterestate_api_key_encrypted').nullable()
      .comment('API Key de Alterestate encriptada');
    table.boolean('alterestate_connected').defaultTo(false);
    table.timestamp('alterestate_last_sync_at').nullable();

    // EasyBroker
    table.text('easybroker_api_key_encrypted').nullable()
      .comment('API Key de EasyBroker encriptada');
    table.boolean('easybroker_connected').defaultTo(false);
    table.timestamp('easybroker_last_sync_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenant_api_credentials', (table) => {
    table.dropColumn('alterestate_api_key_encrypted');
    table.dropColumn('alterestate_connected');
    table.dropColumn('alterestate_last_sync_at');
    table.dropColumn('easybroker_api_key_encrypted');
    table.dropColumn('easybroker_connected');
    table.dropColumn('easybroker_last_sync_at');
  });
}
