/**
 * Migration 135: Social Features Expansion
 *
 * Adds columns to social_scheduled_posts for multi-image and error tracking.
 * Creates social_hashtag_groups table for reusable hashtag sets.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add columns to social_scheduled_posts
  await knex.schema.alterTable('social_scheduled_posts', (table) => {
    table.jsonb('image_urls').defaultTo('[]')
      .comment('Array of image URLs for carousel/album posts');
    table.text('error_message').nullable()
      .comment('Error message if publish failed');
  });

  // 2. Create social_hashtag_groups table
  await knex.schema.createTable('social_hashtag_groups', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.specificType('hashtags', 'TEXT[]').notNullable().defaultTo('{}');
    table.string('category', 50).nullable();
    table.uuid('created_by').nullable().references('id').inTable('usuarios').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_social_hashtag_groups_tenant ON social_hashtag_groups (tenant_id)');

  console.log('✅ Social features expansion: image_urls, error_message, social_hashtag_groups');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('social_hashtag_groups');

  await knex.schema.alterTable('social_scheduled_posts', (table) => {
    table.dropColumn('image_urls');
    table.dropColumn('error_message');
  });

  console.log('✅ Rolled back social features expansion');
}
