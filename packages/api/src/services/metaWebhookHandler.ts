/**
 * Meta Webhook Handler
 *
 * Processes incoming webhook events from Meta (Facebook Messenger, Instagram DMs, WhatsApp).
 * Webhook payload is verified by the route layer (X-Hub-Signature-256).
 *
 * For each incoming message:
 * 1. Identify the tenant + user from the page/account ID
 * 2. Find or create a conversacion in our DB
 * 3. Create a mensaje record
 * 4. (Future) Notify via WebSocket/SSE
 *
 * Supported object types:
 * - page: Facebook Messenger (entry.messaging[])
 * - instagram: Instagram DMs (entry.messaging[])
 * - whatsapp_business_account: WhatsApp (entry.changes[].value.messages/statuses)
 */

import { query } from '../utils/db.js';
import { decryptValue } from './tenantApiCredentialsService.js';
import * as mensajeriaService from './mensajeriaService.js';
import * as metaMessagingService from './metaMessagingService.js';
import * as instagramMessagingService from './instagramMessagingService.js';
import * as whatsappCloudService from './whatsappCloudService.js';
import type { WAWebhookValue, WAIncomingMessage, WAStatusUpdate } from './whatsappCloudService.js';

// ==================== TYPES ====================

interface WebhookEntry {
  id: string; // Page ID
  time: number;
  messaging?: MessagingEvent[];
}

interface MessagingEvent {
  sender: { id: string };    // PSID of the sender
  recipient: { id: string }; // Page ID
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: 'image' | 'video' | 'audio' | 'file' | 'fallback' | 'location';
      payload: {
        url?: string;
        title?: string;
        sticker_id?: number;
        coordinates?: { lat: number; long: number };
      };
    }>;
    is_echo?: boolean;
    app_id?: number;
  };
  delivery?: {
    mids: string[];
    watermark: number;
  };
  read?: {
    watermark: number;
  };
}

interface PageLookupResult {
  tenantId: string;
  pageAccessToken: string;
  pageId: string;
  instagramAccountId?: string;
  usuarioId: string | null;
  source: 'user' | 'tenant';
}

interface WhatsAppLookupResult {
  tenantId: string;
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
}

// ==================== MAIN HANDLER ====================

/**
 * Process the full webhook payload from Meta.
 * Called by the route after signature verification.
 */
export async function handleWebhookPayload(body: any): Promise<void> {
  const objectType = body.object;

  if (objectType === 'whatsapp_business_account') {
    await handleWhatsAppPayload(body);
    return;
  }

  if (objectType !== 'page' && objectType !== 'instagram') {
    console.log(`[MetaWebhook] Ignoring object: ${objectType}`);
    return;
  }

  const entries: WebhookEntry[] = body.entry || [];

  for (const entry of entries) {
    const entryId = entry.id; // Page ID for FB, IG Business Account ID for Instagram

    if (!entry.messaging || entry.messaging.length === 0) {
      continue;
    }

    // Look up tenant/user
    const lookup = objectType === 'instagram'
      ? await lookupInstagramOwner(entryId)
      : await lookupPageOwner(entryId);

    if (!lookup) {
      console.warn(`[MetaWebhook] No tenant found for ${objectType} entry ${entryId}`);
      continue;
    }

    const canal = objectType === 'instagram' ? 'instagram_dm' : 'facebook_dm';

    for (const event of entry.messaging) {
      try {
        if (event.message && !event.message.is_echo) {
          await handleIncomingMessage(lookup, event, canal);
        } else if (event.message && event.message.is_echo) {
          await handleEchoMessage(lookup, event, canal);
        } else if (event.delivery) {
          await handleDelivery(lookup, event, canal);
        } else if (event.read) {
          await handleRead(lookup, event, canal);
        }
      } catch (error: any) {
        console.error(`[MetaWebhook] Error processing ${canal} event from ${event.sender.id}:`, error.message);
      }
    }
  }
}

// ==================== EVENT HANDLERS ====================

/**
 * Handle an incoming message from a user.
 */
async function handleIncomingMessage(
  lookup: PageLookupResult,
  event: MessagingEvent,
  canal: 'facebook_dm' | 'instagram_dm' = 'facebook_dm'
): Promise<void> {
  const senderId = event.sender.id; // PSID for FB, IGSID for IG
  const message = event.message!;

  // Get sender profile for display name
  let senderName = senderId;
  let senderAvatar: string | undefined;
  try {
    if (canal === 'instagram_dm') {
      const profile = await instagramMessagingService.getUserProfile(lookup.pageAccessToken, senderId);
      senderName = profile.name || profile.username || senderId;
      senderAvatar = profile.profile_picture_url || undefined;
    } else {
      const profile = await metaMessagingService.getUserProfile(lookup.pageAccessToken, senderId);
      senderName = profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || senderId;
      senderAvatar = profile.profile_pic || undefined;
    }
  } catch {
    // Profile lookup can fail for some users; use ID as fallback
  }

  // Find or create conversation
  const conversacion = await mensajeriaService.findOrCreateConversacion(
    lookup.tenantId,
    canal,
    senderId, // PSID or IGSID as external_conversation_id
    {
      external_participant_id: senderId,
      contacto_nombre: senderName,
      contacto_avatar_url: senderAvatar,
      usuario_asignado_id: lookup.usuarioId || undefined,
      metadata: { pageId: lookup.pageId, instagramAccountId: lookup.instagramAccountId },
    }
  );

  // Update contact name/avatar if we got newer info
  if (senderName !== senderId) {
    await mensajeriaService.updateConversacion(lookup.tenantId, conversacion.id, {
      contacto_nombre: senderName,
    });
  }

  // Determine message type and content
  let tipo: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text';
  let contenido = message.text || '';
  const adjuntos: any[] = [];

  if (message.attachments && message.attachments.length > 0) {
    for (const att of message.attachments) {
      const attType = att.type;
      if (attType === 'image') tipo = 'image';
      else if (attType === 'video') tipo = 'video';
      else if (attType === 'audio') tipo = 'audio';
      else if (attType === 'file') tipo = 'document';

      adjuntos.push({
        type: attType,
        url: att.payload?.url || null,
        title: att.payload?.title || null,
        sticker_id: att.payload?.sticker_id || null,
      });
    }

    // If no text but has attachments, use type as content preview
    if (!contenido && adjuntos.length > 0) {
      contenido = `[${tipo}]`;
    }
  }

  // Create message in DB
  await mensajeriaService.createMensaje(lookup.tenantId, conversacion.id, {
    es_entrante: true,
    remitente_nombre: senderName,
    remitente_id: senderId,
    tipo,
    contenido,
    contenido_plain: message.text || contenido,
    adjuntos,
    external_message_id: message.mid,
    estado: 'entregado',
    metadata: {
      timestamp: event.timestamp,
      pageId: lookup.pageId,
    },
  });

  // Mark as seen (FB only — Instagram doesn't support sender actions the same way)
  if (canal === 'facebook_dm') {
    try {
      await metaMessagingService.sendSenderAction(
        lookup.pageAccessToken,
        senderId,
        'mark_seen'
      );
    } catch {
      // Non-critical
    }
  }
}

/**
 * Handle echo messages (messages sent BY the page, e.g. from our API or manually).
 * These represent outgoing messages that we may not have originated from our system.
 */
async function handleEchoMessage(
  lookup: PageLookupResult,
  event: MessagingEvent,
  canal: 'facebook_dm' | 'instagram_dm' = 'facebook_dm'
): Promise<void> {
  const recipientId = event.recipient.id === lookup.pageId
    ? event.sender.id
    : event.recipient.id;
  const message = event.message!;

  // Find existing conversation
  const existingSql = `
    SELECT id FROM conversaciones
    WHERE tenant_id = $1 AND canal = $2 AND external_conversation_id = $3
  `;
  const existing = await query(existingSql, [lookup.tenantId, canal, recipientId]);
  if (!existing.rows[0]) {
    // No conversation yet — this echo is for a conversation we don't track
    return;
  }

  // Check if this message already exists (we created it via our API)
  const dupSql = `
    SELECT id FROM mensajes
    WHERE tenant_id = $1 AND external_message_id = $2
  `;
  const dup = await query(dupSql, [lookup.tenantId, message.mid]);
  if (dup.rows[0]) {
    return; // Already recorded
  }

  // Record the outgoing message (sent from FB page directly or another channel)
  await mensajeriaService.createMensaje(lookup.tenantId, existing.rows[0].id, {
    es_entrante: false,
    tipo: 'text',
    contenido: message.text || '[attachment]',
    contenido_plain: message.text || '',
    external_message_id: message.mid,
    estado: 'enviado',
    metadata: { echo: true, timestamp: event.timestamp },
  });
}

/**
 * Handle delivery receipts.
 * Updates message status to 'entregado'.
 */
async function handleDelivery(
  lookup: PageLookupResult,
  event: MessagingEvent,
  _canal: 'facebook_dm' | 'instagram_dm' = 'facebook_dm'
): Promise<void> {
  const delivery = event.delivery!;
  if (!delivery.mids || delivery.mids.length === 0) return;

  for (const mid of delivery.mids) {
    await query(
      `UPDATE mensajes SET estado = 'entregado' WHERE tenant_id = $1 AND external_message_id = $2 AND estado = 'enviado'`,
      [lookup.tenantId, mid]
    );
  }
}

/**
 * Handle read receipts.
 * Updates all messages before the watermark as 'leido'.
 */
async function handleRead(
  lookup: PageLookupResult,
  event: MessagingEvent,
  canal: 'facebook_dm' | 'instagram_dm' = 'facebook_dm'
): Promise<void> {
  const senderId = event.sender.id;

  // Find the conversation
  const convSql = `
    SELECT id FROM conversaciones
    WHERE tenant_id = $1 AND canal = $2 AND external_conversation_id = $3
  `;
  const convResult = await query(convSql, [lookup.tenantId, canal, senderId]);
  if (!convResult.rows[0]) return;

  // Mark all outgoing messages in this conversation as read
  await query(
    `UPDATE mensajes SET estado = 'leido'
     WHERE tenant_id = $1 AND conversacion_id = $2 AND es_entrante = false AND estado IN ('enviado', 'entregado')`,
    [lookup.tenantId, convResult.rows[0].id]
  );
}

// ==================== PAGE LOOKUP ====================

/**
 * Look up which tenant (and optionally which user) owns a given Facebook Page ID.
 * Checks per-user accounts first, then falls back to tenant-level credentials.
 */
async function lookupPageOwner(pageId: string): Promise<PageLookupResult | null> {
  // 1. Check per-user accounts (asesor_social_accounts)
  const userSql = `
    SELECT
      asa.tenant_id,
      asa.usuario_id,
      asa.access_token_encrypted,
      asa.account_id
    FROM asesor_social_accounts asa
    WHERE asa.account_id = $1 AND asa.platform = 'facebook' AND asa.is_active = true
    LIMIT 1
  `;
  const userResult = await query(userSql, [pageId]);
  if (userResult.rows[0]) {
    const row = userResult.rows[0];
    const pageAccessToken = await decryptValue(row.access_token_encrypted);
    return {
      tenantId: row.tenant_id,
      pageAccessToken,
      pageId,
      usuarioId: row.usuario_id,
      source: 'user',
    };
  }

  // 2. Fallback: check tenant-level credentials
  const tenantSql = `
    SELECT
      tenant_id,
      meta_page_access_token_encrypted,
      meta_page_id
    FROM tenant_api_credentials
    WHERE meta_page_id = $1 AND meta_connected = true
    LIMIT 1
  `;
  const tenantResult = await query(tenantSql, [pageId]);
  if (tenantResult.rows[0]) {
    const row = tenantResult.rows[0];
    const pageAccessToken = await decryptValue(row.meta_page_access_token_encrypted);
    return {
      tenantId: row.tenant_id,
      pageAccessToken,
      pageId,
      usuarioId: null,
      source: 'tenant',
    };
  }

  return null;
}

/**
 * Look up which tenant (and optionally which user) owns a given Instagram Business Account ID.
 * Instagram webhook entries use the IG Business Account ID (not the Page ID).
 * Checks per-user accounts first, then falls back to tenant-level credentials.
 */
async function lookupInstagramOwner(igAccountId: string): Promise<PageLookupResult | null> {
  // 1. Check per-user accounts (asesor_social_accounts with meta_ig_account_id)
  const userSql = `
    SELECT
      asa.tenant_id,
      asa.usuario_id,
      asa.access_token_encrypted,
      asa.account_id,
      asa.meta_ig_account_id
    FROM asesor_social_accounts asa
    WHERE asa.meta_ig_account_id = $1 AND asa.platform = 'facebook' AND asa.is_active = true
    LIMIT 1
  `;
  const userResult = await query(userSql, [igAccountId]);
  if (userResult.rows[0]) {
    const row = userResult.rows[0];
    const pageAccessToken = await decryptValue(row.access_token_encrypted);
    return {
      tenantId: row.tenant_id,
      pageAccessToken,
      pageId: row.account_id, // Facebook Page ID (used for sending)
      instagramAccountId: row.meta_ig_account_id,
      usuarioId: row.usuario_id,
      source: 'user',
    };
  }

  // 2. Fallback: check tenant-level credentials
  const tenantSql = `
    SELECT
      tenant_id,
      meta_page_access_token_encrypted,
      meta_page_id,
      meta_instagram_business_account_id
    FROM tenant_api_credentials
    WHERE meta_instagram_business_account_id = $1 AND meta_connected = true
    LIMIT 1
  `;
  const tenantResult = await query(tenantSql, [igAccountId]);
  if (tenantResult.rows[0]) {
    const row = tenantResult.rows[0];
    const pageAccessToken = await decryptValue(row.meta_page_access_token_encrypted);
    return {
      tenantId: row.tenant_id,
      pageAccessToken,
      pageId: row.meta_page_id,
      instagramAccountId: row.meta_instagram_business_account_id,
      usuarioId: null,
      source: 'tenant',
    };
  }

  return null;
}

// ==================== WHATSAPP HANDLERS ====================

/**
 * Process WhatsApp webhook payload.
 * WhatsApp uses entry[].changes[].value instead of entry[].messaging[].
 */
async function handleWhatsAppPayload(body: any): Promise<void> {
  const entries = body.entry || [];

  for (const entry of entries) {
    const wabaId = entry.id; // WhatsApp Business Account ID

    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;

      const value: WAWebhookValue = change.value;
      if (!value || value.messaging_product !== 'whatsapp') continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // Look up tenant
      const lookup = await lookupWhatsAppOwner(phoneNumberId, wabaId);
      if (!lookup) {
        console.warn(`[MetaWebhook] No tenant found for WhatsApp phone ${phoneNumberId}`);
        continue;
      }

      // Process incoming messages
      if (value.messages) {
        for (const msg of value.messages) {
          try {
            const contactName = value.contacts?.find(c => c.wa_id === msg.from)?.profile?.name || msg.from;
            await handleWhatsAppIncomingMessage(lookup, msg, contactName);
          } catch (error: any) {
            console.error(`[MetaWebhook] Error processing WhatsApp message from ${msg.from}:`, error.message);
          }
        }
      }

      // Process status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          try {
            await handleWhatsAppStatus(lookup, status);
          } catch (error: any) {
            console.error(`[MetaWebhook] Error processing WhatsApp status ${status.id}:`, error.message);
          }
        }
      }
    }
  }
}

/**
 * Handle an incoming WhatsApp message.
 */
async function handleWhatsAppIncomingMessage(
  lookup: WhatsAppLookupResult,
  msg: WAIncomingMessage,
  contactName: string
): Promise<void> {
  const senderWaId = msg.from; // Phone number in international format

  // Find or create conversation
  const conversacion = await mensajeriaService.findOrCreateConversacion(
    lookup.tenantId,
    'whatsapp',
    senderWaId,
    {
      external_participant_id: senderWaId,
      contacto_nombre: contactName,
      metadata: { phoneNumberId: lookup.phoneNumberId, wabaId: lookup.wabaId },
    }
  );

  // Update contact name if we got a profile name
  if (contactName !== senderWaId) {
    await mensajeriaService.updateConversacion(lookup.tenantId, conversacion.id, {
      contacto_nombre: contactName,
    });
  }

  // Determine message type and content
  let tipo: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text';
  let contenido = '';
  const adjuntos: any[] = [];

  switch (msg.type) {
    case 'text':
      contenido = msg.text?.body || '';
      break;
    case 'image':
      tipo = 'image';
      contenido = msg.image?.caption || '[image]';
      adjuntos.push({ type: 'image', media_id: msg.image?.id, mime_type: msg.image?.mime_type });
      break;
    case 'video':
      tipo = 'video';
      contenido = msg.video?.caption || '[video]';
      adjuntos.push({ type: 'video', media_id: msg.video?.id, mime_type: msg.video?.mime_type });
      break;
    case 'audio':
      tipo = 'audio';
      contenido = '[audio]';
      adjuntos.push({ type: 'audio', media_id: msg.audio?.id, mime_type: msg.audio?.mime_type });
      break;
    case 'document':
      tipo = 'document';
      contenido = msg.document?.caption || msg.document?.filename || '[document]';
      adjuntos.push({ type: 'document', media_id: msg.document?.id, mime_type: msg.document?.mime_type, filename: msg.document?.filename });
      break;
    case 'sticker':
      tipo = 'image';
      contenido = '[sticker]';
      adjuntos.push({ type: 'sticker', media_id: msg.sticker?.id, mime_type: msg.sticker?.mime_type });
      break;
    case 'location':
      contenido = msg.location?.name
        ? `${msg.location.name}${msg.location.address ? ` - ${msg.location.address}` : ''}`
        : `${msg.location?.latitude}, ${msg.location?.longitude}`;
      break;
    case 'contacts':
      contenido = msg.contacts?.map(c => c.name.formatted_name).join(', ') || '[contacts]';
      break;
    case 'reaction':
      // Reactions are not standalone messages; skip
      return;
    default:
      contenido = `[${msg.type}]`;
  }

  // Create message in DB
  await mensajeriaService.createMensaje(lookup.tenantId, conversacion.id, {
    es_entrante: true,
    remitente_nombre: contactName,
    remitente_id: senderWaId,
    tipo,
    contenido,
    contenido_plain: msg.text?.body || contenido,
    adjuntos: adjuntos.length > 0 ? adjuntos : undefined,
    external_message_id: msg.id,
    estado: 'entregado',
    metadata: {
      timestamp: msg.timestamp,
      phoneNumberId: lookup.phoneNumberId,
      context: msg.context || undefined,
    },
  });

  // Mark as read on WhatsApp
  try {
    await whatsappCloudService.markMessageAsRead(
      lookup.accessToken,
      lookup.phoneNumberId,
      msg.id
    );
  } catch {
    // Non-critical
  }
}

/**
 * Handle WhatsApp status updates (sent, delivered, read, failed).
 */
async function handleWhatsAppStatus(
  lookup: WhatsAppLookupResult,
  status: WAStatusUpdate
): Promise<void> {
  const estadoMap: Record<string, string> = {
    sent: 'enviado',
    delivered: 'entregado',
    read: 'leido',
    failed: 'fallido',
  };

  const newEstado = estadoMap[status.status];
  if (!newEstado) return;

  if (status.status === 'failed') {
    const errorMsg = status.errors?.map(e => `${e.code}: ${e.title}`).join('; ') || 'Unknown error';
    await query(
      `UPDATE mensajes SET estado = 'fallido', error_mensaje = $1 WHERE tenant_id = $2 AND external_message_id = $3`,
      [errorMsg, lookup.tenantId, status.id]
    );
  } else {
    // Only upgrade status (sent -> delivered -> read), never downgrade
    const statusOrder = ['enviado', 'entregado', 'leido'];
    const currentIdx = statusOrder.indexOf(newEstado);
    const lowerStatuses = statusOrder.slice(0, currentIdx);

    if (lowerStatuses.length > 0) {
      const placeholders = lowerStatuses.map((_, i) => `$${i + 4}`).join(', ');
      await query(
        `UPDATE mensajes SET estado = $1 WHERE tenant_id = $2 AND external_message_id = $3 AND estado IN (${placeholders})`,
        [newEstado, lookup.tenantId, status.id, ...lowerStatuses]
      );
    } else {
      // 'enviado' is the first status — just set it
      await query(
        `UPDATE mensajes SET estado = $1 WHERE tenant_id = $2 AND external_message_id = $3`,
        [newEstado, lookup.tenantId, status.id]
      );
    }
  }
}

// ==================== WHATSAPP LOOKUP ====================

/**
 * Look up which tenant owns a WhatsApp phone number.
 * Uses tenant_api_credentials (WhatsApp is tenant-level only, not per-user).
 */
async function lookupWhatsAppOwner(phoneNumberId: string, wabaId: string): Promise<WhatsAppLookupResult | null> {
  const sql = `
    SELECT
      tenant_id,
      whatsapp_access_token_encrypted,
      whatsapp_phone_number_id,
      whatsapp_business_account_id
    FROM tenant_api_credentials
    WHERE whatsapp_phone_number_id = $1 AND whatsapp_connected = true
    LIMIT 1
  `;
  const result = await query(sql, [phoneNumberId]);
  if (result.rows[0]) {
    const row = result.rows[0];
    const accessToken = await decryptValue(row.whatsapp_access_token_encrypted);
    return {
      tenantId: row.tenant_id,
      accessToken,
      phoneNumberId: row.whatsapp_phone_number_id,
      wabaId: row.whatsapp_business_account_id || wabaId,
    };
  }

  return null;
}
