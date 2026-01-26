/**
 * Migration 134: Create social_scheduled_posts table
 *
 * Tracks scheduled social media posts for Facebook Pages.
 * Facebook supports native scheduling via scheduled_publish_time parameter.
 * This table stores the record for UI management (view, cancel).
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('social_scheduled_posts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Platform & Meta reference
    table.string('platform', 20).notNullable().defaultTo('facebook');
    table.string('meta_post_id', 255).nullable()
      .comment('Post ID returned by Meta Graph API for the scheduled post');

    // Content
    table.text('message').nullable();
    table.text('image_url').nullable();
    table.text('link_url').nullable();

    // Property link (optional)
    table.uuid('propiedad_id').nullable().references('id').inTable('propiedades').onDelete('SET NULL');

    // Schedule
    table.timestamp('scheduled_for').notNullable()
      .comment('When the post is scheduled to publish (UTC)');
    table.string('status', 30).notNullable().defaultTo('scheduled')
      .comment('scheduled | published | cancelled | failed');

    // Meta API response
    table.jsonb('meta_response').defaultTo('{}');

    // Audit
    table.uuid('created_by').nullable().references('id').inTable('usuarios').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Indexes
  await knex.schema.raw('CREATE INDEX idx_social_scheduled_posts_tenant ON social_scheduled_posts (tenant_id)');
  await knex.schema.raw('CREATE INDEX idx_social_scheduled_posts_status ON social_scheduled_posts (status)');
  await knex.schema.raw('CREATE INDEX idx_social_scheduled_posts_scheduled_for ON social_scheduled_posts (scheduled_for)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('social_scheduled_posts');
}
