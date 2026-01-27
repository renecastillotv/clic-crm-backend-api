/**
 * Migration 136: Add Meta IG columns to asesor_social_accounts
 *
 * Adds Instagram Business Account ID and username fields to support
 * per-user Meta publishing (each user connects their own FB/IG account).
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('asesor_social_accounts', (table) => {
    table.string('meta_ig_account_id', 100).nullable()
      .comment('Instagram Business Account ID linked to the Facebook page');
    table.string('meta_ig_username', 100).nullable()
      .comment('Instagram username for display');
  });

  console.log('✅ Added meta_ig_account_id and meta_ig_username to asesor_social_accounts');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('asesor_social_accounts', (table) => {
    table.dropColumn('meta_ig_account_id');
    table.dropColumn('meta_ig_username');
  });

  console.log('✅ Rolled back meta_ig columns from asesor_social_accounts');
}
