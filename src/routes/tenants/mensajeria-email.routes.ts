/**
 * MÓDULO DE MENSAJERÍA EMAIL - Rutas REST
 *
 * Per-user email inbox via MXRoute (IMAP read + SMTP send).
 *
 * Endpoints:
 *   Credentials: POST/GET/DELETE credentials, POST test-connection
 *   Sync:        POST sync (manual trigger)
 *   Read:        GET inbox, GET sent, GET email/:mensajeId
 *   Send:        POST send, POST reply, POST forward
 *   Actions:     PUT read, PUT star
 */

import express, { Request, Response, NextFunction } from 'express';
import { resolveUserScope } from '../../middleware/scopeResolver.js';

import {
  getCredentials,
  getDecryptedCredentials,
  saveCredentials,
  deleteCredentials,
  updateSyncState,
} from '../../services/userEmailCredentialsService.js';

import {
  testConnection as testImapConnection,
} from '../../services/emailImapService.js';

import {
  testConnection as testSmtpConnection,
  sendEmail,
  replyToEmail,
  forwardEmail,
} from '../../services/emailSmtpService.js';

import { syncUserInbox } from '../../services/emailSyncService.js';

import {
  getConversaciones,
  getConversacionById,
  getMensajes,
  createMensaje,
  markAsRead as markConversationAsRead,
} from '../../services/mensajeriaService.js';

import { query } from '../../utils/db.js';

const router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

interface TenantParams { tenantId: string }
interface MensajeParams extends TenantParams { mensajeId: string }

// ==================== CREDENTIALS ====================

/**
 * GET /api/tenants/:tenantId/mensajeria-email/credentials
 * Get email credentials for the current user (passwords excluded).
 */
router.get('/credentials', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id } = req.query;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id query param es requerido' });
    }

    const creds = await getCredentials(tenantId, usuario_id as string);
    if (!creds) {
      return res.json(null);
    }

    // Never expose encrypted passwords
    const { imap_password_encrypted, smtp_password_encrypted, ...safe } = creds;
    res.json({
      ...safe,
      has_imap_password: !!imap_password_encrypted,
      has_smtp_password: !!smtp_password_encrypted,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria-email/credentials
 * Save or update email credentials.
 */
router.post('/credentials', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id, ...data } = req.body;

    if (!usuario_id || !data.email_address) {
      return res.status(400).json({ error: 'usuario_id y email_address son requeridos' });
    }

    if (!data.imap_host || !data.smtp_host) {
      return res.status(400).json({ error: 'imap_host y smtp_host son requeridos. Revisa tu panel de correo (cPanel/MXRoute) para obtener el hostname correcto.' });
    }

    const saved = await saveCredentials(tenantId, usuario_id, data);

    // Return without encrypted passwords
    const { imap_password_encrypted, smtp_password_encrypted, ...safe } = saved;
    res.json({
      ...safe,
      has_imap_password: !!imap_password_encrypted,
      has_smtp_password: !!smtp_password_encrypted,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/mensajeria-email/credentials
 * Delete email credentials for a user.
 */
router.delete('/credentials', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id } = req.query;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id query param es requerido' });
    }

    await deleteCredentials(tenantId, usuario_id as string);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria-email/test-connection
 * Test IMAP and SMTP connections.
 */
router.post('/test-connection', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id es requerido' });
    }

    const creds = await getDecryptedCredentials(tenantId, usuario_id);
    if (!creds) {
      return res.status(404).json({ error: 'No hay credenciales configuradas' });
    }

    const [imapResult, smtpResult] = await Promise.allSettled([
      testImapConnection(creds.imap),
      testSmtpConnection(creds.smtp),
    ]);

    const imapOk = imapResult.status === 'fulfilled' ? imapResult.value : { success: false, error: 'IMAP test failed' };
    const smtpOk = smtpResult.status === 'fulfilled' ? smtpResult.value : { success: false, error: 'SMTP test failed' };

    const isConnected = imapOk.success && smtpOk.success;

    // Update connection status
    await updateSyncState(creds.id, {
      is_connected: isConnected,
      last_error: isConnected ? null : (imapOk.error || smtpOk.error || null),
    });

    res.json({
      imap: imapOk,
      smtp: smtpOk,
      is_connected: isConnected,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== SYNC ====================

/**
 * POST /api/tenants/:tenantId/mensajeria-email/sync
 * Manually trigger email sync for a user.
 */
router.post('/sync', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id es requerido' });
    }

    const result = await syncUserInbox(tenantId, usuario_id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==================== READ ====================

/**
 * GET /api/tenants/:tenantId/mensajeria-email/inbox
 * Get email conversations for a user (inbox = incoming emails).
 */
router.get('/inbox', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id, page, limit, busqueda, carpeta } = req.query;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id query param es requerido' });
    }

    const result = await getConversaciones(tenantId, {
      usuario_id: usuario_id as string,
      canal: 'email',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      busqueda: busqueda as string,
      carpeta: carpeta as 'bandeja' | 'enviados' | 'spam' | 'eliminados' | undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/mensajeria-email/conversacion/:conversacionId/mensajes
 * Get all messages (emails) in a conversation thread.
 */
router.get('/conversacion/:conversacionId/mensajes', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, conversacionId } = req.params;
    const { page, limit } = req.query;

    const result = await getMensajes(
      tenantId,
      conversacionId,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined,
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/mensajeria-email/mensaje/:mensajeId
 * Get a single email message by ID.
 */
router.get('/mensaje/:mensajeId', async (req: Request<MensajeParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, mensajeId } = req.params;

    const sql = 'SELECT * FROM mensajes WHERE id = $1 AND tenant_id = $2';
    const result = await query(sql, [mensajeId, tenantId]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ==================== SEND ====================

/**
 * POST /api/tenants/:tenantId/mensajeria-email/send
 * Send a new email (creates a new conversation).
 */
router.post('/send', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id, to, cc, bcc, subject, html, text, attachments } = req.body;

    if (!usuario_id || !to || !subject) {
      return res.status(400).json({ error: 'usuario_id, to, y subject son requeridos' });
    }

    const creds = await getDecryptedCredentials(tenantId, usuario_id);
    if (!creds) {
      return res.status(400).json({ error: 'No hay credenciales de email configuradas' });
    }

    // Send via SMTP
    const sentResult = await sendEmail(creds.smtp, {
      from: creds.email_address,
      fromName: creds.display_name || undefined,
      to,
      cc,
      bcc,
      subject,
      html: html || text || '',
      text,
      attachments,
    });

    // Create conversation + message in DB for the sent email
    const { findOrCreateConversacion } = await import('../../services/mensajeriaService.js');

    const conversacion = await findOrCreateConversacion(
      tenantId,
      'email',
      sentResult.messageId,
      {
        external_participant_id: to,
        contacto_nombre: to,
        usuario_asignado_id: usuario_id,
        metadata: { email_subject: subject, user_email: creds.email_address },
      }
    );

    const mensaje = await createMensaje(tenantId, conversacion.id, {
      es_entrante: false,
      remitente_nombre: creds.display_name || creds.email_address,
      remitente_id: creds.email_address,
      tipo: 'email',
      contenido: html || text || '',
      contenido_plain: text || '',
      email_asunto: subject,
      email_de: creds.email_address,
      email_para: to,
      email_cc: cc,
      email_bcc: bcc,
      email_message_id: sentResult.messageId,
      estado: 'enviado',
    });

    res.status(201).json({ conversacion, mensaje });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria-email/reply
 * Reply to an existing email conversation.
 */
router.post('/reply', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id, conversacion_id, to, cc, bcc, subject, html, text } = req.body;

    if (!usuario_id || !conversacion_id || !to) {
      return res.status(400).json({ error: 'usuario_id, conversacion_id, y to son requeridos' });
    }

    const creds = await getDecryptedCredentials(tenantId, usuario_id);
    if (!creds) {
      return res.status(400).json({ error: 'No hay credenciales de email configuradas' });
    }

    // Find the last incoming message for reply headers
    const lastMsgSql = `
      SELECT email_message_id, email_references, email_asunto
      FROM mensajes
      WHERE conversacion_id = $1 AND tenant_id = $2 AND es_entrante = true
      ORDER BY created_at DESC LIMIT 1
    `;
    const lastMsg = await query(lastMsgSql, [conversacion_id, tenantId]);
    const original = lastMsg.rows[0];

    const replySubject = subject || (original?.email_asunto ? `Re: ${original.email_asunto.replace(/^Re:\s*/i, '')}` : 'Re:');

    const sentResult = await replyToEmail(creds.smtp, {
      from: creds.email_address,
      fromName: creds.display_name || undefined,
      to,
      cc,
      bcc,
      subject: replySubject,
      html: html || text || '',
      text,
      originalMessageId: original?.email_message_id || '',
      originalReferences: original?.email_references || '',
    });

    const mensaje = await createMensaje(tenantId, conversacion_id, {
      es_entrante: false,
      remitente_nombre: creds.display_name || creds.email_address,
      remitente_id: creds.email_address,
      tipo: 'email',
      contenido: html || text || '',
      contenido_plain: text || '',
      email_asunto: replySubject,
      email_de: creds.email_address,
      email_para: to,
      email_cc: cc,
      email_bcc: bcc,
      email_message_id: sentResult.messageId,
      email_in_reply_to: original?.email_message_id,
      email_references: original?.email_references
        ? `${original.email_references} ${original.email_message_id}`
        : original?.email_message_id,
      estado: 'enviado',
    });

    res.status(201).json(mensaje);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria-email/forward
 * Forward an email.
 */
router.post('/forward', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id, mensaje_id, to, cc, bcc, html, text } = req.body;

    if (!usuario_id || !mensaje_id || !to) {
      return res.status(400).json({ error: 'usuario_id, mensaje_id, y to son requeridos' });
    }

    const creds = await getDecryptedCredentials(tenantId, usuario_id);
    if (!creds) {
      return res.status(400).json({ error: 'No hay credenciales de email configuradas' });
    }

    // Get original message
    const origSql = 'SELECT * FROM mensajes WHERE id = $1 AND tenant_id = $2';
    const origResult = await query(origSql, [mensaje_id, tenantId]);
    const original = origResult.rows[0];

    if (!original) {
      return res.status(404).json({ error: 'Mensaje original no encontrado' });
    }

    const fwdSubject = `Fwd: ${(original.email_asunto || '').replace(/^Fwd:\s*/i, '')}`;

    const sentResult = await forwardEmail(creds.smtp, {
      from: creds.email_address,
      fromName: creds.display_name || undefined,
      to,
      cc,
      bcc,
      subject: fwdSubject,
      html: html || original.contenido || '',
      text: text || original.contenido_plain || '',
    });

    const mensaje = await createMensaje(tenantId, original.conversacion_id, {
      es_entrante: false,
      remitente_nombre: creds.display_name || creds.email_address,
      remitente_id: creds.email_address,
      tipo: 'email',
      contenido: html || original.contenido || '',
      contenido_plain: text || original.contenido_plain || '',
      email_asunto: fwdSubject,
      email_de: creds.email_address,
      email_para: to,
      email_cc: cc,
      email_bcc: bcc,
      email_message_id: sentResult.messageId,
      estado: 'enviado',
    });

    res.status(201).json(mensaje);
  } catch (error) {
    next(error);
  }
});

// ==================== ACTIONS ====================

/**
 * PUT /api/tenants/:tenantId/mensajeria-email/conversacion/:conversacionId/read
 * Mark an email conversation as read.
 */
router.put('/conversacion/:conversacionId/read', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, conversacionId } = req.params;
    await markConversationAsRead(tenantId, conversacionId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});


/**
 * PUT /api/tenants/:tenantId/mensajeria-email/conversacion/:conversacionId/estado
 * Change conversation state (archive, spam, delete, restore).
 */
router.put('/conversacion/:conversacionId/estado', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tenantId, conversacionId } = req.params;
    const { estado } = req.body;

    if (!estado || !['abierta', 'cerrada', 'archivada', 'spam', 'eliminada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const { updateConversacion } = await import('../../services/mensajeriaService.js');
    const result = await updateConversacion(tenantId, conversacionId, { estado });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/mensajeria-email/unread-count
 * Get total unread count for a user (for sidebar badge).
 */
router.get('/unread-count', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id } = req.query;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id query param es requerido' });
    }

    const sql = `
      SELECT COALESCE(SUM(no_leidos), 0) as total
      FROM conversaciones
      WHERE tenant_id = $1
        AND usuario_asignado_id = $2
        AND canal = 'email'
        AND estado NOT IN ('eliminada', 'spam')
    `;
    const result = await query(sql, [tenantId, usuario_id]);
    res.json({ unread: parseInt(result.rows[0].total) || 0 });
  } catch (error) {
    next(error);
  }
});
export default router;
