/**
 * Mensajeria Etiquetas Service - CRUD for conversation labels
 *
 * Each tenant has their own set of etiquetas that can be assigned
 * to conversations for organization / filtering.
 */

import { query } from '../utils/db.js';

export interface MensajeriaEtiqueta {
  id: string;
  tenant_id: string;
  codigo: string;
  nombre: string;
  color: string;
  es_default: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get all etiquetas for a tenant, ordered by `orden`.
 */
export async function getEtiquetas(tenantId: string): Promise<MensajeriaEtiqueta[]> {
  const sql = `
    SELECT * FROM mensajeria_etiquetas
    WHERE tenant_id = $1
    ORDER BY orden ASC, nombre ASC
  `;
  const result = await query(sql, [tenantId]);
  return result.rows;
}

/**
 * Get a single etiqueta by ID.
 */
export async function getEtiquetaById(
  tenantId: string,
  etiquetaId: string
): Promise<MensajeriaEtiqueta | null> {
  const sql = 'SELECT * FROM mensajeria_etiquetas WHERE id = $1 AND tenant_id = $2';
  const result = await query(sql, [etiquetaId, tenantId]);
  return result.rows[0] || null;
}

/**
 * Create a new etiqueta.
 */
export async function createEtiqueta(
  tenantId: string,
  data: { codigo: string; nombre: string; color?: string; orden?: number }
): Promise<MensajeriaEtiqueta> {
  const sql = `
    INSERT INTO mensajeria_etiquetas (tenant_id, codigo, nombre, color, es_default, orden, created_at, updated_at)
    VALUES ($1, $2, $3, $4, false, $5, NOW(), NOW())
    RETURNING *
  `;
  const result = await query(sql, [
    tenantId,
    data.codigo,
    data.nombre,
    data.color || '#94a3b8',
    data.orden ?? 0,
  ]);
  return result.rows[0];
}

/**
 * Update an existing etiqueta.
 */
export async function updateEtiqueta(
  tenantId: string,
  etiquetaId: string,
  data: Partial<Pick<MensajeriaEtiqueta, 'nombre' | 'color' | 'orden' | 'codigo'>>
): Promise<MensajeriaEtiqueta | null> {
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

  if (setClauses.length === 0) return getEtiquetaById(tenantId, etiquetaId);

  setClauses.push('updated_at = NOW()');

  const sql = `
    UPDATE mensajeria_etiquetas
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(etiquetaId, tenantId);

  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Delete an etiqueta (only non-default).
 * Also clears etiqueta_id from any conversations using it.
 */
export async function deleteEtiqueta(
  tenantId: string,
  etiquetaId: string
): Promise<boolean> {
  // Clear references from conversations
  await query(
    'UPDATE conversaciones SET etiqueta_id = NULL WHERE etiqueta_id = $1 AND tenant_id = $2',
    [etiquetaId, tenantId]
  );

  const sql = `
    DELETE FROM mensajeria_etiquetas
    WHERE id = $1 AND tenant_id = $2 AND es_default = false
  `;
  const result = await query(sql, [etiquetaId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Seed default etiquetas for a newly created tenant.
 */
export async function seedDefaultEtiquetas(tenantId: string): Promise<void> {
  const defaults = [
    { codigo: 'nuevo', nombre: 'Nuevo', color: '#3b82f6', orden: 1 },
    { codigo: 'seguimiento', nombre: 'Seguimiento', color: '#f59e0b', orden: 2 },
    { codigo: 'importante', nombre: 'Importante', color: '#ef4444', orden: 3 },
    { codigo: 'cerrado', nombre: 'Cerrado', color: '#10b981', orden: 4 },
    { codigo: 'spam', nombre: 'Spam', color: '#6b7280', orden: 5 },
    { codigo: 'vip', nombre: 'VIP', color: '#8b5cf6', orden: 6 },
  ];

  for (const d of defaults) {
    await query(
      `INSERT INTO mensajeria_etiquetas (tenant_id, codigo, nombre, color, es_default, orden, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
       ON CONFLICT (tenant_id, codigo) DO NOTHING`,
      [tenantId, d.codigo, d.nombre, d.color, d.orden]
    );
  }
}
