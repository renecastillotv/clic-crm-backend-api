/**
 * Hashtag Groups Service
 *
 * CRUD operations for reusable hashtag groups per tenant.
 */

import { query } from '../utils/db.js';

// ==================== TYPES ====================

export interface HashtagGroup {
  id: string;
  tenantId: string;
  name: string;
  hashtags: string[];
  category: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHashtagGroupData {
  name: string;
  hashtags: string[];
  category?: string;
  createdBy?: string;
}

export interface UpdateHashtagGroupData {
  name?: string;
  hashtags?: string[];
  category?: string;
}

// ==================== CRUD ====================

export async function listHashtagGroups(tenantId: string): Promise<HashtagGroup[]> {
  const sql = `
    SELECT * FROM social_hashtag_groups
    WHERE tenant_id = $1
    ORDER BY name ASC
  `;
  const result = await query(sql, [tenantId]);
  return result.rows.map(mapRow);
}

export async function createHashtagGroup(
  tenantId: string,
  data: CreateHashtagGroupData
): Promise<HashtagGroup> {
  const sql = `
    INSERT INTO social_hashtag_groups (tenant_id, name, hashtags, category, created_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const result = await query(sql, [
    tenantId,
    data.name,
    data.hashtags,
    data.category || null,
    data.createdBy || null,
  ]);
  return mapRow(result.rows[0]);
}

export async function updateHashtagGroup(
  tenantId: string,
  groupId: string,
  data: UpdateHashtagGroupData
): Promise<HashtagGroup | null> {
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (data.name !== undefined) {
    sets.push(`name = $${idx++}`);
    params.push(data.name);
  }
  if (data.hashtags !== undefined) {
    sets.push(`hashtags = $${idx++}`);
    params.push(data.hashtags);
  }
  if (data.category !== undefined) {
    sets.push(`category = $${idx++}`);
    params.push(data.category || null);
  }

  if (sets.length === 0) return null;

  sets.push(`updated_at = NOW()`);
  params.push(groupId, tenantId);

  const sql = `
    UPDATE social_hashtag_groups
    SET ${sets.join(', ')}
    WHERE id = $${idx++} AND tenant_id = $${idx}
    RETURNING *
  `;

  const result = await query(sql, params);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function deleteHashtagGroup(
  tenantId: string,
  groupId: string
): Promise<boolean> {
  const sql = `DELETE FROM social_hashtag_groups WHERE id = $1 AND tenant_id = $2`;
  const result = await query(sql, [groupId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

// ==================== HELPERS ====================

function mapRow(row: any): HashtagGroup {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    hashtags: row.hashtags || [],
    category: row.category,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
