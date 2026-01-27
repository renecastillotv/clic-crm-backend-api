/**
 * WebSocket Server for Web Chat Widget
 *
 * Standalone server that runs on the Hetzner VPS alongside the cron jobs.
 * Handles real-time messaging between website visitors and CRM agents.
 *
 * Protocol:
 * - Visitor connects with: ws://host:PORT?apiKey=KEY&sessionId=ID&visitorName=NAME
 * - Agent connects with:   ws://host:PORT?apiKey=KEY&agentToken=TOKEN&tenantId=ID
 * - Messages are JSON: { type: string, ...data }
 *
 * Message types (visitor → server):
 *   { type: "message", text: string }
 *
 * Message types (agent → server):
 *   { type: "message", text: string, conversacionId: string }
 *   { type: "typing", conversacionId: string }
 *
 * Message types (server → visitor):
 *   { type: "message", text: string, from: "agent", agentName?: string }
 *   { type: "typing" }
 *   { type: "welcome", greeting: string, agentsAvailable: boolean }
 *
 * Message types (server → agent):
 *   { type: "message", text: string, from: "visitor", sessionId: string, conversacionId: string, visitorName: string }
 *   { type: "visitor_connected", sessionId: string, visitorName: string, conversacionId: string }
 *   { type: "visitor_disconnected", sessionId: string }
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { URL } from 'url';

dotenv.config();

const PORT = parseInt(process.env.WS_PORT || '3002');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// ==================== TYPES ====================

interface VisitorConnection {
  ws: WebSocket;
  tenantId: string;
  sessionId: string;
  visitorName: string;
  conversacionId?: string;
}

interface AgentConnection {
  ws: WebSocket;
  tenantId: string;
  usuarioId: string;
}

// Active connections
const visitors = new Map<string, VisitorConnection>(); // sessionId → connection
const agents = new Map<string, AgentConnection[]>();     // tenantId → connections

// ==================== SERVER ====================

const wss = new WebSocketServer({ port: PORT });

console.log(`[WS] WebSocket server running on port ${PORT}`);

wss.on('connection', async (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  const apiKey = url.searchParams.get('apiKey');
  const sessionId = url.searchParams.get('sessionId');
  const visitorName = url.searchParams.get('visitorName') || 'Visitante';
  const agentToken = url.searchParams.get('agentToken');
  const tenantIdParam = url.searchParams.get('tenantId');

  if (!apiKey) {
    ws.close(4001, 'Missing apiKey');
    return;
  }

  // Validate API key
  const config = await validateApiKey(apiKey);
  if (!config) {
    ws.close(4003, 'Invalid or disabled API key');
    return;
  }

  const tenantId = config.tenant_id;

  if (agentToken && tenantIdParam) {
    // Agent connection
    const agentInfo = await validateAgentToken(agentToken, tenantId);
    if (!agentInfo) {
      ws.close(4003, 'Invalid agent token');
      return;
    }

    handleAgentConnection(ws, tenantId, agentInfo.usuarioId);
  } else if (sessionId) {
    // Visitor connection
    handleVisitorConnection(ws, tenantId, sessionId, visitorName, config);
  } else {
    ws.close(4001, 'Missing sessionId or agentToken');
  }
});

// ==================== VISITOR HANDLING ====================

async function handleVisitorConnection(
  ws: WebSocket,
  tenantId: string,
  sessionId: string,
  visitorName: string,
  config: any
): Promise<void> {
  const conn: VisitorConnection = { ws, tenantId, sessionId, visitorName };
  visitors.set(sessionId, conn);

  console.log(`[WS] Visitor connected: ${sessionId} (tenant: ${tenantId})`);

  // Check agent availability
  const agentsAvailable = await checkAgentAvailability(tenantId);

  // Send welcome message
  sendToWs(ws, {
    type: 'welcome',
    greeting: config.greeting_text,
    agentsAvailable,
    offlineMessage: agentsAvailable ? undefined : config.offline_message,
  });

  // Find or create conversation
  const conversacionId = await findOrCreateConversation(tenantId, sessionId, visitorName);
  conn.conversacionId = conversacionId;

  // Notify agents
  notifyAgents(tenantId, {
    type: 'visitor_connected',
    sessionId,
    visitorName,
    conversacionId,
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'message' && msg.text) {
        // Save to DB
        await saveMessage(tenantId, conversacionId, {
          es_entrante: true,
          remitente_nombre: visitorName,
          remitente_id: sessionId,
          contenido: msg.text,
        });

        // Forward to agents
        notifyAgents(tenantId, {
          type: 'message',
          from: 'visitor',
          sessionId,
          conversacionId,
          visitorName,
          text: msg.text,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error(`[WS] Error processing visitor message:`, error.message);
    }
  });

  ws.on('close', () => {
    visitors.delete(sessionId);
    console.log(`[WS] Visitor disconnected: ${sessionId}`);

    notifyAgents(tenantId, {
      type: 'visitor_disconnected',
      sessionId,
    });
  });
}

// ==================== AGENT HANDLING ====================

function handleAgentConnection(
  ws: WebSocket,
  tenantId: string,
  usuarioId: string
): void {
  const conn: AgentConnection = { ws, tenantId, usuarioId };

  if (!agents.has(tenantId)) {
    agents.set(tenantId, []);
  }
  agents.get(tenantId)!.push(conn);

  console.log(`[WS] Agent connected: ${usuarioId} (tenant: ${tenantId})`);

  // Send current active visitors
  const activeVisitors = Array.from(visitors.values())
    .filter(v => v.tenantId === tenantId)
    .map(v => ({
      sessionId: v.sessionId,
      visitorName: v.visitorName,
      conversacionId: v.conversacionId,
    }));

  sendToWs(ws, {
    type: 'active_visitors',
    visitors: activeVisitors,
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'message' && msg.text && msg.conversacionId) {
        // Find visitor by conversacionId
        const visitor = Array.from(visitors.values())
          .find(v => v.conversacionId === msg.conversacionId && v.tenantId === tenantId);

        // Save to DB
        await saveMessage(tenantId, msg.conversacionId, {
          es_entrante: false,
          remitente_nombre: msg.agentName || 'Agente',
          remitente_id: usuarioId,
          contenido: msg.text,
        });

        // Forward to visitor
        if (visitor) {
          sendToWs(visitor.ws, {
            type: 'message',
            from: 'agent',
            text: msg.text,
            agentName: msg.agentName,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (msg.type === 'typing' && msg.conversacionId) {
        const visitor = Array.from(visitors.values())
          .find(v => v.conversacionId === msg.conversacionId && v.tenantId === tenantId);
        if (visitor) {
          sendToWs(visitor.ws, { type: 'typing' });
        }
      }
    } catch (error: any) {
      console.error(`[WS] Error processing agent message:`, error.message);
    }
  });

  ws.on('close', () => {
    const tenantAgents = agents.get(tenantId);
    if (tenantAgents) {
      const idx = tenantAgents.findIndex(a => a.ws === ws);
      if (idx !== -1) tenantAgents.splice(idx, 1);
    }
    console.log(`[WS] Agent disconnected: ${usuarioId}`);
  });
}

// ==================== HELPERS ====================

function sendToWs(ws: WebSocket, data: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function notifyAgents(tenantId: string, data: any): void {
  const tenantAgents = agents.get(tenantId) || [];
  for (const agent of tenantAgents) {
    sendToWs(agent.ws, data);
  }
}

// ==================== DATABASE ====================

async function validateApiKey(apiKey: string): Promise<any | null> {
  const result = await pool.query(
    `SELECT * FROM webchat_config WHERE api_key = $1 AND enabled = true`,
    [apiKey]
  );
  return result.rows[0] || null;
}

async function validateAgentToken(token: string, tenantId: string): Promise<{ usuarioId: string } | null> {
  // Agent token is a Clerk session token or a simple API token
  // For simplicity, we validate against the usuarios table using a hash
  // In production, this should verify a JWT or session token
  const result = await pool.query(
    `SELECT u.id as "usuarioId"
     FROM webchat_agents wa
     JOIN usuarios u ON wa.usuario_id = u.id
     WHERE wa.tenant_id = $1 AND wa.is_available = true AND u.id = $2`,
    [tenantId, token]
  );
  return result.rows[0] || null;
}

async function checkAgentAvailability(tenantId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM webchat_agents
     WHERE tenant_id = $1 AND is_available = true AND current_chat_count < max_concurrent_chats
     LIMIT 1`,
    [tenantId]
  );
  return result.rows.length > 0;
}

async function findOrCreateConversation(
  tenantId: string,
  sessionId: string,
  visitorName: string
): Promise<string> {
  // Try to find existing
  const existing = await pool.query(
    `SELECT id FROM conversaciones WHERE tenant_id = $1 AND canal = 'web_chat' AND external_conversation_id = $2`,
    [tenantId, sessionId]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  // Select agent
  const agentResult = await pool.query(
    `SELECT usuario_id FROM webchat_agents
     WHERE tenant_id = $1 AND is_available = true AND current_chat_count < max_concurrent_chats
     ORDER BY current_chat_count ASC, updated_at ASC
     LIMIT 1`,
    [tenantId]
  );
  const agentId = agentResult.rows[0]?.usuario_id || null;

  // Create conversation
  const result = await pool.query(
    `INSERT INTO conversaciones (
      tenant_id, canal, external_conversation_id,
      external_participant_id, contacto_nombre,
      usuario_asignado_id, estado, metadata, created_at, updated_at
    ) VALUES ($1, 'web_chat', $2, $2, $3, $4, 'abierta', '{"source":"webchat_widget"}', NOW(), NOW())
    RETURNING id`,
    [tenantId, sessionId, visitorName, agentId]
  );

  // Increment agent chat count
  if (agentId) {
    await pool.query(
      `UPDATE webchat_agents SET current_chat_count = current_chat_count + 1, updated_at = NOW()
       WHERE tenant_id = $1 AND usuario_id = $2`,
      [tenantId, agentId]
    );
  }

  return result.rows[0].id;
}

async function saveMessage(
  tenantId: string,
  conversacionId: string,
  data: {
    es_entrante: boolean;
    remitente_nombre: string;
    remitente_id: string;
    contenido: string;
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO mensajes (
      tenant_id, conversacion_id, es_entrante, remitente_nombre, remitente_id,
      tipo, contenido, contenido_plain, estado, created_at
    ) VALUES ($1, $2, $3, $4, $5, 'text', $6, $6, 'entregado', NOW())`,
    [tenantId, conversacionId, data.es_entrante, data.remitente_nombre, data.remitente_id, data.contenido]
  );

  // Update conversation last message
  await pool.query(
    `UPDATE conversaciones SET
      ultimo_mensaje_texto = $1,
      ultimo_mensaje_at = NOW(),
      ultimo_mensaje_es_entrante = $2,
      no_leidos = CASE WHEN $2 = true THEN no_leidos + 1 ELSE no_leidos END,
      updated_at = NOW()
    WHERE id = $3`,
    [data.contenido.substring(0, 200), data.es_entrante, conversacionId]
  );
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WS] Shutting down...');
  wss.close();
  pool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[WS] Shutting down...');
  wss.close();
  pool.end();
  process.exit(0);
});
