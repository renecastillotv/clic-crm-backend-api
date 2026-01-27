/**
 * Migration 139: Create Web Chat tables
 *
 * - webchat_config: Per-tenant widget configuration (colors, greeting, position, distribution)
 * - webchat_agents: Per-user availability and capacity for web chat conversations
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // webchat_config: one row per tenant
  await knex.schema.createTable('webchat_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().unique()
      .references('id').inTable('tenants').onDelete('CASCADE');

    table.boolean('enabled').defaultTo(false)
      .comment('Whether the web chat widget is active');
    table.string('api_key', 64).notNullable()
      .comment('API key for widget authentication');
    table.string('widget_color', 7).defaultTo('#3B82F6')
      .comment('Primary color (hex) for the widget UI');
    table.text('greeting_text').defaultTo('Hola! ¿En qué podemos ayudarte?')
      .comment('Initial greeting shown when chat opens');
    table.string('position', 20).defaultTo('bottom-right')
      .comment('Widget position: bottom-right or bottom-left');
    table.string('distribution_mode', 20).defaultTo('round-robin')
      .comment('How to assign chats: round-robin, least-busy, manual');
    table.string('offline_message').defaultTo('No hay agentes disponibles. Deja tu mensaje y te contactaremos.')
      .comment('Message shown when no agents are online');
    table.string('widget_title', 100).defaultTo('Chat')
      .comment('Title displayed in the widget header');
    table.string('widget_subtitle', 200).nullable()
      .comment('Subtitle displayed below the title');
    table.jsonb('business_hours').nullable()
      .comment('Business hours config: { days: [0-6], start: "09:00", end: "18:00" }');

    table.timestamps(true, true);
  });

  // webchat_agents: which users handle web chat and their availability
  await knex.schema.createTable('webchat_agents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable()
      .references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable()
      .references('id').inTable('usuarios').onDelete('CASCADE');

    table.boolean('is_available').defaultTo(false)
      .comment('Whether the agent is currently available to take chats');
    table.integer('max_concurrent_chats').defaultTo(5)
      .comment('Maximum simultaneous chat conversations');
    table.integer('current_chat_count').defaultTo(0)
      .comment('Current active chat conversations');

    table.unique(['tenant_id', 'usuario_id']);
    table.timestamps(true, true);
  });

  // Indexes
  await knex.schema.alterTable('webchat_agents', (table) => {
    table.index(['tenant_id', 'is_available'], 'idx_webchat_agents_available');
  });

  console.log('✅ Created webchat_config and webchat_agents tables');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webchat_agents');
  await knex.schema.dropTableIfExists('webchat_config');
  console.log('✅ Dropped webchat_config and webchat_agents tables');
}
