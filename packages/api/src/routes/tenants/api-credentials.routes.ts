/**
 * MÓDULO DE CREDENCIALES API - Rutas para gestionar integraciones externas
 *
 * Este módulo maneja las credenciales de APIs externas del tenant:
 * - Google (Search Console, Ads)
 * - Meta (Facebook, Instagram, Ads)
 * - Email (Mailchimp, SendGrid, etc.)
 * - WhatsApp Business
 *
 * También maneja las cuentas sociales de asesores individuales.
 */

import express, { Request, Response, NextFunction } from 'express';
import * as credentialsService from '../../services/tenantApiCredentialsService.js';
import { createOAuthState } from '../oauth.routes.js';
import * as googleAdsService from '../../services/googleAdsService.js';

const router = express.Router({ mergeParams: true });

interface TenantParams { tenantId: string }
interface UserParams extends TenantParams { usuarioId: string }

// ==================== CREDENCIALES DEL TENANT ====================

/**
 * GET /api/tenants/:tenantId/api-credentials
 * Obtiene el estado de todas las integraciones del tenant
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const credentials = await credentialsService.getTenantApiCredentials(tenantId);

    if (!credentials) {
      return res.status(404).json({ error: 'Credenciales no encontradas' });
    }

    res.json(credentials);
  } catch (error) {
    next(error);
  }
});

// ==================== GOOGLE SEARCH CONSOLE ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/google-search-console
 * Guarda las credenciales de Google Search Console
 */
router.post('/google-search-console', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { refreshToken, siteUrl, connectedBy } = req.body;

    if (!refreshToken || !siteUrl || !connectedBy) {
      return res.status(400).json({ error: 'Se requiere refreshToken, siteUrl y connectedBy' });
    }

    await credentialsService.saveGoogleSearchConsoleCredentials(
      tenantId,
      refreshToken,
      siteUrl,
      connectedBy
    );

    res.json({ success: true, message: 'Google Search Console conectado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/google-search-console
 * Desconecta Google Search Console
 */
router.delete('/google-search-console', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await credentialsService.disconnectGoogleSearchConsole(tenantId);
    res.json({ success: true, message: 'Google Search Console desconectado' });
  } catch (error) {
    next(error);
  }
});

// ==================== GOOGLE ADS ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/google-ads
 * Guarda las credenciales de Google Ads
 */
router.post('/google-ads', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { refreshToken, customerId, managerId, connectedBy } = req.body;

    if (!refreshToken || !customerId || !connectedBy) {
      return res.status(400).json({ error: 'Se requiere refreshToken, customerId y connectedBy' });
    }

    await credentialsService.saveGoogleAdsCredentials(
      tenantId,
      refreshToken,
      customerId,
      managerId || null,
      connectedBy
    );

    res.json({ success: true, message: 'Google Ads conectado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/google-ads
 * Desconecta Google Ads
 */
router.delete('/google-ads', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await credentialsService.disconnectGoogleAds(tenantId);
    res.json({ success: true, message: 'Google Ads desconectado' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/google-ads/auth-url
 * Generates the Google OAuth consent URL for connecting Google Ads.
 * The frontend opens this URL in a popup window.
 */
router.get('/google-ads/auth-url', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const connectedBy = (req.query.connectedBy as string) || 'unknown';

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'GOOGLE_OAUTH_CLIENT_ID no configurado en el servidor' });
    }

    // Build redirect URI dynamically
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host') || '';
    const redirectUri = `${protocol}://${host}/api/oauth/google-ads/callback`;

    // Create signed state with tenant + user info
    const state = createOAuthState(tenantId, connectedBy);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/adwords',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/api-credentials/google-ads/customer-id
 * Updates the Google Ads Customer ID after the user selects an account.
 * Called after OAuth when the user picks which account to connect.
 */
router.put('/google-ads/customer-id', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Se requiere customerId' });
    }

    // Validate format: 10 digits, optionally formatted as XXX-XXX-XXXX
    const cleanId = customerId.replace(/-/g, '');
    if (!/^\d{10}$/.test(cleanId)) {
      return res.status(400).json({ error: 'Customer ID debe ser 10 dígitos (ej: 123-456-7890)' });
    }

    // Format as XXX-XXX-XXXX for storage
    const formattedId = `${cleanId.slice(0, 3)}-${cleanId.slice(3, 6)}-${cleanId.slice(6)}`;

    // Get existing token to preserve it
    const existing = await credentialsService.getGoogleAdsToken(tenantId);
    if (!existing) {
      return res.status(400).json({ error: 'Google Ads no está conectado. Realiza el flujo OAuth primero.' });
    }

    // Re-save with the selected customer ID
    await credentialsService.saveGoogleAdsCredentials(
      tenantId,
      existing.refreshToken,
      formattedId,
      null,
      'system'
    );

    res.json({ success: true, customerId: formattedId });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/google-ads/accounts
 * Lists accessible Google Ads customer accounts after OAuth.
 * Used to let the user choose which account to connect.
 */
router.get('/google-ads/accounts', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const tokenData = await credentialsService.getGoogleAdsToken(tenantId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Google Ads no está conectado' });
    }

    const accounts = await googleAdsService.listAccessibleCustomers(tokenData.refreshToken);
    res.json(accounts);
  } catch (error: any) {
    console.error('[Google Ads] Error listing accounts:', error.message);
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/google-ads/campaigns
 * Gets campaigns with performance metrics for the connected account.
 */
router.get('/google-ads/campaigns', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    const tokenData = await credentialsService.getGoogleAdsToken(tenantId);
    if (!tokenData || !tokenData.customerId || tokenData.customerId === 'PENDING') {
      return res.status(400).json({ error: 'Google Ads no está configurado completamente' });
    }

    const dateRange = startDate && endDate
      ? { startDate: startDate as string, endDate: endDate as string }
      : undefined;

    const campaigns = await googleAdsService.getCampaigns(
      tokenData.refreshToken,
      tokenData.customerId,
      dateRange
    );

    res.json(campaigns);
  } catch (error: any) {
    console.error('[Google Ads] Error getting campaigns:', error.message);
    next(error);
  }
});

// ==================== META (FACEBOOK/INSTAGRAM) ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/meta
 * Guarda las credenciales de Meta (Facebook/Instagram)
 */
router.post('/meta', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const {
      pageAccessToken,
      pageId,
      pageName,
      instagramAccountId,
      instagramUsername,
      connectedBy
    } = req.body;

    if (!pageAccessToken || !pageId || !pageName || !connectedBy) {
      return res.status(400).json({
        error: 'Se requiere pageAccessToken, pageId, pageName y connectedBy'
      });
    }

    await credentialsService.saveMetaCredentials(
      tenantId,
      pageAccessToken,
      pageId,
      pageName,
      instagramAccountId || null,
      instagramUsername || null,
      connectedBy
    );

    res.json({ success: true, message: 'Meta conectado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/meta
 * Desconecta Meta
 */
router.delete('/meta', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await credentialsService.disconnectMeta(tenantId);
    res.json({ success: true, message: 'Meta desconectado' });
  } catch (error) {
    next(error);
  }
});

// ==================== META ADS ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/meta-ads
 * Guarda las credenciales de Meta Ads
 */
router.post('/meta-ads', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { accessToken, adAccountId, businessId, connectedBy } = req.body;

    if (!accessToken || !adAccountId || !connectedBy) {
      return res.status(400).json({ error: 'Se requiere accessToken, adAccountId y connectedBy' });
    }

    await credentialsService.saveMetaAdsCredentials(
      tenantId,
      accessToken,
      adAccountId,
      businessId || null,
      connectedBy
    );

    res.json({ success: true, message: 'Meta Ads conectado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/meta-ads
 * Desconecta Meta Ads
 */
router.delete('/meta-ads', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await credentialsService.disconnectMetaAds(tenantId);
    res.json({ success: true, message: 'Meta Ads desconectado' });
  } catch (error) {
    next(error);
  }
});

// ==================== EMAIL ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/email
 * Guarda las credenciales de Email Marketing
 */
router.post('/email', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { provider, apiKey, senderName, senderEmail, listId, connectedBy } = req.body;

    if (!provider || !apiKey || !senderName || !senderEmail || !connectedBy) {
      return res.status(400).json({
        error: 'Se requiere provider, apiKey, senderName, senderEmail y connectedBy'
      });
    }

    const validProviders = ['mailchimp', 'sendgrid', 'mailjet', 'ses'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: `Proveedor inválido. Opciones: ${validProviders.join(', ')}`
      });
    }

    await credentialsService.saveEmailCredentials(
      tenantId,
      provider,
      apiKey,
      senderName,
      senderEmail,
      listId || null,
      connectedBy
    );

    res.json({ success: true, message: `${provider} conectado exitosamente` });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/api-credentials/smtp
 * Guarda las credenciales SMTP personalizadas
 */
router.post('/smtp', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { host, port, username, password, secure, senderName, senderEmail, connectedBy } = req.body;

    if (!host || !port || !username || !password || !senderName || !senderEmail || !connectedBy) {
      return res.status(400).json({
        error: 'Se requiere host, port, username, password, senderName, senderEmail y connectedBy'
      });
    }

    await credentialsService.saveSmtpCredentials(
      tenantId,
      host,
      port,
      username,
      password,
      secure !== false,
      senderName,
      senderEmail,
      connectedBy
    );

    res.json({ success: true, message: 'SMTP configurado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/email
 * Desconecta Email
 */
router.delete('/email', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await credentialsService.disconnectEmail(tenantId);
    res.json({ success: true, message: 'Email desconectado' });
  } catch (error) {
    next(error);
  }
});

// ==================== CUENTAS SOCIALES DE ASESORES ====================

/**
 * GET /api/tenants/:tenantId/api-credentials/asesores/:usuarioId/social
 * Obtiene las cuentas sociales de un asesor
 */
router.get('/asesores/:usuarioId/social', async (req: Request<UserParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const accounts = await credentialsService.getAsesorSocialAccounts(tenantId, usuarioId);
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/api-credentials/asesores/:usuarioId/social
 * Guarda una cuenta social de asesor
 */
router.post('/asesores/:usuarioId/social', async (req: Request<UserParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const {
      platform,
      accessToken,
      accountId,
      accountName,
      accountUsername,
      profilePictureUrl,
      tokenExpiresAt,
      scopes
    } = req.body;

    if (!platform || !accessToken || !accountId || !accountName) {
      return res.status(400).json({
        error: 'Se requiere platform, accessToken, accountId y accountName'
      });
    }

    const validPlatforms = ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        error: `Plataforma inválida. Opciones: ${validPlatforms.join(', ')}`
      });
    }

    const account = await credentialsService.saveAsesorSocialAccount(
      tenantId,
      usuarioId,
      platform,
      accessToken,
      accountId,
      accountName,
      accountUsername || null,
      profilePictureUrl || null,
      tokenExpiresAt ? new Date(tokenExpiresAt) : null,
      scopes || []
    );

    res.json(account);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/asesores/:usuarioId/social/:platform
 * Desconecta una cuenta social de asesor
 */
router.delete('/asesores/:usuarioId/social/:platform', async (req: Request<UserParams & { platform: string }>, res: Response, next: NextFunction) => {
  try {
    const { usuarioId, platform } = req.params;

    const validPlatforms = ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Plataforma inválida' });
    }

    await credentialsService.disconnectAsesorSocialAccount(usuarioId, platform as any);
    res.json({ success: true, message: `${platform} desconectado` });
  } catch (error) {
    next(error);
  }
});

// ==================== ESTADÍSTICAS DE USO ====================

/**
 * GET /api/tenants/:tenantId/api-credentials/usage
 * Obtiene estadísticas de uso de APIs
 */
router.get('/usage', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const stats = await credentialsService.getApiUsageStats(tenantId, start, end);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
