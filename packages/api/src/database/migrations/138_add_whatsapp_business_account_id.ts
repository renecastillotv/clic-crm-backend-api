/**
 * Migration 138: Add WhatsApp Business Account ID to tenant_api_credentials
 *
 * Adds the WABA ID field needed for WhatsApp Cloud API operations
 * (message templates, webhook subscriptions, phone number management).
 * The phone_number_id, access_token, and connected fields already exist from migration 125.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenant_api_credentials', (table) => {
    table.string('whatsapp_business_account_id', 50).nullable()
      .comment('WhatsApp Business Account ID (WABA) for Cloud API');
  });

  console.log('✅ Added whatsapp_business_account_id to tenant_api_credentials');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenant_api_credentials', (table) => {
    table.dropColumn('whatsapp_business_account_id');
  });

  console.log('✅ Rolled back whatsapp_business_account_id from tenant_api_credentials');
}
