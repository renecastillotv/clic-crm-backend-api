/**
 * MÓDULO DE MENSAJERÍA WHATSAPP - Rutas REST
 *
 * WhatsApp Business Cloud API management endpoints.
 * Handles credentials, templates, business profile, and sending template messages.
 *
 * Endpoints:
 *   Credentials:  POST /credentials, GET /credentials, DELETE /credentials
 *   Templates:    GET /templates
 *   Profile:      GET /business-profile
 *   Send:         POST /send-template
 */

import express, { Request, Response, NextFunction } from 'express';
import { resolveUserScope } from '../../middleware/scopeResolver.js';
import {
  getWhatsAppCredentials,
  saveWhatsAppCredentials,
  disconnectWhatsApp,
} from '../../services/tenantApiCredentialsService.js';
import * as whatsappCloudService from '../../services/whatsappCloudService.js';

const router = express.Router({ mergeParams: true });
router.use(resolveUserScope);

interface TenantParams { tenantId: string }

// ==================== CREDENTIALS ====================

/**
 * GET /api/tenants/:tenantId/mensajeria-whatsapp/credentials
 * Get WhatsApp connection status (without exposing the token).
 */
router.get('/credentials', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const creds = await getWhatsAppCredentials(tenantId);

    if (!creds) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      phoneNumberId: creds.phoneNumberId,
      wabaId: creds.wabaId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/mensajeria-whatsapp/credentials
 * Save WhatsApp Cloud API credentials.
 * Body: { accessToken, phoneNumberId, wabaId }
 */
router.post('/credentials', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { accessToken, phoneNumberId, wabaId } = req.body;

    if (!accessToken || !phoneNumberId || !wabaId) {
      return res.status(400).json({ error: 'accessToken, phoneNumberId y wabaId son requeridos' });
    }

    // Verify the credentials work by fetching the business profile
    try {
      await whatsappCloudService.getBusinessProfile(accessToken, phoneNumberId);
    } catch {
      return res.status(400).json({ error: 'No se pudo verificar las credenciales de WhatsApp' });
    }

    await saveWhatsAppCredentials(tenantId, { accessToken, phoneNumberId, wabaId });

    res.json({ ok: true, connected: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/mensajeria-whatsapp/credentials
 * Disconnect WhatsApp.
 */
router.delete('/credentials', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await disconnectWhatsApp(tenantId);
    res.json({ ok: true, connected: false });
  } catch (error) {
    next(error);
  }
});

// ==================== TEMPLATES ====================

/**
 * GET /api/tenants/:tenantId/mensajeria-whatsapp/templates
 * List message templates for the WhatsApp Business Account.
 */
router.get('/templates', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const creds = await getWhatsAppCredentials(tenantId);

    if (!creds || !creds.wabaId) {
      return res.status(400).json({ error: 'WhatsApp no está conectado o falta el WABA ID' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const templates = await whatsappCloudService.getMessageTemplates(creds.accessToken, creds.wabaId, limit);
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// ==================== BUSINESS PROFILE ====================

/**
 * GET /api/tenants/:tenantId/mensajeria-whatsapp/business-profile
 * Get WhatsApp Business Profile.
 */
router.get('/business-profile', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const creds = await getWhatsAppCredentials(tenantId);

    if (!creds) {
      return res.status(400).json({ error: 'WhatsApp no está conectado' });
    }

    const profile = await whatsappCloudService.getBusinessProfile(creds.accessToken, creds.phoneNumberId);
    res.json(profile || {});
  } catch (error) {
    next(error);
  }
});

// ==================== SEND TEMPLATE ====================

/**
 * POST /api/tenants/:tenantId/mensajeria-whatsapp/send-template
 * Send a template message to a phone number.
 * Body: { to, templateName, languageCode?, components? }
 */
router.post('/send-template', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { to, templateName, languageCode, components } = req.body;

    if (!to || !templateName) {
      return res.status(400).json({ error: 'to y templateName son requeridos' });
    }

    const creds = await getWhatsAppCredentials(tenantId);
    if (!creds) {
      return res.status(400).json({ error: 'WhatsApp no está conectado' });
    }

    const result = await whatsappCloudService.sendTemplateMessage(
      creds.accessToken,
      creds.phoneNumberId,
      to,
      templateName,
      languageCode || 'es',
      components
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==================== PHONE NUMBERS ====================

/**
 * GET /api/tenants/:tenantId/mensajeria-whatsapp/phone-numbers
 * List phone numbers for the WhatsApp Business Account.
 */
router.get('/phone-numbers', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const creds = await getWhatsAppCredentials(tenantId);

    if (!creds || !creds.wabaId) {
      return res.status(400).json({ error: 'WhatsApp no está conectado o falta el WABA ID' });
    }

    const phoneNumbers = await whatsappCloudService.getPhoneNumbers(creds.accessToken, creds.wabaId);
    res.json(phoneNumbers);
  } catch (error) {
    next(error);
  }
});

export default router;
