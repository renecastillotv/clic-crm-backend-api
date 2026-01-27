/**
 * Mensajeria Firmas Service - CRUD for per-user email signatures
 *
 * Each user can have multiple signatures, one marked as default.
 * Used when composing/replying emails from the CRM inbox.
 */

import { query } from '../utils/db.js';

export interface MensajeriaFirma {
  id: string;
  tenant_id: string;
  usuario_id: string;
  nombre: string;
  contenido_html: string;
  es_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all firmas for a user.
 */
export async function getFirmas(
  tenantId: string,
  usuarioId: string
): Promise<MensajeriaFirma[]> {
  const sql = `
    SELECT * FROM mensajeria_firmas
    WHERE tenant_id = $1 AND usuario_id = $2
    ORDER BY es_default DESC, nombre ASC
  `;
  const result = await query(sql, [tenantId, usuarioId]);
  return result.rows;
}

/**
 * Get a single firma by ID.
 */
export async function getFirmaById(
  tenantId: string,
  firmaId: string
): Promise<MensajeriaFirma | null> {
  const sql = 'SELECT * FROM mensajeria_firmas WHERE id = $1 AND tenant_id = $2';
  const result = await query(sql, [firmaId, tenantId]);
  return result.rows[0] || null;
}

/**
 * Create a new firma.
 * If es_default is true, unset previous defaults for the user.
 */
export async function createFirma(
  tenantId: string,
  usuarioId: string,
  data: { nombre: string; contenido_html: string; es_default?: boolean }
): Promise<MensajeriaFirma> {
  const esDefault = data.es_default ?? false;

  if (esDefault) {
    await query(
      'UPDATE mensajeria_firmas SET es_default = false WHERE tenant_id = $1 AND usuario_id = $2',
      [tenantId, usuarioId]
    );
  }

  const sql = `
    INSERT INTO mensajeria_firmas (tenant_id, usuario_id, nombre, contenido_html, es_default, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
  `;
  const result = await query(sql, [
    tenantId,
    usuarioId,
    data.nombre,
    data.contenido_html,
    esDefault,
  ]);
  return result.rows[0];
}

/**
 * Update an existing firma.
 * If es_default changes to true, unset other defaults for the user.
 */
export async function updateFirma(
  tenantId: string,
  firmaId: string,
  data: Partial<Pick<MensajeriaFirma, 'nombre' | 'contenido_html' | 'es_default'>>
): Promise<MensajeriaFirma | null> {
  // If setting as default, clear other defaults first
  if (data.es_default === true) {
    const existing = await getFirmaById(tenantId, firmaId);
    if (existing) {
      await query(
        'UPDATE mensajeria_firmas SET es_default = false WHERE tenant_id = $1 AND usuario_id = $2',
        [tenantId, existing.usuario_id]
      );
    }
  }

  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return getFirmaById(tenantId, firmaId);

  setClauses.push('updated_at = NOW()');

  const sql = `
    UPDATE mensajeria_firmas
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(firmaId, tenantId);

  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Delete a firma.
 */
export async function deleteFirma(
  tenantId: string,
  firmaId: string
): Promise<boolean> {
  const sql = 'DELETE FROM mensajeria_firmas WHERE id = $1 AND tenant_id = $2';
  const result = await query(sql, [firmaId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}
