/**
 * Scheduled Posts Service
 *
 * CRUD operations for tracking scheduled social media posts.
 * Facebook handles the actual scheduling natively via scheduled_publish_time.
 * This table is for UI management (view, cancel).
 */

import { query } from '../utils/db.js';

// ==================== TYPES ====================

export interface ScheduledPost {
  id: string;
  tenantId: string;
  platform: string;
  metaPostId: string | null;
  message: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  propiedadId: string | null;
  propiedadTitulo?: string | null;
  scheduledFor: string;
  status: string;
  metaResponse: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledPostData {
  platform: string;
  metaPostId: string;
  message?: string;
  imageUrl?: string;
  linkUrl?: string;
  propiedadId?: string;
  scheduledFor: string; // ISO date string
  createdBy?: string;
  metaResponse?: Record<string, any>;
}

// ==================== CRUD ====================

/**
 * Creates a scheduled post record.
 */
export async function createScheduledPost(
  tenantId: string,
  data: CreateScheduledPostData
): Promise<ScheduledPost> {
  const sql = `
    INSERT INTO social_scheduled_posts (
      tenant_id, platform, meta_post_id, message, image_url, link_url,
      propiedad_id, scheduled_for, status, meta_response, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9, $10)
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    data.platform,
    data.metaPostId,
    data.message || null,
    data.imageUrl || null,
    data.linkUrl || null,
    data.propiedadId || null,
    data.scheduledFor,
    JSON.stringify(data.metaResponse || {}),
    data.createdBy || null,
  ]);

  return mapRow(result.rows[0]);
}

/**
 * Gets scheduled posts for a tenant, optionally filtered by status.
 * Joins with propiedades to get property title.
 */
export async function getScheduledPosts(
  tenantId: string,
  status?: string
): Promise<ScheduledPost[]> {
  let sql = `
    SELECT sp.*, p.titulo as propiedad_titulo
    FROM social_scheduled_posts sp
    LEFT JOIN propiedades p ON sp.propiedad_id = p.id
    WHERE sp.tenant_id = $1
  `;
  const params: any[] = [tenantId];

  if (status) {
    sql += ` AND sp.status = $2`;
    params.push(status);
  }

  sql += ` ORDER BY sp.scheduled_for DESC LIMIT 50`;

  const result = await query(sql, params);
  return result.rows.map(mapRow);
}

/**
 * Gets a single scheduled post by ID.
 */
export async function getScheduledPostById(
  tenantId: string,
  postId: string
): Promise<ScheduledPost | null> {
  const sql = `
    SELECT sp.*, p.titulo as propiedad_titulo
    FROM social_scheduled_posts sp
    LEFT JOIN propiedades p ON sp.propiedad_id = p.id
    WHERE sp.id = $1 AND sp.tenant_id = $2
  `;
  const result = await query(sql, [postId, tenantId]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

/**
 * Updates the status of a scheduled post.
 */
export async function updatePostStatus(
  tenantId: string,
  postId: string,
  status: string,
  metaResponse?: Record<string, any>
): Promise<void> {
  const sql = metaResponse
    ? `UPDATE social_scheduled_posts SET status = $1, meta_response = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4`
    : `UPDATE social_scheduled_posts SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`;

  const params = metaResponse
    ? [status, JSON.stringify(metaResponse), postId, tenantId]
    : [status, postId, tenantId];

  await query(sql, params);
}

// ==================== HELPERS ====================

function mapRow(row: any): ScheduledPost {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    platform: row.platform,
    metaPostId: row.meta_post_id,
    message: row.message,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    propiedadId: row.propiedad_id,
    propiedadTitulo: row.propiedad_titulo || null,
    scheduledFor: row.scheduled_for,
    status: row.status,
    metaResponse: row.meta_response || {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
