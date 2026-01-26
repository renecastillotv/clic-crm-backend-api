/**
 * Servicio para gestionar las credenciales de APIs externas por tenant
 *
 * Este servicio maneja la encriptación/desencriptación de tokens y claves API,
 * así como las operaciones CRUD para las credenciales de cada tenant.
 */

import { query, transaction } from '../utils/db.js';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Clave de encriptación derivada del secreto del servidor
const ENCRYPTION_KEY = process.env.API_CREDENTIALS_SECRET || process.env.JWT_SECRET || 'default-dev-key-change-in-production';

// ==================== TIPOS ====================

export interface TenantApiCredentials {
  id: string;
  tenantId: string;

  // Google Search Console
  googleSearchConsoleConnected: boolean;
  googleSearchConsoleSiteUrl?: string;
  googleSearchConsoleTokenExpiresAt?: Date;

  // Google Ads
  googleAdsConnected: boolean;
  googleAdsCustomerId?: string;
  googleAdsManagerId?: string;
  googleAdsTokenExpiresAt?: Date;

  // Meta (Facebook/Instagram)
  metaConnected: boolean;
  metaPageId?: string;
  metaPageName?: string;
  metaInstagramBusinessAccountId?: string;
  metaInstagramUsername?: string;
  metaTokenExpiresAt?: Date;

  // Meta Ads
  metaAdsConnected: boolean;
  metaAdAccountId?: string;
  metaBusinessId?: string;
  metaAdsTokenExpiresAt?: Date;

  // Email
  emailProvider: 'mailchimp' | 'sendgrid' | 'mailjet' | 'ses' | 'smtp' | 'none';
  emailConnected: boolean;
  emailSenderName?: string;
  emailSenderEmail?: string;
  emailListId?: string;

  // SMTP
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpSecure?: boolean;

  // WhatsApp
  whatsappConnected: boolean;
  whatsappPhoneNumberId?: string;

  // Auditoría
  connectedBy?: string;
  lastSyncAt?: Date;
  connectionErrors?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AsesorSocialAccount {
  id: string;
  tenantId: string;
  usuarioId: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube';
  accountId?: string;
  accountName?: string;
  accountUsername?: string;
  profilePictureUrl?: string;
  tokenExpiresAt?: Date;
  isActive: boolean;
  lastUsedAt?: Date;
  lastError?: string;
  scopes?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== ENCRIPTACIÓN ====================

/**
 * Deriva una clave de 32 bytes del secreto usando scrypt
 */
async function deriveKey(): Promise<Buffer> {
  const salt = 'tenant-api-credentials-salt'; // Salt fijo para consistencia
  return (await scryptAsync(ENCRYPTION_KEY, salt, 32)) as Buffer;
}

/**
 * Encripta un valor sensible (token, API key, password)
 */
export async function encryptValue(value: string): Promise<string> {
  if (!value) return '';

  const key = await deriveKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Retorna IV + encrypted (IV necesario para desencriptar)
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Desencripta un valor encriptado
 */
export async function decryptValue(encryptedValue: string): Promise<string> {
  if (!encryptedValue || !encryptedValue.includes(':')) return '';

  try {
    const key = await deriveKey();
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error desencriptando valor:', error);
    return '';
  }
}

// ==================== CREDENCIALES DEL TENANT ====================

/**
 * Obtiene las credenciales de API de un tenant (sin datos sensibles)
 */
export async function getTenantApiCredentials(tenantId: string): Promise<TenantApiCredentials | null> {
  const sql = `
    SELECT
      id,
      tenant_id as "tenantId",
      -- Google Search Console
      google_search_console_connected as "googleSearchConsoleConnected",
      google_search_console_site_url as "googleSearchConsoleSiteUrl",
      google_search_console_token_expires_at as "googleSearchConsoleTokenExpiresAt",
      -- Google Ads
      google_ads_connected as "googleAdsConnected",
      google_ads_customer_id as "googleAdsCustomerId",
      google_ads_manager_id as "googleAdsManagerId",
      google_ads_token_expires_at as "googleAdsTokenExpiresAt",
      -- Meta
      meta_connected as "metaConnected",
      meta_page_id as "metaPageId",
      meta_page_name as "metaPageName",
      meta_instagram_business_account_id as "metaInstagramBusinessAccountId",
      meta_instagram_username as "metaInstagramUsername",
      meta_token_expires_at as "metaTokenExpiresAt",
      -- Meta Ads
      meta_ads_connected as "metaAdsConnected",
      meta_ad_account_id as "metaAdAccountId",
      meta_business_id as "metaBusinessId",
      meta_ads_token_expires_at as "metaAdsTokenExpiresAt",
      -- Email
      email_provider as "emailProvider",
      email_connected as "emailConnected",
      email_sender_name as "emailSenderName",
      email_sender_email as "emailSenderEmail",
      email_list_id as "emailListId",
      -- SMTP
      smtp_host as "smtpHost",
      smtp_port as "smtpPort",
      smtp_username as "smtpUsername",
      smtp_secure as "smtpSecure",
      -- WhatsApp
      whatsapp_connected as "whatsappConnected",
      whatsapp_phone_number_id as "whatsappPhoneNumberId",
      -- Auditoría
      connected_by as "connectedBy",
      last_sync_at as "lastSyncAt",
      connection_errors as "connectionErrors",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM tenant_api_credentials
    WHERE tenant_id = $1
  `;

  const result = await query(sql, [tenantId]);
  return result.rows[0] || null;
}

/**
 * Guarda las credenciales de Google Search Console
 */
export async function saveGoogleSearchConsoleCredentials(
  tenantId: string,
  refreshToken: string,
  siteUrl: string,
  connectedBy: string
): Promise<void> {
  const encryptedToken = await encryptValue(refreshToken);

  const sql = `
    UPDATE tenant_api_credentials
    SET
      google_search_console_refresh_token_encrypted = $1,
      google_search_console_site_url = $2,
      google_search_console_connected = true,
      google_search_console_token_expires_at = NOW() + INTERVAL '1 year',
      connected_by = $3,
      updated_at = NOW()
    WHERE tenant_id = $4
  `;

  await query(sql, [encryptedToken, siteUrl, connectedBy, tenantId]);
}

/**
 * Actualiza solo el site URL de Google Search Console (sin tocar token ni connected_by)
 */
export async function updateGoogleSearchConsoleSiteUrl(
  tenantId: string,
  siteUrl: string
): Promise<void> {
  const sql = `
    UPDATE tenant_api_credentials
    SET
      google_search_console_site_url = $1,
      updated_at = NOW()
    WHERE tenant_id = $2
  `;

  await query(sql, [siteUrl, tenantId]);
}

/**
 * Obtiene el refresh token de Google Search Console (desencriptado)
 */
export async function getGoogleSearchConsoleToken(tenantId: string): Promise<string | null> {
  const sql = `
    SELECT google_search_console_refresh_token_encrypted
    FROM tenant_api_credentials
    WHERE tenant_id = $1 AND google_search_console_connected = true
  `;

  const result = await query(sql, [tenantId]);
  if (!result.rows[0]?.google_search_console_refresh_token_encrypted) {
    return null;
  }

  return decryptValue(result.rows[0].google_search_console_refresh_token_encrypted);
}

/**
 * Desconecta Google Search Console
 */
export async function disconnectGoogleSearchConsole(tenantId: string): Promise<void> {
  const sql = `
    UPDATE tenant_api_credentials
    SET
      google_search_console_refresh_token_encrypted = NULL,
      google_search_console_site_url = NULL,
      google_search_console_connected = false,
      google_search_console_token_expires_at = NULL,
      updated_at = NOW()
    WHERE tenant_id = $1
  `;

  await query(sql, [tenantId]);
}

/**
 * Guarda las credenciales de Google Ads
 */
export async function saveGoogleAdsCredentials(
  tenantId: string,
  refreshToken: string,
  customerId: string,
  managerId: string | null,
  connectedBy: string
): Promise<void> {
  const encryptedToken = await encryptValue(refreshToken);

  const sql = `
    UPDATE tenant_api_credentials
    SET
      google_ads_refresh_token_encrypted = $1,
      google_ads_customer_id = $2,
      google_ads_manager_id = $3,
      google_ads_connected = true,
      google_ads_token_expires_at = NOW() + INTERVAL '1 year',
      connected_by = $4,
      updated_at = NOW()
    WHERE tenant_id = $5
  `;

  await query(sql, [encryptedToken, customerId, managerId, connectedBy, tenantId]);
}

/**
 * Obtiene el refresh token de Google Ads (desencriptado)
 */
export async function getGoogleAdsToken(tenantId: string): Promise<{
  refreshToken: string;
  customerId: string;
  managerId?: string;
} | null> {
  const sql = `
    SELECT
      google_ads_refresh_token_encrypted,
      google_ads_customer_id,
      google_ads_manager_id
    FROM tenant_api_credentials
    WHERE tenant_id = $1 AND google_ads_connected = true
  `;

  const result = await query(sql, [tenantId]);
  if (!result.rows[0]?.google_ads_refresh_token_encrypted) {
    return null;
  }

  return {
    refreshToken: await decryptValue(result.rows[0].google_ads_refresh_token_encrypted),
    customerId: result.rows[0].google_ads_customer_id,
    managerId: result.rows[0].google_ads_manager_id || undefined
  };
}

/**
 * Desconecta Google Ads
 */
export async function disconnectGoogleAds(tenantId: string): Promise<void> {
  const sql = `
    UPDATE tenant_api_credentials
    SET
      google_ads_refresh_token_encrypted = NULL,
      google_ads_customer_id = NULL,
      google_ads_manager_id = NULL,
      google_ads_connected = false,
      google_ads_token_expires_at = NULL,
      updated_at = NOW()
    WHERE tenant_id = $1
  `;

  await query(sql, [tenantId]);
}

/**
 * Guarda las credenciales de Meta (Facebook/Instagram)
 */
export async function saveMetaCredentials(
  tenantId: string,
  pageAccessToken: string,
  pageId: string,
  pageName: string,
  instagramAccountId: string | null,
  instagramUsername: string | null,
  connectedBy?: string | null
): Promise<void> {
  const encryptedToken = await encryptValue(pageAccessToken);

  if (connectedBy) {
    const sql = `
      UPDATE tenant_api_credentials
      SET
        meta_page_access_token_encrypted = $1,
        meta_page_id = $2,
        meta_page_name = $3,
        meta_instagram_business_account_id = $4,
        meta_instagram_username = $5,
        meta_connected = true,
        meta_token_expires_at = NOW() + INTERVAL '60 days',
        connected_by = $6,
        updated_at = NOW()
      WHERE tenant_id = $7
    `;
    await query(sql, [encryptedToken, pageId, pageName, instagramAccountId, instagramUsername, connectedBy, tenantId]);
  } else {
    const sql = `
      UPDATE tenant_api_credentials
      SET
        meta_page_access_token_encrypted = $1,
        meta_page_id = $2,
        meta_page_name = $3,
        meta_instagram_business_account_id = $4,
        meta_instagram_username = $5,
        meta_connected = true,
        meta_token_expires_at = NOW() + INTERVAL '60 days',
        updated_at = NOW()
      WHERE tenant_id = $6
    `;
    await query(sql, [encryptedToken, pageId, pageName, instagramAccountId, instagramUsername, tenantId]);
  }
}

/**
 * Obtiene el Page Access Token de Meta (desencriptado)
 */
export async function getMetaPageToken(tenantId: string): Promise<{
  pageAccessToken: string;
  pageId: string;
  instagramAccountId?: string;
} | null> {
  const sql = `
    SELECT
      meta_page_access_token_encrypted,
      meta_page_id,
      meta_instagram_business_account_id
    FROM tenant_api_credentials
    WHERE tenant_id = $1 AND meta_connected = true
  `;

  const result = await query(sql, [tenantId]);
  if (!result.rows[0]?.meta_page_access_token_encrypted) {
    return null;
  }

  return {
    pageAccessToken: await decryptValue(result.rows[0].meta_page_access_token_encrypted),
    pageId: result.rows[0].meta_page_id,
    instagramAccountId: result.rows[0].meta_instagram_business_account_id || undefined
  };
}

/**
 * Desconecta Meta
 */
export async function disconnectMeta(tenantId: string): Promise<void> {
  const sql = `
    UPDATE tenant_api_credentials
    SET
      meta_page_access_token_encrypted = NULL,
      meta_page_id = NULL,
      meta_page_name = NULL,
      meta_instagram_business_account_id = NULL,
      meta_instagram_username = NULL,
      meta_connected = false,
      meta_token_expires_at = NULL,
      updated_at = NOW()
    WHERE tenant_id = $1
  `;

  await query(sql, [tenantId]);
}

/**
 * Guarda las credenciales de Meta Ads
 */
export async function saveMetaAdsCredentials(
  tenantId: string,
  accessToken: string,
  adAccountId: string,
  businessId: string | null,
  connectedBy: string
): Promise<void> {
  const encryptedToken = await encryptValue(accessToken);

  const sql = `
    UPDATE tenant_api_credentials
    SET
      meta_ads_access_token_encrypted = $1,
      meta_ad_account_id = $2,
      meta_business_id = $3,
      meta_ads_connected = true,
      meta_ads_token_expires_at = NOW() + INTERVAL '60 days',
      connected_by = $4,
      updated_at = NOW()
    WHERE tenant_id = $5
  `;

  await query(sql, [encryptedToken, adAccountId, businessId, connectedBy, tenantId]);
}

/**
 * Obtiene el access token de Meta Ads (desencriptado)
 */
export async function getMetaAdsToken(tenantId: string): Promise<{
  accessToken: string;
  adAccountId: string;
  businessId?: string;
} | null> {
  const sql = `
    SELECT
      meta_ads_access_token_encrypted,
      meta_ad_account_id,
      meta_business_id
    FROM tenant_api_credentials
    WHERE tenant_id = $1 AND meta_ads_connected = true
  `;

  const result = await query(sql, [tenantId]);
  if (!result.rows[0]?.meta_ads_access_token_encrypted) {
    return null;
  }

  return {
    accessToken: await decryptValue(result.rows[0].meta_ads_access_token_encrypted),
    adAccountId: result.rows[0].meta_ad_account_id,
    businessId: result.rows[0].meta_business_id || undefined
  };
}

/**
 * Actualiza solo el ad account ID de Meta Ads (sin tocar token ni connected_by)
 */
export async function updateMetaAdsAdAccountId(
  tenantId: string,
  adAccountId: string,
  businessId: string | null
): Promise<void> {
  const sql = `
    UPDATE tenant_api_credentials
    SET
      meta_ad_account_id = $1,
      meta_business_id = $2,
      updated_at = NOW()
    WHERE tenant_id = $3
  `;

  await query(sql, [adAccountId, businessId, tenantId]);
}

/**
 * Desconecta Meta Ads
 */
export async function disconnectMetaAds(tenantId: string): Promise<void> {
  const sql = `
    UPDATE tenant_api_credentials
    SET
      meta_ads_access_token_encrypted = NULL,
      meta_ad_account_id = NULL,
      meta_business_id = NULL,
      meta_ads_connected = false,
      meta_ads_token_expires_at = NULL,
      updated_at = NOW()
    WHERE tenant_id = $1
  `;

  await query(sql, [tenantId]);
}

/**
 * Guarda las credenciales de Email Marketing
 */
export async function saveEmailCredentials(
  tenantId: string,
  provider: 'mailchimp' | 'sendgrid' | 'mailjet' | 'ses' | 'smtp',
  apiKey: string,
  senderName: string,
  senderEmail: string,
  listId: string | null,
  connectedBy: string
): Promise<void> {
  const encryptedKey = await encryptValue(apiKey);

  const sql = `
    UPDATE tenant_api_credentials
    SET
      email_provider = $1,
      email_api_key_encrypted = $2,
      email_sender_name = $3,
      email_sender_email = $4,
      email_list_id = $5,
      email_connected = true,
      connected_by = $6,
      updated_at = NOW()
    WHERE tenant_id = $7
  `;

  await query(sql, [provider, encryptedKey, senderName, senderEmail, listId, connectedBy, tenantId]);
}

/**
 * Guarda las credenciales SMTP personalizadas
 */
export async function saveSmtpCredentials(
  tenantId: string,
  host: string,
  port: number,
  username: string,
  password: string,
  secure: boolean,
  senderName: string,
  senderEmail: string,
  connectedBy: string
): Promise<void> {
  const encryptedPassword = await encryptValue(password);

  const sql = `
    UPDATE tenant_api_credentials
    SET
      email_provider = 'smtp',
      smtp_host = $1,
      smtp_port = $2,
      smtp_username = $3,
      smtp_password_encrypted = $4,
      smtp_secure = $5,
      email_sender_name = $6,
      email_sender_email = $7,
      email_connected = true,
      connected_by = $8,
      updated_at = NOW()
    WHERE tenant_id = $9
  `;

  await query(sql, [host, port, username, encryptedPassword, secure, senderName, senderEmail, connectedBy, tenantId]);
}

/**
 * Obtiene las credenciales de email (desencriptadas)
 */
export async function getEmailCredentials(tenantId: string): Promise<{
  provider: string;
  apiKey?: string;
  smtp?: {
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean;
  };
  senderName: string;
  senderEmail: string;
  listId?: string;
} | null> {
  const sql = `
    SELECT
      email_provider,
      email_api_key_encrypted,
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password_encrypted,
      smtp_secure,
      email_sender_name,
      email_sender_email,
      email_list_id
    FROM tenant_api_credentials
    WHERE tenant_id = $1 AND email_connected = true
  `;

  const result = await query(sql, [tenantId]);
  if (!result.rows[0]) {
    return null;
  }

  const row = result.rows[0];

  if (row.email_provider === 'smtp') {
    return {
      provider: 'smtp',
      smtp: {
        host: row.smtp_host,
        port: row.smtp_port,
        username: row.smtp_username,
        password: await decryptValue(row.smtp_password_encrypted),
        secure: row.smtp_secure
      },
      senderName: row.email_sender_name,
      senderEmail: row.email_sender_email
    };
  }

  return {
    provider: row.email_provider,
    apiKey: await decryptValue(row.email_api_key_encrypted),
    senderName: row.email_sender_name,
    senderEmail: row.email_sender_email,
    listId: row.email_list_id || undefined
  };
}

/**
 * Desconecta Email
 */
export async function disconnectEmail(tenantId: string): Promise<void> {
  const sql = `
    UPDATE tenant_api_credentials
    SET
      email_provider = 'none',
      email_api_key_encrypted = NULL,
      smtp_host = NULL,
      smtp_port = NULL,
      smtp_username = NULL,
      smtp_password_encrypted = NULL,
      smtp_secure = true,
      email_sender_name = NULL,
      email_sender_email = NULL,
      email_list_id = NULL,
      email_connected = false,
      updated_at = NOW()
    WHERE tenant_id = $1
  `;

  await query(sql, [tenantId]);
}

// ==================== CUENTAS SOCIALES DE ASESORES ====================

/**
 * Guarda la cuenta social de un asesor
 */
export async function saveAsesorSocialAccount(
  tenantId: string,
  usuarioId: string,
  platform: AsesorSocialAccount['platform'],
  accessToken: string,
  accountId: string,
  accountName: string,
  accountUsername: string | null,
  profilePictureUrl: string | null,
  tokenExpiresAt: Date | null,
  scopes: string[]
): Promise<AsesorSocialAccount> {
  const encryptedToken = await encryptValue(accessToken);

  // Upsert - actualiza si ya existe, inserta si no
  const sql = `
    INSERT INTO asesor_social_accounts (
      tenant_id,
      usuario_id,
      platform,
      access_token_encrypted,
      account_id,
      account_name,
      account_username,
      profile_picture_url,
      token_expires_at,
      scopes,
      is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
    ON CONFLICT (usuario_id, platform)
    DO UPDATE SET
      access_token_encrypted = $4,
      account_id = $5,
      account_name = $6,
      account_username = $7,
      profile_picture_url = $8,
      token_expires_at = $9,
      scopes = $10,
      is_active = true,
      last_error = NULL,
      updated_at = NOW()
    RETURNING
      id,
      tenant_id as "tenantId",
      usuario_id as "usuarioId",
      platform,
      account_id as "accountId",
      account_name as "accountName",
      account_username as "accountUsername",
      profile_picture_url as "profilePictureUrl",
      token_expires_at as "tokenExpiresAt",
      is_active as "isActive",
      last_used_at as "lastUsedAt",
      last_error as "lastError",
      scopes,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  const result = await query(sql, [
    tenantId,
    usuarioId,
    platform,
    encryptedToken,
    accountId,
    accountName,
    accountUsername,
    profilePictureUrl,
    tokenExpiresAt,
    scopes
  ]);

  return result.rows[0];
}

/**
 * Obtiene las cuentas sociales de un asesor
 */
export async function getAsesorSocialAccounts(
  tenantId: string,
  usuarioId: string
): Promise<AsesorSocialAccount[]> {
  const sql = `
    SELECT
      id,
      tenant_id as "tenantId",
      usuario_id as "usuarioId",
      platform,
      account_id as "accountId",
      account_name as "accountName",
      account_username as "accountUsername",
      profile_picture_url as "profilePictureUrl",
      token_expires_at as "tokenExpiresAt",
      is_active as "isActive",
      last_used_at as "lastUsedAt",
      last_error as "lastError",
      scopes,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM asesor_social_accounts
    WHERE tenant_id = $1 AND usuario_id = $2 AND is_active = true
    ORDER BY platform
  `;

  const result = await query(sql, [tenantId, usuarioId]);
  return result.rows;
}

/**
 * Obtiene el token de una cuenta social de asesor (desencriptado)
 */
export async function getAsesorSocialToken(
  usuarioId: string,
  platform: AsesorSocialAccount['platform']
): Promise<string | null> {
  const sql = `
    SELECT access_token_encrypted
    FROM asesor_social_accounts
    WHERE usuario_id = $1 AND platform = $2 AND is_active = true
  `;

  const result = await query(sql, [usuarioId, platform]);
  if (!result.rows[0]?.access_token_encrypted) {
    return null;
  }

  // Actualizar last_used_at
  await query(`
    UPDATE asesor_social_accounts
    SET last_used_at = NOW()
    WHERE usuario_id = $1 AND platform = $2
  `, [usuarioId, platform]);

  return decryptValue(result.rows[0].access_token_encrypted);
}

/**
 * Desconecta una cuenta social de asesor
 */
export async function disconnectAsesorSocialAccount(
  usuarioId: string,
  platform: AsesorSocialAccount['platform']
): Promise<void> {
  const sql = `
    UPDATE asesor_social_accounts
    SET is_active = false, updated_at = NOW()
    WHERE usuario_id = $1 AND platform = $2
  `;

  await query(sql, [usuarioId, platform]);
}

/**
 * Registra un error en una cuenta social
 */
export async function logAsesorSocialError(
  usuarioId: string,
  platform: AsesorSocialAccount['platform'],
  error: string
): Promise<void> {
  const sql = `
    UPDATE asesor_social_accounts
    SET last_error = $1, updated_at = NOW()
    WHERE usuario_id = $1 AND platform = $2
  `;

  await query(sql, [error, usuarioId, platform]);
}

// ==================== LOGS DE USO ====================

/**
 * Registra el uso de una API
 */
export async function logApiUsage(
  tenantId: string,
  usuarioId: string | null,
  apiProvider: 'google_maps' | 'google_search_console' | 'google_ads' | 'meta' | 'meta_ads' | 'email' | 'whatsapp',
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  success: boolean,
  statusCode: number | null,
  errorMessage: string | null,
  responseTimeMs: number | null,
  creditsUsed: number = 1
): Promise<void> {
  const sql = `
    INSERT INTO api_usage_logs (
      tenant_id,
      usuario_id,
      api_provider,
      endpoint,
      method,
      success,
      status_code,
      error_message,
      response_time_ms,
      credits_used
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;

  await query(sql, [
    tenantId,
    usuarioId,
    apiProvider,
    endpoint,
    method,
    success,
    statusCode,
    errorMessage,
    responseTimeMs,
    creditsUsed
  ]);
}

/**
 * Obtiene estadísticas de uso de API por tenant
 */
export async function getApiUsageStats(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  provider: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalCredits: number;
  avgResponseTime: number;
}[]> {
  const sql = `
    SELECT
      api_provider as provider,
      COUNT(*) as "totalCalls",
      COUNT(*) FILTER (WHERE success = true) as "successfulCalls",
      COUNT(*) FILTER (WHERE success = false) as "failedCalls",
      SUM(credits_used) as "totalCredits",
      AVG(response_time_ms) as "avgResponseTime"
    FROM api_usage_logs
    WHERE tenant_id = $1
      AND created_at >= $2
      AND created_at <= $3
    GROUP BY api_provider
    ORDER BY "totalCalls" DESC
  `;

  const result = await query(sql, [tenantId, startDate, endDate]);
  return result.rows.map(row => ({
    ...row,
    totalCalls: parseInt(row.totalCalls),
    successfulCalls: parseInt(row.successfulCalls),
    failedCalls: parseInt(row.failedCalls),
    totalCredits: parseInt(row.totalCredits),
    avgResponseTime: parseFloat(row.avgResponseTime) || 0
  }));
}
