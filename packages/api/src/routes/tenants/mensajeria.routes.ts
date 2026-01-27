/**
 * MÓDULO DE MENSAJERÍA - Rutas REST
 *
 * Unified inbox: conversations + messages across all channels.
 * Per-user scoped: each user sees their own assigned conversations.
 *
 * Endpoints:
 *   Conversaciones: GET list, GET :id, PUT :id, POST :id/read, POST :id/assign
 *   Mensajes:       GET :conversacionId/mensajes, POST :conversacionId/mensajes
 *   Etiquetas:      CRUD /etiquetas
 *   Firmas:         CRUD /firmas
 */

import express, { Request, Response, NextFunction } from 'express';
import { resolveUserScope } from '../../middleware/scopeResolver.js';

import {
  getConversaciones,
  getConversacionById,
  updateConversacion,
  markAsRead,
  getMensajes,
  createMensaje,
  assignConversacion,
} from '../../services/mensajeriaService.js';

import {
  getEtiquetas,
  getEtiquetaById,
  createEtiqueta,
  updateEtiqueta,
  deleteEtiqueta,
  seedDefaultEtiquetas,
} from '../../services/mensajeriaEtiquetasService.js';

import {
  getFirmas,
  getFirmaById,
  createFirma,
  updateFirma,
  deleteFirma,
} from '../../services/mensajeriaFirmasService.js';

import * as metaMessagingService from '../../services/metaMessagingService.js';
import * as instagramMessagingService from '../../services/instagramMessagingService.js';
import * as whatsappCloudService from '../../services/whatsappCloudService.js';
import { getMetaCredentialsWithFallback, getWhatsAppCredentials } from '../../services/tenantApiCredentialsService.js';
import { query as dbQuery } from '../../utils/db.js';

const router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

interface TenantParams { tenantId: string }
interface ConversacionParams extends TenantParams { conversacionId: string }
interface EtiquetaParams extends TenantParams { etiquetaId: string }
interface FirmaParams extends TenantParams { firmaId: string }

// ==================== CONVERSACIONES ====================

/**
 * GET /api/tenants/:tenantId/mensajeria/conversaciones
 * List conversations (paginated, filtered).
 * Query params: usuario_id, canal, estado, etiqueta_id, busqueda, page, limit
 */
router.get('/conversaciones', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id, canal, estado, etiqueta_id, busqueda, page, limit } = req.query;

    const result = await getConversaciones(tenantId, {
      usuario_id: usuario_id as string,
      canal: canal as any,
      estado: estado as any,
      etiqueta_id: etiqueta_id as string,
      busqueda: busqueda as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/mensajeria/conversaciones/:conversacionId
 */
router.get('/conversaciones/:conversacionId', async (req: Request<ConversacionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, conversacionId } = req.params;
    const conversacion = await getConversacionById(tenantId, conversacionId);
    if (!conversacion) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    res.json(conversacion);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/mensajeria/conversaciones/:conversacionId
 * Update conversation fields (estado, etiqueta_id, contacto_id, contacto_nombre).
 */
router.put('/conversaciones/:conversacionId', async (req: Request<ConversacionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, conversacionId } = req.params;
    const { estado, etiqueta_id, contacto_id, contacto_nombre, usuario_asignado_id } = req.body;

    const updated = await updateConversacion(tenantId, conversacionId, {
      estado,
      etiqueta_id,
      contacto_id,
      contacto_nombre,
      usuario_asignado_id,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria/conversaciones/:conversacionId/read
 * Mark conversation as read (reset unread counter).
 */
router.post('/conversaciones/:conversacionId/read', async (req: Request<ConversacionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, conversacionId } = req.params;
    await markAsRead(tenantId, conversacionId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria/conversaciones/:conversacionId/assign
 * Assign conversation to a user.
 */
router.post('/conversaciones/:conversacionId/assign', async (req: Request<ConversacionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, conversacionId } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id es requerido' });
    }

    const updated = await assignConversacion(tenantId, conversacionId, usuario_id);
    if (!updated) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// ==================== MENSAJES ====================

/**
 * GET /api/tenants/:tenantId/mensajeria/conversaciones/:conversacionId/mensajes
 * Get messages for a conversation (paginated, oldest first).
 */
router.get('/conversaciones/:conversacionId/mensajes', async (req: Request<ConversacionParams>, res: Response, next: NextFunction) => {
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
 * POST /api/tenants/:tenantId/mensajeria/conversaciones/:conversacionId/mensajes
 * Create a new message in a conversation.
 * For outgoing messages, this will later dispatch to the appropriate channel service.
 */
router.post('/conversaciones/:conversacionId/mensajes', async (req: Request<ConversacionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, conversacionId } = req.params;

    // Verify conversation exists
    const conv = await getConversacionById(tenantId, conversacionId);
    if (!conv) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const mensaje = await createMensaje(tenantId, conversacionId, {
      es_entrante: req.body.es_entrante ?? false,
      remitente_nombre: req.body.remitente_nombre,
      remitente_id: req.body.remitente_id,
      tipo: req.body.tipo,
      contenido: req.body.contenido,
      contenido_plain: req.body.contenido_plain,
      email_asunto: req.body.email_asunto,
      email_de: req.body.email_de,
      email_para: req.body.email_para,
      email_cc: req.body.email_cc,
      email_bcc: req.body.email_bcc,
      email_message_id: req.body.email_message_id,
      email_in_reply_to: req.body.email_in_reply_to,
      email_references: req.body.email_references,
      adjuntos: req.body.adjuntos,
      external_message_id: req.body.external_message_id,
      estado: req.body.estado,
      metadata: req.body.metadata,
    });

    // Dispatch outgoing messages to channel-specific services
    const esEntrante = req.body.es_entrante ?? false;
    if (!esEntrante && conv.canal === 'facebook_dm' && conv.external_participant_id) {
      try {
        const userId = (req as any).scope?.dbUserId;
        const creds = await getMetaCredentialsWithFallback(tenantId, userId);
        if (creds) {
          const result = await metaMessagingService.sendTextMessage(
            creds.pageAccessToken,
            conv.external_participant_id,
            req.body.contenido || ''
          );
          await dbQuery(
            `UPDATE mensajes SET external_message_id = $1, estado = 'enviado' WHERE id = $2`,
            [result.message_id, mensaje.id]
          );
        } else {
          await dbQuery(
            `UPDATE mensajes SET estado = 'fallido', error_mensaje = $1 WHERE id = $2`,
            ['No hay credenciales Meta configuradas', mensaje.id]
          );
        }
      } catch (sendError: any) {
        console.error(`[Mensajeria] FB send error for msg ${mensaje.id}:`, sendError.message);
        await dbQuery(
          `UPDATE mensajes SET estado = 'fallido', error_mensaje = $1 WHERE id = $2`,
          [sendError.message, mensaje.id]
        );
      }
    }
    // Instagram DM dispatch
    if (!esEntrante && conv.canal === 'instagram_dm' && conv.external_participant_id) {
      try {
        const userId = (req as any).scope?.dbUserId;
        const creds = await getMetaCredentialsWithFallback(tenantId, userId);
        if (creds && creds.instagramAccountId) {
          const result = await instagramMessagingService.sendTextMessage(
            creds.pageAccessToken,
            creds.instagramAccountId,
            conv.external_participant_id,
            req.body.contenido || ''
          );
          await dbQuery(
            `UPDATE mensajes SET external_message_id = $1, estado = 'enviado' WHERE id = $2`,
            [result.message_id, mensaje.id]
          );
        } else {
          await dbQuery(
            `UPDATE mensajes SET estado = 'fallido', error_mensaje = $1 WHERE id = $2`,
            ['No hay credenciales Instagram configuradas', mensaje.id]
          );
        }
      } catch (sendError: any) {
        console.error(`[Mensajeria] IG send error for msg ${mensaje.id}:`, sendError.message);
        await dbQuery(
          `UPDATE mensajes SET estado = 'fallido', error_mensaje = $1 WHERE id = $2`,
          [sendError.message, mensaje.id]
        );
      }
    }
    // WhatsApp dispatch
    if (!esEntrante && conv.canal === 'whatsapp' && conv.external_participant_id) {
      try {
        const waCreds = await getWhatsAppCredentials(tenantId);
        if (waCreds) {
          const result = await whatsappCloudService.sendTextMessage(
            waCreds.accessToken,
            waCreds.phoneNumberId,
            conv.external_participant_id,
            req.body.contenido || ''
          );
          const messageId = result.messages?.[0]?.id;
          if (messageId) {
            await dbQuery(
              `UPDATE mensajes SET external_message_id = $1, estado = 'enviado' WHERE id = $2`,
              [messageId, mensaje.id]
            );
          }
        } else {
          await dbQuery(
            `UPDATE mensajes SET estado = 'fallido', error_mensaje = $1 WHERE id = $2`,
            ['No hay credenciales WhatsApp configuradas', mensaje.id]
          );
        }
      } catch (sendError: any) {
        console.error(`[Mensajeria] WA send error for msg ${mensaje.id}:`, sendError.message);
        await dbQuery(
          `UPDATE mensajes SET estado = 'fallido', error_mensaje = $1 WHERE id = $2`,
          [sendError.message, mensaje.id]
        );
      }
    }

    res.status(201).json(mensaje);
  } catch (error) {
    next(error);
  }
});

// ==================== ETIQUETAS ====================

/**
 * GET /api/tenants/:tenantId/mensajeria/etiquetas
 */
router.get('/etiquetas', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const etiquetas = await getEtiquetas(tenantId);
    res.json(etiquetas);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria/etiquetas
 */
router.post('/etiquetas', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { codigo, nombre, color, orden } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({ error: 'codigo y nombre son requeridos' });
    }

    const etiqueta = await createEtiqueta(tenantId, { codigo, nombre, color, orden });
    res.status(201).json(etiqueta);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/mensajeria/etiquetas/:etiquetaId
 */
router.put('/etiquetas/:etiquetaId', async (req: Request<EtiquetaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, etiquetaId } = req.params;
    const { nombre, color, orden, codigo } = req.body;

    const updated = await updateEtiqueta(tenantId, etiquetaId, { nombre, color, orden, codigo });
    if (!updated) {
      return res.status(404).json({ error: 'Etiqueta no encontrada' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/mensajeria/etiquetas/:etiquetaId
 */
router.delete('/etiquetas/:etiquetaId', async (req: Request<EtiquetaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, etiquetaId } = req.params;
    const deleted = await deleteEtiqueta(tenantId, etiquetaId);
    if (!deleted) {
      return res.status(404).json({ error: 'Etiqueta no encontrada o es default' });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria/etiquetas/seed
 * Seed default etiquetas for a tenant (idempotent).
 */
router.post('/etiquetas/seed', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await seedDefaultEtiquetas(tenantId);
    const etiquetas = await getEtiquetas(tenantId);
    res.json(etiquetas);
  } catch (error) {
    next(error);
  }
});

// ==================== FIRMAS ====================

/**
 * GET /api/tenants/:tenantId/mensajeria/firmas
 * Get firmas for the current user. Requires usuario_id query param.
 */
router.get('/firmas', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id } = req.query;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id query param es requerido' });
    }

    const firmas = await getFirmas(tenantId, usuario_id as string);
    res.json(firmas);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria/firmas
 */
router.post('/firmas', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id, nombre, contenido_html, es_default } = req.body;

    if (!usuario_id || !nombre) {
      return res.status(400).json({ error: 'usuario_id y nombre son requeridos' });
    }

    const firma = await createFirma(tenantId, usuario_id, { nombre, contenido_html, es_default });
    res.status(201).json(firma);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/mensajeria/firmas/:firmaId
 */
router.put('/firmas/:firmaId', async (req: Request<FirmaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, firmaId } = req.params;
    const { nombre, contenido_html, es_default } = req.body;

    const updated = await updateFirma(tenantId, firmaId, { nombre, contenido_html, es_default });
    if (!updated) {
      return res.status(404).json({ error: 'Firma no encontrada' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/mensajeria/firmas/:firmaId
 */
router.delete('/firmas/:firmaId', async (req: Request<FirmaParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, firmaId } = req.params;
    const deleted = await deleteFirma(tenantId, firmaId);
    if (!deleted) {
      return res.status(404).json({ error: 'Firma no encontrada' });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
