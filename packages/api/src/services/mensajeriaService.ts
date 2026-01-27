/**
 * Mensajeria Service - Core CRUD for conversations and messages
 *
 * Handles the unified inbox: conversations from all channels
 * (WhatsApp, Instagram DM, Facebook DM, Web Chat, Email).
 * Per-user scoped: each user sees only their own conversations.
 */

import { query } from '../utils/db.js';

// ========== TYPES ==========

export type CanalType = 'whatsapp' | 'instagram_dm' | 'facebook_dm' | 'web_chat' | 'email';
export type EstadoConversacion = 'abierta' | 'cerrada' | 'archivada' | 'spam';
export type TipoMensaje = 'text' | 'image' | 'video' | 'audio' | 'document' | 'email';
export type EstadoMensaje = 'enviado' | 'entregado' | 'leido' | 'fallido';

export interface Conversacion {
  id: string;
  tenant_id: string;
  canal: CanalType;
  external_conversation_id: string | null;
  external_participant_id: string | null;
  contacto_id: string | null;
  contacto_nombre: string | null;
  contacto_avatar_url: string | null;
  usuario_asignado_id: string | null;
  estado: EstadoConversacion;
  no_leidos: number;
  ultimo_mensaje_texto: string | null;
  ultimo_mensaje_at: string | null;
  ultimo_mensaje_es_entrante: boolean | null;
  etiqueta_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Mensaje {
  id: string;
  conversacion_id: string;
  tenant_id: string;
  es_entrante: boolean;
  remitente_nombre: string | null;
  remitente_id: string | null;
  tipo: TipoMensaje;
  contenido: string | null;
  contenido_plain: string | null;
  email_asunto: string | null;
  email_de: string | null;
  email_para: string | null;
  email_cc: string | null;
  email_bcc: string | null;
  email_message_id: string | null;
  email_in_reply_to: string | null;
  email_references: string | null;
  adjuntos: any[];
  external_message_id: string | null;
  estado: EstadoMensaje | null;
  error_mensaje: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ConversacionFiltros {
  usuario_id?: string;
  canal?: CanalType;
  estado?: EstadoConversacion;
  etiqueta_id?: string;
  busqueda?: string;
  carpeta?: 'bandeja' | 'enviados';
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ========== CONVERSACIONES ==========

/**
 * Get conversations with pagination and filters.
 * Per-user scoped: filters by usuario_asignado_id.
 */
export async function getConversaciones(
  tenantId: string,
  filtros: ConversacionFiltros = {}
): Promise<PaginatedResult<Conversacion>> {
  const { usuario_id, canal, estado, etiqueta_id, busqueda, carpeta, page = 1, limit = 50 } = filtros;
  const offset = (page - 1) * limit;

  let whereClause = 'c.tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (usuario_id) {
    whereClause += ` AND c.usuario_asignado_id = $${paramIndex}`;
    params.push(usuario_id);
    paramIndex++;
  }

  if (canal) {
    whereClause += ` AND c.canal = $${paramIndex}`;
    params.push(canal);
    paramIndex++;
  }

  if (estado) {
    whereClause += ` AND c.estado = $${paramIndex}`;
    params.push(estado);
    paramIndex++;
  }

  if (etiqueta_id) {
    whereClause += ` AND c.etiqueta_id = $${paramIndex}`;
    params.push(etiqueta_id);
    paramIndex++;
  }

  if (busqueda) {
    whereClause += ` AND (c.contacto_nombre ILIKE $${paramIndex} OR c.ultimo_mensaje_texto ILIKE $${paramIndex})`;
    params.push(`%${busqueda}%`);
    paramIndex++;
  }

  if (carpeta === 'bandeja') {
    whereClause += ` AND EXISTS (SELECT 1 FROM mensajes m WHERE m.conversacion_id = c.id AND m.es_entrante = true)`;
  } else if (carpeta === 'enviados') {
    whereClause += ` AND EXISTS (SELECT 1 FROM mensajes m WHERE m.conversacion_id = c.id AND m.es_entrante = false)`;
  }

  const countResult = await query(
    `SELECT COUNT(*) as total FROM conversaciones c WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  const dataSql = `
    SELECT c.*, e.nombre as etiqueta_nombre, e.color as etiqueta_color, e.codigo as etiqueta_codigo
    FROM conversaciones c
    LEFT JOIN mensajeria_etiquetas e ON c.etiqueta_id = e.id
    WHERE ${whereClause}
    ORDER BY c.ultimo_mensaje_at DESC NULLS LAST, c.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await query(dataSql, params);

  return {
    data: result.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single conversation by ID.
 */
export async function getConversacionById(
  tenantId: string,
  conversacionId: string
): Promise<Conversacion | null> {
  const sql = `
    SELECT c.*, e.nombre as etiqueta_nombre, e.color as etiqueta_color, e.codigo as etiqueta_codigo
    FROM conversaciones c
    LEFT JOIN mensajeria_etiquetas e ON c.etiqueta_id = e.id
    WHERE c.id = $1 AND c.tenant_id = $2
  `;
  const result = await query(sql, [conversacionId, tenantId]);
  return result.rows[0] || null;
}

/**
 * Find or create a conversation for an external channel.
 * Used by webhook handlers when a new message arrives.
 */
export async function findOrCreateConversacion(
  tenantId: string,
  canal: CanalType,
  externalConversationId: string,
  defaults: {
    external_participant_id?: string;
    contacto_nombre?: string;
    contacto_avatar_url?: string;
    usuario_asignado_id?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<Conversacion> {
  // Try to find existing
  const existingSql = `
    SELECT * FROM conversaciones
    WHERE tenant_id = $1 AND canal = $2 AND external_conversation_id = $3
  `;
  const existing = await query(existingSql, [tenantId, canal, externalConversationId]);
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  // Create new
  const insertSql = `
    INSERT INTO conversaciones (
      tenant_id, canal, external_conversation_id,
      external_participant_id, contacto_nombre, contacto_avatar_url,
      usuario_asignado_id, estado, metadata, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'abierta', $8, NOW(), NOW())
    RETURNING *
  `;
  const result = await query(insertSql, [
    tenantId,
    canal,
    externalConversationId,
    defaults.external_participant_id || null,
    defaults.contacto_nombre || null,
    defaults.contacto_avatar_url || null,
    defaults.usuario_asignado_id || null,
    JSON.stringify(defaults.metadata || {}),
  ]);
  return result.rows[0];
}

/**
 * Find a conversation by external conversation ID and canal.
 * Returns null if not found.
 */
export async function findConversacionByExternal(
  tenantId: string,
  canal: CanalType,
  externalConversationId: string
): Promise<Conversacion | null> {
  const sql = `
    SELECT * FROM conversaciones
    WHERE tenant_id = $1 AND canal = $2 AND external_conversation_id = $3
  `;
  const result = await query(sql, [tenantId, canal, externalConversationId]);
  return result.rows[0] || null;
}

/**
 * Update a conversation's fields (estado, etiqueta, assignment, etc).
 */
export async function updateConversacion(
  tenantId: string,
  conversacionId: string,
  updates: Partial<Pick<Conversacion, 'estado' | 'etiqueta_id' | 'usuario_asignado_id' | 'contacto_id' | 'contacto_nombre'>>
): Promise<Conversacion | null> {
  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return getConversacionById(tenantId, conversacionId);

  setClauses.push('updated_at = NOW()');

  const sql = `
    UPDATE conversaciones
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING *
  `;
  params.push(conversacionId, tenantId);

  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Mark a conversation as read (reset no_leidos counter).
 */
export async function markAsRead(
  tenantId: string,
  conversacionId: string
): Promise<void> {
  const sql = `
    UPDATE conversaciones
    SET no_leidos = 0, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `;
  await query(sql, [conversacionId, tenantId]);
}

// ========== MENSAJES ==========

/**
 * Get messages for a conversation (paginated, newest first).
 */
export async function getMensajes(
  tenantId: string,
  conversacionId: string,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResult<Mensaje>> {
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) as total FROM mensajes WHERE conversacion_id = $1 AND tenant_id = $2',
    [conversacionId, tenantId]
  );
  const total = parseInt(countResult.rows[0].total);

  const sql = `
    SELECT * FROM mensajes
    WHERE conversacion_id = $1 AND tenant_id = $2
    ORDER BY created_at ASC
    LIMIT $3 OFFSET $4
  `;
  const result = await query(sql, [conversacionId, tenantId, limit, offset]);

  return {
    data: result.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Create a message and update the parent conversation's last_message fields.
 */
export async function createMensaje(
  tenantId: string,
  conversacionId: string,
  data: {
    es_entrante: boolean;
    remitente_nombre?: string;
    remitente_id?: string;
    tipo?: TipoMensaje;
    contenido?: string;
    contenido_plain?: string;
    email_asunto?: string;
    email_de?: string;
    email_para?: string;
    email_cc?: string;
    email_bcc?: string;
    email_message_id?: string;
    email_in_reply_to?: string;
    email_references?: string;
    adjuntos?: any[];
    external_message_id?: string;
    estado?: EstadoMensaje;
    metadata?: Record<string, any>;
  }
): Promise<Mensaje> {
  const insertSql = `
    INSERT INTO mensajes (
      tenant_id, conversacion_id, es_entrante,
      remitente_nombre, remitente_id, tipo,
      contenido, contenido_plain,
      email_asunto, email_de, email_para, email_cc, email_bcc,
      email_message_id, email_in_reply_to, email_references,
      adjuntos, external_message_id, estado, metadata, created_at
    ) VALUES (
      $1, $2, $3,
      $4, $5, $6,
      $7, $8,
      $9, $10, $11, $12, $13,
      $14, $15, $16,
      $17, $18, $19, $20, NOW()
    )
    RETURNING *
  `;

  const result = await query(insertSql, [
    tenantId,
    conversacionId,
    data.es_entrante,
    data.remitente_nombre || null,
    data.remitente_id || null,
    data.tipo || 'text',
    data.contenido || null,
    data.contenido_plain || null,
    data.email_asunto || null,
    data.email_de || null,
    data.email_para || null,
    data.email_cc || null,
    data.email_bcc || null,
    data.email_message_id || null,
    data.email_in_reply_to || null,
    data.email_references || null,
    JSON.stringify(data.adjuntos || []),
    data.external_message_id || null,
    data.estado || null,
    JSON.stringify(data.metadata || {}),
  ]);

  const mensaje = result.rows[0];

  // Update conversation's last message + unread count
  const previewText = data.tipo === 'email'
    ? data.email_asunto || data.contenido_plain || ''
    : data.contenido || '';

  const updateConvSql = `
    UPDATE conversaciones
    SET
      ultimo_mensaje_texto = $1,
      ultimo_mensaje_at = NOW(),
      ultimo_mensaje_es_entrante = $2,
      no_leidos = CASE WHEN $2 = true THEN no_leidos + 1 ELSE no_leidos END,
      updated_at = NOW()
    WHERE id = $3 AND tenant_id = $4
  `;
  await query(updateConvSql, [
    previewText.substring(0, 500),
    data.es_entrante,
    conversacionId,
    tenantId,
  ]);

  return mensaje;
}

/**
 * Assign a conversation to a user.
 */
export async function assignConversacion(
  tenantId: string,
  conversacionId: string,
  usuarioId: string
): Promise<Conversacion | null> {
  return updateConversacion(tenantId, conversacionId, { usuario_asignado_id: usuarioId });
}
