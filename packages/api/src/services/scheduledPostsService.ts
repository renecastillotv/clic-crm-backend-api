/**
 * Scheduled Posts Service
 *
 * CRUD operations for tracking scheduled social media posts.
 * Facebook handles the actual scheduling natively via scheduled_publish_time.
 * Instagram scheduling is handled by cron (process-scheduled-posts).
 * This table is for UI management (view, cancel, edit).
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
  imageUrls: string[];
  linkUrl: string | null;
  propiedadId: string | null;
  propiedadTitulo?: string | null;
  scheduledFor: string;
  status: string;
  errorMessage: string | null;
  metaResponse: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledPostData {
  platform: string;
  metaPostId?: string;
  message?: string;
  imageUrl?: string;
  imageUrls?: string[];
  linkUrl?: string;
  propiedadId?: string;
  scheduledFor: string; // ISO date string
  createdBy?: string;
  metaResponse?: Record<string, any>;
}

export interface UpdateScheduledPostData {
  message?: string;
  imageUrl?: string;
  imageUrls?: string[];
  linkUrl?: string;
  scheduledFor?: string;
  metaPostId?: string;
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
      tenant_id, platform, meta_post_id, message, image_url, image_urls, link_url,
      propiedad_id, scheduled_for, status, meta_response, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10, $11)
    RETURNING *
  `;

  const result = await query(sql, [
    tenantId,
    data.platform,
    data.metaPostId || null,
    data.message || null,
    data.imageUrl || null,
    JSON.stringify(data.imageUrls || []),
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
  status?: string,
  userId?: string
): Promise<ScheduledPost[]> {
  let sql = `
    SELECT sp.*, p.titulo as propiedad_titulo
    FROM social_scheduled_posts sp
    LEFT JOIN propiedades p ON sp.propiedad_id = p.id
    WHERE sp.tenant_id = $1
  `;
  const params: any[] = [tenantId];

  if (status) {
    sql += ` AND sp.status = $${params.length + 1}`;
    params.push(status);
  }

  if (userId) {
    sql += ` AND sp.created_by = $${params.length + 1}`;
    params.push(userId);
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
  metaResponse?: Record<string, any>,
  errorMessage?: string
): Promise<void> {
  const sets: string[] = ['status = $1', 'updated_at = NOW()'];
  const params: any[] = [status];
  let idx = 2;

  if (metaResponse) {
    sets.push(`meta_response = $${idx++}`);
    params.push(JSON.stringify(metaResponse));
  }
  if (errorMessage !== undefined) {
    sets.push(`error_message = $${idx++}`);
    params.push(errorMessage);
  }

  params.push(postId, tenantId);
  const sql = `UPDATE social_scheduled_posts SET ${sets.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx}`;
  await query(sql, params);
}

/**
 * Updates a scheduled post's content (for editing scheduled posts).
 * Only works for posts with status='scheduled'.
 */
export async function updateScheduledPost(
  tenantId: string,
  postId: string,
  data: UpdateScheduledPostData
): Promise<ScheduledPost | null> {
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (data.message !== undefined) {
    sets.push(`message = $${idx++}`);
    params.push(data.message);
  }
  if (data.imageUrl !== undefined) {
    sets.push(`image_url = $${idx++}`);
    params.push(data.imageUrl);
  }
  if (data.imageUrls !== undefined) {
    sets.push(`image_urls = $${idx++}`);
    params.push(JSON.stringify(data.imageUrls));
  }
  if (data.linkUrl !== undefined) {
    sets.push(`link_url = $${idx++}`);
    params.push(data.linkUrl);
  }
  if (data.scheduledFor !== undefined) {
    sets.push(`scheduled_for = $${idx++}`);
    params.push(data.scheduledFor);
  }
  if (data.metaPostId !== undefined) {
    sets.push(`meta_post_id = $${idx++}`);
    params.push(data.metaPostId);
  }
  if (data.metaResponse !== undefined) {
    sets.push(`meta_response = $${idx++}`);
    params.push(JSON.stringify(data.metaResponse));
  }

  if (sets.length === 0) return null;

  sets.push('updated_at = NOW()');
  params.push(postId, tenantId);

  const sql = `
    UPDATE social_scheduled_posts
    SET ${sets.join(', ')}
    WHERE id = $${idx++} AND tenant_id = $${idx} AND status = 'scheduled'
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

/**
 * Atomically claims due scheduled posts for processing.
 * Sets status to 'processing' and returns the claimed posts.
 * Used by cron to prevent double-processing.
 */
export async function claimDueScheduledPosts(
  platform: string,
  limit: number = 50
): Promise<ScheduledPost[]> {
  const sql = `
    UPDATE social_scheduled_posts
    SET status = 'processing', updated_at = NOW()
    WHERE id IN (
      SELECT id FROM social_scheduled_posts
      WHERE platform = $1
        AND status = 'scheduled'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT $2
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;

  const result = await query(sql, [platform, limit]);
  return result.rows.map(mapRow);
}

// ==================== HELPERS ====================

function mapRow(row: any): ScheduledPost {
  let imageUrls: string[] = [];
  if (row.image_urls) {
    imageUrls = typeof row.image_urls === 'string'
      ? JSON.parse(row.image_urls)
      : row.image_urls;
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    platform: row.platform,
    metaPostId: row.meta_post_id,
    message: row.message,
    imageUrl: row.image_url,
    imageUrls,
    linkUrl: row.link_url,
    propiedadId: row.propiedad_id,
    propiedadTitulo: row.propiedad_titulo || null,
    scheduledFor: row.scheduled_for,
    status: row.status,
    errorMessage: row.error_message || null,
    metaResponse: row.meta_response || {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
