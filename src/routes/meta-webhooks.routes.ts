/**
 * Meta Webhooks Routes
 *
 * Top-level webhook endpoint for Meta (Facebook Messenger, Instagram DMs, WhatsApp).
 * Mounted at /api/webhooks/meta (NOT under tenants — Meta sends to a single URL).
 *
 * Two endpoints:
 * - GET  /api/webhooks/meta — Webhook verification (challenge-response)
 * - POST /api/webhooks/meta — Receive events (verified via X-Hub-Signature-256)
 *
 * Security:
 * - GET: Verified with META_WEBHOOK_VERIFY_TOKEN
 * - POST: Verified with HMAC-SHA256 using META_APP_SECRET
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { handleWebhookPayload } from '../services/metaWebhookHandler.js';

const router = express.Router();

const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const META_APP_SECRET = process.env.META_APP_SECRET;

/**
 * GET /api/webhooks/meta
 *
 * Webhook verification endpoint.
 * Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge.
 * We must respond with the challenge value if the token matches.
 */
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (!META_WEBHOOK_VERIFY_TOKEN) {
    console.error('[MetaWebhook] META_WEBHOOK_VERIFY_TOKEN not configured');
    return res.status(500).send('Webhook verify token not configured');
  }

  if (mode === 'subscribe' && token === META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[MetaWebhook] Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('[MetaWebhook] Webhook verification failed');
  return res.status(403).send('Forbidden');
});

/**
 * POST /api/webhooks/meta
 *
 * Receive webhook events from Meta.
 * Verifies X-Hub-Signature-256 header, then delegates to handler.
 *
 * IMPORTANT: This route must receive raw body (express.raw middleware)
 * for signature verification to work correctly.
 */
router.post('/', async (req: Request, res: Response) => {
  // Always respond 200 quickly to Meta (they retry on non-200)
  // Process asynchronously after responding.

  // Verify signature
  if (!META_APP_SECRET) {
    console.error('[MetaWebhook] META_APP_SECRET not configured');
    return res.status(500).send('App secret not configured');
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) {
    console.warn('[MetaWebhook] Missing X-Hub-Signature-256 header');
    return res.status(401).send('Missing signature');
  }

  // req.body is a Buffer when using express.raw()
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.warn('[MetaWebhook] Invalid signature');
    return res.status(401).send('Invalid signature');
  }

  // Parse the body
  let body: any;
  try {
    body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  // Respond 200 immediately (Meta requires fast response)
  res.status(200).send('EVENT_RECEIVED');

  // Process asynchronously
  try {
    await handleWebhookPayload(body);
  } catch (error: any) {
    console.error('[MetaWebhook] Error processing payload:', error.message);
  }
});

export default router;
