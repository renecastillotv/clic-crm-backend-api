/**
 * MÓDULO DE MENSAJERÍA WEB CHAT - Rutas REST
 *
 * Web chat configuration and agent management.
 *
 * Endpoints:
 *   Config:     GET /config, PUT /config, POST /config/regenerate-key
 *   Agents:     GET /agents, POST /agents, DELETE /agents/:usuarioId
 *   Availability: PUT /agents/:usuarioId/availability
 *   Widget:     GET /widget-config (public, by API key)
 */

import express, { Request, Response, NextFunction } from 'express';
import { resolveUserScope } from '../../middleware/scopeResolver.js';
import * as webchatService from '../../services/webchatService.js';
import * as mensajeriaService from '../../services/mensajeriaService.js';

const router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

interface TenantParams { tenantId: string }

// ==================== CONFIG ====================

/**
 * GET /api/tenants/:tenantId/mensajeria-webchat/config
 * Get web chat config (creates default if not exists).
 */
router.get('/config', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const config = await webchatService.getConfig(tenantId);
    res.json(config);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/mensajeria-webchat/config
 * Update web chat config.
 */
router.put('/config', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const {
      enabled, widget_color, greeting_text, position,
      distribution_mode, offline_message, widget_title,
      widget_subtitle, business_hours,
    } = req.body;

    const updated = await webchatService.updateConfig(tenantId, {
      enabled, widget_color, greeting_text, position,
      distribution_mode, offline_message, widget_title,
      widget_subtitle, business_hours,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Config no encontrada' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria-webchat/config/regenerate-key
 * Regenerate the widget API key.
 */
router.post('/config/regenerate-key', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const newKey = await webchatService.regenerateApiKey(tenantId);
    res.json({ api_key: newKey });
  } catch (error) {
    next(error);
  }
});

// ==================== AGENTS ====================

/**
 * GET /api/tenants/:tenantId/mensajeria-webchat/agents
 * List all webchat agents for this tenant.
 */
router.get('/agents', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const agents = await webchatService.getAgents(tenantId);
    res.json(agents);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria-webchat/agents
 * Add a user as a webchat agent.
 * Body: { usuario_id, max_concurrent_chats? }
 */
router.post('/agents', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { usuario_id, max_concurrent_chats } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id es requerido' });
    }

    const agent = await webchatService.addAgent(tenantId, usuario_id, max_concurrent_chats || 5);
    res.status(201).json(agent);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/mensajeria-webchat/agents/:usuarioId
 * Remove a user as a webchat agent.
 */
router.delete('/agents/:usuarioId', async (req: Request<TenantParams & { usuarioId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const removed = await webchatService.removeAgent(tenantId, usuarioId);
    if (!removed) {
      return res.status(404).json({ error: 'Agente no encontrado' });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/mensajeria-webchat/agents/:usuarioId/availability
 * Set agent availability.
 * Body: { is_available: boolean }
 */
router.put('/agents/:usuarioId/availability', async (req: Request<TenantParams & { usuarioId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const { is_available } = req.body;

    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ error: 'is_available (boolean) es requerido' });
    }

    const agent = await webchatService.setAgentAvailability(tenantId, usuarioId, is_available);
    if (!agent) {
      return res.status(404).json({ error: 'Agente no encontrado' });
    }
    res.json(agent);
  } catch (error) {
    next(error);
  }
});

// ==================== WIDGET ENDPOINTS (used by WebSocket server) ====================

/**
 * POST /api/tenants/:tenantId/mensajeria-webchat/visitor-message
 * Create a message from a web chat visitor.
 * Called by the WebSocket server when a visitor sends a message.
 * Body: { session_id, visitor_name, contenido }
 */
router.post('/visitor-message', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { session_id, visitor_name, contenido } = req.body;

    if (!session_id || !contenido) {
      return res.status(400).json({ error: 'session_id y contenido son requeridos' });
    }

    // Select agent if not yet assigned
    const agentId = await webchatService.selectAgent(tenantId);

    // Find or create conversation
    const conversacion = await mensajeriaService.findOrCreateConversacion(
      tenantId,
      'web_chat',
      session_id,
      {
        external_participant_id: session_id,
        contacto_nombre: visitor_name || 'Visitante',
        usuario_asignado_id: agentId || undefined,
        metadata: { source: 'webchat_widget' },
      }
    );

    // If we assigned a new agent, increment their chat count
    if (agentId && conversacion.usuario_asignado_id === agentId) {
      await webchatService.adjustChatCount(tenantId, agentId, 1);
    }

    // Create the message
    const mensaje = await mensajeriaService.createMensaje(tenantId, conversacion.id, {
      es_entrante: true,
      remitente_nombre: visitor_name || 'Visitante',
      remitente_id: session_id,
      tipo: 'text',
      contenido,
      contenido_plain: contenido,
      estado: 'entregado',
      metadata: { session_id },
    });

    res.status(201).json({ conversacion_id: conversacion.id, mensaje_id: mensaje.id });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/mensajeria-webchat/visitor-messages/:sessionId
 * Get messages for a visitor session (used by widget to fetch history).
 */
router.get('/visitor-messages/:sessionId', async (req: Request<TenantParams & { sessionId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, sessionId } = req.params;

    // Find conversation by session ID
    const conv = await mensajeriaService.findConversacionByExternal(tenantId, 'web_chat', sessionId);
    if (!conv) {
      return res.json({ data: [] });
    }

    const result = await mensajeriaService.getMensajes(tenantId, conv.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/mensajeria-webchat/availability
 * Check if any agents are available (used by widget).
 */
router.get('/availability', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const available = await webchatService.hasAvailableAgents(tenantId);
    res.json({ available });
  } catch (error) {
    next(error);
  }
});

export default router;
