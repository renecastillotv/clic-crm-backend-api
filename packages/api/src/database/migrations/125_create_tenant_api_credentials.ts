import { Knex } from 'knex';

/**
 * Migración 125 - Crear tabla de credenciales API por tenant
 *
 * Esta tabla almacena las credenciales de APIs externas para cada tenant,
 * permitiendo que cada inmobiliaria configure sus propias cuentas de:
 * - Google (Search Console, Ads)
 * - Meta (Facebook, Instagram, Ads)
 * - Email providers (Mailchimp, SendGrid, etc.)
 *
 * IMPORTANTE: Los tokens y secrets deben ser encriptados antes de almacenarse
 */

export async function up(knex: Knex): Promise<void> {
  // ==================== TABLA PRINCIPAL: CREDENCIALES API POR TENANT ====================
  await knex.schema.createTable('tenant_api_credentials', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // ==================== GOOGLE APIs ====================
    // Google API Key compartida (Maps, Places, Geocoding) - opcional por tenant
    table.text('google_api_key_encrypted').nullable()
      .comment('API Key de Google encriptada (opcional, usa la del sistema si está vacía)');

    // Google Search Console
    table.text('google_search_console_refresh_token_encrypted').nullable()
      .comment('Refresh token OAuth para Search Console');
    table.string('google_search_console_site_url', 500).nullable()
      .comment('URL del sitio verificado en Search Console');
    table.timestamp('google_search_console_token_expires_at').nullable();
    table.boolean('google_search_console_connected').defaultTo(false);

    // Google Ads
    table.text('google_ads_refresh_token_encrypted').nullable()
      .comment('Refresh token OAuth para Google Ads');
    table.string('google_ads_customer_id', 50).nullable()
      .comment('ID de cliente de Google Ads (formato: 123-456-7890)');
    table.string('google_ads_manager_id', 50).nullable()
      .comment('ID de cuenta manager MCC si aplica');
    table.timestamp('google_ads_token_expires_at').nullable();
    table.boolean('google_ads_connected').defaultTo(false);

    // ==================== META APIs ====================
    // Facebook/Instagram Business
    table.text('meta_page_access_token_encrypted').nullable()
      .comment('Page Access Token de Facebook (long-lived)');
    table.string('meta_page_id', 50).nullable()
      .comment('ID de la página de Facebook');
    table.string('meta_page_name', 255).nullable()
      .comment('Nombre de la página de Facebook');
    table.string('meta_instagram_business_account_id', 50).nullable()
      .comment('ID de cuenta business de Instagram');
    table.string('meta_instagram_username', 100).nullable()
      .comment('Username de Instagram');
    table.timestamp('meta_token_expires_at').nullable();
    table.boolean('meta_connected').defaultTo(false);

    // Meta Ads
    table.text('meta_ads_access_token_encrypted').nullable()
      .comment('Access Token para Meta Ads API');
    table.string('meta_ad_account_id', 50).nullable()
      .comment('ID de cuenta publicitaria (formato: act_123456789)');
    table.string('meta_business_id', 50).nullable()
      .comment('ID del Business Manager');
    table.timestamp('meta_ads_token_expires_at').nullable();
    table.boolean('meta_ads_connected').defaultTo(false);

    // ==================== EMAIL PROVIDERS ====================
    table.enum('email_provider', ['mailchimp', 'sendgrid', 'mailjet', 'ses', 'smtp', 'none'])
      .defaultTo('none')
      .comment('Proveedor de email marketing');
    table.text('email_api_key_encrypted').nullable()
      .comment('API Key del proveedor de email');
    table.string('email_sender_name', 255).nullable()
      .comment('Nombre del remitente');
    table.string('email_sender_email', 255).nullable()
      .comment('Email del remitente');
    table.string('email_list_id', 100).nullable()
      .comment('ID de lista/audiencia por defecto');
    table.boolean('email_connected').defaultTo(false);

    // ==================== SMTP PERSONALIZADO ====================
    table.string('smtp_host', 255).nullable();
    table.integer('smtp_port').nullable();
    table.string('smtp_username', 255).nullable();
    table.text('smtp_password_encrypted').nullable();
    table.boolean('smtp_secure').defaultTo(true);

    // ==================== CONFIGURACIONES ADICIONALES ====================
    // WhatsApp Business (para futuro)
    table.string('whatsapp_phone_number_id', 50).nullable();
    table.text('whatsapp_access_token_encrypted').nullable();
    table.boolean('whatsapp_connected').defaultTo(false);

    // ==================== AUDITORÍA Y CONTROL ====================
    table.uuid('connected_by').nullable()
      .references('id').inTable('usuarios').onDelete('SET NULL')
      .comment('Usuario que conectó las APIs');
    table.timestamp('last_sync_at').nullable()
      .comment('Última sincronización exitosa');
    table.jsonb('connection_errors').nullable()
      .comment('Registro de errores de conexión recientes');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.unique(['tenant_id'], 'uq_tenant_api_credentials_tenant');
    table.index(['google_search_console_connected'], 'idx_tenant_api_gsc_connected');
    table.index(['meta_connected'], 'idx_tenant_api_meta_connected');
    table.index(['email_connected'], 'idx_tenant_api_email_connected');
  });

  // ==================== TABLA DE CUENTAS DE ASESORES ====================
  // Para permitir que cada asesor conecte sus propias redes sociales
  await knex.schema.createTable('asesor_social_accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');

    // Tipo de cuenta
    table.enum('platform', ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'])
      .notNullable();

    // Credenciales
    table.text('access_token_encrypted').notNullable();
    table.string('account_id', 100).nullable();
    table.string('account_name', 255).nullable();
    table.string('account_username', 100).nullable();
    table.string('profile_picture_url', 500).nullable();

    // Estado
    table.timestamp('token_expires_at').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_used_at').nullable();
    table.text('last_error').nullable();

    // Permisos otorgados
    table.specificType('scopes', 'text[]').nullable()
      .comment('Permisos/scopes otorgados por el usuario');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.unique(['usuario_id', 'platform'], 'uq_asesor_social_account_platform');
    table.index(['tenant_id', 'platform'], 'idx_asesor_social_tenant_platform');
    table.index(['is_active'], 'idx_asesor_social_active');
  });

  // ==================== TABLA DE LOGS DE USO DE API ====================
  // Para tracking de uso y límites
  await knex.schema.createTable('api_usage_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').nullable().references('id').inTable('usuarios').onDelete('SET NULL');

    // Información del request
    table.enum('api_provider', ['google_maps', 'google_search_console', 'google_ads', 'meta', 'meta_ads', 'email', 'whatsapp'])
      .notNullable();
    table.string('endpoint', 500).notNullable();
    table.enum('method', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).defaultTo('GET');

    // Resultado
    table.boolean('success').defaultTo(true);
    table.integer('status_code').nullable();
    table.text('error_message').nullable();

    // Métricas
    table.integer('response_time_ms').nullable();
    table.integer('credits_used').defaultTo(1).comment('Créditos/unidades consumidas');

    // Timestamp
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Índices para reportes
    table.index(['tenant_id', 'api_provider', 'created_at'], 'idx_api_usage_tenant_provider_date');
    table.index(['created_at'], 'idx_api_usage_date');
  });

  // ==================== CREAR REGISTRO VACÍO PARA TENANTS EXISTENTES ====================
  const tenants = await knex('tenants').select('id');

  for (const tenant of tenants) {
    const exists = await knex('tenant_api_credentials')
      .where({ tenant_id: tenant.id })
      .first();

    if (!exists) {
      await knex('tenant_api_credentials').insert({
        tenant_id: tenant.id
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_usage_logs');
  await knex.schema.dropTableIfExists('asesor_social_accounts');
  await knex.schema.dropTableIfExists('tenant_api_credentials');
}
