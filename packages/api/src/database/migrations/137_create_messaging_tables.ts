/**
 * Migration 137: Create Messaging Tables
 *
 * Creates the core tables for the unified messaging system:
 * - conversaciones: Unified inbox (all channels: WhatsApp, IG DM, FB DM, Web Chat, Email)
 * - mensajes: Messages within conversations
 * - mensajeria_etiquetas: Per-tenant labels for conversations
 * - mensajeria_firmas: Per-user email signatures
 * - user_email_credentials: Per-user IMAP/SMTP credentials (MXRoute)
 *
 * Per-user scoping: Each user manages their own conversations.
 * usuario_asignado_id links conversations to the user who owns them.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Conversaciones - unified inbox
  await knex.schema.createTable('conversaciones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.enu('canal', ['whatsapp', 'instagram_dm', 'facebook_dm', 'web_chat', 'email'])
      .notNullable().comment('Source channel of the conversation');
    table.string('external_conversation_id', 255).nullable()
      .comment('External platform conversation ID (e.g. FB thread ID)');
    table.string('external_participant_id', 255).nullable()
      .comment('External participant ID (e.g. PSID, WA phone number)');
    table.uuid('contacto_id').nullable().references('id').inTable('contactos').onDelete('SET NULL')
      .comment('Linked CRM contact (if known)');
    table.string('contacto_nombre', 255).nullable()
      .comment('Display name of the external participant');
    table.text('contacto_avatar_url').nullable();
    table.uuid('usuario_asignado_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL')
      .comment('User who owns/manages this conversation');
    table.enu('estado', ['abierta', 'cerrada', 'archivada', 'spam'])
      .notNullable().defaultTo('abierta');
    table.integer('no_leidos').notNullable().defaultTo(0);
    table.text('ultimo_mensaje_texto').nullable();
    table.timestamp('ultimo_mensaje_at').nullable();
    table.boolean('ultimo_mensaje_es_entrante').nullable();
    table.uuid('etiqueta_id').nullable()
      .comment('FK to mensajeria_etiquetas (set after table creation)');
    table.jsonb('metadata').defaultTo('{}')
      .comment('Channel-specific metadata (e.g. WA phone, IG username)');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint: one conversation per channel + external ID per tenant
    table.unique(['tenant_id', 'canal', 'external_conversation_id']);
  });

  // Indexes for conversaciones
  await knex.schema.raw('CREATE INDEX idx_conversaciones_tenant ON conversaciones (tenant_id)');
  await knex.schema.raw('CREATE INDEX idx_conversaciones_usuario ON conversaciones (usuario_asignado_id)');
  await knex.schema.raw('CREATE INDEX idx_conversaciones_tenant_usuario ON conversaciones (tenant_id, usuario_asignado_id)');
  await knex.schema.raw('CREATE INDEX idx_conversaciones_estado ON conversaciones (tenant_id, estado)');
  await knex.schema.raw('CREATE INDEX idx_conversaciones_ultimo_mensaje ON conversaciones (tenant_id, ultimo_mensaje_at DESC NULLS LAST)');

  // 2. Mensajes - messages within conversations
  await knex.schema.createTable('mensajes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversacion_id').notNullable().references('id').inTable('conversaciones').onDelete('CASCADE');
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.boolean('es_entrante').notNullable().defaultTo(true)
      .comment('true = incoming from external, false = outgoing from agent');
    table.string('remitente_nombre', 255).nullable();
    table.string('remitente_id', 255).nullable()
      .comment('User ID or external participant ID of the sender');
    table.enu('tipo', ['text', 'image', 'video', 'audio', 'document', 'email'])
      .notNullable().defaultTo('text');
    table.text('contenido').nullable().comment('Message body (text or HTML for email)');
    table.text('contenido_plain').nullable().comment('Plain text version (for email)');

    // Email-specific fields
    table.string('email_asunto', 500).nullable();
    table.string('email_de', 500).nullable();
    table.string('email_para', 500).nullable();
    table.text('email_cc').nullable();
    table.text('email_bcc').nullable();
    table.string('email_message_id', 500).nullable().comment('RFC Message-ID header');
    table.string('email_in_reply_to', 500).nullable().comment('RFC In-Reply-To header');
    table.text('email_references').nullable().comment('RFC References header');

    // General fields
    table.jsonb('adjuntos').defaultTo('[]')
      .comment('Array of {url, name, type, size}');
    table.string('external_message_id', 255).nullable()
      .comment('External platform message ID');
    table.enu('estado', ['enviado', 'entregado', 'leido', 'fallido']).nullable();
    table.text('error_mensaje').nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Indexes for mensajes
  await knex.schema.raw('CREATE INDEX idx_mensajes_conversacion ON mensajes (conversacion_id, created_at DESC)');
  await knex.schema.raw('CREATE INDEX idx_mensajes_tenant ON mensajes (tenant_id)');
  await knex.schema.raw('CREATE INDEX idx_mensajes_external ON mensajes (external_message_id) WHERE external_message_id IS NOT NULL');

  // 3. Mensajeria Etiquetas - per-tenant labels
  await knex.schema.createTable('mensajeria_etiquetas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('codigo', 50).notNullable();
    table.string('nombre', 100).notNullable();
    table.string('color', 20).notNullable().defaultTo('#94a3b8');
    table.boolean('es_default').notNullable().defaultTo(false);
    table.integer('orden').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['tenant_id', 'codigo']);
  });

  await knex.schema.raw('CREATE INDEX idx_mensajeria_etiquetas_tenant ON mensajeria_etiquetas (tenant_id)');

  // Now add FK from conversaciones.etiqueta_id to mensajeria_etiquetas
  await knex.schema.alterTable('conversaciones', (table) => {
    table.foreign('etiqueta_id').references('id').inTable('mensajeria_etiquetas').onDelete('SET NULL');
  });

  // 4. Mensajeria Firmas - per-user email signatures
  await knex.schema.createTable('mensajeria_firmas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.string('nombre', 100).notNullable().defaultTo('Principal');
    table.text('contenido_html').notNullable().defaultTo('');
    table.boolean('es_default').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_mensajeria_firmas_usuario ON mensajeria_firmas (usuario_id)');

  // 5. User Email Credentials - per-user IMAP/SMTP (MXRoute)
  await knex.schema.createTable('user_email_credentials', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.string('email_address', 255).notNullable();
    table.string('display_name', 255).nullable();

    // IMAP credentials (encrypted)
    table.string('imap_host', 255).notNullable().defaultTo('mail.mxroute.com');
    table.integer('imap_port').notNullable().defaultTo(993);
    table.string('imap_username', 255).nullable();
    table.text('imap_password_encrypted').nullable();
    table.boolean('imap_secure').notNullable().defaultTo(true);

    // SMTP credentials (encrypted)
    table.string('smtp_host', 255).notNullable().defaultTo('mail.mxroute.com');
    table.integer('smtp_port').notNullable().defaultTo(465);
    table.string('smtp_username', 255).nullable();
    table.text('smtp_password_encrypted').nullable();
    table.boolean('smtp_secure').notNullable().defaultTo(true);

    // Sync state
    table.boolean('is_connected').notNullable().defaultTo(false);
    table.timestamp('last_sync_at').nullable();
    table.string('last_sync_uid', 100).nullable().comment('Last IMAP UID synced (incremental)');
    table.text('last_error').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['usuario_id']);
  });

  await knex.schema.raw('CREATE INDEX idx_user_email_creds_tenant ON user_email_credentials (tenant_id)');
  await knex.schema.raw('CREATE INDEX idx_user_email_creds_connected ON user_email_credentials (is_connected) WHERE is_connected = true');

  console.log('✅ Created messaging tables: conversaciones, mensajes, mensajeria_etiquetas, mensajeria_firmas, user_email_credentials');
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse order due to FK dependencies
  await knex.schema.dropTableIfExists('user_email_credentials');
  await knex.schema.dropTableIfExists('mensajeria_firmas');

  // Remove FK from conversaciones before dropping etiquetas
  await knex.schema.alterTable('conversaciones', (table) => {
    table.dropForeign('etiqueta_id');
  });

  await knex.schema.dropTableIfExists('mensajeria_etiquetas');
  await knex.schema.dropTableIfExists('mensajes');
  await knex.schema.dropTableIfExists('conversaciones');

  console.log('✅ Dropped messaging tables');
}
