/**
 * User Email Credentials Service
 *
 * CRUD for per-user IMAP/SMTP credentials (MXRoute).
 * Passwords are encrypted at rest using AES-256-CBC
 * via the shared encryptValue/decryptValue functions.
 */

import { query } from '../utils/db.js';
import { encryptValue, decryptValue } from './tenantApiCredentialsService.js';

export interface UserEmailCredentials {
  id: string;
  tenant_id: string;
  usuario_id: string;
  email_address: string;
  display_name: string | null;
  imap_host: string;
  imap_port: number;
  imap_username: string | null;
  imap_password_encrypted: string | null;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string | null;
  smtp_password_encrypted: string | null;
  smtp_secure: boolean;
  is_connected: boolean;
  last_sync_at: string | null;
  last_sync_uid: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DecryptedEmailCredentials {
  id: string;
  tenant_id: string;
  usuario_id: string;
  email_address: string;
  display_name: string | null;
  imap: {
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean;
  };
  smtp: {
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean;
  };
  is_connected: boolean;
  last_sync_at: string | null;
  last_sync_uid: string | null;
  last_error: string | null;
}

/**
 * Get credentials for a user (returns encrypted — don't expose passwords).
 */
export async function getCredentials(
  tenantId: string,
  usuarioId: string
): Promise<UserEmailCredentials | null> {
  const sql = 'SELECT * FROM user_email_credentials WHERE tenant_id = $1 AND usuario_id = $2';
  const result = await query(sql, [tenantId, usuarioId]);
  return result.rows[0] || null;
}

/**
 * Get credentials with passwords decrypted (for internal use by IMAP/SMTP services).
 */
export async function getDecryptedCredentials(
  tenantId: string,
  usuarioId: string
): Promise<DecryptedEmailCredentials | null> {
  const creds = await getCredentials(tenantId, usuarioId);
  if (!creds) return null;

  const imapPassword = creds.imap_password_encrypted
    ? await decryptValue(creds.imap_password_encrypted)
    : '';
  const smtpPassword = creds.smtp_password_encrypted
    ? await decryptValue(creds.smtp_password_encrypted)
    : '';

  return {
    id: creds.id,
    tenant_id: creds.tenant_id,
    usuario_id: creds.usuario_id,
    email_address: creds.email_address,
    display_name: creds.display_name,
    imap: {
      host: creds.imap_host,
      port: creds.imap_port,
      username: creds.imap_username || creds.email_address,
      password: imapPassword,
      secure: creds.imap_secure,
    },
    smtp: {
      host: creds.smtp_host,
      port: creds.smtp_port,
      username: creds.smtp_username || creds.email_address,
      password: smtpPassword,
      secure: creds.smtp_secure,
    },
    is_connected: creds.is_connected,
    last_sync_at: creds.last_sync_at,
    last_sync_uid: creds.last_sync_uid,
    last_error: creds.last_error,
  };
}

/**
 * Save or update email credentials for a user.
 * Passwords are encrypted before storage.
 */
export async function saveCredentials(
  tenantId: string,
  usuarioId: string,
  data: {
    email_address: string;
    display_name?: string;
    imap_host?: string;
    imap_port?: number;
    imap_username?: string;
    imap_password?: string;
    imap_secure?: boolean;
    smtp_host?: string;
    smtp_port?: number;
    smtp_username?: string;
    smtp_password?: string;
    smtp_secure?: boolean;
  }
): Promise<UserEmailCredentials> {
  const imapPasswordEncrypted = data.imap_password
    ? await encryptValue(data.imap_password)
    : null;
  const smtpPasswordEncrypted = data.smtp_password
    ? await encryptValue(data.smtp_password)
    : null;

  const existing = await getCredentials(tenantId, usuarioId);

  if (existing) {
    // Update existing
    const sql = `
      UPDATE user_email_credentials SET
        email_address = $1,
        display_name = $2,
        imap_host = $3,
        imap_port = $4,
        imap_username = $5,
        ${imapPasswordEncrypted !== null ? 'imap_password_encrypted = $6,' : ''}
        imap_secure = $7,
        smtp_host = $8,
        smtp_port = $9,
        smtp_username = $10,
        ${smtpPasswordEncrypted !== null ? 'smtp_password_encrypted = $11,' : ''}
        smtp_secure = $12,
        updated_at = NOW()
      WHERE tenant_id = $13 AND usuario_id = $14
      RETURNING *
    `;

    // Build params — skip password params if not provided (keep existing)
    const params: any[] = [
      data.email_address,
      data.display_name || null,
      data.imap_host || '',
      data.imap_port ?? 993,
      data.imap_username || null,
      imapPasswordEncrypted ?? existing.imap_password_encrypted,
      data.imap_secure ?? true,
      data.smtp_host || '',
      data.smtp_port ?? 465,
      data.smtp_username || null,
      smtpPasswordEncrypted ?? existing.smtp_password_encrypted,
      data.smtp_secure ?? true,
      tenantId,
      usuarioId,
    ];

    // Simpler approach: always include password params
    const updateSql = `
      UPDATE user_email_credentials SET
        email_address = $1,
        display_name = $2,
        imap_host = $3,
        imap_port = $4,
        imap_username = $5,
        imap_password_encrypted = $6,
        imap_secure = $7,
        smtp_host = $8,
        smtp_port = $9,
        smtp_username = $10,
        smtp_password_encrypted = $11,
        smtp_secure = $12,
        updated_at = NOW()
      WHERE tenant_id = $13 AND usuario_id = $14
      RETURNING *
    `;
    const result = await query(updateSql, params);
    return result.rows[0];
  }

  // Insert new
  const insertSql = `
    INSERT INTO user_email_credentials (
      tenant_id, usuario_id, email_address, display_name,
      imap_host, imap_port, imap_username, imap_password_encrypted, imap_secure,
      smtp_host, smtp_port, smtp_username, smtp_password_encrypted, smtp_secure,
      is_connected, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false, NOW(), NOW())
    RETURNING *
  `;
  const result = await query(insertSql, [
    tenantId,
    usuarioId,
    data.email_address,
    data.display_name || null,
    data.imap_host || '',
    data.imap_port ?? 993,
    data.imap_username || null,
    imapPasswordEncrypted,
    data.imap_secure ?? true,
    data.smtp_host || '',
    data.smtp_port ?? 465,
    data.smtp_username || null,
    smtpPasswordEncrypted,
    data.smtp_secure ?? true,
  ]);
  return result.rows[0];
}

/**
 * Delete email credentials for a user.
 */
export async function deleteCredentials(
  tenantId: string,
  usuarioId: string
): Promise<boolean> {
  const sql = 'DELETE FROM user_email_credentials WHERE tenant_id = $1 AND usuario_id = $2';
  const result = await query(sql, [tenantId, usuarioId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Update connection status and sync state.
 */
export async function updateSyncState(
  credentialId: string,
  state: {
    is_connected?: boolean;
    last_sync_at?: string;
    last_sync_uid?: string;
    last_error?: string | null;
  }
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(state)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return;
  setClauses.push('updated_at = NOW()');

  const sql = `UPDATE user_email_credentials SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`;
  params.push(credentialId);
  await query(sql, params);
}

/**
 * Get all connected users (for cron sync).
 */
export async function getConnectedUsers(): Promise<UserEmailCredentials[]> {
  const sql = 'SELECT * FROM user_email_credentials WHERE is_connected = true';
  const result = await query(sql);
  return result.rows;
}
