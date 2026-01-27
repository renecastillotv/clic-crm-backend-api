/**
 * Web Chat Service
 *
 * Manages web chat configuration and agent availability.
 * - Config CRUD: widget settings per tenant
 * - Agent management: availability, capacity, assignment
 * - Agent selection: round-robin, least-busy, or manual distribution
 */

import crypto from 'crypto';
import { query } from '../utils/db.js';

// ==================== TYPES ====================

export interface WebchatConfig {
  id: string;
  tenant_id: string;
  enabled: boolean;
  api_key: string;
  widget_color: string;
  greeting_text: string;
  position: string;
  distribution_mode: 'round-robin' | 'least-busy' | 'manual';
  offline_message: string;
  widget_title: string;
  widget_subtitle: string | null;
  business_hours: any | null;
  created_at: Date;
  updated_at: Date;
}

export interface WebchatAgent {
  id: string;
  tenant_id: string;
  usuario_id: string;
  is_available: boolean;
  max_concurrent_chats: number;
  current_chat_count: number;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  nombre_completo?: string;
  email?: string;
}

// ==================== CONFIG ====================

/**
 * Get web chat config for a tenant. Creates default config if none exists.
 */
export async function getConfig(tenantId: string): Promise<WebchatConfig> {
  const sql = `SELECT * FROM webchat_config WHERE tenant_id = $1`;
  const result = await query(sql, [tenantId]);

  if (result.rows[0]) {
    return result.rows[0];
  }

  // Create default config
  return createDefaultConfig(tenantId);
}

/**
 * Create default web chat config for a tenant.
 */
async function createDefaultConfig(tenantId: string): Promise<WebchatConfig> {
  const apiKey = crypto.randomBytes(32).toString('hex');

  const sql = `
    INSERT INTO webchat_config (tenant_id, api_key)
    VALUES ($1, $2)
    RETURNING *
  `;
  const result = await query(sql, [tenantId, apiKey]);
  return result.rows[0];
}

/**
 * Update web chat config.
 */
export async function updateConfig(
  tenantId: string,
  data: Partial<{
    enabled: boolean;
    widget_color: string;
    greeting_text: string;
    position: string;
    distribution_mode: string;
    offline_message: string;
    widget_title: string;
    widget_subtitle: string | null;
    business_hours: any;
  }>
): Promise<WebchatConfig | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(key === 'business_hours' ? JSON.stringify(value) : value);
    }
  }

  if (fields.length === 0) return getConfig(tenantId);

  fields.push(`updated_at = NOW()`);
  values.push(tenantId);

  const sql = `
    UPDATE webchat_config SET ${fields.join(', ')}
    WHERE tenant_id = $${paramIndex}
    RETURNING *
  `;
  const result = await query(sql, values);
  return result.rows[0] || null;
}

/**
 * Regenerate the API key for a tenant's web chat.
 */
export async function regenerateApiKey(tenantId: string): Promise<string> {
  const newKey = crypto.randomBytes(32).toString('hex');
  await query(
    `UPDATE webchat_config SET api_key = $1, updated_at = NOW() WHERE tenant_id = $2`,
    [newKey, tenantId]
  );
  return newKey;
}

/**
 * Validate an API key and return the tenant ID if valid.
 */
export async function validateApiKey(apiKey: string): Promise<{ tenantId: string; config: WebchatConfig } | null> {
  const sql = `SELECT * FROM webchat_config WHERE api_key = $1 AND enabled = true`;
  const result = await query(sql, [apiKey]);
  if (!result.rows[0]) return null;
  return { tenantId: result.rows[0].tenant_id, config: result.rows[0] };
}

// ==================== AGENTS ====================

/**
 * Get all webchat agents for a tenant with user info.
 */
export async function getAgents(tenantId: string): Promise<WebchatAgent[]> {
  const sql = `
    SELECT wa.*,
      u.nombre || ' ' || COALESCE(u.apellido, '') as nombre_completo,
      u.email
    FROM webchat_agents wa
    JOIN usuarios u ON wa.usuario_id = u.id
    WHERE wa.tenant_id = $1
    ORDER BY wa.is_available DESC, wa.current_chat_count ASC
  `;
  const result = await query(sql, [tenantId]);
  return result.rows;
}

/**
 * Add a user as a webchat agent.
 */
export async function addAgent(
  tenantId: string,
  usuarioId: string,
  maxConcurrentChats: number = 5
): Promise<WebchatAgent> {
  const sql = `
    INSERT INTO webchat_agents (tenant_id, usuario_id, max_concurrent_chats)
    VALUES ($1, $2, $3)
    ON CONFLICT (tenant_id, usuario_id) DO UPDATE SET
      max_concurrent_chats = $3,
      updated_at = NOW()
    RETURNING *
  `;
  const result = await query(sql, [tenantId, usuarioId, maxConcurrentChats]);
  return result.rows[0];
}

/**
 * Remove a user as a webchat agent.
 */
export async function removeAgent(tenantId: string, usuarioId: string): Promise<boolean> {
  const sql = `DELETE FROM webchat_agents WHERE tenant_id = $1 AND usuario_id = $2`;
  const result = await query(sql, [tenantId, usuarioId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Update agent availability.
 */
export async function setAgentAvailability(
  tenantId: string,
  usuarioId: string,
  isAvailable: boolean
): Promise<WebchatAgent | null> {
  const sql = `
    UPDATE webchat_agents SET is_available = $1, updated_at = NOW()
    WHERE tenant_id = $2 AND usuario_id = $3
    RETURNING *
  `;
  const result = await query(sql, [isAvailable, tenantId, usuarioId]);
  return result.rows[0] || null;
}

/**
 * Increment or decrement the current chat count for an agent.
 */
export async function adjustChatCount(
  tenantId: string,
  usuarioId: string,
  delta: number
): Promise<void> {
  await query(
    `UPDATE webchat_agents SET current_chat_count = GREATEST(0, current_chat_count + $1), updated_at = NOW()
     WHERE tenant_id = $2 AND usuario_id = $3`,
    [delta, tenantId, usuarioId]
  );
}

// ==================== AGENT SELECTION ====================

/**
 * Select the next available agent based on the distribution mode.
 * Returns null if no agents are available.
 */
export async function selectAgent(tenantId: string): Promise<string | null> {
  const config = await getConfig(tenantId);

  switch (config.distribution_mode) {
    case 'round-robin':
      return selectRoundRobin(tenantId);
    case 'least-busy':
      return selectLeastBusy(tenantId);
    case 'manual':
      return null; // Manual assignment — no auto-select
    default:
      return selectRoundRobin(tenantId);
  }
}

/**
 * Round-robin: select the available agent who was assigned a chat least recently.
 */
async function selectRoundRobin(tenantId: string): Promise<string | null> {
  const sql = `
    SELECT wa.usuario_id
    FROM webchat_agents wa
    WHERE wa.tenant_id = $1
      AND wa.is_available = true
      AND wa.current_chat_count < wa.max_concurrent_chats
    ORDER BY wa.updated_at ASC
    LIMIT 1
  `;
  const result = await query(sql, [tenantId]);
  return result.rows[0]?.usuario_id || null;
}

/**
 * Least-busy: select the available agent with the fewest active chats.
 */
async function selectLeastBusy(tenantId: string): Promise<string | null> {
  const sql = `
    SELECT wa.usuario_id
    FROM webchat_agents wa
    WHERE wa.tenant_id = $1
      AND wa.is_available = true
      AND wa.current_chat_count < wa.max_concurrent_chats
    ORDER BY wa.current_chat_count ASC, wa.updated_at ASC
    LIMIT 1
  `;
  const result = await query(sql, [tenantId]);
  return result.rows[0]?.usuario_id || null;
}

/**
 * Check if any agents are currently available for a tenant.
 */
export async function hasAvailableAgents(tenantId: string): Promise<boolean> {
  const sql = `
    SELECT 1 FROM webchat_agents
    WHERE tenant_id = $1 AND is_available = true AND current_chat_count < max_concurrent_chats
    LIMIT 1
  `;
  const result = await query(sql, [tenantId]);
  return result.rows.length > 0;
}
