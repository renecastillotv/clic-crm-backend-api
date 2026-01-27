/**
 * Email Sync Service
 *
 * Orchestrates IMAP → DB synchronization.
 * For each user with connected email credentials:
 *   1. Connects via IMAP
 *   2. Fetches new emails (incremental by UID)
 *   3. Groups by thread (email_message_id / in_reply_to)
 *   4. Creates conversaciones + mensajes in the unified inbox
 *
 * Called by cron every 2-3 minutes for all connected users.
 */

import { convert as htmlToText } from 'html-to-text';
import { fetchEmails, type ParsedEmail, type ImapCredentials } from './emailImapService.js';
import {
  getConnectedUsers,
  getDecryptedCredentials,
  updateSyncState,
} from './userEmailCredentialsService.js';
import {
  findOrCreateConversacion,
  createMensaje,
} from './mensajeriaService.js';
import { query } from '../utils/db.js';

/**
 * Sync inbox for a single user.
 * Returns the number of new emails synced.
 */
export async function syncUserInbox(
  tenantId: string,
  usuarioId: string
): Promise<{ synced: number; error?: string }> {
  const creds = await getDecryptedCredentials(tenantId, usuarioId);
  if (!creds) {
    return { synced: 0, error: 'No credentials found' };
  }

  const imapCreds: ImapCredentials = creds.imap;

  try {
    // Fetch new emails since last sync
    const emails = await fetchEmails(imapCreds, {
      folder: 'INBOX',
      sinceUid: creds.last_sync_uid,
      limit: 100,
    });

    if (emails.length === 0) {
      await updateSyncState(creds.id, {
        last_sync_at: new Date().toISOString(),
        last_error: null,
      });
      return { synced: 0 };
    }

    let synced = 0;
    let maxUid = creds.last_sync_uid ? parseInt(creds.last_sync_uid) : 0;

    for (const email of emails) {
      try {
        await processIncomingEmail(tenantId, usuarioId, creds.email_address, email);
        synced++;
        if (email.uid > maxUid) maxUid = email.uid;
      } catch (err: any) {
        console.error(`Error processing email UID ${email.uid}:`, err.message);
      }
    }

    await updateSyncState(creds.id, {
      is_connected: true,
      last_sync_at: new Date().toISOString(),
      last_sync_uid: String(maxUid),
      last_error: null,
    });

    return { synced };
  } catch (error: any) {
    await updateSyncState(creds.id, {
      last_sync_at: new Date().toISOString(),
      last_error: error.message || 'Sync failed',
    });
    return { synced: 0, error: error.message };
  }
}

/**
 * Process a single incoming email into the unified inbox.
 * - Find or create conversation by threading (email_message_id / in_reply_to)
 * - Create mensaje record
 */
async function processIncomingEmail(
  tenantId: string,
  usuarioId: string,
  userEmail: string,
  email: ParsedEmail
): Promise<void> {
  // Check for duplicate by external_message_id
  if (email.messageId) {
    const existing = await query(
      'SELECT id FROM mensajes WHERE tenant_id = $1 AND external_message_id = $2 LIMIT 1',
      [tenantId, email.messageId]
    );
    if (existing.rows.length > 0) return; // Already synced
  }

  // Determine conversation key by threading
  const threadId = resolveThreadId(email);

  // Find or create conversation
  const conversacion = await findOrCreateConversacion(
    tenantId,
    'email',
    threadId,
    {
      external_participant_id: email.from,
      contacto_nombre: email.fromName || email.from,
      usuario_asignado_id: usuarioId,
      metadata: {
        email_subject: email.subject,
        user_email: userEmail,
      },
    }
  );

  // Generate plain text from HTML
  const plainText = email.text || (email.html
    ? htmlToText(email.html, { wordwrap: false })
    : '');

  // Create message
  await createMensaje(tenantId, conversacion.id, {
    es_entrante: true,
    remitente_nombre: email.fromName || email.from,
    remitente_id: email.from,
    tipo: 'email',
    contenido: email.html || email.text || '',
    contenido_plain: plainText,
    email_asunto: email.subject,
    email_de: email.from,
    email_para: email.to,
    email_cc: email.cc || undefined,
    email_message_id: email.messageId || undefined,
    email_in_reply_to: email.inReplyTo || undefined,
    email_references: email.references || undefined,
    adjuntos: email.attachments.map(a => ({
      name: a.filename,
      type: a.contentType,
      size: a.size,
      // Note: In production, upload to R2 and store URL instead of content
    })),
    external_message_id: email.messageId || undefined,
    estado: 'entregado',
    metadata: {
      imap_uid: email.uid,
      flags: Array.from(email.flags),
    },
  });
}

/**
 * Resolve a thread ID for email grouping.
 * Uses In-Reply-To or References headers to group related emails.
 * Falls back to Message-ID for new threads.
 */
function resolveThreadId(email: ParsedEmail): string {
  // If this is a reply, use the In-Reply-To as the thread root
  if (email.inReplyTo) {
    return email.inReplyTo;
  }

  // If References exist, use the first one (original message)
  if (email.references) {
    const refs = email.references.split(/\s+/);
    if (refs.length > 0 && refs[0]) {
      return refs[0];
    }
  }

  // New thread — use own Message-ID or generate from subject+sender
  return email.messageId || `${email.from}:${email.subject}`;
}

/**
 * Sync all connected users' inboxes.
 * Called by cron endpoint.
 */
export async function syncAllConnectedUsers(): Promise<{
  processed: number;
  synced: number;
  errors: number;
  results: Array<{ usuario_id: string; synced: number; error?: string }>;
}> {
  const connectedUsers = await getConnectedUsers();
  const results: Array<{ usuario_id: string; synced: number; error?: string }> = [];
  let totalSynced = 0;
  let errors = 0;

  for (const user of connectedUsers) {
    const result = await syncUserInbox(user.tenant_id, user.usuario_id);
    results.push({
      usuario_id: user.usuario_id,
      synced: result.synced,
      error: result.error,
    });
    totalSynced += result.synced;
    if (result.error) errors++;
  }

  return {
    processed: connectedUsers.length,
    synced: totalSynced,
    errors,
    results,
  };
}
